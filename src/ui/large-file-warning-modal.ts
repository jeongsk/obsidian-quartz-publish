/**
 * Large File Warning Modal
 *
 * 대용량 파일 발행 전 사용자에게 경고를 표시하는 모달입니다.
 */

import { App, Modal } from "obsidian";
import type { LargeFileInfo } from "../types";
import { FileValidatorService } from "../services/file-validator";
import { t } from "../i18n";

/**
 * 대용량 파일 경고 모달 옵션
 */
export interface LargeFileWarningModalOptions {
  /** 대용량 파일 목록 */
  largeFiles: LargeFileInfo[];
  /** 최대 허용 파일 크기 (바이트) */
  maxFileSize: number;
}

/**
 * 대용량 파일 경고 모달 클래스
 *
 * 발행하려는 파일 중 대용량 파일이 있을 때 사용자에게 경고를 표시합니다.
 */
export class LargeFileWarningModal extends Modal {
  private options: LargeFileWarningModalOptions;
  private resolvePromise: ((value: boolean) => void) | null = null;

  constructor(app: App, options: LargeFileWarningModalOptions) {
    super(app);
    this.options = options;
  }

  /**
   * 모달이 열릴 때 호출됩니다.
   */
  onOpen(): void {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    modalEl.addClass("quartz-publish-large-file-warning-modal");

    // 헤더
    this.renderHeader();

    // 파일 목록
    this.renderFileList();

    // 안내 메시지
    this.renderGuidance();

    // 액션 버튼
    this.renderActions();
  }

  /**
   * 모달이 닫힐 때 호출됩니다.
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.resolvePromise?.(false);
  }

  /**
   * 모달을 열고 사용자의 선택을 기다립니다.
   *
   * @returns 사용자가 계속을 선택하면 true, 취소하면 false
   */
  waitForConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  /**
   * 헤더를 렌더링합니다.
   */
  private renderHeader(): void {
    const { contentEl } = this;

    const headerEl = contentEl.createDiv({
      cls: "flex items-center gap-3 mb-4",
    });

    // 경고 아이콘
    const iconEl = headerEl.createDiv({
      cls: "flex-shrink-0 w-10 h-10 rounded-full bg-obs-bg-modifier-warning flex items-center justify-center",
      attr: { "aria-hidden": "true" },
    });
    iconEl.createSpan({
      text: "⚠️",
      cls: "text-xl",
    });

    // 제목
    const titleContainer = headerEl.createDiv({ cls: "flex-1" });
    const maxSizeFormatted = FileValidatorService.formatFileSize(this.options.maxFileSize);
    titleContainer.createEl("h3", {
      text: t("modal.largeFile.title"),
      cls: "m-0 text-lg font-semibold",
      attr: { id: "large-file-warning-title" },
    });
    titleContainer.createDiv({
      text: t("modal.largeFile.message", {
        count: this.options.largeFiles.length,
        size: maxSizeFormatted,
      }),
      cls: "text-sm text-obs-text-muted mt-1",
    });
  }

  /**
   * 파일 목록을 렌더링합니다.
   */
  private renderFileList(): void {
    const { contentEl } = this;

    const listContainer = contentEl.createDiv({
      cls: "max-h-48 overflow-y-auto border border-obs-bg-modifier-border rounded-md mb-4",
      attr: {
        role: "list",
        "aria-label": t("modal.largeFile.listLabel"),
      },
    });

    for (const fileInfo of this.options.largeFiles) {
      const itemEl = listContainer.createDiv({
        cls: "flex items-center justify-between px-3 py-2 border-b border-obs-bg-modifier-border last:border-b-0",
        attr: { role: "listitem" },
      });

      // 파일 정보
      const fileInfoEl = itemEl.createDiv({ cls: "flex-1 min-w-0" });
      fileInfoEl.createDiv({
        text: fileInfo.file.basename || fileInfo.file.name,
        cls: "font-medium truncate",
      });
      fileInfoEl.createDiv({
        text: fileInfo.file.path,
        cls: "text-xs text-obs-text-muted truncate",
      });

      // 파일 크기
      itemEl.createSpan({
        text: fileInfo.formattedSize,
        cls: "ml-3 text-sm font-medium text-obs-text-warning flex-shrink-0",
        attr: { "aria-label": t("modal.largeFile.fileSize", { size: fileInfo.formattedSize }) },
      });
    }
  }

  /**
   * 안내 메시지를 렌더링합니다.
   */
  private renderGuidance(): void {
    const { contentEl } = this;
    const maxSizeFormatted = FileValidatorService.formatFileSize(this.options.maxFileSize);

    const guidanceEl = contentEl.createDiv({
      cls: "bg-obs-bg-modifier-warning bg-opacity-20 rounded-md p-3 mb-4",
      attr: { role: "note" },
    });

    guidanceEl.createDiv({
      text: t("modal.largeFile.maxSize", { size: maxSizeFormatted }),
      cls: "font-medium mb-2",
    });

    const listEl = guidanceEl.createEl("ul", {
      cls: "m-0 pl-4 text-sm text-obs-text-muted",
    });

    listEl.createEl("li", { text: t("modal.largeFile.tip.uploadTime") });
    listEl.createEl("li", { text: t("modal.largeFile.tip.githubLimit") });
    listEl.createEl("li", { text: t("modal.largeFile.tip.imageCompression") });
  }

  /**
   * 액션 버튼을 렌더링합니다.
   */
  private renderActions(): void {
    const { contentEl } = this;

    const actionsEl = contentEl.createDiv({
      cls: "flex justify-end gap-2",
    });

    // 취소 버튼
    const cancelBtn = actionsEl.createEl("button", {
      text: t("modal.confirm.cancel"),
      attr: {
        "aria-label": t("modal.confirm.cancel"),
      },
    });
    cancelBtn.addEventListener("click", () => {
      this.resolvePromise?.(false);
      this.close();
    });

    // 계속 버튼
    const continueBtn = actionsEl.createEl("button", {
      text: t("modal.largeFile.continue"),
      cls: "mod-warning",
      attr: {
        "aria-label": t("modal.largeFile.continue"),
      },
    });
    continueBtn.addEventListener("click", () => {
      this.resolvePromise?.(true);
      this.close();
    });
  }
}
