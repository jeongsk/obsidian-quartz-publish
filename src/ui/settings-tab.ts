/**
 * Quartz Publish Settings Tab
 *
 * 플러그인 설정 UI를 제공합니다.
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type QuartzPublishPlugin from '../main';
import { GitHubService } from '../services/github';

/**
 * 플러그인 설정 탭
 */
export class QuartzPublishSettingTab extends PluginSettingTab {
	plugin: QuartzPublishPlugin;
	private connectionStatusEl: HTMLElement | null = null;

	constructor(app: App, plugin: QuartzPublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// GitHub 연동 섹션
		this.createGitHubSection(containerEl);
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
			.setDesc('Target branch for publishing (default: main)')
			.addText((text) =>
				text
					.setPlaceholder('main')
					.setValue(this.plugin.settings.defaultBranch)
					.onChange(async (value) => {
						this.plugin.settings.defaultBranch = value || 'main';
						await this.plugin.saveSettings();
					})
			);

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
				this.showConnectionStatus(
					'connected',
					`Connected to ${result.repository.owner}/${result.repository.name} (${result.repository.defaultBranch})`
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
			cls: status === 'error' ? 'hn:text-obs-text-error' : '',
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
}
