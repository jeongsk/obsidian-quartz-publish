/**
 * Revert Modal
 *
 * 파일 되돌리기 진행 상황을 표시하고 결과를 안내하는 모달입니다.
 */

import { App, Modal, Notice, Setting, setIcon } from "obsidian";
import type { RevertResult, RevertProgressCallback } from "../../../app/types";
import type { GitHubService } from "../../../entities/github/model/service";
import { t } from "../../../shared/lib/i18n";

/**
 * Revert Modal 옵션
 */
export interface RevertModalOptions {
  /** GitHubService 인스턴스 */
  gitHubService: GitHubService;
  /** 되돌릴 파일 경로 목록 */
  files: string[];
  /** 되돌릴 커밋 SHA */
  commitSha: string;
  /** 성공 콜백 (선택) */
  onSuccess?: () => void;
}

/**
 * 되돌리기 모달
 */
export class RevertModal extends Modal {
  private gitHubService: GitHubService;
  private files: string[];
  private commitSha: string;
  private onSuccess?: () => void;

  private state: "confirm" | "reverting" | "completed" | "error" = "confirm";
  private progress = { current: 0, total: 0 };
  private result: RevertResult | null = null;
  private errorMessage: string | null = null;

  constructor(app: App, options: RevertModalOptions) {
    super(app);
    this.gitHubService = options.gitHubService;
    this.files = options.files;
    this.commitSha = options.commitSha;
    this.onSuccess = options.onSuccess;
  }

  /**
   * 모달 열기 (라이프사이클)
   */
  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass("qp-revert-modal");
    modalEl.addClass("qp-revert-modal-container");

    this.setTitle(t("modal.revert.title"));

