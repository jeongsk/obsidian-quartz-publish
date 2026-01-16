import { Setting, type App, type Vault } from 'obsidian';
import type { PublishFilterSettings } from '../../types';
import { t } from '../../i18n';
import { NoteSuggestModal } from '../components/note-suggest-modal';
import { FolderSuggestModal } from '../components/folder-suggest-modal';

export type PublishFilterChangeCallback = <K extends keyof PublishFilterSettings>(
	field: K,
	value: PublishFilterSettings[K]
) => void;

export interface PublishFilterSectionOptions {
	config: PublishFilterSettings;
	app: App;
	vault: Vault;
	onChange: PublishFilterChangeCallback;
}

export class PublishFilterSection {
	private containerEl: HTMLElement;
	private options: PublishFilterSectionOptions;

	private includeFoldersTextarea: HTMLTextAreaElement | null = null;
	private excludeFoldersTextarea: HTMLTextAreaElement | null = null;
	private excludeTagsTextarea: HTMLTextAreaElement | null = null;
	private rootFolderInput: HTMLInputElement | null = null;
	private homePageInput: HTMLInputElement | null = null;

	private includeFoldersWarningEl: HTMLElement | null = null;
	private excludeFoldersWarningEl: HTMLElement | null = null;
	private rootFolderWarningEl: HTMLElement | null = null;
	private homePageWarningEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement, options: PublishFilterSectionOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.render();
	}

	private render(): void {
		new Setting(this.containerEl).setName(t('settings.filter.title')).setHeading();

		this.renderRootFolder();
		this.renderHomePage();
		this.renderIncludeFolders();
		this.renderExcludeFolders();
		this.renderExcludeTags();
	}

	private renderIncludeFolders(): void {
		const setting = new Setting(this.containerEl)
			.setName(t('settings.filter.includeFolders'))
			.setDesc(t('settings.filter.includeFoldersDesc'))
			.addTextArea((textarea) => {
				this.includeFoldersTextarea = textarea.inputEl;
				textarea.inputEl.rows = 3;
				textarea.inputEl.placeholder = t('settings.filter.includeFoldersPlaceholder');
				textarea.setValue(this.options.config.includeFolders.join('\n'));
				textarea.onChange((value) => {
					this.handleIncludeFoldersChange(value);
				});
			});

		this.includeFoldersWarningEl = setting.descEl.createDiv({
			cls: 'text-obs-text-warning text-xs mt-1',
			attr: {
				role: 'status',
				'aria-live': 'polite',
			},
		});

		this.validateFolders(
			this.options.config.includeFolders,
			this.includeFoldersWarningEl
		);
	}

	private handleIncludeFoldersChange(value: string): void {
		const folders = this.parseLines(value);
		this.validateFolders(folders, this.includeFoldersWarningEl);
		this.options.onChange('includeFolders', folders);
	}

	private renderExcludeFolders(): void {
		const setting = new Setting(this.containerEl)
			.setName(t('settings.filter.excludeFolders'))
			.setDesc(t('settings.filter.excludeFoldersDesc'))
			.addTextArea((textarea) => {
				this.excludeFoldersTextarea = textarea.inputEl;
				textarea.inputEl.rows = 3;
				textarea.inputEl.placeholder = t('settings.filter.excludeFoldersPlaceholder');
				textarea.setValue(this.options.config.excludeFolders.join('\n'));
				textarea.onChange((value) => {
					this.handleExcludeFoldersChange(value);
				});
			});

		this.excludeFoldersWarningEl = setting.descEl.createDiv({
			cls: 'text-obs-text-warning text-xs mt-1',
			attr: {
				role: 'status',
				'aria-live': 'polite',
			},
		});

		this.validateFolders(
			this.options.config.excludeFolders,
			this.excludeFoldersWarningEl
		);
	}

	private handleExcludeFoldersChange(value: string): void {
		const folders = this.parseLines(value);
		this.validateFolders(folders, this.excludeFoldersWarningEl);
		this.options.onChange('excludeFolders', folders);
	}

	private renderExcludeTags(): void {
		new Setting(this.containerEl)
			.setName(t('settings.filter.excludeTags'))
			.setDesc(t('settings.filter.excludeTagsDesc'))
			.addTextArea((textarea) => {
				this.excludeTagsTextarea = textarea.inputEl;
				textarea.inputEl.rows = 2;
				textarea.inputEl.placeholder = t('settings.filter.excludeTagsPlaceholder');
				textarea.setValue(this.options.config.excludeTags.join('\n'));
				textarea.onChange((value) => {
					this.handleExcludeTagsChange(value);
				});
			});
	}

	private handleExcludeTagsChange(value: string): void {
		const tags = this.parseLines(value).map((tag) => tag.replace(/^#/, ''));
		this.options.onChange('excludeTags', tags);
	}

	private renderRootFolder(): void {
		const setting = new Setting(this.containerEl)
			.setName(t('settings.filter.rootFolder'))
			.setDesc(t('settings.filter.rootFolderDesc'))
			.addText((text) => {
				this.rootFolderInput = text.inputEl;
				text.setPlaceholder(t('settings.filter.rootFolderPlaceholder'));
				text.setValue(this.options.config.rootFolder);

				// 입력 필드 클릭 시 폴더 선택 모달 열기
				text.inputEl.addEventListener('click', () => {
					new FolderSuggestModal(this.options.app, (path) => {
						text.setValue(path);
						this.handleRootFolderChange(path);
					}).open();
				});

				// 직접 입력도 허용
				text.onChange((value) => {
					this.handleRootFolderChange(value);
				});
			});

		this.rootFolderWarningEl = setting.descEl.createDiv({
			cls: 'text-obs-text-warning text-xs mt-1',
			attr: {
				role: 'status',
				'aria-live': 'polite',
			},
		});

		this.validateFolder(
			this.options.config.rootFolder,
			this.rootFolderWarningEl
		);
	}

	private handleRootFolderChange(value: string): void {
		const normalized = value.trim().replace(/^\/+|\/+$/g, '');
		this.validateFolder(normalized, this.rootFolderWarningEl);
		this.options.onChange('rootFolder', normalized);
	}

	private renderHomePage(): void {
		const setting = new Setting(this.containerEl)
			.setName(t('settings.filter.homePage'))
			.setDesc(t('settings.filter.homePageDesc'))
			.addText((text) => {
				this.homePageInput = text.inputEl;
				text.setPlaceholder(t('settings.filter.homePagePlaceholder'));
				text.setValue(this.options.config.homePagePath);

				// 입력 필드 클릭 시 노트 선택 모달 열기
				text.inputEl.addEventListener('click', () => {
					new NoteSuggestModal(this.options.app, (path) => {
						text.setValue(path);
						this.handleHomePageChange(path);
					}).open();
				});

				// 직접 입력도 허용
				text.onChange((value) => {
					this.handleHomePageChange(value);
				});
			});

		this.homePageWarningEl = setting.descEl.createDiv({
			cls: 'text-obs-text-warning text-xs mt-1',
			attr: {
				role: 'status',
				'aria-live': 'polite',
			},
		});

		this.validateHomePage(
			this.options.config.homePagePath,
			this.homePageWarningEl
		);
	}

	private handleHomePageChange(value: string): void {
		const normalized = value.trim().replace(/^\/+|\/+$/g, '');
		this.validateHomePage(normalized, this.homePageWarningEl);
		this.options.onChange('homePagePath', normalized);
	}

	private parseLines(value: string): string[] {
		return value
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	private validateFolders(
		folders: string[],
		warningEl: HTMLElement | null
	): void {
		if (!warningEl) return;

		const invalidFolders = folders.filter((folder) => {
			if (!folder) return false;
			const abstractFile = this.options.vault.getAbstractFileByPath(folder);
			return !abstractFile;
		});

		if (invalidFolders.length > 0) {
			warningEl.textContent = t('settings.filter.folderNotFound', {
				folders: invalidFolders.join(', '),
			});
		} else {
			warningEl.textContent = '';
		}
	}

	private validateFolder(
		folder: string,
		warningEl: HTMLElement | null
	): void {
		if (!warningEl) return;

		if (!folder) {
			warningEl.textContent = '';
			return;
		}

		const abstractFile = this.options.vault.getAbstractFileByPath(folder);
		if (!abstractFile) {
			warningEl.textContent = t('settings.filter.folderNotFound', {
				folders: folder,
			});
		} else {
			warningEl.textContent = '';
		}
	}

	private validateHomePage(
		path: string,
		warningEl: HTMLElement | null
	): void {
		if (!warningEl) return;

		if (!path) {
			warningEl.textContent = '';
			return;
		}

		if (!path.endsWith('.md')) {
			warningEl.textContent = t('settings.filter.homePageMustBeMd');
			return;
		}

		const abstractFile = this.options.vault.getAbstractFileByPath(path);
		if (!abstractFile) {
			warningEl.textContent = t('settings.filter.fileNotFound', { path });
		} else {
			warningEl.textContent = '';
		}
	}

	updateValues(config: PublishFilterSettings): void {
		if (this.includeFoldersTextarea) {
			this.includeFoldersTextarea.value = config.includeFolders.join('\n');
		}
		if (this.excludeFoldersTextarea) {
			this.excludeFoldersTextarea.value = config.excludeFolders.join('\n');
		}
		if (this.excludeTagsTextarea) {
			this.excludeTagsTextarea.value = config.excludeTags.join('\n');
		}
		if (this.rootFolderInput) {
			this.rootFolderInput.value = config.rootFolder;
		}
		if (this.homePageInput) {
			this.homePageInput.value = config.homePagePath;
		}

		this.validateFolders(config.includeFolders, this.includeFoldersWarningEl);
		this.validateFolders(config.excludeFolders, this.excludeFoldersWarningEl);
		this.validateFolder(config.rootFolder, this.rootFolderWarningEl);
		this.validateHomePage(config.homePagePath, this.homePageWarningEl);
	}
}
