/**
 * Quartz Publish Settings Tab
 *
 * 플러그인 설정 UI를 제공합니다.
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent } from 'obsidian';
import type QuartzPublishPlugin from '../main';
import { GitHubService } from '../services/github';
import { QuartzConfigService, type ParsedQuartzConfig } from '../services/quartz-config';
import { QuartzUpgradeService } from '../services/quartz-upgrade';
import { validateGlobPattern } from '../utils/glob-validator';
import type { QuartzVersionInfo, QuartzUpgradeProgress } from '../types';
import { DEFAULT_AUTO_DATE_SETTINGS } from '../types';

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

	constructor(app: App, plugin: QuartzPublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
		new Setting(containerEl).setName('GitHub Connection').setHeading();

		// GitHub Token 입력
		new Setting(containerEl)
			.setName('GitHub Token')
			.setDesc(
				createFragment((el) => {
					el.appendText('Personal Access Token with ');
					el.createEl('code', { text: 'repo' });
					el.appendText(' scope. ');
					el.createEl('a', {
						href: 'https://github.com/settings/tokens/new?scopes=repo',
						text: 'Create token',
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
			.setName('Repository URL')
			.setDesc('Your Quartz repository URL (e.g., https://github.com/user/quartz)')
			.addText((text) =>
				text
					.setPlaceholder('https://github.com/user/quartz')
					.setValue(this.plugin.settings.repoUrl)
					.onChange(async (value) => {
						this.plugin.settings.repoUrl = value;
						await this.plugin.saveSettings();
					})
			);

		// 브랜치 설정
		new Setting(containerEl)
			.setName('Branch')
			.setDesc('Target branch for publishing (auto-detected on connection test)')
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
			.setName('Test Connection')
			.setDesc('Verify GitHub connection and Quartz repository')
			.addButton((button) =>
				button
					.setButtonText('Test Connection')
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
		new Setting(containerEl).setName('Auto Date Fields').setHeading();

		new Setting(containerEl)
			.setName('Automatic date fields')
			.setDesc(
				'Automatically add date fields to frontmatter when publishing. Existing fields are preserved.'
			);

		// Created 날짜 토글
		new Setting(containerEl)
			.setName('Add created date')
			.setDesc('Add file creation date (format: YYYY-MM-DD)')
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
			.setName('Add modified date')
			.setDesc('Add file modification date (format: YYYY-MM-DD)')
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
			.setName('Add published date')
			.setDesc('Add current date as published date (format: YYYY-MM-DD)')
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
			this.showConnectionStatus('error', 'Please enter your GitHub token');
			return;
		}

		if (!repoUrl) {
			this.showConnectionStatus('error', 'Please enter your repository URL');
			return;
		}

		this.showConnectionStatus('connecting', 'Testing connection...');

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
					`Connected to ${result.repository.owner}/${result.repository.name} (branch: ${detectedBranch})`
				);
				new Notice('Connection successful!');
			} else if (result.error) {
				this.showConnectionStatus('error', this.getErrorMessage(result.error.type));
				new Notice(`Connection failed: ${result.error.message}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			this.showConnectionStatus('error', message);
			new Notice(`Connection failed: ${message}`);
		}
	}

	/**
	 * 연결 상태 표시
	 */
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
				return 'Invalid or expired GitHub token';
			case 'not_found':
				return 'Repository not found or no access permission';
			case 'not_quartz':
				return 'This repository is not a Quartz site (quartz.config.ts not found)';
			case 'rate_limited':
				return 'GitHub API rate limit exceeded. Please try again later.';
			case 'network_error':
				return 'Network error. Please check your internet connection.';
			default:
				return 'An unknown error occurred';
		}
	}

	// ============================================================================
	// Quartz Settings Section
	// ============================================================================

	/**
	 * Quartz 설정 섹션 생성
	 */
	private createQuartzSettingsSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Quartz Configuration').setHeading();

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
				text: 'Connect to GitHub first to configure Quartz settings.',
				cls: 'qp:text-obs-text-muted qp:text-sm',
			});
			return;
		}

		// 설정 로드 버튼
		new Setting(this.quartzSettingsContainerEl)
			.setName('Load Quartz Settings')
			.setDesc('Fetch settings from quartz.config.ts')
			.addButton((button) =>
				button.setButtonText('Load').onClick(async () => {
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
			new Notice('Please connect to GitHub first');
			return;
		}

		this.isQuartzSettingsLoading = true;
		this.quartzSettingsContainerEl.empty();
		this.quartzSettingsContainerEl.createEl('p', {
			text: 'Loading Quartz settings...',
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
				throw new Error(`quartz.config.ts not found in branch "${defaultBranch}"`);
			}

			const parsed = this.quartzConfigService.parseConfig(configFile.content);
			if (!parsed) {
				throw new Error('Failed to parse quartz.config.ts');
			}

			this.renderQuartzSettings(parsed);
		} catch (error) {
			this.quartzSettingsContainerEl.empty();
			const message = error instanceof Error ? error.message : 'Unknown error';
			this.quartzSettingsContainerEl.createEl('p', {
				text: `Failed to load settings: ${message}`,
				cls: 'qp:text-obs-text-error qp:text-sm',
			});

			// 재시도 버튼
			new Setting(this.quartzSettingsContainerEl).addButton((button) =>
				button.setButtonText('Retry').onClick(async () => {
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

		// ExplicitPublish 토글 (US1)
		this.renderExplicitPublishToggle(config);

		// 제외 패턴 설정 (US2)
		this.renderIgnorePatternsSettings(config);

		// URL 전략 설정 (US3)
		this.renderUrlStrategySettings(config);

		// Quartz 업그레이드 섹션 (US4)
		this.renderUpgradeSection();

		// 새로고침 버튼
		new Setting(this.quartzSettingsContainerEl).addButton((button) =>
			button
				.setButtonText('Refresh')
				.setTooltip('Reload settings from GitHub')
				.onClick(async () => {
					this.quartzConfigService?.invalidateCache();
					await this.loadQuartzSettings();
				})
		);
	}

	/**
	 * ExplicitPublish 토글 렌더링 (User Story 1)
	 */
	private renderExplicitPublishToggle(config: ParsedQuartzConfig): void {
		if (!this.quartzSettingsContainerEl) return;

		const setting = new Setting(this.quartzSettingsContainerEl)
			.setName('Selective Publishing')
			.setDesc(
				'Only publish notes with "publish: true" in frontmatter. When disabled, all notes except drafts are published.'
			)
			.addToggle((toggle) => {
				toggle.setValue(config.explicitPublish).onChange(async (value) => {
					await this.updateExplicitPublish(value, toggle.toggleEl);
				});
			});

		// 상태 표시 영역
		setting.descEl.createDiv({
			cls: 'quartz-publish-setting-status',
		});
	}

	/**
	 * ExplicitPublish 설정 업데이트
	 */
	private async updateExplicitPublish(
		enabled: boolean,
		toggleEl: HTMLElement
	): Promise<void> {
		if (!this.quartzConfigService) {
			new Notice('Config service not initialized');
			return;
		}

		// 로딩 상태 표시
		toggleEl.addClass('is-loading');
		const statusEl = toggleEl
			.closest('.setting-item')
			?.querySelector('.quartz-publish-setting-status');

		if (statusEl) {
			statusEl.textContent = 'Saving...';
			statusEl.className = 'quartz-publish-setting-status qp:text-obs-text-muted';
		}

		try {
			// 현재 설정 가져오기
			const configFile = await this.quartzConfigService.fetchQuartzConfig(true);
			if (!configFile) {
				throw new Error('Failed to fetch config');
			}

			// 설정 변경
			const result = this.quartzConfigService.setExplicitPublish(
				configFile.content,
				enabled
			);
			if (!result.success || !result.newContent) {
				throw new Error(result.error || 'Failed to update config');
			}

			// GitHub에 커밋
			const commitMessage = enabled
				? 'Enable ExplicitPublish filter'
				: 'Disable ExplicitPublish filter (use RemoveDrafts)';

			const commitResult = await this.quartzConfigService.commitConfigChange(
				result.newContent,
				commitMessage
			);

			if (!commitResult.success) {
				throw new Error(commitResult.error || 'Failed to commit');
			}

			// 성공 표시
			if (statusEl) {
				statusEl.textContent = 'Saved!';
				statusEl.className = 'quartz-publish-setting-status qp:text-obs-text-success';
				setTimeout(() => {
					statusEl.textContent = '';
				}, 2000);
			}

			new Notice('Setting saved successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';

			if (statusEl) {
				statusEl.textContent = `Error: ${message}`;
				statusEl.className = 'quartz-publish-setting-status qp:text-obs-text-error';
			}

			new Notice(`Failed to save: ${message}`);
		} finally {
			toggleEl.removeClass('is-loading');
		}
	}

	/**
	 * 제외 패턴 설정 렌더링 (User Story 2)
	 */
	private renderIgnorePatternsSettings(config: ParsedQuartzConfig): void {
		if (!this.quartzSettingsContainerEl) return;

		// 섹션 헤더
		new Setting(this.quartzSettingsContainerEl)
			.setName('Ignore Patterns')
			.setDesc('Glob patterns for files/folders to exclude from publishing');

		// 현재 패턴 목록
		const patternsContainer = this.quartzSettingsContainerEl.createDiv({
			cls: 'quartz-publish-patterns-list',
		});

		const patterns = [...config.ignorePatterns];

		const renderPatternsList = () => {
			patternsContainer.empty();

			if (patterns.length === 0) {
				patternsContainer.createEl('p', {
					text: 'No patterns configured',
					cls: 'qp:text-obs-text-muted qp:text-sm',
				});
			} else {
				patterns.forEach((pattern, index) => {
					const patternEl = patternsContainer.createDiv({
						cls: 'quartz-publish-pattern-item qp:flex qp:items-center qp:gap-2 qp:mb-1',
					});

					patternEl.createEl('code', {
						text: pattern,
						cls: 'qp:flex-1',
					});

					const removeBtn = patternEl.createEl('button', {
						cls: 'qp:text-obs-text-error',
						attr: { 'aria-label': 'Remove pattern' },
					});
					removeBtn.textContent = '×';
					removeBtn.onclick = async () => {
						patterns.splice(index, 1);
						renderPatternsList();
						await this.updateIgnorePatterns(patterns);
					};
				});
			}
		};

		renderPatternsList();

		// 패턴 추가 입력
		const addPatternContainer = this.quartzSettingsContainerEl.createDiv({
			cls: 'quartz-publish-add-pattern qp:flex qp:gap-2 qp:mt-2',
		});

		const inputEl = addPatternContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., private/*, **/*.draft.md',
			cls: 'qp:flex-1',
		});

		const errorEl = this.quartzSettingsContainerEl.createDiv({
			cls: 'qp:text-obs-text-error qp:text-sm qp:mt-1',
		});

		const addBtn = addPatternContainer.createEl('button', {
			text: 'Add',
		});

		addBtn.onclick = async () => {
			const newPattern = inputEl.value.trim();
			if (!newPattern) return;

			// 유효성 검사
			const validation = validateGlobPattern(newPattern);
			if (!validation.valid) {
				errorEl.textContent = validation.error || 'Invalid pattern';
				return;
			}

			// 중복 검사
			if (patterns.includes(newPattern)) {
				errorEl.textContent = 'Pattern already exists';
				return;
			}

			errorEl.textContent = '';
			patterns.push(newPattern);
			inputEl.value = '';
			renderPatternsList();
			await this.updateIgnorePatterns(patterns);
		};

		// Enter 키 지원
		inputEl.onkeydown = (e) => {
			if (e.key === 'Enter') {
				addBtn.click();
			}
		};
	}

	/**
	 * 제외 패턴 업데이트
	 */
	private async updateIgnorePatterns(patterns: string[]): Promise<void> {
		if (!this.quartzConfigService) {
			new Notice('Config service not initialized');
			return;
		}

		try {
			const configFile = await this.quartzConfigService.fetchQuartzConfig(true);
			if (!configFile) {
				throw new Error('Failed to fetch config');
			}

			const result = this.quartzConfigService.setIgnorePatterns(
				configFile.content,
				patterns
			);
			if (!result.success || !result.newContent) {
				throw new Error(result.error || 'Failed to update config');
			}

			const commitResult = await this.quartzConfigService.commitConfigChange(
				result.newContent,
				`Update ignorePatterns: ${patterns.length} patterns`
			);

			if (!commitResult.success) {
				throw new Error(commitResult.error || 'Failed to commit');
			}

			new Notice('Patterns updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to update patterns: ${message}`);
		}
	}

	/**
	 * URL 전략 설정 렌더링 (User Story 3)
	 */
	private renderUrlStrategySettings(config: ParsedQuartzConfig): void {
		if (!this.quartzSettingsContainerEl) return;

		const setting = new Setting(this.quartzSettingsContainerEl)
			.setName('URL Strategy')
			.setDesc('How URLs are generated for your notes')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('shortest', 'Shortest (default)')
					.addOption('absolute', 'Absolute paths')
					.setValue(config.urlStrategy)
					.onChange(async (value) => {
						await this.updateUrlStrategy(value as 'shortest' | 'absolute');
					});
			});

		// 상태 표시 영역
		setting.descEl.createDiv({
			cls: 'quartz-publish-setting-status',
		});
	}

	/**
	 * URL 전략 업데이트
	 */
	private async updateUrlStrategy(
		strategy: 'shortest' | 'absolute'
	): Promise<void> {
		if (!this.quartzConfigService) {
			new Notice('Config service not initialized');
			return;
		}

		try {
			const configFile = await this.quartzConfigService.fetchQuartzConfig(true);
			if (!configFile) {
				throw new Error('Failed to fetch config');
			}

			const result = this.quartzConfigService.setUrlStrategy(
				configFile.content,
				strategy
			);
			if (!result.success || !result.newContent) {
				throw new Error(result.error || 'Failed to update config');
			}

			const commitResult = await this.quartzConfigService.commitConfigChange(
				result.newContent,
				`Set urlStrategy to "${strategy}"`
			);

			if (!commitResult.success) {
				throw new Error(commitResult.error || 'Failed to commit');
			}

			new Notice('URL strategy updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Failed to update URL strategy: ${message}`);
		}
	}

	// ============================================================================
	// Quartz Upgrade Section (User Story 4)
	// ============================================================================

	/**
	 * 업그레이드 섹션 렌더링
	 */
	private renderUpgradeSection(): void {
		if (!this.quartzSettingsContainerEl) return;

		// 섹션 헤더
		new Setting(this.quartzSettingsContainerEl)
			.setName('Quartz Version')
			.setDesc('Check for updates and upgrade Quartz core files');

		// 업그레이드 컨테이너
		this.upgradeContainerEl = this.quartzSettingsContainerEl.createDiv({
			cls: 'quartz-publish-upgrade-container',
		});

		// 버전 확인 버튼
		new Setting(this.upgradeContainerEl)
			.setName('Check for Updates')
			.addButton((button) =>
				button.setButtonText('Check').onClick(async () => {
					await this.checkForUpdates();
				})
			);
	}

	/**
	 * 업데이트 확인
	 */
	private async checkForUpdates(): Promise<void> {
		if (!this.upgradeContainerEl) return;

		const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;
		if (!githubToken || !repoUrl) {
			new Notice('Please connect to GitHub first');
			return;
		}

		// 로딩 표시
		this.upgradeContainerEl.empty();
		this.upgradeContainerEl.createEl('p', {
			text: 'Checking for updates...',
			cls: 'qp:text-obs-text-muted qp:text-sm',
		});

		try {
			const github = new GitHubService(githubToken, repoUrl, defaultBranch);
			this.quartzUpgradeService = new QuartzUpgradeService(github);

			const versionInfo = await this.quartzUpgradeService.checkVersion();
			this.renderVersionInfo(versionInfo);
		} catch (error) {
			this.upgradeContainerEl.empty();
			const message = error instanceof Error ? error.message : 'Unknown error';
			this.upgradeContainerEl.createEl('p', {
				text: `Failed to check updates: ${message}`,
				cls: 'qp:text-obs-text-error qp:text-sm',
			});

			// 재시도 버튼
			new Setting(this.upgradeContainerEl).addButton((button) =>
				button.setButtonText('Retry').onClick(async () => {
					await this.checkForUpdates();
				})
			);
		}
	}

	/**
	 * 버전 정보 표시
	 */
	private renderVersionInfo(versionInfo: QuartzVersionInfo): void {
		if (!this.upgradeContainerEl) return;

		this.upgradeContainerEl.empty();

		// 현재 버전 표시
		const currentVersionEl = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-info qp:mb-2',
		});
		currentVersionEl.createEl('span', {
			text: 'Current version: ',
			cls: 'qp:text-obs-text-muted',
		});
		currentVersionEl.createEl('code', {
			text: versionInfo.current ?? 'Unknown',
		});

		// 최신 버전 표시
		const latestVersionEl = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-version-info qp:mb-2',
		});
		latestVersionEl.createEl('span', {
			text: 'Latest version: ',
			cls: 'qp:text-obs-text-muted',
		});
		latestVersionEl.createEl('code', {
			text: versionInfo.latest ?? 'Unknown',
		});

		// 업데이트 상태 및 버튼
		if (versionInfo.hasUpdate) {
			const updateAvailableEl = this.upgradeContainerEl.createDiv({
				cls: 'quartz-publish-update-available qp:p-2 qp:rounded qp:mb-2',
			});
			updateAvailableEl.createEl('p', {
				text: `Update available: ${versionInfo.current} → ${versionInfo.latest}`,
				cls: 'qp:text-obs-text-accent qp:font-medium',
			});

			new Setting(this.upgradeContainerEl)
				.setName('Upgrade Quartz')
				.setDesc('Download and apply the latest Quartz core files')
				.addButton((button) =>
					button
						.setButtonText('Upgrade')
						.setCta()
						.onClick(async () => {
							await this.performUpgrade();
						})
				);
		} else {
			this.upgradeContainerEl.createEl('p', {
				text: '✓ You are using the latest version',
				cls: 'qp:text-obs-text-success qp:text-sm',
			});
		}

		// 다시 확인 버튼
		new Setting(this.upgradeContainerEl).addButton((button) =>
			button
				.setButtonText('Check Again')
				.setTooltip('Refresh version information')
				.onClick(async () => {
					await this.checkForUpdates();
				})
		);
	}

	/**
	 * 업그레이드 실행
	 */
	private async performUpgrade(): Promise<void> {
		if (!this.upgradeContainerEl || !this.quartzUpgradeService) {
			new Notice('Upgrade service not initialized');
			return;
		}

		this.upgradeContainerEl.empty();

		// 진행 상황 표시 영역
		const progressContainer = this.upgradeContainerEl.createDiv({
			cls: 'quartz-publish-upgrade-progress',
		});

		const statusEl = progressContainer.createEl('p', {
			text: 'Starting upgrade...',
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
			button.setButtonText('Cancel').onClick(() => {
				this.quartzUpgradeService?.abort();
				statusEl.textContent = 'Cancelling...';
			})
		);

		// 업그레이드 실행
		const onProgress = (progress: QuartzUpgradeProgress) => {
			const statusTexts: Record<string, string> = {
				checking: 'Checking version...',
				downloading: 'Downloading files...',
				applying: 'Applying changes...',
				completed: 'Upgrade completed!',
				error: 'Upgrade failed',
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
				statusEl.textContent = `Successfully upgraded to ${result.version}`;
				statusEl.className = 'qp:text-obs-text-success qp:font-medium';
				progressBar.setCssProps({ '--progress-width': '100%' });
				detailEl.textContent = `${result.filesUpdated} files updated`;

				new Notice(`Quartz upgraded to ${result.version}`);
			} else {
				statusEl.textContent = 'Upgrade failed';
				statusEl.className = 'qp:text-obs-text-error qp:font-medium';
				detailEl.textContent = result.error || 'Unknown error';

				new Notice(`Upgrade failed: ${result.error}`);
			}
		} catch (error) {
			cancelSetting.settingEl.remove();

			const message = error instanceof Error ? error.message : 'Unknown error';
			statusEl.textContent = 'Upgrade failed';
			statusEl.className = 'qp:text-obs-text-error qp:font-medium';
			detailEl.textContent = message;

			new Notice(`Upgrade failed: ${message}`);
		}

		// 다시 확인 버튼
		new Setting(progressContainer).addButton((button) =>
			button.setButtonText('Check Again').onClick(async () => {
				await this.checkForUpdates();
			})
		);
	}
}
