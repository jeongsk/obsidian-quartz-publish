# Tasks: 초보자 지원 (Beginner Support)

**Input**: Design documents from `/specs/006-beginner-support/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 테스트 포함 - Vitest 사용

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Story Mapping

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| US1 | Quartz 리포지토리 자동 생성 | P1 | 버튼 클릭으로 리포지토리 자동 생성 |
| US2 | 리포지토리 이름 지정 | P1 | 사용자 정의 리포지토리 이름 입력 |
| US3 | 배포 가이드 제공 | P2 | GitHub Pages 배포 단계별 안내 |
| US4 | GitHub Actions 자동 설정 | P2 | 워크플로우 활성화 안내 |

> **Note**: US1과 US2는 동일한 모달에서 함께 구현되므로 하나의 Phase로 통합합니다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 타입 정의 및 프로젝트 구조 준비

- [x] T001 [P] Add repository creation types to src/types.ts (RepositoryCreationRequest, CreatedRepository, RepositoryCreationResult, RepositoryCreationError, RepositoryCreationErrorType)
- [x] T002 [P] Add deploy guide types to src/types.ts (DeployGuideStep, QUARTZ_TEMPLATE, DEFAULT_REPO_NAME)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 리포지토리 생성 서비스 - 모든 UI 작업의 핵심 의존성

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create RepositoryCreatorService class in src/services/repository-creator.ts with constructor accepting token
- [x] T004 Implement getCurrentUser() method in src/services/repository-creator.ts
- [x] T005 Implement validateRepositoryName() method in src/services/repository-creator.ts
- [x] T006 Implement checkRepositoryExists() method in src/services/repository-creator.ts
- [x] T007 Implement createFromTemplate() method in src/services/repository-creator.ts using POST /repos/jackyzha0/quartz/generate
- [x] T008 Add error mapping for user-friendly messages in src/services/repository-creator.ts

**Checkpoint**: Foundation ready - RepositoryCreatorService fully implemented and testable

---

## Phase 3: User Story 1+2 - 리포지토리 자동 생성 및 이름 지정 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 설정 화면에서 리포지토리 이름을 입력하고 버튼 클릭으로 Quartz 리포지토리를 자동 생성

**Independent Test**: 설정 화면에서 "Create Quartz Repository" 버튼 클릭 → 리포지토리 이름 입력 → 생성 완료 → Repository URL 자동 설정

### Tests for User Story 1+2

- [x] T009 [P] [US1] Unit test for validateRepositoryName() in tests/unit/services/repository-creator.test.ts
- [x] T010 [P] [US1] Unit test for checkRepositoryExists() in tests/unit/services/repository-creator.test.ts
- [x] T011 [P] [US1] Unit test for createFromTemplate() success case in tests/unit/services/repository-creator.test.ts
- [x] T012 [P] [US1] Unit test for createFromTemplate() error cases in tests/unit/services/repository-creator.test.ts

### Implementation for User Story 1+2

- [x] T013 [US1] Create CreateRepoModal class extending Modal in src/ui/create-repo-modal.ts
- [x] T014 [US1] Implement modal UI with repository name input field in src/ui/create-repo-modal.ts
- [x] T015 [US2] Add visibility dropdown (Public/Private) with GitHub Pro warning in src/ui/create-repo-modal.ts
- [x] T016 [US1] Implement modal state management (idle, validating, creating, success, error) in src/ui/create-repo-modal.ts
- [x] T017 [US1] Implement handleCreate() with validation and API call in src/ui/create-repo-modal.ts
- [x] T018 [US1] Add progress indicator and error display in src/ui/create-repo-modal.ts
- [x] T019 [US1] Add success state with "View Deploy Guide" button in src/ui/create-repo-modal.ts
- [x] T020 [US1] Add "Create Quartz Repository" button to settings-tab.ts (shown when repositoryUrl is empty)
- [x] T021 [US1] Implement onSuccess callback to auto-populate repositoryUrl in settings in src/ui/settings-tab.ts
- [x] T022 [US1] Add TailwindCSS styles with qp: prefix for create-repo-modal in src/styles/main.css

**Checkpoint**: User Story 1+2 완료 - 리포지토리 생성 및 이름 지정 기능 작동

---

## Phase 4: User Story 3+4 - 배포 가이드 제공 (Priority: P2)

**Goal**: 리포지토리 생성 후 GitHub Pages 배포 방법을 단계별 모달로 안내

**Independent Test**: 리포지토리 생성 완료 후 "배포 가이드 보기" 버튼 클릭 → 단계별 가이드 표시 → 외부 링크 클릭 시 브라우저에서 열림

### Implementation for User Story 3+4

- [x] T023 [P] [US3] Define deploy guide steps data (6 steps) in src/ui/deploy-guide-modal.ts
- [x] T024 [US3] Create DeployGuideModal class extending Modal in src/ui/deploy-guide-modal.ts
- [x] T025 [US3] Implement step navigation (Back/Next buttons) in src/ui/deploy-guide-modal.ts
- [x] T026 [US3] Implement step content rendering with title, description, external link in src/ui/deploy-guide-modal.ts
- [x] T027 [US4] Add GitHub Actions setup instructions in step content in src/ui/deploy-guide-modal.ts
- [x] T028 [US3] Implement external link handling (open in browser) in src/ui/deploy-guide-modal.ts
- [x] T029 [US3] Connect DeployGuideModal to CreateRepoModal success state in src/ui/create-repo-modal.ts
- [x] T030 [US3] Add TailwindCSS styles with qp: prefix for deploy-guide-modal in src/styles/main.css

**Checkpoint**: User Story 3+4 완료 - 배포 가이드 기능 작동

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 마무리 작업 및 품질 개선

- [x] T031 [P] Add JSDoc comments to all public methods in src/services/repository-creator.ts
- [x] T032 [P] Add JSDoc comments to modal classes in src/ui/create-repo-modal.ts and src/ui/deploy-guide-modal.ts
- [x] T033 Export new modules from appropriate index files
- [x] T034 Run npm run lint and fix any issues
- [x] T035 Run npm run build and verify no errors
- [x] T036 Run npm run test and verify all tests pass
- [ ] T037 Manual E2E test: Full flow from settings → create repo → deploy guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Story 1+2 (Phase 3)**: Depends on Phase 2 completion
- **User Story 3+4 (Phase 4)**: Depends on Phase 3 completion (needs CreateRepoModal success state)
- **Polish (Phase 5)**: Depends on all user stories being complete

### Within Each Phase

```
Phase 1: T001, T002 can run in parallel

