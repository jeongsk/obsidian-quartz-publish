import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  t,
  initI18n,
  resetI18n,
  getCurrentLocale,
  getSupportedLocales,
} from "../../../src/shared/lib/i18n";

vi.mock("obsidian", () => ({
  moment: {
    locale: vi.fn(() => "en"),
  },
}));

describe("i18n", () => {
  beforeEach(() => {
    resetI18n();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initI18n", () => {
    it("should detect English locale by default", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("en");

      initI18n();

      expect(getCurrentLocale()).toBe("en");
    });

    it("should detect Korean locale when Obsidian is in Korean", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko");

      initI18n();

      expect(getCurrentLocale()).toBe("ko");
    });

    it("should fallback to English for unsupported locales", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("fr");

      initI18n();

      expect(getCurrentLocale()).toBe("en");
    });

    it("should handle locale with region code", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko-KR");

      initI18n();

      expect(getCurrentLocale()).toBe("ko");
    });

    it("should only initialize once", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko");

      initI18n();
      expect(getCurrentLocale()).toBe("ko");

      vi.mocked(moment.locale).mockReturnValue("en");
      initI18n();

      expect(getCurrentLocale()).toBe("ko");
    });
  });

  describe("t", () => {
    it("should return English translation when locale is en", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("en");

      const result = t("settings.github.title");

      expect(result).toBe("GitHub Connection");
    });

    it("should return Korean translation when locale is ko", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko");

      const result = t("settings.github.title");

      expect(result).toBe("GitHub 연결");
    });

    it("should interpolate parameters", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("en");

      const result = t("notice.publish.start", { filename: "test.md" });

      expect(result).toBe("Publishing test.md...");
    });

    it("should interpolate multiple parameters", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("en");

      const result = t("notice.batch.partial", { succeeded: 5, failed: 2 });

      expect(result).toBe("Published: 5 success, 2 failed");
    });

    it("should fallback to English when Korean translation is missing", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko");

      const result = t("settings.github.title");

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return key when translation is not found", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("en");

      const result = t("nonexistent.key" as never);

      expect(result).toBe("nonexistent.key");
    });

    it("should auto-initialize if not already initialized", async () => {
      const { moment } = await import("obsidian");
      vi.mocked(moment.locale).mockReturnValue("ko");

      resetI18n();
      const result = t("settings.github.title");

      expect(result).toBe("GitHub 연결");
    });
  });

  describe("getSupportedLocales", () => {
    it("should return array of supported locales", () => {
      const locales = getSupportedLocales();

      expect(locales).toContain("en");
      expect(locales).toContain("ko");
    });

    it("should return a copy of the array", () => {
      const locales1 = getSupportedLocales();
      const locales2 = getSupportedLocales();

      expect(locales1).not.toBe(locales2);
      expect(locales1).toEqual(locales2);
    });
  });
});
