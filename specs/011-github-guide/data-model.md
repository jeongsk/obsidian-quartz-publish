# Data Model: GitHub 리포지토리 설정 가이드

**Feature**: 011-github-guide
**Date**: 2026-01-15

## Entities

### GuideStep

가이드의 각 단계를 나타내는 엔티티.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stepNumber | number | Yes | 단계 번호 (1-based) |
| title | string | Yes | 단계 제목 |
| description | string | Yes | 단계 설명 (마크다운 지원) |
| screenshot | string | No | Base64 인코딩된 이미지 |
| externalUrl | string | No | 외부 링크 URL |
| actionLabel | string | No | 액션 버튼 레이블 |
| completionCheck | () => boolean | No | 완료 상태 체크 함수 |
| troubleshootingTips | string[] | No | 문제 해결 팁 목록 |

**Validation Rules**:
- `stepNumber` >= 1
- `title` 비어있지 않음
- `description` 비어있지 않음
- `externalUrl` 유효한 URL 형식 (설정된 경우)

### SetupStatus

사용자의 설정 진행 상태를 나타내는 엔티티.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hasGitHubAccount | boolean | Yes | GitHub 계정 보유 여부 (수동 확인) |
| hasForkedRepo | boolean | Yes | Quartz Fork 완료 여부 |
| hasToken | boolean | Yes | PAT 설정 여부 |
| isConnected | boolean | Yes | GitHub 연결 성공 여부 |

**Derived Properties**:
- `completedSteps`: 완료된 단계 수 (0-4)
- `isComplete`: 모든 단계 완료 여부

### TroubleshootingItem

문제 해결 항목을 나타내는 엔티티.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| errorCode | string | Yes | 오류 코드 (예: "401", "404") |
| errorMessage | string | Yes | 오류 메시지 패턴 |
| cause | string | Yes | 오류 원인 설명 |
| solution | string | Yes | 해결 방법 |
| relatedStep | number | No | 관련 가이드 단계 번호 |

## Relationships

```
GuideStep (1) ---- (*) TroubleshootingItem
    |                      |
    | completionCheck      | relatedStep
    v                      v
SetupStatus <------------- GuideStep
```

- `GuideStep`은 `completionCheck`를 통해 `SetupStatus` 상태를 참조
- `TroubleshootingItem`은 `relatedStep`으로 `GuideStep`과 연관

## State Transitions

### SetupStatus 상태 변화

```
[Initial]
  hasGitHubAccount: false
  hasForkedRepo: false
  hasToken: false
  isConnected: false

     |
     | 사용자가 "GitHub 계정 있음" 체크
     v

[Step 1 Complete]
  hasGitHubAccount: true
  ...

     |
     | repoUrl 설정
     v

[Step 2 Complete]
  hasForkedRepo: true (derived from settings.repoUrl)
  ...

     |
     | githubToken 설정
     v

[Step 3 Complete]
  hasToken: true (derived from settings.githubToken)
  ...

     |
     | GitHubService.validateToken() 성공
     v

[Complete]
  isConnected: true
  isComplete: true
```

## TypeScript 인터페이스

```typescript
interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
  screenshot?: string;
  externalUrl?: string;
  actionLabel?: string;
  completionCheck?: () => boolean;
  troubleshootingTips?: string[];
}

interface SetupStatus {
  hasGitHubAccount: boolean;
  hasForkedRepo: boolean;
  hasToken: boolean;
  isConnected: boolean;
  readonly completedSteps: number;
  readonly isComplete: boolean;
}

interface TroubleshootingItem {
  errorCode: string;
  errorMessage: string;
  cause: string;
  solution: string;
  relatedStep?: number;
}
```

## 기존 타입 확장

`src/types.ts`의 기존 `DeployGuideStep` 타입을 확장:

```typescript
// 기존 타입
interface DeployGuideStep {
  stepNumber: number;
  title: string;
  description: string;
  actionLabel?: string;
  externalUrl?: string;
}

// 확장 (GuideStep이 DeployGuideStep을 확장)
interface GuideStep extends DeployGuideStep {
  screenshot?: string;
  completionCheck?: () => boolean;
  troubleshootingTips?: string[];
}
```
