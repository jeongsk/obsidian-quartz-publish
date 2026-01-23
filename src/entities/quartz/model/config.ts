/**
 * Quartz Config Service
 *
 * quartz.config.ts 파일을 파싱하고 수정하는 서비스
 */

import type { GitHubService } from "../../github/model/service";
import {
  DEFAULT_QUARTZ_SITE_CONFIG,
  DEFAULT_COMMENTS_CONFIG,
  DEFAULT_TYPOGRAPHY_CONFIG,
  type QuartzConfigFile,
  type QuartzSiteConfig,
  type AnalyticsConfig,
  type CommentsConfig,
  type TypographyConfig,
  type GiscusConfig,
  type ConfigUpdateResult,
} from "../../../app/types";

/**
 * 파싱된 Quartz 설정 (기존 호환성)
 */
export interface ParsedQuartzConfig {
  /** ExplicitPublish 필터 활성화 여부 */
  explicitPublish: boolean;
  /** 제외 패턴 목록 */
  ignorePatterns: string[];
  /** 원본 파일 내용 */
  rawContent: string;
}

/**
 * 확장된 파싱 결과 (Phase 4)
 */
export interface ExtendedParsedConfig extends ParsedQuartzConfig {
  /** 페이지 제목 */
  pageTitle: string;
  /** 기본 URL */
  baseUrl: string;
  /** 로케일 */
  locale: string;
  /** SPA 모드 */
  enableSPA: boolean;
  /** 팝오버 활성화 */
  enablePopovers: boolean;
  /** 기본 날짜 타입 */
  defaultDateType: "created" | "modified" | "published";
  /** 애널리틱스 설정 */
  analytics: AnalyticsConfig;
  /** 댓글 설정 */
  comments: CommentsConfig;
  /** 타이포그래피 설정 */
  typography: TypographyConfig;
}

/**
 * 설정 변경 결과
 */
export interface ConfigChangeResult {
  success: boolean;
  newContent?: string;
  error?: string;
}

/**
 * Quartz 설정 서비스 클래스
 */
export class QuartzConfigService {
  private github: GitHubService;
  private cachedConfig: QuartzConfigFile | null = null;

  constructor(github: GitHubService) {
    this.github = github;
  }

  /**
   * quartz.config.ts 파일 내용을 파싱
   *
   * @param content 파일 내용
   * @returns 파싱된 설정 또는 null (파싱 실패 시)
   */
  parseConfig(content: string): ParsedQuartzConfig | null {
    try {
      // ExplicitPublish 확인 (filters 배열 내 Plugin.ExplicitPublish() 존재 여부)
      const hasExplicitPublish = /Plugin\.ExplicitPublish\(\)/.test(content);

      // ignorePatterns 추출
      const ignorePatterns = this.parseIgnorePatterns(content);

      return {
        explicitPublish: hasExplicitPublish,
        ignorePatterns,
        rawContent: content,
      };
    } catch {
      return null;
    }
  }

