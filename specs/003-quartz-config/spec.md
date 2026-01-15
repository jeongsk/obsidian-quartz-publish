# Feature Specification: Quartz 설정 관리

**Feature Branch**: `003-quartz-config`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Phase 3: Quartz 설정 관리 - ExplicitPublish 토글, 제외 패턴, URL 전략, Quartz 업그레이드"

## Clarifications

### Session 2026-01-13

- Q: 설정 변경 커밋 전략 → A: 각 설정 변경마다 즉시 개별 커밋
- Q: Quartz 업그레이드 구현 방식 → A: GitHub API로 jackyzha0/quartz 템플릿의 핵심 파일만 복사하여 업데이트

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ExplicitPublish 설정 변경 (Priority: P1)

사용자가 Obsidian 플러그인 설정 화면에서 "일부만 공개" 옵션을 토글하면, Quartz 리포지토리의 `quartz.config.ts` 파일에서 `ExplicitPublish()` 플러그인이 활성화 또는 비활성화된다. 이를 통해 사용자는 `publish: true` 프론트매터가 있는 노트만 공개할지, 모든 노트를 공개할지 선택할 수 있다.

**Why this priority**: 노트 발행의 핵심 동작을 결정하는 가장 중요한 설정이다. 개인 노트와 공개 노트를 구분하는 것은 디지털 가든 운영의 기본 요구사항이다.

**Independent Test**: "일부만 공개" 토글을 켜고 끈 후 GitHub에서 `quartz.config.ts` 파일의 `plugins.filters` 배열을 확인하여 `ExplicitPublish()` 플러그인 존재 여부를 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 플러그인이 설치되고 GitHub 연동이 완료된 상태, **When** 사용자가 설정 화면에서 "일부만 공개" 토글을 켜면, **Then** `quartz.config.ts`의 `plugins.filters` 배열에 `ExplicitPublish()`가 추가되고 커밋된다.
2. **Given** "일부만 공개"가 활성화된 상태, **When** 사용자가 토글을 끄면, **Then** `quartz.config.ts`의 `plugins.filters` 배열에서 `ExplicitPublish()`가 제거되고 커밋된다.
3. **Given** 설정 변경이 성공한 경우, **When** 커밋이 완료되면, **Then** 사용자에게 성공 알림이 표시된다.
4. **Given** 네트워크 오류가 발생한 경우, **When** 설정 변경에 실패하면, **Then** 사용자에게 오류 메시지가 표시되고 로컬 설정이 롤백된다.

---

### User Story 2 - 제외 패턴 설정 (Priority: P2)

사용자가 특정 폴더나 파일을 발행에서 제외하기 위해 패턴을 설정할 수 있다. 예를 들어, `private/*` 패턴을 추가하면 `private` 폴더 내의 모든 노트가 Quartz 빌드에서 제외된다.

**Why this priority**: 공개하지 않을 콘텐츠를 체계적으로 관리하는 데 필수적이다. ExplicitPublish보다 우선순위가 낮은 이유는 개별 파일 단위로도 `publish: false`로 제어할 수 있기 때문이다.

**Independent Test**: 제외 패턴을 추가한 후 GitHub에서 `quartz.config.ts` 파일의 `ignorePatterns` 배열을 확인하여 패턴이 올바르게 추가되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면의 제외 패턴 입력 필드, **When** 사용자가 `private/*` 패턴을 추가하면, **Then** `quartz.config.ts`의 `ignorePatterns` 배열에 해당 패턴이 추가되고 커밋된다.
2. **Given** 기존에 `drafts/*` 패턴이 설정된 상태, **When** 사용자가 해당 패턴을 삭제하면, **Then** `ignorePatterns` 배열에서 패턴이 제거되고 커밋된다.
3. **Given** 사용자가 잘못된 glob 패턴을 입력한 경우, **When** 저장을 시도하면, **Then** 유효성 검사 오류 메시지가 표시되고 저장되지 않는다.
4. **Given** 여러 패턴이 설정된 상태, **When** 설정 화면을 열면, **Then** 기존에 설정된 모든 패턴이 목록으로 표시된다.

---

### User Story 3 - URL 전략 변경 (Priority: P3)

