# Tasks: 비기능 요구사항

**Input**: Design documents from `/specs/005-non-functional-requirements/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: 테스트가 명세서에서 요청되었으므로 포함합니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 신규 타입 정의 및 공통 유틸리티 추가

- [x] T001 [P] Add NetworkStatus and NetworkStatusCallback types to src/types.ts
- [x] T002 [P] Add LargeFileInfo and FileValidationResult types to src/types.ts
- [x] T003 [P] Add PublishPreflightResult type to src/types.ts
- [x] T004 Add 'offline' to PublishError union type in src/types.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 네트워크 서비스와 파일 검증 서비스는 모든 사용자 스토리에서 공통으로 사용됩니다

**⚠️ CRITICAL**: User Story 구현 전 완료 필수

### Tests for Foundational Phase

- [x] T005 [P] Create unit test file tests/unit/services/network.test.ts with test cases for NetworkService
- [x] T006 [P] Create unit test file tests/unit/services/file-validator.test.ts with test cases for FileValidatorService

### Implementation for Foundational Phase

- [x] T007 [P] Create NetworkService class in src/services/network.ts with isOnline(), onStatusChange(), destroy() methods
- [x] T008 [P] Create FileValidatorService class in src/services/file-validator.ts with findLargeFiles(), formatFileSize() methods
- [x] T009 Run tests to verify foundational services work correctly

**Checkpoint**: Foundation ready - NetworkService and FileValidatorService are independently testable

---

## Phase 3: User Story 1 - 오프라인 상태에서 발행 시도 시 안내 (Priority: P1) 🎯 MVP

**Goal**: 오프라인 상태일 때 명확한 안내 메시지를 표시하여 사용자가 발행 불가 이유를 즉시 이해하도록 함

**Independent Test**: 네트워크 연결을 끊고 발행 명령 실행 → "인터넷 연결을 확인해주세요" 메시지 표시 확인

### Implementation for User Story 1

- [x] T010 [US1] Initialize NetworkService in plugin onload() in src/main.ts
- [x] T011 [US1] Add network check before publish command execution in src/main.ts publishNote handler
- [x] T012 [US1] Add network check before batch publish in src/ui/dashboard-modal.ts handlePublishSelected() method
- [x] T013 [US1] Add offline status indicator to dashboard header in src/ui/dashboard-modal.ts
- [x] T014 [US1] Improve network error handling in src/services/publish.ts to provide retry guidance message

**Checkpoint**: User Story 1 완료 - 오프라인 상태에서 발행 시도 시 즉시 안내 메시지 표시

---

## Phase 4: User Story 2 - 대용량 파일 업로드 경고 (Priority: P2)

**Goal**: 10MB 초과 파일 포함 시 사전 경고 모달을 표시하여 사용자가 진행 여부를 선택할 수 있도록 함

**Independent Test**: 10MB 초과 이미지 포함 노트 발행 → 경고 모달 표시 → "계속"/"취소" 선택 가능 확인

### Implementation for User Story 2

- [x] T015 [P] [US2] Create LargeFileWarningModal class in src/ui/large-file-warning-modal.ts with file list display and confirm/cancel buttons
- [x] T016 [US2] Integrate FileValidatorService into PublishService constructor in src/services/publish.ts
- [x] T017 [US2] Add preflight check for large files before single note publish in src/services/publish.ts publishNote() method
- [x] T018 [US2] Add preflight check for large files before batch publish in src/ui/dashboard-modal.ts handlePublishSelected() method
- [x] T019 [US2] Show LargeFileWarningModal when large files detected in both single and batch publish flows

**Checkpoint**: User Story 2 완료 - 대용량 파일 발견 시 경고 모달 표시 및 사용자 선택 가능

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 코드 정리 및 최종 검증

- [x] T020 [P] Cleanup NetworkService on plugin unload() in src/main.ts
- [x] T021 [P] Add ARIA labels for accessibility to LargeFileWarningModal in src/ui/large-file-warning-modal.ts
- [x] T022 Run all tests with npm run test to verify complete implementation
- [ ] T023 Manual validation using quickstart.md checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 시작 - 모든 User Story 차단
- **User Story 1 (Phase 3)**: Foundational 완료 후 시작
- **User Story 2 (Phase 4)**: Foundational 완료 후 시작 (US1과 병렬 가능)
- **Polish (Phase 5)**: 모든 User Story 완료 후 시작

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 완료 후 독립적으로 구현 가능
- **User Story 2 (P2)**: Foundational 완료 후 독립적으로 구현 가능 (US1과 무관)

### Within Each User Story

- 테스트가 먼저 작성되어야 함 (Foundational 단계에서 완료)
- 서비스 통합 → UI 통합 순서
- 체크포인트에서 독립적으로 검증 가능

### Parallel Opportunities

- T001~T004 (타입 정의) 병렬 가능
- T005~T008 (테스트 + 서비스) 병렬 가능
- US1과 US2는 Foundational 완료 후 병렬 가능

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tasks together:
Task: "Create unit test file tests/unit/services/network.test.ts"
Task: "Create unit test file tests/unit/services/file-validator.test.ts"
Task: "Create NetworkService class in src/services/network.ts"
Task: "Create FileValidatorService class in src/services/file-validator.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (타입 정의)
2. Complete Phase 2: Foundational (서비스 구현)
3. Complete Phase 3: User Story 1 (오프라인 감지)
4. **STOP and VALIDATE**: 오프라인 상태에서 발행 시도 시 안내 메시지 확인
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 서비스 준비 완료
2. Add User Story 1 → 오프라인 감지 기능 배포
3. Add User Story 2 → 대용량 파일 경고 기능 배포
4. Polish → 최종 검증 및 정리

---

## Summary

| 항목 | 값 |
|------|-----|
| **총 태스크 수** | 23개 |
| **Phase 1 (Setup)** | 4개 |
| **Phase 2 (Foundational)** | 5개 |
| **Phase 3 (US1)** | 5개 |
| **Phase 4 (US2)** | 5개 |
| **Phase 5 (Polish)** | 4개 |
| **MVP 범위** | Phase 1-3 (User Story 1까지) |
| **병렬 기회** | Setup 전체, Foundational 테스트+서비스, US1/US2 |

---

## Notes

- [P] tasks = 다른 파일, 의존성 없음
- [Story] label = 특정 사용자 스토리 추적용
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 체크포인트에서 독립적으로 검증
- 태스크 완료 후 커밋 권장
