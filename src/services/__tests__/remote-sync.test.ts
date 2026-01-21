import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoteSyncService } from '../remote-sync';
import type { GitHubService } from '../github';

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
