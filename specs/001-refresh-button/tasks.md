# Tasks: 발행 대시보드 새로고침 버튼 개선

**Input**: Design documents from `/specs/001-refresh-button/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: 이 기능은 단순 UI 개선으로 자동화된 테스트가 요청되지 않았습니다. 수동 테스트로 검증합니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Target file: `src/ui/dashboard-modal.ts`

---

## Phase 1: Setup (Preparation)

**Purpose**: 기능 구현을 위한 코드 분석 및 import 확인

- [x] T001 Obsidian API에서 `setIcon`, `setTooltip` import 추가 in src/ui/dashboard-modal.ts

---

## Phase 2: User Story 1 - 새로고침 버튼 시각적 개선 (Priority: P1) - MVP

**Goal**: 사용자가 발행 대시보드에서 새로고침 버튼을 쉽게 인식하고 실수 없이 클릭할 수 있도록 합니다.

**Independent Test**:
1. 발행 대시보드를 열고 새로고침 아이콘(회전 화살표)이 표시되는지 확인
2. 아이콘에 마우스를 올려 툴팁이 표시되는지 확인
3. 아이콘을 클릭하여 목록이 새로고침되는지 확인
4. 닫기(x) 버튼과 충분한 간격이 있는지 확인

### Implementation for User Story 1

- [x] T002 [US1] `renderHeader()` 메서드에서 새로고침 버튼을 텍스트 버튼에서 아이콘 버튼으로 변경 in src/ui/dashboard-modal.ts
- [x] T003 [US1] `clickable-icon` 클래스 적용하여 Obsidian 표준 크기로 조정 in src/ui/dashboard-modal.ts
- [x] T004 [US1] `setIcon()` API로 `refresh-cw` Lucide 아이콘 추가 in src/ui/dashboard-modal.ts
- [x] T005 [US1] `setTooltip()` API로 "발행 목록 새로고침" 툴팁 추가 in src/ui/dashboard-modal.ts
- [x] T006 [US1] 버튼 위치를 제목 컨테이너 내부로 이동하여 닫기 버튼과 거리 확보 in src/ui/dashboard-modal.ts

**Checkpoint**: User Story 1 완료 - 새로고침 버튼이 아이콘으로 표시되고 툴팁이 있으며 닫기 버튼과 충분히 떨어져 있음

---

## Phase 3: User Story 2 - 버튼 크기 및 레이아웃 조정 (Priority: P2)

**Goal**: 새로고침 버튼의 크기가 다른 UI 요소와 일관되게 조정되어 전체적인 디자인 조화를 이룹니다.

**Independent Test**:
1. 버튼 크기가 Obsidian 기본 아이콘 버튼(18px)과 동일한지 확인
2. 다양한 테마(라이트/다크)에서 버튼이 적절히 표시되는지 확인
3. 호버/클릭 상태에서 시각적 피드백이 있는지 확인

### Implementation for User Story 2

- [x] T007 [US2] 로딩 상태에서 버튼 비활성화 처리 추가 in src/ui/dashboard-modal.ts
- [x] T008 [US2] 로딩 중 아이콘 회전 애니메이션(`animate-spin`) 적용 in src/ui/dashboard-modal.ts
- [x] T009 [US2] 로딩 완료 후 애니메이션 제거 및 버튼 활성화 in src/ui/dashboard-modal.ts

**Checkpoint**: User Story 2 완료 - 버튼 크기가 일관되고 로딩 상태가 시각적으로 표시됨

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: 마무리 및 검증

- [x] T010 빌드 및 린트 검사 실행 (`npm run build && npm run lint`)
- [ ] T011 quickstart.md에 따라 수동 테스트 수행

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup completion
- **User Story 2 (Phase 3)**: Can start after Setup, but ideally after US1 for testing context
- **Polish (Phase 4)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup - No dependencies on other stories (MVP)
- **User Story 2 (P2)**: Can start after Setup - Enhances US1 but independently testable

### Within Each User Story

- T002-T006: 순차 실행 권장 (같은 메서드 수정)
- T007-T009: 순차 실행 권장 (로딩 상태 로직)

### Parallel Opportunities

이 기능은 단일 파일(`dashboard-modal.ts`) 수정이므로 병렬 실행 기회가 제한적입니다.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (import 추가)
2. Complete Phase 2: User Story 1 (아이콘화, 툴팁, 위치 조정)
3. **STOP and VALIDATE**: 버튼이 아이콘으로 표시되고 동작하는지 테스트
4. Deploy/demo if ready

### Incremental Delivery

1. Setup 완료 → 준비 완료
2. User Story 1 완료 → 핵심 UX 개선 완료 (MVP!)
3. User Story 2 완료 → 로딩 상태 피드백 추가
4. Polish 완료 → 검증 및 배포 준비

---

## Notes

- 모든 태스크는 `src/ui/dashboard-modal.ts` 파일을 수정합니다
- `clickable-icon` 클래스 사용으로 Obsidian 표준 스타일 자동 적용
- TailwindCSS `animate-spin` 클래스는 이미 프로젝트에서 사용 가능
- 수동 테스트는 quickstart.md 참조
