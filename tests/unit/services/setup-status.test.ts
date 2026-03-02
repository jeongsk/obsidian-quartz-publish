/**
 * SetupStatusService Tests
 */

import { describe, it, expect } from "vitest";
import { SetupStatusService } from "../../../src/features/sync-content/model/setup-status";
import { DEFAULT_SETTINGS } from "../../../src/app/types";
import type { PluginSettings } from "../../../src/app/types";

function makeSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function createService(settings: Partial<PluginSettings> = {}) {
  const merged = makeSettings(settings);
  return new SetupStatusService({ getSettings: () => merged });
}

describe("SetupStatusService", () => {
  // ============================================================================
  // getStatus
  // ============================================================================

  describe("getStatus", () => {
    it("기본 설정에서 모든 상태가 false다 (repoUrl, githubToken 없음)", () => {
      const service = createService({ repoUrl: "", githubToken: "" });
      const status = service.getStatus();
      expect(status.hasGitHubAccount).toBe(true); // 항상 true
      expect(status.hasForkedRepo).toBe(false);
      expect(status.hasToken).toBe(false);
      expect(status.isConnected).toBe(false);
    });

    it("유효한 repoUrl이 있으면 hasForkedRepo가 true다", () => {
      const service = createService({ repoUrl: "https://github.com/user/repo" });
      expect(service.getStatus().hasForkedRepo).toBe(true);
    });

    it("유효하지 않은 repoUrl이면 hasForkedRepo가 false다", () => {
      const service = createService({ repoUrl: "not-a-url" });
      expect(service.getStatus().hasForkedRepo).toBe(false);
    });

    it("http:// URL도 repoUrl로 유효하다", () => {
      const service = createService({ repoUrl: "http://github.com/user/repo" });
      expect(service.getStatus().hasForkedRepo).toBe(true);
    });

    it("후행 슬래시가 있는 repoUrl도 유효하다", () => {
      const service = createService({ repoUrl: "https://github.com/user/repo/" });
      expect(service.getStatus().hasForkedRepo).toBe(true);
    });

    it("ghp_ 접두사 토큰은 유효하다", () => {
      const service = createService({ githubToken: "ghp_abc123def456" });
      expect(service.getStatus().hasToken).toBe(true);
    });

    it("github_pat_ 접두사 토큰은 유효하다", () => {
      const service = createService({ githubToken: "github_pat_abc123" });
      expect(service.getStatus().hasToken).toBe(true);
    });

    it("40자 hex classic 토큰은 유효하다", () => {
      const service = createService({ githubToken: "a".repeat(40) });
      expect(service.getStatus().hasToken).toBe(true);
    });

    it("빈 토큰은 유효하지 않다", () => {
      const service = createService({ githubToken: "" });
      expect(service.getStatus().hasToken).toBe(false);
    });

    it("공백만 있는 토큰은 유효하지 않다", () => {
      const service = createService({ githubToken: "   " });
      expect(service.getStatus().hasToken).toBe(false);
    });

    it("임의의 문자열 토큰은 유효하지 않다", () => {
      const service = createService({ githubToken: "my-token" });
      expect(service.getStatus().hasToken).toBe(false);
    });

    it("repoUrl과 token이 모두 있으면 isConnected가 true다", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "ghp_validtoken",
      });
      const status = service.getStatus();
      expect(status.isConnected).toBe(true);
    });

    it("repoUrl은 있지만 token이 없으면 isConnected가 false다", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "",
      });
      expect(service.getStatus().isConnected).toBe(false);
    });
  });

  // ============================================================================
  // isComplete
  // ============================================================================

  describe("isComplete", () => {
    it("repoUrl과 token이 모두 있으면 true를 반환한다", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "ghp_validtoken",
      });
      expect(service.isComplete()).toBe(true);
    });

    it("하나라도 빠지면 false를 반환한다", () => {
      const service = createService({
        repoUrl: "",
        githubToken: "ghp_validtoken",
      });
      expect(service.isComplete()).toBe(false);
    });
  });

  // ============================================================================
  // getCompletedStepCount
  // ============================================================================

  describe("getCompletedStepCount", () => {
    it("아무 설정도 없으면 1단계만 완료 (hasGitHubAccount는 항상 true)", () => {
      const service = createService({ repoUrl: "", githubToken: "" });
      expect(service.getCompletedStepCount()).toBe(1);
    });

    it("repoUrl만 있으면 2단계 완료", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "",
      });
      expect(service.getCompletedStepCount()).toBe(2);
    });

    it("token만 있으면 2단계 완료 (account + token)", () => {
      const service = createService({
        repoUrl: "",
        githubToken: "ghp_validtoken",
      });
      expect(service.getCompletedStepCount()).toBe(2);
    });

    it("모두 있으면 4단계 완료", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "ghp_validtoken",
      });
      expect(service.getCompletedStepCount()).toBe(4);
    });
  });

  // ============================================================================
  // getNextStepIndex
  // ============================================================================

  describe("getNextStepIndex", () => {
    it("repoUrl이 없으면 다음 단계가 1이다 (Fork 단계)", () => {
      const service = createService({ repoUrl: "", githubToken: "" });
      expect(service.getNextStepIndex()).toBe(1);
    });

    it("repoUrl은 있지만 token이 없으면 다음 단계가 2다", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "",
      });
      expect(service.getNextStepIndex()).toBe(2);
    });

    it("모두 설정되면 -1을 반환한다 (완료)", () => {
      const service = createService({
        repoUrl: "https://github.com/user/repo",
        githubToken: "ghp_validtoken",
      });
      expect(service.getNextStepIndex()).toBe(-1);
    });
  });
});
