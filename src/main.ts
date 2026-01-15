import { Plugin, TFile, Notice } from 'obsidian';
import type { PluginSettings, PluginData, PublishRecord, BatchPublishResult, UnpublishResult, QuartzFrontmatter } from './types';
import { DEFAULT_SETTINGS, DEFAULT_PUBLISH_FILTER_SETTINGS, DEFAULT_VALIDATION_SETTINGS } from './types';
import { QuartzPublishSettingTab } from './ui/settings-tab';
import { PublishService } from './services/publish';
import { StatusService } from './services/status';
import { NetworkService } from './services/network';
import { ContentTransformer } from './services/transformer';
import { DashboardModal } from './ui/dashboard-modal';
import { FrontmatterEditorModal } from './ui/frontmatter-editor-modal';
import { initI18n, t } from './i18n';
import { isValidGitHubUrl, normalizeBaseUrl } from './utils/url';

/**
 * Quartz Publish Plugin
 *
 * Obsidian 노트를 Quartz 정적 사이트로 발행하는 플러그인입니다.
 */
export default class QuartzPublishPlugin extends Plugin {
	settings!: PluginSettings;
	publishRecords!: Record<string, PublishRecord>;
	private statusService!: StatusService;
	private networkService!: NetworkService;

	async onload(): Promise<void> {
		initI18n();
		await this.loadSettings();

		// NetworkService 초기화
		this.networkService = new NetworkService();

		// StatusService 초기화
		this.statusService = new StatusService({
			vault: this.app.vault,
			metadataCache: this.app.metadataCache,
			getPublishRecords: () => this.publishRecords,
			getFilterSettings: () => this.settings.publishFilterSettings ?? DEFAULT_PUBLISH_FILTER_SETTINGS,
			contentPath: this.settings.contentPath,
			staticPath: this.settings.staticPath,
		});

		// 설정 탭 등록
		this.addSettingTab(new QuartzPublishSettingTab(this.app, this));

		// 커맨드 등록: 현재 노트 발행
		this.addCommand({
			id: 'publish-current-note',
			name: t('command.publishNote'),
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (file && file.extension === 'md') {
					if (!checking) {
						this.publishNote(file);
					}
					return true;
				}
				return false;
			},
		});

		// 커맨드 등록: 대시보드 열기
		this.addCommand({
			id: 'open-publish-dashboard',
			name: t('command.openDashboard'),
			callback: () => {
				this.openDashboard();
			},
		});

		// 커맨드 등록: GitHub 저장소 열기
		this.addCommand({
			id: 'open-github-repo',
			name: t('command.openGitHubRepo'),
			callback: () => {
				const repoUrl = this.settings.repoUrl;
				if (repoUrl && isValidGitHubUrl(repoUrl)) {
					window.open(repoUrl, '_blank');
				} else {
					new Notice(t('notice.noGitHubRepo'));
				}
			},
		});

		// 커맨드 등록: 배포 사이트 열기
		this.addCommand({
			id: 'open-deployed-site',
			name: t('command.openDeployedSite'),
			callback: () => {
				const baseUrl = this.settings.quartzSiteConfig?.baseUrl;
				if (baseUrl) {
					window.open(normalizeBaseUrl(baseUrl), '_blank');
				} else {
					new Notice(t('notice.noBaseUrl'));
				}
			},
		});

		// 리본 아이콘 등록: 대시보드 열기
		this.addRibbonIcon('layout-dashboard', t('command.openDashboard'), () => {
			this.openDashboard();
		});

		// 리본 아이콘 등록: 현재 노트 발행
		this.addRibbonIcon('upload', t('command.publishNote'), () => {
			const file = this.app.workspace.getActiveFile();
			if (file && file.extension === 'md') {
				this.publishNote(file);
			} else {
				new Notice(t('notice.noActiveFile'));
			}
		});

