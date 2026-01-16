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
	PublishError,
	QuartzFrontmatter,
} from '../types';
import { MAX_FILE_SIZE, DEFAULT_AUTO_DATE_SETTINGS, DEFAULT_PUBLISH_FILTER_SETTINGS } from '../types';
import type { LargeFileInfo, FileValidationResult } from '../types';
import { GitHubService } from './github';
import { ContentTransformer } from './transformer';
import { FileValidatorService } from './file-validator';
import { PublishFilterService } from './publish-filter';

/**
 * 발행 서비스 클래스
 */
export class PublishService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private settings: PluginSettings;
	private github: GitHubService;
	private transformer: ContentTransformer;
	private fileValidator: FileValidatorService;
	private publishFilter: PublishFilterService;
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

		this.fileValidator = new FileValidatorService();

		this.publishFilter = new PublishFilterService({
			metadataCache,
			getSettings: () => this.settings.publishFilterSettings ?? DEFAULT_PUBLISH_FILTER_SETTINGS,
		});
	}

	/**
	 * 파일 목록에서 대용량 파일을 검증합니다.
	 * @param files 검증할 파일 목록
	 * @returns 검증 결과
	 */
	validateFileSizes(files: TFile[]): FileValidationResult {
		return this.fileValidator.validateFiles(files);
	}

	/**
	 * 대용량 파일 목록을 반환합니다.
	 * @param files 검사할 파일 목록
	 * @returns 대용량 파일 정보 배열
	 */
	findLargeFiles(files: TFile[]): LargeFileInfo[] {
		return this.fileValidator.findLargeFiles(files);
	}

	/**
	 * 최대 파일 크기를 반환합니다.
	 */
	getMaxFileSize(): number {
		return this.fileValidator.getMaxFileSize();
	}

	shouldPublish(file: TFile): boolean {
		return this.publishFilter.shouldPublish(file);
	}

	getFilteredPublishPath(file: TFile): string {
		return this.publishFilter.getPublishPath(file);
	}

	getRemotePath(file: TFile, frontmatter: QuartzFrontmatter): string {
		if (this.publishFilter.isHomePage(file)) {
			return `${this.settings.contentPath}/index.md`;
		}

		if (typeof frontmatter.path === 'string' && frontmatter.path.trim()) {
			return this.transformer.getRemotePath(file, frontmatter);
		}

		const filteredPath = this.publishFilter.getPublishPath(file);
		return `${this.settings.contentPath}/${filteredPath}`;
	}

	async publishNote(file: TFile): Promise<PublishResult> {
		if (this.isPublishing) {
			return {
				success: false,
				file,
				error: 'unknown',
			};
		}

		if (!this.shouldPublish(file)) {
			return {
				success: false,
				file,
				error: 'no_publish_flag',
			};
		}

		this.isPublishing = true;

		try {
			// 2. 프론트매터 파싱 (MetadataCache 사용으로 배열/중첩 객체 완전 지원)
			const frontmatter = this.transformer.getFrontmatterFromCache(file);
			const autoDateSettings = this.settings.autoDateSettings ?? DEFAULT_AUTO_DATE_SETTINGS;

			// 3. publish 플래그 및 날짜 필드 원자적 추가 (vault.process 사용)
			let content = await this.vault.process(file, (data) => {
				let result = data;

				// publish 플래그 자동 추가
				if (frontmatter.publish !== true) {
					result = this.transformer.addPublishFlag(result);
				}

				// 날짜 필드 자동 추가
				result = this.transformer.addDateFields(result, file, autoDateSettings);

				return result;
			});

			// 5. 발행된 노트 목록 가져오기 (링크 변환용)
			const publishedNotes = this.getPublishedNotes();

			// 6. 콘텐츠 변환
			const transformed = this.transformer.transform(content, file, publishedNotes);

			const remotePath = this.getRemotePath(file, frontmatter);

			// 8. 기존 파일 SHA 확인
			const existingFile = await this.github.getFile(remotePath);
			const existingSha = existingFile?.sha;

			// 9. 파일 업로드
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

			// 10. 첨부파일 업로드
			const attachmentRecords = await this.uploadAttachments(
				transformed.attachments,
				file.basename
			);

			// 11. 발행 기록 저장
			// content 변수는 프론트매터 자동 수정 후의 로컬 파일 콘텐츠입니다.
			// status.ts에서 로컬 파일의 해시와 비교하므로, 변환 전 콘텐츠의 해시를 저장합니다.
			const contentHash = await this.calculateHash(content);
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

			// 에러 타입 분석
			const errorType = this.classifyError(error);

			return {
				success: false,
				file,
				error: errorType,
			};
		} finally {
			this.isPublishing = false;
		}
	}

	/**
	 * 에러 타입을 분류합니다.
	 */
	private classifyError(error: unknown): PublishError {
		if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
			return 'offline';
		}

		if (error instanceof Error) {
			const message = error.message.toLowerCase();

			// 네트워크 관련 에러
			if (message.includes('failed to fetch') || message.includes('network') || message.includes('offline')) {
				return 'offline';
			}

			// Rate limit 에러
			if (message.includes('rate limit') || message.includes('403')) {
				return 'rate_limited';
			}

			// 충돌 에러
			if (message.includes('409') || message.includes('conflict')) {
				return 'conflict';
			}
		}

		return 'unknown';
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
			console.error('[QuartzPublish] Unpublish error:', error);

			// 네트워크 에러 감지 시 재시도 안내
			const isNetworkError =
				error instanceof TypeError ||
				(error instanceof Error &&
					(error.message.toLowerCase().includes('fetch') ||
						error.message.toLowerCase().includes('network') ||
						error.message.toLowerCase().includes('offline')));

			return {
				success: false,
				file,
				error: isNetworkError
					? '네트워크 연결을 확인하고 다시 시도해주세요.'
					: error instanceof Error
						? error.message
						: 'Unknown error',
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
