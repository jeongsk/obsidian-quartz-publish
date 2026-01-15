# Quickstart: 원격 저장소 파일 관리

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## 빠른 시작 가이드

### 1. 타입 추가 (types.ts)

```typescript
// src/types.ts에 추가

export interface PublishedFile {
  path: string;
  name: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  htmlUrl: string;
  downloadUrl: string | null;
}

export interface DuplicateGroup {
  fileName: string;
  files: PublishedFile[];
  count: number;
}

export interface DeleteResult {
  succeeded: PublishedFile[];
  failed: Array<{ file: PublishedFile; error: string }>;
  allSucceeded: boolean;
  duration: number;
}
```

### 2. i18n 키 추가 (en.ts, ko.ts)

```typescript
// src/i18n/locales/en.ts
'settings.github.manageFiles': 'Manage Published Files',
'settings.github.manageFilesDesc': 'View and delete files from your remote repository',
'modal.remoteFiles.title': 'Manage Published Files',
'modal.remoteFiles.empty': 'No published files found',
'modal.remoteFiles.loading': 'Loading files...',
'modal.remoteFiles.refresh': 'Refresh',
'modal.remoteFiles.delete': 'Delete Selected',
'modal.remoteFiles.search': 'Search files...',
'modal.remoteFiles.selected': '{{count}} file(s) selected',
'modal.remoteFiles.deleteConfirm.title': 'Confirm Deletion',
'modal.remoteFiles.deleteConfirm.message': 'Are you sure you want to delete {{count}} file(s)? This action cannot be undone.',
'modal.remoteFiles.deleteSuccess': 'Successfully deleted {{count}} file(s)',
'modal.remoteFiles.deleteFailed': 'Failed to delete some files',
'modal.remoteFiles.duplicates': 'Duplicate files detected',
'modal.remoteFiles.duplicateCount': '{{count}} duplicate group(s)',
'error.remoteFiles.loadFailed': 'Failed to load file list',
'error.remoteFiles.maxFiles': 'Cannot delete more than {{max}} files at once',
```

```typescript
// src/i18n/locales/ko.ts
'settings.github.manageFiles': '발행된 파일 관리',
'settings.github.manageFilesDesc': '원격 저장소의 파일을 조회하고 삭제합니다',
'modal.remoteFiles.title': '발행된 파일 관리',
'modal.remoteFiles.empty': '발행된 파일이 없습니다',
'modal.remoteFiles.loading': '파일 목록 로딩 중...',
'modal.remoteFiles.refresh': '새로고침',
'modal.remoteFiles.delete': '선택 삭제',
'modal.remoteFiles.search': '파일 검색...',
'modal.remoteFiles.selected': '{{count}}개 파일 선택됨',
'modal.remoteFiles.deleteConfirm.title': '삭제 확인',
'modal.remoteFiles.deleteConfirm.message': '{{count}}개 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
'modal.remoteFiles.deleteSuccess': '{{count}}개 파일이 삭제되었습니다',
'modal.remoteFiles.deleteFailed': '일부 파일 삭제에 실패했습니다',
'modal.remoteFiles.duplicates': '중복 파일 감지됨',
'modal.remoteFiles.duplicateCount': '{{count}}개 중복 그룹',
'error.remoteFiles.loadFailed': '파일 목록을 불러오는데 실패했습니다',
'error.remoteFiles.maxFiles': '한 번에 최대 {{max}}개 파일만 삭제할 수 있습니다',
```

### 3. GitHubService 확장 (github.ts)

```typescript
// src/services/github.ts에 추가

async getDirectoryContents(path: string, recursive = true): Promise<PublishedFile[]> {
  const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: this.getHeaders(),
  });

  if (!response.ok) {
    throw new GitHubError(
      'Failed to get directory contents',
      response.status,
      await response.text()
    );
  }

  const items = await response.json();
  const files: PublishedFile[] = [];

  for (const item of items) {
    if (item.type === 'file') {
      files.push({
        path: item.path,
        name: item.name,
        sha: item.sha,
        size: item.size,
        type: item.type,
        htmlUrl: item.html_url,
        downloadUrl: item.download_url,
      });
    } else if (item.type === 'dir' && recursive) {
      const subFiles = await this.getDirectoryContents(item.path, true);
      files.push(...subFiles);
    }
  }

  return files;
}
```

### 4. RemoteFileService 생성

