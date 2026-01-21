<img width="2816" height="1536" alt="Gemini_Generated_Image_bbpsx0bbpsx0bbps" src="https://github.com/user-attachments/assets/7bb95f7c-6b3e-4dd3-a993-d345d2bc63cf" />

# Quartz Publish

[![GitHub License](https://img.shields.io/github/license/jeongsk/obsidian-quartz-publish)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/jeongsk/obsidian-quartz-publish)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![GitHub Downloads](https://img.shields.io/github/downloads/jeongsk/obsidian-quartz-publish/total)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![CI](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml/badge.svg)](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml)

[**View in English**](README.md)

Obsidian 노트를 [Quartz](https://quartz.jzhao.xyz/) 블로그에 직접 발행하는 플러그인입니다.

## 기능

### 발행

- Obsidian 노트를 Quartz 저장소에 직접 발행
- 프론트매터를 활용한 발행 경로 설정
- 초안(draft) 또는 공개(publish) 상태로 발행 선택
- GitHub 저장소와 연동하여 자동 배포

### 발행 필터링

- 폴더 기반 발행 대상 필터링
- 태그 기반 발행 대상 필터링
- Glob 패턴을 활용한 유연한 필터 설정

### Quartz 관리

- Quartz 설정 관리 (사이트 정보, 분석, 로케일 등)
- Quartz 버전 업그레이드 지원
- 원격 파일 관리 (Quartz 저장소의 파일 직접 관리)

### 기타

- 네트워크 오프라인 감지
- 대용량 파일 발행 시 경고
- 다국어 지원 (영어, 한국어)

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
path: custom-url-path
---
```

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
npm run dev            # 개발 모드 (watch)
npm run build          # 프로덕션 빌드
npm run test           # 테스트 실행
npm run test:watch     # 테스트 watch 모드
npm run test:coverage  # 커버리지 보고서
npm run lint           # 린트 검사
npm run lint:fix       # 린트 자동 수정
npm run version        # 버전 업그레이드
```

### 기술 스택

- **언어**: TypeScript 5.9+
- **스타일링**: TailwindCSS v4
- **번들러**: esbuild
- **테스트**: Vitest
- **린터**: ESLint + eslint-plugin-obsidianmd

## 라이선스

[MIT](LICENSE) © Jeongsk
