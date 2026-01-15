# Implementation Plan: 발행 대시보드 콘텐츠 해시 불일치 버그 수정 및 UX 개선

**Branch**: `001-fix-content-hash` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-content-hash/spec.md`

## Summary

발행 대시보드에서 모든 발행된 파일이 "수정됨"으로 표시되는 버그를 수정합니다. 원인은 발행 시 변환된 콘텐츠의 해시를 저장하지만, 상태 확인 시 원본 콘텐츠의 해시와 비교하기 때문입니다. 추가로 각 탭의 상태 설명을 표시하여 UX를 개선합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Obsidian API, esbuild, TailwindCSS v4
**Storage**: Obsidian Plugin Data (`data.json` via `loadData`/`saveData`)
**Testing**: Vitest
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)
**Project Type**: Single (Obsidian Plugin)
**Performance Goals**: 대시보드 로딩 시 1000개 파일 처리 < 3초
**Constraints**: Obsidian API 제약 준수, TailwindCSS `qp:` 프리픽스 사용
**Scale/Scope**: 일반적인 볼트 크기 (수백~수천 개 노트)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 상태 | 비고 |
|------|------|------|
| 단순성 | PASS | 기존 코드 한 줄 수정 + UI 텍스트 추가만 필요 |
| 테스트 | PASS | 기존 테스트 프레임워크(Vitest) 활용 |
| 호환성 | PASS | 기존 API 변경 없음, 데이터 구조 변경 없음 |

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-content-hash/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── publish.ts       # 수정 대상: contentHash 계산 로직
│   └── status.ts        # 참조: 해시 비교 로직 (변경 없음)
├── ui/
│   └── dashboard-modal.ts  # 수정 대상: 탭 설명 UI 추가
├── i18n/
│   ├── en.ts            # 수정 대상: 탭 설명 문자열 추가
│   └── ko.ts            # 수정 대상: 탭 설명 문자열 추가
└── types.ts             # 참조 (변경 없음)

tests/
└── services/
    └── publish.test.ts  # 추가: 해시 계산 테스트
```

**Structure Decision**: 기존 Obsidian 플러그인 구조 유지. 수정 범위가 작아 새로운 파일 생성 불필요.

## Complexity Tracking

> 위반 사항 없음 - 단순한 버그 수정 및 UI 텍스트 추가

## Implementation Approach

### 변경 사항 1: 해시 계산 로직 수정 (P1 - 버그 수정)

**파일**: `src/services/publish.ts`
**위치**: 197줄 부근

**현재 코드**:
```typescript
const contentHash = await this.calculateHash(transformed.content);
```

**수정 코드**:
```typescript
const contentHash = await this.calculateHash(content);
```

**이유**: `transformed.content`는 GitHub에 업로드할 변환된 콘텐츠이고, `content`는 로컬 파일의 실제 콘텐츠(프론트매터 자동 수정 후)입니다. 상태 확인 시 `status.ts`에서 로컬 파일의 해시와 비교하므로, 발행 시에도 로컬 파일의 해시를 저장해야 합니다.

### 변경 사항 2: 탭 설명 UI 추가 (P3 - UX 개선)

**파일**: `src/ui/dashboard-modal.ts`
**위치**: 탭 렌더링 영역 하단

**추가할 UI 요소**:
- 탭 버튼 영역 아래에 설명 텍스트 표시
- 현재 선택된 탭에 따라 설명이 동적으로 변경

**탭별 설명 문자열**:
| 탭 | 한국어 설명 | 영어 설명 |
|------|------------|----------|
| 신규 | 아직 발행되지 않은 새 노트입니다 | New notes that haven't been published yet |
| 수정됨 | 발행 후 내용이 변경된 노트입니다 | Notes modified after publishing |
| 삭제 필요 | 로컬에서 삭제되었거나 발행 해제된 노트입니다 | Notes deleted locally or unpublished |
| 최신 | 원격과 동기화된 최신 상태의 노트입니다 | Notes synced with remote |

### 변경 사항 3: i18n 문자열 추가

**파일**: `src/i18n/ko.ts`, `src/i18n/en.ts`

탭 설명 문자열을 다국어 지원을 위해 i18n 파일에 추가합니다.

## Testing Strategy

### 수동 테스트

1. 파일 발행 후 대시보드 열기 → "최신" 탭에 표시되는지 확인
2. 발행된 파일 수정 후 대시보드 열기 → "수정됨" 탭에 표시되는지 확인
3. 각 탭 클릭 시 해당 설명이 표시되는지 확인

### 자동 테스트 (선택적)

- `publish.ts`의 해시 계산 로직에 대한 단위 테스트 추가 고려
- 현재 테스트 커버리지 확인 후 필요시 추가
