# Tasks: GitHub 리포지토리 설정 가이드

**Input**: Design documents from `/specs/011-github-guide/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Story Mapping

| Story | Title | Priority | Key Tasks |
|-------|-------|----------|-----------|
| US1 | 플러그인 내 가이드 접근 | P1 | 모달 기본 구조, 버튼 |
| US2 | Quartz 템플릿 Fork 안내 | P1 | Fork 단계 콘텐츠 |
| US3 | PAT 생성 안내 | P1 | PAT 단계 콘텐츠 |
| US4 | 진행 상황 체크리스트 | P2 | 상태 서비스, 체크 UI |
| US5 | 문제 해결 안내 | P3 | 트러블슈팅 섹션 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 타입 정의 및 기본 구조 설정

- [x] T001 [P] Add GuideStep interface extending DeployGuideStep in src/types.ts
- [x] T002 [P] Add SetupStatus interface in src/types.ts
- [x] T003 [P] Add TroubleshootingItem interface in src/types.ts
- [x] T004 [P] Add guide-related i18n keys in src/i18n/locales/ko.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 User Story에서 사용되는 핵심 서비스 구현

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create SetupStatusService class in src/services/setup-status.ts
- [x] T006 Implement getStatus() method returning SetupStatus in src/services/setup-status.ts
- [x] T007 Implement isComplete() check using PluginSettings in src/services/setup-status.ts
- [x] T008 Create base guide step data structure in src/constants/guide-steps.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 플러그인 내 가이드 접근 (Priority: P1) 🎯 MVP

**Goal**: 설정 탭에서 가이드 버튼을 클릭하면 스텝 위자드 모달이 표시된다

**Independent Test**: 설정 탭에서 가이드 버튼 클릭 → 모달 표시 → 단계 네비게이션 동작

### Implementation for User Story 1

- [x] T009 [US1] Create GitHubGuideModal class extending Modal in src/ui/github-guide-modal.ts
- [x] T010 [US1] Implement step wizard UI with progress bar in src/ui/github-guide-modal.ts
- [x] T011 [US1] Implement previous/next navigation buttons in src/ui/github-guide-modal.ts
- [x] T012 [US1] Implement external link button opening browser in src/ui/github-guide-modal.ts
- [x] T013 [US1] Add "GitHub 설정 가이드" button in settings tab in src/ui/settings-tab.ts
- [x] T014 [US1] Implement auto-show on incomplete settings in src/ui/settings-tab.ts

**Checkpoint**: User Story 1 완료 - 가이드 모달 기본 기능 동작

---

## Phase 4: User Story 2 - Quartz 템플릿 Fork 안내 (Priority: P1)

**Goal**: Fork 단계에서 스크린샷과 함께 상세 안내가 표시된다

**Independent Test**: Fork 단계 → "Quartz 템플릿 열기" 버튼 클릭 → 브라우저에서 GitHub 열림

### Implementation for User Story 2

- [x] T015 [P] [US2] Add GitHub account check step data in src/constants/guide-steps.ts
- [x] T016 [P] [US2] Add Fork step data with quartz repo URL in src/constants/guide-steps.ts
- [x] T017 [US2] Add Fork step description and tips in src/constants/guide-steps.ts
- [ ] T018 [US2] Add placeholder for Fork screenshot (Base64) in src/constants/guide-steps.ts (optional)

**Checkpoint**: User Story 2 완료 - Fork 안내 기능 동작

---

## Phase 5: User Story 3 - PAT 생성 안내 (Priority: P1)

**Goal**: PAT 생성 단계에서 권한 설정 방법이 스크린샷과 함께 표시된다

**Independent Test**: PAT 단계 → "토큰 생성 페이지 열기" 버튼 클릭 → GitHub 토큰 페이지 열림

### Implementation for User Story 3

- [x] T019 [P] [US3] Add PAT creation step data with token URL in src/constants/guide-steps.ts
- [x] T020 [US3] Add PAT permission requirements (repo scope) in description in src/constants/guide-steps.ts
- [ ] T021 [US3] Add placeholder for PAT screenshot (Base64) in src/constants/guide-steps.ts (optional)
- [x] T022 [US3] Add connection verification step data in src/constants/guide-steps.ts

**Checkpoint**: User Story 3 완료 - PAT 생성 안내 기능 동작

---

## Phase 6: User Story 4 - 진행 상황 체크리스트 (Priority: P2)

**Goal**: 가이드 모달에서 각 단계의 완료 상태가 시각적으로 표시된다

**Independent Test**: 설정 완료 상태에서 가이드 열기 → 해당 단계 "완료" 표시

### Implementation for User Story 4

- [x] T023 [US4] Add completionCheck function for each step in src/constants/guide-steps.ts
- [x] T024 [US4] Implement step completion indicator UI in src/ui/github-guide-modal.ts
- [x] T025 [US4] Connect SetupStatusService to modal for status display in src/ui/github-guide-modal.ts
- [x] T026 [US4] Add visual checkmark for completed steps in src/ui/github-guide-modal.ts

**Checkpoint**: User Story 4 완료 - 진행 상황 표시 기능 동작

---

## Phase 7: User Story 5 - 문제 해결 안내 (Priority: P3)

**Goal**: 일반적인 오류에 대한 해결 방법이 표시된다

**Independent Test**: 가이드 내 문제 해결 섹션 → 오류 코드별 해결 방법 확인

### Implementation for User Story 5

- [x] T027 [P] [US5] Add TroubleshootingItem data for 401 error in src/constants/guide-steps.ts
- [x] T028 [P] [US5] Add TroubleshootingItem data for 404 error in src/constants/guide-steps.ts
- [x] T029 [P] [US5] Add TroubleshootingItem data for 403 error in src/constants/guide-steps.ts
- [x] T030 [P] [US5] Add TroubleshootingItem data for network error in src/constants/guide-steps.ts
- [x] T031 [US5] Implement troubleshooting tips display in modal in src/ui/github-guide-modal.ts
- [x] T032 [US5] Add troubleshooting section UI at end of wizard in src/ui/github-guide-modal.ts

**Checkpoint**: User Story 5 완료 - 문제 해결 안내 기능 동작

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 품질 개선 및 마무리

- [x] T033 [P] Add English i18n keys for guide in src/i18n/locales/en.ts
- [x] T034 Apply TailwindCSS qp: prefix styling to modal in src/ui/github-guide-modal.ts
- [x] T035 Verify offline functionality (no external resource dependencies)
- [x] T036 Performance test: modal open within 1 second
- [x] T037 Run npm run build and verify no TypeScript errors
- [ ] T038 Manual testing: complete guide flow end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Core modal structure
- **User Story 2 (P1)**: Can start after US1 - Fork step content
- **User Story 3 (P1)**: Can start after US1 - PAT step content
- **User Story 4 (P2)**: Can start after US1-3 - Status integration
- **User Story 5 (P3)**: Can start after US1 - Troubleshooting section

### Parallel Opportunities

**Phase 1 (all parallel)**:
```
T001, T002, T003, T004 - 모두 다른 파일/섹션
```

**Phase 4-5 (P1 stories can overlap)**:
```
T015, T016, T019 - guide-steps.ts의 다른 step 데이터
```

**Phase 7 (troubleshooting items parallel)**:
```
T027, T028, T029, T030 - 모두 다른 error 데이터
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T014)
4. **STOP and VALIDATE**: 가이드 모달이 열리고 네비게이션 동작 확인
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. User Story 1 → 기본 가이드 모달 (MVP!)
3. User Stories 2-3 → Fork, PAT 콘텐츠 추가
4. User Story 4 → 진행 상황 표시
5. User Story 5 → 문제 해결 안내
6. Polish → 품질 개선

---

## Notes

- 스크린샷 이미지는 별도 작업으로 준비 후 Base64 변환 필요
- 기존 `DeployGuideModal` 패턴 참조하여 일관된 UI 구현
- TailwindCSS `qp:` prefix 사용 필수
- 모든 텍스트는 i18n을 통해 관리
