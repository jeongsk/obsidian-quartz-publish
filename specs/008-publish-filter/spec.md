# Feature Specification: Publish Filter & Home Page Configuration

**Feature Branch**: `008-publish-filter`  
**Created**: 2026-01-14  
**Status**: Draft  
**Input**: User description: "특정 폴더만 업로드 하거나, 특정 폴더나 태그를 제외하는 옵션을 추가합니다. 그리고 해당 폴더를 루트로 설정하는 기능도 추가. 그리고 홈 페이지를 설정할 수 있는 기능도 추가"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Include Specific Folder Only (Priority: P1)

사용자는 Obsidian vault에서 특정 폴더만 선택하여 Quartz에 발행하고 싶어합니다. 예를 들어, "Blog" 폴더에 있는 노트만 발행하고 나머지 노트는 발행에서 제외하려고 합니다.

**Why this priority**: 가장 기본적인 필터링 기능으로, 사용자가 원하는 콘텐츠만 선택적으로 발행할 수 있게 해줍니다. 이것이 없으면 전체 vault를 발행하거나 수동으로 파일을 관리해야 합니다.

**Independent Test**: 설정에서 포함 폴더를 지정한 후 발행을 실행하면, 해당 폴더의 노트만 Quartz에 업로드되는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 사용자가 설정에서 포함 폴더로 "Blog"를 지정했을 때, **When** 발행을 실행하면, **Then** "Blog" 폴더 내의 노트만 Quartz에 업로드됩니다.
2. **Given** 여러 개의 포함 폴더가 지정되었을 때, **When** 발행을 실행하면, **Then** 지정된 모든 폴더의 노트가 업로드됩니다.
3. **Given** 포함 폴더가 지정되지 않았을 때, **When** 발행을 실행하면, **Then** 기존처럼 전체 vault가 발행 대상이 됩니다.

---

### User Story 2 - Exclude Specific Folders (Priority: P1)

사용자는 특정 폴더를 발행에서 제외하고 싶어합니다. 예를 들어, "Private", "Templates", "Archive" 폴더는 발행하지 않으려고 합니다.

**Why this priority**: 포함 기능과 함께 가장 기본적인 필터링 기능입니다. 개인적인 메모나 템플릿 폴더를 쉽게 제외할 수 있습니다.

**Independent Test**: 설정에서 제외 폴더를 지정한 후 발행을 실행하면, 해당 폴더의 노트가 발행에서 제외되는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 사용자가 설정에서 제외 폴더로 "Private"를 지정했을 때, **When** 발행을 실행하면, **Then** "Private" 폴더 내의 노트는 업로드되지 않습니다.
2. **Given** 여러 개의 제외 폴더가 지정되었을 때, **When** 발행을 실행하면, **Then** 지정된 모든 폴더의 노트가 제외됩니다.
3. **Given** 하위 폴더를 포함하는 폴더가 제외되었을 때, **When** 발행을 실행하면, **Then** 해당 폴더와 모든 하위 폴더의 노트가 제외됩니다.

---

### User Story 3 - Exclude Notes by Tag (Priority: P2)

사용자는 특정 태그가 있는 노트를 발행에서 제외하고 싶어합니다. 예를 들어, `#private` 또는 `#wip` 태그가 있는 노트는 발행하지 않으려고 합니다.

**Why this priority**: 폴더 기반 필터링 후 더 세밀한 제어를 위한 기능입니다. 여러 폴더에 흩어진 비공개 노트를 태그로 쉽게 관리할 수 있습니다.

**Independent Test**: 설정에서 제외 태그를 지정한 후 발행을 실행하면, 해당 태그가 있는 노트가 제외되는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 사용자가 설정에서 제외 태그로 "private"를 지정했을 때, **When** 발행을 실행하면, **Then** `#private` 태그가 있는 노트는 업로드되지 않습니다.
2. **Given** 여러 개의 제외 태그가 지정되었을 때, **When** 발행을 실행하면, **Then** 지정된 태그 중 하나라도 있는 노트는 제외됩니다.
3. **Given** 노트에 제외 태그와 다른 태그가 함께 있을 때, **When** 발행을 실행하면, **Then** 해당 노트는 제외됩니다.

---

### User Story 4 - Set Root Folder for Publishing (Priority: P2)

사용자는 특정 폴더를 Quartz의 루트로 설정하고 싶어합니다. 예를 들어, "Blog" 폴더를 루트로 설정하면 "Blog/posts/hello.md"가 "/posts/hello"로 발행됩니다.

**Why this priority**: 폴더 구조를 깔끔하게 유지하면서 발행된 사이트의 URL 구조를 제어할 수 있습니다.

**Independent Test**: 루트 폴더를 설정한 후 발행을 실행하면, 해당 폴더 기준으로 경로가 생성되는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 사용자가 "Blog" 폴더를 루트로 설정했을 때, **When** "Blog/posts/hello.md"를 발행하면, **Then** Quartz에서 "/posts/hello" 경로로 접근 가능합니다.
2. **Given** 루트 폴더가 설정되었을 때, **When** 루트 폴더 외부의 노트를 발행하려고 하면, **Then** 해당 노트는 발행에서 제외됩니다.
3. **Given** 루트 폴더가 설정되지 않았을 때, **When** 발행을 실행하면, **Then** vault 루트 기준으로 경로가 생성됩니다.

