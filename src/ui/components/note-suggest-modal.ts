/**
 * Note Suggest Modal
 *
 * Vault의 마크다운 파일을 검색/선택하는 모달
 */

import { App, FuzzySuggestModal, TFile } from "obsidian";
import { t } from "../../i18n";

export class NoteSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (path: string) => void;

  constructor(app: App, onChoose: (path: string) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("modal.notePicker.placeholder"));
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile): void {
    this.onChoose(item.path);
  }
}
