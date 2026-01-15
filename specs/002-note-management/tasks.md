# Tasks: 노트 관리 (Note Management)

**Input**: Design documents from `/specs/002-note-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 테스트 태스크가 포함되어 있습니다 (Vitest 기반).

**Organization**: 태스크는 User Story별로 그룹화되어 독립적 구현 및 테스트가 가능합니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 User Story (US1, US2, US3, US4)
- 설명에 정확한 파일 경로 포함

## Path Conventions

- **Project Type**: Obsidian Plugin (Single project)
- **Source**: `src/` at repository root
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (공유 인프라) ✅

**Purpose**: 프로젝트 구조 및 새 파일 초기화

- [x] T001 [P] 새 타입 `DashboardTab`, `DashboardState` 추가 in `src/types.ts`
- [x] T002 [P] StatusService 스켈레톤 파일 생성 in `src/services/status.ts`
- [x] T003 [P] DashboardModal 스켈레톤 파일 생성 in `src/ui/dashboard-modal.ts`
- [x] T004 [P] 대시보드 CSS 클래스 추가 in `src/styles/main.css`

---

## Phase 2: Foundational (핵심 기반) ✅

**Purpose**: 모든 User Story에 필요한 StatusService 핵심 로직

**⚠️ CRITICAL**: User Story 구현 전 반드시 완료 필요

### Tests (TDD)

- [x] T005 [P] StatusService 단위 테스트 작성 - `getPublishableFiles()` in `tests/unit/services/status.test.ts`
- [x] T006 [P] StatusService 단위 테스트 작성 - `calculateFileStatus()` in `tests/unit/services/status.test.ts`
- [x] T007 [P] StatusService 단위 테스트 작성 - `findDeletedNotes()` in `tests/unit/services/status.test.ts`
- [x] T008 StatusService 단위 테스트 작성 - `calculateStatusOverview()` with chunking in `tests/unit/services/status.test.ts`

### Implementation

- [x] T009 `getPublishableFiles()` 구현 - vault에서 publish:true 파일 필터링 in `src/services/status.ts`
- [x] T010 `calculateHash()` 헬퍼 함수 구현 - SHA256 해시 계산 in `src/services/status.ts`
- [x] T011 `calculateFileStatus()` 구현 - 단일 파일 상태 판단 로직 in `src/services/status.ts`
- [x] T012 `findDeletedNotes()` 구현 - 삭제 필요 노트 탐색 in `src/services/status.ts`
- [x] T013 `calculateStatusOverview()` 구현 - 청크 단위 처리 + 진행 콜백 in `src/services/status.ts`

**Checkpoint**: StatusService 완료 - 테스트 통과 확인 (`npm run test`) ✅

---

## Phase 3: User Story 1 - 발행 상태 확인 (Priority: P1) 🎯 MVP ✅

**Goal**: 사용자가 대시보드를 열어 모든 노트의 발행 상태를 탭 UI로 확인

**Independent Test**: 대시보드 열기 → 4개 탭(신규/수정됨/삭제필요/최신)에 노트 목록 표시 확인

### Tests for User Story 1

- [x] T014 [P] [US1] DashboardModal 테스트 - 모달 열기/닫기 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T015 [P] [US1] DashboardModal 테스트 - 탭 전환 동작 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T016 [US1] DashboardModal 테스트 - 상태 로딩 + 프로그레스 in `tests/unit/ui/dashboard-modal.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] DashboardModal 클래스 기본 구조 구현 - Modal 확장, onOpen/onClose in `src/ui/dashboard-modal.ts`
- [x] T018 [US1] 탭 UI 구현 - 4개 탭 버튼 + 활성 탭 스타일 in `src/ui/dashboard-modal.ts`
- [x] T019 [US1] 노트 목록 렌더링 구현 - 파일명, 경로, 수정 시간 표시 in `src/ui/dashboard-modal.ts`
- [x] T020 [US1] 로딩 프로그레스 UI 구현 - 상태 계산 진행률 표시 in `src/ui/dashboard-modal.ts`
- [x] T021 [US1] 탭별 노트 개수 뱃지 표시 구현 in `src/ui/dashboard-modal.ts`
- [x] T022 [US1] StatusService를 main.ts에 통합 in `src/main.ts`
- [x] T023 [US1] 커맨드 팔레트에 'Open Publish Dashboard' 명령 등록 in `src/main.ts`

