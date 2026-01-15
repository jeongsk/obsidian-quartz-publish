# Data Model: Quartz 고급 설정 관리

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## Entities

### 1. QuartzSiteConfig

Quartz 사이트의 전체 설정을 나타내는 엔티티.

```typescript
interface QuartzSiteConfig {
  // === Site Information ===
  /** 사이트 제목 (브라우저 탭, 헤더 등에 표시) */
  pageTitle: string;

  /** 사이트 기본 URL (프로토콜 없이, 예: "example.com" 또는 "example.com/blog") */
  baseUrl: string;

  /** 사이트 로케일 (BCP 47 형식, 예: "ko-KR") */
  locale: string;

  // === Behavior ===
  /** SPA 모드 활성화 여부 */
  enableSPA: boolean;

  /** 링크 팝오버 미리보기 활성화 여부 */
  enablePopovers: boolean;

  /** 기본 날짜 타입 ("created" | "modified" | "published") */
  defaultDateType: 'created' | 'modified' | 'published';

  // === Analytics ===
  /** 애널리틱스 설정 */
  analytics: AnalyticsConfig;

  // === Publishing (기존 설정) ===
  /** ExplicitPublish 필터 활성화 여부 */
  explicitPublish: boolean;

  /** 발행 제외 패턴 목록 */
  ignorePatterns: string[];

  /** URL 생성 전략 */
  urlStrategy: 'shortest' | 'absolute';
}
```

#### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| pageTitle | 빈 문자열 불가 | "페이지 제목을 입력해주세요" |
| baseUrl | 유효한 도메인 형식 | "올바른 도메인 형식을 입력해주세요 (예: example.com)" |
| locale | 지원되는 로케일 코드 | "지원되지 않는 로케일입니다" |
| ignorePatterns | 유효한 glob 패턴 | "올바르지 않은 패턴 형식입니다" |

#### Default Values

```typescript
const DEFAULT_QUARTZ_SITE_CONFIG: QuartzSiteConfig = {
  pageTitle: 'Quartz 4.0',
  baseUrl: 'quartz.jzhao.xyz',
  locale: 'en-US',
  enableSPA: true,
  enablePopovers: true,
  defaultDateType: 'created',
  analytics: { provider: 'null' },
  explicitPublish: false,
  ignorePatterns: ['private', 'templates', '.obsidian'],
  urlStrategy: 'shortest',
};
```

---

### 2. AnalyticsConfig

애널리틱스 설정을 나타내는 엔티티. 유니온 타입으로 provider별 필수 필드 정의.

```typescript
type AnalyticsConfig =
  | { provider: 'null' }
  | { provider: 'google'; tagId: string }
  | { provider: 'plausible'; host?: string }
  | { provider: 'umami'; websiteId: string; host: string };
```

#### Provider-specific Validation

| Provider | Field | Rule | Error Message |
|----------|-------|------|---------------|
| google | tagId | G-로 시작하는 10-12자 | "올바른 Google Analytics ID 형식을 입력해주세요 (예: G-XXXXXXXXXX)" |
| umami | websiteId | UUID 형식 | "올바른 Website ID 형식을 입력해주세요" |
| umami | host | 유효한 URL | "올바른 URL 형식을 입력해주세요" |
| plausible | host | 유효한 URL (선택적) | "올바른 URL 형식을 입력해주세요" |

---

### 3. PendingChanges

저장되지 않은 변경사항을 추적하는 엔티티.

```typescript
interface PendingChanges {
  /** 원본 설정 (로드 시점 스냅샷) */
  original: QuartzSiteConfig;

  /** 현재 설정 (사용자 편집 반영) */
  current: QuartzSiteConfig;

  /** 변경된 필드 키 집합 */
  changedFields: Set<keyof QuartzSiteConfig>;

  /** 원본 파일 SHA (충돌 감지용) */
  originalSha: string;
}
```

#### Computed Properties

```typescript
// 변경사항 존재 여부
get isDirty(): boolean {
  return this.changedFields.size > 0;
}

// 변경 요약 문자열 생성
get changeSummary(): string {
  return Array.from(this.changedFields).join(', ');
}
```

