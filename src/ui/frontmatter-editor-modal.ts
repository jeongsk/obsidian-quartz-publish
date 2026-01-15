/**
 * Frontmatter Editor Modal
 *
 * 발행 전 frontmatter를 편집할 수 있는 모달입니다.
 */

import { App, Modal, Setting, TFile } from 'obsidian';
import type {
	QuartzFrontmatter,
	FrontmatterValidationResult,
	FrontmatterValidationSettings,
	ValidationIssue,
} from '../types';
import { DEFAULT_VALIDATION_SETTINGS } from '../types';
import { ContentTransformer } from '../services/transformer';
import { t } from '../i18n';

/**
 * Frontmatter 편집 모달 옵션
 */
export interface FrontmatterEditorModalOptions {
	/** 대상 파일 */
	file: TFile;
	/** 현재 frontmatter */
	frontmatter: QuartzFrontmatter;
	/** 검증 설정 */
	validationSettings?: FrontmatterValidationSettings;
	/** 콘텐츠 변환기 (검증용) */
	transformer: ContentTransformer;
}

/**
 * Frontmatter 편집 결과
 */
export interface FrontmatterEditorResult {
	/** 저장 여부 */
	saved: boolean;
	/** 수정된 frontmatter */
	frontmatter: QuartzFrontmatter;
}

/**
 * Frontmatter 편집 모달 클래스
 */
export class FrontmatterEditorModal extends Modal {
	private options: FrontmatterEditorModalOptions;
	private editedFrontmatter: QuartzFrontmatter;
	private resolvePromise: ((value: FrontmatterEditorResult) => void) | null = null;
	private validationContainer: HTMLElement | null = null;

	constructor(app: App, options: FrontmatterEditorModalOptions) {
		super(app);
		this.options = options;
		this.editedFrontmatter = { ...options.frontmatter };
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		modalEl.addClass('quartz-publish-frontmatter-editor-modal');

		// 헤더
		this.renderHeader();

		// 검증 결과 영역
		this.validationContainer = contentEl.createDiv({
			cls: 'qp:mb-4',
			attr: {
				role: 'status',
				'aria-live': 'polite',
				'aria-label': t('modal.frontmatter.validationStatus'),
			},
		});
		this.updateValidation();

		// 편집 폼
		this.renderForm();

		// 액션 버튼
		this.renderActions();
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.resolvePromise?.({
			saved: false,
			frontmatter: this.options.frontmatter,
		});
	}

