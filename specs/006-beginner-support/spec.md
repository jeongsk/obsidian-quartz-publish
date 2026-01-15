# Feature Specification: 초보자 지원 (Beginner Support)

**Feature Branch**: `006-beginner-support`  
**Created**: 2026-01-14  
**Status**: Draft  
**Input**: User description: "Phase 4: 초보자 지원 - Quartz 자동 리포지토리 생성 및 배포 가이드"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quartz 리포지토리 자동 생성 (Priority: P1)

Quartz 블로그를 시작하고 싶지만 GitHub/터미널 작업이 익숙하지 않은 사용자가 플러그인 설정 화면에서 버튼 하나로 자신의 GitHub 계정에 Quartz 리포지토리를 자동으로 생성할 수 있습니다.

**Why this priority**: 리포지토리가 없으면 플러그인의 모든 기능을 사용할 수 없으므로 초보자 지원의 핵심 기능입니다. 이 기능이 없으면 사용자는 직접 GitHub에서 템플릿을 포크하고 설정해야 하는 복잡한 과정을 거쳐야 합니다.

**Independent Test**: 설정 화면에서 "Create Quartz Repository" 버튼을 클릭하여 리포지토리가 생성되고, 해당 리포지토리 URL이 자동으로 설정에 입력되는 것을 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 유효한 GitHub PAT가 설정되어 있고 Repository URL이 비어있을 때, **When** 사용자가 "Create Quartz Repository" 버튼을 클릭하면, **Then** jackyzha0/quartz 템플릿을 기반으로 새 리포지토리가 생성되고 Repository URL이 자동으로 채워집니다.

2. **Given** 리포지토리 생성 중일 때, **When** 사용자가 화면을 보고 있으면, **Then** 진행 상황(생성 중, 완료, 실패)이 표시됩니다.

3. **Given** 리포지토리 생성이 실패했을 때, **When** 오류가 발생하면, **Then** 사용자에게 이해하기 쉬운 오류 메시지와 해결 방법이 표시됩니다.

4. **Given** 이미 Repository URL이 설정되어 있을 때, **When** 사용자가 설정 화면을 열면, **Then** "Create Quartz Repository" 버튼은 비활성화되거나 숨겨집니다.

---

### User Story 2 - 리포지토리 이름 지정 (Priority: P1)

사용자가 자동 생성되는 Quartz 리포지토리의 이름을 직접 지정할 수 있습니다.

**Why this priority**: 사용자는 자신의 블로그 이름이나 용도에 맞는 리포지토리 이름을 원할 수 있으며, 이는 리포지토리 생성과 함께 진행되어야 하는 필수 기능입니다.

**Independent Test**: 리포지토리 이름 입력 필드에 원하는 이름을 입력한 후 생성하면, 해당 이름으로 리포지토리가 생성되는 것을 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 리포지토리 생성 화면에서, **When** 사용자가 리포지토리 이름 필드에 "my-digital-garden"을 입력하고 생성 버튼을 클릭하면, **Then** "my-digital-garden" 이름으로 리포지토리가 생성됩니다.

2. **Given** 리포지토리 이름 입력 필드가 비어있을 때, **When** 생성 버튼을 클릭하면, **Then** 기본값 "quartz"로 리포지토리가 생성됩니다.

3. **Given** 이미 동일한 이름의 리포지토리가 존재할 때, **When** 생성을 시도하면, **Then** "이미 존재하는 리포지토리 이름입니다. 다른 이름을 입력해주세요." 메시지가 표시됩니다.

4. **Given** 유효하지 않은 리포지토리 이름을 입력했을 때(특수문자, 공백 등), **When** 생성을 시도하면, **Then** 유효성 검사 오류 메시지가 표시됩니다.

---

### User Story 3 - 배포 가이드 제공 (Priority: P2)

리포지토리 생성 후 사용자가 Quartz 블로그를 웹에 배포하는 방법을 안내받습니다. GitHub Pages 배포 방법을 단계별로 설명합니다.

**Why this priority**: 리포지토리만 생성되면 블로그가 웹에 공개되지 않으므로, 배포 가이드는 완전한 사용자 경험을 위해 필요합니다. 다만 리포지토리 생성 후에 진행되는 후속 단계이므로 P2입니다.

**Independent Test**: 리포지토리 생성 완료 후 배포 가이드 버튼을 클릭하여 단계별 안내를 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 리포지토리 생성이 완료되었을 때, **When** 사용자가 완료 화면을 보면, **Then** "배포 가이드 보기" 버튼이 표시됩니다.

2. **Given** 배포 가이드 화면에서, **When** 사용자가 GitHub Pages 배포 옵션을 선택하면, **Then** GitHub Pages 설정 방법이 단계별로 표시됩니다.

3. **Given** 배포 가이드 단계 중, **When** 외부 링크가 필요한 경우, **Then** 해당 링크(GitHub 설정 페이지 등)를 클릭하면 브라우저에서 열립니다.

---

### User Story 4 - GitHub Actions 자동 설정 (Priority: P2)

리포지토리 생성 시 Quartz 빌드 및 배포를 위한 GitHub Actions 워크플로우가 자동으로 활성화됩니다.

**Why this priority**: Quartz 템플릿에는 이미 GitHub Actions 워크플로우가 포함되어 있으나, 초보자가 Actions를 활성화하고 권한을 설정하는 것이 어려울 수 있습니다.

**Independent Test**: 생성된 리포지토리에서 Actions 탭을 확인하여 워크플로우가 활성화되어 있는지 확인할 수 있습니다.

