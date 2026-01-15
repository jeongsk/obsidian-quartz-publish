# Feature Specification: Quartz 고급 설정 관리

**Feature Branch**: `004-advanced-quartz-config`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "quartz.config.ts 설정을 업데이트 할 수 있는 고급 기능을 더 추가하자. pageTitle, locale, baseUrl 등등 너가 살펴보고 제안해줘. 그리고 자동 커밋 보다는 사용자가 적용 버튼을 눌렀을때 커밋&푸시 되는 방법이 더 좋은것 같습니다. 이런 경우에는 사용자가 충분히 인지할 수 있게 안내해야합니다."

## Clarifications

### Session 2026-01-14

- Q: 기존 설정 기능(ExplicitPublish, ignorePatterns, urlStrategy)과의 통합 방식 → A: 기존 설정도 "적용" 버튼 방식으로 통합하여 일관된 UX 제공
- Q: 커밋 메시지 생성 방식 → A: 변경된 항목을 모두 요약한 단일 커밋 (예: "Update Quartz config: pageTitle, locale, enableSPA")
- Q: 원격 충돌 감지 시점 → A: "적용" 클릭 시 원격 SHA 확인 후 충돌 시 경고 표시
- Q: 설정 UI 구성 방식 → A: 단일 페이지에서 섹션 헤딩으로 구분 (Site Info, Behavior, Analytics 등)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 사이트 기본 정보 설정 (Priority: P1)

사용자가 플러그인 설정 화면에서 Quartz 사이트의 기본 정보(페이지 제목, 기본 URL, 언어/로케일)를 직관적인 UI로 설정할 수 있다. 이를 통해 사용자는 코드 편집 없이 사이트 정체성을 정의할 수 있다.

**Why this priority**: 페이지 제목, baseUrl, locale은 모든 Quartz 사이트에서 필수적으로 설정해야 하는 기본 정보이다. 특히 baseUrl은 사이트 배포 시 필수이며, 잘못 설정하면 모든 링크가 깨지므로 가장 높은 우선순위를 갖는다.

**Independent Test**: 설정 화면에서 각 필드를 수정한 후 GitHub에서 `quartz.config.ts` 파일을 확인하여 `pageTitle`, `baseUrl`, `locale` 값이 올바르게 변경되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 플러그인이 GitHub에 연결된 상태, **When** 사용자가 설정 화면을 열면, **Then** `quartz.config.ts`에서 현재 pageTitle, baseUrl, locale 값을 불러와 입력 필드에 표시한다.
2. **Given** 사용자가 pageTitle을 "My Digital Garden"으로 변경한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 `pageTitle` 값이 업데이트되고 GitHub에 커밋&푸시된다.
3. **Given** 사용자가 baseUrl을 입력한 경우, **When** URL 형식이 올바르지 않으면, **Then** 유효성 검사 오류 메시지가 표시되고 적용이 차단된다.
4. **Given** 사용자가 locale 드롭다운에서 "ko-KR"를 선택한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 `locale` 값이 "ko-KR"로 업데이트된다.

---

### User Story 2 - 명시적 적용 흐름 및 사용자 안내 (Priority: P1)

설정 변경 시 자동 커밋 대신 사용자가 "적용" 버튼을 눌러야만 변경사항이 GitHub에 커밋&푸시된다. 변경사항이 있을 때 사용자에게 명확한 시각적 피드백을 제공하고, 적용 전 확인 단계를 거친다.

**Why this priority**: 기존 자동 커밋 방식은 사용자가 의도치 않게 변경사항을 푸시할 수 있는 위험이 있다. 명시적인 적용 흐름은 사용자에게 통제권을 주고, 실수로 인한 문제를 방지한다. 이는 모든 설정 기능의 기반이 되므로 최우선 순위이다.

