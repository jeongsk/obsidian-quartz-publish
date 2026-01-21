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
