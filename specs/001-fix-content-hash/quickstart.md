# Quickstart: 발행 대시보드 콘텐츠 해시 불일치 버그 수정

**Date**: 2026-01-15
**Feature**: 001-fix-content-hash

## 구현 요약

### 수정 파일 목록

| 파일 | 변경 내용 | 우선순위 |
|------|----------|---------|
| `src/services/publish.ts` | contentHash 계산 로직 수정 | P1 |
| `src/ui/dashboard-modal.ts` | 탭 설명 UI 추가 | P3 |
| `src/i18n/ko.ts` | 탭 설명 한국어 문자열 추가 | P3 |
| `src/i18n/en.ts` | 탭 설명 영어 문자열 추가 | P3 |

## 단계별 구현 가이드

### Step 1: 해시 계산 로직 수정 (P1)

**파일**: `src/services/publish.ts` (197줄 부근)

```diff
- const contentHash = await this.calculateHash(transformed.content);
+ const contentHash = await this.calculateHash(content);
```

### Step 2: i18n 문자열 추가 (P3)

**파일**: `src/i18n/ko.ts`

```typescript
// dashboard 섹션에 추가
tabDescriptions: {
  new: '아직 발행되지 않은 새 노트입니다',
  modified: '발행 후 내용이 변경된 노트입니다',
  deleted: '로컬에서 삭제되었거나 발행 해제된 노트입니다',
  synced: '원격과 동기화된 최신 상태의 노트입니다',
},
```

**파일**: `src/i18n/en.ts`

```typescript
// dashboard 섹션에 추가
tabDescriptions: {
  new: 'New notes that haven\'t been published yet',
  modified: 'Notes modified after publishing',
  deleted: 'Notes deleted locally or unpublished',
  synced: 'Notes synced with remote',
},
```

### Step 3: 탭 설명 UI 추가 (P3)

**파일**: `src/ui/dashboard-modal.ts`

탭 버튼 렌더링 영역 아래에 설명 텍스트 요소 추가:

```typescript
// 탭 설명을 반환하는 헬퍼 메서드
private getTabDescription(): string {
  const descriptions = {
    new: t('dashboard.tabDescriptions.new'),
    modified: t('dashboard.tabDescriptions.modified'),
    deleted: t('dashboard.tabDescriptions.deleted'),
    synced: t('dashboard.tabDescriptions.synced'),
  };
  return descriptions[this.state.activeTab] || '';
}

// 렌더링 시 탭 영역 아래에 추가
// <div class="qp:text-sm qp:text-obs-muted qp:mb-3">{this.getTabDescription()}</div>
```

## 테스트 체크리스트

### 버그 수정 확인 (P1)

- [ ] 새 파일 발행 후 대시보드에서 "최신" 탭에 표시됨
- [ ] 발행된 파일 수정 후 "수정됨" 탭에 표시됨
- [ ] 프론트매터 자동 수정 후에도 "최신" 상태 유지

### UX 개선 확인 (P3)

- [ ] "신규" 탭 선택 시 설명 표시됨
- [ ] "수정됨" 탭 선택 시 설명 표시됨
- [ ] "삭제 필요" 탭 선택 시 설명 표시됨
- [ ] "최신" 탭 선택 시 설명 표시됨

## 빌드 및 테스트 명령어

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm run test

# 린트 검사
npm run lint
```
