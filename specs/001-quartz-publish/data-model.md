# Data Model: Quartz Publish Plugin

**Feature**: 001-quartz-publish
**Date**: 2026-01-13

## Entity Relationship Diagram

```
┌─────────────────────┐     1:N     ┌─────────────────────┐
│   PluginSettings    │─────────────│    PublishRecord    │
└─────────────────────┘             └─────────────────────┘
         │                                    │
         │ 1:1                               │ 1:N
         ▼                                    ▼
┌─────────────────────┐             ┌─────────────────────┐
│     Repository      │             │     Attachment      │
└─────────────────────┘             └─────────────────────┘
```

---

## Entities

### 1. PluginSettings

플러그인 전역 설정을 저장합니다.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| githubToken | string | Yes | GitHub Personal Access Token |
| repoUrl | string | Yes | Quartz 리포지토리 URL (예: `https://github.com/user/quartz`) |
| repoOwner | string | Derived | URL에서 추출한 소유자 |
| repoName | string | Derived | URL에서 추출한 리포지토리명 |
| defaultBranch | string | No | 기본 브랜치 (기본값: `main`) |
| contentPath | string | No | 콘텐츠 저장 경로 (기본값: `content`) |
| staticPath | string | No | 정적 파일 경로 (기본값: `static`) |
| quartzSettings | QuartzSettings | No | Quartz 설정 (Phase 3) |

**Validation Rules**:
- `githubToken`: 비어있지 않아야 함, `ghp_` 또는 `github_pat_` 접두사 권장
- `repoUrl`: 유효한 GitHub URL 형식 (`https://github.com/{owner}/{repo}`)

**TypeScript Definition**:
```typescript
interface PluginSettings {
  githubToken: string;
  repoUrl: string;
  defaultBranch: string;
  contentPath: string;
  staticPath: string;
  quartzSettings?: QuartzSettings;
}

const DEFAULT_SETTINGS: PluginSettings = {
  githubToken: '',
  repoUrl: '',
  defaultBranch: 'main',
  contentPath: 'content',
  staticPath: 'static',
};
```

---

### 2. Repository

연결된 GitHub 리포지토리 정보 (런타임 상태)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| owner | string | Yes | 리포지토리 소유자 |
| name | string | Yes | 리포지토리 이름 |
| fullName | string | Derived | `{owner}/{name}` |
| defaultBranch | string | Yes | 기본 브랜치 |
| isQuartz | boolean | Yes | Quartz 리포지토리 여부 |
| lastCommitSha | string | No | 마지막 커밋 SHA |
| connectionStatus | ConnectionStatus | Yes | 연결 상태 |

**State Transitions**:
```
disconnected → connecting → connected
                    ↓
               error (invalid_token | not_found | not_quartz | network_error)
```

**TypeScript Definition**:
```typescript
type ConnectionStatus =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; lastChecked: number }
  | { status: 'error'; error: ConnectionError };

type ConnectionError =
  | 'invalid_token'
  | 'not_found'
  | 'not_quartz'
  | 'network_error'
  | 'rate_limited';

interface Repository {
  owner: string;
  name: string;
  defaultBranch: string;
  isQuartz: boolean;
  lastCommitSha?: string;
  connectionStatus: ConnectionStatus;
}
```

---

### 3. PublishRecord

발행된 노트의 기록

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | 고유 ID (로컬 경로 기반 해시) |
| localPath | string | Yes | 볼트 내 파일 경로 |
| remotePath | string | Yes | 리포지토리 내 경로 |
| contentHash | string | Yes | 콘텐츠 SHA256 해시 |
| publishedAt | number | Yes | 발행 시간 (Unix timestamp) |
| remoteSha | string | Yes | GitHub blob SHA |
| attachments | AttachmentRecord[] | No | 첨부파일 기록 |

**Validation Rules**:
- `localPath`: 볼트 내 유효한 마크다운 파일 경로
- `remotePath`: `content/` 또는 사용자 지정 경로로 시작
- `contentHash`: 64자 hex 문자열 (SHA256)

