/**
 * Remote File Manager Modal
 *
 * 원격 저장소의 발행된 파일을 관리하는 모달입니다.
 */

import { App, Modal, Notice, Setting, debounce, setIcon } from "obsidian";
import type { PublishedFile, FileListState, DeleteResult } from "../types";
import { INITIAL_FILE_LIST_STATE } from "../types";
import { RemoteFileService } from "../services/remote-file";
import type { GitHubService } from "../services/github";
import { ConfirmModal } from "./components/confirm-modal";
import { t } from "../i18n";
import { cn } from "../utils/cn";

/**
 * Remote File Manager Modal 옵션
 */
export interface RemoteFileManagerModalOptions {
  /** GitHubService 인스턴스 */
  gitHubService: GitHubService;
  /** 콘텐츠 경로 (기본값: 'content') */
  contentPath?: string;
}

/**
 * 원격 파일 관리 모달
 */
export class RemoteFileManagerModal extends Modal {
  private state: FileListState;
  private remoteFileService: RemoteFileService;
  private cachedFiles: PublishedFile[] | null = null;

  // 디바운스된 검색 함수
  private debouncedSearch = debounce(
    (query: string) => {
      this.handleSearch(query);
    },
    300,
    true
  );

  constructor(app: App, options: RemoteFileManagerModalOptions) {
    super(app);
    this.state = { ...INITIAL_FILE_LIST_STATE };
    this.remoteFileService = new RemoteFileService(options.gitHubService, {
      contentPath: options.contentPath ?? "content",
    });
  }

  /**
   * 모달 열기 (라이프사이클)
   */
  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass("qp-remote-file-modal");
    modalEl.addClass("qp-remote-file-modal-container");

    this.setTitle(t("modal.remoteFiles.title"));

    // 키보드 네비게이션 설정
    this.setupKeyboardNavigation();

