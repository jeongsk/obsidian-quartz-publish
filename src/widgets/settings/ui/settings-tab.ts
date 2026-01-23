/**
 * Quartz Publish Settings Tab
 *
 * 플러그인 설정 UI를 제공합니다.
 */

import { App, PluginSettingTab, Setting, Notice, TextComponent, setIcon } from "obsidian";
import type QuartzPublishPlugin from "../../../app/main";
import { GitHubService } from "../../../entities/github/model/service";
import {
  QuartzConfigService,
  type ParsedQuartzConfig,
} from "../../../entities/quartz/model/config";
import { QuartzUpgradeService } from "../../../entities/quartz/model/upgrade";
import { PendingChangesManager } from "../../../features/sync-content/model/pending-changes";
import type {
  QuartzVersionInfo,
  QuartzUpgradeProgress,
  QuartzSiteConfig,
} from "../../../app/types";
import {
  DEFAULT_AUTO_DATE_SETTINGS,
  DEFAULT_PUBLISH_FILTER_SETTINGS,
  DEFAULT_VALIDATION_SETTINGS,
} from "../../../app/types";
import { SiteInfoSection } from "./sections/site-info-section";
import { BehaviorSection } from "./sections/behavior-section";
import { AnalyticsSection } from "./sections/analytics-section";
import { CommentsSection } from "./sections/comments-section";
import { TypographySection } from "./sections/typography-section";
import { PublishingSection } from "./sections/publishing-section";
import { PublishFilterSection } from "./sections/publish-filter-section";
import { ApplyButton } from "../../../shared/ui/apply-button";
import { UnsavedWarning } from "../../../shared/ui/unsaved-warning";
import { ConfirmModal } from "../../../shared/ui/confirm-modal";
import { ConflictModal } from "../../../shared/ui/conflict-modal";
import { CreateRepoModal } from "../../../features/create-repo/ui/modal";
import { DeployGuideModal } from "../../../features/create-repo/ui/deploy-guide-modal";
import { GitHubGuideModal } from "../../../shared/ui/github-guide-modal";
import { RemoteFileManagerModal } from "../../../features/sync-content/ui/remote-file-manager-modal";
import { t } from "../../../shared/lib/i18n";
import { isValidGitHubUrl, normalizeBaseUrl } from "../../../shared/lib/url";
import { cn } from "../../../shared/lib/cn";
import { ICON_QUARTZ_PUBLISH } from "../../../shared/config/constants/icons";

/**
 * 플러그인 설정 탭
 */
export class QuartzPublishSettingTab extends PluginSettingTab {
  icon = ICON_QUARTZ_PUBLISH;
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
  private commentsSection: CommentsSection | null = null;
  private typographySection: TypographySection | null = null;

  // Phase 8: Publishing Section (T058-T063)
  private publishingSection: PublishingSection | null = null;

  // Phase 8 (Feature 008): Publish Filter Section
  private publishFilterSection: PublishFilterSection | null = null;

  // Quick Links 버튼 참조
  private quickLinksContainerEl: HTMLElement | null = null;

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
        "Quartz Publish: 저장되지 않은 변경사항이 있습니다:",
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
    this.commentsSection = null;
    this.typographySection = null;
    this.publishingSection = null;
    this.publishFilterSection = null;
    this.applyButton = null;
    this.unsavedWarning = null;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // GitHub 연동 섹션
    this.createGitHubSection(containerEl);

    // 발행 설정 섹션
    this.createPublishFilterSection(containerEl);

    // Frontmatter 설정 섹션
    this.createFrontmatterSection(containerEl);

    // 날짜 자동 추가 섹션
    this.createAutoDateSection(containerEl);

