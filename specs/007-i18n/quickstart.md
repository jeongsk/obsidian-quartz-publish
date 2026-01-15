# Quickstart: Internationalization (i18n) Support

**Feature**: 001-i18n  
**Date**: 2025-01-14

## Overview

이 문서는 Quartz Publish 플러그인에 i18n(국제화) 지원을 추가하는 방법을 설명합니다.

## Prerequisites

- 기존 Quartz Publish 플러그인 코드베이스
- TypeScript 5.9+
- Obsidian API (`moment` 객체 접근 가능)

## Quick Start

### 1. i18n 모듈 구조 생성

```
src/
└── i18n/
    ├── index.ts        # 메인 진입점
    ├── types.ts        # 타입 정의
    └── locales/
        ├── en.ts       # 영어 (기본)
        └── ko.ts       # 한국어
```

### 2. 영어 번역 파일 생성 (기준 파일)

```typescript
// src/i18n/locales/en.ts
export default {
  // Settings
  'settings.github.title': 'GitHub Connection',
  'settings.github.token': 'GitHub Token',
  
  // Notices
  'notice.publish.success': 'Published: {{filename}}',
  
  // ... 더 많은 키
} as const;
```

### 3. 한국어 번역 파일 생성

```typescript
// src/i18n/locales/ko.ts
import type en from './en';

const ko: Partial<typeof en> = {
  'settings.github.title': 'GitHub 연결',
  'settings.github.token': 'GitHub 토큰',
  'notice.publish.success': '발행됨: {{filename}}',
};

export default ko;
```

### 4. i18n 헬퍼 함수 구현

```typescript
// src/i18n/index.ts
import { moment } from 'obsidian';
import en from './locales/en';
import ko from './locales/ko';

type TranslationKey = keyof typeof en;

const localeMap: Record<string, Partial<typeof en>> = { en, ko };
let currentLocale: Partial<typeof en> | undefined;

export function initI18n(): void {
  const lang = moment.locale();
  currentLocale = localeMap[lang] ?? localeMap['en'];
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  let text = currentLocale?.[key] ?? en[key];
  
  if (!currentLocale?.[key] && process.env.NODE_ENV === 'development') {
    console.warn(`[i18n] Missing translation: ${key}`);
  }
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, v);
    });
  }
  
  return text;
}
```

### 5. 플러그인에서 초기화

```typescript
// src/main.ts
import { initI18n } from './i18n';

export default class QuartzPublishPlugin extends Plugin {
  async onload(): Promise<void> {
    initI18n(); // 언어 감지 및 초기화
    // ... 나머지 초기화
  }
}
```

### 6. 코드에서 사용

```typescript
import { t } from './i18n';

// 단순 텍스트
new Notice(t('notice.publish.success', { filename: file.basename }));

// 설정 탭
new Setting(containerEl)
  .setName(t('settings.github.title'))
  .setDesc(t('settings.github.tokenDesc'));
```

## Usage Examples

### Notice 메시지

```typescript
// Before
new Notice(`Publishing ${file.basename}...`);

// After
new Notice(t('notice.publish.start', { filename: file.basename }));
```

### 설정 레이블

```typescript
// Before
new Setting(containerEl).setName('GitHub Token');

// After
new Setting(containerEl).setName(t('settings.github.token'));
```

### 명령어 이름

```typescript
// Before
this.addCommand({
  id: 'publish-current-note',
  name: 'Publish current note to Quartz',
});

// After
this.addCommand({
  id: 'publish-current-note',
  name: t('command.publishNote'),
});
```

## Adding New Languages

새 언어를 추가하려면:

1. `src/i18n/locales/{lang}.ts` 파일 생성
2. `en.ts`를 참조하여 번역 추가
3. `src/i18n/index.ts`의 `localeMap`에 등록

```typescript
// src/i18n/locales/ja.ts
import type en from './en';

const ja: Partial<typeof en> = {
  'settings.github.title': 'GitHub 接続',
  // ...
};

export default ja;

// src/i18n/index.ts
import ja from './locales/ja';

const localeMap: Record<string, Partial<typeof en>> = {
  en,
  ko,
  ja, // 추가
};
```

## Testing

### 언어 전환 테스트

1. Obsidian 설정 > 정보 > 언어에서 언어 변경
2. Obsidian 재시작
3. 플러그인 UI가 선택한 언어로 표시되는지 확인

### 누락 번역 감지

개발 모드에서 콘솔을 확인하여 `[i18n] Missing translation:` 경고 확인

### 타입 안전성 검증

```typescript
t('invalid.key'); // TypeScript 컴파일 에러
t('notice.publish.success'); // OK
```

## Troubleshooting

### 언어가 바뀌지 않음

- Obsidian 완전 재시작 필요 (창 닫기 후 재실행)
- `moment.locale()` 값 확인

### 번역이 영어로 표시됨

- 해당 언어 파일에 키가 있는지 확인
- `localeMap`에 언어가 등록되었는지 확인
- 콘솔에서 누락 경고 확인
