/**
 * i18n API Contract
 *
 * 이 파일은 i18n 모듈의 공개 API를 정의합니다.
 * 구현 시 이 인터페이스를 따라야 합니다.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * 지원되는 로케일 코드
 */
export type SupportedLocale = 'en' | 'ko';

/**
 * 번역 키 타입 (영어 파일에서 자동 추론)
 * 실제 구현에서는 `keyof typeof en`으로 대체됨
 */
export type TranslationKey = string;

/**
 * 번역 보간 매개변수
 */
export type InterpolationParams = Record<string, string | number>;

// ============================================================================
// Functions
// ============================================================================

/**
 * i18n 시스템 초기화
 *
 * Obsidian의 현재 언어 설정을 감지하고 적절한 번역 파일을 로드합니다.
 * 플러그인 onload()에서 한 번 호출해야 합니다.
 *
 * @example
 * ```typescript
 * async onload() {
 *   initI18n();
 *   // ... 나머지 초기화
 * }
 * ```
 */
export declare function initI18n(): void;

/**
 * 번역된 문자열 반환
 *
 * @param key - 번역 키 (예: 'settings.github.title')
 * @param params - 보간 매개변수 (선택적)
 * @returns 현재 로케일의 번역된 문자열, 없으면 영어 폴백
 *
 * @example
 * ```typescript
 * // 단순 텍스트
 * t('settings.github.title')  // "GitHub Connection" 또는 "GitHub 연결"
 *
 * // 보간 매개변수 포함
 * t('notice.publish.success', { filename: 'note.md' })
 * // "Published: note.md" 또는 "발행됨: note.md"
 * ```
 */
export declare function t(key: TranslationKey, params?: InterpolationParams): string;

/**
 * 현재 로케일 코드 반환
 *
 * @returns 현재 활성 로케일 코드
 *
 * @example
 * ```typescript
 * const locale = getCurrentLocale();  // 'en' 또는 'ko'
 * ```
 */
export declare function getCurrentLocale(): SupportedLocale;

// ============================================================================
// Translation File Structure
// ============================================================================

/**
 * 영어 번역 파일 구조 (기준 파일)
 *
 * 다른 언어 파일은 이 타입의 Partial로 정의됩니다.
 */
export interface EnglishTranslations {
	// Settings - GitHub
	'settings.github.title': string;
	'settings.github.token': string;
	'settings.github.tokenDesc': string;
	'settings.github.repoUrl': string;
	'settings.github.repoUrlDesc': string;
	'settings.github.branch': string;
	'settings.github.branchDesc': string;
	'settings.github.testConnection': string;
	'settings.github.connectionStatus': string;
	'settings.github.createRepo': string;
	'settings.github.newToQuartz': string;

	// Settings - Auto Date
	'settings.autoDate.title': string;
	'settings.autoDate.desc': string;
	'settings.autoDate.created': string;
	'settings.autoDate.createdDesc': string;
	'settings.autoDate.modified': string;
	'settings.autoDate.modifiedDesc': string;
	'settings.autoDate.published': string;
	'settings.autoDate.publishedDesc': string;

	// Settings - Quartz
	'settings.quartz.title': string;
	'settings.quartz.load': string;
	'settings.quartz.loadDesc': string;
	'settings.quartz.loading': string;
	'settings.quartz.connectFirst': string;
	'settings.quartz.retry': string;

	// Settings - Site Info
	'settings.siteInfo.title': string;
	'settings.siteInfo.pageTitle': string;
	'settings.siteInfo.pageTitleDesc': string;
	'settings.siteInfo.baseUrl': string;
	'settings.siteInfo.baseUrlDesc': string;
	'settings.siteInfo.locale': string;
	'settings.siteInfo.localeDesc': string;

	// Dashboard
	'dashboard.title': string;
	'dashboard.tab.new': string;
	'dashboard.tab.modified': string;
	'dashboard.tab.deleted': string;
	'dashboard.tab.synced': string;
	'dashboard.action.publish': string;
	'dashboard.action.delete': string;
	'dashboard.action.syncAll': string;
	'dashboard.action.close': string;
	'dashboard.action.refresh': string;
	'dashboard.selectAll': string;
	'dashboard.selected': string;
	'dashboard.status.loading': string;
	'dashboard.status.offline': string;
	'dashboard.empty.new': string;
	'dashboard.empty.modified': string;
	'dashboard.empty.deleted': string;
	'dashboard.empty.synced': string;

	// Notices
	'notice.publish.start': string;
	'notice.publish.success': string;
	'notice.publish.failed': string;
	'notice.publish.error': string;
	'notice.batch.success': string;
	'notice.batch.partial': string;
	'notice.delete.success': string;
	'notice.delete.partial': string;
	'notice.sync.success': string;
	'notice.sync.noChanges': string;
	'notice.connection.success': string;
	'notice.connection.failed': string;
	'notice.network.offline': string;
	'notice.settings.saved': string;
	'notice.settings.discarded': string;
	'notice.settings.validationFailed': string;
	'notice.settings.reloaded': string;
	'notice.noActiveFile': string;
	'notice.configureFirst': string;

	// Commands
	'command.publishNote': string;
	'command.openDashboard': string;

	// Menus
	'menu.publishToQuartz': string;

	// Modals - Confirm
	'modal.confirm.title': string;
	'modal.confirm.ok': string;
	'modal.confirm.cancel': string;
	'modal.delete.title': string;
	'modal.delete.message': string;
	'modal.sync.title': string;
	'modal.sync.message': string;
	'modal.apply.title': string;
	'modal.apply.message': string;
	'modal.apply.confirm': string;

	// Modals - Conflict
	'modal.conflict.title': string;
	'modal.conflict.message': string;
	'modal.conflict.reload': string;
	'modal.conflict.overwrite': string;

	// Modals - Large File
	'modal.largeFile.title': string;
	'modal.largeFile.message': string;
	'modal.largeFile.continue': string;

	// Modals - Create Repo
	'modal.createRepo.title': string;
	'modal.createRepo.name': string;
	'modal.createRepo.nameDesc': string;
	'modal.createRepo.visibility': string;
	'modal.createRepo.visibilityDesc': string;
	'modal.createRepo.public': string;
	'modal.createRepo.private': string;
	'modal.createRepo.privateWarning': string;
	'modal.createRepo.create': string;
	'modal.createRepo.creating': string;
	'modal.createRepo.success': string;
	'modal.createRepo.viewGuide': string;

	// Errors
	'error.github.invalidToken': string;
	'error.github.notFound': string;
	'error.github.notQuartz': string;
	'error.github.rateLimit': string;
	'error.github.network': string;
	'error.unknown': string;
	'error.validation.pageTitle': string;
	'error.validation.baseUrl': string;
	'error.loadFailed': string;
	'error.parseFailed': string;
	'error.saveFailed': string;

	// Upgrade
	'upgrade.title': string;
	'upgrade.checkPrompt': string;
	'upgrade.checkButton': string;
	'upgrade.checking': string;
	'upgrade.versionInfo': string;
	'upgrade.current': string;
	'upgrade.latest': string;
	'upgrade.upToDate': string;
	'upgrade.updateAvailable': string;
	'upgrade.upgradeButton': string;
	'upgrade.checkAgain': string;
	'upgrade.starting': string;
	'upgrade.downloading': string;
	'upgrade.applying': string;
	'upgrade.completed': string;
	'upgrade.failed': string;
	'upgrade.cancel': string;
	'upgrade.cancelling': string;
	'upgrade.filesUpdated': string;
}

/**
 * 비영어 번역 파일 타입
 */
export type PartialTranslations = Partial<EnglishTranslations>;
