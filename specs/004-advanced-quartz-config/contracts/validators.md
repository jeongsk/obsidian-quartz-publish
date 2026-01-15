# Contract: Validators

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## Overview

설정 값의 유효성을 검사하는 유틸리티 함수들의 계약 정의.

## Interface Definition

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue?: unknown; // 정규화된 값 (예: baseUrl)
}

interface IConfigValidator {
  validatePageTitle(value: string): ValidationResult;
  validateBaseUrl(value: string): ValidationResult;
  validateLocale(value: string): ValidationResult;
  validateAnalytics(config: AnalyticsConfig): ValidationResult;
  validateIgnorePatterns(patterns: string[]): ValidationResult;
  validateConfig(config: Partial<QuartzSiteConfig>): ValidationResult[];
}
```

## Validation Functions

### validatePageTitle()

| Input | Output | Error Message |
|-------|--------|---------------|
| `""` | invalid | "페이지 제목을 입력해주세요" |
| `"  "` | invalid | "페이지 제목을 입력해주세요" |
| `"My Site"` | valid | - |

### validateBaseUrl()

| Input | Output | Normalized | Error Message |
|-------|--------|------------|---------------|
| `""` | invalid | - | "도메인을 입력해주세요" |
| `"https://example.com"` | valid | `"example.com"` | - |
| `"example.com/"` | valid | `"example.com"` | - |
| `"example.com/blog/"` | valid | `"example.com/blog"` | - |
| `"not a domain"` | invalid | - | "올바른 도메인 형식을 입력해주세요 (예: example.com)" |
| `"exam ple.com"` | invalid | - | "올바른 도메인 형식을 입력해주세요 (예: example.com)" |

**정규화 규칙:**
1. 프로토콜 제거 (`https://`, `http://`)
2. 후행 슬래시 제거
3. 공백 제거 (trim)

### validateLocale()

| Input | Output | Error Message |
|-------|--------|---------------|
| `"en-US"` | valid | - |
| `"ko-KR"` | valid | - |
| `"invalid"` | invalid | "지원되지 않는 로케일입니다" |
| `""` | invalid | "로케일을 선택해주세요" |

**지원되는 로케일:** data-model.md의 SUPPORTED_LOCALES 참조

### validateAnalytics()

#### Provider: google

| Input | Output | Error Message |
|-------|--------|---------------|
| `{ provider: 'google', tagId: 'G-ABC123XYZ' }` | valid | - |
| `{ provider: 'google', tagId: '' }` | invalid | "Google Analytics Tag ID를 입력해주세요" |
| `{ provider: 'google', tagId: 'UA-123' }` | invalid | "올바른 Google Analytics ID 형식을 입력해주세요 (예: G-XXXXXXXXXX)" |

#### Provider: umami

| Input | Output | Error Message |
|-------|--------|---------------|
| `{ provider: 'umami', websiteId: 'uuid', host: 'https://...' }` | valid | - |
| `{ provider: 'umami', websiteId: '', host: '...' }` | invalid | "Website ID를 입력해주세요" |
| `{ provider: 'umami', websiteId: 'uuid', host: '' }` | invalid | "Host URL을 입력해주세요" |
| `{ provider: 'umami', websiteId: 'not-uuid', host: '...' }` | invalid | "올바른 Website ID 형식을 입력해주세요" |

#### Provider: plausible

| Input | Output | Error Message |
|-------|--------|---------------|
| `{ provider: 'plausible' }` | valid | - |
| `{ provider: 'plausible', host: 'https://...' }` | valid | - |
| `{ provider: 'plausible', host: 'not-url' }` | invalid | "올바른 URL 형식을 입력해주세요" |

#### Provider: null

| Input | Output | Error Message |
|-------|--------|---------------|
| `{ provider: 'null' }` | valid | - |

### validateIgnorePatterns()

| Input | Output | Error Message |
|-------|--------|---------------|
| `['private', 'templates']` | valid | - |
| `['**/*.tmp', 'drafts/**']` | valid | - |
| `['[invalid']` | invalid | "올바르지 않은 패턴 형식입니다: [invalid" |
| `[]` | valid | - |

## Implementation Notes

### BaseUrl Regex Pattern

```typescript
const BASE_URL_PATTERN = /^(?:https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*(?:\/[a-zA-Z0-9._~:/?#\[\]@!$&'()*+,;=-]*)?)$/;
```

### Google Analytics Tag Pattern

```typescript
const GA_TAG_PATTERN = /^G-[A-Z0-9]{10,12}$/;
```

### UUID Pattern (Umami)

```typescript
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

## Usage Example

```typescript
const validator = new ConfigValidator();

// 단일 필드 검증
const titleResult = validator.validatePageTitle('');
if (!titleResult.valid) {
  showError(titleResult.error); // "페이지 제목을 입력해주세요"
}

// BaseUrl 검증 및 정규화
const urlResult = validator.validateBaseUrl('https://example.com/blog/');
if (urlResult.valid) {
  const normalizedUrl = urlResult.normalizedValue; // "example.com/blog"
}

// 전체 설정 검증
const errors = validator.validateConfig(config);
if (errors.some(r => !r.valid)) {
  // 오류 표시
}
```

## Testing Requirements

- 각 검증 함수에 대한 경계값 테스트
- 정규화 로직 테스트 (baseUrl)
- 다양한 analytics provider 조합 테스트
- glob 패턴 유효성 검사 테스트
