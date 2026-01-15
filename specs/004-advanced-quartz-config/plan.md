# Implementation Plan: Quartz 고급 설정 관리

**Branch**: `004-advanced-quartz-config` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-advanced-quartz-config/spec.md`

## Summary

Quartz 사이트의 고급 설정(pageTitle, baseUrl, locale, enableSPA, enablePopovers, analytics, defaultDateType)을 플러그인 설정 화면에서 관리할 수 있도록 확장한다. 기존 자동 커밋 방식을 명시적 "적용" 버튼 방식으로 전환하여 사용자에게 통제권을 부여하고, 모든 Quartz 설정을 통합된 UX로 제공한다.

## Technical Context

**Language/Version**: TypeScript 5.9+ (Node.js 22+)
**Primary Dependencies**: Obsidian API (Plugin, PluginSettingTab, Modal, Notice, Setting), fetch (built-in)
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`), GitHub Repository (`quartz.config.ts`)
**Testing**: Vitest (unit tests)
**Target Platform**: Obsidian Desktop (Electron)
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: 설정 로딩 5초 이내, 커밋&푸시 15초 이내 (SC-002, SC-005)
**Constraints**: Obsidian API 제한 내 동작, GitHub API Rate Limit 고려
**Scale/Scope**: 단일 사용자, 단일 리포지토리

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

프로젝트 constitution이 템플릿 상태이므로 기본 원칙 적용:
- ✅ 기존 코드 패턴 준수 (QuartzConfigService 확장)
- ✅ 단일 책임 원칙 (서비스/UI 분리)
- ✅ 테스트 가능한 설계 (비즈니스 로직 분리)
- ✅ Obsidian 디자인 가이드라인 준수

## Project Structure

### Documentation (this feature)

```text
specs/004-advanced-quartz-config/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── main.ts                      # 플러그인 메인 클래스
├── types.ts                     # 타입 정의 (확장)
├── services/
│   ├── github.ts                # GitHub API 서비스 (기존)
│   ├── quartz-config.ts         # Quartz 설정 파싱/수정 서비스 (확장)
│   └── quartz-upgrade.ts        # Quartz 업그레이드 서비스 (기존)
├── ui/
│   ├── settings-tab.ts          # 설정 탭 UI (리팩토링)
│   ├── components/
│   │   ├── apply-button.ts      # "적용" 버튼 컴포넌트 (신규)
│   │   ├── confirm-modal.ts     # 확인 모달 컴포넌트 (신규)
│   │   └── unsaved-warning.ts   # 저장되지 않은 변경 경고 (신규)
│   └── sections/
│       ├── site-info-section.ts      # 사이트 기본 정보 섹션 (신규)
│       ├── behavior-section.ts       # 동작 옵션 섹션 (신규)
│       ├── analytics-section.ts      # 애널리틱스 섹션 (신규)
│       └── publishing-section.ts     # 발행 설정 섹션 (기존 통합)
└── utils/
    ├── validators.ts            # 유효성 검사 유틸리티 (확장)
    └── glob-validator.ts        # Glob 패턴 검증 (기존)

tests/
├── unit/
│   └── services/
│       └── quartz-config.test.ts    # 설정 서비스 테스트 (확장)
└── integration/
    └── settings-tab.test.ts         # 설정 탭 통합 테스트 (신규)
```

**Structure Decision**: 기존 Obsidian 플러그인 구조 유지. UI 컴포넌트를 `ui/components/`와 `ui/sections/`로 분리하여 재사용성 향상.

## Complexity Tracking

> **No violations - design follows existing patterns**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| 상태 관리 | 클래스 인스턴스 내부 상태 | Obsidian 플러그인 패턴 준수, 별도 상태 라이브러리 불필요 |
| 설정 파싱 | 정규식 기반 | 기존 QuartzConfigService 패턴 유지, AST 파싱은 과도한 복잡성 |
| UI 구성 | Obsidian Setting API | 플랫폼 네이티브 UI, 커스텀 컴포넌트 최소화 |
