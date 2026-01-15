# Plugin Services Contract

**Feature**: 001-quartz-publish
**Date**: 2026-01-13

## Overview

Obsidian Quartz Publish 플러그인의 내부 서비스 인터페이스를 정의합니다.

---

## 1. PublishService

노트 발행 핵심 로직을 담당합니다.

```typescript
interface PublishService {
  /**
   * 단일 노트 발행
   * @param file 발행할 TFile
   * @returns 발행 결과
   */
  publishNote(file: TFile): Promise<PublishResult>;

  /**
   * 여러 노트 일괄 발행
   * @param files 발행할 TFile 배열
   * @param onProgress 진행 콜백
   * @returns 일괄 발행 결과
   */
  publishNotes(
    files: TFile[],
    onProgress?: (current: number, total: number, file: TFile) => void
  ): Promise<BatchPublishResult>;

  /**
   * 노트 발행 취소 (리포지토리에서 삭제)
   * @param file 삭제할 TFile
   * @returns 삭제 결과
   */
  unpublishNote(file: TFile): Promise<UnpublishResult>;

  /**
   * 전체 동기화
   * - 신규 노트 발행
   * - 수정된 노트 업데이트
   * - 삭제된 노트 제거
   * @param options 동기화 옵션
   * @returns 동기화 결과
   */
  syncAll(options?: SyncOptions): Promise<SyncResult>;
}

interface PublishResult {
  success: boolean;
  file: TFile;
  remotePath?: string;
  error?: PublishError;
}

interface BatchPublishResult {
  total: number;
  succeeded: number;
  failed: number;
  results: PublishResult[];
}

interface UnpublishResult {
  success: boolean;
  file: TFile;
  error?: string;
}

interface SyncOptions {
  includeNew?: boolean;      // 기본값: true
  includeModified?: boolean; // 기본값: true
  includeDeleted?: boolean;  // 기본값: false (확인 필요)
}

interface SyncResult {
  published: PublishResult[];
  updated: PublishResult[];
  deleted: UnpublishResult[];
  errors: Array<{ path: string; error: string }>;
}

type PublishError =
  | 'not_connected'
  | 'no_publish_flag'
  | 'file_too_large'
  | 'network_error'
  | 'rate_limited'
  | 'conflict'
  | 'unknown';
```

---

## 2. ContentTransformer

마크다운 콘텐츠를 Quartz 호환 형식으로 변환합니다.

```typescript
interface ContentTransformer {
  /**
   * 노트 콘텐츠 변환
   * @param content 원본 마크다운 콘텐츠
   * @param file 소스 파일
   * @param publishedNotes 발행된 노트 경로 Set
   * @returns 변환된 콘텐츠와 참조된 첨부파일 목록
   */
  transform(
    content: string,
    file: TFile,
    publishedNotes: Set<string>
  ): TransformResult;

  /**
   * 프론트매터 추출 및 수정
   * @param content 원본 콘텐츠
   * @returns 프론트매터와 본문 분리
   */
  parseFrontmatter(content: string): FrontmatterResult;

  /**
   * 발행 경로 결정
   * @param file 소스 파일
   * @param frontmatter 프론트매터
   * @returns 리포지토리 내 경로
   */
  getRemotePath(file: TFile, frontmatter: Record<string, any>): string;
}

interface TransformResult {
  content: string;           // 변환된 마크다운
  attachments: AttachmentRef[]; // 참조된 첨부파일
}

interface AttachmentRef {
  localPath: string;         // 볼트 내 경로
  remotePath: string;        // 리포지토리 내 경로
}

interface FrontmatterResult {
  frontmatter: Record<string, any>;
  body: string;
  raw: string;  // 프론트매터 원본 (YAML)
}
```

### 변환 규칙

| 패턴 | 입력 | 출력 (발행됨) | 출력 (미발행) |
|------|------|--------------|--------------|
| 위키링크 | `[[note]]` | `[note](note.md)` | `note` |
| 별칭 링크 | `[[note\|alias]]` | `[alias](note.md)` | `alias` |
| 이미지 | `![[img.png]]` | `![img](/static/images/note/img.png)` | - |
| 외부 링크 | `[text](url)` | `[text](url)` | `[text](url)` |

