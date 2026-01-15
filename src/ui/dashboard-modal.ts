/**
 * Dashboard Modal
 *
 * 노트 발행 상태를 확인하고 일괄 발행/삭제를 수행하는 대시보드 모달입니다.
 */

import { App, Modal, TFile, Notice } from 'obsidian';
import type {
	DashboardTab,
	DashboardState,
	StatusOverview,
	BatchPublishResult,
	UnpublishResult,
	NoteStatus,
} from '../types';
import { TAB_LABELS } from '../types';

/**
 * 진행 상황 정보
 */
export interface ProgressInfo {
	current: number;
	total: number;
	currentFile: string;
	operation: 'loading' | 'publishing' | 'deleting';
}

/**
 * 일괄 작업 결과 요약
 */
export interface OperationSummary {
	operation: 'publish' | 'delete';
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
		onProgress?: (processed: number, total: number) => void
	) => Promise<StatusOverview>;
}

/**
 * 탭 키 목록
 */
const TAB_KEYS: DashboardTab[] = ['new', 'modified', 'deleted', 'synced'];

/**
 * 대시보드 모달 클래스
 *
 * Obsidian Modal을 확장하여 노트 발행 상태 대시보드를 구현합니다.
 */
export class DashboardModal extends Modal {
	private options: DashboardModalOptions;
	private state: DashboardState;
	private progressInfo: ProgressInfo | null = null;

	constructor(app: App, options: DashboardModalOptions) {
		super(app);
		this.options = options;
		this.state = {
			activeTab: options.initialTab ?? 'new',
			selectedPaths: new Set(),
			statusOverview: null,
			isLoading: false,
			isOperating: false,
			error: null,
		};
	}

	/**
	 * 모달이 열릴 때 호출됩니다.
	 */
	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('quartz-publish-dashboard');

