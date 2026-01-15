# Quartz 블로그 만들기 가이드

Quartz는 Obsidian 노트를 아름다운 정적 웹사이트로 변환하는 강력한 도구입니다. 이 가이드는 GitHub 템플릿으로 Quartz 블로그를 생성하고, 온라인에 배포한 후, Obsidian 플러그인을 통해 노트를 발행하는 전체 과정을 안내합니다.

## 사전 요구사항

다음 항목들이 필요합니다:

- **GitHub 계정** - 리포지토리 생성 및 배포용
- **Node.js >= v22.0.0** - Quartz 빌드 및 개발 서버용
- **npm >= v10.9.2** - 패키지 관리용
- **Git** - 버전 관리 및 배포용
- **Obsidian** - 노트 작성 및 발행용

## 1. GitHub 리포지토리 생성

### 1.1 템플릿에서 리포지토리 생성

Quartz 공식 리포지토리를 템플릿으로 사용하여 새로운 리포지토리를 생성합니다:

1. https://github.com/jackyzha0/quartz 방문
2. 페이지 우측 상단의 **녹색 "Use this template"** 버튼 클릭
3. 드롭다운에서 **"Create a new repository"** 선택
4. 리포지토리 생성 폼 작성:
   - **Owner**: 본인 계정 선택
   - **Repository name**: 원하는 이름 입력 (예: `my-quartz-blog`)
   - **Description**: 선택사항
   - **Public**: 체크 (GitHub Pages 무료 사용 필수)
   - **Include all branches**: 체크 해제 (기본 브랜치만 필요)
5. **"Create repository from template"** 버튼 클릭
6. 리포지토리 생성 완료

> **주의**: Private 리포지토리는 GitHub Pro 계정 필요합니다. GitHub Pages에 무료로 배포하려면 Public으로 설정해야 합니다.

### 1.2 로컬 클론 및 초기 설정

생성한 리포지토리를 로컬에 클론하고 초기 설정을 수행합니다:

```bash
git clone https://github.com/<username>/<repository-name>.git
cd <repository-name>
npm install
npx quartz create
```

**각 단계 설명**:

- `git clone`: 리포지토리를 로컬에 복제
- `npm install`: 필요한 패키지 설치
- `npx quartz create`: 대화형 설정 시작

`npx quartz create` 실행 시 다음과 같은 옵션을 선택할 수 있습니다:

- **Empty Quartz**: 완전히 새로운 블로그 시작
- **Copy an existing folder**: 기존 폴더의 콘텐츠 가져오기

### 1.3 로컬에서 테스트

블로그를 로컬에서 미리보기할 수 있습니다:

```bash
npx quartz build --serve
```

이 명령어를 실행하면 http://localhost:3000 에서 블로그를 확인할 수 있습니다.

## 2. 배포 설정

Quartz 블로그를 온라인에 공개하기 위해 배포를 설정합니다. GitHub Pages, Vercel, Netlify, Cloudflare Pages 등 다양한 플랫폼을 지원합니다.

### 2.1 GitHub Pages (권장)

GitHub Pages는 무료이고 GitHub과 통합이 잘 되어있어 가장 인기 있는 배포 방법입니다.

#### 1단계: quartz.config.ts 수정

`quartz.config.ts` 파일을 열고 `baseUrl`을 수정합니다:

```typescript
const config: QuartzConfig = {
  configuration: {
    baseUrl: "yourusername.github.io/repository-name",
    // ... 나머지 설정
  },
  // ...
}
```

> **예시**: 사용자명이 `john`, 리포지토리명이 `my-blog`인 경우:
> ```
> baseUrl: "john.github.io/my-blog"
> ```

#### 2단계: GitHub Actions 워크플로우 생성

`.github/workflows/deploy.yml` 파일을 생성합니다. 이 파일이 없으면 `.github/workflows/` 디렉토리를 먼저 생성하세요.

다음 내용을 파일에 복사하세요:

```yaml
name: Deploy Quartz site to Pages

on:
  push:
    branches:
      - v4

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install Dependencies
        run: npm ci
      - name: Build Quartz
        run: npx quartz build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> **주의**: 기본 브랜치가 `main`이 아니라 `v4`인 경우 위 파일을 그대로 사용합니다. `main` 브랜치를 사용한다면 `on.push.branches`에서 `v4`를 `main`으로 변경하세요.

#### 3단계: GitHub Pages 설정

리포지토리 Settings에서 배포 설정을 완료합니다:

1. 리포지토리 > **Settings** 탭 열기
2. 좌측 메뉴에서 **Pages** 선택
3. **Source** 섹션에서 **GitHub Actions** 선택
4. 자동으로 저장됨

#### 4단계: 배포 실행

워크플로우 파일을 커밋하고 푸시합니다:

```bash
git add .github/workflows/deploy.yml quartz.config.ts
git commit -m "Setup GitHub Pages deployment"
git push
```

푸시 후 자동으로 GitHub Actions가 실행됩니다.

#### 5단계: 배포 상태 확인

리포지토리 > **Actions** 탭에서 배포 상태를 확인할 수 있습니다:

- **초록색 체크**: 배포 성공
- **빨간색 X**: 빌드 또는 배포 실패

배포가 완료되면 다음 URL에서 블로그에 접근할 수 있습니다:

```
https://<username>.github.io/<repository-name>/
```

예: `https://john.github.io/my-blog/`

