# Implementation Plan: 비기능 요구사항

**Branch**: `005-non-functional-requirements` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-non-functional-requirements/spec.md`

## Summary

오프라인 상태 감지 및 대용량 파일 경고 기능을 구현합니다. 발행 명령 실행 시 네트워크 연결 상태를 확인하여 오프라인일 경우 사용자 친화적 메시지를 표시하고, 10MB를 초과하는 첨부파일이 포함된 노트 발행 시 사전 경고 모달을 표시하여 사용자가 진행 여부를 선택할 수 있도록 합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+ + Obsidian API
**Primary Dependencies**: Obsidian API (Plugin, Modal, Notice, TFile, Vault), fetch (built-in)
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)
**Testing**: Vitest + happy-dom
**Target Platform**: Obsidian Desktop (Electron) / Mobile
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: 오프라인 감지 2초 이내 응답
**Constraints**: `navigator.onLine` API 활용, 기존 `MAX_FILE_SIZE` (10MB) 상수 활용
**Scale/Scope**: 기존 발행 흐름에 검증 레이어 추가

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution이 기본 템플릿 상태이므로, 프로젝트 기존 패턴을 따름:
- [x] 기존 서비스 구조 유지 (PublishService, GitHubService)
- [x] 기존 UI 패턴 활용 (Modal, Notice)
- [x] 기존 타입 시스템 확장 (types.ts)
- [x] Vitest 테스트 작성

## Project Structure

### Documentation (this feature)

```text
specs/005-non-functional-requirements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── main.ts                    # 플러그인 메인 (명령어 등록)
├── types.ts                   # 타입 정의 (MAX_FILE_SIZE 이미 존재)
├── services/
│   ├── publish.ts             # 발행 서비스 (수정 대상)
│   ├── network.ts             # [신규] 네트워크 상태 서비스
│   └── file-validator.ts      # [신규] 파일 크기 검증 서비스
└── ui/
    ├── dashboard-modal.ts     # 대시보드 모달 (수정 대상)
    └── large-file-warning-modal.ts  # [신규] 대용량 파일 경고 모달

tests/
└── unit/
    └── services/
        ├── network.test.ts         # [신규] 네트워크 서비스 테스트
        └── file-validator.test.ts  # [신규] 파일 검증 테스트
```

**Structure Decision**: 기존 src/services 및 src/ui 구조 유지, 새로운 기능을 위한 서비스/UI 모듈 추가

## Complexity Tracking

해당 없음 - 기존 구조 내에서 단순 기능 추가
