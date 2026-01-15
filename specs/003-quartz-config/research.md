# Research: Quartz 설정 관리

**Date**: 2026-01-13
**Feature**: 003-quartz-config

## 1. quartz.config.ts 파일 구조

### Decision
TypeScript AST 파싱 대신 정규식 기반 문자열 처리로 `quartz.config.ts` 파일을 수정한다.

### Rationale
- `quartz.config.ts`는 TypeScript 설정 파일이지만, 수정해야 할 부분이 명확하게 정의됨
- AST 파싱은 복잡도가 높고 의존성이 증가함
- 정규식으로 충분히 안전하게 처리 가능한 패턴들임
- Obsidian 플러그인 환경에서 TypeScript 파서 의존성 추가가 부담됨

### Alternatives Considered
1. **TypeScript Compiler API**: 정확하지만 번들 크기 증가, 복잡도 높음
2. **Babel Parser**: 유연하지만 설정 복잡, 의존성 과다
3. **정규식 기반 처리 (선택)**: 단순하고 가벼움, 대상 패턴이 명확함

---

## 2. ExplicitPublish 플러그인 설정

### Decision
`plugins.filters` 배열에서 `Plugin.ExplicitPublish()` 또는 `Plugin.RemoveDrafts()` 함수 호출을 찾아 교체/추가/제거한다.

### Rationale
- ExplicitPublish 소스 코드 분석 결과:
  ```typescript
  export const ExplicitPublish: QuartzFilterPlugin = () => ({
    name: "ExplicitPublish",
    shouldPublish(_ctx, [_tree, vfile]) {
      return vfile.data?.frontmatter?.publish === true ||
             vfile.data?.frontmatter?.publish === "true"
    },
  })
  ```
- 함수명은 `Plugin.ExplicitPublish()`로 호출됨
- `filters: [Plugin.RemoveDrafts()]` → `filters: [Plugin.ExplicitPublish()]` 형태로 교체

### 파일 수정 패턴
```typescript
// Before (RemoveDrafts)
filters: [Plugin.RemoveDrafts()],

// After (ExplicitPublish)
filters: [Plugin.ExplicitPublish()],
```

---

## 3. ignorePatterns 배열 수정

### Decision
`ignorePatterns` 배열을 정규식으로 찾아 JSON 배열로 파싱/수정 후 다시 문자열로 변환한다.

### Rationale
- `ignorePatterns`는 문자열 배열로 단순한 구조
- JSON.parse/stringify로 안전하게 처리 가능
- 기본값: `["private", "templates", ".obsidian"]`

### 파일 수정 패턴
```typescript
// Pattern to match
ignorePatterns: ["private", "templates", ".obsidian"],

// Regex
/ignorePatterns:\s*\[([^\]]*)\]/
```

---

## 4. urlStrategy 설정 수정

### Decision
`configuration` 객체 내 최상위 레벨에 `urlStrategy` 속성을 추가/수정한다.

### Rationale
- Quartz 4 기본값은 없음 (undefined → shortestPaths로 동작)
- 명시적으로 설정 시: `urlStrategy: "shortestPaths"` 또는 `"absolutePaths"`

### 파일 수정 패턴
```typescript
// Add or modify in configuration block
configuration: {
  pageTitle: "...",
  urlStrategy: "shortestPaths", // or "absolutePaths"
  ...
}
```

---

## 5. Quartz 버전 확인 방법

### Decision
GitHub Releases API를 사용하여 최신 버전을 확인하고, 사용자 리포지토리의 `package.json` 또는 특정 파일에서 현재 버전을 추출한다.

### Rationale
- GitHub API: `GET /repos/jackyzha0/quartz/releases/latest` → `tag_name` 추출
- 현재 버전: 사용자 리포지토리의 `package.json` 내 `version` 필드 또는 Quartz 버전 표시 파일
- 최신 릴리스: v4.x.x 시리즈 (현재 v4.0.8+)

### API Endpoints
```
# 최신 버전 조회
GET https://api.github.com/repos/jackyzha0/quartz/releases/latest

# 응답 예시
{
  "tag_name": "v4.0.8",
  "name": "v4.0.8",
  "published_at": "2023-08-21T..."
}
```

---

## 6. Quartz 업그레이드 방법

### Decision
GitHub Contents API를 사용하여 jackyzha0/quartz 템플릿의 `quartz/` 폴더 내 핵심 파일들을 사용자 리포지토리로 복사한다.