**Acceptance Scenarios**:

1. **Given** 리포지토리가 생성될 때, **When** 템플릿이 복제되면, **Then** GitHub Actions 워크플로우 파일이 포함됩니다.

2. **Given** 리포지토리 생성 완료 후, **When** 배포 가이드에서 Actions 설정을 안내할 때, **Then** Actions 활성화 방법과 권한 설정 방법이 명확히 안내됩니다.

---

### Edge Cases

- 사용자의 GitHub 계정에 리포지토리 생성 권한이 없는 경우 어떻게 처리하나요?
  - 명확한 오류 메시지를 표시하고, PAT에 필요한 권한(repo 스코프)을 확인하도록 안내합니다.

- 네트워크 오류로 리포지토리 생성이 중단된 경우 어떻게 처리하나요?
  - 재시도 버튼을 제공하고, 부분적으로 생성된 리포지토리가 있다면 이를 감지하여 안내합니다.

- GitHub API Rate Limit에 도달한 경우 어떻게 처리하나요?
  - Rate Limit 상태를 확인하고, 대기 시간을 안내하는 메시지를 표시합니다.

- 리포지토리 이름이 GitHub 예약어와 충돌하는 경우 어떻게 처리하나요?
  - GitHub API 응답의 오류 메시지를 파싱하여 사용자에게 다른 이름을 사용하도록 안내합니다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 설정 화면에서 "Create Quartz Repository" 버튼을 제공해야 합니다.
- **FR-002**: 시스템은 사용자가 리포지토리 이름을 입력할 수 있는 필드를 제공해야 합니다 (기본값: "quartz").
- **FR-002a**: 시스템은 리포지토리 공개 범위(Public/Private)를 선택할 수 있는 옵션을 제공해야 합니다 (기본값: Public). Private 선택 시 GitHub Pro 필요 안내를 표시합니다.
- **FR-003**: 시스템은 jackyzha0/quartz 템플릿을 사용하여 사용자의 GitHub 계정에 새 리포지토리를 생성해야 합니다.
- **FR-004**: 시스템은 리포지토리 생성 진행 상황을 사용자에게 표시해야 합니다.
- **FR-005**: 시스템은 리포지토리 생성 완료 후 Repository URL을 자동으로 설정에 입력해야 합니다.
- **FR-006**: 시스템은 리포지토리 생성 실패 시 이해하기 쉬운 오류 메시지와 해결 방법을 표시해야 합니다.
- **FR-007**: 시스템은 이미 Repository URL이 설정된 경우 생성 버튼을 비활성화해야 합니다.
- **FR-008**: 시스템은 리포지토리 이름 유효성 검사를 수행해야 합니다 (특수문자, 공백, 예약어 등).
- **FR-009**: 시스템은 동일한 이름의 리포지토리가 이미 존재하는지 확인해야 합니다.
- **FR-010**: 시스템은 리포지토리 생성 완료 후 배포 가이드를 제공해야 합니다.
- **FR-011**: 시스템은 플러그인 내 모달을 통해 GitHub Pages 배포 방법을 단계별로 안내해야 합니다.
- **FR-012**: 시스템은 배포 가이드 모달 내에서 외부 링크(GitHub 설정 페이지)를 브라우저에서 열 수 있어야 합니다.

### Key Entities

- **QuartzRepository**: 생성되는 Quartz 리포지토리를 나타냅니다. 이름, 소유자, URL, 생성 상태를 포함합니다.
- **DeploymentGuide**: 배포 가이드 정보를 나타냅니다. 배포 플랫폼(GitHub Pages), 단계별 지침, 관련 링크를 포함합니다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GitHub/터미널 경험이 없는 사용자가 플러그인만으로 Quartz 리포지토리를 3분 이내에 생성할 수 있습니다.
- **SC-002**: 리포지토리 생성 성공률이 95% 이상입니다 (네트워크 오류 제외).
- **SC-003**: 사용자가 배포 가이드를 따라 10분 이내에 GitHub Pages 배포를 완료할 수 있습니다.
- **SC-004**: 오류 발생 시 80% 이상의 사용자가 오류 메시지만으로 문제를 이해하고 해결할 수 있습니다.

## Assumptions

- 사용자는 유효한 GitHub 계정을 보유하고 있습니다.
- 사용자는 이미 플러그인 설정에서 GitHub PAT를 입력했습니다.
- GitHub PAT에는 최소한 `repo` 스코프 권한이 포함되어 있습니다.
- jackyzha0/quartz 리포지토리는 GitHub 템플릿으로 사용 가능한 상태입니다.
- 사용자의 GitHub 계정에서 퍼블릭 리포지토리 생성이 허용되어 있습니다.
- 배포 플랫폼은 GitHub Pages만 지원합니다 (Vercel 등 다른 플랫폼은 향후 확장 가능).

## Clarifications

### Session 2026-01-14

- Q: 리포지토리 공개 범위 (Repository Visibility) → A: Public/Private 선택 가능 (Private은 GitHub Pro 필요 안내)
- Q: 배포 가이드 제공 방식 (Deployment Guide Format) → A: 플러그인 내 모달에서 단계별 안내 (외부 링크는 브라우저로 열기)

## Out of Scope

- Vercel, Netlify 등 다른 배포 플랫폼 지원
- 리포지토리 삭제 기능
- 기존 리포지토리를 Quartz로 변환하는 기능
- 자동 도메인 설정 (커스텀 도메인)
- GitHub Actions 워크플로우 자동 실행 트리거
