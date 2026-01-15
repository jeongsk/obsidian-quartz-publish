# Tasks: 발행 대시보드 콘텐츠 해시 불일치 버그 수정 및 UX 개선

**Input**: Design documents from `/specs/001-fix-content-hash/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: 수동 테스트 위주로 진행 (자동 테스트는 선택적)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Summary

| 항목 | 값 |
|------|-----|
| 총 작업 수 | 8 |
| User Story 1 (P1) | 1 작업 |
| User Story 2 (P2) | 0 작업 (US1에서 자동 해결) |
| User Story 3 (P3) | 4 작업 |
| 폴리시 | 3 작업 |
| MVP 범위 | User Story 1 (T001) |

---

## Phase 1: Setup (Not Required)

**Purpose**: 이 기능은 기존 프로젝트에 대한 버그 수정이므로 Setup 단계가 필요하지 않습니다.

---

## Phase 2: Foundational (Not Required)

**Purpose**: 새로운 인프라 구성이 필요하지 않습니다. 기존 코드 수정만 진행합니다.

---

## Phase 3: User Story 1 - 발행된 파일 상태 정확히 표시 (Priority: P1) 🎯 MVP

**Goal**: 발행된 파일이 실제 수정 여부에 따라 정확한 탭에 표시되도록 버그 수정

**Independent Test**: 파일 발행 후 대시보드를 열어 "최신" 탭에 표시되는지 확인

### Implementation for User Story 1

- [x] T001 [US1] Fix contentHash calculation to use original content instead of transformed content in src/services/publish.ts:197

**변경 내용**:
```diff
- const contentHash = await this.calculateHash(transformed.content);
+ const contentHash = await this.calculateHash(content);
```

**Checkpoint**: 파일 발행 후 대시보드에서 "최신" 탭에 정확히 표시됨

---

## Phase 4: User Story 2 - 프론트매터 자동 수정 후 상태 유지 (Priority: P2)

**Goal**: 프론트매터 자동 수정 후에도 발행 직후 "최신" 상태로 표시

**Independent Test**: 프론트매터에 날짜 필드가 없는 파일을 발행한 후 "최신" 상태 확인

### Implementation for User Story 2

> **NOTE**: User Story 1의 수정으로 자동 해결됩니다. `content` 변수는 프론트매터 자동 수정 후의 값이므로 별도 작업이 필요하지 않습니다.

**Checkpoint**: 프론트매터 자동 수정이 발생해도 발행 직후 "최신" 상태로 표시됨

---

## Phase 5: User Story 3 - 탭 상태 설명 표시 (Priority: P3)

**Goal**: 각 탭의 의미를 사용자가 쉽게 이해할 수 있도록 설명 텍스트 표시

**Independent Test**: 대시보드에서 각 탭 클릭 시 해당 설명이 표시되는지 확인

### Implementation for User Story 3

- [x] T002 [P] [US3] Add tab description strings to Korean i18n file in src/i18n/ko.ts
- [x] T003 [P] [US3] Add tab description strings to English i18n file in src/i18n/en.ts
- [x] T004 [US3] Add getTabDescription helper method in src/ui/dashboard-modal.ts
- [x] T005 [US3] Render tab description text below tab buttons in src/ui/dashboard-modal.ts

**i18n 문자열 추가 내용**:
```typescript
// ko.ts - dashboard 섹션에 추가
tabDescriptions: {
  new: '아직 발행되지 않은 새 노트입니다',
  modified: '발행 후 내용이 변경된 노트입니다',
  deleted: '로컬에서 삭제되었거나 발행 해제된 노트입니다',
  synced: '원격과 동기화된 최신 상태의 노트입니다',
},

// en.ts - dashboard 섹션에 추가
tabDescriptions: {
  new: 'New notes that haven\'t been published yet',
  modified: 'Notes modified after publishing',
  deleted: 'Notes deleted locally or unpublished',
  synced: 'Notes synced with remote',
},
```

**Checkpoint**: 각 탭 선택 시 해당 설명이 탭 영역 아래에 표시됨

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 빌드 검증 및 최종 테스트

- [x] T006 Run build to verify no TypeScript errors with `npm run build`
- [x] T007 Run lint check with `npm run lint`
- [ ] T008 Manual testing: Verify all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup): 불필요
Phase 2 (Foundational): 불필요
    │
    ▼
Phase 3 (US1): T001 - 버그 수정 ← MVP
    │
    ▼
Phase 4 (US2): US1에서 자동 해결
    │
    ▼
Phase 5 (US3): T002, T003 (병렬) → T004 → T005
    │
    ▼
Phase 6 (Polish): T006 → T007 → T008
```

### User Story Dependencies

- **User Story 1 (P1)**: 독립적 - 바로 시작 가능
- **User Story 2 (P2)**: US1의 수정으로 자동 해결
- **User Story 3 (P3)**: US1, US2와 독립적 - 병렬 진행 가능

### Parallel Opportunities

```bash
# i18n 파일 병렬 수정 가능:
T002: src/i18n/ko.ts
T003: src/i18n/en.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ T001 완료 → 버그 수정 완료
2. **STOP and VALIDATE**: 파일 발행 후 "최신" 탭에 표시되는지 확인
3. 이 시점에서 배포 가능 (핵심 버그 수정됨)

### Incremental Delivery

1. T001 완료 → US1 + US2 해결 → Deploy/Demo (MVP!)
2. T002-T005 완료 → US3 해결 → Deploy/Demo
3. T006-T008 완료 → 최종 검증

### Estimated Time

| 작업 | 예상 시간 |
|------|----------|
| T001 (버그 수정) | 5분 |
| T002-T003 (i18n) | 10분 |
| T004-T005 (UI) | 20분 |
| T006-T008 (검증) | 15분 |
| **총 예상 시간** | **50분** |

---

## Notes

- [P] tasks = 서로 다른 파일, 의존성 없음
- [Story] label = 특정 user story에 매핑
- 커밋 단위: 각 User Story 완료 시
- T001 완료 후 바로 검증 가능 (MVP)