**TypeScript Definition**:
```typescript
interface PublishRecord {
  id: string;
  localPath: string;
  remotePath: string;
  contentHash: string;
  publishedAt: number;
  remoteSha: string;
  attachments: AttachmentRecord[];
}
```

---

### 4. Attachment (AttachmentRecord)

노트에 포함된 첨부파일 기록

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| localPath | string | Yes | 볼트 내 파일 경로 |
| remotePath | string | Yes | `static/images/{note-name}/{filename}` |
| contentHash | string | Yes | 파일 SHA256 해시 |
| size | number | Yes | 파일 크기 (bytes) |
| remoteSha | string | Yes | GitHub blob SHA |

**Validation Rules**:
- `size`: 10MB (10,485,760 bytes) 미만

**TypeScript Definition**:
```typescript
interface AttachmentRecord {
  localPath: string;
  remotePath: string;
  contentHash: string;
  size: number;
  remoteSha: string;
}
```

---

### 5. PublishStatus (Computed)

노트의 발행 상태 (런타임 계산)

| Value | Description | Condition |
|-------|-------------|-----------|
| `new` | 신규 발행 필요 | `publish: true` 있고 기록 없음 |
| `modified` | 업데이트 필요 | 기록 있고 해시 불일치 |
| `synced` | 최신 상태 | 기록 있고 해시 일치 |
| `deleted` | 삭제 필요 | 로컬에 없고 기록 있음 |
| `unpublished` | 발행 안함 | `publish: true` 없음 |

**TypeScript Definition**:
```typescript
type PublishStatus = 'new' | 'modified' | 'synced' | 'deleted' | 'unpublished';

interface NoteStatus {
  path: string;
  status: PublishStatus;
  localHash?: string;
  record?: PublishRecord;
}
```

---

### 6. QuartzSettings (Phase 3)

Quartz 설정 옵션

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| explicitPublish | boolean | No | ExplicitPublish 필터 활성화 |
| ignorePatterns | string[] | No | 제외 패턴 목록 |
| urlStrategy | 'shortest' \| 'absolute' | No | URL 생성 전략 |

**TypeScript Definition**:
```typescript
interface QuartzSettings {
  explicitPublish: boolean;
  ignorePatterns: string[];
  urlStrategy: 'shortest' | 'absolute';
}

const DEFAULT_QUARTZ_SETTINGS: QuartzSettings = {
  explicitPublish: false,
  ignorePatterns: [],
  urlStrategy: 'shortest',
};
```

---

## Persisted Data Structure

`data.json` 파일에 저장되는 전체 구조:

```typescript
interface PluginData {
  settings: PluginSettings;
  publishRecords: Record<string, PublishRecord>;  // key: localPath
  lastSync?: number;  // 마지막 동기화 시간
}
```

**Example**:
```json
{
  "settings": {
    "githubToken": "ghp_xxxxxxxxxxxx",
    "repoUrl": "https://github.com/user/quartz-garden",
    "defaultBranch": "main",
    "contentPath": "content",
    "staticPath": "static"
  },
  "publishRecords": {
    "notes/hello-world.md": {
      "id": "abc123",
      "localPath": "notes/hello-world.md",
      "remotePath": "content/notes/hello-world.md",
      "contentHash": "sha256:...",
      "publishedAt": 1736784000000,
      "remoteSha": "abc123def456",
      "attachments": [
        {
          "localPath": "attachments/image.png",
          "remotePath": "static/images/hello-world/image.png",
          "contentHash": "sha256:...",
          "size": 102400,
          "remoteSha": "def456abc123"
        }
      ]
    }
  },
  "lastSync": 1736784000000
}
```

---

## Hash Calculation

콘텐츠 해시 계산 방식:

```typescript
async function calculateHash(content: string | ArrayBuffer): Promise<string> {
  const data = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Note**: 마크다운 파일은 프론트매터 제외 후 본문만 해시 계산 (발행 메타데이터 변경으로 인한 불필요한 업데이트 방지)
