/**
 * Dashboard Modal
 *
 * 노트 발행 상태를 확인하고 일괄 발행/삭제를 수행하는 대시보드 모달입니다.
 */

import { App, Modal, TFile, Notice, setIcon, setTooltip } from "obsidian";
import type {
	DashboardTab,
	DashboardState,
	StatusOverview,
	BatchPublishResult,
	UnpublishResult,
	NoteStatus,
} from "../types";
import { TAB_LABELS } from "../types";
import type { NetworkService } from "../services/network";
import { FileValidatorService } from "../services/file-validator";
import { LargeFileWarningModal } from "./large-file-warning-modal";
import { MAX_FILE_SIZE } from "../types";
import { t } from "../i18n";
import { cn } from "../utils/cn";
import { DiffModal } from "./diff-modal";

/**
 * 진행 상황 정보
 */
export interface ProgressInfo {
	current: number;
	total: number;
	currentFile: string;
	operation: "loading" | "publishing" | "deleting";
}

/**
 * 일괄 작업 결과 요약
 */
export interface OperationSummary {
	operation: "publish" | "delete";
	succeeded: number;
	failed: number;
	errors: Array<{ path: string; message: string }>;
}

/**
 * 대시보드 모달 옵션
 */
export interface DashboardModalOptions {
	/** 초기 활성 탭 */
	initialTab?: DashboardTab;
	/** 발행 콜백 */
	onPublish: (files: TFile[]) => Promise<BatchPublishResult>;
	/** 삭제 콜백 */
	onDelete: (files: TFile[]) => Promise<UnpublishResult[]>;
	/** 상태 개요 로드 콜백 */
	onLoadStatus: (
		onProgress?: (processed: number, total: number) => void,
	) => Promise<StatusOverview>;
	/** 네트워크 서비스 (오프라인 감지용) */
	networkService?: NetworkService;
	/** 원격 콘텐츠 조회 콜백 */
	onGetRemoteContent?: (file: TFile) => Promise<string | null>;
}

/**
 * 탭 키 목록
 */
const TAB_KEYS: DashboardTab[] = ["new", "modified", "deleted", "synced"];

/**
 * 대시보드 모달 클래스
 *
 * Obsidian Modal을 확장하여 노트 발행 상태 대시보드를 구현합니다.
 */
export class DashboardModal extends Modal {
	private options: DashboardModalOptions;
	private state: DashboardState;
	private progressInfo: ProgressInfo | null = null;
	private networkStatusUnsubscribe: (() => void) | null = null;
	private isOffline: boolean = false;
	private fileValidator: FileValidatorService;
	private refreshBtn: HTMLElement | null = null;

	constructor(app: App, options: DashboardModalOptions) {
		super(app);
		this.options = options;
		this.state = {
			activeTab: options.initialTab ?? "new",
			selectedPaths: new Set(),
			statusOverview: null,
			isLoading: false,
			isOperating: false,
			error: null,
		};

		// 네트워크 상태 초기화 및 리스너 등록
		if (options.networkService) {
			this.isOffline = !options.networkService.isOnline();
			this.networkStatusUnsubscribe =
				options.networkService.onStatusChange((status) => {
					this.isOffline = status === "offline";
					this.render();
				});
		}

		// 파일 검증 서비스 초기화
		this.fileValidator = new FileValidatorService();
	}

	/**
	 * 모달이 열릴 때 호출됩니다.
	 */
	async onOpen(): Promise<void> {
		const { contentEl, modalEl } = this;
		contentEl.empty();
		contentEl.addClass("quartz-publish-dashboard");
		modalEl.addClass("quartz-publish-dashboard-modal");

		// 상태 로딩
		await this.loadStatus();
	}

	/**
	 * 모달이 닫힐 때 호출됩니다.
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();

		// 네트워크 상태 리스너 정리
		if (this.networkStatusUnsubscribe) {
			this.networkStatusUnsubscribe();
			this.networkStatusUnsubscribe = null;
		}
	}

	/**
	 * 상태 개요를 새로고침합니다.
	 */
	async refresh(): Promise<void> {
		await this.loadStatus();
	}

