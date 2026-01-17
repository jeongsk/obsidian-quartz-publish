
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

			// 위키링크가 attachments/{filename}으로 변환
			expect(result.content).toContain('![[attachments/image.png]]');
			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments).toHaveLength(1);
			expect(result.attachments[0].localPath).toBe('attachments/image.png');
			// remotePath는 content/attachments/ 폴더 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/image.png');
			// contentPath는 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/image.png');
		});

		it('should use original path when image file is not found', () => {
			const file = vault._addFile('notes/my-note.md', '![[missing.png]]');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(null);

			const result = transformer.transform(
				'![[missing.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 파일을 찾지 못해도 attachments/{filename}으로 변환
			expect(result.content).toContain('![[attachments/missing.png]]');
			// localPath는 원본 경로 유지 (graceful degradation)
			expect(result.attachments[0].localPath).toBe('missing.png');
			// contentPath는 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/missing.png');
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

			// 위키링크가 attachments/{filename}으로 변환
			expect(result.content).toContain('![[attachments/photo.png]]');
			// localPath는 실제 파일 경로로 해석
			expect(result.attachments[0].localPath).toBe('assets/images/photo.png');
			// remotePath는 파일명만 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/photo.png');
			// contentPath는 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/photo.png');
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

			// 위키링크가 attachments/{filename}으로 변환
			expect(result.content).toContain('![[attachments/a.png]]');
			expect(result.content).toContain('![[attachments/b.jpg]]');
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
				// 위키링크가 attachments/{filename}으로 변환
				expect(result.content).toContain(`![[attachments/test.${ext}]]`);
				expect(result.attachments[0].remotePath).toBe(`content/attachments/test.${ext}`);
				expect(result.attachments[0].contentPath).toBe(`attachments/test.${ext}`);
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

			// 위키링크가 attachments/{filename}으로 변환
			expect(result.content).toContain('![[attachments/image.png]]');
			// remotePath는 항상 content/attachments/ 폴더 사용
			expect(result.attachments[0].remotePath).toBe('content/attachments/image.png');
			// contentPath는 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/image.png');
		});

		it('should use attachments path when rootFolder is set', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish'
			);

			const file = vault._addFile('Publish/notes/my-note.md', '![[photo.png]]');
			const imageFile = vault._addFile('Publish/images/photo.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![[photo.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('Publish/images/photo.png');
			// remotePath는 content/attachments/{filename}
			expect(result.attachments[0].remotePath).toBe('content/attachments/photo.png');
			// contentPath는 항상 attachments/{filename} (업로드 위치와 일치)
			expect(result.attachments[0].contentPath).toBe('attachments/photo.png');
			// 콘텐츠 내 위키링크도 attachments/{filename} 사용
			expect(result.content).toContain('![[attachments/photo.png]]');
		});

		it('should not modify localPath when rootFolder is empty', () => {
			const file = vault._addFile('notes/my-note.md', '![[photo.png]]');
			const imageFile = vault._addFile('images/photo.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformer.transform(
				'![[photo.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('images/photo.png');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/photo.png');
			// 콘텐츠 내 위키링크는 attachments/{filename}
			expect(result.content).toContain('![[attachments/photo.png]]');
		});

		it('should handle rootFolder with trailing slash', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish/'
			);

			const file = vault._addFile('Publish/notes/my-note.md', '![[image.jpg]]');
			const imageFile = vault._addFile('Publish/assets/image.jpg', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![[image.jpg]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('Publish/assets/image.jpg');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/image.jpg');
			// 콘텐츠 내 위키링크는 attachments/{filename}
			expect(result.content).toContain('![[attachments/image.jpg]]');
		});

		it('should not strip path when it does not start with rootFolder', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish'
			);

			const file = vault._addFile('Publish/notes/my-note.md', '![[image.png]]');
			const imageFile = vault._addFile('SharedAssets/image.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![[image.png]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('SharedAssets/image.png');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/image.png');
			// 콘텐츠 내 위키링크는 attachments/{filename}
			expect(result.content).toContain('![[attachments/image.png]]');
		});

		it('should use attachments path with alias', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish'
			);

			const file = vault._addFile('Publish/Log/test.md', '![[Publish/images/photo.png|사진]]');
			const imageFile = vault._addFile('Publish/images/photo.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![[Publish/images/photo.png|사진]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('Publish/images/photo.png');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/photo.png');
			// 콘텐츠 내 위키링크는 attachments/{filename}|별칭
			expect(result.content).toContain('![[attachments/photo.png|사진]]');
		});

		it('should use attachments path when image path starts with rootFolder', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish'
			);

			const file = vault._addFile('Publish/Log/test.md', '![[Publish/Log/assets/image.jpg]]');
			const imageFile = vault._addFile('Publish/Log/assets/image.jpg', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![[Publish/Log/assets/image.jpg]]',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('Publish/Log/assets/image.jpg');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/image.jpg');
			// 콘텐츠 내 위키링크는 attachments/{filename}
			expect(result.content).toContain('![[attachments/image.jpg]]');
		});
	});

	describe('transformMarkdownImageSize', () => {
		it('should convert ![alt|width](url) to HTML img tag', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![alt text|500](https://example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('<img src="https://example.com/image.png" alt="alt text" width="500">');
		});

		it('should convert ![alt|widthxheight](url) to HTML img tag with dimensions', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![alt text|500x300](https://example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('<img src="https://example.com/image.png" alt="alt text" width="500" height="300">');
		});

		it('should handle empty alt text with size', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![|500](https://example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('<img src="https://example.com/image.png" alt="" width="500">');
		});

		it('should not transform standard markdown images without size', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![alt text](https://example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('![alt text](https://example.com/image.png)');
		});

		it('should handle multiple images with size in content', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = 'First ![img1|200](url1) and second ![img2|300x150](url2)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('First <img src="url1" alt="img1" width="200"> and second <img src="url2" alt="img2" width="300" height="150">');
		});

		it('should handle local file paths with size', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![photo|400](./images/photo.jpg)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toBe('<img src="./images/photo.jpg" alt="photo" width="400">');
		});

		it('should preserve frontmatter when transforming image size', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = `---
title: Test
---

![image|500](https://example.com/image.png)`;

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.content).toContain('---\ntitle: Test\n---');
			expect(result.content).toContain('<img src="https://example.com/image.png" alt="image" width="500">');
		});
	});

	describe('transformMarkdownImages', () => {
		it('should convert markdown image to wiki link and collect attachment', () => {
			const file = vault._addFile('notes/my-note.md', '![alt text](image.png)');
			const imageFile = vault._addFile('attachments/image.png', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformer.transform(
				'![alt text](image.png)',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 위키링크 형식으로 변환 (MetadataCache 해석 경로 사용)
			expect(result.content).toContain('![[attachments/image.png|alt text]]');
			// 첨부파일 수집
			expect(result.attachments).toHaveLength(1);
			expect(result.attachments[0].localPath).toBe('attachments/image.png');
			expect(result.attachments[0].remotePath).toBe('content/attachments/image.png');
			expect(result.attachments[0].contentPath).toBe('attachments/image.png');
		});

		it('should not convert external URLs', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![alt](https://example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 외부 URL은 변환하지 않음
			expect(result.content).toBe('![alt](https://example.com/image.png)');
			expect(result.attachments).toHaveLength(0);
		});

		it('should not convert protocol-relative URLs', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![alt](//example.com/image.png)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 프로토콜 상대 URL은 변환하지 않음
			expect(result.content).toBe('![alt](//example.com/image.png)');
			expect(result.attachments).toHaveLength(0);
		});

		it('should support various image extensions', () => {
			const file = vault._addFile('notes/test.md', 'test');
			const extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];

			for (const ext of extensions) {
				const imageFile = vault._addFile(`attachments/test.${ext}`, '');
				vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

				const result = transformer.transform(
					`![alt](test.${ext})`,
					file as unknown as import('obsidian').TFile,
					new Set<string>()
				);

				expect(result.attachments.length).toBeGreaterThan(0);
				expect(result.attachments[0].remotePath).toBe(`content/attachments/test.${ext}`);
			}
		});

		it('should strip rootFolder from markdown image path', () => {
			const transformerWithRoot = new ContentTransformer(
				vault as unknown as import('obsidian').Vault,
				metadataCache as unknown as import('obsidian').MetadataCache,
				'content',
				'static',
				'Publish'
			);

			const file = vault._addFile('Publish/notes/my-note.md', '![alt](assets/photo.jpg)');
			const imageFile = vault._addFile('Publish/assets/photo.jpg', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest').mockReturnValue(imageFile);

			const result = transformerWithRoot.transform(
				'![alt](assets/photo.jpg)',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// localPath는 vault 조회용으로 전체 경로 유지
			expect(result.attachments[0].localPath).toBe('Publish/assets/photo.jpg');
			// contentPath는 항상 attachments/{filename}
			expect(result.attachments[0].contentPath).toBe('attachments/photo.jpg');
			// 위키링크로 변환 (attachments/{filename})
			expect(result.content).toContain('![[attachments/photo.jpg|alt]]');
		});

		it('should handle multiple markdown images', () => {
			const file = vault._addFile('notes/my-note.md', 'First ![img1](a.png) and second ![img2](b.jpg)');
			const imageA = vault._addFile('attachments/a.png', '');
			const imageB = vault._addFile('attachments/b.jpg', '');

			vi.spyOn(metadataCache, 'getFirstLinkpathDest')
				.mockImplementation((linkpath: string) => {
					if (linkpath === 'a.png') return imageA;
					if (linkpath === 'b.jpg') return imageB;
					return null;
				});

			const result = transformer.transform(
				'First ![img1](a.png) and second ![img2](b.jpg)',
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			expect(result.attachments).toHaveLength(2);
			// MetadataCache 해석 경로 사용
			expect(result.content).toContain('![[attachments/a.png|img1]]');
			expect(result.content).toContain('![[attachments/b.jpg|img2]]');
		});

		it('should not transform non-image file links', () => {
			const file = vault._addFile('notes/test.md', '');
			const content = '![document](file.pdf)';

			const result = transformer.transform(
				content,
				file as unknown as import('obsidian').TFile,
				new Set<string>()
			);

			// 이미지 파일이 아니면 원본 유지
			expect(result.content).toBe('![document](file.pdf)');
			expect(result.attachments).toHaveLength(0);
		});
	});
});
