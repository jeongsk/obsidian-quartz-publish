import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TFile, MetadataCache, CachedMetadata } from 'obsidian';
import { PublishFilterService } from '../../../src/services/publish-filter';
import type { PublishFilterSettings } from '../../../src/types';
import { DEFAULT_PUBLISH_FILTER_SETTINGS } from '../../../src/types';

function createMockFile(path: string): TFile {
	const name = path.split('/').pop() ?? '';
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		extension: 'md',
		stat: { mtime: Date.now(), ctime: Date.now(), size: 100 },
		parent: null,
		vault: {} as TFile['vault'],
	} as TFile;
}

function createMockMetadataCache(
	cacheMap: Record<string, CachedMetadata | undefined>
): MetadataCache {
	return {
		getFileCache: vi.fn((file: TFile) => cacheMap[file.path]),
	} as unknown as MetadataCache;
}

describe('PublishFilterService', () => {
	let settings: PublishFilterSettings;
	let metadataCache: MetadataCache;
	let service: PublishFilterService;

	beforeEach(() => {
		settings = { ...DEFAULT_PUBLISH_FILTER_SETTINGS };
		metadataCache = createMockMetadataCache({});
		service = new PublishFilterService({
			metadataCache,
			getSettings: () => settings,
		});
	});

	describe('shouldPublish', () => {
		it('returns true when all filter settings are empty (default behavior)', () => {
			const file = createMockFile('Notes/hello.md');
			expect(service.shouldPublish(file)).toBe(true);
		});

		it('returns true for home page even if excluded by folder', () => {
			settings.homePagePath = 'Private/Welcome.md';
			settings.excludeFolders = ['Private'];

			const file = createMockFile('Private/Welcome.md');
			expect(service.shouldPublish(file)).toBe(true);
		});
	});

	describe('isInIncludedFolder', () => {
		it('returns true for files in included folders', () => {
			settings.includeFolders = ['Blog', 'Notes/Public'];

			const blogFile = createMockFile('Blog/posts/hello.md');
			const notesFile = createMockFile('Notes/Public/intro.md');

			expect(service.isInIncludedFolder(blogFile)).toBe(true);
			expect(service.isInIncludedFolder(notesFile)).toBe(true);
		});

		it('returns true for all files when includeFolders is empty', () => {
			settings.includeFolders = [];

			const file = createMockFile('Any/Random/Path/hello.md');
			expect(service.isInIncludedFolder(file)).toBe(true);
		});

		it('returns false for files outside included folders', () => {
			settings.includeFolders = ['Blog'];

			const file = createMockFile('Notes/hello.md');
			expect(service.isInIncludedFolder(file)).toBe(false);
		});

		it('does not match partial folder names', () => {
			settings.includeFolders = ['Blog'];

			const file = createMockFile('BlogArchive/hello.md');
			expect(service.isInIncludedFolder(file)).toBe(false);
		});
	});

	describe('isInExcludedFolder', () => {
		it('returns true for files in excluded folders', () => {
			settings.excludeFolders = ['Private', 'Templates'];

			const privateFile = createMockFile('Private/secret.md');
			const templateFile = createMockFile('Templates/note.md');

			expect(service.isInExcludedFolder(privateFile)).toBe(true);
			expect(service.isInExcludedFolder(templateFile)).toBe(true);
		});

		it('returns false for files not in excluded folders', () => {
			settings.excludeFolders = ['Private'];

			const file = createMockFile('Blog/hello.md');
			expect(service.isInExcludedFolder(file)).toBe(false);
		});

		it('returns false when excludeFolders is empty', () => {
			settings.excludeFolders = [];

			const file = createMockFile('Any/Path/hello.md');
			expect(service.isInExcludedFolder(file)).toBe(false);
		});
	});

	describe('exclude rule priority', () => {
		it('exclude rule takes priority over include rule', () => {
			settings.includeFolders = ['Blog'];
			settings.excludeFolders = ['Blog/Drafts'];

			const includedFile = createMockFile('Blog/posts/hello.md');
			const excludedFile = createMockFile('Blog/Drafts/wip.md');

			expect(service.shouldPublish(includedFile)).toBe(true);
			expect(service.shouldPublish(excludedFile)).toBe(false);
		});
	});

	describe('hasExcludedTag', () => {
		it('returns true when note has excluded tag', () => {
			settings.excludeTags = ['private', 'wip'];

			metadataCache = createMockMetadataCache({
				'Notes/secret.md': {
					frontmatter: { tags: ['private'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/secret.md');
			expect(service.hasExcludedTag(file)).toBe(true);
		});

		it('handles multiple tags correctly', () => {
			settings.excludeTags = ['private'];

			metadataCache = createMockMetadataCache({
				'Notes/note.md': {
					frontmatter: { tags: ['public', 'blog', 'private'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/note.md');
			expect(service.hasExcludedTag(file)).toBe(true);
		});

		it('tag matching is case-insensitive', () => {
			settings.excludeTags = ['PRIVATE'];

			metadataCache = createMockMetadataCache({
				'Notes/note.md': {
					frontmatter: { tags: ['private'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/note.md');
			expect(service.hasExcludedTag(file)).toBe(true);
		});

		it('returns false when note has no excluded tags', () => {
			settings.excludeTags = ['private'];

			metadataCache = createMockMetadataCache({
				'Notes/public.md': {
					frontmatter: { tags: ['public', 'blog'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/public.md');
			expect(service.hasExcludedTag(file)).toBe(false);
		});

		it('handles tags with # prefix correctly', () => {
			settings.excludeTags = ['#private'];

			metadataCache = createMockMetadataCache({
				'Notes/note.md': {
					frontmatter: { tags: ['private'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/note.md');
			expect(service.hasExcludedTag(file)).toBe(true);
		});
	});

	describe('isInRootFolder', () => {
		it('returns true for files inside root folder', () => {
			settings.rootFolder = 'Blog';

			const file = createMockFile('Blog/posts/hello.md');
			expect(service.isInRootFolder(file)).toBe(true);
		});

		it('returns false for files outside root folder', () => {
			settings.rootFolder = 'Blog';

			const file = createMockFile('Notes/hello.md');
			expect(service.isInRootFolder(file)).toBe(false);
		});

		it('returns true for all files when no root folder set', () => {
			settings.rootFolder = '';

			const file = createMockFile('Any/Path/hello.md');
			expect(service.isInRootFolder(file)).toBe(true);
		});
	});

	describe('getPublishPath', () => {
		it('strips root folder prefix correctly', () => {
			settings.rootFolder = 'Blog';

			const file = createMockFile('Blog/posts/hello.md');
			expect(service.getPublishPath(file)).toBe('posts/hello.md');
		});

		it('returns original path when no root folder set', () => {
			settings.rootFolder = '';

			const file = createMockFile('Notes/hello.md');
			expect(service.getPublishPath(file)).toBe('Notes/hello.md');
		});

		it('returns index.md for home page', () => {
			settings.homePagePath = 'Blog/Welcome.md';

			const file = createMockFile('Blog/Welcome.md');
			expect(service.getPublishPath(file)).toBe('index.md');
		});
	});

	describe('isHomePage', () => {
		it('returns true for designated home page note', () => {
			settings.homePagePath = 'Welcome.md';

			const file = createMockFile('Welcome.md');
			expect(service.isHomePage(file)).toBe(true);
		});

		it('returns false when home page is not set', () => {
			settings.homePagePath = '';

			const file = createMockFile('Welcome.md');
			expect(service.isHomePage(file)).toBe(false);
		});

		it('returns false for non-home page files', () => {
			settings.homePagePath = 'Welcome.md';

			const file = createMockFile('Other.md');
			expect(service.isHomePage(file)).toBe(false);
		});
	});

	describe('home page bypasses exclude filters', () => {
		it('home page note bypasses exclude folder filter', () => {
			settings.homePagePath = 'Private/Welcome.md';
			settings.excludeFolders = ['Private'];

			const file = createMockFile('Private/Welcome.md');
			expect(service.shouldPublish(file)).toBe(true);
		});

		it('home page note bypasses exclude tag filter', () => {
			settings.homePagePath = 'Notes/Welcome.md';
			settings.excludeTags = ['private'];

			metadataCache = createMockMetadataCache({
				'Notes/Welcome.md': {
					frontmatter: { tags: ['private'] },
				} as CachedMetadata,
			});

			service = new PublishFilterService({
				metadataCache,
				getSettings: () => settings,
			});

			const file = createMockFile('Notes/Welcome.md');
			expect(service.shouldPublish(file)).toBe(true);
		});
	});
});
