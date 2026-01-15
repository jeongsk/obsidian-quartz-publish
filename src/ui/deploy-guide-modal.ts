import { Modal } from 'obsidian';
import type { App } from 'obsidian';
import type { DeployGuideStep, CreatedRepository } from '../types';
import { t } from '../i18n';

interface DeployGuideModalOptions {
	repository: CreatedRepository;
}

/**
 * 스텝 번호 배열
 */
const STEP_NUMBERS = [1, 2, 3, 4, 5, 6] as const;

export class DeployGuideModal extends Modal {
	private currentStep = 0;
	private repository: CreatedRepository;
	private totalSteps = STEP_NUMBERS.length;

	constructor(app: App, options: DeployGuideModalOptions) {
		super(app);
		this.repository = options.repository;
	}

	/**
	 * 현재 스텝 정보를 동적으로 반환 (번역 적용)
	 */
	private getCurrentStepInfo(): DeployGuideStep {
		const stepNumber = STEP_NUMBERS[this.currentStep];
		const baseUrl = this.repository.htmlUrl;
		const owner = this.repository.owner;
		const name = this.repository.name;

		let externalUrl: string | undefined;
		let actionLabel: string | undefined;

		switch (stepNumber) {
			case 1:
				externalUrl = `${baseUrl}/settings`;
				actionLabel = t('deployGuide.step1.action');
				break;
			case 2:
				externalUrl = `${baseUrl}/settings/pages`;
				actionLabel = t('deployGuide.step2.action');
				break;
			case 3:
				// No external URL for step 3
				break;
			case 4:
				externalUrl = `${baseUrl}/settings/actions`;
				actionLabel = t('deployGuide.step4.action');
				break;
			case 5:
				externalUrl = `${baseUrl}/actions`;
				actionLabel = t('deployGuide.step5.action');
				break;
			case 6:
				externalUrl = `https://${owner}.github.io/${name}/`;
				actionLabel = t('deployGuide.step6.action');
				break;
		}

		return {
			stepNumber,
			title: t(`deployGuide.step${stepNumber}.title`),
			description: t(`deployGuide.step${stepNumber}.desc`),
			actionLabel,
			externalUrl,
		};
	}

	onOpen() {
		// 키보드 네비게이션 설정
		this.scope.register([], 'ArrowLeft', () => {
			if (this.currentStep > 0) {
				this.currentStep--;
				this.render();
			}
			return false;
		});
		this.scope.register([], 'ArrowRight', () => {
			if (this.currentStep < this.totalSteps - 1) {
				this.currentStep++;
				this.render();
			}
			return false;
		});
		this.scope.register([], 'Enter', () => {
			if (this.currentStep === this.totalSteps - 1) {
				this.close();
			} else {
				this.currentStep++;
				this.render();
			}
			return false;
		});

		this.render();
	}

	onClose() {
		this.contentEl.empty();
	}

	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('qp:p-4');
		// 반응형 너비 설정
		contentEl.style.minWidth = 'min(450px, 90vw)';
		contentEl.style.maxWidth = 'min(550px, 95vw)';

		const step = this.getCurrentStepInfo();
		const stepOfText = t('deployGuide.stepOf', {
			current: String(step.stepNumber),
			total: String(this.totalSteps),
		});

		contentEl.createEl('h2', {
			text: t('deployGuide.title'),
			cls: 'qp:text-lg qp:font-semibold qp:mb-4',
		});

		const progressContainer = contentEl.createDiv({
			cls: 'qp:mb-4',
		});

		progressContainer.createEl('span', {
			text: stepOfText,
			cls: 'qp:text-sm qp:text-obs-text-muted',
		});

		const progressValue = Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
		const progressBar = progressContainer.createDiv({
			cls: 'qp:w-full qp:h-2 qp:bg-obs-bg-modifier-border qp:rounded qp:mt-2',
			attr: {
				role: 'progressbar',
				'aria-valuenow': String(this.currentStep + 1),
				'aria-valuemin': '1',
				'aria-valuemax': String(this.totalSteps),
				'aria-label': stepOfText,
			},
		});

		const progressFill = progressBar.createDiv({
			cls: 'qp:h-full qp:bg-obs-interactive-accent qp:rounded qp:transition-all',
		});
		progressFill.style.width = `${progressValue}%`;

		contentEl.createEl('h3', {
			text: step.title,
			cls: 'qp:text-base qp:font-medium qp:mb-2',
		});

		contentEl.createEl('p', {
			text: step.description,
			cls: 'qp:text-sm qp:text-obs-text-muted qp:mb-4',
		});

		if (step.externalUrl && step.actionLabel) {
			const actionBtn = contentEl.createEl('button', {
				text: step.actionLabel,
				cls: 'qp:w-full qp:px-4 qp:py-2 qp:bg-obs-interactive-accent/10 qp:text-obs-interactive-accent qp:rounded qp:mb-4 qp:cursor-pointer hover:qp:bg-obs-interactive-accent/20',
			});
			actionBtn.addEventListener('click', () => {
				window.open(step.externalUrl, '_blank');
			});
		}

		const navContainer = contentEl.createDiv({
			cls: 'qp:flex qp:justify-between qp:gap-2 qp:mt-4',
		});

		const backBtn = navContainer.createEl('button', {
			text: t('deployGuide.back'),
			cls: 'qp:px-4 qp:py-2',
			attr: {
				'aria-label': t('deployGuide.back'),
			},
		});
		backBtn.disabled = this.currentStep === 0;
		if (this.currentStep === 0) {
			backBtn.addClass('qp:opacity-50', 'qp:cursor-not-allowed');
		}
		backBtn.addEventListener('click', () => {
			if (this.currentStep > 0) {
				this.currentStep--;
				this.render();
			}
		});

		const isLastStep = this.currentStep === this.totalSteps - 1;
		const nextBtnText = isLastStep ? t('deployGuide.done') : t('deployGuide.next');
		const nextBtn = navContainer.createEl('button', {
			text: nextBtnText,
			cls: 'mod-cta qp:px-4 qp:py-2',
			attr: {
				'aria-label': nextBtnText,
			},
		});
		nextBtn.addEventListener('click', () => {
			if (isLastStep) {
				this.close();
			} else {
				this.currentStep++;
				this.render();
			}
		});
	}
}
