import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuartzUpgradeService } from '../../../src/services/quartz-upgrade';
import type { GitHubService } from '../../../src/services/github';
import type { QuartzUpgradeProgress } from '../../../src/types';

describe('QuartzUpgradeService', () => {
	let mockGitHub: GitHubService;
	let service: QuartzUpgradeService;

	beforeEach(() => {
		mockGitHub = {
			getFile: vi.fn(),
			getLatestRelease: vi.fn(),
			getExternalTree: vi.fn(),
			getExternalFileContent: vi.fn(),
			commitMultipleFiles: vi.fn(),
		} as unknown as GitHubService;

		service = new QuartzUpgradeService(mockGitHub);
	});

	describe('getCurrentVersion', () => {
		it('package.json에서 버전을 읽는다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.5"}',
				size: 100,
			});

			const version = await service.getCurrentVersion();

			expect(version).toBe('v4.0.5');
		});

		it('package.json이 없으면 quartz/package.json에서 읽는다', async () => {
			vi.mocked(mockGitHub.getFile)
				.mockResolvedValueOnce(null) // package.json
				.mockResolvedValueOnce({
					path: 'quartz/package.json',
					sha: 'abc',
					content: '{"version": "4.0.3"}',
					size: 100,
				});

			const version = await service.getCurrentVersion();

			expect(version).toBe('v4.0.3');
		});

		it('버전을 찾을 수 없으면 null을 반환한다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue(null);

			const version = await service.getCurrentVersion();

			expect(version).toBeNull();
		});

		it('JSON 파싱 오류 시 null을 반환한다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: 'invalid json',
				size: 100,
			});

			const version = await service.getCurrentVersion();

			expect(version).toBeNull();
		});
	});

	describe('getLatestVersion', () => {
		it('최신 릴리스 태그를 반환한다', async () => {
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});

			const version = await service.getLatestVersion();

			expect(version).toBe('v4.0.8');
			expect(mockGitHub.getLatestRelease).toHaveBeenCalledWith(
				'jackyzha0',
				'quartz'
			);
		});

		it('릴리스가 없으면 null을 반환한다', async () => {
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue(null);

			const version = await service.getLatestVersion();

			expect(version).toBeNull();
		});
	});

	describe('checkVersion', () => {
		it('현재 버전과 최신 버전을 비교한다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.5"}',
				size: 100,
			});
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});

			const info = await service.checkVersion();

			expect(info.current).toBe('v4.0.5');
			expect(info.latest).toBe('v4.0.8');
			expect(info.hasUpdate).toBe(true);
			expect(info.lastChecked).toBeGreaterThan(0);
		});

		it('최신 버전이면 hasUpdate가 false', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.8"}',
				size: 100,
			});
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});

			const info = await service.checkVersion();

			expect(info.hasUpdate).toBe(false);
		});

		it('현재 버전이 더 높으면 hasUpdate가 false', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.1.0"}',
				size: 100,
			});
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});

			const info = await service.checkVersion();

			expect(info.hasUpdate).toBe(false);
		});
	});

	describe('getUpgradeFiles', () => {
		it('quartz/ 폴더의 파일 목록을 반환한다', async () => {
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});
			vi.mocked(mockGitHub.getExternalTree).mockResolvedValue([
				{ path: 'quartz/file1.ts', mode: '100644', type: 'blob', sha: 'sha1' },
				{ path: 'quartz/file2.ts', mode: '100644', type: 'blob', sha: 'sha2' },
				{ path: 'quartz/subfolder', mode: '040000', type: 'tree', sha: 'sha3' },
				{ path: 'content/readme.md', mode: '100644', type: 'blob', sha: 'sha4' },
			]);

			const files = await service.getUpgradeFiles();

			expect(files).toHaveLength(2);
			expect(files[0]).toEqual({ path: 'quartz/file1.ts', sha: 'sha1' });
			expect(files[1]).toEqual({ path: 'quartz/file2.ts', sha: 'sha2' });
		});

		it('특정 버전의 파일을 조회할 수 있다', async () => {
			vi.mocked(mockGitHub.getExternalTree).mockResolvedValue([]);

			await service.getUpgradeFiles('v4.0.5');

			expect(mockGitHub.getExternalTree).toHaveBeenCalledWith(
				'jackyzha0',
				'quartz',
				'v4.0.5'
			);
		});
	});

	describe('upgrade', () => {
		beforeEach(() => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.5"}',
				size: 100,
			});
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});
			vi.mocked(mockGitHub.getExternalTree).mockResolvedValue([
				{ path: 'quartz/file1.ts', mode: '100644', type: 'blob', sha: 'sha1' },
			]);
			// getLatestVersion()에서 v4 브랜치의 package.json을 가져올 때와
			// upgrade()에서 파일 내용을 가져올 때를 구분
			vi.mocked(mockGitHub.getExternalFileContent).mockImplementation(
				async (_owner, _repo, path, _ref) => {
					if (path === 'package.json') {
						return '{"version": "4.0.8"}';
					}
					return 'file content';
				}
			);
			vi.mocked(mockGitHub.commitMultipleFiles).mockResolvedValue({
				success: true,
				commitSha: 'commit-sha',
			});
		});

		it('업그레이드를 성공적으로 수행한다', async () => {
			const result = await service.upgrade();

			expect(result.success).toBe(true);
			expect(result.version).toBe('v4.0.8');
			expect(result.filesUpdated).toBe(1);
		});

		it('진행 상황 콜백을 호출한다', async () => {
			const progressUpdates: QuartzUpgradeProgress[] = [];
			const onProgress = (progress: QuartzUpgradeProgress) => {
				progressUpdates.push({ ...progress });
			};

			await service.upgrade(onProgress);

			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates.some((p) => p.status === 'checking')).toBe(true);
			expect(progressUpdates.some((p) => p.status === 'downloading')).toBe(true);
			expect(progressUpdates.some((p) => p.status === 'applying')).toBe(true);
			expect(progressUpdates.some((p) => p.status === 'completed')).toBe(true);
		});

		it('업데이트가 필요 없으면 건너뛴다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.8"}',
				size: 100,
			});

			const result = await service.upgrade();

			expect(result.success).toBe(true);
			expect(result.filesUpdated).toBe(0);
			expect(mockGitHub.commitMultipleFiles).not.toHaveBeenCalled();
		});

		it('커밋 실패 시 에러를 반환한다', async () => {
			vi.mocked(mockGitHub.commitMultipleFiles).mockResolvedValue({
				success: false,
				error: 'Commit failed',
			});

			const result = await service.upgrade();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Commit failed');
		});

		it('최신 버전을 가져올 수 없으면 에러를 반환한다', async () => {
			// getExternalFileContent도 null 반환하여 getLatestVersion이 실패하도록 설정
			vi.mocked(mockGitHub.getExternalFileContent).mockResolvedValue(null);
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue(null);

			const result = await service.upgrade();

			expect(result.success).toBe(false);
			expect(result.error).toBe('Could not fetch latest version');
		});
	});

	describe('abort', () => {
		it('진행 중인 업그레이드를 중단한다', async () => {
			vi.mocked(mockGitHub.getFile).mockResolvedValue({
				path: 'package.json',
				sha: 'abc',
				content: '{"version": "4.0.5"}',
				size: 100,
			});
			vi.mocked(mockGitHub.getLatestRelease).mockResolvedValue({
				tagName: 'v4.0.8',
				name: 'Quartz v4.0.8',
				publishedAt: '2024-01-01T00:00:00Z',
				body: 'Release notes',
			});
			vi.mocked(mockGitHub.getExternalTree).mockResolvedValue([
				{ path: 'quartz/file1.ts', mode: '100644', type: 'blob', sha: 'sha1' },
			]);
			// getLatestVersion()에서 v4 브랜치의 package.json을 가져올 때와
			// upgrade()에서 파일 내용을 가져올 때를 구분 (지연 포함)
			vi.mocked(mockGitHub.getExternalFileContent).mockImplementation(
				async (_owner, _repo, path, _ref) => {
					if (path === 'package.json') {
						return '{"version": "4.0.8"}';
					}
					// 지연을 시뮬레이션
					await new Promise((resolve) => setTimeout(resolve, 100));
					return 'content';
				}
			);

			// 업그레이드 시작 후 즉시 중단
			const upgradePromise = service.upgrade();
			service.abort();

			const result = await upgradePromise;

			expect(result.success).toBe(false);
			expect(result.error).toBe('Upgrade aborted');
		});
	});
});
