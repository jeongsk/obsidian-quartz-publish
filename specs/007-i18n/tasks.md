# Tasks: Internationalization (i18n) Support

**Input**: Design documents from `/specs/001-i18n/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included as unit tests for i18n infrastructure validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: i18n 모듈 기본 구조 생성

- [ ] T001 Create i18n directory structure at src/i18n/
- [ ] T002 [P] Create English translation file at src/i18n/locales/en.ts with all ~150 translation keys
- [ ] T003 [P] Create Korean translation file at src/i18n/locales/ko.ts with all translations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core i18n infrastructure that MUST be complete before UI migration

**⚠️ CRITICAL**: No UI migration can begin until this phase is complete

- [ ] T004 Implement initI18n() and t() functions in src/i18n/index.ts
- [ ] T005 [P] Create unit tests for t() function in tests/i18n/t.test.ts
- [ ] T006 [P] Create translation key completeness test in tests/i18n/keys.test.ts
- [ ] T007 Add initI18n() call in src/main.ts onload()
- [ ] T008 Run tests and verify all pass

**Checkpoint**: i18n infrastructure ready - UI migration can now begin

---

## Phase 3: User Story 1 - Language Matching on Plugin Load (Priority: P1) 🎯 MVP

**Goal**: 플러그인이 Obsidian 언어 설정을 감지하여 자동으로 해당 언어로 UI 표시

**Independent Test**: Obsidian 언어를 한국어로 변경 후 플러그인 로드 시 한국어 UI 확인

### Implementation for User Story 1

- [ ] T009 [US1] Add command translations in src/main.ts (publishNote, openDashboard)
- [ ] T010 [US1] Add ribbon icon tooltip translations in src/main.ts
- [ ] T011 [US1] Add file menu item translation in src/main.ts
- [ ] T012 [US1] Add Notice messages translation in src/main.ts
- [ ] T013 [US1] Verify language detection works with moment.locale()

**Checkpoint**: Core plugin entry points display in correct language

---

## Phase 4: User Story 2 - Korean UI Experience (Priority: P2)

**Goal**: 한국어 사용자가 모든 기능을 한국어로 사용

**Independent Test**: 한국어 환경에서 설정 탭, 대시보드 열어 모든 텍스트가 한국어인지 확인

### Implementation for User Story 2 - Settings Tab

- [ ] T014 [P] [US2] Migrate GitHub section in src/ui/settings-tab.ts
- [ ] T015 [P] [US2] Migrate Auto Date section in src/ui/settings-tab.ts
- [ ] T016 [P] [US2] Migrate Quartz Configuration section in src/ui/settings-tab.ts
- [ ] T017 [P] [US2] Migrate Upgrade section in src/ui/settings-tab.ts
- [ ] T018 [P] [US2] Migrate error messages in src/ui/settings-tab.ts

### Implementation for User Story 2 - Settings Sections

- [ ] T019 [P] [US2] Migrate Site Info section in src/ui/sections/site-info-section.ts
- [ ] T020 [P] [US2] Migrate Behavior section in src/ui/sections/behavior-section.ts
- [ ] T021 [P] [US2] Migrate Analytics section in src/ui/sections/analytics-section.ts
- [ ] T022 [P] [US2] Migrate Publishing section in src/ui/sections/publishing-section.ts

### Implementation for User Story 2 - Dashboard

- [ ] T023 [US2] Migrate dashboard header and tabs in src/ui/dashboard-modal.ts
- [ ] T024 [US2] Migrate dashboard action buttons in src/ui/dashboard-modal.ts
- [ ] T025 [US2] Migrate dashboard status messages in src/ui/dashboard-modal.ts
- [ ] T026 [US2] Migrate dashboard empty states in src/ui/dashboard-modal.ts
- [ ] T027 [US2] Migrate TAB_LABELS constant in src/types.ts

### Implementation for User Story 2 - Modals

- [ ] T028 [P] [US2] Migrate Create Repo modal in src/ui/create-repo-modal.ts
- [ ] T029 [P] [US2] Migrate Deploy Guide modal in src/ui/deploy-guide-modal.ts
- [ ] T030 [P] [US2] Migrate Large File Warning modal in src/ui/large-file-warning-modal.ts
- [ ] T031 [P] [US2] Migrate Confirm modal in src/ui/components/confirm-modal.ts
- [ ] T032 [P] [US2] Migrate Conflict modal in src/ui/components/conflict-modal.ts
- [ ] T033 [P] [US2] Migrate Apply Button in src/ui/components/apply-button.ts
- [ ] T034 [P] [US2] Migrate Unsaved Warning in src/ui/components/unsaved-warning.ts

**Checkpoint**: All UI components display Korean text correctly

---

## Phase 5: User Story 3 - English UI Experience (Priority: P2)

**Goal**: 영어 사용자가 모든 기능을 영어로 사용

**Independent Test**: 영어 환경에서 설정 탭, 대시보드 열어 모든 텍스트가 영어인지 확인

### Implementation for User Story 3

- [ ] T035 [US3] Verify all English translations in src/i18n/locales/en.ts are grammatically correct
- [ ] T036 [US3] Verify English fallback works for missing Korean keys
- [ ] T037 [US3] Test all UI components display English correctly when locale is 'en'

**Checkpoint**: All UI components display English text correctly

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T038 Run translation key completeness test to verify 100% coverage
- [ ] T039 [P] Verify no hardcoded Korean/English strings remain in UI files
- [ ] T040 [P] Test unsupported language fallback to English
- [ ] T041 Run npm run build and verify no TypeScript errors
- [ ] T042 Run npm run test and verify all tests pass
- [ ] T043 Manual test: Korean environment full flow
- [ ] T044 Manual test: English environment full flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all UI migration
- **User Story 1 (Phase 3)**: Depends on Foundational - core entry points
- **User Story 2 (Phase 4)**: Depends on Foundational - full Korean UI
- **User Story 3 (Phase 5)**: Depends on Foundational - verify English UI
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Can run parallel with US1
- **User Story 3 (P2)**: Should run after US2 to verify English fallback works

### Within Each User Story

- T002, T003 (translation files) must complete before T004 (i18n functions)
- T004 (i18n functions) must complete before any UI migration
- Settings sections (T019-T022) can run in parallel
- Modal migrations (T028-T034) can run in parallel
- Dashboard tasks (T023-T027) should run sequentially

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002 (en.ts) || T003 (ko.ts)
```

