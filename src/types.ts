/**
 * Quartz Publish Plugin - Type Definitions
 *
 * 플러그인에서 사용하는 모든 타입을 정의합니다.
 */

import type { TFile } from "obsidian";

// ============================================================================
// Publish Filter Settings (Phase 8)
// ============================================================================

/**
 * 발행 필터링 설정
 */
export interface PublishFilterSettings {
	/**
	 * 포함할 폴더 목록
	 * - 빈 배열이면 전체 vault가 발행 대상
	 * - 값이 있으면 해당 폴더들만 발행 대상
	 * @example ["Blog", "Notes/Public"]
	 */
	includeFolders: string[];

	/**
	 * 제외할 폴더 목록
	 * - 포함 폴더 내에 있더라도 제외됨 (제외 규칙 우선)
	 * @example ["Private", "Templates", "Archive"]
	 */
	excludeFolders: string[];

	/**
	 * 제외할 태그 목록
	 * - `#` 접두사 없이 저장
	 * - 해당 태그가 있는 노트는 발행에서 제외
	 * @example ["private", "wip", "draft"]
	 */
	excludeTags: string[];

	/**
	 * 발행 루트로 사용할 폴더
	 * - 빈 문자열이면 vault 루트 기준
	 * - 설정 시 해당 폴더 기준으로 경로 재계산
	 * @example "Blog" -> "Blog/posts/hello.md" becomes "posts/hello.md"
	 */
	rootFolder: string;

	/**
	 * 홈 페이지로 사용할 노트 경로
	 * - 빈 문자열이면 홈 페이지 미설정
	 * - 설정 시 해당 노트가 content/index.md로 업로드됨
	 * @example "Home.md" 또는 "Blog/Welcome.md"
	 */
	homePagePath: string;
}

/**
 * 기본 발행 필터링 설정값
 */
export const DEFAULT_PUBLISH_FILTER_SETTINGS: PublishFilterSettings = {
	includeFolders: [],
	excludeFolders: [],
	excludeTags: [],
	rootFolder: "",
	homePagePath: "",
};

// ============================================================================
// Auto Frontmatter Settings
// ============================================================================

/**
 * Frontmatter 자동 추가 설정
 */
export interface AutoDateSettings {
	// === 날짜 필드 ===
	/** created 필드 자동 추가 활성화 */
	enableCreated: boolean;
	/** modified 필드 자동 추가 활성화 */
	enableModified: boolean;
	/** published 필드 자동 추가 활성화 */
	enablePublished: boolean;

	// === 메타데이터 필드 ===
	/** title 필드 자동 추가 활성화 (파일명에서 생성) */
	enableTitle: boolean;
	/** description 필드 자동 추가 활성화 (첫 문단에서 생성) */
	enableDescription: boolean;
	/** description 최대 길이 */
	descriptionMaxLength: number;
}

/**
 * 기본 자동 추가 설정값
 */
export const DEFAULT_AUTO_DATE_SETTINGS: AutoDateSettings = {
	enableCreated: true,
	enableModified: true,
	enablePublished: false,
	enableTitle: false,
	enableDescription: false,
	descriptionMaxLength: 160,
};

// ============================================================================
// Frontmatter Validation
// ============================================================================

/**
 * Frontmatter 검증 경고 심각도
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * Frontmatter 검증 결과 항목
 */
export interface ValidationIssue {
	/** 심각도 */
	severity: ValidationSeverity;
	/** 필드명 */
	field: string;
	/** 메시지 */
	message: string;
	/** 제안값 (있는 경우) */
	suggestion?: string;
}

/**
 * Frontmatter 검증 결과
 */
export interface FrontmatterValidationResult {
	/** 검증 통과 여부 (error가 없으면 true) */
	isValid: boolean;
	/** 발견된 이슈 목록 */
	issues: ValidationIssue[];
	/** 에러 수 */
	errorCount: number;
	/** 경고 수 */
	warningCount: number;
}

/**
 * Frontmatter 검증 설정
 */
export interface FrontmatterValidationSettings {
	/** 검증 활성화 여부 */
	enabled: boolean;
	/** title 필수 여부 */
	requireTitle: boolean;
	/** description 필수 여부 */
	requireDescription: boolean;
	/** tags 필수 여부 */
	requireTags: boolean;
	/** 경고 시 발행 차단 여부 */
	blockOnWarning: boolean;
}

/**
 * 기본 검증 설정
 */