**배포 설정 요약**:

| 설정 항목 | 값 |
|---------|-----|
| 브랜치 | v4 (또는 main) |
| 빌드 명령어 | `npx quartz build` |
| 출력 디렉토리 | `public` |
| 배포 소스 | GitHub Actions |

### 2.2 Vercel (선택)

빠른 빌드와 커스텀 도메인을 원한다면 Vercel을 사용할 수 있습니다.

1. [Vercel](https://vercel.com) 대시보드에 접속
2. **Add New Project** 클릭
3. GitHub 리포지토리 선택 및 임포트
4. **Framework Preset**에서 **Other** 선택
5. **Build Command**: `npx quartz build`
6. **Output Directory**: `public`
7. 배포 시작

> 자세한 설정은 [Quartz 배포 가이드 - Vercel](https://quartz.jzhao.xyz/hosting#vercel)을 참고하세요.

### 2.3 Netlify (선택)

자동 HTTPS와 친화적인 UI를 원한다면 Netlify를 사용할 수 있습니다.

1. [Netlify](https://netlify.com) 대시보드에 접속
2. **Add new site** > **Import an existing project** 선택
3. GitHub 리포지토리 선택
4. **Build command**: `npx quartz build`
5. **Publish directory**: `public`
6. 배포 시작

> 자세한 설정은 [Quartz 배포 가이드 - Netlify](https://quartz.jzhao.xyz/hosting#netlify)를 참고하세요.

### 2.4 Cloudflare Pages (선택)

글로벌 CDN과 빠른 속도를 원한다면 Cloudflare Pages를 사용할 수 있습니다.

1. [Cloudflare Pages](https://pages.cloudflare.com) 대시보드에 접속
2. **Create a project** 클릭
3. GitHub 리포지토리 선택
4. **Build command**: `npx quartz build`
5. **Output directory**: `public`
6. 배포 시작

> 자세한 설정은 [Quartz 배포 가이드 - Cloudflare Pages](https://quartz.jzhao.xyz/hosting#cloudflare-pages)를 참고하세요.

## 3. Obsidian 플러그인 연동

이제 Obsidian에서 작성한 노트를 직접 Quartz 블로그에 발행할 수 있도록 플러그인을 설정합니다.

### 3.1 플러그인 설치

두 가지 방법으로 플러그인을 설치할 수 있습니다:

**방법 1: BRAT을 사용한 설치 (권장)**

1. Obsidian에서 **Settings** > **Community plugins** > **Browse** 열기
2. "BRAT"을 검색하여 설치
3. BRAT 플러그인 활성화
4. **Settings** > **BRAT** 열기
5. **Add Beta Plugin** 클릭
6. 다음 URL 입력: `https://github.com/anpigon/obsidian-quartz-publish`
7. 플러그인 설치 완료

**방법 2: 수동 설치**

1. [Quartz Publish 릴리스 페이지](https://github.com/anpigon/obsidian-quartz-publish/releases) 방문
2. 최신 버전의 `main.js`, `manifest.json`, `styles.css` 다운로드
3. Obsidian 플러그인 폴더에 새 폴더 생성: `.obsidian/plugins/obsidian-quartz-publish/`
4. 다운로드한 파일들을 새 폴더에 복사
5. Obsidian 재시작

### 3.2 GitHub Personal Access Token 발급

플러그인이 GitHub 리포지토리에 접근하려면 Personal Access Token이 필요합니다.

1. [GitHub 설정 페이지](https://github.com/settings/tokens) 방문
2. **Developer settings** > **Personal access tokens** > **Tokens (classic)** 선택
3. **Generate new token** (classic) 클릭
4. 토큰 생성 폼 작성:
   - **Note**: `Obsidian Quartz Publish` (토큰 이름)
   - **Expiration**: `90 days` 또는 `No expiration` 선택
   - **Select scopes**: `repo` 체크 (필수)
5. **Generate token** 클릭
6. 생성된 토큰 복사

> **중요**: 토큰은 다시 보이지 않으므로 안전한 곳에 저장하거나 Obsidian 플러그인에 즉시 입력하세요.

> **보안**: 토큰을 절대 공개 리포지토리에 커밋하지 마세요. 유출되면 즉시 토큰을 삭제하고 새 토큰을 발급하세요.

### 3.3 플러그인 설정

Obsidian에서 플러그인을 설정합니다:

1. **Settings** > **Community plugins** > **Installed plugins** 찾기
2. **Quartz Publish** 항목에서 **옵션 아이콘** (⚙) 클릭
3. 다음 설정 항목 입력:

**GitHub Token**
```
ghp_xxxxxxxxxxxxxxxxxxxx
```
(3.2단계에서 발급받은 토큰)

**Repository**
```
username/repository-name
```
예: `john/my-quartz-blog`

**Branch**
```
v4
```
(또는 `main` - 리포지토리의 기본 브랜치)

**Content Path**
```
content
```
(Quartz의 콘텐츠 폴더, 대부분 `content`로 고정)

설정 후 **연결 테스트** 버튼으로 설정이 올바른지 확인할 수 있습니다.

### 3.4 첫 노트 발행

플러그인 설정이 완료되었습니다. 이제 Obsidian에서 노트를 발행해봅시다.

**1단계: 노트 작성**

Obsidian에서 새 노트를 작성합니다. 예를 들어:

```markdown
---
title: 첫 번째 글
draft: false
publish: true
---

# 첫 번째 글

이것은 제 첫 번째 Quartz 블로그 글입니다!
```

**프론트매터 필드 설명**:

| 필드 | 설명 | 예시 |
|------|------|------|
| `title` | 글의 제목 | `First Post` |
| `draft` | 초안 여부 | `false` (공개) 또는 `true` (초안) |
| `publish` | 발행 대상 여부 | `true` (발행) 또는 `false` (스킵) |

**2단계: 노트 발행**

1. Obsidian 커맨드 팔레트 열기: `Cmd/Ctrl + P`
2. "Quartz Publish" 또는 "발행" 검색
3. **Quartz Publish: Publish Note** 선택
4. 발행 완료 알림 받기

**3단계: 웹사이트에서 확인**

블로그 URL(예: `https://john.github.io/my-blog/`)로 접속하여 발행된 글을 확인합니다.

> **배포 시간**: 첫 발행 후 웹사이트에 반영되는 데 수 분이 소요될 수 있습니다.

## 권장사항

### 배포 플랫폼 선택

각 플랫폼의 장단점을 비교하여 선택하세요:

| 플랫폼 | 가격 | 장점 | 단점 |
|-------|------|------|------|
| **GitHub Pages** | 무료 | GitHub 통합 우수, 설정 간단 | 커스텀 도메인 설정 필요 |
| **Vercel** | 무료 | 빠른 빌드, 우수한 성능 | 추가 로그인 필요 |
| **Netlify** | 무료 | 친화적 UI, 자동 HTTPS | GitHub Pages보다 느림 |
| **Cloudflare Pages** | 무료 | 글로벌 CDN, 빠른 속도 | 설정 복잡 |

초보자라면 **GitHub Pages**를 권장합니다.

### 프론트매터 관리

프론트매터를 잘 활용하여 노트를 관리하세요:

- **초안 작성**: `draft: true`로 설정하여 초안으로 저장
- **날짜 설정**: 작성일(`created`)과 수정일(`modified`) 명시
- **경로 커스터마이징**: `path` 필드로 URL 경로 변경
- **태그 추가**: `tags` 필드로 글 분류

> 더 자세한 정보는 [Quartz 날짜 처리 방식](quartz-date-handling.md) 문서를 참고하세요.

### 콘텐츠 폴더 구조

`content/` 폴더 내의 폴더 구조가 그대로 웹사이트의 URL 경로가 됩니다:

```
content/
├── index.md                  # https://blog.com/
├── about.md                  # https://blog.com/about
├── posts/
│   ├── first-post.md        # https://blog.com/posts/first-post
│   └── second-post.md       # https://blog.com/posts/second-post
└── categories/
    ├── tech.md              # https://blog.com/categories/tech
    └── life.md              # https://blog.com/categories/life
```

폴더 구조를 잘 설계하면 방문자가 쉽게 콘텐츠를 탐색할 수 있습니다.

## 참고 링크

**Quartz 공식 문서**:
- [Quartz 공식 웹사이트](https://quartz.jzhao.xyz/)
- [Quartz GitHub 리포지토리](https://github.com/jackyzha0/quartz)
- [Quartz 배포 가이드](https://quartz.jzhao.xyz/hosting)
- [Quartz 설정 가이드](https://quartz.jzhao.xyz/configuration)
- [Quartz 프론트매터 문서](https://quartz.jzhao.xyz/plugins/Frontmatter)

**GitHub 문서**:
- [GitHub Personal Access Token 발급](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Pages 문서](https://docs.github.com/en/pages)

**본 프로젝트 문서**:
- [Quartz 날짜 처리 방식](quartz-date-handling.md) - 날짜 필드 설정 방법
