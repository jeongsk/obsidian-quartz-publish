/**
 * URL Utility Tests
 */

import { describe, it, expect } from "vitest";
import { isValidGitHubUrl, normalizeBaseUrl } from "../../../src/shared/lib/url";

describe("isValidGitHubUrl", () => {
  describe("유효한 GitHub URL", () => {
    it("기본 형식 https://github.com/user/repo를 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/repo")).toBe(true);
    });

    it("하이픈이 포함된 사용자명을 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/my-user/my-repo")).toBe(true);
    });

    it("점이 포함된 저장소명을 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/my-repo.js")).toBe(true);
    });

    it("숫자가 포함된 이름을 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/user123/repo456")).toBe(true);
    });

    it("후행 슬래시가 있는 URL을 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/repo/")).toBe(true);
    });

    it("밑줄이 포함된 저장소명을 허용한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/my_repo")).toBe(true);
    });
  });

  describe("유효하지 않은 GitHub URL", () => {
    it("빈 문자열을 거부한다", () => {
      expect(isValidGitHubUrl("")).toBe(false);
    });

    it("gitlab.com URL을 거부한다", () => {
      expect(isValidGitHubUrl("https://gitlab.com/user/repo")).toBe(false);
    });

    it("http:// 프로토콜을 거부한다", () => {
      expect(isValidGitHubUrl("http://github.com/user/repo")).toBe(false);
    });

    it("저장소명이 없는 URL을 거부한다", () => {
      expect(isValidGitHubUrl("https://github.com/user")).toBe(false);
    });

    it("슬래시로 끝나지만 저장소가 없는 URL을 거부한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/")).toBe(false);
    });

    it("경로가 더 깊은 URL을 거부한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/repo/tree/main")).toBe(false);
    });

    it("프로토콜이 없는 URL을 거부한다", () => {
      expect(isValidGitHubUrl("github.com/user/repo")).toBe(false);
    });

    it("공백이 포함된 URL을 거부한다", () => {
      expect(isValidGitHubUrl("https://github.com/user/my repo")).toBe(false);
    });
  });
});

describe("normalizeBaseUrl", () => {
  describe("https:// 프로토콜 추가", () => {
    it("프로토콜이 없는 URL에 https://를 추가한다", () => {
      expect(normalizeBaseUrl("example.com")).toBe("https://example.com");
    });

    it("서브도메인이 있는 URL에도 https://를 추가한다", () => {
      expect(normalizeBaseUrl("my.site.example.com")).toBe("https://my.site.example.com");
    });

    it("경로가 있는 URL에도 https://를 추가한다", () => {
      expect(normalizeBaseUrl("example.com/blog")).toBe("https://example.com/blog");
    });
  });

  describe("기존 프로토콜 유지", () => {
    it("이미 https://가 있으면 그대로 반환한다", () => {
      expect(normalizeBaseUrl("https://example.com")).toBe("https://example.com");
    });

    it("http://로 시작하는 URL을 그대로 반환한다", () => {
      expect(normalizeBaseUrl("http://example.com")).toBe("http://example.com");
    });
  });

  describe("엣지 케이스", () => {
    it("빈 문자열을 빈 문자열로 반환한다", () => {
      expect(normalizeBaseUrl("")).toBe("");
    });
  });
});
