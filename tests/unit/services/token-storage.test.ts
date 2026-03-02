import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenStorageServiceImpl } from "../../../src/shared/services/token-storage/service";
import type { Plugin } from "obsidian";

describe("TokenStorageService", () => {
  let mockPlugin: Partial<Plugin>;
  let service: TokenStorageServiceImpl;

  beforeEach(() => {
    mockPlugin = {
      loadData: vi.fn().mockResolvedValue({}),
      saveData: vi.fn().mockResolvedValue(undefined),
    };
    service = new TokenStorageServiceImpl(mockPlugin as Plugin);
  });

  describe("saveToken", () => {
    it("should save encoded token", async () => {
      await service.saveToken("ghp_test_token");

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        githubToken: expect.any(String),
      });
    });

    it("should overwrite existing token", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({
        githubToken: btoa("old_token"),
      });

      await service.saveToken("new_token");

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        githubToken: btoa("new_token"),
      });
    });
  });

  describe("getToken", () => {
    it("should return null when no token exists", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({});

      const token = await service.getToken();

      expect(token).toBeNull();
    });

    it("should return decoded token when exists", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({
        githubToken: btoa("ghp_test_token"),
      });

      const token = await service.getToken();

      expect(token).toBe("ghp_test_token");
    });

    it("should return null when atob fails (invalid base64)", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({
        githubToken: "not-valid-base64!!!",
      });

      const token = await service.getToken();

      expect(token).toBeNull();
    });
  });

  describe("clearToken", () => {
    it("should clear token when no token exists", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({});

      await service.clearToken();

      expect(mockPlugin.saveData).toHaveBeenCalledWith({});
    });

    it("should remove existing token", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({
        githubToken: btoa("existing_token"),
        otherData: "should_remain",
      });

      await service.clearToken();

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        otherData: "should_remain",
      });
    });
  });
});
