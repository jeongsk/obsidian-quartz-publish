# Feature Specification: Quartz Publish Plugin

**Feature Branch**: `001-quartz-publish`
**Created**: 2026-01-13
**Status**: Draft
**Input**: User description: "Obsidian 노트를 Quartz 정적 사이트로 발행하는 플러그인"

## Clarifications

### Session 2026-01-13

- Q: 발행된 노트의 경로 결정 방식은? → A: 프론트매터 `path` 속성 우선 사용, 없으면 볼트 내 폴더 구조 유지
- Q: 발행 상태 추적 방식은? → A: 콘텐츠 해시 비교 (플러그인 데이터에 발행된 파일의 해시 저장)
- Q: 발행되지 않은 노트로의 내부 링크 처리는? → A: 링크 제거하고 텍스트만 유지 (예: `[[B]]` → `B`)
- Q: 첨부파일(이미지) 저장 경로는? → A: `static/` 폴더에 저장 (예: `static/images/note-name/image.png`)
- Q: `publish: true` 없는 노트에서 발행 명령 실행 시? → A: 자동으로 `publish: true` 추가 후 발행 진행

## User Scenarios & Testing *(mandatory)*

### User Story 1 - GitHub 연동 설정 (Priority: P1)

사용자가 Obsidian 플러그인 설정에서 GitHub Personal Access Token과 Quartz 리포지토리를 연결하여 발행 환경을 구성한다.

**Why this priority**: 모든 발행 기능의 기반이 되는 필수 설정으로, 이것이 없으면 어떤 노트도 발행할 수 없다.

**Independent Test**: 설정 탭에서 토큰과 리포지토리 URL을 입력하고 연결 테스트 버튼을 클릭하여 "연결 성공" 메시지를 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 플러그인이 설치된 상태, **When** 사용자가 설정 탭을 열면, **Then** GitHub 토큰 입력 필드와 리포지토리 URL 입력 필드가 표시된다
2. **Given** 유효한 토큰과 리포지토리 URL이 입력된 상태, **When** 연결 테스트 버튼을 클릭하면, **Then** 연결 성공 메시지와 함께 리포지토리 정보(이름, 마지막 커밋 등)가 표시된다
3. **Given** 잘못된 토큰이 입력된 상태, **When** 연결 테스트 버튼을 클릭하면, **Then** "토큰이 유효하지 않습니다" 오류 메시지가 표시된다
4. **Given** Quartz가 아닌 일반 리포지토리 URL이 입력된 상태, **When** 연결 테스트 버튼을 클릭하면, **Then** "Quartz 리포지토리가 아닙니다 (quartz.config.ts 없음)" 오류 메시지가 표시된다

---

### User Story 2 - 단일 노트 발행 (Priority: P1)

사용자가 현재 편집 중인 노트를 Quartz 리포지토리에 발행하여 웹사이트에 공개한다.

**Why this priority**: 플러그인의 핵심 가치를 전달하는 기본 기능으로, 최소 기능 제품(MVP)의 필수 요소이다.

**Independent Test**: 노트에 `publish: true` 프론트매터를 추가하고 커맨드 팔레트에서 "Publish to Quartz" 명령을 실행하여 성공 알림을 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** `publish: true` 프론트매터가 있는 노트, **When** 커맨드 팔레트에서 "Publish to Quartz"를 실행하면, **Then** 노트가 Quartz 리포지토리의 content 폴더에 업로드되고 성공 알림이 표시된다
2. **Given** 이미지가 포함된 노트, **When** 발행을 실행하면, **Then** 노트 내용과 함께 참조된 이미지 파일도 함께 업로드된다
3. **Given** 내부 링크가 포함된 노트, **When** 발행을 실행하면, **Then** `[[링크]]` 형식이 Quartz 호환 형식으로 변환되어 업로드된다
4. **Given** `draft: true` 프론트매터가 있는 노트, **When** 발행을 실행하면, **Then** 노트가 초안 상태로 업로드되어 Quartz의 RemoveDrafts 플러그인에 의해 비공개 처리된다

---

### User Story 3 - 파일 컨텍스트 메뉴 발행 (Priority: P2)

사용자가 파일 탐색기에서 노트를 우클릭하여 빠르게 발행한다.

**Why this priority**: 사용성을 개선하는 편의 기능으로, 커맨드 팔레트 없이도 빠른 접근을 제공한다.

**Independent Test**: 파일 탐색기에서 노트를 우클릭하고 "Publish to Quartz" 메뉴를 선택하여 발행할 수 있다.

