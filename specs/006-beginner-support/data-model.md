# Data Model: 초보자 지원 (Beginner Support)

**Date**: 2026-01-14  
**Feature Branch**: `006-beginner-support`

## Entities

### 1. RepositoryCreationRequest

리포지토리 생성 요청 정보

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 리포지토리 이름 (기본값: "quartz") |
| visibility | 'public' \| 'private' | Yes | 공개 범위 (기본값: 'public') |
| description | string | No | 리포지토리 설명 |

### 2. RepositoryCreationResult

리포지토리 생성 결과

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| success | boolean | Yes | 성공 여부 |
| repository | CreatedRepository | No | 성공 시 생성된 리포지토리 정보 |
| error | RepositoryCreationError | No | 실패 시 에러 정보 |

### 3. CreatedRepository

생성된 리포지토리 정보

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | 리포지토리 이름 |
| fullName | string | Yes | 전체 이름 (owner/name) |
| htmlUrl | string | Yes | GitHub URL |
| defaultBranch | string | Yes | 기본 브랜치 (보통 'v4') |
| isPrivate | boolean | Yes | Private 여부 |

### 4. RepositoryCreationError

리포지토리 생성 에러 정보

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | RepositoryCreationErrorType | Yes | 에러 유형 |
| message | string | Yes | 사용자 친화적 메시지 |
| details | string | No | 상세 에러 정보 (디버깅용) |

### 5. RepositoryCreationErrorType (Enum)

| Value | Description |
|-------|-------------|
| 'invalid_token' | 토큰 유효하지 않음 |
| 'insufficient_permissions' | 권한 부족 |
| 'repo_exists' | 이미 존재하는 리포지토리 |
| 'invalid_name' | 유효하지 않은 이름 |
| 'template_not_found' | 템플릿 없음 |
| 'rate_limited' | Rate Limit 초과 |
| 'network_error' | 네트워크 오류 |
| 'unknown' | 알 수 없는 오류 |

### 6. DeployGuideStep

배포 가이드 단계 정보

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stepNumber | number | Yes | 단계 번호 (1-based) |
| title | string | Yes | 단계 제목 |
| description | string | Yes | 단계 설명 |
| externalUrl | string | No | 외부 링크 (있는 경우) |
| actionLabel | string | No | 외부 링크 버튼 라벨 |

---

## TypeScript Type Definitions

```typescript
// src/types.ts에 추가

/**
 * 리포지토리 생성 요청
 */
export interface RepositoryCreationRequest {
  /** 리포지토리 이름 (기본값: "quartz") */
  name: string;
  /** 공개 범위 (기본값: 'public') */
  visibility: 'public' | 'private';
  /** 리포지토리 설명 (선택) */
  description?: string;
}

/**
 * 생성된 리포지토리 정보
 */
export interface CreatedRepository {
  /** 리포지토리 이름 */
  name: string;
  /** 전체 이름 (owner/name) */
  fullName: string;
  /** GitHub URL */
  htmlUrl: string;
  /** 기본 브랜치 */
  defaultBranch: string;
  /** Private 여부 */
  isPrivate: boolean;
}

/**
 * 리포지토리 생성 에러 유형
 */
export type RepositoryCreationErrorType =
  | 'invalid_token'
  | 'insufficient_permissions'
  | 'repo_exists'
  | 'invalid_name'
  | 'template_not_found'
  | 'rate_limited'
  | 'network_error'
  | 'unknown';

/**
 * 리포지토리 생성 에러
 */
export interface RepositoryCreationError {
  /** 에러 유형 */
  type: RepositoryCreationErrorType;
  /** 사용자 친화적 메시지 */
  message: string;
  /** 상세 에러 정보 (디버깅용) */
  details?: string;
}

/**
 * 리포지토리 생성 결과
 */
export type RepositoryCreationResult =
  | { success: true; repository: CreatedRepository }
  | { success: false; error: RepositoryCreationError };

/**
 * 배포 가이드 단계
 */
export interface DeployGuideStep {
  /** 단계 번호 (1-based) */
  stepNumber: number;
  /** 단계 제목 */
  title: string;
  /** 단계 설명 */
  description: string;
  /** 외부 링크 (있는 경우) */
  externalUrl?: string;
  /** 외부 링크 버튼 라벨 */
  actionLabel?: string;
}

/**
 * Quartz 템플릿 정보
 */
export const QUARTZ_TEMPLATE = {
  owner: 'jackyzha0',
  repo: 'quartz',
} as const;

/**
 * 리포지토리 이름 기본값
 */
export const DEFAULT_REPO_NAME = 'quartz';
```

---

## State Transitions

### Repository Creation Flow

```
[Initial] 
    │
    ▼
[Validating Name] ──(invalid)──> [Error: Invalid Name]
    │
    (valid)
    ▼
[Checking Existence] ──(exists)──> [Error: Repo Exists]
    │
    (not exists)
    ▼
[Creating Repository] ──(API error)──> [Error: Creation Failed]
    │
    (success)
    ▼
[Updating Settings] ──(save error)──> [Warning: Settings Not Saved]
    │
    (success)
    ▼
[Completed] ──> [Show Deploy Guide]
```

### Modal States

| State | UI Elements |
|-------|-------------|
| `idle` | 입력 폼 활성화, Create 버튼 활성화 |
| `validating` | 입력 폼 비활성화, 로딩 표시 |
| `creating` | 입력 폼 비활성화, 프로그레스 표시 |
| `success` | 성공 메시지, 배포 가이드 버튼 표시 |
| `error` | 에러 메시지, 재시도 버튼 표시 |

---

## Validation Rules

### Repository Name

| Rule | Regex/Condition | Error Message |
|------|-----------------|---------------|
| 길이 | 1-100자 | 리포지토리 이름은 1-100자 사이여야 합니다. |
| 허용 문자 | `^[a-zA-Z0-9._-]+$` | 영문, 숫자, 점, 하이픈, 언더스코어만 사용 가능합니다. |
| 시작 문자 | `^[a-zA-Z0-9]` | 영문 또는 숫자로 시작해야 합니다. |
| 끝 문자 | `[a-zA-Z0-9]$` | 영문 또는 숫자로 끝나야 합니다. |
| 예약어 | GitHub 예약어 목록 | 이 이름은 사용할 수 없습니다. |

### Visibility

| Value | Condition | Warning |
|-------|-----------|---------|
| `public` | 항상 허용 | 없음 |
| `private` | 허용 | GitHub Pro 구독이 필요할 수 있습니다. GitHub Pages 호스팅은 Pro 플랜에서만 Private 리포지토리를 지원합니다. |
