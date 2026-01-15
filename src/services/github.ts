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
} from '../types';
import { GITHUB_API_BASE_URL } from '../types';

/**
 * GitHub API 오류 클래스
 */
export class GitHubError extends Error {
	constructor(
		public statusCode: number,
		public responseBody: string,
		public errorType?: ConnectionError
	) {
		super(`GitHub API Error: ${statusCode} - ${responseBody}`);
		this.name = 'GitHubError';
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

	constructor(token: string, repoUrl: string, branch: string = 'main') {
		this.token = token;
		const parsed = this.parseRepoUrl(repoUrl);
		if (!parsed) {
			throw new Error('Invalid repository URL');
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
				repo: httpsMatch[2].replace(/\.git$/, ''),
			};
		}

		// git@github.com:owner/repo.git 형식
		const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/]+)/);
		if (sshMatch) {
			return {
				owner: sshMatch[1],
				repo: sshMatch[2].replace(/\.git$/, ''),
			};
		}

		return null;
	}

	/**
	 * GitHub API 요청 헬퍼
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28',
				...options.headers,
			},
		});

		// Rate limit 정보 추출 (헤더에서)
		const remaining = response.headers.get('X-RateLimit-Remaining');
		if (remaining && parseInt(remaining) === 0) {
			const resetTime = response.headers.get('X-RateLimit-Reset');
			throw new GitHubError(
				429,
				`Rate limit exceeded. Resets at ${new Date(parseInt(resetTime ?? '0') * 1000).toISOString()}`,
				'rate_limited'
			);
		}

		if (!response.ok) {
			const errorBody = await response.text();
			let errorType: ConnectionError | undefined;

			switch (response.status) {
				case 401:
					errorType = 'invalid_token';
					break;
				case 403:
					errorType = 'rate_limited';
					break;
				case 404:
					errorType = 'not_found';
					break;
				default:
					errorType = 'network_error';
			}

			throw new GitHubError(response.status, errorBody, errorType);
		}

		// DELETE 요청 등 빈 응답 처리
		const contentLength = response.headers.get('content-length');
		if (contentLength === '0' || response.status === 204) {
			return {} as T;
		}

		return response.json() as Promise<T>;
	}

	/**
	 * 토큰 유효성 검증 (GET /user)
	 */
	async validateToken(): Promise<GitHubUserResponse> {
		return this.request<GitHubUserResponse>('/user');
	}

	/**
	 * 리포지토리 정보 조회 (GET /repos/{owner}/{repo})
	 */
	async getRepositoryInfo(): Promise<GitHubRepoResponse> {
		return this.request<GitHubRepoResponse>(`/repos/${this.owner}/${this.repo}`);
	}

	/**
	 * Quartz 리포지토리 검증 (quartz.config.ts 존재 확인)
	 */
	async verifyQuartzRepository(): Promise<boolean> {
		try {
			await this.request<GitHubContentsResponse>(
				`/repos/${this.owner}/${this.repo}/contents/quartz.config.ts`
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
						type: 'not_quartz',
						message: 'This repository does not appear to be a Quartz site. quartz.config.ts not found.',
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
						type: error.errorType ?? 'network_error',
						message: error.message,
					},
				};
			}

			return {
				success: false,
				error: {
					type: 'network_error',
					message: error instanceof Error ? error.message : 'Unknown error',
				},
			};
		}
	}

	/**
	 * 파일 내용 조회 (GET /repos/{owner}/{repo}/contents/{path})
	 */
	async getFile(path: string): Promise<GitHubFileContent | null> {
		try {
			const response = await this.request<GitHubContentsResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
			);

			if (response.type !== 'file' || !response.content) {
				return null;
			}

			// Base64 디코딩
			const content = decodeURIComponent(
				atob(response.content.replace(/\n/g, ''))
					.split('')
					.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
					.join('')
			);

			return {
				path: response.path,
				sha: response.sha,
				content,
				size: response.size,
			};
		} catch (error) {
			if (error instanceof GitHubError && error.statusCode === 404) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * 파일 생성 또는 업데이트 (PUT /repos/{owner}/{repo}/contents/{path})
	 */
	async createOrUpdateFile(
		path: string,
		content: string,
		message: string,
		existingSha?: string
	): Promise<GitHubCommitResult> {
		try {
			// UTF-8 안전 Base64 인코딩
			const base64Content = btoa(
				encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) =>
					String.fromCharCode(parseInt(p1, 16))
				)
			);

			const body: Record<string, unknown> = {
				message,
				content: base64Content,
				branch: this.branch,
			};

			if (existingSha) {
				body.sha = existingSha;
			}

			const response = await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${path}`,
				{
					method: 'PUT',
					body: JSON.stringify(body),
				}
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
				error: error instanceof Error ? error.message : 'Unknown error',
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
		existingSha?: string
	): Promise<GitHubCommitResult> {
		try {
			// ArrayBuffer를 Base64로 변환
			const bytes = new Uint8Array(content);
			let binary = '';
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

			const response = await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${path}`,
				{
					method: 'PUT',
					body: JSON.stringify(body),
				}
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
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * 파일 삭제 (DELETE /repos/{owner}/{repo}/contents/{path})
	 */
	async deleteFile(
		path: string,
		sha: string,
		message: string
	): Promise<GitHubCommitResult> {
		try {
			await this.request<GitHubCommitResponse>(
				`/repos/${this.owner}/${this.repo}/contents/${path}`,
				{
					method: 'DELETE',
					body: JSON.stringify({
						message,
						sha,
						branch: this.branch,
					}),
				}
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
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	/**
	 * Rate Limit 정보 조회 (GET /rate_limit)
	 */
	async getRateLimit(): Promise<RateLimitInfo> {
		const response = await this.request<GitHubRateLimitResponse>('/rate_limit');

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
}