export const DEFAULT_VALIDATION_SETTINGS: FrontmatterValidationSettings = {
	enabled: true,
	requireTitle: false,
	requireDescription: false,
	requireTags: false,
	blockOnWarning: false,
};

// ============================================================================
// Quartz Frontmatter (Authoring Content)
// ============================================================================

/**
 * Quartz가 지원하는 frontmatter 속성
 * @see https://quartz.jzhao.xyz/plugins/Frontmatter
 * @see https://quartz.jzhao.xyz/authoring-content
 */
export interface QuartzFrontmatter {
	// === 기본 메타데이터 ===
	/** 페이지 제목 (없으면 파일명 사용) */
	title?: string;
	/** 페이지 설명 (링크 미리보기용) */
	description?: string;
	/** 태그 목록 */
	tags?: string[];
	/** 노트 별칭 목록 */
	aliases?: string[];

	// === 발행 제어 ===
	/** 발행 여부 (true면 발행) */
	publish?: boolean;
	/** 초안 여부 (true면 비공개) */
	draft?: boolean;

	// === URL/라우팅 ===
	/** 커스텀 URL (파일 경로 변경해도 유지) */
	permalink?: string;
	/** 커스텀 발행 경로 (플러그인 전용) */
	path?: string;

	// === 날짜 ===
	/** 생성일 (YYYY-MM-DD) */
	created?: string;
	/** 수정일 (YYYY-MM-DD) */
	modified?: string;
	/** 발행일 (YYYY-MM-DD) */
	published?: string;
	/** 날짜 (created/published 대체) */
	date?: string;

	// === 기능 제어 ===
	/** 목차(TOC) 활성화 여부 */
	enableToc?: boolean;
	/** 댓글 기능 활성화 여부 */
	comments?: boolean;
	/** 페이지 언어 설정 (BCP 47) */
	lang?: string;

	// === 스타일링 ===
	/** 페이지에 적용할 CSS 클래스 */
	cssclasses?: string[];

	// === 소셜/SEO ===
	/** 소셜 공유용 설명 */
	socialDescription?: string;
	/** 소셜 공유용 이미지 */
	socialImage?: string;

	// === 기타 커스텀 속성 ===
	[key: string]: unknown;
}

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
	/** 발행 필터링 설정 (Phase 8) */
	publishFilterSettings?: PublishFilterSettings;
	/** Quartz 사이트 설정 (캐시됨) */
	quartzSiteConfig?: QuartzSiteConfig;
	/** Frontmatter 검증 설정 */
	validationSettings?: FrontmatterValidationSettings;
	/** 발행 전 Frontmatter 편집기 표시 여부 */
	showFrontmatterEditor?: boolean;
	/** 커스텀 CSS 파일 경로 */
	customCssPath?: string;
}

/**
 * 기본 플러그인 설정값
 */
export const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: "",
	repoUrl: "",
	defaultBranch: "main",
	contentPath: "content",
	staticPath: "static",
	autoDateSettings: DEFAULT_AUTO_DATE_SETTINGS,
	publishFilterSettings: DEFAULT_PUBLISH_FILTER_SETTINGS,
	validationSettings: DEFAULT_VALIDATION_SETTINGS,
	showFrontmatterEditor: false,
	customCssPath: "",
};

// ============================================================================
// Repository
// ============================================================================

/**
 * 연결 상태 타입
 */
export type ConnectionStatus =
	| { status: "disconnected" }
	| { status: "connecting" }
	| { status: "connected"; lastChecked: number }
	| { status: "error"; error: ConnectionError };

/**
 * 연결 오류 타입
 */
export type ConnectionError =
	| "invalid_token"
	| "not_found"
	| "not_quartz"
	| "network_error"
	| "rate_limited";

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
export type PublishStatus =
	| "new"
	| "modified"
	| "synced"
	| "deleted"
	| "unpublished";

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
}

/**
 * 기본 Quartz 설정값
 */
export const DEFAULT_QUARTZ_SETTINGS: QuartzSettings = {
	explicitPublish: false,
	ignorePatterns: [],
};

// ============================================================================
// Quartz Site Config (Phase 4 - Advanced Config)
// ============================================================================

/**
 * Analytics 설정 타입 (Provider별 유니온)
 */
export type AnalyticsConfig =
	| { provider: "null" }
	| { provider: "google"; tagId: string }
	| { provider: "plausible"; host?: string }
	| { provider: "umami"; websiteId: string; host: string };

// ============================================================================
// Comments Config (Giscus)
// ============================================================================

/**
 * Giscus 댓글 설정
 * @see https://quartz.jzhao.xyz/features/comments
 */
