/**
 * Analytics Section Component
 *
 * 애널리틱스 설정 UI 컴포넌트 (T048-T055)
 * - provider: null, google, plausible, umami
 * - 각 provider별 필수 필드 표시
 */

import { Setting } from 'obsidian';
import { ANALYTICS_PROVIDERS } from '../../constants/analytics';
import { t } from '../../i18n';
import type { AnalyticsConfig, QuartzSiteConfig } from '../../types';
import { validateAnalytics } from '../../utils/validators';

/**
 * AnalyticsSection 변경 콜백
 */
export type AnalyticsChangeCallback = <K extends keyof QuartzSiteConfig>(
	field: K,
	value: QuartzSiteConfig[K]
) => void;

/**
 * AnalyticsSection 옵션
 */
export interface AnalyticsSectionOptions {
	/** 초기 설정값 */
	config: AnalyticsConfig;
	/** 변경 콜백 */
	onChange: AnalyticsChangeCallback;
}

/**
 * Analytics Section Component (T048)
 */
export class AnalyticsSection {
	private containerEl: HTMLElement;
	private options: AnalyticsSectionOptions;

	// 현재 설정
	private currentConfig: AnalyticsConfig;

	// 컴포넌트 참조
	private providerDropdown: HTMLSelectElement | null = null;
	private fieldsContainerEl: HTMLElement | null = null;

	// 오류 표시 요소
	private errorEl: HTMLElement | null = null;

	constructor(containerEl: HTMLElement, options: AnalyticsSectionOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.currentConfig = { ...options.config } as AnalyticsConfig;
		this.render();
	}

	/**
	 * 섹션 렌더링
	 */
	private render(): void {
		// 섹션 헤더 (T055)
		new Setting(this.containerEl).setName(t('analytics.heading')).setHeading();

		// Provider 드롭다운 (T049)
		this.renderProviderDropdown();

		// 동적 필드 컨테이너 (T050)
		this.fieldsContainerEl = this.containerEl.createDiv({
			cls: 'quartz-publish-analytics-fields',
		});

		// 오류 메시지 영역
		this.errorEl = this.containerEl.createDiv({
			cls: 'text-obs-text-error text-sm mt-2',
			attr: {
				role: 'alert',
				'aria-live': 'polite',
			},
		});

		// 초기 필드 렌더링
		this.renderProviderFields();
	}

	/**
	 * Provider 드롭다운 렌더링 (T049)
	 */
	private renderProviderDropdown(): void {
		new Setting(this.containerEl)
			.setName(t('analytics.provider.name'))
			.setDesc(t('analytics.provider.desc'))
			.addDropdown((dropdown) => {
				this.providerDropdown = dropdown.selectEl;

				// 옵션 추가
				for (const provider of ANALYTICS_PROVIDERS) {
					dropdown.addOption(provider.value, provider.label);
				}

				// 현재 값 설정
				dropdown.setValue(this.currentConfig.provider);

				// 변경 핸들러
				dropdown.onChange((value) => {
					this.handleProviderChange(value as AnalyticsConfig['provider']);
				});
			});
	}

	/**
	 * Provider 변경 핸들러
	 */
	private handleProviderChange(provider: AnalyticsConfig['provider']): void {
		// 새 provider에 맞는 기본 설정 생성
		switch (provider) {
			case 'null':
				this.currentConfig = { provider: 'null' };
				break;
			case 'google':
				this.currentConfig = { provider: 'google', tagId: '' };
				break;
			case 'plausible':
				this.currentConfig = { provider: 'plausible' };
				break;
			case 'umami':
				this.currentConfig = { provider: 'umami', websiteId: '', host: '' };
				break;
		}

		// 필드 UI 업데이트
		this.renderProviderFields();

		// 콜백 호출
		this.notifyChange();
	}

	/**
	 * Provider별 필드 렌더링 (T050)
	 */
	private renderProviderFields(): void {
		if (!this.fieldsContainerEl) return;

		this.fieldsContainerEl.empty();
		this.clearError();

		switch (this.currentConfig.provider) {
			case 'null':
				// 필드 없음
				break;

			case 'google':
				// Google Analytics 필드 (T051)
				this.renderGoogleFields();
				break;

			case 'plausible':
				// Plausible 필드 (T052)
				this.renderPlausibleFields();
				break;

			case 'umami':
				// Umami 필드 (T053)
				this.renderUmamiFields();
				break;
		}
	}

