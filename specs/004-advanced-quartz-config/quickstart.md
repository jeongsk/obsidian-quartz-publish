# Quickstart: Quartz 고급 설정 관리

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## 빠른 시작 가이드

이 기능은 Quartz 사이트의 고급 설정을 Obsidian 플러그인 설정 화면에서 관리할 수 있도록 합니다.

## 주요 개념

### 1. QuartzSiteConfig

Quartz 사이트의 전체 설정을 나타내는 핵심 데이터 모델입니다.

```typescript
interface QuartzSiteConfig {
  // 사이트 정보
  pageTitle: string;      // "My Digital Garden"
  baseUrl: string;        // "example.com/blog"
  locale: string;         // "ko-KR"

  // 동작 옵션
  enableSPA: boolean;     // true
  enablePopovers: boolean; // true
  defaultDateType: 'created' | 'modified' | 'published';

  // 애널리틱스
  analytics: AnalyticsConfig;

  // 발행 설정
  explicitPublish: boolean;
  ignorePatterns: string[];
  urlStrategy: 'shortest' | 'absolute';
}
```

### 2. PendingChanges

변경사항을 추적하는 상태 관리 패턴입니다. 사용자가 "적용" 버튼을 클릭할 때까지 변경사항이 메모리에 유지됩니다.

```typescript
// 초기화
pendingChanges.initialize(config, sha);

// 필드 변경
pendingChanges.updateField('pageTitle', 'New Title');

// 상태 확인
if (pendingChanges.isDirty()) {
  // "적용" 버튼 활성화
}
```

### 3. 충돌 감지

"적용" 시점에 원격 파일의 SHA를 비교하여 충돌을 감지합니다.

```
로컬 SHA ≠ 원격 SHA → 충돌 모달 표시
로컬 SHA = 원격 SHA → 정상 저장 진행
```

## 핵심 워크플로우

### 설정 변경 및 적용

```
1. 설정 화면 진입
   └─► loadConfig() → QuartzSiteConfig + SHA 저장

2. 사용자 설정 변경
   └─► updateField() 호출 → PendingChanges 업데이트
   └─► isDirty = true → "적용" 버튼 활성화

3. "적용" 버튼 클릭
   └─► ConfirmModal 표시
   └─► 확인 시 getRemoteSha() 호출

4. SHA 비교
   ├─► 일치: saveConfig() 실행
   └─► 불일치: ConflictModal 표시
       ├─► "새로고침": loadConfig() 후 변경사항 재적용
       ├─► "강제 덮어쓰기": 강제 저장
       └─► "취소": 모달 닫기
```

## 파일 구조

```
src/
├── services/
│   └── quartz-config.ts      # 설정 파싱/저장 서비스 (확장)
├── ui/
│   ├── settings-tab.ts       # 메인 설정 탭 (리팩토링)
│   ├── components/
│   │   ├── apply-button.ts   # 적용 버튼
│   │   ├── confirm-modal.ts  # 확인 모달
│   │   └── unsaved-warning.ts # 경고 배너
│   └── sections/
│       ├── site-info-section.ts    # 사이트 정보
│       ├── behavior-section.ts     # 동작 옵션
│       ├── analytics-section.ts    # 애널리틱스
│       └── publishing-section.ts   # 발행 설정
└── utils/
    └── validators.ts         # 유효성 검사 (확장)
```

## 구현 우선순위

### Phase 1: 데이터 레이어
1. `QuartzSiteConfig` 타입 정의 확장
2. `QuartzConfigService` 파싱 로직 확장
3. 유효성 검사 함수 추가

### Phase 2: 상태 관리
1. `PendingChangesManager` 구현
2. 변경 감지 및 추적 로직

### Phase 3: UI 컴포넌트
1. 모달 컴포넌트 (Confirm, Conflict)
2. 섹션 컴포넌트 (SiteInfo, Behavior, Analytics, Publishing)
3. ApplyButton, UnsavedWarning

### Phase 4: 통합
1. SettingsTab 리팩토링
2. 기존 설정과 통합
3. E2E 테스트

## 참고 문서

- [data-model.md](./data-model.md) - 상세 데이터 모델
- [research.md](./research.md) - 연구 결과 및 결정 사항
- [contracts/](./contracts/) - API 계약
- [spec.md](./spec.md) - 기능 명세
