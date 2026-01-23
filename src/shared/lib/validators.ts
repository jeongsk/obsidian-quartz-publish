/**
 * Quartz Config Validators
 *
 * 설정 값의 유효성을 검사하는 유틸리티 함수들
 */

import { SUPPORTED_LOCALES } from "../config/constants/locales";
import type { AnalyticsConfig, QuartzSiteConfig } from "../../app/types";

/**
 * 유효성 검사 결과
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue?: unknown;
}

// ============================================================================
// Page Title Validator (T010)
// ============================================================================

/**
 * 페이지 제목 유효성 검사
 */
export function validatePageTitle(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: "페이지 제목을 입력해주세요",
    };
  }

  return { valid: true, normalizedValue: trimmed };
}

// ============================================================================
// Base URL Validator (T011)
// ============================================================================

/**
 * Base URL 정규화
 * - 프로토콜 제거 (https://, http://)
 * - 후행 슬래시 제거
 * - 공백 제거 (trim)
 */
function normalizeBaseUrl(url: string): string {
  let normalized = url.trim();

  // 프로토콜 제거
  normalized = normalized.replace(/^https?:\/\//, "");

  // 후행 슬래시 제거
  normalized = normalized.replace(/\/+$/, "");

  return normalized;
}

/**
 * Base URL 형식 패턴
 * 도메인 형식: example.com 또는 example.com/path
 */
const BASE_URL_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*(?:\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/;

/**
 * Base URL 유효성 검사 및 정규화
 */
export function validateBaseUrl(value: string): ValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: "도메인을 입력해주세요",
    };
  }

  const normalized = normalizeBaseUrl(trimmed);

  // 공백 포함 검사
  if (/\s/.test(normalized)) {
    return {
      valid: false,
      error: "올바른 도메인 형식을 입력해주세요 (예: example.com)",
    };
  }

  // 형식 검사
  if (!BASE_URL_PATTERN.test(normalized)) {
    return {
      valid: false,
      error: "올바른 도메인 형식을 입력해주세요 (예: example.com)",
    };
  }

  return { valid: true, normalizedValue: normalized };
}

// ============================================================================
// Locale Validator (T012)
// ============================================================================

/**
 * 로케일 코드 유효성 검사
 */
export function validateLocale(value: string): ValidationResult {
  if (!value) {
    return {
      valid: false,
      error: "로케일을 선택해주세요",
    };
  }

  const isSupported = SUPPORTED_LOCALES.some((locale) => locale.code === value);

  if (!isSupported) {
    return {
      valid: false,
      error: "지원되지 않는 로케일입니다",
    };
  }

  return { valid: true };
}

// ============================================================================
// Analytics Validator (T013)
// ============================================================================

/**
 * Google Analytics Tag ID 패턴 (G-로 시작하는 7-12자)
 * 예: G-ABC1234, G-XXXXXXXXXX
 */
const GA_TAG_PATTERN = /^G-[A-Z0-9]{7,12}$/i;

/**
 * UUID 패턴 (Umami websiteId용)
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * URL 패턴 (http/https)
 */
const URL_PATTERN = /^https?:\/\/.+/i;

/**
 * Analytics 설정 유효성 검사
 */
export function validateAnalytics(config: AnalyticsConfig): ValidationResult {
  switch (config.provider) {
    case "null":
      return { valid: true };

    case "google": {
      if (!config.tagId || !config.tagId.trim()) {
        return {
          valid: false,
          error: "Google Analytics Tag ID를 입력해주세요",
        };
      }

      if (!GA_TAG_PATTERN.test(config.tagId)) {
        return {
          valid: false,
          error: "올바른 Google Analytics ID 형식을 입력해주세요 (예: G-XXXXXXXXXX)",
        };
      }

      return { valid: true };
    }

    case "plausible": {
      // host는 선택사항
      if (config.host && config.host.trim() && !URL_PATTERN.test(config.host)) {
        return {
          valid: false,
          error: "올바른 URL 형식을 입력해주세요",
        };
      }

      return { valid: true };
    }

    case "umami": {
      if (!config.websiteId || !config.websiteId.trim()) {
        return {
          valid: false,
          error: "Website ID를 입력해주세요",
        };
      }

      if (!UUID_PATTERN.test(config.websiteId)) {
        return {
          valid: false,
          error: "올바른 Website ID 형식을 입력해주세요",
        };
      }

      if (!config.host || !config.host.trim()) {
        return {
          valid: false,
          error: "Host URL을 입력해주세요",
        };
      }

      if (!URL_PATTERN.test(config.host)) {
        return {
          valid: false,
          error: "올바른 URL 형식을 입력해주세요",
        };
      }

      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

// ============================================================================
// Config Validator (T014)
// ============================================================================

/**
 * 필드별 유효성 검사 결과
 */
export interface FieldValidationResult extends ValidationResult {
  field: keyof QuartzSiteConfig;
}

/**
 * 전체 설정 유효성 검사
 */
export function validateConfig(config: Partial<QuartzSiteConfig>): FieldValidationResult[] {
  const results: FieldValidationResult[] = [];

  // pageTitle 검사
  if (config.pageTitle !== undefined) {
    const result = validatePageTitle(config.pageTitle);
    results.push({ ...result, field: "pageTitle" });
  }

  // baseUrl 검사
  if (config.baseUrl !== undefined) {
    const result = validateBaseUrl(config.baseUrl);
    results.push({ ...result, field: "baseUrl" });
  }

  // locale 검사
  if (config.locale !== undefined) {
    const result = validateLocale(config.locale);
    results.push({ ...result, field: "locale" });
  }

  // analytics 검사
  if (config.analytics !== undefined) {
    const result = validateAnalytics(config.analytics);
    results.push({ ...result, field: "analytics" });
  }

  return results;
}

/**
 * 설정에 유효성 오류가 있는지 확인
 */
export function hasValidationErrors(results: FieldValidationResult[]): boolean {
  return results.some((r) => !r.valid);
}

/**
 * 첫 번째 유효성 오류 가져오기
 */
export function getFirstError(results: FieldValidationResult[]): FieldValidationResult | undefined {
  return results.find((r) => !r.valid);
}
