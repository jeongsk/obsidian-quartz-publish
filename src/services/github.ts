/**
 * GitHub API Service
 *
 * GitHub REST API v3를 사용하여 Quartz 리포지토리와 상호작용합니다.
 */

import type {
	ConnectionTestResult,
	ConnectionError,
	GitHubFileContent,
	GitHubCommitResult,
	RateLimitInfo,
	PublishedFile,
} from "../types";
import { GITHUB_API_BASE_URL } from "../types";

/**
 * GitHub API 오류 클래스
 */
export class GitHubError extends Error {
	constructor(
		public statusCode: number,
		public responseBody: string,
		public errorType?: ConnectionError,
	) {
		super(`GitHub API Error: ${statusCode} - ${responseBody}`);
		this.name = "GitHubError";
	}
}

/**
 * GitHub API 응답 타입
 */
interface GitHubUserResponse {
	login: string;
	id: number;
	name?: string;
}

interface GitHubRepoResponse {
	id: number;
	name: string;
	full_name: string;
	default_branch: string;
	private: boolean;
}

interface GitHubContentsResponse {
	name: string;
	path: string;
	sha: string;
	size: number;
	content?: string;
	encoding?: string;
	type: string;
	html_url: string;
	download_url: string | null;
}

interface GitHubCommitResponse {
	content: {
		name: string;
		path: string;
		sha: string;
	};
	commit: {
		sha: string;
		message: string;
	};
}

interface GitHubRateLimitResponse {
	resources: {
		core: {
			limit: number;
			remaining: number;
			reset: number;
			used: number;
		};
	};
}

/**
 * GitHub API 서비스 클래스
 */
export class GitHubService {
	private token: string;
	private owner: string;
	private repo: string;
	private branch: string;

	constructor(token: string, repoUrl: string, branch: string = "main") {
		this.token = token;
		const parsed = this.parseRepoUrl(repoUrl);
		if (!parsed) {
			throw new Error("Invalid repository URL");
		}
		this.owner = parsed.owner;
		this.repo = parsed.repo;
		this.branch = branch;
	}

