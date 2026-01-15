# Quickstart: Quartz 설정 관리

**Date**: 2026-01-13
**Feature**: 003-quartz-config

## 구현 순서

### 1단계: 타입 정의 확장 (types.ts)

기존 `QuartzSettings` 인터페이스는 이미 정의되어 있음. 추가 타입 정의:

```typescript
// src/types.ts에 추가

export interface QuartzConfigFile {
  path: 'quartz.config.ts';
  sha: string;
  content: string;
  lastFetched: number;
}

export interface QuartzVersionInfo {
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  lastChecked: number;
}

export type UpgradeStatus =
  | 'idle' | 'checking' | 'downloading' | 'applying' | 'completed' | 'error';

export interface QuartzUpgradeProgress {
  status: UpgradeStatus;
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  error: string | null;
}
```

### 2단계: Glob 유효성 검사 유틸리티 (utils/glob-validator.ts)

```typescript
// src/utils/glob-validator.ts

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateGlobPattern(pattern: string): ValidationResult {
  // 1. 빈 문자열 검사
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: '패턴은 비어있을 수 없습니다' };
  }

  // 2. 절대 경로 검사
  if (pattern.startsWith('/')) {
    return { valid: false, error: '절대 경로는 허용되지 않습니다' };
  }

  // 3. 제어 문자 검사
  if (/[\x00-\x1f]/.test(pattern)) {
    return { valid: false, error: '제어 문자는 허용되지 않습니다' };
  }

  // 4. 연속 와일드카드 검사
  if (/\*{3,}/.test(pattern)) {
    return { valid: false, error: '연속된 와일드카드(***)는 허용되지 않습니다' };
  }

  // 5. 최대 길이 검사
  if (pattern.length > 256) {
    return { valid: false, error: '패턴은 256자를 초과할 수 없습니다' };
  }

  return { valid: true };
}

export function isValidGlobPattern(pattern: string): boolean {
  return validateGlobPattern(pattern).valid;
}
```

### 3단계: QuartzConfigService 구현 (services/quartz-config.ts)

```typescript
// src/services/quartz-config.ts

export interface ParsedQuartzConfig {
  explicitPublish: boolean;
  ignorePatterns: string[];
  urlStrategy: 'shortest' | 'absolute';
  rawContent: string;
}

export class QuartzConfigService {
  /**
   * quartz.config.ts 파일 파싱
   */
  parseConfig(content: string): ParsedQuartzConfig | null {
    try {
      // ExplicitPublish 확인
      const hasExplicit = /Plugin\.ExplicitPublish\(\)/.test(content);

      // ignorePatterns 추출
      const ignorePatternsMatch = content.match(
        /ignorePatterns\s*[:=]\s*\[([^\]]*)\]/
      );
      const ignorePatterns = ignorePatternsMatch
        ? this.parseStringArray(ignorePatternsMatch[1])
        : [];

      // urlStrategy 추출
      const urlStrategyMatch = content.match(
        /urlStrategy\s*:\s*["'](\w+)["']/
      );
      const urlStrategy = urlStrategyMatch?.[1] === 'absolutePaths'
        ? 'absolute'
        : 'shortest';

      return {
        explicitPublish: hasExplicit,
        ignorePatterns,
        urlStrategy,
        rawContent: content,
      };
    } catch {
      return null;
    }
  }

  /**
   * ExplicitPublish 설정 변경
   */
  setExplicitPublish(content: string, enabled: boolean): {
    success: boolean;
    newContent?: string;
    error?: string;
  } {
    // filters 배열에서 Plugin.RemoveDrafts() 또는 Plugin.ExplicitPublish() 찾기
    const filterPattern = /filters:\s*\[([^\]]*)\]/;
    const match = content.match(filterPattern);

    if (!match) {
      return { success: false, error: 'filters 배열을 찾을 수 없습니다' };
    }

    const newFilter = enabled
      ? 'Plugin.ExplicitPublish()'
      : 'Plugin.RemoveDrafts()';

    // 기존 필터 교체
    let newFilters = match[1]
      .replace(/Plugin\.ExplicitPublish\(\)/, newFilter)
      .replace(/Plugin\.RemoveDrafts\(\)/, newFilter);

    // 둘 다 없으면 추가
    if (!newFilters.includes(newFilter)) {
      newFilters = newFilters.trim()
        ? `${newFilters.trim()}, ${newFilter}`
        : newFilter;
    }

    const newContent = content.replace(
      filterPattern,
      `filters: [${newFilters}]`
    );

    return { success: true, newContent };
  }

  // ... 기타 메서드
}
```

### 4단계: GitHubService 확장 (services/github.ts)

기존 `GitHubService`에 메서드 추가:

