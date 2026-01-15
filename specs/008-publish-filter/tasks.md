# Tasks: Publish Filter & Home Page Configuration

**Input**: Design documents from `/specs/008-publish-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Tests are included as the plan.md indicates Vitest testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (Obsidian Plugin structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and shared utilities needed by all user stories

- [x] T001 Add `PublishFilterSettings` interface and defaults in `src/types.ts`
- [x] T002 Add `publishFilterSettings` field to `PluginSettings` interface in `src/types.ts`
- [x] T003 [P] Add i18n translations for filter settings in `src/i18n/locales/en.ts`
- [x] T004 [P] Add i18n translations for filter settings in `src/i18n/locales/ko.ts`
- [x] T005 [P] Create path matching utility `isPathInFolder()` in `src/utils/path-matcher.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core filtering service infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create `PublishFilterService` class skeleton in `src/services/publish-filter.ts`
- [x] T007 Implement `shouldPublish(file: TFile): boolean` base method in `src/services/publish-filter.ts`
- [x] T008 Implement `getPublishPath(file: TFile): string` method in `src/services/publish-filter.ts`
- [x] T009 [P] Create unit test file `tests/unit/publish-filter.test.ts` with test setup
- [x] T010 [P] Create unit test file `tests/unit/path-matcher.test.ts` for path utilities
- [x] T011 Integrate `PublishFilterService` into `PublishService` constructor in `src/services/publish.ts`
- [x] T012 Apply filter in `PublishService.publishNote()` method in `src/services/publish.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 & 2 - Include/Exclude Folders (Priority: P1) 🎯 MVP

**Goal**: Users can specify folders to include in publishing, and folders to exclude from publishing

**Independent Test**: Configure include/exclude folders in settings, run publish, verify only matching files are uploaded

### Tests for User Story 1 & 2

- [x] T013 [P] [US1] Unit test: `isInIncludedFolder()` returns true for files in included folders in `tests/unit/publish-filter.test.ts`
- [x] T014 [P] [US1] Unit test: `isInIncludedFolder()` returns true for all files when includeFolders is empty in `tests/unit/publish-filter.test.ts`
- [x] T015 [P] [US2] Unit test: `isInExcludedFolder()` returns true for files in excluded folders in `tests/unit/publish-filter.test.ts`
- [x] T016 [P] [US2] Unit test: Exclude rule takes priority over include rule in `tests/unit/publish-filter.test.ts`
- [x] T017 [P] [US1] Unit test: Nested folders are correctly matched in `tests/unit/path-matcher.test.ts`

### Implementation for User Story 1 & 2

- [x] T018 [US1] Implement `isInIncludedFolder(file: TFile): boolean` method in `src/services/publish-filter.ts`
- [x] T019 [US2] Implement `isInExcludedFolder(file: TFile): boolean` method in `src/services/publish-filter.ts`
- [x] T020 [US1] [US2] Update `shouldPublish()` to call folder filter methods in `src/services/publish-filter.ts`

### UI for User Story 1 & 2

- [x] T021 [P] [US1] [US2] Create `PublishFilterSection` component skeleton in `src/ui/sections/publish-filter-section.ts`
- [x] T022 [US1] Add "Include Folders" textarea setting in `src/ui/sections/publish-filter-section.ts`
- [x] T023 [US2] Add "Exclude Folders" textarea setting in `src/ui/sections/publish-filter-section.ts`
- [x] T024 [US1] [US2] Add folder validation warning for non-existent paths in `src/ui/sections/publish-filter-section.ts`
- [x] T025 [US1] [US2] Integrate `PublishFilterSection` into settings tab in `src/ui/settings-tab.ts`
- [x] T026 [US1] [US2] Add onChange handlers to save settings via `PendingChangesManager` pattern in `src/ui/sections/publish-filter-section.ts`

**Checkpoint**: Users can now include/exclude specific folders from publishing

---

## Phase 4: User Story 3 - Exclude Notes by Tag (Priority: P2)

**Goal**: Users can exclude notes with specific tags from publishing

**Independent Test**: Add `#private` tag to a note, configure exclude tags, verify note is excluded from publish

### Tests for User Story 3