**Acceptance Scenarios**:

1. **Given** `publish: true` 프론트매터가 있는 노트, **When** 파일 탐색기에서 우클릭하면, **Then** "Publish to Quartz" 컨텍스트 메뉴가 표시된다
2. **Given** 컨텍스트 메뉴가 표시된 상태, **When** "Publish to Quartz"를 클릭하면, **Then** 해당 노트가 발행되고 결과 알림이 표시된다

---

### User Story 4 - 발행 상태 대시보드 (Priority: P2)

사용자가 발행 현황을 한눈에 파악하고 여러 노트를 일괄 관리한다.

**Why this priority**: 다수의 노트를 관리하는 사용자에게 필수적인 기능으로, 발행 상태 추적과 일괄 작업을 가능하게 한다.

**Independent Test**: 커맨드 팔레트에서 "Open Publish Dashboard"를 실행하여 발행 상태별 노트 목록을 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 여러 노트가 있는 볼트, **When** 대시보드를 열면, **Then** 노트가 상태별로 분류되어 표시된다 (신규 발행 필요, 업데이트 필요, 삭제 필요, 최신 상태)
2. **Given** 대시보드에 노트 목록이 표시된 상태, **When** 여러 노트를 선택하고 "일괄 발행" 버튼을 클릭하면, **Then** 선택된 모든 노트가 순차적으로 발행되고 진행률이 표시된다
3. **Given** 로컬에서 삭제된 노트가 리포지토리에 존재하는 상태, **When** "전체 동기화"를 실행하면, **Then** 확인 모달이 표시되고 승인 시 리포지토리에서도 삭제된다

---

### User Story 5 - Quartz 설정 변경 (Priority: P3)

사용자가 플러그인 설정에서 Quartz의 주요 옵션을 변경한다.

**Why this priority**: 고급 사용자를 위한 부가 기능으로, 기본 발행 기능이 완성된 후 추가될 수 있다.

**Independent Test**: 설정에서 URL 규칙을 변경하고 저장하면 Quartz 설정 파일이 자동으로 업데이트되는 것을 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** GitHub 연동이 완료된 상태, **When** 설정에서 "일부만 공개" 옵션을 활성화하면, **Then** quartz.config.ts의 plugins.filters에 ExplicitPublish()가 추가되어 커밋된다
2. **Given** GitHub 연동이 완료된 상태, **When** 제외 패턴에 "private/*"를 추가하면, **Then** quartz.config.ts의 ignorePatterns에 해당 패턴이 추가되어 커밋된다
3. **Given** GitHub 연동이 완료된 상태, **When** URL 규칙을 "absolutePaths"로 변경하면, **Then** quartz.config.ts의 urlStrategy가 업데이트되어 커밋된다

---

### Edge Cases