**Independent Test**: 설정을 변경한 후 "적용" 버튼을 누르지 않고 설정 화면을 닫으면 변경사항이 GitHub에 반영되지 않았는지 확인하고, "적용" 버튼을 누른 후에만 커밋이 생성되는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면에서 아무 값도 변경하지 않은 상태, **When** 설정 화면을 보면, **Then** "적용" 버튼이 비활성화 상태이다.
2. **Given** 사용자가 하나 이상의 설정 값을 변경한 경우, **When** 변경 직후, **Then** "적용" 버튼이 활성화되고 "저장되지 않은 변경사항이 있습니다" 라벨이 표시된다.
3. **Given** 저장되지 않은 변경사항이 있는 상태, **When** 사용자가 "적용" 버튼을 클릭하면, **Then** 확인 모달이 표시되고 "변경사항을 GitHub에 커밋&푸시합니다. 계속하시겠습니까?"라는 메시지를 보여준다.
4. **Given** 확인 모달에서 "확인"을 선택한 경우, **When** 커밋&푸시가 완료되면, **Then** 성공 알림이 표시되고 "적용" 버튼이 다시 비활성화된다.
5. **Given** 저장되지 않은 변경사항이 있는 상태, **When** 사용자가 설정 화면을 닫으려 하면, **Then** "저장되지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?"라는 경고가 표시된다.

---

### User Story 3 - 사이트 동작 옵션 설정 (Priority: P2)

사용자가 SPA(Single Page Application) 모드, 팝오버 미리보기 기능의 활성화 여부를 설정할 수 있다. 이러한 동작 옵션은 사이트의 사용자 경험에 직접적인 영향을 미친다.

**Why this priority**: enableSPA와 enablePopovers는 사이트 UX에 영향을 미치지만, 기본값으로도 잘 동작하므로 기본 정보 설정보다 우선순위가 낮다.

**Independent Test**: SPA 또는 Popovers 토글을 변경한 후 GitHub에서 `quartz.config.ts`의 해당 설정 값이 올바르게 변경되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면을 열었을 때, **When** 현재 `enableSPA`가 true로 설정되어 있으면, **Then** SPA 모드 토글이 켜진 상태로 표시된다.
2. **Given** 사용자가 SPA 토글을 끈 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 `enableSPA`가 false로 업데이트된다.
3. **Given** 사용자가 팝오버 토글을 켠 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 `enablePopovers`가 true로 업데이트된다.

---

### User Story 4 - 애널리틱스 설정 (Priority: P3)

사용자가 사이트 방문 분석을 위한 애널리틱스 서비스(Google Analytics, Plausible, Umami 등)를 설정할 수 있다. 각 서비스에 맞는 필수 정보(추적 ID 등)를 입력할 수 있다.

**Why this priority**: 애널리틱스는 사이트 운영에 유용하지만 필수 기능은 아니며, 많은 사용자가 설정하지 않고도 사용하므로 우선순위가 낮다.

**Independent Test**: Google Analytics 또는 Plausible을 선택하고 추적 ID를 입력한 후 GitHub에서 `quartz.config.ts`의 `analytics` 섹션이 올바르게 업데이트되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면의 애널리틱스 섹션, **When** 사용자가 "Google Analytics"를 선택하면, **Then** Google Analytics 추적 ID 입력 필드가 표시된다.
2. **Given** 사용자가 Google Analytics를 선택하고 추적 ID "G-XXXXXXXXXX"를 입력한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 analytics 설정이 `{ provider: "google", tagId: "G-XXXXXXXXXX" }`로 업데이트된다.
3. **Given** 사용자가 "Plausible"를 선택한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 analytics 설정이 `{ provider: "plausible" }`로 업데이트된다.
4. **Given** 사용자가 "없음"을 선택한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 analytics 설정이 `{ provider: "null" }`로 업데이트된다.

---

### User Story 5 - 기본 날짜 타입 설정 (Priority: P3)

