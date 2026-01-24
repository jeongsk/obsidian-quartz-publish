import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RepositoryCreatorService } from "../../../src/features/create-repo/model/creator";

describe("RepositoryCreatorService", () => {
  let service: RepositoryCreatorService;
  const mockToken = "ghp_test_token_12345";

  beforeEach(() => {
    service = new RepositoryCreatorService(mockToken);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateRepositoryName", () => {
    it("should return valid for empty name (uses default)", () => {
      const result = service.validateRepositoryName("");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for whitespace only (uses default)", () => {
      const result = service.validateRepositoryName("   ");
      expect(result.valid).toBe(true);
    });

    it("should return valid for single character name", () => {
      const result = service.validateRepositoryName("a");
      expect(result.valid).toBe(true);
    });

    it("should return valid for typical repository name", () => {
      const result = service.validateRepositoryName("my-quartz-blog");
      expect(result.valid).toBe(true);
    });

    it("should return valid for name with dots and underscores", () => {
      const result = service.validateRepositoryName("my_blog.v2");
      expect(result.valid).toBe(true);
    });

    it("should return invalid for name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = service.validateRepositoryName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("100");
    });

    it("should return invalid for name starting with special character", () => {
      const result = service.validateRepositoryName("-invalid");
      expect(result.valid).toBe(false);
    });

    it("should return invalid for name ending with special character", () => {
      const result = service.validateRepositoryName("invalid-");
      expect(result.valid).toBe(false);
    });

    it("should return invalid for name with spaces", () => {
      const result = service.validateRepositoryName("my repo");
      expect(result.valid).toBe(false);
    });

    it("should return invalid for name with special characters", () => {
      const result = service.validateRepositoryName("my@repo!");
      expect(result.valid).toBe(false);
    });
  });

  describe("checkRepositoryExists", () => {
    it("should return true when repository exists", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
        json: async () => ({ id: 123, name: "test-repo" }),
      } as Response);

      const exists = await service.checkRepositoryExists("testuser", "test-repo");
      expect(exists).toBe(true);
    });

    it("should return false when repository does not exist", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
        text: async () => '{"message": "Not Found"}',
      } as Response);

      const exists = await service.checkRepositoryExists("testuser", "nonexistent");
      expect(exists).toBe(false);
    });
  });

  describe("createFromTemplate - success case", () => {
    it("should successfully create repository from template", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
          json: async () => ({ login: "testuser", id: 123 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ "X-RateLimit-Remaining": "4999" }),
          text: async () => '{"message": "Not Found"}',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ "X-RateLimit-Remaining": "4998" }),
          json: async () => ({
            id: 456,
            name: "my-quartz",
            full_name: "testuser/my-quartz",
            html_url: "https://github.com/testuser/my-quartz",
            default_branch: "v4",
            private: false,
            owner: { login: "testuser", id: 123 },
          }),
        } as Response);

      const result = await service.createFromTemplate({
        name: "my-quartz",
        visibility: "public",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.repository.name).toBe("my-quartz");
        expect(result.repository.fullName).toBe("testuser/my-quartz");
        expect(result.repository.isPrivate).toBe(false);
      }
    });

    it("should use default name when empty string provided", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
          json: async () => ({ login: "testuser", id: 123 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ "X-RateLimit-Remaining": "4999" }),
          text: async () => '{"message": "Not Found"}',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ "X-RateLimit-Remaining": "4998" }),
          json: async () => ({
            id: 456,
            name: "quartz",
            full_name: "testuser/quartz",
            html_url: "https://github.com/testuser/quartz",
            default_branch: "v4",
            private: false,
            owner: { login: "testuser", id: 123 },
          }),
        } as Response);

      const result = await service.createFromTemplate({
        name: "",
        visibility: "public",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.repository.name).toBe("quartz");
      }
    });
  });

  describe("createFromTemplate - error cases", () => {
    it("should return error for invalid repository name", async () => {
      const result = await service.createFromTemplate({
        name: "-invalid-name-",
        visibility: "public",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("invalid_name");
      }
    });

    it("should return error when repository already exists", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
          json: async () => ({ login: "testuser", id: 123 }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "X-RateLimit-Remaining": "4999" }),
          json: async () => ({ id: 456, name: "existing-repo" }),
        } as Response);

      const result = await service.createFromTemplate({
        name: "existing-repo",
        visibility: "public",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("repo_exists");
        expect(result.error.message).toContain("이미 존재");
      }
    });

    it("should return error for invalid token", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ "X-RateLimit-Remaining": "5000" }),
        text: async () => '{"message": "Bad credentials"}',
      } as Response);

      const result = await service.createFromTemplate({
        name: "my-repo",
        visibility: "public",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("invalid_token");
      }
    });

    it("should return error for rate limit exceeded", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
        }),
        text: async () => '{"message": "rate limit exceeded"}',
      } as Response);

      const result = await service.createFromTemplate({
        name: "my-repo",
        visibility: "public",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("rate_limited");
      }
    });
  });
});
