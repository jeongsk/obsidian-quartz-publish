/**
 * Dashboard Modal Contract
 *
 * 발행 대시보드 모달의 인터페이스 정의입니다.
 * 실제 구현은 src/ui/dashboard-modal.ts에 작성됩니다.
 */

import type { App, Modal, TFile } from 'obsidian';
import type { StatusOverview, BatchPublishResult, UnpublishResult } from '../../../src/types';

/**
 * 대시보드 탭 타입
 */
export type DashboardTab = 'new' | 'modified' | 'deleted' | 'synced';

/**
 * 탭 레이블 매핑
 */
export const TAB_LABELS: Record<DashboardTab, string> = {
	new: '신규',
	modified: '수정됨',
	deleted: '삭제 필요',
	synced: '최신',
};

/**
 * 대시보드 모달 옵션
 */
export interface DashboardModalOptions {
	/** 초기 활성 탭 */
	initialTab?: DashboardTab;
	/** 발행 콜백 */
	onPublish: (files: TFile[]) => Promise<BatchPublishResult>;
	/** 삭제 콜백 */
	onDelete: (files: TFile[]) => Promise<UnpublishResult[]>;
	/** 상태 개요 로드 콜백 */
	onLoadStatus: (onProgress?: (processed: number, total: number) => void) => Promise<StatusOverview>;
}

/**
 * 대시보드 모달 인터페이스
 */
export interface IDashboardModal {
	/**
	 * 모달을 엽니다.
	 */
	open(): void;

	/**
	 * 모달을 닫습니다.
	 */
	close(): void;

	/**
	 * 상태 개요를 새로고침합니다.
	 */
	refresh(): Promise<void>;
}

/**
 * 진행 상황 정보
 */
export interface ProgressInfo {
	current: number;
	total: number;
	currentFile: string;
	operation: 'loading' | 'publishing' | 'deleting';
}

/**
 * 일괄 작업 결과 요약
 */
export interface OperationSummary {
	operation: 'publish' | 'delete';
	succeeded: number;
	failed: number;
	errors: Array<{ path: string; message: string }>;
}
