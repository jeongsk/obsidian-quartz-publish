# Research: Internationalization (i18n) Support

**Feature**: 001-i18n  
**Date**: 2025-01-14

## Research Questions

### 1. Obsidian 언어 설정 감지 방법

**Decision**: `moment.locale()` 사용

**Rationale**:
- Obsidian은 내부적으로 moment.js를 사용하며, `moment.locale()`이 현재 언어 설정을 반환
- 여러 인기 Obsidian 플러그인(obsidian-admonition, obsidian-clever-search, any-block)에서 검증된 패턴
- `import { moment } from 'obsidian'`으로 접근 가능

**Alternatives Considered**:
- `localStorage.getItem('language')`: 비공식 API, 변경 가능성 있음
- `app.locale`: Obsidian API에 공식적으로 노출되지 않음

**Code Example**:
```typescript
import { moment } from 'obsidian';

const currentLocale = moment.locale(); // 'en', 'ko', 'zh-cn' 등
```

### 2. 번역 파일 구조

**Decision**: TypeScript 객체 파일 (`.ts`)

**Rationale**:
- 타입 안전성: 영어 파일을 기준으로 타입 추론 가능
- IDE 자동완성 지원
- 빌드 타임 번역 키 검증
- JSON 대비 주석, 조건부 로직 포함 가능

**Alternatives Considered**:
- JSON 파일: 타입 안전성 부족, 런타임 로딩 필요
- YAML 파일: 파싱 라이브러리 필요, 번들 크기 증가

**Folder Structure**:
```
src/
├── i18n/
│   ├── index.ts           # t() 함수 및 초기화 로직
│   ├── types.ts           # TranslationKeys 타입 정의
│   └── locales/
│       ├── en.ts          # 영어 (기본, 타입 기준)
│       └── ko.ts          # 한국어
```

### 3. 타입 안전한 번역 함수

**Decision**: 영어 파일 기반 `keyof typeof en` 타입 패턴

**Rationale**:
- 타입스크립트 `keyof` 연산자로 자동 타입 추론
- 존재하지 않는 키 사용 시 컴파일 에러
- 새 번역 추가 시 다른 언어 파일에 누락 감지 가능

**Code Pattern**:
```typescript
// locales/en.ts
export default {
  'settings.github.title': 'GitHub Connection',
  'settings.github.token': 'GitHub Token',
  'notice.publish.success': 'Published: {{filename}}',
} as const;

// locales/ko.ts
import type en from './en';
const ko: Partial<typeof en> = {
  'settings.github.title': 'GitHub 연결',
  'settings.github.token': 'GitHub 토큰',
  'notice.publish.success': '발행됨: {{filename}}',
};
export default ko;

// index.ts
import { moment } from 'obsidian';
import en from './locales/en';
import ko from './locales/ko';

type TranslationKey = keyof typeof en;

const localeMap: Record<string, Partial<typeof en>> = {
  en,
  ko,
};

let currentLocale: Partial<typeof en> | undefined;

export function initI18n(): void {
  const lang = moment.locale();
  currentLocale = localeMap[lang] ?? localeMap['en'];
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  let text = currentLocale?.[key] ?? en[key];
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, v);
    });
  }
  return text;
}
```

### 4. 플레이스홀더 보간 패턴

**Decision**: `{{key}}` 형식의 단순 문자열 치환

**Rationale**:
- 외부 라이브러리 의존성 없음 (번들 크기 최소화)
- 직관적이고 널리 사용되는 패턴
- 단순 문자열 치환으로 충분한 요구사항

**Alternatives Considered**:
- i18next: 강력하지만 Obsidian 플러그인에 과도한 번들 크기
- MessageFormat: 복수형 등 고급 기능 불필요

**Code Example**:
```typescript
t('notice.publish.success', { filename: 'note.md' })
// → "Published: note.md" 또는 "발행됨: note.md"
```

### 5. 개발 모드 누락 번역 경고

**Decision**: `process.env.NODE_ENV` 체크 후 `console.warn`

**Rationale**:
- 프로덕션에서는 사용자 경험 방해 없음
- 개발 중 번역 누락 쉽게 발견

**Code Pattern**:
```typescript
export function t(key: TranslationKey, params?: Record<string, string>): string {
  const text = currentLocale?.[key];
  
  if (!text) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation for key: ${key}`);
    }
    return interpolate(en[key], params);
  }
  
  return interpolate(text, params);
}
```

## 기존 코드베이스 분석

### 현재 하드코딩된 문자열 위치

1. **main.ts**: Notice 메시지, 명령어 이름
2. **settings-tab.ts**: 설정 레이블, 설명, 버튼 텍스트
3. **dashboard-modal.ts**: 탭 이름, 상태 메시지, 버튼
4. **create-repo-modal.ts**: 모달 제목, 레이블, 버튼
5. **deploy-guide-modal.ts**: 가이드 텍스트
6. **confirm-modal.ts**: 확인/취소 버튼
7. **sections/*.ts**: 섹션별 레이블, 설명

### 혼재된 언어 현황

- 영어: 설정 탭 레이블, GitHub 관련 메시지
- 한국어: 일부 Notice 메시지 (예: "인터넷 연결을 확인해주세요")

## 결론

Obsidian 플러그인 i18n의 검증된 패턴을 따라:
1. `moment.locale()`로 언어 감지
2. TypeScript 객체 기반 번역 파일
3. `keyof typeof en` 타입 안전성
4. `{{key}}` 단순 보간
5. 개발 모드 콘솔 경고
