import type {
  RepositoryCreationRequest,
  RepositoryCreationResult,
  RepositoryCreationError,
  RepositoryCreationErrorType,
  CreatedRepository,
} from "../types";
import { GITHUB_API_BASE_URL, QUARTZ_TEMPLATE, DEFAULT_REPO_NAME } from "../types";

interface GitHubUserResponse {
  login: string;
  id: number;
  name?: string;
}

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
  };
}

const REPO_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
const MAX_REPO_NAME_LENGTH = 100;

const ERROR_MESSAGES: Record<RepositoryCreationErrorType, string> = {
  invalid_token: "GitHub 토큰이 유효하지 않습니다. 설정에서 토큰을 확인해주세요.",
  insufficient_permissions: '리포지토리 생성 권한이 없습니다. PAT에 "repo" 권한이 필요합니다.',
  repo_exists: "이미 존재하는 리포지토리 이름입니다. 다른 이름을 입력해주세요.",
  invalid_name: "유효하지 않은 리포지토리 이름입니다.",
  template_not_found: "Quartz 템플릿을 찾을 수 없습니다.",
  rate_limited: "GitHub API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
  network_error: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.",
  unknown: "알 수 없는 오류가 발생했습니다.",
};

export class RepositoryCreatorService {
  private token: string;
  private userLogin: string | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      },
    });

    const remaining = response.headers.get("X-RateLimit-Remaining");
    if (remaining && parseInt(remaining) === 0) {
      const resetTime = response.headers.get("X-RateLimit-Reset");
      const resetDate = new Date(parseInt(resetTime ?? "0") * 1000);
      throw this.createError("rate_limited", `Rate limit resets at ${resetDate.toISOString()}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.mapHttpError(response.status, errorBody);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private mapHttpError(status: number, body: string): RepositoryCreationError {
    let type: RepositoryCreationErrorType;

    switch (status) {
      case 401:
        type = "invalid_token";
        break;
      case 403:
        type = body.includes("rate limit") ? "rate_limited" : "insufficient_permissions";
        break;
      case 404:
        type = "template_not_found";
        break;
      case 422:
        type = body.includes("already exists") ? "repo_exists" : "invalid_name";
        break;
      default:
        type = "network_error";
    }

    return this.createError(type, body);
  }

  private createError(
    type: RepositoryCreationErrorType,
    details?: string
  ): RepositoryCreationError {
    return {
      type,
      message: ERROR_MESSAGES[type],
      details,
    };
  }

  async getCurrentUser(): Promise<{ login: string; id: number }> {
    const user = await this.request<GitHubUserResponse>("/user");
    this.userLogin = user.login;
    return { login: user.login, id: user.id };
  }

  validateRepositoryName(name: string): { valid: boolean; error?: string } {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { valid: true };
    }

    if (trimmedName.length > MAX_REPO_NAME_LENGTH) {
      return {
        valid: false,
        error: `리포지토리 이름은 ${MAX_REPO_NAME_LENGTH}자를 초과할 수 없습니다.`,
      };
    }

    if (!REPO_NAME_REGEX.test(trimmedName)) {
      return {
        valid: false,
        error:
          "영문, 숫자, 점(.), 하이픈(-), 언더스코어(_)만 사용 가능합니다. 영문 또는 숫자로 시작하고 끝나야 합니다.",
      };
    }

    return { valid: true };
  }

  async checkRepositoryExists(owner: string, name: string): Promise<boolean> {
    try {
      await this.request<GitHubRepoResponse>(`/repos/${owner}/${name}`);
      return true;
    } catch (error) {
      const repoError = error as RepositoryCreationError;
      if (repoError.type === "template_not_found") {
        return false;
      }
      throw error;
    }
  }

  async createFromTemplate(request: RepositoryCreationRequest): Promise<RepositoryCreationResult> {
    try {
      const repoName = request.name.trim() || DEFAULT_REPO_NAME;

      const validation = this.validateRepositoryName(repoName);
      if (!validation.valid) {
        return {
          success: false,
          error: this.createError("invalid_name", validation.error),
        };
      }

      if (!this.userLogin) {
        await this.getCurrentUser();
      }

      const owner = this.userLogin!;
      const exists = await this.checkRepositoryExists(owner, repoName);
      if (exists) {
        return {
          success: false,
          error: this.createError("repo_exists"),
        };
      }

      const response = await this.request<GitHubRepoResponse>(
        `/repos/${QUARTZ_TEMPLATE.owner}/${QUARTZ_TEMPLATE.repo}/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            owner,
            name: repoName,
            description: request.description ?? "My Quartz digital garden",
            private: request.visibility === "private",
            include_all_branches: false,
          }),
        }
      );

      const repository: CreatedRepository = {
        owner: response.owner.login,
        name: response.name,
        fullName: response.full_name,
        htmlUrl: response.html_url,
        defaultBranch: response.default_branch,
        isPrivate: response.private,
      };

      return { success: true, repository };
    } catch (error) {
      if ((error as RepositoryCreationError).type) {
        return { success: false, error: error as RepositoryCreationError };
      }

      return {
        success: false,
        error: this.createError(
          "unknown",
          error instanceof Error ? error.message : "Unknown error"
        ),
      };
    }
  }

  getUserLogin(): string | null {
    return this.userLogin;
  }
}
