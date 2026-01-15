/**
 * Glob Pattern Validator
 *
 * Glob 패턴의 유효성을 검사하는 유틸리티
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
 * Glob 패턴 최대 길이
 */
const MAX_PATTERN_LENGTH = 256;

/**
 * 단일 glob 패턴 유효성 검사
 *
 * 검사 규칙:
 * 1. 빈 문자열 불가
 * 2. 절대 경로 (`/`로 시작) 불가
 * 3. 제어 문자 (`\x00-\x1f`) 불가
 * 4. 연속된 와일드카드 (`***`) 불가
 * 5. 최대 길이 256자
 *
 * @param pattern 검사할 패턴
 * @returns 검사 결과
 */
export function validateGlobPattern(pattern: string): ValidationResult {
	// 1. 빈 문자열 검사
	if (!pattern || pattern.trim() === '') {
		return { valid: false, error: '패턴은 비어있을 수 없습니다' };
	}

	// 2. 절대 경로 검사
	if (pattern.startsWith('/')) {
		return { valid: false, error: '절대 경로는 허용되지 않습니다' };
	}

	// 3. 제어 문자 검사
	if (/[\x00-\x1f]/.test(pattern)) {
		return { valid: false, error: '제어 문자는 허용되지 않습니다' };
	}

	// 4. 연속 와일드카드 검사 (*** 이상)
	if (/\*{3,}/.test(pattern)) {
		return { valid: false, error: '연속된 와일드카드(***)는 허용되지 않습니다' };
	}

	// 5. 최대 길이 검사
	if (pattern.length > MAX_PATTERN_LENGTH) {
		return { valid: false, error: `패턴은 ${MAX_PATTERN_LENGTH}자를 초과할 수 없습니다` };
	}

	return { valid: true };
}

/**
 * 패턴이 유효한지 빠르게 확인
 *
 * @param pattern 검사할 패턴
 * @returns 유효 여부
 */
export function isValidGlobPattern(pattern: string): boolean {
	return validateGlobPattern(pattern).valid;
}

/**
 * 여러 glob 패턴 유효성 검사
 *
 * @param patterns 검사할 패턴 배열
 * @returns 검사 결과 배열 (각 패턴에 대응)
 */
export function validateGlobPatterns(patterns: string[]): ValidationResult[] {
	return patterns.map(validateGlobPattern);
}

/**
 * 모든 패턴이 유효한지 확인
 *
 * @param patterns 검사할 패턴 배열
 * @returns 모든 패턴이 유효하면 true
 */
export function areAllPatternsValid(patterns: string[]): boolean {
	return patterns.every(isValidGlobPattern);
}
