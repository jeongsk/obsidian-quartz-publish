# Implementation Plan: 초보자 지원 (Beginner Support)

**Branch**: `006-beginner-support` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-beginner-support/spec.md`

## Summary

초보자 사용자가 GitHub/터미널 지식 없이 플러그인 설정 화면에서 Quartz 리포지토리를 자동 생성하고, GitHub Pages 배포 가이드를 제공하는 기능입니다. GitHub Template Repository API를 사용하여 jackyzha0/quartz 템플릿 기반으로 리포지토리를 생성합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+  
**Primary Dependencies**: Obsidian API (Plugin, Modal, Notice, Setting), fetch (built-in)  
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)  
**Testing**: Vitest  
**Target Platform**: Obsidian (Desktop/Mobile - Electron/Capacitor)  
**Project Type**: Single (Obsidian Plugin)  
**Performance Goals**: 리포지토리 생성 3분 이내 완료  
**Constraints**: GitHub API Rate Limit (5,000 req/hour authenticated)  
**Scale/Scope**: 단일 사용자, 단일 리포지토리 생성

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution이 기본 템플릿 상태이므로 특별한 제약 없음. 기존 프로젝트 패턴 준수:
- [x] 기존 서비스 패턴 준수 (`src/services/`)
- [x] 기존 UI 패턴 준수 (`src/ui/`)
- [x] TailwindCSS 스타일 사용 (`qp:` 프리픽스)
- [x] Vitest 테스트 작성

## Project Structure

### Documentation (this feature)

```text
specs/006-beginner-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── github.ts              # 기존 - 확장 필요
│   └── repository-creator.ts  # 신규 - 리포지토리 생성 서비스
├── ui/
│   ├── settings-tab.ts        # 기존 - 확장 필요
│   ├── create-repo-modal.ts   # 신규 - 리포지토리 생성 모달
│   └── deploy-guide-modal.ts  # 신규 - 배포 가이드 모달
└── types.ts                   # 기존 - 타입 추가

tests/
└── unit/
    └── services/
        └── repository-creator.test.ts  # 신규
```

**Structure Decision**: 기존 Obsidian 플러그인 구조 유지. 새 서비스 1개, 새 모달 2개 추가.

## Complexity Tracking

> 해당 없음 - Constitution 위반 없음

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | `specs/006-beginner-support/research.md` | GitHub API 조사 및 설계 결정 |
| Data Model | `specs/006-beginner-support/data-model.md` | 엔티티 및 타입 정의 |
| API Contracts | `specs/006-beginner-support/contracts/github-api.md` | GitHub API 계약 |
| Quickstart | `specs/006-beginner-support/quickstart.md` | 구현 가이드 |

## Next Steps

1. `/speckit.tasks` 명령으로 작업 목록 생성
2. 작업 목록에 따라 구현 진행
