import { describe, it, expect } from "vitest";
import en from "../../../src/shared/lib/i18n/locales/en";
import ko from "../../../src/shared/lib/i18n/locales/ko";

describe("Translation Key Completeness", () => {
  const enKeys = Object.keys(en) as (keyof typeof en)[];
  const koKeys = Object.keys(ko) as (keyof typeof ko)[];

  // 의도적으로 빈 문자열인 키 (언어별 문장 구조 차이로 인해 필요)
  const allowedEmptyKeys = [
    "settings.comments.giscusHelpPrefix",
    "settings.comments.giscusHelpSuffix",
  ];

  describe("English translations", () => {
    it("should have all required keys", () => {
      expect(enKeys.length).toBeGreaterThan(0);
    });

    it("should not have empty values", () => {
      enKeys.forEach((key) => {
        const value = en[key];
        if (allowedEmptyKeys.includes(key)) {
          expect(typeof value, `Key "${key}" should be a string`).toBe("string");
        } else {
          expect(value, `Key "${key}" should not be empty`).toBeTruthy();
          expect(typeof value, `Key "${key}" should be a string`).toBe("string");
        }
      });
    });
  });

  describe("Korean translations", () => {
    it("should have translations for common keys", () => {
      const criticalKeys = [
        "settings.github.title",
        "dashboard.title",
        "notice.publish.success",
        "error.unknown",
        "modal.confirm.ok",
        "modal.confirm.cancel",
      ] as const;

      criticalKeys.forEach((key) => {
        expect(ko[key], `Korean translation missing for critical key: ${key}`).toBeDefined();
      });
    });

    it("should not have empty values", () => {
      koKeys.forEach((key) => {
        const value = ko[key];
        if (value !== undefined) {
          if (allowedEmptyKeys.includes(key)) {
            expect(typeof value, `Key "${key}" should be a string`).toBe("string");
          } else {
            expect(value, `Key "${key}" should not be empty`).toBeTruthy();
            expect(typeof value, `Key "${key}" should be a string`).toBe("string");
          }
        }
      });
    });

    it("should preserve interpolation placeholders", () => {
      const keysWithParams = enKeys.filter((key) => en[key].includes("{{"));

      keysWithParams.forEach((key) => {
        const enValue = en[key];
        const koValue = ko[key];

        if (koValue) {
          const enPlaceholders = enValue.match(/\{\{(\w+)\}\}/g) ?? [];
          const koPlaceholders = koValue.match(/\{\{(\w+)\}\}/g) ?? [];

          expect(koPlaceholders.sort(), `Key "${key}" should have same placeholders`).toEqual(
            enPlaceholders.sort()
          );
        }
      });
    });
  });

  describe("Translation consistency", () => {
    it("should have Korean coverage above 90%", () => {
      const coverage = (koKeys.length / enKeys.length) * 100;
      expect(coverage).toBeGreaterThanOrEqual(90);
    });

    it("should not have keys in Korean that do not exist in English", () => {
      koKeys.forEach((key) => {
        expect(enKeys, `Key "${key}" exists in ko but not in en`).toContain(key);
      });
    });
  });
});
