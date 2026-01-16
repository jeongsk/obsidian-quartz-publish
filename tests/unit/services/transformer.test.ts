
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

	describe('transformImageEmbeds', () => {
		it('should keep wiki image embed and collect attachments', () => {
			const file = vault._addFile('notes/my-note.md', '![[image.png]]');
			const imageFile = vault._addFile('attachments/image.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformer.transform(
				'![[image.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크 형식이 그대로 유지되어야 함
			expect(result.content).toContain('![[image.png]]');
			// localPath가 MetadataCache로 해석된 경로인지 확인
			expect(result.attachments).toHaveLength(1);
			expect(result.attachments[0].localPath).toBe('attachments/image.png');
			// remotePath는 content/attachments/ 폴더 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/image.png');
		});

		it('should use original path when image file is not found', () => {
			const file = vault._addFile('notes/my-note.md', '![[missing.png]]');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(null);

			const result = transformer.transform(
				'![[missing.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크 형식이 유지되어야 함
			expect(result.content).toContain('![[missing.png]]');
			// localPath는 원본 경로 유지 (graceful degradation)
			expect(result.attachments[0].localPath).toBe('missing.png');
		});

		it('should handle image with folder path in wikilink', () => {
			const file = vault._addFile('notes/my-note.md', '![[images/photo.png]]');
			const imageFile = vault._addFile('assets/images/photo.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformer.transform(
				'![[images/photo.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크가 유지되어야 함
			expect(result.content).toContain('![[images/photo.png]]');
			// localPath는 실제 파일 경로로 해석
			expect(result.attachments[0].localPath).toBe('assets/images/photo.png');
			// remotePath는 파일명만 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/photo.png');
		});

		it('should handle multiple images in content', () => {
			const file = vault._addFile('notes/my-note.md', '![[a.png]] text ![[b.jpg]]');
			const imageA = vault._addFile('attachments/a.png', '');
			const imageB = vault._addFile('attachments/b.jpg', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest')
				.mockImplementation((linkpath: string) => {
					if (linkpath === 'a.png') return imageA;
					if (linkpath === 'b.jpg') return imageB;
					return null;
				});

			const result = transformer.transform(
				'![[a.png]] text ![[b.jpg]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크가 유지되어야 함
			expect(result.content).toContain('![[a.png]]');
			expect(result.content).toContain('![[b.jpg]]');
			expect(result.attachments).toHaveLength(2);
			expect(result.attachments[0].localPath).toBe('attachments/a.png');
			expect(result.attachments[1].localPath).toBe('attachments/b.jpg');
		});

		it('should support various image extensions', () => {
			const file = vault._addFile('notes/my-note.md', 'test');
			const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];

			for (const ext of extensions) {
				const imageFile = vault._addFile(`attachments/test.${ext}`, '');
				vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

				const result = transformer.transform(
					`![[test.${ext}]]`,
					file as unknown as import('obsidian').TFile,
					new Set<string>()
				);

				expect(result.attachments.length).toBeGreaterThan(0);
				// 위키링크가 유지되어야 함
				expect(result.content).toContain(`![[test.${ext}]]`);
				expect(result.attachments[0].remotePath).toBe(`content/attachments/test.${ext}`);
			}
		});

		it('should store images in content/attachments regardless of note basename', () => {
			const file = vault._addFile('notes/Quartz 호스팅 가이드.md', '![[image.png]]');
			const imageFile = vault._addFile('attachments/image.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformer.transform(
				'![[image.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크가 유지되어야 함
			expect(result.content).toContain('![[image.png]]');
			// remotePath는 항상 content/attachments/ 폴더 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/image.png');
		});
	});
});
