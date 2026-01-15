/**
 * GitHubService Extension Contract
 *
 * 기존 GitHubService에 추가할 메서드 인터페이스
 */

/**
 * Git Tree 항목
 */
export interface GitTreeItem {
  /** 파일/폴더 경로 */
  path: string;
  /** 항목 모드 (100644: file, 040000: directory) */
  mode: string;
  /** 항목 타입 (blob, tree) */
  type: 'blob' | 'tree';
  /** SHA */
  sha: string;
  /** 파일 크기 (blob인 경우) */
  size?: number;
}

/**
 * 릴리스 정보
 */
export interface ReleaseInfo {
  /** 태그명 (예: "v4.0.8") */
  tagName: string;
  /** 릴리스명 */
  name: string;
  /** 릴리스 일시 */
  publishedAt: string;
  /** 릴리스 본문 */
  body: string;
}

/**
 * GitHubService 확장 인터페이스
 */
export interface IGitHubServiceExtension {
  /**
   * 외부 리포지토리의 Git Tree 조회 (재귀)
   * @param owner 리포지토리 소유자
   * @param repo 리포지토리 이름
   * @param ref 브랜치/태그/커밋 SHA
   * @returns Tree 항목 목록
   */
  getExternalTree(
    owner: string,
    repo: string,
    ref: string
  ): Promise<GitTreeItem[]>;

  /**
   * 외부 리포지토리의 파일 내용 조회
   * @param owner 리포지토리 소유자
   * @param repo 리포지토리 이름
   * @param path 파일 경로
   * @param ref 브랜치/태그/커밋 SHA
   * @returns 파일 내용 (Base64 디코딩됨)
   */
  getExternalFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string | null>;

  /**
   * 외부 리포지토리의 최신 릴리스 조회
   * @param owner 리포지토리 소유자
   * @param repo 리포지토리 이름
   * @returns 릴리스 정보 또는 null
   */
  getLatestRelease(owner: string, repo: string): Promise<ReleaseInfo | null>;

  /**
   * 여러 파일을 한 번의 커밋으로 업데이트
   * @param files 업데이트할 파일 목록 { path, content }
   * @param message 커밋 메시지
   * @returns 성공 여부
   */
  commitMultipleFiles(
    files: Array<{ path: string; content: string }>,
    message: string
  ): Promise<{ success: boolean; commitSha?: string; error?: string }>;
}

/**
 * 사용 예시:
 *
 * ```typescript
 * // Quartz 템플릿의 파일 목록 조회
 * const tree = await githubService.getExternalTree(
 *   'jackyzha0',
 *   'quartz',
 *   'v4'
 * );
 *
 * // quartz/ 폴더 내 파일만 필터링
 * const quartzFiles = tree.filter(
 *   item => item.path.startsWith('quartz/') && item.type === 'blob'
 * );
 *
 * // 최신 릴리스 조회
 * const release = await githubService.getLatestRelease('jackyzha0', 'quartz');
 * console.log(release?.tagName); // "v4.0.8"
 *
 * // 여러 파일 한 번에 커밋
 * await githubService.commitMultipleFiles(
 *   [
 *     { path: 'quartz/file1.ts', content: '...' },
 *     { path: 'quartz/file2.ts', content: '...' },
 *   ],
 *   'chore: upgrade Quartz to v4.0.8'
 * );
 * ```
 */
