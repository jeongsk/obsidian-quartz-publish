# Implementation Plan: Publish Filter & Home Page Configuration

**Branch**: `008-publish-filter` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-publish-filter/spec.md`

## Summary

이 기능은 Obsidian vault에서 특정 폴더만 발행하거나, 특정 폴더/태그를 제외하는 필터링 옵션을 추가합니다. 또한 특정 폴더를 Quartz 루트로 설정하고, 홈 페이지로 사용할 노트를 지정할 수 있는 기능을 제공합니다. Quartz에서 홈 페이지는 `content/index.md` 파일로 결정되므로, 지정된 노트를 해당 경로로 업로드합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+ + Obsidian API  
**Primary Dependencies**: Obsidian API (Plugin, PluginSettingTab, Notice, Setting, TFile, Vault, MetadataCache)  
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)  
**Testing**: Vitest  
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)  
**Project Type**: Obsidian Plugin (single project)  
**Performance Goals**: 필터링 로직이 1000개 파일 기준 100ms 이내 완료  
**Constraints**: Obsidian API 비동기 패턴 준수, TailwindCSS `qp:` 프리픽스 사용  
**Scale/Scope**: 1000+ 노트 vault 지원

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

프로젝트 constitution이 템플릿 상태이므로, 기존 코드베이스 패턴을 따릅니다:

- [x] 기존 설정 구조 (`PluginSettings`, `QuartzSiteConfig`) 확장
- [x] 기존 서비스 패턴 (`PublishService`, `StatusService`) 준수
- [x] 기존 UI 섹션 패턴 (`SiteInfoSection`, `BehaviorSection`) 준수
- [x] TailwindCSS `qp:` 프리픽스 사용
- [x] 테스트 작성 (Vitest)

## Project Structure

### Documentation (this feature)

```text
specs/008-publish-filter/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no external API)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── types.ts                           # PublishFilterSettings 타입 추가
├── services/
│   ├── publish.ts                     # 필터링 로직 통합
│   ├── status.ts                      # 상태 계산에 필터 적용
│   └── publish-filter.ts              # [NEW] 필터링 서비스
├── ui/
│   ├── settings-tab.ts                # 필터 설정 섹션 추가
│   └── sections/
│       └── publish-filter-section.ts  # [NEW] 필터 설정 UI 섹션
└── utils/
    └── path-matcher.ts                # [NEW] 폴더 경로 매칭 유틸리티

tests/
├── unit/
│   ├── publish-filter.test.ts         # [NEW] 필터 로직 테스트
│   └── path-matcher.test.ts           # [NEW] 경로 매칭 테스트
└── integration/
    └── publish-filter-integration.test.ts  # [NEW] 통합 테스트
```

**Structure Decision**: 기존 Obsidian 플러그인 단일 프로젝트 구조를 유지하며, 새로운 필터링 서비스와 UI 섹션을 추가합니다.

## Complexity Tracking

> **No violations** - 기존 패턴을 따르며, 새로운 복잡도를 도입하지 않습니다.