사용자가 Quartz에서 생성되는 URL 형식을 선택할 수 있다. `shortestPaths` (짧은 URL)와 `absolutePaths` (전체 경로 URL) 중 선택할 수 있다.

**Why this priority**: URL 전략은 사이트의 링크 구조에 영향을 미치지만, 기본값으로도 충분히 사용 가능하므로 우선순위가 낮다.

**Independent Test**: URL 전략을 변경한 후 GitHub에서 `quartz.config.ts` 파일의 `urlStrategy` 값을 확인하여 올바르게 변경되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** URL 전략이 `shortestPaths`로 설정된 상태, **When** 사용자가 `absolutePaths`를 선택하면, **Then** `quartz.config.ts`의 `urlStrategy` 값이 `"absolutePaths"`로 변경되고 커밋된다.
2. **Given** URL 전략 선택 UI, **When** 설정 화면을 열면, **Then** 현재 설정된 URL 전략이 선택된 상태로 표시된다.

---

### User Story 4 - Quartz 업그레이드 (Priority: P4)

사용자가 설정 화면에서 Quartz의 최신 버전을 확인하고 원클릭으로 업그레이드할 수 있다. 업그레이드 시 사용자의 기존 설정은 보존된다.

**Why this priority**: 업그레이드는 주기적으로만 필요하며, 기존 기능 사용에 영향을 주지 않으므로 가장 낮은 우선순위이다.

**Independent Test**: 최신 버전이 있을 때 업그레이드 버튼을 클릭하여 GitHub 리포지토리가 최신 Quartz 버전으로 업데이트되고 기존 설정이 유지되는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면 진입 시, **When** 현재 Quartz 버전보다 새로운 버전이 있으면, **Then** "업그레이드 가능: v4.x.x → v4.y.y" 형태의 알림과 업그레이드 버튼이 표시된다.
2. **Given** 업그레이드 버튼이 표시된 상태, **When** 사용자가 버튼을 클릭하면, **Then** 업그레이드 진행 상황이 표시되고 완료 후 성공 메시지가 나타난다.
3. **Given** 업그레이드 완료 후, **When** `quartz.config.ts`를 확인하면, **Then** 사용자의 기존 설정(제목, 베이스 URL, 플러그인 등)이 보존되어 있다.
4. **Given** 이미 최신 버전인 경우, **When** 설정 화면을 열면, **Then** "최신 버전입니다 (v4.x.x)" 메시지가 표시되고 업그레이드 버튼은 비활성화된다.
5. **Given** 업그레이드 중 오류가 발생한 경우, **When** 실패하면, **Then** 오류 메시지가 표시되고 리포지토리 상태가 업그레이드 이전으로 복원된다.

---

### Edge Cases

- 네트워크 연결이 끊어진 상태에서 설정 변경을 시도하면 어떻게 되는가?
  - 오류 메시지를 표시하고 로컬 설정 변경을 취소한다.
- `quartz.config.ts` 파일이 손상되었거나 파싱할 수 없는 경우 어떻게 되는가?
  - 파일 파싱 오류를 사용자에게 알리고 수동 수정을 안내한다.
- 설정 변경 중 GitHub API Rate Limit에 도달하면 어떻게 되는가?
  - Rate Limit 상태를 감지하여 재시도 가능 시간을 사용자에게 안내한다.
- 사용자가 GitHub에서 직접 `quartz.config.ts`를 수정한 경우 동기화 충돌이 발생하면?
  - 원격 설정을 먼저 불러와 현재 상태를 반영한 후 변경을 진행한다.
- 업그레이드 시 사용자 커스텀 설정과 Quartz 기본 설정이 충돌하면?
  - 사용자 설정을 우선하고, 호환되지 않는 설정은 경고 메시지와 함께 기본값으로 대체한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 플러그인 설정 화면에서 "일부만 공개" 토글을 제공해야 한다.
