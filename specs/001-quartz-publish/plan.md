# Implementation Plan: Quartz Publish Plugin

**Branch**: `001-quartz-publish` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-quartz-publish/spec.md`

## Summary

Obsidian 노트를 Quartz 정적 사이트로 발행하는 플러그인입니다. GitHub REST API를 통해 노트와 첨부파일을 Quartz 리포지토리에 업로드하고, 콘텐츠 해시 기반으로 발행 상태를 추적합니다. Obsidian의 표준 플러그인 API와 TailwindCSS v4를 활용하여 설정 UI와 대시보드를 구현합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API, fetch (built-in)
**Storage**: Obsidian Plugin Data (`data.json`)
**Testing**: Vitest + happy-dom
**Target Platform**: Obsidian Desktop/Mobile
**Project Type**: Single project (Obsidian Plugin)
**Performance Goals**: 단일 노트 발행 30초 이내, 대시보드 로드 10초 이내 (100개 노트)
**Constraints**: GitHub API rate limit (5000 req/hour), 10MB 파일 크기 제한
**Scale/Scope**: 개인 블로그 규모 (수백 개 노트)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution이 템플릿 상태이므로 명시적 제약 없음. 프로젝트 CLAUDE.md 규칙 준수:
- [x] TailwindCSS v4 사용 (`hn:` 프리픽스)
- [x] Obsidian 디자인 가이드라인 준수
- [x] Obsidian CSS 변수 활용

## Project Structure

### Documentation (this feature)

```text
specs/001-quartz-publish/
├── plan.md              # 이 파일
├── spec.md              # 기능 명세
├── research.md          # 기술 조사
├── data-model.md        # 데이터 모델
├── quickstart.md        # 개발 가이드
├── contracts/
│   ├── github-api.md    # GitHub API 계약
│   └── plugin-services.md # 서비스 인터페이스
└── checklists/
    └── requirements.md  # 요구사항 체크리스트
```

### Source Code (repository root)

```text
src/
├── main.ts              # 플러그인 진입점
├── settings.ts          # 설정 인터페이스 및 탭
├── types.ts             # 공통 타입 정의
├── services/
│   ├── github.ts        # GitHub API 클라이언트
│   ├── publish.ts       # 발행 서비스
│   ├── transformer.ts   # 콘텐츠 변환
│   └── status.ts        # 상태 관리
├── ui/
│   ├── dashboard.ts     # 대시보드 모달
│   ├── settings-tab.ts  # 설정 탭
│   └── components/      # UI 컴포넌트
└── styles/
    └── main.css         # TailwindCSS 스타일

tests/
├── unit/
│   ├── transformer.test.ts
│   ├── status.test.ts
│   └── github.test.ts
├── integration/
│   └── publish.test.ts
└── mocks/
    └── obsidian.ts      # Obsidian API 목
```

**Structure Decision**: 단일 프로젝트 구조 선택. Obsidian 플러그인은 단일 진입점(`main.js`)을 요구하며, 서비스 모듈로 책임을 분리하여 테스트 가능성을 확보합니다.

## Complexity Tracking

> **No violations to justify** - 프로젝트 규모에 적합한 단순 구조 적용

## Implementation Phases

### Phase 1: Core Infrastructure (P1 - GitHub 연동)

| Task | Description | Dependencies |
|------|-------------|--------------|
| T1.1 | Plugin skeleton (main.ts, settings.ts) | - |
| T1.2 | GitHub API service implementation | T1.1 |
| T1.3 | Settings tab UI (토큰, URL 입력, 연결 테스트) | T1.1, T1.2 |
| T1.4 | Unit tests for GitHub service | T1.2 |

### Phase 2: Single Note Publishing (P1 - 단일 노트 발행)

| Task | Description | Dependencies |
|------|-------------|--------------|
| T2.1 | Content transformer (링크, 이미지 변환) | T1.2 |
| T2.2 | Publish service implementation | T2.1 |
| T2.3 | Command palette registration | T2.2 |
| T2.4 | File context menu registration | T2.2 |
| T2.5 | Notice feedback (성공/실패) | T2.2 |
| T2.6 | Unit tests for transformer | T2.1 |

### Phase 3: Status Management (P2 - 발행 상태 대시보드)

| Task | Description | Dependencies |
|------|-------------|--------------|
| T3.1 | Status service (해시 계산, 상태 판단) | T2.2 |
| T3.2 | Dashboard modal UI | T3.1 |
| T3.3 | Batch publish functionality | T3.1, T3.2 |
| T3.4 | Sync all functionality | T3.3 |
| T3.5 | Progress indicator | T3.3 |

### Phase 4: Quartz Settings (P3 - 설정 변경)

| Task | Description | Dependencies |
|------|-------------|--------------|
| T4.1 | Quartz config parser | T1.2 |
| T4.2 | Config modification service | T4.1 |
| T4.3 | Settings UI for Quartz options | T4.2 |

## Key Decisions from Research

| Decision | Rationale |
|----------|-----------|
| GitHub REST API v3 + fetch | 번들 크기 최소화, Obsidian 환경 호환 |
| 정규식 기반 콘텐츠 변환 | 외부 파서 의존성 제거 |
| Plugin data + hash 기반 상태 관리 | 노트 파일 비오염, 정확한 변경 감지 |
| TailwindCSS v4 + Obsidian Modal | 프로젝트 요구사항 준수, 네이티브 UX |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| GitHub API rate limit | 요청 최적화, 남은 한도 표시, 재시도 로직 |
| 대용량 파일 | 10MB 제한 경고, 파일 제외 옵션 |
| 네트워크 오류 | 안전한 실패 처리, 재시도 안내 |
| SHA 충돌 | 최신 SHA 조회 후 업데이트 |

## Generated Artifacts

- [x] `research.md` - 기술 조사 완료
- [x] `data-model.md` - 데이터 모델 정의
- [x] `contracts/github-api.md` - GitHub API 계약
- [x] `contracts/plugin-services.md` - 서비스 인터페이스
- [x] `quickstart.md` - 개발 가이드

## Next Steps

`/speckit.tasks`를 실행하여 상세 작업 목록을 생성합니다.
