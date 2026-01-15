# Quickstart: Publish Filter & Home Page Configuration

**Date**: 2026-01-14  
**Feature**: 008-publish-filter

## Overview

이 기능을 통해 사용자는:
1. 특정 폴더만 Quartz에 발행할 수 있습니다.
2. 특정 폴더나 태그를 발행에서 제외할 수 있습니다.
3. 특정 폴더를 Quartz 루트로 설정하여 URL 구조를 제어할 수 있습니다.
4. 홈 페이지로 사용할 노트를 지정할 수 있습니다.

## Quick Implementation Guide

### 1. 타입 정의 추가 (`src/types.ts`)

```typescript
// PublishFilterSettings 인터페이스 추가
export interface PublishFilterSettings {
  includeFolders: string[];
  excludeFolders: string[];
  excludeTags: string[];
  rootFolder: string;
  homePagePath: string;
}

export const DEFAULT_PUBLISH_FILTER_SETTINGS: PublishFilterSettings = {
  includeFolders: [],
  excludeFolders: [],
  excludeTags: [],
  rootFolder: '',
  homePagePath: '',
};

// PluginSettings에 필드 추가
export interface PluginSettings {
  // ... existing fields
  publishFilterSettings?: PublishFilterSettings;
}
```

### 2. 필터 서비스 생성 (`src/services/publish-filter.ts`)

```typescript
export class PublishFilterService {
  constructor(
    private vault: Vault,
    private metadataCache: MetadataCache,
    private settings: PublishFilterSettings
  ) {}

  /**
   * 파일이 발행 대상인지 확인
   */
  shouldPublish(file: TFile): boolean {
    // 1. 홈 페이지로 지정된 파일은 항상 발행
    if (this.isHomePage(file)) return true;
    
    // 2. 루트 폴더 외부 파일 제외
    if (!this.isInRootFolder(file)) return false;
    
    // 3. 포함 폴더 체크 (설정되어 있는 경우)
    if (!this.isInIncludedFolder(file)) return false;
    
    // 4. 제외 폴더 체크
    if (this.isInExcludedFolder(file)) return false;
    
    // 5. 제외 태그 체크
    if (this.hasExcludedTag(file)) return false;
    
    return true;
  }

  /**
   * 발행 경로 계산 (루트 폴더 적용)
   */
  getPublishPath(file: TFile): string {
    let path = file.path;
    
    // 루트 폴더가 설정되어 있으면 해당 부분 제거
    if (this.settings.rootFolder) {
      const prefix = this.settings.rootFolder + '/';
      if (path.startsWith(prefix)) {
        path = path.slice(prefix.length);
      }
    }
    
    return path;
  }

  /**
   * 홈 페이지 경로 반환 (설정된 경우)
   */
  getHomePageRemotePath(): string | null {
    if (!this.settings.homePagePath) return null;
    return 'index.md'; // Quartz 홈 페이지 경로
  }
}
```

### 3. UI 섹션 생성 (`src/ui/sections/publish-filter-section.ts`)

```typescript
export class PublishFilterSection {
  constructor(
    private containerEl: HTMLElement,
    private options: {
      config: PublishFilterSettings;
      vault: Vault;
      onChange: (field: keyof PublishFilterSettings, value: any) => void;
    }
  ) {
    this.render();
  }

  private render(): void {
    // 섹션 헤딩
    new Setting(this.containerEl)
      .setName(t('settings.filter.title'))
      .setHeading();

    // 포함 폴더
    this.renderIncludeFolders();
    
    // 제외 폴더
    this.renderExcludeFolders();
    
    // 제외 태그
    this.renderExcludeTags();
    
    // 루트 폴더
    this.renderRootFolder();
    
    // 홈 페이지
    this.renderHomePage();
  }
}
```

### 4. PublishService 통합

```typescript
// PublishService에 필터 적용
async publishNote(file: TFile): Promise<PublishResult> {
  // 필터 체크
  if (!this.filterService.shouldPublish(file)) {
    return { success: false, file, error: 'filtered' };
  }
  
  // 경로 계산 (루트 폴더 적용)
  const publishPath = this.filterService.getPublishPath(file);
  
  // 홈 페이지 처리
  if (this.filterService.isHomePage(file)) {
    await this.uploadAsHomePage(file);
  }
  
  // ... 기존 발행 로직
}
```

## Testing Checklist

- [ ] 포함 폴더 설정 시 해당 폴더만 발행되는지 확인
- [ ] 제외 폴더 설정 시 해당 폴더가 제외되는지 확인
- [ ] 제외 태그 설정 시 해당 태그가 있는 노트가 제외되는지 확인
- [ ] 루트 폴더 설정 시 경로가 올바르게 변환되는지 확인
- [ ] 홈 페이지 설정 시 index.md로 업로드되는지 확인
- [ ] 필터 설정이 저장/로드되는지 확인

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | `PublishFilterSettings` 타입 추가 |
| `src/services/publish-filter.ts` | 새 서비스 파일 생성 |
| `src/services/publish.ts` | 필터 서비스 통합 |
| `src/services/status.ts` | 상태 계산에 필터 적용 |
| `src/ui/settings-tab.ts` | 필터 설정 섹션 추가 |
| `src/ui/sections/publish-filter-section.ts` | 새 UI 섹션 생성 |
| `src/i18n/locales/en.ts` | 영문 번역 추가 |
| `src/i18n/locales/ko.ts` | 한국어 번역 추가 |
