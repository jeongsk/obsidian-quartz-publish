# Quartz Publish

[![GitHub License](https://img.shields.io/github/license/jeongsk/obsidian-quartz-publish)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/jeongsk/obsidian-quartz-publish)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![GitHub Downloads](https://img.shields.io/github/downloads/jeongsk/obsidian-quartz-publish/total)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![CI](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml/badge.svg)](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml)

Obsidian 노트를 [Quartz](https://quartz.jzhao.xyz/) 블로그에 직접 발행하는 플러그인입니다.

## 기능

- Obsidian 노트를 Quartz 저장소에 직접 발행
- 프론트매터를 활용한 발행 경로 설정
- 초안(draft) 또는 공개(publish) 상태로 발행 선택
- GitHub 저장소와 연동하여 자동 배포
- Quartz 설정 관리 기능

## 설치

### 수동 설치

1. [Releases](https://github.com/jeongsk/obsidian-quartz-publish/releases)에서 최신 버전을 다운로드합니다.
2. `main.js`, `manifest.json`, `styles.css` 파일을 Obsidian vault의 `.obsidian/plugins/quartz-publish/` 폴더에 복사합니다.
3. Obsidian을 재시작하고 설정 > 커뮤니티 플러그인에서 "Quartz Publish"를 활성화합니다.

### BRAT을 통한 설치

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인을 설치합니다.
2. BRAT 설정에서 "Add Beta plugin"을 선택합니다.
3. `jeongsk/obsidian-quartz-publish`를 입력하고 추가합니다.

## 설정

플러그인 설정에서 다음 항목을 구성합니다:

- **GitHub Token**: GitHub Personal Access Token (repo 권한 필요)
- **Repository**: Quartz가 설치된 GitHub 저장소 (예: `username/quartz`)
- **Branch**: 발행할 브랜치 (기본값: `main`)
- **Content Path**: Quartz 콘텐츠 경로 (기본값: `content`)

## 사용법

1. 발행하려는 노트를 엽니다.
2. 명령어 팔레트(Cmd/Ctrl + P)에서 "Quartz Publish"를 검색합니다.
3. 발행 옵션을 선택하고 발행합니다.

### 프론트매터 설정

노트의 프론트매터에서 발행 옵션을 설정할 수 있습니다:

```yaml
---
title: 노트 제목
draft: false
publish: true
slug: custom-url-path
---
```

## 문서

- [Quartz 블로그 만들기 가이드](docs/quartz-blog-setup-guide.md) - GitHub 템플릿으로 Quartz 블로그 생성 및 배포 가이드
- [Quartz 날짜 처리 방식](docs/quartz-date-handling.md) - Quartz에서 작성일/수정일을 처리하는 방법

## 개발

### 요구 사항

- Node.js >= 22.0.0
- npm

### 설치

```bash
git clone https://github.com/jeongsk/obsidian-quartz-publish.git
cd obsidian-quartz-publish
npm install
```

### 개발 명령어

```bash
npm run dev          # 개발 모드 (watch)
npm run build        # 프로덕션 빌드
npm run test         # 테스트 실행
npm run lint         # 린트 검사
npm run lint:fix     # 린트 자동 수정
```

### 프로젝트 구조

```
src/
├── main.ts                    # 플러그인 메인 클래스
├── types.ts                   # 타입 정의
├── services/
│   ├── github.ts              # GitHub API 서비스
│   ├── publish.ts             # 발행 서비스
│   ├── quartz-config.ts       # Quartz 설정 관리
│   ├── quartz-upgrade.ts      # Quartz 업그레이드
│   ├── status.ts              # 상태 관리
│   └── transformer.ts         # 콘텐츠 변환
├── ui/
│   ├── components/            # UI 컴포넌트
│   ├── dashboard-modal.ts     # 대시보드 모달
│   └── settings-tab.ts        # 설정 탭
├── utils/
│   └── glob-validator.ts      # Glob 패턴 검증
└── styles/
    └── main.css               # TailwindCSS 스타일
```

### 기술 스택

- **언어**: TypeScript 5.9+
- **스타일링**: TailwindCSS v4
- **번들러**: esbuild
- **테스트**: Vitest
- **린터**: ESLint + eslint-plugin-obsidianmd

## 라이선스

[MIT](LICENSE) © Jeongsk
