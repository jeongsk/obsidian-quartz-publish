# Dashboard Remote Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix publish dashboard sync errors by fetching remote file data via GitHub API and comparing with local records.

**Architecture:**
1. Add `RemoteSyncService` to fetch remote file tree and SHA from GitHub
2. Integrate remote sync into `StatusService.calculateStatusOverview()`
3. Show loading spinner with progress bar during remote data fetch
4. Cache remote data with timestamp for offline fallback

**Tech Stack:** TypeScript 5.9+, Obsidian API, GitHub REST API (Tree endpoint), TailwindCSS v4

---

## Task 1: Add Remote Sync Types

**Files:**
- Modify: `src/types.ts`

**Step 1: Add remote sync types to types.ts**

Add these types after the `StatusOverview` definition (around line 398):

```typescript
// ============================================================================
// Remote Sync Types (JEO-18)
// ============================================================================

/**
 * 원격 저장소 파일 정보 (Git Tree에서 가져온 최소 정보)
 */
export interface RemoteFileInfo {
	/** 파일 경로 (content/posts/hello.md) */
	path: string;
	/** GitHub blob SHA */
	sha: string;
	/** 파일 크기 (bytes) */
	size: number;
	/** 파일 타입 */
	type: "blob" | "tree";
}

/**
 * 원격 동기화 결과
 */
export interface RemoteSyncResult {
	/** 원격 파일 목록 (content 경로 내의 .md 파일만) */
	files: RemoteFileInfo[];
	/** 조회 시간 (Unix timestamp) */
	fetchedAt: number;
	/** 성공 여부 */
	success: boolean;
	/** 오류 메시지 (실패 시) */
	error?: string;
	/** 오프라인 여부 (캐시 사용 시) */
	isFromCache?: boolean;
}

/**
 * 원격 동기화 캐시 (PluginData에 추가)
 */
export interface RemoteSyncCache {
	/** 원격 파일 데이터 */
	files: RemoteFileInfo[];
	/** 캐시 시간 */
	fetchedAt: number;
	/** 캐시 유효 시간 (밀리초, 기본 5분) */
	validUntil: number;
}
```

**Step 2: Update PluginData interface to include cache**

Modify `PluginData` interface (around line 715) to add the cache:

```typescript
export interface PluginData {
	settings: PluginSettings;
	/** 마지막 동기화 시간 */
	lastSync?: number;
	/** 발행 기록이 별도 파일로 이동되었는지 여부 */
	publishRecordsMigrated?: boolean;
	/** 원격 동기화 캐시 (JEO-18) */
	remoteSyncCache?: RemoteSyncCache;
}
```

**Step 3: Run type check**

```bash
npm run build
```

Expected: Build succeeds with new types

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add remote sync types for JEO-18"
```

---

## Task 2: Create RemoteSyncService

**Files:**
- Create: `src/services/remote-sync.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/remote-sync.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteSyncService } from '../remote-sync';
import type { GitHubService } from '../github';
import type { RemoteFileInfo } from '../../types';