export interface GiscusConfig {
	/** GitHub 저장소 (owner/repo 형식) */
	repo: `${string}/${string}`;
	/** 저장소 ID (data-repo-id) */
	repoId: string;
	/** Discussion 카테고리 이름 */
	category: string;
	/** 카테고리 ID (data-category-id) */
	categoryId: string;

	// === Optional Settings ===
	/** 커스텀 테마 URL (기본: https://${cfg.baseUrl}/static/giscus) */
	themeUrl?: string;
	/** 라이트 테마 파일명 (기본: 'light') */
	lightTheme?: string;
	/** 다크 테마 파일명 (기본: 'dark') */
	darkTheme?: string;
	/** 페이지-Discussion 매핑 방식 (기본: 'url') */
	mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname";
	/** 엄격한 제목 매칭 (기본: true) */
	strict?: boolean;
	/** 메인 포스트 리액션 활성화 (기본: true) */
	reactionsEnabled?: boolean;
	/** 댓글 입력창 위치 (기본: 'bottom') */
	inputPosition?: "top" | "bottom";
	/** 언어 설정 (기본: 'en') */
	lang?: string;
}

/**
 * 댓글 설정 타입 (Provider별 유니온)
 * 현재는 Giscus만 지원
 */
export type CommentsConfig =
	| { provider: "giscus"; options: GiscusConfig }
	| { provider: "null" };

/**
 * 기본 댓글 설정값
 */
export const DEFAULT_COMMENTS_CONFIG: CommentsConfig = {
	provider: "null",
};

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
	defaultDateType: "created" | "modified" | "published";

	// === Analytics ===
	/** 애널리틱스 설정 */
	analytics: AnalyticsConfig;

	// === Comments ===
	/** 댓글 설정 */
	comments: CommentsConfig;

	// === Publishing (기존 설정) ===
	/** ExplicitPublish 필터 활성화 여부 */
	explicitPublish: boolean;
	/** 발행 제외 패턴 목록 */
	ignorePatterns: string[];

	// === Typography (Phase 10 - Font Management) ===
	/** 타이포그래피 설정 */
	typography: TypographyConfig;
}

/**
 * 타이포그래피 설정
 */
export interface TypographyConfig {
	/** 헤더 폰트 */
	header: string;
	/** 본문 폰트 */
	body: string;
	/** 코드 폰트 */
	code: string;
}

/**
 * 기본 타이포그래피 설정값
 */
export const DEFAULT_TYPOGRAPHY_CONFIG: TypographyConfig = {
	header: "Schibsted Grotesk",
	body: "Source Sans Pro",
	code: "IBM Plex Mono",
};

/**
 * 기본 Quartz 사이트 설정값
 */
export const DEFAULT_QUARTZ_SITE_CONFIG: QuartzSiteConfig = {
	pageTitle: "Quartz 4.0",
	baseUrl: "quartz.jzhao.xyz",
	locale: "en-US",
	enableSPA: true,
	enablePopovers: true,
	defaultDateType: "created",
	analytics: { provider: "null" },
	comments: { provider: "null" },
	explicitPublish: false,
	ignorePatterns: ["private", "templates"],
	typography: DEFAULT_TYPOGRAPHY_CONFIG,
};

/**
 * 설정 업데이트 오류 타입
 */
export type ConfigUpdateError =
	| "conflict" // SHA 불일치 (원격 변경됨)
	| "network" // 네트워크 오류
	| "rate_limited" // GitHub API 제한
	| "parse_error" // 설정 파싱 실패
	| "validation" // 유효성 검사 실패
	| "unknown"; // 알 수 없는 오류

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
	| "reload" // 새로고침 후 재적용
	| "force_overwrite" // 강제 덮어쓰기
	| "cancel"; // 취소

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
	path: "quartz.config.ts";
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
	| "idle"
	| "checking"
	| "downloading"
	| "applying"
	| "completed"
	| "error";

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
	status: "idle",
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
// Network Status Types (Phase 5 - Non-Functional Requirements)
// ============================================================================

/**
 * 네트워크 연결 상태
 */
export type NetworkStatus = "online" | "offline" | "unknown";

/**
 * 네트워크 상태 변경 콜백
 */
export type NetworkStatusCallback = (status: NetworkStatus) => void;

// ============================================================================
// File Validation Types (Phase 5 - Non-Functional Requirements)
// ============================================================================

/**
 * 대용량 파일 정보
 */
