/**
 * QuartzUpgradeService Contract
 *
 * Quartz 버전 확인 및 업그레이드를 담당하는 서비스 인터페이스
 */

import type { QuartzVersionInfo, QuartzUpgradeProgress } from '../../../src/types';

/**
 * 업그레이드 파일 정보
 */
export interface UpgradeFile {
  /** 파일 경로 */
  path: string;
  /** 파일 SHA */
  sha: string;
  /** 파일 내용 (Base64) */
  content: string;
}

/**
 * 업그레이드 결과
 */
export interface UpgradeResult {
  success: boolean;
  /** 업그레이드된 버전 */
  version?: string;
  /** 업데이트된 파일 수 */
  filesUpdated?: number;
  /** 오류 메시지 */
  error?: string;
}

/**
 * 진행 상황 콜백
 */
export type ProgressCallback = (progress: QuartzUpgradeProgress) => void;

/**
 * QuartzUpgradeService 인터페이스
 */
export interface IQuartzUpgradeService {
  /**
   * 최신 Quartz 버전 정보 조회
   * @returns 버전 정보
   */
  getLatestVersion(): Promise<string | null>;

  /**
   * 현재 설치된 Quartz 버전 조회
   * @returns 현재 버전 또는 null
   */
  getCurrentVersion(): Promise<string | null>;

  /**
   * 버전 정보 조회 (현재 + 최신)
   * @returns 버전 정보 객체
   */
  checkVersion(): Promise<QuartzVersionInfo>;

  /**
   * 업그레이드 대상 파일 목록 조회
   * @param targetVersion 대상 버전 (기본: 최신)
   * @returns 파일 목록
   */
  getUpgradeFiles(targetVersion?: string): Promise<UpgradeFile[]>;

  /**
   * Quartz 업그레이드 실행
   * @param onProgress 진행 상황 콜백
   * @returns 업그레이드 결과
   */
  upgrade(onProgress?: ProgressCallback): Promise<UpgradeResult>;

  /**
   * 업그레이드 중단
   */
  abort(): void;
}

/**
 * 사용 예시:
 *
 * ```typescript
 * const upgradeService = new QuartzUpgradeService(githubService);
 *
 * // 버전 확인
 * const versionInfo = await upgradeService.checkVersion();
 * console.log(versionInfo.current);  // "v4.0.5"
 * console.log(versionInfo.latest);   // "v4.0.8"
 * console.log(versionInfo.hasUpdate); // true
 *
 * // 업그레이드 실행
 * const result = await upgradeService.upgrade((progress) => {
 *   console.log(`${progress.completedFiles}/${progress.totalFiles}`);
 *   console.log(`Processing: ${progress.currentFile}`);
 * });
 *
 * if (result.success) {
 *   console.log(`Upgraded to ${result.version}`);
 * }
 * ```
 */
