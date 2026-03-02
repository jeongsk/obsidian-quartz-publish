/**
 * GitHubService - Commit History Methods 테스트
 * getCommits, getCommitDetail, getFileAtCommit, revertFileToCommit, revertMultipleFilesToCommit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubService, GitHubError } from "../../../src/entities/github/model/service";

const VALID_REPO_URL = "https://github.com/user/quartz-site";
const VALID_TOKEN = "ghp_testtoken123";

function mockResponse(body: unknown, status = 200) {
  const responseHeaders = new Headers({ "content-type": "application/json" });
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

describe("GitHubService - Commit History", () => {
  let service: GitHubService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new GitHubService(VALID_TOKEN, VALID_REPO_URL);
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    vi.restoreAllMocks();
  });

  // ============================================================================
  // getCommits
  // ============================================================================

  describe("getCommits", () => {
    it("커밋 목록을 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse([
          {
            sha: "abc1234567890",
            commit: {
              message: "feat: add feature\n\nDetailed description",
              author: { name: "Alice", email: "alice@example.com", date: "2024-01-01T00:00:00Z" },
              committer: {
                name: "Alice",
                email: "alice@example.com",
                date: "2024-01-01T00:00:00Z",
              },
            },
            html_url: "https://github.com/user/repo/commit/abc1234567890",
          },
        ])
      );

      const commits = await service.getCommits();
      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe("abc1234567890");
      expect(commits[0].shortSha).toBe("abc1234");
      expect(commits[0].message).toBe("feat: add feature"); // Only first line
      expect(commits[0].authorName).toBe("Alice");
    });

    it("perPage와 page 파라미터를 전달한다", async () => {
      fetchSpy = mockFetch(mockResponse([]));

      await service.getCommits(10, 2);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("per_page=10"),
        expect.any(Object)
      );
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("page=2"), expect.any(Object));
    });

    it("perPage가 100을 초과하면 100으로 제한된다", async () => {
      fetchSpy = mockFetch(mockResponse([]));

      await service.getCommits(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("per_page=100"),
        expect.any(Object)
      );
    });

    it("여러 커밋을 반환한다", async () => {
      const commits = [
        {
          sha: "sha1",
          commit: {
            message: "commit 1",
            author: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
            committer: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
          },
          html_url: "",
        },
        {
          sha: "sha2",
          commit: {
            message: "commit 2",
            author: { name: "B", email: "b@b.com", date: "2024-01-02T00:00:00Z" },
            committer: { name: "B", email: "b@b.com", date: "2024-01-02T00:00:00Z" },
          },
          html_url: "",
        },
      ];
      fetchSpy = mockFetch(mockResponse(commits));

      const result = await service.getCommits(30);
      expect(result).toHaveLength(2);
      expect(result[0].sha).toBe("sha1");
      expect(result[1].sha).toBe("sha2");
    });
  });

  // ============================================================================
  // getCommitDetail
  // ============================================================================

  describe("getCommitDetail", () => {
    it("커밋 상세 정보를 반환한다", async () => {
      const commitData = {
        sha: "fullsha123456",
        commit: {
          message: "feat: add feature\n\nBody text here",
          author: { name: "Alice", email: "alice@example.com", date: "2024-01-01T00:00:00Z" },
          committer: { name: "GitHub", email: "noreply@github.com", date: "2024-01-01T00:00:00Z" },
        },
        parents: [{ sha: "parentsha" }],
        html_url: "https://github.com/user/repo/commit/fullsha123456",
        files: [
          {
            filename: "content/note.md",
            status: "modified",
            sha: "filesha",
            previous_filename: undefined,
            additions: 5,
            deletions: 2,
            patch: "@@ -1 +1 @@ content",
          },
        ],
        stats: { additions: 5, deletions: 2, total: 7 },
      };

      fetchSpy = mockFetch(mockResponse(commitData));

      const detail = await service.getCommitDetail("fullsha123456");
      expect(detail.sha).toBe("fullsha123456");
      expect(detail.shortSha).toBe("fullsha");
      expect(detail.message).toBe("feat: add feature");
      expect(detail.body).toBe("Body text here");
      expect(detail.author.name).toBe("Alice");
      expect(detail.parents).toEqual(["parentsha"]);
      expect(detail.files).toHaveLength(1);
      expect(detail.files[0].filename).toBe("content/note.md");
      expect(detail.files[0].changes.additions).toBe(5);
    });

    it("멀티라인 메시지의 첫 줄만 message로 사용한다", async () => {
      const commitData = {
        sha: "sha123",
        commit: {
          message: "Title\n\nBody paragraph",
          author: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
          committer: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
        },
        parents: [],
        html_url: "",
        files: [],
        stats: { additions: 0, deletions: 0, total: 0 },
      };

      fetchSpy = mockFetch(mockResponse(commitData));

      const detail = await service.getCommitDetail("sha123");
      expect(detail.message).toBe("Title");
      expect(detail.body).toBe("Body paragraph");
    });

    it("단일 라인 메시지는 body가 null이다", async () => {
      const commitData = {
        sha: "sha123",
        commit: {
          message: "Single line commit",
          author: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
          committer: { name: "A", email: "a@b.com", date: "2024-01-01T00:00:00Z" },
        },
        parents: [],
        html_url: "",
        files: [],
        stats: { additions: 0, deletions: 0, total: 0 },
      };

      fetchSpy = mockFetch(mockResponse(commitData));

      const detail = await service.getCommitDetail("sha123");
      expect(detail.body).toBeNull();
    });
  });

  // ============================================================================
  // getFileAtCommit
  // ============================================================================

  describe("getFileAtCommit", () => {
    it("특정 커밋의 파일 내용을 반환한다", async () => {
      // "Hello World" in base64
      const content = btoa("Hello World");
      fetchSpy = mockFetch(
        mockResponse({
          type: "file",
          content: content + "\n",
          encoding: "base64",
          path: "content/note.md",
          sha: "filesha",
          size: 11,
          name: "note.md",
          html_url: "",
          download_url: null,
        })
      );

      const result = await service.getFileAtCommit("content/note.md", "commitsha");
      expect(result).toBe("Hello World");
    });

    it("type이 file이 아니면 null을 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          type: "dir",
          content: null,
          path: "content",
          sha: "sha",
          size: 0,
          name: "content",
          html_url: "",
          download_url: null,
        })
      );

      const result = await service.getFileAtCommit("content", "commitsha");
      expect(result).toBeNull();
    });

    it("404 응답 시 null을 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));

      const result = await service.getFileAtCommit("nonexistent.md", "commitsha");
      expect(result).toBeNull();
    });

    it("content가 없으면 null을 반환한다", async () => {
      fetchSpy = mockFetch(
        mockResponse({
          type: "file",
          content: null,
          path: "note.md",
          sha: "sha",
          size: 0,
          name: "note.md",
          html_url: "",
          download_url: null,
        })
      );

      const result = await service.getFileAtCommit("note.md", "commitsha");
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // revertFileToCommit
  // ============================================================================

  describe("revertFileToCommit", () => {
    it("파일을 특정 커밋으로 되돌린다", async () => {
      // getFileAtCommit -> 파일 내용 반환
      const content = btoa("Hello World");
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: content + "\n",
            encoding: "base64",
            path: "content/note.md",
            sha: "filesha",
            size: 11,
            name: "note.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // getFile (for getting current SHA)
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: btoa("Current content"),
            sha: "currentsha",
            path: "content/note.md",
            size: 15,
            name: "note.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // createOrUpdateFile
        .mockResolvedValueOnce(
          mockResponse({
            content: { sha: "newfilesha" },
            commit: { sha: "newcommitsha" },
          }) as unknown as Response
        );

      const result = await service.revertFileToCommit("content/note.md", "abc1234");
      expect(result.success).toBe(true);
    });

    it("커밋 시점에 파일이 없으면 error를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Not found", 404));

      const result = await service.revertFileToCommit("nonexistent.md", "commitsha");
      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });

    it("API 에러 시 에러를 반환한다", async () => {
      fetchSpy = mockFetch(mockResponse("Unauthorized", 401));

      const result = await service.revertFileToCommit("file.md", "sha");
      expect(result.success).toBe(false);
    });

    it("TypeError 발생 시 에러를 반환한다", async () => {
      fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network error"));

      const result = await service.revertFileToCommit("file.md", "sha");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });

  // ============================================================================
  // revertMultipleFilesToCommit
  // ============================================================================

  describe("revertMultipleFilesToCommit", () => {
    it("여러 파일을 한 번의 커밋으로 되돌린다", async () => {
      const content1 = btoa("File 1 content");
      const content2 = btoa("File 2 content");

      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        // getFileAtCommit for file1
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: content1 + "\n",
            sha: "sha1",
            path: "file1.md",
            size: 14,
            name: "file1.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // getFileAtCommit for file2
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: content2 + "\n",
            sha: "sha2",
            path: "file2.md",
            size: 14,
            name: "file2.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // git ref HEAD
        .mockResolvedValueOnce(mockResponse({ object: { sha: "headsha" } }) as unknown as Response)
        // git commits (tree SHA)
        .mockResolvedValueOnce(mockResponse({ tree: { sha: "treesha" } }) as unknown as Response)
        // blob for file1
        .mockResolvedValueOnce(mockResponse({ sha: "blobsha1" }) as unknown as Response)
        // blob for file2
        .mockResolvedValueOnce(mockResponse({ sha: "blobsha2" }) as unknown as Response)
        // new tree
        .mockResolvedValueOnce(mockResponse({ sha: "newtreesha" }) as unknown as Response)
        // new commit
        .mockResolvedValueOnce(mockResponse({ sha: "newcommitsha" }) as unknown as Response)
        // ref update
        .mockResolvedValueOnce(mockResponse({}) as unknown as Response);

      const result = await service.revertMultipleFilesToCommit(
        ["file1.md", "file2.md"],
        "targetsha"
      );
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.allSucceeded).toBe(true);
      expect(result.commitSha).toBe("newcommitsha");
    });

    it("일부 파일이 없으면 failed에 포함된다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        // getFileAtCommit for file1 -> 404
        .mockResolvedValueOnce(mockResponse("Not found", 404) as unknown as Response)
        // getFileAtCommit for file2 -> success
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: btoa("content") + "\n",
            sha: "sha2",
            path: "file2.md",
            size: 7,
            name: "file2.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // git ref HEAD
        .mockResolvedValueOnce(mockResponse({ object: { sha: "headsha" } }) as unknown as Response)
        // git commits (tree SHA)
        .mockResolvedValueOnce(mockResponse({ tree: { sha: "treesha" } }) as unknown as Response)
        // blob for file2
        .mockResolvedValueOnce(mockResponse({ sha: "blobsha2" }) as unknown as Response)
        // new tree
        .mockResolvedValueOnce(mockResponse({ sha: "newtreesha" }) as unknown as Response)
        // new commit
        .mockResolvedValueOnce(mockResponse({ sha: "newcommitsha" }) as unknown as Response)
        // ref update
        .mockResolvedValueOnce(mockResponse({}) as unknown as Response);

      const result = await service.revertMultipleFilesToCommit(
        ["file1.md", "file2.md"],
        "targetsha"
      );
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].path).toBe("file1.md");
      expect(result.succeeded).toHaveLength(1);
      expect(result.allSucceeded).toBe(false);
    });

    it("모든 파일이 없으면 빈 succeeded를 반환한다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(mockResponse("Not found", 404) as unknown as Response);

      const result = await service.revertMultipleFilesToCommit(
        ["file1.md", "file2.md"],
        "targetsha"
      );
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.allSucceeded).toBe(false);
    });

    it("onProgress 콜백을 호출한다", async () => {
      const content = btoa("content");
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: content + "\n",
            sha: "sha1",
            path: "file1.md",
            size: 7,
            name: "file1.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        .mockResolvedValueOnce(mockResponse({ object: { sha: "headsha" } }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ tree: { sha: "treesha" } }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "blobsha1" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "newtreesha" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({ sha: "newcommitsha" }) as unknown as Response)
        .mockResolvedValueOnce(mockResponse({}) as unknown as Response);

      const onProgress = vi.fn();
      await service.revertMultipleFilesToCommit(["file1.md"], "sha", onProgress);
      expect(onProgress).toHaveBeenCalledWith(1, 1);
    });

    it("API 에러 시 모든 파일을 failed로 처리한다", async () => {
      fetchSpy = vi
        .spyOn(globalThis, "fetch")
        // getFileAtCommit for file1 -> success
        .mockResolvedValueOnce(
          mockResponse({
            type: "file",
            content: btoa("content") + "\n",
            sha: "sha1",
            path: "file1.md",
            size: 7,
            name: "file1.md",
            html_url: "",
            download_url: null,
          }) as unknown as Response
        )
        // git ref HEAD -> error
        .mockResolvedValueOnce(mockResponse("Unauthorized", 401) as unknown as Response);

      const result = await service.revertMultipleFilesToCommit(["file1.md"], "sha");
      expect(result.succeeded).toHaveLength(0);
      expect(result.allSucceeded).toBe(false);
    });
  });
});
