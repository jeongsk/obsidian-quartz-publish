# Contract: RemoteFileService

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## Overview

원격 저장소의 발행된 파일을 관리하는 서비스입니다.

## Class Definition

```typescript
/**
 * 원격 저장소의 발행된 파일을 관리하는 서비스
 */
export class RemoteFileService {
  constructor(
    private gitHubService: GitHubService,
    private config: RemoteFileManagerConfig
  );
}
```

---

## Methods

### getPublishedFiles

원격 저장소의 발행된 파일 목록을 조회합니다.

```typescript
/**
 * 발행된 파일 목록을 조회합니다.
 *
 * @returns 발행된 파일 배열 (경로별 알파벳순 정렬)
 * @throws GitHubError - API 오류 시
 */
async getPublishedFiles(): Promise<PublishedFile[]>
```

**Implementation**:
1. `gitHubService.getDirectoryContents(config.contentPath, true)` 호출
2. `.md` 파일만 필터링 (`config.fileExtensions` 기준)
3. 경로별 알파벳순 정렬
4. 결과 반환

**Sort Order**:
```typescript
files.sort((a, b) => a.path.localeCompare(b.path, 'en', { sensitivity: 'base' }));
```

---

### detectDuplicates

중복 파일 그룹을 감지합니다.

```typescript
/**
 * 파일명 기준으로 중복 파일 그룹을 감지합니다.
 *
 * @param files - 검사할 파일 목록
 * @returns 중복 그룹 배열
 */
detectDuplicates(files: PublishedFile[]): DuplicateGroup[]
```

**Implementation**:
```typescript
detectDuplicates(files: PublishedFile[]): DuplicateGroup[] {
  const nameMap = new Map<string, PublishedFile[]>();

  for (const file of files) {
    const existing = nameMap.get(file.name) ?? [];
    existing.push(file);
    nameMap.set(file.name, existing);
  }

  return Array.from(nameMap.entries())
    .filter(([_, files]) => files.length > 1)
    .map(([fileName, files]) => ({
      fileName,
      files,
      count: files.length,
    }))
    .sort((a, b) => b.count - a.count);  // 중복 많은 순
}
```

---

### searchFiles

파일 목록을 검색합니다.

```typescript
/**
 * 파일명 또는 경로로 파일을 검색합니다.
 *
 * @param files - 검색할 파일 목록
 * @param query - 검색어
 * @returns 필터링된 파일 배열
 */
searchFiles(files: PublishedFile[], query: string): PublishedFile[]
```

**Implementation**:
```typescript
searchFiles(files: PublishedFile[], query: string): PublishedFile[] {
  if (!query.trim()) return files;

  const lowerQuery = query.toLowerCase();
  return files.filter(file =>
    file.name.toLowerCase().includes(lowerQuery) ||
    file.path.toLowerCase().includes(lowerQuery)
  );
}
```

---

### deleteFiles

선택된 파일들을 삭제합니다.

```typescript
/**
 * 선택된 파일들을 삭제합니다.
 *
 * @param files - 삭제할 파일 배열
 * @param onProgress - 진행률 콜백
 * @returns 삭제 결과
 * @throws Error - 최대 파일 수 초과 시
 */
async deleteFiles(
  files: PublishedFile[],
  onProgress?: (current: number, total: number) => void
): Promise<DeleteResult>
```

**Implementation**:
```typescript
async deleteFiles(
  files: PublishedFile[],
  onProgress?: (current: number, total: number) => void
): Promise<DeleteResult> {
  if (files.length > this.config.maxBatchDelete) {
    throw new Error(t('error.remoteFiles.maxFiles', { max: this.config.maxBatchDelete }));
  }

  const startTime = Date.now();
  const succeeded: PublishedFile[] = [];
  const failed: Array<{ file: PublishedFile; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);

    try {
      await this.gitHubService.deleteFile(
        file.path,
        file.sha,
        `chore: Delete ${file.name} via Quartz Publish plugin`
      );
      succeeded.push(file);

      // API 속도 제한 방지
      if (i < files.length - 1) {
        await this.delay(100);
      }
    } catch (error) {
      failed.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    succeeded,
    failed,
    allSucceeded: failed.length === 0,
    duration: Date.now() - startTime,
  };
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Validation Rules

### File Count Validation

```typescript
validateBatchSize(files: PublishedFile[]): void {
  if (files.length === 0) {
    throw new Error(t('error.remoteFiles.noSelection'));
  }
  if (files.length > this.config.maxBatchDelete) {
    throw new Error(t('error.remoteFiles.maxFiles', { max: this.config.maxBatchDelete }));
  }
}
```

### File Extension Validation

```typescript
isValidFile(file: PublishedFile): boolean {
  return this.config.fileExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );
}
```

---

## Error Handling

| 오류 상황 | 처리 |
|-----------|------|
| 네트워크 오류 | `GitHubError` throw, UI에서 재시도 안내 |
| API 속도 제한 | `GitHubError` throw, 대기 시간 표시 |
| 권한 부족 | `GitHubError` throw, 토큰 확인 안내 |
| 파일 없음 | 조용히 스킵 (이미 삭제됨) |
| 최대 파일 수 초과 | `Error` throw, 선택 해제 안내 |
