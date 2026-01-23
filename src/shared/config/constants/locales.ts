/**
 * 지원되는 로케일 코드 목록
 *
 * BCP 47 표준 로케일 코드
 */

export interface LocaleOption {
  /** BCP 47 로케일 코드 */
  code: string;
  /** 표시 이름 */
  name: string;
}

/**
 * 지원되는 로케일 목록
 */
export const SUPPORTED_LOCALES: readonly LocaleOption[] = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "ko-KR", name: "한국어" },
  { code: "ja-JP", name: "日本語" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "de-DE", name: "Deutsch" },
  { code: "fr-FR", name: "Français" },
  { code: "es-ES", name: "Español" },
  { code: "pt-BR", name: "Português (BR)" },
  { code: "ru-RU", name: "Русский" },
  { code: "it-IT", name: "Italiano" },
] as const;

/**
 * 로케일 코드가 지원되는지 확인
 */
export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LOCALES.some((locale) => locale.code === code);
}

/**
 * 로케일 코드로 표시 이름 가져오기
 */
export function getLocaleName(code: string): string {
  const locale = SUPPORTED_LOCALES.find((l) => l.code === code);
  return locale?.name ?? code;
}
