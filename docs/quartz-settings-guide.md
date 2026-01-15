# Quartz 설정 관리 가이드

Quartz Publish 플러그인에서 Quartz 설정을 직접 관리하는 방법을 안내합니다. 플러그인을 통해 `quartz.config.ts` 파일을 수정하고 GitHub에 자동으로 반영할 수 있습니다.

## 설정 개요

플러그인 설정 화면에서 다음 Quartz 설정을 관리할 수 있습니다:

| 섹션 | 설정 항목 |
|------|----------|
| **Site Info** | 사이트 제목, 기본 URL, 로케일 |
| **Publishing** | ExplicitPublish, 제외 패턴, URL 전략 |
| **Analytics** | 애널리틱스 제공자 및 설정 |

## Site Info (사이트 정보)

### Page Title

사이트의 메인 제목을 설정합니다. 브라우저 탭과 사이트 헤더에 표시됩니다.

```
예: "My Digital Garden"
```

**Quartz 설정 위치**: `configuration.pageTitle`

### Base URL

사이트의 기본 URL을 설정합니다. 배포 플랫폼에 따라 다르게 설정합니다.

| 플랫폼 | Base URL 형식 |
|--------|---------------|
| GitHub Pages | `username.github.io/repo-name` |
| Vercel | `my-site.vercel.app` |
| 커스텀 도메인 | `blog.example.com` |

**Quartz 설정 위치**: `configuration.baseUrl`

> **주의**: 프로토콜(`https://`)은 포함하지 않습니다.

### Locale

사이트의 언어 및 지역 설정입니다. 날짜 형식과 일부 UI 텍스트에 영향을 줍니다.

| 값 | 설명 |
|----|------|
| `ko-KR` | 한국어 (대한민국) |
| `en-US` | 영어 (미국) |
| `ja-JP` | 일본어 (일본) |
| `zh-CN` | 중국어 (간체) |

**Quartz 설정 위치**: `configuration.locale`

## Publishing (발행 설정)

### Explicit Publish

`publish: true` 프론트매터가 있는 노트만 발행할지 설정합니다.

| 값 | 동작 |
|----|------|
| **On** | `publish: true`인 노트만 발행 |
| **Off** | 모든 노트 발행 (제외 패턴 제외) |

**Quartz 설정 위치**: `plugins.filters` (ExplicitPublish 플러그인)

**권장**: 개인 노트와 공개 노트를 구분하려면 **On**으로 설정하세요.

### Ignore Patterns

발행에서 제외할 파일/폴더 패턴을 설정합니다.

**형식**: glob 패턴 (줄바꿈으로 구분)

```
private/**
drafts/**
*.excalidraw.md
templates/**
```

**지원되는 패턴**:

| 패턴 | 설명 |
|------|------|
| `folder/**` | 폴더와 하위 모든 파일 |
| `*.ext` | 특정 확장자 |
| `file.md` | 특정 파일 |
| `**/name.md` | 모든 위치의 특정 파일명 |

**Quartz 설정 위치**: `configuration.ignorePatterns`

### URL Strategy

URL 생성 방식을 설정합니다.

| 값 | 설명 | 예시 |
|----|------|------|
| **Shortest Paths** | 가능한 짧은 경로 | `/note-name` |
| **Absolute Paths** | 폴더 구조 유지 | `/folder/subfolder/note-name` |

**Quartz 설정 위치**: `configuration.urlStrategy`

**권장**:
- 짧고 깔끔한 URL → **Shortest Paths**
- SEO와 구조적 URL → **Absolute Paths**

## Analytics (애널리틱스)

### 지원되는 제공자

| 제공자 | 설명 |
|--------|------|
| **None** | 애널리틱스 비활성화 |
| **Google Analytics** | Google Analytics 4 |
| **Plausible** | 프라이버시 친화적 애널리틱스 |
| **Umami** | 자체 호스팅 가능 애널리틱스 |
| **GoatCounter** | 간단하고 가벼운 애널리틱스 |
| **Posthog** | 제품 분석 플랫폼 |
| **Tinylytics** | 미니멀 애널리틱스 |
| **Cabin** | 프라이버시 중심 애널리틱스 |
| **Clarity** | Microsoft Clarity |

### Google Analytics 설정