---

## 3. StatusService

노트의 발행 상태를 관리합니다.

```typescript
interface StatusService {
  /**
   * 모든 발행 가능 노트의 상태 조회
   * @returns 상태별 노트 목록
   */
  getAllStatus(): Promise<StatusOverview>;

  /**
   * 단일 노트 상태 조회
   * @param file 조회할 TFile
   * @returns 노트 상태
   */
  getStatus(file: TFile): Promise<NoteStatus>;

  /**
   * 발행 기록 업데이트
   * @param file 파일
   * @param record 발행 기록
   */
  updateRecord(file: TFile, record: PublishRecord): Promise<void>;

  /**
   * 발행 기록 삭제
   * @param localPath 로컬 경로
   */
  removeRecord(localPath: string): Promise<void>;

  /**
   * 콘텐츠 해시 계산
   * @param content 콘텐츠
   * @returns SHA256 해시
   */
  calculateHash(content: string): Promise<string>;
}

interface StatusOverview {
  new: NoteStatus[];       // 신규 발행 필요
  modified: NoteStatus[];  // 업데이트 필요
  synced: NoteStatus[];    // 최신 상태
  deleted: NoteStatus[];   // 삭제 필요 (리포지토리에만 존재)
}

interface NoteStatus {
  file: TFile;
  status: PublishStatus;
  localHash?: string;
  record?: PublishRecord;
}

type PublishStatus = 'new' | 'modified' | 'synced' | 'deleted' | 'unpublished';
```

---

## 4. SettingsService

플러그인 설정 관리를 담당합니다.

```typescript
interface SettingsService {
  /**
   * 설정 로드
   */
  load(): Promise<PluginSettings>;

  /**
   * 설정 저장
   * @param settings 저장할 설정
   */
  save(settings: PluginSettings): Promise<void>;

  /**
   * GitHub 연결 테스트
   * @returns 연결 결과
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * 리포지토리 URL 파싱
   * @param url GitHub URL
   * @returns owner, repo 추출
   */
  parseRepoUrl(url: string): { owner: string; repo: string } | null;
}

interface ConnectionTestResult {
  success: boolean;
  repository?: {
    name: string;
    owner: string;
    defaultBranch: string;
    isQuartz: boolean;
    lastCommit?: string;
  };
  error?: {
    type: ConnectionError;
    message: string;
  };
}
```

---

## 5. QuartzConfigService (Phase 3)

Quartz 설정 파일 관리를 담당합니다.

```typescript
interface QuartzConfigService {
  /**
   * 현재 Quartz 설정 조회
   * @returns 파싱된 설정
   */
  getConfig(): Promise<QuartzConfig | null>;

  /**
   * ExplicitPublish 플러그인 활성화/비활성화
   * @param enabled 활성화 여부
   */
  setExplicitPublish(enabled: boolean): Promise<void>;

  /**
   * ignorePatterns 업데이트
   * @param patterns 패턴 배열
   */
  setIgnorePatterns(patterns: string[]): Promise<void>;

  /**
   * URL 전략 변경
   * @param strategy 전략
   */
  setUrlStrategy(strategy: 'shortest' | 'absolute'): Promise<void>;
}

interface QuartzConfig {
  explicitPublish: boolean;
  ignorePatterns: string[];
  urlStrategy: 'shortest' | 'absolute';
  raw: string;  // 원본 TypeScript 코드
}
```

---

## Event Flow

```
User Action → Service Call → GitHub API → Update Records → UI Update

예: 노트 발행
1. User: Command Palette → "Publish to Quartz"
2. PublishService.publishNote(file)
   a. ContentTransformer.transform(content, file, publishedNotes)
   b. ContentTransformer.getRemotePath(file, frontmatter)
   c. GitHubService.createOrUpdateFile(remotePath, content, message)
   d. StatusService.updateRecord(file, record)
3. Notice: "발행 완료: {filename}"
```
