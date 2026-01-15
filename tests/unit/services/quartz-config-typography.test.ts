import { describe, it, expect } from 'vitest';
import { QuartzConfigService } from '../../../src/services/quartz-config';
import { DEFAULT_TYPOGRAPHY_CONFIG } from '../../../src/types';

// Mock GitHubService
const mockGitHubService = {
	getFile: async () => null,
	createOrUpdateFile: async () => ({ success: true }),
} as any;

describe('QuartzConfigService - Typography', () => {
	const service = new QuartzConfigService(mockGitHubService);

	const validConfig = `
const config: QuartzConfig = {
  configuration: {
    pageTitle: "🪴 Quartz 4.0",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "quartz.jzhao.xyz",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedTimestamp({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}
  `;

	it('should parse typography correctly', () => {
		const parsed = service.parseExtendedConfig(validConfig);
		expect(parsed?.typography).toEqual({
			header: 'Schibsted Grotesk',
			body: 'Source Sans Pro',
			code: 'IBM Plex Mono',
		});
	});

	it('should use default typography if missing', () => {
		const configWithoutTypography = validConfig.replace(/typography: \{[^}]+\},/, '');
		const parsed = service.parseExtendedConfig(configWithoutTypography);
		expect(parsed?.typography).toEqual(DEFAULT_TYPOGRAPHY_CONFIG);
	});

	it('should update typography correctly', () => {
		const newTypography = {
			header: 'Roboto',
			body: 'Open Sans',
			code: 'Fira Code',
		};

		const updatedContent = service['updateTypography'](validConfig, newTypography);

		expect(updatedContent).toContain('header: "Roboto"');
		expect(updatedContent).toContain('body: "Open Sans"');
		expect(updatedContent).toContain('code: "Fira Code"');
		expect(updatedContent).not.toContain('header: "Schibsted Grotesk"');
	});

	it('should not break if typography block is missing when updating', () => {
		const configWithoutTypography = validConfig.replace(/typography: \{[^}]+\},/, '');
		const updatedContent = service['updateTypography'](configWithoutTypography, {
			header: 'Roboto',
			body: 'Open Sans',
			code: 'Fira Code',
		});

		// Should remain unchanged as regex won't match
		expect(updatedContent).toBe(configWithoutTypography);
	});
});
