/**
 * ContentTransformer 추가 테스트
 * parseFrontmatter, addPublishFlag, addDateFields, getRemotePath, validateFrontmatter
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ContentTransformer } from "../../../src/entities/note/lib/transformer";
import { Vault, MetadataCache, TFile } from "../../mocks/obsidian";
import type { Vault as RealVault, MetadataCache as RealMetadataCache } from "obsidian";
import { DEFAULT_AUTO_DATE_SETTINGS } from "../../../src/app/types";
import type { FrontmatterValidationSettings } from "../../../src/app/types";

function createTransformer(contentPath = "content", rootFolder = "") {
  const vault = new Vault();
  const metadataCache = new MetadataCache();
  const transformer = new ContentTransformer(
    vault as unknown as RealVault,
    metadataCache as unknown as RealMetadataCache,
    contentPath,
    "static",
    rootFolder
  );
  return { vault, metadataCache, transformer };
}

function createMockFile(path: string): TFile {
  return new TFile(path);
}

// ============================================================================
// parseFrontmatter
// ============================================================================

describe("ContentTransformer - parseFrontmatter", () => {
  let transformer: ContentTransformer;

  beforeEach(() => {
    ({ transformer } = createTransformer());
  });

  it("프론트매터가 없는 경우 빈 객체를 반환한다", () => {
    const result = transformer.parseFrontmatter("# Hello World\n\nContent here.");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("# Hello World\n\nContent here.");
    expect(result.raw).toBe("");
  });

  it("기본 key: value 프론트매터를 파싱한다", () => {
    const content = "---\ntitle: My Post\npublish: true\n---\n\n# Body";
    const result = transformer.parseFrontmatter(content);
    expect(result.frontmatter.title).toBe("My Post");
    expect(result.frontmatter.publish).toBe(true);
    expect(result.body).toContain("# Body");
  });

  it("boolean false 값을 파싱한다", () => {
    const content = "---\ndraft: false\n---\n\nBody";
    const result = transformer.parseFrontmatter(content);
    expect(result.frontmatter.draft).toBe(false);
  });

  it("숫자 값을 파싱한다", () => {
    const content = "---\norder: 42\n---\n\nBody";
    const result = transformer.parseFrontmatter(content);
    expect(result.frontmatter.order).toBe(42);
  });

  it("따옴표로 감싼 문자열 값을 파싱한다", () => {
    const content = '---\ntitle: "Hello World"\n---\n\nBody';
    const result = transformer.parseFrontmatter(content);
    expect(result.frontmatter.title).toBe("Hello World");
  });

  it("단따옴표로 감싼 문자열 값을 파싱한다", () => {
    const content = "---\ntitle: 'Hello World'\n---\n\nBody";
    const result = transformer.parseFrontmatter(content);
    expect(result.frontmatter.title).toBe("Hello World");
  });

  it("raw 값에 원본 YAML 문자열을 저장한다", () => {
    const content = "---\ntitle: My Post\n---\n\nBody";
    const result = transformer.parseFrontmatter(content);
    expect(result.raw).toBe("title: My Post");
  });
});

// ============================================================================
// addPublishFlag
// ============================================================================

describe("ContentTransformer - addPublishFlag", () => {
  let transformer: ContentTransformer;

  beforeEach(() => {
    ({ transformer } = createTransformer());
  });

  it("프론트매터가 없는 경우 새 프론트매터를 생성한다", () => {
    const content = "# Hello World\n\nContent here.";
    const result = transformer.addPublishFlag(content);
    expect(result).toContain("publish: true");
    expect(result).toContain("# Hello World");
  });

  it("기존 프론트매터에 publish 플래그를 추가한다", () => {
    const content = "---\ntitle: My Post\n---\n\n# Body";
    const result = transformer.addPublishFlag(content);
    expect(result).toContain("publish: true");
    expect(result).toContain("title: My Post");
  });

  it("이미 publish: true가 있으면 변경하지 않는다", () => {
    const content = "---\npublish: true\ntitle: My Post\n---\n\n# Body";
    const result = transformer.addPublishFlag(content);
    // 중복 추가 없음
    const count = (result.match(/publish: true/g) || []).length;
    expect(count).toBe(1);
  });
});

// ============================================================================
// addDateFields
// ============================================================================

describe("ContentTransformer - addDateFields", () => {
  let transformer: ContentTransformer;

  beforeEach(() => {
    ({ transformer } = createTransformer());
  });

  it("enableTitle이 true면 title 필드를 추가한다", () => {
    const file = createMockFile("Blog/hello-world.md");
    const content = "---\n---\n\n# Body";
    const settings = { ...DEFAULT_AUTO_DATE_SETTINGS, enableTitle: true };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("title:");
  });

  it("title 필드가 이미 있으면 덮어쓰지 않는다", () => {
    const file = createMockFile("Notes/note.md");
    const content = '---\ntitle: "Existing Title"\n---\n\n# Body';
    const settings = { ...DEFAULT_AUTO_DATE_SETTINGS, enableTitle: true };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("Existing Title");
    // "Existing Title"이 title 값으로 유지되어야 함
    const count = (result.match(/title:/g) || []).length;
    expect(count).toBe(1);
  });

  it("모든 날짜 설정이 false면 콘텐츠가 변경되지 않는다", () => {
    const file = createMockFile("Notes/note.md");
    const content = "---\ntitle: My Note\n---\n\n# Body";
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: false,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: false,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toBe(content);
  });

  it("enableCreated가 true면 created 필드를 추가한다", () => {
    const file = createMockFile("Notes/note.md");
    const content = "---\ntitle: Test\n---\n\n# Body";
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: true,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: false,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("created:");
  });
});

// ============================================================================
// getRemotePath
// ============================================================================

describe("ContentTransformer - getRemotePath", () => {
  it("frontmatter.path가 없으면 볼트 경로를 사용한다", () => {
    const { transformer } = createTransformer("content");
    const file = createMockFile("Notes/hello.md");
    const result = transformer.getRemotePath(file as unknown as import("obsidian").TFile, {});
    expect(result).toBe("content/Notes/hello.md");
  });

  it("frontmatter.path가 있으면 해당 경로를 사용한다", () => {
    const { transformer } = createTransformer("content");
    const file = createMockFile("Notes/hello.md");
    const result = transformer.getRemotePath(file as unknown as import("obsidian").TFile, {
      path: "blog/my-post",
    });
    expect(result).toBe("content/blog/my-post.md");
  });

  it("frontmatter.path에 이미 .md 확장자가 있으면 중복 추가하지 않는다", () => {
    const { transformer } = createTransformer("content");
    const file = createMockFile("Notes/hello.md");
    const result = transformer.getRemotePath(file as unknown as import("obsidian").TFile, {
      path: "blog/my-post.md",
    });
    expect(result).toBe("content/blog/my-post.md");
  });

  it("공백만 있는 frontmatter.path는 무시한다", () => {
    const { transformer } = createTransformer("content");
    const file = createMockFile("Notes/hello.md");
    const result = transformer.getRemotePath(file as unknown as import("obsidian").TFile, {
      path: "   ",
    });
    expect(result).toBe("content/Notes/hello.md");
  });

  it("커스텀 contentPath를 반영한다", () => {
    const { transformer } = createTransformer("posts");
    const file = createMockFile("Notes/hello.md");
    const result = transformer.getRemotePath(file as unknown as import("obsidian").TFile, {});
    expect(result).toBe("posts/Notes/hello.md");
  });
});

// ============================================================================
// validateFrontmatter
// ============================================================================

describe("ContentTransformer - validateFrontmatter", () => {
  let transformer: ContentTransformer;

  const defaultSettings: FrontmatterValidationSettings = {
    enabled: true,
    requireTitle: false,
    requireDescription: false,
    requireTags: false,
  };

  beforeEach(() => {
    ({ transformer } = createTransformer());
  });

  it("설정이 비활성화되면 항상 유효하다", () => {
    const result = transformer.validateFrontmatter({}, { ...defaultSettings, enabled: false });
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("requireTitle이 true이고 title이 없으면 경고를 반환한다", () => {
    const result = transformer.validateFrontmatter({}, { ...defaultSettings, requireTitle: true });
    expect(result.isValid).toBe(true); // warning은 isValid를 false로 만들지 않음
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.field === "title")).toBe(true);
  });

  it("requireDescription이 true이고 description이 없으면 경고를 반환한다", () => {
    const result = transformer.validateFrontmatter(
      {},
      { ...defaultSettings, requireDescription: true }
    );
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.field === "description")).toBe(true);
  });

  it("requireTags가 true이고 tags가 없으면 경고를 반환한다", () => {
    const result = transformer.validateFrontmatter({}, { ...defaultSettings, requireTags: true });
    expect(result.issues.some((i) => i.field === "tags")).toBe(true);
  });

  it("draft: true와 publish: true 동시 설정 시 경고를 반환한다", () => {
    const result = transformer.validateFrontmatter({ draft: true, publish: true }, defaultSettings);
    expect(result.issues.some((i) => i.field === "draft")).toBe(true);
  });

  it("description이 160자를 초과하면 info 이슈를 반환한다", () => {
    const longDesc = "A".repeat(161);
    const result = transformer.validateFrontmatter({ description: longDesc }, defaultSettings);
    expect(result.issues.some((i) => i.field === "description" && i.severity === "info")).toBe(
      true
    );
  });

  it("description이 160자 이하면 info 이슈가 없다", () => {
    const desc = "A".repeat(160);
    const result = transformer.validateFrontmatter({ description: desc }, defaultSettings);
    expect(result.issues.some((i) => i.field === "description" && i.severity === "info")).toBe(
      false
    );
  });

  it("모든 조건 충족 시 이슈가 없다", () => {
    const result = transformer.validateFrontmatter(
      { title: "My Post", description: "Short desc", tags: ["tag1"] },
      { ...defaultSettings, requireTitle: true, requireDescription: true, requireTags: true }
    );
    expect(result.issues).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// extractAttachments
// ============================================================================

describe("ContentTransformer - extractAttachments", () => {
  let transformer: ContentTransformer;

  beforeEach(() => {
    ({ transformer } = createTransformer("content", "static"));
  });

  it("이미지 임베드에서 첨부파일을 추출한다", () => {
    const content = "Some text\n![[image.png]]\nMore text";
    const result = transformer.extractAttachments(content, "note", "Notes/note.md");
    expect(result).toHaveLength(1);
    expect(result[0].remotePath).toContain("content/attachments/image.png");
    expect(result[0].contentPath).toBe("attachments/image.png");
  });

  it("여러 이미지를 추출한다", () => {
    const content = "![[img1.jpg]]\n\n![[img2.png]]";
    const result = transformer.extractAttachments(content, "note", "Notes/note.md");
    expect(result).toHaveLength(2);
  });

  it("이미지 임베드가 없으면 빈 배열을 반환한다", () => {
    const content = "# Just text\n\nNo images here.";
    const result = transformer.extractAttachments(content, "note", "Notes/note.md");
    expect(result).toHaveLength(0);
  });

  it("다양한 이미지 확장자를 지원한다", () => {
    const content = "![[a.jpg]]\n![[b.jpeg]]\n![[c.gif]]\n![[d.svg]]\n![[e.webp]]\n![[f.bmp]]";
    const result = transformer.extractAttachments(content, "note", "Notes/note.md");
    expect(result).toHaveLength(6);
  });

  it("경로가 포함된 이미지 임베드를 처리한다", () => {
    const content = "![[subfolder/image.png]]";
    const result = transformer.extractAttachments(content, "note", "Notes/note.md");
    expect(result).toHaveLength(1);
    expect(result[0].remotePath).toContain("image.png");
  });
});

// ============================================================================
// addDateFields - generateDescription
// ============================================================================

describe("ContentTransformer - addDateFields - enableDescription", () => {
  let transformer: ContentTransformer;

  beforeEach(() => {
    ({ transformer } = createTransformer());
  });

  it("enableDescription이 true면 첫 문단에서 description을 생성한다", () => {
    const file = createMockFile("Notes/note.md");
    const content = "---\ntitle: Test\n---\n\nThis is the first paragraph.\n\n## Heading below";
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: false,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: true,
      descriptionMaxLength: 160,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("description:");
    expect(result).toContain("This is the first paragraph");
  });

  it("헤딩으로 시작하는 문단은 건너뛰고 다음 문단을 사용한다", () => {
    const file = createMockFile("Notes/note.md");
    const content = "---\ntitle: Test\n---\n\n# Heading\n\nActual paragraph text here.";
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: false,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: true,
      descriptionMaxLength: 160,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("description:");
    expect(result).toContain("Actual paragraph text here");
  });

  it("description이 maxLength를 초과하면 줄임표로 자른다", () => {
    const file = createMockFile("Notes/note.md");
    const longText = "A".repeat(200);
    const content = `---\ntitle: Test\n---\n\n${longText}`;
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: false,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: true,
      descriptionMaxLength: 50,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    expect(result).toContain("...");
  });

  it("리스트로만 구성된 경우 description이 추가되지 않는다", () => {
    const file = createMockFile("Notes/note.md");
    const content = "---\ntitle: Test\n---\n\n- item1\n- item2\n- item3";
    const settings = {
      ...DEFAULT_AUTO_DATE_SETTINGS,
      enableCreated: false,
      enableModified: false,
      enablePublished: false,
      enableTitle: false,
      enableDescription: true,
      descriptionMaxLength: 160,
    };
    const result = transformer.addDateFields(
      content,
      file as unknown as import("obsidian").TFile,
      settings
    );
    // No text paragraphs, so no description added
    expect(result).not.toContain("description:");
  });
});
