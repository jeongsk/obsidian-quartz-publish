/**
 * GitHub Guide Modal
 *
 * 초보자를 위한 GitHub 리포지토리 설정 가이드 스텝 위자드 모달입니다.
 * DeployGuideModal 패턴을 확장하여 구현합니다.
 */

import { Modal } from "obsidian";
import type { App } from "obsidian";
import type {
	GuideStep,
	SetupStatus,
	PluginSettings,
	TroubleshootingItem,
} from "../types";
import {
	createGuideSteps,
	createTroubleshootingItems,
	TOTAL_GUIDE_STEPS,
} from "../constants/guide-steps";
import { SetupStatusService } from "../services/setup-status";
import { t } from "../i18n";
import { cn } from "../utils/cn";

/**
 * GitHubGuideModal 생성자 옵션
 */
export interface GitHubGuideModalOptions {
	/** 현재 플러그인 설정을 반환하는 함수 */
	getSettings: () => PluginSettings;
	/** 모달 닫힐 때 콜백 (선택적) */
	onClose?: () => void;
}

/**
 * GitHub 설정 가이드 모달 클래스
 *
 * 스텝 위자드 형식으로 GitHub 리포지토리 설정을 안내합니다.
 */
export class GitHubGuideModal extends Modal {
	private currentStep = 0;
	private steps: GuideStep[] = [];
	private troubleshootingItems: TroubleshootingItem[] = [];
	private statusService: SetupStatusService;
	private status: SetupStatus;
	private options: GitHubGuideModalOptions;
	private showTroubleshooting = false;

	constructor(app: App, options: GitHubGuideModalOptions) {
		super(app);
		this.options = options;
		this.statusService = new SetupStatusService({
			getSettings: options.getSettings,
		});
		this.status = this.statusService.getStatus();
		this.steps = createGuideSteps(this.status);
		this.troubleshootingItems = createTroubleshootingItems();

		// 완료되지 않은 첫 번째 단계로 이동
		const nextStepIndex = this.statusService.getNextStepIndex();
		if (nextStepIndex >= 0) {
			this.currentStep = nextStepIndex;
		}
	}

	onOpen() {
		this.modalEl.addClass("github-guide-modal");
		this.render();
	}

	onClose() {
		this.contentEl.empty();
		this.options.onClose?.();
	}

	/**
	 * 상태를 새로고침하고 UI를 업데이트합니다.
	 */
	refreshStatus() {
		this.status = this.statusService.getStatus();
		this.steps = createGuideSteps(this.status);
		this.render();
	}

	/**
	 * 모달 콘텐츠를 렌더링합니다.
	 */
	private render() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("qp:p-4");
		// 반응형 너비: 작은 화면에서는 90vw, 큰 화면에서는 500-600px
		contentEl.style.minWidth = "min(500px, 90vw)";
		contentEl.style.maxWidth = "min(600px, 95vw)";

		// 문제 해결 모드인 경우
		if (this.showTroubleshooting) {
			this.renderTroubleshootingSection(contentEl);
			return;
		}

		const step = this.steps[this.currentStep];
		const totalSteps = TOTAL_GUIDE_STEPS;

		// 헤더
		this.renderHeader(contentEl);

		// 진행 바
		this.renderProgressBar(contentEl, totalSteps);

		// 단계 콘텐츠
		this.renderStepContent(contentEl, step);

		// 팁 섹션
		if (step.troubleshootingTips && step.troubleshootingTips.length > 0) {
			this.renderTips(contentEl, step.troubleshootingTips);
		}

