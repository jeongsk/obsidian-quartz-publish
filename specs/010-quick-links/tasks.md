# Tasks: GitHub 저장소 및 배포 사이트 바로가기 버튼 추가

**Input**: Design documents from `/specs/010-quick-links/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md
**Linear Issue**: JEO-6

**Tests**: 단위 테스트 선택적 (URL 유틸리티 함수에 대해서만)

**Organization**: 작업은 사용자 스토리별로 그룹화되어 독립적인 구현 및 테스트가 가능합니다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 종속성 없음)
- **[Story]**: 해당 작업이 속한 사용자 스토리 (예: US1, US2, US3)
- 설명에 정확한 파일 경로 포함

## Path Conventions

- **Project Type**: Obsidian Plugin (단일 프로젝트)
- **Source**: `src/`
- **Tests**: `tests/` (선택적)

---

## Phase 1: Setup (공유 인프라)

**Purpose**: URL 유틸리티 함수 및 i18n 번역 키 추가

- [x] T001 [P] URL 유틸리티 함수 `isValidGitHubUrl()` 구현 in `src/utils/url.ts`
- [x] T002 [P] URL 유틸리티 함수 `normalizeBaseUrl()` 구현 in `src/utils/url.ts`
- [x] T003 [P] 한국어 번역 키 추가 (quickLinks, command, notice) in `src/i18n/locales/ko.ts`
- [x] T004 [P] 영어 번역 키 추가 (quickLinks, command, notice) in `src/i18n/locales/en.ts`

**Checkpoint**: URL 유틸리티 및 i18n 준비 완료

---

## Phase 2: User Story 1 - GitHub 저장소 바로가기 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 설정 탭 버튼 또는 커맨드 팔레트를 통해 GitHub 저장소에 빠르게 접근

**Independent Test**: 설정 화면에서 GitHub 버튼을 클릭하여 외부 브라우저에서 저장소 페이지가 열리는지 확인

### Implementation for User Story 1

- [x] T005 [US1] GitHub 저장소 열기 커맨드 등록 (`open-github-repo`) in `src/main.ts`
- [x] T006 [US1] 설정 탭에 GitHub 저장소 바로가기 버튼 추가 in `src/ui/settings-tab.ts`
- [x] T007 [US1] GitHub 버튼 비활성화 상태 처리 (repoUrl 미설정 시) in `src/ui/settings-tab.ts`

**Acceptance Criteria**:
- [x] 설정된 GitHub 저장소 URL 클릭 시 외부 브라우저에서 열림
- [x] GitHub 저장소 미설정 시 버튼 비활성화
- [x] 커맨드 팔레트에서 "GitHub 저장소 열기" 명령 실행 가능

**Checkpoint**: User Story 1 완료 - GitHub 저장소 바로가기 기능 동작

---

## Phase 3: User Story 2 - 배포 사이트 바로가기 (Priority: P1)

**Goal**: 사용자가 설정 탭 버튼 또는 커맨드 팔레트를 통해 배포된 Quartz 사이트에 빠르게 접근

**Independent Test**: 설정 화면에서 홈페이지 버튼을 클릭하여 외부 브라우저에서 배포된 사이트가 열리는지 확인

### Implementation for User Story 2

- [x] T008 [US2] 배포 사이트 열기 커맨드 등록 (`open-deployed-site`) in `src/main.ts`
- [x] T009 [US2] 설정 탭에 배포 사이트 바로가기 버튼 추가 in `src/ui/settings-tab.ts`
- [x] T010 [US2] 배포 사이트 버튼 비활성화 상태 처리 (baseUrl 미설정 시) in `src/ui/settings-tab.ts`
- [x] T011 [US2] baseUrl에 https:// 프로토콜 자동 추가 로직 적용 in `src/ui/settings-tab.ts`

**Acceptance Criteria**:
- [x] 설정된 baseUrl 클릭 시 외부 브라우저에서 열림
- [x] baseUrl 미설정 시 버튼 비활성화
- [x] 프로토콜 없는 baseUrl에 https:// 자동 추가
- [x] 커맨드 팔레트에서 "배포 사이트 열기" 명령 실행 가능

**Checkpoint**: User Story 2 완료 - 배포 사이트 바로가기 기능 동작

---

## Phase 4: User Story 3 - 커맨드 팔레트를 통한 빠른 접근 (Priority: P2)

**Goal**: 키보드 중심 사용자가 어디서든 커맨드 팔레트를 통해 바로가기에 빠르게 접근

**Independent Test**: 커맨드 팔레트에서 "Quartz"를 검색하여 두 명령이 표시되는지 확인

### Implementation for User Story 3

> **Note**: 커맨드 등록은 이미 US1, US2에서 완료됨. 이 Phase에서는 커맨드 미설정 시 Notice 처리 추가

- [x] T012 [US3] GitHub 저장소 미설정 시 Notice 표시 로직 추가 in `src/main.ts`
- [x] T013 [US3] baseUrl 미설정 시 Notice 표시 로직 추가 in `src/main.ts`

**Acceptance Criteria**:
- [x] 커맨드 팔레트에서 "Quartz" 검색 시 두 명령 표시
- [x] 설정 미완료 시 적절한 안내 메시지 표시

**Checkpoint**: User Story 3 완료 - 커맨드 팔레트 통합 완료

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 스타일링 및 최종 검증

- [x] T014 [P] 바로가기 버튼 TailwindCSS 스타일링 (qp: 프리픽스) in `src/ui/settings-tab.ts`
- [x] T015 [P] 버튼 비활성화 상태 스타일링 (opacity, cursor) in `src/ui/settings-tab.ts`
- [x] T016 라이트/다크 테마 호환성 검증 및 조정
- [x] T017 빌드 및 린트 검사 실행 (`npm run build && npm run lint`)
- [ ] T018 수동 테스트 - quickstart.md 체크리스트 검증

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 종속성 없음 - 즉시 시작 가능
- **User Story 1 (Phase 2)**: Setup 완료 필요 (T001, T003, T004)
- **User Story 2 (Phase 3)**: Setup 완료 필요 (T002, T003, T004)
- **User Story 3 (Phase 4)**: US1, US2 완료 필요
- **Polish (Phase 5)**: 모든 User Story 완료 필요

### User Story Dependencies

```
Phase 1: Setup
    ├── T001, T002 (URL 유틸리티) ─┬─► Phase 2: US1
    └── T003, T004 (i18n)         └─► Phase 3: US2
                                          │
                                          ▼
                                    Phase 4: US3
                                          │
                                          ▼
                                    Phase 5: Polish