```typescript
// src/services/github.ts에 추가

/**
 * 외부 리포지토리의 최신 릴리스 조회
 */
async getLatestRelease(owner: string, repo: string): Promise<{
  tagName: string;
  name: string;
} | null> {
  try {
    const response = await this.request<{
      tag_name: string;
      name: string;
    }>(`/repos/${owner}/${repo}/releases/latest`);
    return {
      tagName: response.tag_name,
      name: response.name,
    };
  } catch {
    return null;
  }
}

/**
 * 외부 리포지토리의 Git Tree 조회
 */
async getExternalTree(
  owner: string,
  repo: string,
  ref: string
): Promise<Array<{ path: string; sha: string; type: string }>> {
  const response = await this.request<{
    tree: Array<{ path: string; sha: string; type: string }>;
  }>(`/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);
  return response.tree;
}
```

### 5단계: QuartzUpgradeService 구현 (services/quartz-upgrade.ts)

```typescript
// src/services/quartz-upgrade.ts

export class QuartzUpgradeService {
  constructor(private github: GitHubService) {}

  async checkVersion(): Promise<QuartzVersionInfo> {
    const [current, latest] = await Promise.all([
      this.getCurrentVersion(),
      this.getLatestVersion(),
    ]);

    return {
      current,
      latest,
      hasUpdate: !!(current && latest && current !== latest),
      lastChecked: Date.now(),
    };
  }

  async upgrade(onProgress?: (p: QuartzUpgradeProgress) => void): Promise<{
    success: boolean;
    version?: string;
    error?: string;
  }> {
    // 구현...
  }
}
```

### 6단계: 설정 탭 UI 확장 (ui/settings-tab.ts)

```typescript
// src/ui/settings-tab.ts 확장

private async renderQuartzSettings(containerEl: HTMLElement): Promise<void> {
  containerEl.createEl('h3', { text: 'Quartz 설정' });

  // ExplicitPublish 토글
  new Setting(containerEl)
    .setName('일부만 공개')
    .setDesc('publish: true가 있는 노트만 발행합니다')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.quartzSettings?.explicitPublish ?? false)
      .onChange(async (value) => {
        await this.updateExplicitPublish(value);
      }));

  // 제외 패턴
  // ... 구현

  // URL 전략
  // ... 구현

  // 업그레이드 섹션
  // ... 구현
}
```

---

## 테스트 시나리오

### QuartzConfigService 테스트

```typescript
// tests/unit/services/quartz-config.test.ts

describe('QuartzConfigService', () => {
  describe('parseConfig', () => {
    it('ExplicitPublish가 활성화된 설정을 파싱한다', () => {
      const content = `filters: [Plugin.ExplicitPublish()]`;
      const result = service.parseConfig(content);
      expect(result?.explicitPublish).toBe(true);
    });

    it('ignorePatterns 배열을 파싱한다', () => {
      const content = `ignorePatterns: ["private", "templates"]`;
      const result = service.parseConfig(content);
      expect(result?.ignorePatterns).toEqual(['private', 'templates']);
    });
  });

  describe('setExplicitPublish', () => {
    it('RemoveDrafts를 ExplicitPublish로 교체한다', () => {
      const content = `filters: [Plugin.RemoveDrafts()]`;
      const result = service.setExplicitPublish(content, true);
      expect(result.newContent).toContain('Plugin.ExplicitPublish()');
    });
  });
});
```

### GlobValidator 테스트

```typescript
// tests/unit/utils/glob-validator.test.ts

describe('validateGlobPattern', () => {
  it('유효한 패턴을 통과시킨다', () => {
    expect(isValidGlobPattern('private/*')).toBe(true);
    expect(isValidGlobPattern('**/*.md')).toBe(true);
  });

  it('절대 경로를 거부한다', () => {
    const result = validateGlobPattern('/absolute/path');
    expect(result.valid).toBe(false);
  });

  it('빈 문자열을 거부한다', () => {
    expect(isValidGlobPattern('')).toBe(false);
  });
});
```

---

## 파일 생성/수정 체크리스트

### 새로 생성할 파일
- [ ] `src/services/quartz-config.ts`
- [ ] `src/services/quartz-upgrade.ts`
- [ ] `src/utils/glob-validator.ts`
- [ ] `tests/unit/services/quartz-config.test.ts`
- [ ] `tests/unit/services/quartz-upgrade.test.ts`
- [ ] `tests/unit/utils/glob-validator.test.ts`

### 수정할 파일
- [ ] `src/types.ts` - 타입 추가
- [ ] `src/services/github.ts` - 메서드 추가
- [ ] `src/ui/settings-tab.ts` - Quartz 설정 섹션 추가

---

## 의존성 순서

```
1. types.ts (타입 정의)
      ↓
2. utils/glob-validator.ts (유틸리티)
      ↓
3. services/quartz-config.ts (설정 파싱/수정)
      ↓
4. services/github.ts (확장)
      ↓
5. services/quartz-upgrade.ts (업그레이드)
      ↓
6. ui/settings-tab.ts (UI)
```
