/**
 * Status Service Contract
 *
 * 발행 상태 계산 서비스의 인터페이스 정의입니다.
 * 실제 구현은 src/services/status.ts에 작성됩니다.
 */

import type { TFile, Vault, MetadataCache } from 'obsidian';
import type { PublishRecord, NoteStatus, StatusOverview, PublishStatus } from '../../../src/types';

/**
 * 상태 계산 진행 콜백
 */
export type StatusProgressCallback = (processed: number, total: number) => void;

/**
 * 상태 서비스 인터페이스
 */
export interface IStatusService {
	/**
	 * 전체 발행 상태 개요를 계산합니다.
	 * 대시보드를 열 때 호출됩니다.
	 *
	 * @param onProgress - 진행 상황 콜백 (선택적)
	 * @returns 상태별로 그룹화된 노트 목록
	 */
	calculateStatusOverview(onProgress?: StatusProgressCallback): Promise<StatusOverview>;

	/**
	 * 단일 파일의 발행 상태를 계산합니다.
	 *
	 * @param file - 상태를 확인할 파일
	 * @returns 파일의 상태 정보
	 */
	calculateFileStatus(file: TFile): Promise<NoteStatus>;

	/**
	 * 삭제가 필요한 노트 목록을 반환합니다.
	 * (로컬에서 삭제되었거나 publish: false로 변경된 노트)
	 *
	 * @returns 삭제 필요 노트 목록
	 */
	findDeletedNotes(): NoteStatus[];

	/**
	 * 모든 발행 대상 파일 목록을 반환합니다.
	 * (publish: true인 파일)
	 *
	 * @returns 발행 대상 파일 목록
	 */
	getPublishableFiles(): TFile[];
}

/**
 * 상태 서비스 생성자 파라미터
 */
export interface StatusServiceOptions {
	vault: Vault;
	metadataCache: MetadataCache;
	publishRecords: Record<string, PublishRecord>;
	contentPath: string;
	staticPath: string;
}

/**
 * 상태 계산 결과 통계
 */
export interface StatusStatistics {
	total: number;
	new: number;
	modified: number;
	synced: number;
	deleted: number;
}

/**
 * 상태 통계를 계산하는 유틸리티 함수
 */
export function calculateStatistics(overview: StatusOverview): StatusStatistics {
	return {
		total: overview.new.length + overview.modified.length + overview.synced.length + overview.deleted.length,
		new: overview.new.length,
		modified: overview.modified.length,
		synced: overview.synced.length,
		deleted: overview.deleted.length,
	};
}
