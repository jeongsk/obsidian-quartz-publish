# Data Model: 원격 저장소 파일 관리

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## Entities

### 1. PublishedFile

원격 저장소에 발행된 개별 파일을 나타냅니다.

```typescript
interface PublishedFile {
  /** 파일의 전체 경로 (content/ 포함) */
  path: string;

  /** 파일명 (확장자 포함) */
  name: string;

  /** GitHub 파일 SHA 해시 (삭제 시 필요) */
  sha: string;

  /** 파일 크기 (바이트) */
  size: number;

  /** GitHub에서 제공하는 파일 타입 ('file' | 'dir') */
  type: 'file' | 'dir';

  /** 파일의 HTML URL (GitHub 웹에서 보기) */
  htmlUrl: string;

  /** 파일의 다운로드 URL */
  downloadUrl: string | null;
}
```

**Validation Rules**:
- `path`: 빈 문자열 불가, `content/`로 시작해야 함
- `name`: 빈 문자열 불가, `.md` 확장자
- `sha`: 40자 hex 문자열
- `size`: 0 이상의 정수
- `type`: 'file'만 표시 (디렉토리는 재귀 조회로 처리)

---

### 2. DuplicateGroup

동일한 파일명을 가진 파일들의 그룹을 나타냅니다.

```typescript
interface DuplicateGroup {
  /** 중복된 파일명 */
  fileName: string;

  /** 중복 파일 목록 */
  files: PublishedFile[];

  /** 중복 파일 수 */
  count: number;
}
```

**Validation Rules**:
- `fileName`: 빈 문자열 불가
- `files`: 최소 2개 이상의 파일
- `count`: files.length와 일치해야 함

---

### 3. FileListState

파일 목록 UI의 상태를 관리합니다.

```typescript
interface FileListState {
  /** 전체 파일 목록 (캐싱됨) */
  files: PublishedFile[];

  /** 현재 선택된 파일들 */
  selectedFiles: Set<string>;  // path 기반

  /** 검색어 */
  searchQuery: string;

  /** 필터링된 파일 목록 */
  filteredFiles: PublishedFile[];

  /** 감지된 중복 그룹 */
  duplicateGroups: DuplicateGroup[];

  /** 로딩 상태 */
  isLoading: boolean;

  /** 삭제 진행 상태 */
  isDeleting: boolean;

  /** 에러 메시지 */
  error: string | null;
}
```

**State Transitions**:

```
[초기] → loadFiles() → [로딩중] → 성공 → [파일목록]
                                 → 실패 → [에러]

[파일목록] → selectFile() → [파일선택됨]
          → search() → [필터링됨]
          → refresh() → [로딩중]

[파일선택됨] → deleteSelected() → [삭제중] → 성공 → [파일목록]
                                          → 실패 → [부분실패]
```

---

### 4. DeleteResult

삭제 작업의 결과를 나타냅니다.

```typescript
interface DeleteResult {
  /** 삭제 성공한 파일들 */
  succeeded: PublishedFile[];

  /** 삭제 실패한 파일들 */
  failed: Array<{
    file: PublishedFile;
    error: string;
  }>;

  /** 전체 성공 여부 */
  allSucceeded: boolean;

  /** 총 처리 시간 (ms) */
  duration: number;
}
```

---

### 5. RemoteFileManagerConfig

파일 관리자 설정입니다.

```typescript
interface RemoteFileManagerConfig {
  /** 조회할 콘텐츠 경로 */
  contentPath: string;  // 기본값: 'content'

  /** 일괄 삭제 최대 파일 수 */
  maxBatchDelete: number;  // 기본값: 50

  /** 검색 디바운스 시간 (ms) */
  searchDebounceMs: number;  // 기본값: 300

  /** 확장자 필터 */
  fileExtensions: string[];  // 기본값: ['.md']
}
```

---

## Relationships

```
┌─────────────────────────────────────────────────────────┐
│                   RemoteFileManagerModal                │
├─────────────────────────────────────────────────────────┤
│  - config: RemoteFileManagerConfig                      │
│  - state: FileListState                                 │
│  - gitHubService: GitHubService                         │
└─────────────────────────────────────────────────────────┘
                           │
                           │ contains
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    FileListState                        │
├─────────────────────────────────────────────────────────┤
│  files: PublishedFile[]                                 │
│  selectedFiles: Set<string>                             │
│  duplicateGroups: DuplicateGroup[]                      │
└─────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    PublishedFile   PublishedFile   DuplicateGroup
                                          │
                                          │ groups
                                          ▼
                                   PublishedFile[]
```

---

## Type Additions to types.ts

```typescript
// src/types.ts에 추가할 타입들

/** 원격 저장소의 발행된 파일 정보 */
export interface PublishedFile {
  path: string;
  name: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  htmlUrl: string;
  downloadUrl: string | null;
}

/** 중복 파일 그룹 */
export interface DuplicateGroup {
  fileName: string;
  files: PublishedFile[];
  count: number;
}

/** 파일 삭제 결과 */
export interface DeleteResult {
  succeeded: PublishedFile[];
  failed: Array<{
    file: PublishedFile;
    error: string;
  }>;
  allSucceeded: boolean;
  duration: number;
}

/** 원격 파일 관리자 설정 */
export interface RemoteFileManagerConfig {
  contentPath: string;
  maxBatchDelete: number;
  searchDebounceMs: number;
  fileExtensions: string[];
}
```

---

## Constants

```typescript
// src/constants/remote-files.ts

export const DEFAULT_REMOTE_FILE_CONFIG: RemoteFileManagerConfig = {
  contentPath: 'content',
  maxBatchDelete: 50,
  searchDebounceMs: 300,
  fileExtensions: ['.md'],
};

export const GITHUB_CONTENTS_API_LIMIT = 1000;  // 디렉토리당 최대 파일 수
```
