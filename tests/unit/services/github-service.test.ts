/**
 * GitHubService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubService, GitHubError } from "../../../src/entities/github/model/service";

const VALID_REPO_URL = "https://github.com/user/quartz-site";
const VALID_TOKEN = "ghp_testtoken123";

// fetch 응답 헬퍼
function mockResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const responseHeaders = new Headers({
    "content-type": "application/json",
    ...headers,
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders,
    text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  };
}

function mockFetch(response: ReturnType<typeof mockResponse>) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response as unknown as Response);
}

describe("GitHubError", () => {
  it("statusCode와 responseBody를 저장한다", () => {
    const err = new GitHubError(404, "Not found", "not_found");
    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toBe("Not found");
    expect(err.errorType).toBe("not_found");
    expect(err.name).toBe("GitHubError");
  });
});

describe("GitHubService - Constructor / parseRepoUrl", () => {
  it("유효한 HTTPS URL로 초기화된다", () => {
    const service = new GitHubService(VALID_TOKEN, VALID_REPO_URL);
    expect(service.getOwner()).toBe("user");
    expect(service.getRepo()).toBe("quartz-site");
    expect(service.getBranch()).toBe("main");
  });

  it("커스텀 브랜치로 초기화된다", () => {
    const service = new GitHubService(VALID_TOKEN, VALID_REPO_URL, "dev");
    expect(service.getBranch()).toBe("dev");
  });

  it("잘못된 URL로 생성 시 에러를 던진다", () => {
    expect(() => new GitHubService(VALID_TOKEN, "not-a-url")).toThrow("Invalid repository URL");
  });

  it(".git 확장자가 포함된 URL을 파싱한다", () => {
    const service = new GitHubService(VALID_TOKEN, "https://github.com/user/repo.git");
    expect(service.getRepo()).toBe("repo");
  });

  it("SSH 형식 URL을 파싱한다", () => {
    const service = new GitHubService(VALID_TOKEN, "git@github.com:user/repo");
    expect(service.getOwner()).toBe("user");
    expect(service.getRepo()).toBe("repo");
  });

  it("parseRepoUrl은 null을 반환한다 (잘못된 URL)", () => {
    const service = new GitHubService(VALID_TOKEN, VALID_REPO_URL);
    expect(service.parseRepoUrl("invalid")).toBeNull();
  });
});

describe("GitHubService - Static Methods", () => {
  describe("validateRepoUrl", () => {
    it("유효한 HTTPS URL을 허용한다", () => {
      expect(GitHubService.validateRepoUrl("https://github.com/user/repo")).toBe(true);
    });

    it("유효한 SSH URL을 허용한다", () => {
      expect(GitHubService.validateRepoUrl("git@github.com:user/repo.git")).toBe(true);
    });

    it("빈 문자열을 거부한다", () => {
      expect(GitHubService.validateRepoUrl("")).toBe(false);
    });

    it("공백만 있는 문자열을 거부한다", () => {
      expect(GitHubService.validateRepoUrl("   ")).toBe(false);
    });

    it("gitlab.com URL을 거부한다", () => {
      expect(GitHubService.validateRepoUrl("https://gitlab.com/user/repo")).toBe(false);
    });
  });

  describe("validateContentPath", () => {
    it("유효한 경로를 허용한다", () => {
      expect(GitHubService.validateContentPath("content")).toBe(true);
    });

    it("경로가 있는 경로를 허용한다", () => {
      expect(GitHubService.validateContentPath("posts/blog")).toBe(true);
    });

    it("빈 문자열을 거부한다", () => {
      expect(GitHubService.validateContentPath("")).toBe(false);
    });

    it("공백만 있는 문자열을 거부한다", () => {
      expect(GitHubService.validateContentPath("   ")).toBe(false);
    });

    it("슬래시만 있는 경로를 거부한다", () => {
      expect(GitHubService.validateContentPath("/")).toBe(false);
    });
  });
});

describe("GitHubService - API Methods", () => {
  let service: GitHubService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new GitHubService(VALID_TOKEN, VALID_REPO_URL);
    // fetch는 각 테스트에서 개별 설정
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // validateToken
  // ============================================================================

  describe("validateToken", () => {
    it("토큰이 유효하면 사용자 정보를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse({ login: "user", id: 123 }));
      const user = await service.validateToken();
      expect(user.login).toBe("user");
    });

    it("401 응답 시 GitHubError를 던진다", async () => {
      fetchSpy = mockFetch(mockResponse("Unauthorized", 401));
      await expect(service.validateToken()).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // getRepositoryInfo
  // ============================================================================

  describe("getRepositoryInfo", () => {
    it("리포지토리 정보를 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          id: 1,
          name: "quartz-site",
          full_name: "user/quartz-site",
          default_branch: "main",
          private: false,
        })
      );
      const repo = await service.getRepositoryInfo();
      expect(repo.name).toBe("quartz-site");
      expect(repo.default_branch).toBe("main");
    });
  });

  // ============================================================================
  // verifyQuartzRepository
  // ============================================================================

  describe("verifyQuartzRepository", () => {
    it("quartz.config.ts가 있으면 true를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse({ type: "file", name: "quartz.config.ts" }));
      expect(await service.verifyQuartzRepository()).toBe(true);
    });

    it("404 응답 시 false를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));
      expect(await service.verifyQuartzRepository()).toBe(false);
    });

    it("404 외 에러는 다시 던진다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      await expect(service.verifyQuartzRepository()).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // testConnection
  // ============================================================================

  describe("testConnection", () => {
    it("모든 검증 통과 시 success: true를 반환한다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockResponse({ login: "user", id: 1 }) as unknown as Response)
        .mockResolvedValueOnce(
          mockResponse({
            id: 1,
            name: "quartz-site",
            full_name: "user/quartz-site",
            default_branch: "main",
            private: false,
          }) as unknown as Response
        )
        .mockResolvedValueOnce(
          mockResponse({ type: "file", name: "quartz.config.ts" }) as unknown as Response
        );

      const result = await service.testConnection();
      expect(result.success).toBe(true);
      expect(result.repository?.name).toBe("quartz-site");
    });

    it("Quartz 리포지토리가 아니면 success: false를 반환한다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockResponse({ login: "user", id: 1 }) as unknown as Response)
        .mockResolvedValueOnce(
          mockResponse({
            id: 1,
            name: "not-quartz",
            full_name: "user/not-quartz",
            default_branch: "main",
            private: false,
          }) as unknown as Response
        )
        .mockResolvedValueOnce(mockResponse("Not found", 404) as unknown as Response);

      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("not_quartz");
    });

    it("401 에러 시 invalid_token 에러를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Unauthorized", 401));
      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("invalid_token");
    });

    it("네트워크 에러 시 network_error를 반환한다", async () => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("network_error");
    });
  });

  // ============================================================================
  // getFile
  // ============================================================================

  describe("getFile", () => {
    const fileContent = btoa("Hello World");
    const fileResponse = {
      type: "file",
      path: "content/note.md",
      sha: "abc123",
      size: 11,
      content: fileContent + "\n",
      encoding: "base64",
      html_url: "https://github.com/user/repo/blob/main/content/note.md",
      download_url: "https://raw.githubusercontent.com/user/repo/main/content/note.md",
      name: "note.md",
    };

    it("파일을 성공적으로 조회한다", async () => {
      fetchSpy = mockFetch(mockResponse(fileResponse));
      const file = await service.getFile("content/note.md");
      expect(file).not.toBeNull();
      expect(file?.sha).toBe("abc123");
    });

    it("파일이 없으면 null을 반환한다 (NFC, NFD 모두 실패)", async () => {
      // NFC 시도 실패
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse("Not found", 404) as unknown as Response);
      const file = await service.getFile("content/note.md");
      expect(file).toBeNull();
    });

    it("type이 file이 아니면 null을 반환한다", async () => {
      const dirResponse = {
        type: "dir",
        path: "content",
        sha: "abc123",
        size: 0,
        html_url: "https://github.com/user/repo/tree/main/content",
        download_url: null,
        name: "content",
      };
      fetchSpy = mockFetch(mockResponse(dirResponse));
      const file = await service.getFile("content");
      expect(file).toBeNull();
    });

    it("404 외 다른 에러는 던진다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      await expect(service.getFile("content/note.md")).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // createOrUpdateFile
  // ============================================================================

  describe("createOrUpdateFile", () => {
    const successResponse = {
      content: { name: "note.md", path: "content/note.md", sha: "newshaXXX" },
      commit: { sha: "commitshaYYY", message: "Add note.md" },
    };

    it("파일을 성공적으로 생성한다", async () => {
      fetchSpy = mockFetch(mockResponse(successResponse));
      const result = await service.createOrUpdateFile(
        "content/note.md",
        "Hello World",
        "Add note.md"
      );
      expect(result.success).toBe(true);
      expect(result.sha).toBe("newshaXXX");
      expect(result.commitSha).toBe("commitshaYYY");
    });

    it("파일을 성공적으로 업데이트한다 (SHA 포함)", async () => {
      fetchSpy = mockFetch(mockResponse(successResponse));
      const result = await service.createOrUpdateFile(
        "content/note.md",
        "Updated content",
        "Update note.md",
        "existingsha123"
      );
      expect(result.success).toBe(true);
    });

    it("API 에러 시 success: false를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Conflict", 409));
      const result = await service.createOrUpdateFile("content/note.md", "Hello", "Add note");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("네트워크 에러 시 success: false를 반환한다", async () => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network error"));
      const result = await service.createOrUpdateFile("content/note.md", "Hello", "Add");
      expect(result.success).toBe(false);
    });

    it("한글 파일명을 올바르게 Base64 인코딩한다", async () => {
      fetchSpy = mockFetch(mockResponse(successResponse));
      const result = await service.createOrUpdateFile(
        "content/한국어.md",
        "한국어 콘텐츠",
        "Add Korean file"
      );
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // createOrUpdateBinaryFile
  // ============================================================================

  describe("createOrUpdateBinaryFile", () => {
    it("바이너리 파일을 성공적으로 업로드한다", async () => {
      const successResponse = {
        content: { name: "image.png", path: "static/image.png", sha: "newshaXXX" },
        commit: { sha: "commitshaYYY", message: "Add image.png" },
      };
      fetchSpy = mockFetch(mockResponse(successResponse));
      const buffer = new ArrayBuffer(4);
      const result = await service.createOrUpdateBinaryFile(
        "static/image.png",
        buffer,
        "Add image"
      );
      expect(result.success).toBe(true);
    });

    it("API 에러 시 success: false를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      const result = await service.createOrUpdateBinaryFile(
        "static/image.png",
        new ArrayBuffer(4),
        "Add image"
      );
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // deleteFile
  // ============================================================================

  describe("deleteFile", () => {
    it("파일을 성공적으로 삭제한다 (204 응답)", async () => {
      const resp = {
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
        text: vi.fn(),
        json: vi.fn(),
      };
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(resp as unknown as Response);
      const result = await service.deleteFile("content/note.md", "sha123", "Delete note");
      expect(result.success).toBe(true);
    });

    it("API 에러 시 success: false를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));
      const result = await service.deleteFile("content/note.md", "sha123", "Delete note");
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // getRateLimit
  // ============================================================================

  describe("getRateLimit", () => {
    it("Rate Limit 정보를 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          resources: {
            core: {
              limit: 5000,
              remaining: 4999,
              reset: Math.floor(Date.now() / 1000) + 3600,
              used: 1,
            },
          },
        })
      );
      const rateLimit = await service.getRateLimit();
      expect(rateLimit.limit).toBe(5000);
      expect(rateLimit.remaining).toBe(4999);
      expect(rateLimit.resetAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================================
  // getDirectoryContents
  // ============================================================================

  describe("getDirectoryContents", () => {
    it("파일 목록을 반환한다", async () => {
      const items = [
        {
          type: "file",
          name: "note.md",
          path: "content/note.md",
          sha: "abc123",
          size: 100,
          html_url: "https://github.com/user/repo/blob/main/content/note.md",
          download_url: "https://raw.githubusercontent.com/user/repo/main/content/note.md",
        },
      ];
      fetchSpy = mockFetch(mockResponse(items));
      const files = await service.getDirectoryContents("content");
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe("note.md");
    });

    it("하위 디렉토리를 재귀적으로 조회한다", async () => {
      const rootItems = [
        {
          type: "dir",
          name: "blog",
          path: "content/blog",
          sha: "dirshaXXX",
          size: 0,
          html_url: "https://github.com/user/repo/tree/main/content/blog",
          download_url: null,
        },
      ];
      const subItems = [
        {
          type: "file",
          name: "post.md",
          path: "content/blog/post.md",
          sha: "abc123",
          size: 100,
          html_url: "https://github.com/user/repo/blob/main/content/blog/post.md",
          download_url: "https://raw.githubusercontent.com/user/repo/main/content/blog/post.md",
        },
      ];
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockResponse(rootItems) as unknown as Response)
        .mockResolvedValueOnce(mockResponse(subItems) as unknown as Response);
      const files = await service.getDirectoryContents("content");
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe("post.md");
    });

    it("recursive=false이면 하위 디렉토리를 조회하지 않는다", async () => {
      const items = [
        {
          type: "dir",
          name: "blog",
          path: "content/blog",
          sha: "dirshaXXX",
          size: 0,
          html_url: "",
          download_url: null,
        },
      ];
      fetchSpy = mockFetch(mockResponse(items));
      const files = await service.getDirectoryContents("content", false);
      expect(files).toHaveLength(0);
    });
  });

  // ============================================================================
  // Rate Limit 헤더 처리
  // ============================================================================

  describe("Rate Limit 헤더 처리", () => {
    it("X-RateLimit-Remaining이 0이면 429 에러를 던진다", async () => {
      const resp = {
        ok: true,
        status: 200,
        headers: new Headers({
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue(""),
      };
      fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(resp as unknown as Response);
      await expect(service.validateToken()).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // getLatestRelease
  // ============================================================================

  describe("getLatestRelease", () => {
    it("최신 릴리스 정보를 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          tag_name: "v4.4.0",
          name: "Quartz v4.4.0",
          published_at: "2024-01-01T00:00:00Z",
          body: "Release notes",
        })
      );
      const release = await service.getLatestRelease("jackyzha0", "quartz");
      expect(release?.tagName).toBe("v4.4.0");
      expect(release?.name).toBe("Quartz v4.4.0");
    });

    it("404 응답 시 null을 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));
      const release = await service.getLatestRelease("jackyzha0", "quartz");
      expect(release).toBeNull();
    });

    it("404 외 에러는 던진다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      await expect(service.getLatestRelease("jackyzha0", "quartz")).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // getExternalTree
  // ============================================================================

  describe("getExternalTree", () => {
    it("외부 리포지토리의 Git Tree를 반환한다", async () => {
      const tree = [
        { path: "quartz.config.ts", mode: "100644", type: "blob" as const, sha: "abc", size: 100 },
        { path: "src/", mode: "040000", type: "tree" as const, sha: "def" },
      ];
      fetchSpy = mockFetch(mockResponse({ tree }));
      const result = await service.getExternalTree("jackyzha0", "quartz", "v4.4.0");
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("quartz.config.ts");
    });
  });

  // ============================================================================
  // getTree / findFileByName
  // ============================================================================

  describe("getTree", () => {
    it("현재 리포지토리의 Git Tree를 반환한다", async () => {
      const tree = [{ path: "content/note.md", mode: "100644", type: "blob" as const, sha: "abc" }];
      fetchSpy = mockFetch(mockResponse({ tree }));
      const result = await service.getTree();
      expect(result).toHaveLength(1);
    });
  });

  describe("findFileByName", () => {
    it("파일명으로 파일을 찾는다", async () => {
      const tree = [
        { path: "content/notes/hello.md", mode: "100644", type: "blob" as const, sha: "abc" },
        { path: "content/blog/post.md", mode: "100644", type: "blob" as const, sha: "def" },
      ];
      fetchSpy = mockFetch(mockResponse({ tree }));
      const path = await service.findFileByName("hello.md");
      expect(path).toBe("content/notes/hello.md");
    });

    it("파일이 없으면 null을 반환한다", async () => {
      const tree = [{ path: "content/note.md", mode: "100644", type: "blob" as const, sha: "abc" }];
      fetchSpy = mockFetch(mockResponse({ tree }));
      const path = await service.findFileByName("missing.md");
      expect(path).toBeNull();
    });

    it("getTree 에러 시 null을 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      const path = await service.findFileByName("hello.md");
      expect(path).toBeNull();
    });
  });

  // ============================================================================
  // getExternalFileContent
  // ============================================================================

  describe("getExternalFileContent", () => {
    it("파일 내용을 UTF-8로 디코딩하여 반환한다", async () => {
      const content = "Hello World";
      const base64Content = btoa(content);
      fetchSpy = mockFetch(
        mockResponse({
          type: "file",
          path: "quartz.config.ts",
          sha: "abc",
          size: content.length,
          content: base64Content + "\n",
          encoding: "base64",
          html_url: "https://github.com/user/repo/blob/main/quartz.config.ts",
          download_url: null,
          name: "quartz.config.ts",
        })
      );
      const result = await service.getExternalFileContent(
        "user",
        "repo",
        "quartz.config.ts",
        "main"
      );
      expect(result).toBe(content);
    });

    it("type이 file이 아니면 null을 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          type: "dir",
          path: "src",
          sha: "abc",
          size: 0,
          html_url: "",
          download_url: null,
          name: "src",
        })
      );
      const result = await service.getExternalFileContent("user", "repo", "src", "main");
      expect(result).toBeNull();
    });

    it("404 응답 시 null을 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));
      const result = await service.getExternalFileContent("user", "repo", "missing.ts", "main");
      expect(result).toBeNull();
    });

    it("404 외 에러는 던진다", async () => {
      fetchSpy = mockFetch(mockResponse("Server Error", 500));
      await expect(
        service.getExternalFileContent("user", "repo", "file.ts", "main")
      ).rejects.toThrow(GitHubError);
    });
  });

  // ============================================================================
  // getExternalFileContentBase64
  // ============================================================================

  describe("getExternalFileContentBase64", () => {
    it("Base64 내용을 그대로 반환한다", async () => {
      const base64 = btoa("Hello World");
      fetchSpy = mockFetch(
        mockResponse({
          type: "file",
          path: "file.ts",
          sha: "abc",
          size: 11,
          content: base64 + "\n",
          encoding: "base64",
          html_url: "",
          download_url: null,
          name: "file.ts",
        })
      );
      const result = await service.getExternalFileContentBase64("user", "repo", "file.ts", "main");
      expect(result).toBe(base64);
    });

    it("404 응답 시 null을 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));
      const result = await service.getExternalFileContentBase64("user", "repo", "file.ts", "main");
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // commitMultipleFiles
  // ============================================================================

  describe("commitMultipleFiles", () => {
    it("여러 파일을 한 번에 커밋한다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockResponse({ object: { sha: "headsha" } }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ tree: { sha: "treesha" } }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "blobsha1" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "newtreesha" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "newcommitsha" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({}) as unknown as Response); // ref update

      const result = await service.commitMultipleFiles(
        [{ path: "quartz.config.ts", content: "export default {};" }],
        "Update config"
      );
      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("newcommitsha");
    });

    it("API 에러 시 success: false를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Unauthorized", 401));
      const result = await service.commitMultipleFiles(
        [{ path: "file.ts", content: "content" }],
        "Update"
      );
      expect(result.success).toBe(false);
    });
  });
});