describe('RemoteSyncService', () => {
	let mockGitHub: GitHubService;
	let service: RemoteSyncService;

	beforeEach(() => {
		// Mock GitHubService
		mockGitHub = {
			getTree: vi.fn(),
		} as unknown as GitHubService;

		service = new RemoteSyncService({
			github: mockGitHub,
			contentPath: 'content',
		});
	});

	it('should fetch remote files from GitHub tree', async () => {
		const mockTree = [
			{ path: 'content/posts/hello.md', mode: '100644', type: 'blob', sha: 'abc123', size: 1024 },
			{ path: 'content/posts/world.md', mode: '100644', type: 'blob', sha: 'def456', size: 2048 },
			{ path: 'content/images/photo.jpg', mode: '100644', type: 'blob', sha: 'ghi789', size: 4096 },
			{ path: 'content/posts', mode: '040000', type: 'tree', sha: 'tree123' },
		];

		vi.spyOn(mockGitHub, 'getTree').mockResolvedValue(mockTree as any);

		const result = await service.fetchRemoteFiles();

		expect(result.success).toBe(true);
		expect(result.files).toHaveLength(2); // Only .md files
		expect(result.files[0].path).toBe('content/posts/hello.md');
		expect(result.files[0].sha).toBe('abc123');
	});

	it('should filter only markdown files', async () => {
		const mockTree = [
			{ path: 'content/posts/hello.md', mode: '100644', type: 'blob', sha: 'abc123', size: 1024 },
			{ path: 'content/images/photo.jpg', mode: '100644', type: 'blob', sha: 'def456', size: 2048 },
			{ path: 'content/static/style.css', mode: '100644', type: 'blob', sha: 'ghi789', size: 512 },
		];

		vi.spyOn(mockGitHub, 'getTree').mockResolvedValue(mockTree as any);

		const result = await service.fetchRemoteFiles();

		expect(result.files).toHaveLength(1);
		expect(result.files[0].path).toBe('content/posts/hello.md');
	});

	it('should handle empty tree', async () => {
		vi.spyOn(mockGitHub, 'getTree').mockResolvedValue([]);

		const result = await service.fetchRemoteFiles();

		expect(result.success).toBe(true);
		expect(result.files).toHaveLength(0);
	});

	it('should handle GitHub API errors', async () => {
		vi.spyOn(mockGitHub, 'getTree').mockRejectedValue(new Error('Network error'));

		const result = await service.fetchRemoteFiles();

		expect(result.success).toBe(false);
		expect(result.error).toBe('Network error');
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/services/__tests__/remote-sync.test.ts
```

Expected: FAIL with "RemoteSyncService not defined"

**Step 3: Create RemoteSyncService**

Create `src/services/remote-sync.ts`:

```typescript
/**
 * Remote Sync Service
 *
 * GitHub 원격 저장소의 파일 정보를 가져와서 로컬 레코드와 동기화합니다.
 * (JEO-18: 발행 대시보드 sync 오류 해결)
 */

import type { GitHubService } from './github';
import type {
	RemoteFileInfo,
	RemoteSyncResult,
} from '../types';

/**
 * 원격 동기화 서비스 옵션
 */
export interface RemoteSyncServiceOptions {
	/** GitHub 서비스 인스턴스 */
	github: GitHubService;
	/** 콘텐츠 경로 (기본값: 'content') */
	contentPath?: string;
	/** 캐시 유효 시간 (밀리초, 기본값: 5분) */
	cacheValidityMs?: number;
}

/**
 * 진행 상황 콜백
 */
export type RemoteSyncProgressCallback = (message: string) => void;

/**
 * 원격 동기화 서비스 클래스
 *
 * GitHub API를 사용하여 원격 저장소의 파일 목록을 가져옵니다.
 */
export class RemoteSyncService {
	private github: GitHubService;
	private contentPath: string;
	private cacheValidityMs: number;

	constructor(options: RemoteSyncServiceOptions) {
		this.github = options.github;
		this.contentPath = options.contentPath ?? 'content';
		this.cacheValidityMs = options.cacheValidityMs ?? 5 * 60 * 1000; // 5분
	}

	/**
	 * 원격 파일 목록을 가져옵니다.
	 *
	 * @returns 원격 동기화 결과
	 */
	async fetchRemoteFiles(
		onProgress?: RemoteSyncProgressCallback,
	): Promise<RemoteSyncResult> {
		try {
			onProgress?.('Fetching remote file list...');

			// Git Tree API 호출 (재귀적)
			const tree = await this.github.getTree();

			onProgress?.('Filtering markdown files...');

			// contentPath로 시작하고 .md로 끝나는 파일만 필터링
			const files = this.filterMarkdownFiles(tree);

			return {
				files,
				fetchedAt: Date.now(),
				success: true,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';

			return {
				files: [],
				fetchedAt: Date.now(),
				success: false,
				error: message,
			};
		}
	}

	/**
	 * Git Tree에서 마크다운 파일만 필터링합니다.
	 *
	 * @param tree Git Tree 응답
	 * @returns 필터링된 파일 목록
	 */
	private filterMarkdownFiles(
		tree: Array<{ path: string; mode: string; type: string; sha: string; size?: number }>,
	): RemoteFileInfo[] {
		const files: RemoteFileInfo[] = [];

		for (const item of tree) {
			// 디렉토리는 건너뛰기
			if (item.type !== 'blob') continue;

			// contentPath로 시작하는지 확인
			if (!item.path.startsWith(this.contentPath + '/') &&
				item.path !== this.contentPath) continue;

			// .md 파일만 포함
			if (!item.path.endsWith('.md')) continue;

			files.push({
				path: item.path,
				sha: item.sha,
				size: item.size ?? 0,
				type: 'blob',
			});
		}

		return files;
	}

	/**
	 * 캐시가 유효한지 확인합니다.
	 *
	 * @param cache 캐시 데이터
	 * @returns 유효 여부
	 */
	isCacheValid(cache: { fetchedAt: number } | null | undefined): boolean {
		if (!cache) return false;

		const now = Date.now();
		const cacheAge = now - cache.fetchedAt;

		return cacheAge < this.cacheValidityMs;
	}

	/**
	 * 캐시 유효 시간을 반환합니다.
	 */
	getCacheValidityMs(): number {
		return this.cacheValidityMs;
	}
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/services/__tests__/remote-sync.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/remote-sync.ts src/services/__tests__/remote-sync.test.ts
git commit -m "feat(remote-sync): add RemoteSyncService for fetching remote files"
```

---

## Task 3: Integrate Remote Sync into StatusService

**Files:**
- Modify: `src/services/status.ts`

**Step 1: Add remote sync parameter to StatusServiceOptions**

Modify `StatusServiceOptions` interface (around line 27):

```typescript
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
```

**Step 2: Add remote sync instance variable**

Add after `private publishFilter: PublishFilterService;` (around line 47):

```typescript
private publishFilter: PublishFilterService;
// JEO-18: 원격 동기화 서비스
private remoteSyncService?: import('./remote-sync').RemoteSyncService;
private getRemoteSyncCache?: () => import('../types').RemoteSyncCache | undefined;
private setRemoteSyncCache?: (cache: import('../types').RemoteSyncCache) => Promise<void>;
```

**Step 3: Update constructor to initialize remote sync**

Modify `constructor` (around line 51):

```typescript
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
```

**Step 4: Add method to sync with remote data**

Add this new method after `findDeletedNotes()` (around line 221):

```typescript
/**
 * 원격 저장소와 동기화하여 발행 기록을 업데이트합니다.
 * (JEO-18)
 *
 * @param onProgress 진행 상황 콜백
 * @returns 동기화 성공 여부
 */
async syncWithRemote(
	onProgress?: (message: string) => void,
): Promise<boolean> {
	if (!this.remoteSyncService) {
		return false; // 원격 동기화 비활성화
	}

	try {
		// 1. 캐시 확인
		const cache = this.getRemoteSyncCache?.();

		if (this.remoteSyncService.isCacheValid(cache)) {
			onProgress?.('Using cached remote data...');
			return true;
		}

		onProgress?.('Fetching remote files from GitHub...');

		// 2. 원격 파일 가져오기
		const result = await this.remoteSyncService.fetchRemoteFiles(
			onProgress,
		);

		if (!result.success) {
			console.error('[StatusService] Remote sync failed:', result.error);
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

		onProgress?.(`Synced with ${result.files.length} remote files`);

		return true;
	} catch (error) {
		console.error('[StatusService] Remote sync error:', error);
		return false;
	}
}
```

**Step 5: Update calculateStatusOverview to check remote SHA**

Modify `calculateFileStatus` method (around line 136) to check remote SHA:

```typescript
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

	// JEO-18: 원격 SHA와도 비교 (로컬 해시가 같지만 원격이 다른 경우)
	const remoteChanged = await this.isRemoteChanged(record);

	if (currentHash !== record.contentHash || remoteChanged) {
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
```

**Step 6: Add isRemoteChanged helper method**

Add after `calculateHash` method (around line 256):

```typescript
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
```

**Step 7: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/services/status.ts
git commit -m "feat(status): integrate remote sync for accurate status calculation"
```

---

## Task 4: Update Main Plugin to Provide Remote Sync Dependencies

**Files:**
- Modify: `src/main.ts`

**Step 1: Add remote sync cache getter/setter**

Find the `QuartzPublishPlugin` class and add these methods after the existing data loading methods.

First, let's find where to add the code - look for the existing `loadData()` method and add nearby.

Add these helper methods to the plugin class:

```typescript
/**
 * 원격 동기화 캐시를 가져옵니다.
 * (JEO-18)
 */
private getRemoteSyncCache(): RemoteSyncCache | undefined {
	const data = this.loadData();
	return data.remoteSyncCache;
}

/**
 * 원격 동기화 캐시를 저장합니다.
 * (JEO-18)
 */
private async setRemoteSyncCache(cache: RemoteSyncCache): Promise<void> {
	const data = this.loadData();
	data.remoteSyncCache = cache;
	await this.saveData(data);
}
```

**Step 2: Update openDashboard to create RemoteSyncService**

Find the `openDashboard` method and modify it to create and pass the `RemoteSyncService`:

```typescript
async openDashboard(): Promise<void> {
	// ... 기존 코드 ...

	// JEO-18: 원격 동기화 서비스 생성
	const { RemoteSyncService } = await import('./services/remote-sync');
	const remoteSyncService = new RemoteSyncService({
		github: this.github,
		contentPath: this.settings.contentPath,
	});

	new DashboardModal(this.app, {
		initialTab: 'new',
		onPublish: (files) => this.publishNotes(files),
		onDelete: (files) => this.unpublishNotes(files),
		onLoadStatus: (onProgress) => this.loadStatusOverview(onProgress, remoteSyncService),
		networkService: this.networkService,
		onGetRemoteContent: (file) => this.getRemoteContent(file),
	}).open();
}
```

**Step 3: Update loadStatusOverview to use remote sync**

Modify `loadStatusOverview` method signature and implementation:

```typescript
async loadStatusOverview(
	onProgress?: (processed: number, total: number) => void,
	remoteSyncService?: import('./services/remote-sync').RemoteSyncService,
): Promise<StatusOverview> {
	const { StatusService } = await import('./services/status');

	const statusService = new StatusService({
		vault: this.app.vault,
		metadataCache: this.app.metadataCache,
		getPublishRecords: () => this.publishRecordStorage.load().records,
		getFilterSettings: () => this.settings.publishFilterSettings ?? DEFAULT_PUBLISH_FILTER_SETTINGS,
		contentPath: this.settings.contentPath,
		staticPath: this.settings.staticPath,
		// JEO-18: 원격 동기화 전달
		remoteSyncService,
		getRemoteSyncCache: () => this.getRemoteSyncCache(),
		setRemoteSyncCache: (cache) => this.setRemoteSyncCache(cache),
	});

	return statusService.calculateStatusOverview(onProgress);
}
```

**Step 4: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): wire up RemoteSyncService in dashboard flow"
```

---

## Task 5: Add Loading UI for Remote Sync

**Files:**
- Modify: `src/ui/dashboard-modal.ts`

**Step 1: Update state to track remote sync**

Add to `DashboardState` interface or create a new field in the modal class:

Add this property after `private refreshBtn: HTMLElement | null = null;` (around line 82):

```typescript
private refreshBtn: HTMLElement | null = null;
// JEO-18: 원격 동기화 로딩 상태
private isRemoteSyncing: boolean = false;
```

**Step 2: Update loadStatus to show remote sync progress**

Modify `loadStatus` method (around line 147):

```typescript
private async loadStatus(): Promise<void> {
	this.state.isLoading = true;
	this.state.error = null;
	this.setRefreshButtonLoading(true);
	this.render();

	try {
		// JEO-18: 원격 동기화 메시지 표시
		this.updateProgress({
			current: 0,
			total: 100,
			currentFile: "",
			operation: "loading",
		});

		const overview = await this.options.onLoadStatus(
			(processed, total) => {
				// 로컬 상태 계산 진행률
				this.updateProgress({
					current: processed,
					total,
					currentFile: "",
					operation: "loading",
				});
			},
		);
		this.state.statusOverview = overview;
		this.progressInfo = null;
	} catch (error) {
		this.state.error =
			error instanceof Error ? error.message : "Unknown error";
	} finally {
		this.state.isLoading = false;
		this.setRefreshButtonLoading(false);
		this.render();
	}
}
```

**Step 6: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/ui/dashboard-modal.ts
git commit -m "feat(ui): show loading state during remote sync"
```

---

## Task 6: Add i18n Keys for Remote Sync

**Files:**
- Modify: `src/i18n/locales/en.ts`
- Modify: `src/i18n/locales/ko.ts`

**Step 1: Add English translations**

Add to `src/i18n/locales/en.ts` (after the dashboard section, around line 244):

```typescript
// Dashboard - Remote Sync (JEO-18)
"dashboard.remoteSync.fetching": "Syncing with remote repository...",
"dashboard.remoteSync.success": "Synced with remote repository",
"dashboard.remoteSync.failed": "Remote sync failed. Using local data.",
"dashboard.remoteSync.cacheUsed": "Using cached remote data",
"dashboard.remoteSync.progress": "Synced {{count}} files from remote",
```

**Step 2: Add Korean translations**

Add to `src/i18n/locales/ko.ts`:

```typescript
// Dashboard - Remote Sync (JEO-18)
"dashboard.remoteSync.fetching": "원격 저장소와 동기화 중...",
"dashboard.remoteSync.success": "원격 저장소와 동기화 완료",
"dashboard.remoteSync.failed": "원격 동기화 실패. 로컬 데이터를 사용합니다.",
"dashboard.remoteSync.cacheUsed": "캐시된 원격 데이터 사용",
"dashboard.remoteSync.progress": "원격에서 {{count}}개 파일 동기화됨",
```

**Step 3: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/i18n/locales/en.ts src/i18n/locales/ko.ts
git commit -m "feat(i18n): add remote sync translation keys"
```

---

## Task 7: Update StatusService to Use Remote Sync on Load

**Files:**
- Modify: `src/services/status.ts`

**Step 1: Modify calculateStatusOverview to call remote sync first**

Update the `calculateStatusOverview` method (around line 71):

```typescript
async calculateStatusOverview(
	onProgress?: StatusProgressCallback,
): Promise<StatusOverview> {
	// JEO-18: 원격 동기화 먼저 수행
	if (this.remoteSyncService) {
		const syncSuccess = await this.syncWithRemote((message) => {
			// 진행 콜백은 무시 (UI는 loadStatus에서 처리)
			console.log('[StatusService] Remote sync:', message);
		});

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

	// ... 나머지 기존 코드는 그대로 유지 ...
```

**Step 2: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/services/status.ts
git commit -m "feat(status): call remote sync before calculating status"
```

---

## Task 8: Handle Offline Mode with Cache Fallback

**Files:**
- Modify: `src/services/status.ts`

**Step 1: Update syncWithRemote to handle offline gracefully**

Modify the `syncWithRemote` method to add offline check:

```typescript
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
```

Add import for `t` function at the top:

```typescript
import { t } from '../i18n';
```

**Step 2: Update calculateStatusOverview to pass offline status**

```typescript
async calculateStatusOverview(
	onProgress?: StatusProgressCallback,
): Promise<StatusOverview> {
	// JEO-18: 원격 동기화 먼저 수행
	if (this.remoteSyncService) {
		// 네트워크 상태 확인 (NetworkService가 없으면 온라인으로 간주)
		const isOffline = false; // TODO: NetworkService 주입 받기
		const syncSuccess = await this.syncWithRemote(
			(message) => {
				console.log('[StatusService] Remote sync:', message);
			},
			isOffline,
		);

		if (!syncSuccess) {
			console.warn('[StatusService] Remote sync failed, continuing with local data');
		}
	}
	// ...
```

**Step 3: Run type check**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/services/status.ts
git commit -m "feat(status): add offline handling with cache fallback"
```

---

## Task 9: Add Integration Tests

**Files:**
- Create: `src/services/__tests__/status-remote-sync.integration.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusService } from '../status';
import { RemoteSyncService } from '../remote-sync';
import type { TFile } from 'obsidian';
import type { PublishRecord, StatusOverview } from '../../types';

describe('StatusService - Remote Sync Integration', () => {
	let mockVault: any;
	let mockMetadataCache: any;
	let mockGitHub: any;
	let remoteSyncService: RemoteSyncService;
	let statusService: StatusService;
	let mockRecords: Record<string, PublishRecord>;

	beforeEach(() => {
		// Mock Vault
		mockVault = {
			getMarkdownFiles: vi.fn(() => []),
			cachedRead: vi.fn(() => '# Test\n\nContent'),
		};

		// Mock MetadataCache
		mockMetadataCache = {
			getFileCache: vi.fn(() => ({
				frontmatter: { publish: true },
			})),
		};

		// Mock GitHub
		mockGitHub = {
			getTree: vi.fn(() => [
				{ path: 'content/posts/hello.md', mode: '100644', type: 'blob', sha: 'remote-abc123', size: 1024 },
			]),
		};

		remoteSyncService = new RemoteSyncService({
			github: mockGitHub,
			contentPath: 'content',
		});

		// Mock publish records
		mockRecords = {
			'posts/hello.md': {
				id: 'test-id',
				localPath: 'posts/hello.md',
				remotePath: 'content/posts/hello.md',
				contentHash: 'local-hash-123',
				publishedAt: Date.now(),
				remoteSha: 'old-sha-456', // 원격 SHA와 다름
				attachments: [],
			},
		};

		statusService = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			contentPath: 'content',
			staticPath: 'static',
			remoteSyncService,
			getRemoteSyncCache: () => undefined,
			setRemoteSyncCache: vi.fn(),
		});
	});

	it('should detect modified files when remote SHA differs', async () => {
		// Mock file
		const mockFile: Partial<TFile> = {
			path: 'posts/hello.md',
			name: 'hello.md',
			basename: 'hello',
			stat: { mtime: Date.now(), ctime: Date.now(), size: 100 },
		};

		vi.spyOn(mockVault, 'getMarkdownFiles').mockReturnValue([mockFile as TFile]);

		// 원격 동기화 후 상태 계산
		const syncSuccess = await statusService.syncWithRemote();
		expect(syncSuccess).toBe(true);

		const overview = await statusService.calculateStatusOverview();

		// remoteSha가 다르므로 modified로 표시되어야 함
		expect(overview.modified).toHaveLength(1);
		expect(overview.modified[0].file.path).toBe('posts/hello.md');
	});

	it('should use cached data when cache is valid', async () => {
		const validCache = {
			files: [
				{ path: 'content/posts/hello.md', sha: 'cached-sha', size: 1024, type: 'blob' as const },
			],
			fetchedAt: Date.now(),
			validUntil: Date.now() + 300000, // 5분 후
		};

		statusService = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			contentPath: 'content',
			staticPath: 'static',
			remoteSyncService,
			getRemoteSyncCache: () => validCache,
			setRemoteSyncCache: vi.fn(),
		});

		const syncSuccess = await statusService.syncWithRemote();

		// 캐시가 유효하므로 성공해야 함
		expect(syncSuccess).toBe(true);
		// GitHub API가 호출되지 않아야 함
		expect(mockGitHub.getTree).not.toHaveBeenCalled();
	});
});
```

**Step 2: Run integration tests**

```bash
npm test -- src/services/__tests__/status-remote-sync.integration.test.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/services/__tests__/status-remote-sync.integration.test.ts
git commit -m "test(status): add remote sync integration tests"
```

---

## Task 10: Manual Testing & Verification

**Step 1: Build the plugin**

```bash
npm run build
```

**Step 2: Load plugin in Obsidian**

1. Open Obsidian
2. Enable the plugin in Settings → Community Plugins
3. Open Publish Dashboard
4. Verify loading spinner appears
5. Verify status is correctly calculated

**Step 3: Test scenarios**

| Scenario | Expected Result |
|----------|----------------|
| Dashboard opens with online connection | Shows loading spinner, then displays accurate status |
| Remote file has different SHA than local record | File shows as "Modified" |
| Dashboard opens offline | Shows cached data with "Offline" indicator |
| Cache expired (>5 min) | Fetches new remote data |
| Cache valid (<5 min) | Uses cached data, no API call |

**Step 4: Verify Linear issue JEO-18 is resolved**

- [ ] Sync errors no longer occur
- [ ] Remote data is accurately reflected
- [ ] Loading UI shows during fetch
- [ ] Offline mode works with cached data

**Step 5: Commit final changes**

```bash
git add .
git commit -m "chore: finalize JEO-18 dashboard sync implementation"
```

---

## Summary

This implementation:

1. **Creates `RemoteSyncService`** to fetch remote file tree via GitHub API
2. **Integrates into `StatusService`** to compare local records with remote SHA
3. **Adds loading UI** with progress bar during remote fetch
4. **Implements caching** with 5-minute validity for offline support
5. **Filters only .md files** in the content path for efficient syncing

**Key Files Changed:**
- `src/types.ts` - Added remote sync types
- `src/services/remote-sync.ts` - New service for fetching remote data
- `src/services/status.ts` - Integrated remote sync for accurate status
- `src/main.ts` - Wired up dependencies
- `src/ui/dashboard-modal.ts` - Updated loading UI
- `src/i18n/locales/*.ts` - Added translations

**Testing:**
- Unit tests for `RemoteSyncService`
- Integration tests for status calculation with remote sync
- Manual testing in Obsidian
