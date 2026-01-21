/**
 * Status Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatusService } from '../status';
import type { PublishRecord } from '../../types';

describe('StatusService - findDeletedNotes with remote sync', () => {
	let mockVault: any;
	let mockMetadataCache: any;
	let mockRecords: Record<string, PublishRecord>;
	let mockRemoteSyncService: any;

	beforeEach(() => {
		mockVault = {
			getAbstractFileByPath: vi.fn(),
			getMarkdownFiles: vi.fn(() => []),
		};
		mockMetadataCache = {
			getFileCache: vi.fn(),
		};
		mockRecords = {
			'posts/deleted-post.md': {
				id: 'test-id',
				localPath: 'posts/deleted-post.md',
				remotePath: 'content/posts/deleted-post.md',
				contentHash: 'abc123',
				publishedAt: 1234567890,
				remoteSha: 'sha123',
				attachments: [],
			},
			'posts/exists-post.md': {
				id: 'test-id-2',
				localPath: 'posts/exists-post.md',
				remotePath: 'content/posts/exists-post.md',
				contentHash: 'def456',
				publishedAt: 1234567891,
				remoteSha: 'sha456',
				attachments: [],
			},
		};

		mockRemoteSyncService = {
			isCacheValid: vi.fn(() => true),
		};
	});

	it('should filter out files that exist in remote (local deleted, remote exists -> show in deleted tab)', () => {
		const remoteSyncCache = {
			files: [
				{ path: 'content/posts/deleted-post.md', sha: 'sha123', size: 1000, type: 'blob' as const },
			],
			fetchedAt: Date.now(),
			validUntil: Date.now() + 300000,
		};

		const service = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			getRemoteSyncCache: () => remoteSyncCache,
			remoteSyncService: mockRemoteSyncService,
			contentPath: 'content',
			staticPath: 'static',
		});

		const deleted = service.findDeletedNotes();

		// 로컬에 없고 원격에 있는 파일은 "삭제 필요" 탭에 표시되어야 함
		expect(deleted).toHaveLength(1);
		expect(deleted[0].record?.remotePath).toBe('content/posts/deleted-post.md');
	});

	it('should filter out files that do not exist in remote (local deleted, remote deleted -> do not show)', () => {
		const remoteSyncCache = {
			files: [], // 파일이 없음 (원격에서도 삭제됨)
			fetchedAt: Date.now(),
			validUntil: Date.now() + 300000,
		};

		const service = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			getRemoteSyncCache: () => remoteSyncCache,
			remoteSyncService: mockRemoteSyncService,
			contentPath: 'content',
			staticPath: 'static',
		});

		const deleted = service.findDeletedNotes();

		// 로컬에도 없고 원격에도 없는 파일은 "삭제 필요" 탭에서 제외되어야 함
		expect(deleted).toHaveLength(0);
	});

	it('should work without remote cache (fallback to current behavior)', () => {
		const service = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			getRemoteSyncCache: () => undefined, // 캐시 없음
			contentPath: 'content',
			staticPath: 'static',
		});

		const deleted = service.findDeletedNotes();

		// 캐시가 없으면 기존 동작: 로컬에 없는 파일 모두 표시
		expect(deleted).toHaveLength(2);
	});

	it('should handle invalid cache gracefully', () => {
		const remoteSyncCache = {
			files: [],
			fetchedAt: Date.now() - 1000000, // 오래된 캐시
			validUntil: Date.now() - 500000,
		};

		mockRemoteSyncService.isCacheValid = vi.fn(() => false);

		const service = new StatusService({
			vault: mockVault,
			metadataCache: mockMetadataCache,
			getPublishRecords: () => mockRecords,
			getRemoteSyncCache: () => remoteSyncCache,
			remoteSyncService: mockRemoteSyncService,
			contentPath: 'content',
			staticPath: 'static',
		});

		const deleted = service.findDeletedNotes();

		// 캐시가 유효하지 않으면 기존 동작: 로컬에 없는 파일 모두 표시
		expect(deleted).toHaveLength(2);
	});
});