	/**
	 * 상태 개요를 로드합니다.
	 */
	private async loadStatus(): Promise<void> {
		this.state.isLoading = true;
		this.state.error = null;
		this.setRefreshButtonLoading(true);
		this.render();

		try {
			const overview = await this.options.onLoadStatus(
				(processed, total) => {
					this.updateProgress({
						current: processed,
						total,
						currentFile: "",
						operation: "loading",
					});
				},
			);
			this.state.statusOverview = overview;
			this.progressInfo = null;
		} catch (error) {
			this.state.error =
				error instanceof Error ? error.message : "Unknown error";
		} finally {
			this.state.isLoading = false;
			this.setRefreshButtonLoading(false);
			this.render();
		}
	}

	/**
	 * 새로고침 버튼의 로딩 상태를 설정합니다.
	 */
	private setRefreshButtonLoading(isLoading: boolean): void {
		if (!this.refreshBtn) return;

		const svg = this.refreshBtn.querySelector("svg");
		if (isLoading) {
			if (svg) svg.classList.add("qp-animate-spin");
			this.refreshBtn.addClass("pointer-events-none");
			this.refreshBtn.setAttribute("aria-disabled", "true");
		} else {
			if (svg) svg.classList.remove("qp-animate-spin");
			this.refreshBtn.removeClass("pointer-events-none");
			this.refreshBtn.removeAttribute("aria-disabled");
		}
	}

	/**
	 * 탭을 전환합니다.
	 */
	private switchTab(tab: DashboardTab): void {
		this.state.activeTab = tab;
		this.state.selectedPaths.clear();
		this.render();
	}

	/**
	 * 노트 선택을 토글합니다.
	 */
	private toggleSelection(path: string): void {
		if (this.state.selectedPaths.has(path)) {
			this.state.selectedPaths.delete(path);
		} else {
			this.state.selectedPaths.add(path);
		}
		this.render();
	}

	/**
	 * 전체 선택/해제를 토글합니다.
	 */
	private toggleSelectAll(): void {
		const currentNotes = this.getCurrentTabNotes();
		const allSelected = currentNotes.every((note) =>
			this.state.selectedPaths.has(note.file.path),
		);

		if (allSelected) {
			// 전체 해제
			currentNotes.forEach((note) =>
				this.state.selectedPaths.delete(note.file.path),
			);
		} else {
			// 전체 선택
			currentNotes.forEach((note) =>
				this.state.selectedPaths.add(note.file.path),
			);
		}
		this.render();
	}

	/**
	 * 현재 탭의 노트 목록을 반환합니다.
	 */
	private getCurrentTabNotes(): NoteStatus[] {
		if (!this.state.statusOverview) return [];
		return this.state.statusOverview[this.state.activeTab] ?? [];
	}

