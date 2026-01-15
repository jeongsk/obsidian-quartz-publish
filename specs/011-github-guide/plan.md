# Implementation Plan: GitHub 리포지토리 설정 가이드

**Branch**: `011-github-guide` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-github-guide/spec.md`

## Summary

초보자가 Quartz 리포지토리를 설정할 수 있도록 플러그인 내에 스텝 위자드 형식의 가이드 모달을 제공한다. GitHub 계정 확인, Fork, PAT 생성, 연결 테스트의 4단계로 구성되며, 스크린샷과 함께 한글로 안내한다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API (Modal, App, Notice), TailwindCSS v4
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)
**Testing**: Vitest
**Target Platform**: Obsidian Desktop (Windows, macOS, Linux)
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: 가이드 모달 1초 이내 표시
**Constraints**: 오프라인 지원 (이미지 번들 포함), 플러그인 크기 최소화
**Scale/Scope**: 4단계 가이드, 4개 문제 해결 항목

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 파일이 템플릿 상태로 되어 있어 구체적인 게이트 검사를 수행할 수 없음. 기존 프로젝트 패턴을 따라 진행.

**기존 패턴 준수 확인**:
- [x] 기존 `DeployGuideModal` 패턴 재사용
- [x] TailwindCSS `qp:` prefix 사용
- [x] TypeScript 타입 정의 분리 (`types.ts`)
- [x] 서비스 레이어 분리 (`services/`)
- [x] 다국어 지원 구조 (`i18n/`)

## Project Structure

### Documentation (this feature)

```text
specs/011-github-guide/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── constants/
│   └── guide-steps.ts       # NEW: 가이드 단계 데이터
├── services/
│   └── setup-status.ts      # NEW: 설정 상태 서비스
├── ui/
│   ├── github-guide-modal.ts # NEW: 가이드 모달 컴포넌트
│   └── settings-tab.ts       # MODIFY: 가이드 버튼 추가
├── i18n/
│   └── locales/
│       └── ko.ts             # MODIFY: 가이드 텍스트 추가
└── types.ts                  # MODIFY: GuideStep 타입 추가

assets/
└── guide-screenshots/        # NEW: 스크린샷 원본 (빌드에 미포함)
```

**Structure Decision**: 기존 프로젝트 구조(Single Project)를 유지하며, 새 파일은 기존 디렉토리 구조에 맞춰 배치.

## Phase 1 Artifacts

### Generated Files

| File | Purpose |
|------|---------|
| `research.md` | 기술 결정 및 대안 분석 |
| `data-model.md` | 엔티티 및 타입 정의 |
| `quickstart.md` | 구현 가이드 및 순서 |

### Key Decisions from Research

1. **이미지 저장**: Base64 인코딩으로 TypeScript 상수에 포함 (오프라인 지원)
2. **모달 패턴**: 기존 `DeployGuideModal` 패턴 확장
3. **상태 관리**: 플러그인 설정 기반 자동 감지
4. **가이드 단계**: 4단계 (GitHub 계정, Fork, PAT, 연결)

## Implementation Components

### New Files

| File | Description | Priority |
|------|-------------|----------|
| `src/constants/guide-steps.ts` | 가이드 단계 데이터 (제목, 설명, URL, 스크린샷) | P1 |
| `src/services/setup-status.ts` | 설정 진행 상태 관리 서비스 | P1 |
| `src/ui/github-guide-modal.ts` | 스텝 위자드 모달 컴포넌트 | P1 |

### Modified Files

| File | Changes | Priority |
|------|---------|----------|
| `src/types.ts` | `GuideStep`, `SetupStatus`, `TroubleshootingItem` 타입 추가 | P1 |
| `src/ui/settings-tab.ts` | 가이드 버튼 및 자동 표시 로직 추가 | P1 |
| `src/i18n/locales/ko.ts` | 가이드 관련 텍스트 추가 | P2 |

## Next Steps

1. `/speckit.tasks` 실행하여 상세 태스크 목록 생성
2. 태스크별 구현 진행
3. 스크린샷 이미지 준비 (별도 작업)