**Phase 2 (Foundational)**:
```
T005 (t.test.ts) || T006 (keys.test.ts)
```

**Phase 4 (User Story 2 - Settings)**:
```
T014 || T015 || T016 || T017 || T018
T019 || T020 || T021 || T022
T028 || T029 || T030 || T031 || T032 || T033 || T034
```

---

## Parallel Example: User Story 2 Settings Sections

```bash
# Launch all settings section migrations together:
Task: "Migrate Site Info section in src/ui/sections/site-info-section.ts"
Task: "Migrate Behavior section in src/ui/sections/behavior-section.ts"
Task: "Migrate Analytics section in src/ui/sections/analytics-section.ts"
Task: "Migrate Publishing section in src/ui/sections/publishing-section.ts"

# Launch all modal migrations together:
Task: "Migrate Create Repo modal in src/ui/create-repo-modal.ts"
Task: "Migrate Confirm modal in src/ui/components/confirm-modal.ts"
Task: "Migrate Conflict modal in src/ui/components/conflict-modal.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008)
3. Complete Phase 3: User Story 1 (T009-T013)
4. **STOP and VALIDATE**: Test language detection and core UI
5. Plugin is now usable with basic i18n support

### Incremental Delivery

1. Setup + Foundational → i18n infrastructure ready
2. Add User Story 1 → Core entry points translated (MVP!)
3. Add User Story 2 → Full Korean UI experience
4. Add User Story 3 → Verify English UI experience
5. Each story adds value without breaking previous work

### Estimated Task Counts

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Setup | 3 | 2 |
| Foundational | 5 | 2 |
| User Story 1 | 5 | 0 |
| User Story 2 | 21 | 18 |
| User Story 3 | 3 | 0 |
| Polish | 7 | 2 |
| **Total** | **44** | **24** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All translations must use t() function from src/i18n/index.ts
- Keep en.ts as the source of truth for translation keys
- ko.ts should be Partial<typeof en> to allow fallback
- Verify no TypeScript errors after each migration task
- Commit after each logical group of tasks