	/**
	 * 선택된 노트를 발행합니다.
	 */
	private async publishSelected(): Promise<void> {
		if (this.state.selectedPaths.size === 0) return;

		// 네트워크 연결 확인
		if (this.isOffline) {
			new Notice(t("notice.network.offline"));
			return;
		}

		const currentNotes = this.getCurrentTabNotes();
		const selectedFiles = currentNotes
			.filter((note) => this.state.selectedPaths.has(note.file.path))
			.map((note) => note.file);

		if (selectedFiles.length === 0) return;

		// 대용량 파일 검사
		const largeFiles = this.fileValidator.findLargeFiles(selectedFiles);
		if (largeFiles.length > 0) {
			const confirmed = await new LargeFileWarningModal(this.app, {
				largeFiles,
				maxFileSize: MAX_FILE_SIZE,
			}).waitForConfirmation();

			if (!confirmed) return;
		}

		this.state.isOperating = true;
		this.render();

		try {
			const result = await this.options.onPublish(selectedFiles);

			// 결과 표시
			if (result.failed > 0) {
				new Notice(
					t("notice.batch.partial", {
						succeeded: result.succeeded,
						failed: result.failed,
					}),
				);
			} else {
				new Notice(
					t("notice.batch.success", { count: result.succeeded }),
				);
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("error.unknown");
			new Notice(t("notice.publish.error", { message }));
		} finally {
			this.state.isOperating = false;
			this.render();
		}
	}

	/**
	 * 선택된 노트를 삭제합니다.
	 */
	private async deleteSelected(): Promise<void> {
		if (this.state.selectedPaths.size === 0) return;

		// 네트워크 연결 확인
		if (this.isOffline) {
			new Notice(t("notice.network.offline"));
			return;
		}

		const currentNotes = this.getCurrentTabNotes();
		const selectedFiles = currentNotes
			.filter((note) => this.state.selectedPaths.has(note.file.path))
			.map((note) => note.file);

		if (selectedFiles.length === 0) return;

		// 확인 모달 표시
		const confirmed = await new ConfirmModal(this.app, {
			title: t("modal.delete.title"),
			message: t("modal.delete.message", { count: selectedFiles.length }),
			confirmText: t("dashboard.action.delete"),
			cancelText: t("modal.confirm.cancel"),
			isDangerous: true,
		}).waitForConfirmation();

		if (!confirmed) return;

		this.state.isOperating = true;
		this.render();

		try {
			const results = await this.options.onDelete(selectedFiles);

			const succeeded = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;

			if (failed > 0) {
				new Notice(t("notice.delete.partial", { succeeded, failed }));
			} else {
				new Notice(t("notice.delete.success", { count: succeeded }));
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("error.unknown");
			new Notice(t("notice.publish.error", { message }));
		} finally {
			this.state.isOperating = false;
			this.render();
		}
	}

	/**
	 * 전체 동기화를 실행합니다.
	 * 신규 발행 + 수정된 노트 업데이트 + 삭제할 노트 삭제
	 */
	private async syncAll(): Promise<void> {
		if (!this.state.statusOverview) return;

		// 네트워크 연결 확인
		if (this.isOffline) {
			new Notice(t("notice.network.offline"));
			return;
		}

		const { new: newNotes, modified, deleted } = this.state.statusOverview;

		const toPublish = [...newNotes, ...modified];
		const toDelete = deleted;

		// 작업할 내용이 없으면 리턴
		if (toPublish.length === 0 && toDelete.length === 0) {
			new Notice(t("notice.sync.noChanges"));
			return;
		}

		// 대용량 파일 검사 (발행할 파일만)
		if (toPublish.length > 0) {
			const publishFiles = toPublish.map((note) => note.file);
			const largeFiles = this.fileValidator.findLargeFiles(publishFiles);
			if (largeFiles.length > 0) {
				const confirmed = await new LargeFileWarningModal(this.app, {
					largeFiles,
					maxFileSize: MAX_FILE_SIZE,
				}).waitForConfirmation();

				if (!confirmed) return;
			}
		}

		// 삭제가 포함된 경우 확인 모달 표시
		if (toDelete.length > 0) {
			const confirmed = await new ConfirmModal(this.app, {
				title: t("modal.sync.title"),
				message: t("modal.sync.message", {
					newCount: newNotes.length,
					modifiedCount: modified.length,
					deleteCount: toDelete.length,
				}),
				confirmText: t("dashboard.action.syncAll"),
				cancelText: t("modal.confirm.cancel"),
				isDangerous: true,
			}).waitForConfirmation();

			if (!confirmed) return;
		}

		this.state.isOperating = true;
		this.render();

		try {
			let publishSucceeded = 0;
			let publishFailed = 0;
			let deleteSucceeded = 0;
			let deleteFailed = 0;

			// 1. 발행 (신규 + 수정)
			if (toPublish.length > 0) {
				const publishFiles = toPublish.map((note) => note.file);
				const publishResult =
					await this.options.onPublish(publishFiles);
				publishSucceeded = publishResult.succeeded;
				publishFailed = publishResult.failed;
			}

			// 2. 삭제
			if (toDelete.length > 0) {
				const deleteFiles = toDelete.map((note) => note.file);
				const deleteResults = await this.options.onDelete(deleteFiles);
				deleteSucceeded = deleteResults.filter((r) => r.success).length;
				deleteFailed = deleteResults.filter((r) => !r.success).length;
			}

			// 결과 요약
			const totalSucceeded = publishSucceeded + deleteSucceeded;
			const totalFailed = publishFailed + deleteFailed;

			if (totalFailed > 0) {
				new Notice(
					t("notice.batch.partial", {
						succeeded: totalSucceeded,
						failed: totalFailed,
					}),
				);
			} else {
				new Notice(t("notice.sync.success", { count: totalSucceeded }));
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("error.unknown");
			new Notice(t("notice.publish.error", { message }));
		} finally {
			this.state.isOperating = false;
			this.render();
		}
	}

	/**
	 * 진행률을 업데이트합니다.
	 */
	private updateProgress(info: ProgressInfo): void {
		this.progressInfo = info;
		this.renderProgress();
	}

	/**
	 * 진행률 UI만 업데이트합니다.
	 */
	private renderProgress(): void {
		const progressEl = this.contentEl.querySelector(
			".quartz-publish-loading-progress",
		);
		if (!progressEl || !this.progressInfo) return;

		const percentage =
			this.progressInfo.total > 0
				? Math.round(
						(this.progressInfo.current / this.progressInfo.total) *
							100,
					)
				: 0;

		const progressBar = progressEl.querySelector(
			".quartz-publish-progress-bar",
		) as HTMLElement;
		if (progressBar) {
			progressBar.style.width = `${percentage}%`;
		}

		const progressText = progressEl.querySelector(
			".quartz-publish-loading-text",
		);
		if (progressText) {
			progressText.textContent = `${t("dashboard.status.loading")} ${this.progressInfo.current}/${this.progressInfo.total}`;
		}
	}

	/**
	 * UI를 렌더링합니다.
	 */
	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		// 로딩 상태
		if (this.state.isLoading) {
			this.renderLoading();
			return;
		}

		// 에러 상태
		if (this.state.error) {
			this.renderError();
			return;
		}

		// 헤더
		this.renderHeader();

		// 탭
		this.renderTabs();

		// 노트 목록
		this.renderNoteList();

		// 액션 버튼
		this.renderActions();
	}

	/**
	 * 로딩 UI를 렌더링합니다.
	 */
	private renderLoading(): void {
		const { contentEl } = this;
		const loadingEl = contentEl.createDiv({
			cls: "quartz-publish-loading",
			attr: {
				role: "status",
				"aria-live": "polite",
				"aria-busy": "true",
			},
		});

		loadingEl.createDiv({
			cls: "quartz-publish-loading-spinner",
			attr: {
				"aria-hidden": "true",
			},
		});
		loadingEl.createDiv({
			cls: "quartz-publish-loading-text",
			text: t("dashboard.status.loading"),
		});

		// 프로그레스 바
		const progressEl = loadingEl.createDiv({
			cls: "quartz-publish-loading-progress w-full mt-4",
		});
		const progressBarContainer = progressEl.createDiv({
			cls: "quartz-publish-progress",
		});
		progressBarContainer.createDiv({
			cls: "quartz-publish-progress-bar",
		});
	}

	/**
	 * 에러 메시지를 사용자 친화적으로 변환합니다.
	 */
	private formatErrorMessage(error: string): {
		title: string;
		message: string;
		suggestion: string;
	} {
		// 네트워크 오류
		if (
			error.includes("fetch") ||
			error.includes("network") ||
			error.includes("NetworkError") ||
			error.includes("Failed to fetch")
		) {
			return {
				title: t("error.formatted.network"),
				message: t("error.formatted.networkMessage"),
				suggestion: t("error.formatted.networkSuggestion"),
			};
		}

		// GitHub Rate Limit
		if (
			error.includes("rate limit") ||
			error.includes("403") ||
			error.includes("API rate limit exceeded")
		) {
			return {
				title: t("error.formatted.rateLimit"),
				message: t("error.formatted.rateLimitMessage"),
				suggestion: t("error.formatted.rateLimitSuggestion"),
			};
		}

		// 인증 오류
		if (
			error.includes("401") ||
			error.includes("Unauthorized") ||
			error.includes("Bad credentials")
		) {
			return {
				title: t("error.formatted.auth"),
				message: t("error.formatted.authMessage"),
				suggestion: t("error.formatted.authSuggestion"),
			};
		}

		// 권한 오류
		if (error.includes("404") || error.includes("Not Found")) {
			return {
				title: t("error.formatted.notFound"),
				message: t("error.formatted.notFoundMessage"),
				suggestion: t("error.formatted.notFoundSuggestion"),
			};
		}

		// 기본 오류
		return {
			title: t("error.formatted.default"),
			message: error,
			suggestion: t("error.formatted.defaultSuggestion"),
		};
	}

	/**
	 * 에러 UI를 렌더링합니다.
	 */
	private renderError(): void {
		const { contentEl } = this;
		const errorInfo = this.formatErrorMessage(this.state.error ?? "");

		const errorEl = contentEl.createDiv({
			cls: "quartz-publish-result-summary quartz-publish-result-summary--error",
			attr: { role: "alert", "aria-live": "assertive" },
		});

		errorEl.createDiv({
			cls: "quartz-publish-result-summary-title",
			text: errorInfo.title,
		});

		errorEl.createDiv({
			cls: "quartz-publish-result-summary-stats",
			text: errorInfo.message,
		});

		errorEl.createDiv({
			cls: "text-sm mt-2 text-obs-text-muted",
			text: errorInfo.suggestion,
		});

		// 다시 시도 버튼
		const buttonEl = errorEl.createEl("button", {
			text: t("error.formatted.retry"),
			cls: "mod-cta mt-4",
			attr: { "aria-label": t("error.formatted.retry") },
		});
		buttonEl.addEventListener("click", () => this.loadStatus());
	}

	/**
	 * 헤더를 렌더링합니다.
	 */
	private renderHeader(): void {
		const { contentEl } = this;
		const headerEl = contentEl.createDiv({
			cls: "quartz-publish-dashboard-header",
		});

		// 제목과 오프라인 표시기를 포함하는 컨테이너
		const titleContainer = headerEl.createDiv({
			cls: "flex items-center gap-2",
		});

		titleContainer.createEl("h2", {
			text: t("dashboard.title"),
			cls: "quartz-publish-dashboard-title",
		});

		// 새로고침 버튼 (아이콘 버튼)
		this.refreshBtn = titleContainer.createDiv({
			cls: "clickable-icon",
			attr: {
				"aria-label": t("dashboard.action.refresh"),
				role: "button",
				tabindex: "0",
			},
		});
		setIcon(this.refreshBtn, "refresh-cw");
		setTooltip(this.refreshBtn, t("dashboard.action.refresh"));

		// 로딩 상태일 때 애니메이션 적용
		if (this.state.isLoading) {
			const svg = this.refreshBtn.querySelector("svg");
			if (svg) svg.classList.add("qp-animate-spin");
			this.refreshBtn.addClass("pointer-events-none");
			this.refreshBtn.setAttribute("aria-disabled", "true");
		}

		this.refreshBtn.addEventListener("click", () => this.refresh());
		this.refreshBtn.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				this.refresh();
			}
		});

