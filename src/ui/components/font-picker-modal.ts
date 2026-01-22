/**
 * Font Picker Modal
 *
 * 폰트 선택 및 미리보기 모달
 */

import { App, FuzzySuggestModal, type FuzzyMatch } from "obsidian";
import { GoogleFontsService, type GoogleFont } from "../../services/google-fonts";
import { t } from "../../i18n";

export class FontPickerModal extends FuzzySuggestModal<GoogleFont> {
  private service: GoogleFontsService;
  private onChoose: (font: string) => void;
  private currentFont: string;

  constructor(
    app: App,
    service: GoogleFontsService,
    currentFont: string,
    onChoose: (font: string) => void
  ) {
    super(app);
    this.service = service;
    this.currentFont = currentFont;
    this.onChoose = onChoose;

    this.setPlaceholder(t("modal.fontPicker.placeholder"));

    // 미리보기를 위해 모든 폰트 로드
    this.service.getFonts().forEach((font) => this.service.loadFont(font.family));
  }

  getItems(): GoogleFont[] {
    return this.service.getFonts();
  }

  getItemText(item: GoogleFont): string {
    return item.family;
  }

  renderSuggestion(match: FuzzyMatch<GoogleFont>, el: HTMLElement): void {
    super.renderSuggestion(match, el);

    // 폰트 스타일 적용

    el.style.fontFamily = `"${match.item.family}", sans-serif`;
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    el.style.fontSize = "1.1em";

    // 접근성: 스크린리더를 위한 aria 속성
    el.setAttribute("role", "option");

    // 현재 선택된 폰트 표시
    const isCurrentFont = match.item.family === this.currentFont;
    if (isCurrentFont) {
      el.addClass("selected");
      el.setAttribute("aria-selected", "true");
      const checkmark = el.createSpan({
        cls: "suggestion-flair",
        attr: {
          "aria-hidden": "true",
        },
      });
      checkmark.setText("✓");

      // 스크린리더용 숨김 텍스트
      el.createSpan({
        cls: "sr-only",
        text: t("modal.fontPicker.currentFont"),
      });
    }

    // 카테고리 표시
    const category = el.createDiv({
      cls: "suggestion-note",
      text: match.item.category,
      attr: {
        "aria-label": t("modal.fontPicker.category", { category: match.item.category }),
      },
    });
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    category.style.fontFamily = "var(--font-interface)";
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    category.style.fontSize = "0.8em";
  }

  onChooseItem(item: GoogleFont, evt: MouseEvent | KeyboardEvent): void {
    this.onChoose(item.family);
  }
}