```

### Parallel Opportunities

**Phase 1 (Setup)**: T001, T002, T003, T004 모두 병렬 실행 가능
**Phase 2-3 (US1, US2)**: 독립적이므로 병렬 실행 가능 (단, US2는 US1의 버튼 컨테이너 재사용)
**Phase 5 (Polish)**: T014, T015 병렬 실행 가능

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all setup tasks together:
Task: "URL 유틸리티 함수 isValidGitHubUrl() 구현 in src/utils/url.ts"
Task: "URL 유틸리티 함수 normalizeBaseUrl() 구현 in src/utils/url.ts"
Task: "한국어 번역 키 추가 in src/i18n/locales/ko.ts"
Task: "영어 번역 키 추가 in src/i18n/locales/en.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료 (T001-T004)
2. Phase 2: User Story 1 완료 (T005-T007)
3. **STOP and VALIDATE**: GitHub 바로가기 독립 테스트
4. 필요시 배포/데모

### Full Implementation

1. Phase 1: Setup → 인프라 준비
2. Phase 2: US1 → GitHub 바로가기 동작
3. Phase 3: US2 → 배포 사이트 바로가기 동작
4. Phase 4: US3 → 커맨드 팔레트 통합 완료
5. Phase 5: Polish → 최종 검증

---

## Notes

- `[P]` 작업 = 다른 파일, 종속성 없음
- `[Story]` 레이블 = 특정 사용자 스토리에 매핑
- 각 User Story는 독립적으로 완료 및 테스트 가능
- 각 작업 또는 논리적 그룹 후 커밋
- 버튼 스타일링은 기존 TailwindCSS 설정과 Obsidian CSS 변수 활용
