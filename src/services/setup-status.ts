/**
 * Setup Status Service
 *
 * GitHub 설정 가이드의 진행 상태를 관리하는 서비스입니다.
 * 각 단계의 완료 여부를 플러그인 설정 기반으로 자동 감지합니다.
 */

import type { PluginSettings, SetupStatus } from "../types";

/**
 * SetupStatusService 생성자 파라미터
 */
export interface SetupStatusServiceOptions {
  /** 현재 플러그인 설정을 반환하는 함수 */
  getSettings: () => PluginSettings;
}

/**
 * 설정 상태 서비스 클래스
 *
 * 플러그인 설정을 기반으로 GitHub 설정 가이드의 진행 상태를 계산합니다.
 */
export class SetupStatusService {
  private getSettings: () => PluginSettings;

  constructor(options: SetupStatusServiceOptions) {
    this.getSettings = options.getSettings;
  }

  /**
   * 현재 설정 상태를 반환합니다.
   *
   * @returns 설정 진행 상태
   */
  getStatus(): SetupStatus {
    const settings = this.getSettings();

    // GitHub 계정 보유 여부: 수동 확인 필요 (항상 true로 가정, 사용자가 가이드를 시작했다면 계정이 있다고 판단)
    const hasGitHubAccount = true;

    // Quartz Fork 완료 여부: repoUrl이 설정되어 있으면 Fork 완료로 판단
    const hasForkedRepo = this.isValidRepoUrl(settings.repoUrl);

    // PAT 설정 여부: githubToken이 설정되어 있으면 완료로 판단
    const hasToken = this.isValidToken(settings.githubToken);

    // GitHub 연결 성공 여부: repoUrl과 token이 모두 있으면 연결 가능으로 판단
    const isConnected = hasForkedRepo && hasToken;

    return {
      hasGitHubAccount,
      hasForkedRepo,
      hasToken,
      isConnected,
    };
  }

  /**
   * 모든 설정이 완료되었는지 확인합니다.
   *
   * @returns 모든 필수 설정이 완료된 경우 true
   */
  isComplete(): boolean {
    const status = this.getStatus();
    return status.hasForkedRepo && status.hasToken && status.isConnected;
  }

  /**
   * 완료된 단계 수를 반환합니다.
   *
   * @returns 완료된 단계 수 (0-4)
   */
  getCompletedStepCount(): number {
    const status = this.getStatus();
    let count = 0;

    if (status.hasGitHubAccount) count++;
    if (status.hasForkedRepo) count++;
    if (status.hasToken) count++;
    if (status.isConnected) count++;

    return count;
  }

  /**
   * 다음으로 완료해야 할 단계 인덱스를 반환합니다.
   *
   * @returns 다음 단계 인덱스 (0-3), 모두 완료된 경우 -1
   */
  getNextStepIndex(): number {
    const status = this.getStatus();

    if (!status.hasGitHubAccount) return 0;
    if (!status.hasForkedRepo) return 1;
    if (!status.hasToken) return 2;
    if (!status.isConnected) return 3;

    return -1; // 모두 완료
  }

  /**
   * 리포지토리 URL이 유효한지 확인합니다.
   *
   * @param repoUrl - 검사할 리포지토리 URL
   * @returns 유효한 GitHub URL이면 true
   */
  private isValidRepoUrl(repoUrl: string): boolean {
    if (!repoUrl || repoUrl.trim() === "") {
      return false;
    }

    // GitHub URL 패턴 검사
    const githubPattern = /^https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubPattern.test(repoUrl.trim());
  }

  /**
   * 토큰이 유효한 형식인지 확인합니다.
   *
   * @param token - 검사할 토큰
   * @returns 토큰이 설정되어 있으면 true
   */
  private isValidToken(token: string): boolean {
    if (!token || token.trim() === "") {
      return false;
    }

    // GitHub PAT는 ghp_ 또는 github_pat_ 접두사로 시작
    // 또는 classic token (40자 hex)
    const trimmed = token.trim();
    return (
      trimmed.startsWith("ghp_") ||
      trimmed.startsWith("github_pat_") ||
      /^[a-f0-9]{40}$/i.test(trimmed)
    );
  }
}
