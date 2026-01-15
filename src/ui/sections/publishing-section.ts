/**
 * Publishing Section Component
 *
 * 발행 관련 설정 UI 컴포넌트 (T058-T063)
 * - explicitPublish: 명시적 발행 필터
 * - ignorePatterns: 제외 패턴
 */

import { Setting } from 'obsidian';
import { t } from '../../i18n';
import type { QuartzSiteConfig } from '../../types';
import { validateGlobPattern } from '../../utils/glob-validator';

/**
 * PublishingSection 변경 콜백
 */
export type PublishingChangeCallback = <K extends keyof QuartzSiteConfig>(
	field: K,
	value: QuartzSiteConfig[K]
) => void;

/**
 * PublishingSection 옵션
 */
export interface PublishingSectionOptions {
	/** 초기 설정값 */
	config: Pick<QuartzSiteConfig, 'explicitPublish' | 'ignorePatterns'>;
	/** 변경 콜백 */
	onChange: PublishingChangeCallback;
}

/**
 * Publishing Section Component (T058)
 */
export class PublishingSection {
	private containerEl: HTMLElement;
	private options: PublishingSectionOptions;

	// 현재 상태
	private patterns: string[];

	// 컴포넌트 참조
	private explicitPublishToggleEl: HTMLInputElement | null = null;
	private patternsContainerEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement, options: PublishingSectionOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.patterns = [...options.config.ignorePatterns];
		this.render();
	}

	/**
	 * 섹션 렌더링
	 */
	private render(): void {
		// 섹션 헤더 (T063)
		new Setting(this.containerEl).setName(t('publishing.heading')).setHeading();

		// ExplicitPublish 토글 (T059)
		this.renderExplicitPublishToggle();

		// Ignore Patterns (T060)
		this.renderIgnorePatternsInput();
	}

	/**
	 * ExplicitPublish 토글 렌더링 (T059)
	 */
	private renderExplicitPublishToggle(): void {
		new Setting(this.containerEl)
			.setName(t('publishing.explicitPublish.name'))
			.setDesc(t('publishing.explicitPublish.desc'))
			.addToggle((toggle) => {
				this.explicitPublishToggleEl = toggle.toggleEl.querySelector('input');
				toggle
					.setValue(this.options.config.explicitPublish)
					.onChange((value) => {
						this.options.onChange('explicitPublish', value);
					});
			});
	}

	/**
	 * Ignore Patterns 입력 렌더링 (T060)
	 */
	private renderIgnorePatternsInput(): void {
		new Setting(this.containerEl)
			.setName(t('publishing.ignorePatterns.name'))
			.setDesc(t('publishing.ignorePatterns.desc'));

		this.patternsContainerEl = this.containerEl.createDiv({
			cls: 'quartz-publish-patterns-list qp:mb-2',
		});

		this.renderPatternsList();
	}

	/**
	 * 패턴 목록 렌더링
	 */
	private renderPatternsList(): void {
		if (!this.patternsContainerEl) return;

		this.patternsContainerEl.empty();

		if (this.patterns.length > 0) {
			for (let i = 0; i < this.patterns.length; i++) {
				const pattern = this.patterns[i];
				const patternEl = this.patternsContainerEl.createDiv({
					cls: 'quartz-publish-pattern-item qp:flex qp:items-center qp:gap-2 qp:mb-1',
				});

				patternEl.createEl('code', {
					text: pattern,
					cls: 'qp:flex-1',
				});

				const removeBtn = patternEl.createEl('button', {
					cls: 'qp:text-obs-text-error qp:bg-transparent qp:border-none qp:p-1 qp:cursor-pointer hover:qp:bg-obs-bg-modifier-hover qp:rounded',
					attr: { 'aria-label': t('publishing.ignorePatterns.remove') },
				});
				removeBtn.textContent = '×';

				const index = i;
				removeBtn.onclick = () => {
					this.patterns.splice(index, 1);
					this.renderPatternsList();
					this.options.onChange('ignorePatterns', [...this.patterns]);
				};
			}
		}

		const addRowEl = this.patternsContainerEl.createDiv({
			cls: 'quartz-publish-pattern-item qp:flex qp:items-center qp:gap-2 qp:mb-1',
		});

		const inputEl = addRowEl.createEl('input', {
			type: 'text',
			placeholder: t('publishing.ignorePatterns.placeholder'),
			cls: 'qp:flex-1 qp:bg-obs-bg-secondary qp:border-transparent focus:qp:border-obs-interactive-accent qp:text-obs-text-normal qp:placeholder-obs-text-muted qp:rounded qp:px-2 qp:py-1',
			attr: {
				'aria-label': t('publishing.ignorePatterns.name'),
				'aria-describedby': 'pattern-error',
			},
		});

		const addBtn = addRowEl.createEl('button', {
			cls: 'qp:text-obs-text-success qp:bg-transparent qp:border-none qp:p-1 qp:cursor-pointer hover:qp:bg-obs-bg-modifier-hover qp:rounded',
			attr: {
				'aria-label': t('publishing.ignorePatterns.add'),
			},
		});
		addBtn.textContent = '+';

		const errorEl = this.patternsContainerEl.createDiv({
			cls: 'qp:text-obs-text-error qp:text-sm qp:mt-1 qp:mb-2 qp:min-h-[20px]',
			attr: {
				id: 'pattern-error',
				role: 'alert',
				'aria-live': 'polite',
			},
		});

		const handleAdd = () => {
			const newPattern = inputEl.value.trim();
			if (!newPattern) return;

			const validation = validateGlobPattern(newPattern);
			if (!validation.valid) {
				errorEl.textContent = validation.error || t('publishing.ignorePatterns.invalid');
				return;
			}

			if (this.patterns.includes(newPattern)) {
				errorEl.textContent = t('publishing.ignorePatterns.duplicate');
				return;
			}

			errorEl.textContent = '';
			this.patterns.push(newPattern);
			this.options.onChange('ignorePatterns', [...this.patterns]);
			this.renderPatternsList();
			
			setTimeout(() => {
				const newInput = this.patternsContainerEl?.querySelector('input');
				newInput?.focus();
			}, 0);
		};

		addBtn.onclick = handleAdd;

		inputEl.onkeydown = (e) => {
			if (e.key === 'Enter') {
				handleAdd();
			} else {
				if (errorEl.textContent) errorEl.textContent = '';
			}
		};
	}

	/**
	 * 외부에서 값 업데이트
	 */
	updateValues(
		config: Pick<QuartzSiteConfig, 'explicitPublish' | 'ignorePatterns'>
	): void {
		if (this.explicitPublishToggleEl) {
			this.explicitPublishToggleEl.checked = config.explicitPublish;
		}

		this.patterns = [...config.ignorePatterns];
		this.renderPatternsList();
	}
}
