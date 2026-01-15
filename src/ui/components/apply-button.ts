/**
 * Apply Button Component
 *
 * 변경사항 적용 버튼 컴포넌트 (T033-T034)
 * - disabled: 변경사항 없음
 * - enabled: 변경사항 있음
 * - loading: 저장 중
 */

import { setIcon } from 'obsidian';
import { t } from '../../i18n';

/**
 * 버튼 상태 타입
 */
export type ApplyButtonState = 'disabled' | 'enabled' | 'loading';

/**
 * ApplyButton 옵션
 */
export interface ApplyButtonOptions {
	/** 적용 버튼 클릭 핸들러 */
	onClick: () => Promise<void>;
	/** Refresh 버튼 클릭 핸들러 */
	onRefresh?: () => Promise<void>;
	/** 초기 상태 */
	initialState?: ApplyButtonState;
}

/**
 * Apply Button Component (T033)
 */
export class ApplyButton {
	private containerEl: HTMLElement;
	private buttonEl: HTMLButtonElement | null = null;
	private options: ApplyButtonOptions;
	private state: ApplyButtonState;

	constructor(containerEl: HTMLElement, options: ApplyButtonOptions) {
		this.containerEl = containerEl;
		this.options = options;
		this.state = options.initialState ?? 'disabled';
		this.render();
	}

	private render(): void {
		const wrapper = this.containerEl.createDiv({
			cls: 'quartz-publish-apply-button-wrapper qp:mt-4 qp:mb-6 qp:flex qp:justify-end qp:gap-2',
		});

		if (this.options.onRefresh) {
			const refreshBtn = wrapper.createEl('button', {
				cls: 'quartz-publish-refresh-button',
			});
			refreshBtn.createSpan({ text: t('common.refresh') });
			refreshBtn.setAttribute('aria-label', t('common.refreshDesc'));
			refreshBtn.addEventListener('click', async () => {
				await this.options.onRefresh?.();
			});
		}

		this.buttonEl = wrapper.createEl('button', {
			cls: 'mod-cta quartz-publish-apply-button',
		});

		const iconSpan = this.buttonEl.createSpan({
			cls: 'quartz-publish-apply-button-icon qp:mr-2',
			attr: { 'aria-hidden': 'true' },
		});
		setIcon(iconSpan, 'upload-cloud');

		this.buttonEl.createSpan({
			text: t('common.apply'),
			cls: 'quartz-publish-apply-button-text',
		});

		this.buttonEl.addEventListener('click', async () => {
			if (this.state === 'disabled' || this.state === 'loading') {
				return;
			}
			await this.options.onClick();
		});

		this.updateState(this.state);
	}

	/**
	 * 버튼 상태 업데이트 (T034)
	 */
	updateState(newState: ApplyButtonState): void {
		this.state = newState;

		if (!this.buttonEl) return;

		// 모든 상태 클래스 제거
		this.buttonEl.removeClass('is-disabled', 'is-loading');

		switch (newState) {
			case 'disabled':
				this.buttonEl.disabled = true;
				this.buttonEl.removeAttribute('aria-busy');
				this.buttonEl.addClass('is-disabled');
				this.setButtonContent('upload-cloud', t('common.apply'));
				break;

			case 'enabled':
				this.buttonEl.disabled = false;
				this.buttonEl.removeAttribute('aria-busy');
				this.setButtonContent('upload-cloud', t('common.apply'));
				break;

			case 'loading':
				this.buttonEl.disabled = true;
				this.buttonEl.addClass('is-loading');
				this.buttonEl.setAttribute('aria-busy', 'true');
				this.setButtonContent('loader', t('common.saving'));
				break;
		}
	}

	/**
	 * 버튼 내용 설정
	 */
	private setButtonContent(icon: string, text: string): void {
		if (!this.buttonEl) return;

		this.buttonEl.empty();

		const iconSpan = this.buttonEl.createSpan({
			cls: 'quartz-publish-apply-button-icon qp:mr-2',
			attr: { 'aria-hidden': 'true' },
		});
		setIcon(iconSpan, icon);

		this.buttonEl.createSpan({
			text,
			cls: 'quartz-publish-apply-button-text',
		});

		// 로딩 상태일 때 아이콘 애니메이션
		if (icon === 'loader') {
			iconSpan.addClass('qp:animate-spin');
		}
	}

	/**
	 * 현재 상태 반환
	 */
	getState(): ApplyButtonState {
		return this.state;
	}

	/**
	 * 활성화 여부 설정 (편의 메서드)
	 */
	setEnabled(enabled: boolean): void {
		this.updateState(enabled ? 'enabled' : 'disabled');
	}

	/**
	 * 로딩 상태 설정 (편의 메서드)
	 */
	setLoading(loading: boolean): void {
		if (loading) {
			this.updateState('loading');
		} else {
			// 로딩 종료 시 이전 상태로 복원 (임시로 disabled)
			this.updateState('disabled');
		}
	}
}
