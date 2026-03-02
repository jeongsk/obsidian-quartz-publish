/**
 * Quartz Config Validators Tests
 */

import { describe, it, expect } from "vitest";
import {
  validatePageTitle,
  validateBaseUrl,
  validateLocale,
  validateAnalytics,
  validateConfig,
  hasValidationErrors,
  getFirstError,
} from "../../../src/shared/lib/validators";
import type { AnalyticsConfig } from "../../../src/app/types";

// ============================================================================
// validatePageTitle
// ============================================================================

describe("validatePageTitle", () => {
  it("유효한 제목을 검증한다", () => {
    const result = validatePageTitle("My Site");
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe("My Site");
  });

  it("앞뒤 공백을 제거하여 정규화한다", () => {
    const result = validatePageTitle("  My Site  ");
    expect(result.valid).toBe(true);
    expect(result.normalizedValue).toBe("My Site");
  });

  it("빈 문자열을 거부한다", () => {
    const result = validatePageTitle("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("공백만 있는 문자열을 거부한다", () => {
    const result = validatePageTitle("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// validateBaseUrl
// ============================================================================

describe("validateBaseUrl", () => {
  describe("유효한 URL", () => {
    it("일반 도메인을 허용한다", () => {
      const result = validateBaseUrl("example.com");
      expect(result.valid).toBe(true);
      expect(result.normalizedValue).toBe("example.com");
    });

    it("https:// 프로토콜을 제거하고 정규화한다", () => {
      const result = validateBaseUrl("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.normalizedValue).toBe("example.com");
    });

    it("http:// 프로토콜을 제거하고 정규화한다", () => {
      const result = validateBaseUrl("http://example.com");
      expect(result.valid).toBe(true);
      expect(result.normalizedValue).toBe("example.com");
    });

    it("후행 슬래시를 제거한다", () => {
      const result = validateBaseUrl("example.com/");
      expect(result.valid).toBe(true);
      expect(result.normalizedValue).toBe("example.com");
    });

    it("경로가 포함된 도메인을 허용한다", () => {
      const result = validateBaseUrl("example.com/blog");
      expect(result.valid).toBe(true);
      expect(result.normalizedValue).toBe("example.com/blog");
    });

    it("서브도메인을 허용한다", () => {
      const result = validateBaseUrl("notes.example.com");
      expect(result.valid).toBe(true);
    });
  });

  describe("유효하지 않은 URL", () => {
    it("빈 문자열을 거부한다", () => {
      const result = validateBaseUrl("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("공백이 포함된 도메인을 거부한다", () => {
      const result = validateBaseUrl("my site.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// validateLocale
// ============================================================================

describe("validateLocale", () => {
  it("지원하는 로케일 ko-KR을 허용한다", () => {
    const result = validateLocale("ko-KR");
    expect(result.valid).toBe(true);
  });

  it("지원하는 로케일 en-US를 허용한다", () => {
    const result = validateLocale("en-US");
    expect(result.valid).toBe(true);
  });

  it("빈 문자열을 거부한다", () => {
    const result = validateLocale("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("지원하지 않는 로케일을 거부한다", () => {
    const result = validateLocale("xx-INVALID");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// validateAnalytics
// ============================================================================

describe("validateAnalytics", () => {
  describe("null provider", () => {
    it("null provider는 항상 유효하다", () => {
      const config: AnalyticsConfig = { provider: "null" };
      expect(validateAnalytics(config).valid).toBe(true);
    });
  });

  describe("google provider", () => {
    it("유효한 Google Analytics ID를 허용한다", () => {
      const config: AnalyticsConfig = { provider: "google", tagId: "G-ABCDEFG12" };
      expect(validateAnalytics(config).valid).toBe(true);
    });

    it("tagId가 없으면 거부한다", () => {
      const config: AnalyticsConfig = { provider: "google" };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("잘못된 형식의 Google Analytics ID를 거부한다", () => {
      const config: AnalyticsConfig = { provider: "google", tagId: "UA-12345" };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });

    it("공백만 있는 tagId를 거부한다", () => {
      const config: AnalyticsConfig = { provider: "google", tagId: "   " };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });
  });

  describe("plausible provider", () => {
    it("host 없이도 유효하다", () => {
      const config: AnalyticsConfig = { provider: "plausible" };
      expect(validateAnalytics(config).valid).toBe(true);
    });

    it("유효한 https URL host를 허용한다", () => {
      const config: AnalyticsConfig = { provider: "plausible", host: "https://plausible.io" };
      expect(validateAnalytics(config).valid).toBe(true);
    });

    it("잘못된 형식의 host URL을 거부한다", () => {
      const config: AnalyticsConfig = { provider: "plausible", host: "not-a-url" };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });
  });

  describe("umami provider", () => {
    const validUmamiConfig: AnalyticsConfig = {
      provider: "umami",
      websiteId: "12345678-1234-1234-1234-123456789012",
      host: "https://umami.example.com",
    };

    it("유효한 Umami 설정을 허용한다", () => {
      expect(validateAnalytics(validUmamiConfig).valid).toBe(true);
    });

    it("websiteId가 없으면 거부한다", () => {
      const config: AnalyticsConfig = { provider: "umami", host: "https://umami.example.com" };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });

    it("잘못된 형식의 UUID를 거부한다", () => {
      const config: AnalyticsConfig = {
        provider: "umami",
        websiteId: "not-a-uuid",
        host: "https://umami.example.com",
      };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });

    it("host가 없으면 거부한다", () => {
      const config: AnalyticsConfig = {
        provider: "umami",
        websiteId: "12345678-1234-1234-1234-123456789012",
      };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });

    it("잘못된 형식의 host URL을 거부한다", () => {
      const config: AnalyticsConfig = {
        provider: "umami",
        websiteId: "12345678-1234-1234-1234-123456789012",
        host: "not-a-url",
      };
      const result = validateAnalytics(config);
      expect(result.valid).toBe(false);
    });
  });
});

// ============================================================================
// validateConfig
// ============================================================================

describe("validateConfig", () => {
  it("pageTitle만 검증한다", () => {
    const results = validateConfig({ pageTitle: "My Site" });
    expect(results).toHaveLength(1);
    expect(results[0].field).toBe("pageTitle");
    expect(results[0].valid).toBe(true);
  });

  it("baseUrl만 검증한다", () => {
    const results = validateConfig({ baseUrl: "example.com" });
    expect(results).toHaveLength(1);
    expect(results[0].field).toBe("baseUrl");
  });

  it("여러 필드를 동시에 검증한다", () => {
    const results = validateConfig({
      pageTitle: "My Site",
      baseUrl: "example.com",
      locale: "ko",
    });
    expect(results).toHaveLength(3);
  });

  it("undefined 필드는 검증하지 않는다", () => {
    const results = validateConfig({});
    expect(results).toHaveLength(0);
  });

  it("유효하지 않은 pageTitle을 감지한다", () => {
    const results = validateConfig({ pageTitle: "" });
    expect(results[0].valid).toBe(false);
  });
});

// ============================================================================
// hasValidationErrors / getFirstError
// ============================================================================

describe("hasValidationErrors", () => {
  it("모든 결과가 valid이면 false를 반환한다", () => {
    const results = [
      { valid: true, field: "pageTitle" as const },
      { valid: true, field: "baseUrl" as const },
    ];
    expect(hasValidationErrors(results)).toBe(false);
  });

  it("하나라도 invalid가 있으면 true를 반환한다", () => {
    const results = [
      { valid: true, field: "pageTitle" as const },
      { valid: false, field: "baseUrl" as const, error: "Invalid URL" },
    ];
    expect(hasValidationErrors(results)).toBe(true);
  });

  it("빈 배열이면 false를 반환한다", () => {
    expect(hasValidationErrors([])).toBe(false);
  });
});

describe("getFirstError", () => {
  it("첫 번째 오류를 반환한다", () => {
    const results = [
      { valid: true, field: "pageTitle" as const },
      { valid: false, field: "baseUrl" as const, error: "Invalid URL" },
      { valid: false, field: "locale" as const, error: "Invalid locale" },
    ];
    const error = getFirstError(results);
    expect(error?.field).toBe("baseUrl");
  });

  it("오류가 없으면 undefined를 반환한다", () => {
    const results = [{ valid: true, field: "pageTitle" as const }];
    expect(getFirstError(results)).toBeUndefined();
  });

  it("빈 배열이면 undefined를 반환한다", () => {
    expect(getFirstError([])).toBeUndefined();
  });
});
