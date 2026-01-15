/**
 * Confirm Modal Contract
 *
 * 삭제 확인 모달의 인터페이스 정의입니다.
 * 실제 구현은 src/ui/dashboard-modal.ts 내에 포함됩니다.
 */

import type { App } from 'obsidian';

/**
 * 확인 모달 옵션
 */
export interface ConfirmModalOptions {
	/** 모달 제목 */
	title: string;
	/** 확인 메시지 */
	message: string;
	/** 확인 버튼 텍스트 */
	confirmText?: string;
	/** 취소 버튼 텍스트 */
	cancelText?: string;
	/** 확인 버튼 위험 스타일 적용 여부 */
	isDangerous?: boolean;
}

/**
 * 확인 모달 인터페이스
 */
export interface IConfirmModal {
	/**
	 * 모달을 열고 사용자의 선택을 기다립니다.
	 *
	 * @returns 사용자가 확인을 선택하면 true, 취소하면 false
	 */
	waitForConfirmation(): Promise<boolean>;
}

/**
 * 삭제 확인 모달 팩토리 함수 시그니처
 */
export type CreateConfirmDeleteModal = (app: App, fileCount: number) => IConfirmModal;

/**
 * 동기화 확인 모달 팩토리 함수 시그니처
 * (전체 동기화 시 삭제 포함 여부 확인)
 */
export type CreateSyncConfirmModal = (
	app: App,
	counts: { new: number; modified: number; deleted: number }
) => IConfirmModal;