export interface LargeFileInfo {
	/** 파일 객체 */
	file: TFile;
	/** 파일 크기 (bytes) */
	size: number;
	/** 포맷된 크기 (예: "12.5 MB") */
	formattedSize: string;
}

/**
 * 파일 검증 결과
 */
export interface FileValidationResult {
	/** 검증 통과 여부 */
	isValid: boolean;
	/** 대용량 파일 목록 */
	largeFiles: LargeFileInfo[];
	/** 총 대용량 파일 수 */
	count: number;
}

/**
 * 발행 전 검사 결과
 */
export interface PublishPreflightResult {
	/** 발행 가능 여부 */
	canPublish: boolean;
	/** 네트워크 상태 */
	networkStatus: NetworkStatus;
	/** 대용량 파일 검증 결과 */
	fileValidation: FileValidationResult;
	/** 차단 사유 (발행 불가 시) */
	blockReason?: "offline" | "large_files_rejected";
}

// ============================================================================
// Publish Service Types
// ============================================================================

/**
 * 발행 오류 타입
 */
export type PublishError =
	| "not_connected"
	| "no_publish_flag"
	| "file_too_large"
	| "network_error"
	| "rate_limited"
	| "conflict"
	| "offline"
	| "unknown";

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
	/** 볼트 내 경로 (실제 파일 조회용) */
	localPath: string;
	/** 리포지토리 내 경로 (GitHub 업로드 경로) */
	remotePath: string;
	/** 콘텐츠 내 참조 경로 (위키링크/마크다운 링크용) */
	contentPath?: string;
}

/**
 * 프론트매터 파싱 결과
 */
