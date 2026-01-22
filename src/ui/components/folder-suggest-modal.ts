/**
 * Folder Suggest Modal
 *
 * Vault의 폴더를 검색/선택하는 모달
 */

import { App, FuzzySuggestModal, TFolder } from "obsidian";
import { t } from "../../i18n";

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
  private onChoose: (path: string) => void;

  constructor(app: App, onChoose: (path: string) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder(t("modal.folderPicker.placeholder"));
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const rootFolder = this.app.vault.getRoot();

    const collectFolders = (folder: TFolder) => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof TFolder) {
          collectFolders(child);
        }
      }
    };

    collectFolders(rootFolder);
    return folders;
  }

  getItemText(item: TFolder): string {
    return item.path || "/";
  }

  onChooseItem(item: TFolder): void {
    this.onChoose(item.path);
  }
}
