# Implementation Plan: Internationalization (i18n) Support

**Branch**: `001-i18n` | **Date**: 2025-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-i18n/spec.md`

## Summary

Quartz Publish 플러그인에 다국어(영어/한국어) 지원을 추가합니다. `moment.locale()`을 사용하여 Obsidian의 언어 설정을 감지하고, TypeScript 기반 번역 파일 구조로 타입 안전한 i18n 시스템을 구현합니다. 기존 하드코딩된 문자열(영어/한국어 혼재)을 모두 번역 시스템으로 마이그레이션합니다.

## Technical Context

**Language/Version**: TypeScript 5.9+  
**Primary Dependencies**: Obsidian API (`moment` 객체), esbuild  
**Storage**: N/A (번역 파일은 번들에 포함)  
**Testing**: Vitest  
**Target Platform**: Obsidian Desktop/Mobile (Electron/Capacitor)  
**Project Type**: Single (Obsidian Plugin)  
**Performance Goals**: 번역 함수 호출 시 즉시 반환 (O(1) 조회)  
**Constraints**: 번들 크기 최소화 (외부 i18n 라이브러리 미사용)  
**Scale/Scope**: ~150개 번역 키, 2개 언어 (확장 가능한 구조)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution이 템플릿 상태이므로 기본 원칙 적용:

| Principle | Status | Notes |
|-----------|--------|-------|
| 단순성 (Simplicity) | ✅ Pass | 외부 라이브러리 없이 순수 TypeScript 구현 |
| 테스트 가능성 | ✅ Pass | 번역 함수와 키 검증 테스트 가능 |
| 타입 안전성 | ✅ Pass | `keyof typeof en` 패턴으로 컴파일 타임 검증 |

## Project Structure

### Documentation (this feature)

```text
specs/001-i18n/
├── plan.md              # This file
├── research.md          # Obsidian i18n 패턴 연구 결과
├── data-model.md        # 번역 키 구조 및 엔티티 정의
├── quickstart.md        # i18n 사용 가이드
├── contracts/           # API 계약
│   └── i18n-api.ts      # i18n 모듈 공개 API 정의
└── tasks.md             # (Phase 2에서 생성)
```

### Source Code (repository root)

```text
src/
├── i18n/
│   ├── index.ts           # initI18n(), t() 함수
│   └── locales/
│       ├── en.ts          # 영어 번역 (기준 파일)
│       └── ko.ts          # 한국어 번역
├── main.ts                # initI18n() 호출 추가
├── ui/
│   ├── settings-tab.ts    # 번역 적용
│   ├── dashboard-modal.ts # 번역 적용
│   ├── create-repo-modal.ts # 번역 적용
│   ├── deploy-guide-modal.ts # 번역 적용
│   ├── large-file-warning-modal.ts # 번역 적용
│   ├── components/
│   │   ├── confirm-modal.ts # 번역 적용
│   │   ├── conflict-modal.ts # 번역 적용
│   │   ├── apply-button.ts # 번역 적용
│   │   └── unsaved-warning.ts # 번역 적용
│   └── sections/
│       ├── site-info-section.ts # 번역 적용
│       ├── behavior-section.ts # 번역 적용
│       ├── analytics-section.ts # 번역 적용
│       └── publishing-section.ts # 번역 적용
└── types.ts               # TAB_LABELS 등 상수 번역

tests/
└── i18n/
    ├── t.test.ts          # 번역 함수 단위 테스트
    └── keys.test.ts       # 번역 키 완전성 테스트
```

**Structure Decision**: 기존 Obsidian 플러그인 구조에 `src/i18n/` 디렉토리를 추가합니다. 번역 파일은 TypeScript 모듈로 관리하여 타입 안전성을 확보합니다.

## Implementation Phases

### Phase 1: i18n 인프라 구축
1. `src/i18n/` 디렉토리 및 기본 구조 생성
2. 영어 번역 파일 (en.ts) 생성 - 기준 타입
3. 한국어 번역 파일 (ko.ts) 생성
4. `initI18n()`, `t()` 함수 구현
5. 단위 테스트 작성

### Phase 2: UI 컴포넌트 마이그레이션
1. main.ts - 명령어 이름, 리본 아이콘 툴팁
2. settings-tab.ts - 설정 레이블, 설명
3. dashboard-modal.ts - 탭, 메시지, 버튼
4. 모달 컴포넌트들 - 제목, 메시지, 버튼

### Phase 3: 검증 및 완료
1. 모든 번역 키 완전성 테스트
2. 영어/한국어 환경에서 수동 테스트
3. 누락된 번역 경고 확인 및 수정

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 언어 감지 | `moment.locale()` | Obsidian 플러그인 표준 패턴 |
| 번역 파일 형식 | TypeScript 객체 | 타입 안전성, IDE 자동완성 |
| 보간 문법 | `{{key}}` | 단순, 외부 의존성 없음 |
| 폴백 전략 | 영어 텍스트 | 누락 시 UX 유지 |
| 개발 경고 | 콘솔 출력 | 프로덕션 영향 없음 |

## Complexity Tracking

> 복잡성 정당화 불필요 - 모든 원칙 준수

## Related Artifacts

- [research.md](./research.md) - i18n 패턴 연구
- [data-model.md](./data-model.md) - 번역 키 구조
- [quickstart.md](./quickstart.md) - 사용 가이드
- [contracts/i18n-api.ts](./contracts/i18n-api.ts) - API 계약
