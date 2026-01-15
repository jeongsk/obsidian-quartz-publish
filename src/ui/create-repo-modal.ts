import { Modal, Setting, Notice, setIcon } from 'obsidian';
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
		const { contentEl, modalEl } = this;
		contentEl.empty();
		contentEl.addClass('p-4');

		// 반응형 너비 설정
		modalEl.style.minWidth = 'min(400px, 90vw)';
		modalEl.style.maxWidth = 'min(500px, 95vw)';

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
			cls: 'text-lg font-semibold mb-4',
		});

		if (this.state === 'error' && this.errorMessage) {
			const errorEl = contentEl.createDiv({
				cls: 'bg-obs-bg-modifier-error border border-obs-text-error text-obs-text-error px-4 py-3 rounded mb-4',
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
				text.inputEl.addClass('w-full');
				// 모달 열릴 때 첫 번째 입력 필드에 포커스
				if (this.state === 'idle') {
					setTimeout(() => text.inputEl.focus(), 50);
				}
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
				cls: 'bg-obs-bg-modifier-message border border-obs-text-warning text-obs-text-warning px-4 py-3 rounded mb-4 text-sm',
				attr: {
					role: 'alert',
				},
			});
			const warningIcon = warningEl.createSpan({ cls: 'mr-1', attr: { 'aria-hidden': 'true' } });
			setIcon(warningIcon, 'alert-triangle');
			warningEl.createSpan({
				text: t('modal.createRepo.privateWarning')
			});
		}

		const buttonContainer = contentEl.createDiv({
			cls: 'flex flex-wrap justify-end gap-2 mt-4',
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: t('modal.confirm.cancel'),
			cls: 'px-4 py-2',
		});
		cancelBtn.addEventListener('click', () => this.close());
		cancelBtn.disabled = isDisabled;

		const createBtn = buttonContainer.createEl('button', {
			text: this.state === 'creating' ? t('modal.createRepo.creating') : t('modal.createRepo.create'),
			cls: 'mod-cta px-4 py-2',
		});
		createBtn.addEventListener('click', () => this.handleCreate());
		createBtn.disabled = isDisabled;

		if (this.state === 'creating') {
			const progressEl = contentEl.createDiv({
				cls: 'mt-4 text-center text-sm text-obs-text-muted',
			});
			progressEl.createSpan({ text: t('modal.createRepo.creatingProgress') });
		}
	}

	private renderSuccess() {
		const { contentEl } = this;

		const successHeading = contentEl.createEl('h2', {
			cls: 'text-lg font-semibold mb-4 text-obs-text-success flex items-center gap-2',
		});
		const successIcon = successHeading.createSpan({ attr: { 'aria-hidden': 'true' } });
		setIcon(successIcon, 'check-circle-2');
		successHeading.createSpan({ text: t('modal.createRepo.success') });

		if (this.createdRepository) {
			const infoEl = contentEl.createDiv({
				cls: 'bg-obs-bg-modifier-success border border-obs-text-success px-4 py-3 rounded mb-4 overflow-hidden',
			});

			infoEl.createEl('p', {
				text: `Repository: ${this.createdRepository.fullName}`,
				cls: 'font-medium truncate',
			});

			const linkEl = infoEl.createEl('a', {
				text: this.createdRepository.htmlUrl,
				href: this.createdRepository.htmlUrl,
				cls: 'text-obs-text-accent underline text-sm block truncate',
			});
			linkEl.setAttr('target', '_blank');
		}

		const buttonContainer = contentEl.createDiv({
			cls: 'flex flex-wrap justify-end gap-2 mt-4',
		});

		const closeBtn = buttonContainer.createEl('button', {
			text: t('dashboard.action.close'),
			cls: 'px-4 py-2',
		});
		closeBtn.addEventListener('click', () => this.close());

		if (this.options.onShowDeployGuide) {
			const guideBtn = buttonContainer.createEl('button', {
				text: t('modal.createRepo.viewGuide'),
				cls: 'mod-cta px-4 py-2',
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
