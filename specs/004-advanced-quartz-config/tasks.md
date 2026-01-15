# Implementation Tasks: Quartz 고급 설정 관리

**Feature**: 004-advanced-quartz-config
**Branch**: `004-advanced-quartz-config`
**Generated**: 2026-01-14
**Spec**: [spec.md](./spec.md)

## User Stories Summary

| ID | Name | Priority | Independent Test |
|----|------|----------|------------------|
| US1 | 사이트 기본 정보 설정 | P1 | pageTitle, baseUrl, locale 변경 후 GitHub 검증 |
| US2 | 명시적 적용 흐름 및 사용자 안내 | P1 | "적용" 버튼 없이 닫으면 미반영, 클릭 후 커밋 생성 검증 |
| US3 | 사이트 동작 옵션 설정 | P2 | enableSPA, enablePopovers 토글 변경 후 GitHub 검증 |
| US4 | 애널리틱스 설정 | P3 | analytics provider 선택 후 GitHub 검증 |
| US5 | 기본 날짜 타입 설정 | P3 | defaultDateType 변경 후 GitHub 검증 |

---

## Phase 1: Setup

프로젝트 초기 설정 및 타입 정의.

- [x] T001 Extend QuartzSiteConfig type in src/types.ts with new fields (pageTitle, baseUrl, locale, enableSPA, enablePopovers, analytics, defaultDateType)
- [x] T002 [P] Define AnalyticsConfig union type in src/types.ts
- [x] T003 [P] Define ConfigUpdateResult and ConfigUpdateError types in src/types.ts
- [x] T004 [P] Define ConflictResolution type in src/types.ts
- [x] T005 [P] Define PendingChanges interface in src/types.ts
- [x] T006 [P] Add SUPPORTED_LOCALES constant array in src/constants/locales.ts
- [x] T007 [P] Add ANALYTICS_PROVIDERS constant array in src/constants/analytics.ts
- [x] T008 Create src/ui/components/ directory structure
- [x] T009 Create src/ui/sections/ directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

모든 User Story에서 사용되는 핵심 서비스 및 유틸리티.

### 2.1 Validators

- [x] T010 Implement validatePageTitle() in src/utils/validators.ts
- [x] T011 [P] Implement validateBaseUrl() with normalization in src/utils/validators.ts
- [x] T012 [P] Implement validateLocale() in src/utils/validators.ts
- [x] T013 [P] Implement validateAnalytics() for all providers in src/utils/validators.ts
- [x] T014 Implement validateConfig() combining all validators in src/utils/validators.ts

### 2.2 QuartzConfigService Extension

- [x] T015 Add regex patterns for parsing new config fields in src/services/quartz-config.ts
- [x] T016 Extend parseConfig() to extract pageTitle, baseUrl, locale, enableSPA, enablePopovers, defaultDateType, analytics in src/services/quartz-config.ts
- [x] T017 Implement serializeConfig() to update quartz.config.ts content in src/services/quartz-config.ts
- [x] T018 Implement loadConfig() with SHA caching in src/services/quartz-config.ts
- [x] T019 Implement getRemoteSha() for conflict detection in src/services/quartz-config.ts
- [x] T020 Implement saveConfig() with SHA validation in src/services/quartz-config.ts

### 2.3 PendingChangesManager

- [x] T021 Create PendingChangesManager class in src/services/pending-changes.ts
- [x] T022 Implement initialize() method in src/services/pending-changes.ts
- [x] T023 [P] Implement updateField() with change tracking in src/services/pending-changes.ts
- [x] T024 [P] Implement isDirty() and getChangedFields() in src/services/pending-changes.ts
- [x] T025 Implement generateCommitMessage() with field diff in src/services/pending-changes.ts
- [x] T026 [P] Implement reset() and markAsSaved() in src/services/pending-changes.ts

---

## Phase 3: User Story 1 - 사이트 기본 정보 설정 (P1)

**Goal**: 사용자가 pageTitle, baseUrl, locale을 설정 화면에서 수정할 수 있다.

**Independent Test**: 설정 화면에서 각 필드를 수정한 후 GitHub의 `quartz.config.ts`에서 값이 올바르게 변경되었는지 확인.

### Implementation

