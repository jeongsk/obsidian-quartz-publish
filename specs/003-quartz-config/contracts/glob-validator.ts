/**
 * GlobValidator Contract
 *
 * Glob 패턴 유효성 검사 유틸리티 인터페이스
 */

/**
 * 유효성 검사 결과
 */
export interface ValidationResult {
  /** 유효 여부 */
  valid: boolean;
  /** 오류 메시지 (유효하지 않은 경우) */
  error?: string;
}

/**
 * GlobValidator 인터페이스
 */
export interface IGlobValidator {
  /**
   * 단일 glob 패턴 유효성 검사
   * @param pattern 검사할 패턴
   * @returns 검사 결과
   */
  validate(pattern: string): ValidationResult;

  /**
   * 여러 glob 패턴 유효성 검사
   * @param patterns 검사할 패턴 배열
   * @returns 검사 결과 배열 (각 패턴에 대응)
   */
  validateAll(patterns: string[]): ValidationResult[];

  /**
   * 패턴이 유효한지 빠르게 확인
   * @param pattern 검사할 패턴
   * @returns 유효 여부
   */
  isValid(pattern: string): boolean;
}

/**
 * 유효성 검사 규칙:
 *
 * 1. 빈 문자열 불가
 * 2. 절대 경로 (`/`로 시작) 불가
 * 3. 제어 문자 (`\x00-\x1f`) 불가
 * 4. 연속된 와일드카드 (`***`) 불가
 * 5. 최대 길이 256자
 * 6. 허용 문자: 알파벳, 숫자, `-`, `_`, `.`, `/`, `*`, `?`, `[`, `]`
 */

/**
 * 사용 예시:
 *
 * ```typescript
 * const validator = new GlobValidator();
 *
 * // 단일 패턴 검사
 * const result = validator.validate("private/*");
 * if (result.valid) {
 *   console.log("Valid pattern");
 * } else {
 *   console.log(`Invalid: ${result.error}`);
 * }
 *
 * // 빠른 검사
 * if (validator.isValid("templates/**")) {
 *   // 패턴 저장
 * }
 *
 * // 여러 패턴 검사
 * const results = validator.validateAll(["private/*", "/absolute", "ok/**"]);
 * // [{ valid: true }, { valid: false, error: "..." }, { valid: true }]
 * ```
 */
