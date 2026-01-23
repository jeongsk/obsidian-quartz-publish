import { describe, it, expect, beforeEach, vi } from "vitest";
import { StatusService } from "./status";
import { RemoteSyncService } from "./syncer";
import type { TFile } from "obsidian";
import type { PublishRecord } from "../../../app/types";

describe("StatusService - Remote Sync Integration", () => {
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
      cachedRead: vi.fn(() => "# Test\n\nContent"),
      getAbstractFileByPath: vi.fn(() => null),
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
        {
          path: "content/posts/hello.md",
          mode: "100644",
          type: "blob",
          sha: "remote-abc123",
          size: 1024,
        },
      ]),
    };

    remoteSyncService = new RemoteSyncService({
      github: mockGitHub,
      contentPath: "content",
    });

    // Mock publish records
    mockRecords = {
      "posts/hello.md": {
        id: "test-id",
        localPath: "posts/hello.md",
        remotePath: "content/posts/hello.md",
        contentHash: "local-hash-123",
        publishedAt: Date.now(),
        remoteSha: "old-sha-456", // 원격 SHA와 다름
        attachments: [],
      },
    };

    statusService = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => mockRecords,
      contentPath: "content",
      staticPath: "static",
      remoteSyncService,
      getRemoteSyncCache: () => undefined,
      setRemoteSyncCache: vi.fn(),
    });
  });

  it("should detect modified files when remote SHA differs", async () => {
    // Mock file
    const mockFile: Partial<TFile> = {
      path: "posts/hello.md",
      name: "hello.md",
      basename: "hello",
      stat: { mtime: Date.now(), ctime: Date.now(), size: 100 },
    };

    vi.spyOn(mockVault, "getMarkdownFiles").mockReturnValue([mockFile as unknown as TFile]); // eslint-disable-line obsidianmd/no-tfile-tfolder-cast

    // 원격 동기화 후 상태 계산
    const syncSuccess = await statusService.syncWithRemote();
    expect(syncSuccess).toBe(true);

    const overview = await statusService.calculateStatusOverview();

    // remoteSha가 다르므로 modified로 표시되어야 함
    expect(overview.modified).toHaveLength(1);
    expect(overview.modified[0].file.path).toBe("posts/hello.md");
  });

  it("should use cached data when cache is valid", async () => {
    const validCache = {
      files: [
        { path: "content/posts/hello.md", sha: "cached-sha", size: 1024, type: "blob" as const },
      ],
      fetchedAt: Date.now(),
      validUntil: Date.now() + 300000, // 5분 후
    };

    statusService = new StatusService({
      vault: mockVault,
      metadataCache: mockMetadataCache,
      getPublishRecords: () => mockRecords,
      contentPath: "content",
      staticPath: "static",
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