    // 파일 목록 로드
    await this.loadFiles();
  }

  /**
   * 모달 닫기 (라이프사이클)
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.state = { ...INITIAL_FILE_LIST_STATE };
    // 캐시는 세션 유지
  }

  /**
   * 파일 목록 로드
   */
  private async loadFiles(forceRefresh = false): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      // 캐시된 파일 사용 (forceRefresh가 아닌 경우)
      if (!forceRefresh && this.cachedFiles) {
        this.updateState({
          files: this.cachedFiles,
          filteredFiles: this.cachedFiles,
          duplicateGroups: this.remoteFileService.detectDuplicates(this.cachedFiles),
          isLoading: false,
        });
        return;
      }

      const files = await this.remoteFileService.getPublishedFiles();
      this.cachedFiles = files;

      const duplicateGroups = this.remoteFileService.detectDuplicates(files);

      this.updateState({
        files,
        filteredFiles: files,
        duplicateGroups,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.updateState({
        error: errorMessage,
        isLoading: false,
      });
      new Notice(t("error.remoteFiles.loadFailed"));
    }
  }

  /**
   * 상태 업데이트 및 리렌더링
   */
  private updateState(partial: Partial<FileListState>): void {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  /**
   * 키보드 네비게이션 설정
   */
  private setupKeyboardNavigation(): void {
    this.contentEl.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Escape":
          // 기본 동작 (모달 닫기)
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleSelectAll();
          }
          break;
        case "Delete":
        case "Backspace":
          if (this.state.selectedFiles.size > 0 && !this.state.isDeleting) {
            e.preventDefault();
            this.handleDelete();
          }
          break;
      }
    });
  }

  /**
   * UI 렌더링
   */
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    // 로딩 상태
    if (this.state.isLoading) {
      this.renderLoading(contentEl);
      return;
    }

    // 에러 상태
    if (this.state.error) {
      this.renderError(contentEl);
      return;
    }

    // 헤더 (검색, 새로고침)
    this.renderHeader(contentEl);

    // 중복 경고
    if (this.state.duplicateGroups.length > 0) {
      this.renderDuplicateWarning(contentEl);
    }

    // 파일 목록
    this.renderFileList(contentEl);

    // 하단 액션 바
    this.renderFooter(contentEl);
  }

  /**
   * 로딩 UI 렌더링
   */
  private renderLoading(container: HTMLElement): void {
    const loadingEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12",
    });
    const loadingIcon = loadingEl.createDiv({
      cls: "animate-spin",
      attr: { "aria-hidden": "true" },
    });
    setIcon(loadingIcon, "loader-2");
    loadingEl.createDiv({
      cls: "mt-2 text-obs-text-muted",
      text: t("modal.remoteFiles.loading"),
    });
  }

  /**
   * 에러 UI 렌더링
   */
  private renderError(container: HTMLElement): void {
    const errorEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12 text-obs-text-error",
    });
    const errorIcon = errorEl.createDiv({ attr: { "aria-hidden": "true" } });
    setIcon(errorIcon, "x-circle");
    errorEl.createDiv({
      cls: "mt-2",
      text: this.state.error ?? t("error.remoteFiles.loadFailed"),
    });

    const retryBtn = errorEl.createEl("button", {
      text: t("modal.remoteFiles.refresh"),
      cls: "mt-4",
    });
    retryBtn.addEventListener("click", () => this.loadFiles(true));
  }

  /**
   * 헤더 렌더링 (검색, 새로고침)
   */
  private renderHeader(container: HTMLElement): void {
    const headerEl = container.createDiv({
      cls: "flex items-center gap-2 mb-4",
    });

    // 검색 입력
    const searchInput = headerEl.createEl("input", {
      type: "text",
      placeholder: t("modal.remoteFiles.search"),
      cls: "qp-search-input flex-1 p-2 border border-obs-bg-modifier-border rounded bg-obs-bg-primary",
      attr: {
        "aria-label": t("modal.remoteFiles.search"),
      },
    });
    searchInput.value = this.state.searchQuery;
    searchInput.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.state.searchQuery = query;
      this.debouncedSearch(query);
    });

    // 새로고침 버튼
    const refreshBtn = headerEl.createEl("button", {
      text: t("modal.remoteFiles.refresh"),
      cls: "px-3 py-2",
      attr: {
        "aria-label": t("modal.remoteFiles.refresh"),
      },
    });
    refreshBtn.addEventListener("click", () => this.handleRefresh());
  }

  /**
   * 중복 경고 렌더링
   */
  private renderDuplicateWarning(container: HTMLElement): void {
    const warningEl = container.createDiv({
      cls: "flex items-center gap-2 p-3 mb-4 rounded bg-obs-bg-modifier-warning text-obs-text-warning",
      attr: {
        role: "alert",
        "aria-live": "polite",
      },
    });

    const warningIcon = warningEl.createSpan({ cls: "mr-1", attr: { "aria-hidden": "true" } });
    setIcon(warningIcon, "alert-triangle");
    warningEl.createSpan({
      text: `${t("modal.remoteFiles.duplicates")} - ${t("modal.remoteFiles.duplicateCount", { count: this.state.duplicateGroups.length })}`,
    });
  }

  /**
   * 파일 목록 렌더링
   */
  private renderFileList(container: HTMLElement): void {
    const listContainer = container.createDiv({
      cls: "qp-file-list max-h-[400px] overflow-y-auto border border-obs-bg-modifier-border rounded",
      attr: {
        role: "list",
        "aria-label": t("modal.remoteFiles.fileListLabel"),
      },
    });

    // 빈 목록
    if (this.state.filteredFiles.length === 0) {
      listContainer.createDiv({
        cls: "flex items-center justify-center py-12 text-obs-text-muted",
        text: t("modal.remoteFiles.empty"),
      });
      return;
    }

    // 파일 개수 표시
    const countEl = container.createDiv({
      cls: "text-sm text-obs-text-muted mb-2",
      text: t("modal.remoteFiles.fileCount", {
        count: this.state.filteredFiles.length,
      }),
    });
    container.insertBefore(countEl, listContainer);

    // 중복 파일명 집합 (빠른 조회용)
    const duplicateFileNames = new Set(this.state.duplicateGroups.map((g) => g.fileName));

    // 파일 항목 렌더링
    this.state.filteredFiles.forEach((file) => {
      this.renderFileItem(listContainer, file, duplicateFileNames);
    });
  }

  /**
   * 단일 파일 항목 렌더링
   */
  private renderFileItem(
    container: HTMLElement,
    file: PublishedFile,
    duplicateFileNames: Set<string>
  ): void {
    const isSelected = this.state.selectedFiles.has(file.path);
    const isDuplicate = duplicateFileNames.has(file.name);

    const itemEl = container.createDiv({
      cls: cn(
        "qp-file-item flex items-center gap-2 p-2 border-b border-obs-bg-modifier-border cursor-pointer",
        isSelected && "bg-obs-bg-modifier-hover"
      ),
      attr: {
        role: "listitem",
      },
    });

    // 체크박스
    const checkbox = itemEl.createEl("input", {
      type: "checkbox",
      cls: "mr-2",
      attr: {
        "aria-label": t("modal.remoteFiles.selectFile", { name: file.name }),
      },
    }) as HTMLInputElement;
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      this.toggleFileSelection(file.path);
    });

    // 파일 정보
    const infoEl = itemEl.createDiv({ cls: "flex-1 min-w-0" });
    infoEl.createDiv({
      cls: "font-medium truncate",
      text: file.name,
    });
    infoEl.createDiv({
      cls: "text-xs text-obs-text-muted truncate",
      text: file.path,
    });

    // 중복 배지
    if (isDuplicate) {
      itemEl.createSpan({
        text: t("modal.remoteFiles.duplicateBadge"),
        cls: "qp-duplicate-badge text-xs px-1.5 py-0.5 rounded bg-obs-bg-modifier-warning text-obs-text-warning",
      });
    }

    // 파일 크기
    itemEl.createSpan({
      text: this.remoteFileService.formatFileSize(file.size),
      cls: "text-xs text-obs-text-muted",
    });

    // 클릭 이벤트
    itemEl.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).tagName !== "INPUT") {
        this.toggleFileSelection(file.path);
      }
    });

    // 키보드 이벤트
    itemEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleFileSelection(file.path);
      }
    });
  }

  /**
   * 하단 액션 바 렌더링
   */
  private renderFooter(container: HTMLElement): void {
    const selectedCount = this.state.selectedFiles.size;

    // 선택 정보 표시
    const selectionInfoEl = container.createDiv({
      cls: "flex items-center gap-2 mt-4 pt-4 border-t border-obs-bg-modifier-border",
    });

    if (selectedCount > 0) {
      selectionInfoEl.createSpan({
        text: t("modal.remoteFiles.selected", { count: selectedCount }),
        cls: "text-sm",
      });

      // 전체 선택/해제 버튼
      const toggleButton = selectionInfoEl.createEl("button", {
        text:
          selectedCount === this.state.filteredFiles.length
            ? t("modal.remoteFiles.deselectAll")
            : t("modal.remoteFiles.selectAll"),
        cls: "text-sm text-obs-text-accent bg-transparent border-none cursor-pointer underline hover:text-obs-text-accent-hover",
      });
      toggleButton.addEventListener("click", () => {
        this.toggleSelectAll();
      });
    }

    // 버튼 영역 (Setting API 사용)
    const buttonSetting = new Setting(container).setClass("qp-footer-buttons");

    // 취소 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.cancel")).onClick(() => this.close())
    );

    // 삭제 버튼
    buttonSetting.addButton((button) => {
      button
        .setButtonText(
          this.state.isDeleting
            ? t("modal.remoteFiles.deleteProgress", { current: 0, total: 0 })
            : t("modal.remoteFiles.delete")
        )
        .setWarning()
        .setDisabled(selectedCount === 0 || this.state.isDeleting)
        .onClick(() => this.handleDelete());

      // 삭제 버튼 참조 저장 (진행률 업데이트용)
      this.deleteButtonEl = button.buttonEl;
    });
  }

  private deleteButtonEl: HTMLButtonElement | null = null;

  /**
   * 파일 선택/해제
   */
  private toggleFileSelection(path: string): void {
    const newSelection = new Set(this.state.selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    this.updateState({ selectedFiles: newSelection });
  }

  /**
   * 전체 선택/해제
   */
  private toggleSelectAll(): void {
    const newSelection = new Set<string>();
    const allSelected = this.state.selectedFiles.size === this.state.filteredFiles.length;

    if (!allSelected) {
      this.state.filteredFiles.forEach((file) => newSelection.add(file.path));
    }

    this.updateState({ selectedFiles: newSelection });
  }

  /**
   * 검색 처리
   */
  private handleSearch(query: string): void {
    const filteredFiles = this.remoteFileService.searchFiles(this.state.files, query);
    this.updateState({
      searchQuery: query,
      filteredFiles,
      selectedFiles: new Set(), // 검색 시 선택 초기화
    });
  }

  /**
   * 새로고침 처리
   */
  private async handleRefresh(): Promise<void> {
    this.cachedFiles = null; // 캐시 무효화
    await this.loadFiles(true);
  }

  /**
   * 삭제 처리
   */
  private async handleDelete(): Promise<void> {
    const selectedCount = this.state.selectedFiles.size;
    if (selectedCount === 0) return;

    // 확인 다이얼로그
    const confirmed = await new ConfirmModal(this.app, {
      title: t("modal.remoteFiles.deleteConfirm.title"),
      message: t("modal.remoteFiles.deleteConfirm.message", {
        count: selectedCount,
      }),
      confirmText: t("modal.remoteFiles.delete"),
      cancelText: t("modal.confirm.cancel"),
      isDangerous: true,
    }).openAsync();

    if (!confirmed) return;

    // 삭제할 파일 목록
    const filesToDelete = this.state.files.filter((file) =>
      this.state.selectedFiles.has(file.path)
    );

    this.updateState({ isDeleting: true });

    try {
      const result: DeleteResult = await this.remoteFileService.deleteFiles(
        filesToDelete,
        (current, total) => {
          // 진행률 업데이트
          if (this.deleteButtonEl) {
            this.deleteButtonEl.textContent = t("modal.remoteFiles.deleteProgress", {
              current,
              total,
            });
          }
        }
      );

      // 결과 표시
      if (result.allSucceeded) {
        new Notice(t("modal.remoteFiles.deleteSuccess", { count: result.succeeded.length }));
      } else {
        new Notice(
          t("modal.remoteFiles.deletePartial", {
            succeeded: result.succeeded.length,
            failed: result.failed.length,
          })
        );
      }

      // 캐시 무효화 및 목록 새로고침
      this.cachedFiles = null;
      this.updateState({
        isDeleting: false,
        selectedFiles: new Set(),
      });
      await this.loadFiles(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      new Notice(t("modal.remoteFiles.deleteFailed") + ": " + errorMessage);
      this.updateState({ isDeleting: false });
    }
  }
}