사용자가 노트의 기본 날짜 표시 타입(`created`, `modified`, `published`)을 선택할 수 있다. 이 설정은 노트 목록이나 메타데이터에서 어떤 날짜를 기본으로 표시할지 결정한다.

**Why this priority**: 날짜 타입 설정은 콘텐츠 표시에 영향을 미치지만 기본값(created)으로도 충분히 사용 가능하므로 우선순위가 낮다.

**Independent Test**: 기본 날짜 타입을 "modified"로 변경한 후 GitHub에서 `quartz.config.ts`의 `defaultDateType` 값이 변경되었는지 검증할 수 있다.

**Acceptance Scenarios**:

1. **Given** 설정 화면을 열었을 때, **When** 현재 `defaultDateType`이 "created"로 설정되어 있으면, **Then** 드롭다운에서 "생성일(created)"이 선택된 상태로 표시된다.
2. **Given** 사용자가 "수정일(modified)"를 선택한 경우, **When** "적용" 버튼을 클릭하면, **Then** `quartz.config.ts`의 `defaultDateType`이 "modified"로 업데이트된다.

---

### Edge Cases

- 네트워크 연결이 끊어진 상태에서 설정을 변경한 후 "적용"을 시도하면 어떻게 되는가?
  - 네트워크 오류 메시지를 표시하고 변경사항을 로컬에 유지하여 재시도할 수 있게 한다.
- 사용자가 baseUrl에 잘못된 형식(예: 슬래시로 끝나는 URL)을 입력하면 어떻게 되는가?
  - 자동으로 정규화하거나 유효성 검사 오류를 표시한다.
- GitHub에서 다른 사람이 `quartz.config.ts`를 직접 수정하여 충돌이 발생하면 어떻게 되는가?
  - 충돌 감지 시 사용자에게 알리고, 최신 설정을 다시 불러온 후 변경사항을 재적용할 수 있는 옵션을 제공한다.
- 사용자가 설정을 변경한 후 브라우저를 새로고침하면 저장되지 않은 변경사항은 어떻게 되는가?
  - 저장되지 않은 변경사항은 손실되며, 설정 화면 재진입 시 GitHub에서 현재 값을 다시 로드한다.
- analytics provider로 지원하지 않는 값이 설정파일에 이미 있으면 어떻게 되는가?
  - "기타(Custom)" 옵션으로 표시하고, 직접 편집하지 않는 한 해당 값을 유지한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 `quartz.config.ts`에서 pageTitle, baseUrl, locale 값을 파싱하여 표시해야 한다.
