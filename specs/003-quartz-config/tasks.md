# Tasks: Quartz 설정 관리

**Input**: Design documents from `/specs/003-quartz-config/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 테스트는 각 User Story 내에서 구현과 함께 진행 (TDD 방식)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 타입 정의 및 공통 유틸리티 추가

- [x] T001 [P] Add QuartzConfigFile, QuartzVersionInfo, QuartzUpgradeProgress types in `src/types.ts`
- [x] T002 [P] Add INITIAL_UPGRADE_PROGRESS constant in `src/types.ts`
- [x] T003 [P] Create glob pattern validator utility in `src/utils/glob-validator.ts`
- [x] T004 [P] Create glob-validator unit tests in `tests/unit/utils/glob-validator.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story가 의존하는 핵심 서비스 구현

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create QuartzConfigService class with parseConfig method in `src/services/quartz-config.ts`
- [x] T006 Add parseStringArray helper method in `src/services/quartz-config.ts`
- [x] T007 [P] Create quartz-config.test.ts with parseConfig tests in `tests/unit/services/quartz-config.test.ts`
- [x] T008 Add getLatestRelease method to GitHubService in `src/services/github.ts`
- [x] T009 Add getExternalTree method to GitHubService in `src/services/github.ts`
- [x] T010 Add getExternalFileContent method to GitHubService in `src/services/github.ts`

**Checkpoint**: Foundation ready - QuartzConfigService can parse configs, GitHubService can fetch external repo data

---

## Phase 3: User Story 1 - ExplicitPublish 설정 변경 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 "일부만 공개" 토글을 변경하면 `quartz.config.ts`의 `plugins.filters` 배열이 수정되고 GitHub에 즉시 커밋됨

**Independent Test**: 토글 on/off 후 GitHub에서 `ExplicitPublish()` 또는 `RemoveDrafts()` 존재 여부 확인

### Implementation for User Story 1

- [x] T011 [US1] Add setExplicitPublish method to QuartzConfigService in `src/services/quartz-config.ts`
- [x] T012 [P] [US1] Add setExplicitPublish unit tests in `tests/unit/services/quartz-config.test.ts`
- [x] T013 [US1] Add fetchQuartzConfig method to load remote config in `src/services/quartz-config.ts`
- [x] T014 [US1] Add commitConfigChange method for instant commit in `src/services/quartz-config.ts`
- [x] T015 [US1] Add renderQuartzSettingsSection method to SettingsTab in `src/ui/settings-tab.ts`
- [x] T016 [US1] Implement ExplicitPublish toggle UI with onChange handler in `src/ui/settings-tab.ts`
- [x] T017 [US1] Add success/error Notice feedback for ExplicitPublish toggle in `src/ui/settings-tab.ts`
- [x] T018 [US1] Add loading state indicator during commit in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 1 complete - ExplicitPublish toggle works end-to-end

---

## Phase 4: User Story 2 - 제외 패턴 설정 (Priority: P2)

**Goal**: 사용자가 제외 패턴(glob)을 추가/삭제하면 `quartz.config.ts`의 `ignorePatterns` 배열이 수정되고 GitHub에 즉시 커밋됨

**Independent Test**: 패턴 추가 후 GitHub에서 `ignorePatterns` 배열에 해당 패턴 존재 확인

### Implementation for User Story 2

- [x] T019 [US2] Add setIgnorePatterns method to QuartzConfigService in `src/services/quartz-config.ts`
- [x] T020 [P] [US2] Add setIgnorePatterns unit tests in `tests/unit/services/quartz-config.test.ts`
- [x] T021 [US2] Implement ignore patterns list UI with add/remove buttons in `src/ui/settings-tab.ts`
- [x] T022 [US2] Add pattern input validation using glob-validator in `src/ui/settings-tab.ts`
- [x] T023 [US2] Add inline error message display for invalid patterns in `src/ui/settings-tab.ts`
- [x] T024 [US2] Wire up add/remove pattern handlers with instant commit in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 2 complete - Ignore patterns management works end-to-end

---

## Phase 5: User Story 3 - URL 전략 변경 (Priority: P3)

**Goal**: 사용자가 URL 전략 드롭다운을 변경하면 `quartz.config.ts`의 `urlStrategy` 값이 수정되고 GitHub에 즉시 커밋됨

**Independent Test**: URL 전략 변경 후 GitHub에서 `urlStrategy` 값 확인

### Implementation for User Story 3

- [x] T025 [US3] Add setUrlStrategy method to QuartzConfigService in `src/services/quartz-config.ts`
- [x] T026 [P] [US3] Add setUrlStrategy unit tests in `tests/unit/services/quartz-config.test.ts`
- [x] T027 [US3] Implement URL strategy dropdown UI in `src/ui/settings-tab.ts`
- [x] T028 [US3] Wire up dropdown onChange handler with instant commit in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 3 complete - URL strategy selection works end-to-end