		// 파일 메뉴: Publish to Quartz
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item.setTitle(t('menu.publishToQuartz'))
							.setIcon('upload')
							.onClick(() => this.publishNote(file));
					});
				}
			})
		);

		console.log('Quartz Publish plugin loaded');
	}

	onunload(): void {
		// NetworkService 정리
		this.networkService?.destroy();
		console.log('Quartz Publish plugin unloaded');
	}

	/**
	 * 플러그인 설정 로드
	 */
	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as PluginData | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);
		this.publishRecords = data?.publishRecords ?? {};
	}

	/**
	 * 플러그인 설정 저장
	 */
	async saveSettings(): Promise<void> {
		const data: PluginData = {
			settings: this.settings,
			publishRecords: this.publishRecords,
		};
		await this.saveData(data);
	}

	/**
	 * 발행 기록 업데이트
	 */
	async updatePublishRecord(localPath: string, record: PublishRecord): Promise<void> {
		this.publishRecords[localPath] = record;
		await this.saveSettings();
	}

	/**
	 * 발행 기록 삭제
	 */
	async removePublishRecord(localPath: string): Promise<void> {
		delete this.publishRecords[localPath];
		await this.saveSettings();
	}

	/**
	 * 발행 기록 조회
	 */
	getPublishRecord(localPath: string): PublishRecord | undefined {
		return this.publishRecords[localPath];
	}

	/**
	 * 노트 발행
	 */
	async publishNote(file: TFile): Promise<void> {
		// 네트워크 연결 확인
		if (!this.networkService.isOnline()) {
			new Notice(t('notice.network.offline'));
			return;
		}

		// 설정 확인
		if (!this.settings.githubToken || !this.settings.repoUrl) {
			new Notice(t('notice.configureFirst'));
			return;
		}

		// Frontmatter 편집기 표시 (설정이 활성화된 경우)
		let frontmatterOverride: QuartzFrontmatter | undefined;
		if (this.settings.showFrontmatterEditor) {
			const transformer = new ContentTransformer(
				this.app.vault,
				this.app.metadataCache,
				this.settings.contentPath,
				this.settings.staticPath
			);
			const currentFrontmatter = transformer.getFrontmatterFromCache(file);

			const editorModal = new FrontmatterEditorModal(this.app, {
				file,
				frontmatter: currentFrontmatter,
				validationSettings: this.settings.validationSettings ?? DEFAULT_VALIDATION_SETTINGS,
				transformer,
			});

			const result = await editorModal.waitForResult();
			if (!result.saved) {
				// 사용자가 취소함
				new Notice(t('notice.publish.cancelled'));
				return;
			}
			frontmatterOverride = result.frontmatter;

			// 편집된 frontmatter를 파일에 적용
			await this.applyFrontmatterToFile(file, frontmatterOverride);
		}

		new Notice(t('notice.publish.start', { filename: file.basename }));

		try {
			const publishService = new PublishService(
				this.app.vault,
				this.app.metadataCache,
				this.settings,
				this.publishRecords,
				this.updatePublishRecord.bind(this),
				this.removePublishRecord.bind(this)
			);

			const result = await publishService.publishNote(file);

			if (result.success) {
				new Notice(t('notice.publish.success', { filename: file.basename, path: result.remotePath ?? '' }));
			} else {
				new Notice(t('notice.publish.failed', { filename: file.basename, error: result.error ?? '' }));
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : t('error.unknown');
			new Notice(t('notice.publish.error', { message }));
			console.error('[QuartzPublish] Publish error:', error);
		}
	}

	/**
	 * 파일에 frontmatter 적용
	 */
	private async applyFrontmatterToFile(file: TFile, frontmatter: QuartzFrontmatter): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			// 기존 frontmatter 유지하면서 편집된 값만 업데이트
			for (const [key, value] of Object.entries(frontmatter)) {
				if (value === undefined) {
					delete fm[key];
				} else {
					fm[key] = value;
				}
			}
		});
	}

	/**
	 * 대시보드 모달 열기
	 */
	openDashboard(): void {
		new DashboardModal(this.app, {
			onPublish: async (files) => this.batchPublish(files),
			onDelete: async (files) => this.batchUnpublish(files),
			onLoadStatus: async (onProgress) =>
				this.statusService.calculateStatusOverview(onProgress),
			networkService: this.networkService,
		}).open();
	}

	/**
	 * 여러 노트 일괄 발행
	 */
	async batchPublish(files: TFile[]): Promise<BatchPublishResult> {
		const results: BatchPublishResult = {
			total: files.length,
			succeeded: 0,
			failed: 0,
			results: [],
		};

		if (!this.settings.githubToken || !this.settings.repoUrl) {
			new Notice(t('notice.configureFirst'));
			return results;
		}

		const publishService = new PublishService(
			this.app.vault,
			this.app.metadataCache,
			this.settings,
			this.publishRecords,
			this.updatePublishRecord.bind(this),
			this.removePublishRecord.bind(this)
		);

		return publishService.publishNotes(files);
	}

	/**
	 * 여러 노트 일괄 발행 취소 (삭제)
	 */
	async batchUnpublish(files: TFile[]): Promise<UnpublishResult[]> {
		const results: UnpublishResult[] = [];

		if (!this.settings.githubToken || !this.settings.repoUrl) {
			new Notice(t('notice.configureFirst'));
			return results;
		}

		const publishService = new PublishService(
			this.app.vault,
			this.app.metadataCache,
			this.settings,
			this.publishRecords,
			this.updatePublishRecord.bind(this),
			this.removePublishRecord.bind(this)
		);

		for (const file of files) {
			try {
				const result = await publishService.unpublishNote(file);
				results.push(result);

				// Rate limiting (500ms delay)
				await new Promise((resolve) => setTimeout(resolve, 500));
			} catch (error) {
				results.push({
					success: false,
					file,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return results;
	}
}