	/**
	 * Google Analytics 필드 렌더링 (T051)
	 */
	private renderGoogleFields(): void {
		if (!this.fieldsContainerEl || this.currentConfig.provider !== 'google') {
			return;
		}

		const config = this.currentConfig;

		new Setting(this.fieldsContainerEl)
			.setName(t('analytics.google.tagId.name'))
			.setDesc(t('analytics.google.tagId.desc'))
			.addText((text) =>
				text
					.setPlaceholder('G-XXXXXXXXXX')
					.setValue(config.tagId)
					.onChange((value) => {
						if (this.currentConfig.provider === 'google') {
							this.currentConfig = { provider: 'google', tagId: value };
							this.validateAndNotify();
						}
					})
			);
	}

	/**
	 * Plausible 필드 렌더링 (T052)
	 */
	private renderPlausibleFields(): void {
		if (!this.fieldsContainerEl || this.currentConfig.provider !== 'plausible') {
			return;
		}

		const config = this.currentConfig;

		new Setting(this.fieldsContainerEl)
			.setName(t('analytics.plausible.host.name'))
			.setDesc(t('analytics.plausible.host.desc'))
			.addText((text) =>
				text
					.setPlaceholder('https://plausible.yoursite.com')
					.setValue(config.host ?? '')
					.onChange((value) => {
						if (this.currentConfig.provider === 'plausible') {
							this.currentConfig = {
								provider: 'plausible',
								host: value || undefined,
							};
							this.validateAndNotify();
						}
					})
			);
	}

	/**
	 * Umami 필드 렌더링 (T053)
	 */
	private renderUmamiFields(): void {
		if (!this.fieldsContainerEl || this.currentConfig.provider !== 'umami') {
			return;
		}

		const config = this.currentConfig;

		// Website ID
		new Setting(this.fieldsContainerEl)
			.setName(t('analytics.umami.websiteId.name'))
			.setDesc(t('analytics.umami.websiteId.desc'))
			.addText((text) =>
				text
					.setPlaceholder('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
					.setValue(config.websiteId)
					.onChange((value) => {
						if (this.currentConfig.provider === 'umami') {
							const current = this.currentConfig as { provider: 'umami'; websiteId: string; host: string };
							this.currentConfig = { provider: 'umami', websiteId: value, host: current.host };
							this.validateAndNotify();
						}
					})
			);

		// Host
		new Setting(this.fieldsContainerEl)
			.setName(t('analytics.umami.host.name'))
			.setDesc(t('analytics.umami.host.desc'))
			.addText((text) =>
				text
					.setPlaceholder('https://umami.yoursite.com')
					.setValue(config.host)
					.onChange((value) => {
						if (this.currentConfig.provider === 'umami') {
							const current = this.currentConfig as { provider: 'umami'; websiteId: string; host: string };
							this.currentConfig = { provider: 'umami', websiteId: current.websiteId, host: value };
							this.validateAndNotify();
						}
					})
			);
	}

	/**
	 * 유효성 검사 후 콜백 호출
	 */
	private validateAndNotify(): void {
		const result = validateAnalytics(this.currentConfig);

		if (!result.valid && result.error) {
			this.showError(result.error);
		} else {
			this.clearError();
		}

		// 유효한 경우에만 콜백 호출 (또는 null provider인 경우)
		if (result.valid) {
			this.notifyChange();
		}
	}

	/**
	 * 변경 콜백 호출
	 */
	private notifyChange(): void {
		this.options.onChange('analytics', this.currentConfig);
	}

	/**
	 * 오류 메시지 표시
	 */
	private showError(message: string): void {
		if (this.errorEl) {
			this.errorEl.textContent = message;
		}
	}

	/**
	 * 오류 메시지 제거
	 */
	private clearError(): void {
		if (this.errorEl) {
			this.errorEl.textContent = '';
		}
	}

	/**
	 * 외부에서 값 업데이트
	 */
	updateValues(config: AnalyticsConfig): void {
		this.currentConfig = { ...config } as AnalyticsConfig;

		if (this.providerDropdown) {
			this.providerDropdown.value = config.provider;
		}

		this.renderProviderFields();
	}

	/**
	 * 유효성 검사 실행
	 */
	validate(): { valid: boolean; error?: string } {
		const result = validateAnalytics(this.currentConfig);
		return { valid: result.valid, error: result.error };
	}
}
