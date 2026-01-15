/**
 * Quartz Publish Settings Tab
 *
 * 플러그인 설정 UI를 제공합니다.
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent } from 'obsidian';
import type QuartzPublishPlugin from '../main';
import { GitHubService } from '../services/github';
import {
	QuartzConfigService,
	type ParsedQuartzConfig,
} from '../services/quartz-config';
import { QuartzUpgradeService } from '../services/quartz-upgrade';
import { PendingChangesManager } from '../services/pending-changes';
import type { QuartzVersionInfo, QuartzUpgradeProgress, QuartzSiteConfig } from '../types';
import { DEFAULT_AUTO_DATE_SETTINGS } from '../types';
import { SiteInfoSection } from './sections/site-info-section';
import { BehaviorSection } from './sections/behavior-section';
import { AnalyticsSection } from './sections/analytics-section';
import { PublishingSection } from './sections/publishing-section';
import { ApplyButton } from './components/apply-button';
import { UnsavedWarning } from './components/unsaved-warning';
import { ConfirmModal } from './components/confirm-modal';
import { ConflictModal } from './components/conflict-modal';
import { CreateRepoModal } from './create-repo-modal';
import { DeployGuideModal } from './deploy-guide-modal';
import { t } from '../i18n';

/**
 * 플러그인 설정 탭
 */
export class QuartzPublishSettingTab extends PluginSettingTab {
	plugin: QuartzPublishPlugin;
	private connectionStatusEl: HTMLElement | null = null;
	private branchInputComponent: TextComponent | null = null;
	private quartzConfigService: QuartzConfigService | null = null;
	private quartzUpgradeService: QuartzUpgradeService | null = null;
	private quartzSettingsContainerEl: HTMLElement | null = null;
	private isQuartzSettingsLoading = false;
	private upgradeContainerEl: HTMLElement | null = null;

	// Phase 4: Advanced Config 관련 (T031)
	private pendingChangesManager: PendingChangesManager | null = null;
	private siteInfoSection: SiteInfoSection | null = null;
	private advancedConfigContainerEl: HTMLElement | null = null;

	// Phase 4: Apply Flow 관련 (T033-T042)
	private applyButton: ApplyButton | null = null;
	private unsavedWarning: UnsavedWarning | null = null;

	// Phase 5-7: Additional Sections (T043-T057)
	private behaviorSection: BehaviorSection | null = null;
	private analyticsSection: AnalyticsSection | null = null;

	// Phase 8: Publishing Section (T058-T063)
	private publishingSection: PublishingSection | null = null;

