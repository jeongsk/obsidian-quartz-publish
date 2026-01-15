import { Setting } from 'obsidian';
import type { CommentsConfig, GiscusConfig, QuartzSiteConfig } from '../../types';
import { t } from '../../i18n';

export type CommentsChangeCallback = <K extends keyof QuartzSiteConfig>(
	field: K,
	value: QuartzSiteConfig[K]
) => void;

export interface CommentsSectionOptions {
	config: CommentsConfig;
	onChange: CommentsChangeCallback;
}

const COMMENTS_PROVIDERS = [
	{ value: 'null', label: 'None' },
	{ value: 'giscus', label: 'Giscus (GitHub Discussions)' },
] as const;

const MAPPING_OPTIONS = [
	{ value: 'url', label: 'URL' },
	{ value: 'title', label: 'Title' },
	{ value: 'og:title', label: 'og:title' },
	{ value: 'pathname', label: 'Pathname' },
	{ value: 'specific', label: 'Specific term' },
	{ value: 'number', label: 'Issue number' },
] as const;

const INPUT_POSITION_OPTIONS = [
	{ value: 'bottom', label: 'Bottom' },
	{ value: 'top', label: 'Top' },
] as const;

export class CommentsSection {
	private containerEl: HTMLElement;
	private options: CommentsSectionOptions;
	private currentConfig: CommentsConfig;
	private providerDropdown: HTMLSelectElement | null = null;
	private fieldsContainerEl: HTMLElement | null = null;
	private errorEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement, options: CommentsSectionOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.currentConfig = this.cloneConfig(options.config);
		this.render();
	}

	private cloneConfig(config: CommentsConfig): CommentsConfig {
		if (config.provider === 'null') {
			return { provider: 'null' };
		}
		return { provider: 'giscus', options: { ...config.options } };
	}

	private render(): void {
		new Setting(this.containerEl).setName(t('settings.comments.title')).setHeading();

		this.renderProviderDropdown();

		this.fieldsContainerEl = this.containerEl.createDiv({
			cls: 'quartz-publish-comments-fields',
		});

		this.errorEl = this.containerEl.createDiv({
			cls: 'qp:text-obs-text-error qp:text-sm qp:mt-2',
		});

		this.renderProviderFields();
	}

	private renderProviderDropdown(): void {
		new Setting(this.containerEl)
			.setName(t('settings.comments.provider'))
			.setDesc(t('settings.comments.providerDesc'))
			.addDropdown((dropdown) => {
				this.providerDropdown = dropdown.selectEl;

				for (const provider of COMMENTS_PROVIDERS) {
					dropdown.addOption(provider.value, provider.label);
				}

				dropdown.setValue(this.currentConfig.provider);

				dropdown.onChange((value) => {
					this.handleProviderChange(value as CommentsConfig['provider']);
				});
			});
	}

	private handleProviderChange(provider: CommentsConfig['provider']): void {
		if (provider === 'null') {
			this.currentConfig = { provider: 'null' };
		} else {
			this.currentConfig = {
				provider: 'giscus',
				options: {
					repo: '' as `${string}/${string}`,
					repoId: '',
					category: '',
					categoryId: '',
				},
			};
		}

		this.renderProviderFields();
		this.notifyChange();
	}

	private renderProviderFields(): void {
		if (!this.fieldsContainerEl) return;

		this.fieldsContainerEl.empty();
		this.clearError();

		if (this.currentConfig.provider === 'giscus') {
			this.renderGiscusFields();
		}
	}

	private renderGiscusFields(): void {
		if (!this.fieldsContainerEl || this.currentConfig.provider !== 'giscus') {
			return;
		}

		const config = this.currentConfig.options;

		const helpLink = this.fieldsContainerEl.createEl('p', {
			cls: 'qp:text-obs-text-muted qp:text-sm qp:mb-4',
		});
		helpLink.innerHTML = t('settings.comments.giscusHelp');

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.repo'))
			.setDesc(t('settings.comments.repoDesc'))
			.addText((text) =>
				text
					.setPlaceholder('owner/repo')
					.setValue(config.repo)
					.onChange((value) => this.updateGiscusField('repo', value as `${string}/${string}`))
			);

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.repoId'))
			.setDesc(t('settings.comments.repoIdDesc'))
			.addText((text) =>
				text
					.setPlaceholder('R_xxxxxxxxx')
					.setValue(config.repoId)
					.onChange((value) => this.updateGiscusField('repoId', value))
			);

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.category'))
			.setDesc(t('settings.comments.categoryDesc'))
			.addText((text) =>
				text
					.setPlaceholder('Announcements')
					.setValue(config.category)
					.onChange((value) => this.updateGiscusField('category', value))
			);

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.categoryId'))
			.setDesc(t('settings.comments.categoryIdDesc'))
			.addText((text) =>
				text
					.setPlaceholder('DIC_xxxxxxxxx')
					.setValue(config.categoryId)
					.onChange((value) => this.updateGiscusField('categoryId', value))
			);

		new Setting(this.fieldsContainerEl).setName(t('settings.comments.optionalTitle')).setHeading();

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.mapping'))
			.setDesc(t('settings.comments.mappingDesc'))
			.addDropdown((dropdown) => {
				for (const option of MAPPING_OPTIONS) {
					dropdown.addOption(option.value, option.label);
				}
				dropdown.setValue(config.mapping ?? 'url');
				dropdown.onChange((value) => this.updateGiscusField('mapping', value as GiscusConfig['mapping']));
			});

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.lang'))
			.setDesc(t('settings.comments.langDesc'))
			.addText((text) =>
				text
					.setPlaceholder('en')
					.setValue(config.lang ?? '')
					.onChange((value) => this.updateGiscusField('lang', value || undefined))
			);

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.reactionsEnabled'))
			.setDesc(t('settings.comments.reactionsEnabledDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(config.reactionsEnabled ?? true)
					.onChange((value) => this.updateGiscusField('reactionsEnabled', value))
			);

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.inputPosition'))
			.setDesc(t('settings.comments.inputPositionDesc'))
			.addDropdown((dropdown) => {
				for (const option of INPUT_POSITION_OPTIONS) {
					dropdown.addOption(option.value, option.label);
				}
				dropdown.setValue(config.inputPosition ?? 'bottom');
				dropdown.onChange((value) => this.updateGiscusField('inputPosition', value as GiscusConfig['inputPosition']));
			});

		new Setting(this.fieldsContainerEl)
			.setName(t('settings.comments.strict'))
			.setDesc(t('settings.comments.strictDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(config.strict ?? true)
					.onChange((value) => this.updateGiscusField('strict', value))
			);
	}

	private updateGiscusField<K extends keyof GiscusConfig>(field: K, value: GiscusConfig[K]): void {
		if (this.currentConfig.provider !== 'giscus') return;

		this.currentConfig = {
			provider: 'giscus',
			options: {
				...this.currentConfig.options,
				[field]: value,
			},
		};

		this.validateAndNotify();
	}

	private validateAndNotify(): void {
		const result = this.validate();

		if (!result.valid && result.error) {
			this.showError(result.error);
		} else {
			this.clearError();
		}

		this.notifyChange();
	}

	private notifyChange(): void {
		this.options.onChange('comments', this.currentConfig);
	}

	private showError(message: string): void {
		if (this.errorEl) {
			this.errorEl.textContent = message;
		}
	}

	private clearError(): void {
		if (this.errorEl) {
			this.errorEl.textContent = '';
		}
	}

	updateValues(config: CommentsConfig): void {
		this.currentConfig = this.cloneConfig(config);

		if (this.providerDropdown) {
			this.providerDropdown.value = config.provider;
		}

		this.renderProviderFields();
	}

	validate(): { valid: boolean; error?: string } {
		if (this.currentConfig.provider === 'null') {
			return { valid: true };
		}

		const opts = this.currentConfig.options;

		if (!opts.repo || !opts.repo.includes('/')) {
			return { valid: false, error: t('settings.comments.errors.invalidRepo') };
		}

		if (!opts.repoId) {
			return { valid: false, error: t('settings.comments.errors.repoIdRequired') };
		}

		if (!opts.category) {
			return { valid: false, error: t('settings.comments.errors.categoryRequired') };
		}

		if (!opts.categoryId) {
			return { valid: false, error: t('settings.comments.errors.categoryIdRequired') };
		}

		return { valid: true };
	}
}
