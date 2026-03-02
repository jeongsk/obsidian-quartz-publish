/**
 * RemoteFileService Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RemoteFileService } from "../../../src/entities/note/model/remote-file";
import type { GitHubService } from "../../../src/entities/github/model/service";
import type { PublishedFile } from "../../../src/app/types";

// GitHubService 모의 객체 생성
function createMockGitHubService(): GitHubService {
  return {
    getDirectoryContents: vi.fn(),
    deleteFile: vi.fn(),
  } as unknown as GitHubService;
}

function createFile(path: string, name?: string, sha?: string): PublishedFile {
  const fileName = name ?? path.split("/").pop() ?? path;
  return {
    path,
    name: fileName,
    sha: sha ?? "abc123",
    size: 1024,
    type: "file",
    url: `https://api.github.com/repos/user/repo/contents/${path}`,
    downloadUrl: `https://raw.githubusercontent.com/user/repo/main/${path}`,
  };
}

describe("RemoteFileService", () => {
  let mockGitHub: ReturnType<typeof createMockGitHubService>;
  let service: RemoteFileService;

  beforeEach(() => {
    mockGitHub = createMockGitHubService();
    service = new RemoteFileService(mockGitHub);
  });

  // ============================================================================
  // getPublishedFiles
  // ============================================================================

  describe("getPublishedFiles", () => {
    it("마크다운 파일만 반환한다", async () => {
      vi.mocked(mockGitHub.getDirectoryContents).mockResolvedValue([
        createFile("content/note.md"),
        createFile("content/image.png"),
        createFile("content/doc.txt"),
      ]);

      const files = await service.getPublishedFiles();

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe("note.md");
    });

    it("경로 알파벳순으로 정렬한다", async () => {
      vi.mocked(mockGitHub.getDirectoryContents).mockResolvedValue([
        createFile("content/z-note.md"),
        createFile("content/a-note.md"),
        createFile("content/m-note.md"),
      ]);

      const files = await service.getPublishedFiles();

      expect(files[0].path).toBe("content/a-note.md");
      expect(files[1].path).toBe("content/m-note.md");
      expect(files[2].path).toBe("content/z-note.md");
    });

    it("파일이 없으면 빈 배열을 반환한다", async () => {
      vi.mocked(mockGitHub.getDirectoryContents).mockResolvedValue([]);

      const files = await service.getPublishedFiles();

      expect(files).toHaveLength(0);
    });
  });

  // ============================================================================
  // detectDuplicates
  // ============================================================================

  describe("detectDuplicates", () => {
    it("중복이 없으면 빈 배열을 반환한다", () => {
      const files = [
        createFile("content/a/note.md", "note.md"),
        createFile("content/b/other.md", "other.md"),
      ];

      const duplicates = service.detectDuplicates(files);

      expect(duplicates).toHaveLength(0);
    });

    it("같은 파일명을 가진 그룹을 감지한다", () => {
      const files = [
        createFile("content/a/hello.md", "hello.md"),
        createFile("content/b/hello.md", "hello.md"),
      ];

      const duplicates = service.detectDuplicates(files);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].fileName).toBe("hello.md");
      expect(duplicates[0].count).toBe(2);
    });

    it("중복이 많은 순서로 정렬한다", () => {
      const files = [
        createFile("content/a/dup2.md", "dup2.md"),
        createFile("content/b/dup2.md", "dup2.md"),
        createFile("content/a/dup3.md", "dup3.md"),
        createFile("content/b/dup3.md", "dup3.md"),
        createFile("content/c/dup3.md", "dup3.md"),
      ];

      const duplicates = service.detectDuplicates(files);

      expect(duplicates[0].fileName).toBe("dup3.md");
      expect(duplicates[0].count).toBe(3);
      expect(duplicates[1].fileName).toBe("dup2.md");
      expect(duplicates[1].count).toBe(2);
    });

    it("빈 배열이면 빈 배열을 반환한다", () => {
      expect(service.detectDuplicates([])).toHaveLength(0);
    });
  });

  // ============================================================================
  // searchFiles
  // ============================================================================

  describe("searchFiles", () => {
    const files = [
      createFile("content/blog/hello-world.md", "hello-world.md"),
      createFile("content/notes/quick-note.md", "quick-note.md"),
      createFile("content/blog/hello-2024.md", "hello-2024.md"),
    ];

    it("빈 검색어이면 모든 파일을 반환한다", () => {
      expect(service.searchFiles(files, "")).toHaveLength(3);
      expect(service.searchFiles(files, "   ")).toHaveLength(3);
    });

    it("파일명으로 검색한다", () => {
      const results = service.searchFiles(files, "hello");
      expect(results).toHaveLength(2);
    });

    it("경로로 검색한다", () => {
      const results = service.searchFiles(files, "blog");
      expect(results).toHaveLength(2);
    });

    it("대소문자 구분 없이 검색한다", () => {
      const results = service.searchFiles(files, "HELLO");
      expect(results).toHaveLength(2);
    });

    it("일치하는 파일이 없으면 빈 배열을 반환한다", () => {
      const results = service.searchFiles(files, "zzznomatch");
      expect(results).toHaveLength(0);
    });
  });

  // ============================================================================
  // deleteFiles
  // ============================================================================

  describe("deleteFiles", () => {
    it("빈 배열이면 에러를 던진다", async () => {
      await expect(service.deleteFiles([])).rejects.toThrow();
    });

    it("파일을 성공적으로 삭제한다", async () => {
      vi.mocked(mockGitHub.deleteFile).mockResolvedValue({ success: true });

      const files = [createFile("content/note.md")];
      const result = await service.deleteFiles(files);

      expect(result.allSucceeded).toBe(true);
      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });

    it("삭제 실패 시 failed에 포함된다", async () => {
      vi.mocked(mockGitHub.deleteFile).mockResolvedValue({
        success: false,
        error: "Not found",
      });

      const files = [createFile("content/note.md")];
      const result = await service.deleteFiles(files);

      expect(result.allSucceeded).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe("Not found");
    });

    it("예외 발생 시 failed에 포함된다", async () => {
      vi.mocked(mockGitHub.deleteFile).mockRejectedValue(new Error("Network error"));

      const files = [createFile("content/note.md")];
      const result = await service.deleteFiles(files);

      expect(result.allSucceeded).toBe(false);
      expect(result.failed[0].error).toBe("Network error");
    });

    it("진행 콜백을 올바르게 호출한다", async () => {
      vi.mocked(mockGitHub.deleteFile).mockResolvedValue({ success: true });

      const onProgress = vi.fn();
      const files = [createFile("content/a.md"), createFile("content/b.md")];
      await service.deleteFiles(files, onProgress);

      expect(onProgress).toHaveBeenCalledWith(1, 2);
      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });

    it("duration 값을 반환한다", async () => {
      vi.mocked(mockGitHub.deleteFile).mockResolvedValue({ success: true });

      const result = await service.deleteFiles([createFile("content/note.md")]);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // formatFileSize
  // ============================================================================

  describe("formatFileSize", () => {
    it("0 bytes를 표시한다", () => {
      expect(service.formatFileSize(0)).toBe("0 B");
    });

    it("bytes 단위를 표시한다", () => {
      expect(service.formatFileSize(500)).toBe("500 B");
    });

    it("KB 단위를 표시한다", () => {
      expect(service.formatFileSize(1024)).toBe("1 KB");
      expect(service.formatFileSize(1536)).toBe("1.5 KB");
    });

    it("MB 단위를 표시한다", () => {
      expect(service.formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(service.formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
    });

    it("GB 단위를 표시한다", () => {
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });
});
