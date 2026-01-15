/**
 * Publish Service
 *
 * 노트 발행 핵심 로직을 담당합니다.
 */

import { TFile } from 'obsidian';
import type { Vault, MetadataCache } from 'obsidian';
import type {
	PluginSettings,
	PublishRecord,
	PublishResult,
	BatchPublishResult,
	UnpublishResult,
	AttachmentRecord,
} from '../types';
import { MAX_FILE_SIZE } from '../types';
import { GitHubService } from './github';
import { ContentTransformer } from './transformer';

/**
 * 발행 서비스 클래스
 */
export class PublishService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private settings: PluginSettings;
	private github: GitHubService;
	private transformer: ContentTransformer;
	private publishRecords: Record<string, PublishRecord>;
	private onRecordUpdate: (localPath: string, record: PublishRecord) => Promise<void>;
	private onRecordRemove: (localPath: string) => Promise<void>;
	private isPublishing = false;

	constructor(
		vault: Vault,
		metadataCache: MetadataCache,
		settings: PluginSettings,
		publishRecords: Record<string, PublishRecord>,
		onRecordUpdate: (localPath: string, record: PublishRecord) => Promise<void>,
		onRecordRemove: (localPath: string) => Promise<void>
	) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.settings = settings;
		this.publishRecords = publishRecords;
		this.onRecordUpdate = onRecordUpdate;
		this.onRecordRemove = onRecordRemove;

		this.github = new GitHubService(
			settings.githubToken,
			settings.repoUrl,
			settings.defaultBranch
		);

		this.transformer = new ContentTransformer(
			vault,
			metadataCache,
			settings.contentPath,
			settings.staticPath
		);
	}

	/**
	 * 단일 노트 발행
	 */
	async publishNote(file: TFile): Promise<PublishResult> {
		// 중복 발행 방지
		if (this.isPublishing) {
			return {
				success: false,
				file,
				error: 'unknown',
			};
		}

		this.isPublishing = true;

		try {
			// 1. 파일 내용 읽기
			let content = await this.vault.read(file);

			// 2. 프론트매터 파싱
			const { frontmatter } = this.transformer.parseFrontmatter(content);

			// 3. publish 플래그 확인 및 자동 추가
			if (frontmatter.publish !== true) {
				content = this.transformer.addPublishFlag(content);
				await this.vault.modify(file, content);
			}

			// 4. 발행된 노트 목록 가져오기 (링크 변환용)
			const publishedNotes = this.getPublishedNotes();

			// 5. 콘텐츠 변환
			const transformed = this.transformer.transform(content, file, publishedNotes);

			// 6. 원격 경로 결정
			const remotePath = this.transformer.getRemotePath(file, frontmatter);

			// 7. 기존 파일 SHA 확인
			const existingFile = await this.github.getFile(remotePath);
			const existingSha = existingFile?.sha;

			// 8. 파일 업로드
			const commitResult = await this.github.createOrUpdateFile(
				remotePath,
				transformed.content,
				existingSha ? `Update: ${file.basename}` : `Publish: ${file.basename}`,
				existingSha
			);

			if (!commitResult.success) {
				return {
					success: false,
					file,
					error: 'network_error',
				};
			}

			// 9. 첨부파일 업로드
			const attachmentRecords = await this.uploadAttachments(
				transformed.attachments,
				file.basename
			);

			// 10. 발행 기록 저장
			const contentHash = await this.calculateHash(transformed.content);
			const record: PublishRecord = {
				id: await this.calculateHash(file.path),
				localPath: file.path,
				remotePath,
				contentHash,
				publishedAt: Date.now(),
				remoteSha: commitResult.sha || '',
				attachments: attachmentRecords,
			};

			await this.onRecordUpdate(file.path, record);

			return {
				success: true,
				file,
				remotePath,
			};
		} catch (error) {
			console.error('[QuartzPublish] Publish error:', error);
			return {
				success: false,
				file,
				error: 'unknown',
			};
		} finally {
			this.isPublishing = false;
		}
	}

	/**
	 * 여러 노트 일괄 발행
	 */
	async publishNotes(
		files: TFile[],
		onProgress?: (current: number, total: number, file: TFile) => void
	): Promise<BatchPublishResult> {
		const results: PublishResult[] = [];
		let succeeded = 0;
		let failed = 0;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			onProgress?.(i + 1, files.length, file);

			const result = await this.publishNote(file);
			results.push(result);

			if (result.success) {
				succeeded++;
			} else {
				failed++;
			}

			// Rate limit 방지를 위한 딜레이
			if (i < files.length - 1) {
				await this.delay(500);
			}
		}

		return {
			total: files.length,
			succeeded,
			failed,
			results,
		};
	}

	/**
	 * 노트 발행 취소 (리포지토리에서 삭제)
	 */
	async unpublishNote(file: TFile): Promise<UnpublishResult> {
		try {
			const record = this.publishRecords[file.path];
			if (!record) {
				return {
					success: false,
					file,
					error: 'No publish record found',
				};
			}

			// 파일 삭제
			const result = await this.github.deleteFile(
				record.remotePath,
				record.remoteSha,
				`Unpublish: ${file.basename}`
			);

			if (!result.success) {
				return {
					success: false,
					file,
					error: result.error,
				};
			}

			// 첨부파일도 삭제
			for (const attachment of record.attachments) {
				await this.github.deleteFile(
					attachment.remotePath,
					attachment.remoteSha,
					`Remove attachment: ${attachment.localPath}`
				);
			}

			// 기록 삭제
			await this.onRecordRemove(file.path);

			return {
				success: true,
				file,
			};
		} catch (error) {
			return {
				success: false,
				file,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * 첨부파일 업로드
	 */
	private async uploadAttachments(
		attachments: Array<{ localPath: string; remotePath: string }>,
		noteBasename: string
	): Promise<AttachmentRecord[]> {
		const records: AttachmentRecord[] = [];

		for (const attachment of attachments) {
			try {
				// 볼트에서 파일 찾기
				const file = this.vault.getAbstractFileByPath(attachment.localPath);
				if (!file || !(file instanceof TFile)) {
					console.warn(`[QuartzPublish] Attachment not found: ${attachment.localPath}`);
					continue;
				}

				// 파일 크기 확인
				if (file.stat.size > MAX_FILE_SIZE) {
					console.warn(`[QuartzPublish] File too large: ${attachment.localPath}`);
					continue;
				}

				// 바이너리 콘텐츠 읽기
				const content = await this.vault.readBinary(file);

				// 기존 파일 확인
				const existingFile = await this.github.getFile(attachment.remotePath);

				// 업로드
				const result = await this.github.createOrUpdateBinaryFile(
					attachment.remotePath,
					content,
					existingFile
						? `Update attachment: ${file.name}`
						: `Add attachment: ${file.name}`,
					existingFile?.sha
				);

				if (result.success && result.sha) {
					const contentHash = await this.calculateBinaryHash(content);
					records.push({
						localPath: attachment.localPath,
						remotePath: attachment.remotePath,
						contentHash,
						size: file.stat.size,
						remoteSha: result.sha,
					});
				}
			} catch (error) {
				console.error(`[QuartzPublish] Failed to upload attachment: ${attachment.localPath}`, error);
			}
		}

		return records;
	}

	/**
	 * 발행된 노트 경로 목록 가져오기
	 */
	private getPublishedNotes(): Set<string> {
		const published = new Set<string>();
		for (const path of Object.keys(this.publishRecords)) {
			// .md 확장자 제거한 경로
			published.add(path.replace(/\.md$/, ''));
		}
		return published;
	}

	/**
	 * 문자열 SHA-256 해시 계산
	 */
	private async calculateHash(content: string): Promise<string> {
		const data = new TextEncoder().encode(content);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * 바이너리 SHA-256 해시 계산
	 */
	private async calculateBinaryHash(content: ArrayBuffer): Promise<string> {
		const hashBuffer = await crypto.subtle.digest('SHA-256', content);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * 딜레이 유틸리티
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
