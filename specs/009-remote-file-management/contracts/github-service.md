# Contract: GitHubService Extensions

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## New Methods

### getDirectoryContents

디렉토리 내 파일 목록을 재귀적으로 조회합니다.

```typescript
/**
 * 지정된 경로의 파일 목록을 재귀적으로 조회합니다.
 *
 * @param path - 조회할 디렉토리 경로 (예: 'content')
 * @param recursive - 하위 디렉토리까지 조회할지 여부 (기본값: true)
 * @returns 파일 정보 배열
 * @throws GitHubError - API 오류 시
 */
async getDirectoryContents(
  path: string,
  recursive?: boolean
): Promise<PublishedFile[]>
```

**HTTP Request**:
```
GET /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer {token}
Accept: application/vnd.github.v3+json
```

**Response Mapping**:
```typescript
// GitHub API Response → PublishedFile
{
  name: item.name,
  path: item.path,
  sha: item.sha,
  size: item.size,
  type: item.type,
  htmlUrl: item.html_url,
  downloadUrl: item.download_url,
}
```

**Error Cases**:
| Status | Error Type | Handling |
|--------|------------|----------|
| 401 | invalid_token | 토큰 재확인 요청 |
| 403 | rate_limited | 대기 시간 안내 |
| 404 | not_found | 경로 확인 안내 |
| 500+ | network_error | 재시도 안내 |

---

### deleteFiles (Batch)

여러 파일을 순차적으로 삭제합니다.

```typescript
/**
 * 여러 파일을 순차적으로 삭제합니다.
 *
 * @param files - 삭제할 파일 배열
 * @param commitMessage - 커밋 메시지 (선택적)
 * @param onProgress - 진행률 콜백 (선택적)
 * @returns 삭제 결과
 */
async deleteFiles(
  files: PublishedFile[],
  commitMessage?: string,
  onProgress?: (current: number, total: number) => void
): Promise<DeleteResult>
```

**Implementation Notes**:
- 기존 `deleteFile()` 메서드를 순차 호출
- 각 삭제 간 100ms 딜레이 (API 속도 제한 방지)
- 하나가 실패해도 나머지 계속 진행
- 결과에 성공/실패 목록 포함

**Default Commit Message**:
```
chore: Delete {count} published file(s) via Quartz Publish plugin
```

---

## Existing Method Usage

### deleteFile (기존)

```typescript
/**
 * 단일 파일을 삭제합니다.
 *
 * @param path - 파일 경로
 * @param sha - 파일 SHA (동시성 제어)
 * @param message - 커밋 메시지
 */
async deleteFile(
  path: string,
  sha: string,
  message: string
): Promise<void>
```

**HTTP Request**:
```
DELETE /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "{message}",
  "sha": "{sha}",
  "branch": "{branch}"
}
```

---

## Rate Limiting Considerations

GitHub API Rate Limits:
- **인증된 요청**: 5,000 요청/시간
- **Contents API**: 디렉토리당 최대 1,000 파일

**Batch Delete 전략**:
```typescript
const BATCH_DELETE_DELAY_MS = 100;  // 요청 간 딜레이
const MAX_BATCH_SIZE = 50;           // 최대 일괄 삭제 수

// 예상 시간: 50 파일 × 100ms = 5초
```

---

## Error Response Format

```typescript
interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
```

**GitHubError Class Usage**:
```typescript
throw new GitHubError(
  'Failed to get directory contents',
  response.status,
  await response.text(),
  'not_found'
);
```
