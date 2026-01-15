# Research: Publish Filter & Home Page Configuration

**Date**: 2026-01-14  
**Feature**: 008-publish-filter

## Research Tasks

### 1. Quartz Home Page Configuration

**Question**: Quartz에서 홈 페이지는 어떻게 결정되는가?

**Decision**: `content/index.md` 파일이 홈 페이지로 사용됩니다.

**Rationale**: 
- Quartz 공식 문서에 따르면 "The content for the home page of your Quartz lives in `content/index.md`"
- 각 폴더에도 `index.md`를 생성하여 폴더 목록 페이지를 커스터마이즈할 수 있음
- 사용자가 지정한 노트를 `content/index.md`로 업로드하면 홈 페이지로 사용 가능

**Alternatives Considered**:
- quartz.config.ts 설정으로 홈 페이지 변경 → 지원하지 않음
- 특정 frontmatter 속성 사용 → 지원하지 않음

### 2. 기존 필터링 패턴 분석

**Question**: 기존 코드베이스에서 파일 필터링은 어떻게 구현되어 있는가?

**Decision**: `QuartzSiteConfig.ignorePatterns`를 통해 glob 패턴 기반 필터링을 사용합니다.

**Rationale**:
- `src/types.ts`에 `ignorePatterns: string[]`가 이미 정의되어 있음
- Quartz 자체도 `ignorePatterns` 설정을 지원함
- 플러그인의 필터 설정과 Quartz의 필터 설정은 독립적으로 동작 (플러그인은 업로드 전 필터링, Quartz는 빌드 시 필터링)

**Alternatives Considered**:
- 정규표현식 기반 필터링 → glob 패턴이 더 직관적
- 파일 단위 선택 → 폴더 단위가 사용성 측면에서 더 효율적

### 3. 태그 기반 필터링

**Question**: Obsidian에서 태그 정보를 어떻게 읽는가?

**Decision**: `MetadataCache`를 통해 frontmatter의 `tags` 필드를 읽습니다.

**Rationale**:
- `ContentTransformer.parseFrontmatter()`가 이미 frontmatter 파싱을 수행
- `MetadataCache.getFileCache(file)`로 파일의 메타데이터에 접근 가능
- 태그는 frontmatter의 `tags` 배열 또는 인라인 `#tag` 형식으로 존재

**Alternatives Considered**:
- 파일 내용 직접 파싱 → MetadataCache가 이미 캐싱된 정보 제공
- Obsidian의 `getAllTags()` API 사용 → 개별 파일 태그 확인에는 getFileCache가 더 적합

### 4. 설정 저장 구조

**Question**: 새로운 필터 설정을 어떻게 저장할 것인가?

**Decision**: `PluginSettings`를 확장하여 `publishFilterSettings` 필드를 추가합니다.

**Rationale**:
- 기존 설정 패턴(`autoDateSettings`, `quartzSettings`)과 일관성 유지
- `data.json`에 자동 저장되어 영속성 보장
- 기본값 제공으로 마이그레이션 용이

**Implementation**:
```typescript
export interface PublishFilterSettings {
  /** 포함할 폴더 목록 (빈 배열 = 전체 vault) */
  includeFolders: string[];
  /** 제외할 폴더 목록 */
  excludeFolders: string[];
  /** 제외할 태그 목록 */
  excludeTags: string[];
  /** 발행 루트로 사용할 폴더 */
  rootFolder: string;
  /** 홈 페이지로 사용할 노트 경로 */
  homePagePath: string;
}
```

### 5. 필터링 우선순위

**Question**: 여러 필터 조건이 겹칠 때 우선순위는?

**Decision**: 다음 우선순위를 적용합니다:
1. 홈 페이지 설정 (가장 높음) - 제외 규칙 무시
2. 제외 규칙 (태그, 폴더)
3. 포함 규칙 (폴더)
4. 루트 폴더 설정 (루트 외부 파일 자동 제외)

**Rationale**:
- 사용자가 명시적으로 홈 페이지로 지정한 파일은 항상 발행되어야 함
- 제외 규칙이 포함 규칙보다 우선 (보안 측면: 실수로 민감한 파일 발행 방지)
- 루트 폴더는 암묵적 포함 규칙으로 동작

### 6. UI 설정 패턴

**Question**: 기존 설정 UI 패턴은?

**Decision**: 기존 `SiteInfoSection`, `BehaviorSection` 패턴을 따라 `PublishFilterSection`을 생성합니다.

**Rationale**:
- 일관된 UI/UX 경험 제공
- 기존 `PendingChangesManager` 패턴 재사용
- TailwindCSS `qp:` 프리픽스 사용

**Components**:
- 포함 폴더: 멀티 셀렉트 또는 텍스트 영역 (줄 단위 입력)
- 제외 폴더: 텍스트 영역 (줄 단위 입력)
- 제외 태그: 텍스트 영역 (줄 단위 입력)
- 루트 폴더: 폴더 선택 드롭다운
- 홈 페이지: 노트 선택 또는 텍스트 입력

## Key Decisions Summary

| Decision | Choice | Impact |
|----------|--------|--------|
| Home page file | `content/index.md` | 홈 페이지 노트를 해당 경로로 업로드 |
| Filter priority | Home > Exclude > Include > Root | 명확한 우선순위로 예측 가능한 동작 |
| Settings storage | `PluginSettings.publishFilterSettings` | 기존 패턴 유지, 마이그레이션 용이 |
| Tag reading | `MetadataCache` | 성능 최적화 (캐싱된 데이터 사용) |
| UI pattern | Section component | 기존 UI 패턴과 일관성 |
