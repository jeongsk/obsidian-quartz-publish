# Data Model: Quartz 설정 관리

**Date**: 2026-01-13
**Feature**: 003-quartz-config

## Entities

### 1. QuartzConfigFile

원격 `quartz.config.ts` 파일의 상태를 나타냅니다.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| path | string | 파일 경로 | 항상 `"quartz.config.ts"` |
| sha | string | GitHub blob SHA | Git 커밋 시 필요 |
| content | string | 파일 전체 내용 | TypeScript 문법 유지 필요 |
| lastFetched | number | 마지막 조회 시간 (Unix ms) | 캐시 유효성 판단용 |

### 2. QuartzSettings (기존 확장)

플러그인에서 관리하는 Quartz 설정값입니다. `src/types.ts`에 이미 정의되어 있으며 확장합니다.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| explicitPublish | boolean | ExplicitPublish 필터 활성화 | `false` |
| ignorePatterns | string[] | 제외할 glob 패턴 목록 | `[]` |
| urlStrategy | `'shortest' \| 'absolute'` | URL 생성 전략 | `'shortest'` |

### 3. QuartzVersionInfo

Quartz 버전 정보를 나타냅니다.

| Field | Type | Description |
|-------|------|-------------|
| current | string \| null | 현재 설치된 버전 (예: "v4.0.5") |
| latest | string \| null | 최신 릴리스 버전 (예: "v4.0.8") |
| hasUpdate | boolean | 업데이트 가능 여부 |
| lastChecked | number | 마지막 확인 시간 (Unix ms) |

### 4. QuartzUpgradeProgress

업그레이드 진행 상태를 나타냅니다.

| Field | Type | Description |
|-------|------|-------------|
| status | `'idle' \| 'checking' \| 'downloading' \| 'applying' \| 'completed' \| 'error'` | 현재 상태 |
| totalFiles | number | 총 파일 수 |
| completedFiles | number | 완료된 파일 수 |
| currentFile | string \| null | 현재 처리 중인 파일 |
| error | string \| null | 오류 메시지 |

---

## Type Definitions (TypeScript)

```typescript
// src/types.ts에 추가

/**
 * 원격 quartz.config.ts 파일 상태
 */
export interface QuartzConfigFile {
  path: 'quartz.config.ts';
  sha: string;
  content: string;
  lastFetched: number;
}

/**
 * Quartz 버전 정보
 */
export interface QuartzVersionInfo {
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  lastChecked: number;
}

/**
 * 업그레이드 진행 상태
 */
export type UpgradeStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'applying'
  | 'completed'
  | 'error';

export interface QuartzUpgradeProgress {
  status: UpgradeStatus;
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  error: string | null;
}

/**
 * 초기 업그레이드 상태
 */
export const INITIAL_UPGRADE_PROGRESS: QuartzUpgradeProgress = {
  status: 'idle',
  totalFiles: 0,
  completedFiles: 0,
  currentFile: null,
  error: null,
};
```

---

## State Transitions

### QuartzSettings Sync Flow

```
[로컬 설정 변경]
       │
       ▼
[원격 파일 조회] ──(404)──> [오류: 파일 없음]
       │
       ▼ (성공)
[설정값 파싱]
       │
       ▼
[새 설정 적용]
       │
       ▼
[GitHub 커밋] ──(409)──> [오류: 충돌 - 새로고침 필요]
       │
       ▼ (성공)
[로컬 상태 업데이트]
```

### Upgrade Progress States

```
idle ──[업그레이드 시작]──> checking
                              │
                              ▼
                          downloading
                              │
                              ▼
                          applying ──[완료]──> completed
                              │
                              └──[오류]──> error
```

---

## Relationships

```
PluginSettings
      │
      └── quartzSettings: QuartzSettings
              │
              ├── explicitPublish ←→ quartz.config.ts (plugins.filters)
              ├── ignorePatterns ←→ quartz.config.ts (ignorePatterns)
              └── urlStrategy ←→ quartz.config.ts (configuration.urlStrategy)

QuartzConfigFile
      │
      └── 원격 파일 상태 (캐시)

QuartzVersionInfo
      │
      ├── current ← 사용자 리포지토리 package.json
      └── latest ← jackyzha0/quartz releases API
```

---

## Validation Rules

### ignorePatterns

| Rule | Description |
|------|-------------|
| Non-empty | 빈 문자열 불가 |
| No absolute path | `/`로 시작 불가 |
| No control chars | `\x00-\x1f` 불가 |
| Valid glob syntax | 연속 `***` 불가 |
| Max length | 패턴당 256자 이내 |
| Max count | 최대 50개 패턴 |

### urlStrategy

| Value | Description |
|-------|-------------|
| `'shortest'` | 가장 짧은 고유 경로 사용 (기본값) |
| `'absolute'` | 전체 경로 사용 |

---

## Data Persistence

### 로컬 저장 (data.json)

```json
{
  "settings": {
    "githubToken": "...",
    "repoUrl": "...",
    "quartzSettings": {
      "explicitPublish": true,
      "ignorePatterns": ["private/*", "templates/*"],
      "urlStrategy": "shortest"
    }
  },
  "publishRecords": { ... }
}
```

### 원격 저장 (quartz.config.ts)

```typescript
const config: QuartzConfig = {
  configuration: {
    pageTitle: "My Digital Garden",
    urlStrategy: "shortestPaths",  // ← urlStrategy
    // ...
  },
  plugins: {
    transformers: [ ... ],
    filters: [Plugin.ExplicitPublish()],  // ← explicitPublish
    emitters: [ ... ],
  },
}

// ← ignorePatterns (configuration 외부, 최상위)
export default config
export const ignorePatterns = ["private", "templates", ".obsidian"]
```
