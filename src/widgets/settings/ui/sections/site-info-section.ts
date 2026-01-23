/**
 * Site Information Section Component
 *
 * 사이트 기본 정보 설정 UI 컴포넌트 (T027-T030)
 * - pageTitle: 사이트 제목
 * - baseUrl: 기본 URL
 * - locale: 로케일
 */

import { Setting } from "obsidian";
import { SUPPORTED_LOCALES } from "../../../../shared/config/constants/locales";
import { t } from "../../../../shared/lib/i18n";
import type { QuartzSiteConfig } from "../../../../app/types";
import {
  validatePageTitle,
  validateBaseUrl,
  validateLocale,
} from "../../../../shared/lib/validators";

/**
 * SiteInfoSection 변경 콜백
 */
export type SiteInfoChangeCallback = <K extends keyof QuartzSiteConfig>(
  field: K,
  value: QuartzSiteConfig[K]
) => void;

/**
 * SiteInfoSection 옵션
 */
export interface SiteInfoSectionOptions {
  /** 초기 설정값 */
  config: Pick<QuartzSiteConfig, "pageTitle" | "baseUrl" | "locale">;
  /** 변경 콜백 */
  onChange: SiteInfoChangeCallback;
}

/**
 * Site Information Section Component (T027)
 */
export class SiteInfoSection {
  private containerEl: HTMLElement;
  private options: SiteInfoSectionOptions;

  // 입력 컴포넌트 참조
  private pageTitleInput: HTMLInputElement | null = null;
  private baseUrlInput: HTMLInputElement | null = null;
  private localeDropdown: HTMLSelectElement | null = null;

  // 오류 표시 요소
  private pageTitleErrorEl: HTMLElement | null = null;
  private baseUrlErrorEl: HTMLElement | null = null;

  constructor(containerEl: HTMLElement, options: SiteInfoSectionOptions) {
    this.containerEl = containerEl;
    this.options = options;
    this.render();
  }

  /**
   * 섹션 렌더링
   */
  private render(): void {
    // 섹션 헤더 (T032)
    new Setting(this.containerEl).setName(t("siteInfo.heading")).setHeading();

    // Page Title 입력 (T028)
    this.renderPageTitleInput();

    // Base URL 입력 (T029)
    this.renderBaseUrlInput();

    // Locale 드롭다운 (T030)
    this.renderLocaleDropdown();
  }

  /**
   * Page Title 입력 필드 렌더링 (T028)
   */
  private renderPageTitleInput(): void {
    const setting = new Setting(this.containerEl)
      .setName(t("siteInfo.pageTitle.name"))
      .setDesc(t("siteInfo.pageTitle.desc"))
      .addText((text) => {
        this.pageTitleInput = text.inputEl;
        text
          .setPlaceholder("My Digital Garden")
          .setValue(this.options.config.pageTitle)
          .onChange((value) => {
            this.handlePageTitleChange(value);
          });
      });

    // 오류 메시지 표시 영역
    this.pageTitleErrorEl = setting.descEl.createDiv({
      cls: "text-obs-text-error text-xs mt-1",
      attr: {
        role: "alert",
        "aria-live": "polite",
      },
    });
  }

  /**
   * Page Title 변경 핸들러
   */
  private handlePageTitleChange(value: string): void {
    const result = validatePageTitle(value);

    if (this.pageTitleErrorEl) {
      if (!result.valid && result.error) {
        this.pageTitleErrorEl.textContent = result.error;
        this.pageTitleInput?.addClass("is-invalid");
      } else {
        this.pageTitleErrorEl.textContent = "";
        this.pageTitleInput?.removeClass("is-invalid");
      }
    }

    // 유효한 경우에만 콜백 호출
    if (result.valid) {
      const normalizedValue =
        typeof result.normalizedValue === "string" ? result.normalizedValue : value.trim();
      this.options.onChange("pageTitle", normalizedValue);
    }
  }

