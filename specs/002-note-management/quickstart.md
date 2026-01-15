# Quickstart: 노트 관리 (Note Management)

**Feature**: 002-note-management
**Date**: 2026-01-13

## 개요

이 기능은 Obsidian vault의 노트 발행 상태를 대시보드에서 확인하고 일괄 관리할 수 있는 기능을 제공합니다.

## 선행 요구사항

- Phase 1 (MVP) 구현 완료
- GitHub 토큰 및 리포지토리 설정 완료

## 구현 순서

### Step 1: StatusService 구현

**파일**: `src/services/status.ts`

```typescript
// 핵심 기능:
// 1. calculateStatusOverview() - 전체 상태 계산
// 2. calculateFileStatus() - 단일 파일 상태
// 3. findDeletedNotes() - 삭제 필요 노트 탐색
// 4. getPublishableFiles() - 발행 대상 목록
```

**테스트**: `tests/unit/services/status.test.ts`

### Step 2: DashboardModal 구현

**파일**: `src/ui/dashboard-modal.ts`

```typescript
// 핵심 기능:
// 1. 탭 UI (신규/수정됨/삭제필요/최신)
// 2. 체크박스 선택
// 3. 일괄 발행/삭제 버튼
// 4. 프로그레스 바
// 5. 결과 요약
```

### Step 3: 커맨드 등록

**파일**: `src/main.ts`

```typescript
this.addCommand({
  id: 'open-publish-dashboard',
  name: 'Open Publish Dashboard',
  callback: () => {
    new DashboardModal(this.app, {
      onPublish: (files) => this.publishService.publishNotes(files),
      onDelete: (files) => this.batchUnpublish(files),
      onLoadStatus: (onProgress) => this.statusService.calculateStatusOverview(onProgress),
    }).open();
  },
});
```

### Step 4: 스타일 추가

**파일**: `src/styles/main.css`

```css
/* 대시보드 모달 스타일 */
/* TailwindCSS hn: 프리픽스 사용 */
```

## 파일 생성 체크리스트

| 파일 | 유형 | 상태 |
|------|------|------|
| `src/services/status.ts` | 신규 | ⬜ |
| `src/ui/dashboard-modal.ts` | 신규 | ⬜ |
| `src/main.ts` | 수정 | ⬜ |
| `src/styles/main.css` | 수정 | ⬜ |
| `tests/unit/services/status.test.ts` | 신규 | ⬜ |

## 주요 의존성

### 기존 코드 활용

```typescript
// types.ts에서 가져오기
import type {
  PublishRecord,
  NoteStatus,
  StatusOverview,
  PublishStatus,
  BatchPublishResult,
  UnpublishResult,
} from '../types';

// publish.ts의 기존 메서드 활용
PublishService.publishNotes(files, onProgress)
PublishService.unpublishNote(file)

// transformer.ts 활용
ContentTransformer.transform(content, file, publishedNotes)
```

### Obsidian API

```typescript
import { App, Modal, TFile, Vault, MetadataCache, Notice } from 'obsidian';
```

## 테스트 전략

### 단위 테스트 (Vitest)

```typescript
// status.test.ts
describe('StatusService', () => {
  it('신규 노트를 올바르게 식별한다');
  it('수정된 노트를 해시 비교로 감지한다');
  it('삭제된 노트 목록을 반환한다');
  it('대량 파일을 청크 단위로 처리한다');
});
```

### 통합 테스트

- 대시보드 열기 → 상태 로딩 확인
- 노트 선택 → 발행 → 결과 확인
- 탭 전환 → 선택 초기화 확인

## 성능 목표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 대시보드 로딩 | 5초 이내 | 100개 노트 기준 |
| 100개 일괄 발행 | 5분 이내 | 순차 처리 (500ms 딜레이) |
| UI 반응성 | 프레임 드랍 없음 | requestAnimationFrame 활용 |

## 커맨드 ID

```typescript
// main.ts에 등록될 커맨드
'quartz-publish:open-dashboard'  // 대시보드 열기
```

## 다음 단계

1. `/speckit.tasks` 실행하여 구체적인 태스크 목록 생성
2. TDD 방식으로 StatusService 테스트 작성
3. StatusService 구현
4. DashboardModal 구현
5. 통합 테스트 및 검증
