import { Plugin, TFile, Notice } from 'obsidian';
import type { PluginSettings, PluginData, PublishRecord, BatchPublishResult, UnpublishResult } from './types';
import { DEFAULT_SETTINGS } from './types';
import { QuartzPublishSettingTab } from './ui/settings-tab';
import { PublishService } from './services/publish';
import { StatusService } from './services/status';
import { DashboardModal } from './ui/dashboard-modal';

/**
 * Quartz Publish Plugin
 *
 * Obsidian 노트를 Quartz 정적 사이트로 발행하는 플러그인입니다.
 */
export default class QuartzPublishPlugin extends Plugin {
	settings!: PluginSettings;
	publishRecords!: Record<string, PublishRecord>;
	private statusService!: StatusService;

	async onload(): Promise<void> {
		await this.loadSettings();

		// StatusService 초기화
		this.statusService = new StatusService({
			vault: this.app.vault,
			metadataCache: this.app.metadataCache,
			getPublishRecords: () => this.publishRecords,
			contentPath: this.settings.contentPath,
			staticPath: this.settings.staticPath,
		});

		// 설정 탭 등록
		this.addSettingTab(new QuartzPublishSettingTab(this.app, this));

		// 커맨드 등록: 현재 노트 발행
		this.addCommand({
			id: 'publish-current-note',
			name: 'Publish current note to Quartz',
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
			name: 'Open Publish Dashboard',
			callback: () => {
				this.openDashboard();
			},
		});

		// 리본 아이콘 등록: 대시보드 열기
		this.addRibbonIcon('layout-dashboard', 'Open Publish Dashboard', () => {
			this.openDashboard();
		});

		// 리본 아이콘 등록: 현재 노트 발행
		this.addRibbonIcon('upload', 'Publish current note to Quartz', () => {
			const file = this.app.workspace.getActiveFile();
			if (file && file.extension === 'md') {
				this.publishNote(file);
			} else {
				new Notice('No markdown file is active');
			}
		});

		// 파일 메뉴: Publish to Quartz
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile && file.extension === 'md') {
					menu.addItem((item) => {
						item.setTitle('Publish to Quartz')
							.setIcon('upload')
							.onClick(() => this.publishNote(file));
					});
				}
			})
		);

		console.log('Quartz Publish plugin loaded');
	}

	onunload(): void {
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
		// 설정 확인
		if (!this.settings.githubToken || !this.settings.repoUrl) {
			new Notice('Please configure GitHub settings first');
			return;
		}

		new Notice(`Publishing ${file.basename}...`);

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
				new Notice(`Published: ${file.basename} → ${result.remotePath}`);
			} else {
				new Notice(`Failed to publish: ${file.basename} (${result.error})`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Publish error: ${message}`);
			console.error('[QuartzPublish] Publish error:', error);
		}
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
			new Notice('Please configure GitHub settings first');
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
			new Notice('Please configure GitHub settings first');
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
