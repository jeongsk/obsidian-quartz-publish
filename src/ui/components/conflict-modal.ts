/**
 * Conflict Modal Component
 *
 * SHA 불일치(충돌) 해결 모달 (T038-T039)
 */

import { App, Modal, Setting } from 'obsidian';
import { setIcon } from 'obsidian';
import type { ConflictResolution } from '../../types';
import { t } from '../../i18n';

/**
 * ConflictModal 옵션
 */
export interface ConflictModalOptions {
	/** 추가 설명 메시지 */
	message?: string;
}

/**
 * Conflict Modal Component (T038)
 */
export class ConflictModal extends Modal {
	private options: ConflictModalOptions;
	private resolvePromise: ((value: ConflictResolution) => void) | null = null;

	constructor(app: App, options: ConflictModalOptions = {}) {
		super(app);
		this.options = options;
	}

	/**
	 * 모달 열기 (Promise 반환) (T039)
	 */
	openAsync(): Promise<ConflictResolution> {
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
		contentEl.addClass('quartz-publish-conflict-modal');

		// 경고 아이콘 + 제목
		const headerEl = contentEl.createDiv({
			cls: 'quartz-publish-conflict-modal-header qp:flex qp:items-center qp:gap-2 qp:mb-4',
		});

		const iconEl = headerEl.createSpan({
			cls: 'qp:text-obs-text-warning',
			attr: { 'aria-hidden': 'true' },
		});
		setIcon(iconEl, 'alert-triangle');

		headerEl.createEl('h2', {
			text: t('modal.conflict.title'),
			cls: 'qp:m-0',
		});

		// 설명 메시지
		contentEl.createEl('p', {
			text: this.options.message || t('modal.conflict.message'),
			cls: 'quartz-publish-conflict-modal-message qp:mb-4 qp:text-obs-text-muted',
		});

		// 옵션 설명
		const optionsEl = contentEl.createDiv({
			cls: 'quartz-publish-conflict-modal-options qp:mb-4',
		});

		// 옵션 1: 새로고침
		const reloadOption = optionsEl.createDiv({
			cls: 'quartz-publish-conflict-option qp:p-3 qp:rounded qp:mb-2 qp:bg-obs-bg-secondary',
		});
		reloadOption.createEl('strong', { text: t('modal.conflict.reload.title') });
		reloadOption.createEl('p', {
			text: t('modal.conflict.reload.desc'),
			cls: 'qp:text-sm qp:text-obs-text-muted qp:m-0 qp:mt-1',
		});

		// 옵션 2: 강제 덮어쓰기
		const forceOption = optionsEl.createDiv({
			cls: 'quartz-publish-conflict-option qp:p-3 qp:rounded qp:mb-2 qp:bg-obs-bg-secondary',
		});
		forceOption.createEl('strong', { text: t('modal.conflict.overwrite.title') });
		forceOption.createEl('p', {
			text: t('modal.conflict.overwrite.desc'),
			cls: 'qp:text-sm qp:text-obs-text-muted qp:m-0 qp:mt-1',
		});

		// 옵션 3: 취소
		const cancelOption = optionsEl.createDiv({
			cls: 'quartz-publish-conflict-option qp:p-3 qp:rounded qp:bg-obs-bg-secondary',
		});
		cancelOption.createEl('strong', { text: t('modal.conflict.cancel.title') });
		cancelOption.createEl('p', {
			text: t('modal.conflict.cancel.desc'),
			cls: 'qp:text-sm qp:text-obs-text-muted qp:m-0 qp:mt-1',
		});

		// 버튼 영역
		const buttonSetting = new Setting(contentEl)
			.setClass('quartz-publish-conflict-modal-buttons');

		// 취소 버튼
		buttonSetting.addButton((button) =>
			button.setButtonText(t('modal.confirm.cancel')).onClick(() => {
				this.resolvePromise?.('cancel');
				this.resolvePromise = null;
				this.close();
			})
		);

		// 강제 덮어쓰기 버튼
		buttonSetting.addButton((button) =>
			button
				.setButtonText(t('modal.conflict.overwrite'))
				.setWarning()
				.onClick(() => {
					this.resolvePromise?.('force_overwrite');
					this.resolvePromise = null;
					this.close();
				})
		);

		// 새로고침 버튼 (권장)
		buttonSetting.addButton((button) =>
			button
				.setButtonText(t('modal.conflict.reload'))
				.setCta()
				.onClick(() => {
					this.resolvePromise?.('reload');
					this.resolvePromise = null;
					this.close();
				})
		);
	}

	/**
	 * 모달 닫힘 처리
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		// 모달이 ESC 키 등으로 닫힌 경우 cancel 반환
		if (this.resolvePromise) {
			this.resolvePromise('cancel');
			this.resolvePromise = null;
		}
	}
}