		// 오프라인 상태 표시기
		if (this.isOffline) {
			const offlineIndicator = titleContainer.createSpan({
				cls: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-obs-bg-modifier-error text-obs-text-error",
				attr: {
					role: "status",
					"aria-live": "polite",
					"aria-label": t("notice.network.offline"),
				},
			});
			offlineIndicator.createSpan({ text: "●", cls: "text-[8px]" });
			offlineIndicator.createSpan({
				text: t("dashboard.status.offline"),
			});
		}
	}

	/**
	 * 탭을 렌더링합니다.
	 */
	private renderTabs(): void {
		const { contentEl } = this;
		const tabsEl = contentEl.createDiv({
			cls: "quartz-publish-tabs",
			attr: { role: "tablist", "aria-label": t("dashboard.aria.tabs") },
		});

		TAB_KEYS.forEach((tabKey, index) => {
			const count = this.getTabCount(tabKey);
			const isActive = this.state.activeTab === tabKey;

			const tabEl = tabsEl.createEl("button", {
				cls: cn(
					"quartz-publish-tab",
					isActive && "quartz-publish-tab--active",
				),
				attr: {
					role: "tab",
					"aria-selected": String(isActive),
					"aria-controls": `tabpanel-${tabKey}`,
					id: `tab-${tabKey}`,
					tabindex: isActive ? "0" : "-1",
				},
			});

			tabEl.createSpan({ text: TAB_LABELS[tabKey] });
			tabEl.createSpan({
				text: String(count),
				cls: "quartz-publish-tab-badge",
				attr: {
					"aria-label": t("dashboard.aria.itemCount", {
						count: String(count),
					}),
				},
			});

			tabEl.addEventListener("click", () => this.switchTab(tabKey));

			// 키보드 네비게이션
			tabEl.addEventListener("keydown", (e) => {
				this.handleTabKeydown(e, index);
			});
		});

		// 탭 설명 추가
		this.renderTabDescription();
	}

	/**
	 * 현재 선택된 탭의 설명을 렌더링합니다.
	 */
	private renderTabDescription(): void {
		const { contentEl } = this;
		const description = this.getTabDescription();

		contentEl.createDiv({
			cls: "quartz-publish-tab-description",
			text: description,
		});
	}

	/**
	 * 현재 선택된 탭의 설명을 반환합니다.
	 */
	private getTabDescription(): string {
		const descriptions: Record<DashboardTab, string> = {
			new: t("dashboard.tabDescription.new"),
			modified: t("dashboard.tabDescription.modified"),
			deleted: t("dashboard.tabDescription.deleted"),
			synced: t("dashboard.tabDescription.synced"),
		};
		return descriptions[this.state.activeTab];
	}

	/**
	 * 탭 키보드 네비게이션을 처리합니다.
	 */
	private handleTabKeydown(e: KeyboardEvent, currentIndex: number): void {
		let newIndex = currentIndex;

		switch (e.key) {
			case "ArrowLeft":
				newIndex =
					currentIndex === 0 ? TAB_KEYS.length - 1 : currentIndex - 1;
				break;
			case "ArrowRight":
				newIndex =
					currentIndex === TAB_KEYS.length - 1 ? 0 : currentIndex + 1;
				break;
			case "Home":
				newIndex = 0;
				break;
			case "End":
				newIndex = TAB_KEYS.length - 1;
				break;
			default:
				return;
		}

		e.preventDefault();
		const newTab = TAB_KEYS[newIndex];
		this.switchTab(newTab);

		// 새 탭에 포커스 이동
		const newTabEl = this.contentEl.querySelector(
			`#tab-${newTab}`,
		) as HTMLElement;
		newTabEl?.focus();
	}

	/**
	 * 탭별 노트 개수를 반환합니다.
	 */
	private getTabCount(tab: DashboardTab): number {
		if (!this.state.statusOverview) return 0;
		return this.state.statusOverview[tab]?.length ?? 0;
	}

	/**
	 * 한글 파일명이 포함된 노트가 있는지 확인합니다.
	 */
	private hasKoreanFilename(notes: NoteStatus[]): boolean {
		return notes.some((note) => {
			const basename = note.file.basename || "";
			// 한글 유니코드 범위: 가-힣 (Hangul Syllables)
			return /[\uAC00-\uD7AF]/.test(basename);
		});
	}

	/**
	 * 노트 목록을 렌더링합니다.
	 */
	private renderNoteList(): void {
		const { contentEl } = this;
		const notes = this.getCurrentTabNotes();

		const listEl = contentEl.createDiv({
			cls: "quartz-publish-note-list",
			attr: {
				role: "tabpanel",
				id: `tabpanel-${this.state.activeTab}`,
				"aria-labelledby": `tab-${this.state.activeTab}`,
				"aria-live": "polite",
			},
		});

		// 목록 헤더 (전체 선택)
		if (notes.length > 0) {
			const headerEl = listEl.createDiv({
				cls: "quartz-publish-note-list-header",
			});

			const allSelected =
				notes.length > 0 &&
				notes.every((note) =>
					this.state.selectedPaths.has(note.file.path),
				);

			const checkboxEl = headerEl.createEl("input", {
				attr: {
					type: "checkbox",
					"aria-label": t("dashboard.selectAll", {
						count: notes.length,
					}),
				},
			}) as HTMLInputElement;
			checkboxEl.checked = allSelected;
			checkboxEl.addEventListener("change", () => this.toggleSelectAll());

			headerEl.createSpan({
				text: t("dashboard.selectAll", { count: notes.length }),
				attr: { id: "select-all-label" },
			});
		}

		// 빈 목록
		if (notes.length === 0) {
			listEl.createDiv({
				cls: "quartz-publish-note-list-empty",
				text: this.getEmptyMessage(),
				attr: {
					role: "status",
					"aria-live": "polite",
				},
			});
			return;
		}

		// 노트 목록
		notes.forEach((note) => this.renderNoteItem(listEl, note));
	}

	/**
	 * 빈 목록 메시지를 반환합니다.
	 */
	private getEmptyMessage(): string {
		switch (this.state.activeTab) {
			case "new":
				return t("dashboard.empty.new");
			case "modified":
				return t("dashboard.empty.modified");
			case "deleted":
				return t("dashboard.empty.deleted");
			case "synced":
				return t("dashboard.empty.synced");
			default:
				return t("dashboard.empty.new");
		}
	}

	/**
	 * 개별 노트 항목을 렌더링합니다.
	 */
	private renderNoteItem(container: HTMLElement, note: NoteStatus): void {
		const isSelected = this.state.selectedPaths.has(note.file.path);
		const noteName =
			note.file.basename || note.file.path.split("/").pop() || "Untitled";
		const itemEl = container.createDiv({
			cls: cn(
				"quartz-publish-note-item",
				isSelected && "quartz-publish-note-item--selected",
			),
		});

		// 체크박스
		const selectLabel = t("dashboard.aria.selectNote", { name: noteName });
		const checkboxEl = itemEl.createEl("input", {
			attr: {
				type: "checkbox",
				"aria-label": selectLabel,
			},
			cls: "mr-3",
		}) as HTMLInputElement;
		checkboxEl.checked = isSelected;
		checkboxEl.addEventListener("change", () =>
			this.toggleSelection(note.file.path),
		);

		// 노트 정보
		const infoEl = itemEl.createDiv({ cls: "flex-1 min-w-0" });

		// 파일명
		infoEl.createDiv({
			text: note.file.basename || note.file.path.split("/").pop(),
			cls: "font-medium truncate",
		});

		// 경로
		infoEl.createDiv({
			text: note.file.path,
			cls: "text-xs text-obs-text-muted truncate",
		});

		// 상태 뱃지
		const badge = itemEl.createSpan({
			text: TAB_LABELS[note.status as DashboardTab] ?? note.status,
			cls: `quartz-publish-status-badge quartz-publish-status-badge--${note.status}`,
		});

		// 수정된 항목인 경우 클릭 이벤트 추가 (Diff View) (T066)
		if (note.status === "modified") {
			itemEl.addClass("quartz-publish-note-item--clickable");
			itemEl.addEventListener("click", (e) => {
				// 체크박스 클릭 시에는 동작하지 않음
				if ((e.target as HTMLElement).tagName === "INPUT") return;
				this.openDiffView(note.file);
			});
			setTooltip(badge, t("dashboard.tooltip.diff"));
		}
	}

	/**
	 * Diff View를 엽니다. (T066)
	 */
	private async openDiffView(file: TFile): Promise<void> {
		if (!this.options.onGetRemoteContent) return;

		// 네트워크 연결 확인
		if (this.isOffline) {
			new Notice(t("notice.network.offline"));
			return;
		}

		this.state.isLoading = true;
		this.render();

		try {
			// 1. 로컬 콘텐츠 읽기
			const localContent = await this.app.vault.read(file);

			// 2. 원격 콘텐츠 읽기
			const remoteContent = await this.options.onGetRemoteContent(file);

			if (remoteContent === null) {
				// 파일이 존재하지 않을 때 명확한 안내 모달 표시
				const confirmed = await new ConfirmModal(this.app, {
					title: t("modal.fileNotFound.title"),
					message: t("modal.fileNotFound.message", { fileName: file.basename }),
					confirmText: t("dashboard.action.publish"),
					cancelText: t("modal.confirm.cancel"),
				}).waitForConfirmation();

				if (confirmed) {
					// 발행 로직 수행 (선택된 파일만 발행)
					await this.publishSingleFile(file);
				}
				return;
			}

			// 3. Diff Modal 열기
			new DiffModal(this.app, {
				fileName: file.basename,
				originalContent: remoteContent,
				modifiedContent: localContent,
			}).open();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("error.unknown");
			new Notice(t("error.diffFailed", { message }));
		} finally {
			this.state.isLoading = false;
			this.render();
		}
	}

	/**
	 * 단일 파일 발행 (Diff View에서 파일을 찾지 못했을 때)
	 */
	private async publishSingleFile(file: TFile): Promise<void> {
		const result = await this.options.onPublish([file]);

		if (result.failed > 0) {
			new Notice(
				t("notice.batch.partial", {
					succeeded: result.succeeded,
					failed: result.failed,
				}),
			);
		} else {
			new Notice(
				t("notice.batch.success", { count: result.succeeded }),
			);
		}

		// 상태 새로고침
		await this.loadStatus();
	}

	/**
	 * 액션 버튼을 렌더링합니다.
	 */
	private renderActions(): void {
		const { contentEl } = this;
		const actionsEl = contentEl.createDiv({
			cls: "quartz-publish-actions",
			attr: {
				role: "toolbar",
				"aria-label": t("dashboard.aria.toolbar"),
			},
		});

		const leftEl = actionsEl.createDiv({
			cls: "quartz-publish-actions-left",
		});
		const rightEl = actionsEl.createDiv({
			cls: "quartz-publish-actions-right",
		});

		// 선택된 항목 개수
		const selectedCount = this.state.selectedPaths.size;
		if (selectedCount > 0) {
			leftEl.createSpan({
				text: t("dashboard.selected", { count: selectedCount }),
				cls: "text-sm text-obs-text-muted",
				attr: { "aria-live": "polite" },
			});
		}

		// 닫기 버튼
		const closeBtn = rightEl.createEl("button", {
			text: t("dashboard.action.close"),
			attr: { "aria-label": t("dashboard.action.close") },
		});
		closeBtn.addEventListener("click", () => this.close());

		// 전체 동기화 버튼 (항상 표시)
		const hasPendingChanges = this.hasPendingChanges();
		const pendingCount = this.getPendingChangesCount();
		const syncAllBtn = rightEl.createEl("button", {
			text: t("dashboard.action.syncAll"),
			attr: {
				"aria-label": hasPendingChanges
					? `${t("dashboard.action.syncAll")}: ${pendingCount}`
					: t("notice.sync.noChanges"),
			},
		});
		syncAllBtn.disabled = !hasPendingChanges || this.state.isOperating;
		syncAllBtn.addEventListener("click", () => this.syncAll());

		// 발행/삭제 버튼 (탭에 따라 다름)
		if (this.state.activeTab === "deleted") {
			const deleteBtn = rightEl.createEl("button", {
				text: t("dashboard.action.delete"),
				cls: "mod-warning",
				attr: {
					"aria-label":
						selectedCount > 0
							? `${t("dashboard.action.delete")}: ${selectedCount}`
							: t("dashboard.action.delete"),
				},
			});
			deleteBtn.disabled = selectedCount === 0 || this.state.isOperating;
			deleteBtn.addEventListener("click", () => this.deleteSelected());
		} else if (
			this.state.activeTab === "new" ||
			this.state.activeTab === "modified"
		) {
			const publishBtn = rightEl.createEl("button", {
				text: t("dashboard.action.publish"),
				cls: "mod-cta",
				attr: {
					"aria-label":
						selectedCount > 0
							? `${t("dashboard.action.publish")}: ${selectedCount}`
							: t("dashboard.action.publish"),
				},
			});
			publishBtn.disabled = selectedCount === 0 || this.state.isOperating;
			publishBtn.addEventListener("click", () => this.publishSelected());
		}
	}

	/**
	 * 동기화 대기 중인 변경사항 총 개수를 반환합니다.
	 */
	private getPendingChangesCount(): number {
		if (!this.state.statusOverview) return 0;
		const { new: newNotes, modified, deleted } = this.state.statusOverview;
		return newNotes.length + modified.length + deleted.length;
	}

	/**
	 * 동기화가 필요한 변경사항이 있는지 확인합니다.
	 */
	private hasPendingChanges(): boolean {
		if (!this.state.statusOverview) return false;
		const { new: newNotes, modified, deleted } = this.state.statusOverview;
		return newNotes.length > 0 || modified.length > 0 || deleted.length > 0;
	}
}

