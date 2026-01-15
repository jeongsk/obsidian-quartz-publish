# Research: 초보자 지원 (Beginner Support)

**Date**: 2026-01-14  
**Feature Branch**: `006-beginner-support`

## Research Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| 리포지토리 생성 API | GitHub Template Repository API | jackyzha0/quartz가 이미 템플릿 리포지토리로 설정됨 |
| 리포지토리 존재 확인 | GET /repos/{owner}/{repo} | 404 응답으로 존재 여부 판단 |
| PAT 권한 요구사항 | `repo` 스코프 | Private 리포지토리 생성 지원을 위해 필요 |
| 배포 가이드 형식 | 플러그인 내 모달 | Clarification에서 결정됨 |

---

## 1. GitHub Template Repository API

### Decision
`POST /repos/{template_owner}/{template_repo}/generate` 엔드포인트 사용

### Rationale
- jackyzha0/quartz는 이미 `is_template: true`로 설정된 템플릿 리포지토리
- 템플릿 기반 생성은 전체 파일 구조, GitHub Actions 워크플로우를 포함하여 복제
- Fork와 달리 독립적인 리포지토리로 생성됨

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Fork API | Fork는 원본과 연결 유지, 독립 리포지토리 아님 |
| Manual clone + push | 복잡도 증가, 사용자 로컬 git 필요 |
| Import API | 비공개 URL 불가, 템플릿보다 느림 |

### Implementation Details

```typescript
// 엔드포인트
POST https://api.github.com/repos/jackyzha0/quartz/generate

// 요청 본문
{
  "owner": "user-login",      // 사용자 GitHub 로그인
  "name": "my-quartz",        // 리포지토리 이름
  "description": "My Quartz digital garden",
  "private": false,           // Public/Private 선택
  "include_all_branches": false
}

// 응답 (201 Created)
{
  "id": 123456,
  "name": "my-quartz",
  "full_name": "user-login/my-quartz",
  "html_url": "https://github.com/user-login/my-quartz",
  "default_branch": "v4"
}
```

---

## 2. 리포지토리 이름 유효성 검사

### Decision
클라이언트 측 정규식 검사 + 서버 측 존재 여부 확인

### Rationale
- GitHub 리포지토리 이름 규칙: 영숫자, 하이픈, 언더스코어, 점 허용
- 최대 100자
- 시작/끝에 특수문자 불가

### Implementation Details

```typescript
// 리포지토리 이름 유효성 검사 정규식
const REPO_NAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

function validateRepoName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: true }; // 기본값 "quartz" 사용
  }
  if (name.length > 100) {
    return { valid: false, error: '리포지토리 이름은 100자를 초과할 수 없습니다.' };
  }
  if (!REPO_NAME_REGEX.test(name)) {
    return { valid: false, error: '유효하지 않은 리포지토리 이름입니다. 영문, 숫자, 하이픈, 언더스코어만 사용 가능합니다.' };
  }
  return { valid: true };
}
```

---

## 3. 리포지토리 존재 여부 확인

### Decision
`GET /repos/{owner}/{repo}` 엔드포인트 사용, 404 응답으로 판단

### Rationale
- 리포지토리 생성 전 중복 확인 필요
- 404 = 존재하지 않음, 200 = 존재함
- 403 = 접근 권한 없음 (Private 리포지토리일 수 있음)

### Implementation Details

```typescript
async checkRepositoryExists(owner: string, name: string): Promise<boolean> {
  try {
    await this.request<unknown>(`/repos/${owner}/${name}`);
    return true; // 200 = 존재함
  } catch (error) {
    if (error instanceof GitHubError && error.statusCode === 404) {
      return false; // 404 = 존재하지 않음
    }
    throw error; // 다른 오류는 재throw
  }
}
```

---

## 4. PAT 권한 요구사항

### Decision
최소 `repo` 스코프 필요

### Rationale
- `public_repo`: Public 리포지토리만 생성 가능
- `repo`: Public + Private 리포지토리 모두 생성 가능
- 사용자가 Private 선택 시 GitHub Pro 필요 안내

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| public_repo만 요구 | Private 리포지토리 지원 불가 |
| Fine-grained PAT | 설정 복잡도 증가, 초보자 대상 기능 |

---

## 5. 에러 처리 전략

### Decision
사용자 친화적 메시지로 변환

### Error Mapping

| HTTP Status | Error Type | User Message |
|-------------|------------|--------------|
| 401 | invalid_token | GitHub 토큰이 유효하지 않습니다. 설정에서 토큰을 확인해주세요. |
| 403 | insufficient_permissions | 리포지토리 생성 권한이 없습니다. PAT에 'repo' 권한이 필요합니다. |
| 404 | template_not_found | Quartz 템플릿을 찾을 수 없습니다. |
| 422 | validation_failed | 리포지토리 이름이 유효하지 않거나 이미 존재합니다. |
| 429 | rate_limited | GitHub API 요청 한도에 도달했습니다. {reset_time} 후에 다시 시도해주세요. |

---

## 6. GitHub Pages 배포 가이드

### Decision
플러그인 내 모달에서 단계별 안내 제공

### Rationale
- Clarification에서 사용자 결정: 플러그인 내 모달
- 외부 링크는 브라우저로 열기

### 배포 단계 (GitHub Pages)

1. **GitHub 리포지토리 Settings 열기**
   - 링크: `https://github.com/{owner}/{repo}/settings`

2. **Pages 섹션으로 이동**
   - 링크: `https://github.com/{owner}/{repo}/settings/pages`

3. **Source 설정**
   - "Build and deployment" > "Source" > "GitHub Actions" 선택

4. **Actions 권한 확인**
   - Settings > Actions > General
   - "Workflow permissions" > "Read and write permissions" 선택

5. **첫 배포 트리거**
   - 노트 발행 시 자동으로 GitHub Actions 실행
   - 또는 Actions 탭에서 수동 실행

6. **배포 완료 확인**
   - `https://{owner}.github.io/{repo}/` 접속

---

## 7. UI/UX 고려사항

### Create Repository Modal 구성

```
┌─────────────────────────────────────────┐
│ Create Quartz Repository                │
├─────────────────────────────────────────┤
│                                         │
│ Repository Name                         │
│ ┌─────────────────────────────────────┐ │
│ │ quartz                              │ │
│ └─────────────────────────────────────┘ │
│ 기본값: quartz                          │
│                                         │
│ Visibility                              │
│ ○ Public (GitHub Pages 무료 호스팅)    │
│ ○ Private (GitHub Pro 필요)            │
│                                         │
│ ┌─────────┐  ┌─────────┐              │
│ │ Cancel  │  │ Create  │              │
│ └─────────┘  └─────────┘              │
└─────────────────────────────────────────┘
```

### Deploy Guide Modal 구성

```
┌─────────────────────────────────────────┐
│ GitHub Pages 배포 가이드                │
├─────────────────────────────────────────┤
│                                         │
│ Step 1 of 4                             │
│ ─────────────────────────────────────   │
│                                         │
│ GitHub 리포지토리 Settings를 엽니다     │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 🔗 Open Repository Settings       │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌─────────┐  ┌─────────┐              │
│ │  Back   │  │  Next   │              │
│ └─────────┘  └─────────┘              │
└─────────────────────────────────────────┘
```

---

## References

- [GitHub REST API - Create a repository using a template](https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template)
- [GitHub REST API - Get a repository](https://docs.github.com/en/rest/repos/repos#get-a-repository)
- [Quartz Documentation - Hosting](https://quartz.jzhao.xyz/hosting)
