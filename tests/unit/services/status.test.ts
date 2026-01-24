/**
 * StatusService Unit Tests
 *
 * T005: getPublishableFiles() 테스트
 * T006: calculateFileStatus() 테스트
 * T007: findDeletedNotes() 테스트
 * T008: calculateStatusOverview() 테스트
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  StatusService,
  StatusProgressCallback,
} from "../../../src/features/sync-content/model/status";
import { Vault, MetadataCache, TFile } from "../../mocks/obsidian";
import type { PublishRecord, NoteStatus, StatusOverview } from "../../../src/app/types";

describe("StatusService", () => {
  let vault: Vault;
  let metadataCache: MetadataCache;
  let publishRecords: Record<string, PublishRecord>;
  let statusService: StatusService;

  beforeEach(() => {
    vault = new Vault();
    metadataCache = new MetadataCache();
    publishRecords = {};

    statusService = new StatusService({
      vault,
      metadataCache,
      getPublishRecords: () => publishRecords,
      contentPath: "content",
      staticPath: "static",
    });
  });

  // =========================================================================
  // T005: getPublishableFiles() 테스트
  // =========================================================================

  describe("getPublishableFiles()", () => {
    it("publish: true인 파일만 반환한다", () => {
      // Given: 여러 파일이 있고, 일부만 publish: true
      const file1 = vault._addFile("notes/note1.md", "---\npublish: true\n---\n# Note 1");
      const file2 = vault._addFile("notes/note2.md", "---\npublish: false\n---\n# Note 2");
      const file3 = vault._addFile("notes/note3.md", "---\npublish: true\n---\n# Note 3");
      const file4 = vault._addFile("notes/note4.md", "# Note 4 (no frontmatter)");

      metadataCache._setMetadata("notes/note1.md", { frontmatter: { publish: true } });
      metadataCache._setMetadata("notes/note2.md", { frontmatter: { publish: false } });
      metadataCache._setMetadata("notes/note3.md", { frontmatter: { publish: true } });
      metadataCache._setMetadata("notes/note4.md", {});

      // When: getPublishableFiles() 호출
      const result = statusService.getPublishableFiles();

      // Then: publish: true인 파일만 반환
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.path)).toContain("notes/note1.md");
      expect(result.map((f) => f.path)).toContain("notes/note3.md");
    });

    it("마크다운 파일만 반환한다", () => {
      // Given: 마크다운 파일과 다른 파일들
      vault._addFile("notes/note.md", "---\npublish: true\n---\n# Note");
      vault._addFile("images/image.png", "binary data");
      vault._addFile("data/config.json", "{}");

      metadataCache._setMetadata("notes/note.md", { frontmatter: { publish: true } });

      // When: getPublishableFiles() 호출
      const result = statusService.getPublishableFiles();

      // Then: 마크다운 파일만 반환
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("notes/note.md");
    });

    it("파일이 없으면 빈 배열을 반환한다", () => {
      // When: getPublishableFiles() 호출
      const result = statusService.getPublishableFiles();

      // Then: 빈 배열 반환
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // T006: calculateFileStatus() 테스트
  // =========================================================================

  describe("calculateFileStatus()", () => {
    it("신규 파일을 올바르게 식별한다 (publish record 없음)", async () => {
      // Given: publish record가 없는 파일
      const file = vault._addFile("notes/new-note.md", "---\npublish: true\n---\n# New Note");
      metadataCache._setMetadata("notes/new-note.md", { frontmatter: { publish: true } });

      // When: calculateFileStatus() 호출
      const result = await statusService.calculateFileStatus(file);

      // Then: 상태가 'new'
      expect(result.status).toBe("new");
      expect(result.file.path).toBe("notes/new-note.md");
      expect(result.record).toBeUndefined();
    });

    it("수정된 파일을 해시 비교로 감지한다", async () => {
      // Given: publish record가 있지만 해시가 다른 파일
      const content = "---\npublish: true\n---\n# Modified Note (changed)";
      const file = vault._addFile("notes/modified-note.md", content);
      metadataCache._setMetadata("notes/modified-note.md", { frontmatter: { publish: true } });

      publishRecords["notes/modified-note.md"] = {
        id: "hash123",
        localPath: "notes/modified-note.md",
        remotePath: "content/notes/modified-note.md",
        contentHash: "old-hash-different-from-current",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha123",
        attachments: [],
      };

      // When: calculateFileStatus() 호출
      const result = await statusService.calculateFileStatus(file);

      // Then: 상태가 'modified'
      expect(result.status).toBe("modified");
      expect(result.record).toBeDefined();
    });

    it("최신 파일을 올바르게 식별한다 (해시 일치)", async () => {
      // Given: publish record가 있고 해시가 일치하는 파일
      const content = "---\npublish: true\n---\n# Synced Note";
      const file = vault._addFile("notes/synced-note.md", content);
      metadataCache._setMetadata("notes/synced-note.md", { frontmatter: { publish: true } });

      // 해시 계산 후 동일한 해시로 publish record 설정
      const hash = await statusService.calculateHash(content);
      publishRecords["notes/synced-note.md"] = {
        id: "hash456",
        localPath: "notes/synced-note.md",
        remotePath: "content/notes/synced-note.md",
        contentHash: hash,
        publishedAt: Date.now() - 1000,
        remoteSha: "sha456",
        attachments: [],
      };

      // When: calculateFileStatus() 호출
      const result = await statusService.calculateFileStatus(file);

      // Then: 상태가 'synced'
      expect(result.status).toBe("synced");
    });

    it("publish: false로 변경된 파일을 감지한다", async () => {
      // Given: publish record가 있지만 publish: false인 파일
      const file = vault._addFile(
        "notes/unpublished-note.md",
        "---\npublish: false\n---\n# Unpublished"
      );
      metadataCache._setMetadata("notes/unpublished-note.md", { frontmatter: { publish: false } });

      publishRecords["notes/unpublished-note.md"] = {
        id: "hash789",
        localPath: "notes/unpublished-note.md",
        remotePath: "content/notes/unpublished-note.md",
        contentHash: "some-hash",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha789",
        attachments: [],
      };

      // When: calculateFileStatus() 호출
      const result = await statusService.calculateFileStatus(file);

      // Then: 상태가 'unpublished'
      expect(result.status).toBe("unpublished");
    });
  });

  // =========================================================================
  // T007: findDeletedNotes() 테스트
  // =========================================================================

  describe("findDeletedNotes()", () => {
    it("로컬에서 삭제된 노트를 반환한다", () => {
      // Given: publish record는 있지만 로컬 파일이 없음
      publishRecords["notes/deleted-note.md"] = {
        id: "hash-deleted",
        localPath: "notes/deleted-note.md",
        remotePath: "content/notes/deleted-note.md",
        contentHash: "some-hash",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha-deleted",
        attachments: [],
      };

      // When: findDeletedNotes() 호출
      const result = statusService.findDeletedNotes();

      // Then: 삭제된 노트가 반환됨
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("deleted");
      expect(result[0].record?.localPath).toBe("notes/deleted-note.md");
    });

    it("publish: false로 변경된 노트도 삭제 필요로 반환한다", () => {
      // Given: publish: false로 변경된 파일
      vault._addFile("notes/unpublished-note.md", "---\npublish: false\n---\n# Content");
      metadataCache._setMetadata("notes/unpublished-note.md", { frontmatter: { publish: false } });

      publishRecords["notes/unpublished-note.md"] = {
        id: "hash-unpub",
        localPath: "notes/unpublished-note.md",
        remotePath: "content/notes/unpublished-note.md",
        contentHash: "some-hash",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha-unpub",
        attachments: [],
      };

      // When: findDeletedNotes() 호출
      const result = statusService.findDeletedNotes();

      // Then: unpublished 노트가 삭제 필요로 반환됨
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("deleted");
    });

    it("삭제할 노트가 없으면 빈 배열을 반환한다", () => {
      // Given: 모든 publish record에 해당하는 파일이 존재하고 publish: true
      vault._addFile("notes/note.md", "---\npublish: true\n---\n# Content");
      metadataCache._setMetadata("notes/note.md", { frontmatter: { publish: true } });

      publishRecords["notes/note.md"] = {
        id: "hash",
        localPath: "notes/note.md",
        remotePath: "content/notes/note.md",
        contentHash: "some-hash",
        publishedAt: Date.now(),
        remoteSha: "sha",
        attachments: [],
      };

      // When: findDeletedNotes() 호출
      const result = statusService.findDeletedNotes();

      // Then: 빈 배열 반환
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // T008: calculateStatusOverview() 테스트 (청크 처리 포함)
  // =========================================================================

  describe("calculateStatusOverview()", () => {
    it("모든 상태별 노트를 올바르게 그룹화한다", async () => {
      // Given: 다양한 상태의 노트들
      // 신규 노트
      vault._addFile("notes/new.md", "---\npublish: true\n---\n# New");
      metadataCache._setMetadata("notes/new.md", { frontmatter: { publish: true } });

      // 수정된 노트
      vault._addFile("notes/modified.md", "---\npublish: true\n---\n# Modified");
      metadataCache._setMetadata("notes/modified.md", { frontmatter: { publish: true } });
      publishRecords["notes/modified.md"] = {
        id: "hash-mod",
        localPath: "notes/modified.md",
        remotePath: "content/notes/modified.md",
        contentHash: "old-hash",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha-mod",
        attachments: [],
      };

      // 최신 노트
      const syncedContent = "---\npublish: true\n---\n# Synced";
      vault._addFile("notes/synced.md", syncedContent);
      metadataCache._setMetadata("notes/synced.md", { frontmatter: { publish: true } });
      const syncedHash = await statusService.calculateHash(syncedContent);
      publishRecords["notes/synced.md"] = {
        id: "hash-sync",
        localPath: "notes/synced.md",
        remotePath: "content/notes/synced.md",
        contentHash: syncedHash,
        publishedAt: Date.now() - 1000,
        remoteSha: "sha-sync",
        attachments: [],
      };

      // 삭제된 노트 (로컬 파일 없음)
      publishRecords["notes/deleted.md"] = {
        id: "hash-del",
        localPath: "notes/deleted.md",
        remotePath: "content/notes/deleted.md",
        contentHash: "some-hash",
        publishedAt: Date.now() - 1000,
        remoteSha: "sha-del",
        attachments: [],
      };

      // When: calculateStatusOverview() 호출
      const result = await statusService.calculateStatusOverview();

      // Then: 각 카테고리에 올바른 노트가 포함됨
      expect(result.new).toHaveLength(1);
      expect(result.modified).toHaveLength(1);
      expect(result.synced).toHaveLength(1);
      expect(result.deleted).toHaveLength(1);

      expect(result.new[0].file.path).toBe("notes/new.md");
      expect(result.modified[0].file.path).toBe("notes/modified.md");
      expect(result.synced[0].file.path).toBe("notes/synced.md");
      expect(result.deleted[0].record?.localPath).toBe("notes/deleted.md");
    });

    it("진행 콜백을 올바르게 호출한다", async () => {
      // Given: 여러 파일
      for (let i = 0; i < 5; i++) {
        vault._addFile(`notes/note${i}.md`, `---\npublish: true\n---\n# Note ${i}`);
        metadataCache._setMetadata(`notes/note${i}.md`, { frontmatter: { publish: true } });
      }

      const progressCallback = vi.fn();

      // When: calculateStatusOverview() 호출
      await statusService.calculateStatusOverview(progressCallback);

      // Then: 진행 콜백이 호출됨
      expect(progressCallback).toHaveBeenCalled();
      // 최소 1번은 호출되어야 함
      expect(progressCallback.mock.calls.length).toBeGreaterThan(0);
      // 마지막 호출에서 total과 processed가 일치해야 함 (완료)
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
      expect(lastCall[0]).toBe(lastCall[1]); // processed === total
    });

    it("대량 파일을 청크 단위로 처리한다", async () => {
      // Given: 많은 파일 (100개)
      const fileCount = 100;
      for (let i = 0; i < fileCount; i++) {
        vault._addFile(`notes/note${i}.md`, `---\npublish: true\n---\n# Note ${i}`);
        metadataCache._setMetadata(`notes/note${i}.md`, { frontmatter: { publish: true } });
      }

      const progressUpdates: Array<[number, number]> = [];
      const progressCallback: StatusProgressCallback = (processed, total) => {
        progressUpdates.push([processed, total]);
      };

      // When: calculateStatusOverview() 호출
      const result = await statusService.calculateStatusOverview(progressCallback);

      // Then: 결과가 올바름
      expect(result.new).toHaveLength(fileCount);

      // 진행 콜백이 여러 번 호출됨 (청크 단위)
      expect(progressUpdates.length).toBeGreaterThan(1);

      // 마지막 업데이트에서 모든 파일이 처리됨
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate[0]).toBe(fileCount);
      expect(lastUpdate[1]).toBe(fileCount);
    });

    it("발행 대상이 없으면 모두 빈 배열을 반환한다", async () => {
      // Given: publish: true인 파일 없음
      vault._addFile("notes/private.md", "# Private Note");
      metadataCache._setMetadata("notes/private.md", {});

      // When: calculateStatusOverview() 호출
      const result = await statusService.calculateStatusOverview();

      // Then: 모든 카테고리가 빈 배열
      expect(result.new).toEqual([]);
      expect(result.modified).toEqual([]);
      expect(result.synced).toEqual([]);
      expect(result.deleted).toEqual([]);
    });
  });

  // =========================================================================
  // calculateHash() 테스트
  // =========================================================================

  describe("calculateHash()", () => {
    it("동일한 콘텐츠에 대해 일관된 해시를 반환한다", async () => {
      // Given: 동일한 콘텐츠
      const content = "# Test Content\n\nThis is test content.";

      // When: 두 번 해시 계산
      const hash1 = await statusService.calculateHash(content);
      const hash2 = await statusService.calculateHash(content);

      // Then: 동일한 해시
      expect(hash1).toBe(hash2);
    });

    it("다른 콘텐츠에 대해 다른 해시를 반환한다", async () => {
      // Given: 다른 콘텐츠
      const content1 = "# Content 1";
      const content2 = "# Content 2";

      // When: 각각 해시 계산
      const hash1 = await statusService.calculateHash(content1);
      const hash2 = await statusService.calculateHash(content2);

      // Then: 다른 해시
      expect(hash1).not.toBe(hash2);
    });
  });
});