- [x] T027 [P] [US3] Unit test: `hasExcludedTag()` returns true when note has excluded tag in `tests/unit/publish-filter.test.ts`
- [x] T028 [P] [US3] Unit test: `hasExcludedTag()` handles multiple tags correctly in `tests/unit/publish-filter.test.ts`
- [x] T029 [P] [US3] Unit test: Tag matching is case-insensitive in `tests/unit/publish-filter.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Implement `getFileTags(file: TFile): string[]` helper using MetadataCache in `src/services/publish-filter.ts`
- [x] T031 [US3] Implement `hasExcludedTag(file: TFile): boolean` method in `src/services/publish-filter.ts`
- [x] T032 [US3] Update `shouldPublish()` to call tag filter method in `src/services/publish-filter.ts`

### UI for User Story 3

- [x] T033 [US3] Add "Exclude Tags" textarea setting in `src/ui/sections/publish-filter-section.ts`
- [x] T034 [US3] Implement tag normalization (remove `#` prefix) in input handler in `src/ui/sections/publish-filter-section.ts`

**Checkpoint**: Users can now exclude notes by tag

---

## Phase 5: User Story 4 - Set Root Folder for Publishing (Priority: P2)

**Goal**: Users can set a folder as the Quartz root, stripping that folder prefix from published paths

**Independent Test**: Set "Blog" as root folder, publish "Blog/posts/hello.md", verify it appears at "/posts/hello" in Quartz

### Tests for User Story 4

- [x] T035 [P] [US4] Unit test: `isInRootFolder()` returns true for files inside root folder in `tests/unit/publish-filter.test.ts`
- [x] T036 [P] [US4] Unit test: `isInRootFolder()` returns false for files outside root folder in `tests/unit/publish-filter.test.ts`
- [x] T037 [P] [US4] Unit test: `getPublishPath()` strips root folder prefix correctly in `tests/unit/publish-filter.test.ts`
- [x] T038 [P] [US4] Unit test: `getPublishPath()` returns original path when no root folder set in `tests/unit/publish-filter.test.ts`

### Implementation for User Story 4

- [x] T039 [US4] Implement `isInRootFolder(file: TFile): boolean` method in `src/services/publish-filter.ts`
- [x] T040 [US4] Update `getPublishPath()` to strip root folder prefix in `src/services/publish-filter.ts`
- [x] T041 [US4] Update `shouldPublish()` to exclude files outside root folder in `src/services/publish-filter.ts`
- [x] T042 [US4] Update `ContentTransformer.getRemotePath()` to use filtered path in `src/services/transformer.ts`

### UI for User Story 4

- [x] T043 [US4] Add "Root Folder" dropdown/text setting in `src/ui/sections/publish-filter-section.ts`
- [x] T044 [US4] Add folder picker suggestion for root folder input in `src/ui/sections/publish-filter-section.ts`

**Checkpoint**: Users can now set a root folder for URL structure control

---

## Phase 6: User Story 5 - Configure Home Page (Priority: P3)

**Goal**: Users can designate a note to be published as the Quartz home page (`content/index.md`)

**Independent Test**: Set "Welcome.md" as home page, publish, verify it appears as `content/index.md` in the repository

### Tests for User Story 5

- [x] T045 [P] [US5] Unit test: `isHomePage()` returns true for designated home page note in `tests/unit/publish-filter.test.ts`
- [x] T046 [P] [US5] Unit test: `getHomePageRemotePath()` returns "index.md" when home page is set in `tests/unit/publish-filter.test.ts`
- [x] T047 [P] [US5] Unit test: Home page note bypasses exclude filters in `tests/unit/publish-filter.test.ts`

### Implementation for User Story 5

- [x] T048 [US5] Implement `isHomePage(file: TFile): boolean` method in `src/services/publish-filter.ts`
- [x] T049 [US5] Implement `getHomePageRemotePath(): string | null` method in `src/services/publish-filter.ts`
- [x] T050 [US5] Update `shouldPublish()` to always return true for home page note in `src/services/publish-filter.ts`
- [x] T051 [US5] Update `PublishService.publishNote()` to handle home page special path in `src/services/publish.ts`
- [x] T052 [US5] Ensure home page is uploaded to `content/index.md` path in `src/services/publish.ts`

### UI for User Story 5

- [x] T053 [US5] Add "Home Page" note picker/text setting in `src/ui/sections/publish-filter-section.ts`
- [x] T054 [US5] Add note file suggestion for home page input in `src/ui/sections/publish-filter-section.ts`
- [x] T055 [US5] Add validation for .md file extension in home page path in `src/ui/sections/publish-filter-section.ts`

**Checkpoint**: Users can now configure a custom home page

---

## Phase 7: Integration & Status Service