- [x] T027 [US1] Create SiteInfoSection component in src/ui/sections/site-info-section.ts
- [x] T028 [US1] Implement pageTitle text input with validation in src/ui/sections/site-info-section.ts
- [x] T029 [P] [US1] Implement baseUrl text input with normalization in src/ui/sections/site-info-section.ts
- [x] T030 [P] [US1] Implement locale dropdown with SUPPORTED_LOCALES in src/ui/sections/site-info-section.ts
- [x] T031 [US1] Wire SiteInfoSection onChange to PendingChangesManager in src/ui/settings-tab.ts
- [x] T032 [US1] Add "Site Information" section heading in settings tab UI in src/ui/settings-tab.ts

---

## Phase 4: User Story 2 - 명시적 적용 흐름 및 사용자 안내 (P1)

**Goal**: 변경사항이 있을 때만 "적용" 버튼이 활성화되고, 클릭 시 확인 모달 후 커밋&푸시된다.

**Independent Test**: 설정 변경 후 "적용" 클릭 없이 닫으면 GitHub에 미반영, "적용" 후에만 커밋 생성 확인.

### Implementation

- [x] T033 [US2] Create ApplyButton component in src/ui/components/apply-button.ts
- [x] T034 [US2] Implement button states (disabled/enabled/loading) in src/ui/components/apply-button.ts
- [x] T035 [P] [US2] Create UnsavedWarning banner component in src/ui/components/unsaved-warning.ts
- [x] T036 [US2] Create ConfirmModal extending Obsidian Modal in src/ui/components/confirm-modal.ts
- [x] T037 [US2] Implement ConfirmModal.open() returning Promise<boolean> in src/ui/components/confirm-modal.ts
- [x] T038 [US2] Create ConflictModal for SHA mismatch handling in src/ui/components/conflict-modal.ts
- [x] T039 [US2] Implement ConflictModal.open() returning Promise<ConflictResolution> in src/ui/components/conflict-modal.ts
- [x] T040 [US2] Implement apply flow: ConfirmModal → SHA check → ConflictModal or save in src/ui/settings-tab.ts
- [x] T041 [US2] Add unsaved changes warning on settings tab close in src/ui/settings-tab.ts
- [x] T042 [US2] Wire ApplyButton and UnsavedWarning to PendingChangesManager.isDirty() in src/ui/settings-tab.ts

---

## Phase 5: User Story 3 - 사이트 동작 옵션 설정 (P2)

**Goal**: 사용자가 enableSPA, enablePopovers 토글을 설정할 수 있다.

**Independent Test**: SPA/Popovers 토글 변경 후 GitHub의 `quartz.config.ts`에서 값 확인.

### Implementation

- [x] T043 [US3] Create BehaviorSection component in src/ui/sections/behavior-section.ts
- [x] T044 [US3] Implement enableSPA toggle in src/ui/sections/behavior-section.ts
- [x] T045 [P] [US3] Implement enablePopovers toggle in src/ui/sections/behavior-section.ts
- [x] T046 [US3] Wire BehaviorSection onChange to PendingChangesManager in src/ui/settings-tab.ts
- [x] T047 [US3] Add "Behavior" section heading in settings tab UI in src/ui/settings-tab.ts

---

## Phase 6: User Story 4 - 애널리틱스 설정 (P3)

**Goal**: 사용자가 analytics provider를 선택하고 provider별 필수 필드를 입력할 수 있다.

**Independent Test**: Google Analytics 또는 Plausible 선택 후 GitHub의 analytics 설정 확인.

### Implementation

- [x] T048 [US4] Create AnalyticsSection component in src/ui/sections/analytics-section.ts
- [x] T049 [US4] Implement provider dropdown (null, google, plausible, umami) in src/ui/sections/analytics-section.ts
- [x] T050 [US4] Implement dynamic field display based on provider selection in src/ui/sections/analytics-section.ts
- [x] T051 [P] [US4] Implement Google Analytics tagId input with validation in src/ui/sections/analytics-section.ts
- [x] T052 [P] [US4] Implement Plausible host input (optional) in src/ui/sections/analytics-section.ts
- [x] T053 [P] [US4] Implement Umami websiteId and host inputs with validation in src/ui/sections/analytics-section.ts
- [x] T054 [US4] Wire AnalyticsSection onChange to PendingChangesManager in src/ui/settings-tab.ts
- [x] T055 [US4] Add "Analytics" section heading in settings tab UI in src/ui/settings-tab.ts

---

## Phase 7: User Story 5 - 기본 날짜 타입 설정 (P3)

**Goal**: 사용자가 defaultDateType을 선택할 수 있다.