export interface FrontmatterResult {
	/** 파싱된 프론트매터 객체 */
	frontmatter: QuartzFrontmatter;
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
export const GITHUB_API_BASE_URL = "https://api.github.com";

// ============================================================================
// Repository Creation Types (Phase 4 - Beginner Support)
// ============================================================================

/**
 * 리포지토리 생성 요청
 */
export interface RepositoryCreationRequest {
	/** 리포지토리 이름 (기본값: "quartz") */
	name: string;
	/** 공개 범위 (기본값: 'public') */
	visibility: "public" | "private";
	/** 리포지토리 설명 (선택) */
	description?: string;
}

/**
 * 생성된 리포지토리 정보
 */
export interface CreatedRepository {
	/** 리포지토리 소유자 */
	owner: string;
	/** 리포지토리 이름 */
	name: string;
	/** 전체 이름 (owner/name) */
	fullName: string;
	/** GitHub URL */
	htmlUrl: string;
	/** 기본 브랜치 */
	defaultBranch: string;
	/** Private 여부 */
	isPrivate: boolean;
}

/**
 * 리포지토리 생성 에러 유형
 */
export type RepositoryCreationErrorType =
	| "invalid_token"
	| "insufficient_permissions"
	| "repo_exists"
	| "invalid_name"
	| "template_not_found"
	| "rate_limited"
	| "network_error"
	| "unknown";

/**
 * 리포지토리 생성 에러
 */
export interface RepositoryCreationError {
	/** 에러 유형 */
	type: RepositoryCreationErrorType;
	/** 사용자 친화적 메시지 */
	message: string;
	/** 상세 에러 정보 (디버깅용) */
	details?: string;
}

/**
 * 리포지토리 생성 결과
 */
export type RepositoryCreationResult =
	| { success: true; repository: CreatedRepository }
	| { success: false; error: RepositoryCreationError };

/**
 * 배포 가이드 단계
 */
export interface DeployGuideStep {
	/** 단계 번호 (1-based) */
	stepNumber: number;
	/** 단계 제목 */
	title: string;
	/** 단계 설명 */
	description: string;
	/** 외부 링크 (있는 경우) */
	externalUrl?: string;
	/** 외부 링크 버튼 라벨 */
	actionLabel?: string;
}

/**
 * GitHub 설정 가이드 단계 (DeployGuideStep 확장)
 */
export interface GuideStep extends DeployGuideStep {
	/** Base64 인코딩된 스크린샷 이미지 */
	screenshot?: string;
	/** 완료 상태 체크 함수 */
	completionCheck?: () => boolean;
	/** 문제 해결 팁 목록 */
	troubleshootingTips?: string[];
}

/**
 * 설정 진행 상태
 */
export interface SetupStatus {
	/** GitHub 계정 보유 여부 (수동 확인) */
	hasGitHubAccount: boolean;
	/** Quartz Fork 완료 여부 */
	hasForkedRepo: boolean;
	/** PAT 설정 여부 */
	hasToken: boolean;
	/** GitHub 연결 성공 여부 */
	isConnected: boolean;
}

/**
 * 문제 해결 항목
 */
export interface TroubleshootingItem {
	/** 오류 코드 (예: "401", "404") */
	errorCode: string;
	/** 오류 메시지 패턴 */
	errorMessage: string;
	/** 오류 원인 설명 */
	cause: string;
	/** 해결 방법 */
	solution: string;
	/** 관련 가이드 단계 번호 */
	relatedStep?: number;
}

/**
 * Quartz 템플릿 정보
 */
export const QUARTZ_TEMPLATE = {
	owner: "jackyzha0",
	repo: "quartz",
} as const;

/**
 * 리포지토리 이름 기본값
 */
export const DEFAULT_REPO_NAME = "quartz";

// ============================================================================
// Dashboard Types (Phase 2)
// ============================================================================

/**
 * 대시보드 탭 타입
 */
export type DashboardTab = "new" | "modified" | "deleted" | "synced";

/**
 * 탭 레이블 매핑
 */
export const TAB_LABELS: Record<DashboardTab, string> = {
	new: "신규",
	modified: "수정됨",
	deleted: "삭제 필요",
	synced: "최신",
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
	activeTab: "new",
	selectedPaths: new Set(),
	statusOverview: null,
	isLoading: false,
	isOperating: false,
	error: null,
};

// ============================================================================
// Remote File Management Types (Phase 9)
// ============================================================================

/**
 * 원격 저장소에 발행된 파일 정보
 */
export interface PublishedFile {
	/** 파일 경로 (content/posts/hello.md) */
	path: string;
	/** 파일명 (hello.md) */
	name: string;
	/** GitHub blob SHA */
	sha: string;
	/** 파일 크기 (bytes) */
	size: number;
	/** 항목 타입 */
	type: "file" | "dir";
	/** GitHub 웹 URL */
	htmlUrl: string;
	/** 다운로드 URL */
	downloadUrl: string | null;
}

/**
 * 중복 파일 그룹 (동일 파일명이 여러 경로에 존재)
 */
export interface DuplicateGroup {
	/** 중복 파일명 */
	fileName: string;
	/** 해당 파일명을 가진 파일 목록 */
	files: PublishedFile[];
	/** 중복 파일 수 */
	count: number;
}

/**
 * 파일 삭제 결과
 */
export interface DeleteResult {
	/** 삭제 성공한 파일 목록 */
	succeeded: PublishedFile[];
	/** 삭제 실패한 파일 목록 및 오류 */
	failed: Array<{ file: PublishedFile; error: string }>;
	/** 전체 성공 여부 */
	allSucceeded: boolean;
	/** 삭제 소요 시간 (ms) */
	duration: number;
}

/**
 * 원격 파일 관리자 설정
 */
export interface RemoteFileManagerConfig {
	/** 콘텐츠 경로 (기본값: 'content') */
	contentPath: string;
	/** 지원 파일 확장자 */
	fileExtensions: string[];
	/** 일괄 삭제 최대 파일 수 (기본값: 50) */
	maxBatchDelete: number;
	/** 삭제 요청 간 딜레이 (ms, 기본값: 100) */
	deleteDelayMs: number;
}

/**
 * 기본 원격 파일 관리자 설정
 */
export const DEFAULT_REMOTE_FILE_MANAGER_CONFIG: RemoteFileManagerConfig = {
	contentPath: "content",
	fileExtensions: [".md"],
	maxBatchDelete: 50,
	deleteDelayMs: 100,
};

/**
 * 파일 목록 상태 (UI 상태 관리용)
 */
export interface FileListState {
	/** 전체 파일 목록 */
	files: PublishedFile[];
	/** 선택된 파일 경로 집합 */
	selectedFiles: Set<string>;
	/** 검색어 */
	searchQuery: string;
	/** 필터링된 파일 목록 */
	filteredFiles: PublishedFile[];
	/** 중복 파일 그룹 */
	duplicateGroups: DuplicateGroup[];
	/** 로딩 상태 */
	isLoading: boolean;
	/** 삭제 진행 중 여부 */
	isDeleting: boolean;
	/** 오류 메시지 */
	error: string | null;
}

/**
 * 파일 목록 초기 상태
 */
export const INITIAL_FILE_LIST_STATE: FileListState = {
	files: [],
	selectedFiles: new Set(),
	searchQuery: "",
	filteredFiles: [],
	duplicateGroups: [],
	isLoading: true,
	isDeleting: false,
	error: null,
};