  /**
   * Base URL 입력 필드 렌더링 (T029)
   */
  private renderBaseUrlInput(): void {
    const setting = new Setting(this.containerEl)
      .setName(t("siteInfo.baseUrl.name"))
      .setDesc(t("siteInfo.baseUrl.desc"))
      .addText((text) => {
        this.baseUrlInput = text.inputEl;
        text
          .setPlaceholder("quartz.jzhao.xyz")
          .setValue(this.options.config.baseUrl)
          .onChange((value) => {
            this.handleBaseUrlChange(value);
          });
      });

    // 오류 메시지 표시 영역
    this.baseUrlErrorEl = setting.descEl.createDiv({
      cls: "text-obs-text-error text-xs mt-1",
      attr: {
        role: "alert",
        "aria-live": "polite",
      },
    });
  }

  /**
   * Base URL 변경 핸들러
   */
  private handleBaseUrlChange(value: string): void {
    const result = validateBaseUrl(value);

    if (this.baseUrlErrorEl) {
      if (!result.valid && result.error) {
        this.baseUrlErrorEl.textContent = result.error;
        this.baseUrlInput?.addClass("is-invalid");
      } else {
        this.baseUrlErrorEl.textContent = "";
        this.baseUrlInput?.removeClass("is-invalid");
      }
    }

    // 유효한 경우에만 콜백 호출 (정규화된 값 사용)
    if (result.valid) {
      const normalizedValue =
        typeof result.normalizedValue === "string" ? result.normalizedValue : value.trim();
      this.options.onChange("baseUrl", normalizedValue);
    }
  }

  /**
   * Locale 드롭다운 렌더링 (T030)
   */
  private renderLocaleDropdown(): void {
    new Setting(this.containerEl)
      .setName(t("siteInfo.locale.name"))
      .setDesc(t("siteInfo.locale.desc"))
      .addDropdown((dropdown) => {
        this.localeDropdown = dropdown.selectEl;

        // 옵션 추가
        for (const locale of SUPPORTED_LOCALES) {
          dropdown.addOption(locale.code, `${locale.name} (${locale.code})`);
        }

        // 현재 값 설정
        dropdown.setValue(this.options.config.locale);

        // 변경 핸들러
        dropdown.onChange((value) => {
          this.handleLocaleChange(value);
        });
      });
  }

  /**
   * Locale 변경 핸들러
   */
  private handleLocaleChange(value: string): void {
    const result = validateLocale(value);

    if (result.valid) {
      this.options.onChange("locale", value);
    }
  }

  /**
   * 외부에서 값 업데이트
   */
  updateValues(config: Pick<QuartzSiteConfig, "pageTitle" | "baseUrl" | "locale">): void {
    if (this.pageTitleInput) {
      this.pageTitleInput.value = config.pageTitle;
    }
    if (this.baseUrlInput) {
      this.baseUrlInput.value = config.baseUrl;
    }
    if (this.localeDropdown) {
      this.localeDropdown.value = config.locale;
    }

    // 오류 메시지 초기화
    if (this.pageTitleErrorEl) {
      this.pageTitleErrorEl.textContent = "";
    }
    if (this.baseUrlErrorEl) {
      this.baseUrlErrorEl.textContent = "";
    }
  }

  /**
   * 유효성 검사 실행
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const pageTitleResult = validatePageTitle(this.pageTitleInput?.value ?? "");
    if (!pageTitleResult.valid && pageTitleResult.error) {
      errors.push(`Page Title: ${pageTitleResult.error}`);
    }

    const baseUrlResult = validateBaseUrl(this.baseUrlInput?.value ?? "");
    if (!baseUrlResult.valid && baseUrlResult.error) {
      errors.push(`Base URL: ${baseUrlResult.error}`);
    }

    const localeResult = validateLocale(this.localeDropdown?.value ?? "");
    if (!localeResult.valid && localeResult.error) {
      errors.push(`Locale: ${localeResult.error}`);
    }

    return { valid: errors.length === 0, errors };
  }
}
