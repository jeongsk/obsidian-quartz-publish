/**
 * DashboardModal Unit Tests
 *
 * T014: 모달 열기/닫기 테스트
 * T015: 탭 전환 동작 테스트
 * T016: 상태 로딩 + 프로그레스 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DashboardModal, ConfirmModal } from '../../../src/ui/dashboard-modal';
import { App, TFile } from '../../mocks/obsidian';
import type { StatusOverview, BatchPublishResult, UnpublishResult, NoteStatus } from '../../../src/types';

describe('DashboardModal', () => {
	let app: App;
	let onPublish: ReturnType<typeof vi.fn>;
	let onDelete: ReturnType<typeof vi.fn>;
	let onLoadStatus: ReturnType<typeof vi.fn>;

	const createMockStatusOverview = (): StatusOverview => ({
		new: [
			{ file: new TFile('notes/new1.md'), status: 'new' },
			{ file: new TFile('notes/new2.md'), status: 'new' },
		],
		modified: [
			{ file: new TFile('notes/modified1.md'), status: 'modified' },
		],
		synced: [
			{ file: new TFile('notes/synced1.md'), status: 'synced' },
			{ file: new TFile('notes/synced2.md'), status: 'synced' },
		],
		deleted: [
			{ file: { path: 'notes/deleted1.md' } as TFile, status: 'deleted' },
		],
	});

	beforeEach(() => {
		app = new App();
		onPublish = vi.fn().mockResolvedValue({ total: 0, succeeded: 0, failed: 0, results: [] });
		onDelete = vi.fn().mockResolvedValue([]);
		onLoadStatus = vi.fn().mockResolvedValue(createMockStatusOverview());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// =========================================================================
	// T014: 모달 열기/닫기 테스트
	// =========================================================================

	describe('Modal 열기/닫기', () => {
		it('모달이 올바르게 열린다', async () => {
			// Given: DashboardModal 인스턴스
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: 콘텐츠가 렌더링됨
			expect(modal.contentEl.classList.contains('quartz-publish-dashboard')).toBe(true);
		});

		it('모달이 닫히면 콘텐츠가 정리된다', async () => {
			// Given: 열린 모달
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});
			await modal.onOpen();

			// When: 모달 닫기
			modal.onClose();

			// Then: 콘텐츠가 비워짐
			expect(modal.contentEl.children.length).toBe(0);
		});

		it('모달 열기 시 상태 로딩이 시작된다', async () => {
			// Given: DashboardModal 인스턴스
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: onLoadStatus가 호출됨
			expect(onLoadStatus).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// T015: 탭 전환 동작 테스트
	// =========================================================================

	describe('탭 전환', () => {
		it('기본 탭은 "new"이다', async () => {
			// Given: DashboardModal 인스턴스
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: 기본 탭이 "new"
			const state = (modal as any).state;
			expect(state.activeTab).toBe('new');
		});

		it('initialTab 옵션으로 초기 탭을 설정할 수 있다', async () => {
			// Given: initialTab이 "modified"로 설정된 모달
			const modal = new DashboardModal(app, {
				initialTab: 'modified',
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: 활성 탭이 "modified"
			const state = (modal as any).state;
			expect(state.activeTab).toBe('modified');
		});

		it('탭 전환 시 선택이 초기화된다', async () => {
			// Given: 열린 모달에 선택된 항목이 있음
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});
			await modal.onOpen();

			// 선택 추가
			(modal as any).state.selectedPaths.add('notes/new1.md');

			// When: 탭 전환
			(modal as any).switchTab('modified');

			// Then: 선택이 초기화됨
			const state = (modal as any).state;
			expect(state.selectedPaths.size).toBe(0);
			expect(state.activeTab).toBe('modified');
		});
	});

	// =========================================================================
	// T016: 상태 로딩 + 프로그레스 테스트
	// =========================================================================

	describe('상태 로딩', () => {
		it('상태 로딩 중 isLoading이 true가 된다', async () => {
			// Given: 느린 onLoadStatus
			let resolveLoadStatus: (value: StatusOverview) => void;
			const slowLoadStatus = vi.fn().mockImplementation(() =>
				new Promise<StatusOverview>(resolve => {
					resolveLoadStatus = resolve;
				})
			);

			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus: slowLoadStatus,
			});

			// When: 모달 열기 (로딩 시작)
			const openPromise = modal.onOpen();

			// Then: 로딩 중 상태 확인
			expect((modal as any).state.isLoading).toBe(true);

			// 로딩 완료
			resolveLoadStatus!(createMockStatusOverview());
			await openPromise;

			// 로딩 완료 후 상태 확인
			expect((modal as any).state.isLoading).toBe(false);
		});

		it('상태 로딩 후 statusOverview가 설정된다', async () => {
			// Given: DashboardModal 인스턴스
			const mockOverview = createMockStatusOverview();
			onLoadStatus.mockResolvedValue(mockOverview);

			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: statusOverview가 설정됨
			const state = (modal as any).state;
			expect(state.statusOverview).toEqual(mockOverview);
		});

		it('상태 로딩 실패 시 에러가 설정된다', async () => {
			// Given: 에러를 발생시키는 onLoadStatus
			const errorMessage = 'Network error';
			onLoadStatus.mockRejectedValue(new Error(errorMessage));

			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: 에러가 설정됨
			const state = (modal as any).state;
			expect(state.error).toBe(errorMessage);
		});

		it('진행 콜백이 onLoadStatus에 전달된다', async () => {
			// Given: 진행 콜백을 캡처할 수 있는 onLoadStatus
			let capturedCallback: ((processed: number, total: number) => void) | undefined;
			onLoadStatus.mockImplementation((callback) => {
				capturedCallback = callback;
				return Promise.resolve(createMockStatusOverview());
			});

			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});

			// When: 모달 열기
			await modal.onOpen();

			// Then: 콜백이 전달됨
			expect(capturedCallback).toBeDefined();
		});
	});

	// =========================================================================
	// refresh() 테스트
	// =========================================================================

	describe('refresh()', () => {
		it('refresh()가 상태를 다시 로드한다', async () => {
			// Given: 열린 모달
			const modal = new DashboardModal(app, {
				onPublish,
				onDelete,
				onLoadStatus,
			});
			await modal.onOpen();

			// onLoadStatus 호출 횟수 초기화
			expect(onLoadStatus).toHaveBeenCalledTimes(1);

			// When: refresh() 호출
			await modal.refresh();

			// Then: onLoadStatus가 다시 호출됨
			expect(onLoadStatus).toHaveBeenCalledTimes(2);
		});
	});
});

// =========================================================================
// Phase 4: User Story 2 - 선택적 일괄 발행 테스트
// =========================================================================

describe('DashboardModal - 일괄 발행', () => {
	let app: App;
	let onPublish: ReturnType<typeof vi.fn>;
	let onDelete: ReturnType<typeof vi.fn>;
	let onLoadStatus: ReturnType<typeof vi.fn>;

	const createMockStatusOverview = (): StatusOverview => ({
		new: [
			{ file: new TFile('notes/new1.md'), status: 'new' },
			{ file: new TFile('notes/new2.md'), status: 'new' },
		],
		modified: [{ file: new TFile('notes/modified1.md'), status: 'modified' }],
		synced: [],
		deleted: [],
	});

	beforeEach(() => {
		app = new App();
		onPublish = vi.fn().mockResolvedValue({
			total: 2,
			succeeded: 2,
			failed: 0,
			results: [
				{ success: true, file: new TFile('notes/new1.md'), remotePath: 'content/notes/new1.md' },
				{ success: true, file: new TFile('notes/new2.md'), remotePath: 'content/notes/new2.md' },
			],
		});
		onDelete = vi.fn().mockResolvedValue([]);
		onLoadStatus = vi.fn().mockResolvedValue(createMockStatusOverview());
	});

	// T024: 체크박스 선택 테스트
	it('체크박스로 노트를 선택/해제할 수 있다', async () => {
		// Given: 열린 대시보드
		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		// 초기 상태: 선택 없음
		expect((modal as any).state.selectedPaths.size).toBe(0);

		// When: 첫 번째 노트 선택
		(modal as any).toggleSelection('notes/new1.md');

		// Then: 1개 선택됨
		expect((modal as any).state.selectedPaths.size).toBe(1);
		expect((modal as any).state.selectedPaths.has('notes/new1.md')).toBe(true);

		// When: 같은 노트 다시 선택 (해제)
		(modal as any).toggleSelection('notes/new1.md');

		// Then: 선택 해제됨
		expect((modal as any).state.selectedPaths.size).toBe(0);
	});

	// T024: 전체 선택/해제 테스트
	it('전체 선택/해제가 동작한다', async () => {
		// Given: 열린 대시보드
		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		// When: 전체 선택
		(modal as any).toggleSelectAll();

		// Then: 현재 탭의 모든 노트가 선택됨
		expect((modal as any).state.selectedPaths.size).toBe(2);

		// When: 전체 해제
		(modal as any).toggleSelectAll();

		// Then: 모든 선택 해제됨
		expect((modal as any).state.selectedPaths.size).toBe(0);
	});

	// T025: 일괄 발행 테스트
	it('선택된 파일만 발행된다', async () => {
		// Given: 열린 대시보드에서 1개 노트 선택
		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		(modal as any).toggleSelection('notes/new1.md');

		// When: 발행 실행
		await (modal as any).publishSelected();

		// Then: onPublish가 선택된 파일로 호출됨
		expect(onPublish).toHaveBeenCalled();
		const calledFiles = onPublish.mock.calls[0][0];
		expect(calledFiles).toHaveLength(1);
		expect(calledFiles[0].path).toBe('notes/new1.md');
	});

	// T026: 발행 프로그레스 테스트 (결과 요약)
	it('발행 완료 후 결과를 표시한다', async () => {
		// Given: 발행 성공 응답 설정
		onPublish.mockResolvedValue({
			total: 2,
			succeeded: 2,
			failed: 0,
			results: [],
		});

		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		(modal as any).toggleSelectAll();

		// When: 발행 실행
		await (modal as any).publishSelected();

		// Then: 발행 완료 (상태 새로고침을 위해 onLoadStatus 재호출)
		// Note: 실제 결과 표시 UI는 render()에서 처리
		expect(onLoadStatus).toHaveBeenCalledTimes(2); // 초기 로드 + 발행 후 새로고침
	});
});

// =========================================================================
// Phase 5: User Story 3 - 선택적 일괄 삭제 테스트
// =========================================================================

describe('DashboardModal - 일괄 삭제', () => {
	let app: App;
	let onPublish: ReturnType<typeof vi.fn>;
	let onDelete: ReturnType<typeof vi.fn>;
	let onLoadStatus: ReturnType<typeof vi.fn>;

	const createMockStatusOverview = (): StatusOverview => ({
		new: [],
		modified: [],
		synced: [],
		deleted: [
			{ file: { path: 'notes/deleted1.md' } as TFile, status: 'deleted' },
			{ file: { path: 'notes/deleted2.md' } as TFile, status: 'deleted' },
		],
	});

	beforeEach(() => {
		app = new App();
		onPublish = vi.fn().mockResolvedValue({ total: 0, succeeded: 0, failed: 0, results: [] });
		onDelete = vi.fn().mockResolvedValue([
			{ success: true, file: { path: 'notes/deleted1.md' } },
		]);
		onLoadStatus = vi.fn().mockResolvedValue(createMockStatusOverview());
	});

	// T035: ConfirmDeleteModal 동작 테스트 (ConfirmModal 테스트에서 커버됨)

	// T036: 일괄 삭제 테스트 (확인 후 삭제 실행)
	it('확인 후 선택된 파일이 삭제된다', async () => {
		// Given: 삭제 탭에서 1개 노트 선택
		const modal = new DashboardModal(app, {
			initialTab: 'deleted',
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		(modal as any).toggleSelection('notes/deleted1.md');

		// ConfirmModal을 모킹 (자동 확인)
		const originalConfirmModal = ConfirmModal;
		vi.spyOn(ConfirmModal.prototype, 'waitForConfirmation').mockResolvedValue(true);

		// When: 삭제 실행
		await (modal as any).deleteSelected();

		// Then: onDelete가 호출됨
		expect(onDelete).toHaveBeenCalled();

		// 정리
		vi.restoreAllMocks();
	});
});

// =========================================================================
// Phase 6: User Story 4 - 전체 동기화 테스트
// =========================================================================

describe('DashboardModal - 전체 동기화', () => {
	let app: App;
	let onPublish: ReturnType<typeof vi.fn>;
	let onDelete: ReturnType<typeof vi.fn>;
	let onLoadStatus: ReturnType<typeof vi.fn>;

	const createMockStatusOverview = (): StatusOverview => ({
		new: [{ file: new TFile('notes/new1.md'), status: 'new' }],
		modified: [{ file: new TFile('notes/modified1.md'), status: 'modified' }],
		synced: [],
		deleted: [{ file: { path: 'notes/deleted1.md' } as TFile, status: 'deleted' }],
	});

	beforeEach(() => {
		app = new App();
		onPublish = vi.fn().mockResolvedValue({ total: 2, succeeded: 2, failed: 0, results: [] });
		onDelete = vi.fn().mockResolvedValue([{ success: true, file: { path: 'notes/deleted1.md' } }]);
		onLoadStatus = vi.fn().mockResolvedValue(createMockStatusOverview());
	});

	// T042: 전체 동기화 테스트 (삭제 포함 시 확인 모달)
	it('삭제가 포함된 경우 확인 모달이 표시된다', async () => {
		// Given: 신규, 수정, 삭제가 모두 있는 상태
		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		// ConfirmModal 스파이
		const waitForConfirmationSpy = vi.spyOn(ConfirmModal.prototype, 'waitForConfirmation').mockResolvedValue(true);

		// When: 전체 동기화 실행
		await (modal as any).syncAll();

		// Then: 확인 모달이 표시됨
		expect(waitForConfirmationSpy).toHaveBeenCalled();

		// 정리
		vi.restoreAllMocks();
	});

	// T043: 부분 실패 시 결과 표시 테스트
	it('부분 실패 시 결과를 표시한다', async () => {
		// Given: 발행은 성공, 삭제는 실패하는 상황
		onPublish.mockResolvedValue({ total: 2, succeeded: 1, failed: 1, results: [] });
		onDelete.mockResolvedValue([{ success: false, file: { path: 'notes/deleted1.md' }, error: 'Network error' }]);

		const modal = new DashboardModal(app, {
			onPublish,
			onDelete,
			onLoadStatus,
		});
		await modal.onOpen();

		vi.spyOn(ConfirmModal.prototype, 'waitForConfirmation').mockResolvedValue(true);

		// When: 전체 동기화 실행
		await (modal as any).syncAll();

		// Then: 양쪽 모두 호출됨
		expect(onPublish).toHaveBeenCalled();
		expect(onDelete).toHaveBeenCalled();

		vi.restoreAllMocks();
	});
});

// =========================================================================
// ConfirmModal 테스트
// =========================================================================

describe('ConfirmModal', () => {
	let app: App;

	beforeEach(() => {
		app = new App();
	});

	it('확인 버튼 클릭 시 true를 반환한다', async () => {
		// Given: ConfirmModal 인스턴스
		const modal = new ConfirmModal(app, {
			title: '확인',
			message: '정말 삭제하시겠습니까?',
		});

		// 모달 열기 (onOpen 호출)
		modal.onOpen();

		// When: 확인 버튼 클릭 시뮬레이션
		// waitForConfirmation은 open()을 호출하므로, 직접 resolvePromise를 설정
		const promise = new Promise<boolean>(resolve => {
			(modal as any).resolvePromise = resolve;
		});

		// 모달이 열린 후 확인 버튼 찾기
		const buttons = modal.contentEl.querySelectorAll('button');
		const confirmButton = Array.from(buttons).find(btn =>
			btn.classList.contains('mod-cta') || btn.classList.contains('mod-warning')
		);

		// 확인 버튼 클릭
		confirmButton?.click();

		// Then: true 반환
		const result = await promise;
		expect(result).toBe(true);
	});

	it('취소 버튼 클릭 시 false를 반환한다', async () => {
		// Given: ConfirmModal 인스턴스
		const modal = new ConfirmModal(app, {
			title: '확인',
			message: '정말 삭제하시겠습니까?',
		});

		// 모달 열기 (onOpen 호출)
		modal.onOpen();

		// When: 취소 버튼 클릭 시뮬레이션
		const promise = new Promise<boolean>(resolve => {
			(modal as any).resolvePromise = resolve;
		});

		// 모달이 열린 후 취소 버튼 찾기
		const buttons = modal.contentEl.querySelectorAll('button');
		const cancelButton = Array.from(buttons).find(btn =>
			!btn.classList.contains('mod-cta') && !btn.classList.contains('mod-warning')
		);

		// 취소 버튼 클릭
		cancelButton?.click();

		// Then: false 반환
		const result = await promise;
		expect(result).toBe(false);
	});

	it('위험한 작업일 때 mod-warning 스타일이 적용된다', () => {
		// Given: isDangerous가 true인 ConfirmModal
		const modal = new ConfirmModal(app, {
			title: '삭제',
			message: '복구할 수 없습니다.',
			isDangerous: true,
		});

		// When: 모달 열기
		modal.onOpen();

		// Then: mod-warning 클래스가 적용됨
		const confirmButton = modal.contentEl.querySelector('button.mod-warning');
		expect(confirmButton).not.toBeNull();
	});
});
