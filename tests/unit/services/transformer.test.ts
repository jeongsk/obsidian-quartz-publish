
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentTransformer } from '../../../src/services/transformer';
import { Vault, MetadataCache } from '../../mocks/obsidian';
import type { Vault as RealVault, MetadataCache as RealMetadataCache } from 'obsidian';

describe('ContentTransformer', () => {
	let vault: Vault;
	let metadataCache: MetadataCache;
	let transformer: ContentTransformer;

	beforeEach(() => {
		vault = new Vault();
		metadataCache = new MetadataCache();
		transformer = new ContentTransformer(
			vault as unknown as RealVault, 
			metadataCache as unknown as RealMetadataCache
		);
	});

	describe('transformWikiLinks', () => {
		it('should keep wikilinks when file is not found', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>();

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toBe('Link to [[Note B]]');
		});

		it('should keep wikilink format when file exists (exact match)', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>(['Note B']);

			const noteB = vault._addFile('Note B.md', 'Content');
			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(noteB);

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toContain('[[Note B]]');
		});

		it('should normalize wikilink with alias when link target differs from filename', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>(['folder/Note B']);
			const noteB = vault._addFile('folder/Note B.md', 'Content');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(noteB);

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toContain('[[Note B]]');
		});

		it('should preserve alias in wikilink', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B|별칭]]');
			const publishedNotes = new Set<string>(['Note B']);
			const noteB = vault._addFile('Note B.md', 'Content');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(noteB);

			const result = transformer.transform(
				'Link to [[Note B|별칭]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toContain('[[Note B|별칭]]');
		});
	});
});
