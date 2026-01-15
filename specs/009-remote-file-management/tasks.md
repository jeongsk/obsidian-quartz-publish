# Tasks: 원격 저장소 파일 관리

**Input**: Design documents from `/specs/009-remote-file-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Not explicitly requested - test tasks excluded

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths based on existing Obsidian plugin structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 타입 정의 및 i18n 키 추가

- [x] T001 [P] Add PublishedFile, DuplicateGroup, DeleteResult interfaces to `src/types.ts`
- [x] T002 [P] Add RemoteFileManagerConfig interface to `src/types.ts`
- [x] T003 [P] Add remote file management i18n keys (20+ keys) to `src/i18n/locales/en.ts`
- [x] T004 [P] Add remote file management i18n keys (20+ keys) to `src/i18n/locales/ko.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: GitHubService 확장 - 모든 User Story가 의존하는 핵심 API

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add `getDirectoryContents(path, recursive)` method to `src/services/github.ts`
- [x] T006 Add error handling for directory listing (401, 403, 404, 500+) in `src/services/github.ts`

**Checkpoint**: Foundation ready - GitHubService can now list directory contents ✅

---

## Phase 3: User Story 1 - 발행된 파일 목록 조회 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 설정 탭에서 버튼을 클릭하여 원격 저장소의 발행된 파일 목록을 모달에서 확인할 수 있다.

**Independent Test**: 플러그인 설정 탭 → "발행된 파일 관리" 버튼 클릭 → 모달에 파일 목록 표시 확인

### Implementation for User Story 1

- [x] T007 [US1] Create RemoteFileService class with constructor in `src/services/remote-file.ts`
- [x] T008 [US1] Implement `getPublishedFiles()` method in `src/services/remote-file.ts`
- [x] T009 [US1] Implement `searchFiles()` method in `src/services/remote-file.ts`
- [x] T010 [US1] Create RemoteFileManagerModal class extending Modal in `src/ui/remote-file-manager-modal.ts`
- [x] T011 [US1] Implement modal header with search input and refresh button in `src/ui/remote-file-manager-modal.ts`
- [x] T012 [US1] Implement file list rendering with path-based alphabetical sort in `src/ui/remote-file-manager-modal.ts`
- [x] T013 [US1] Implement file selection (checkbox) UI in `src/ui/remote-file-manager-modal.ts`
- [x] T014 [US1] Implement loading state and empty state UI in `src/ui/remote-file-manager-modal.ts`
- [x] T015 [US1] Implement session caching for file list in `src/ui/remote-file-manager-modal.ts`
- [x] T016 [US1] Implement manual refresh functionality in `src/ui/remote-file-manager-modal.ts`
- [x] T017 [US1] Add "발행된 파일 관리" button to GitHub section in `src/ui/settings-tab.ts`
- [x] T018 [US1] Connect button to open RemoteFileManagerModal in `src/ui/settings-tab.ts`

**Checkpoint**: User Story 1 완료 - 파일 목록 조회 및 검색 가능, MVP 배포 가능

---

## Phase 4: User Story 2 - 원격 파일 삭제 (Priority: P1)

**Goal**: 사용자가 선택한 파일을 원격 저장소에서 삭제할 수 있다 (단일 및 일괄 삭제 지원).

**Independent Test**: 파일 선택 → 삭제 버튼 클릭 → 확인 다이얼로그 → 확인 → GitHub에서 파일 삭제 확인

**Depends on**: User Story 1 (파일 목록 표시)

### Implementation for User Story 2

- [x] T019 [US2] Implement `deleteFiles()` method with progress callback in `src/services/remote-file.ts`
- [x] T020 [US2] Implement batch size validation (max 50) in `src/services/remote-file.ts`
- [x] T021 [US2] Implement API rate limiting delay (100ms between requests) in `src/services/remote-file.ts`
- [x] T022 [US2] Implement delete button in modal footer in `src/ui/remote-file-manager-modal.ts`
- [x] T023 [US2] Implement delete confirmation dialog using ConfirmModal in `src/ui/remote-file-manager-modal.ts`
- [x] T024 [US2] Implement delete progress indicator (for 5+ files) in `src/ui/remote-file-manager-modal.ts`
- [x] T025 [US2] Implement delete result summary (success/failure counts) in `src/ui/remote-file-manager-modal.ts`
- [x] T026 [US2] Implement auto-refresh file list after deletion in `src/ui/remote-file-manager-modal.ts`
- [x] T027 [US2] Add error handling for network errors during deletion in `src/ui/remote-file-manager-modal.ts`

**Checkpoint**: User Story 2 완료 - 단일 및 일괄 파일 삭제 기능 동작

