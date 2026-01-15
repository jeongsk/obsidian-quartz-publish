# Implementation Plan: 노트 관리 (Note Management)

**Branch**: `002-note-management` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-note-management/spec.md`

## Summary

발행 상태 대시보드 모달 UI를 구현하여 사용자가 vault 내 모든 발행 대상 노트의 상태(신규/수정됨/삭제필요/최신)를 탭 기반 인터페이스로 확인하고, 선택한 노트들을 순차적으로 일괄 발행/삭제할 수 있는 기능을 제공합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API (Modal, Notice, TFile, Vault, MetadataCache)
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)
**Testing**: Vitest
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: 대시보드 로딩 5초 이내 (SC-001), 100개 노트 일괄 발행 5분 이내 (SC-002)
**Constraints**: 순차 처리 방식 (GitHub API Rate Limit 고려), 대용량 vault 지원 (1000개+ 노트)
**Scale/Scope**: 단일 사용자, 최대 수천 개 노트

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution 파일이 템플릿 상태이므로 기본 원칙을 적용합니다:

| Gate | Status | Notes |
|------|--------|-------|
| 기존 코드 패턴 준수 | ✅ Pass | 기존 services/, ui/ 구조 활용 |
| 테스트 작성 | ✅ Pass | Vitest로 단위 테스트 작성 예정 |
| 단순성 원칙 | ✅ Pass | 새로운 추상화 없이 기존 패턴 확장 |

## Project Structure

### Documentation (this feature)

```text
specs/002-note-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── main.ts                    # 플러그인 메인 (커맨드 등록 추가)
├── types.ts                   # 타입 정의 (기존 활용)
├── services/
│   ├── github.ts              # GitHub API (기존)
│   ├── publish.ts             # 발행 서비스 (기존, 확장)
│   ├── transformer.ts         # 콘텐츠 변환 (기존)
│   └── status.ts              # [NEW] 상태 계산 서비스
├── ui/
│   ├── settings-tab.ts        # 설정 탭 (기존)
│   └── dashboard-modal.ts     # [NEW] 대시보드 모달
└── styles/
    └── main.css               # 스타일 (확장)

tests/
├── unit/
│   └── services/
│       └── status.test.ts     # [NEW] 상태 서비스 테스트
└── integration/
    └── dashboard.test.ts      # [NEW] 대시보드 통합 테스트
```

**Structure Decision**: 기존 단일 프로젝트 구조를 유지하며, services/에 status.ts, ui/에 dashboard-modal.ts를 추가합니다.

## Complexity Tracking

> 위반 사항 없음 - 기존 패턴을 따르며 새로운 복잡성을 도입하지 않습니다.

## Key Implementation Decisions

### 1. 상태 계산 방식
- 대시보드를 열 때 실시간으로 콘텐츠 해시 비교
- 기존 `PublishRecord`의 `contentHash`와 현재 변환된 콘텐츠 해시 비교
- 대량 파일 처리 시 성능 최적화 필요 (Web Worker 검토)

### 2. UI 구조
- Obsidian Modal 클래스 확장
- 탭 기반 UI (신규/수정됨/삭제필요/최신)
- TailwindCSS `hn:` 프리픽스 사용
- 체크박스 선택 + 일괄 작업 버튼

### 3. 일괄 작업
- 기존 `PublishService.publishNotes()` 메서드 활용
- 순차 처리 (500ms 딜레이로 Rate Limit 방지)
- 프로그레스 바 및 결과 요약 표시

## Dependencies on Existing Code

| 기존 코드 | 재사용 방식 |
|----------|-------------|
| `types.ts` | `PublishStatus`, `NoteStatus`, `StatusOverview` 타입 이미 정의됨 |
| `PublishService.publishNotes()` | 일괄 발행 메서드 기존 구현 활용 |
| `PublishService.unpublishNote()` | 일괄 삭제에 활용 |
| `ContentTransformer.transform()` | 해시 계산을 위한 변환 |
| `PluginData.publishRecords` | 발행 기록 조회 |
