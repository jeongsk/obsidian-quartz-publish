# Tasks: Quartz Publish Plugin

**Input**: Design documents from `/specs/001-quartz-publish/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are not explicitly requested in this feature specification. Test tasks are excluded.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (Obsidian Plugin)

---

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per implementation plan in `src/`
- [x] T002 [P] Define shared type definitions in `src/types.ts`
- [x] T003 [P] Create plugin skeleton with onload/onunload lifecycle in `src/main.ts`
- [x] T004 [P] Configure TailwindCSS v4 with `hn:` prefix in `src/styles/main.css`

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement base GitHubService class with request helper in `src/services/github.ts`
- [x] T006 [P] Implement rate limit handling and error types in `src/services/github.ts`
- [x] T007 [P] Create PluginSettings interface and DEFAULT_SETTINGS in `src/types.ts`
- [x] T008 Implement settings load/save methods in `src/main.ts`
- [x] T009 [P] Create base Modal and SettingTab extensions in `src/ui/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - GitHub 연동 설정 (Priority: P1) 🎯 MVP ✅

**Goal**: 사용자가 GitHub PAT와 Quartz 리포지토리를 연결하여 발행 환경을 구성

**Independent Test**: 설정 탭에서 토큰과 리포지토리 URL을 입력하고 연결 테스트 버튼을 클릭하여 "연결 성공" 메시지를 확인

### Implementation for User Story 1

- [x] T010 [US1] Implement token validation method (GET /user) in `src/services/github.ts`
- [x] T011 [US1] Implement repository info fetcher (GET /repos/{owner}/{repo}) in `src/services/github.ts`
- [x] T012 [US1] Implement Quartz verification (check quartz.config.ts) in `src/services/github.ts`
- [x] T013 [US1] Implement testConnection() combining all validations in `src/services/github.ts`
- [x] T014 [P] [US1] Implement repoUrl parser (extract owner/repo) in `src/services/github.ts`
- [x] T015 [US1] Create QuartzPublishSettingTab class in `src/ui/settings-tab.ts`
- [x] T016 [US1] Add GitHub token input field (password type) in `src/ui/settings-tab.ts`
- [x] T017 [US1] Add repository URL input field in `src/ui/settings-tab.ts`
- [x] T018 [US1] Implement "Test Connection" button with result display in `src/ui/settings-tab.ts`
- [x] T019 [US1] Display connection success info (repo name, branch, last commit) in `src/ui/settings-tab.ts`
- [x] T020 [US1] Display connection error messages (invalid_token, not_found, not_quartz) in `src/ui/settings-tab.ts`
- [x] T021 [US1] Register settings tab in plugin onload in `src/main.ts`

**Checkpoint**: User Story 1 complete - GitHub 연동 설정 및 테스트 가능

---

## Phase 4: User Story 2 - 단일 노트 발행 (Priority: P1) ✅

**Goal**: 사용자가 현재 노트를 Quartz 리포지토리에 발행하여 웹사이트에 공개

**Independent Test**: 노트에 `publish: true` 프론트매터 추가 후 커맨드 팔레트에서 "Publish to Quartz" 실행하여 성공 알림 확인

### Implementation for User Story 2

- [x] T022 [P] [US2] Create ContentTransformer class in `src/services/transformer.ts`
- [x] T023 [US2] Implement frontmatter parser (extract publish, draft, path) in `src/services/transformer.ts`
- [x] T024 [US2] Implement wiki link transformer (`[[note]]` → markdown link or plain text) in `src/services/transformer.ts`
- [x] T025 [US2] Implement image embed transformer (`![[img]]` → static path reference) in `src/services/transformer.ts`
- [x] T026 [US2] Implement remote path resolver (frontmatter path > vault structure) in `src/services/transformer.ts`
- [x] T027 [US2] Implement attachment extractor (find referenced images) in `src/services/transformer.ts`
- [x] T028 [P] [US2] Create PublishRecord and AttachmentRecord types in `src/types.ts`
- [x] T029 [US2] Implement createOrUpdateFile() for markdown in `src/services/github.ts`
- [x] T030 [US2] Implement createOrUpdateFile() for binary (images) in `src/services/github.ts`
- [x] T031 [P] [US2] Create PublishService class in `src/services/publish.ts`
- [x] T032 [US2] Implement publishNote() orchestrating transform + upload in `src/services/publish.ts`
- [x] T033 [US2] Implement attachment upload logic (static/ folder) in `src/services/publish.ts`
- [x] T034 [US2] Implement auto-add `publish: true` to frontmatter if missing in `src/services/publish.ts`
- [x] T035 [US2] Handle draft: true (preserve in uploaded content) in `src/services/publish.ts`
- [x] T036 [US2] Add "Publish current note to Quartz" command in `src/main.ts`
- [x] T037 [US2] Implement success Notice with file path in `src/main.ts`
- [x] T038 [US2] Implement error Notice with clear message in `src/main.ts`

