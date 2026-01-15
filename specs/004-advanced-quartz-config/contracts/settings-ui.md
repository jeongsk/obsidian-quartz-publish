# Contract: Settings UI Components

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## Overview

설정 화면 UI 컴포넌트들의 계약 정의.

## Components

### 1. ApplyButton

"적용" 버튼 컴포넌트.

```typescript
interface ApplyButtonProps {
  /** 변경사항 존재 여부 */
  isDirty: boolean;
  /** 현재 저장 중 여부 */
  isSaving: boolean;
  /** 클릭 핸들러 */
  onApply: () => Promise<void>;
}

interface IApplyButton {
  /** 버튼 상태 업데이트 */
  setDirty(isDirty: boolean): void;
  /** 저장 중 상태로 전환 */
  setSaving(isSaving: boolean): void;
  /** 버튼 렌더링 */
  render(container: HTMLElement): void;
}
```

**상태별 UI:**

| isDirty | isSaving | Button State | Label |
|---------|----------|--------------|-------|
| false | false | disabled | "변경사항 없음" |
| true | false | enabled, primary | "적용" |
| true | true | disabled, loading | "적용 중..." |

### 2. ConfirmModal

변경사항 적용 확인 모달.

```typescript
interface ConfirmModalProps {
  /** 모달 제목 */
  title: string;
  /** 변경사항 요약 */
  changeSummary: string;
  /** 확인 버튼 텍스트 */
  confirmText?: string; // default: "적용"
  /** 취소 버튼 텍스트 */
  cancelText?: string; // default: "취소"
}

interface IConfirmModal {
  /** 모달 열기 및 결과 대기 */
  open(): Promise<boolean>;
  /** 모달 닫기 */
  close(): void;
}
```

**사용 시나리오:**
1. 사용자가 "적용" 버튼 클릭
2. ConfirmModal 표시: "다음 변경사항을 적용하시겠습니까?"
3. 변경사항 목록 표시
4. "적용" / "취소" 버튼

### 3. ConflictModal

충돌 발생 시 해결 옵션 모달.

```typescript
interface ConflictModalProps {
  /** 충돌 메시지 */
  message: string;
}

interface IConflictModal {
  /** 모달 열기 및 선택 대기 */
  open(): Promise<ConflictResolution>;
  close(): void;
}

type ConflictResolution = 'reload' | 'force_overwrite' | 'cancel';
```

**UI 구성:**
```
┌─────────────────────────────────────┐
│  ⚠️ 원격 설정이 변경되었습니다      │
│                                     │
│  다른 곳에서 설정 파일이 수정되어   │
│  충돌이 발생했습니다.               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 새로고침 후 재적용 (권장)    │   │
│  │ 최신 설정을 불러온 후        │   │
│  │ 변경사항을 다시 적용합니다   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 강제 덮어쓰기                │   │
│  │ 원격 변경사항을 무시하고     │   │
│  │ 현재 설정으로 덮어씁니다     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [취소]                             │
└─────────────────────────────────────┘
```

### 4. UnsavedWarning

저장되지 않은 변경사항 경고 배너.

```typescript
interface UnsavedWarningProps {
  /** 표시 여부 */
  visible: boolean;
  /** 변경된 필드 수 */
  changedCount: number;
}

interface IUnsavedWarning {
  setVisible(visible: boolean): void;
  setChangedCount(count: number): void;
  render(container: HTMLElement): void;
}
```

**UI:**
```
┌──────────────────────────────────────────┐
│ ⚠️ 저장되지 않은 변경사항이 있습니다 (3개) │
└──────────────────────────────────────────┘
```

## Section Components

### 5. SiteInfoSection

사이트 기본 정보 입력 섹션.

```typescript
interface ISiteInfoSection {
  render(container: HTMLElement): void;
  getValues(): { pageTitle: string; baseUrl: string; locale: string };
  setValues(values: Partial<{ pageTitle: string; baseUrl: string; locale: string }>): void;
  setOnChange(handler: (field: string, value: string) => void): void;
}
```

**포함 필드:**
- Page Title (text input)
- Base URL (text input with normalization)
- Locale (dropdown)

### 6. BehaviorSection

동작 옵션 섹션.

```typescript
interface IBehaviorSection {
  render(container: HTMLElement): void;
  getValues(): { enableSPA: boolean; enablePopovers: boolean; defaultDateType: string };
  setValues(values: Partial<{ enableSPA: boolean; enablePopovers: boolean; defaultDateType: string }>): void;
  setOnChange(handler: (field: string, value: boolean | string) => void): void;
}
```

**포함 필드:**
- Enable SPA (toggle)
- Enable Popovers (toggle)
- Default Date Type (dropdown: created | modified | published)

### 7. AnalyticsSection

애널리틱스 설정 섹션.

```typescript
interface IAnalyticsSection {
  render(container: HTMLElement): void;
  getValues(): AnalyticsConfig;
  setValues(config: AnalyticsConfig): void;
  setOnChange(handler: (config: AnalyticsConfig) => void): void;
}
```

**동적 필드:**
- Provider 선택에 따라 추가 필드 표시/숨김
- Google: tagId 입력
- Umami: websiteId, host 입력
- Plausible: host 입력 (선택)
- null: 추가 필드 없음

### 8. PublishingSection

발행 설정 섹션 (기존 설정 통합).

```typescript
interface IPublishingSection {
  render(container: HTMLElement): void;
  getValues(): { explicitPublish: boolean; ignorePatterns: string[]; urlStrategy: string };
  setValues(values: Partial<{ explicitPublish: boolean; ignorePatterns: string[]; urlStrategy: string }>): void;
  setOnChange(handler: (field: string, value: boolean | string | string[]) => void): void;
}
```

**포함 필드:**
- Selective Publishing (toggle)
- Ignore Patterns (text area, 줄바꿈 구분)
- URL Strategy (dropdown: shortest | absolute)

## Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      SettingsTab                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SiteInfoSection ─┐                                    │  │
│  │ BehaviorSection ──┼─► onChange ─► PendingChangesManager │
│  │ AnalyticsSection ─┤              ▼                    │  │
│  │ PublishingSection─┘         isDirty?                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                   │                          │
│                                   ▼                          │
│  ┌──────────────────┐    ┌─────────────────┐               │
│  │ UnsavedWarning   │◄───│  ApplyButton    │               │
│  └──────────────────┘    └────────┬────────┘               │
│                                   │ click                    │
│                                   ▼                          │
│                          ┌─────────────────┐                │
│                          │  ConfirmModal   │                │
│                          └────────┬────────┘                │
│                                   │ confirm                  │
│                                   ▼                          │
│                          ┌─────────────────┐                │
│                          │ Check SHA       │                │
│                          └────────┬────────┘                │
│                          match?   │   mismatch               │
│                            ▼      │      ▼                   │
│                          Save   ┌─────────────────┐         │
│                                 │  ConflictModal  │         │
│                                 └─────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Accessibility Requirements

- 모든 입력 필드에 적절한 label
- 키보드 네비게이션 지원
- 오류 메시지는 aria-live로 공지
- 모달은 ESC로 닫기 지원
- 포커스 트랩 (모달 내에서만 탭 이동)

## Testing Requirements

- 각 컴포넌트의 렌더링 테스트
- 상태 변경에 따른 UI 업데이트 테스트
- 이벤트 핸들러 호출 테스트
- 모달 Promise 반환값 테스트