	/**
	 * GitHub 리포지토리 URL 파싱
	 */
	parseRepoUrl(url: string): { owner: string; repo: string } | null {
		// https://github.com/owner/repo 형식
		const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (httpsMatch) {
			return {
				owner: httpsMatch[1],
				repo: httpsMatch[2].replace(/\.git$/, ""),
			};
		}

		// git@github.com:owner/repo.git 형식
		const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/]+)/);
		if (sshMatch) {
			return {
				owner: sshMatch[1],
				repo: sshMatch[2].replace(/\.git$/, ""),
			};
		}

		return null;
	}

	/**
	 * 리포지토리 URL이 유효한지 검증합니다.
	 *
	 * @param url 리포지토리 URL
	 * @returns 유효 여부
	 */
	static validateRepoUrl(url: string): boolean {
		if (!url || url.trim() === '') return false;

		// HTTPS 형식
		const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (httpsMatch) return true;

		// SSH 형식
		const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/]+)/);
		if (sshMatch) return true;

		return false;
	}

	/**
	 * 콘텐츠 경로가 유효한지 검증합니다.
	 *
	 * @param path 콘텐츠 경로
	 * @returns 유효 여부
	 */
	static validateContentPath(path: string): boolean {
		if (!path || path.trim() === '') return false;
		// 선행/후행 슬래시 및 공백 제거
		const normalized = path.trim().replace(/^\/+|\/+$/g, '');
		return normalized.length > 0;
	}

	/**
	 * 경로를 NFC 정규화하고 URL 인코딩합니다.
	 *
	 * macOS는 NFD 정규화를 사용하지만 GitHub과 대부분의 웹 시스템은 NFC를 사용합니다.
	 * 또한 GitHub API는 URL 인코딩된 경로를 요구합니다.
	 *
	 * @param path 파일 경로 (예: "content/맥OS/파일.md")
	 * @returns URL 인코딩된 경로 (예: "content/%EB%A7%A5OS/%ED%8C%8C%EC%9D%BC.md")
	 */
	private encodePath(path: string): string {
		return path
			.normalize("NFC")
			.split("/")
			.map(encodeURIComponent)
			.join("/");
	}

	/**
	 * GitHub API 요청 헬퍼
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: "application/vnd.github.v3+json",
				"Content-Type": "application/json",
				"X-GitHub-Api-Version": "2022-11-28",
				...options.headers,
			},
		});

		// Rate limit 정보 추출 (헤더에서)
		const remaining = response.headers.get("X-RateLimit-Remaining");
		if (remaining && parseInt(remaining) === 0) {
			const resetTime = response.headers.get("X-RateLimit-Reset");
			throw new GitHubError(
				429,
				`Rate limit exceeded. Resets at ${new Date(parseInt(resetTime ?? "0") * 1000).toISOString()}`,
				"rate_limited",
			);
		}

		if (!response.ok) {
			const errorBody = await response.text();
			let errorType: ConnectionError | undefined;

			switch (response.status) {
				case 401:
					errorType = "invalid_token";
					break;
				case 403:
					errorType = "rate_limited";
					break;
				case 404:
					errorType = "not_found";
					break;
				default:
					errorType = "network_error";
			}

			throw new GitHubError(response.status, errorBody, errorType);
		}

		// DELETE 요청 등 빈 응답 처리
		const contentLength = response.headers.get("content-length");
		if (contentLength === "0" || response.status === 204) {
			return {} as T;
		}

		return response.json() as Promise<T>;
	}

	/**
	 * 토큰 유효성 검증 (GET /user)
	 */
	async validateToken(): Promise<GitHubUserResponse> {
		return this.request<GitHubUserResponse>("/user");
	}

	/**
	 * 리포지토리 정보 조회 (GET /repos/{owner}/{repo})
	 */
	async getRepositoryInfo(): Promise<GitHubRepoResponse> {
		return this.request<GitHubRepoResponse>(
			`/repos/${this.owner}/${this.repo}`,
		);
	}

	/**
	 * Quartz 리포지토리 검증 (quartz.config.ts 존재 확인)
	 */
	async verifyQuartzRepository(): Promise<boolean> {
		try {
			await this.request<GitHubContentsResponse>(
				`/repos/${this.owner}/${this.repo}/contents/quartz.config.ts`,
			);
			return true;
		} catch (error) {
			if (error instanceof GitHubError && error.statusCode === 404) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * 연결 테스트 (토큰 + 리포지토리 + Quartz 검증)
	 */
	async testConnection(): Promise<ConnectionTestResult> {
		try {
			// 1. 토큰 유효성 검증
			await this.validateToken();

			// 2. 리포지토리 접근 확인
			const repo = await this.getRepositoryInfo();

			// 3. Quartz 설정 파일 확인
			const isQuartz = await this.verifyQuartzRepository();

			if (!isQuartz) {
				return {
					success: false,
					error: {
						type: "not_quartz",
						message:
							"This repository does not appear to be a Quartz site. quartz.config.ts not found.",
					},
				};
			}

			return {
				success: true,
				repository: {
					name: repo.name,
					owner: this.owner,
					defaultBranch: repo.default_branch,
					isQuartz: true,
				},
			};
		} catch (error) {
			if (error instanceof GitHubError) {
				return {
					success: false,
					error: {
						type: error.errorType ?? "network_error",
						message: error.message,
					},
				};
			}

			return {
				success: false,
				error: {
					type: "network_error",
					message:
						error instanceof Error
							? error.message
							: "Unknown error",
				},
			};
		}
	}

	/**
	 * 파일 내용 조회 (GET /repos/{owner}/{repo}/contents/{path})
	 *
	 * 경로를 시도한 후 실패하면 파일명으로 검색하여 대체 경로를 시도합니다.
	 */
	async getFile(path: string): Promise<GitHubFileContent | null> {
		// 1. Try with NFC normalization (Standard for Web/Git)
		const nfcPath = this.encodePath(path);

		console.log("[GitHubService.getFile] Input path:", path);
		console.log("[GitHubService.getFile] NFC encoded:", nfcPath);

		try {
			const response = await this.request<GitHubContentsResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${nfcPath}?ref=${this.branch}`,
			);
			return this.processFileResponse(response);
		} catch (error) {
			// If 404, try NFD normalization (common on macOS)
			if (error instanceof GitHubError && error.statusCode === 404) {
				const nfdPath = path
					.normalize("NFD")
					.split("/")
					.map(encodeURIComponent)
					.join("/");

				console.log("[GitHubService.getFile] NFD encoded:", nfdPath);

				// Prevent infinite loop if NFC === NFD
				if (nfcPath !== nfdPath) {
					try {
						const response =
							await this.request<GitHubContentsResponse>(
								`/repos/${this.owner}/${this.repo}/contents/${nfdPath}?ref=${this.branch}`,
							);
						return this.processFileResponse(response);
					} catch (retryError) {
						if (
							retryError instanceof GitHubError &&
							retryError.statusCode === 404
						) {
							console.log("[GitHubService.getFile] Both NFC and NFD failed, trying filename search");
							// 3. 파일명으로 검색 시도 (Git Tree API)
							const fileName = path.split("/").pop();
							if (fileName) {
								const actualPath = await this.findFileByName(fileName);
								if (actualPath) {
									console.log("[GitHubService.getFile] Found file at:", actualPath);
									const encodedActualPath = this.encodePath(actualPath);
									const response =
										await this.request<GitHubContentsResponse>(
											`/repos/${this.owner}/${this.repo}/contents/${encodedActualPath}?ref=${this.branch}`,
										);
									return this.processFileResponse(response);
								}
							}
							console.log("[GitHubService.getFile] File not found anywhere, returning null");
							return null;
						}
						throw retryError;
					}
				} else {
					console.log("[GitHubService.getFile] NFC === NFD, trying filename search");
					// NFC와 NFD가 같은 경우 파일명으로 검색
					const fileName = path.split("/").pop();
					if (fileName) {
						const actualPath = await this.findFileByName(fileName);
						if (actualPath) {
							console.log("[GitHubService.getFile] Found file at:", actualPath);
							const encodedActualPath = this.encodePath(actualPath);
							const response =
								await this.request<GitHubContentsResponse>(
									`/repos/${this.owner}/${this.repo}/contents/${encodedActualPath}?ref=${this.branch}`,
								);
							return this.processFileResponse(response);
						}
					}
					return null;
				}
			}
			throw error;
		}
	}

	private processFileResponse(
		response: GitHubContentsResponse,
	): GitHubFileContent | null {
		if (response.type !== "file" || !response.content) {
			return null;
		}

		// Base64 디코딩
		const content = decodeURIComponent(
			atob(response.content.replace(/\n/g, ""))
				.split("")
				.map(
					(c) =>
						"%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
				)
				.join(""),
		);

		return {
			path: response.path,
			sha: response.sha,
			content,
			size: response.size,
		};
	}

	/**
	 * 파일 생성 또는 업데이트 (PUT /repos/{owner}/{repo}/contents/{path})
	 */
	async createOrUpdateFile(
		path: string,
		content: string,
		message: string,
		existingSha?: string,
	): Promise<GitHubCommitResult> {
		try {
			// UTF-8 안전 Base64 인코딩
			const base64Content = btoa(
				encodeURIComponent(content).replace(
					/%([0-9A-F]{2})/g,
					(_, p1) => String.fromCharCode(parseInt(p1, 16)),
				),
			);

			const body: Record<string, unknown> = {
				message,
				content: base64Content,
				branch: this.branch,
			};

			if (existingSha) {
				body.sha = existingSha;
			}

			// 경로를 NFC 정규화하고 URL 인코딩
			const encodedPath = this.encodePath(path);

			const response = await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${encodedPath}`,
				{
					method: "PUT",
					body: JSON.stringify(body),
				},
			);

			return {
				success: true,
				sha: response.content.sha,
				commitSha: response.commit.sha,
			};
		} catch (error) {
			if (error instanceof GitHubError) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * 바이너리 파일 생성 또는 업데이트 (이미지 등)
	 */
	async createOrUpdateBinaryFile(
		path: string,
		content: ArrayBuffer,
		message: string,
		existingSha?: string,
	): Promise<GitHubCommitResult> {
		try {
			// ArrayBuffer를 Base64로 변환
			const bytes = new Uint8Array(content);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const base64Content = btoa(binary);

			const body: Record<string, unknown> = {
				message,
				content: base64Content,
				branch: this.branch,
			};

			if (existingSha) {
				body.sha = existingSha;
			}

			// 경로를 NFC 정규화하고 URL 인코딩
			const encodedPath = this.encodePath(path);

			const response = await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${encodedPath}`,
				{
					method: "PUT",
					body: JSON.stringify(body),
				},
			);

			return {
				success: true,
				sha: response.content.sha,
				commitSha: response.commit.sha,
			};
		} catch (error) {
			if (error instanceof GitHubError) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * 파일 삭제 (DELETE /repos/{owner}/{repo}/contents/{path})
	 */
	async deleteFile(
		path: string,
		sha: string,
		message: string,
	): Promise<GitHubCommitResult> {
		try {
			// 경로를 NFC 정규화하고 URL 인코딩
			const encodedPath = this.encodePath(path);

			await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${encodedPath}`,
				{
					method: "DELETE",
					body: JSON.stringify({
						message,
						sha,
						branch: this.branch,
					}),
				},
			);

			return {
				success: true,
			};
		} catch (error) {
			if (error instanceof GitHubError) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	/**
	 * Rate Limit 정보 조회 (GET /rate_limit)
	 */
	async getRateLimit(): Promise<RateLimitInfo> {
		const response =
			await this.request<GitHubRateLimitResponse>("/rate_limit");

		return {
			limit: response.resources.core.limit,
			remaining: response.resources.core.remaining,
			resetAt: new Date(response.resources.core.reset * 1000),
		};
	}

	/**
	 * 현재 설정된 owner 반환
	 */
	getOwner(): string {
		return this.owner;
	}

	/**
	 * 현재 설정된 repo 반환
	 */
	getRepo(): string {
		return this.repo;
	}

	/**
	 * 현재 설정된 branch 반환
	 */
	getBranch(): string {
		return this.branch;
	}

	// ============================================================================
	// Directory Contents Methods (for Remote File Management)
	// ============================================================================

	/**
	 * 디렉토리 내용 조회 (GET /repos/{owner}/{repo}/contents/{path})
	 *
	 * 지정된 경로의 파일 목록을 조회합니다. recursive 옵션 사용 시 하위 디렉토리도 재귀적으로 조회합니다.
	 *
	 * @param path 조회할 디렉토리 경로 (예: 'content')
	 * @param recursive 하위 디렉토리 재귀 조회 여부 (기본값: true)
	 * @returns 파일 목록
	 * @throws GitHubError - API 오류 시 (401, 403, 404, 500+)
	 */
	async getDirectoryContents(
		path: string,
		recursive: boolean = true,
	): Promise<PublishedFile[]> {
		// 경로를 NFC 정규화하고 URL 인코딩
		const encodedPath = this.encodePath(path);

		const items = await this.request<GitHubContentsResponse[]>(
			`/repos/${this.owner}/${this.repo}/contents/${encodedPath}?ref=${this.branch}`,
		);

		const files: PublishedFile[] = [];

		for (const item of items) {
			if (item.type === "file") {
				files.push({
					path: item.path,
					name: item.name,
					sha: item.sha,
					size: item.size,
					type: "file",
					htmlUrl: item.html_url,
					downloadUrl: item.download_url,
				});
			} else if (item.type === "dir" && recursive) {
				// 재귀적으로 하위 디렉토리 조회
				const subFiles = await this.getDirectoryContents(
					item.path,
					true,
				);
				files.push(...subFiles);
			}
		}

		return files;
	}

	// ============================================================================
	// External Repository Methods (for Quartz upgrade)
	// ============================================================================

	/**
	 * 외부 리포지토리의 최신 릴리스 조회
	 *
	 * @param owner 리포지토리 소유자
	 * @param repo 리포지토리 이름
	 * @returns 릴리스 정보 또는 null
	 */
	async getLatestRelease(
		owner: string,
		repo: string,
	): Promise<{
		tagName: string;
		name: string;
		publishedAt: string;
		body: string;
	} | null> {
		try {
			const response = await this.request<{
				tag_name: string;
				name: string;
				published_at: string;
				body: string;
			}>(`/repos/${owner}/${repo}/releases/latest`);

			return {
				tagName: response.tag_name,
				name: response.name,
				publishedAt: response.published_at,
				body: response.body,
			};
		} catch (error) {
			if (error instanceof GitHubError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * 외부 리포지토리의 Git Tree 조회 (재귀)
	 *
	 * @param owner 리포지토리 소유자
	 * @param repo 리포지토리 이름
	 * @param ref 브랜치/태그/커밋 SHA
	 * @returns Tree 항목 목록
	 */
	async getExternalTree(
		owner: string,
		repo: string,
		ref: string,
	): Promise<
		Array<{
			path: string;
			mode: string;
			type: "blob" | "tree";
			sha: string;
			size?: number;
		}>
	> {
		const response = await this.request<{
			tree: Array<{
				path: string;
				mode: string;
				type: "blob" | "tree";
				sha: string;
				size?: number;
			}>;
		}>(`/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);

		return response.tree;
	}

	/**
	 * 현재 리포지토리의 Git Tree 조회 (재귀)
	 *
	 * @returns Tree 항목 목록
	 */
	async getTree(): Promise<
		Array<{
			path: string;
			mode: string;
			type: "blob" | "tree";
			sha: string;
			size?: number;
		}>
	> {
		const response = await this.request<{
			tree: Array<{
				path: string;
				mode: string;
				type: "blob" | "tree";
				sha: string;
				size?: number;
			}>;
		}>(`/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`);

		return response.tree;
	}

	/**
	 * 파일명으로 파일 검색 (Git Tree 사용)
	 *
	 * 파일이 존재하지 않을 때 대체 경로를 찾기 위해 사용합니다.
	 *
	 * @param fileName 파일명 (확장자 포함)
	 * @returns 파일의 실제 경로 또는 null
	 */
	async findFileByName(fileName: string): Promise<string | null> {
		try {
			const tree = await this.getTree();

			// 검색할 파일명을 NFC 정규화
			const normalizedFileName = fileName.normalize("NFC");

			console.log(`[GitHubService.findFileByName] Searching for: ${normalizedFileName}`);

			// 파일명으로 정규화된 경로 찾기 (NFC 정규화 비교)
			for (const item of tree) {
				if (item.type === "blob") {
					const itemFileName = item.path.split("/").pop();
					if (itemFileName) {
						// NFC 정규화하여 비교
						const normalizedItemFileName = itemFileName.normalize("NFC");
						if (normalizedItemFileName === normalizedFileName) {
							console.log(`[GitHubService.findFileByName] Found file: ${item.path}`);
							return item.path;
						}
					}
				}
			}

			console.log(`[GitHubService.findFileByName] File not found: ${normalizedFileName}`);
			return null;
		} catch (error) {
			console.error("[GitHubService.findFileByName] Error:", error);
			return null;
		}
	}

	/**
	 * 외부 리포지토리의 파일 내용 조회
	 *
	 * @param owner 리포지토리 소유자
	 * @param repo 리포지토리 이름
	 * @param path 파일 경로
	 * @param ref 브랜치/태그/커밋 SHA
	 * @returns 파일 내용 (UTF-8 디코딩됨) 또는 null
	 */
	async getExternalFileContent(
		owner: string,
		repo: string,
		path: string,
		ref: string,
	): Promise<string | null> {
		try {
			// 경로를 NFC 정규화하고 URL 인코딩
			const encodedPath = this.encodePath(path);

			const response = await this.request<GitHubContentsResponse>(
				`/repos/${owner}/${repo}/contents/${encodedPath}?ref=${ref}`,
			);

			if (response.type !== "file" || !response.content) {
				return null;
			}

			// Base64 디코딩
			const content = decodeURIComponent(
				atob(response.content.replace(/\n/g, ""))
					.split("")
					.map(
						(c) =>
							"%" +
							("00" + c.charCodeAt(0).toString(16)).slice(-2),
					)
					.join(""),
			);

			return content;
		} catch (error) {
			if (error instanceof GitHubError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * 외부 리포지토리의 바이너리 파일 내용 조회 (Base64)
	 *
	 * @param owner 리포지토리 소유자
	 * @param repo 리포지토리 이름
	 * @param path 파일 경로
	 * @param ref 브랜치/태그/커밋 SHA
	 * @returns Base64 인코딩된 파일 내용 또는 null
	 */
	async getExternalFileContentBase64(
		owner: string,
		repo: string,
		path: string,
		ref: string,
	): Promise<string | null> {
		try {
			// 경로를 NFC 정규화하고 URL 인코딩
			const encodedPath = this.encodePath(path);

			const response = await this.request<GitHubContentsResponse>(
				`/repos/${owner}/${repo}/contents/${encodedPath}?ref=${ref}`,
			);

			if (response.type !== "file" || !response.content) {
				return null;
			}

			// Base64 문자열 그대로 반환 (줄바꿈 제거)
			return response.content.replace(/\n/g, "");
		} catch (error) {
			if (error instanceof GitHubError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * 여러 파일을 한 번의 커밋으로 업데이트
	 *
	 * Git Data API를 사용하여 여러 파일을 atomic하게 커밋합니다.
	 *
	 * @param files 업데이트할 파일 목록 { path, content }
	 * @param message 커밋 메시지
	 * @returns 커밋 결과
	 */
	async commitMultipleFiles(
		files: Array<{ path: string; content: string }>,
		message: string,
	): Promise<{ success: boolean; commitSha?: string; error?: string }> {
		try {
			// 1. 현재 브랜치의 HEAD 참조 가져오기
			const refResponse = await this.request<{ object: { sha: string } }>(
				`/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`,
			);
			const headSha = refResponse.object.sha;

			// 2. HEAD 커밋의 tree SHA 가져오기
			const commitResponse = await this.request<{
				tree: { sha: string };
			}>(`/repos/${this.owner}/${this.repo}/git/commits/${headSha}`);
			const baseTreeSha = commitResponse.tree.sha;

			// 3. 각 파일에 대해 blob 생성
			const treeItems: Array<{
				path: string;
				mode: string;
				type: string;
				sha: string;
			}> = [];

			for (const file of files) {
				const blobResponse = await this.request<{ sha: string }>(
					`/repos/${this.owner}/${this.repo}/git/blobs`,
					{
						method: "POST",
						body: JSON.stringify({
							content: file.content,
							encoding: "utf-8",
						}),
					},
				);

				treeItems.push({
					path: file.path,
					mode: "100644",
					type: "blob",
					sha: blobResponse.sha,
				});
			}

			// 4. 새 tree 생성
			const newTreeResponse = await this.request<{ sha: string }>(
				`/repos/${this.owner}/${this.repo}/git/trees`,
				{
					method: "POST",
					body: JSON.stringify({
						base_tree: baseTreeSha,
						tree: treeItems,
					}),
				},
			);

			// 5. 새 commit 생성
			const newCommitResponse = await this.request<{ sha: string }>(
				`/repos/${this.owner}/${this.repo}/git/commits`,
				{
					method: "POST",
					body: JSON.stringify({
						message,
						tree: newTreeResponse.sha,
						parents: [headSha],
					}),
				},
			);

			// 6. 브랜치 참조 업데이트
			await this.request(
				`/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`,
				{
					method: "PATCH",
					body: JSON.stringify({
						sha: newCommitResponse.sha,
					}),
				},
			);

			return {
				success: true,
				commitSha: newCommitResponse.sha,
			};
		} catch (error) {
			if (error instanceof GitHubError) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}
}