/**
 * 확인 모달 클래스
 *
 * 삭제 확인 등의 확인 대화상자를 표시합니다.
 */
export class ConfirmModal extends Modal {
	private title: string;
	private message: string;
	private confirmText: string;
	private cancelText: string;
	private isDangerous: boolean;
	private resolvePromise: ((value: boolean) => void) | null = null;

	constructor(
		app: App,
		options: {
			title: string;
			message: string;
			confirmText?: string;
			cancelText?: string;
			isDangerous?: boolean;
		},
	) {
		super(app);
		this.title = options.title;
		this.message = options.message;
		this.confirmText = options.confirmText ?? t("modal.confirm.ok");
		this.cancelText = options.cancelText ?? t("modal.confirm.cancel");
		this.isDangerous = options.isDangerous ?? false;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: this.title });
		contentEl.createEl("p", { text: this.message });

		const buttonContainer = contentEl.createDiv({
			cls: "flex justify-end gap-2 mt-4",
		});

		const cancelBtn = buttonContainer.createEl("button", {
			text: this.cancelText,
			attr: { "aria-label": this.cancelText },
		});
		cancelBtn.addEventListener("click", () => {
			this.resolvePromise?.(false);
			this.close();
		});

		const confirmBtn = buttonContainer.createEl("button", {
			text: this.confirmText,
			cls: this.isDangerous ? "mod-warning" : "mod-cta",
			attr: { "aria-label": this.confirmText },
		});
		confirmBtn.addEventListener("click", () => {
			this.resolvePromise?.(true);
			this.close();
		});

		// 위험한 작업일 경우 취소 버튼에, 그렇지 않으면 확인 버튼에 포커스
		setTimeout(() => {
			(this.isDangerous ? cancelBtn : confirmBtn).focus();
		}, 50);
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.resolvePromise?.(false);
	}

	/**
	 * 모달을 열고 사용자의 선택을 기다립니다.
	 *
	 * @returns 사용자가 확인을 선택하면 true, 취소하면 false
	 */
	waitForConfirmation(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}