		// 상태 로딩
		await this.loadStatus();
	}

	/**
	 * 모달이 닫힐 때 호출됩니다.
	 */
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
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
		this.render();

		try {
			const overview = await this.options.onLoadStatus((processed, total) => {
				this.updateProgress({
					current: processed,
					total,
					currentFile: '',
					operation: 'loading',
				});
			});
			this.state.statusOverview = overview;
			this.progressInfo = null;
		} catch (error) {
			this.state.error =
				error instanceof Error ? error.message : 'Unknown error';
		} finally {
			this.state.isLoading = false;
			this.render();
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
			this.state.selectedPaths.has(note.file.path)
		);

		if (allSelected) {
			// 전체 해제
			currentNotes.forEach((note) =>
				this.state.selectedPaths.delete(note.file.path)
			);
		} else {
			// 전체 선택
			currentNotes.forEach((note) =>
				this.state.selectedPaths.add(note.file.path)
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

		const currentNotes = this.getCurrentTabNotes();
		const selectedFiles = currentNotes
			.filter((note) => this.state.selectedPaths.has(note.file.path))
			.map((note) => note.file);

		if (selectedFiles.length === 0) return;

		this.state.isOperating = true;
		this.render();

		try {
			const result = await this.options.onPublish(selectedFiles);

			// 결과 표시
			if (result.failed > 0) {
				new Notice(
					`발행 완료: ${result.succeeded}개 성공, ${result.failed}개 실패`
				);
			} else {
				new Notice(`${result.succeeded}개 노트가 발행되었습니다.`);
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			new Notice(`발행 오류: ${message}`);
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

		const currentNotes = this.getCurrentTabNotes();
		const selectedFiles = currentNotes
			.filter((note) => this.state.selectedPaths.has(note.file.path))
			.map((note) => note.file);

		if (selectedFiles.length === 0) return;

		// 확인 모달 표시
		const confirmed = await new ConfirmModal(this.app, {
			title: '삭제 확인',
			message: `${selectedFiles.length}개의 노트를 GitHub에서 삭제하시겠습니까?`,
			confirmText: '삭제',
			cancelText: '취소',
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
				new Notice(`삭제 완료: ${succeeded}개 성공, ${failed}개 실패`);
			} else {
				new Notice(`${succeeded}개 노트가 삭제되었습니다.`);
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			new Notice(`삭제 오류: ${message}`);
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

		const { new: newNotes, modified, deleted } = this.state.statusOverview;

		const toPublish = [...newNotes, ...modified];
		const toDelete = deleted;

		// 작업할 내용이 없으면 리턴
		if (toPublish.length === 0 && toDelete.length === 0) {
			new Notice('동기화할 변경사항이 없습니다.');
			return;
		}

		// 삭제가 포함된 경우 확인 모달 표시
		if (toDelete.length > 0) {
			const confirmed = await new ConfirmModal(this.app, {
				title: '전체 동기화 확인',
				message: `신규 ${newNotes.length}개, 수정 ${modified.length}개 발행 및 ${toDelete.length}개 삭제를 진행하시겠습니까?`,
				confirmText: '동기화',
				cancelText: '취소',
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
				const publishResult = await this.options.onPublish(publishFiles);
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
					`동기화 완료: ${totalSucceeded}개 성공, ${totalFailed}개 실패`
				);
			} else {
				new Notice(`${totalSucceeded}개 항목이 동기화되었습니다.`);
			}

			// 상태 새로고침
			this.state.selectedPaths.clear();
			await this.loadStatus();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error';
			new Notice(`동기화 오류: ${message}`);
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
			'.quartz-publish-loading-progress'
		);
		if (!progressEl || !this.progressInfo) return;

		const percentage =
			this.progressInfo.total > 0
				? Math.round(
						(this.progressInfo.current / this.progressInfo.total) * 100
					)
				: 0;

		const progressBar = progressEl.querySelector(
			'.quartz-publish-progress-bar'
		) as HTMLElement;
		if (progressBar) {
			progressBar.style.width = `${percentage}%`;
		}

		const progressText = progressEl.querySelector(
			'.quartz-publish-loading-text'
		);
		if (progressText) {
			progressText.textContent = `상태 확인 중... ${this.progressInfo.current}/${this.progressInfo.total}`;
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
		const loadingEl = contentEl.createDiv({ cls: 'quartz-publish-loading' });

		loadingEl.createDiv({ cls: 'quartz-publish-loading-spinner' });
		loadingEl.createDiv({
			cls: 'quartz-publish-loading-text',
			text: '상태 확인 중...',
		});

		// 프로그레스 바
		const progressEl = loadingEl.createDiv({
			cls: 'quartz-publish-loading-progress hn:w-full hn:mt-4',
		});
		const progressBarContainer = progressEl.createDiv({
			cls: 'quartz-publish-progress',
		});
		progressBarContainer.createDiv({
			cls: 'quartz-publish-progress-bar',
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
			error.includes('fetch') ||
			error.includes('network') ||
			error.includes('NetworkError') ||
			error.includes('Failed to fetch')
		) {
			return {
				title: '네트워크 연결 오류',
				message: '서버에 연결할 수 없습니다.',
				suggestion: '인터넷 연결을 확인하고 다시 시도해주세요.',
			};
		}

		// GitHub Rate Limit
		if (
			error.includes('rate limit') ||
			error.includes('403') ||
			error.includes('API rate limit exceeded')
		) {
			return {
				title: 'GitHub API 제한',
				message: 'GitHub API 요청 한도에 도달했습니다.',
				suggestion:
					'잠시 후 다시 시도해주세요. (일반적으로 1시간 후 초기화)',
			};
		}

		// 인증 오류
		if (
			error.includes('401') ||
			error.includes('Unauthorized') ||
			error.includes('Bad credentials')
		) {
			return {
				title: '인증 오류',
				message: 'GitHub 인증에 실패했습니다.',
				suggestion: '설정에서 GitHub 토큰을 확인해주세요.',
			};
		}

		// 권한 오류
		if (error.includes('404') || error.includes('Not Found')) {
			return {
				title: '저장소를 찾을 수 없음',
				message: '지정된 GitHub 저장소를 찾을 수 없습니다.',
				suggestion: '설정에서 저장소 정보를 확인해주세요.',
			};
		}

		// 기본 오류
		return {
			title: '오류가 발생했습니다',
			message: error,
			suggestion: '문제가 지속되면 플러그인을 다시 로드해주세요.',
		};
	}

	/**
	 * 에러 UI를 렌더링합니다.
	 */
	private renderError(): void {
		const { contentEl } = this;
		const errorInfo = this.formatErrorMessage(this.state.error ?? '');

		const errorEl = contentEl.createDiv({
			cls: 'quartz-publish-result-summary quartz-publish-result-summary--error',
			attr: { role: 'alert', 'aria-live': 'assertive' },
		});

		errorEl.createDiv({
			cls: 'quartz-publish-result-summary-title',
			text: errorInfo.title,
		});

		errorEl.createDiv({
			cls: 'quartz-publish-result-summary-stats',
			text: errorInfo.message,
		});

		errorEl.createDiv({
			cls: 'hn:text-sm hn:mt-2 hn:text-obs-text-muted',
			text: errorInfo.suggestion,
		});

		// 다시 시도 버튼
		const buttonEl = errorEl.createEl('button', {
			text: '다시 시도',
			cls: 'mod-cta hn:mt-4',
			attr: { 'aria-label': '상태 다시 로드하기' },
		});
		buttonEl.addEventListener('click', () => this.loadStatus());
	}

	/**
	 * 헤더를 렌더링합니다.
	 */
	private renderHeader(): void {
		const { contentEl } = this;
		const headerEl = contentEl.createDiv({
			cls: 'quartz-publish-dashboard-header',
		});

		headerEl.createEl('h2', {
			text: 'Publish Dashboard',
			cls: 'quartz-publish-dashboard-title',
		});

		// 새로고침 버튼
		const refreshBtn = headerEl.createEl('button', {
			text: '새로고침',
			cls: 'hn:text-sm',
		});
		refreshBtn.addEventListener('click', () => this.refresh());
	}

	/**
	 * 탭을 렌더링합니다.
	 */
	private renderTabs(): void {
		const { contentEl } = this;
		const tabsEl = contentEl.createDiv({
			cls: 'quartz-publish-tabs',
			attr: { role: 'tablist', 'aria-label': '발행 상태 탭' },
		});

		TAB_KEYS.forEach((tabKey, index) => {
			const count = this.getTabCount(tabKey);
			const isActive = this.state.activeTab === tabKey;

			const tabEl = tabsEl.createEl('button', {
				cls: `quartz-publish-tab ${isActive ? 'quartz-publish-tab--active' : ''}`,
				attr: {
					role: 'tab',
					'aria-selected': String(isActive),
					'aria-controls': `tabpanel-${tabKey}`,
					id: `tab-${tabKey}`,
					tabindex: isActive ? '0' : '-1',
				},
			});

			tabEl.createSpan({ text: TAB_LABELS[tabKey] });
			tabEl.createSpan({
				text: String(count),
				cls: 'quartz-publish-tab-badge',
				attr: { 'aria-label': `${count}개` },
			});

			tabEl.addEventListener('click', () => this.switchTab(tabKey));

			// 키보드 네비게이션
			tabEl.addEventListener('keydown', (e) => {
				this.handleTabKeydown(e, index);
			});
		});
	}

	/**
	 * 탭 키보드 네비게이션을 처리합니다.
	 */
	private handleTabKeydown(e: KeyboardEvent, currentIndex: number): void {
		let newIndex = currentIndex;

		switch (e.key) {
			case 'ArrowLeft':
				newIndex =
					currentIndex === 0 ? TAB_KEYS.length - 1 : currentIndex - 1;
				break;
			case 'ArrowRight':
				newIndex =
					currentIndex === TAB_KEYS.length - 1 ? 0 : currentIndex + 1;
				break;
			case 'Home':
				newIndex = 0;
				break;
			case 'End':
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
			`#tab-${newTab}`
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
	 * 노트 목록을 렌더링합니다.
	 */
	private renderNoteList(): void {
		const { contentEl } = this;
		const notes = this.getCurrentTabNotes();

		const listEl = contentEl.createDiv({
			cls: 'quartz-publish-note-list',
			attr: {
				role: 'tabpanel',
				id: `tabpanel-${this.state.activeTab}`,
				'aria-labelledby': `tab-${this.state.activeTab}`,
			},
		});

		// 목록 헤더 (전체 선택)
		if (notes.length > 0) {
			const headerEl = listEl.createDiv({
				cls: 'quartz-publish-note-list-header',
			});

			const allSelected =
				notes.length > 0 &&
				notes.every((note) =>
					this.state.selectedPaths.has(note.file.path)
				);

			const checkboxEl = headerEl.createEl('input', {
				attr: {
					type: 'checkbox',
					'aria-label': `전체 ${notes.length}개 노트 선택`,
				},
			}) as HTMLInputElement;
			checkboxEl.checked = allSelected;
			checkboxEl.addEventListener('change', () => this.toggleSelectAll());

			headerEl.createSpan({
				text: `전체 선택 (${notes.length}개)`,
				attr: { id: 'select-all-label' },
			});
		}

		// 빈 목록
		if (notes.length === 0) {
			listEl.createDiv({
				cls: 'quartz-publish-note-list-empty',
				text: this.getEmptyMessage(),
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
			case 'new':
				return '신규 발행할 노트가 없습니다.';
			case 'modified':
				return '수정된 노트가 없습니다.';
			case 'deleted':
				return '삭제할 노트가 없습니다.';
			case 'synced':
				return '동기화된 노트가 없습니다.';
			default:
				return '노트가 없습니다.';
		}
	}

	/**
	 * 개별 노트 항목을 렌더링합니다.
	 */
	private renderNoteItem(container: HTMLElement, note: NoteStatus): void {
		const isSelected = this.state.selectedPaths.has(note.file.path);
		const noteName = note.file.basename || note.file.path.split('/').pop();
		const itemEl = container.createDiv({
			cls: `quartz-publish-note-item ${isSelected ? 'quartz-publish-note-item--selected' : ''}`,
		});

		// 체크박스
		const checkboxEl = itemEl.createEl('input', {
			attr: {
				type: 'checkbox',
				'aria-label': `${noteName} 선택`,
			},
			cls: 'hn:mr-3',
		}) as HTMLInputElement;
		checkboxEl.checked = isSelected;
		checkboxEl.addEventListener('change', () =>
			this.toggleSelection(note.file.path)
		);

		// 노트 정보
		const infoEl = itemEl.createDiv({ cls: 'hn:flex-1 hn:min-w-0' });

		// 파일명
		infoEl.createDiv({
			text: note.file.basename || note.file.path.split('/').pop(),
			cls: 'hn:font-medium hn:truncate',
		});

		// 경로
		infoEl.createDiv({
			text: note.file.path,
			cls: 'hn:text-xs hn:text-obs-text-muted hn:truncate',
		});

		// 상태 뱃지
		itemEl.createSpan({
			text: TAB_LABELS[note.status as DashboardTab] ?? note.status,
			cls: `quartz-publish-status-badge quartz-publish-status-badge--${note.status}`,
		});
	}

	/**
	 * 액션 버튼을 렌더링합니다.
	 */
	private renderActions(): void {
		const { contentEl } = this;
		const actionsEl = contentEl.createDiv({
			cls: 'quartz-publish-actions',
			attr: { role: 'toolbar', 'aria-label': '대시보드 작업' },
		});

		const leftEl = actionsEl.createDiv({ cls: 'quartz-publish-actions-left' });
		const rightEl = actionsEl.createDiv({
			cls: 'quartz-publish-actions-right',
		});

		// 선택된 항목 개수
		const selectedCount = this.state.selectedPaths.size;
		if (selectedCount > 0) {
			leftEl.createSpan({
				text: `${selectedCount}개 선택됨`,
				cls: 'hn:text-sm hn:text-obs-text-muted',
				attr: { 'aria-live': 'polite' },
			});
		}

		// 닫기 버튼
		const closeBtn = rightEl.createEl('button', {
			text: '닫기',
			attr: { 'aria-label': '대시보드 닫기' },
		});
		closeBtn.addEventListener('click', () => this.close());

		// 전체 동기화 버튼 (항상 표시)
		const hasPendingChanges = this.hasPendingChanges();
		const pendingCount = this.getPendingChangesCount();
		const syncAllBtn = rightEl.createEl('button', {
			text: '전체 동기화',
			attr: {
				'aria-label': hasPendingChanges
					? `전체 동기화: ${pendingCount}개 변경사항`
					: '동기화할 변경사항 없음',
			},
		});
		syncAllBtn.disabled = !hasPendingChanges || this.state.isOperating;
		syncAllBtn.addEventListener('click', () => this.syncAll());

		// 발행/삭제 버튼 (탭에 따라 다름)
		if (this.state.activeTab === 'deleted') {
			const deleteBtn = rightEl.createEl('button', {
				text: '삭제',
				cls: 'mod-warning',
				attr: {
					'aria-label':
						selectedCount > 0
							? `선택한 ${selectedCount}개 노트 삭제`
							: '삭제할 노트를 선택하세요',
				},
			});
			deleteBtn.disabled = selectedCount === 0 || this.state.isOperating;
			deleteBtn.addEventListener('click', () => this.deleteSelected());
		} else if (
			this.state.activeTab === 'new' ||
			this.state.activeTab === 'modified'
		) {
			const publishBtn = rightEl.createEl('button', {
				text: '발행',
				cls: 'mod-cta',
				attr: {
					'aria-label':
						selectedCount > 0
							? `선택한 ${selectedCount}개 노트 발행`
							: '발행할 노트를 선택하세요',
				},
			});
			publishBtn.disabled = selectedCount === 0 || this.state.isOperating;
			publishBtn.addEventListener('click', () => this.publishSelected());
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
		}
	) {
		super(app);
		this.title = options.title;
		this.message = options.message;
		this.confirmText = options.confirmText ?? '확인';
		this.cancelText = options.cancelText ?? '취소';
		this.isDangerous = options.isDangerous ?? false;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h3', { text: this.title });
		contentEl.createEl('p', { text: this.message });

		const buttonContainer = contentEl.createDiv({
			cls: 'hn:flex hn:justify-end hn:gap-2 hn:mt-4',
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: this.cancelText,
		});
		cancelBtn.addEventListener('click', () => {
			this.resolvePromise?.(false);
			this.close();
		});

		const confirmBtn = buttonContainer.createEl('button', {
			text: this.confirmText,
			cls: this.isDangerous ? 'mod-warning' : 'mod-cta',
		});
		confirmBtn.addEventListener('click', () => {
			this.resolvePromise?.(true);
			this.close();
		});
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