**Checkpoint**: User Story 2 complete - 단일 노트 발행 기능 작동

---

## Phase 5: User Story 3 - 파일 컨텍스트 메뉴 발행 (Priority: P2) ✅

**Goal**: 사용자가 파일 탐색기에서 노트 우클릭으로 빠르게 발행

**Independent Test**: 파일 탐색기에서 노트 우클릭 후 "Publish to Quartz" 메뉴 선택하여 발행

### Implementation for User Story 3

- [x] T039 [US3] Register file-menu event handler in `src/main.ts`
- [x] T040 [US3] Add "Publish to Quartz" menu item for markdown files in `src/main.ts`
- [x] T041 [US3] Connect menu action to publishNote() in `src/main.ts`

**Checkpoint**: User Story 3 complete - 컨텍스트 메뉴 발행 가능

---

## Phase 6: User Story 4 - 발행 상태 대시보드 (Priority: P2)

**Goal**: 사용자가 발행 현황을 한눈에 파악하고 여러 노트를 일괄 관리

**Independent Test**: 커맨드 팔레트에서 "Open Publish Dashboard" 실행하여 상태별 노트 목록 확인

### Implementation for User Story 4

- [ ] T042 [P] [US4] Create StatusService class in `src/services/status.ts`
- [ ] T043 [US4] Implement calculateHash() using SHA-256 in `src/services/status.ts`
- [ ] T044 [US4] Implement getStatus() for single note in `src/services/status.ts`
- [ ] T045 [US4] Implement getAllStatus() returning StatusOverview in `src/services/status.ts`
- [ ] T046 [US4] Implement updateRecord() to save publish record in `src/services/status.ts`
- [ ] T047 [US4] Implement removeRecord() for unpublish in `src/services/status.ts`
- [ ] T048 [P] [US4] Create PublishDashboardModal class extending Modal in `src/ui/dashboard.ts`
- [ ] T049 [US4] Implement status tabs (new, modified, synced, deleted) in `src/ui/dashboard.ts`
- [ ] T050 [US4] Implement note list rendering with checkboxes in `src/ui/dashboard.ts`
- [ ] T051 [US4] Implement select all / deselect all in `src/ui/dashboard.ts`
- [ ] T052 [US4] Implement publishNotes() batch method in `src/services/publish.ts`
- [ ] T053 [US4] Add "Batch Publish" button with progress indicator in `src/ui/dashboard.ts`
- [ ] T054 [US4] Implement progress bar component in `src/ui/components/progress.ts`
- [ ] T055 [US4] Implement deleteFile() for remote removal in `src/services/github.ts`
- [ ] T056 [US4] Implement unpublishNote() in `src/services/publish.ts`
- [ ] T057 [US4] Add "Sync All" button with confirmation modal in `src/ui/dashboard.ts`
- [ ] T058 [US4] Implement syncAll() (publish + update + delete) in `src/services/publish.ts`
- [ ] T059 [US4] Add "Open Publish Dashboard" command in `src/main.ts`

**Checkpoint**: User Story 4 complete - 대시보드로 일괄 관리 가능

---

## Phase 7: User Story 5 - Quartz 설정 변경 (Priority: P3)

**Goal**: 사용자가 플러그인 설정에서 Quartz의 주요 옵션을 변경

**Independent Test**: 설정에서 URL 규칙 변경 후 저장하면 quartz.config.ts가 업데이트됨

### Implementation for User Story 5

