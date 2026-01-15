import { Modal, Setting, Notice } from 'obsidian';
import type { App } from 'obsidian';
import { RepositoryCreatorService } from '../services/repository-creator';
import type { CreatedRepository } from '../types';
import { DEFAULT_REPO_NAME } from '../types';
import { t } from '../i18n';

type ModalState = 'idle' | 'validating' | 'creating' | 'success' | 'error';

interface CreateRepoModalOptions {
	token: string;
	onSuccess: (repository: CreatedRepository) => void;
	onShowDeployGuide?: (repository: CreatedRepository) => void;
}

export class CreateRepoModal extends Modal {
	private state: ModalState = 'idle';
	private repoName: string = DEFAULT_REPO_NAME;
	private visibility: 'public' | 'private' = 'public';
	private errorMessage: string | null = null;
	private createdRepository: CreatedRepository | null = null;
	
	private service: RepositoryCreatorService;
	private options: CreateRepoModalOptions;

	constructor(app: App, options: CreateRepoModalOptions) {
		super(app);
		this.service = new RepositoryCreatorService(options.token);
		this.options = options;
	}

	onOpen() {
		this.render();
	}

	onClose() {
		this.contentEl.empty();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('qp:p-4', 'qp:min-w-[400px]');

		switch (this.state) {
			case 'idle':
			case 'validating':
			case 'creating':
			case 'error':
				this.renderForm();
				break;
			case 'success':
				this.renderSuccess();
				break;
		}
	}

	private renderForm() {
		const { contentEl } = this;

		contentEl.createEl('h2', { 
			text: t('modal.createRepo.title'),
			cls: 'qp:text-lg qp:font-semibold qp:mb-4',
		});

		if (this.state === 'error' && this.errorMessage) {
			const errorEl = contentEl.createDiv({
				cls: 'qp:bg-red-100 qp:border qp:border-red-400 qp:text-red-700 qp:px-4 qp:py-3 qp:rounded qp:mb-4',
			});
			errorEl.createSpan({ text: this.errorMessage });
		}

		const isDisabled = this.state === 'validating' || this.state === 'creating';

		new Setting(contentEl)
			.setName(t('modal.createRepo.name'))
			.setDesc(t('modal.createRepo.nameDesc'))
			.addText((text) => {
				text
					.setPlaceholder(DEFAULT_REPO_NAME)
					.setValue(this.repoName)
					.setDisabled(isDisabled)
					.onChange((value) => {
						this.repoName = value;
						this.clearError();
					});
				text.inputEl.addClass('qp:w-full');
			});

		new Setting(contentEl)
			.setName(t('modal.createRepo.visibility'))
			.setDesc(t('modal.createRepo.visibilityDesc'))
			.addDropdown((dropdown) => {
				dropdown
					.addOption('public', t('modal.createRepo.public'))
					.addOption('private', t('modal.createRepo.private'))
					.setValue(this.visibility)
					.setDisabled(isDisabled)
					.onChange((value) => {
						this.visibility = value as 'public' | 'private';
					});
			});

		if (this.visibility === 'private') {
			const warningEl = contentEl.createDiv({
				cls: 'qp:bg-yellow-50 qp:border qp:border-yellow-200 qp:text-yellow-800 qp:px-4 qp:py-3 qp:rounded qp:mb-4 qp:text-sm',
			});
			warningEl.createSpan({ 
				text: '⚠️ ' + t('modal.createRepo.privateWarning')
			});
		}

		const buttonContainer = contentEl.createDiv({
			cls: 'qp:flex qp:justify-end qp:gap-2 qp:mt-4',
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: t('modal.confirm.cancel'),
			cls: 'qp:px-4 qp:py-2',
		});
		cancelBtn.addEventListener('click', () => this.close());
		cancelBtn.disabled = isDisabled;

		const createBtn = buttonContainer.createEl('button', {
			text: this.state === 'creating' ? t('modal.createRepo.creating') : t('modal.createRepo.create'),
			cls: 'mod-cta qp:px-4 qp:py-2',
		});
		createBtn.addEventListener('click', () => this.handleCreate());
		createBtn.disabled = isDisabled;

		if (this.state === 'creating') {
			const progressEl = contentEl.createDiv({
				cls: 'qp:mt-4 qp:text-center qp:text-sm qp:text-gray-500',
			});
			progressEl.createSpan({ text: t('modal.createRepo.creatingProgress') });
		}
	}

	private renderSuccess() {
		const { contentEl } = this;

		contentEl.createEl('h2', {
			text: '✅ ' + t('modal.createRepo.success'),
			cls: 'qp:text-lg qp:font-semibold qp:mb-4 qp:text-green-600',
		});

		if (this.createdRepository) {
			const infoEl = contentEl.createDiv({
				cls: 'qp:bg-green-50 qp:border qp:border-green-200 qp:px-4 qp:py-3 qp:rounded qp:mb-4',
			});
			
			infoEl.createEl('p', {
				text: `Repository: ${this.createdRepository.fullName}`,
				cls: 'qp:font-medium',
			});
			
			const linkEl = infoEl.createEl('a', {
				text: this.createdRepository.htmlUrl,
				href: this.createdRepository.htmlUrl,
				cls: 'qp:text-blue-600 qp:underline qp:text-sm',
			});
			linkEl.setAttr('target', '_blank');
		}

		const buttonContainer = contentEl.createDiv({
			cls: 'qp:flex qp:justify-end qp:gap-2 qp:mt-4',
		});

		const closeBtn = buttonContainer.createEl('button', {
			text: t('dashboard.action.close'),
			cls: 'qp:px-4 qp:py-2',
		});
		closeBtn.addEventListener('click', () => this.close());

		if (this.options.onShowDeployGuide) {
			const guideBtn = buttonContainer.createEl('button', {
				text: t('modal.createRepo.viewGuide'),
				cls: 'mod-cta qp:px-4 qp:py-2',
			});
			guideBtn.addEventListener('click', () => {
				if (this.createdRepository && this.options.onShowDeployGuide) {
					this.options.onShowDeployGuide(this.createdRepository);
					this.close();
				}
			});
		}
	}

	private clearError() {
		if (this.state === 'error') {
			this.state = 'idle';
			this.errorMessage = null;
		}
	}

	private async handleCreate() {
		const trimmedName = this.repoName.trim() || DEFAULT_REPO_NAME;
		
		const validation = this.service.validateRepositoryName(trimmedName);
		if (!validation.valid) {
			this.state = 'error';
			this.errorMessage = validation.error ?? 'Invalid repository name';
			this.render();
			return;
		}

		this.state = 'creating';
		this.render();

		try {
			const result = await this.service.createFromTemplate({
				name: trimmedName,
				visibility: this.visibility,
			});

			if (result.success) {
				this.state = 'success';
				this.createdRepository = result.repository;
				this.options.onSuccess(result.repository);
				new Notice(`Repository "${result.repository.fullName}" created successfully!`);
			} else {
				this.state = 'error';
				this.errorMessage = result.error.message;
			}
		} catch (error) {
			this.state = 'error';
			this.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		}

		this.render();
	}
}