- **FR-002**: "일부만 공개" 토글 변경 시 시스템은 `quartz.config.ts`의 `plugins.filters` 배열을 자동으로 수정해야 한다.
- **FR-003**: 시스템은 제외 패턴(glob pattern)을 추가, 수정, 삭제할 수 있는 UI를 제공해야 한다.
- **FR-004**: 제외 패턴 변경 시 시스템은 `quartz.config.ts`의 `ignorePatterns` 배열을 자동으로 수정해야 한다.
- **FR-005**: 시스템은 glob 패턴의 유효성을 검증하고 잘못된 패턴 입력 시 오류 메시지를 표시해야 한다.
- **FR-006**: 시스템은 URL 전략을 선택할 수 있는 드롭다운 UI를 제공해야 한다 (`shortestPaths`, `absolutePaths`).
- **FR-007**: URL 전략 변경 시 시스템은 `quartz.config.ts`의 `urlStrategy` 값을 자동으로 수정해야 한다.
- **FR-008**: 각 설정 변경은 즉시 개별적으로 GitHub 리포지토리에 커밋되어야 한다 (일괄 저장 방식이 아닌 즉시 반영).
- **FR-009**: 설정 변경의 성공 또는 실패를 사용자에게 알림으로 표시해야 한다.
- **FR-010**: 설정 화면 진입 시 시스템은 Quartz 최신 버전을 자동으로 확인해야 한다.
- **FR-011**: 최신 버전이 있을 경우 시스템은 현재 버전과 최신 버전 정보를 표시해야 한다.
- **FR-012**: 시스템은 원클릭 업그레이드 버튼을 제공해야 한다.
- **FR-013**: 업그레이드 시 시스템은 사용자의 기존 설정(제목, 베이스 URL, 플러그인 설정 등)을 보존해야 한다.
- **FR-014**: 업그레이드 진행 상황을 사용자에게 표시해야 한다.
- **FR-015**: 설정 화면 진입 시 시스템은 원격 `quartz.config.ts`에서 현재 설정값을 불러와 표시해야 한다.

### Key Entities

- **QuartzConfig**: Quartz 설정 파일(`quartz.config.ts`)의 내용을 나타내는 엔티티. 주요 속성으로 `plugins.filters` 배열, `ignorePatterns` 배열, `urlStrategy` 값을 포함한다.
- **PluginSetting**: 플러그인의 로컬 설정을 나타내는 엔티티. 원격 QuartzConfig와 동기화되는 "일부만 공개", "제외 패턴", "URL 전략" 설정값을 포함한다.
- **QuartzVersion**: Quartz 버전 정보를 나타내는 엔티티. 현재 설치된 버전과 최신 버전 정보를 포함한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 "일부만 공개" 토글을 변경한 후 10초 이내에 GitHub 커밋이 완료되어야 한다.
- **SC-002**: 설정 변경 작업의 성공률이 95% 이상이어야 한다 (네트워크 오류 제외).
- **SC-003**: 사용자가 설정 화면을 열면 5초 이내에 현재 설정값과 최신 버전 정보가 표시되어야 한다.
- **SC-004**: 업그레이드 후 사용자 커스텀 설정의 100%가 보존되어야 한다.
- **SC-005**: 사용자가 터미널이나 코드 편집 없이 모든 Quartz 설정 변경을 완료할 수 있어야 한다.
- **SC-006**: 설정 오류 발생 시 사용자가 이해할 수 있는 오류 메시지가 표시되어야 한다.

## Assumptions

- 사용자의 Quartz 리포지토리에는 표준 `quartz.config.ts` 파일 구조가 존재한다.
- GitHub Personal Access Token에 리포지토리 읽기/쓰기 권한이 있다.
- Quartz 최신 버전 정보는 jackyzha0/quartz GitHub 리포지토리의 릴리스 정보에서 가져온다.
- 업그레이드는 GitHub API를 통해 jackyzha0/quartz 템플릿의 핵심 파일(quartz 폴더 내 파일들)을 사용자 리포지토리에 복사하는 방식으로 수행된다.
- 업그레이드 시 `quartz.config.ts`, `content/` 폴더 등 사용자 설정 및 콘텐츠는 보존되고 Quartz 코어 파일만 업데이트된다.
- glob 패턴 유효성 검사는 표준 glob 문법을 기준으로 한다.

## Out of Scope

- Quartz 테마 커스터마이징 기능
- Quartz 플러그인(transformers, emitters) 세부 설정
- 다중 리포지토리 관리
- 설정 변경 이력 관리 및 롤백 기능 (Git 히스토리로 대체)
