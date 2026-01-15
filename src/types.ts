/**
 * Quartz Publish Plugin - Type Definitions
 *
 * 플러그인에서 사용하는 모든 타입을 정의합니다.
 */

import type { TFile } from 'obsidian';

// ============================================================================
// Auto Date Settings
// ============================================================================

/**
 * 날짜 자동 추가 설정
 */
export interface AutoDateSettings {
	/** created 필드 자동 추가 활성화 */
	enableCreated: boolean;
	/** modified 필드 자동 추가 활성화 */
	enableModified: boolean;
	/** published 필드 자동 추가 활성화 */
	enablePublished: boolean;
}

/**
 * 기본 날짜 자동 추가 설정값
 */
export const DEFAULT_AUTO_DATE_SETTINGS: AutoDateSettings = {
	enableCreated: true,
	enableModified: true,
	enablePublished: false,
};

// ============================================================================
// Plugin Settings
// ============================================================================

/**
 * 플러그인 전역 설정
 */
export interface PluginSettings {
	/** GitHub Personal Access Token */
	githubToken: string;
	/** Quartz 리포지토리 URL (예: https://github.com/user/quartz) */
	repoUrl: string;
	/** 기본 브랜치 (기본값: main) */
	defaultBranch: string;
	/** 콘텐츠 저장 경로 (기본값: content) */
	contentPath: string;
	/** 정적 파일 경로 (기본값: static) */
	staticPath: string;
	/** Quartz 설정 (Phase 3) */
	quartzSettings?: QuartzSettings;
	/** 날짜 자동 추가 설정 */
	autoDateSettings?: AutoDateSettings;
}

/**
 * 기본 플러그인 설정값
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: '',
	repoUrl: '',
	defaultBranch: 'main',
	contentPath: 'content',
	staticPath: 'static',
	autoDateSettings: DEFAULT_AUTO_DATE_SETTINGS,
};

// ============================================================================
// Repository
// ============================================================================

/**
 * 연결 상태 타입
 */
export type ConnectionStatus =
	| { status: 'disconnected' }
	| { status: 'connecting' }
	| { status: 'connected'; lastChecked: number }
	| { status: 'error'; error: ConnectionError };

/**
 * 연결 오류 타입
 */
export type ConnectionError =
	| 'invalid_token'
	| 'not_found'
	| 'not_quartz'
	| 'network_error'
	| 'rate_limited';

/**
 * GitHub 리포지토리 정보 (런타임 상태)
 */
export interface Repository {
	owner: string;
	name: string;
	defaultBranch: string;
	isQuartz: boolean;
	lastCommitSha?: string;
	connectionStatus: ConnectionStatus;
}

// ============================================================================
// Publish Records
// ============================================================================

/**
 * 발행된 노트의 기록
 */
export interface PublishRecord {
	/** 고유 ID (로컬 경로 기반 해시) */
	id: string;
	/** 볼트 내 파일 경로 */
	localPath: string;
	/** 리포지토리 내 경로 */
	remotePath: string;
	/** 콘텐츠 SHA256 해시 */
	contentHash: string;
	/** 발행 시간 (Unix timestamp) */
	publishedAt: number;
	/** GitHub blob SHA */
	remoteSha: string;
	/** 첨부파일 기록 */
	attachments: AttachmentRecord[];
}

/**
 * 노트에 포함된 첨부파일 기록
 */
export interface AttachmentRecord {
	/** 볼트 내 파일 경로 */
	localPath: string;
	/** 리포지토리 내 경로 (static/images/{note-name}/{filename}) */
	remotePath: string;
	/** 파일 SHA256 해시 */
	contentHash: string;
	/** 파일 크기 (bytes) */
	size: number;
	/** GitHub blob SHA */
	remoteSha: string;
}

// ============================================================================
// Publish Status
// ============================================================================

/**
 * 노트의 발행 상태
 */
export type PublishStatus = 'new' | 'modified' | 'synced' | 'deleted' | 'unpublished';

/**
 * 노트 상태 정보
 */
export interface NoteStatus {
	/** 파일 객체 */
	file: TFile;
	/** 발행 상태 */
	status: PublishStatus;
	/** 로컬 콘텐츠 해시 */
	localHash?: string;
	/** 발행 기록 */
	record?: PublishRecord;
}

/**
 * 상태 개요 (대시보드용)
 */
export interface StatusOverview {
	/** 신규 발행 필요 */
	new: NoteStatus[];
	/** 업데이트 필요 */
	modified: NoteStatus[];
	/** 최신 상태 */
	synced: NoteStatus[];
	/** 삭제 필요 (리포지토리에만 존재) */
	deleted: NoteStatus[];
}

// ============================================================================
// Quartz Settings (Phase 3)
// ============================================================================

/**
 * Quartz 설정 옵션
 */
export interface QuartzSettings {
	/** ExplicitPublish 필터 활성화 */
	explicitPublish: boolean;
	/** 제외 패턴 목록 */
	ignorePatterns: string[];
	/** URL 생성 전략 */
	urlStrategy: 'shortest' | 'absolute';
}

