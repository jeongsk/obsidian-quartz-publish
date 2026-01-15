/**
 * GitHub 설정 가이드 단계 데이터
 *
 * 초보자를 위한 Quartz 리포지토리 설정 가이드의 단계별 데이터를 정의합니다.
 * 각 단계는 제목, 설명, 외부 URL, 스크린샷(추후 추가) 등을 포함합니다.
 */

import type { GuideStep, TroubleshootingItem, SetupStatus } from '../types';
import { t } from '../i18n';

/**
 * GitHub 설정 가이드 URL 상수
 */
export const GUIDE_URLS = {
	/** Quartz 템플릿 리포지토리 */
	QUARTZ_TEMPLATE: 'https://github.com/jackyzha0/quartz',
	/** GitHub 가입 페이지 */
	GITHUB_SIGNUP: 'https://github.com/signup',
	/** GitHub PAT 생성 페이지 */
	GITHUB_TOKEN: 'https://github.com/settings/tokens/new',
	/** GitHub 로그인 페이지 */
	GITHUB_LOGIN: 'https://github.com/login',
} as const;

/**
 * 가이드 단계 생성 함수
 *
 * i18n을 통해 번역된 텍스트로 가이드 단계를 생성합니다.
 *
 * @param status - 현재 설정 상태 (완료 체크에 사용)
 * @returns 가이드 단계 배열
 */
export function createGuideSteps(status?: SetupStatus): GuideStep[] {
	return [
		{
			stepNumber: 1,
			title: t('guide.step1.title'),
			description: t('guide.step1.description'),
			externalUrl: GUIDE_URLS.GITHUB_SIGNUP,
			actionLabel: t('guide.step1.action'),
			troubleshootingTips: [t('guide.step1.tip1'), t('guide.step1.tip2')],
			completionCheck: () => status?.hasGitHubAccount ?? false,
		},
		{
			stepNumber: 2,
			title: t('guide.step2.title'),
			description: t('guide.step2.description'),
			externalUrl: GUIDE_URLS.QUARTZ_TEMPLATE,
			actionLabel: t('guide.step2.action'),
			troubleshootingTips: [
				t('guide.step2.tip1'),
				t('guide.step2.tip2'),
				t('guide.step2.tip3'),
			],
			completionCheck: () => status?.hasForkedRepo ?? false,
		},
		{
			stepNumber: 3,
			title: t('guide.step3.title'),
			description: t('guide.step3.description'),
			externalUrl: GUIDE_URLS.GITHUB_TOKEN,
			actionLabel: t('guide.step3.action'),
			troubleshootingTips: [
				t('guide.step3.tip1'),
				t('guide.step3.tip2'),
				t('guide.step3.tip3'),
			],
			completionCheck: () => status?.hasToken ?? false,
		},
		{
			stepNumber: 4,
			title: t('guide.step4.title'),
			description: t('guide.step4.description'),
			actionLabel: t('guide.step4.action'),
			troubleshootingTips: [t('guide.step4.tip1'), t('guide.step4.tip2')],
			completionCheck: () => status?.isConnected ?? false,
		},
	];
}

/**
 * 문제 해결 항목 데이터
 *
 * 일반적인 오류에 대한 해결 방법을 제공합니다.
 */
export function createTroubleshootingItems(): TroubleshootingItem[] {
	return [
		{
			errorCode: '401',
			errorMessage: t('guide.error.401.title'),
			cause: t('guide.error.401.cause'),
			solution: t('guide.error.401.solution'),
			relatedStep: 3,
		},
		{
			errorCode: '403',
			errorMessage: t('guide.error.403.title'),
			cause: t('guide.error.403.cause'),
			solution: t('guide.error.403.solution'),
			relatedStep: 3,
		},
		{
			errorCode: '404',
			errorMessage: t('guide.error.404.title'),
			cause: t('guide.error.404.cause'),
			solution: t('guide.error.404.solution'),
			relatedStep: 2,
		},
		{
			errorCode: 'network',
			errorMessage: t('guide.error.network.title'),
			cause: t('guide.error.network.cause'),
			solution: t('guide.error.network.solution'),
		},
	];
}

/**
 * 총 가이드 단계 수
 */
export const TOTAL_GUIDE_STEPS = 4;