Phase 2: T003 → T004 → T005 → T006 → T007 → T008 (sequential - building on service)

Phase 3: 
  Tests (T009-T012) can run in parallel
  Then: T013 → T014 → T015 → T016 → T017 → T018 → T019
  Parallel: T020, T021 (after T019)
  T022 can run anytime

Phase 4:
  T023 (parallel with T024)
  T024 → T025 → T026 → T027 → T028
  T029 (after T019 and T024)
  T030 can run anytime

Phase 5: All [P] tasks can run in parallel
```

### Parallel Opportunities

- Phase 1: T001, T002 (different type groups)
- Phase 3 Tests: T009, T010, T011, T012 (different test cases)
- Phase 4: T023, T024 (data definition and class creation)
- Phase 5: T031, T032 (different files)

---

## Parallel Example: Phase 3 Tests

```bash
# Launch all tests for User Story 1+2 together:
Task: "Unit test for validateRepositoryName() in tests/unit/services/repository-creator.test.ts"
Task: "Unit test for checkRepositoryExists() in tests/unit/services/repository-creator.test.ts"
Task: "Unit test for createFromTemplate() success case in tests/unit/services/repository-creator.test.ts"
Task: "Unit test for createFromTemplate() error cases in tests/unit/services/repository-creator.test.ts"
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (타입 정의)
2. Complete Phase 2: Foundational (서비스 구현)
3. Complete Phase 3: User Story 1+2 (리포지토리 생성 모달)
4. **STOP and VALIDATE**: Test repository creation independently
5. Deploy/demo if ready - 핵심 기능 완료

### Full Feature Delivery

1. Complete MVP (Phase 1-3)
2. Add Phase 4: User Story 3+4 (배포 가이드)
3. Complete Phase 5: Polish
4. Final E2E test

---

## Task Summary

| Phase | Task Count | Status |
|-------|------------|--------|
| Phase 1: Setup | 2 | ✅ Complete |
| Phase 2: Foundational | 6 | ✅ Complete |
| Phase 3: US1+2 (P1) | 14 | ✅ Complete |
| Phase 4: US3+4 (P2) | 8 | ✅ Complete |
| Phase 5: Polish | 7 | ⏳ 6/7 (Manual E2E pending) |
| **Total** | **37** | **36/37** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1+US2는 동일한 모달에서 구현되므로 함께 진행
- US3+US4는 배포 가이드 모달에서 함께 구현
- TailwindCSS 클래스는 반드시 `qp:` 프리픽스 사용
- Commit after each task or logical group
