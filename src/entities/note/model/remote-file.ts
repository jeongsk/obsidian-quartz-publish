/**
 * Remote File Service
 *
 * 원격 저장소의 발행된 파일을 관리하는 서비스입니다.
 */

import type { GitHubService } from "../../github/model/service";
import type {
  PublishedFile,
  DuplicateGroup,
  DeleteResult,
  RemoteFileManagerConfig,
} from "../../../app/types";
import { DEFAULT_REMOTE_FILE_MANAGER_CONFIG } from "../../../app/types";
import { t } from "../../../shared/lib/i18n";

/**
 * 원격 파일 관리 서비스
 */
export class RemoteFileService {
  private config: RemoteFileManagerConfig;

  constructor(
    private gitHubService: GitHubService,
    config: Partial<RemoteFileManagerConfig> = {}
  ) {
    this.config = { ...DEFAULT_REMOTE_FILE_MANAGER_CONFIG, ...config };
  }

  /**
   * 발행된 파일 목록을 조회합니다.
   *
   * @returns 발행된 파일 배열 (경로별 알파벳순 정렬)
   * @throws GitHubError - API 오류 시
   */
  async getPublishedFiles(): Promise<PublishedFile[]> {
    const files = await this.gitHubService.getDirectoryContents(this.config.contentPath, true);

    // 지원하는 확장자만 필터링
    const filteredFiles = files.filter((file) =>
      this.config.fileExtensions.some((ext) => file.name.toLowerCase().endsWith(ext.toLowerCase()))
    );

    // 경로별 알파벳순 정렬
    return filteredFiles.sort((a, b) =>
      a.path.localeCompare(b.path, "en", { sensitivity: "base" })
    );
  }

  /**
   * 파일명 기준으로 중복 파일 그룹을 감지합니다.
   *
   * @param files - 검사할 파일 목록
   * @returns 중복 그룹 배열
   */
  detectDuplicates(files: PublishedFile[]): DuplicateGroup[] {
    const nameMap = new Map<string, PublishedFile[]>();

    for (const file of files) {
      const existing = nameMap.get(file.name) ?? [];
      existing.push(file);
      nameMap.set(file.name, existing);
    }

    return Array.from(nameMap.entries())
      .filter(([, groupFiles]) => groupFiles.length > 1)
      .map(([fileName, groupFiles]) => ({
        fileName,
        files: groupFiles,
        count: groupFiles.length,
      }))
      .sort((a, b) => b.count - a.count); // 중복 많은 순
  }

  /**
   * 파일명 또는 경로로 파일을 검색합니다.
   *
   * @param files - 검색할 파일 목록
   * @param query - 검색어
   * @returns 필터링된 파일 배열
   */
  searchFiles(files: PublishedFile[], query: string): PublishedFile[] {
    if (!query.trim()) return files;

    const lowerQuery = query.toLowerCase();
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(lowerQuery) || file.path.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 선택된 파일들을 삭제합니다.
   *
   * @param files - 삭제할 파일 배열
   * @param onProgress - 진행률 콜백
   * @returns 삭제 결과
   * @throws Error - 최대 파일 수 초과 시
   */
  async deleteFiles(
    files: PublishedFile[],
    onProgress?: (current: number, total: number) => void
  ): Promise<DeleteResult> {
    // 빈 배열 검증
    if (files.length === 0) {
      throw new Error(t("error.remoteFiles.noSelection"));
    }

    // 최대 파일 수 검증
    if (files.length > this.config.maxBatchDelete) {
      throw new Error(t("error.remoteFiles.maxFiles", { max: this.config.maxBatchDelete }));
    }

    const startTime = Date.now();
    const succeeded: PublishedFile[] = [];
    const failed: Array<{ file: PublishedFile; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length);

      try {
        const result = await this.gitHubService.deleteFile(
          file.path,
          file.sha,
          `chore: Delete ${file.name} via Quartz Publish plugin`
        );

        if (result.success) {
          succeeded.push(file);
        } else {
          failed.push({
            file,
            error: result.error ?? "Unknown error",
          });
        }

        // API 속도 제한 방지 (마지막 파일 제외)
        if (i < files.length - 1) {
          await this.delay(this.config.deleteDelayMs);
        }
      } catch (error) {
        failed.push({
          file,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      succeeded,
      failed,
      allSucceeded: failed.length === 0,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 지정된 시간만큼 대기합니다.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 파일 크기를 사람이 읽기 쉬운 형식으로 변환합니다.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
}
