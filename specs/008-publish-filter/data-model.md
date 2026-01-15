# Data Model: Publish Filter & Home Page Configuration

**Date**: 2026-01-14  
**Feature**: 008-publish-filter

## Entities

### PublishFilterSettings

발행 필터링 설정을 저장하는 엔티티입니다.

```typescript
/**
 * 발행 필터링 설정
 */
export interface PublishFilterSettings {
  /**
   * 포함할 폴더 목록
   * - 빈 배열이면 전체 vault가 발행 대상
   * - 값이 있으면 해당 폴더들만 발행 대상
   * @example ["Blog", "Notes/Public"]
   */
  includeFolders: string[];

  /**
   * 제외할 폴더 목록
   * - 포함 폴더 내에 있더라도 제외됨 (제외 규칙 우선)
   * @example ["Private", "Templates", "Archive"]
   */
  excludeFolders: string[];

  /**
   * 제외할 태그 목록
   * - `#` 접두사 없이 저장
   * - 해당 태그가 있는 노트는 발행에서 제외
   * @example ["private", "wip", "draft"]
   */
  excludeTags: string[];

  /**
   * 발행 루트로 사용할 폴더
   * - 빈 문자열이면 vault 루트 기준
   * - 설정 시 해당 폴더 기준으로 경로 재계산
   * @example "Blog" -> "Blog/posts/hello.md" becomes "posts/hello.md"
   */
  rootFolder: string;

  /**
   * 홈 페이지로 사용할 노트 경로
   * - 빈 문자열이면 홈 페이지 미설정
   * - 설정 시 해당 노트가 content/index.md로 업로드됨
   * @example "Home.md" 또는 "Blog/Welcome.md"
   */
  homePagePath: string;
}
```

### 기본값

```typescript
/**
 * 기본 발행 필터링 설정값
 */
export const DEFAULT_PUBLISH_FILTER_SETTINGS: PublishFilterSettings = {
  includeFolders: [],
  excludeFolders: [],
  excludeTags: [],
  rootFolder: '',
  homePagePath: '',
};
```

## Relationships

### PluginSettings 확장

```typescript
export interface PluginSettings {
  // ... 기존 필드들
  
  /**
   * 발행 필터링 설정
   */
  publishFilterSettings?: PublishFilterSettings;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  // ... 기존 기본값들
  publishFilterSettings: DEFAULT_PUBLISH_FILTER_SETTINGS,
};
```

## Validation Rules

### 폴더 경로 검증

| Field | Rule | Error Message |
|-------|------|---------------|
| includeFolders | vault 내 존재하는 폴더여야 함 | "폴더를 찾을 수 없습니다: {path}" |
| excludeFolders | vault 내 존재하는 폴더여야 함 | "폴더를 찾을 수 없습니다: {path}" |
| rootFolder | 빈 문자열이거나 vault 내 존재하는 폴더 | "루트 폴더를 찾을 수 없습니다: {path}" |
| homePagePath | 빈 문자열이거나 vault 내 존재하는 .md 파일 | "노트를 찾을 수 없습니다: {path}" |

### 태그 검증

| Field | Rule | Error Message |
|-------|------|---------------|
| excludeTags | `#` 접두사 없이 저장 | 자동 정규화 |
| excludeTags | 특수문자 제한 (영문, 숫자, `-`, `_`, `/`) | "유효하지 않은 태그: {tag}" |

## State Transitions

### 필터링 처리 흐름

```
[전체 vault 파일]
       ↓
[루트 폴더 필터] → rootFolder 외부 파일 제외
       ↓
[포함 폴더 필터] → includeFolders가 비어있지 않으면 해당 폴더만 포함
       ↓
[제외 폴더 필터] → excludeFolders에 해당하는 파일 제외
       ↓
[제외 태그 필터] → excludeTags에 해당하는 태그가 있는 노트 제외
       ↓
[홈 페이지 추가] → homePagePath가 설정되어 있으면 해당 노트 강제 포함
       ↓
[최종 발행 대상 파일 목록]
```

### 경로 변환 흐름

```
[원본 경로] "Blog/posts/hello.md"
       ↓
[루트 폴더 적용] rootFolder = "Blog"
       ↓
[변환된 경로] "posts/hello.md"
       ↓
[Quartz 경로] "content/posts/hello.md"
```

### 홈 페이지 처리 흐름

```
[홈 페이지 노트] "Blog/Welcome.md"
       ↓
[콘텐츠 변환] 링크, 이미지 경로 변환
       ↓
[업로드 경로 결정]
  ├── content/index.md (홈 페이지로)
  └── content/Blog/Welcome.md (원본 위치, 옵션)
```

## Data Volume Assumptions

| Metric | Expected | Limit |
|--------|----------|-------|
| 포함 폴더 수 | 1-5개 | 100개 |
| 제외 폴더 수 | 1-10개 | 100개 |
| 제외 태그 수 | 1-5개 | 50개 |
| vault 파일 수 | 100-1000개 | 10,000개 |
| 필터링 처리 시간 | 10-50ms | 100ms |