    // Quartz 설정 섹션
    this.createQuartzSettingsSection(containerEl);
  }

  /**
   * GitHub 연동 섹션 생성
   */
  private createGitHubSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.github.title")).setHeading();

    // 바로가기 버튼 그룹

    // GitHub Token 입력
    const tokenSetting = new Setting(containerEl)
      .setName(t("settings.github.token"))
      .setDesc(
        createFragment((el) => {
          el.appendText(t("settings.github.tokenDesc") + " ");
          el.createEl("a", {
            href: "https://github.com/settings/tokens/new?scopes=repo",
            text: t("settings.github.tokenLink"),
          });
        })
      )
      .addText((text) =>
        text
          .setPlaceholder("ghp_xxxxxxxxxxxx")
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          })
      );

    // 토큰 입력 필드를 패스워드 타입으로 변경
    const tokenInputEl = tokenSetting.controlEl.querySelector("input");
    if (tokenInputEl) {
      tokenInputEl.type = "password";
      tokenInputEl.autocomplete = "off";
    }

    // Repository URL 입력
    new Setting(containerEl)
      .setName(t("settings.github.repoUrl"))
      .setDesc(t("settings.github.repoUrlDesc"))
      .addText((text) =>
        text
          .setPlaceholder("https://github.com/user/quartz")
          .setValue(this.plugin.settings.repoUrl)
          .onChange(async (value) => {
            this.plugin.settings.repoUrl = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (!this.plugin.settings.repoUrl && this.plugin.settings.githubToken) {
      new Setting(containerEl)
        .setName(t("settings.github.newToQuartz"))
        .setDesc(t("settings.github.newToQuartzDesc"))
        .addButton((button) =>
          button
            .setButtonText(t("settings.github.createRepo"))
            .setCta()
            .onClick(() => {
              this.openCreateRepoModal();
            })
        );
    }

    // 브랜치 설정
    new Setting(containerEl)
      .setName(t("settings.github.branch"))
      .setDesc(t("settings.github.branchDesc"))
      .addText((text) => {
        this.branchInputComponent = text;
        text
          .setPlaceholder("Auto-detected on connection test")
          .setValue(this.plugin.settings.defaultBranch)
          .onChange(async (value) => {
            this.plugin.settings.defaultBranch = value || "main";
            await this.plugin.saveSettings();
          });
      });

    // 연결 테스트 버튼
    new Setting(containerEl)
      .setName(t("settings.github.testConnection"))
      .setDesc(t("settings.github.testConnectionDesc"))
      .addButton((button) =>
        button
          .setButtonText(t("settings.github.testConnection"))
          .setCta()
          .onClick(async () => {
            await this.testConnection();
          })
      );

    // 연결 상태 표시 영역 (별도 카드로 분리)
    this.connectionStatusEl = containerEl.createDiv({
      cls: "quartz-publish-connection-status-card hidden",
    });

    // 발행된 파일 관리 버튼
    new Setting(containerEl)
      .setName(t("settings.github.manageFiles"))
      .setDesc(t("settings.github.manageFilesDesc"))
      .addButton((button) => {
        button.setButtonText(t("settings.github.manageFiles")).onClick(() => {
          this.openRemoteFileManagerModal();
        });
      });

    // GitHub 설정 가이드 버튼
    new Setting(containerEl)
      .setName(t("guide.button"))
      .setDesc(t("guide.buttonDesc"))
      .addButton((button) =>
        button.setButtonText(t("guide.button")).onClick(() => {
          this.openGitHubGuideModal();
        })
      );

    // 설정이 완료되지 않은 경우 자동으로 가이드 모달 표시
    this.checkAndShowGuideIfNeeded();
  }

  /**
   * 원격 파일 관리 모달 열기
   */
  private openRemoteFileManagerModal(): void {
    const { githubToken, repoUrl, defaultBranch, contentPath } = this.plugin.settings;

    if (!githubToken || !repoUrl) {
      new Notice(t("notice.configureFirst"));
      return;
    }

    const github = new GitHubService(githubToken, repoUrl, defaultBranch);
    const modal = new RemoteFileManagerModal(this.app, {
      gitHubService: github,
      contentPath: contentPath || "content",
    });
    modal.open();
  }

  /**
   * 바로가기 버튼 섹션 생성
   */
  private createQuickLinksSection(containerEl: HTMLElement): void {
    this.quickLinksContainerEl = containerEl.createDiv({
      cls: "flex flex-wrap gap-2 mb-4",
      attr: {
        role: "group",
        "aria-label": t("settings.quickLinks.title"),
      },
    });
  }

  /**
   * 바로가기 버튼 렌더링
   */
  private renderQuickLinksButtons(): void {
    if (!this.quickLinksContainerEl) return;

    this.quickLinksContainerEl.empty();

    const { repoUrl, quartzSiteConfig } = this.plugin.settings;
    const baseUrl = quartzSiteConfig?.baseUrl;

    // GitHub 저장소 버튼
    const isGithubDisabled = !repoUrl || !isValidGitHubUrl(repoUrl);
    const githubButton = this.quickLinksContainerEl.createEl("button", {
      cls: cn(
        "flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-obs-bg-modifier-hover text-obs-text-normal hover:bg-obs-bg-modifier-active-hover",
        isGithubDisabled && "opacity-60 cursor-not-allowed"
      ),
      attr: {
        "aria-label": isGithubDisabled
          ? t("settings.quickLinks.githubDisabled")
          : t("settings.quickLinks.github"),
        ...(isGithubDisabled && { "aria-disabled": "true" }),
      },
    });
    githubButton.createSpan({ text: t("settings.quickLinks.github") });
    githubButton.disabled = isGithubDisabled;

    if (!isGithubDisabled) {
      githubButton.addEventListener("click", () => {
        window.open(repoUrl, "_blank");
      });
    }

    // 배포 사이트 버튼
    const isSiteDisabled = !baseUrl;
    const siteButton = this.quickLinksContainerEl.createEl("button", {
      cls: cn(
        "flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-obs-bg-modifier-hover text-obs-text-normal hover:bg-obs-bg-modifier-active-hover",
        isSiteDisabled && "opacity-60 cursor-not-allowed"
      ),
      attr: {
        "aria-label": isSiteDisabled
          ? t("settings.quickLinks.siteDisabled")
          : t("settings.quickLinks.site"),
        ...(isSiteDisabled && { "aria-disabled": "true" }),
      },
    });
    siteButton.createSpan({ text: t("settings.quickLinks.site") });
    siteButton.disabled = isSiteDisabled;

    if (!isSiteDisabled) {
      siteButton.addEventListener("click", () => {
        window.open(normalizeBaseUrl(baseUrl), "_blank");
      });
    }
  }

  /**
   * 날짜 자동 추가 섹션 생성
   */
  private createAutoDateSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.autoDate.title")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.autoDate.title"))
      .setDesc(t("settings.autoDate.desc"));

    // Created 날짜 토글
    new Setting(containerEl)
      .setName(t("settings.autoDate.created"))
      .setDesc(t("settings.autoDate.createdDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.autoDateSettings?.enableCreated ??
              DEFAULT_AUTO_DATE_SETTINGS.enableCreated
          )
          .onChange(async (value) => {
            if (!this.plugin.settings.autoDateSettings) {
              this.plugin.settings.autoDateSettings = {
                ...DEFAULT_AUTO_DATE_SETTINGS,
              };
            }
            this.plugin.settings.autoDateSettings.enableCreated = value;
            await this.plugin.saveSettings();
          })
      );

    // Modified 날짜 토글
    new Setting(containerEl)
      .setName(t("settings.autoDate.modified"))
      .setDesc(t("settings.autoDate.modifiedDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.autoDateSettings?.enableModified ??
              DEFAULT_AUTO_DATE_SETTINGS.enableModified
          )
          .onChange(async (value) => {
            if (!this.plugin.settings.autoDateSettings) {
              this.plugin.settings.autoDateSettings = {
                ...DEFAULT_AUTO_DATE_SETTINGS,
              };
            }
            this.plugin.settings.autoDateSettings.enableModified = value;
            await this.plugin.saveSettings();
          })
      );

    // Published 날짜 토글
    new Setting(containerEl)
      .setName(t("settings.autoDate.published"))
      .setDesc(t("settings.autoDate.publishedDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.autoDateSettings?.enablePublished ??
              DEFAULT_AUTO_DATE_SETTINGS.enablePublished
          )
          .onChange(async (value) => {
            if (!this.plugin.settings.autoDateSettings) {
              this.plugin.settings.autoDateSettings = {
                ...DEFAULT_AUTO_DATE_SETTINGS,
              };
            }
            this.plugin.settings.autoDateSettings.enablePublished = value;
            await this.plugin.saveSettings();
          })
      );

    // Title 자동 추가 토글
    new Setting(containerEl)
      .setName(t("settings.autoDate.title_field"))
      .setDesc(t("settings.autoDate.title_fieldDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.autoDateSettings?.enableTitle ??
              DEFAULT_AUTO_DATE_SETTINGS.enableTitle
          )
          .onChange(async (value) => {
            if (!this.plugin.settings.autoDateSettings) {
              this.plugin.settings.autoDateSettings = {
                ...DEFAULT_AUTO_DATE_SETTINGS,
              };
            }
            this.plugin.settings.autoDateSettings.enableTitle = value;
            await this.plugin.saveSettings();
          })
      );

    // Description 자동 추가 토글
    new Setting(containerEl)
      .setName(t("settings.autoDate.description_field"))
      .setDesc(t("settings.autoDate.description_fieldDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings.autoDateSettings?.enableDescription ??
              DEFAULT_AUTO_DATE_SETTINGS.enableDescription
          )
          .onChange(async (value) => {
            if (!this.plugin.settings.autoDateSettings) {
              this.plugin.settings.autoDateSettings = {
                ...DEFAULT_AUTO_DATE_SETTINGS,
              };
            }
            this.plugin.settings.autoDateSettings.enableDescription = value;
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Frontmatter 설정 섹션 생성
   */
  private createFrontmatterSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.frontmatter.title")).setHeading();

    // 발행 전 편집기 표시
    new Setting(containerEl)
      .setName(t("settings.frontmatter.editor"))
      .setDesc(t("settings.frontmatter.editorDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showFrontmatterEditor ?? false)
          .onChange(async (value) => {
            this.plugin.settings.showFrontmatterEditor = value;
            await this.plugin.saveSettings();
          })
      );

    // 검증 활성화
    new Setting(containerEl)
      .setName(t("settings.frontmatter.validation"))
      .setDesc(t("settings.frontmatter.validationDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.validationSettings?.enabled ?? true)
          .onChange(async (value) => {
            if (!this.plugin.settings.validationSettings) {
              this.plugin.settings.validationSettings = {
                ...DEFAULT_VALIDATION_SETTINGS,
              };
            }
            this.plugin.settings.validationSettings.enabled = value;
            await this.plugin.saveSettings();
          })
      );

    // Title 필수
    new Setting(containerEl)
      .setName(t("settings.frontmatter.requireTitle"))
      .setDesc(t("settings.frontmatter.requireTitleDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.validationSettings?.requireTitle ?? false)
          .onChange(async (value) => {
            if (!this.plugin.settings.validationSettings) {
              this.plugin.settings.validationSettings = {
                ...DEFAULT_VALIDATION_SETTINGS,
              };
            }
            this.plugin.settings.validationSettings.requireTitle = value;
            await this.plugin.saveSettings();
          })
      );

    // Description 필수
    new Setting(containerEl)
      .setName(t("settings.frontmatter.requireDescription"))
      .setDesc(t("settings.frontmatter.requireDescriptionDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.validationSettings?.requireDescription ?? false)
          .onChange(async (value) => {
            if (!this.plugin.settings.validationSettings) {
              this.plugin.settings.validationSettings = {
                ...DEFAULT_VALIDATION_SETTINGS,
              };
            }
            this.plugin.settings.validationSettings.requireDescription = value;
            await this.plugin.saveSettings();
          })
      );

    // Tags 필수
    new Setting(containerEl)
      .setName(t("settings.frontmatter.requireTags"))
      .setDesc(t("settings.frontmatter.requireTagsDesc"))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.validationSettings?.requireTags ?? false)
          .onChange(async (value) => {
            if (!this.plugin.settings.validationSettings) {
              this.plugin.settings.validationSettings = {
                ...DEFAULT_VALIDATION_SETTINGS,
              };
            }
            this.plugin.settings.validationSettings.requireTags = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private createPublishFilterSection(containerEl: HTMLElement): void {
    const filterSettings =
      this.plugin.settings.publishFilterSettings ?? DEFAULT_PUBLISH_FILTER_SETTINGS;

    this.publishFilterSection = new PublishFilterSection(containerEl, {
      config: filterSettings,
      app: this.app,
      vault: this.app.vault,
      onChange: async (field, value) => {
        if (!this.plugin.settings.publishFilterSettings) {
          this.plugin.settings.publishFilterSettings = {
            ...DEFAULT_PUBLISH_FILTER_SETTINGS,
          };
        }
        this.plugin.settings.publishFilterSettings[field] = value;
        await this.plugin.saveSettings();
      },
    });
  }

  private createCustomCssSection(containerEl: HTMLElement): void {
    const BASE_IMPORT = '@use "./base.scss";';
    const CUSTOM_CSS_PATH = "quartz/styles/custom.scss";
    let cachedSha: string | undefined;

    new Setting(containerEl).setName(t("settings.customCss.title")).setHeading();

    new Setting(containerEl)
      .setName(t("settings.customCss.content"))
      .setDesc(t("settings.customCss.contentDesc"));

    const textareaContainer = containerEl.createDiv({
      cls: "setting-item-description",
    });

    // 로딩 상태 표시
    const statusEl = textareaContainer.createDiv({
      cls: "text-obs-text-muted text-sm mb-2",
    });
    statusEl.setText(t("settings.customCss.loading"));

    const textarea = textareaContainer.createEl("textarea", {
      cls: "w-full",
      attr: {
        rows: "10",
        placeholder: "/* Add your custom CSS here */\nbody {\n  background: #f0f0f0;\n}",
      },
    });
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    textarea.style.width = "100%";
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    textarea.style.minHeight = "200px";
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    textarea.style.fontFamily = "monospace";
    // eslint-disable-next-line obsidianmd/no-static-styles-assignment
    textarea.style.fontSize = "12px";
    textarea.disabled = true;

    // GitHub에서 custom.scss 로드
    const loadCustomCss = async () => {
      const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;
      if (!githubToken || !repoUrl) {
        statusEl.setText(t("notice.configureFirst"));
        textarea.disabled = true;
        return;
      }

      try {
        const github = new GitHubService(githubToken, repoUrl, defaultBranch);
        const file = await github.getFile(CUSTOM_CSS_PATH);
        if (file) {
          textarea.value = file.content;
          cachedSha = file.sha;
          this.plugin.settings.customCssContent = file.content;
          await this.plugin.saveSettings();
          statusEl.setText(t("settings.customCss.loaded"));
        } else {
          textarea.value = "";
          cachedSha = undefined;
          statusEl.setText(t("settings.customCss.notFound"));
        }
        textarea.disabled = false;
      } catch (error) {
        statusEl.setText(
          t("settings.customCss.loadError", {
            message: error instanceof Error ? error.message : "Unknown error",
          })
        );
        textarea.disabled = false;
      }
    };

    // 초기 로드
    loadCustomCss();

    textarea.addEventListener("change", async () => {
      this.plugin.settings.customCssContent = textarea.value;
      await this.plugin.saveSettings();
    });

    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText(t("settings.customCss.upload"))
        .setCta()
        .onClick(async () => {
          const userContent = this.plugin.settings.customCssContent ?? "";

          // 자동으로 @use "./base.scss"; 추가 (없는 경우)
          let finalContent = userContent;
          if (!userContent.includes(BASE_IMPORT)) {
            finalContent = `${BASE_IMPORT}\n\n// Custom CSS\n${userContent}`;
          }

          // GitHubService 초기화
          const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;
          if (!githubToken || !repoUrl) {
            new Notice(t("notice.configureFirst"));
            return;
          }

          try {
            const github = new GitHubService(githubToken, repoUrl, defaultBranch);
            const result = await github.createOrUpdateFile(
              CUSTOM_CSS_PATH,
              finalContent,
              "Update custom CSS",
              cachedSha
            );

            if (result.success) {
              cachedSha = result.sha;
              new Notice(t("notice.customCss.success"));
            } else {
              new Notice(
                t("notice.customCss.failed", {
                  error: result.error ?? "Unknown error",
                })
              );
            }
          } catch (error) {
            new Notice(
              t("notice.customCss.error", {
                message: error instanceof Error ? error.message : "Unknown error",
              })
            );
          }
        })
    );
  }

  private async testConnection(): Promise<void> {
    if (!this.connectionStatusEl) return;

    const { githubToken, repoUrl, defaultBranch } = this.plugin.settings;

    // 입력값 검증
    if (!githubToken) {
      this.showConnectionStatus("error", t("error.tokenRequired"));
      return;
    }

    if (!repoUrl) {
      this.showConnectionStatus("error", t("error.repoUrlRequired"));
      return;
    }

    this.showConnectionStatus("connecting", t("connection.connecting"));

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
          "connected",
          t("connection.connected", {
            owner: result.repository.owner,
            name: result.repository.name,
            branch: detectedBranch,
          }),
          {
            owner: result.repository.owner,
            repo: result.repository.name,
            branch: detectedBranch,
          }
        );
        new Notice(t("notice.connection.success"));
      } else if (result.error) {
        this.showConnectionStatus("error", this.getErrorMessage(result.error.type), {
          errorType: result.error.type,
        });
        new Notice(
          t("notice.connection.failed", {
            message: result.error.message,
          })
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error.unknown");
      this.showConnectionStatus("error", message, {
        errorType: "network_error",
      });
      new Notice(t("notice.connection.failed", { message }));
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

  /**
   * GitHub 설정 가이드 모달 열기 (T013)
   */
  private openGitHubGuideModal(): void {
    const modal = new GitHubGuideModal(this.app, {
      getSettings: () => this.plugin.settings,
      onClose: () => {
        // 모달이 닫히면 설정 탭 새로고침
        this.display();
      },
    });
    modal.open();
  }

  /**
   * 설정이 미완료인 경우 자동으로 가이드 모달 표시 (T014)
   */
  private checkAndShowGuideIfNeeded(): void {
    // 토큰과 리포지토리 URL 모두 비어있는 경우에만 자동 표시
    // (완전 신규 사용자를 위함)
    const settings = this.plugin.settings;
    const isNewUser = !settings.githubToken && !settings.repoUrl;

    if (isNewUser) {
      // 약간의 지연 후 모달 표시 (설정 탭 렌더링 완료 대기)
      setTimeout(() => {
        this.openGitHubGuideModal();
      }, 500);
    }
  }

  private connectionStatusTimeout: ReturnType<typeof setTimeout> | null = null;

  private showConnectionStatus(
    status: "connected" | "connecting" | "error",
    message: string,
    options?: {
      owner?: string;
      repo?: string;
      branch?: string;
      errorType?: string;
    }
  ): void {
    if (!this.connectionStatusEl) return;

    // 기존 타이머 취소
    if (this.connectionStatusTimeout) {
      clearTimeout(this.connectionStatusTimeout);
      this.connectionStatusTimeout = null;
    }

    this.connectionStatusEl.empty();
    this.connectionStatusEl.removeClass("hidden");
    this.connectionStatusEl.className = `quartz-publish-connection-status-card quartz-publish-connection-status-card--${status}`;

    // 아이콘 컨테이너
    const iconContainer = this.connectionStatusEl.createSpan({
      cls: "status-icon",
      attr: { "aria-hidden": "true" },
    });

    // 상태별 아이콘 설정
    const iconName =
      status === "connected" ? "check-circle-2" : status === "error" ? "x-circle" : "loader-2";
    setIcon(iconContainer, iconName);

    // 내용 영역
    const contentEl = this.connectionStatusEl.createDiv({
      cls: "status-content",
    });

    if (status === "connected" && options?.owner && options?.repo) {
      contentEl.createDiv({
        text: `${options.owner}/${options.repo}`,
        cls: "status-title",
      });
      if (options.branch) {
        contentEl.createDiv({
          text: t("connection.branch", { branch: options.branch }),
          cls: "status-subtitle",
        });
      }
    } else if (status === "error") {
      contentEl.createDiv({ text: message, cls: "status-message" });
      // 에러 힌트 추가
      const hint = this.getErrorHint(options?.errorType);
      if (hint) {
        contentEl.createDiv({ text: hint, cls: "status-hint" });
      }
    } else {
      contentEl.createDiv({ text: message, cls: "status-message" });
    }

    // 닫기 버튼 추가 (연결 중 상태가 아닐 때만)
    if (status !== "connecting") {
      const closeBtn = this.connectionStatusEl.createSpan({
        cls: "status-close",
        attr: { "aria-label": t("guide.close") },
      });
      setIcon(closeBtn, "x");
      closeBtn.addEventListener("click", () => this.hideConnectionStatus());
    }

    // 성공 시 5초 후 자동 숨김
    if (status === "connected") {
      this.connectionStatusTimeout = setTimeout(() => {
        this.hideConnectionStatus();
      }, 5000);
    }
  }

  private hideConnectionStatus(): void {
    if (this.connectionStatusEl) {
      this.connectionStatusEl.addClass("hidden");
    }
    if (this.connectionStatusTimeout) {
      clearTimeout(this.connectionStatusTimeout);
      this.connectionStatusTimeout = null;
    }
  }

  /**
   * 오류 타입에 따른 사용자 메시지
   */
  private getErrorMessage(errorType: string): string {
    switch (errorType) {
      case "invalid_token":
        return t("error.github.invalidToken");
      case "not_found":
        return t("error.github.notFound");
      case "not_quartz":
        return t("error.github.notQuartz");
      case "rate_limited":
        return t("error.github.rateLimit");
      case "network_error":
        return t("error.github.network");
      default:
        return t("error.unknown");
    }
  }

  /**
   * 오류 타입에 따른 해결 방법 힌트
   */
  private getErrorHint(errorType?: string): string | null {
    switch (errorType) {
      case "invalid_token":
        return t("error.github.invalidToken.hint");
      case "not_found":
        return t("error.github.notFound.hint");
      case "not_quartz":
        return t("error.github.notQuartz.hint");
      case "rate_limited":
        return t("error.github.rateLimit.hint");
      case "network_error":
        return t("error.github.network.hint");
      default:
        return null;
    }
  }

  // ============================================================================
  // Quartz Settings Section
  // ============================================================================

  /**
   * Quartz 설정 섹션 생성
   */
  private createQuartzSettingsSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.quartz.title")).setHeading();

    // 설정 컨테이너 (동적 로딩용)
    this.quartzSettingsContainerEl = containerEl.createDiv({
      cls: "quartz-publish-quartz-settings",
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
      this.quartzSettingsContainerEl.createEl("p", {
        text: t("settings.quartz.connectFirst"),
        cls: "text-obs-text-muted text-sm",
      });
      return;
    }

    // 설정 로드 버튼
    new Setting(this.quartzSettingsContainerEl)
      .setName(t("settings.quartz.load"))
      .setDesc(t("settings.quartz.loadDesc"))
      .addButton((button) =>
        button.setButtonText(t("settings.quartz.load")).onClick(async () => {
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
      new Notice(t("settings.quartz.connectFirst"));
      return;
    }

    this.isQuartzSettingsLoading = true;
    this.quartzSettingsContainerEl.empty();

    // Create loading card
    const loadingCard = this.quartzSettingsContainerEl.createDiv({
      cls: "quartz-publish-config-loading-card",
    });

    // Icon container with spinner
    const iconContainer = loadingCard.createSpan({
      cls: "loading-icon",
      attr: { "aria-hidden": "true" },
    });
    setIcon(iconContainer, "loader-2");

    // Content area
    const contentEl = loadingCard.createDiv({
      cls: "loading-content",
    });

    contentEl.createDiv({
      text: t("settings.quartz.loadingTitle"),
      cls: "loading-title",
    });

    contentEl.createDiv({
      text: t("settings.quartz.loadingSubtitle"),
      cls: "loading-subtitle",
    });

    try {
      const github = new GitHubService(githubToken, repoUrl, defaultBranch);
      this.quartzConfigService = new QuartzConfigService(github);

      // 먼저 연결 상태 확인
      const connectionResult = await github.testConnection();
      if (!connectionResult.success) {
        const errorType = connectionResult.error?.type;
        let errorMsg = connectionResult.error?.message ?? "Unknown error";

        if (errorType === "invalid_token") {
          errorMsg = "Invalid GitHub token. Please check your token.";
        } else if (errorType === "not_found") {
          errorMsg = `Repository not found: ${repoUrl}`;
        } else if (errorType === "not_quartz") {
          errorMsg = `quartz.config.ts not found in branch "${defaultBranch}". Please ensure this is a Quartz repository.`;
        } else if (errorType === "rate_limited") {
          errorMsg = "GitHub API rate limit exceeded. Please try again later.";
        }

        throw new Error(errorMsg);
      }

      const configFile = await this.quartzConfigService.fetchQuartzConfig();
      if (!configFile) {
        throw new Error(t("error.configNotFound", { branch: defaultBranch }));
      }

      const parsed = this.quartzConfigService.parseConfig(configFile.content);
      if (!parsed) {
        throw new Error(t("error.parseFailed"));
      }

      this.renderQuartzSettings(parsed);
    } catch (error) {
      this.quartzSettingsContainerEl.empty();
      const message = error instanceof Error ? error.message : t("error.unknown");
      this.quartzSettingsContainerEl.createEl("p", {
        text: t("settings.quartz.loadFailed", { message }),
        cls: "text-obs-text-error text-sm",
      });

      // 재시도 버튼
      new Setting(this.quartzSettingsContainerEl).addButton((button) =>
        button.setButtonText(t("settings.quartz.retry")).onClick(async () => {
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

    // Custom CSS 섹션 (Quartz 고급 설정 내에서)
    this.createCustomCssSection(this.quartzSettingsContainerEl);

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
    const sha = this.quartzConfigService.getCachedSha() ?? "";

    this.pendingChangesManager = new PendingChangesManager();
    this.pendingChangesManager.initialize(siteConfig, sha);

    // quartzSiteConfig 캐시 저장
    this.plugin.settings.quartzSiteConfig = siteConfig;
    this.plugin.saveSettings();

    // Advanced Config 컨테이너
    this.advancedConfigContainerEl = this.quartzSettingsContainerEl.createDiv({
      cls: "quartz-publish-advanced-config",
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

    // Comments Section 렌더링
    this.commentsSection = new CommentsSection(this.advancedConfigContainerEl, {
      config: extendedConfig.comments,
      onChange: (field, value) => {
        this.handleAdvancedConfigChange(field, value);
      },
    });

    // Typography Section 렌더링 (Phase 10)
    this.typographySection = new TypographySection(this.advancedConfigContainerEl, {
      app: this.app,
      config: extendedConfig.typography,
      onChange: (field, value) => {
        // field is 'header' | 'body' | 'code'
        // We need to update the whole typography object in pendingChangesManager
        // But handleAdvancedConfigChange expects keyof QuartzSiteConfig

        // Get current typography state from pendingChangesManager to merge
        const currentConfig = this.pendingChangesManager?.getCurrentConfig();
        if (currentConfig) {
          const newTypography = {
            ...currentConfig.typography,
            [field]: value,
          };
          this.handleAdvancedConfigChange("typography", newTypography);
        }
      },
    });

    // Publishing Section 렌더링 (T058-T063)
    this.publishingSection = new PublishingSection(this.advancedConfigContainerEl, {
      config: {
        explicitPublish: extendedConfig.explicitPublish,
        ignorePatterns: extendedConfig.ignorePatterns,
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
      initialState: "disabled",
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

    this.commentsSection?.updateValues(originalConfig.comments);

    this.typographySection?.updateValues(originalConfig.typography);

    this.publishingSection?.updateValues({
      explicitPublish: originalConfig.explicitPublish,
      ignorePatterns: originalConfig.ignorePatterns,
    });

    // UI 상태 업데이트
    this.updateApplyFlowUI();

    new Notice(t("notice.settings.discarded"));
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
      new Notice(
        t("notice.settings.validationFailed", {
          error: validation.errors[0],
        })
      );
      return;
    }

    // 확인 모달 (T036-T037)
    const confirmModal = new ConfirmModal(this.app, {
      title: t("modal.apply.title"),
      message: t("modal.apply.message", {
        summary: this.pendingChangesManager.getChangeSummary(),
      }),
      confirmText: t("modal.apply.confirm"),
      cancelText: t("modal.confirm.cancel"),
    });

    const confirmed = await confirmModal.openAsync();
    if (!confirmed) {
      return;
    }

    // 로딩 상태
    this.applyButton?.updateState("loading");

    try {
      // SHA 체크 (T040)
      const remoteSha = await this.quartzConfigService.getRemoteSha();
      const originalSha = this.pendingChangesManager.getOriginalSha();

      if (remoteSha && remoteSha !== originalSha) {
        // 충돌 감지 - ConflictModal 표시 (T038-T039)
        const conflictModal = new ConflictModal(this.app);
        const resolution = await conflictModal.openAsync();

        switch (resolution) {
          case "reload":
            // 새로고침 후 재시도
            this.quartzConfigService.invalidateCache();
            await this.loadQuartzSettings();
            new Notice(t("notice.settings.reloaded"));
            return;

          case "force_overwrite":
            // 강제 덮어쓰기 - 계속 진행
            break;

          case "cancel":
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
        this.pendingChangesManager.markAsSaved(currentConfig, result.newSha ?? "");
        this.updateApplyFlowUI();
        new Notice(t("notice.settings.saved"));
      } else {
        // 저장 실패
        new Notice(
          t("error.saveFailed", {
            message: result.errorMessage ?? "",
          })
        );
        this.applyButton?.setEnabled(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("error.unknown");
      new Notice(t("error.saveFailed", { message }));
      this.applyButton?.setEnabled(true);
    }
  }

  // ============================================================================
  // Quartz Upgrade Section (User Story 4)
  // ============================================================================

  private renderUpgradeSection(): void {
    if (!this.quartzSettingsContainerEl) return;

    new Setting(this.quartzSettingsContainerEl).setName(t("upgrade.title")).setHeading();

    this.upgradeContainerEl = this.quartzSettingsContainerEl.createDiv({
      cls: "quartz-publish-version-card",
    });

    const promptContainer = this.upgradeContainerEl.createDiv({
      cls: "quartz-publish-version-check-prompt",
    });

    promptContainer.createEl("p", {
      text: t("upgrade.checkPrompt"),
      cls: "quartz-publish-version-check-prompt-text",
    });

    const checkButton = promptContainer.createEl("button", {
      text: t("upgrade.checkButton"),
      cls: "mod-cta",
    });
    checkButton.addEventListener("click", async () => {
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
      new Notice(t("settings.quartz.connectFirst"));
      return;
    }

    this.upgradeContainerEl.empty();
    const loadingContainer = this.upgradeContainerEl.createDiv({
      cls: "quartz-publish-version-loading",
      attr: {
        role: "status",
        "aria-live": "polite",
        "aria-busy": "true",
      },
    });
    loadingContainer.createDiv({
      cls: "quartz-publish-loading-spinner",
      attr: {
        "aria-hidden": "true",
      },
    });
    loadingContainer.createEl("span", {
      text: t("upgrade.checking"),
      cls: "quartz-publish-version-loading-text",
    });

    try {
      const github = new GitHubService(githubToken, repoUrl, defaultBranch);
      this.quartzUpgradeService = new QuartzUpgradeService(github);

      const versionInfo = await this.quartzUpgradeService.checkVersion();
      this.renderVersionInfo(versionInfo);
    } catch (error) {
      this.upgradeContainerEl.empty();
      const message = error instanceof Error ? error.message : t("error.unknown");

      const errorContainer = this.upgradeContainerEl.createDiv({
        cls: "quartz-publish-version-error",
      });
      errorContainer.createEl("p", {
        text: t("upgrade.checkFailed", { message }),
        cls: "quartz-publish-version-error-text",
      });

      const retryButton = errorContainer.createEl("button", {
        text: t("settings.quartz.retry"),
      });
      retryButton.addEventListener("click", async () => {
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
      cls: "quartz-publish-version-card-header",
    });
    headerEl.createEl("span", {
      text: t("upgrade.versionInfo"),
      cls: "quartz-publish-version-card-title",
    });

    const badgeEl = headerEl.createEl("span", {
      cls: `quartz-publish-version-badge ${
        versionInfo.hasUpdate
          ? "quartz-publish-version-badge--warning"
          : "quartz-publish-version-badge--success"
      }`,
    });
    badgeEl.textContent = versionInfo.hasUpdate
      ? t("upgrade.updateBadge")
      : t("upgrade.upToDateBadge");

    const gridEl = this.upgradeContainerEl.createDiv({
      cls: "quartz-publish-version-grid",
    });

    const currentItem = gridEl.createDiv({
      cls: "quartz-publish-version-item",
    });
    currentItem.createEl("span", {
      text: t("upgrade.current"),
      cls: "quartz-publish-version-label",
    });
    currentItem.createEl("span", {
      text: versionInfo.current ?? "Unknown",
      cls: "quartz-publish-version-value",
    });

    const latestItem = gridEl.createDiv({
      cls: "quartz-publish-version-item",
    });
    latestItem.createEl("span", {
      text: t("upgrade.latest"),
      cls: "quartz-publish-version-label",
    });
    latestItem.createEl("span", {
      text: versionInfo.latest ?? "Unknown",
      cls: "quartz-publish-version-value",
    });

    const statusEl = this.upgradeContainerEl.createDiv({
      cls: `quartz-publish-version-status ${
        versionInfo.hasUpdate
          ? "quartz-publish-version-status--warning"
          : "quartz-publish-version-status--success"
      }`,
    });

    if (versionInfo.hasUpdate) {
      statusEl.createEl("span", {
        text: "⚠",
        cls: "quartz-publish-version-status-icon",
        attr: { "aria-hidden": "true" },
      });
      statusEl.createEl("span", {
        text: t("upgrade.updateAvailable", {
          current: versionInfo.current ?? "",
          latest: versionInfo.latest ?? "",
        }),
        cls: "quartz-publish-version-status-text",
      });
    } else {
      statusEl.createEl("span", {
        text: "✓",
        cls: "quartz-publish-version-status-icon",
        attr: { "aria-hidden": "true" },
      });
      statusEl.createEl("span", {
        text: t("upgrade.upToDate"),
        cls: "quartz-publish-version-status-text",
      });
    }

    const footerEl = this.upgradeContainerEl.createDiv({
      cls: "quartz-publish-version-card-footer",
    });

    const checkAgainButton = footerEl.createEl("button", {
      text: t("upgrade.checkAgain"),
    });
    checkAgainButton.addEventListener("click", async () => {
      await this.checkForUpdates();
    });

    if (versionInfo.hasUpdate) {
      const upgradeButton = footerEl.createEl("button", {
        text: t("upgrade.upgradeButton"),
        cls: "mod-cta",
      });
      upgradeButton.addEventListener("click", async () => {
        await this.performUpgrade();
      });
    }
  }

  /**
   * 업그레이드 실행
   */
  private async performUpgrade(): Promise<void> {
    if (!this.upgradeContainerEl || !this.quartzUpgradeService) {
      new Notice(t("upgrade.notInitialized"));
      return;
    }

    this.upgradeContainerEl.empty();

    // 진행 상황 표시 영역
    const progressContainer = this.upgradeContainerEl.createDiv({
      cls: "quartz-publish-upgrade-progress",
    });

    const statusEl = progressContainer.createEl("p", {
      text: t("upgrade.starting"),
      cls: "font-medium",
    });

    const progressBarContainer = progressContainer.createDiv({
      cls: "quartz-publish-progress-bar-container w-full h-2 rounded overflow-hidden my-2 bg-obs-modifier-border",
    });

    const progressBar = progressBarContainer.createDiv({
      cls: "quartz-publish-progress-bar",
    });
    progressBar.setCssStyles({
      height: "100%",
      transition: "width 0.2s ease",
      backgroundColor: "var(--interactive-accent)",
      width: "var(--progress-width, 0%)",
    });

    const detailEl = progressContainer.createEl("p", {
      text: "",
      cls: "text-obs-text-muted text-sm",
    });

    // 취소 버튼
    const cancelSetting = new Setting(progressContainer);

    cancelSetting.addButton((button) =>
      button.setButtonText(t("upgrade.cancel")).onClick(() => {
        this.quartzUpgradeService?.abort();
        statusEl.textContent = t("upgrade.cancelling");
      })
    );

    // 업그레이드 실행
    const onProgress = (progress: QuartzUpgradeProgress) => {
      const statusTexts: Record<string, string> = {
        checking: t("upgrade.checking"),
        downloading: t("upgrade.downloading"),
        applying: t("upgrade.applying"),
        completed: t("upgrade.completed"),
        error: t("upgrade.failed"),
      };

      statusEl.textContent = statusTexts[progress.status] || progress.status;

      if (progress.totalFiles > 0) {
        const percent = Math.round((progress.completedFiles / progress.totalFiles) * 100);
        progressBar.setCssProps({ "--progress-width": `${percent}%` });
        detailEl.textContent = `${progress.completedFiles}/${progress.totalFiles} files`;

        if (progress.currentFile) {
          detailEl.textContent += ` - ${progress.currentFile}`;
        }
      }

      if (progress.error) {
        detailEl.textContent = progress.error;
        detailEl.className = "text-obs-text-error text-sm";
      }
    };

    try {
      const result = await this.quartzUpgradeService.upgrade(onProgress);

      cancelSetting.settingEl.remove();

      if (result.success) {
        statusEl.textContent = t("upgrade.successMessage", {
          version: result.version ?? "",
        });
        statusEl.className = "text-obs-text-success font-medium";
        progressBar.setCssProps({ "--progress-width": "100%" });
        detailEl.textContent = t("upgrade.filesUpdated", {
          count: result.filesUpdated ?? 0,
        });

        new Notice(
          t("upgrade.successMessage", {
            version: result.version ?? "",
          })
        );
      } else {
        statusEl.textContent = t("upgrade.failed");
        statusEl.className = "text-obs-text-error font-medium";
        detailEl.textContent = result.error || t("error.unknown");

        new Notice(t("upgrade.failedMessage", { error: result.error ?? "" }));
      }
    } catch (error) {
      cancelSetting.settingEl.remove();

      const message = error instanceof Error ? error.message : t("error.unknown");
      statusEl.textContent = t("upgrade.failed");
      statusEl.className = "text-obs-text-error font-medium";
      detailEl.textContent = message;

      new Notice(t("upgrade.failedMessage", { error: message }));
    }

    // 다시 확인 버튼
    new Setting(progressContainer).addButton((button) =>
      button.setButtonText(t("upgrade.checkAgain")).onClick(async () => {
        await this.checkForUpdates();
      })
    );
  }
}
