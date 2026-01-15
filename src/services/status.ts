/**
 * Status Service
 *
 * 노트의 발행 상태를 계산하고 관리하는 서비스입니다.
 * 대시보드에서 상태 개요를 표시하는 데 사용됩니다.
 */

import { TFile } from 'obsidian';
import type { Vault, MetadataCache } from 'obsidian';
import type {
	PublishRecord,
	NoteStatus,
	StatusOverview,
} from '../types';

/**
 * 상태 계산 진행 콜백
 */
export type StatusProgressCallback = (processed: number, total: number) => void;

/**
 * 상태 서비스 생성자 파라미터
 */
export interface StatusServiceOptions {
	vault: Vault;
	metadataCache: MetadataCache;
	getPublishRecords: () => Record<string, PublishRecord>;
	contentPath: string;
	staticPath: string;
}

/**
 * 상태 서비스 클래스
 *
 * 노트의 발행 상태를 계산하고 대시보드에 표시할 상태 개요를 생성합니다.
 */
export class StatusService {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private getPublishRecords: () => Record<string, PublishRecord>;
	private contentPath: string;
	private staticPath: string;

	/** 청크 단위 처리 크기 */
	private static readonly CHUNK_SIZE = 20;

	constructor(options: StatusServiceOptions) {
		this.vault = options.vault;
		this.metadataCache = options.metadataCache;
		this.getPublishRecords = options.getPublishRecords;
		this.contentPath = options.contentPath;
		this.staticPath = options.staticPath;
	}

	/**
	 * 전체 발행 상태 개요를 계산합니다.
	 * 대시보드를 열 때 호출됩니다.
	 *
	 * @param onProgress - 진행 상황 콜백 (선택적)
	 * @returns 상태별로 그룹화된 노트 목록
	 */
	async calculateStatusOverview(
		onProgress?: StatusProgressCallback
	): Promise<StatusOverview> {
		const overview: StatusOverview = {
			new: [],
			modified: [],
			synced: [],
			deleted: [],
		};

		// 발행 대상 파일 목록 가져오기
		const publishableFiles = this.getPublishableFiles();
		const total = publishableFiles.length;

		// 청크 단위로 처리
		for (let i = 0; i < total; i += StatusService.CHUNK_SIZE) {
			const chunk = publishableFiles.slice(i, i + StatusService.CHUNK_SIZE);

			// 병렬로 상태 계산
			const statuses = await Promise.all(
				chunk.map(file => this.calculateFileStatus(file))
			);

			// 상태별로 분류
			for (const status of statuses) {
				switch (status.status) {
					case 'new':
						overview.new.push(status);
						break;
					case 'modified':
						overview.modified.push(status);
						break;
					case 'synced':
						overview.synced.push(status);
						break;
					case 'unpublished':
						// unpublished는 deleted로 분류
						overview.deleted.push({ ...status, status: 'deleted' });
						break;
				}
			}

			// 진행 콜백 호출
			const processed = Math.min(i + chunk.length, total);
			onProgress?.(processed, total);

			// UI 응답성을 위한 양보 (requestAnimationFrame 대체)
			if (typeof requestAnimationFrame !== 'undefined') {
				await new Promise(resolve => requestAnimationFrame(resolve));
			}
		}

		// 삭제된 노트 추가
		const deletedNotes = this.findDeletedNotes();
		overview.deleted.push(...deletedNotes);

		return overview;
	}

	/**
	 * 단일 파일의 발행 상태를 계산합니다.
	 *
	 * @param file - 상태를 확인할 파일
	 * @returns 파일의 상태 정보
	 */
	async calculateFileStatus(file: TFile): Promise<NoteStatus> {
		const records = this.getPublishRecords();
		const record = records[file.path];

		// 파일 메타데이터 확인
		const cache = this.metadataCache.getFileCache(file);
		const isPublishable = cache?.frontmatter?.publish === true;

		// publish: false로 변경된 경우
		if (!isPublishable && record) {
			return {
				file,
				status: 'unpublished',
				record,
			};
		}

		// 신규 파일 (publish record 없음)
		if (!record) {
			return {
				file,
				status: 'new',
			};
		}

		// 해시 비교로 수정 여부 확인
		const content = await this.vault.cachedRead(file);
		const currentHash = await this.calculateHash(content);

		if (currentHash !== record.contentHash) {
			return {
				file,
				status: 'modified',
				localHash: currentHash,
				record,
			};
		}

		// 최신 상태
		return {
			file,
			status: 'synced',
			localHash: currentHash,
			record,
		};
	}

	/**
	 * 삭제가 필요한 노트 목록을 반환합니다.
	 * (로컬에서 삭제되었거나 publish: false로 변경된 노트)
	 *
	 * @returns 삭제 필요 노트 목록
	 */
	findDeletedNotes(): NoteStatus[] {
		const records = this.getPublishRecords();
		const deletedNotes: NoteStatus[] = [];

		for (const [path, record] of Object.entries(records)) {
			const abstractFile = this.vault.getAbstractFileByPath(path);

			// 파일이 존재하지 않는 경우
			if (!abstractFile || !(abstractFile instanceof TFile)) {
				// 삭제된 파일을 위한 더미 객체 생성
				const dummyFile = this.createDeletedFilePlaceholder(path);

				deletedNotes.push({
					file: dummyFile,
					status: 'deleted',
					record,
				});
				continue;
			}

			// publish: false로 변경된 경우
			const cache = this.metadataCache.getFileCache(abstractFile);
			if (cache?.frontmatter?.publish !== true) {
				deletedNotes.push({
					file: abstractFile,
					status: 'deleted',
					record,
				});
			}
		}

		return deletedNotes;
	}

	/**
	 * 모든 발행 대상 파일 목록을 반환합니다.
	 * (publish: true인 파일)
	 *
	 * @returns 발행 대상 파일 목록
	 */
	getPublishableFiles(): TFile[] {
		const markdownFiles = this.vault.getMarkdownFiles();

		return markdownFiles.filter(file => {
			const cache = this.metadataCache.getFileCache(file);
			return cache?.frontmatter?.publish === true;
		});
	}

	/**
	 * 파일 콘텐츠의 SHA256 해시를 계산합니다.
	 *
	 * @param content - 해시를 계산할 콘텐츠
	 * @returns SHA256 해시 문자열
	 */
	async calculateHash(content: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(content);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * 삭제된 파일을 위한 플레이스홀더 객체를 생성합니다.
	 * 실제 TFile이 아니지만, UI에서 경로 정보를 표시하기 위해 사용됩니다.
	 *
	 * @param path - 파일 경로
	 * @returns TFile 호환 객체
	 */
	private createDeletedFilePlaceholder(path: string): TFile {
		const name = path.split('/').pop() ?? '';
		// 삭제된 파일의 경우 실제 TFile 객체가 없으므로,
		// 필수 속성만 포함한 객체를 생성합니다.
		const placeholder = {
			path,
			name,
			basename: name.replace(/\.[^.]+$/, ''),
			extension: 'md',
			stat: { mtime: 0, ctime: 0, size: 0 },
			parent: null,
			vault: this.vault,
		};
		// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- 삭제된 파일은 TFile 인스턴스가 없음
		return placeholder as unknown as TFile;
	}
}
