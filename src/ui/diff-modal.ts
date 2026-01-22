/**
 * Diff Modal
 *
 * 로컬 파일과 원격 파일의 변경 사항을 비교하여 보여주는 모달입니다.
 */

import { App, Modal, Setting } from "obsidian";
import * as diff from "diff";
import { t } from "../i18n";

interface DiffModalOptions {
  originalContent: string;
  modifiedContent: string;
  fileName: string;
}

export class DiffModal extends Modal {
  private options: DiffModalOptions;

  constructor(app: App, options: DiffModalOptions) {
    super(app);
    this.options = options;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("quartz-publish-diff-modal");

    this.titleEl.setText(t("diff.title", { file: this.options.fileName }));

    // Diff 계산
    const diffResult = diff.diffLines(this.options.originalContent, this.options.modifiedContent);

    const container = contentEl.createDiv({
      cls: "quartz-publish-diff-container",
    });

    // Diff 렌더링
    diffResult.forEach((part) => {
      const color = part.added
        ? "diff-line-added"
        : part.removed
          ? "diff-line-removed"
          : "diff-line-common";

      // 줄 단위로 분리하여 렌더링
      const lines = part.value.split("\n");
      if (lines[lines.length - 1] === "") {
        lines.pop(); // 마지막 빈 줄 제거
      }

      lines.forEach((line) => {
        const lineEl = container.createDiv({
          cls: `diff-line ${color}`,
        });

        // 접두사 추가 (+/-)
        const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
        lineEl.createSpan({ text: prefix, cls: "diff-line-prefix" });
        lineEl.createSpan({ text: line, cls: "diff-line-content" });
      });
    });

    // 닫기 버튼
    new Setting(contentEl).addButton((btn) =>
      btn.setButtonText(t("common.close")).onClick(() => {
        this.close();
      })
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