---

## Phase 6: User Story 4 - Quartz 업그레이드 (Priority: P4)

**Goal**: 사용자가 설정 화면에서 Quartz 최신 버전을 확인하고 원클릭으로 업그레이드 가능. 기존 설정 보존

**Independent Test**: 업그레이드 버튼 클릭 후 GitHub에서 Quartz 코어 파일 업데이트 확인, `quartz.config.ts` 설정 보존 확인

### Implementation for User Story 4

- [x] T029 [US4] Create QuartzUpgradeService class in `src/services/quartz-upgrade.ts`
- [x] T030 [US4] Implement getCurrentVersion method in `src/services/quartz-upgrade.ts`
- [x] T031 [US4] Implement getLatestVersion method in `src/services/quartz-upgrade.ts`
- [x] T032 [US4] Implement checkVersion method in `src/services/quartz-upgrade.ts`
- [x] T033 [P] [US4] Add checkVersion unit tests in `tests/unit/services/quartz-upgrade.test.ts`
- [x] T034 [US4] Implement getUpgradeFiles method (fetch quartz/ folder files) in `src/services/quartz-upgrade.ts`
- [x] T035 [US4] Implement upgrade method with progress callback in `src/services/quartz-upgrade.ts`
- [x] T036 [US4] Implement abort method to cancel upgrade in `src/services/quartz-upgrade.ts`
- [x] T037 [P] [US4] Add upgrade method unit tests in `tests/unit/services/quartz-upgrade.test.ts`
- [x] T038 [US4] Implement version info display UI in `src/ui/settings-tab.ts`
- [x] T039 [US4] Implement upgrade button with disabled state in `src/ui/settings-tab.ts`
- [x] T040 [US4] Implement upgrade progress indicator UI in `src/ui/settings-tab.ts`
- [x] T041 [US4] Wire up upgrade button click handler in `src/ui/settings-tab.ts`
- [x] T042 [US4] Add success/error handling for upgrade completion in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 4 complete - Quartz upgrade works end-to-end

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 전체 기능 개선 및 마무리

- [ ] T043 [P] Add error handling for network offline state in `src/ui/settings-tab.ts`
- [ ] T044 [P] Add Rate Limit error handling with retry time display in `src/ui/settings-tab.ts`
- [ ] T045 [P] Add config file parse error handling with manual fix guidance in `src/ui/settings-tab.ts`
- [x] T046 Run all tests and fix any failures via `npm run test`
- [x] T047 Run linter and fix issues via `npm run lint:fix`
- [x] T048 Run build and verify no type errors via `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1, US2, US3 can proceed in parallel after Foundational
  - US4 depends on GitHubService extensions from Foundational
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on QuartzConfigService.parseConfig, GitHubService.getFile/createOrUpdateFile
- **User Story 2 (P2)**: Depends on glob-validator, QuartzConfigService.parseConfig
- **User Story 3 (P3)**: Depends on QuartzConfigService.parseConfig
- **User Story 4 (P4)**: Depends on GitHubService.getLatestRelease, getExternalTree, getExternalFileContent

### Within Each User Story

- Service methods before UI implementation
- Unit tests alongside implementation (TDD)
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002, T003, T004 can run in parallel (Setup phase)
- T007 can run parallel with T008-T010 (Foundational tests vs GitHub methods)
- T012 can run parallel with T011 (tests alongside implementation)
- T020 can run parallel with T019 (tests alongside implementation)
- T026 can run parallel with T025 (tests alongside implementation)
- T033, T037 can run parallel with implementation (tests alongside)
- T043, T044, T045 can run in parallel (independent error handlers)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all Setup tasks together:
Task: "Add QuartzConfigFile, QuartzVersionInfo, QuartzUpgradeProgress types in src/types.ts"
Task: "Add INITIAL_UPGRADE_PROGRESS constant in src/types.ts"
Task: "Create glob pattern validator utility in src/utils/glob-validator.ts"
Task: "Create glob-validator unit tests in tests/unit/utils/glob-validator.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (타입, 유틸리티)
2. Complete Phase 2: Foundational (QuartzConfigService.parseConfig, GitHubService 확장)
3. Complete Phase 3: User Story 1 (ExplicitPublish 토글)
4. **STOP and VALIDATE**: 토글 변경 → GitHub 커밋 확인
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → 기본 MVP 완성
3. Add User Story 2 → Test independently → 제외 패턴 기능 추가
4. Add User Story 3 → Test independently → URL 전략 기능 추가
5. Add User Story 4 → Test independently → 업그레이드 기능 추가
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [USx] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- TailwindCSS 클래스는 `hn:` 프리픽스 사용 (CLAUDE.md 규칙)
