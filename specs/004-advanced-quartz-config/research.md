# Research: Quartz 고급 설정 관리

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## 1. Quartz Configuration Structure

### Decision
Quartz 4.x의 `quartz.config.ts` 파일은 `configuration` 객체 내에 모든 사이트 설정을 포함한다. 정규식 기반 파싱으로 필요한 설정 값들을 추출하고 수정한다.

### Rationale
- 기존 `QuartzConfigService`가 정규식 기반 파싱을 사용하고 있음
- TypeScript AST 파싱은 복잡성 대비 이점이 적음
- 표준 Quartz 설정 구조를 가정할 수 있음 (Assumptions 참조)

### Configuration Properties to Parse

| Property | Type | Default | Regex Pattern |
|----------|------|---------|---------------|
| pageTitle | string | "Quartz 4.0" | `pageTitle\s*:\s*["']([^"']+)["']` |
| baseUrl | string | "quartz.jzhao.xyz" | `baseUrl\s*:\s*["']([^"']+)["']` |
| locale | string | "en-US" | `locale\s*:\s*["']([^"']+)["']` |
| enableSPA | boolean | true | `enableSPA\s*:\s*(true\|false)` |
| enablePopovers | boolean | true | `enablePopovers\s*:\s*(true\|false)` |
| defaultDateType | string | "created" | `defaultDateType\s*:\s*["']([^"']+)["']` |
| analytics | object | { provider: "plausible" } | `analytics\s*:\s*\{([^}]+)\}` |

### Alternatives Considered
- **TypeScript Compiler API**: 정확하지만 과도한 의존성 추가
- **babel/parser**: 마찬가지로 무거운 의존성
- **JSON5 파싱**: TypeScript 문법 지원 안 됨

---

## 2. Analytics Provider Configuration

### Decision
Quartz가 지원하는 4가지 analytics provider를 모두 지원한다:
- `null` (비활성화)
- `google` (Google Analytics 4)
- `plausible` (Plausible Analytics)
- `umami` (Umami Analytics)

### Rationale
Quartz 공식 문서에서 정의된 표준 provider들을 모두 지원하여 호환성 보장.

### Provider-specific Fields

| Provider | Required Fields | Optional Fields |
|----------|-----------------|-----------------|
| null | - | - |
| google | tagId (G-XXXXXXXXXX) | - |
| plausible | - | host (커스텀 도메인) |
| umami | websiteId, host | - |

### Configuration Format Examples

```typescript
// Google Analytics
analytics: {
  provider: "google",
  tagId: "G-XXXXXXXXXX",
}

// Plausible (default)
analytics: {
  provider: "plausible",
}

// Plausible (self-hosted)
analytics: {
  provider: "plausible",
  host: "https://plausible.example.com",
}

// Umami
analytics: {
  provider: "umami",
  websiteId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  host: "https://umami.example.com",
}

// Disabled
analytics: {
  provider: "null",
}
```

---

## 3. Locale Code Standard

### Decision
BCP 47 표준 로케일 코드를 사용하고, 일반적인 로케일 목록을 드롭다운으로 제공한다.

### Rationale
- Quartz는 내부적으로 BCP 47 코드를 사용
- 사용자가 직접 입력하면 오류 가능성이 높음
- 미리 정의된 목록으로 사용자 경험 향상

### Supported Locales (Initial)

| Code | Display Name |
|------|--------------|
| en-US | English (US) |
| en-GB | English (UK) |
| ko-KR | 한국어 |
| ja-JP | 日本語 |
| zh-CN | 简体中文 |
| zh-TW | 繁體中文 |
| de-DE | Deutsch |
| fr-FR | Français |
| es-ES | Español |
| pt-BR | Português (BR) |
| ru-RU | Русский |
| it-IT | Italiano |

### Alternatives Considered
- 자유 입력 필드: 오타 위험, 유효성 검사 필요
- 전체 BCP 47 목록: 너무 많아서 사용성 저하

---

## 4. Pending Changes State Management

### Decision
`PendingChanges` 객체로 변경사항을 메모리에 추적하고, "적용" 버튼 클릭 시 일괄 반영한다.

### Rationale
- 사용자가 여러 설정을 변경한 후 한 번에 적용할 수 있음
- 변경사항 취소(되돌리기)가 용이함
- 단일 커밋으로 깔끔한 Git 히스토리 유지

### State Structure

```typescript
interface PendingChanges {
  // 원본 설정 (로드 시점)
  original: QuartzSiteConfig;
  // 현재 설정 (변경 반영)
  current: QuartzSiteConfig;
  // 변경된 필드 목록
  changedFields: Set<keyof QuartzSiteConfig>;
  // dirty 상태 (변경사항 존재 여부)
  isDirty: boolean;
}
```

### Change Detection Logic

```typescript
function hasChanges(original: QuartzSiteConfig, current: QuartzSiteConfig): boolean {
  // 단순 비교 (객체 내부는 깊은 비교 필요)
  return JSON.stringify(original) !== JSON.stringify(current);
}
```

---

## 5. Conflict Detection Strategy

### Decision
"적용" 버튼 클릭 시 원격 파일의 SHA를 확인하여 충돌을 감지한다.

### Rationale
- 로드 시점 SHA와 적용 시점 SHA 비교로 간단히 충돌 감지
- GitHub API의 PUT 요청 시 SHA 불일치로 409 Conflict 발생
- 사용자에게 충돌 해결 옵션 제공

