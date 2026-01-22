/**
 * GitHub Service Unit Tests
 */

import { describe, it, expect } from "vitest";
import { GitHubService } from "../github";

describe("GitHubService - configuration validation", () => {
  it("should correctly parse various repo URL formats", () => {
    const service1 = new GitHubService("token", "https://github.com/user/repo", "main");
    expect(service1.getOwner()).toBe("user");
    expect(service1.getRepo()).toBe("repo");
    expect(service1.getBranch()).toBe("main");

    const service2 = new GitHubService("token", "git@github.com:user/repo.git", "develop");
    expect(service2.getOwner()).toBe("user");
    expect(service2.getRepo()).toBe("repo");
    expect(service2.getBranch()).toBe("develop");
  });

  it("should validate repo URL format", () => {
    // 유효한 URL
    const validUrls = [
      "https://github.com/user/repo",
      "https://github.com/user/repo.git",
      "git@github.com:user/repo.git",
      "https://github.com/org-name/repo-name",
    ];

    validUrls.forEach((url) => {
      const isValid = GitHubService.validateRepoUrl(url);
      expect(isValid).toBe(true);
    });

    // 유효하지 않은 URL
    const invalidUrls = [
      "",
      "not-a-url",
      "https://example.com/user/repo", // github.com이 아님
      "https://github.com/user", // 리포지토리 이름 없음
    ];

    invalidUrls.forEach((url) => {
      const isValid = GitHubService.validateRepoUrl(url);
      expect(isValid).toBe(false);
    });
  });

  it("should validate content path format", () => {
    // 유효한 경로 (후행 슬래시는 자동 제거됨)
    const validPaths = ["content", "content/posts", "docs", "blog/content", "content/", "/content"];
    validPaths.forEach((path) => {
      const isValid = GitHubService.validateContentPath(path);
      expect(isValid).toBe(true);
    });

    // 유효하지 않은 경로
    const invalidPaths = ["", "   ", "/", "  /  "];
    invalidPaths.forEach((path) => {
      const isValid = GitHubService.validateContentPath(path);
      expect(isValid).toBe(false);
    });
  });
});