	constructor(app: App, plugin: QuartzPublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * 설정 탭 닫힐 때 호출 (T041)
	 */
	hide(): void {
		// 저장되지 않은 변경사항 경고
		if (this.pendingChangesManager?.isDirty()) {
			// 변경사항이 있으면 경고 표시 (콘솔에 로그)
			console.warn(
				'Quartz Publish: 저장되지 않은 변경사항이 있습니다:',
				this.pendingChangesManager.getChangeSummary()
			);
			// Note: Obsidian PluginSettingTab.hide()는 비동기 확인을 지원하지 않음
			// 대신 UnsavedWarning 배너로 사용자에게 알림
		}

		// 리소스 정리
		this.pendingChangesManager = null;
		this.siteInfoSection = null;
		this.behaviorSection = null;
		this.analyticsSection = null;
		this.publishingSection = null;
		this.applyButton = null;
		this.unsavedWarning = null;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// GitHub 연동 섹션
		this.createGitHubSection(containerEl);

		// 날짜 자동 추가 섹션
		this.createAutoDateSection(containerEl);

		// Quartz 설정 섹션
		this.createQuartzSettingsSection(containerEl);
	}

	/**
	 * GitHub 연동 섹션 생성
	 */
	private createGitHubSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.github.title')).setHeading();

		// GitHub Token 입력
		new Setting(containerEl)
			.setName(t('settings.github.token'))
			.setDesc(
				createFragment((el) => {
					el.appendText(t('settings.github.tokenDesc') + ' ');
					el.createEl('a', {
						href: 'https://github.com/settings/tokens/new?scopes=repo',
						text: t('settings.github.tokenLink'),
					});
				})
			)
			.addText((text) =>
				text
					.setPlaceholder('ghp_xxxxxxxxxxxx')
					.setValue(this.plugin.settings.githubToken)
					.onChange(async (value) => {
						this.plugin.settings.githubToken = value;
						await this.plugin.saveSettings();
					})
			)
			.then((setting) => {
				// 토큰 입력 필드를 패스워드 타입으로 변경
				const inputEl = setting.controlEl.querySelector('input');
				if (inputEl) {
					inputEl.type = 'password';
					inputEl.autocomplete = 'off';
				}
			});

		// Repository URL 입력
		new Setting(containerEl)
			.setName(t('settings.github.repoUrl'))
			.setDesc(t('settings.github.repoUrlDesc'))
			.addText((text) =>
				text
					.setPlaceholder('https://github.com/user/quartz')
					.setValue(this.plugin.settings.repoUrl)
					.onChange(async (value) => {
						this.plugin.settings.repoUrl = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (!this.plugin.settings.repoUrl && this.plugin.settings.githubToken) {
			new Setting(containerEl)
				.setName(t('settings.github.newToQuartz'))
				.setDesc(t('settings.github.newToQuartzDesc'))
				.addButton((button) =>
					button
						.setButtonText(t('settings.github.createRepo'))
						.setCta()
						.onClick(() => {
							this.openCreateRepoModal();
						})
				);
		}

		// 브랜치 설정
		new Setting(containerEl)
			.setName(t('settings.github.branch'))
			.setDesc(t('settings.github.branchDesc'))
			.addText((text) => {
				this.branchInputComponent = text;
				text
					.setPlaceholder('Auto-detected on connection test')
					.setValue(this.plugin.settings.defaultBranch)
					.onChange(async (value) => {
						this.plugin.settings.defaultBranch = value || 'main';
						await this.plugin.saveSettings();
					});
			});

		// 연결 테스트 버튼
		const testConnectionSetting = new Setting(containerEl)
			.setName(t('settings.github.testConnection'))
			.setDesc(t('settings.github.testConnectionDesc'))
			.addButton((button) =>
				button
					.setButtonText(t('settings.github.testConnection'))
					.setCta()
					.onClick(async () => {
						await this.testConnection();
					})
			);

		// 연결 상태 표시 영역
		this.connectionStatusEl = testConnectionSetting.descEl.createDiv({
			cls: 'quartz-publish-connection-status',
		});
	}

	/**
	 * 날짜 자동 추가 섹션 생성
	 */
	private createAutoDateSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.autoDate.title')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.autoDate.title'))
			.setDesc(t('settings.autoDate.desc'));

		// Created 날짜 토글
		new Setting(containerEl)
			.setName(t('settings.autoDate.created'))
			.setDesc(t('settings.autoDate.createdDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoDateSettings?.enableCreated ?? DEFAULT_AUTO_DATE_SETTINGS.enableCreated)
					.onChange(async (value) => {
						if (!this.plugin.settings.autoDateSettings) {
							this.plugin.settings.autoDateSettings = { ...DEFAULT_AUTO_DATE_SETTINGS };
						}
						this.plugin.settings.autoDateSettings.enableCreated = value;
						await this.plugin.saveSettings();
					})
			);

		// Modified 날짜 토글
		new Setting(containerEl)
			.setName(t('settings.autoDate.modified'))
			.setDesc(t('settings.autoDate.modifiedDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoDateSettings?.enableModified ?? DEFAULT_AUTO_DATE_SETTINGS.enableModified)
					.onChange(async (value) => {
						if (!this.plugin.settings.autoDateSettings) {
							this.plugin.settings.autoDateSettings = { ...DEFAULT_AUTO_DATE_SETTINGS };
						}
						this.plugin.settings.autoDateSettings.enableModified = value;
						await this.plugin.saveSettings();
					})
			);

		// Published 날짜 토글
		new Setting(containerEl)
			.setName(t('settings.autoDate.published'))
			.setDesc(t('settings.autoDate.publishedDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoDateSettings?.enablePublished ?? DEFAULT_AUTO_DATE_SETTINGS.enablePublished)
					.onChange(async (value) => {
						if (!this.plugin.settings.autoDateSettings) {
							this.plugin.settings.autoDateSettings = { ...DEFAULT_AUTO_DATE_SETTINGS };
						}
						this.plugin.settings.autoDateSettings.enablePublished = value;
						await this.plugin.saveSettings();
					})
			);
	}

	/**
	 * 연결 테스트 실행
	 */
	private async testConnection(): Promise<void> {
		if (!this.connectionStatusEl) return;

		const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;

		// 입력값 검증
		if (!githubToken) {
			this.showConnectionStatus('error', t('error.tokenRequired'));
			return;
		}

		if (!repoUrl) {
			this.showConnectionStatus('error', t('error.repoUrlRequired'));
			return;
		}

		this.showConnectionStatus('connecting', t('connection.connecting'));

		try {
			const github = new GitHubService(githubToken, repoUrl, defaultBranch);
			const result = await github.testConnection();

			if (result.success && result.repository) {
				// 자동으로 default branch 설정
				const detectedBranch = result.repository.defaultBranch;
				if (detectedBranch && detectedBranch !== this.plugin.settings.defaultBranch) {
					this.plugin.settings.defaultBranch = detectedBranch;
					await this.plugin.saveSettings();
					// UI 업데이트
					if (this.branchInputComponent) {
						this.branchInputComponent.setValue(detectedBranch);
					}
				}

				this.showConnectionStatus(
					'connected',
					t('connection.connected', { owner: result.repository.owner, name: result.repository.name, branch: detectedBranch })
				);
				new Notice(t('notice.connection.success'));
			} else if (result.error) {
				this.showConnectionStatus('error', this.getErrorMessage(result.error.type));
				new Notice(t('notice.connection.failed', { message: result.error.message }));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : t('error.unknown');
			this.showConnectionStatus('error', message);
			new Notice(t('notice.connection.failed', { message }));
		}
	}

	private openCreateRepoModal(): void {
		const modal = new CreateRepoModal(this.app, {
			token: this.plugin.settings.githubToken,
			onSuccess: async (repository) => {
				this.plugin.settings.repoUrl = repository.htmlUrl;
				await this.plugin.saveSettings();
				this.display();
			},
			onShowDeployGuide: (repository) => {
				new DeployGuideModal(this.app, { repository }).open();
			},
		});
		modal.open();
	}

	private showConnectionStatus(
		status: 'connected' | 'connecting' | 'error',
		message: string
	): void {
		if (!this.connectionStatusEl) return;

		this.connectionStatusEl.empty();

		this.connectionStatusEl.createSpan({
			cls: `quartz-publish-connection-dot quartz-publish-connection-dot--${status}`,
		});

		this.connectionStatusEl.createSpan({
			text: message,
			cls: status === 'error' ? 'qp:text-obs-text-error' : '',
		});
	}

	/**
	 * 오류 타입에 따른 사용자 메시지
	 */
	private getErrorMessage(errorType: string): string {
		switch (errorType) {
			case 'invalid_token':
				return t('error.github.invalidToken');
			case 'not_found':
				return t('error.github.notFound');
			case 'not_quartz':
				return t('error.github.notQuartz');
			case 'rate_limited':
				return t('error.github.rateLimit');
			case 'network_error':
				return t('error.github.network');
			default:
				return t('error.unknown');
		}
	}

	// ============================================================================
	// Quartz Settings Section
	// ============================================================================

	/**
	 * Quartz 설정 섹션 생성
	 */
	private createQuartzSettingsSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.quartz.title')).setHeading();

		// 설정 컨테이너 (동적 로딩용)
		this.quartzSettingsContainerEl = containerEl.createDiv({
			cls: 'quartz-publish-quartz-settings',
		});

		// 초기 상태: GitHub 연결 필요 안내
		this.showQuartzSettingsPlaceholder();
	}

	/**
	 * Quartz 설정 섹션 플레이스홀더 표시
	 */
	private showQuartzSettingsPlaceholder(): void {
		if (!this.quartzSettingsContainerEl) return;

		this.quartzSettingsContainerEl.empty();

		const { githubToken, repoUrl } = this.plugin.settings;
		if (!githubToken || !repoUrl) {
			this.quartzSettingsContainerEl.createEl('p', {
				text: t('settings.quartz.connectFirst'),
				cls: 'qp:text-obs-text-muted qp:text-sm',
			});
			return;
		}

		// 설정 로드 버튼
		new Setting(this.quartzSettingsContainerEl)
			.setName(t('settings.quartz.load'))
			.setDesc(t('settings.quartz.loadDesc'))
			.addButton((button) =>
				button.setButtonText(t('settings.quartz.load')).onClick(async () => {
					await this.loadQuartzSettings();
				})
			);
	}

	/**
	 * Quartz 설정 로드
	 */
	private async loadQuartzSettings(): Promise<void> {
		if (!this.quartzSettingsContainerEl || this.isQuartzSettingsLoading) return;

		const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;
		if (!githubToken || !repoUrl) {
			new Notice(t('settings.quartz.connectFirst'));
			return;
		}

		this.isQuartzSettingsLoading = true;
		this.quartzSettingsContainerEl.empty();
		this.quartzSettingsContainerEl.createEl('p', {
			text: t('settings.quartz.loading'),
			cls: 'qp:text-obs-text-muted qp:text-sm',
		});

		try {
			const github = new GitHubService(githubToken, repoUrl, defaultBranch);
			this.quartzConfigService = new QuartzConfigService(github);

			// 먼저 연결 상태 확인
			const connectionResult = await github.testConnection();
			if (!connectionResult.success) {
				const errorType = connectionResult.error?.type;
				let errorMsg = connectionResult.error?.message ?? 'Unknown error';

				if (errorType === 'invalid_token') {
					errorMsg = 'Invalid GitHub token. Please check your token.';
				} else if (errorType === 'not_found') {
					errorMsg = `Repository not found: ${repoUrl}`;
				} else if (errorType === 'not_quartz') {
					errorMsg = `quartz.config.ts not found in branch "${defaultBranch}". Please ensure this is a Quartz repository.`;
				} else if (errorType === 'rate_limited') {
					errorMsg = 'GitHub API rate limit exceeded. Please try again later.';
				}

				throw new Error(errorMsg);
			}

			const configFile = await this.quartzConfigService.fetchQuartzConfig();
			if (!configFile) {
				throw new Error(t('error.configNotFound', { branch: defaultBranch }));
			}

			const parsed = this.quartzConfigService.parseConfig(configFile.content);
			if (!parsed) {
				throw new Error(t('error.parseFailed'));
			}

			this.renderQuartzSettings(parsed);
		} catch (error) {
			this.quartzSettingsContainerEl.empty();
			const message = error instanceof Error ? error.message : t('error.unknown');
			this.quartzSettingsContainerEl.createEl('p', {
				text: t('settings.quartz.loadFailed', { message }),
				cls: 'qp:text-obs-text-error qp:text-sm',
			});

			// 재시도 버튼
			new Setting(this.quartzSettingsContainerEl).addButton((button) =>
				button.setButtonText(t('settings.quartz.retry')).onClick(async () => {
					await this.loadQuartzSettings();
				})
			);
		} finally {
			this.isQuartzSettingsLoading = false;
		}
	}

	/**
	 * Quartz 설정 UI 렌더링
	 */
	private renderQuartzSettings(config: ParsedQuartzConfig): void {
		if (!this.quartzSettingsContainerEl) return;

		this.quartzSettingsContainerEl.empty();

		this.renderAdvancedConfigSection(config);

		this.renderUpgradeSection();
	}

	/**
	 * Advanced Config 섹션 렌더링 (T031, T032)
	 */
	private renderAdvancedConfigSection(config: ParsedQuartzConfig): void {
		if (!this.quartzSettingsContainerEl || !this.quartzConfigService) return;

		// 확장된 설정 파싱
		const extendedConfig = this.quartzConfigService.parseExtendedConfig(config.rawContent);
		if (!extendedConfig) {
			return;
		}

		// PendingChangesManager 초기화
		const siteConfig = this.quartzConfigService.toQuartzSiteConfig(extendedConfig);
		const sha = this.quartzConfigService.getCachedSha() ?? '';

		this.pendingChangesManager = new PendingChangesManager();
		this.pendingChangesManager.initialize(siteConfig, sha);

		// Advanced Config 컨테이너
		this.advancedConfigContainerEl = this.quartzSettingsContainerEl.createDiv({
			cls: 'quartz-publish-advanced-config',
		});

		// Unsaved Warning Banner (T035, T042)
		this.unsavedWarning = new UnsavedWarning(this.advancedConfigContainerEl, {
			onDiscard: () => {
				this.handleDiscardChanges();
			},
		});

		// Site Information Section 렌더링 (T027-T030, T032)
		this.siteInfoSection = new SiteInfoSection(this.advancedConfigContainerEl, {
			config: {
				pageTitle: extendedConfig.pageTitle,
				baseUrl: extendedConfig.baseUrl,
				locale: extendedConfig.locale,
			},
			onChange: (field, value) => {
				this.handleAdvancedConfigChange(field, value);
			},
		});

		// Behavior Section 렌더링 (T043-T047, T056-T057)
		this.behaviorSection = new BehaviorSection(this.advancedConfigContainerEl, {
			config: {
				enableSPA: extendedConfig.enableSPA,
				enablePopovers: extendedConfig.enablePopovers,
				defaultDateType: extendedConfig.defaultDateType,
			},
			onChange: (field, value) => {
				this.handleAdvancedConfigChange(field, value);
			},
		});

		// Analytics Section 렌더링 (T048-T055)
		this.analyticsSection = new AnalyticsSection(this.advancedConfigContainerEl, {
			config: extendedConfig.analytics,
			onChange: (field, value) => {
				this.handleAdvancedConfigChange(field, value);
			},
		});

		// Publishing Section 렌더링 (T058-T063)
		this.publishingSection = new PublishingSection(this.advancedConfigContainerEl, {
			config: {
				explicitPublish: extendedConfig.explicitPublish,
				ignorePatterns: extendedConfig.ignorePatterns,
				urlStrategy: extendedConfig.urlStrategy,
			},
			onChange: (field, value) => {
				this.handleAdvancedConfigChange(field, value);
			},
		});

		this.applyButton = new ApplyButton(this.advancedConfigContainerEl, {
			onClick: async () => {
				await this.handleApplyChanges();
			},
			onRefresh: async () => {
				this.quartzConfigService?.invalidateCache();
				await this.loadQuartzSettings();
			},
			initialState: 'disabled',
		});
	}

	/**
	 * Advanced Config 변경 핸들러 (T031, T042)
	 */
	private handleAdvancedConfigChange<K extends keyof QuartzSiteConfig>(
		field: K,
		value: QuartzSiteConfig[K]
	): void {
		if (!this.pendingChangesManager) return;

		this.pendingChangesManager.updateField(field, value);

		// UI 상태 업데이트 (T042)
		this.updateApplyFlowUI();
	}

	/**
	 * Apply Flow UI 상태 업데이트 (T042)
	 */
	private updateApplyFlowUI(): void {
		if (!this.pendingChangesManager) return;

		const isDirty = this.pendingChangesManager.isDirty();

		// ApplyButton 상태 업데이트
		this.applyButton?.setEnabled(isDirty);

		// UnsavedWarning 표시/숨김
		this.unsavedWarning?.toggle(isDirty);
	}

	/**
	 * 변경사항 취소 핸들러
	 */
	private handleDiscardChanges(): void {
		if (!this.pendingChangesManager) return;

		// 변경사항 리셋
		this.pendingChangesManager.reset();

		// UI 값 복원
		const originalConfig = this.pendingChangesManager.getOriginalConfig();

		this.siteInfoSection?.updateValues({
			pageTitle: originalConfig.pageTitle,
			baseUrl: originalConfig.baseUrl,
			locale: originalConfig.locale,
		});

		this.behaviorSection?.updateValues({
			enableSPA: originalConfig.enableSPA,
			enablePopovers: originalConfig.enablePopovers,
			defaultDateType: originalConfig.defaultDateType,
		});

		this.analyticsSection?.updateValues(originalConfig.analytics);

		this.publishingSection?.updateValues({
			explicitPublish: originalConfig.explicitPublish,
			ignorePatterns: originalConfig.ignorePatterns,
			urlStrategy: originalConfig.urlStrategy,
		});

		// UI 상태 업데이트
		this.updateApplyFlowUI();

		new Notice(t('notice.settings.discarded'));
	}

	/**
	 * Apply Flow 실행 (T040)
	 */
	private async handleApplyChanges(): Promise<void> {
		if (
			!this.pendingChangesManager ||
			!this.quartzConfigService ||
			!this.pendingChangesManager.isDirty()
		) {
			return;
		}

		// 유효성 검사
		const validation = this.siteInfoSection?.validate();
		if (validation && !validation.valid) {
			new Notice(t('notice.settings.validationFailed', { error: validation.errors[0] }));
			return;
		}

		// 확인 모달 (T036-T037)
		const confirmModal = new ConfirmModal(this.app, {
			title: t('modal.apply.title'),
			message: t('modal.apply.message', { summary: this.pendingChangesManager.getChangeSummary() }),
			confirmText: t('modal.apply.confirm'),
			cancelText: t('modal.confirm.cancel'),
		});

		const confirmed = await confirmModal.openAsync();
		if (!confirmed) {
			return;
		}

		// 로딩 상태
		this.applyButton?.updateState('loading');

		try {
			// SHA 체크 (T040)
			const remoteSha = await this.quartzConfigService.getRemoteSha();
			const originalSha = this.pendingChangesManager.getOriginalSha();

			if (remoteSha && remoteSha !== originalSha) {
				// 충돌 감지 - ConflictModal 표시 (T038-T039)
				const conflictModal = new ConflictModal(this.app);
				const resolution = await conflictModal.openAsync();

				switch (resolution) {
					case 'reload':
						// 새로고침 후 재시도
						this.quartzConfigService.invalidateCache();
						await this.loadQuartzSettings();
						new Notice(t('notice.settings.reloaded'));
						return;

					case 'force_overwrite':
						// 강제 덮어쓰기 - 계속 진행
						break;

					case 'cancel':
					default:
						// 취소
						this.applyButton?.setEnabled(true);
						return;
				}
			}

			// 설정 저장 (T040)
			const currentConfig = this.pendingChangesManager.getCurrentConfig();
			const commitMessage = this.pendingChangesManager.generateCommitMessage();

			// 강제 덮어쓰기 시에는 최신 remoteSha를 사용해야 함
			const shaToUse = remoteSha ?? originalSha;
			const result = await this.quartzConfigService.saveConfig(
				currentConfig,
				shaToUse,
				commitMessage
			);

			if (result.success) {
				// 저장 성공
				this.pendingChangesManager.markAsSaved(currentConfig, result.newSha ?? '');
				this.updateApplyFlowUI();
				new Notice(t('notice.settings.saved'));
			} else {
				// 저장 실패
				new Notice(t('error.saveFailed', { message: result.errorMessage ?? '' }));
				this.applyButton?.setEnabled(true);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : t('error.unknown');
			new Notice(t('error.saveFailed', { message }));
			this.applyButton?.setEnabled(true);
		}
	}

	// ============================================================================
	// Quartz Upgrade Section (User Story 4)
	// ============================================================================

	private renderUpgradeSection(): void {
		if (!this.quartzSettingsContainerEl) return;

		new Setting(this.quartzSettingsContainerEl).setName(t('upgrade.title')).setHeading();

		this.upgradeContainerEl = this.quartzSettingsContainerEl.createDiv({
			cls: 'quartz-publish-version-card',
		});

		const promptContainer = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-check-prompt',
		});

		promptContainer.createEl('p', {
			text: t('upgrade.checkPrompt'),
			cls: 'quartz-publish-version-check-prompt-text',
		});

		const checkButton = promptContainer.createEl('button', {
			text: t('upgrade.checkButton'),
			cls: 'mod-cta',
		});
		checkButton.addEventListener('click', async () => {
			await this.checkForUpdates();
		});
	}

	/**
	 * 업데이트 확인
	 */
	private async checkForUpdates(): Promise<void> {
		if (!this.upgradeContainerEl) return;

		const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;
		if (!githubToken || !repoUrl) {
			new Notice(t('settings.quartz.connectFirst'));
			return;
		}

		this.upgradeContainerEl.empty();
		const loadingContainer = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-loading',
		});
		loadingContainer.createDiv({ cls: 'quartz-publish-loading-spinner' });
		loadingContainer.createEl('span', {
			text: t('upgrade.checking'),
			cls: 'quartz-publish-version-loading-text',
		});

		try {
			const github = new GitHubService(githubToken, repoUrl, defaultBranch);
			this.quartzUpgradeService = new QuartzUpgradeService(github);

			const versionInfo = await this.quartzUpgradeService.checkVersion();
			this.renderVersionInfo(versionInfo);
		} catch (error) {
			this.upgradeContainerEl.empty();
			const message = error instanceof Error ? error.message : t('error.unknown');

			const errorContainer = this.upgradeContainerEl.createDiv({
				cls: 'quartz-publish-version-error',
			});
			errorContainer.createEl('p', {
				text: t('upgrade.checkFailed', { message }),
				cls: 'quartz-publish-version-error-text',
			});

			const retryButton = errorContainer.createEl('button', {
				text: t('settings.quartz.retry'),
			});
			retryButton.addEventListener('click', async () => {
				await this.checkForUpdates();
			});
		}
	}