### Rationale
- Git Trees API: 재귀적으로 디렉토리 내용 조회 가능
- 보존해야 할 파일: `quartz.config.ts`, `content/`, `static/`, `quartz.layout.ts`
- 업데이트 대상: `quartz/` 폴더 (Quartz 코어), `package.json` (의존성)

### 업그레이드 프로세스
1. `GET /repos/jackyzha0/quartz/git/trees/v4?recursive=1` - 최신 파일 목록 조회
2. `quartz/` 폴더 내 파일들만 필터링
3. 각 파일에 대해 `GET /repos/jackyzha0/quartz/contents/{path}?ref=v4` - 내용 조회
4. 사용자 리포지토리에 `PUT /repos/{owner}/{repo}/contents/{path}` - 파일 업데이트
5. `package.json` 업데이트 (의존성 버전)

### Rate Limit 고려사항
- 일반 인증 사용자: 5000 req/hour
- 업그레이드 시 대략 50-100개 파일 처리 예상
- 충분한 여유 있음

---

## 7. Glob 패턴 유효성 검사

### Decision
간단한 정규식 기반 유효성 검사를 구현한다. 복잡한 glob 라이브러리 의존성을 피한다.

### Rationale
- Quartz의 `ignorePatterns`는 단순 glob 패턴 사용
- 허용 패턴: `*`, `**`, `?`, `[...]`, 일반 경로 문자
- 금지 문자: `\0`, 제어 문자
- 상대 경로만 허용 (절대 경로 `/` 시작 금지)

### 유효성 검사 규칙
```typescript
function isValidGlobPattern(pattern: string): boolean {
  // 빈 문자열 불가
  if (!pattern || pattern.trim() === '') return false;

  // 절대 경로 불가
  if (pattern.startsWith('/')) return false;

  // 제어 문자 불가
  if (/[\x00-\x1f]/.test(pattern)) return false;

  // 연속된 ** 사이에 다른 문자 필요
  if (/\*{3,}/.test(pattern)) return false;

  return true;
}
```

---

## 8. 오류 처리 및 롤백 전략

### Decision
설정 변경 실패 시 로컬 UI 상태만 롤백하고, GitHub 커밋은 이미 원자적이므로 별도 롤백 불필요.

### Rationale
- GitHub Contents API의 PUT은 원자적 (성공 또는 실패)
- 네트워크 오류 시 로컬 토글/입력 상태를 이전 값으로 복원
- 동시 수정 충돌은 SHA 체크로 감지 → 사용자에게 새로고침 안내

### 오류 유형별 처리
| 오류 | 처리 방법 |
|------|----------|
| 401 Unauthorized | 토큰 재확인 안내 |
| 404 Not Found | 파일/리포지토리 확인 안내 |
| 409 Conflict | 원격 변경 감지, 새로고침 필요 |
| 422 Unprocessable | 잘못된 파일 형식 안내 |
| 429 Rate Limited | 재시도 가능 시간 안내 |
| Network Error | 오프라인 상태 안내 |

---

## 9. 설정 탭 UI 구조

### Decision
기존 `SettingsTab`에 "Quartz 설정" 섹션을 추가한다. Obsidian의 `Setting` 컴포넌트를 활용한다.

### Rationale
- 일관된 UX를 위해 기존 설정 탭 확장
- Obsidian `Setting` API: `addToggle()`, `addDropdown()`, `addText()` 등 제공
- 비동기 저장 시 로딩 상태 표시 필요

### UI 구성
```
[Quartz 설정]
├── 일부만 공개 (토글) - ExplicitPublish 활성화
├── 제외 패턴 (텍스트 목록)
│   ├── private/*
│   ├── templates/*
│   └── [추가 버튼]
├── URL 전략 (드롭다운)
│   ├── shortestPaths (기본값)
│   └── absolutePaths
└── [Quartz 업그레이드]
    ├── 현재 버전: v4.0.5
    ├── 최신 버전: v4.0.8
    └── [업그레이드] 버튼
```

---

## Summary

모든 기술적 질문이 해결되었습니다:

1. **파일 수정**: 정규식 기반 문자열 처리
2. **ExplicitPublish**: `Plugin.ExplicitPublish()` 함수 호출 형태
3. **ignorePatterns**: JSON 배열 형식
4. **urlStrategy**: configuration 블록 내 속성
5. **버전 확인**: GitHub Releases API
6. **업그레이드**: Git Trees + Contents API 조합
7. **Glob 검사**: 간단한 정규식 검증
8. **오류 처리**: 로컬 상태 롤백, GitHub 원자적 커밋
9. **UI**: Obsidian Setting API 활용
