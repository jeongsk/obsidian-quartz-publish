/**
 * QuartzConfigService Contract
 *
 * quartz.config.ts 파일 파싱 및 수정을 담당하는 서비스 인터페이스
 */

import type { QuartzSettings } from '../../../src/types';

/**
 * 파싱된 Quartz 설정
 */
export interface ParsedQuartzConfig {
  /** ExplicitPublish 필터 활성화 여부 */
  explicitPublish: boolean;
  /** 제외 패턴 목록 */
  ignorePatterns: string[];
  /** URL 전략 */
  urlStrategy: 'shortest' | 'absolute';
  /** 원본 파일 내용 */
  rawContent: string;
}

/**
 * 설정 변경 결과
 */
export interface ConfigUpdateResult {
  success: boolean;
  /** 변경된 파일 내용 */
  newContent?: string;
  /** 오류 메시지 */
  error?: string;
}

/**
 * QuartzConfigService 인터페이스
 */
export interface IQuartzConfigService {
  /**
   * quartz.config.ts 파일 내용을 파싱하여 설정값 추출
   * @param content 파일 내용
   * @returns 파싱된 설정 또는 null (파싱 실패 시)
   */
  parseConfig(content: string): ParsedQuartzConfig | null;

  /**
   * ExplicitPublish 설정 변경
   * @param content 현재 파일 내용
   * @param enabled 활성화 여부
   * @returns 변경 결과
   */
  setExplicitPublish(content: string, enabled: boolean): ConfigUpdateResult;

  /**
   * 제외 패턴 설정 변경
   * @param content 현재 파일 내용
   * @param patterns 새 패턴 목록
   * @returns 변경 결과
   */
  setIgnorePatterns(content: string, patterns: string[]): ConfigUpdateResult;

  /**
   * URL 전략 설정 변경
   * @param content 현재 파일 내용
   * @param strategy 새 전략
   * @returns 변경 결과
   */
  setUrlStrategy(
    content: string,
    strategy: 'shortest' | 'absolute'
  ): ConfigUpdateResult;
}

/**
 * 사용 예시:
 *
 * ```typescript
 * const service = new QuartzConfigService();
 *
 * // 설정 파싱
 * const parsed = service.parseConfig(fileContent);
 * if (parsed) {
 *   console.log(parsed.explicitPublish); // false
 *   console.log(parsed.ignorePatterns);  // ["private", "templates"]
 * }
 *
 * // ExplicitPublish 활성화
 * const result = service.setExplicitPublish(fileContent, true);
 * if (result.success) {
 *   // result.newContent를 GitHub에 커밋
 * }
 * ```
 */
