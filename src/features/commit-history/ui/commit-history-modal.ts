/**
 * Commit History Modal
 *
 * GitHub 커밋 히스토리를 조회하고 관리하는 모달입니다.
 */

import { App, Modal, Notice, Setting, debounce, setIcon } from "obsidian";
import type { CommitListItem, CommitListState } from "../../../app/types";
import { INITIAL_COMMIT_LIST_STATE } from "../../../app/types";
import type { GitHubService } from "../../../entities/github/model/service";
import { t } from "../../../shared/lib/i18n";

/**
 * Commit History Modal 옵션
 */
export interface CommitHistoryModalOptions {
  /** GitHubService 인스턴스 */
  gitHubService: GitHubService;
}

/**
 * 커밋 히스토리 모달
 */
export class CommitHistoryModal extends Modal {
  private state: CommitListState;
  private gitHubService: GitHubService;
  private cachedCommits: CommitListItem[] | null = null;
  private readonly perPage = 30;

  // 디바운스된 검색 함수
  private debouncedSearch = debounce(
    (query: string) => {
      this.handleSearch(query);
    },
    300,
    true
  );

  constructor(app: App, options: CommitHistoryModalOptions) {
    super(app);
    this.state = { ...INITIAL_COMMIT_LIST_STATE };
    this.gitHubService = options.gitHubService;
  }

  /**
   * 모달 열기 (라이프사이클)
   */
  async onOpen(): Promise<void> {
    const { contentEl, modalEl } = this;
    contentEl.empty();
    contentEl.addClass("qp-commit-history-modal");
    modalEl.addClass("qp-commit-history-modal-container");

    this.setTitle(t("modal.commitHistory.title"));

    // 커밋 목록 로드
    await this.loadCommits();
  }

