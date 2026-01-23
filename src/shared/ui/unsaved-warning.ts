/**
 * Unsaved Warning Banner Component
 *
 * 저장되지 않은 변경사항 경고 배너 (T035)
 */

import { setIcon } from "obsidian";
import { t } from "../lib/i18n";

/**
 * UnsavedWarning 옵션
 */
export interface UnsavedWarningOptions {
  /** 취소 버튼 클릭 핸들러 */
  onDiscard?: () => void;
}

/**
 * Unsaved Warning Banner Component (T035)
 */
export class UnsavedWarning {
  private containerEl: HTMLElement;
  private bannerEl: HTMLElement | null = null;
  private options: UnsavedWarningOptions;
  private visible = false;

  constructor(containerEl: HTMLElement, options: UnsavedWarningOptions = {}) {
    this.containerEl = containerEl;
    this.options = options;
    this.render();
  }

  /**
   * 배너 렌더링
   */
  private render(): void {
    this.bannerEl = this.containerEl.createDiv({
      cls: "quartz-publish-unsaved-warning hidden p-3 rounded mb-4 flex items-center justify-between bg-obs-bg-modifier-warning",
    });

    // 경고 아이콘 + 메시지
    const messageWrapper = this.bannerEl.createDiv({
      cls: "flex items-center gap-2",
    });

    const iconEl = messageWrapper.createSpan({
      cls: "quartz-publish-unsaved-warning-icon",
      attr: { "aria-hidden": "true" },
    });
    setIcon(iconEl, "alert-triangle");

    messageWrapper.createSpan({
      text: t("common.unsavedChanges"),
      cls: "text-sm font-medium",
    });

    // 버튼 영역
    const actionsWrapper = this.bannerEl.createDiv({
      cls: "flex items-center gap-2",
    });

    // 취소(변경사항 버리기) 버튼
    if (this.options.onDiscard) {
      const discardBtn = actionsWrapper.createEl("button", {
        text: t("common.discardChanges"),
        cls: "text-xs",
      });
      discardBtn.addEventListener("click", () => {
        this.options.onDiscard?.();
      });
    }
  }

  /**
   * 배너 표시
   */
  show(): void {
    if (this.bannerEl && !this.visible) {
      this.bannerEl.removeClass("hidden");
      this.visible = true;
    }
  }

  /**
   * 배너 숨김
   */
  hide(): void {
    if (this.bannerEl && this.visible) {
      this.bannerEl.addClass("hidden");
      this.visible = false;
    }
  }

  /**
   * 표시 상태 토글
   */
  toggle(show: boolean): void {
    if (show) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * 표시 여부 반환
   */
  isVisible(): boolean {
    return this.visible;
  }
}
