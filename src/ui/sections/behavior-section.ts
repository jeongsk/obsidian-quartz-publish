/**
 * Behavior Section Component
 *
 * 사이트 동작 옵션 설정 UI 컴포넌트 (T043-T047, T056-T057)
 * - enableSPA: SPA 모드
 * - enablePopovers: 팝오버 미리보기
 * - defaultDateType: 기본 날짜 타입 (T056-T057)
 */

import { Setting } from 'obsidian';
import { t } from '../../i18n';
import type { QuartzSiteConfig } from '../../types';

/**
 * BehaviorSection 변경 콜백
 */
export type BehaviorChangeCallback = <K extends keyof QuartzSiteConfig>(
	field: K,
	value: QuartzSiteConfig[K]
) => void;

/**
 * BehaviorSection 옵션
 */
export interface BehaviorSectionOptions {
	/** 초기 설정값 */
	config: Pick<QuartzSiteConfig, 'enableSPA' | 'enablePopovers' | 'defaultDateType'>;
	/** 변경 콜백 */
	onChange: BehaviorChangeCallback;
}

/**
 * 날짜 타입 옵션
 */
const DATE_TYPE_VALUES = ['created', 'modified', 'published'] as const;

/**
 * Behavior Section Component (T043)
 */
export class BehaviorSection {
	private containerEl: HTMLElement;
	private options: BehaviorSectionOptions;

	// 컴포넌트 참조
	private spaToggleEl: HTMLInputElement | null = null;
	private popoversToggleEl: HTMLInputElement | null = null;
	private dateTypeDropdown: HTMLSelectElement | null = null;

	constructor(containerEl: HTMLElement, options: BehaviorSectionOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.render();
	}

	/**
	 * 섹션 렌더링
	 */
	private render(): void {
		// 섹션 헤더 (T047)
		new Setting(this.containerEl).setName(t('behavior.heading')).setHeading();

		// Enable SPA 토글 (T044)
		this.renderEnableSPAToggle();

		// Enable Popovers 토글 (T045)
		this.renderEnablePopoversToggle();

		// Default Date Type 드롭다운 (T056)
		this.renderDefaultDateTypeDropdown();
	}

	/**
	 * Enable SPA 토글 렌더링 (T044)
	 */
	private renderEnableSPAToggle(): void {
		new Setting(this.containerEl)
			.setName(t('behavior.spa.name'))
			.setDesc(t('behavior.spa.desc'))
			.addToggle((toggle) => {
				this.spaToggleEl = toggle.toggleEl.querySelector('input');
				toggle
					.setValue(this.options.config.enableSPA)
					.onChange((value) => {
						this.options.onChange('enableSPA', value);
					});
			});
	}

	/**
	 * Enable Popovers 토글 렌더링 (T045)
	 */
	private renderEnablePopoversToggle(): void {
		new Setting(this.containerEl)
			.setName(t('behavior.popovers.name'))
			.setDesc(t('behavior.popovers.desc'))
			.addToggle((toggle) => {
				this.popoversToggleEl = toggle.toggleEl.querySelector('input');
				toggle
					.setValue(this.options.config.enablePopovers)
					.onChange((value) => {
						this.options.onChange('enablePopovers', value);
					});
			});
	}

	/**
	 * Default Date Type 드롭다운 렌더링 (T056)
	 */
	private renderDefaultDateTypeDropdown(): void {
		new Setting(this.containerEl)
			.setName(t('behavior.dateType.name'))
			.setDesc(t('behavior.dateType.desc'))
			.addDropdown((dropdown) => {
				this.dateTypeDropdown = dropdown.selectEl;

				// 옵션 추가
				for (const value of DATE_TYPE_VALUES) {
					dropdown.addOption(value, t(`behavior.dateType.${value}`));
				}

				// 현재 값 설정
				dropdown.setValue(this.options.config.defaultDateType);

				// 변경 핸들러 (T057)
				dropdown.onChange((value) => {
					this.options.onChange(
						'defaultDateType',
						value as 'created' | 'modified' | 'published'
					);
				});
			});
	}

	/**
	 * 외부에서 값 업데이트
	 */
	updateValues(
		config: Pick<QuartzSiteConfig, 'enableSPA' | 'enablePopovers' | 'defaultDateType'>
	): void {
		if (this.spaToggleEl) {
			this.spaToggleEl.checked = config.enableSPA;
		}
		if (this.popoversToggleEl) {
			this.popoversToggleEl.checked = config.enablePopovers;
		}
		if (this.dateTypeDropdown) {
			this.dateTypeDropdown.value = config.defaultDateType;
		}
	}
}