---

### User Story 5 - Configure Home Page (Priority: P3)

사용자는 Quartz 사이트의 홈 페이지로 사용할 노트를 지정하고 싶어합니다. Quartz에서 홈 페이지는 `content/index.md` 파일로 결정됩니다.

**Why this priority**: 홈 페이지 설정은 사이트의 첫인상을 결정하는 중요한 기능이지만, 필터링 기능이 먼저 동작해야 의미가 있습니다.

**Independent Test**: 홈 페이지로 사용할 노트를 지정한 후 발행을 실행하면, 해당 노트가 Quartz의 index.md로 업로드되는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 사용자가 "Welcome" 노트를 홈 페이지로 지정했을 때, **When** 발행을 실행하면, **Then** 해당 노트가 Quartz의 content/index.md로 업로드됩니다.
2. **Given** 홈 페이지가 지정되었을 때, **When** 원본 노트는 원래 경로에도 존재해야 하는 경우, **Then** 시스템은 원본 경로와 index.md 두 곳에 콘텐츠를 유지합니다.
3. **Given** 홈 페이지가 지정되지 않았을 때, **When** 발행을 실행하면, **Then** 기존 index.md가 있으면 유지하고, 없으면 Quartz 기본 동작을 따릅니다.

---

### Edge Cases

- 포함 폴더와 제외 폴더가 겹치는 경우 어떻게 처리하나요? (예: "Blog" 포함, "Blog/drafts" 제외)
  - 제외 규칙이 우선 적용됩니다.
- 존재하지 않는 폴더를 포함/제외 목록에 추가하면 어떻게 되나요?
  - 경고 메시지를 표시하고 해당 항목은 무시합니다.
- 홈 페이지로 지정된 노트가 제외 폴더나 제외 태그에 해당하는 경우 어떻게 되나요?
  - 홈 페이지 설정이 우선 적용되어 해당 노트는 index.md로 발행됩니다.
- 폴더 경로에 특수 문자가 포함된 경우 어떻게 처리하나요?
  - Quartz의 URL 인코딩 규칙을 따릅니다.
- 루트 폴더 내에 index.md 파일이 이미 있는 경우 어떻게 되나요?
  - 홈 페이지 설정이 있으면 지정된 노트로 대체되고, 없으면 기존 index.md가 유지됩니다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 사용자가 발행에 포함할 폴더 목록을 지정할 수 있어야 합니다.
- **FR-002**: 시스템은 사용자가 발행에서 제외할 폴더 목록을 지정할 수 있어야 합니다.
- **FR-003**: 시스템은 사용자가 발행에서 제외할 태그 목록을 지정할 수 있어야 합니다.
- **FR-004**: 시스템은 사용자가 특정 폴더를 발행 루트로 설정할 수 있어야 합니다.
- **FR-005**: 시스템은 사용자가 홈 페이지로 사용할 노트를 지정할 수 있어야 합니다.
- **FR-006**: 포함 폴더와 제외 폴더가 겹치는 경우, 제외 규칙이 우선 적용되어야 합니다.
- **FR-007**: 시스템은 존재하지 않는 폴더/노트가 설정에 포함된 경우 사용자에게 경고해야 합니다.
- **FR-008**: 홈 페이지로 지정된 노트는 Quartz의 content/index.md 경로로 업로드되어야 합니다.
- **FR-009**: 설정 변경은 저장되어 다음 발행 시에도 유지되어야 합니다.
- **FR-010**: 시스템은 여러 폴더와 태그를 동시에 필터링할 수 있어야 합니다.

### Key Entities

- **PublishFilter**: 발행 필터링 규칙을 나타냅니다. 포함 폴더 목록, 제외 폴더 목록, 제외 태그 목록을 포함합니다.
- **RootFolderSetting**: 발행 루트로 사용할 폴더 경로를 나타냅니다. 설정 시 해당 폴더 기준으로 모든 경로가 재계산됩니다.
- **HomePageSetting**: 홈 페이지로 사용할 노트의 경로를 나타냅니다. 해당 노트는 content/index.md로 발행됩니다.

### Assumptions

- 폴더 경로는 vault 루트 기준 상대 경로로 지정됩니다.
- 태그는 `#` 접두사 없이 저장됩니다 (예: "private", "wip").
- Quartz의 ignorePatterns 설정과 플러그인의 필터 설정은 독립적으로 동작합니다.
- 하위 폴더는 상위 폴더의 포함/제외 규칙을 상속받습니다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자는 30초 이내에 포함/제외 폴더를 설정할 수 있습니다.
- **SC-002**: 사용자는 30초 이내에 제외 태그를 설정할 수 있습니다.
- **SC-003**: 필터링된 발행 결과가 설정과 100% 일치합니다 (지정된 폴더/태그만 포함/제외).
- **SC-004**: 사용자는 1분 이내에 루트 폴더와 홈 페이지를 설정할 수 있습니다.
- **SC-005**: 설정 저장 후 플러그인 재시작 시에도 모든 설정이 유지됩니다.