  /**
   * ignorePatterns 배열 추출
   */
  private parseIgnorePatterns(content: string): string[] {
    // ignorePatterns: ["pattern1", "pattern2"] 형식 매칭
    const match = content.match(/ignorePatterns\s*[:=]\s*\[([^\]]*)\]/);
    if (!match) {
      return [];
    }
    return this.parseStringArray(match[1]);
  }

  /**
   * configuration 블록의 위치를 찾습니다 (중첩 객체 처리)
   * @param content 파일 내용
   * @returns 블록 정보 또는 null
   */
  private findConfigurationBlock(content: string): {
    startIndex: number;
    endIndex: number;
    blockContent: string;
  } | null {
    // "configuration:" 찾기
    const configStartMatch = content.match(/configuration\s*:\s*\{/);
    if (!configStartMatch || configStartMatch.index === undefined) {
      return null;
    }

    const openBraceIndex = content.indexOf("{", configStartMatch.index);
    let depth = 1;
    let i = openBraceIndex + 1;

    // 중첩된 괄호를 추적하면서 configuration 블록 끝 찾기
    while (i < content.length && depth > 0) {
      const char = content[i];
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
      }
      i++;
    }

    if (depth !== 0) {
      return null;
    }

    return {
      startIndex: configStartMatch.index,
      endIndex: i,
      blockContent: content.slice(openBraceIndex + 1, i - 1),
    };
  }

  /**
   * 문자열 배열 파싱 헬퍼
   * 예: '"pattern1", "pattern2"' -> ['pattern1', 'pattern2']
   */
  parseStringArray(arrayContent: string): string[] {
    const patterns: string[] = [];

    // 문자열 리터럴 매칭 (쌍따옴표 또는 홑따옴표)
    const stringPattern = /["']([^"']+)["']/g;
    let match;
    while ((match = stringPattern.exec(arrayContent)) !== null) {
      patterns.push(match[1]);
    }

    return patterns;
  }

  /**
   * ExplicitPublish 설정 변경
   *
   * @param content 현재 파일 내용
   * @param enabled 활성화 여부
   * @returns 변경 결과
   */
  setExplicitPublish(content: string, enabled: boolean): ConfigChangeResult {
    // filters 배열 찾기
    const filterPattern = /filters\s*:\s*\[([^\]]*)\]/;
    const match = content.match(filterPattern);

    if (!match) {
      return { success: false, error: "filters 배열을 찾을 수 없습니다" };
    }

    const currentFilters = match[1];
    const newFilter = enabled ? "Plugin.ExplicitPublish()" : "Plugin.RemoveDrafts()";
    const oldFilter = enabled ? "Plugin.RemoveDrafts()" : "Plugin.ExplicitPublish()";

    let newFilters: string;

    // 기존 필터가 있으면 교체
    if (currentFilters.includes(oldFilter)) {
      newFilters = currentFilters.replace(oldFilter, newFilter);
    } else if (currentFilters.includes(newFilter)) {
      // 이미 원하는 필터가 있으면 변경 없음
      return { success: true, newContent: content };
    } else {
      // 둘 다 없으면 필터 추가
      const trimmed = currentFilters.trim();
      newFilters = trimmed ? `${trimmed}, ${newFilter}` : newFilter;
    }

    const newContent = content.replace(filterPattern, `filters: [${newFilters}]`);

    return { success: true, newContent };
  }

  /**
   * ignorePatterns 설정 변경
   *
   * @param content 현재 파일 내용
   * @param patterns 새 패턴 배열
   * @returns 변경 결과
   */
  setIgnorePatterns(content: string, patterns: string[]): ConfigChangeResult {
    // 패턴 배열을 문자열로 변환
    const patternsStr = patterns.map((p) => `"${p}"`).join(", ");
    const newIgnorePatterns = `ignorePatterns: [${patternsStr}]`;

    // 기존 ignorePatterns 찾기
    const ignorePattern = /ignorePatterns\s*[:=]\s*\[[^\]]*\]/;
    const match = content.match(ignorePattern);

    if (match) {
      // 기존 패턴 교체
      const newContent = content.replace(ignorePattern, newIgnorePatterns);
      return { success: true, newContent };
    }

    // ignorePatterns가 없는 경우 - configuration 블록에 추가
    const configBlock = this.findConfigurationBlock(content);

    if (configBlock) {
      const blockContent = configBlock.blockContent.trimEnd();
      // 마지막 콘텐츠 뒤에 쉼표가 없으면 추가
      const needsComma = blockContent.length > 0 && !blockContent.endsWith(",");
      const separator = needsComma ? "," : "";
      const newBlockContent = `${blockContent}${separator}\n    ${newIgnorePatterns},\n  `;
      const newContent =
        content.slice(0, configBlock.startIndex) +
        `configuration: {${newBlockContent}}` +
        content.slice(configBlock.endIndex);
      return { success: true, newContent };
    }

    return { success: false, error: "configuration 블록을 찾을 수 없습니다" };
  }

  /**
   * GitHub에서 quartz.config.ts 파일 조회
   *
   * @param forceRefresh 캐시 무시 여부
   * @returns 설정 파일 정보 또는 null
   */
  async fetchQuartzConfig(forceRefresh = false): Promise<QuartzConfigFile | null> {
    // 캐시가 있고 강제 새로고침이 아니면 캐시 반환
    if (this.cachedConfig && !forceRefresh) {
      return this.cachedConfig;
    }

    const file = await this.github.getFile("quartz.config.ts");
    if (!file) {
      return null;
    }

    this.cachedConfig = {
      path: "quartz.config.ts",
      sha: file.sha,
      content: file.content,
      lastFetched: Date.now(),
    };

    return this.cachedConfig;
  }

  /**
   * 설정 변경 사항을 GitHub에 커밋
   *
   * @param newContent 새 파일 내용
   * @param message 커밋 메시지
   * @returns 커밋 결과
   */
  async commitConfigChange(
    newContent: string,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    // 현재 파일의 SHA 필요
    const config = await this.fetchQuartzConfig(true);
    if (!config) {
      return { success: false, error: "quartz.config.ts 파일을 찾을 수 없습니다" };
    }

    const result = await this.github.createOrUpdateFile(
      "quartz.config.ts",
      newContent,
      message,
      config.sha
    );

    if (result.success) {
      // 캐시 업데이트
      this.cachedConfig = {
        path: "quartz.config.ts",
        sha: result.sha!,
        content: newContent,
        lastFetched: Date.now(),
      };
    }

    return result;
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(): void {
    this.cachedConfig = null;
  }

  /**
   * 캐시된 SHA 반환
   */
  getCachedSha(): string | null {
    return this.cachedConfig?.sha ?? null;
  }

  // ============================================================================
  // Extended Config Parsing (T015-T016)
  // ============================================================================

  /**
   * pageTitle 추출
   */
  private parsePageTitle(content: string): string {
    const match = content.match(/pageTitle\s*:\s*["']([^"']+)["']/);
    return match?.[1] ?? DEFAULT_QUARTZ_SITE_CONFIG.pageTitle;
  }

  /**
   * baseUrl 추출
   */
  private parseBaseUrl(content: string): string {
    const match = content.match(/baseUrl\s*:\s*["']([^"']+)["']/);
    return match?.[1] ?? DEFAULT_QUARTZ_SITE_CONFIG.baseUrl;
  }

  /**
   * locale 추출
   */
  private parseLocale(content: string): string {
    const match = content.match(/locale\s*:\s*["']([^"']+)["']/);
    return match?.[1] ?? DEFAULT_QUARTZ_SITE_CONFIG.locale;
  }

  /**
   * enableSPA 추출
   */
  private parseEnableSPA(content: string): boolean {
    const match = content.match(/enableSPA\s*:\s*(true|false)/);
    if (!match) return DEFAULT_QUARTZ_SITE_CONFIG.enableSPA;
    return match[1] === "true";
  }

  /**
   * enablePopovers 추출
   */
  private parseEnablePopovers(content: string): boolean {
    const match = content.match(/enablePopovers\s*:\s*(true|false)/);
    if (!match) return DEFAULT_QUARTZ_SITE_CONFIG.enablePopovers;
    return match[1] === "true";
  }

  /**
   * defaultDateType 추출
   */
  private parseDefaultDateType(content: string): "created" | "modified" | "published" {
    const match = content.match(/defaultDateType\s*:\s*["'](\w+)["']/);
    const value = match?.[1];
    if (value === "modified" || value === "published") {
      return value;
    }
    return "created";
  }

  private parseComments(content: string): CommentsConfig {
    const commentsMatch = content.match(
      /Component\.Comments\s*\(\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*\)/s
    );

    if (!commentsMatch) {
      return DEFAULT_COMMENTS_CONFIG;
    }

    const commentsBlock = commentsMatch[1];

    const providerMatch = commentsBlock.match(/provider\s*:\s*["'](\w+)["']/);
    const provider = providerMatch?.[1] ?? "null";

    if (provider !== "giscus") {
      return DEFAULT_COMMENTS_CONFIG;
    }

    const optionsMatch = commentsBlock.match(/options\s*:\s*\{([^}]*)\}/s);
    if (!optionsMatch) {
      return DEFAULT_COMMENTS_CONFIG;
    }

    const optionsBlock = optionsMatch[1];

    const repo = this.extractStringValue(optionsBlock, "repo") ?? "";
    const repoId = this.extractStringValue(optionsBlock, "repoId") ?? "";
    const category = this.extractStringValue(optionsBlock, "category") ?? "";
    const categoryId = this.extractStringValue(optionsBlock, "categoryId") ?? "";

    if (!repo || !repoId || !category || !categoryId) {
      return DEFAULT_COMMENTS_CONFIG;
    }

    const giscusConfig: GiscusConfig = {
      repo: repo as `${string}/${string}`,
      repoId,
      category,
      categoryId,
      themeUrl: this.extractStringValue(optionsBlock, "themeUrl"),
      lightTheme: this.extractStringValue(optionsBlock, "lightTheme"),
      darkTheme: this.extractStringValue(optionsBlock, "darkTheme"),
      mapping: this.extractStringValue(optionsBlock, "mapping") as GiscusConfig["mapping"],
      strict: this.extractBooleanValue(optionsBlock, "strict"),
      reactionsEnabled: this.extractBooleanValue(optionsBlock, "reactionsEnabled"),
      inputPosition: this.extractStringValue(
        optionsBlock,
        "inputPosition"
      ) as GiscusConfig["inputPosition"],
      lang: this.extractStringValue(optionsBlock, "lang"),
    };

    return { provider: "giscus", options: giscusConfig };
  }

  private parseTypography(content: string): TypographyConfig {
    const typographyMatch = content.match(/typography\s*:\s*\{([^}]*)\}/s);
    if (!typographyMatch) {
      return DEFAULT_TYPOGRAPHY_CONFIG;
    }

    const typographyBlock = typographyMatch[1];
    const header = this.extractStringValue(typographyBlock, "header");
    const body = this.extractStringValue(typographyBlock, "body");
    const code = this.extractStringValue(typographyBlock, "code");

    return {
      header: header ?? DEFAULT_TYPOGRAPHY_CONFIG.header,
      body: body ?? DEFAULT_TYPOGRAPHY_CONFIG.body,
      code: code ?? DEFAULT_TYPOGRAPHY_CONFIG.code,
    };
  }

  private updateTypography(content: string, typography: TypographyConfig): string {
    const typographyStr = `typography: {
        header: "${typography.header}",
        body: "${typography.body}",
        code: "${typography.code}",
      }`;

    const typographyPattern = /typography\s*:\s*\{[^}]*\}/s;
    if (typographyPattern.test(content)) {
      return content.replace(typographyPattern, typographyStr);
    }

    return content;
  }

  private extractStringValue(block: string, key: string): string | undefined {
    const match = block.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
    return match?.[1];
  }

  private extractBooleanValue(block: string, key: string): boolean | undefined {
    const match = block.match(new RegExp(`${key}\\s*:\\s*(true|false)`));
    if (!match) return undefined;
    return match[1] === "true";
  }

  private parseAnalytics(content: string): AnalyticsConfig {
    // analytics: { provider: "...", ... } 블록 찾기
    const analyticsMatch = content.match(/analytics\s*:\s*\{([^}]*)\}/s);

    if (!analyticsMatch) {
      return { provider: "null" };
    }

    const analyticsBlock = analyticsMatch[1];

    // provider 추출
    const providerMatch = analyticsBlock.match(/provider\s*:\s*["'](\w+)["']/);
    const provider = providerMatch?.[1] ?? "null";

    switch (provider) {
      case "google": {
        const tagIdMatch = analyticsBlock.match(/tagId\s*:\s*["']([^"']+)["']/);
        return {
          provider: "google",
          tagId: tagIdMatch?.[1] ?? "",
        };
      }

      case "plausible": {
        const hostMatch = analyticsBlock.match(/host\s*:\s*["']([^"']+)["']/);
        if (hostMatch) {
          return {
            provider: "plausible",
            host: hostMatch[1],
          };
        }
        return { provider: "plausible" };
      }

      case "umami": {
        const websiteIdMatch = analyticsBlock.match(/websiteId\s*:\s*["']([^"']+)["']/);
        const hostMatch = analyticsBlock.match(/host\s*:\s*["']([^"']+)["']/);
        return {
          provider: "umami",
          websiteId: websiteIdMatch?.[1] ?? "",
          host: hostMatch?.[1] ?? "",
        };
      }

      default:
        return { provider: "null" };
    }
  }

  /**
   * 확장된 설정 파싱 (T016)
   */
  parseExtendedConfig(content: string): ExtendedParsedConfig | null {
    const baseConfig = this.parseConfig(content);
    if (!baseConfig) {
      return null;
    }

    return {
      ...baseConfig,
      pageTitle: this.parsePageTitle(content),
      baseUrl: this.parseBaseUrl(content),
      locale: this.parseLocale(content),
      enableSPA: this.parseEnableSPA(content),
      enablePopovers: this.parseEnablePopovers(content),
      defaultDateType: this.parseDefaultDateType(content),
      analytics: this.parseAnalytics(content),
      comments: this.parseComments(content),
      typography: this.parseTypography(content),
    };
  }

  /**
   * ExtendedParsedConfig를 QuartzSiteConfig로 변환
   */
  toQuartzSiteConfig(parsed: ExtendedParsedConfig): QuartzSiteConfig {
    return {
      pageTitle: parsed.pageTitle,
      baseUrl: parsed.baseUrl,
      locale: parsed.locale,
      enableSPA: parsed.enableSPA,
      enablePopovers: parsed.enablePopovers,
      defaultDateType: parsed.defaultDateType,
      analytics: parsed.analytics,
      comments: parsed.comments,
      explicitPublish: parsed.explicitPublish,
      ignorePatterns: parsed.ignorePatterns,
      typography: parsed.typography,
    };
  }

  // ============================================================================
  // Config Serialization (T017)
  // ============================================================================

  /**
   * 설정 값을 파일 내용에 반영 (T017)
   */
  serializeConfig(config: QuartzSiteConfig, originalContent: string): string {
    let content = originalContent;

    // pageTitle 업데이트
    content = this.updateStringField(content, "pageTitle", config.pageTitle);

    // baseUrl 업데이트
    content = this.updateStringField(content, "baseUrl", config.baseUrl);

    // locale 업데이트
    content = this.updateStringField(content, "locale", config.locale);

    // enableSPA 업데이트
    content = this.updateBooleanField(content, "enableSPA", config.enableSPA);

    // enablePopovers 업데이트
    content = this.updateBooleanField(content, "enablePopovers", config.enablePopovers);

    // defaultDateType 업데이트
    content = this.updateStringField(content, "defaultDateType", config.defaultDateType);

    // analytics 업데이트
    content = this.updateAnalytics(content, config.analytics);

    // comments 업데이트
    content = this.updateComments(content, config.comments);

    // typography 업데이트
    content = this.updateTypography(content, config.typography);

    // 기존 설정 업데이트 (ExplicitPublish)
    const explicitResult = this.setExplicitPublish(content, config.explicitPublish);
    if (explicitResult.success && explicitResult.newContent) {
      content = explicitResult.newContent;
    }

    // ignorePatterns 업데이트
    const patternsResult = this.setIgnorePatterns(content, config.ignorePatterns);
    if (patternsResult.success && patternsResult.newContent) {
      content = patternsResult.newContent;
    }

    return content;
  }

  /**
   * 문자열 필드 업데이트 헬퍼
   */
  private updateStringField(content: string, fieldName: string, value: string): string {
    const pattern = new RegExp(`(${fieldName}\\s*:\\s*)["'][^"']*["']`);
    const replacement = `$1"${value}"`;
    return content.replace(pattern, replacement);
  }

  /**
   * 불리언 필드 업데이트 헬퍼
   */
  private updateBooleanField(content: string, fieldName: string, value: boolean): string {
    const pattern = new RegExp(`(${fieldName}\\s*:\\s*)(true|false)`);
    const replacement = `$1${value}`;
    return content.replace(pattern, replacement);
  }

  /**
   * analytics 설정 업데이트
   */
  private updateAnalytics(content: string, analytics: AnalyticsConfig): string {
    // analytics 블록 생성
    let analyticsStr: string;

    switch (analytics.provider) {
      case "null":
        analyticsStr = `analytics: {\n    provider: "null",\n  }`;
        break;

      case "google":
        analyticsStr = `analytics: {\n    provider: "google",\n    tagId: "${analytics.tagId}",\n  }`;
        break;

      case "plausible":
        if (analytics.host) {
          analyticsStr = `analytics: {\n    provider: "plausible",\n    host: "${analytics.host}",\n  }`;
        } else {
          analyticsStr = `analytics: {\n    provider: "plausible",\n  }`;
        }
        break;

      case "umami":
        analyticsStr = `analytics: {\n    provider: "umami",\n    websiteId: "${analytics.websiteId}",\n    host: "${analytics.host}",\n  }`;
        break;

      default:
        analyticsStr = `analytics: {\n    provider: "null",\n  }`;
    }

    // 기존 analytics 블록 교체
    const analyticsPattern = /analytics\s*:\s*\{[^}]*\}/s;
    if (analyticsPattern.test(content)) {
      return content.replace(analyticsPattern, analyticsStr);
    }

    return content;
  }

  private updateComments(content: string, comments: CommentsConfig): string {
    if (comments.provider === "null") {
      const commentsPattern = /Component\.Comments\s*\([^)]*(?:\([^)]*\)[^)]*)*\)\s*,?\s*/s;
      return content.replace(commentsPattern, "");
    }

    const opts = comments.options;
    const optionalFields: string[] = [];

    if (opts.themeUrl) optionalFields.push(`themeUrl: "${opts.themeUrl}"`);
    if (opts.lightTheme) optionalFields.push(`lightTheme: "${opts.lightTheme}"`);
    if (opts.darkTheme) optionalFields.push(`darkTheme: "${opts.darkTheme}"`);
    if (opts.mapping) optionalFields.push(`mapping: "${opts.mapping}"`);
    if (opts.strict !== undefined) optionalFields.push(`strict: ${opts.strict}`);
    if (opts.reactionsEnabled !== undefined)
      optionalFields.push(`reactionsEnabled: ${opts.reactionsEnabled}`);
    if (opts.inputPosition) optionalFields.push(`inputPosition: "${opts.inputPosition}"`);
    if (opts.lang) optionalFields.push(`lang: "${opts.lang}"`);

    const optionalStr =
      optionalFields.length > 0 ? `\n        ${optionalFields.join(",\n        ")},` : "";

    const commentsStr = `Component.Comments({
      provider: 'giscus',
      options: {
        repo: '${opts.repo}',
        repoId: '${opts.repoId}',
        category: '${opts.category}',
        categoryId: '${opts.categoryId}',${optionalStr}
      },
    })`;

    const existingPattern = /Component\.Comments\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/s;
    if (existingPattern.test(content)) {
      return content.replace(existingPattern, commentsStr);
    }

    const afterBodyPattern = /(afterBody\s*:\s*\[)/;
    if (afterBodyPattern.test(content)) {
      return content.replace(afterBodyPattern, `$1\n    ${commentsStr},`);
    }

    return content;
  }

  // ============================================================================
  // Load & Save Config (T018-T020)
  // ============================================================================

  /**
   * 설정 로드 (확장 버전) (T018)
   */
  async loadConfig(): Promise<{
    config: QuartzSiteConfig;
    sha: string;
  } | null> {
    const configFile = await this.fetchQuartzConfig(true);
    if (!configFile) {
      return null;
    }

    const parsed = this.parseExtendedConfig(configFile.content);
    if (!parsed) {
      return null;
    }

    return {
      config: this.toQuartzSiteConfig(parsed),
      sha: configFile.sha,
    };
  }

  /**
   * 원격 파일 SHA 조회 (T019)
   */
  async getRemoteSha(): Promise<string | null> {
    const configFile = await this.fetchQuartzConfig(true);
    return configFile?.sha ?? null;
  }

  /**
   * 설정 저장 (SHA 검증 포함) (T020)
   */
  async saveConfig(
    config: QuartzSiteConfig,
    originalSha: string,
    commitMessage: string
  ): Promise<ConfigUpdateResult> {
    try {
      // 원격 SHA 확인
      const remoteSha = await this.getRemoteSha();
      if (!remoteSha) {
        return {
          success: false,
          errorType: "network",
          errorMessage: "quartz.config.ts 파일을 찾을 수 없습니다",
        };
      }

      // SHA 불일치 (충돌) 확인
      if (remoteSha !== originalSha) {
        return {
          success: false,
          errorType: "conflict",
          errorMessage: "원격 파일이 변경되었습니다. 최신 설정을 다시 불러와 주세요.",
        };
      }

      // 현재 파일 내용 가져오기
      const configFile = await this.fetchQuartzConfig();
      if (!configFile) {
        return {
          success: false,
          errorType: "network",
          errorMessage: "설정 파일을 불러올 수 없습니다",
        };
      }

      // 설정 직렬화
      const newContent = this.serializeConfig(config, configFile.content);

      // GitHub에 커밋
      const result = await this.github.createOrUpdateFile(
        "quartz.config.ts",
        newContent,
        commitMessage,
        originalSha
      );

      if (result.success) {
        // 캐시 업데이트
        this.cachedConfig = {
          path: "quartz.config.ts",
          sha: result.sha!,
          content: newContent,
          lastFetched: Date.now(),
        };

        return {
          success: true,
          newSha: result.sha,
          commitSha: result.commitSha,
        };
      }

      return {
        success: false,
        errorType: "unknown",
        errorMessage: result.error ?? "알 수 없는 오류가 발생했습니다",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return {
        success: false,
        errorType: "network",
        errorMessage: message,
      };
    }
  }
}
