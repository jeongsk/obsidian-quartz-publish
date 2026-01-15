/**
 * Large File Warning Modal
 *
 * 대용량 파일 발행 전 사용자에게 경고를 표시하는 모달입니다.
 */

import { App, Modal } from 'obsidian';
import type { LargeFileInfo } from '../types';
import { FileValidatorService } from '../services/file-validator';
import { t } from '../i18n';

/**
 * 대용량 파일 경고 모달 옵션
 */
export interface LargeFileWarningModalOptions {
	/** 대용량 파일 목록 */
	largeFiles: LargeFileInfo[];
	/** 최대 허용 파일 크기 (바이트) */
	maxFileSize: number;
}

/**
 * 대용량 파일 경고 모달 클래스
 *
 * 발행하려는 파일 중 대용량 파일이 있을 때 사용자에게 경고를 표시합니다.
 */
export class LargeFileWarningModal extends Modal {
	private options: LargeFileWarningModalOptions;
	private resolvePromise: ((value: boolean) => void) | null = null;

	constructor(app: App, options: LargeFileWarningModalOptions) {
		super(app);
		this.options = options;
	}

	/**
	 * 모달이 열릴 때 호출됩니다.
	 */
	onOpen(): void {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		modalEl.addClass('quartz-publish-large-file-warning-modal');

		// 헤더
		this.renderHeader();

		// 파일 목록
		this.renderFileList();

		// 안내 메시지
		this.renderGuidance();

		// 액션 버튼
		this.renderActions();
	}

	/**
	 * 모달이 닫힐 때 호출됩니다.
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.resolvePromise?.(false);
	}

	/**
	 * 모달을 열고 사용자의 선택을 기다립니다.
	 *
	 * @returns 사용자가 계속을 선택하면 true, 취소하면 false
	 */
	waitForConfirmation(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}

	/**
	 * 헤더를 렌더링합니다.
	 */
	private renderHeader(): void {
		const { contentEl } = this;

		const headerEl = contentEl.createDiv({
			cls: 'qp:flex qp:items-center qp:gap-3 qp:mb-4',
		});

		// 경고 아이콘
		const iconEl = headerEl.createDiv({
			cls: 'qp:flex-shrink-0 qp:w-10 qp:h-10 qp:rounded-full qp:bg-obs-bg-modifier-warning qp:flex qp:items-center qp:justify-center',
			attr: { 'aria-hidden': 'true' },
		});
		iconEl.createSpan({
			text: '⚠️',
			cls: 'qp:text-xl',
		});

		// 제목
		const titleContainer = headerEl.createDiv({ cls: 'qp:flex-1' });
		const maxSizeFormatted = FileValidatorService.formatFileSize(this.options.maxFileSize);
		titleContainer.createEl('h3', {
			text: t('modal.largeFile.title'),
			cls: 'qp:m-0 qp:text-lg qp:font-semibold',
			attr: { id: 'large-file-warning-title' },
		});
		titleContainer.createDiv({
			text: t('modal.largeFile.message', { count: this.options.largeFiles.length, size: maxSizeFormatted }),
			cls: 'qp:text-sm qp:text-obs-text-muted qp:mt-1',
		});
	}

	/**
	 * 파일 목록을 렌더링합니다.
	 */
	private renderFileList(): void {
		const { contentEl } = this;

		const listContainer = contentEl.createDiv({
			cls: 'qp:max-h-48 qp:overflow-y-auto qp:border qp:border-obs-bg-modifier-border qp:rounded-md qp:mb-4',
			attr: {
				role: 'list',
				'aria-label': t('modal.largeFile.listLabel'),
			},
		});

		for (const fileInfo of this.options.largeFiles) {
			const itemEl = listContainer.createDiv({
				cls: 'qp:flex qp:items-center qp:justify-between qp:px-3 qp:py-2 qp:border-b qp:border-obs-bg-modifier-border last:qp:border-b-0',
				attr: { role: 'listitem' },
			});

			// 파일 정보
			const fileInfoEl = itemEl.createDiv({ cls: 'qp:flex-1 qp:min-w-0' });
			fileInfoEl.createDiv({
				text: fileInfo.file.basename || fileInfo.file.name,
				cls: 'qp:font-medium qp:truncate',
			});
			fileInfoEl.createDiv({
				text: fileInfo.file.path,
				cls: 'qp:text-xs qp:text-obs-text-muted qp:truncate',
			});

			// 파일 크기
			itemEl.createSpan({
				text: fileInfo.formattedSize,
				cls: 'qp:ml-3 qp:text-sm qp:font-medium qp:text-obs-text-warning qp:flex-shrink-0',
				attr: { 'aria-label': t('modal.largeFile.fileSize', { size: fileInfo.formattedSize }) },
			});
		}
	}

	/**
	 * 안내 메시지를 렌더링합니다.
	 */
	private renderGuidance(): void {
		const { contentEl } = this;
		const maxSizeFormatted = FileValidatorService.formatFileSize(this.options.maxFileSize);

		const guidanceEl = contentEl.createDiv({
			cls: 'qp:bg-obs-bg-modifier-warning qp:bg-opacity-20 qp:rounded-md qp:p-3 qp:mb-4',
			attr: { role: 'note' },
		});

		guidanceEl.createDiv({
			text: t('modal.largeFile.maxSize', { size: maxSizeFormatted }),
			cls: 'qp:font-medium qp:mb-2',
		});

		const listEl = guidanceEl.createEl('ul', {
			cls: 'qp:m-0 qp:pl-4 qp:text-sm qp:text-obs-text-muted',
		});

		listEl.createEl('li', { text: t('modal.largeFile.tip.uploadTime') });
		listEl.createEl('li', { text: t('modal.largeFile.tip.githubLimit') });
		listEl.createEl('li', { text: t('modal.largeFile.tip.imageCompression') });
	}

	/**
	 * 액션 버튼을 렌더링합니다.
	 */
	private renderActions(): void {
		const { contentEl } = this;

		const actionsEl = contentEl.createDiv({
			cls: 'qp:flex qp:justify-end qp:gap-2',
		});

		// 취소 버튼
		const cancelBtn = actionsEl.createEl('button', {
			text: t('modal.confirm.cancel'),
			attr: {
				'aria-label': t('modal.confirm.cancel'),
			},
		});
		cancelBtn.addEventListener('click', () => {
			this.resolvePromise?.(false);
			this.close();
		});

		// 계속 버튼
		const continueBtn = actionsEl.createEl('button', {
			text: t('modal.largeFile.continue'),
			cls: 'mod-warning',
			attr: {
				'aria-label': t('modal.largeFile.continue'),
			},
		});
		continueBtn.addEventListener('click', () => {
			this.resolvePromise?.(true);
			this.close();
		});
	}
}
