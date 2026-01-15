# Quickstart Guide: Quartz Publish Plugin Development

**Feature**: 001-quartz-publish
**Date**: 2026-01-13

## Prerequisites

- Node.js 22.0.0+
- Obsidian 앱 (테스트용)
- GitHub 계정 및 Personal Access Token
- Quartz 리포지토리 (테스트용)

---

## 1. Development Setup

### 1.1 Clone & Install

```bash
# 프로젝트 클론
git clone <repository-url>
cd obsidian-quartz-publish

# 의존성 설치
npm install
```

### 1.2 Development Build

```bash
# 개발 모드 (watch)
npm run dev

# 프로덕션 빌드
npm run build
```

### 1.3 Link to Obsidian Vault

개발 중 테스트를 위해 빌드 결과물을 Obsidian 볼트에 연결합니다.

```bash
# 볼트의 플러그인 디렉토리
VAULT_PATH="/path/to/your/vault"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/quartz-publish"

# 디렉토리 생성 및 심볼릭 링크
mkdir -p "$PLUGIN_DIR"
ln -sf "$(pwd)/main.js" "$PLUGIN_DIR/main.js"
ln -sf "$(pwd)/manifest.json" "$PLUGIN_DIR/manifest.json"
ln -sf "$(pwd)/styles.css" "$PLUGIN_DIR/styles.css"
```

Obsidian에서 커뮤니티 플러그인 설정으로 이동하여 "Quartz Publish"를 활성화합니다.

---

## 2. Project Structure

```
obsidian-quartz-publish/
├── src/
│   ├── main.ts              # 플러그인 메인 클래스
│   ├── settings.ts          # 설정 인터페이스 및 탭
│   ├── services/
│   │   ├── github.ts        # GitHub API 서비스
│   │   ├── publish.ts       # 발행 서비스
│   │   ├── transformer.ts   # 콘텐츠 변환
│   │   └── status.ts        # 상태 관리
│   ├── ui/
│   │   ├── dashboard.ts     # 대시보드 모달
│   │   └── components/      # UI 컴포넌트
│   └── styles/
│       └── main.css         # TailwindCSS 스타일
├── tests/
│   ├── unit/                # 단위 테스트
│   ├── integration/         # 통합 테스트
│   └── mocks/               # 테스트 목
├── specs/                   # 기능 명세
├── esbuild.config.mjs       # 빌드 설정
├── tailwind.config.ts       # TailwindCSS 설정
├── tsconfig.json            # TypeScript 설정
└── package.json
```

---

## 3. Key Implementation Steps

### Step 1: Plugin Skeleton (main.ts)

```typescript
import { Plugin } from 'obsidian';
import { QuartzPublishSettings, DEFAULT_SETTINGS, QuartzPublishSettingTab } from './settings';

export default class QuartzPublishPlugin extends Plugin {
  settings: QuartzPublishSettings;

  async onload() {
    await this.loadSettings();

    // 설정 탭 추가
    this.addSettingTab(new QuartzPublishSettingTab(this.app, this));

    // 커맨드 등록
    this.addCommand({
      id: 'publish-current-note',
      name: 'Publish current note to Quartz',
      callback: () => this.publishCurrentNote(),
    });

    this.addCommand({
      id: 'open-publish-dashboard',
      name: 'Open publish dashboard',
      callback: () => this.openDashboard(),
    });

    // 파일 메뉴 등록
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item.setTitle('Publish to Quartz')
              .setIcon('upload')
              .onClick(() => this.publishNote(file));
          });
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Step 2: Settings Tab (settings.ts)

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import QuartzPublishPlugin from './main';

export interface QuartzPublishSettings {
  githubToken: string;
  repoUrl: string;
  defaultBranch: string;
}

export const DEFAULT_SETTINGS: QuartzPublishSettings = {
  githubToken: '',
  repoUrl: '',
  defaultBranch: 'main',
};

export class QuartzPublishSettingTab extends PluginSettingTab {
  plugin: QuartzPublishPlugin;

  constructor(app: App, plugin: QuartzPublishPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('GitHub Token')
      .setDesc('Personal Access Token with repo scope')
      .addText((text) =>
        text
          .setPlaceholder('ghp_xxxxxxxxxxxx')
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Repository URL')
      .setDesc('Your Quartz repository URL')
      .addText((text) =>
        text
          .setPlaceholder('https://github.com/user/quartz')
          .setValue(this.plugin.settings.repoUrl)
          .onChange(async (value) => {
            this.plugin.settings.repoUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Test Connection')
      .setDesc('Verify GitHub connection and Quartz repository')
      .addButton((button) =>
        button.setButtonText('Test').onClick(async () => {
          // 연결 테스트 로직
        })
      );
  }
}
```

