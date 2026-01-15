# Implementation Plan: 원격 저장소 파일 관리

**Branch**: `009-remote-file-management` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-remote-file-management/spec.md`
**Linear Issue**: [JEO-5](https://linear.app/jeongsk/issue/JEO-5/원격-저장소에서-중복불필요한-파일-삭제-기능)

## Summary

Obsidian 플러그인 내에서 원격 저장소(GitHub)의 발행된 파일을 조회하고 삭제할 수 있는 기능을 구현합니다. 중복 파일 감지, 검색/필터링, 일괄 삭제 기능을 포함합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+ + Obsidian API
**Primary Dependencies**: Obsidian API (Modal, Notice, Setting), fetch (built-in)
**Storage**: N/A (GitHub API 직접 조회, 세션 캐싱)
**Testing**: Vitest
**Target Platform**: Obsidian Desktop/Mobile
**Project Type**: Single project (Obsidian Plugin)
**Performance Goals**: 파일 목록 5초 이내 로드 (100개 파일 기준)
**Constraints**: GitHub API Rate Limit (5000 req/hour), 일괄 삭제 최대 50개
**Scale/Scope**: 1000개 이하 파일 (GitHub Contents API 제한)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Passed** - Constitution 템플릿이 아직 구성되지 않아 기본 원칙 준수:
- 기존 코드베이스 패턴 따름 (Modal, Service 분리)
- i18n 지원 유지
- TailwindCSS `qp:` 프리픽스 사용
- 기존 GitHubService 확장

## Project Structure

### Documentation (this feature)

```text
specs/009-remote-file-management/
├── plan.md              # 이 파일
├── spec.md              # 기능 명세서
├── research.md          # Phase 0: 기술 조사
├── data-model.md        # Phase 1: 데이터 모델
├── quickstart.md        # Phase 1: 빠른 시작 가이드
├── contracts/           # Phase 1: API 컨트랙트
│   ├── github-service.md
│   ├── remote-file-service.md
│   └── ui-components.md
├── checklists/
│   └── requirements.md  # 품질 체크리스트
└── tasks.md             # Phase 2: 태스크 (별도 명령으로 생성)
```

### Source Code (repository root)

```text
src/
├── types.ts                         # PublishedFile, DuplicateGroup, DeleteResult 타입 추가
├── i18n/
│   └── locales/
│       ├── en.ts                    # 영어 번역 키 추가
│       └── ko.ts                    # 한국어 번역 키 추가
├── services/
│   ├── github.ts                    # getDirectoryContents() 메서드 추가
│   └── remote-file.ts               # 새 서비스 (RemoteFileService)
└── ui/
    ├── settings-tab.ts              # "발행된 파일 관리" 버튼 추가
    └── remote-file-manager-modal.ts # 새 모달 (RemoteFileManagerModal)
```

**Structure Decision**: 기존 Obsidian 플러그인 구조 유지. 새 서비스(`remote-file.ts`)와 모달(`remote-file-manager-modal.ts`)을 기존 디렉토리에 추가.

## Implementation Phases

### Phase 1: Core Infrastructure

1. **타입 정의** (`src/types.ts`)
   - `PublishedFile` 인터페이스
   - `DuplicateGroup` 인터페이스
   - `DeleteResult` 인터페이스

2. **i18n 키 추가** (`src/i18n/locales/`)
   - 모달 관련 번역 키 (20+ 키)
   - 영어 및 한국어

3. **GitHubService 확장** (`src/services/github.ts`)
   - `getDirectoryContents()` 메서드 추가
   - 재귀적 디렉토리 조회

### Phase 2: Business Logic

4. **RemoteFileService 생성** (`src/services/remote-file.ts`)
   - `getPublishedFiles()` - 파일 목록 조회
   - `detectDuplicates()` - 중복 감지
   - `searchFiles()` - 검색/필터링
   - `deleteFiles()` - 일괄 삭제

### Phase 3: UI Implementation

5. **RemoteFileManagerModal 생성** (`src/ui/remote-file-manager-modal.ts`)
   - 파일 목록 표시
   - 검색 입력
   - 선택/삭제 기능
   - 중복 파일 하이라이트

6. **설정 탭 통합** (`src/ui/settings-tab.ts`)
   - "발행된 파일 관리" 버튼 추가
   - GitHub 연결 상태에 따른 활성화

### Phase 4: Polish & Testing

7. **스타일링** (`src/styles/main.css`)
   - 모달 스타일 (TailwindCSS `qp:` 프리픽스)

8. **테스트 작성** (`tests/`)
   - 서비스 유닛 테스트
   - 통합 테스트

## Key Decisions from Clarifications

| 결정 사항 | 선택 |
|-----------|------|
| UI 진입점 | 설정 탭에 "발행된 파일 관리" 버튼 |
| 일괄 삭제 제한 | 최대 50개 |
| 중복 판단 기준 | 파일명만 비교 (콘텐츠 비교 없음) |
| 캐싱 전략 | 세션 단위 캐싱 + 수동 새로고침 |
| 기본 정렬 | 경로별 알파벳순 |

## Dependencies

- 기존 `GitHubService` 클래스 (확장)
- 기존 `ConfirmModal` 컴포넌트 (재사용)
- i18n 시스템 (`t()` 함수)
- Obsidian API (`Modal`, `Setting`, `Notice`)

## Risk Mitigation

| 위험 | 완화 방안 |
|------|-----------|
| GitHub API 속도 제한 | 요청 간 100ms 딜레이, 최대 50개 제한 |
| 대용량 파일 목록 | 세션 캐싱, 검색 디바운싱 |
| 삭제 실수 | 확인 다이얼로그, 결과 요약 표시 |
| 네트워크 오류 | 적절한 에러 메시지, 재시도 안내 |

## Success Criteria (from Spec)

- [ ] **SC-001**: 파일 목록 5초 이내 로드 (100개 파일)
- [ ] **SC-002**: 플러그인 내에서 파일 삭제 완료
- [ ] **SC-003**: 3클릭 이내에 중복 파일 삭제
- [ ] **SC-004**: 삭제 성공률 99% 이상
- [ ] **SC-005**: 10초 이내 파일 검색

## Next Steps

1. `/speckit.tasks` 실행하여 상세 태스크 생성
2. 태스크 순서대로 구현 시작
3. 각 마일스톤에서 테스트 실행

## Complexity Tracking

*No violations requiring justification.*