- **FR-002**: 시스템은 pageTitle 입력 필드를 제공하고, 입력값이 빈 문자열이 아닌지 검증해야 한다.
- **FR-003**: 시스템은 baseUrl 입력 필드를 제공하고, 올바른 도메인 형식인지 검증해야 한다.
- **FR-004**: 시스템은 locale 선택을 위한 드롭다운을 제공하고, 일반적인 로케일 코드 목록을 표시해야 한다.
- **FR-005**: 시스템은 enableSPA 및 enablePopovers 토글을 제공해야 한다.
- **FR-006**: 시스템은 analytics provider를 선택할 수 있는 드롭다운을 제공해야 한다 (없음, Google Analytics, Plausible, Umami 등).
- **FR-007**: Google Analytics 선택 시 추적 ID 입력 필드를 표시해야 한다.
- **FR-008**: 시스템은 defaultDateType을 선택할 수 있는 드롭다운을 제공해야 한다 (created, modified, published).
- **FR-009**: 시스템은 변경사항이 있을 때만 "적용" 버튼을 활성화해야 한다.
- **FR-010**: "적용" 버튼 클릭 시 시스템은 확인 모달을 표시하고 사용자 동의를 받아야 한다.
- **FR-011**: 확인 후 시스템은 변경된 설정을 `quartz.config.ts`에 반영하고 GitHub에 커밋&푸시해야 한다.
- **FR-012**: 커밋&푸시 성공/실패 시 시스템은 사용자에게 명확한 피드백을 제공해야 한다.
- **FR-013**: 저장되지 않은 변경사항이 있을 때 설정 화면 이탈 시 시스템은 경고를 표시해야 한다.
- **FR-014**: 시스템은 설정 화면 진입 시 GitHub에서 현재 설정값을 로드해야 한다.
- **FR-015**: baseUrl 입력 시 프로토콜(https://)이 없는 경우 자동으로 정규화해야 한다.
- **FR-016**: 기존 설정 기능(ExplicitPublish, ignorePatterns, urlStrategy)도 동일한 "적용" 버튼 방식으로 통합하여 일관된 UX를 제공해야 한다.
- **FR-017**: 커밋 메시지는 변경된 설정 항목들을 요약한 단일 커밋으로 생성해야 한다 (예: "Update Quartz config: pageTitle, locale, enableSPA").
- **FR-018**: "적용" 버튼 클릭 시 시스템은 원격 파일의 SHA를 확인하여 충돌 여부를 감지해야 한다.
- **FR-019**: 충돌 감지 시 시스템은 사용자에게 경고를 표시하고, 최신 설정을 다시 불러온 후 변경사항을 재적용할 수 있는 옵션을 제공해야 한다.
- **FR-020**: 설정 UI는 단일 페이지에서 섹션 헤딩(Site Info, Behavior, Analytics 등)으로 구분하여 표시해야 한다.

### Key Entities

- **QuartzSiteConfig**: Quartz 사이트의 기본 설정을 나타내는 엔티티. pageTitle, baseUrl, locale, enableSPA, enablePopovers, analytics, defaultDateType 등의 속성을 포함한다.
- **AnalyticsConfig**: 애널리틱스 설정을 나타내는 엔티티. provider(google, plausible, umami, null)와 선택적 tagId/host 속성을 포함한다.
- **PendingChanges**: 저장되지 않은 변경사항을 추적하는 엔티티. 변경된 필드 목록과 이전/현재 값을 포함한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 터미널이나 코드 편집기 없이 모든 기본 사이트 설정(pageTitle, baseUrl, locale)을 완료할 수 있어야 한다.
- **SC-002**: 사용자가 "적용" 버튼을 클릭한 후 15초 이내에 커밋&푸시가 완료되어야 한다.
- **SC-003**: 설정 변경의 성공률이 95% 이상이어야 한다 (네트워크 오류 제외).
- **SC-004**: 사용자가 저장되지 않은 변경사항이 있는 상태에서 실수로 화면을 닫는 비율이 5% 미만이어야 한다 (경고 기능으로 방지).
- **SC-005**: 설정 화면에서 현재 설정값 로딩이 5초 이내에 완료되어야 한다.
- **SC-006**: 입력 유효성 검사 오류가 발생했을 때 100%의 경우 사용자가 이해할 수 있는 오류 메시지가 표시되어야 한다.

## Assumptions

- 사용자의 Quartz 리포지토리에는 표준 `quartz.config.ts` 파일 구조가 존재한다.
- GitHub Personal Access Token에 리포지토리 읽기/쓰기/푸시 권한이 있다.
- `quartz.config.ts`의 configuration 블록 내 설정들은 Quartz 4.x 표준 구조를 따른다.
- 지원하는 locale 코드는 BCP 47 표준을 따른다 (예: en-US, ko-KR, ja-JP).
- 지원하는 analytics provider는 Quartz 공식 문서에 명시된 것들(google, plausible, umami, null)이다.

## Out of Scope

- 테마 색상 및 폰트 커스터마이징 (theme.colors, theme.typography)
- 플러그인(transformers, filters, emitters) 세부 설정
- 레이아웃(layout) 커스터마이징
- RSS/사이트맵 설정
- 다중 리포지토리 관리
- 설정 변경 이력 및 롤백 기능 (Git 히스토리로 대체)