	/**
	 * 모달을 열고 사용자의 편집 결과를 기다립니다.
	 */
	waitForResult(): Promise<FrontmatterEditorResult> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}

	/**
	 * 헤더 렌더링
	 */
	private renderHeader(): void {
		const { contentEl } = this;

		const headerEl = contentEl.createDiv({
			cls: 'qp:flex qp:items-center qp:gap-3 qp:mb-4 qp:pb-3 qp:border-b qp:border-obs-bg-modifier-border',
		});

		// 아이콘
		const iconEl = headerEl.createDiv({
			cls: 'qp:flex-shrink-0 qp:w-10 qp:h-10 qp:rounded-full qp:bg-obs-bg-modifier-hover qp:flex qp:items-center qp:justify-center',
		});
		iconEl.createSpan({
			text: '📝',
			cls: 'qp:text-xl',
		});

		// 제목
		const titleContainer = headerEl.createDiv({ cls: 'qp:flex-1' });
		titleContainer.createEl('h3', {
			text: t('modal.frontmatter.title'),
			cls: 'qp:m-0 qp:text-lg qp:font-semibold',
		});
		titleContainer.createDiv({
			text: this.options.file.path,
			cls: 'qp:text-sm qp:text-obs-text-muted qp:mt-1',
		});
	}

	/**
	 * 편집 폼 렌더링
	 */
	private renderForm(): void {
		const { contentEl } = this;

		const formEl = contentEl.createDiv({
			cls: 'qp:space-y-2',
		});

		// Title
		new Setting(formEl)
			.setName('Title')
			.setDesc(t('modal.frontmatter.titleDesc'))
			.addText((text) => {
				text
					.setPlaceholder(this.options.file.basename)
					.setValue(this.editedFrontmatter.title || '')
					.onChange((value) => {
						this.editedFrontmatter.title = value || undefined;
						this.updateValidation();
					});
				text.inputEl.style.width = '100%';
			});

		// Description
		new Setting(formEl)
			.setName('Description')
			.setDesc(t('modal.frontmatter.descriptionDesc'))
			.addTextArea((textarea) => {
				textarea
					.setPlaceholder(t('modal.frontmatter.descriptionPlaceholder'))
					.setValue(this.editedFrontmatter.description || '')
					.onChange((value) => {
						this.editedFrontmatter.description = value || undefined;
						this.updateValidation();
					});
				textarea.inputEl.style.width = '100%';
				textarea.inputEl.style.minHeight = '60px';
			});

		// Tags
		new Setting(formEl)
			.setName('Tags')
			.setDesc(t('modal.frontmatter.tagsDesc'))
			.addText((text) => {
				const currentTags = this.editedFrontmatter.tags;
				const tagsString = Array.isArray(currentTags) ? currentTags.join(', ') : '';
				text
					.setPlaceholder('tag1, tag2, tag3')
					.setValue(tagsString)
					.onChange((value) => {
						if (value.trim()) {
							this.editedFrontmatter.tags = value
								.split(',')
								.map((t) => t.trim())
								.filter((t) => t.length > 0);
						} else {
							this.editedFrontmatter.tags = undefined;
						}
						this.updateValidation();
					});
				text.inputEl.style.width = '100%';
			});

		// Draft
		new Setting(formEl)
			.setName('Draft')
			.setDesc(t('modal.frontmatter.draftDesc'))
			.addToggle((toggle) => {
				toggle.setValue(this.editedFrontmatter.draft === true).onChange((value) => {
					this.editedFrontmatter.draft = value || undefined;
					this.updateValidation();
				});
			});

		// Permalink
		new Setting(formEl)
			.setName('Permalink')
			.setDesc(t('modal.frontmatter.permalinkDesc'))
			.addText((text) => {
				text
					.setPlaceholder('/custom-url')
					.setValue(this.editedFrontmatter.permalink || '')
					.onChange((value) => {
						this.editedFrontmatter.permalink = value || undefined;
					});
				text.inputEl.style.width = '100%';
			});

		// Enable TOC
		new Setting(formEl)
			.setName('Enable TOC')
			.setDesc(t('modal.frontmatter.tocDesc'))
			.addToggle((toggle) => {
				toggle
					.setValue(this.editedFrontmatter.enableToc !== false)
					.onChange((value) => {
						this.editedFrontmatter.enableToc = value;
					});
			});

		// CSS Classes
		new Setting(formEl)
			.setName('CSS Classes')
			.setDesc(t('modal.frontmatter.cssDesc'))
			.addText((text) => {
				const currentClasses = this.editedFrontmatter.cssclasses;
				const classesString = Array.isArray(currentClasses) ? currentClasses.join(', ') : '';
				text
					.setPlaceholder('class1, class2')
					.setValue(classesString)
					.onChange((value) => {
						if (value.trim()) {
							this.editedFrontmatter.cssclasses = value
								.split(',')
								.map((c) => c.trim())
								.filter((c) => c.length > 0);
						} else {
							this.editedFrontmatter.cssclasses = undefined;
						}
					});
				text.inputEl.style.width = '100%';
			});
	}

	/**
	 * 검증 결과 업데이트
	 */
	private updateValidation(): void {
		if (!this.validationContainer) return;

		this.validationContainer.empty();

		const settings = this.options.validationSettings ?? DEFAULT_VALIDATION_SETTINGS;
		const result = this.options.transformer.validateFrontmatter(
			this.editedFrontmatter,
			settings
		);

		if (result.issues.length === 0) {
			const successEl = this.validationContainer.createDiv({
				cls: 'qp:flex qp:items-center qp:gap-2 qp:p-3 qp:rounded-md qp:bg-obs-bg-modifier-success qp:bg-opacity-20',
			});
			successEl.createSpan({ text: '✓', cls: 'qp:text-obs-text-success' });
			successEl.createSpan({
				text: t('modal.frontmatter.validationSuccess'),
				cls: 'qp:text-sm',
			});
			return;
		}

		const issuesEl = this.validationContainer.createDiv({
			cls: 'qp:space-y-2',
		});

		for (const issue of result.issues) {
			this.renderIssue(issuesEl, issue);
		}
	}

	/**
	 * 검증 이슈 렌더링
	 */
	private renderIssue(container: HTMLElement, issue: ValidationIssue): void {
		const severityColors: Record<string, string> = {
			error: 'qp:bg-obs-bg-modifier-error qp:bg-opacity-20 qp:border-obs-text-error',
			warning: 'qp:bg-obs-bg-modifier-warning qp:bg-opacity-20 qp:border-obs-text-warning',
			info: 'qp:bg-obs-bg-modifier-hover qp:border-obs-bg-modifier-border',
		};

		const severityIcons: Record<string, string> = {
			error: '❌',
			warning: '⚠️',
			info: 'ℹ️',
		};

		const issueEl = container.createDiv({
			cls: `qp:p-3 qp:rounded-md qp:border ${severityColors[issue.severity]}`,
		});

		const headerEl = issueEl.createDiv({
			cls: 'qp:flex qp:items-center qp:gap-2',
		});

		headerEl.createSpan({ text: severityIcons[issue.severity] });
		headerEl.createSpan({
			text: issue.field,
			cls: 'qp:font-medium',
		});

		issueEl.createDiv({
			text: issue.message,
			cls: 'qp:text-sm qp:mt-1',
		});

		if (issue.suggestion) {
			issueEl.createDiv({
				text: `💡 ${issue.suggestion}`,
				cls: 'qp:text-sm qp:text-obs-text-muted qp:mt-1',
			});
		}
	}

	/**
	 * 액션 버튼 렌더링
	 */
	private renderActions(): void {
		const { contentEl } = this;

		const actionsEl = contentEl.createDiv({
			cls: 'qp:flex qp:justify-end qp:gap-2 qp:mt-4 qp:pt-3 qp:border-t qp:border-obs-bg-modifier-border',
		});

		// 취소 버튼
		const cancelBtn = actionsEl.createEl('button', {
			text: t('modal.confirm.cancel'),
		});
		cancelBtn.addEventListener('click', () => {
			this.resolvePromise?.({
				saved: false,
				frontmatter: this.options.frontmatter,
			});
			this.close();
		});

		// 저장 버튼
		const saveBtn = actionsEl.createEl('button', {
			text: t('modal.frontmatter.save'),
			cls: 'mod-cta',
		});
		saveBtn.addEventListener('click', () => {
			this.resolvePromise?.({
				saved: true,
				frontmatter: this.editedFrontmatter,
			});
			this.close();
		});
	}
}
