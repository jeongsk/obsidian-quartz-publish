# Contract: PendingChangesManager

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## Overview

설정 변경사항을 추적하고 관리하는 상태 관리자의 계약 정의.

## Interface Definition

```typescript
interface IPendingChangesManager {
  /**
   * 원본 설정으로 초기화
   * @param config - 원본 설정
   * @param sha - 파일 SHA
   */
  initialize(config: QuartzSiteConfig, sha: string): void;

  /**
   * 특정 필드 값 업데이트
   * @param field - 변경할 필드 키
   * @param value - 새 값
   */
  updateField<K extends keyof QuartzSiteConfig>(
    field: K,
    value: QuartzSiteConfig[K]
  ): void;

  /**
   * 현재 설정 반환
   */
  getCurrentConfig(): QuartzSiteConfig;

  /**
   * 원본 설정 반환
   */
  getOriginalConfig(): QuartzSiteConfig;

  /**
   * 원본 SHA 반환
   */
  getOriginalSha(): string;

  /**
   * 변경사항 존재 여부
   */
  isDirty(): boolean;

  /**
   * 변경된 필드 목록 반환
   */
  getChangedFields(): Set<keyof QuartzSiteConfig>;

  /**
   * 변경사항 요약 문자열 생성
   */
  getChangeSummary(): string;

  /**
   * 커밋 메시지 생성
   */
  generateCommitMessage(): string;

  /**
   * 변경사항 취소 (원본으로 리셋)
   */
  reset(): void;

  /**
   * 새 원본으로 업데이트 (저장 성공 후)
   * @param config - 새 원본 설정
   * @param sha - 새 SHA
   */
  markAsSaved(config: QuartzSiteConfig, sha: string): void;
}
```

## State Transitions

```
┌─────────────┐
│ Uninitialized│
└──────┬──────┘
       │ initialize()
       ▼
┌─────────────┐ ◄─────────┐
│   Clean     │           │ markAsSaved() / reset()
└──────┬──────┘           │
       │ updateField()    │
       ▼                  │
┌─────────────┐───────────┘
│    Dirty    │
└─────────────┘
```

## Method Specifications

### updateField()

| Aspect | Specification |
|--------|---------------|
| Pre-conditions | initialize() 호출됨 |
| Post-conditions | changedFields에 필드 추가 (값이 원본과 다를 경우) |
| Side Effects | 값이 원본과 같아지면 changedFields에서 제거 |

### generateCommitMessage()

| Aspect | Specification |
|--------|---------------|
| Pre-conditions | isDirty() === true |
| Format | research.md의 Commit Message Format 참조 |
| Max Length | 제목 72자, 본문 무제한 |

**출력 예시:**
```
Update Quartz config: pageTitle, locale

Changed:
- pageTitle: "Quartz 4.0" → "My Digital Garden"
- locale: "en-US" → "ko-KR"
```

### getChangeSummary()

| Aspect | Specification |
|--------|---------------|
| Output | 변경된 필드명을 쉼표로 구분한 문자열 |
| Example | "pageTitle, locale, analytics" |

## Validation Integration

```typescript
// updateField 호출 전 유효성 검사
interface IValidator {
  validate(field: keyof QuartzSiteConfig, value: unknown): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

## Usage Example

```typescript
// 초기화
pendingChanges.initialize(loadedConfig, sha);

// UI에서 변경
pendingChanges.updateField('pageTitle', 'My Garden');
pendingChanges.updateField('locale', 'ko-KR');

// 상태 확인
if (pendingChanges.isDirty()) {
  console.log('변경사항:', pendingChanges.getChangeSummary());
  // 출력: "변경사항: pageTitle, locale"
}

// 저장 시 커밋 메시지 생성
const commitMessage = pendingChanges.generateCommitMessage();

// 저장 성공 후
pendingChanges.markAsSaved(newConfig, newSha);
```

## Testing Requirements

- 필드 변경 후 isDirty() 상태 확인
- 원본과 동일한 값으로 변경 시 dirty 해제 확인
- 커밋 메시지 형식 검증
- reset() 후 상태 초기화 확인
