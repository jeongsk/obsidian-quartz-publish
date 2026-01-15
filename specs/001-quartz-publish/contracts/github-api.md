# GitHub API Contract

**Feature**: 001-quartz-publish
**Date**: 2026-01-13

## Overview

GitHub REST API v3를 사용하여 Quartz 리포지토리와 상호작용합니다.

**Base URL**: `https://api.github.com`
**Authentication**: `Authorization: Bearer {token}`

---

## Endpoints

### 1. Verify Token & Get User

토큰 유효성 검증 및 사용자 정보 조회

```http
GET /user
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "login": "username",
  "id": 12345,
  "name": "User Name"
}
```

**Errors**:
- `401 Unauthorized`: 토큰 무효 또는 만료

---

### 2. Get Repository Info

리포지토리 정보 조회

```http
GET /repos/{owner}/{repo}
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "id": 123456,
  "name": "quartz-garden",
  "full_name": "username/quartz-garden",
  "default_branch": "main",
  "private": false
}
```

**Errors**:
- `404 Not Found`: 리포지토리 없음 또는 접근 권한 없음

---

### 3. Check Quartz Config

`quartz.config.ts` 파일 존재 확인

```http
GET /repos/{owner}/{repo}/contents/quartz.config.ts
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "name": "quartz.config.ts",
  "path": "quartz.config.ts",
  "sha": "abc123",
  "size": 1234,
  "type": "file"
}
```

**Errors**:
- `404 Not Found`: Quartz 리포지토리가 아님

---

### 4. Get File Content

파일 내용 조회

```http
GET /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "name": "hello.md",
  "path": "content/hello.md",
  "sha": "abc123def456",
  "size": 1234,
  "content": "base64_encoded_content",
  "encoding": "base64"
}
```

**Errors**:
- `404 Not Found`: 파일 없음

---

### 5. Create or Update File

파일 생성 또는 업데이트

```http
PUT /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (Create)**:
```json
{
  "message": "Publish: hello.md",
  "content": "base64_encoded_content",
  "branch": "main"
}
```

**Request Body (Update)**:
```json
{
  "message": "Update: hello.md",
  "content": "base64_encoded_content",
  "sha": "existing_file_sha",
  "branch": "main"
}
```

**Response (200 OK / 201 Created)**:
```json
{
  "content": {
    "name": "hello.md",
    "path": "content/hello.md",
    "sha": "new_sha_after_commit"
  },
  "commit": {
    "sha": "commit_sha",
    "message": "Publish: hello.md"
  }
}
```

**Errors**:
- `409 Conflict`: SHA 불일치 (동시 수정)
- `422 Unprocessable Entity`: 잘못된 요청 (예: base64 인코딩 오류)

---

### 6. Delete File

파일 삭제

```http
DELETE /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "Unpublish: hello.md",
  "sha": "file_sha_to_delete",
  "branch": "main"
}
```

**Response (200 OK)**:
```json
{
  "commit": {
    "sha": "commit_sha",
    "message": "Unpublish: hello.md"
  }
}
```

**Errors**:
- `404 Not Found`: 파일 없음
- `409 Conflict`: SHA 불일치

---

### 7. Get Rate Limit

API 요청 한도 확인

```http
GET /rate_limit
Authorization: Bearer {token}
```

**Response (200 OK)**:
```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "remaining": 4999,
      "reset": 1736787600,
      "used": 1
    }
  }
}
```

---

## Error Response Format

모든 오류는 다음 형식을 따릅니다:

```json
{
  "message": "Error description",
  "documentation_url": "https://docs.github.com/..."
}
```

---

## Rate Limit Headers

모든 응답에 포함되는 헤더:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | 시간당 최대 요청 수 |
| `X-RateLimit-Remaining` | 남은 요청 수 |
| `X-RateLimit-Reset` | 리셋 시간 (Unix timestamp) |
| `X-RateLimit-Used` | 사용된 요청 수 |

---

## Wrapper Service Interface

플러그인 내부에서 사용할 서비스 인터페이스:

```typescript
interface GitHubService {
  // 연결 테스트
  testConnection(): Promise<ConnectionResult>;

  // 파일 조회
  getFile(path: string): Promise<FileContent | null>;

  // 파일 생성/업데이트
  createOrUpdateFile(
    path: string,
    content: string,
    message: string,
    existingSha?: string
  ): Promise<CommitResult>;

  // 파일 삭제
  deleteFile(
    path: string,
    sha: string,
    message: string
  ): Promise<CommitResult>;

  // Rate Limit 확인
  getRateLimit(): Promise<RateLimitInfo>;
}

interface ConnectionResult {
  success: boolean;
  repository?: {
    name: string;
    owner: string;
    defaultBranch: string;
    isQuartz: boolean;
  };
  error?: ConnectionError;
}

interface FileContent {
  path: string;
  sha: string;
  content: string;  // decoded
  size: number;
}

interface CommitResult {
  success: boolean;
  sha?: string;
  commitSha?: string;
  error?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}
```
