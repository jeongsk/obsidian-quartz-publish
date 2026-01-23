/**
 * 지원되는 Analytics Provider 목록
 */

export interface AnalyticsProviderOption {
  /** Provider 식별자 */
  value: "null" | "google" | "plausible" | "umami";
  /** 표시 이름 */
  label: string;
  /** 설명 */
  description: string;
}

/**
 * 지원되는 Analytics Provider 목록
 */
export const ANALYTICS_PROVIDERS: readonly AnalyticsProviderOption[] = [
  {
    value: "null",
    label: "없음 (비활성화)",
    description: "애널리틱스를 사용하지 않습니다",
  },
  {
    value: "google",
    label: "Google Analytics",
    description: "Google Analytics 4 (GA4) 추적",
  },
  {
    value: "plausible",
    label: "Plausible Analytics",
    description: "프라이버시 친화적인 애널리틱스",
  },
  {
    value: "umami",
    label: "Umami Analytics",
    description: "셀프 호스팅 오픈소스 애널리틱스",
  },
] as const;

/**
 * Provider value로 옵션 가져오기
 */
export function getAnalyticsProvider(value: string): AnalyticsProviderOption | undefined {
  return ANALYTICS_PROVIDERS.find((p) => p.value === value);
}

/**
 * Provider value가 유효한지 확인
 */
export function isValidAnalyticsProvider(value: string): boolean {
  return ANALYTICS_PROVIDERS.some((p) => p.value === value);
}