---

### 4. ConfigUpdateResult

설정 업데이트 작업의 결과를 나타내는 엔티티.

```typescript
interface ConfigUpdateResult {
  /** 성공 여부 */
  success: boolean;

  /** 새 파일 SHA (성공 시) */
  newSha?: string;

  /** 커밋 SHA (성공 시) */
  commitSha?: string;

  /** 오류 유형 (실패 시) */
  errorType?: ConfigUpdateError;

  /** 오류 메시지 (실패 시) */
  errorMessage?: string;
}

type ConfigUpdateError =
  | 'conflict'        // SHA 불일치 (원격 변경됨)
  | 'network'         // 네트워크 오류
  | 'rate_limited'    // GitHub API 제한
  | 'parse_error'     // 설정 파싱 실패
  | 'validation'      // 유효성 검사 실패
  | 'unknown';        // 알 수 없는 오류
```

---

### 5. ConflictResolution

충돌 발생 시 사용자 선택을 나타내는 엔티티.

```typescript
type ConflictResolution =
  | 'reload'          // 새로고침 후 재적용
  | 'force_overwrite' // 강제 덮어쓰기
  | 'cancel';         // 취소
```

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    QuartzConfigService                       │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │ QuartzSiteConfig│◄────│  PendingChanges  │               │
│  │   (parsed)      │     │ (tracks changes) │               │
│  └────────┬────────┘     └────────┬─────────┘               │
│           │                       │                          │
│           │ contains              │ references               │
│           ▼                       ▼                          │
│  ┌─────────────────┐     ┌──────────────────┐               │
│  │ AnalyticsConfig │     │ ConfigUpdateResult│              │
│  │   (nested)      │     │   (operation)    │               │
│  └─────────────────┘     └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## State Transitions

### PendingChanges Lifecycle

```
┌─────────┐   loadConfig()   ┌─────────┐
│  Empty  │ ───────────────► │ Loaded  │
└─────────┘                  └────┬────┘
                                  │
                    onChange()    │ reset() / apply()
                         ▼        │
                    ┌─────────┐   │
                    │  Dirty  │───┘
                    └────┬────┘
                         │
            apply()      │      cancel()
       ┌─────────────────┼─────────────────┐
       ▼                 │                 ▼
┌─────────────┐          │          ┌───────────┐
│  Applying   │          │          │  Loaded   │
└──────┬──────┘          │          │ (reset)   │
       │                 │          └───────────┘
       │ success/fail    │
       ▼                 │
┌─────────────┐          │
│   Result    │──────────┘
└─────────────┘
```

### Config Update Flow

```
┌────────┐  click   ┌──────────────┐  confirm  ┌───────────┐
│ Dirty  │ ───────► │ ConfirmModal │ ────────► │ Checking  │
└────────┘          └──────────────┘           │    SHA    │
                           │                   └─────┬─────┘
                    cancel │                         │
                           ▼                         │ match
                    ┌──────────┐                     ▼
                    │  Dirty   │              ┌───────────┐
                    │ (no op)  │              │ Committing│
                    └──────────┘              └─────┬─────┘
                                                    │
                         ┌──────────────────────────┤
                         │ mismatch                 │ success
                         ▼                          ▼
                  ┌──────────────┐           ┌───────────┐
                  │ConflictModal │           │  Success  │
                  └──────────────┘           └───────────┘
```

---

## Supported Locales Reference

```typescript
const SUPPORTED_LOCALES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'ko-KR', name: '한국어' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'fr-FR', name: 'Français' },
  { code: 'es-ES', name: 'Español' },
  { code: 'pt-BR', name: 'Português (BR)' },
  { code: 'ru-RU', name: 'Русский' },
  { code: 'it-IT', name: 'Italiano' },
] as const;
```

---

## Analytics Provider Reference

```typescript
const ANALYTICS_PROVIDERS = [
  { value: 'null', label: '없음 (비활성화)' },
  { value: 'google', label: 'Google Analytics' },
  { value: 'plausible', label: 'Plausible Analytics' },
  { value: 'umami', label: 'Umami Analytics' },
] as const;
```