    this.render();
  }

  /**
   * 모달 닫기 (라이프사이클)
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  /**
   * UI 렌더링
   */
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    switch (this.state) {
      case "confirm":
        this.renderConfirm(contentEl);
        break;
      case "reverting":
        this.renderReverting(contentEl);
        break;
      case "completed":
        this.renderCompleted(contentEl);
        break;
      case "error":
        this.renderError(contentEl);
        break;
    }
  }

  /**
   * 확인 화면 렌더링
   */
  private renderConfirm(container: HTMLElement): void {
    const confirmEl = container.createDiv({
      cls: "qp-revert-confirm py-4",
    });

    // 경고 아이콘과 메시지
    const headerEl = confirmEl.createDiv({
      cls: "flex items-center gap-3 mb-4 p-3 rounded bg-obs-bg-modifier-warning text-obs-text-warning",
      attr: { role: "alert" },
    });
    const warningIcon = headerEl.createDiv({ attr: { "aria-hidden": "true" } });
    setIcon(warningIcon, "alert-triangle");
    headerEl.createDiv({
      cls: "font-medium",
      text: t("modal.revert.warning"),
    });

    // 설명
    confirmEl.createDiv({
      cls: "text-sm text-obs-text-normal mb-4",
      text: t("modal.revert.confirmMessage", { count: this.files.length }),
    });

    // 파일 목록
    const fileListEl = confirmEl.createDiv({
      cls: "mb-4 p-3 border border-obs-bg-modifier-border rounded bg-obs-bg-secondary max-h-[200px] overflow-y-auto",
    });

    this.files.forEach((file) => {
      fileListEl.createDiv({
        cls: "text-sm text-obs-text-muted py-1",
        text: `• ${file}`,
      });
    });

    // 커밋 정보
    const commitInfoEl = confirmEl.createDiv({
      cls: "mb-4 p-3 border border-obs-bg-modifier-border rounded bg-obs-bg-secondary",
    });
    commitInfoEl.createDiv({
      cls: "text-xs text-obs-text-muted mb-1",
      text: t("modal.revert.revertTo"),
    });
    commitInfoEl.createDiv({
      cls: "font-mono text-sm",
      text: this.commitSha.substring(0, 7),
    });

    // 버튼 영역
    const buttonSetting = new Setting(confirmEl).setClass("qp-footer-buttons");

    // 취소 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.cancel")).onClick(() => this.close())
    );

    // 되돌리기 버튼
    buttonSetting.addButton((button) => {
      button
        .setButtonText(t("modal.revert.revert"))
        .setWarning()
        .onClick(() => this.startRevert());
    });
  }

  /**
   * 되돌리기 진행 화면 렌더링
   */
  private renderReverting(container: HTMLElement): void {
    const revertingEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12",
    });

    // 로딩 스피너
    const spinnerEl = revertingEl.createDiv({
      cls: "animate-spin mb-4",
      attr: { "aria-hidden": "true" },
    });
    setIcon(spinnerEl, "loader-2");

    // 진행 메시지
    revertingEl.createDiv({
      cls: "text-lg font-medium text-obs-text-normal mb-2",
      text: t("modal.revert.reverting"),
    });

    // 진행률
    if (this.progress.total > 0) {
      revertingEl.createDiv({
        cls: "text-sm text-obs-text-muted",
        text: t("modal.revert.progress", {
          current: this.progress.current,
          total: this.progress.total,
        }),
      });
    }
  }

  /**
   * 완료 화면 렌더링
   */
  private renderCompleted(container: HTMLElement): void {
    if (!this.result) return;

    const completedEl = container.createDiv({
      cls: "qp-revert-completed py-4",
    });

    // 성공 아이콘과 메시지
    const headerEl = completedEl.createDiv({
      cls: "flex items-center gap-3 mb-4 p-3 rounded bg-obs-bg-modifier-success text-obs-text-success",
      attr: { role: "status" },
    });
    const successIcon = headerEl.createDiv({ attr: { "aria-hidden": "true" } });
    setIcon(successIcon, "check-circle");
    headerEl.createDiv({
      cls: "font-medium",
      text: t("modal.revert.success"),
    });

    // 결과 요약
    const summaryEl = completedEl.createDiv({
      cls: "text-sm text-obs-text-normal mb-4",
    });

    if (this.result.allSucceeded) {
      summaryEl.createDiv({
        text: t("modal.revert.allSucceeded", { count: this.result.succeeded.length }),
      });
    } else {
      summaryEl.createDiv({
        text: t("modal.revert.partialSuccess", {
          succeeded: this.result.succeeded.length,
          failed: this.result.failed.length,
        }),
      });
    }

    // 새 커밋 SHA
    if (this.result.commitSha) {
      const commitShaEl = completedEl.createDiv({
        cls: "mb-4 p-3 border border-obs-bg-modifier-border rounded bg-obs-bg-secondary",
      });
      commitShaEl.createDiv({
        cls: "text-xs text-obs-text-muted mb-1",
        text: t("modal.revert.newCommitSha"),
      });
      commitShaEl.createDiv({
        cls: "font-mono text-sm",
        text: this.result.commitSha.substring(0, 7),
      });
    }

    // 실패 목록 (있는 경우)
    if (this.result.failed.length > 0) {
      const failedListEl = completedEl.createDiv({
        cls: "mb-4 p-3 border border-obs-bg-modifier-error rounded bg-obs-bg-secondary",
      });

      failedListEl.createDiv({
        cls: "text-sm font-medium text-obs-text-error mb-2",
        text: t("modal.revert.failedFiles"),
      });

      this.result.failed.forEach((failed) => {
        const itemEl = failedListEl.createDiv({
          cls: "flex items-start gap-2 text-sm py-1",
        });
        itemEl.createDiv({ attr: { "aria-hidden": "true" } });
        setIcon(itemEl.firstElementChild as HTMLElement, "x");
        itemEl.createDiv({
          cls: "flex-1",
          text: failed.path,
        });
        if (failed.error) {
          itemEl.createDiv({
            cls: "text-xs text-obs-text-error",
            text: `(${failed.error})`,
          });
        }
      });
    }

    // 버튼 영역
    const buttonSetting = new Setting(completedEl).setClass("qp-footer-buttons");

    // 닫기 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.close")).onClick(() => {
        this.onSuccess?.();
        this.close();
      })
    );
  }

  /**
   * 에러 화면 렌더링
   */
  private renderError(container: HTMLElement): void {
    const errorEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12",
    });

    // 에러 아이콘
    const errorIcon = errorEl.createDiv({
      cls: "text-obs-text-error mb-4",
      attr: { "aria-hidden": "true" },
    });
    setIcon(errorIcon, "x-circle");

    // 에러 메시지
    errorEl.createDiv({
      cls: "text-lg font-medium text-obs-text-error mb-2",
      text: t("modal.revert.error"),
    });

    errorEl.createDiv({
      cls: "text-sm text-obs-text-muted mb-4",
      text: this.errorMessage ?? t("error.commitHistory.revertFailed"),
    });

    // 닫기 버튼
    const buttonSetting = new Setting(errorEl).setClass("qp-footer-buttons");

    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.close")).onClick(() => this.close())
    );
  }

  /**
   * 되돌리기 시작
   */
  private async startRevert(): Promise<void> {
    this.state = "reverting";
    this.progress = { current: 0, total: this.files.length };
    this.render();

    try {
      const progressCallback: RevertProgressCallback = (current, total) => {
        this.progress = { current, total };
        this.render();
      };

      this.result = await this.gitHubService.revertMultipleFilesToCommit(
        this.files,
        this.commitSha,
        progressCallback
      );

      if (this.result.allSucceeded || this.result.succeeded.length > 0) {
        this.state = "completed";

        // Notice 표시
        if (this.result.allSucceeded) {
          new Notice(t("modal.revert.noticeSuccess", { count: this.result.succeeded.length }));
        } else {
          new Notice(
            t("modal.revert.noticePartial", {
              succeeded: this.result.succeeded.length,
              failed: this.result.failed.length,
            })
          );
        }
      } else {
        this.state = "error";
        this.errorMessage = t("error.commitHistory.allRevertFailed");
        new Notice(t("error.commitHistory.revertFailed"));
      }

      this.render();
    } catch (error) {
      this.state = "error";
      this.errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.render();
      new Notice(t("error.commitHistory.revertFailed"));
    }
  }
}