/**
 * 기본 Quartz 설정값
 */
export const DEFAULT_QUARTZ_SETTINGS: QuartzSettings = {
	explicitPublish: false,
	ignorePatterns: [],
	urlStrategy: 'shortest',
};

// ============================================================================
// Quartz Site Config (Phase 4 - Advanced Config)
// ============================================================================

/**
 * Analytics 설정 타입 (Provider별 유니온)
 */
export type AnalyticsConfig =
	| { provider: 'null' }
	| { provider: 'google'; tagId: string }
	| { provider: 'plausible'; host?: string }
	| { provider: 'umami'; websiteId: string; host: string };

/**
 * Quartz 사이트 전체 설정 (고급 설정 포함)
 */
export interface QuartzSiteConfig {
	// === Site Information ===
	/** 사이트 제목 (브라우저 탭, 헤더 등에 표시) */
	pageTitle: string;
	/** 사이트 기본 URL (프로토콜 없이, 예: "example.com" 또는 "example.com/blog") */
	baseUrl: string;
	/** 사이트 로케일 (BCP 47 형식, 예: "ko-KR") */
	locale: string;

	// === Behavior ===
	/** SPA 모드 활성화 여부 */
	enableSPA: boolean;
	/** 링크 팝오버 미리보기 활성화 여부 */
	enablePopovers: boolean;
	/** 기본 날짜 타입 ("created" | "modified" | "published") */
	defaultDateType: 'created' | 'modified' | 'published';

	// === Analytics ===
	/** 애널리틱스 설정 */
	analytics: AnalyticsConfig;

	// === Publishing (기존 설정) ===
	/** ExplicitPublish 필터 활성화 여부 */
	explicitPublish: boolean;
	/** 발행 제외 패턴 목록 */
	ignorePatterns: string[];
	/** URL 생성 전략 */
	urlStrategy: 'shortest' | 'absolute';
}

/**
 * 기본 Quartz 사이트 설정값
 */
export const DEFAULT_QUARTZ_SITE_CONFIG: QuartzSiteConfig = {
	pageTitle: 'Quartz 4.0',
	baseUrl: 'quartz.jzhao.xyz',
	locale: 'en-US',
	enableSPA: true,
	enablePopovers: true,
	defaultDateType: 'created',
	analytics: { provider: 'null' },
	explicitPublish: false,
	ignorePatterns: ['private', 'templates'],
	urlStrategy: 'shortest',
};

/**
 * 설정 업데이트 오류 타입
 */
export type ConfigUpdateError =
	| 'conflict' // SHA 불일치 (원격 변경됨)
	| 'network' // 네트워크 오류
	| 'rate_limited' // GitHub API 제한
	| 'parse_error' // 설정 파싱 실패
	| 'validation' // 유효성 검사 실패
	| 'unknown'; // 알 수 없는 오류

/**
 * 설정 업데이트 결과
 */
export interface ConfigUpdateResult {
	/** 성공 여부 */
	success: boolean;
	/** 새 파일 SHA (성공 시) */
	newSha?: string;
	/** 커밋 SHA (성공 시) */
	commitSha?: string;
	/** 오류 유형 (실패 시) */
	errorType?: ConfigUpdateError;
	/** 오류 메시지 (실패 시) */
	errorMessage?: string;
}

/**
 * 충돌 해결 옵션
 */
export type ConflictResolution =
	| 'reload' // 새로고침 후 재적용
	| 'force_overwrite' // 강제 덮어쓰기
	| 'cancel'; // 취소

/**
 * 변경사항 추적 인터페이스
 */
export interface PendingChanges {
	/** 원본 설정 (로드 시점 스냅샷) */
	original: QuartzSiteConfig;
	/** 현재 설정 (사용자 편집 반영) */
	current: QuartzSiteConfig;
	/** 변경된 필드 키 집합 */
	changedFields: Set<keyof QuartzSiteConfig>;
	/** 원본 파일 SHA (충돌 감지용) */
	originalSha: string;
}

/**
 * Quartz 설정 파일 정보
 */
export interface QuartzConfigFile {
	/** 파일 경로 (항상 quartz.config.ts) */
	path: 'quartz.config.ts';
	/** GitHub blob SHA */
	sha: string;
	/** 파일 내용 */
	content: string;
	/** 마지막 조회 시간 (Unix timestamp) */
	lastFetched: number;
}

/**
 * Quartz 버전 정보
 */
export interface QuartzVersionInfo {
	/** 현재 설치된 버전 */
	current: string | null;
	/** 최신 릴리스 버전 */
	latest: string | null;
	/** 업데이트 가능 여부 */
	hasUpdate: boolean;
	/** 마지막 확인 시간 (Unix timestamp) */
	lastChecked: number;
}

/**
 * 업그레이드 상태 타입
 */
export type UpgradeStatus =
	| 'idle'
	| 'checking'
	| 'downloading'
	| 'applying'
	| 'completed'
	| 'error';