### Step 3: GitHub Service (services/github.ts)

```typescript
export class GitHubService {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, repoUrl: string) {
    this.token = token;
    const parsed = this.parseRepoUrl(repoUrl);
    this.owner = parsed.owner;
    this.repo = parsed.repo;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new GitHubError(response.status, await response.text());
    }

    return response.json();
  }

  async testConnection() {
    // 1. 토큰 유효성 검증
    await this.request('/user');

    // 2. 리포지토리 접근 확인
    const repo = await this.request(`/repos/${this.owner}/${this.repo}`);

    // 3. Quartz 설정 파일 확인
    try {
      await this.request(`/repos/${this.owner}/${this.repo}/contents/quartz.config.ts`);
      return { success: true, repository: repo, isQuartz: true };
    } catch (e) {
      return { success: false, error: 'not_quartz' };
    }
  }

  async createOrUpdateFile(path: string, content: string, message: string, sha?: string) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
      branch: 'main',
      ...(sha && { sha }),
    };

    return this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}
```

---

## 4. Testing

### 4.1 Run Tests

```bash
# 전체 테스트
npm run test

# 감시 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

### 4.2 Unit Test Example

```typescript
// tests/unit/transformer.test.ts
import { describe, it, expect } from 'vitest';
import { ContentTransformer } from '../../src/services/transformer';

describe('ContentTransformer', () => {
  const transformer = new ContentTransformer();

  it('should convert wiki links for published notes', () => {
    const publishedNotes = new Set(['other-note.md']);
    const result = transformer.transformLinks(
      'Check [[other-note]] for more info',
      publishedNotes
    );
    expect(result).toBe('Check [other-note](other-note.md) for more info');
  });

  it('should remove links for unpublished notes', () => {
    const publishedNotes = new Set<string>();
    const result = transformer.transformLinks(
      'Check [[private-note]] for more info',
      publishedNotes
    );
    expect(result).toBe('Check private-note for more info');
  });
});
```

---

## 5. TailwindCSS Setup

### 5.1 Config (tailwind.config.ts)

```typescript
import type { Config } from 'tailwindcss';

export default {
  prefix: 'hn:',  // CLAUDE.md 요구사항
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'obs-bg': 'var(--background-primary)',
        'obs-text': 'var(--text-normal)',
        'obs-accent': 'var(--interactive-accent)',
      },
    },
  },
} satisfies Config;
```

### 5.2 Usage in Components

```typescript
// 대시보드 스타일 예시
containerEl.addClass('hn:p-4', 'hn:bg-obs-bg');

const header = containerEl.createEl('h2', {
  cls: 'hn:text-xl hn:font-bold hn:text-obs-text',
  text: 'Publish Dashboard',
});
```

---

## 6. Development Tips

### 6.1 Hot Reload

`npm run dev`를 실행하면 파일 변경 시 자동으로 재빌드됩니다.
Obsidian에서 `Ctrl+R` (또는 `Cmd+R`)로 플러그인을 리로드하세요.

### 6.2 Debugging

Obsidian 개발자 도구 열기: `Ctrl+Shift+I` (또는 `Cmd+Option+I`)

```typescript
// 디버그 로깅
console.log('[QuartzPublish]', data);
```

### 6.3 Mock GitHub API (테스트용)

```typescript
// tests/mocks/github.ts
export class MockGitHubService {
  async testConnection() {
    return { success: true, isQuartz: true };
  }

  async createOrUpdateFile(path: string, content: string) {
    return { sha: 'mock-sha', commit: { sha: 'mock-commit' } };
  }
}
```

---

## 7. Next Steps

1. `src/main.ts` 기본 플러그인 구조 구현
2. `src/settings.ts` 설정 탭 구현
3. `src/services/github.ts` GitHub API 서비스 구현
4. `src/services/transformer.ts` 콘텐츠 변환 로직 구현
5. `src/services/status.ts` 상태 관리 서비스 구현
6. `src/ui/dashboard.ts` 대시보드 모달 구현
7. 단위 테스트 작성
8. E2E 테스트 (실제 Quartz 리포지토리 연동)
