# Contract: UI Components

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## Overview

원격 파일 관리 UI 컴포넌트 설계입니다.

---

## 1. RemoteFileManagerModal

메인 파일 관리 모달입니다.

### Class Definition

```typescript
export class RemoteFileManagerModal extends Modal {
  constructor(
    app: App,
    private plugin: QuartzPublishPlugin
  );
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  [x]                발행된 파일 관리                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  [🔄 새로고침]         │
│  │ 🔍 파일 검색...              │                       │
│  └─────────────────────────────┘                        │
│                                                          │
│  ⚠️ 중복 파일 3개 그룹 감지됨                           │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ☐ content/blog/post1.md              2.1 KB         ││
│  │ ☑ content/blog/post2.md     [중복]   1.5 KB         ││
│  │ ☑ content/notes/post2.md    [중복]   1.5 KB         ││
│  │ ☐ content/about.md                   0.8 KB         ││
│  │ ...                                                  ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  선택됨: 2개 파일                                        │
│                                                          │
│              [취소]        [🗑️ 선택 삭제]               │
└─────────────────────────────────────────────────────────┘
```

### Methods

```typescript
class RemoteFileManagerModal extends Modal {
  private state: FileListState;
  private remoteFileService: RemoteFileService;

  /** 모달 열기 (라이프사이클) */
  onOpen(): void;

  /** 모달 닫기 (라이프사이클) */
  onClose(): void;

  /** 파일 목록 로드 */
  private async loadFiles(forceRefresh?: boolean): Promise<void>;

  /** UI 렌더링 */
  private renderContent(): void;

  /** 헤더 렌더링 (검색, 새로고침) */
  private renderHeader(container: HTMLElement): void;

  /** 중복 경고 렌더링 */
  private renderDuplicateWarning(container: HTMLElement): void;

  /** 파일 목록 렌더링 */
  private renderFileList(container: HTMLElement): void;

  /** 단일 파일 항목 렌더링 */
  private renderFileItem(container: HTMLElement, file: PublishedFile): void;

  /** 하단 액션 바 렌더링 */
  private renderFooter(container: HTMLElement): void;

  /** 파일 선택/해제 */
  private toggleFileSelection(path: string): void;

  /** 전체 선택/해제 */
  private toggleSelectAll(): void;

  /** 검색 처리 */
  private handleSearch(query: string): void;

  /** 삭제 처리 */
  private async handleDelete(): Promise<void>;

  /** 새로고침 처리 */
  private async handleRefresh(): Promise<void>;
}
```

### State Management

```typescript
private initState(): FileListState {
  return {
    files: [],
    selectedFiles: new Set(),
    searchQuery: '',
    filteredFiles: [],
    duplicateGroups: [],
    isLoading: true,
    isDeleting: false,
    error: null,
  };
}

private updateState(partial: Partial<FileListState>): void {
  this.state = { ...this.state, ...partial };
  this.renderContent();
}
```

---

## 2. DeleteProgressModal

삭제 진행률 표시 모달입니다 (5개 이상 파일 삭제 시).

### Class Definition

```typescript
export class DeleteProgressModal extends Modal {
  constructor(
    app: App,
    private total: number
  );

  /** 진행률 업데이트 */
  updateProgress(current: number): void;

  /** 완료 처리 */
  complete(result: DeleteResult): void;
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│                     파일 삭제 중...                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░  15 / 50        │
│                                                          │
│  현재: content/blog/post15.md                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. DeleteResultModal

삭제 결과 요약 모달입니다.

### Class Definition

```typescript
export class DeleteResultModal extends Modal {
  constructor(
    app: App,
    private result: DeleteResult
  );
}
```

### UI Layout (부분 실패 시)

```
┌─────────────────────────────────────────────────────────┐
│                     삭제 결과                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ 성공: 45개 파일                                     │
│  ❌ 실패: 5개 파일                                      │
│                                                          │
│  실패한 파일:                                            │
│  • content/blog/post1.md - Permission denied            │
│  • content/notes/note2.md - File not found              │
│  ...                                                     │
│                                                          │
│                        [확인]                            │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Settings Tab Integration

설정 탭에 "발행된 파일 관리" 버튼 추가입니다.

### Location

`src/ui/settings-tab.ts`의 `createGitHubSection()` 메서드 내, 연결 테스트 버튼 하단

### Code

```typescript
private createGitHubSection(containerEl: HTMLElement): void {
  // ... 기존 코드 ...

  // 발행된 파일 관리 버튼 (연결 성공 시만 활성화)
  new Setting(containerEl)
    .setName(t('settings.github.manageFiles'))
    .setDesc(t('settings.github.manageFilesDesc'))
    .addButton(button => {
      button
        .setButtonText(t('settings.github.manageFiles'))
        .setDisabled(!this.isConnected)
        .onClick(() => {
          new RemoteFileManagerModal(this.app, this.plugin).open();
        });

      this.manageFilesButton = button;
    });
}

// 연결 상태 변경 시 버튼 활성화/비활성화
private updateConnectionDependentButtons(connected: boolean): void {
  this.manageFilesButton?.setDisabled(!connected);
}
```

---

## 5. CSS Classes

TailwindCSS `qp:` 프리픽스 사용

```css
/* 파일 목록 컨테이너 */
.qp-file-list {
  @apply qp:max-h-[400px] qp:overflow-y-auto qp:border qp:border-[--background-modifier-border] qp:rounded;
}

/* 파일 항목 */
.qp-file-item {
  @apply qp:flex qp:items-center qp:gap-2 qp:p-2 qp:border-b qp:border-[--background-modifier-border] qp:cursor-pointer;
}

.qp-file-item:hover {
  @apply qp:bg-[--background-modifier-hover];
}

.qp-file-item.selected {
  @apply qp:bg-[--interactive-accent] qp:bg-opacity-10;
}

/* 중복 배지 */
.qp-duplicate-badge {
  @apply qp:text-xs qp:px-1.5 qp:py-0.5 qp:rounded qp:bg-[--text-warning] qp:bg-opacity-20 qp:text-[--text-warning];
}

/* 검색 입력 */
.qp-search-input {
  @apply qp:w-full qp:p-2 qp:border qp:border-[--background-modifier-border] qp:rounded qp:bg-[--background-primary];
}

/* 진행률 바 */
.qp-progress-bar {
  @apply qp:h-2 qp:bg-[--background-modifier-border] qp:rounded qp:overflow-hidden;
}

.qp-progress-fill {
  @apply qp:h-full qp:bg-[--interactive-accent] qp:transition-all qp:duration-200;
}

/* 결과 요약 */
.qp-result-success {
  @apply qp:text-[--text-success];
}

.qp-result-error {
  @apply qp:text-[--text-error];
}
```

---

## 6. Accessibility

```typescript
// 키보드 네비게이션
private setupKeyboardNavigation(): void {
  this.contentEl.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Escape':
        this.close();
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.toggleSelectAll();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.state.selectedFiles.size > 0) {
          this.handleDelete();
        }
        break;
    }
  });
}

// ARIA 레이블
private renderFileItem(container: HTMLElement, file: PublishedFile): void {
  const item = container.createDiv({
    cls: 'qp-file-item',
    attr: {
      role: 'checkbox',
      'aria-checked': this.state.selectedFiles.has(file.path) ? 'true' : 'false',
      'aria-label': file.path,
      tabindex: '0',
    },
  });
}
```
