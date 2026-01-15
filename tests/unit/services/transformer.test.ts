
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
		it('should strip links to notes that are NOT in publishedNotes', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>();

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toBe('Link to Note B');
		});

		it('should transform links to notes that ARE in publishedNotes (exact match)', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>(['Note B']); 

			const noteB = vault._addFile('Note B.md', 'Content');
            vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(noteB);

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);

			expect(result.content).toContain('[Note B](Note B.md)');
		});

		it('should correctly resolve short links to full paths', () => {
			const file = vault._addFile('folder/Note A.md', 'Link to [[Note B]]');
			const publishedNotes = new Set<string>(['folder/Note B']); 
			const noteB = vault._addFile('folder/Note B.md', 'Content');
            
            vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(noteB);

			const result = transformer.transform(
				'Link to [[Note B]]',
				file as unknown as import('obsidian').TFile,
				publishedNotes
			);
            
            expect(result.content).toContain('[Note B](folder/Note B.md)');
        });
	});
});