/**
 * Quartz 업그레이드 진행 상황
 */
export interface QuartzUpgradeProgress {
	/** 현재 상태 */
	status: UpgradeStatus;
	/** 총 파일 수 */
	totalFiles: number;
	/** 완료된 파일 수 */
	completedFiles: number;
	/** 현재 처리 중인 파일 */
	currentFile: string | null;
	/** 오류 메시지 */
	error: string | null;
}

/**
 * 업그레이드 진행 상황 초기값
 */
export const INITIAL_UPGRADE_PROGRESS: QuartzUpgradeProgress = {
	status: 'idle',
	totalFiles: 0,
	completedFiles: 0,
	currentFile: null,
	error: null,
};

// ============================================================================
// Plugin Data (Persisted)
// ============================================================================

/**
 * 플러그인 저장 데이터 구조 (data.json)
 */
export interface PluginData {
	settings: PluginSettings;
	/** key: localPath */
	publishRecords: Record<string, PublishRecord>;
	/** 마지막 동기화 시간 */
	lastSync?: number;
}

// ============================================================================
// GitHub API Types
// ============================================================================

/**
 * GitHub 파일 콘텐츠
 */
export interface GitHubFileContent {
	path: string;
	sha: string;
	content: string;
	size: number;
}

/**
 * GitHub 커밋 결과
 */
export interface GitHubCommitResult {
	success: boolean;
	sha?: string;
	commitSha?: string;
	error?: string;
}

/**
 * GitHub Rate Limit 정보
 */
export interface RateLimitInfo {
	limit: number;
	remaining: number;
	resetAt: Date;
}

/**
 * 연결 테스트 결과
 */
export interface ConnectionTestResult {
	success: boolean;
	repository?: {
		name: string;
		owner: string;
		defaultBranch: string;
		isQuartz: boolean;
		lastCommit?: string;
	};
	error?: {
		type: ConnectionError;
		message: string;
	};
}

// ============================================================================
// Publish Service Types
// ============================================================================

/**
 * 발행 오류 타입
 */
export type PublishError =
	| 'not_connected'
	| 'no_publish_flag'
	| 'file_too_large'
	| 'network_error'
	| 'rate_limited'
	| 'conflict'
	| 'unknown';

/**
 * 단일 노트 발행 결과
 */
export interface PublishResult {
	success: boolean;
	file: TFile;
	remotePath?: string;
	error?: PublishError;
}

/**
 * 일괄 발행 결과
 */
export interface BatchPublishResult {
	total: number;
	succeeded: number;
	failed: number;
	results: PublishResult[];
}

/**
 * 발행 취소 결과
 */
export interface UnpublishResult {
	success: boolean;
	file: TFile;
	error?: string;
}

/**
 * 동기화 옵션
 */
export interface SyncOptions {
	/** 신규 노트 포함 (기본값: true) */
	includeNew?: boolean;
	/** 수정된 노트 포함 (기본값: true) */
	includeModified?: boolean;
	/** 삭제된 노트 포함 (기본값: false) */
	includeDeleted?: boolean;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
	published: PublishResult[];
	updated: PublishResult[];
	deleted: UnpublishResult[];
	errors: Array<{ path: string; error: string }>;
}

// ============================================================================
// Content Transformer Types
// ============================================================================

/**
 * 콘텐츠 변환 결과
 */
export interface TransformResult {
	/** 변환된 마크다운 */
	content: string;
	/** 참조된 첨부파일 */
	attachments: AttachmentRef[];
}

/**
 * 첨부파일 참조
 */
export interface AttachmentRef {
	/** 볼트 내 경로 */
	localPath: string;
	/** 리포지토리 내 경로 */
	remotePath: string;
}

/**
 * 프론트매터 파싱 결과
 */
export interface FrontmatterResult {
	/** 파싱된 프론트매터 객체 */
	frontmatter: Record<string, unknown>;
	/** 프론트매터 제외한 본문 */
	body: string;
	/** 프론트매터 원본 (YAML) */
	raw: string;
}

// ============================================================================
// Constants
// ============================================================================

/** 최대 파일 크기 (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** GitHub API 기본 URL */
export const GITHUB_API_BASE_URL = 'https://api.github.com';

// ============================================================================
// Dashboard Types (Phase 2)
// ============================================================================

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
 * 대시보드 상태
 */
export interface DashboardState {
	/** 현재 활성 탭 */
	activeTab: DashboardTab;
	/** 선택된 파일 경로 목록 */
	selectedPaths: Set<string>;
	/** 상태 개요 */
	statusOverview: StatusOverview | null;
	/** 로딩 상태 */
	isLoading: boolean;
	/** 작업 진행 중 여부 */
	isOperating: boolean;
	/** 에러 메시지 */
	error: string | null;
}

/**
 * 대시보드 초기 상태
 */
export const INITIAL_DASHBOARD_STATE: DashboardState = {
	activeTab: 'new',
	selectedPaths: new Set(),
	statusOverview: null,
	isLoading: false,
	isOperating: false,
	error: null,
};
