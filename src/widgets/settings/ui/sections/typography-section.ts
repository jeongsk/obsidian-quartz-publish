/**
 * Typography Section Component
 *
 * 폰트 설정 섹션 UI (Phase 10)
 */

import { App, Setting } from "obsidian";
import type { TypographyConfig } from "../../../../app/types";
import { GoogleFontsService } from "../../../../shared/lib/google-fonts";
import { FontPickerModal } from "../../../../shared/ui/font-picker-modal";
import { t } from "../../../../shared/lib/i18n";

/**
 * TypographySection 변경 콜백
 */
export type TypographyChangeCallback = <K extends keyof TypographyConfig>(
  field: K,
  value: TypographyConfig[K]
) => void;

/**
 * TypographySection 옵션
 */
export interface TypographySectionOptions {
  app: App;
  config: TypographyConfig;
  onChange: TypographyChangeCallback;
}

/**
 * Typography Section Component
 */
export class TypographySection {
  private containerEl: HTMLElement;
  private options: TypographySectionOptions;
  private fontService: GoogleFontsService;

  // UI 컴포넌트 참조 저장 (값 업데이트용)
  private headerInput: HTMLInputElement | null = null;
  private bodyInput: HTMLInputElement | null = null;
  private codeInput: HTMLInputElement | null = null;

  constructor(containerEl: HTMLElement, options: TypographySectionOptions) {
    this.containerEl = containerEl;
    this.options = options;
    this.fontService = new GoogleFontsService();
    this.render();
  }

  private render(): void {
    new Setting(this.containerEl).setName(t("settings.typography.title")).setHeading();

    this.renderFontSetting(
      t("settings.typography.header"),
      "header",
      t("settings.typography.headerDesc"),
      (input) => (this.headerInput = input)
    );

    this.renderFontSetting(
      t("settings.typography.body"),
      "body",
      t("settings.typography.bodyDesc"),
      (input) => (this.bodyInput = input)
    );

    this.renderFontSetting(
      t("settings.typography.code"),
      "code",
      t("settings.typography.codeDesc"),
      (input) => (this.codeInput = input)
    );
  }

  private renderFontSetting(
    name: string,
    field: keyof TypographyConfig,
    desc: string,
    refSetter: (input: HTMLInputElement) => void
  ): void {
    const currentFont = this.options.config[field];

    // 설정 UI에서도 폰트 미리보기를 위해 로드
    this.fontService.loadFont(currentFont);

    const setting = new Setting(this.containerEl)
      .setName(name)
      .setDesc(desc)
      .addText((text) => {
        text.setValue(currentFont).setDisabled(true); // 직접 입력 방지
        refSetter(text.inputEl);
        this.applyFontStyle(text.inputEl, currentFont);
      })
      .addButton((button) =>
        button.setButtonText(t("settings.typography.change")).onClick(() => {
          new FontPickerModal(
            this.options.app,
            this.fontService,
            this.options.config[field], // 현재 설정된 값 전달
            (newFont) => {
              this.options.onChange(field, newFont);
              // UI 업데이트는 updateValues를 통해 처리됨 (부모가 호출)
              // 하지만 사용자 경험을 위해 즉시 반영
              if (field === "header" && this.headerInput) {
                this.headerInput.value = newFont;
                this.applyFontStyle(this.headerInput, newFont);
              } else if (field === "body" && this.bodyInput) {
                this.bodyInput.value = newFont;
                this.applyFontStyle(this.bodyInput, newFont);
              } else if (field === "code" && this.codeInput) {
                this.codeInput.value = newFont;
                this.applyFontStyle(this.codeInput, newFont);
              }
            }
          ).open();
        })
      );

    // 폰트 미리보기 스타일 적용 (Setting 생성 후)
    const inputEl = setting.controlEl.querySelector("input");
    if (inputEl) {
      this.applyFontStyle(inputEl as HTMLElement, currentFont);
    }
  }

  private applyFontStyle(el: HTMLElement, font: string): void {
    el.style.fontFamily = `"${font}", sans-serif`;
    // 폰트가 로드되지 않았을 수 있으므로 다시 한번 로드 시도
    this.fontService.loadFont(font);
  }

  /**
   * 외부에서 값 업데이트 (Discard Changes 등)
   */
  updateValues(config: TypographyConfig): void {
    this.options.config = config; // 내부 config 업데이트

    if (this.headerInput) {
      this.headerInput.value = config.header;
      this.applyFontStyle(this.headerInput, config.header);
    }
    if (this.bodyInput) {
      this.bodyInput.value = config.body;
      this.applyFontStyle(this.bodyInput, config.body);
    }
    if (this.codeInput) {
      this.codeInput.value = config.code;
      this.applyFontStyle(this.codeInput, config.code);
    }
  }
}
