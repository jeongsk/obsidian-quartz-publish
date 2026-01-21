/**
 * Publish Record Storage Service Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublishRecordStorage } from '../publish-record-storage';
import type { PublishRecord } from '../../types';

describe('PublishRecordStorage - cleanUpDeletedRecords', () => {
	let storage: PublishRecordStorage;
	let mockPlugin: any;
	let mockAdapter: any;
	let testRecords: Record<string, PublishRecord>;

	beforeEach(async () => {
		mockAdapter = {
			exists: vi.fn(() => Promise.resolve(false)),
			read: vi.fn(() => Promise.resolve('{"version":1,"records":{}}')),
			write: vi.fn(() => Promise.resolve()),
		};

		mockPlugin = {
			app: {
				vault: {
					adapter: mockAdapter,
				},
			},
			manifest: {
				dir: 'plugins/quartz-publish',
			},
		};

		testRecords = {
			'exists.md': {
				id: '1',
				localPath: 'exists.md',
				remotePath: 'content/exists.md',
				contentHash: 'abc',
				publishedAt: 123,
				remoteSha: 'sha1',
				attachments: [],
			},
			'deleted.md': {
				id: '2',
				localPath: 'deleted.md',
				remotePath: 'content/deleted.md',
				contentHash: 'def',
				publishedAt: 456,
				remoteSha: 'sha2',
				attachments: [],
			},
		};

		storage = new PublishRecordStorage(mockPlugin);
		await storage.load();
	});

	it('should remove records for files not in remote', async () => {
		const remoteFiles = [
			{ path: 'content/exists.md', sha: 'sha1', size: 100, type: 'blob' },
		];

		// 수동으로 레코드 설정
		for (const [localPath, record] of Object.entries(testRecords)) {
			await storage.updateRecord(localPath, record);
		}

		// cleanUpDeletedRecords 호출
		const result = await storage.cleanUpDeletedRecords(testRecords, remoteFiles);

		expect(result.removedCount).toBe(1);
		expect(result.cleanedRecords['deleted.md']).toBeUndefined();
		expect(result.cleanedRecords['exists.md']).toBeDefined();
	});

	it('should keep all records when all files exist in remote', async () => {
		const remoteFiles = [
			{ path: 'content/exists.md', sha: 'sha1', size: 100, type: 'blob' },
			{ path: 'content/deleted.md', sha: 'sha2', size: 200, type: 'blob' },
		];

		const result = await storage.cleanUpDeletedRecords(testRecords, remoteFiles);

		expect(result.removedCount).toBe(0);
		expect(result.cleanedRecords['exists.md']).toBeDefined();
		expect(result.cleanedRecords['deleted.md']).toBeDefined();
	});

	it('should remove all records when no files exist in remote', async () => {
		const remoteFiles: Array<{ path: string; sha: string; size: number; type: string }> = [];

		const result = await storage.cleanUpDeletedRecords(testRecords, remoteFiles);

		expect(result.removedCount).toBe(2);
		expect(Object.keys(result.cleanedRecords)).toHaveLength(0);
	});
});