**Checkpoint**: User Story 1 완료 - 대시보드 열어 상태 확인 가능 ✅

---

## Phase 4: User Story 2 - 선택적 일괄 발행 (Priority: P2) ✅

**Goal**: 사용자가 대시보드에서 여러 노트를 선택하여 한 번에 발행

**Independent Test**: "신규" 탭에서 2개 노트 선택 → "발행" 버튼 클릭 → GitHub에 발행 확인

### Tests for User Story 2

- [x] T024 [P] [US2] 체크박스 선택 테스트 - 선택/해제 토글 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T025 [P] [US2] 일괄 발행 테스트 - 선택된 파일만 발행 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T026 [US2] 발행 프로그레스 테스트 - 진행률 업데이트 in `tests/unit/ui/dashboard-modal.test.ts`

### Implementation for User Story 2

- [x] T027 [US2] 체크박스 선택 UI 구현 - 각 노트 행에 체크박스 in `src/ui/dashboard-modal.ts`
- [x] T028 [US2] 전체 선택/해제 체크박스 구현 in `src/ui/dashboard-modal.ts`
- [x] T029 [US2] selectedPaths 상태 관리 구현 - Set<string> in `src/ui/dashboard-modal.ts`
- [x] T030 [US2] "발행" 버튼 구현 - 비활성화 조건 포함 in `src/ui/dashboard-modal.ts`
- [x] T031 [US2] 일괄 발행 실행 로직 구현 - PublishService.publishNotes() 호출 in `src/ui/dashboard-modal.ts`
- [x] T032 [US2] 발행 프로그레스 바 UI 구현 - 현재/전체, 파일명 표시 in `src/ui/dashboard-modal.ts`
- [x] T033 [US2] 발행 결과 요약 UI 구현 - 성공/실패 카운트, 에러 목록 in `src/ui/dashboard-modal.ts`
- [x] T034 [US2] 발행 완료 후 상태 새로고침 구현 in `src/ui/dashboard-modal.ts`

**Checkpoint**: User Story 2 완료 - 일괄 발행 동작 확인 ✅

---

## Phase 5: User Story 3 - 선택적 일괄 삭제 (Priority: P3) ✅

**Goal**: 사용자가 더 이상 발행하지 않을 노트들을 GitHub에서 일괄 삭제

**Independent Test**: "삭제 필요" 탭에서 노트 선택 → "삭제" 버튼 → 확인 모달 → GitHub에서 삭제 확인

### Tests for User Story 3

- [x] T035 [P] [US3] ConfirmDeleteModal 테스트 - 확인/취소 동작 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T036 [US3] 일괄 삭제 테스트 - 확인 후 삭제 실행 in `tests/unit/ui/dashboard-modal.test.ts`

### Implementation for User Story 3

- [x] T037 [US3] ConfirmDeleteModal 구현 - 확인/취소 버튼, Promise 반환 in `src/ui/dashboard-modal.ts`
- [x] T038 [US3] "삭제" 버튼 구현 - "삭제 필요" 탭에서만 활성화 in `src/ui/dashboard-modal.ts`
- [x] T039 [US3] 일괄 삭제 실행 로직 구현 - 확인 모달 후 순차 삭제 in `src/ui/dashboard-modal.ts`
- [x] T040 [US3] batchUnpublish() 메서드 구현 in `src/main.ts`
- [x] T041 [US3] 삭제 결과 요약 UI 구현 in `src/ui/dashboard-modal.ts`

**Checkpoint**: User Story 3 완료 - 일괄 삭제 동작 확인 ✅

---

## Phase 6: User Story 4 - 전체 동기화 (Priority: P4) ✅

**Goal**: 한 번의 클릭으로 모든 노트 동기화 (신규 발행 + 업데이트 + 삭제)

**Independent Test**: "전체 동기화" 버튼 → 확인 모달 → 모든 변경사항 적용 확인

### Tests for User Story 4

- [x] T042 [US4] 전체 동기화 테스트 - 삭제 포함 시 확인 모달 in `tests/unit/ui/dashboard-modal.test.ts`
- [x] T043 [US4] 전체 동기화 테스트 - 부분 실패 시 결과 표시 in `tests/unit/ui/dashboard-modal.test.ts`

### Implementation for User Story 4

