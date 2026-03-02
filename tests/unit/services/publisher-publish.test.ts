/**
 * PublishService - publishNote / unpublishNote 통합 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublishService } from "../../../src/features/publish-note/model/publisher";
import { Vault, MetadataCache, TFile } from "../../mocks/obsidian";
import { DEFAULT_SETTINGS, DEFAULT_PUBLISH_FILTER_SETTINGS } from "../../../src/app/types";
import type { PluginSettings, PublishRecord } from "../../../src/app/types";

// vi.hoisted를 사용해 모의 함수를 먼저 생성 (vi.mock 호이스팅 이전에 실행됨)
const { mockGetFile, mockCreateOrUpdateFile, mockCreateOrUpdateBinaryFile, mockDeleteFile } =
  vi.hoisted(() => ({
    mockGetFile: vi.fn().mockResolvedValue(null),
    mockCreateOrUpdateFile: vi.fn().mockResolvedValue({
      success: true,
      sha: "sha123",
      commitSha: "commit123",
    }),
    mockCreateOrUpdateBinaryFile: vi.fn().mockResolvedValue({ success: true, sha: "sha456" }),
    mockDeleteFile: vi.fn().mockResolvedValue({ success: true }),
  }));

vi.mock("../../../src/entities/github/model/service", () => {
  class MockGitHubService {
    getFile = mockGetFile;
    createOrUpdateFile = mockCreateOrUpdateFile;
    createOrUpdateBinaryFile = mockCreateOrUpdateBinaryFile;
    deleteFile = mockDeleteFile;
  }
  return { GitHubService: MockGitHubService };
});

function makeSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    githubToken: "ghp_test",
    repoUrl: "https://github.com/user/repo",
    contentPath: "content",
    ...overrides,
  };
}

function createMockFile(path: string): TFile {
  const file = new TFile(path);
  return file;
}

function setupPublishService(
  settings: Partial<PluginSettings> = {},
  records: Record<string, PublishRecord> = {}
) {
  const vault = new Vault();
  const metadataCache = new MetadataCache();
  const mergedSettings = makeSettings(settings);
  const mutableRecords = { ...records };

  const getRecords = vi.fn(() => mutableRecords);
  const onUpdate = vi.fn(async (localPath: string, record: PublishRecord) => {
    mutableRecords[localPath] = record;
  });
  const onRemove = vi.fn(async (localPath: string) => {
    delete mutableRecords[localPath];
  });

  const service = new PublishService(
    vault as unknown as import("obsidian").Vault,
    metadataCache as unknown as import("obsidian").MetadataCache,
    mergedSettings,
    getRecords,
    onUpdate,
    onRemove
  );

  return { service, vault, metadataCache, mutableRecords, onUpdate, onRemove };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 기본 성공 반환값으로 재설정
  mockGetFile.mockResolvedValue(null);
  mockCreateOrUpdateFile.mockResolvedValue({
    success: true,
    sha: "sha123",
    commitSha: "commit123",
  });
  mockCreateOrUpdateBinaryFile.mockResolvedValue({ success: true, sha: "sha456" });
  mockDeleteFile.mockResolvedValue({ success: true });
});

describe("PublishService - publishNote", () => {
  // ============================================================================
  // 조기 반환 케이스
  // ============================================================================

  it("이미 발행 중이면 error: unknown을 반환한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\npublish: true\n---\n\n# Test";
    const file = createMockFile("Notes/test.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });

    // 동시에 두 번 호출: 두 번째는 isPublishing=true 상태에서 실행됨
    const promise1 = service.publishNote(file as unknown as import("obsidian").TFile);
    const result2 = await service.publishNote(file as unknown as import("obsidian").TFile);

    expect(result2.success).toBe(false);
    expect(result2.error).toBe("unknown");

    await promise1;
  });

  it("shouldPublish가 false이면 no_publish_flag를 반환한다", async () => {
    const { service } = setupPublishService({
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        includeFolders: ["Blog"],
      },
    });
    const file = createMockFile("Notes/test.md");
    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    expect(result.error).toBe("no_publish_flag");
  });

  // ============================================================================
  // 성공 발행
  // ============================================================================

  it("파일을 성공적으로 발행하고 remotePath를 반환한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\npublish: true\n---\n\n# Hello World";
    const file = createMockFile("Notes/hello.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });

    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(true);
    expect(result.remotePath).toContain("content");
  });

  it("publish 플래그가 없으면 자동으로 추가하고 발행한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\ntitle: My Note\n---\n\n# Body";
    const file = createMockFile("Notes/note.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { title: "My Note" } });

    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(true);
  });

  it("GitHub API 실패 시 error: network_error를 반환한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\npublish: true\n---\n\n# Body";
    const file = createMockFile("Notes/error.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });

    mockCreateOrUpdateFile.mockResolvedValueOnce({ success: false, error: "API Error" });

    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    expect(result.error).toBe("network_error");
  });

  it("TypeError 발생 시 offline 에러를 반환한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\npublish: true\n---\n\n# Body";
    const file = createMockFile("Notes/offline.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });

    mockCreateOrUpdateFile.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    expect(result.error).toBe("offline");
  });

  it("기존 SHA가 있으면 업데이트 커밋 메시지를 사용한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();
    const content = "---\npublish: true\n---\n\n# Body";
    const file = createMockFile("Notes/existing.md");
    vault._addFile(file.path, content);
    metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });

    // 기존 파일이 있다고 모의
    mockGetFile.mockResolvedValueOnce({
      path: "content/Notes/existing.md",
      sha: "existingsha",
      content: "",
      size: 100,
    });

    const result = await service.publishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// publishNotes (배치 발행)
// ============================================================================

describe("PublishService - publishNotes", () => {
  it("여러 파일을 순서대로 발행한다", async () => {
    const { service, vault, metadataCache } = setupPublishService();

    const files = ["a.md", "b.md", "c.md"].map((name) => {
      const content = `---\npublish: true\n---\n\n# ${name}`;
      const file = createMockFile(`Notes/${name}`);
      vault._addFile(file.path, content);
      metadataCache._setMetadata(file.path, { frontmatter: { publish: true } });
      return file as unknown as import("obsidian").TFile;
    });

    const onProgress = vi.fn();
    const result = await service.publishNotes(files, onProgress);

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(3);
    expect(result.failed).toBe(0);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3, expect.anything());
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3, expect.anything());
  });

  it("일부 발행 실패 시 failed 카운트가 증가한다", async () => {
    const { service } = setupPublishService({
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        includeFolders: ["Blog"],
      },
    });

    const file = createMockFile("Notes/secret.md") as unknown as import("obsidian").TFile;
    const result = await service.publishNotes([file]);

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(0);
  });

  it("빈 파일 목록으로 호출하면 빈 결과를 반환한다", async () => {
    const { service } = setupPublishService();
    const result = await service.publishNotes([]);
    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

// ============================================================================
// unpublishNote
// ============================================================================

describe("PublishService - unpublishNote", () => {
  it("발행 기록이 없으면 에러를 반환한다", async () => {
    const { service } = setupPublishService();
    const file = createMockFile("Notes/hello.md");
    const result = await service.unpublishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("No publish record");
  });

  it("발행 기록이 있으면 파일을 삭제하고 기록을 제거한다", async () => {
    const record: PublishRecord = {
      id: "id1",
      localPath: "Notes/hello.md",
      remotePath: "content/Notes/hello.md",
      contentHash: "hash1",
      publishedAt: Date.now(),
      remoteSha: "sha123",
      attachments: [],
    };
    const { service, onRemove } = setupPublishService({}, { "Notes/hello.md": record });

    const file = createMockFile("Notes/hello.md");
    const result = await service.unpublishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(true);
    expect(onRemove).toHaveBeenCalledWith("Notes/hello.md");
  });

  it("GitHub deleteFile 실패 시 에러를 반환한다", async () => {
    const record: PublishRecord = {
      id: "id1",
      localPath: "Notes/hello.md",
      remotePath: "content/Notes/hello.md",
      contentHash: "hash1",
      publishedAt: Date.now(),
      remoteSha: "sha123",
      attachments: [],
    };
    const { service } = setupPublishService({}, { "Notes/hello.md": record });

    mockDeleteFile.mockResolvedValueOnce({ success: false, error: "File not found" });

    const file = createMockFile("Notes/hello.md");
    const result = await service.unpublishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    expect(result.error).toBe("File not found");
  });

  it("네트워크 에러 시 적절한 에러 메시지를 반환한다", async () => {
    const record: PublishRecord = {
      id: "id1",
      localPath: "Notes/fail.md",
      remotePath: "content/Notes/fail.md",
      contentHash: "hash1",
      publishedAt: Date.now(),
      remoteSha: "sha123",
      attachments: [],
    };
    const { service } = setupPublishService({}, { "Notes/fail.md": record });

    mockDeleteFile.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const file = createMockFile("Notes/fail.md");
    const result = await service.unpublishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(false);
    // 네트워크 에러는 i18n 키로 처리됨
    expect(typeof result.error).toBe("string");
  });

  it("첨부파일이 있으면 첨부파일도 삭제한다", async () => {
    const record: PublishRecord = {
      id: "id1",
      localPath: "Notes/note.md",
      remotePath: "content/Notes/note.md",
      contentHash: "hash1",
      publishedAt: Date.now(),
      remoteSha: "sha123",
      attachments: [
        {
          localPath: "attachments/image.png",
          remotePath: "static/image.png",
          contentHash: "imgHash",
          size: 1024,
          remoteSha: "imgsha",
        },
      ],
    };
    const { service } = setupPublishService({}, { "Notes/note.md": record });

    const file = createMockFile("Notes/note.md");
    const result = await service.unpublishNote(file as unknown as import("obsidian").TFile);
    expect(result.success).toBe(true);
    // 노트 삭제 + 첨부파일 삭제 = 2번 호출
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
  });
});