```typescript
// src/services/remote-file.ts

import { GitHubService } from './github';
import { PublishedFile, DuplicateGroup, DeleteResult } from '../types';
import { t } from '../i18n';

const MAX_BATCH_DELETE = 50;
const DELETE_DELAY_MS = 100;

export class RemoteFileService {
  constructor(private gitHubService: GitHubService) {}

  async getPublishedFiles(): Promise<PublishedFile[]> {
    const files = await this.gitHubService.getDirectoryContents('content', true);
    return files
      .filter(f => f.name.endsWith('.md'))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  detectDuplicates(files: PublishedFile[]): DuplicateGroup[] {
    const nameMap = new Map<string, PublishedFile[]>();

    for (const file of files) {
      const existing = nameMap.get(file.name) ?? [];
      existing.push(file);
      nameMap.set(file.name, existing);
    }

    return Array.from(nameMap.entries())
      .filter(([_, files]) => files.length > 1)
      .map(([fileName, files]) => ({ fileName, files, count: files.length }))
      .sort((a, b) => b.count - a.count);
  }

  searchFiles(files: PublishedFile[], query: string): PublishedFile[] {
    if (!query.trim()) return files;
    const lower = query.toLowerCase();
    return files.filter(f =>
      f.name.toLowerCase().includes(lower) ||
      f.path.toLowerCase().includes(lower)
    );
  }

  async deleteFiles(
    files: PublishedFile[],
    onProgress?: (current: number, total: number) => void
  ): Promise<DeleteResult> {
    if (files.length > MAX_BATCH_DELETE) {
      throw new Error(t('error.remoteFiles.maxFiles', { max: MAX_BATCH_DELETE }));
    }

    const start = Date.now();
    const succeeded: PublishedFile[] = [];
    const failed: Array<{ file: PublishedFile; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i + 1, files.length);

      try {
        await this.gitHubService.deleteFile(
          file.path,
          file.sha,
          `chore: Delete ${file.name} via Quartz Publish`
        );
        succeeded.push(file);
        if (i < files.length - 1) {
          await new Promise(r => setTimeout(r, DELETE_DELAY_MS));
        }
      } catch (e) {
        failed.push({ file, error: e instanceof Error ? e.message : 'Unknown' });
      }
    }

    return {
      succeeded,
      failed,
      allSucceeded: failed.length === 0,
      duration: Date.now() - start,
    };
  }
}
```

### 5. RemoteFileManagerModal 생성

```typescript
// src/ui/remote-file-manager-modal.ts

import { App, Modal, Notice } from 'obsidian';
import { t } from '../i18n';
import { RemoteFileService } from '../services/remote-file';
import { PublishedFile, DuplicateGroup } from '../types';
import { ConfirmModal } from './components/confirm-modal';

export class RemoteFileManagerModal extends Modal {
  private files: PublishedFile[] = [];
  private filteredFiles: PublishedFile[] = [];
  private selectedFiles = new Set<string>();
  private duplicateGroups: DuplicateGroup[] = [];
  private searchQuery = '';
  private isLoading = true;
  private remoteFileService: RemoteFileService;

  constructor(app: App, private plugin: any) {
    super(app);
    this.remoteFileService = new RemoteFileService(plugin.gitHubService);
  }

  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass('qp-remote-file-modal');
    this.titleEl.setText(t('modal.remoteFiles.title'));
    await this.loadFiles();
  }

  onClose() {
    this.files = [];
    this.selectedFiles.clear();
  }

  private async loadFiles(forceRefresh = false) {
    this.isLoading = true;
    this.render();

    try {
      this.files = await this.remoteFileService.getPublishedFiles();
      this.filteredFiles = this.files;
      this.duplicateGroups = this.remoteFileService.detectDuplicates(this.files);
      this.isLoading = false;
    } catch (e) {
      this.isLoading = false;
      new Notice(t('error.remoteFiles.loadFailed'));
    }

    this.render();
  }

  private render() {
    this.contentEl.empty();
    // ... UI 렌더링 구현
  }
}
```

### 6. 설정 탭에 버튼 추가

```typescript
// src/ui/settings-tab.ts의 createGitHubSection()에 추가

new Setting(containerEl)
  .setName(t('settings.github.manageFiles'))
  .setDesc(t('settings.github.manageFilesDesc'))
  .addButton(button => {
    button
      .setButtonText(t('settings.github.manageFiles'))
      .onClick(() => {
        new RemoteFileManagerModal(this.app, this.plugin).open();
      });
  });
```

---

## 테스트 체크리스트

- [ ] 파일 목록이 5초 이내에 로드되는가 (100개 파일 기준)
- [ ] 중복 파일이 올바르게 감지되는가
- [ ] 검색이 파일명과 경로 모두에서 작동하는가
- [ ] 단일 파일 삭제가 작동하는가
- [ ] 일괄 삭제(최대 50개)가 작동하는가
- [ ] 삭제 확인 다이얼로그가 표시되는가
- [ ] 삭제 후 목록이 자동 갱신되는가
- [ ] 새로고침 버튼이 작동하는가
- [ ] 네트워크 오류 시 적절한 메시지가 표시되는가
- [ ] i18n이 영어/한국어 모두 작동하는가

---

## 파일 구조

```
src/
├── types.ts                    # PublishedFile, DuplicateGroup, DeleteResult 추가
├── i18n/
│   └── locales/
│       ├── en.ts               # 영어 번역 키 추가
│       └── ko.ts               # 한국어 번역 키 추가
├── services/
│   ├── github.ts               # getDirectoryContents() 추가
│   └── remote-file.ts          # 새 파일 (RemoteFileService)
└── ui/
    ├── settings-tab.ts         # 버튼 추가
    └── remote-file-manager-modal.ts  # 새 파일 (모달)
```
