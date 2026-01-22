/**
 * Publish Record Storage Service
 *
 * 발행 기록을 별도 파일(publish-records.json)에 저장하는 서비스입니다.
 * data.json의 크기 문제를 해결하기 위해 분리되었습니다.
 */

import type { Plugin } from "obsidian";
import { TFile } from "obsidian";
import type { PublishRecord, PublishRecordsStorage } from "../types";
import { PUBLISH_RECORDS_VERSION, DEFAULT_PUBLISH_RECORDS_STORAGE } from "../types";

/**
 * 발행 기록 저장소 서비스
 */
export class PublishRecordStorage {
  private plugin: Plugin;
  private data: PublishRecordsStorage;
  private readonly FILE_NAME = "publish-records.json";
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24시간

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.data = DEFAULT_PUBLISH_RECORDS_STORAGE;
  }

  /**
   * 저장소 초기화 (플러그인 로드 시 호출)
   */
  async load(): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      const path = this.getFilePath();

      if (await adapter.exists(path)) {
        const content = await adapter.read(path);
        const parsed = JSON.parse(content) as PublishRecordsStorage;

        // 버전 검사 및 마이그레이션
        if (parsed.version === PUBLISH_RECORDS_VERSION) {
          this.data = parsed;
        } else {
          // 버전 불일치 시 마이그레이션 (현재는 v1만 존재)
          this.data = {
            version: PUBLISH_RECORDS_VERSION,
            records: parsed.records ?? {},
          };
          await this.save();
        }
      } else {
        // 파일이 없으면 기본값 사용
        this.data = DEFAULT_PUBLISH_RECORDS_STORAGE;
      }
    } catch (error) {
      console.error("[PublishRecordStorage] Load error:", error);
      this.data = DEFAULT_PUBLISH_RECORDS_STORAGE;
    }
  }

  /**
   * 저장소 저장
   */
  async save(): Promise<void> {
    try {
      const adapter = this.plugin.app.vault.adapter;
      const path = this.getFilePath();
      const content = JSON.stringify(this.data, null, 2);
      await adapter.write(path, content);
    } catch (error) {
      console.error("[PublishRecordStorage] Save error:", error);
      throw error;
    }
  }

  /**
   * 모든 발행 기록 반환
   */
  getAllRecords(): Record<string, PublishRecord> {
    return this.data.records;
  }

  /**
   * 특정 경로의 발행 기록 조회
   */
  getRecord(localPath: string): PublishRecord | undefined {
    return this.data.records[localPath];
  }

  /**
   * 발행 기록 추가/업데이트
   */
  async updateRecord(localPath: string, record: PublishRecord): Promise<void> {
    this.data.records[localPath] = record;
    await this.save();
  }

  /**
   * 발행 기록 삭제
   */
  async removeRecord(localPath: string): Promise<void> {
    delete this.data.records[localPath];
    await this.save();
  }

  /**
   * 발행 기록 존재 여부 확인
   */
  hasRecord(localPath: string): boolean {
    return localPath in this.data.records;
  }

  /**
   * 발행 기록 개수 반환
   */
  getRecordCount(): number {
    return Object.keys(this.data.records).length;
  }

  /**
   * 발행 기록 경로 목록 반환
   */
  getRecordPaths(): string[] {
    return Object.keys(this.data.records);
  }

  /**
   * 원격에 존재하지 않는 파일의 발행 기록을 정리합니다.
   *
   * @param records 발행 기록
   * @param remoteFiles 원격 파일 목록
   * @returns 정리 결과
   */
  async cleanUpDeletedRecords(
    records: Record<string, PublishRecord>,
    remoteFiles: Array<{ path: string; sha: string }>
  ): Promise<{
    cleanedRecords: Record<string, PublishRecord>;
    removedCount: number;
  }> {
    const cleanedRecords: Record<string, PublishRecord> = {};
    let removedCount = 0;

    for (const [localPath, record] of Object.entries(records)) {
      const existsInRemote = remoteFiles.some((f) => f.path === record.remotePath);

      if (existsInRemote) {
        cleanedRecords[localPath] = record;
      } else {
        console.log(`[PublishRecordStorage] Removing stale record: ${record.remotePath}`);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      // 내부 데이터 업데이트
      this.data.records = cleanedRecords;
      await this.save();
    }

    return { cleanedRecords, removedCount };
  }

  /**
   * 볼트에서 존재하지 않는 파일의 레코드 정리
   * @param cleanupAll true인 경우 모든 레코드 삭제 (테스트용)
   * @returns 정리된 레코드 수
   */
  async cleanup(cleanupAll = false): Promise<number> {
    const now = Date.now();
    const lastCleanup = this.data.lastCleanup ?? 0;

    // 마지막 cleanup에서 24시간이 지나지 않았으면 스킵
    if (!cleanupAll && now - lastCleanup < this.CLEANUP_INTERVAL) {
      return 0;
    }

    let removedCount = 0;
    const recordsToRemove: string[] = [];

    if (cleanupAll) {
      // 모든 레코드 삭제 (테스트/초기화용)
      recordsToRemove.push(...this.getRecordPaths());
    } else {
      // 볼트에서 존재하지 않는 파일의 레코드 수집
      for (const localPath of this.getRecordPaths()) {
        const file = this.plugin.app.vault.getAbstractFileByPath(localPath);
        if (!file || !(file instanceof TFile)) {
          recordsToRemove.push(localPath);
        }
      }
    }

    // 레코드 삭제
    for (const localPath of recordsToRemove) {
      delete this.data.records[localPath];
      removedCount++;
    }

    // 마지막 cleanup 시간 업데이트
    this.data.lastCleanup = now;

    if (removedCount > 0) {
      await this.save();
    }

    return removedCount;
  }

  /**
   * 마이그레이션: data.json의 레코드를 별도 파일로 이동
   */
  async migrateFromOldData(oldRecords: Record<string, PublishRecord>): Promise<void> {
    if (Object.keys(oldRecords).length === 0) {
      return;
    }

    this.data.records = { ...oldRecords };
    await this.save();
  }

  /**
   * 저장소 파일 경로 반환
   */
  private getFilePath(): string {
    // Obsidian 플러그인 데이터 디렉토리: .obsidian/plugins/quartz-publish/
    return `${this.plugin.manifest.dir}/${this.FILE_NAME}`;
  }
}