  /**
   * 모달 닫기 (라이프사이클)
   */
  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.state = { ...INITIAL_COMMIT_LIST_STATE };
  }

  /**
   * 커밋 목록 로드
   */
  private async loadCommits(forceRefresh = false): Promise<void> {
    this.updateState({ isLoading: true, error: null });

    try {
      // 캐시된 커밋 사용 (forceRefresh가 아닌 경우)
      if (!forceRefresh && this.cachedCommits) {
        this.updateState({
          commits: this.cachedCommits,
          filteredCommits: this.cachedCommits,
          isLoading: false,
        });
        return;
      }

      const commits = await this.gitHubService.getCommits(this.perPage, 1);
      this.cachedCommits = commits;

      this.updateState({
        commits,
        filteredCommits: commits,
        currentPage: 1,
        totalPages: 1, // GitHub API는 전체 개수를 제공하지 않아 1로 설정
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.updateState({
        error: errorMessage,
        isLoading: false,
      });
      new Notice(t("error.commitHistory.loadFailed"));
    }
  }

  /**
   * 상태 업데이트 및 리렌더링
   */
  private updateState(partial: Partial<CommitListState>): void {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  /**
   * UI 렌더링
   */
  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    // 로딩 상태
    if (this.state.isLoading) {
      this.renderLoading(contentEl);
      return;
    }

    // 에러 상태
    if (this.state.error) {
      this.renderError(contentEl);
      return;
    }

    // 헤더 (검색, 새로고침)
    this.renderHeader(contentEl);

    // 커밋 목록
    this.renderCommitList(contentEl);

    // 하단 액션 바
    this.renderFooter(contentEl);
  }

  /**
   * 로딩 UI 렌더링
   */
  private renderLoading(container: HTMLElement): void {
    const loadingEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12",
    });
    const loadingIcon = loadingEl.createDiv({
      cls: "animate-spin",
      attr: { "aria-hidden": "true" },
    });
    setIcon(loadingIcon, "loader-2");
    loadingEl.createDiv({
      cls: "mt-2 text-obs-text-muted",
      text: t("modal.commitHistory.loading"),
    });
  }

  /**
   * 에러 UI 렌더링
   */
  private renderError(container: HTMLElement): void {
    const errorEl = container.createDiv({
      cls: "flex flex-col items-center justify-center py-12 text-obs-text-error",
    });
    const errorIcon = errorEl.createDiv({ attr: { "aria-hidden": "true" } });
    setIcon(errorIcon, "x-circle");
    errorEl.createDiv({
      cls: "mt-2",
      text: this.state.error ?? t("error.commitHistory.loadFailed"),
    });

    const retryBtn = errorEl.createEl("button", {
      text: t("modal.commitHistory.refresh"),
      cls: "mt-4",
    });
    retryBtn.addEventListener("click", () => this.loadCommits(true));
  }

  /**
   * 헤더 렌더링 (검색, 새로고침)
   */
  private renderHeader(container: HTMLElement): void {
    const headerEl = container.createDiv({
      cls: "flex items-center gap-2 mb-4",
    });

    // 검색 입력
    const searchInput = headerEl.createEl("input", {
      type: "text",
      placeholder: t("modal.commitHistory.search"),
      cls: "qp-search-input flex-1 p-2 border border-obs-bg-modifier-border rounded bg-obs-bg-primary",
      attr: {
        "aria-label": t("modal.commitHistory.search"),
      },
    });
    searchInput.value = this.state.searchQuery;
    searchInput.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.state.searchQuery = query;
      this.debouncedSearch(query);
    });

    // 새로고침 버튼
    const refreshBtn = headerEl.createEl("button", {
      text: t("modal.commitHistory.refresh"),
      cls: "px-3 py-2",
      attr: {
        "aria-label": t("modal.commitHistory.refresh"),
      },
    });
    refreshBtn.addEventListener("click", () => this.handleRefresh());
  }

  /**
   * 커밋 목록 렌더링
   */
  private renderCommitList(container: HTMLElement): void {
    const listContainer = container.createDiv({
      cls: "qp-commit-list max-h-[400px] overflow-y-auto border border-obs-bg-modifier-border rounded",
      attr: {
        role: "list",
        "aria-label": t("modal.commitHistory.commitListLabel"),
      },
    });

    // 빈 목록
    if (this.state.filteredCommits.length === 0) {
      listContainer.createDiv({
        cls: "flex items-center justify-center py-12 text-obs-text-muted",
        text: t("modal.commitHistory.empty"),
      });

      return;
    }

    // 커밋 개수 표시
    const countEl = container.createDiv({
      cls: "text-sm text-obs-text-muted mb-2",
      text: t("modal.commitHistory.commitCount", {
        count: this.state.filteredCommits.length,
      }),
    });
    container.insertBefore(countEl, listContainer);

    // 커밋 항목 렌더링
    this.state.filteredCommits.forEach((commit) => {
      this.renderCommitItem(listContainer, commit);
    });
  }

  /**
   * 단일 커밋 항목 렌더링
   */
  private renderCommitItem(container: HTMLElement, commit: CommitListItem): void {
    const itemEl = container.createDiv({
      cls: "qp-commit-item flex items-start gap-3 p-3 border-b border-obs-bg-modifier-border cursor-pointer hover:bg-obs-bg-modifier-hover",
      attr: {
        role: "listitem",
        "data-sha": commit.sha,
      },
    });

    // 아이콘
    const iconEl = itemEl.createDiv({
      cls: "mt-1 text-obs-text-muted",
      attr: { "aria-hidden": "true" },
    });
    setIcon(iconEl, "git-commit");

    // 커밋 정보
    const infoEl = itemEl.createDiv({ cls: "flex-1 min-w-0" });

    // 메시지
    infoEl.createDiv({
      cls: "font-medium text-obs-text-normal",
      text: commit.message,
    });

    // SHA와 작성자
    const metaEl = infoEl.createDiv({
      cls: "flex items-center gap-2 mt-1 text-xs text-obs-text-muted",
    });

    metaEl.createSpan({
      cls: "font-mono",
      text: commit.shortSha,
    });

    metaEl.createSpan({ text: "•" });

    metaEl.createSpan({
      text: commit.authorName,
    });

    metaEl.createSpan({ text: "•" });

    // 상대적 시간 표시
    const relativeTime = this.formatRelativeTime(commit.authorDate);
    metaEl.createSpan({ text: relativeTime });

    // 클릭 이벤트 - 상세 모달 열기
    itemEl.addEventListener("click", () => {
      this.openCommitDetail(commit);
    });
  }

  /**
   * 하단 액션 바 렌더링
   */
  private renderFooter(container: HTMLElement): void {
    const buttonSetting = new Setting(container).setClass("qp-footer-buttons");

    // 닫기 버튼
    buttonSetting.addButton((button) =>
      button.setButtonText(t("modal.confirm.cancel")).onClick(() => this.close())
    );
  }

  /**
   * 검색 처리
   */
  private handleSearch(query: string): void {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
      this.updateState({
        searchQuery: query,
        filteredCommits: this.state.commits,
      });
      return;
    }

    const filtered = this.state.commits.filter(
      (commit) =>
        commit.message.toLowerCase().includes(lowerQuery) ||
        commit.authorName.toLowerCase().includes(lowerQuery) ||
        commit.sha.toLowerCase().includes(lowerQuery) ||
        commit.shortSha.toLowerCase().includes(lowerQuery)
    );

    this.updateState({
      searchQuery: query,
      filteredCommits: filtered,
    });
  }

  /**
   * 새로고침 처리
   */
  private async handleRefresh(): Promise<void> {
    this.cachedCommits = null; // 캐시 무효화
    await this.loadCommits(true);
  }

  /**
   * 커밋 상세 모달 열기
   */
  private openCommitDetail(commit: CommitListItem): void {
    // CommitDetailModal은 별도 파일에서 import
    // 순환 참조 방지를 위해 동적 import 사용
    import("./commit-detail-modal").then(({ CommitDetailModal }) => {
      new CommitDetailModal(this.app, {
        gitHubService: this.gitHubService,
        commitSha: commit.sha,
      }).open();
    });
  }

  /**
   * 상대적 시간 포맷팅
   */
  private formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("modal.commitHistory.time.justNow");
    if (diffMins < 60) return t("modal.commitHistory.time.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("modal.commitHistory.time.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("modal.commitHistory.time.daysAgo", { count: diffDays });

    // 1주 이상은 날짜 표시
    return date.toLocaleDateString();
  }
}