	/**
	 * 버전 정보 표시
	 */
	private renderVersionInfo(versionInfo: QuartzVersionInfo): void {
		if (!this.upgradeContainerEl) return;

		this.upgradeContainerEl.empty();

		const headerEl = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-card-header',
		});
		headerEl.createEl('span', {
			text: t('upgrade.versionInfo'),
			cls: 'quartz-publish-version-card-title',
		});

		const badgeEl = headerEl.createEl('span', {
			cls: `quartz-publish-version-badge ${versionInfo.hasUpdate ? 'quartz-publish-version-badge--warning' : 'quartz-publish-version-badge--success'}`,
		});
		badgeEl.textContent = versionInfo.hasUpdate ? t('upgrade.updateBadge') : t('upgrade.upToDateBadge');

		const gridEl = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-grid',
		});

		const currentItem = gridEl.createDiv({ cls: 'quartz-publish-version-item' });
		currentItem.createEl('span', { text: t('upgrade.current'), cls: 'quartz-publish-version-label' });
		currentItem.createEl('span', {
			text: versionInfo.current ?? 'Unknown',
			cls: 'quartz-publish-version-value',
		});

		const latestItem = gridEl.createDiv({ cls: 'quartz-publish-version-item' });
		latestItem.createEl('span', { text: t('upgrade.latest'), cls: 'quartz-publish-version-label' });
		latestItem.createEl('span', {
			text: versionInfo.latest ?? 'Unknown',
			cls: 'quartz-publish-version-value',
		});

		const statusEl = this.upgradeContainerEl.createDiv({
			cls: `quartz-publish-version-status ${versionInfo.hasUpdate ? 'quartz-publish-version-status--warning' : 'quartz-publish-version-status--success'}`,
		});

		if (versionInfo.hasUpdate) {
			statusEl.createEl('span', {
				text: '⚠',
				cls: 'quartz-publish-version-status-icon',
			});
			statusEl.createEl('span', {
				text: t('upgrade.updateAvailable', { current: versionInfo.current ?? '', latest: versionInfo.latest ?? '' }),
				cls: 'quartz-publish-version-status-text',
			});
		} else {
			statusEl.createEl('span', {
				text: '✓',
				cls: 'quartz-publish-version-status-icon',
			});
			statusEl.createEl('span', {
				text: t('upgrade.upToDate'),
				cls: 'quartz-publish-version-status-text',
			});
		}

		const footerEl = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-card-footer',
		});

		const checkAgainButton = footerEl.createEl('button', {
			text: t('upgrade.checkAgain'),
		});
		checkAgainButton.addEventListener('click', async () => {
			await this.checkForUpdates();
		});

		if (versionInfo.hasUpdate) {
			const upgradeButton = footerEl.createEl('button', {
				text: t('upgrade.upgradeButton'),
				cls: 'mod-cta',
			});
			upgradeButton.addEventListener('click', async () => {
				await this.performUpgrade();
			});
		}
	}

	/**
	 * 업그레이드 실행
	 */
	private async performUpgrade(): Promise<void> {
		if (!this.upgradeContainerEl || !this.quartzUpgradeService) {
			new Notice(t('upgrade.notInitialized'));
			return;
		}

		this.upgradeContainerEl.empty();

		// 진행 상황 표시 영역
		const progressContainer = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-upgrade-progress',
		});

		const statusEl = progressContainer.createEl('p', {
			text: t('upgrade.starting'),
			cls: 'qp:font-medium',
		});

		const progressBarContainer = progressContainer.createDiv({
			cls: 'quartz-publish-progress-bar-container qp:w-full qp:h-2 qp:rounded qp:overflow-hidden qp:my-2 qp:bg-obs-modifier-border',
		});

		const progressBar = progressBarContainer.createDiv({
			cls: 'quartz-publish-progress-bar',
		});
		progressBar.setCssStyles({
			height: '100%',
			transition: 'width 0.2s ease',
			backgroundColor: 'var(--interactive-accent)',
			width: 'var(--progress-width, 0%)',
		});

		const detailEl = progressContainer.createEl('p', {
			text: '',
			cls: 'qp:text-obs-text-muted qp:text-sm',
		});

		// 취소 버튼
		const cancelSetting = new Setting(progressContainer);

		cancelSetting.addButton((button) =>
			button.setButtonText(t('upgrade.cancel')).onClick(() => {
				this.quartzUpgradeService?.abort();
				statusEl.textContent = t('upgrade.cancelling');
			})
		);

		// 업그레이드 실행
		const onProgress = (progress: QuartzUpgradeProgress) => {
			const statusTexts: Record<string, string> = {
				checking: t('upgrade.checking'),
				downloading: t('upgrade.downloading'),
				applying: t('upgrade.applying'),
				completed: t('upgrade.completed'),
				error: t('upgrade.failed'),
			};

			statusEl.textContent = statusTexts[progress.status] || progress.status;

			if (progress.totalFiles > 0) {
				const percent = Math.round(
					(progress.completedFiles / progress.totalFiles) * 100
				);
				progressBar.setCssProps({ '--progress-width': `${percent}%` });
				detailEl.textContent = `${progress.completedFiles}/${progress.totalFiles} files`;

				if (progress.currentFile) {
					detailEl.textContent += ` - ${progress.currentFile}`;
				}
			}

			if (progress.error) {
				detailEl.textContent = progress.error;
				detailEl.className = 'qp:text-obs-text-error qp:text-sm';
			}
		};

		try {
			const result = await this.quartzUpgradeService.upgrade(onProgress);

			cancelSetting.settingEl.remove();

			if (result.success) {
				statusEl.textContent = t('upgrade.successMessage', { version: result.version ?? '' });
				statusEl.className = 'qp:text-obs-text-success qp:font-medium';
				progressBar.setCssProps({ '--progress-width': '100%' });
				detailEl.textContent = t('upgrade.filesUpdated', { count: result.filesUpdated ?? 0 });

				new Notice(t('upgrade.successMessage', { version: result.version ?? '' }));
			} else {
				statusEl.textContent = t('upgrade.failed');
				statusEl.className = 'qp:text-obs-text-error qp:font-medium';
				detailEl.textContent = result.error || t('error.unknown');

				new Notice(t('upgrade.failedMessage', { error: result.error ?? '' }));
			}
		} catch (error) {
			cancelSetting.settingEl.remove();

			const message = error instanceof Error ? error.message : t('error.unknown');
			statusEl.textContent = t('upgrade.failed');
			statusEl.className = 'qp:text-obs-text-error qp:font-medium';
			detailEl.textContent = message;

			new Notice(t('upgrade.failedMessage', { error: message }));
		}

		// 다시 확인 버튼
		new Setting(progressContainer).addButton((button) =>
			button.setButtonText(t('upgrade.checkAgain')).onClick(async () => {
				await this.checkForUpdates();
			})
		);
	}
}
