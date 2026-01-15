# Research: 노트 관리 (Note Management)

**Feature**: 002-note-management
**Date**: 2026-01-13

## Research Topics

### 1. Obsidian Modal API 패턴

**Decision**: Obsidian의 `Modal` 클래스를 확장하여 커스텀 대시보드 모달 구현

**Rationale**:
- Obsidian 플러그인의 표준 모달 패턴
- `onOpen()`, `onClose()` 라이프사이클 메서드 제공
- `contentEl`을 통한 DOM 직접 조작 가능
- 키보드 단축키(Escape) 자동 지원

**Alternatives Considered**:
- SuggestModal: 검색/선택에 특화, 복잡한 UI에 부적합
- FuzzySuggestModal: 퍼지 검색 전용
- 순수 HTML/CSS 오버레이: Obsidian 스타일과 불일치

**Implementation Pattern**:
```typescript
class DashboardModal extends Modal {
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Publish Dashboard' });
    // UI 구성
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

---

### 2. 탭 UI 구현 방식

**Decision**: 순수 HTML/CSS로 탭 UI 직접 구현 (TailwindCSS 활용)

**Rationale**:
- Obsidian은 내장 탭 컴포넌트를 제공하지 않음
- TailwindCSS v4로 일관된 스타일링 가능
- `hn:` 프리픽스로 충돌 방지
- Obsidian CSS 변수 활용으로 테마 호환성 유지

**Alternatives Considered**:
- Obsidian Setting Tab 스타일 모방: 모달 내에서 어색함
- 외부 UI 라이브러리(React, Vue): 빌드 복잡성 증가, 불필요

**Implementation Pattern**:
```typescript
// 탭 버튼 그룹
const tabContainer = contentEl.createDiv({ cls: 'hn:flex hn:border-b hn:border-obs-border' });
['new', 'modified', 'pending_delete', 'up_to_date'].forEach(tab => {
  const btn = tabContainer.createEl('button', {
    cls: 'hn:px-4 hn:py-2 hn:text-obs-text',
    text: getTabLabel(tab)
  });
  btn.addEventListener('click', () => this.switchTab(tab));
});

// 탭 콘텐츠 영역
const contentArea = contentEl.createDiv({ cls: 'hn:p-4' });
```

---

### 3. 대량 파일 해시 계산 성능

**Decision**: 점진적 로딩 + UI 반응성 유지

**Rationale**:
- 1000개 이상 노트 시 일괄 해시 계산은 UI 블로킹 발생
- Web Worker는 Obsidian 플러그인 환경에서 제한적
- 청크 단위 처리 + `requestAnimationFrame` 활용으로 해결

**Alternatives Considered**:
- Web Worker: Obsidian sandbox 환경에서 파일 접근 복잡
- 서비스 워커: 브라우저 환경이 아님
- 전체 동기 계산: 5초 목표 초과 가능

**Implementation Pattern**:
```typescript
async calculateStatusInChunks(
  files: TFile[],
  chunkSize = 50,
  onProgress?: (processed: number, total: number) => void
): Promise<StatusOverview> {
  const overview: StatusOverview = { new: [], modified: [], synced: [], deleted: [] };

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);

    // 청크 처리
    for (const file of chunk) {
      const status = await this.calculateFileStatus(file);
      overview[status.status].push(status);
    }

    onProgress?.(Math.min(i + chunkSize, files.length), files.length);

    // UI 업데이트 기회 제공
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  return overview;
}
```

---

### 4. 체크박스 선택 상태 관리

**Decision**: 컴포넌트 내부 상태로 `Set<string>` 사용

**Rationale**:
- 단순한 선택/해제 로직
- 탭 전환 시 선택 상태 초기화 (사용자 혼란 방지)
- 파일 경로를 키로 사용하여 고유성 보장

**Alternatives Considered**:
- Map 사용: 추가 메타데이터 불필요
- 배열 사용: 검색 성능 O(n)
- 전역 상태 관리: 과도한 복잡성

**Implementation Pattern**:
```typescript
class DashboardModal extends Modal {
  private selectedPaths: Set<string> = new Set();