### Conflict Resolution Flow

```
1. 사용자가 "적용" 클릭
2. 원격 파일 SHA 조회 (GET /repos/{owner}/{repo}/contents/quartz.config.ts)
3. 로컬 캐시된 SHA와 비교
4. 불일치 시:
   a. 충돌 경고 모달 표시
   b. 옵션 1: "새로고침 후 재적용" - 원격 설정 다시 로드
   c. 옵션 2: "강제 덮어쓰기" - 현재 변경사항으로 덮어쓰기
   d. 옵션 3: "취소"
5. 일치 시: 정상적으로 커밋&푸시 진행
```

---

## 6. BaseUrl Validation & Normalization

### Decision
baseUrl 입력 시 자동 정규화 및 유효성 검사를 수행한다.

### Rationale
- Quartz는 프로토콜 없는 도메인 형식을 기대 (예: `example.com`)
- 사용자가 `https://`를 포함하거나 후행 슬래시를 추가할 수 있음
- 일관된 형식 보장 필요

### Normalization Rules

| Input | Normalized Output |
|-------|-------------------|
| `https://example.com` | `example.com` |
| `http://example.com` | `example.com` |
| `example.com/` | `example.com` |
| `example.com/blog/` | `example.com/blog` |
| `https://example.com/blog/` | `example.com/blog` |

### Validation Rules

- 빈 문자열 불가
- 유효한 도메인 형식 (알파벳, 숫자, 하이픈, 점)
- 경로 포함 가능 (슬래시 허용)
- 프로토콜 자동 제거

---

## 7. Obsidian Modal Best Practices

### Decision
Obsidian의 `Modal` 클래스를 확장하여 확인 모달과 경고 모달을 구현한다.

### Rationale
- Obsidian 네이티브 UI 일관성 유지
- 키보드 접근성 자동 제공 (ESC로 닫기)
- 플랫폼 스타일 자동 적용

### Modal Implementation Pattern

```typescript
import { Modal, App } from 'obsidian';

class ConfirmModal extends Modal {
  private result: boolean = false;
  private resolvePromise: (value: boolean) => void;

  constructor(
    app: App,
    private title: string,
    private message: string
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: this.title });
    contentEl.createEl('p', { text: this.message });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    buttonContainer.createEl('button', { text: '취소' })
      .addEventListener('click', () => {
        this.result = false;
        this.close();
      });

    buttonContainer.createEl('button', { text: '확인', cls: 'mod-cta' })
      .addEventListener('click', () => {
        this.result = true;
        this.close();
      });
  }

  onClose() {
    this.resolvePromise(this.result);
  }

  async waitForResult(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }
}
```

---

## 8. Commit Message Format

### Decision
변경된 설정 항목들을 요약한 단일 커밋 메시지를 자동 생성한다.

### Rationale
- Clarification에서 결정된 사항
- Git 히스토리에서 어떤 설정이 변경되었는지 쉽게 파악 가능

### Message Format

```
Update Quartz config: {changed_fields}

Changed:
- {field1}: {old_value} → {new_value}
- {field2}: {old_value} → {new_value}
```

### Examples

```
Update Quartz config: pageTitle, locale

Changed:
- pageTitle: "Quartz 4.0" → "My Digital Garden"
- locale: "en-US" → "ko-KR"
```

```
Update Quartz config: analytics

Changed:
- analytics.provider: "plausible" → "google"
- analytics.tagId: (added) "G-XXXXXXXXXX"
```

---

## 9. UI Section Organization

### Decision
설정 화면을 섹션 헤딩으로 구분된 단일 페이지로 구성한다.

### Rationale
- Clarification에서 결정된 사항
- Obsidian 플러그인 설정의 일반적인 패턴

### Section Structure

```
[GitHub Connection] ← 기존 유지
  - Token
  - Repository URL
  - Branch

[Auto Date Fields] ← 기존 유지
  - Created date toggle
  - Modified date toggle
  - Published date toggle

[Quartz Configuration] ← 새 섹션 헤딩

  [Site Information] ← 서브 헤딩
    - Page Title
    - Base URL
    - Locale

  [Behavior] ← 서브 헤딩
    - Enable SPA
    - Enable Popovers
    - Default Date Type

  [Analytics] ← 서브 헤딩
    - Provider dropdown
    - Provider-specific fields

  [Publishing] ← 서브 헤딩 (기존 설정 통합)
    - Selective Publishing (ExplicitPublish)
    - Ignore Patterns
    - URL Strategy

  [Apply Button] ← 고정 하단
    - "적용" 버튼 (변경사항 있을 때만 활성화)
    - "저장되지 않은 변경사항이 있습니다" 라벨

[Quartz Version] ← 기존 유지
  - Current version
  - Check for updates
  - Upgrade button
```

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| Config Parsing | 정규식 기반 (기존 패턴 유지) |
| Analytics Providers | null, google, plausible, umami 모두 지원 |
| Locale Selection | 미리 정의된 BCP 47 코드 드롭다운 |
| State Management | PendingChanges 객체로 메모리 추적 |
| Conflict Detection | 적용 시점 SHA 비교 |
| BaseUrl Handling | 자동 정규화 + 유효성 검사 |
| Modal Implementation | Obsidian Modal 클래스 확장 |
| Commit Message | 변경 항목 요약 자동 생성 |
| UI Layout | 단일 페이지, 섹션 헤딩으로 구분 |
