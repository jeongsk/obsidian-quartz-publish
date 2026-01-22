/**
 * Quartz Upgrade Service
 *
 * Quartz 버전 확인 및 업그레이드를 담당하는 서비스
 */

import type { GitHubService } from "./github";
import type { QuartzVersionInfo, QuartzUpgradeProgress } from "../types";
import { INITIAL_UPGRADE_PROGRESS } from "../types";

/**
 * Quartz 템플릿 리포지토리 정보
 */
const QUARTZ_REPO = {
  owner: "jackyzha0",
  repo: "quartz",
};

/**
 * 업그레이드 대상 파일 정보
 */
export interface UpgradeFile {
  /** 파일 경로 */
  path: string;
  /** 파일 SHA */
  sha: string;
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
 * Quartz 업그레이드 서비스 클래스
 */
export class QuartzUpgradeService {
  private github: GitHubService;
  private abortController: AbortController | null = null;

  constructor(github: GitHubService) {
    this.github = github;
  }

  /**
   * 현재 설치된 Quartz 버전 조회
   *
   * package.json의 version 필드 또는 .quartz-version 파일에서 버전 확인
   */
  async getCurrentVersion(): Promise<string | null> {
    try {
      // 1. package.json에서 버전 확인
      const packageJson = await this.github.getFile("package.json");
      if (packageJson) {
        const parsed = JSON.parse(packageJson.content);
        if (parsed.version) {
          // Quartz 버전은 보통 "4.x.x" 형식
          return `v${parsed.version}`;
        }
      }

      // 2. quartz/package.json에서 버전 확인 (대안)
      const quartzPackageJson = await this.github.getFile("quartz/package.json");
      if (quartzPackageJson) {
        const parsed = JSON.parse(quartzPackageJson.content);
        if (parsed.version) {
          return `v${parsed.version}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 최신 Quartz 버전 조회
   *
   * v4 브랜치의 package.json에서 버전을 가져옴
   */
  async getLatestVersion(): Promise<string | null> {
    try {
      // v4 브랜치의 package.json에서 버전 확인
      const content = await this.github.getExternalFileContent(
        QUARTZ_REPO.owner,
        QUARTZ_REPO.repo,
        "package.json",
        "v4"
      );

      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.version) {
          return `v${parsed.version}`;
        }
      }

      // fallback: latest release 확인
      const release = await this.github.getLatestRelease(QUARTZ_REPO.owner, QUARTZ_REPO.repo);
      return release?.tagName ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 버전 정보 조회 (현재 + 최신)
   */
  async checkVersion(): Promise<QuartzVersionInfo> {
    const [current, latest] = await Promise.all([
      this.getCurrentVersion(),
      this.getLatestVersion(),
    ]);

    const hasUpdate = !!(current && latest && this.compareVersions(current, latest) < 0);

    return {
      current,
      latest,
      hasUpdate,
      lastChecked: Date.now(),
    };
  }

  /**
   * 버전 비교
   *
   * @returns -1: a < b, 0: a === b, 1: a > b
   */
  private compareVersions(a: string, b: string): number {
    // 'v' 접두사 제거
    const cleanA = a.replace(/^v/, "");
    const cleanB = b.replace(/^v/, "");

    const partsA = cleanA.split(".").map(Number);
    const partsB = cleanB.split(".").map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }

    return 0;
  }

  /**
   * 업그레이드 대상 파일 목록 조회
   *
   * quartz/ 폴더 내의 파일들만 업그레이드 대상
   *
   * @param targetVersion 대상 버전 (기본: 최신)
   */
  async getUpgradeFiles(targetVersion?: string): Promise<UpgradeFile[]> {
    const version = targetVersion ?? (await this.getLatestVersion());
    if (!version) {
      throw new Error("Could not determine target version");
    }

    const tree = await this.github.getExternalTree(QUARTZ_REPO.owner, QUARTZ_REPO.repo, version);

    // quartz/ 폴더 내의 blob(파일)만 필터링
    return tree
      .filter((item) => item.path.startsWith("quartz/") && item.type === "blob")
      .map((item) => ({
        path: item.path,
        sha: item.sha,
      }));
  }

  /**
   * Quartz 업그레이드 실행
   *
   * @param onProgress 진행 상황 콜백
   */
  async upgrade(onProgress?: ProgressCallback): Promise<UpgradeResult> {
    this.abortController = new AbortController();

    const progress: QuartzUpgradeProgress = { ...INITIAL_UPGRADE_PROGRESS };

    const updateProgress = (updates: Partial<QuartzUpgradeProgress>) => {
      Object.assign(progress, updates);
      onProgress?.(progress);
    };

    try {
      // 1. 버전 확인
      updateProgress({ status: "checking" });

      const versionInfo = await this.checkVersion();
      if (!versionInfo.latest) {
        throw new Error("Could not fetch latest version");
      }

      if (!versionInfo.hasUpdate) {
        return {
          success: true,
          version: versionInfo.current ?? undefined,
          filesUpdated: 0,
        };
      }

      // 2. 업그레이드 파일 목록 조회
      updateProgress({ status: "downloading" });

      const files = await this.getUpgradeFiles(versionInfo.latest);
      if (files.length === 0) {
        throw new Error("No upgrade files found");
      }

      updateProgress({ totalFiles: files.length });

      // 3. 파일 내용 다운로드 및 준비
      const fileContents: Array<{ path: string; content: string }> = [];

      for (let i = 0; i < files.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error("Upgrade aborted");
        }

        const file = files[i];
        updateProgress({
          completedFiles: i,
          currentFile: file.path,
        });

        const content = await this.github.getExternalFileContent(
          QUARTZ_REPO.owner,
          QUARTZ_REPO.repo,
          file.path,
          versionInfo.latest!
        );

        if (content !== null) {
          fileContents.push({
            path: file.path,
            content,
          });
        }
      }

      // 4. 파일 적용 (한 번의 커밋으로)
      updateProgress({
        status: "applying",
        completedFiles: files.length,
        currentFile: null,
      });

      if (this.abortController.signal.aborted) {
        throw new Error("Upgrade aborted");
      }

      const commitResult = await this.github.commitMultipleFiles(
        fileContents,
        `chore: upgrade Quartz to ${versionInfo.latest}`
      );

      if (!commitResult.success) {
        throw new Error(commitResult.error || "Failed to commit files");
      }

      // 5. 완료
      updateProgress({
        status: "completed",
        currentFile: null,
      });

      return {
        success: true,
        version: versionInfo.latest,
        filesUpdated: fileContents.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      updateProgress({
        status: "error",
        error: message,
        currentFile: null,
      });

      return {
        success: false,
        error: message,
      };
    } finally {
      this.abortController = null;
    }
  }

  /**
   * 업그레이드 중단
   */
  abort(): void {
    this.abortController?.abort();
  }
}