- [ ] T060 [P] [US5] Create QuartzConfigService class in `src/services/quartz-config.ts`
- [ ] T061 [US5] Implement getConfig() to fetch and parse quartz.config.ts in `src/services/quartz-config.ts`
- [ ] T062 [US5] Implement setExplicitPublish() to modify plugins.filters in `src/services/quartz-config.ts`
- [ ] T063 [US5] Implement setIgnorePatterns() to modify ignorePatterns in `src/services/quartz-config.ts`
- [ ] T064 [US5] Implement setUrlStrategy() to modify urlStrategy in `src/services/quartz-config.ts`
- [ ] T065 [US5] Add QuartzSettings interface in `src/types.ts`
- [ ] T066 [US5] Add "Quartz Settings" section to settings tab in `src/ui/settings-tab.ts`
- [ ] T067 [US5] Add "Explicit Publish" toggle in `src/ui/settings-tab.ts`
- [ ] T068 [US5] Add "Ignore Patterns" text area in `src/ui/settings-tab.ts`
- [ ] T069 [US5] Add "URL Strategy" dropdown in `src/ui/settings-tab.ts`
- [ ] T070 [US5] Implement save handler that commits config changes in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 5 complete - Quartz 설정 변경 기능 작동

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add network connectivity check before all API calls in `src/services/github.ts`
- [ ] T072 [P] Implement duplicate publish prevention (mutex/flag) in `src/services/publish.ts`
- [ ] T073 [P] Add "already synced" check before publish in `src/services/publish.ts`
- [ ] T074 [P] Implement 10MB file size validation with warning in `src/services/publish.ts`
- [ ] T075 [P] Add conflict confirmation modal for remote changes in `src/ui/components/confirm-modal.ts`
- [ ] T076 Code review and cleanup across all services
- [ ] T077 Verify all TailwindCSS classes use `hn:` prefix in `src/styles/main.css`
- [ ] T078 Build and test plugin in development Obsidian vault

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 & US2 are both P1, but US2 depends on US1 (GitHub service)
  - US3 depends on US2 (uses publishNote)
  - US4 depends on US2 (extends publish functionality)
  - US5 can start after US1 (only needs GitHub service)
- **Polish (Phase 8)**: Depends on core user stories being complete

### User Story Dependencies

```
US1 (GitHub 연동) ─────┬──→ US2 (단일 발행) ──→ US3 (컨텍스트 메뉴)
                      │                      │
                      │                      └──→ US4 (대시보드)
                      │
                      └──→ US5 (Quartz 설정)
```

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (GitHubService)
- **User Story 3 (P2)**: Depends on US2 (publishNote)
- **User Story 4 (P2)**: Depends on US2 (publishNote, extends with batch)
- **User Story 5 (P3)**: Depends on US1 (GitHubService only)

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 ──┬── T002 [P]
       ├── T003 [P]
       └── T004 [P]
```

**Phase 2 (Foundational)**:
```
T005 ──┬── T006 [P]
       ├── T007 [P]
       │
T008 ──┴── T009 [P]
```

**User Story 2 (Phase 4)**:
```
T022 [P] ─┬─ T028 [P]
          └─ T031 [P]
```

**User Story 4 (Phase 6)**:
```
T042 [P] ── T048 [P]
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (GitHub 연동)
4. Complete Phase 4: User Story 2 (단일 노트 발행)
5. **STOP and VALIDATE**: 첫 노트 발행 테스트
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → GitHub 연동 테스트 (MVP Milestone 1)
3. Add User Story 2 → 단일 발행 테스트 (MVP Milestone 2 - **Core Value**)
4. Add User Story 3 → 컨텍스트 메뉴 (Convenience)
5. Add User Story 4 → 대시보드 (Power User)
6. Add User Story 5 → Quartz 설정 (Advanced)

### Suggested MVP Scope

**MVP = US1 + US2** (Phases 1-4, Tasks T001-T038)

이 범위로 사용자가 노트를 Quartz에 발행하는 핵심 가치를 경험할 수 있습니다.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- TailwindCSS classes must use `hn:` prefix per CLAUDE.md
- Obsidian CSS variables should be used for theme compatibility
