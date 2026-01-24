/**
 * FileValidatorService Tests
 */

import { describe, it, expect, vi } from "vitest";
import { FileValidatorService } from "../../../src/shared/lib/file-validator";
import type { TFile, Vault } from "obsidian";

// Mock TFile
const createMockFile = (path: string, size: number): TFile => ({
  path,
  name: path.split("/").pop() || path,
  basename: (path.split("/").pop() || path).replace(/\.[^.]+$/, ""),
  extension: path.split(".").pop() || "",
  stat: { size, mtime: Date.now(), ctime: Date.now() },
  vault: {} as Vault,
  parent: null,
});

describe("FileValidatorService", () => {
  describe("formatFileSize", () => {
    it("should format bytes correctly", () => {
      expect(FileValidatorService.formatFileSize(0)).toBe("0 B");
      expect(FileValidatorService.formatFileSize(500)).toBe("500 B");
      expect(FileValidatorService.formatFileSize(1023)).toBe("1023 B");
    });

    it("should format kilobytes correctly", () => {
      expect(FileValidatorService.formatFileSize(1024)).toBe("1.00 KB");
      expect(FileValidatorService.formatFileSize(1536)).toBe("1.50 KB");
      expect(FileValidatorService.formatFileSize(10240)).toBe("10.00 KB");
    });

    it("should format megabytes correctly", () => {
      expect(FileValidatorService.formatFileSize(1024 * 1024)).toBe("1.00 MB");
      expect(FileValidatorService.formatFileSize(10 * 1024 * 1024)).toBe("10.00 MB");
      expect(FileValidatorService.formatFileSize(15.5 * 1024 * 1024)).toBe("15.50 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(FileValidatorService.formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
    });
  });

  describe("findLargeFiles", () => {
    const service = new FileValidatorService();

    it("should return empty array when no files provided", () => {
      const result = service.findLargeFiles([]);
      expect(result).toEqual([]);
    });

    it("should return empty array when all files are under limit", () => {
      const files = [
        createMockFile("small.png", 1024 * 1024), // 1MB
        createMockFile("medium.jpg", 5 * 1024 * 1024), // 5MB
        createMockFile("just-under.pdf", 10 * 1024 * 1024 - 1), // Just under 10MB
      ];

      const result = service.findLargeFiles(files);
      expect(result).toEqual([]);
    });

    it("should return files that exceed the limit", () => {
      const largeFile = createMockFile("large.mp4", 15 * 1024 * 1024); // 15MB
      const files = [
        createMockFile("small.png", 1024 * 1024), // 1MB
        largeFile,
      ];

      const result = service.findLargeFiles(files);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(largeFile);
      expect(result[0].size).toBe(15 * 1024 * 1024);
      expect(result[0].formattedSize).toBe("15.00 MB");
    });

    it("should return multiple large files", () => {
      const files = [
        createMockFile("large1.mp4", 12 * 1024 * 1024), // 12MB
        createMockFile("small.png", 1024 * 1024), // 1MB
        createMockFile("large2.zip", 20 * 1024 * 1024), // 20MB
      ];

      const result = service.findLargeFiles(files);
      expect(result).toHaveLength(2);
      expect(result[0].file.name).toBe("large1.mp4");
      expect(result[1].file.name).toBe("large2.zip");
    });

    it("should include file exactly at limit", () => {
      const files = [
        createMockFile("exact.bin", 10 * 1024 * 1024), // Exactly 10MB
      ];

      // At exactly 10MB, it's not over the limit
      const result = service.findLargeFiles(files);
      expect(result).toHaveLength(0);
    });

    it("should include file just over limit", () => {
      const files = [
        createMockFile("just-over.bin", 10 * 1024 * 1024 + 1), // 10MB + 1 byte
      ];

      const result = service.findLargeFiles(files);
      expect(result).toHaveLength(1);
    });
  });

  describe("validateFiles", () => {
    const service = new FileValidatorService();

    it("should return valid result when no large files", () => {
      const files = [
        createMockFile("small.png", 1024 * 1024), // 1MB
      ];

      const result = service.validateFiles(files);
      expect(result.isValid).toBe(true);
      expect(result.largeFiles).toEqual([]);
      expect(result.count).toBe(0);
    });

    it("should return invalid result when large files exist", () => {
      const files = [
        createMockFile("large.mp4", 15 * 1024 * 1024), // 15MB
      ];

      const result = service.validateFiles(files);
      expect(result.isValid).toBe(false);
      expect(result.largeFiles).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });
});
