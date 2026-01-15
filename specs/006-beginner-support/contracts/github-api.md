# GitHub API Contracts

**Date**: 2026-01-14  
**Feature Branch**: `006-beginner-support`

## Overview

이 문서는 초보자 지원 기능에서 사용하는 GitHub REST API 계약을 정의합니다.

---

## 1. Create Repository from Template

### Endpoint

```
POST /repos/{template_owner}/{template_repo}/generate
```

### Request

```typescript
interface CreateFromTemplateRequest {
  /** 새 리포지토리 소유자 (사용자 로그인) */
  owner: string;
  /** 새 리포지토리 이름 */
  name: string;
  /** 리포지토리 설명 (선택) */
  description?: string;
  /** Private 여부 (기본값: false) */
  private?: boolean;
  /** 모든 브랜치 포함 여부 (기본값: false) */
  include_all_branches?: boolean;
}
```

### Response (201 Created)

```typescript
interface CreateFromTemplateResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
  };
}
```

### Error Responses

| Status | Body | Meaning |
|--------|------|---------|
| 401 | `{"message": "Bad credentials"}` | 토큰 유효하지 않음 |
| 403 | `{"message": "..."}` | 권한 부족 또는 Rate Limit |
| 404 | `{"message": "Not Found"}` | 템플릿 리포지토리 없음 |
| 422 | `{"message": "...", "errors": [...]}` | 유효성 검사 실패 |

---

## 2. Get Repository (Check Existence)

### Endpoint

```
GET /repos/{owner}/{repo}
```

### Response (200 OK)

```typescript
interface GetRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  is_template: boolean;
}
```

### Error Responses

| Status | Meaning |
|--------|---------|
| 404 | 리포지토리 없음 (사용 가능한 이름) |
| 403 | Private 리포지토리 접근 불가 |

---

## 3. Get Authenticated User

### Endpoint

```
GET /user
```

### Response (200 OK)

```typescript
interface GetUserResponse {
  login: string;
  id: number;
  name?: string;
}
```

### Usage

리포지토리 생성 시 `owner` 필드에 사용할 사용자 로그인 정보 획득

---

## 4. Rate Limit Headers

모든 API 응답에 포함되는 Rate Limit 헤더:

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1700000000
X-RateLimit-Used: 1
```

### Handling

```typescript
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  used: number;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit') || '5000'),
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining') || '0'),
    resetAt: new Date(parseInt(response.headers.get('X-RateLimit-Reset') || '0') * 1000),
    used: parseInt(response.headers.get('X-RateLimit-Used') || '0'),
  };
}
```

---

## Service Interface

```typescript
// src/services/repository-creator.ts

export interface RepositoryCreatorService {
  /**
   * 현재 인증된 사용자 정보 조회
   */
  getCurrentUser(): Promise<{ login: string; id: number }>;

  /**
   * 리포지토리 존재 여부 확인
   * @param owner 소유자
   * @param name 리포지토리 이름
   * @returns true if exists, false if not
   */
  checkRepositoryExists(owner: string, name: string): Promise<boolean>;

  /**
   * Quartz 템플릿에서 리포지토리 생성
   * @param request 생성 요청 정보
   * @returns 생성 결과
   */
  createFromTemplate(request: RepositoryCreationRequest): Promise<RepositoryCreationResult>;

  /**
   * 리포지토리 이름 유효성 검사
   * @param name 리포지토리 이름
   * @returns 유효성 검사 결과
   */
  validateRepositoryName(name: string): { valid: boolean; error?: string };
}
```