**Purpose**: Update status service to respect filter settings and add integration tests

- [x] T056 Update `StatusService` to filter files using `PublishFilterService` in `src/services/status.ts`
- [x] T057 Ensure dashboard only shows filtered files in status overview in `src/services/status.ts`
- [ ] T058 [P] Create integration test for full publish flow with filters in `tests/integration/publish-filter-integration.test.ts`
- [ ] T059 [P] Integration test: Verify filtered files are not uploaded to GitHub in `tests/integration/publish-filter-integration.test.ts`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and cleanup

- [x] T060 [P] Add JSDoc comments to all public methods in `src/services/publish-filter.ts`
- [x] T061 [P] Add JSDoc comments to `PublishFilterSection` in `src/ui/sections/publish-filter-section.ts`
- [x] T062 Add settings migration for existing users (default empty filter settings) in `src/main.ts`
- [x] T063 Add error handling for invalid folder/file paths in filter service in `src/services/publish-filter.ts`
- [ ] T064 [P] Update README.md with filter settings documentation (optional)
- [x] T065 Run full test suite and verify all tests pass
- [x] T066 Run `npm run build` and verify production build succeeds
- [ ] T067 Manual testing: Verify filter settings persist after plugin reload

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories 1&2 (Phase 3)**: Depends on Foundational phase completion
- **User Story 3 (Phase 4)**: Depends on Phase 3 UI skeleton (T021)
- **User Story 4 (Phase 5)**: Depends on Foundational phase completion
- **User Story 5 (Phase 6)**: Depends on Foundational phase completion
- **Integration (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on all implementation phases

### User Story Dependencies

- **User Story 1 & 2 (P1)**: Can start after Foundational - Combined as they share UI components
- **User Story 3 (P2)**: Can start after Phase 3 UI skeleton - Adds to existing UI
- **User Story 4 (P2)**: Can start after Foundational - Independent of US1/2/3
- **User Story 5 (P3)**: Can start after Foundational - Independent of other stories

### Within Each User Story

- Tests should be written and FAIL before implementation
- Service methods before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup):**
- T003, T004, T005 can run in parallel

**Phase 2 (Foundational):**
- T009, T010 can run in parallel

**Phase 3 (US1 & US2):**
- T013, T014, T015, T016, T017 (all tests) can run in parallel
- T021 (UI skeleton) can run parallel with T018, T019

**Phase 4 (US3):**
- T027, T028, T029 (all tests) can run in parallel

**Phase 5 (US4):**
- T035, T036, T037, T038 (all tests) can run in parallel

**Phase 6 (US5):**
- T045, T046, T047 (all tests) can run in parallel

**Phase 7 (Integration):**
- T058, T059 can run in parallel

**Phase 8 (Polish):**
- T060, T061, T064 can run in parallel

---

## Parallel Example: User Story 1 & 2

```bash
# Launch all tests together:
Task: T013 "Unit test: isInIncludedFolder() returns true for files in included folders"
Task: T014 "Unit test: isInIncludedFolder() returns true for all files when includeFolders is empty"
Task: T015 "Unit test: isInExcludedFolder() returns true for files in excluded folders"
Task: T016 "Unit test: Exclude rule takes priority over include rule"
Task: T017 "Unit test: Nested folders are correctly matched"

# After tests fail, implement in parallel where possible:
Task: T018 "Implement isInIncludedFolder() method"
Task: T019 "Implement isInExcludedFolder() method"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T012)
3. Complete Phase 3: User Stories 1 & 2 (T013-T026)
4. **STOP and VALIDATE**: Test folder include/exclude independently
5. Deploy/demo if ready - users can now filter by folders!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 & US2 → Test → Deploy (MVP: Folder filtering!)
3. Add US3 → Test → Deploy (Tag filtering added)
4. Add US4 → Test → Deploy (Root folder added)
5. Add US5 → Test → Deploy (Home page config added)
6. Each story adds value without breaking previous stories

### Single Developer Strategy

Recommended execution order:
1. T001-T005 (Setup)
2. T006-T012 (Foundational)
3. T013-T026 (US1 & US2 - MVP)
4. T027-T034 (US3)
5. T035-T044 (US4)
6. T045-T055 (US5)
7. T056-T059 (Integration)
8. T060-T067 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are combined in Phase 3 as they share the same UI components and are both P1 priority
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- TailwindCSS classes must use `qp:` prefix
- Follow existing `SiteInfoSection`, `BehaviorSection` patterns for UI
