/**
 * Commit Detail Modal
 *
 * 특정 커밋의 상세 정보를 표시하고 파일 되돌리기를 수행하는 모달입니다.
 */

import { App, Modal, Notice, Setting, setIcon } from "obsidian";
import type { CommitDetail, CommitFileChange } from "../../../app/types";
import type { GitHubService } from "../../../entities/github/model/service";
import { t } from "../../../shared/lib/i18n";
import { cn } from "../../../shared/lib/cn";
import { DiffModal } from "../../../shared/ui/diff-modal";

/**
 * Commit Detail Modal 옵션
 */
export interface CommitDetailModalOptions {
  /** GitHubService 인스턴스 */
  gitHubService: GitHubService;
  /** 커밋 SHA */
  commitSha: string;
}

/**
 * 커밋 상세 모달
 */
export class CommitDetailModal extends Modal {
  private gitHubService: GitHubService;
  private commitSha: string;
  private commitDetail: CommitDetail | null = null;
  private expandedFiles: Set<string> = new Set();
  private selectedFiles: Set<string> = new Set();
  private isLoading = true;
  private error: string | null = null;

  constructor(app: App, options: CommitDetailModalOptions) {
    super(app);
    this.gitHubService = options.gitHubService;
    this.commitSha = options.commitSha;
  }

  /**
   * 모달 열기 (라이프사이클)
   */
  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass("qp-commit-detail-modal");
    modalEl.addClass("qp-commit-detail-modal-container");

    this.setTitle(t("modal.commitDetail.title"));

