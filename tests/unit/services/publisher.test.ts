/**
 * PublishService Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublishService } from "../../../src/features/publish-note/model/publisher";
import { Vault, MetadataCache, TFile } from "../../mocks/obsidian";
import { DEFAULT_SETTINGS, DEFAULT_PUBLISH_FILTER_SETTINGS } from "../../../src/app/types";
import type { PluginSettings, PublishRecord } from "../../../src/app/types";

// GitHubService 모듈 전체를 모의로 대체
vi.mock("../../../src/entities/github/model/service", () => {
  // class는 constructor로 사용 가능
  class MockGitHubService {
    getFile = vi.fn().mockResolvedValue(null);
    createOrUpdateFile = vi.fn().mockResolvedValue({
      success: true,
      sha: "sha123",
      commitSha: "commit123",
    });
    deleteFile = vi.fn().mockResolvedValue({ success: true });
  }
  return { GitHubService: MockGitHubService };
});

function createSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return {
    ...DEFAULT_SETTINGS,
    githubToken: "test-token",
    repoUrl: "https://github.com/user/repo",
    ...overrides,
  };
}

function createMockFile(path: string, size = 100): TFile {
  const file = new TFile(path);
  file.stat.size = size;
  return file;
}

function createPublishService(
  settings?: Partial<PluginSettings>,
  metadataOverrides?: Record<string, { frontmatter?: Record<string, unknown> }>
) {
  const vault = new Vault();
  const metadataCache = new MetadataCache();

  if (metadataOverrides) {
    for (const [path, meta] of Object.entries(metadataOverrides)) {
      metadataCache._setMetadata(path, meta);
    }
  }

  const mergedSettings = createSettings(settings);
  const records: Record<string, PublishRecord> = {};
  const getRecords = vi.fn(() => records);
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const onRemove = vi.fn().mockResolvedValue(undefined);

  const service = new PublishService(
    vault as unknown as import("obsidian").Vault,
    metadataCache as unknown as import("obsidian").MetadataCache,
    mergedSettings,
    getRecords,
    onUpdate,
    onRemove
  );

  return { service, vault, metadataCache, records };
}

// ============================================================================
// validateFileSizes / findLargeFiles / getMaxFileSize
// ============================================================================

describe("PublishService - 파일 크기 검증", () => {
  it("getMaxFileSize는 50MB를 반환한다", () => {
    const { service } = createPublishService();
    expect(service.getMaxFileSize()).toBe(50 * 1024 * 1024);
  });

  it("소용량 파일은 유효하다", () => {
    const { service } = createPublishService();
    const files = [createMockFile("note.md", 1024)];
    const result = service.validateFileSizes(files as unknown as import("obsidian").TFile[]);
    expect(result.isValid).toBe(true);
  });

  it("대용량 파일은 유효하지 않다", () => {
    const { service } = createPublishService();
    const files = [createMockFile("large.md", 60 * 1024 * 1024)];
    const result = service.validateFileSizes(files as unknown as import("obsidian").TFile[]);
    expect(result.isValid).toBe(false);
    expect(result.count).toBe(1);
  });

  it("findLargeFiles는 초과 파일만 반환한다", () => {
    const { service } = createPublishService();
    const files = [createMockFile("small.md", 1024), createMockFile("large.md", 60 * 1024 * 1024)];
    const large = service.findLargeFiles(files as unknown as import("obsidian").TFile[]);
    expect(large).toHaveLength(1);
    expect(large[0].file.name).toBe("large.md");
  });
});

// ============================================================================
// shouldPublish / getFilteredPublishPath
// ============================================================================

describe("PublishService - 발행 필터", () => {
  it("기본 설정에서 모든 파일을 발행 허용한다 (폴더 제한 없음)", () => {
    const { service } = createPublishService();
    const file = createMockFile("Notes/hello.md");
    expect(service.shouldPublish(file as unknown as import("obsidian").TFile)).toBe(true);
  });

  it("제외 폴더의 파일은 shouldPublish가 false를 반환한다", () => {
    const path = "Private/secret.md";
    const { service } = createPublishService({
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        excludeFolders: ["Private"],
      },
    });
    const file = createMockFile(path);
    expect(service.shouldPublish(file as unknown as import("obsidian").TFile)).toBe(false);
  });

  it("포함 폴더가 설정된 경우 해당 폴더의 파일만 허용한다", () => {
    const { service } = createPublishService({
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        includeFolders: ["Blog"],
      },
    });
    const blogFile = createMockFile("Blog/post.md");
    const notesFile = createMockFile("Notes/other.md");
    expect(service.shouldPublish(blogFile as unknown as import("obsidian").TFile)).toBe(true);
    expect(service.shouldPublish(notesFile as unknown as import("obsidian").TFile)).toBe(false);
  });

  it("getFilteredPublishPath는 올바른 경로를 반환한다", () => {
    const { service } = createPublishService();
    const file = createMockFile("Notes/hello.md");
    const path = service.getFilteredPublishPath(file as unknown as import("obsidian").TFile);
    expect(path).toBe("Notes/hello.md");
  });

  it("rootFolder 설정 시 경로에서 루트 폴더를 제거한다", () => {
    const { service } = createPublishService({
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        rootFolder: "Blog",
      },
    });
    const file = createMockFile("Blog/posts/hello.md");
    const path = service.getFilteredPublishPath(file as unknown as import("obsidian").TFile);
    expect(path).toBe("posts/hello.md");
  });
});

// ============================================================================
// getRemotePath
// ============================================================================

describe("PublishService - getRemotePath", () => {
  it("기본 콘텐츠 경로를 적용한다", () => {
    const { service } = createPublishService({ contentPath: "content" });
    const file = createMockFile("Notes/hello.md");
    const frontmatter = {};
    const remotePath = service.getRemotePath(
      file as unknown as import("obsidian").TFile,
      frontmatter
    );
    expect(remotePath).toBe("content/Notes/hello.md");
  });

  it("frontmatter.path가 있으면 해당 경로를 사용한다", () => {
    const { service } = createPublishService({ contentPath: "content" });
    const file = createMockFile("Notes/hello.md");
    const frontmatter = { path: "blog/my-post" };
    const remotePath = service.getRemotePath(
      file as unknown as import("obsidian").TFile,
      frontmatter
    );
    expect(remotePath).toContain("blog/my-post");
  });

  it("홈페이지 파일은 index.md 경로를 반환한다", () => {
    const homePagePath = "Home.md";
    const { service } = createPublishService({
      contentPath: "content",
      publishFilterSettings: {
        ...DEFAULT_PUBLISH_FILTER_SETTINGS,
        homePagePath,
      },
    });
    const file = createMockFile(homePagePath);
    const frontmatter = {};
    const remotePath = service.getRemotePath(
      file as unknown as import("obsidian").TFile,
      frontmatter
    );
    expect(remotePath).toBe("content/index.md");
  });

  it("NFC 정규화가 적용된다", () => {
    const { service } = createPublishService({ contentPath: "content" });
    const file = createMockFile("Notes/hello.md");
    const frontmatter = {};
    const remotePath = service.getRemotePath(
      file as unknown as import("obsidian").TFile,
      frontmatter
    );
    // NFC 정규화된 문자열은 normalize("NFC")를 다시 적용해도 동일하다
    expect(remotePath).toBe(remotePath.normalize("NFC"));
  });
});