- [x] T044 [US4] SyncConfirmModal 구현 - 동기화 요약 표시 (신규 N개, 수정 N개, 삭제 N개) in `src/ui/dashboard-modal.ts`
- [x] T045 [US4] "전체 동기화" 버튼 구현 in `src/ui/dashboard-modal.ts`
- [x] T046 [US4] 전체 동기화 실행 로직 구현 - 발행 → 삭제 순차 처리 in `src/ui/dashboard-modal.ts`
- [x] T047 [US4] 동기화 결과 요약 UI 구현 - 전체 결과 통합 표시 in `src/ui/dashboard-modal.ts`

**Checkpoint**: User Story 4 완료 - 전체 동기화 동작 확인 ✅

---

## Phase 7: Polish & Cross-Cutting Concerns ✅

**Purpose**: 전체 기능 개선 및 마무리

- [x] T048 [P] 에러 처리 개선 - 네트워크 오류, Rate Limit 안내 메시지 in `src/ui/dashboard-modal.ts`
- [x] T049 [P] 접근성 개선 - 키보드 네비게이션, ARIA 레이블 in `src/ui/dashboard-modal.ts`
- [x] T050 대시보드 스타일 최종 정리 - Obsidian 테마 호환성 확인 in `src/styles/main.css`
- [x] T051 quickstart.md 기반 통합 테스트 수행 및 검증
- [x] T052 코드 정리 및 주석 추가

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존성 없음 - 즉시 시작 가능
- **Phase 2 (Foundational)**: Phase 1 완료 후 - **모든 User Story를 블로킹**
- **Phase 3-6 (User Stories)**: Phase 2 완료 후 시작 가능
  - 순차 진행 권장 (P1 → P2 → P3 → P4)
- **Phase 7 (Polish)**: 모든 User Story 완료 후

### User Story Dependencies

| Story | 의존성 | 독립 테스트 가능 |
|-------|--------|-----------------|
| US1 (발행 상태 확인) | Phase 2 | ✅ |
| US2 (일괄 발행) | US1 (UI 기반) | ✅ |
| US3 (일괄 삭제) | US1 (UI 기반) | ✅ |
| US4 (전체 동기화) | US2, US3 (기능 조합) | ✅ |

### Within Each User Story

1. 테스트 작성 (실패 확인)
2. 구현
3. 테스트 통과 확인
4. 체크포인트에서 독립 테스트

### Parallel Opportunities

- **Phase 1**: T001-T004 모두 병렬 가능
- **Phase 2 Tests**: T005-T007 병렬 가능
- **US1 Tests**: T014-T015 병렬 가능
- **US2 Tests**: T024-T025 병렬 가능
- **Phase 7**: T048-T049 병렬 가능

---

## Parallel Example: Phase 1 Setup

```bash
# 4개 태스크 동시 실행 가능:
Task: "새 타입 추가 in src/types.ts"
Task: "StatusService 스켈레톤 in src/services/status.ts"
Task: "DashboardModal 스켈레톤 in src/ui/dashboard-modal.ts"
Task: "대시보드 CSS in src/styles/main.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (StatusService)
3. Phase 3: User Story 1 완료
4. **STOP and VALIDATE**: 대시보드 열어 상태 확인 테스트
5. 필요시 배포/데모

### Incremental Delivery

1. Setup + Foundational → 기반 완료
2. User Story 1 → 상태 확인 가능 (MVP!)
3. User Story 2 → 일괄 발행 추가
4. User Story 3 → 일괄 삭제 추가
5. User Story 4 → 전체 동기화 추가

### 권장 실행 순서

```
Phase 1 → Phase 2 → Phase 3 (MVP) → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

---

## Summary

| 항목 | 값 |
|------|-----|
| **Total Tasks** | 52 |
| **Phase 1 (Setup)** | 4 |
| **Phase 2 (Foundational)** | 9 |
| **US1 (발행 상태 확인)** | 10 |
| **US2 (일괄 발행)** | 11 |
| **US3 (일괄 삭제)** | 7 |
| **US4 (전체 동기화)** | 6 |
| **Phase 7 (Polish)** | 5 |
| **Parallel Opportunities** | 15 tasks marked [P] |
| **MVP Scope** | Phase 1 + 2 + 3 (23 tasks) |

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음
- [Story] 레이블 = 특정 User Story에 매핑
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 테스트 실패 확인 후 구현
- 각 태스크 또는 논리적 그룹 완료 후 커밋
- 체크포인트에서 Story 독립 검증
