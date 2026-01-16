# Implementation Plan: 발행 대시보드 새로고침 버튼 개선

**Branch**: `001-refresh-button` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-refresh-button/spec.md`

## Summary

발행 대시보드(DashboardModal)의 새로고침 버튼 UX를 개선합니다. 현재 버튼이 닫기(x) 버튼과 너무 가까이 있고, 크기가 너무 크며, 기능이 직관적이지 않은 문제를 해결합니다. 버튼 위치를 재배치하고, 크기를 Obsidian 표준에 맞추며, 아이콘과 툴팁을 추가합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API, TailwindCSS v4, Lucide Icons (Obsidian 내장)
**Storage**: N/A
**Testing**: Vitest
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: N/A (UI 변경만)
**Constraints**: Obsidian CSS 변수 사용, 테마 호환성 유지
**Scale/Scope**: 단일 Modal 컴포넌트 수정

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution이 템플릿 상태이므로 프로젝트 기본 원칙을 적용합니다:
- [x] TailwindCSS 사용 (CLAUDE.md 준수)
- [x] Obsidian 디자인 가이드라인 준수 (CLAUDE.md 준수)
- [x] Obsidian CSS 변수 활용 (CLAUDE.md 준수)
- [x] 기존 코드 패턴 유지

## Project Structure

### Documentation (this feature)

```text
specs/001-refresh-button/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── ui/
│   └── dashboard-modal.ts  # 수정 대상 파일 (새로고침 버튼 개선)
└── styles/
    └── main.css            # 필요시 추가 스타일
```

**Structure Decision**: 기존 단일 프로젝트 구조 유지. `dashboard-modal.ts` 파일만 수정하며, 필요시 CSS 스타일 추가.

## Complexity Tracking

> 해당 없음 - 단순 UI 개선으로 복잡도 낮음

## Current Implementation Analysis

### 현재 새로고침 버튼 코드 (line 678-686)

```typescript
// 새로고침 버튼
const refreshBtn = headerEl.createEl('button', {
    text: t('dashboard.action.refresh'),
    cls: 'text-sm',
    attr: {
        'aria-label': t('dashboard.action.refresh'),
    },
});
refreshBtn.addEventListener('click', () => this.refresh());
```

### 문제점

1. **위치**: `headerEl` 내에서 제목 바로 옆에 위치하며 닫기 버튼(Modal 기본)과 가까움
2. **스타일**: `cls: 'text-sm'`만 적용되어 있어 텍스트 버튼으로 렌더링됨
3. **직관성**: 텍스트만 표시되며 아이콘이 없음
4. **로딩 상태**: 새로고침 중 시각적 피드백 없음

### 개선 방향

1. **위치 변경**: 헤더 왼쪽(제목 옆)에서 제목 컨테이너 내부로 이동
2. **아이콘 버튼**: 텍스트 대신 Lucide `RefreshCw` 아이콘 사용
3. **크기**: Obsidian `clickable-icon` 클래스 활용
4. **툴팁**: `aria-label` + `setTooltip()` 사용
5. **로딩 상태**: 버튼 비활성화 + 회전 애니메이션

## Implementation Tasks

### Task 1: 새로고침 버튼 아이콘화 및 위치 조정

**파일**: `src/ui/dashboard-modal.ts`

변경사항:
- `renderHeader()` 메서드 수정
- 텍스트 버튼 → 아이콘 버튼 변경
- `setIcon()` API 사용하여 Lucide 아이콘 추가
- `clickable-icon` 클래스 적용
- 버튼을 제목 컨테이너 내부로 이동 (닫기 버튼과 거리 확보)

### Task 2: 툴팁 추가

**파일**: `src/ui/dashboard-modal.ts`

변경사항:
- `setTooltip()` API 사용하여 "발행 목록 새로고침" 툴팁 추가

### Task 3: 로딩 상태 시각적 피드백

**파일**: `src/ui/dashboard-modal.ts`

변경사항:
- 새로고침 중 버튼 비활성화
- CSS 애니메이션으로 아이콘 회전 효과 (선택적)

### Task 4: CSS 스타일 추가 (필요시)

**파일**: `src/styles/main.css`

변경사항:
- 로딩 시 회전 애니메이션 클래스 (TailwindCSS `animate-spin` 활용)