---

## Phase 5: User Story 3 - 중복 파일 감지 (Priority: P2)

**Goal**: 동일한 파일명이 여러 경로에 존재하는 경우 시각적으로 구분하여 표시한다.

**Independent Test**: 중복 파일이 있는 저장소에서 파일 목록 조회 → 중복 파일에 배지 표시 확인

**Depends on**: User Story 1 (파일 목록 표시)

### Implementation for User Story 3

- [x] T028 [US3] Implement `detectDuplicates()` method in `src/services/remote-file.ts`
- [x] T029 [US3] Implement duplicate detection on file list load in `src/ui/remote-file-manager-modal.ts`
- [x] T030 [US3] Implement duplicate warning banner UI in `src/ui/remote-file-manager-modal.ts`
- [x] T031 [US3] Implement duplicate badge styling for file items in `src/ui/remote-file-manager-modal.ts`
- [x] T032 [US3] Implement duplicate group comparison view in `src/ui/remote-file-manager-modal.ts`

**Checkpoint**: User Story 3 완료 - 중복 파일 자동 감지 및 시각적 표시

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 스타일링, 접근성, 최종 검증

- [x] T033 [P] Add TailwindCSS styles for modal (qp: prefix) in `src/styles/main.css`
- [x] T034 [P] Add TailwindCSS styles for file list items in `src/styles/main.css`
- [x] T035 [P] Add TailwindCSS styles for duplicate badge in `src/styles/main.css`
- [x] T036 [P] Add TailwindCSS styles for progress bar in `src/styles/main.css`
- [x] T037 Implement keyboard navigation (Escape, Ctrl+A, Delete) in `src/ui/remote-file-manager-modal.ts`
- [x] T038 Add ARIA labels for accessibility in `src/ui/remote-file-manager-modal.ts`
- [x] T039 Verify all i18n keys render correctly in both English and Korean
- [x] T040 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Must complete first (MVP)
  - User Story 2 (P1): Depends on User Story 1 UI
  - User Story 3 (P2): Depends on User Story 1 UI
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
     │
     ▼
Phase 2 (Foundational: GitHubService)
     │
     ▼
Phase 3 (US1: 파일 목록 조회) ──────────────────┐
     │                                          │
     ├──────────────────┐                       │
     ▼                  ▼                       │
Phase 4 (US2: 삭제)   Phase 5 (US3: 중복)       │
     │                  │                       │
     └────────┬─────────┘                       │
              ▼                                 │
        Phase 6 (Polish) ◄──────────────────────┘
```

### Within Each User Story

- Services before UI components
- Core implementation before integration
- Error handling after happy path

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 + T002 + T003 + T004  (all parallel - different files)
```

**Phase 6 (Polish)**:
```
T033 + T034 + T035 + T036  (all parallel - same file but different sections)
```

---

## Parallel Example: Phase 1

```bash
# Launch all setup tasks together:
Task: "Add PublishedFile, DuplicateGroup, DeleteResult interfaces to src/types.ts"
Task: "Add RemoteFileManagerConfig interface to src/types.ts"
Task: "Add remote file management i18n keys to src/i18n/locales/en.ts"
Task: "Add remote file management i18n keys to src/i18n/locales/ko.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (4 tasks)
2. Complete Phase 2: Foundational (2 tasks)
3. Complete Phase 3: User Story 1 (12 tasks)
4. **STOP and VALIDATE**: Test file listing independently
5. Deploy/demo if ready

**MVP Scope**: 18 tasks total

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (파일 삭제 추가)
4. Add User Story 3 → Test independently → Deploy/Demo (중복 감지 추가)
5. Polish → Final release

### Full Implementation

- **Total Tasks**: 40
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 2 tasks
- **Phase 3 (US1)**: 12 tasks
- **Phase 4 (US2)**: 9 tasks
- **Phase 5 (US3)**: 5 tasks
- **Phase 6 (Polish)**: 8 tasks

---

## Task Summary by File

| File | Tasks |
|------|-------|
| `src/types.ts` | T001, T002 |
| `src/i18n/locales/en.ts` | T003 |
| `src/i18n/locales/ko.ts` | T004 |
| `src/services/github.ts` | T005, T006 |
| `src/services/remote-file.ts` | T007, T008, T009, T019, T020, T021, T028 |
| `src/ui/remote-file-manager-modal.ts` | T010-T016, T022-T027, T029-T032, T037, T038 |
| `src/ui/settings-tab.ts` | T017, T018 |
| `src/styles/main.css` | T033-T036 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1 and US2 are both P1 priority but US2 depends on US1's UI