  private toggleSelection(path: string) {
    if (this.selectedPaths.has(path)) {
      this.selectedPaths.delete(path);
    } else {
      this.selectedPaths.add(path);
    }
    this.updateActionButtons();
  }

  private switchTab(tab: PublishStatus) {
    this.selectedPaths.clear(); // 탭 전환 시 초기화
    this.renderNoteList(tab);
  }
}
```

---

### 5. 프로그레스 바 구현

**Decision**: Obsidian 네이티브 스타일 프로그레스 바 + 상태 텍스트

**Rationale**:
- Obsidian의 기존 프로그레스 스타일과 일관성
- CSS 변수로 테마 호환성 유지
- 텍스트로 현재/전체 카운트 표시 (명확한 피드백)

**Alternatives Considered**:
- Notice만 사용: 진행 상황 시각화 부족
- 외부 프로그레스 라이브러리: 불필요한 의존성

**Implementation Pattern**:
```typescript
private showProgress(current: number, total: number, fileName: string) {
  if (!this.progressContainer) {
    this.progressContainer = this.contentEl.createDiv({
      cls: 'hn:mt-4 hn:p-4 hn:bg-obs-secondary hn:rounded'
    });
  }

  // DOM API를 사용한 안전한 업데이트
  this.progressContainer.empty();

  const statusText = this.progressContainer.createDiv({
    cls: 'hn:text-sm hn:text-obs-muted hn:mb-2',
    text: `${current}/${total} - ${fileName}`
  });

  const progressBar = this.progressContainer.createDiv({
    cls: 'hn:w-full hn:bg-obs-border hn:rounded hn:h-2'
  });

  const percent = Math.round((current / total) * 100);
  const progressFill = progressBar.createDiv({
    cls: 'hn:bg-obs-accent hn:h-2 hn:rounded'
  });
  progressFill.style.width = `${percent}%`;
}
```

---

### 6. 삭제 확인 모달

**Decision**: Obsidian `Modal` 중첩 사용

**Rationale**:
- 일관된 사용자 경험
- 간단한 확인/취소 로직
- Promise 기반 비동기 처리 가능

**Implementation Pattern**:
```typescript
class ConfirmDeleteModal extends Modal {
  private resolve: (value: boolean) => void;

  constructor(app: App, private fileCount: number) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: '삭제 확인' });
    contentEl.createEl('p', {
      text: `${this.fileCount}개의 노트를 GitHub에서 삭제하시겠습니까?`
    });

    const btnContainer = contentEl.createDiv({ cls: 'hn:flex hn:gap-2 hn:mt-4' });

    btnContainer.createEl('button', { text: '취소' })
      .addEventListener('click', () => {
        this.resolve(false);
        this.close();
      });

    btnContainer.createEl('button', {
      text: '삭제',
      cls: 'mod-warning'
    }).addEventListener('click', () => {
      this.resolve(true);
      this.close();
    });
  }

  async waitForConfirmation(): Promise<boolean> {
    return new Promise(resolve => {
      this.resolve = resolve;
      this.open();
    });
  }
}
```

---

## Summary

| 영역 | 결정 |
|------|------|
| 모달 기반 | Obsidian Modal 확장 |
| 탭 UI | 순수 HTML/CSS + TailwindCSS |
| 성능 최적화 | 청크 단위 처리 + requestAnimationFrame |
| 선택 상태 | Set<string> 내부 상태 |
| 프로그레스 | 네이티브 스타일 + DOM API 사용 |
| 삭제 확인 | 중첩 Modal + Promise |

모든 NEEDS CLARIFICATION 항목이 해결되었습니다. Phase 1 설계로 진행할 수 있습니다.