**Independent Test**: defaultDateType 변경 후 GitHub의 `quartz.config.ts`에서 값 확인.

### Implementation

- [x] T056 [US5] Add defaultDateType dropdown to BehaviorSection in src/ui/sections/behavior-section.ts
- [x] T057 [US5] Wire defaultDateType onChange to PendingChangesManager in src/ui/settings-tab.ts

---

## Phase 8: Integration & Polish

기존 설정 통합 및 최종 정리.

### 8.1 Existing Settings Integration (FR-016)

- [x] T058 Create PublishingSection component integrating existing settings in src/ui/sections/publishing-section.ts
- [x] T059 Move explicitPublish toggle to PublishingSection in src/ui/sections/publishing-section.ts
- [x] T060 [P] Move ignorePatterns input to PublishingSection in src/ui/sections/publishing-section.ts
- [x] T061 [P] Move urlStrategy dropdown to PublishingSection in src/ui/sections/publishing-section.ts
- [x] T062 Wire PublishingSection onChange to PendingChangesManager in src/ui/settings-tab.ts
- [x] T063 Add "Publishing" section heading in settings tab UI in src/ui/settings-tab.ts

### 8.2 Settings Tab Refactoring

- [x] T064 Refactor SettingsTab to use section components in src/ui/settings-tab.ts
- [x] T065 Implement config loading on settings tab open in src/ui/settings-tab.ts
- [x] T066 Add loading state UI while fetching config in src/ui/settings-tab.ts
- [x] T067 Add error state UI for network failures in src/ui/settings-tab.ts

### 8.3 Final Polish

- [x] T068 Add success/error Notice messages for apply operations in src/ui/settings-tab.ts
- [x] T069 Ensure TailwindCSS qp: prefix on all new component classes
- [x] T070 Verify keyboard accessibility for all inputs and modals
- [ ] T071 Manual E2E test: Full flow from config load to commit&push

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├─────────────────┬─────────────────┬─────────────────┬─────────────────┐
    ▼                 ▼                 ▼                 ▼                 ▼
Phase 3 (US1)    Phase 4 (US2)    Phase 5 (US3)    Phase 6 (US4)    Phase 7 (US5)
    │                 │                 │                 │                 │
    └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
                                        │
                                        ▼
                              Phase 8 (Integration)
```

**Notes**:
- US1 (Site Info)와 US2 (Apply Flow)는 P1 우선순위로 병렬 진행 가능하나, US2는 저장 기능이므로 US1 완료 후 통합 테스트 권장
- US3, US4, US5는 Phase 2 완료 후 독립적으로 병렬 진행 가능
- Phase 8은 모든 User Story 완료 후 진행

---

## Parallel Execution Examples

### Within Phase 2 (Foundational)

```
T010 (validatePageTitle)
        │
        ├── T011 [P] (validateBaseUrl)
        ├── T012 [P] (validateLocale)
        └── T013 [P] (validateAnalytics)
                │
                ▼
        T014 (validateConfig)
```

### Within Phase 6 (US4 - Analytics)

```
T049 (provider dropdown)
        │
        ▼
T050 (dynamic field display)
        │
        ├── T051 [P] (Google tagId)
        ├── T052 [P] (Plausible host)
        └── T053 [P] (Umami inputs)
```

---

## Implementation Strategy

### MVP (Minimum Viable Product)

**Scope**: User Story 1 + User Story 2 (Phase 1-4)

MVP 완료 시 사용자는:
- pageTitle, baseUrl, locale을 설정할 수 있음
- "적용" 버튼을 통해 변경사항을 커밋&푸시할 수 있음
- 저장되지 않은 변경사항 경고를 받음

### Incremental Delivery

1. **Week 1**: Phase 1-2 (타입, 서비스, 유틸리티)
2. **Week 2**: Phase 3-4 (MVP: Site Info + Apply Flow)
3. **Week 3**: Phase 5-7 (추가 설정: Behavior, Analytics, Date Type)
4. **Week 4**: Phase 8 (통합 및 폴리시)

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 71 |
| Phase 1 (Setup) | 9 |
| Phase 2 (Foundational) | 17 |
| Phase 3 (US1) | 6 |
| Phase 4 (US2) | 10 |
| Phase 5 (US3) | 5 |
| Phase 6 (US4) | 8 |
| Phase 7 (US5) | 2 |
| Phase 8 (Polish) | 14 |
| Parallelizable Tasks | 24 |
| MVP Tasks | 42 (Phase 1-4) |