    // 커밋 상세 로드
    await this.loadCommitDetail();
  }

  /**
   * 모달 닫기 (라이프사이클)
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * 커밋 상세 로드
   */
  private async loadCommitDetail(): Promise<void> {
    this.isLoading = true;
    this.render();

    try {
      this.commitDetail = await this.gitHubService.getCommitDetail(this.commitSha);
      this.isLoading = false;
      this.error = null;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.error = err instanceof Error ? err.message : "Unknown error";
      this.render();
      new Notice(t("error.commitHistory.loadFailed"));
    }
  }

  /**
   * UI 렌더링
   */
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    // 로딩 상태
    if (this.isLoading) {
      this.renderLoading(contentEl);
      return;
    }

    // 에러 상태
    if (this.error) {
      this.renderError(contentEl);
      return;
    }

    if (!this.commitDetail) {
      return;
    }

    // 커밋 헤더 정보
    this.renderCommitHeader(contentEl);

    // 변경된 파일 목록
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
      text: t("modal.commitDetail.loading"),
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
      text: this.error ?? t("error.commitHistory.loadFailed"),
    });
  }

  /**
   * 커밋 헤더 정보 렌더링
   */
  private renderCommitHeader(container: HTMLElement): void {
    if (!this.commitDetail) return;

    const headerEl = container.createDiv({
      cls: "qp-commit-header mb-4 p-4 border border-obs-bg-modifier-border rounded bg-obs-bg-secondary",
    });

    // 메시지
    headerEl.createDiv({
      cls: "text-lg font-semibold text-obs-text-normal mb-2",
      text: this.commitDetail.message,
    });

    // 본문 (있는 경우)
    if (this.commitDetail.body) {
      headerEl.createDiv({
        cls: "text-sm text-obs-text-muted mb-3 whitespace-pre-wrap",
        text: this.commitDetail.body,
      });
    }

    // 메타 정보
    const metaEl = headerEl.createDiv({
      cls: "flex flex-wrap items-center gap-3 text-sm text-obs-text-muted",
    });

    // SHA
    const shaContainer = metaEl.createDiv({ cls: "flex items-center gap-1" });
    shaContainer.createSpan({ text: t("modal.commitDetail.sha") + ":" });
    shaContainer.createSpan({
      cls: "font-mono",
      text: this.commitDetail.shortSha,
    });

    // 작성자
    metaEl.createSpan({ text: "•" });
    const authorContainer = metaEl.createDiv({ cls: "flex items-center gap-1" });
    authorContainer.createSpan({ text: t("modal.commitDetail.author") + ":" });
    authorContainer.createSpan({ text: this.commitDetail.author.name });

    // 날짜
    metaEl.createSpan({ text: "•" });
    const dateContainer = metaEl.createDiv({ cls: "flex items-center gap-1" });
    dateContainer.createSpan({ text: t("modal.commitDetail.date") + ":" });
    dateContainer.createSpan({
      text: new Date(this.commitDetail.author.date).toLocaleString(),
    });

    // 변경 통계
    metaEl.createSpan({ text: "•" });
    const statsContainer = metaEl.createDiv({ cls: "flex items-center gap-2" });

    if (this.commitDetail.stats.additions > 0) {
      statsContainer.createSpan({
        cls: "text-obs-text-success",
        text: `+${this.commitDetail.stats.additions}`,
      });
    }
    if (this.commitDetail.stats.deletions > 0) {
      statsContainer.createSpan({
        cls: "text-obs-text-error",
        text: `-${this.commitDetail.stats.deletions}`,
      });
    }

    // GitHub 링크
    const linkEl = headerEl.createEl("a", {
      cls: "inline-flex items-center gap-1 mt-3 text-sm text-obs-text-accent hover:text-obs-text-accent-hover",
      attr: {
        href: this.commitDetail.htmlUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });
    setIcon(linkEl.createSpan({ attr: { "aria-hidden": "true" } }), "external-link");
    linkEl.createSpan({ text: t("modal.commitDetail.viewOnGitHub") });
  }

  /**
   * 파일 목록 렌더링
   */
  private renderFileList(container: HTMLElement): void {
    if (!this.commitDetail) return;

    const sectionEl = container.createDiv({
      cls: "qp-file-list-section mb-4",
    });

    // 섹션 헤더
    const headerEl = sectionEl.createDiv({
      cls: "flex items-center justify-between mb-2",
    });

    headerEl.createDiv({
      cls: "text-sm font-medium text-obs-text-normal",
      text: t("modal.commitDetail.changedFiles", { count: this.commitDetail.files.length }),
    });

    // 전체 선택/해제
    if (this.commitDetail.files.length > 0) {
      const toggleBtn = headerEl.createEl("button", {
        text:
          this.selectedFiles.size === this.commitDetail.files.length
            ? t("modal.commitDetail.deselectAll")
            : t("modal.commitDetail.selectAll"),
        cls: "text-xs text-obs-text-accent bg-transparent border-none cursor-pointer hover:underline",
      });
      toggleBtn.addEventListener("click", () => this.toggleSelectAll());
    }

    // 파일 목록 컨테이너
    const listContainer = sectionEl.createDiv({
      cls: "border border-obs-bg-modifier-border rounded max-h-[300px] overflow-y-auto",
    });

    // 빈 목록
    if (this.commitDetail.files.length === 0) {
      listContainer.createDiv({
        cls: "flex items-center justify-center py-8 text-obs-text-muted",
        text: t("modal.commitDetail.noFiles"),
      });
      return;
    }

    // 파일 항목 렌더링
    this.commitDetail.files.forEach((file) => {
      this.renderFileItem(listContainer, file);
    });
  }

  /**
   * 단일 파일 항목 렌더링
   */
  private renderFileItem(container: HTMLElement, file: CommitFileChange): void {
    const isExpanded = this.expandedFiles.has(file.filename);
    const isSelected = this.selectedFiles.has(file.filename);

    const itemEl = container.createDiv({
      cls: cn(
        "qp-file-item border-b border-obs-bg-modifier-border last:border-b-0",
        isSelected && "bg-obs-bg-modifier-hover"
      ),
    });

    // 파일 헤더
    const headerEl = itemEl.createDiv({
      cls: "flex items-center gap-2 p-3 cursor-pointer hover:bg-obs-bg-modifier-hover",
    });

    // 확장/축소 아이콘
    const expandIcon = headerEl.createDiv({
      cls: cn("transition-transform", isExpanded && "rotate-90"),
      attr: { "aria-hidden": "true" },
    });
    setIcon(expandIcon, "chevron-right");

    // 체크박스
    const checkbox = headerEl.createEl("input", {
      type: "checkbox",
      cls: "mr-2",
      attr: {
        "aria-label": t("modal.commitDetail.selectFile", { name: file.filename }),
      },
    }) as HTMLInputElement;
    checkbox.checked = isSelected;
    checkbox.addEventListener("change", (e) => {
      e.stopPropagation();
      this.toggleFileSelection(file.filename);
    });
    checkbox.addEventListener("click", (e) => e.stopPropagation());

    // 상태 아이콘
    const statusIcon = headerEl.createDiv({
      cls: cn(
        "text-sm",
        file.status === "added" && "text-obs-text-success",
        file.status === "deleted" && "text-obs-text-error",
        file.status === "modified" && "text-obs-text-warning",
        file.status === "renamed" && "text-obs-text-accent"
      ),
      attr: { "aria-hidden": "true" },
    });
    const statusIconMap = {
      added: "plus-circle",
      deleted: "minus-circle",
      modified: "edit",
      renamed: "git-commit",
    } as const;
    setIcon(statusIcon, statusIconMap[file.status] ?? "file");

    // 파일명
    headerEl.createDiv({
      cls: "flex-1 min-w-0 text-sm truncate",
      text: file.filename,
    });

    // 변경 라인 수
    if (file.changes) {
      const changesEl = headerEl.createDiv({
        cls: "text-xs text-obs-text-muted font-mono",
      });
      if (file.changes.additions > 0) {
        changesEl.createSpan({
          cls: "text-obs-text-success",
          text: `+${file.changes.additions}`,
        });
      }
      if (file.changes.deletions > 0) {
        changesEl.createSpan({
          cls: "text-obs-text-error",
          text: `-${file.changes.deletions}`,
        });
      }
    }

    // 헤더 클릭 이벤트
    headerEl.addEventListener("click", () => {
      this.toggleFileExpansion(file.filename);
    });

    // 확장된 내용
    if (isExpanded && file.patch) {
      const patchEl = itemEl.createDiv({
        cls: "p-3 bg-obs-bg-primary border-t border-obs-bg-modifier-border",
      });

      // Diff 표시
      const lines = file.patch.split("\n");
      lines.forEach((line) => {
        const lineEl = patchEl.createDiv({
          cls: "text-xs font-mono whitespace-pre",
        });

        if (line.startsWith("+") && !line.startsWith("+++")) {
          lineEl.addClass("diff-line-added");
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          lineEl.addClass("diff-line-removed");
        } else {
          lineEl.addClass("diff-line-common");
        }

        lineEl.createSpan({ text: line });
      });

      // Diff로 보기 버튼
      const diffBtn = patchEl.createEl("button", {
        text: t("modal.commitDetail.viewDiff"),
        cls: "mt-2 text-xs px-2 py-1 border border-obs-bg-modifier-border rounded hover:bg-obs-bg-modifier-hover",
      });
      diffBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.viewFileDiff(file);
      });
    }
  }

  /**
   * 하단 액션 바 렌더링
   */
  private renderFooter(container: HTMLElement): void {
    if (!this.commitDetail) return;

    const selectedCount = this.selectedFiles.size;

    const footerEl = container.createDiv({
      cls: "flex items-center justify-between mt-4 pt-4 border-t border-obs-bg-modifier-border",
    });

    // 선택 정보
    if (selectedCount > 0) {
      footerEl.createSpan({
        cls: "text-sm text-obs-text-normal",
        text: t("modal.commitDetail.selectedCount", { count: selectedCount }),
      });
    } else {
      footerEl.createSpan({
        cls: "text-sm text-obs-text-muted",
        text: t("modal.commitDetail.selectToRevert"),
      });
    }

    // 버튼 영역
    const buttonSetting = new Setting(footerEl).setClass("qp-footer-buttons");

    // 닫기 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.cancel")).onClick(() => this.close())
    );

    // 되돌리기 버튼
    buttonSetting.addButton((button) => {
      button
        .setButtonText(t("modal.commitDetail.revertSelected"))
        .setWarning()
        .setDisabled(selectedCount === 0)
        .onClick(() => this.handleRevert());
    });
  }

  /**
   * 파일 확장/축소 토글
   */
  private toggleFileExpansion(filename: string): void {
    const newExpanded = new Set(this.expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    this.expandedFiles = newExpanded;
    this.render();
  }

  /**
   * 파일 선택/해제
   */
  private toggleFileSelection(filename: string): void {
    const newSelection = new Set(this.selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    this.selectedFiles = newSelection;
    this.render();
  }

  /**
   * 전체 선택/해제
   */
  private toggleSelectAll(): void {
    if (!this.commitDetail) return;

    const newSelection = new Set<string>();
    const allSelected = this.selectedFiles.size === this.commitDetail.files.length;

    if (!allSelected) {
      this.commitDetail.files.forEach((file) => newSelection.add(file.filename));
    }

    this.selectedFiles = newSelection;
    this.render();
  }

  /**
   * 파일 Diff 보기
   */
  private async viewFileDiff(file: CommitFileChange): Promise<void> {
    if (!this.commitDetail) return;

    try {
      // 현재 파일 내용 가져오기
      const currentContent = await this.gitHubService.getFile(file.filename);

      // 해당 커밋 시점의 파일 내용 가져오기
      const oldContent = await this.gitHubService.getFileAtCommit(
        file.filename,
        this.commitDetail.sha
      );

      // DiffModal로 표시
      new DiffModal(this.app, {
        originalContent: oldContent ?? "",
        modifiedContent: currentContent?.content ?? "",
        fileName: file.filename,
      }).open();
    } catch (error) {
      new Notice(
        t("error.diffFailed", { message: error instanceof Error ? error.message : "Unknown error" })
      );
    }
  }

  /**
   * 되돌리기 처리
   */
  private handleRevert(): void {
    if (!this.commitDetail || this.selectedFiles.size === 0) return;

    const files = Array.from(this.selectedFiles);

    // RevertModal 열기 (순환 참조 방지를 위해 동적 import)
    import("./revert-modal").then(({ RevertModal }) => {
      new RevertModal(this.app, {
        gitHubService: this.gitHubService,
        files,
        commitSha: this.commitDetail!.sha,
        onSuccess: () => {
          this.close();
        },
      }).open();
    });
  }
}