1. Provider에서 **Google Analytics** 선택
2. **Measurement ID** 입력 (예: `G-XXXXXXXXXX`)

```
Measurement ID: G-XXXXXXXXXX
```

> Google Analytics 관리 화면 > 데이터 스트림 > 측정 ID에서 확인

### Plausible 설정

1. Provider에서 **Plausible** 선택
2. **Server URL** 입력 (자체 호스팅 시)

```
Server URL: https://plausible.io  (기본값)
```

### Umami 설정

1. Provider에서 **Umami** 선택
2. **Website ID** 입력
3. **Host** 입력

```
Website ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Host: https://analytics.example.com
```

**Quartz 설정 위치**: `configuration.analytics`

## 설정 적용

### Apply 버튼

설정을 변경한 후 **Apply** 버튼을 클릭하여 변경사항을 적용합니다.

**적용 과정**:
1. `quartz.config.ts` 파일 수정
2. GitHub 리포지토리에 커밋
3. (자동 배포 설정 시) 사이트 재빌드

### 미저장 변경 경고

설정을 변경하고 적용하지 않은 상태에서 화면을 떠나려 하면 경고가 표시됩니다.

## Quartz 업그레이드

### 버전 확인

설정 화면 진입 시 자동으로 최신 Quartz 버전을 확인합니다.

```
Current version: 4.2.0
Latest version: 4.3.0  [Upgrade Available]
```

### 업그레이드 실행

1. **Upgrade** 버튼 클릭
2. 업그레이드 내역 확인
3. **Confirm** 클릭
4. 업그레이드 완료 대기

**업그레이드 시 처리**:
- Quartz 코드 업데이트
- 사용자 설정 보존 (`quartz.config.ts`)
- 커스텀 컴포넌트 보존

> **주의**: 업그레이드 후 빌드 오류가 발생하면 Quartz 릴리스 노트를 확인하세요.

## 설정 예시

### 한국어 블로그 기본 설정

```
Page Title: 나의 디지털 가든
Base URL: username.github.io/blog
Locale: ko-KR
Explicit Publish: On
URL Strategy: Shortest Paths
Analytics: None
```

### SEO 최적화 설정

```
Page Title: Tech Blog by Username
Base URL: blog.example.com
Locale: en-US
Explicit Publish: On
URL Strategy: Absolute Paths
Analytics: Google Analytics (G-XXXXXXXXXX)
```

### 프라이버시 중심 설정

```
Page Title: Private Garden
Base URL: garden.example.com
Locale: en-US
Explicit Publish: On
Ignore Patterns: private/**, personal/**
Analytics: Plausible
```

## 문제 해결

### 설정 적용 실패

1. GitHub Token 권한 확인 (`repo` 권한 필요)
2. 브랜치 쓰기 권한 확인
3. `quartz.config.ts` 파일 존재 확인

### 설정이 사이트에 반영되지 않음

1. GitHub Actions 빌드 상태 확인
2. 캐시 삭제 후 새로고침
3. 배포 완료까지 수 분 대기

### Ignore Patterns 작동하지 않음

1. glob 패턴 문법 확인
2. 경로가 정확한지 확인 (대소문자 구분)
3. 패턴 테스트: `folder/**` 형식 사용

### 업그레이드 후 빌드 오류

1. [Quartz 릴리스 노트](https://github.com/jackyzha0/quartz/releases) 확인
2. Breaking changes 확인
3. 필요 시 수동으로 설정 파일 수정

## 고급 설정

플러그인에서 지원하지 않는 고급 설정은 직접 `quartz.config.ts`를 수정해야 합니다:

- 커스텀 플러그인 추가
- 레이아웃 변경
- 테마 커스터마이징
- 커스텀 컴포넌트

> 직접 수정한 설정은 플러그인 업데이트 시 충돌할 수 있으니 백업을 권장합니다.

## 참고 문서

- [플러그인 사용 가이드](plugin-usage-guide.md) - 전체 기능 안내
- [발행 대시보드 사용법](dashboard-guide.md) - 노트 관리
- [Quartz Configuration 문서](https://quartz.jzhao.xyz/configuration) - 공식 설정 문서
- [Quartz Plugins 문서](https://quartz.jzhao.xyz/plugins) - 플러그인 설정
