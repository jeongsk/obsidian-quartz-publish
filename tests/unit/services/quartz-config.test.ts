import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  QuartzConfigService,
  type ParsedQuartzConfig,
} from "../../../src/entities/quartz/model/config";
import type { GitHubService } from "../../../src/entities/github/model/service";

describe("QuartzConfigService", () => {
  let mockGitHub: GitHubService;
  let service: QuartzConfigService;

  beforeEach(() => {
    mockGitHub = {
      getFile: vi.fn(),
      createOrUpdateFile: vi.fn(),
    } as unknown as GitHubService;

    service = new QuartzConfigService(mockGitHub);
  });

  describe("parseConfig", () => {
    it("ExplicitPublish가 활성화된 설정을 파싱한다", () => {
      const content = `
				filters: [Plugin.ExplicitPublish()]
			`;
      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.explicitPublish).toBe(true);
    });

    it("RemoveDrafts가 있는 경우 ExplicitPublish가 비활성화로 파싱된다", () => {
      const content = `
				filters: [Plugin.RemoveDrafts()]
			`;
      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.explicitPublish).toBe(false);
    });

    it("ignorePatterns 배열을 파싱한다", () => {
      const content = `
				configuration: {
					ignorePatterns: ["private", "templates", ".obsidian"]
				}
			`;
      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.ignorePatterns).toEqual(["private", "templates", ".obsidian"]);
    });

    it("빈 ignorePatterns 배열을 파싱한다", () => {
      const content = `
				configuration: {
					ignorePatterns: []
				}
			`;
      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.ignorePatterns).toEqual([]);
    });

    it("ignorePatterns가 없으면 빈 배열을 반환한다", () => {
      const content = `
				configuration: {}
			`;
      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.ignorePatterns).toEqual([]);
    });

    it("실제 quartz.config.ts 형식을 파싱한다", () => {
      const content = `
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "My Digital Garden",
    enableSPA: true,
    enablePopovers: true,
    analytics: { provider: "plausible" },
    locale: "ko-KR",
    baseUrl: "example.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({ priority: ["frontmatter", "filesystem"] }),
    ],
    filters: [Plugin.ExplicitPublish()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
    ],
  },
}

export default config
			`;

      const result = service.parseConfig(content);

      expect(result).not.toBeNull();
      expect(result?.explicitPublish).toBe(true);
      expect(result?.ignorePatterns).toEqual(["private", "templates", ".obsidian"]);
    });
  });

  describe("parseStringArray", () => {
    it("쌍따옴표로 둘러싸인 문자열을 파싱한다", () => {
      const result = service.parseStringArray('"a", "b", "c"');
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("홑따옴표로 둘러싸인 문자열을 파싱한다", () => {
      const result = service.parseStringArray("'a', 'b', 'c'");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("빈 문자열에서 빈 배열을 반환한다", () => {
      const result = service.parseStringArray("");
      expect(result).toEqual([]);
    });

    it("glob 패턴을 파싱한다", () => {
      const result = service.parseStringArray('"**/*.draft.md", "private/*"');
      expect(result).toEqual(["**/*.draft.md", "private/*"]);
    });
  });

  describe("setExplicitPublish", () => {
    it("RemoveDrafts를 ExplicitPublish로 교체한다", () => {
      const content = "filters: [Plugin.RemoveDrafts()]";
      const result = service.setExplicitPublish(content, true);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain("Plugin.ExplicitPublish()");
      expect(result.newContent).not.toContain("Plugin.RemoveDrafts()");
    });

    it("ExplicitPublish를 RemoveDrafts로 교체한다", () => {
      const content = "filters: [Plugin.ExplicitPublish()]";
      const result = service.setExplicitPublish(content, false);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain("Plugin.RemoveDrafts()");
      expect(result.newContent).not.toContain("Plugin.ExplicitPublish()");
    });

    it("필터가 없으면 추가한다", () => {
      const content = "filters: []";
      const result = service.setExplicitPublish(content, true);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain("Plugin.ExplicitPublish()");
    });

    it("이미 원하는 필터가 있으면 변경하지 않는다", () => {
      const content = "filters: [Plugin.ExplicitPublish()]";
      const result = service.setExplicitPublish(content, true);

      expect(result.success).toBe(true);
      expect(result.newContent).toBe(content);
    });

    it("filters 배열이 없으면 에러를 반환한다", () => {
      const content = "plugins: {}";
      const result = service.setExplicitPublish(content, true);

      expect(result.success).toBe(false);
      expect(result.error).toBe("filters 배열을 찾을 수 없습니다");
    });

    it("다른 필터와 함께 있을 때 정확히 교체한다", () => {
      const content = "filters: [Plugin.RemoveDrafts(), Plugin.SomeOther()]";
      const result = service.setExplicitPublish(content, true);

      expect(result.success).toBe(true);
      expect(result.newContent).toBe("filters: [Plugin.ExplicitPublish(), Plugin.SomeOther()]");
    });
  });

  describe("setIgnorePatterns", () => {
    it("기존 ignorePatterns를 새 패턴으로 교체한다", () => {
      const content = 'ignorePatterns: ["old"]';
      const result = service.setIgnorePatterns(content, ["new1", "new2"]);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain('ignorePatterns: ["new1", "new2"]');
    });

    it("빈 배열로 설정할 수 있다", () => {
      const content = 'ignorePatterns: ["old"]';
      const result = service.setIgnorePatterns(content, []);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain("ignorePatterns: []");
    });

    it("glob 패턴을 올바르게 설정한다", () => {
      const content = "ignorePatterns: []";
      const result = service.setIgnorePatterns(content, ["**/*.draft.md", "private/*"]);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain('"**/*.draft.md"');
      expect(result.newContent).toContain('"private/*"');
    });

    it("중첩 객체(analytics)가 있는 configuration 블록에서도 올바르게 동작한다", () => {
      const content = `const config = {
  configuration: {
    pageTitle: "Test",
    analytics: {
      provider: "plausible"
    },
    locale: "ko-KR"
  }
}`;
      const result = service.setIgnorePatterns(content, ["private", "templates"]);

      expect(result.success).toBe(true);
      expect(result.newContent).toContain('ignorePatterns: ["private", "templates"]');
      // analytics 블록이 그대로 유지되어야 함
      expect(result.newContent).toContain("analytics: {");
      expect(result.newContent).toContain('provider: "plausible"');
      // ignorePatterns가 configuration 블록 내부에 추가되어야 함
      expect(result.newContent).not.toContain(
        'analytics: {\n      provider: "plausible"\n    },\n    ignorePatterns'
      );
    });

    it("configuration 블록이 없으면 에러를 반환한다", () => {
      const content = "const config = {}";
      const result = service.setIgnorePatterns(content, ["test"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("configuration 블록을 찾을 수 없습니다");
    });
  });

  describe("fetchQuartzConfig", () => {
    it("GitHub에서 quartz.config.ts를 조회한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue({
        path: "quartz.config.ts",
        sha: "abc123",
        content: "test content",
        size: 100,
      });

      const result = await service.fetchQuartzConfig();

      expect(mockGitHub.getFile).toHaveBeenCalledWith("quartz.config.ts");
      expect(result).not.toBeNull();
      expect(result?.sha).toBe("abc123");
      expect(result?.content).toBe("test content");
    });

    it("캐시된 결과를 반환한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue({
        path: "quartz.config.ts",
        sha: "abc123",
        content: "test content",
        size: 100,
      });

      await service.fetchQuartzConfig();
      await service.fetchQuartzConfig();

      expect(mockGitHub.getFile).toHaveBeenCalledTimes(1);
    });

    it("forceRefresh로 캐시를 무시한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue({
        path: "quartz.config.ts",
        sha: "abc123",
        content: "test content",
        size: 100,
      });

      await service.fetchQuartzConfig();
      await service.fetchQuartzConfig(true);

      expect(mockGitHub.getFile).toHaveBeenCalledTimes(2);
    });

    it("파일이 없으면 null을 반환한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue(null);

      const result = await service.fetchQuartzConfig();

      expect(result).toBeNull();
    });
  });

  describe("commitConfigChange", () => {
    beforeEach(() => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue({
        path: "quartz.config.ts",
        sha: "existing-sha",
        content: "old content",
        size: 100,
      });
    });

    it("설정 변경을 GitHub에 커밋한다", async () => {
      vi.mocked(mockGitHub.createOrUpdateFile).mockResolvedValue({
        success: true,
        sha: "new-sha",
        commitSha: "commit-sha",
      });

      const result = await service.commitConfigChange("new content", "Update config");

      expect(result.success).toBe(true);
      expect(mockGitHub.createOrUpdateFile).toHaveBeenCalledWith(
        "quartz.config.ts",
        "new content",
        "Update config",
        "existing-sha"
      );
    });

    it("커밋 성공 시 캐시를 업데이트한다", async () => {
      vi.mocked(mockGitHub.createOrUpdateFile).mockResolvedValue({
        success: true,
        sha: "new-sha",
        commitSha: "commit-sha",
      });

      await service.commitConfigChange("new content", "Update config");
      const cached = await service.fetchQuartzConfig();

      expect(cached?.sha).toBe("new-sha");
      expect(cached?.content).toBe("new content");
    });

    it("파일이 없으면 에러를 반환한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue(null);

      const result = await service.commitConfigChange("new content", "Update config");

      expect(result.success).toBe(false);
      expect(result.error).toBe("quartz.config.ts 파일을 찾을 수 없습니다");
    });
  });

  describe("invalidateCache", () => {
    it("캐시를 무효화한다", async () => {
      vi.mocked(mockGitHub.getFile).mockResolvedValue({
        path: "quartz.config.ts",
        sha: "abc123",
        content: "test content",
        size: 100,
      });

      await service.fetchQuartzConfig();
      service.invalidateCache();
      await service.fetchQuartzConfig();

      expect(mockGitHub.getFile).toHaveBeenCalledTimes(2);
    });
  });
});
