import type { TFile, MetadataCache } from "obsidian";
import type { PublishFilterSettings } from "../types";
import { DEFAULT_PUBLISH_FILTER_SETTINGS } from "../types";
import { isPathInFolder, isPathInAnyFolder, stripRootFolder } from "../utils/path-matcher";

export interface PublishFilterServiceOptions {
  metadataCache: MetadataCache;
  getSettings: () => PublishFilterSettings;
}

export class PublishFilterService {
  private metadataCache: MetadataCache;
  private getSettings: () => PublishFilterSettings;

  constructor(options: PublishFilterServiceOptions) {
    this.metadataCache = options.metadataCache;
    this.getSettings = options.getSettings;
  }

  private get settings(): PublishFilterSettings {
    return this.getSettings() ?? DEFAULT_PUBLISH_FILTER_SETTINGS;
  }

  shouldPublish(file: TFile): boolean {
    if (this.isHomePage(file)) {
      return true;
    }

    if (!this.isInIncludedFolder(file)) {
      return false;
    }

    if (this.isInExcludedFolder(file)) {
      return false;
    }

    if (this.hasExcludedTag(file)) {
      return false;
    }

    if (this.settings.rootFolder && !this.isInRootFolder(file)) {
      return false;
    }

    return true;
  }

  getPublishPath(file: TFile): string {
    if (this.isHomePage(file)) {
      return "index.md";
    }

    return stripRootFolder(file.path, this.settings.rootFolder);
  }

  isInIncludedFolder(file: TFile): boolean {
    const { includeFolders } = this.settings;

    if (includeFolders.length === 0) {
      return true;
    }

    return isPathInAnyFolder(file.path, includeFolders);
  }

  isInExcludedFolder(file: TFile): boolean {
    const { excludeFolders } = this.settings;

    if (excludeFolders.length === 0) {
      return false;
    }

    return isPathInAnyFolder(file.path, excludeFolders);
  }

  isInRootFolder(file: TFile): boolean {
    const { rootFolder } = this.settings;

    if (!rootFolder) {
      return true;
    }

    return isPathInFolder(file.path, rootFolder);
  }

  hasExcludedTag(file: TFile): boolean {
    const { excludeTags } = this.settings;

    if (excludeTags.length === 0) {
      return false;
    }

    const fileTags = this.getFileTags(file);

    return excludeTags.some((excludeTag) => {
      const normalizedExclude = excludeTag.toLowerCase().replace(/^#/, "");
      return fileTags.some((tag) => tag.toLowerCase() === normalizedExclude);
    });
  }

  getFileTags(file: TFile): string[] {
    const cache = this.metadataCache.getFileCache(file);
    if (!cache) {
      return [];
    }

    const tags: string[] = [];

    if (cache.frontmatter?.tags) {
      const fmTags = cache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        tags.push(...fmTags.map((t: string) => t.replace(/^#/, "")));
      } else if (typeof fmTags === "string") {
        tags.push(fmTags.replace(/^#/, ""));
      }
    }

    if (cache.tags) {
      tags.push(...cache.tags.map((t) => t.tag.replace(/^#/, "")));
    }

    return [...new Set(tags)];
  }

  isHomePage(file: TFile): boolean {
    const { homePagePath } = this.settings;

    if (!homePagePath) {
      return false;
    }

    const normalizedHome = homePagePath.replace(/^\/+|\/+$/g, "");
    const normalizedFile = file.path.replace(/^\/+|\/+$/g, "");

    return normalizedFile === normalizedHome;
  }
}
