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
	PublishFilterSettings,
} from '../types';
import { DEFAULT_PUBLISH_FILTER_SETTINGS } from '../types';
import { PublishFilterService } from './publish-filter';
import { t } from '../i18n';

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
	getFilterSettings?: () => PublishFilterSettings;
	contentPath: string;
	staticPath: string;
	// JEO-18: 원격 동기화 추가
	remoteSyncService?: import('./remote-sync').RemoteSyncService;
	getRemoteSyncCache?: () => import('../types').RemoteSyncCache | undefined;
	setRemoteSyncCache?: (cache: import('../types').RemoteSyncCache) => Promise<void>;
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
	private publishFilter: PublishFilterService;
	// JEO-18: 원격 동기화 서비스
	private remoteSyncService?: import('./remote-sync').RemoteSyncService;
	private getRemoteSyncCache?: () => import('../types').RemoteSyncCache | undefined;
	private setRemoteSyncCache?: (cache: import('../types').RemoteSyncCache) => Promise<void>;

	private static readonly CHUNK_SIZE = 20;

	constructor(options: StatusServiceOptions) {
		this.vault = options.vault;
		this.metadataCache = options.metadataCache;
		this.getPublishRecords = options.getPublishRecords;
		this.contentPath = options.contentPath;
		this.staticPath = options.staticPath;

		this.publishFilter = new PublishFilterService({
			metadataCache: options.metadataCache,
			getSettings: options.getFilterSettings ?? (() => DEFAULT_PUBLISH_FILTER_SETTINGS),
		});

		// JEO-18: 원격 동기화 서비스 초기화
		this.remoteSyncService = options.remoteSyncService;
		this.getRemoteSyncCache = options.getRemoteSyncCache;
		this.setRemoteSyncCache = options.setRemoteSyncCache;
	}

	/**
	 * 원격 동기화 서비스를 설정합니다.
	 * (JEO-18)
	 */
	setRemoteSyncService(service: import('./remote-sync').RemoteSyncService): void {
		this.remoteSyncService = service;
	}

	/**
	 * 전체 발행 상태 개요를 계산합니다.
	 * 대시보드를 열 때 호출됩니다.
	 *
	 * @param onProgress - 진행 상황 콜백 (선택적)
	 * @param isOffline - 오프라인 여부 (선택적)
	 * @returns 상태별로 그룹화된 노트 목록
	 */
	async calculateStatusOverview(
		onProgress?: StatusProgressCallback,
		isOffline?: boolean,
	): Promise<StatusOverview> {
		// JEO-18: 원격 동기화 먼저 수행
		if (this.remoteSyncService) {
			const syncSuccess = await this.syncWithRemote((message) => {
				// 진행 콜백은 무시 (UI는 loadStatus에서 처리)
				console.log('[StatusService] Remote sync:', message);
			}, isOffline);

			if (!syncSuccess) {
				console.warn('[StatusService] Remote sync failed, continuing with local data');
			}
		}

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

		// JEO-18: 원격 파일 변경 확인
		const remoteChanged = await this.isRemoteChanged(record);
		if (remoteChanged) {
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
	 * 원격 동기화 캐시가 있는 경우, GitHub에 실제로 존재하는 파일은 제외합니다.
	 *
	 * @returns 삭제 필요 노트 목록
	 */
	findDeletedNotes(): NoteStatus[] {
		const records = this.getPublishRecords();
		const deletedNotes: NoteStatus[] = [];

		// 원격 파일 캐시 가져오기
		const remoteCache = this.getRemoteSyncCache?.();
		const isCacheValid = remoteCache && this.remoteSyncService?.isCacheValid(remoteCache);

		for (const [path, record] of Object.entries(records)) {
			const abstractFile = this.vault.getAbstractFileByPath(path);

			// 로컬에 파일이 존재하는 경우
			if (abstractFile && abstractFile instanceof TFile) {
				// publish: false로 변경된 경우만 deleted로 처리
				const cache = this.metadataCache.getFileCache(abstractFile);
				if (cache?.frontmatter?.publish !== true) {
					deletedNotes.push({
						file: abstractFile,
						status: 'deleted',
						record,
					});
				}
				continue;
			}

			// 로컬에 파일이 없는 경우
			// 원격 캐시가 유효하면, 원격에도 없는 경우만 삭제 필요로 처리
			if (isCacheValid && remoteCache) {
				const existsInRemote = remoteCache.files.some(
					f => f.path === record.remotePath
				);

				// 원격에도 없으면 이미 삭제된 것으로 간주, 제외
				if (!existsInRemote) {
					console.log(`[StatusService] Skipping ${record.remotePath} - already deleted from remote`);
					continue;
				}
			}

			// 로컬에 없고 원격에 있는 (또는 캐시가 없는) 경우 -> 삭제 필요
			const dummyFile = this.createDeletedFilePlaceholder(path);
			deletedNotes.push({
				file: dummyFile,
				status: 'deleted',
				record,
			});
		}

		return deletedNotes;
	}

	/**
	 * 원격 저장소와 동기화하여 발행 기록을 업데이트합니다.
	 * (JEO-18)
	 *
	 * @param onProgress 진행 상황 콜백
	 * @param isOffline 오프라인 여부
	 * @returns 동기화 성공 여부
	 */
	async syncWithRemote(
		onProgress?: (message: string) => void,
		isOffline?: boolean,
	): Promise<boolean> {
		if (!this.remoteSyncService) {
			return false; // 원격 동기화 비활성화
		}

		try {
			// 오프라인이면 캐시만 확인
			if (isOffline) {
				const cache = this.getRemoteSyncCache?.();
				if (cache && this.remoteSyncService.isCacheValid(cache)) {
					onProgress?.(t('dashboard.remoteSync.cacheUsed'));
					return true;
				}
				onProgress?.(t('dashboard.status.offline'));
				return false;
			}

			// 1. 캐시 확인
			const cache = this.getRemoteSyncCache?.();

			if (this.remoteSyncService.isCacheValid(cache)) {
				onProgress?.(t('dashboard.remoteSync.cacheUsed'));
				return true;
			}

			onProgress?.(t('dashboard.remoteSync.fetching'));

			// 2. 원격 파일 가져오기
			const result = await this.remoteSyncService.fetchRemoteFiles(
				onProgress,
			);

			if (!result.success) {
				console.error('[StatusService] Remote sync failed:', result.error);
				onProgress?.(t('dashboard.remoteSync.failed'));
				return false;
			}

			// 3. 캐시 저장
			if (this.setRemoteSyncCache) {
				await this.setRemoteSyncCache({
					files: result.files,
					fetchedAt: result.fetchedAt,
					validUntil: result.fetchedAt + this.remoteSyncService.getCacheValidityMs(),
				});
			}

			onProgress?.(t('dashboard.remoteSync.progress', { count: result.files.length }));

			return true;
		} catch (error) {
			console.error('[StatusService] Remote sync error:', error);
			onProgress?.(t('dashboard.remoteSync.failed'));
			return false;
		}
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
			const hasPublishFlag = cache?.frontmatter?.publish === true;

			if (!hasPublishFlag) {
				return false;
			}

			return this.publishFilter.shouldPublish(file);
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
	 * 원격 파일이 변경되었는지 확인합니다.
	 * (JEO-18)
	 *
	 * @param record 발행 기록
	 * @returns 원격 변경 여부
	 */
	private async isRemoteChanged(record: PublishRecord): Promise<boolean> {
		const cache = this.getRemoteSyncCache?.();
		if (!cache) return false;

		// 원격 파일 찾기
		const remoteFile = cache.files.find(f => {
			// remotePath로 비교
			return f.path === record.remotePath;
		});

		// 원격에 파일이 없으면 변경된 것으로 간주
		if (!remoteFile) return true;

		// SHA 비교
		return remoteFile.sha !== record.remoteSha;
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
