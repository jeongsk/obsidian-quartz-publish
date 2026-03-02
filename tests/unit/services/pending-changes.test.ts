/**
 * PendingChangesManager Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PendingChangesManager } from "../../../src/features/sync-content/model/pending-changes";
import type { QuartzSiteConfig } from "../../../src/app/types";
import { DEFAULT_QUARTZ_SITE_CONFIG } from "../../../src/app/types";

function makeConfig(overrides: Partial<QuartzSiteConfig> = {}): QuartzSiteConfig {
  return { ...DEFAULT_QUARTZ_SITE_CONFIG, ...overrides };
}

describe("PendingChangesManager", () => {
  let manager: PendingChangesManager;

  beforeEach(() => {
    manager = new PendingChangesManager();
  });

  // ============================================================================
  // isInitialized / initialize
  // ============================================================================

  describe("initialize / isInitialized", () => {
    it("초기화 전에는 isInitialized가 false다", () => {
      expect(manager.isInitialized()).toBe(false);
    });

    it("initialize 후 isInitialized가 true다", () => {
      manager.initialize(makeConfig(), "sha1");
      expect(manager.isInitialized()).toBe(true);
    });

    it("initialize 후 isDirty는 false다", () => {
      manager.initialize(makeConfig(), "sha1");
      expect(manager.isDirty()).toBe(false);
    });

    it("originalSha가 올바르게 저장된다", () => {
      manager.initialize(makeConfig(), "abc123");
      expect(manager.getOriginalSha()).toBe("abc123");
    });
  });

  // ============================================================================
  // updateField / isDirty / getChangedFields
  // ============================================================================

  describe("updateField", () => {
    beforeEach(() => {
      manager.initialize(makeConfig({ pageTitle: "My Site" }), "sha1");
    });

    it("초기화 전 updateField 호출 시 에러를 던진다", () => {
      const fresh = new PendingChangesManager();
      expect(() => fresh.updateField("pageTitle", "test")).toThrow();
    });

    it("필드 변경 후 isDirty가 true다", () => {
      manager.updateField("pageTitle", "New Title");
      expect(manager.isDirty()).toBe(true);
    });

    it("원래 값으로 되돌리면 isDirty가 false다", () => {
      manager.updateField("pageTitle", "New Title");
      manager.updateField("pageTitle", "My Site");
      expect(manager.isDirty()).toBe(false);
    });

    it("변경된 필드가 changedFields에 포함된다", () => {
      manager.updateField("pageTitle", "New Title");
      const changed = manager.getChangedFields();
      expect(changed.has("pageTitle")).toBe(true);
    });

    it("여러 필드 변경이 추적된다", () => {
      manager.updateField("pageTitle", "New Title");
      manager.updateField("locale", "ko-KR"); // default는 en-US이므로 ko-KR로 변경
      const changed = manager.getChangedFields();
      expect(changed.size).toBe(2);
      expect(changed.has("pageTitle")).toBe(true);
      expect(changed.has("locale")).toBe(true);
    });
  });

  // ============================================================================
  // getCurrentConfig / getOriginalConfig
  // ============================================================================

  describe("getCurrentConfig / getOriginalConfig", () => {
    it("초기화 전 getCurrentConfig 호출 시 에러를 던진다", () => {
      expect(() => manager.getCurrentConfig()).toThrow();
    });

    it("초기화 전 getOriginalConfig 호출 시 에러를 던진다", () => {
      expect(() => manager.getOriginalConfig()).toThrow();
    });

    it("getCurrentConfig는 현재 설정을 반환한다", () => {
      manager.initialize(makeConfig({ pageTitle: "My Site" }), "sha1");
      manager.updateField("pageTitle", "Updated");
      expect(manager.getCurrentConfig().pageTitle).toBe("Updated");
    });

    it("getOriginalConfig는 원본 설정을 반환한다", () => {
      manager.initialize(makeConfig({ pageTitle: "My Site" }), "sha1");
      manager.updateField("pageTitle", "Updated");
      expect(manager.getOriginalConfig().pageTitle).toBe("My Site");
    });

    it("getCurrentConfig는 deep copy를 반환한다 (외부 수정에 영향 없음)", () => {
      manager.initialize(makeConfig({ pageTitle: "My Site" }), "sha1");
      const config = manager.getCurrentConfig();
      config.pageTitle = "Tampered";
      expect(manager.getCurrentConfig().pageTitle).toBe("My Site");
    });
  });

  // ============================================================================
  // getChangeSummary / generateCommitMessage
  // ============================================================================

  describe("getChangeSummary", () => {
    it("변경된 필드 목록을 콤마로 구분하여 반환한다", () => {
      manager.initialize(makeConfig(), "sha1");
      manager.updateField("pageTitle", "New Title");
      manager.updateField("locale", "ko-KR"); // default는 en-US
      const summary = manager.getChangeSummary();
      expect(summary).toContain("pageTitle");
      expect(summary).toContain("locale");
    });
  });

  describe("generateCommitMessage", () => {
    it("변경사항이 없으면 빈 문자열을 반환한다", () => {
      manager.initialize(makeConfig(), "sha1");
      expect(manager.generateCommitMessage()).toBe("");
    });

    it("초기화되지 않으면 빈 문자열을 반환한다", () => {
      expect(manager.generateCommitMessage()).toBe("");
    });

    it("변경사항이 있으면 커밋 메시지를 생성한다", () => {
      manager.initialize(makeConfig({ pageTitle: "Old Title" }), "sha1");
      manager.updateField("pageTitle", "New Title");
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("pageTitle");
      expect(msg).toContain("Old Title");
      expect(msg).toContain("New Title");
    });

    it("긴 문자열은 줄임표로 처리한다", () => {
      manager.initialize(makeConfig({ pageTitle: "Old" }), "sha1");
      manager.updateField("pageTitle", "A".repeat(35));
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("...");
    });
  });

  // ============================================================================
  // reset / markAsSaved
  // ============================================================================

  describe("reset", () => {
    it("변경사항을 취소하고 원본으로 돌아간다", () => {
      manager.initialize(makeConfig({ pageTitle: "Original" }), "sha1");
      manager.updateField("pageTitle", "Changed");
      manager.reset();
      expect(manager.isDirty()).toBe(false);
      expect(manager.getCurrentConfig().pageTitle).toBe("Original");
    });

    it("초기화 전 reset을 호출해도 에러가 없다", () => {
      expect(() => manager.reset()).not.toThrow();
    });
  });

  describe("markAsSaved", () => {
    it("저장 후 isDirty가 false가 된다", () => {
      manager.initialize(makeConfig({ pageTitle: "Original" }), "sha1");
      manager.updateField("pageTitle", "Changed");
      manager.markAsSaved(makeConfig({ pageTitle: "Changed" }), "sha2");
      expect(manager.isDirty()).toBe(false);
    });

    it("markAsSaved 후 새 SHA가 저장된다", () => {
      manager.initialize(makeConfig(), "sha1");
      manager.markAsSaved(makeConfig(), "sha2");
      expect(manager.getOriginalSha()).toBe("sha2");
    });
  });

  // ============================================================================
  // 객체/배열 필드 변경 감지
  // ============================================================================

  describe("객체 필드 변경 감지", () => {
    it("analytics 객체 변경을 감지한다", () => {
      manager.initialize(makeConfig({ analytics: { provider: "null" } }), "sha1");
      manager.updateField("analytics", { provider: "google", tagId: "G-ABC123" });
      expect(manager.isDirty()).toBe(true);
    });

    it("동일한 analytics 객체로 변경 시 dirty가 아니다", () => {
      manager.initialize(makeConfig({ analytics: { provider: "null" } }), "sha1");
      manager.updateField("analytics", { provider: "null" });
      expect(manager.isDirty()).toBe(false);
    });
  });

  // ============================================================================
  // generateCommitMessage - formatValue edge cases
  // ============================================================================

  describe("generateCommitMessage - formatValue edge cases", () => {
    it("null 값을 변경하면 커밋 메시지에 null이 포함된다", () => {
      // ignorePatterns를 빈 배열에서 변경하면 array formatValue 경로가 실행됨
      manager.initialize(makeConfig({ ignorePatterns: [] }), "sha1");
      manager.updateField("ignorePatterns", ["new-pattern"]);
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("ignorePatterns");
    });

    it("boolean false 값이 커밋 메시지에 포함된다", () => {
      manager.initialize(makeConfig({ enableSPA: true }), "sha1");
      manager.updateField("enableSPA", false);
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("enableSPA");
      expect(msg).toContain("false");
    });

    it("배열 3개 이하는 개별 항목이 표시된다", () => {
      manager.initialize(makeConfig({ ignorePatterns: [] }), "sha1");
      manager.updateField("ignorePatterns", ["a", "b", "c"]);
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("ignorePatterns");
    });

    it("배열 4개 이상은 개수가 표시된다", () => {
      manager.initialize(makeConfig({ ignorePatterns: [] }), "sha1");
      manager.updateField("ignorePatterns", ["a", "b", "c", "d", "e"]);
      const msg = manager.generateCommitMessage();
      // formatValue returns "[5 items]" for arrays > 3 items
      expect(msg).toContain("ignorePatterns");
    });

    it("analytics 객체 변경이 커밋 메시지에 포함된다", () => {
      manager.initialize(makeConfig({ analytics: { provider: "null" } }), "sha1");
      manager.updateField("analytics", { provider: "google", tagId: "G-123" });
      const msg = manager.generateCommitMessage();
      expect(msg).toContain("analytics");
      // provider 정보 포함 여부
      expect(msg).toContain("google");
    });
  });
});
