# 옵시디언 quartz 글 발행 플러그인

Obsidian 노트를 Quartz 플랫폼에 발행하는 플러그인입니다.

## 기능

- quartz에 글 발행
- 프론트매터를 활용한 발행 경로 선택
- 초안 또는 공개 상태로 발행 선택

## 프로젝트 구조

```
src/
├── main.ts          # 플러그인 메인 클래스
├── settings.ts      # 설정 인터페이스 및 설정 탭
└── styles/
    └── main.css     # TailwindCSS 스타일
```

## 기술 스택

- **언어**: TypeScript
- **스타일링**: TailwindCSS v4
- **번들러**: esbuild
- **테스트**: Vitest
- **린터**: ESLint + eslint-plugin-obsidianmd

## 개발 명령어

```bash
npm run dev          # 개발 모드 (watch)
npm run build        # 프로덕션 빌드
npm run test         # 테스트 실행
npm run lint         # 린트 검사
npm run lint:fix     # 린트 자동 수정
```

## Rules

- TailwindCSS를 적극 사용합니다. (예: `bg-obs-bg`, `text-obs-text`)
- Obsidian 기본 디자인 가이드라인을 반드시 준수합니다.
- Obsidian CSS 변수를 활용하여 테마 호환성을 유지합니다.

## Active Technologies
- TypeScript 5.9+ + Obsidian API, fetch (built-in) (001-quartz-publish)
- Obsidian Plugin Data (`data.json`) (001-quartz-publish)
- TypeScript 5.9+ + Obsidian API (Modal, Notice, TFile, Vault, MetadataCache) (002-note-management)
- Obsidian Plugin Data (`data.json` via `loadData`/`saveData`) (002-note-management)
- TypeScript 5.9+ + Obsidian API (Plugin, PluginSettingTab, Notice, Modal), fetch (built-in) (003-quartz-config)
- Obsidian Plugin Data (`data.json` via `loadData`/`saveData`), GitHub Repository (`quartz.config.ts`) (003-quartz-config)
- TypeScript 5.9+ + Obsidian API (Plugin, PluginSettingTab, Modal, Notice, Setting), fetch (built-in) (004-advanced-quartz-config)
- Obsidian Plugin Data (`data.json` via `loadData`/`saveData`), GitHub Repository (`quartz.config.ts`) (004-advanced-quartz-config)
- TypeScript 5.9+ + Obsidian API + Obsidian API (Plugin, Modal, Notice, TFile, Vault), fetch (built-in) (005-non-functional-requirements)
- TypeScript 5.9+ + Obsidian API (Plugin, Modal, Notice, Setting), fetch (built-in) (006-beginner-support)
- TypeScript 5.9+ + Obsidian API (`moment` 객체), esbuild (001-i18n)
- N/A (번역 파일은 번들에 포함) (001-i18n)
- TypeScript 5.9+ + Obsidian API + Obsidian API (Plugin, PluginSettingTab, Notice, Setting, TFile, Vault, MetadataCache) (008-publish-filter)
- TypeScript 5.9+ + Obsidian API + Obsidian API (Modal, Notice, Setting), fetch (built-in) (009-remote-file-management)
- N/A (GitHub API 직접 조회, 세션 캐싱) (009-remote-file-management)
- TypeScript 5.9+ + Obsidian API, esbuild, TailwindCSS v4 (001-fix-content-hash)
- TypeScript 5.9+ + Obsidian API + Obsidian API (Plugin, PluginSettingTab, Notice, Setting), TailwindCSS v4 (010-quick-links)
- 기존 PluginSettings (repoUrl), QuartzSiteConfig (baseUrl) - 읽기 전용 (010-quick-links)
- TypeScript 5.9+ + Obsidian API (Modal, App, Notice), TailwindCSS v4 (011-github-guide)
- TypeScript 5.9+ + Obsidian API, TailwindCSS v4, Lucide Icons (Obsidian 내장) (001-refresh-button)

## Recent Changes
- 006-beginner-support: Quartz 리포지토리 자동 생성 및 배포 가이드 (CreateRepoModal, DeployGuideModal, RepositoryCreatorService)
- 004-advanced-quartz-config: Quartz 고급 설정 관리 (pageTitle, baseUrl, locale, analytics 등)
- 005-non-functional-requirements: 오프라인 감지, 대용량 파일 경고
- 001-quartz-publish: Added TypeScript 5.9+ + Obsidian API, fetch (built-in)
