# Implementation Plan: Quartz 설정 관리

**Branch**: `003-quartz-config` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-quartz-config/spec.md`

## Summary

Obsidian 플러그인 설정 화면에서 Quartz 설정을 관리하는 기능 구현. 사용자가 ExplicitPublish 토글, 제외 패턴, URL 전략을 변경하면 `quartz.config.ts` 파일이 자동으로 수정되어 GitHub에 즉시 커밋된다. 추가로 Quartz 최신 버전 확인 및 원클릭 업그레이드 기능을 제공한다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API (Plugin, PluginSettingTab, Notice, Modal), fetch (built-in)
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`), GitHub Repository (`quartz.config.ts`)
**Testing**: Vitest + happy-dom
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)
**Project Type**: Single project (Obsidian Plugin)
**Performance Goals**: 설정 변경 후 10초 이내 GitHub 커밋 완료, 설정 화면 로드 5초 이내
**Constraints**: GitHub API Rate Limit (5000 req/hour), 오프라인 시 설정 변경 불가
**Scale/Scope**: 단일 사용자, 단일 리포지토리

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 파일이 템플릿 상태이므로 기본 원칙을 적용:

| Gate | Status | Notes |
|------|--------|-------|
| 기존 아키텍처 준수 | ✅ Pass | 기존 서비스 패턴 유지 (GitHubService 확장) |
| 테스트 커버리지 | ✅ Pass | Vitest 단위 테스트 작성 예정 |
| 타입 안전성 | ✅ Pass | TypeScript strict mode, 기존 타입 확장 |
| Obsidian 가이드라인 | ✅ Pass | PluginSettingTab 활용, Notice 알림 |

## Project Structure

### Documentation (this feature)

```text
specs/003-quartz-config/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main.ts                    # 플러그인 메인 클래스 (커맨드 추가)
├── types.ts                   # 타입 정의 (QuartzConfig 관련 추가)
├── services/
│   ├── github.ts              # GitHub API 서비스 (확장)
│   ├── quartz-config.ts       # [NEW] Quartz 설정 파싱/수정 서비스
│   ├── quartz-upgrade.ts      # [NEW] Quartz 업그레이드 서비스
│   └── ...
├── ui/
│   ├── settings-tab.ts        # 설정 탭 UI (Quartz 설정 섹션 추가)
│   └── ...
└── utils/
    └── glob-validator.ts      # [NEW] Glob 패턴 유효성 검사

tests/
├── unit/
│   ├── services/
│   │   ├── quartz-config.test.ts    # [NEW]
│   │   └── quartz-upgrade.test.ts   # [NEW]
│   └── utils/
│       └── glob-validator.test.ts   # [NEW]
└── ...
```

**Structure Decision**: 기존 단일 프로젝트 구조 유지. `services/` 폴더에 새 서비스 추가, `utils/` 폴더에 유틸리티 추가.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - 모든 게이트 통과
