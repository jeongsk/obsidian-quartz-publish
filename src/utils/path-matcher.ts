/**
 * Path Matcher Utilities
 *
 * 발행 필터링을 위한 경로 매칭 유틸리티 함수들
 */

/**
 * 경로 정규화 - 선행/후행 슬래시 제거
 */
export function normalizePath(path: string): string {
	return path.trim().replace(/^\/+|\/+$/g, '');
}

/**
 * 파일이 특정 폴더 내에 있는지 확인
 *
 * @param filePath - 확인할 파일 경로 (예: "Blog/posts/hello.md")
 * @param folderPath - 폴더 경로 (예: "Blog" 또는 "Blog/posts")
 * @returns 파일이 폴더 내에 있으면 true
 *
 * @example
 * isPathInFolder("Blog/posts/hello.md", "Blog") // true
 * isPathInFolder("Blog/posts/hello.md", "Blog/posts") // true
 * isPathInFolder("Blog/posts/hello.md", "Notes") // false
 * isPathInFolder("Blog/hello.md", "Blog/posts") // false
 * isPathInFolder("BlogExtra/hello.md", "Blog") // false (부분 매칭 방지)
 */
export function isPathInFolder(filePath: string, folderPath: string): boolean {
	const normalizedFile = normalizePath(filePath);
	const normalizedFolder = normalizePath(folderPath);

	if (!normalizedFolder) {
		return true;
	}

	if (!normalizedFile) {
		return false;
	}

	return normalizedFile.startsWith(normalizedFolder + '/');
}

/**
 * 파일이 폴더 목록 중 하나에 속하는지 확인
 *
 * @param filePath - 확인할 파일 경로
 * @param folders - 폴더 경로 목록
 * @returns 파일이 목록 중 하나의 폴더에 속하면 true
 *
 * @example
 * isPathInAnyFolder("Blog/hello.md", ["Blog", "Notes"]) // true
 * isPathInAnyFolder("Private/secret.md", ["Blog", "Notes"]) // false
 * isPathInAnyFolder("hello.md", []) // false (빈 목록)
 */
export function isPathInAnyFolder(
	filePath: string,
	folders: string[]
): boolean {
	if (folders.length === 0) {
		return false;
	}

	return folders.some((folder) => isPathInFolder(filePath, folder));
}

/**
 * 폴더 경로에서 루트 폴더 접두사 제거
 *
 * @param filePath - 원본 파일 경로 (예: "Blog/posts/hello.md")
 * @param rootFolder - 제거할 루트 폴더 (예: "Blog")
 * @returns 루트 폴더가 제거된 경로 (예: "posts/hello.md")
 *
 * @example
 * stripRootFolder("Blog/posts/hello.md", "Blog") // "posts/hello.md"
 * stripRootFolder("Blog/hello.md", "Blog") // "hello.md"
 * stripRootFolder("Notes/hello.md", "Blog") // "Notes/hello.md" (매칭 안됨)
 * stripRootFolder("hello.md", "") // "hello.md" (루트 폴더 없음)
 */
export function stripRootFolder(filePath: string, rootFolder: string): string {
	const normalizedFile = normalizePath(filePath);
	const normalizedRoot = normalizePath(rootFolder);

	if (!normalizedRoot) {
		return normalizedFile;
	}

	if (!isPathInFolder(normalizedFile, normalizedRoot)) {
		return normalizedFile;
	}

	return normalizedFile.slice(normalizedRoot.length + 1);
}

/**
 * 파일 경로에서 폴더 경로 추출
 *
 * @param filePath - 파일 경로 (예: "Blog/posts/hello.md")
 * @returns 폴더 경로 (예: "Blog/posts"), 루트 파일이면 빈 문자열
 *
 * @example
 * getParentFolder("Blog/posts/hello.md") // "Blog/posts"
 * getParentFolder("hello.md") // ""
 * getParentFolder("Blog/hello.md") // "Blog"
 */
export function getParentFolder(filePath: string): string {
	const normalized = normalizePath(filePath);
	const lastSlash = normalized.lastIndexOf('/');

	if (lastSlash === -1) {
		return '';
	}

	return normalized.slice(0, lastSlash);
}
