/**
 * Status Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatusService } from "./status";
import type { PublishRecord } from "../../../app/types";

describe("StatusService - findDeletedNotes with remote sync", () => {
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
      "posts/deleted-post.md": {
        id: "test-id",
        localPath: "posts/deleted-post.md",
        remotePath: "content/posts/deleted-post.md",
        contentHash: "abc123",
        publishedAt: 1234567890,
        remoteSha: "sha123",
        attachments: [],
      },
      "posts/exists-post.md": {
        id: "test-id-2",
        localPath: "posts/exists-post.md",
        remotePath: "content/posts/exists-post.md",
        contentHash: "def456",
        publishedAt: 1234567891,
        remoteSha: "sha456",
        attachments: [],
      },
    };

    mockRemoteSyncService = {
      isCacheValid: vi.fn(() => true),
    };
  });

  it("should filter out files that exist in remote (local deleted, remote exists -> show in deleted tab)", () => {
    const remoteSyncCache = {
      files: [
        { path: "content/posts/deleted-post.md", sha: "sha123", size: 1000, type: "blob" as const },
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
      contentPath: "content",
      staticPath: "static",
    });

    const deleted = service.findDeletedNotes();

    // 로컬에 없고 원격에 있는 파일은 "삭제 필요" 탭에 표시되어야 함
    expect(deleted).toHaveLength(1);
    expect(deleted[0].record?.remotePath).toBe("content/posts/deleted-post.md");
  });

  it("should filter out files that do not exist in remote (local deleted, remote deleted -> do not show)", () => {
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
      contentPath: "content",
      staticPath: "static",
    });

    const deleted = service.findDeletedNotes();

    // 로컬에도 없고 원격에도 없는 파일은 "삭제 필요" 탭에서 제외되어야 함
    expect(deleted).toHaveLength(0);
  });

  it("should work without remote cache (fallback to current behavior)", () => {
    const service = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => mockRecords,
      getRemoteSyncCache: () => undefined, // 캐시 없음
      contentPath: "content",
      staticPath: "static",
    });

    const deleted = service.findDeletedNotes();

    // 캐시가 없으면 기존 동작: 로컬에 없는 파일 모두 표시
    expect(deleted).toHaveLength(2);
  });

  it("should handle invalid cache gracefully", () => {
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
      contentPath: "content",
      staticPath: "static",
    });

    const deleted = service.findDeletedNotes();

    // 캐시가 유효하지 않으면 기존 동작: 로컬에 없는 파일 모두 표시
    expect(deleted).toHaveLength(2);
  });
});

describe("StatusService - calculateFileStatus with no publish record", () => {
  let mockVault: any;
  let mockMetadataCache: any;
  let mockRemoteSyncService: any;
  let testFile: any;

  beforeEach(() => {
    mockVault = {
      getAbstractFileByPath: vi.fn(),
      getMarkdownFiles: vi.fn(() => []),
      cachedRead: vi.fn(),
    };
    mockMetadataCache = {
      getFileCache: vi.fn(),
    };
    mockRemoteSyncService = {
      isCacheValid: vi.fn(() => true),
    };

    testFile = {
      path: "posts/test-post.md",
      name: "test-post.md",
      basename: "test-post",
      extension: "md",
    };
  });

  // SHA256 해시 계산을 위한 헬퍼 함수
  async function calculateTestHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("should return 'new' when remote cache is invalid", async () => {
    const remoteSyncCache = {
      files: [],
      fetchedAt: Date.now(),
      validUntil: Date.now() + 300000,
    };

    mockRemoteSyncService.isCacheValid = vi.fn(() => false);

    const service = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => ({}), // 빈 레코드 (발행 기록 없음)
      getRemoteSyncCache: () => remoteSyncCache,
      remoteSyncService: mockRemoteSyncService,
      contentPath: "content",
      staticPath: "static",
    });

    mockMetadataCache.getFileCache = vi.fn(() => ({
      frontmatter: { publish: true },
    }));

    const status = await service.calculateFileStatus(testFile);
    expect(status.status).toBe("new");
  });

  it("should return 'new' when file does not exist in remote", async () => {
    const remoteSyncCache = {
      files: [{ path: "content/other-post.md", sha: "abc123", size: 1000, type: "blob" as const }],
      fetchedAt: Date.now(),
      validUntil: Date.now() + 300000,
    };

    const service = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => ({}), // 빈 레코드
      getRemoteSyncCache: () => remoteSyncCache,
      remoteSyncService: mockRemoteSyncService,
      contentPath: "content",
      staticPath: "static",
    });

    mockMetadataCache.getFileCache = vi.fn(() => ({
      frontmatter: { publish: true },
    }));

    const status = await service.calculateFileStatus(testFile);
    expect(status.status).toBe("new");
  });

  it("should return 'synced' when local hash matches remote SHA", async () => {
    const content = "test content for synced file";
    const remoteHash = await calculateTestHash(content);
    const remoteSyncCache = {
      files: [
        { path: "content/posts/test-post.md", sha: remoteHash, size: 1000, type: "blob" as const },
      ],
      fetchedAt: Date.now(),
      validUntil: Date.now() + 300000,
    };

    const service = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => ({}), // 빈 레코드
      getRemoteSyncCache: () => remoteSyncCache,
      remoteSyncService: mockRemoteSyncService,
      contentPath: "content",
      staticPath: "static",
    });

    mockMetadataCache.getFileCache = vi.fn(() => ({
      frontmatter: { publish: true },
    }));
    mockVault.cachedRead = vi.fn(() => content);

    const status = await service.calculateFileStatus(testFile);
    expect(status.status).toBe("synced");
    expect(status.localHash).toBe(remoteHash);
  });

  it("should return 'modified' when local hash differs from remote SHA", async () => {
    const remoteContent = "original remote content";
    const localContent = "modified local content";
    const remoteHash = await calculateTestHash(remoteContent);
    const localHash = await calculateTestHash(localContent);
    const remoteSyncCache = {
      files: [
        { path: "content/posts/test-post.md", sha: remoteHash, size: 1000, type: "blob" as const },
      ],
      fetchedAt: Date.now(),
      validUntil: Date.now() + 300000,
    };

    const service = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => ({}), // 빈 레코드
      getRemoteSyncCache: () => remoteSyncCache,
      remoteSyncService: mockRemoteSyncService,
      contentPath: "content",
      staticPath: "static",
    });

    mockMetadataCache.getFileCache = vi.fn(() => ({
      frontmatter: { publish: true },
    }));
    mockVault.cachedRead = vi.fn(() => localContent);

    const status = await service.calculateFileStatus(testFile);
    expect(status.status).toBe("modified");
    expect(status.localHash).toBe(localHash);
  });
});
