/**
 * Content Transformer Service
 *
 * Obsidian 마크다운 콘텐츠를 Quartz 호환 형식으로 변환합니다.
 */

import type { TFile, Vault, MetadataCache } from "obsidian";
import type {
	TransformResult,
	AttachmentRef,
	FrontmatterResult,
	AutoDateSettings,
	QuartzFrontmatter,
	FrontmatterValidationResult,
	FrontmatterValidationSettings,
	ValidationIssue,
} from "../types";

/**
 * 콘텐츠 변환기 클래스
 */
export class ContentTransformer {
	private vault: Vault;
	private metadataCache: MetadataCache;
	private contentPath: string;
	private staticPath: string;
	private rootFolder: string;

	constructor(
		vault: Vault,
		metadataCache: MetadataCache,
		contentPath: string = "content",
		staticPath: string = "static",
		rootFolder: string = "",
	) {
		this.vault = vault;
		this.metadataCache = metadataCache;
		this.contentPath = contentPath;
		this.staticPath = staticPath;
		this.rootFolder = rootFolder;
	}

	/**
	 * 경로에서 루트폴더 접두사 제거
	 * @param path 원본 경로
	 * @returns 루트폴더가 제거된 경로
	 */
	private stripRootFolder(path: string): string {
		if (!this.rootFolder) {
			return path;
		}
		const prefix = this.rootFolder.endsWith("/")
			? this.rootFolder
			: `${this.rootFolder}/`;
		if (path.startsWith(prefix)) {
			return path.slice(prefix.length);
		}
		return path;
	}

	/**
	 * MetadataCache에서 frontmatter 가져오기
	 * 배열, 중첩 객체 등 완전한 파싱 지원
	 *
	 * @param file 파일 객체
	 * @returns 파싱된 frontmatter (없으면 빈 객체)
	 */
	getFrontmatterFromCache(file: TFile): QuartzFrontmatter {
		const cache = this.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			return {};
		}

