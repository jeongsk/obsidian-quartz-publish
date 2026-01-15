# Data Model: 노트 관리 (Note Management)

**Feature**: 002-note-management
**Date**: 2026-01-13

## 기존 엔티티 (types.ts에 이미 정의됨)

### PublishRecord
발행된 노트의 기록을 저장합니다.

```typescript
interface PublishRecord {
  id: string;              // 고유 ID (로컬 경로 기반 해시)
  localPath: string;       // 볼트 내 파일 경로
  remotePath: string;      // 리포지토리 내 경로
  contentHash: string;     // 콘텐츠 SHA256 해시
  publishedAt: number;     // 발행 시간 (Unix timestamp)
  remoteSha: string;       // GitHub blob SHA
  attachments: AttachmentRecord[];
}
```

### PublishStatus
노트의 발행 상태 분류입니다.

```typescript
type PublishStatus = 'new' | 'modified' | 'synced' | 'deleted' | 'unpublished';
```

| 상태 | 설명 | 조건 |
|------|------|------|
| `new` | 신규 발행 필요 | `publish: true` && 발행 기록 없음 |
| `modified` | 업데이트 필요 | 발행 기록 있음 && 로컬 해시 ≠ 저장된 해시 |
| `synced` | 최신 상태 | 발행 기록 있음 && 로컬 해시 = 저장된 해시 |
| `deleted` | 삭제 필요 | 발행 기록 있음 && (로컬 파일 삭제됨 \|\| `publish: false`) |
| `unpublished` | 발행 안 함 | `publish` 속성 없음 또는 `false` |

### NoteStatus
개별 노트의 상태 정보입니다.

```typescript
interface NoteStatus {
  file: TFile;              // Obsidian 파일 객체
  status: PublishStatus;    // 발행 상태
  localHash?: string;       // 현재 로컬 콘텐츠 해시
  record?: PublishRecord;   // 기존 발행 기록 (있는 경우)
}
```

### StatusOverview
대시보드 표시용 상태 개요입니다.

```typescript
interface StatusOverview {
  new: NoteStatus[];        // 신규 발행 필요 노트
  modified: NoteStatus[];   // 업데이트 필요 노트
  synced: NoteStatus[];     // 최신 상태 노트
  deleted: NoteStatus[];    // 삭제 필요 노트
}
```

## 새로운 타입 (Phase 2에서 추가 필요)

### DashboardTab
대시보드 탭 타입입니다.

```typescript
type DashboardTab = 'new' | 'modified' | 'deleted' | 'synced';
```

### DashboardState
대시보드 모달의 내부 상태입니다.

```typescript
interface DashboardState {
  activeTab: DashboardTab;           // 현재 활성 탭
  statusOverview: StatusOverview;    // 전체 상태 개요
  selectedPaths: Set<string>;        // 선택된 파일 경로
  isLoading: boolean;                // 로딩 중 여부
  isProcessing: boolean;             // 일괄 작업 중 여부
  progress?: {
    current: number;
    total: number;
    currentFile: string;
  };
}
```

### BatchOperationResult
일괄 작업 결과 요약입니다.

```typescript
interface BatchOperationResult {
  operation: 'publish' | 'delete';
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{
    path: string;
    error: string;
  }>;
}
```

## 데이터 흐름

### 1. 상태 계산 흐름

```
1. vault.getMarkdownFiles() → 모든 마크다운 파일 목록
2. 각 파일에 대해:
   a. metadataCache.getFileCache() → 프론트매터 확인
   b. publish: true인 파일 필터링
   c. publishRecords에서 기존 기록 조회
   d. ContentTransformer.transform() → 현재 콘텐츠 변환
   e. calculateHash() → 해시 계산
   f. 기록 해시와 비교 → 상태 결정
3. StatusOverview 객체로 그룹화
```

### 2. 일괄 발행 흐름

```
1. 사용자 선택 → selectedPaths (Set<string>)
2. selectedPaths를 TFile[]로 변환
3. PublishService.publishNotes(files, onProgress) 호출
4. 순차 처리 (500ms 딜레이)
5. 프로그레스 콜백으로 UI 업데이트
6. BatchPublishResult 반환
7. 결과 요약 표시
```

### 3. 일괄 삭제 흐름

```
1. 사용자 선택 → selectedPaths (Set<string>)
2. ConfirmDeleteModal로 확인
3. 확인 시:
   a. 각 파일에 대해 PublishService.unpublishNote() 호출
   b. 순차 처리 (500ms 딜레이)
   c. 프로그레스 콜백으로 UI 업데이트
4. 결과 요약 표시
```

## 상태 계산 규칙

### 상태 판단 로직

```typescript
function determineStatus(
  file: TFile,
  publishRecords: Record<string, PublishRecord>,
  currentHash: string,
  hasPublishFlag: boolean
): PublishStatus {
  const record = publishRecords[file.path];

  // publish: true가 없으면 unpublished
  if (!hasPublishFlag) {
    // 기록이 있으면 deleted (발행 후 플래그 제거)
    if (record) return 'deleted';
    return 'unpublished';
  }

  // publish: true이고 기록이 없으면 new
  if (!record) return 'new';

  // 기록이 있고 해시가 다르면 modified
  if (record.contentHash !== currentHash) return 'modified';

  // 해시가 같으면 synced
  return 'synced';
}
```

### 삭제 대상 판별

```typescript
function findDeletedNotes(
  publishRecords: Record<string, PublishRecord>,
  vault: Vault,
  metadataCache: MetadataCache
): NoteStatus[] {
  const deleted: NoteStatus[] = [];

  for (const [path, record] of Object.entries(publishRecords)) {
    const file = vault.getAbstractFileByPath(path);

    // 파일이 삭제됨
    if (!file || !(file instanceof TFile)) {
      deleted.push({
        file: { path } as TFile, // 삭제된 파일은 경로만 유지
        status: 'deleted',
        record
      });
      continue;
    }

    // 파일은 있지만 publish: false로 변경됨
    const cache = metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    if (!frontmatter?.publish) {
      deleted.push({
        file,
        status: 'deleted',
        record
      });
    }
  }

  return deleted;
}
```

## 저장소 구조

### PluginData (data.json)

```typescript
interface PluginData {
  settings: PluginSettings;
  publishRecords: Record<string, PublishRecord>; // key: localPath
  lastSync?: number;
}
```

- `publishRecords`는 기존에 이미 구현되어 있음
- Phase 2에서 추가적인 저장소 변경 불필요
