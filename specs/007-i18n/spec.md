# Feature Specification: Internationalization (i18n) Support

**Feature Branch**: `001-i18n`  
**Created**: 2025-01-14  
**Status**: Draft  
**Input**: User description: "다국어 적용합니다.(영어와 한국어)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Language Matching on Plugin Load (Priority: P1)

사용자가 Obsidian을 시작하면, 플러그인이 Obsidian의 현재 언어 설정을 감지하여 자동으로 해당 언어로 UI를 표시합니다.

**Why this priority**: 사용자가 별도 설정 없이 자신의 언어로 플러그인을 사용할 수 있어 첫 경험이 향상됩니다. 이것은 다국어 지원의 핵심 기능입니다.

**Independent Test**: Obsidian 언어 설정을 한국어로 변경 후 플러그인을 로드하면, 모든 UI 텍스트가 한국어로 표시됩니다.

**Acceptance Scenarios**:

1. **Given** Obsidian 언어가 한국어(ko)로 설정됨, **When** 플러그인 로드, **Then** 모든 UI 텍스트가 한국어로 표시됨
2. **Given** Obsidian 언어가 영어(en)로 설정됨, **When** 플러그인 로드, **Then** 모든 UI 텍스트가 영어로 표시됨
3. **Given** Obsidian 언어가 지원되지 않는 언어로 설정됨, **When** 플러그인 로드, **Then** 기본 언어(영어)로 UI가 표시됨

---

### User Story 2 - Korean UI Experience (Priority: P2)

한국어 사용자가 플러그인의 모든 기능을 한국어로 사용할 수 있습니다. 설정 탭, 대시보드, 알림 메시지 등 모든 UI 요소가 한국어로 표시됩니다.

**Why this priority**: 한국어 사용자가 플러그인을 원활하게 사용하기 위해 필수적입니다. 사용자 요청에 명시된 언어입니다.

**Independent Test**: 한국어 환경에서 설정 탭을 열고 모든 레이블, 설명, 버튼 텍스트가 한국어로 표시되는지 확인합니다.

**Acceptance Scenarios**:

1. **Given** 언어가 한국어로 설정됨, **When** 설정 탭 열기, **Then** 모든 섹션 제목, 입력 필드 레이블, 버튼 텍스트가 한국어로 표시됨
2. **Given** 언어가 한국어로 설정됨, **When** 노트 발행 시도, **Then** 진행 상황 알림이 한국어로 표시됨
3. **Given** 언어가 한국어로 설정됨, **When** 대시보드 모달 열기, **Then** 탭 이름, 상태 메시지, 버튼이 한국어로 표시됨

---

### User Story 3 - English UI Experience (Priority: P2)

영어 사용자가 플러그인의 모든 기능을 영어로 사용할 수 있습니다. 설정 탭, 대시보드, 알림 메시지 등 모든 UI 요소가 영어로 표시됩니다.

**Why this priority**: 영어는 국제 사용자를 위한 기본 언어이며, 사용자 요청에 명시된 언어입니다.

**Independent Test**: 영어 환경에서 설정 탭을 열고 모든 레이블, 설명, 버튼 텍스트가 영어로 표시되는지 확인합니다.

**Acceptance Scenarios**:

1. **Given** 언어가 영어로 설정됨, **When** 설정 탭 열기, **Then** 모든 섹션 제목, 입력 필드 레이블, 버튼 텍스트가 영어로 표시됨
2. **Given** 언어가 영어로 설정됨, **When** 발행 오류 발생, **Then** 오류 메시지가 영어로 표시됨

---

### Edge Cases

- 언어 파일이 손상되거나 누락된 경우 어떻게 되나요? → 기본 언어(영어)로 폴백
- 번역 키가 누락된 경우 어떻게 되나요? → 해당 키의 영어 텍스트 표시
- Obsidian 언어 설정이 런타임에 변경되면 어떻게 되나요? → Obsidian 앱 재시작 필요 (실시간 언어 변경 미지원)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 영어(en)와 한국어(ko) 두 가지 언어를 지원하며, 새 언어 파일 추가만으로 확장 가능한 구조여야 합니다
- **FR-002**: 시스템은 Obsidian의 현재 언어 설정을 감지하여 적절한 언어로 UI를 표시해야 합니다
- **FR-003**: 시스템은 지원되지 않는 언어에 대해 영어를 기본 폴백 언어로 사용해야 합니다
- **FR-004**: 다음 UI 영역의 모든 사용자 대면 텍스트가 번역되어야 합니다:
  - 설정 탭 (섹션 제목, 레이블, 설명, 버튼)
  - 대시보드 모달 (탭, 상태, 메시지, 버튼)
  - Notice 알림 (성공, 오류, 진행 상황 메시지)
  - 명령어 팔레트 (커맨드 이름)
  - 컨텍스트 메뉴 (파일 메뉴 항목)
  - 확인 모달 (제목, 메시지, 버튼)
- **FR-005**: 번역 텍스트는 동적 값(예: 파일 이름, 개수)을 삽입할 수 있는 플레이스홀더를 지원해야 합니다
- **FR-006**: 시스템은 누락된 번역 키에 대해 영어 텍스트로 폴백하고, 개발 모드에서는 콘솔 경고를 출력해야 합니다

### Key Entities

- **TranslationKey**: 번역 가능한 문자열을 식별하는 고유 키 (예: `settings.github.title`)
- **TranslationString**: 특정 언어에 대한 번역된 텍스트
- **Locale**: 지원되는 언어 식별자 (en, ko)
- **TranslationFile**: 특정 언어의 모든 번역을 포함하는 파일

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 플러그인의 모든 사용자 대면 텍스트 100%가 영어와 한국어로 번역됩니다
- **SC-002**: 지원 언어 환경에서 번역되지 않은 텍스트가 UI에 표시되지 않습니다
- **SC-003**: 지원되지 않는 언어 환경에서 플러그인이 영어로 정상 작동합니다
- **SC-004**: 한국어/영어 사용자가 자신의 언어로 모든 기능을 사용할 수 있습니다

## Assumptions

- Obsidian API를 통해 현재 언어 설정을 가져올 수 있습니다 (`moment.locale()` 또는 유사한 방법)
- 번역 파일은 TypeScript 객체 또는 JSON 형식으로 관리됩니다
- 플러그인 로드 시점에 언어가 결정되며, 언어 변경 시 Obsidian 앱 재시작 필요
- 기존 하드코딩된 문자열(영어/한국어 혼재)은 모두 번역 시스템으로 마이그레이션됩니다

## Clarifications

### Session 2025-01-14

- Q: 언어 전환 시 UI 반영 방식 → A: Obsidian 앱 재시작 필요 (표준 플러그인 동작)
- Q: 향후 다른 언어 추가 가능성 → A: 확장 가능한 구조 (새 언어 파일 추가만으로 지원 가능)
- Q: 누락된 번역 키 감지 방식 → A: 영어 폴백 + 개발 모드에서 콘솔 경고
