# Implementation Plan: GitHub 저장소 및 배포 사이트 바로가기 버튼 추가

**Branch**: `010-quick-links` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-quick-links/spec.md`
**Linear Issue**: JEO-6

## Summary

사용자가 설정된 GitHub 저장소와 Quartz 배포 사이트에 빠르게 접근할 수 있는 바로가기 기능을 추가합니다. 설정 탭 상단에 버튼 그룹과 커맨드 팔레트 명령을 통해 1-클릭 접근을 제공합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+ + Obsidian API
**Primary Dependencies**: Obsidian API (Plugin, PluginSettingTab, Notice, Setting), TailwindCSS v4
**Storage**: 기존 PluginSettings (repoUrl), QuartzSiteConfig (baseUrl) - 읽기 전용
**Testing**: Vitest (단위 테스트), 수동 테스트 (UI)
**Target Platform**: Obsidian Desktop/Mobile
**Project Type**: Obsidian Plugin (단일 프로젝트)
**Performance Goals**: 버튼 클릭 후 즉시 브라우저 열림 (<100ms)
**Constraints**: Obsidian 플러그인 가이드라인 준수, TailwindCSS `qp:` 프리픽스 사용
**Scale/Scope**: 버튼 2개, 커맨드 2개, 유틸리티 함수 2개

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| 단순성 (YAGNI) | ✅ Pass | 필요한 기능만 구현, 과도한 추상화 없음 |
| 테스트 가능성 | ✅ Pass | URL 유틸리티 함수는 단위 테스트 가능 |
| Obsidian 가이드라인 | ✅ Pass | 네이티브 API 사용, CSS 변수 활용 |
| TailwindCSS 규칙 | ✅ Pass | `qp:` 프리픽스 사용 |

**위반 사항**: 없음

## Project Structure

### Documentation (this feature)

```text
specs/010-quick-links/
├── spec.md              # 기능 명세서
├── plan.md              # 이 파일 (구현 계획)
├── research.md          # Phase 0: 기술 조사 결과
├── data-model.md        # Phase 1: 데이터 모델 (기존 활용)
├── quickstart.md        # Phase 1: 빠른 시작 가이드
├── checklists/
│   └── requirements.md  # 스펙 품질 체크리스트
└── tasks.md             # Phase 2: 작업 목록 (/speckit.tasks)
```

### Source Code (변경 대상)

```text
src/
├── main.ts                    # [수정] 커맨드 2개 추가
├── ui/
│   └── settings-tab.ts        # [수정] 바로가기 버튼 섹션 추가
├── utils/
│   └── url.ts                 # [생성] URL 유틸리티 함수
└── i18n/
    └── locales/
        ├── ko.ts              # [수정] 번역 키 추가
        └── en.ts              # [수정] 번역 키 추가
```

**Structure Decision**: 기존 Obsidian 플러그인 구조 유지. 새 파일은 `src/utils/url.ts` 하나만 추가.

## Complexity Tracking

> 위반 사항 없음 - 이 섹션은 비어 있음

## Implementation Approach

### 구현 순서

1. **URL 유틸리티 함수** (`src/utils/url.ts`)
   - `isValidGitHubUrl()`: GitHub URL 유효성 검증
   - `normalizeBaseUrl()`: baseUrl에 https:// 추가

2. **i18n 번역 키** (`src/i18n/locales/*.ts`)
   - 버튼 레이블, 커맨드 이름, Notice 메시지

3. **커맨드 등록** (`src/main.ts`)
   - `open-github-repo`: GitHub 저장소 열기
   - `open-deployed-site`: 배포 사이트 열기

4. **설정 탭 버튼** (`src/ui/settings-tab.ts`)
   - GitHub 섹션 상단에 버튼 그룹 추가
   - 비활성화 상태 처리

### 기술적 결정

| 결정 | 선택 | 이유 |
|------|------|------|
| 브라우저 열기 | `window.open(url, '_blank')` | Obsidian에서 표준적인 방식 |
| URL 검증 | 정규식 패턴 | 간단하고 충분함 |
| 버튼 위치 | GitHub 섹션 상단 | Linear 이슈 결정사항 |
| 상태 관리 | 로컬 변수 | 복잡한 상태 관리 불필요 |

## Dependencies

| 의존성 | 버전 | 용도 |
|--------|------|------|
| obsidian | ^1.0.0 | Plugin API, Notice |
| 기존 i18n 시스템 | - | 다국어 지원 |
| 기존 QuartzConfigService | - | baseUrl 조회 |

## Risk Assessment

| 리스크 | 가능성 | 영향 | 완화 방안 |
|--------|--------|------|----------|
| baseUrl 로딩 지연 | 낮음 | 낮음 | 캐시된 값 사용 |
| 유효하지 않은 URL | 중간 | 낮음 | 버튼 비활성화로 방지 |

## Phase 2 준비

다음 단계는 `/speckit.tasks`를 실행하여 구체적인 작업 목록을 생성합니다.

예상 작업:
- T001: URL 유틸리티 함수 구현 및 테스트
- T002: i18n 번역 키 추가
- T003: 커맨드 등록
- T004: 설정 탭 버튼 UI 구현
- T005: 통합 테스트 및 검증
