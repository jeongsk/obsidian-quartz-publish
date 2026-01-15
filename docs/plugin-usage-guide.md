# Quartz Publish 플러그인 사용 가이드

Obsidian에서 작성한 노트를 Quartz 블로그에 발행하는 플러그인의 전체 기능을 안내합니다.

## 주요 기능 요약

| 기능 | 설명 |
|------|------|
| **단일 노트 발행** | 현재 노트를 Quartz에 발행 |
| **발행 대시보드** | 발행 상태 확인 및 일괄 관리 |
| **Quartz 설정 관리** | 플러그인에서 직접 Quartz 설정 변경 |
| **리포지토리 생성** | Quartz 리포지토리 자동 생성 (초보자용) |
| **배포 가이드** | GitHub Pages, Vercel 등 배포 안내 |

## 설치 및 초기 설정

### 플러그인 설치

**BRAT을 통한 설치 (권장)**:

1. Obsidian 설정 > Community plugins > Browse
2. "BRAT" 검색 및 설치
3. BRAT 설정에서 **Add Beta Plugin** 클릭
4. URL 입력: `https://github.com/anpigon/obsidian-quartz-publish`

**수동 설치**:

1. [릴리스 페이지](https://github.com/anpigon/obsidian-quartz-publish/releases)에서 최신 버전 다운로드
2. `.obsidian/plugins/obsidian-quartz-publish/` 폴더에 파일 복사
3. Obsidian 재시작

### 기본 설정

플러그인 설정 화면에서 다음 정보를 입력합니다:

| 설정 항목 | 설명 | 예시 |
|----------|------|------|
| **GitHub Token** | Personal Access Token | `ghp_xxx...` |
| **Repository** | 리포지토리 경로 | `username/quartz-blog` |
| **Branch** | 기본 브랜치 | `v4` 또는 `main` |
| **Content Path** | 콘텐츠 폴더 경로 | `content` |

> **GitHub Token 발급**: [GitHub 설정](https://github.com/settings/tokens) > Personal access tokens > Generate new token (classic) > `repo` 권한 체크

설정 완료 후 **Test Connection** 버튼으로 연결을 확인하세요.

## 단일 노트 발행

### 커맨드 팔레트 사용

1. 발행할 노트 열기
2. `Cmd/Ctrl + P`로 커맨드 팔레트 열기
3. "Quartz Publish: Publish Note" 선택
4. 발행 완료 알림 확인

### 파일 컨텍스트 메뉴 사용

1. 파일 탐색기에서 발행할 노트 우클릭
2. "Publish to Quartz" 선택
3. 발행 완료 알림 확인

### 프론트매터 설정

발행할 노트에 다음 프론트매터를 추가합니다:

```yaml
---
publish: true    # 발행 대상 표시 (필수)
draft: false     # 초안 여부 (선택, 기본값: false)
title: 글 제목   # 글 제목 (선택)
---
```

**프론트매터 필드 설명**:

| 필드 | 필수 | 설명 |
|------|------|------|
| `publish` | ✅ | `true`면 발행 대상 |
| `draft` | ❌ | `true`면 초안 상태 (사이트에 비공개) |
| `title` | ❌ | 글 제목 (없으면 파일명 사용) |
| `created` | ❌ | 작성일 |
| `modified` | ❌ | 수정일 |
| `tags` | ❌ | 태그 목록 |

### 발행 시 자동 처리

플러그인이 발행 시 자동으로 처리하는 항목:

- **내부 링크 변환**: `[[노트]]` → Quartz 호환 형식
- **이미지 업로드**: 첨부된 이미지 자동 업로드
- **첨부파일 업로드**: PDF 등 첨부파일 자동 업로드
- **프론트매터 추가**: `publish: true` 자동 추가 (없는 경우)

## 발행 대시보드

발행 상태를 확인하고 여러 노트를 일괄 관리할 수 있습니다.

### 대시보드 열기

- 커맨드 팔레트: "Quartz Publish: Open Dashboard"
- 또는 좌측 사이드바의 아이콘 클릭

### 노트 상태 구분

| 상태 | 설명 | 아이콘 |
|------|------|--------|
| **New** | 로컬에만 있는 신규 노트 | 🆕 |
| **Modified** | 로컬에서 수정된 노트 | ✏️ |
| **Deleted** | 로컬에서 삭제된 노트 | 🗑️ |
| **Up to date** | 최신 상태인 노트 | ✅ |

### 일괄 작업

- **선택 발행**: 체크박스로 선택한 노트만 발행
- **전체 동기화**: 신규/수정/삭제를 한 번에 처리
- **선택 삭제**: 원격 리포지토리에서 노트 삭제

> 자세한 내용은 [발행 대시보드 사용법](dashboard-guide.md)을 참고하세요.

## Quartz 설정 관리

플러그인에서 직접 Quartz 설정을 변경할 수 있습니다.

### 기본 설정

| 설정 | 설명 |
|------|------|
| **Page Title** | 사이트 제목 |
| **Base URL** | 사이트 기본 URL |
| **Locale** | 언어 설정 (ko-KR, en-US 등) |

### 발행 옵션

| 설정 | 설명 |
|------|------|
| **Explicit Publish** | `publish: true`인 노트만 발행 |
| **Ignore Patterns** | 제외할 파일/폴더 패턴 |
| **URL Strategy** | URL 생성 방식 (shortest/absolute) |

### 애널리틱스

Google Analytics, Plausible, Umami 등의 애널리틱스 설정을 지원합니다.

> 자세한 내용은 [Quartz 설정 관리 가이드](quartz-settings-guide.md)를 참고하세요.

## 초보자 지원 기능

### Quartz 리포지토리 자동 생성

Quartz 리포지토리가 없는 경우 플러그인에서 직접 생성할 수 있습니다.

1. 플러그인 설정 화면 열기
2. **Create Quartz Repository** 버튼 클릭
3. 리포지토리 이름 입력
4. Public/Private 선택
5. **Create** 버튼 클릭

> **주의**: GitHub Pages 무료 배포는 Public 리포지토리만 가능합니다.

### 배포 가이드

리포지토리 생성 후 배포 가이드를 확인할 수 있습니다:

- **GitHub Pages**: 가장 간단한 무료 배포
- **Vercel**: 빠른 빌드와 커스텀 도메인
- **Netlify**: 친화적 UI와 자동 HTTPS
- **Cloudflare Pages**: 글로벌 CDN

## 오프라인 및 제한 사항

### 오프라인 감지

네트워크 연결이 없으면 발행 기능이 비활성화되고 안내 메시지가 표시됩니다.

### 파일 크기 제한

10MB를 초과하는 파일은 발행 시 경고가 표시됩니다. 대용량 파일은:

- 이미지 압축 권장
- 외부 저장소 사용 권장 (YouTube, Google Drive 등)

### Rate Limit

GitHub API 제한에 도달하면 안내 메시지와 함께 재시도 시간이 표시됩니다.

## 단축키

| 동작 | 단축키 |
|------|--------|
| 현재 노트 발행 | 설정에서 지정 가능 |
| 대시보드 열기 | 설정에서 지정 가능 |

## 문제 해결

### 연결 테스트 실패

1. GitHub Token이 올바른지 확인
2. Token에 `repo` 권한이 있는지 확인
3. Repository 경로가 `username/repo-name` 형식인지 확인
4. Branch 이름이 정확한지 확인

### 발행 실패

1. 네트워크 연결 확인
2. 프론트매터에 `publish: true` 있는지 확인
3. 파일 크기가 10MB 이하인지 확인
4. GitHub API Rate Limit 확인

### Quartz 설정 변경 실패

1. `quartz.config.ts` 파일이 존재하는지 확인
2. Repository가 Quartz 리포지토리인지 확인
3. 브랜치 권한 확인

## 참고 문서

- [Quartz 블로그 만들기 가이드](quartz-blog-setup-guide.md) - 처음부터 블로그 만들기
- [발행 대시보드 사용법](dashboard-guide.md) - 대시보드 상세 사용법
- [Quartz 설정 관리 가이드](quartz-settings-guide.md) - 설정 상세 안내
- [Quartz 날짜 처리 방식](quartz-date-handling.md) - 날짜 필드 설정
- [Quartz 공식 문서](https://quartz.jzhao.xyz/) - Quartz 공식 문서
