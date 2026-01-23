/**
 * URL Utility Functions
 *
 * URL 검증 및 정규화를 위한 유틸리티 함수들입니다.
 */

/**
 * GitHub 저장소 URL의 유효성을 검사합니다.
 *
 * @param url - 검증할 URL 문자열
 * @returns 유효한 GitHub URL이면 true, 그렇지 않으면 false
 *
 * @example
 * isValidGitHubUrl('https://github.com/user/repo') // true
 * isValidGitHubUrl('https://github.com/user/my-repo.js') // true
 * isValidGitHubUrl('https://gitlab.com/user/repo') // false
 * isValidGitHubUrl('') // false
 */
export function isValidGitHubUrl(url: string): boolean {
  if (!url) return false;
  return /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(url);
}

/**
 * baseUrl에 https:// 프로토콜이 없으면 추가합니다.
 *
 * @param baseUrl - 정규화할 URL 문자열
 * @returns 프로토콜이 포함된 URL
 *
 * @example
 * normalizeBaseUrl('example.com') // 'https://example.com'
 * normalizeBaseUrl('https://example.com') // 'https://example.com'
 * normalizeBaseUrl('http://example.com') // 'http://example.com'
 * normalizeBaseUrl('') // ''
 */
export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return "";
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
}