		// 네비게이션 버튼
		this.renderNavigation(contentEl, totalSteps);
	}

	/**
	 * 헤더를 렌더링합니다.
	 */
	private renderHeader(container: HTMLElement) {
		const headerContainer = container.createDiv({
			cls: "qp:flex qp:items-center qp:justify-between qp:mb-4",
		});

		headerContainer.createEl("h2", {
			text: t("guide.title"),
			cls: "qp:text-lg qp:font-semibold qp:m-0",
		});

		// 완료 상태 배지
		const isComplete = this.statusService.isComplete();
		const completedCount = this.statusService.getCompletedStepCount();

		const statusBadge = headerContainer.createEl("span", {
			cls: cn(
				"qp:text-xs qp:px-2 qp:py-1 qp:rounded qp:text-[var(--color-base-00)]",
				isComplete
					? "qp:bg-obs-bg-modifier-success"
					: "qp:bg-obs-bg-modifier-message"
			),
		});
		statusBadge.textContent = `${completedCount}/${TOTAL_GUIDE_STEPS} ${t(
			"guide.complete"
		)}`;
	}

	/**
	 * 진행 바를 렌더링합니다.
	 */
	private renderProgressBar(container: HTMLElement, totalSteps: number) {
		const progressContainer = container.createDiv({
			cls: "qp:mb-6",
		});

		// 단계 표시
		progressContainer.createEl("span", {
			text: t("guide.stepOf", {
				current: this.currentStep + 1,
				total: totalSteps,
			}),
			cls: "qp:text-sm qp:text-obs-text-muted",
		});

		// 진행 바
		const progressValue = Math.round(
			((this.currentStep + 1) / totalSteps) * 100
		);
		const progressBar = progressContainer.createDiv({
			cls: "qp:w-full qp:h-2 qp:bg-obs-bg-modifier-border qp:rounded qp:mt-2",
			attr: {
				role: "progressbar",
				"aria-valuenow": String(this.currentStep + 1),
				"aria-valuemin": "1",
				"aria-valuemax": String(totalSteps),
				"aria-label": t("guide.stepOf", {
					current: this.currentStep + 1,
					total: totalSteps,
				}),
			},
		});

		const progressFill = progressBar.createDiv({
			cls: "qp:h-full qp:bg-obs-interactive-accent qp:rounded qp:transition-all qp:duration-300",
		});
		progressFill.style.width = `${progressValue}%`;

		// 단계 인디케이터 (점)
		const dotsContainer = progressContainer.createDiv({
			cls: "qp:flex qp:justify-between qp:mt-3",
		});

		for (let i = 0; i < totalSteps; i++) {
			const step = this.steps[i];
			const isCurrentStep = i === this.currentStep;
			const isCompleted = step.completionCheck?.() ?? false;

			let dotClass =
				"qp:w-3 qp:h-3 qp:rounded-full qp:cursor-pointer qp:transition-all ";
			if (isCurrentStep) {
				dotClass +=
					"qp:bg-obs-interactive-accent qp:ring-2 qp:ring-obs-interactive-accent/30";
			} else if (isCompleted) {
				dotClass += "qp:bg-obs-text-success";
			} else {
				dotClass += "qp:bg-obs-bg-modifier-border";
			}

			const dot = dotsContainer.createDiv({
				cls: dotClass,
				attr: {
					role: "button",
					tabindex: "0",
					"aria-label": step.title,
					...(isCurrentStep && { "aria-current": "step" }),
				},
			});

			const navigateToStep = () => {
				this.currentStep = i;
				this.render();
			};
			dot.addEventListener("click", navigateToStep);
			dot.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					navigateToStep();
				}
			});
		}
	}

	/**
	 * 단계 콘텐츠를 렌더링합니다.
	 */
	private renderStepContent(container: HTMLElement, step: GuideStep) {
		const contentContainer = container.createDiv({
			cls: "qp:mb-6",
		});

		// 완료 상태 아이콘과 제목
		const titleContainer = contentContainer.createDiv({
			cls: "qp:flex qp:items-center qp:gap-2 qp:mb-3",
		});

		const isCompleted = step.completionCheck?.() ?? false;
		if (isCompleted) {
			const checkIcon = titleContainer.createEl("span", {
				text: "✓",
				cls: "qp:text-obs-text-success qp:font-bold qp:text-lg",
			});
			checkIcon.setAttribute("aria-label", t("guide.complete"));
		}

		titleContainer.createEl("h3", {
			text: step.title,
			cls: `qp:text-base qp:font-medium qp:m-0 ${
				isCompleted ? "qp:text-obs-text-success" : ""
			}`,
		});

		// 설명
		contentContainer.createEl("p", {
			text: step.description,
			cls: "qp:text-sm qp:text-obs-text-muted qp:mb-4 qp:leading-relaxed",
		});

		// 스크린샷 (있는 경우)
		if (step.screenshot) {
			const imgContainer = contentContainer.createDiv({
				cls: "qp:mb-4 qp:rounded qp:overflow-hidden qp:border qp:border-obs-bg-modifier-border",
			});
			const img = imgContainer.createEl("img", {
				cls: "qp:w-full qp:h-auto",
			});
			img.src = step.screenshot;
			img.alt = step.title;
		}

		// 액션 버튼 (외부 링크)
		if (step.externalUrl && step.actionLabel) {
			const actionBtn = contentContainer.createEl("button", {
				text: step.actionLabel,
				cls: "qp:w-full qp:px-4 qp:py-3 qp:bg-obs-interactive-accent/10 qp:text-obs-interactive-accent qp:rounded qp:cursor-pointer hover:qp:bg-obs-interactive-accent/20 qp:transition-colors qp:font-medium",
			});
			actionBtn.addEventListener("click", () => {
				window.open(step.externalUrl, "_blank");
			});
		}
	}

	/**
	 * 팁 섹션을 렌더링합니다.
	 */
	private renderTips(container: HTMLElement, tips: string[]) {
		const tipsContainer = container.createDiv({
			cls: "qp:mb-6 qp:p-3 qp:bg-obs-interactive-accent/10 qp:rounded qp:border qp:border-obs-interactive-accent/20",
		});

		tipsContainer.createEl("span", {
			text: "💡",
			cls: "qp:mr-2",
		});

		const tipsList = tipsContainer.createEl("ul", {
			cls: "qp:text-sm qp:text-obs-text-accent qp:m-0 qp:pl-4",
		});

		tips.forEach((tip) => {
			tipsList.createEl("li", {
				text: tip,
				cls: "qp:mb-1",
			});
		});
	}

	/**
	 * 네비게이션 버튼을 렌더링합니다.
	 */
	private renderNavigation(container: HTMLElement, totalSteps: number) {
		const navContainer = container.createDiv({
			cls: "qp:flex qp:justify-between qp:gap-2 qp:pt-4 qp:border-t qp:border-obs-bg-modifier-border",
		});

		// 이전 버튼
		const backBtn = navContainer.createEl("button", {
			text: t("guide.back"),
			cls: "qp:px-4 qp:py-2",
		});
		backBtn.disabled = this.currentStep === 0;
		if (this.currentStep === 0) {
			backBtn.addClass("qp:opacity-50", "qp:cursor-not-allowed");
		}
		backBtn.addEventListener("click", () => {
			if (this.currentStep > 0) {
				this.currentStep--;
				this.render();
			}
		});

		// 문제 해결 버튼 (마지막 단계에서만 표시)
		const isLastStep = this.currentStep === totalSteps - 1;
		if (isLastStep) {
			const troubleshootBtn = navContainer.createEl("button", {
				text: t("guide.troubleshooting"),
				cls: "qp:px-4 qp:py-2",
			});
			troubleshootBtn.addEventListener("click", () => {
				this.showTroubleshooting = true;
				this.render();
			});
		}

		// 다음/완료 버튼
		const nextBtn = navContainer.createEl("button", {
			text: isLastStep ? t("guide.done") : t("guide.next"),
			cls: "mod-cta qp:px-4 qp:py-2",
		});
		nextBtn.addEventListener("click", () => {
			if (isLastStep) {
				this.close();
			} else {
				this.currentStep++;
				this.render();
			}
		});
	}

	/**
	 * 문제 해결 섹션을 렌더링합니다. (T031-T032)
	 */
	private renderTroubleshootingSection(container: HTMLElement) {
		// 헤더
		const headerContainer = container.createDiv({
			cls: "qp:flex qp:items-center qp:justify-between qp:mb-6",
		});

		headerContainer.createEl("h2", {
			text: t("guide.troubleshooting"),
			cls: "qp:text-lg qp:font-semibold qp:m-0",
		});

		// 뒤로가기 버튼
		const backBtn = headerContainer.createEl("button", {
			text: "← " + t("guide.back"),
			cls: "qp:text-sm qp:text-obs-text-muted qp:cursor-pointer hover:qp:text-obs-text-normal",
		});
		backBtn.addEventListener("click", () => {
			this.showTroubleshooting = false;
			this.render();
		});

		// 문제 해결 항목 목록
		const itemsContainer = container.createDiv({
			cls: "qp:space-y-4",
		});

		this.troubleshootingItems.forEach((item) => {
			const itemEl = itemsContainer.createDiv({
				cls: "qp:p-4 qp:bg-obs-bg-secondary qp:rounded qp:border qp:border-obs-bg-modifier-border",
			});

			// 오류 코드 배지
			const headerRow = itemEl.createDiv({
				cls: "qp:flex qp:items-center qp:gap-2 qp:mb-2",
			});

			headerRow.createEl("span", {
				text: item.errorMessage,
				cls: "qp:px-2 qp:py-1 qp:text-xs qp:font-mono qp:bg-obs-bg-modifier-error qp:text-obs-text-error qp:rounded",
			});

			// 관련 단계 표시
			if (item.relatedStep) {
				headerRow.createEl("span", {
					text: `→ ${t("guide.stepOf", {
						current: item.relatedStep,
						total: TOTAL_GUIDE_STEPS,
					})}`,
					cls: "qp:text-xs qp:text-obs-text-muted",
				});
			}

			// 원인
			const causeEl = itemEl.createDiv({
				cls: "qp:mb-2",
			});
			causeEl.createEl("span", {
				text: "⚠️ ",
				cls: "qp:mr-1",
			});
			causeEl.createEl("span", {
				text: item.cause,
				cls: "qp:text-sm qp:text-obs-text-muted",
			});

			// 해결 방법
			const solutionEl = itemEl.createDiv();
			solutionEl.createEl("span", {
				text: "✅ ",
				cls: "qp:mr-1",
			});
			solutionEl.createEl("span", {
				text: item.solution,
				cls: "qp:text-sm qp:text-obs-text-success qp:font-medium",
			});

			// 관련 단계로 이동 버튼
			if (item.relatedStep) {
				const goToStepBtn = itemEl.createEl("button", {
					text: t("guide.goToStep", {
						step: String(item.relatedStep),
					}),
					cls: "qp:mt-3 qp:text-sm qp:text-obs-text-accent qp:cursor-pointer hover:qp:text-obs-text-accent-hover",
				});
				goToStepBtn.addEventListener("click", () => {
					this.showTroubleshooting = false;
					this.currentStep = item.relatedStep! - 1;
					this.render();
				});
			}
		});

		// 닫기 버튼
		const closeContainer = container.createDiv({
			cls: "qp:flex qp:justify-end qp:mt-6 qp:pt-4 qp:border-t qp:border-obs-bg-modifier-border",
		});

		const closeBtn = closeContainer.createEl("button", {
			text: t("guide.close"),
			cls: "mod-cta qp:px-4 qp:py-2",
		});
		closeBtn.addEventListener("click", () => {
			this.close();
		});
	}
}
