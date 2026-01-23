/**
 * Confirm Modal Component
 *
 * 확인 대화상자 모달 (T036-T037)
 */

import { App, Modal, Setting } from "obsidian";
import { t } from "../lib/i18n";

/**
 * ConfirmModal 옵션
 */
export interface ConfirmModalOptions {
  /** 제목 */
  title: string;
  /** 설명 메시지 */
  message: string;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 확인 버튼 CTA 스타일 여부 */
  confirmCta?: boolean;
  /** 위험 작업 여부 (버튼 색상 변경) */
  isDangerous?: boolean;
}

/**
 * Confirm Modal Component (T036)
 */
export class ConfirmModal extends Modal {
  private options: ConfirmModalOptions;
  private resolvePromise: ((value: boolean) => void) | null = null;

  constructor(app: App, options: ConfirmModalOptions) {
    super(app);
    this.options = {
      confirmText: t("modal.confirm.ok"),
      cancelText: t("modal.confirm.cancel"),
      confirmCta: true,
      isDangerous: false,
      ...options,
    };
  }

  /**
   * 모달 열기 (Promise 반환) (T037)
   */
  openAsync(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  /**
   * 모달 내용 표시
   */
  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    this.setTitle(this.options.title);

    // 메시지
    contentEl.createEl("p", {
      text: this.options.message,
      cls: "quartz-publish-confirm-modal-message mb-4",
    });

    // 버튼 영역
    const buttonSetting = new Setting(contentEl).setClass("quartz-publish-confirm-modal-buttons");

    // 취소 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(this.options.cancelText ?? t("modal.confirm.cancel")).onClick(() => {
        this.resolvePromise?.(false);
        this.resolvePromise = null;
        this.close();
      })
    );

    // 확인 버튼
    buttonSetting.addButton((button) => {
      button.setButtonText(this.options.confirmText ?? t("modal.confirm.ok")).onClick(() => {
        this.resolvePromise?.(true);
        this.resolvePromise = null;
        this.close();
      });

      // 위험 작업이면 Warning 스타일, 아니면 CTA 스타일
      if (this.options.isDangerous) {
        button.setWarning();
      } else if (this.options.confirmCta) {
        button.setCta();
      }
    });
  }

  /**
   * 모달 닫힘 처리
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();

    // 모달이 ESC 키 등으로 닫힌 경우 false 반환
    if (this.resolvePromise) {
      this.resolvePromise(false);
      this.resolvePromise = null;
    }
  }
}
