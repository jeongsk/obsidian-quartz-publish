/**
 * PublishRecordStorage Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PublishRecordStorage } from "../../../src/entities/publish-record/model/storage";
import { PUBLISH_RECORDS_VERSION } from "../../../src/app/types";
import type { PublishRecord } from "../../../src/app/types";

// Obsidian Plugin 모의 객체 생성
function createMockPlugin(
  adapterOverrides: Record<string, unknown> = {},
  vaultOverrides: Record<string, unknown> = {}
) {
  const adapter = {
    exists: vi.fn().mockResolvedValue(false),
    read: vi.fn().mockResolvedValue("{}"),
    write: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
    ...adapterOverrides,
  };

  const vault = {
    adapter,
    getAbstractFileByPath: vi.fn().mockReturnValue(null),
    ...vaultOverrides,
  };

  const plugin = {
    app: { vault },
    manifest: { dir: ".obsidian/plugins/quartz-publish" },
  };

  return { plugin, adapter, vault };
}

function makeRecord(localPath: string, remotePath?: string): PublishRecord {
  return {
    id: "id-" + localPath,
    localPath,
    remotePath: remotePath ?? "content/" + localPath,
    contentHash: "hash123",
    publishedAt: Date.now(),
    remoteSha: "sha123",
    attachments: {},
  };
}

describe("PublishRecordStorage", () => {
  // ============================================================================
  // load
  // ============================================================================

  describe("load", () => {
    it("파일이 없으면 기본 데이터를 사용한다", async () => {
      const { plugin } = createMockPlugin({ exists: vi.fn().mockResolvedValue(false) });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.load();
      expect(storage.getRecordCount()).toBe(0);
    });

    it("유효한 파일이 있으면 데이터를 로드한다", async () => {
      const storedData = {
        version: PUBLISH_RECORDS_VERSION,
        records: {
          "note.md": makeRecord("note.md"),
        },
      };
      const { plugin } = createMockPlugin({
        exists: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockResolvedValue(JSON.stringify(storedData)),
      });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.load();
      expect(storage.getRecordCount()).toBe(1);
      expect(storage.hasRecord("note.md")).toBe(true);
    });

    it("버전이 다르면 마이그레이션 후 저장한다", async () => {
      const storedData = {
        version: 99, // 잘못된 버전
        records: {
          "note.md": makeRecord("note.md"),
        },
      };
      const writeMock = vi.fn().mockResolvedValue(undefined);
      const { plugin } = createMockPlugin({
        exists: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockResolvedValue(JSON.stringify(storedData)),
        write: writeMock,
      });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.load();
      // 마이그레이션 후 저장
      expect(writeMock).toHaveBeenCalled();
      // 레코드는 유지된다
      expect(storage.hasRecord("note.md")).toBe(true);
    });

    it("파일 읽기 에러 시 기본 데이터를 사용한다", async () => {
      const { plugin } = createMockPlugin({
        exists: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockRejectedValue(new Error("Read error")),
      });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await expect(storage.load()).resolves.not.toThrow();
      expect(storage.getRecordCount()).toBe(0);
    });
  });

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  describe("CRUD operations", () => {
    let storage: PublishRecordStorage;

    beforeEach(() => {
      const { plugin } = createMockPlugin();
      storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
    });

    it("getAllRecords는 모든 레코드를 반환한다", async () => {
      await storage.updateRecord("note.md", makeRecord("note.md"));
      const all = storage.getAllRecords();
      expect(Object.keys(all)).toHaveLength(1);
    });

    it("getRecord는 특정 레코드를 반환한다", async () => {
      const record = makeRecord("note.md");
      await storage.updateRecord("note.md", record);
      expect(storage.getRecord("note.md")).toEqual(record);
    });

    it("존재하지 않는 레코드는 undefined를 반환한다", () => {
      expect(storage.getRecord("nonexistent.md")).toBeUndefined();
    });

    it("updateRecord는 레코드를 추가한다", async () => {
      await storage.updateRecord("note.md", makeRecord("note.md"));
      expect(storage.hasRecord("note.md")).toBe(true);
    });

    it("removeRecord는 레코드를 삭제한다", async () => {
      await storage.updateRecord("note.md", makeRecord("note.md"));
      await storage.removeRecord("note.md");
      expect(storage.hasRecord("note.md")).toBe(false);
    });

    it("getRecordCount는 레코드 수를 반환한다", async () => {
      await storage.updateRecord("a.md", makeRecord("a.md"));
      await storage.updateRecord("b.md", makeRecord("b.md"));
      expect(storage.getRecordCount()).toBe(2);
    });

    it("getRecordPaths는 경로 목록을 반환한다", async () => {
      await storage.updateRecord("a.md", makeRecord("a.md"));
      await storage.updateRecord("b.md", makeRecord("b.md"));
      const paths = storage.getRecordPaths();
      expect(paths).toContain("a.md");
      expect(paths).toContain("b.md");
    });
  });

  // ============================================================================
  // cleanUpDeletedRecords
  // ============================================================================

  describe("cleanUpDeletedRecords", () => {
    let storage: PublishRecordStorage;

    beforeEach(() => {
      const { plugin } = createMockPlugin();
      storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
    });

    it("원격에 있는 파일은 유지된다", async () => {
      const records = {
        "note.md": makeRecord("note.md", "content/note.md"),
      };
      const remoteFiles = [{ path: "content/note.md", sha: "abc123" }];
      const result = await storage.cleanUpDeletedRecords(records, remoteFiles);
      expect(result.removedCount).toBe(0);
      expect("note.md" in result.cleanedRecords).toBe(true);
    });

    it("원격에 없는 파일은 삭제된다", async () => {
      const records = {
        "note.md": makeRecord("note.md", "content/note.md"),
        "deleted.md": makeRecord("deleted.md", "content/deleted.md"),
      };
      const remoteFiles = [{ path: "content/note.md", sha: "abc123" }];
      const result = await storage.cleanUpDeletedRecords(records, remoteFiles);
      expect(result.removedCount).toBe(1);
      expect("deleted.md" in result.cleanedRecords).toBe(false);
    });

    it("빈 원격 파일 목록이면 모든 레코드가 삭제된다", async () => {
      const records = {
        "note.md": makeRecord("note.md", "content/note.md"),
      };
      const result = await storage.cleanUpDeletedRecords(records, []);
      expect(result.removedCount).toBe(1);
    });
  });

  // ============================================================================
  // cleanup
  // ============================================================================

  describe("cleanup", () => {
    it("cleanupAll=true이면 모든 레코드를 삭제한다", async () => {
      const { plugin } = createMockPlugin();
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.updateRecord("a.md", makeRecord("a.md"));
      await storage.updateRecord("b.md", makeRecord("b.md"));
      const removed = await storage.cleanup(true);
      expect(removed).toBe(2);
      expect(storage.getRecordCount()).toBe(0);
    });

    it("24시간 내 재호출은 스킵된다 (cleanupAll=false)", async () => {
      const { plugin } = createMockPlugin();
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.cleanup(true); // lastCleanup 설정
      const removed = await storage.cleanup(false);
      expect(removed).toBe(0);
    });
  });

  // ============================================================================
  // migrateFromOldData
  // ============================================================================

  describe("migrateFromOldData", () => {
    it("빈 레코드를 전달하면 아무것도 하지 않는다", async () => {
      const { plugin } = createMockPlugin();
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.migrateFromOldData({});
      expect(storage.getRecordCount()).toBe(0);
    });

    it("레코드를 전달하면 저장된다", async () => {
      const writeMock = vi.fn().mockResolvedValue(undefined);
      const { plugin } = createMockPlugin({ write: writeMock });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      await storage.migrateFromOldData({ "note.md": makeRecord("note.md") });
      expect(storage.hasRecord("note.md")).toBe(true);
      expect(writeMock).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getSizeInfo / getFileSize
  // ============================================================================

  describe("getSizeInfo / getFileSize", () => {
    it("파일 크기 정보를 반환한다", async () => {
      const { plugin } = createMockPlugin({
        stat: vi.fn().mockResolvedValue({ size: 2048 }),
      });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      const info = await storage.getSizeInfo();
      expect(info.fileSize).toBe(2048);
      expect(info.formattedSize).toBeDefined();
      expect(typeof info.recordCount).toBe("number");
    });

    it("stat 에러 시 0을 반환한다", async () => {
      const { plugin } = createMockPlugin({
        stat: vi.fn().mockRejectedValue(new Error("Stat error")),
      });
      const storage = new PublishRecordStorage(plugin as unknown as import("obsidian").Plugin);
      const size = await storage.getFileSize();
      expect(size).toBe(0);
    });
  });
});