		// Obsidian의 frontmatter에서 position 속성 제거 (내부용)
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { position: _position, ...frontmatter } = cache.frontmatter;
		return frontmatter as QuartzFrontmatter;
	}

	/**
	 * 노트 콘텐츠 변환
	 */
	transform(
		content: string,
		file: TFile,
		publishedNotes: Set<string>,
	): TransformResult {
		const attachments: AttachmentRef[] = [];

		// 1. 프론트매터 파싱
		const { body, raw: frontmatterRaw } = this.parseFrontmatter(content);

		// 2. 위키 링크 변환
		let transformedBody = this.transformWikiLinks(
			body,
			file.path,
			publishedNotes,
		);

		// 3. 위키링크 이미지 임베드 변환 (첨부파일 수집)
		const noteBasename = file.basename;
		transformedBody = this.transformImageEmbeds(
			transformedBody,
			noteBasename,
			attachments,
			file.path,
		);

		// 4. 마크다운 이미지 크기 문법 변환 (첨부파일 미수집 - ![[...]] 제외)
		transformedBody = this.transformMarkdownImageSize(transformedBody);

		// 5. 마크다운 이미지 문법 변환 (첨부파일 수집)
		transformedBody = this.transformMarkdownImages(
			transformedBody,
			noteBasename,
			attachments,
			file.path,
		);

		// 6. 프론트매터 재구성
		const finalContent = this.reconstructContent(
			frontmatterRaw,
			transformedBody,
		);

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
				raw: "",
			};
		}

		const raw = match[1];
		const body = content.slice(match[0].length);

		// 간단한 YAML 파싱 (key: value 형식만)
		const frontmatter: Record<string, unknown> = {};
		const lines = raw.split("\n");

		for (const line of lines) {
			const colonIndex = line.indexOf(":");
			if (colonIndex > 0) {
				const key = line.slice(0, colonIndex).trim();
				let value: unknown = line.slice(colonIndex + 1).trim();

				// 값 타입 변환
				if (value === "true") value = true;
				else if (value === "false") value = false;
				else if (!isNaN(Number(value)) && value !== "")
					value = Number(value);
				// 따옴표 제거
				else if (
					typeof value === "string" &&
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
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	/**
	 * 프론트매터에 날짜 필드 추가
	 * 기존 필드가 있으면 덮어쓰지 않음
	 *
	 * @param content 원본 마크다운 콘텐츠
	 * @param file 파일 객체 (생성/수정 시간 참조)
	 * @param autoDateSettings 자동 추가 설정
	 * @returns 필드가 추가된 콘텐츠
	 */
	addDateFields(
		content: string,
		file: TFile,
		autoDateSettings: AutoDateSettings,
	): string {
		const { frontmatter, body, raw } = this.parseFrontmatter(content);
		const newFields: string[] = [];

		// title 필드 처리 (파일명에서 생성)
		if (autoDateSettings.enableTitle && frontmatter.title === undefined) {
			const title = this.generateTitle(file);
			newFields.push(`title: "${this.escapeYamlString(title)}"`);
		}

		// description 필드 처리 (첫 문단에서 생성)
		if (
			autoDateSettings.enableDescription &&
			frontmatter.description === undefined
		) {
			const description = this.generateDescription(
				body,
				autoDateSettings.descriptionMaxLength,
			);
			if (description) {
				newFields.push(
					`description: "${this.escapeYamlString(description)}"`,
				);
			}
		}

		// created 필드 처리 (파일 생성 시간 사용)
		if (
			autoDateSettings.enableCreated &&
			frontmatter.created === undefined
		) {
			const createdDate = new Date(file.stat.ctime);
			newFields.push(`created: ${this.formatDate(createdDate)}`);
		}

		// modified 필드 처리 (파일 수정 시간 사용)
		if (
			autoDateSettings.enableModified &&
			frontmatter.modified === undefined
		) {
			const modifiedDate = new Date(file.stat.mtime);
			newFields.push(`modified: ${this.formatDate(modifiedDate)}`);
		}

		// published 필드 처리 (현재 시간 사용)
		if (
			autoDateSettings.enablePublished &&
			frontmatter.published === undefined
		) {
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
			return `---\n${newFields.join("\n")}\n---\n\n${body}`;
		}

		// 기존 프론트매터 끝에 추가
		const newRaw = `${raw}\n${newFields.join("\n")}`;
		return `---\n${newRaw}\n---\n\n${body}`;
	}

	/**
	 * 파일명에서 title 생성
	 */
	private generateTitle(file: TFile): string {
		// 파일명에서 확장자 제거
		return file.basename;
	}

	/**
	 * 본문에서 description 생성 (첫 문단 추출)
	 */
	private generateDescription(body: string, maxLength: number): string {
		// 빈 줄로 분리된 첫 문단 찾기
		const paragraphs = body.trim().split(/\n\s*\n/);

		for (const paragraph of paragraphs) {
			// 헤딩, 리스트, 코드블록, 이미지 등 제외
			const trimmed = paragraph.trim();
			if (
				trimmed.startsWith("#") ||
				trimmed.startsWith("-") ||
				trimmed.startsWith("*") ||
				trimmed.startsWith("```") ||
				trimmed.startsWith("![") ||
				trimmed.startsWith(">")
			) {
				continue;
			}

			// 마크다운 문법 제거
			let text = trimmed
				.replace(/\*\*([^*]+)\*\*/g, "$1") // bold
				.replace(/\*([^*]+)\*/g, "$1") // italic
				.replace(/`([^`]+)`/g, "$1") // inline code
				.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, "$2 || $1") // wiki links
				.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
				.replace(/\n/g, " ") // 줄바꿈 → 공백
				.replace(/\s+/g, " ") // 연속 공백 → 단일 공백
				.trim();

			if (text.length > 0) {
				// maxLength 초과 시 자르기
				if (text.length > maxLength) {
					text = text.slice(0, maxLength - 3).trim() + "...";
				}
				return text;
			}
		}

		return "";
	}

	/**
	 * YAML 문자열 이스케이프
	 */
	private escapeYamlString(str: string): string {
		return str
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\n/g, "\\n");
	}

	/**
	 * 발행 경로 결정 (프론트매터 path > 볼트 구조)
	 */
	getRemotePath(file: TFile, frontmatter: QuartzFrontmatter): string {
		// 1. 프론트매터의 path 우선
		if (typeof frontmatter.path === "string" && frontmatter.path.trim()) {
			const customPath = frontmatter.path.trim();
			// .md 확장자 보장
			const pathWithExt = customPath.endsWith(".md")
				? customPath
				: `${customPath}.md`;
			return `${this.contentPath}/${pathWithExt}`;
		}

		// 2. 볼트 내 폴더 구조 사용
		return `${this.contentPath}/${file.path}`;
	}

	/**
	 * 위키 링크 변환
	 * - 위키링크 형식 유지 (Quartz 호환)
	 * - 파일이 존재하면 파일명으로 정규화
	 * - 이미지 임베드(![[...]])는 제외
	 */
	private transformWikiLinks(
		content: string,
		sourcePath: string,
		_publishedNotes: Set<string>,
	): string {
		// [[note|alias]] 또는 [[note]] 패턴 (이미지 임베드 제외: negative lookbehind)
		const wikiLinkRegex = /(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

		return content.replace(wikiLinkRegex, (match, linkTarget, alias) => {
			const displayText = alias || linkTarget;

			// Obsidian API를 사용하여 링크 대상 파일 찾기
			const targetFile = this.metadataCache.getFirstLinkpathDest(
				linkTarget,
				sourcePath,
			);

			// 파일이 존재하면 파일명으로 정규화된 위키링크 반환
			if (targetFile) {
				const basename = targetFile.basename; // 확장자 제외한 파일명
				// 별칭이 있거나 링크 대상과 파일명이 다른 경우
				if (alias || linkTarget !== basename) {
					return `[[${basename}|${displayText}]]`;
				}
				return `[[${basename}]]`;
			}

			// 파일을 찾지 못한 경우 원본 위키링크 유지
			return match;
		});
	}

	/**
	 * 마크다운 이미지 크기 문법 변환
	 * Obsidian의 ![alt|500](url) 또는 ![alt|500x300](url) 문법을 HTML img 태그로 변환
	 * Quartz 4에서 이 문법을 지원하지 않기 때문에 HTML로 변환
	 *
	 * @param content 마크다운 콘텐츠
	 * @returns 변환된 콘텐츠
	 */
	private transformMarkdownImageSize(content: string): string {
		// ![alt|widthxheight](url) 또는 ![alt|width](url) 패턴
		// alt는 선택적, 파이프와 크기는 필수
		const imageSizeRegex = /!\[([^|\]]*)\|(\d+)(?:x(\d+))?\]\(([^)]+)\)/g;

		return content.replace(
			imageSizeRegex,
			(match, alt, width, height, url) => {
				const altAttr = alt ? ` alt="${alt}"` : ' alt=""';
				const widthAttr = ` width="${width}"`;
				const heightAttr = height ? ` height="${height}"` : "";

				return `<img src="${url}"${altAttr}${widthAttr}${heightAttr}>`;
			},
		);
	}

	/**
	 * 위키링크 이미지 임베드 변환
	 * ![[image.png]] → attachments/{filename}으로 통일 (Quartz content/attachments 폴더와 일치)
	 *
	 * @param content 마크다운 콘텐츠
	 * @param noteBasename 노트 파일명 (확장자 제거)
	 * @param attachments 첨부파일 목록 (결과 저장용)
	 * @param sourcePath 소스 파일 경로 (링크 해석용)
	 */
	private transformImageEmbeds(
		content: string,
		_noteBasename: string,
		attachments: AttachmentRef[],
		sourcePath: string,
	): string {
		// ![[image.ext]] 또는 ![[image.ext|alias]] 패턴 (이미지 확장자만)
		const imageEmbedRegex =
			/!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|bmp))(?:\|([^\]]+))?\]\]/gi;

		// 이미지 임베드를 찾아서 첨부파일 목록에 추가 및 콘텐츠 변환
		return content.replace(
			imageEmbedRegex,
			(match, imagePath, _ext, alias) => {
				const filename = imagePath.split("/").pop() || imagePath;

				// 이미지를 content/attachments/ 폴더에 저장
				const remotePath = `${this.contentPath}/attachments/${filename}`;

				// 콘텐츠 내 참조 경로 (Quartz는 content 폴더가 기준이므로 attachments/{filename})
				const contentPath = `attachments/${filename}`;

				// MetadataCache를 사용하여 실제 파일 경로 해석
				const imageFile = this.metadataCache.getFirstLinkpathDest(
					imagePath,
					sourcePath,
				);
				const resolvedLocalPath = imageFile
					? imageFile.path
					: imagePath;

				// localPath: vault 조회용으로 전체 경로 유지
				const localPath = resolvedLocalPath;

				// 첨부파일 목록에 추가
				attachments.push({
					localPath, // 전체 경로 (vault 조회용)
					remotePath, // content/attachments/xxx
					contentPath, // attachments/xxx (콘텐츠 내 참조 경로)
				});

				// 콘텐츠 내 위키링크는 항상 attachments/{filename} 사용
				if (alias) {
					return `![[${contentPath}|${alias}]]`;
				}
				return `![[${contentPath}]]`;
			},
		);
	}

	/**
	 * 마크다운 이미지 문법 변환
	 * ![alt](path) 패턴 처리 (로컬 파일만, 외부 URL 제외)
	 *
	 * @param content 마크다운 콘텐츠
	 * @param noteBasename 노트 파일명 (확장자 제거)
	 * @param attachments 첨부파일 목록 (결과 저장용)
	 * @param sourcePath 소스 파일 경로 (링크 해석용)
	 */
	private transformMarkdownImages(
		content: string,
		_noteBasename: string,
		attachments: AttachmentRef[],
		sourcePath: string,
	): string {
		// ![alt](path) 패턴 (외부 URL 제외: http://, https://, //)
		const markdownImageRegex = /!\[([^\]]*)\]\((?!https?:|\/\/)([^)]+)\)/g;

		return content.replace(markdownImageRegex, (match, alt, imagePath) => {
			// 이미지 확장자 확인
			const imageExtensions = /\.(png|jpg|jpeg|gif|svg|webp|bmp)$/i;
			if (!imageExtensions.test(imagePath)) {
				// 이미지 파일이 아니면 원본 유지
				return match;
			}

			const filename = imagePath.split("/").pop() || imagePath;

			// 이미지를 content/attachments/ 폴더에 저장
			const remotePath = `${this.contentPath}/attachments/${filename}`;

			// 콘텐츠 내 참조 경로 (Quartz는 content 폴더가 기준이므로 attachments/{filename})
			const contentPath = `attachments/${filename}`;

			// MetadataCache를 사용하여 실제 파일 경로 해석
			const imageFile = this.metadataCache.getFirstLinkpathDest(
				imagePath,
				sourcePath,
			);
			const resolvedLocalPath = imageFile ? imageFile.path : imagePath;

			// localPath: vault 조회용으로 전체 경로 유지
			const localPath = resolvedLocalPath;

			// 첨부파일 목록에 추가
			attachments.push({
				localPath, // 전체 경로 (vault 조회용)
				remotePath, // content/attachments/xxx
				contentPath, // attachments/xxx (콘텐츠 내 참조 경로)
			});

			// 위키링크 형식으로 변환 (Quartz 호환)
			return `![[${contentPath}|${alt}]]`;
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
		return path.replace(/\.md$/, "");
	}

	/**
	 * 문자열을 URL-safe slug로 변환
	 * - 공백을 하이픈(-)으로 변환
	 * - 특수문자 제거 (한글, 영문, 숫자, 하이픈, 언더스코어만 유지)
	 * - 연속 하이픈 정리
	 */
	private toSlug(str: string): string {
		return str
			.trim()
			.replace(/\s+/g, "-") // 공백 → 하이픈
			.replace(/[^\w가-힣\-]/g, "") // 허용 문자만 유지
			.replace(/-+/g, "-") // 연속 하이픈 정리
			.replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거
	}

	/**
	 * 콘텐츠에서 참조된 첨부파일 추출
	 *
	 * @param content 마크다운 콘텐츠
	 * @param noteBasename 노트 파일명 (확장자 제외)
	 * @param sourcePath 소스 파일 경로 (링크 해석용)
	 */
	extractAttachments(
		content: string,
		_noteBasename: string,
		sourcePath: string,
	): AttachmentRef[] {
		const attachments: AttachmentRef[] = [];
		const imageEmbedRegex =
			/!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|bmp))\]\]/gi;

		let match;
		while ((match = imageEmbedRegex.exec(content)) !== null) {
			const imagePath = match[1];
			const filename = imagePath.split("/").pop() || imagePath;

			// 이미지를 content/attachments/ 폴더에 저장
			const remotePath = `${this.contentPath}/attachments/${filename}`;

			// 콘텐츠 내 참조 경로 (Quartz는 content 폴더가 기준이므로 attachments/{filename})
			const contentPath = `attachments/${filename}`;

			// MetadataCache를 사용하여 실제 파일 경로 해석
			const imageFile = this.metadataCache.getFirstLinkpathDest(
				imagePath,
				sourcePath,
			);
			const resolvedLocalPath = imageFile ? imageFile.path : imagePath;

			// localPath: vault 조회용으로 전체 경로 유지
			const localPath = resolvedLocalPath;

			attachments.push({
				localPath, // 전체 경로 (vault 조회용)
				remotePath, // content/attachments/xxx
				contentPath, // attachments/xxx (콘텐츠 내 참조 경로)
			});
		}

		return attachments;
	}

	/**
	 * Frontmatter 검증
	 *
	 * @param frontmatter 검증할 frontmatter
	 * @param settings 검증 설정
	 * @returns 검증 결과
	 */
	validateFrontmatter(
		frontmatter: QuartzFrontmatter,
		settings: FrontmatterValidationSettings,
	): FrontmatterValidationResult {
		const issues: ValidationIssue[] = [];

		if (!settings.enabled) {
			return {
				isValid: true,
				issues: [],
				errorCount: 0,
				warningCount: 0,
			};
		}

		// title 검증
		if (settings.requireTitle && !frontmatter.title) {
			issues.push({
				severity: "warning",
				field: "title",
				message:
					"title 필드가 없습니다. SEO와 접근성을 위해 추가를 권장합니다.",
				suggestion: "파일명을 title로 사용할 수 있습니다.",
			});
		}

		// description 검증
		if (settings.requireDescription && !frontmatter.description) {
			issues.push({
				severity: "warning",
				field: "description",
				message:
					"description 필드가 없습니다. 링크 미리보기에 표시됩니다.",
				suggestion: "첫 문단을 description으로 사용할 수 있습니다.",
			});
		}

		// tags 검증
		if (settings.requireTags) {
			const tags = frontmatter.tags;
			if (!tags || (Array.isArray(tags) && tags.length === 0)) {
				issues.push({
					severity: "warning",
					field: "tags",
					message:
						"tags 필드가 없습니다. 콘텐츠 분류에 도움이 됩니다.",
				});
			}
		}

		// draft와 publish 동시 설정 경고
		if (frontmatter.draft === true && frontmatter.publish === true) {
			issues.push({
				severity: "warning",
				field: "draft",
				message:
					"draft: true와 publish: true가 동시에 설정되어 있습니다.",
				suggestion: "draft를 제거하거나 false로 설정하세요.",
			});
		}

		// description 길이 검증
		if (
			frontmatter.description &&
			typeof frontmatter.description === "string"
		) {
			if (frontmatter.description.length > 160) {
				issues.push({
					severity: "info",
					field: "description",
					message: `description이 ${frontmatter.description.length}자입니다. 160자 이하를 권장합니다.`,
				});
			}
		}

		const errorCount = issues.filter((i) => i.severity === "error").length;
		const warningCount = issues.filter(
			(i) => i.severity === "warning",
		).length;

		return {
			isValid: errorCount === 0,
			issues,
			errorCount,
			warningCount,
		};
	}
}
