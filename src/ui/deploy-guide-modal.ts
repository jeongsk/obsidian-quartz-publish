import { Modal } from 'obsidian';
import type { App } from 'obsidian';
import type { DeployGuideStep, CreatedRepository } from '../types';

interface DeployGuideModalOptions {
	repository: CreatedRepository;
}

const DEPLOY_GUIDE_STEPS: Omit<DeployGuideStep, 'externalUrl'>[] = [
	{
		stepNumber: 1,
		title: 'Open Repository Settings',
		description: 'Go to your GitHub repository settings page to configure GitHub Pages.',
		actionLabel: 'Open Settings',
	},
	{
		stepNumber: 2,
		title: 'Navigate to Pages Section',
		description: 'In the left sidebar, click on "Pages" under the "Code and automation" section.',
		actionLabel: 'Open Pages Settings',
	},
	{
		stepNumber: 3,
		title: 'Configure Build Source',
		description: 'Under "Build and deployment", set the Source to "GitHub Actions". This allows Quartz to automatically deploy when you publish notes.',
	},
	{
		stepNumber: 4,
		title: 'Enable Workflow Permissions',
		description: 'Go to Settings > Actions > General. Under "Workflow permissions", select "Read and write permissions" to allow the deploy workflow to push to GitHub Pages.',
		actionLabel: 'Open Actions Settings',
	},
	{
		stepNumber: 5,
		title: 'Trigger First Deployment',
		description: 'The deployment will start automatically when you publish your first note. You can also trigger it manually from the Actions tab.',
		actionLabel: 'View Actions',
	},
	{
		stepNumber: 6,
		title: 'Visit Your Site',
		description: 'After deployment completes (usually 2-3 minutes), your Quartz site will be live! Click below to visit your new digital garden.',
		actionLabel: 'Open Your Site',
	},
];

export class DeployGuideModal extends Modal {
	private currentStep = 0;
	private repository: CreatedRepository;
	private steps: DeployGuideStep[];

	constructor(app: App, options: DeployGuideModalOptions) {
		super(app);
		this.repository = options.repository;
		this.steps = this.buildStepsWithUrls();
	}

	private buildStepsWithUrls(): DeployGuideStep[] {
		const baseUrl = this.repository.htmlUrl;
		const owner = this.repository.owner;
		const name = this.repository.name;

		return DEPLOY_GUIDE_STEPS.map((step) => {
			let externalUrl: string | undefined;

			switch (step.stepNumber) {
				case 1:
					externalUrl = `${baseUrl}/settings`;
					break;
				case 2:
					externalUrl = `${baseUrl}/settings/pages`;
					break;
				case 4:
					externalUrl = `${baseUrl}/settings/actions`;
					break;
				case 5:
					externalUrl = `${baseUrl}/actions`;
					break;
				case 6:
					externalUrl = `https://${owner}.github.io/${name}/`;
					break;
			}

			return { ...step, externalUrl };
		});
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
		contentEl.addClass('qp:p-4', 'qp:min-w-[450px]');

		const step = this.steps[this.currentStep];
		const totalSteps = this.steps.length;

		contentEl.createEl('h2', {
			text: 'GitHub Pages Deploy Guide',
			cls: 'qp:text-lg qp:font-semibold qp:mb-4',
		});

		const progressContainer = contentEl.createDiv({
			cls: 'qp:mb-4',
		});

		progressContainer.createEl('span', {
			text: `Step ${step.stepNumber} of ${totalSteps}`,
			cls: 'qp:text-sm qp:text-obs-text-muted',
		});

		const progressBar = progressContainer.createDiv({
			cls: 'qp:w-full qp:h-2 qp:bg-obs-bg-modifier-border qp:rounded qp:mt-2',
		});

		const progressFill = progressBar.createDiv({
			cls: 'qp:h-full qp:bg-obs-interactive-accent qp:rounded qp:transition-all',
		});
		progressFill.style.width = `${((this.currentStep + 1) / totalSteps) * 100}%`;

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
			text: 'Back',
			cls: 'qp:px-4 qp:py-2',
		});
		backBtn.disabled = this.currentStep === 0;
		backBtn.addEventListener('click', () => {
			if (this.currentStep > 0) {
				this.currentStep--;
				this.render();
			}
		});

		const isLastStep = this.currentStep === totalSteps - 1;
		const nextBtn = navContainer.createEl('button', {
			text: isLastStep ? 'Done' : 'Next',
			cls: 'mod-cta qp:px-4 qp:py-2',
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
