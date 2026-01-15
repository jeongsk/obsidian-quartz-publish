/**
 * Content Transformer Service
 *
 * Obsidian 마크다운 콘텐츠를 Quartz 호환 형식으로 변환합니다.
 */

import type { TFile, Vault, MetadataCache } from 'obsidian';
import type {
	TransformResult,
	AttachmentRef,
	FrontmatterResult,
	AutoDateSettings,
} from '../types';

/**
 * 콘텐츠 변환기 클래스
 */
export class ContentTransformer {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private contentPath: string;
	private staticPath: string;

	constructor(
		vault: Vault,
		metadataCache: MetadataCache,
		contentPath: string = 'content',
		staticPath: string = 'static'
	) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.contentPath = contentPath;
		this.staticPath = staticPath;
	}

	/**
	 * 노트 콘텐츠 변환
	 */
	transform(
		content: string,
		file: TFile,
		publishedNotes: Set<string>
	): TransformResult {
		const attachments: AttachmentRef[] = [];

		// 1. 프론트매터 파싱
		const { body, raw: frontmatterRaw } = this.parseFrontmatter(content);

		// 2. 위키 링크 변환
		let transformedBody = this.transformWikiLinks(body, publishedNotes);

		// 3. 이미지 임베드 변환 (첨부파일 수집)
		const noteBasename = file.basename;
		transformedBody = this.transformImageEmbeds(
			transformedBody,
			noteBasename,
			attachments
		);

		// 4. 프론트매터 재구성
		const finalContent = this.reconstructContent(frontmatterRaw, transformedBody);

		return {
			content: finalContent,
			attachments,
		};
	}

	/**
	 * 프론트매터 파싱
	 */
	parseFrontmatter(content: string): FrontmatterResult {
		const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return {
				frontmatter: {},
				body: content,
				raw: '',
			};
		}

		const raw = match[1];
		const body = content.slice(match[0].length);

		// 간단한 YAML 파싱 (key: value 형식만)
		const frontmatter: Record<string, unknown> = {};
		const lines = raw.split('\n');

		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				let value: unknown = line.slice(colonIndex + 1).trim();

				// 값 타입 변환
				if (value === 'true') value = true;
				else if (value === 'false') value = false;
				else if (!isNaN(Number(value)) && value !== '') value = Number(value);
				// 따옴표 제거
				else if (
					typeof value === 'string' &&
					((value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'")))
				) {
					value = value.slice(1, -1);
				}

				frontmatter[key] = value;
			}
		}

		return {
			frontmatter,
			body,
			raw,
		};
	}

	/**
	 * 프론트매터에 publish: true 추가
	 */
	addPublishFlag(content: string): string {
		const { frontmatter, body, raw } = this.parseFrontmatter(content);

		if (frontmatter.publish === true) {
			return content; // 이미 있음
		}

		if (!raw) {
			// 프론트매터가 없는 경우 새로 생성
			return `---\npublish: true\n---\n\n${body}`;
		}

		// 기존 프론트매터에 추가
		const newRaw = `publish: true\n${raw}`;
		return `---\n${newRaw}\n---\n\n${body}`;
	}

	/**
	 * 날짜를 YYYY-MM-DD 형식으로 포맷
	 */
	private formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * 프론트매터에 날짜 필드 추가
	 * 기존 필드가 있으면 덮어쓰지 않음
	 *
	 * @param content 원본 마크다운 콘텐츠
	 * @param file 파일 객체 (생성/수정 시간 참조)
	 * @param autoDateSettings 날짜 자동 추가 설정
	 * @returns 날짜 필드가 추가된 콘텐츠
	 */
	addDateFields(content: string, file: TFile, autoDateSettings: AutoDateSettings): string {
		const { frontmatter, body, raw } = this.parseFrontmatter(content);
		const newFields: string[] = [];

		// created 필드 처리 (파일 생성 시간 사용)
		if (autoDateSettings.enableCreated && frontmatter.created === undefined) {
			const createdDate = new Date(file.stat.ctime);
			newFields.push(`created: ${this.formatDate(createdDate)}`);
		}

		// modified 필드 처리 (파일 수정 시간 사용)
		if (autoDateSettings.enableModified && frontmatter.modified === undefined) {
			const modifiedDate = new Date(file.stat.mtime);
			newFields.push(`modified: ${this.formatDate(modifiedDate)}`);
		}

		// published 필드 처리 (현재 시간 사용)
		if (autoDateSettings.enablePublished && frontmatter.published === undefined) {
			const now = new Date();
			newFields.push(`published: ${this.formatDate(now)}`);
		}

		// 추가할 필드가 없으면 원본 반환
		if (newFields.length === 0) {
			return content;
		}

		// 프론트매터 재구성
		if (!raw) {
			// 프론트매터가 없는 경우 새로 생성
			return `---\n${newFields.join('\n')}\n---\n\n${body}`;
		}

		// 기존 프론트매터 끝에 추가
		const newRaw = `${raw}\n${newFields.join('\n')}`;
		return `---\n${newRaw}\n---\n\n${body}`;
	}

	/**
	 * 발행 경로 결정 (프론트매터 path > 볼트 구조)
	 */
	getRemotePath(file: TFile, frontmatter: Record<string, unknown>): string {
		// 1. 프론트매터의 path 우선
		if (typeof frontmatter.path === 'string' && frontmatter.path.trim()) {
			const customPath = frontmatter.path.trim();
			// .md 확장자 보장
			const pathWithExt = customPath.endsWith('.md') ? customPath : `${customPath}.md`;
			return `${this.contentPath}/${pathWithExt}`;
		}

		// 2. 볼트 내 폴더 구조 사용
		return `${this.contentPath}/${file.path}`;
	}

	/**
	 * 위키 링크 변환
	 * - 발행된 노트: [[note]] → [note](note.md)
	 * - 발행되지 않은 노트: [[note]] → note (링크 제거)
	 */
	private transformWikiLinks(content: string, publishedNotes: Set<string>): string {
		// [[note|alias]] 또는 [[note]] 패턴
		const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

		return content.replace(wikiLinkRegex, (match, linkTarget, alias) => {
			const displayText = alias || linkTarget;
			const normalizedTarget = this.normalizeNotePath(linkTarget);

			// 발행된 노트인지 확인
			if (publishedNotes.has(normalizedTarget)) {
				// 마크다운 링크로 변환
				const linkPath = normalizedTarget.endsWith('.md')
					? normalizedTarget
					: `${normalizedTarget}.md`;
				return `[${displayText}](${linkPath})`;
			}

			// 발행되지 않은 노트는 텍스트만 유지
			return displayText;
		});
	}

	/**
	 * 이미지 임베드 변환
	 * ![[image.png]] → ![image](/static/images/note-name/image.png)
	 */
	private transformImageEmbeds(
		content: string,
		noteBasename: string,
		attachments: AttachmentRef[]
	): string {
		// ![[image.ext]] 패턴 (이미지 확장자만)
		const imageEmbedRegex = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|bmp))\]\]/gi;

		return content.replace(imageEmbedRegex, (match, imagePath) => {
			const filename = imagePath.split('/').pop() || imagePath;
			const remotePath = `${this.staticPath}/images/${noteBasename}/${filename}`;

			// 첨부파일 목록에 추가
			attachments.push({
				localPath: imagePath,
				remotePath,
			});

			// 표준 마크다운 이미지 문법으로 변환
			const altText = filename.replace(/\.[^.]+$/, '');
			return `![${altText}](/${remotePath})`;
		});
	}

	/**
	 * 콘텐츠 재구성 (프론트매터 + 본문)
	 */
	private reconstructContent(frontmatterRaw: string, body: string): string {
		if (!frontmatterRaw) {
			return body;
		}
		return `---\n${frontmatterRaw}\n---\n\n${body}`;
	}

	/**
	 * 노트 경로 정규화
	 */
	private normalizeNotePath(path: string): string {
		// .md 확장자 제거 (있는 경우)
		return path.replace(/\.md$/, '');
	}

	/**
	 * 콘텐츠에서 참조된 첨부파일 추출
	 */
	extractAttachments(content: string, noteBasename: string): AttachmentRef[] {
		const attachments: AttachmentRef[] = [];
		const imageEmbedRegex = /!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|bmp))\]\]/gi;

		let match;
		while ((match = imageEmbedRegex.exec(content)) !== null) {
			const imagePath = match[1];
			const filename = imagePath.split('/').pop() || imagePath;
			const remotePath = `${this.staticPath}/images/${noteBasename}/${filename}`;

			attachments.push({
				localPath: imagePath,
				remotePath,
			});
		}

		return attachments;
	}
}