- 네트워크 연결이 없을 때 발행을 시도하면 어떻게 되는가? → "인터넷 연결을 확인하세요" 오류 메시지 표시
- 10MB를 초과하는 이미지 파일이 첨부된 노트를 발행하면 어떻게 되는가? → 경고 메시지와 함께 해당 파일 제외 옵션 제공
- 발행 중 GitHub API 요청 한도에 도달하면 어떻게 되는가? → 남은 시간과 함께 재시도 안내 메시지 표시
- 같은 노트를 동시에 두 번 발행 시도하면 어떻게 되는가? → 이미 발행 중임을 알리고 중복 요청 차단
- 발행 후 로컬에서 노트를 수정하지 않았는데 다시 발행하면 어떻게 되는가? → "이미 최신 상태입니다" 알림 표시
- 리포지토리에서 직접 파일을 수정한 경우 동기화하면 어떻게 되는가? → 로컬 우선 정책으로 덮어쓰기 전 확인 모달 표시

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 GitHub Personal Access Token을 안전하게 저장하고 관리해야 한다
- **FR-002**: 시스템은 입력된 토큰의 유효성을 GitHub API를 통해 검증해야 한다
- **FR-003**: 시스템은 리포지토리에 quartz.config.ts 파일 존재 여부로 Quartz 리포지토리임을 검증해야 한다
- **FR-004**: 시스템은 `publish: true` 프론트매터가 있는 노트를 발행 대상으로 인식해야 한다. 프론트매터가 없는 노트에서 발행 명령 실행 시 자동으로 `publish: true`를 추가한다
- **FR-005**: 시스템은 `draft: true` 프론트매터가 있는 노트를 초안 상태로 발행해야 한다
- **FR-006**: 시스템은 노트의 `[[내부링크]]` 형식을 Quartz 호환 마크다운 링크로 변환해야 한다. 링크 대상이 발행되지 않은 노트인 경우 링크를 제거하고 텍스트만 유지한다
- **FR-007**: 시스템은 노트에 포함된 이미지 및 첨부파일을 리포지토리의 `static/` 폴더에 업로드해야 한다 (예: `static/images/note-name/image.png`)
- **FR-007a**: 시스템은 노트의 발행 경로를 결정할 때 프론트매터의 `path` 속성을 우선 사용하고, 없으면 볼트 내 폴더 구조를 유지해야 한다
- **FR-008**: 시스템은 커맨드 팔레트와 파일 컨텍스트 메뉴를 통한 발행 명령을 제공해야 한다
- **FR-009**: 시스템은 발행 결과(성공/실패)를 Obsidian Notice로 사용자에게 알려야 한다
- **FR-010**: 시스템은 발행 상태 대시보드에서 노트를 상태별(신규/업데이트/삭제/최신)로 분류하여 표시해야 한다. 상태 판단은 로컬 콘텐츠 해시와 플러그인 데이터에 저장된 발행 기록의 해시를 비교하여 수행한다
- **FR-011**: 시스템은 선택된 노트들의 일괄 발행 기능을 제공해야 한다
- **FR-012**: 시스템은 전체 동기화 시 로컬에서 삭제된 노트의 리포지토리 삭제 전 확인을 요청해야 한다
- **FR-013**: 시스템은 발행 진행 상황을 프로그레스 표시로 보여주어야 한다
- **FR-014**: 시스템은 Quartz 설정(ExplicitPublish, ignorePatterns, urlStrategy) 변경 기능을 제공해야 한다
- **FR-015**: 시스템은 Quartz 설정 변경 시 quartz.config.ts를 자동으로 수정하여 커밋해야 한다

### Key Entities

- **Note (노트)**: 발행 대상이 되는 Obsidian 마크다운 파일. 프론트매터(publish, draft 속성), 내용, 첨부파일 참조를 포함
- **Repository (리포지토리)**: 사용자의 Quartz GitHub 리포지토리. URL, 연결 상태, 설정 파일(quartz.config.ts) 정보를 포함
- **Publish Status (발행 상태)**: 노트의 현재 동기화 상태. 신규(new), 수정됨(modified), 삭제됨(deleted), 최신(synced) 중 하나
- **Attachment (첨부파일)**: 노트에 포함된 이미지 및 기타 파일. 파일 경로, 크기, 업로드 상태를 포함
- **Publish Record (발행 기록)**: 플러그인 데이터에 저장되는 발행 이력. 노트 경로, 콘텐츠 해시, 발행 시간, 리포지토리 내 경로를 포함

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 GitHub 연동 설정을 5분 이내에 완료할 수 있다
- **SC-002**: 단일 노트 발행이 30초 이내에 완료된다 (이미지 5개 이하, 총 5MB 이하 기준)
- **SC-003**: 사용자가 처음 플러그인을 사용할 때 별도 문서 없이 첫 노트를 성공적으로 발행할 수 있다
- **SC-004**: 발행 상태 대시보드에서 100개 노트의 상태를 10초 이내에 로드하여 표시할 수 있다
- **SC-005**: 일괄 발행 시 노트당 평균 5초 이내로 처리된다
- **SC-006**: 발행 실패 시 사용자가 오류 원인을 즉시 이해할 수 있는 명확한 메시지가 제공된다
- **SC-007**: 네트워크 오류 발생 시 데이터 손실 없이 안전하게 실패 처리된다

## Assumptions

- 사용자는 이미 GitHub 계정을 보유하고 있다
- 사용자는 Quartz 리포지토리를 이미 생성했거나, 템플릿으로 생성하는 방법을 알고 있다
- GitHub Personal Access Token은 repo 권한을 포함하고 있다
- 노트 파일은 UTF-8 인코딩된 마크다운 형식이다
- Obsidian 볼트는 로컬 파일시스템에 존재한다 (클라우드 전용 볼트 미지원)
- Quartz 리포지토리는 표준 디렉토리 구조(content/ 폴더)를 따른다

## Out of Scope

- Quartz 리포지토리 자동 생성 (Phase 4에서 고려)
- 실시간 미리보기 기능
- 다중 리포지토리 동시 관리
- 리포지토리 → 로컬 역동기화
- GitHub Pages/Vercel 자동 배포 설정
