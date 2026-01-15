# Data Model: 발행 대시보드 콘텐츠 해시 불일치 버그 수정

**Date**: 2026-01-15
**Feature**: 001-fix-content-hash

## 기존 엔티티 (변경 없음)

이 기능은 데이터 모델 변경이 없습니다. 기존 엔티티를 참조용으로 문서화합니다.

### PublishRecord

발행된 노트의 기록을 저장합니다.

```typescript
interface PublishRecord {
  id: string;              // 파일 경로의 SHA-256 해시
  localPath: string;       // 로컬 파일 경로
  remotePath: string;      // GitHub 저장소 내 경로
  contentHash: string;     // 파일 콘텐츠의 SHA-256 해시 (버그 수정 대상)
  publishedAt: number;     // 발행 시각 (Unix timestamp)
  remoteSha: string;       // GitHub blob SHA
  attachments: AttachmentRecord[];  // 첨부파일 목록
}
```

**contentHash 필드 동작 변경**:
- **이전**: `transformed.content` (변환된 콘텐츠)의 해시
- **이후**: `content` (원본 콘텐츠, 프론트매터 자동 수정 후)의 해시

### NoteStatus

파일의 현재 발행 상태를 나타냅니다.

```typescript
type PublishStatus = 'new' | 'modified' | 'synced' | 'deleted' | 'unpublished';

interface NoteStatus {
  file: TFile;
  status: PublishStatus;
  localHash?: string;      // 현재 파일의 해시
  record?: PublishRecord;  // 발행 기록 (있는 경우)
}
```

### StatusOverview

대시보드에 표시되는 상태별 노트 목록입니다.

```typescript
interface StatusOverview {
  new: NoteStatus[];       // 신규 발행 필요
  modified: NoteStatus[];  // 업데이트 필요
  synced: NoteStatus[];    // 최신 상태
  deleted: NoteStatus[];   // 삭제 필요
}
```

## 상태 판별 로직

```
┌─────────────────────────────────────────────────────────┐
│                    파일 상태 판별                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  발행 기록 없음? ──────── Yes ───────► 'new'            │
│       │                                                 │
│       No                                                │
│       │                                                 │
│       ▼                                                 │
│  publish: false? ──────── Yes ───────► 'unpublished'   │
│       │                                                 │
│       No                                                │
│       │                                                 │
│       ▼                                                 │
│  currentHash ≠ record.contentHash? ── Yes ─► 'modified'│
│       │                                                 │
│       No                                                │
│       │                                                 │
│       ▼                                                 │
│    'synced'                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 해시 계산 흐름 (수정 후)

```
┌─────────────────────────────────────────────────────────┐
│                     발행 프로세스                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 파일 읽기                                            │
│       │                                                 │
│       ▼                                                 │
│  2. 프론트매터 자동 수정 (publish, 날짜 필드)              │
│       │                                                 │
│       ▼                                                 │
│  3. content = 수정된 파일 내용                           │
│       │                                                 │
│       ├──────────────────────────────────┐              │
│       │                                  │              │
│       ▼                                  ▼              │
│  4a. transform() 적용              4b. calculateHash()  │
│       │                                  │              │
│       ▼                                  ▼              │
│  5a. GitHub 업로드               5b. contentHash 저장   │
│      (변환된 콘텐츠)                  (원본 콘텐츠 해시)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
