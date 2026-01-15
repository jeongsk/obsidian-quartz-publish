import { describe, it, expect } from 'vitest';
import {
	normalizePath,
	isPathInFolder,
	isPathInAnyFolder,
	stripRootFolder,
	getParentFolder,
} from '../../../src/utils/path-matcher';

describe('path-matcher', () => {
	describe('normalizePath', () => {
		it('trims whitespace', () => {
			expect(normalizePath('  path/to/file  ')).toBe('path/to/file');
		});

		it('removes leading slashes', () => {
			expect(normalizePath('/path/to/file')).toBe('path/to/file');
			expect(normalizePath('//path/to/file')).toBe('path/to/file');
		});

		it('removes trailing slashes', () => {
			expect(normalizePath('path/to/folder/')).toBe('path/to/folder');
			expect(normalizePath('path/to/folder//')).toBe('path/to/folder');
		});

		it('handles empty string', () => {
			expect(normalizePath('')).toBe('');
			expect(normalizePath('   ')).toBe('');
		});
	});

	describe('isPathInFolder', () => {
		it('returns true for files in folder', () => {
			expect(isPathInFolder('Blog/posts/hello.md', 'Blog')).toBe(true);
			expect(isPathInFolder('Blog/posts/hello.md', 'Blog/posts')).toBe(true);
		});

		it('returns false for files not in folder', () => {
			expect(isPathInFolder('Blog/posts/hello.md', 'Notes')).toBe(false);
			expect(isPathInFolder('Blog/hello.md', 'Blog/posts')).toBe(false);
		});

		it('does not match partial folder names', () => {
			expect(isPathInFolder('BlogExtra/hello.md', 'Blog')).toBe(false);
			expect(isPathInFolder('MyBlog/hello.md', 'Blog')).toBe(false);
		});

		it('returns true when folder is empty (vault root)', () => {
			expect(isPathInFolder('any/path/file.md', '')).toBe(true);
		});

		it('returns false when file path is empty', () => {
			expect(isPathInFolder('', 'Blog')).toBe(false);
		});

		it('handles paths with leading/trailing slashes', () => {
			expect(isPathInFolder('/Blog/hello.md', '/Blog/')).toBe(true);
			expect(isPathInFolder('Blog/hello.md/', 'Blog')).toBe(true);
		});

		it('matches nested folders correctly', () => {
			expect(isPathInFolder('A/B/C/D/file.md', 'A')).toBe(true);
			expect(isPathInFolder('A/B/C/D/file.md', 'A/B')).toBe(true);
			expect(isPathInFolder('A/B/C/D/file.md', 'A/B/C')).toBe(true);
			expect(isPathInFolder('A/B/C/D/file.md', 'A/B/C/D')).toBe(true);
			expect(isPathInFolder('A/B/C/D/file.md', 'A/B/C/D/E')).toBe(false);
		});
	});

	describe('isPathInAnyFolder', () => {
		it('returns true when file is in any of the folders', () => {
			expect(isPathInAnyFolder('Blog/hello.md', ['Blog', 'Notes'])).toBe(true);
			expect(isPathInAnyFolder('Notes/hello.md', ['Blog', 'Notes'])).toBe(true);
		});

		it('returns false when file is not in any folder', () => {
			expect(isPathInAnyFolder('Private/hello.md', ['Blog', 'Notes'])).toBe(false);
		});

		it('returns false for empty folder list', () => {
			expect(isPathInAnyFolder('Blog/hello.md', [])).toBe(false);
		});
	});

	describe('stripRootFolder', () => {
		it('strips root folder prefix', () => {
			expect(stripRootFolder('Blog/posts/hello.md', 'Blog')).toBe('posts/hello.md');
			expect(stripRootFolder('Blog/hello.md', 'Blog')).toBe('hello.md');
		});

		it('returns original path when not in root folder', () => {
			expect(stripRootFolder('Notes/hello.md', 'Blog')).toBe('Notes/hello.md');
		});

		it('returns original path when root folder is empty', () => {
			expect(stripRootFolder('Blog/hello.md', '')).toBe('Blog/hello.md');
		});

		it('handles deeply nested paths', () => {
			expect(stripRootFolder('A/B/C/D/file.md', 'A/B')).toBe('C/D/file.md');
		});
	});

	describe('getParentFolder', () => {
		it('extracts parent folder from path', () => {
			expect(getParentFolder('Blog/posts/hello.md')).toBe('Blog/posts');
			expect(getParentFolder('Blog/hello.md')).toBe('Blog');
		});

		it('returns empty string for root files', () => {
			expect(getParentFolder('hello.md')).toBe('');
		});

		it('handles paths with leading/trailing slashes', () => {
			expect(getParentFolder('/Blog/hello.md/')).toBe('Blog');
		});
	});
});
