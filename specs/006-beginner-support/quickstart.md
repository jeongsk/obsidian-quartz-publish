# Quickstart: 초보자 지원 (Beginner Support)

**Date**: 2026-01-14  
**Feature Branch**: `006-beginner-support`

## Overview

이 기능은 GitHub/터미널 경험이 없는 사용자가 Quartz 리포지토리를 자동으로 생성하고 배포 가이드를 받을 수 있도록 합니다.

---

## Prerequisites

1. **GitHub 계정**: 유효한 GitHub 계정 필요
2. **GitHub PAT**: 플러그인 설정에서 `repo` 스코프 권한이 있는 PAT 설정 완료
3. **Repository URL 미설정**: 아직 Quartz 리포지토리가 연결되지 않은 상태

---

## Quick Implementation Guide

### 1. 타입 정의 추가

```typescript
// src/types.ts

export interface RepositoryCreationRequest {
  name: string;
  visibility: 'public' | 'private';
  description?: string;
}

export interface CreatedRepository {
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export type RepositoryCreationErrorType =
  | 'invalid_token'
  | 'insufficient_permissions'
  | 'repo_exists'
  | 'invalid_name'
  | 'template_not_found'
  | 'rate_limited'
  | 'network_error'
  | 'unknown';

export interface RepositoryCreationError {
  type: RepositoryCreationErrorType;
  message: string;
  details?: string;
}

export type RepositoryCreationResult =
  | { success: true; repository: CreatedRepository }
  | { success: false; error: RepositoryCreationError };

export const QUARTZ_TEMPLATE = {
  owner: 'jackyzha0',
  repo: 'quartz',
} as const;
```

### 2. 서비스 구현

```typescript
// src/services/repository-creator.ts

import { GitHubService, GitHubError } from './github';
import type {
  RepositoryCreationRequest,
  RepositoryCreationResult,
  CreatedRepository,
} from '../types';
import { QUARTZ_TEMPLATE } from '../types';

export class RepositoryCreatorService {
  private github: GitHubService;
  private userLogin: string | null = null;

  constructor(token: string) {
    // 임시 GitHubService 생성 (repoUrl 없이)
    this.github = new GitHubService(token, 'https://github.com/temp/temp');
  }

  async getCurrentUser(): Promise<{ login: string; id: number }> {
    const user = await this.github.validateToken();
    this.userLogin = user.login;
    return { login: user.login, id: user.id };
  }

  async checkRepositoryExists(owner: string, name: string): Promise<boolean> {
    // GET /repos/{owner}/{name} 호출
    // 404 = 존재하지 않음, 200 = 존재함
  }

  validateRepositoryName(name: string): { valid: boolean; error?: string } {
    if (!name) return { valid: true }; // 기본값 사용
    if (name.length > 100) {
      return { valid: false, error: '리포지토리 이름은 100자를 초과할 수 없습니다.' };
    }
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
    if (!regex.test(name)) {
      return { valid: false, error: '유효하지 않은 리포지토리 이름입니다.' };
    }
    return { valid: true };
  }

  async createFromTemplate(request: RepositoryCreationRequest): Promise<RepositoryCreationResult> {
    // POST /repos/jackyzha0/quartz/generate
  }
}
```

### 3. 모달 UI 구현

```typescript
// src/ui/create-repo-modal.ts

import { Modal, Setting, Notice } from 'obsidian';
import type { App } from 'obsidian';
import { RepositoryCreatorService } from '../services/repository-creator';

export class CreateRepoModal extends Modal {
  private repoName: string = 'quartz';
  private visibility: 'public' | 'private' = 'public';
  private service: RepositoryCreatorService;
  private onSuccess: (repoUrl: string) => void;

  constructor(
    app: App,
    token: string,
    onSuccess: (repoUrl: string) => void
  ) {
    super(app);
    this.service = new RepositoryCreatorService(token);
    this.onSuccess = onSuccess;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('qp:p-4');

    contentEl.createEl('h2', { text: 'Create Quartz Repository' });

    // Repository Name 입력
    new Setting(contentEl)
      .setName('Repository Name')
      .setDesc('기본값: quartz')
      .addText((text) =>
        text
          .setPlaceholder('quartz')
          .setValue(this.repoName)
          .onChange((value) => (this.repoName = value || 'quartz'))
      );

    // Visibility 선택
    new Setting(contentEl)
      .setName('Visibility')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('public', 'Public (GitHub Pages 무료)')
          .addOption('private', 'Private (GitHub Pro 필요)')
          .setValue(this.visibility)
          .onChange((value) => (this.visibility = value as 'public' | 'private'))
      );

    // 버튼
    new Setting(contentEl)
      .addButton((btn) =>
        btn.setButtonText('Cancel').onClick(() => this.close())
      )
      .addButton((btn) =>
        btn
          .setButtonText('Create')
          .setCta()
          .onClick(() => this.handleCreate())
      );
  }

  async handleCreate() {
    // 구현
  }

  onClose() {
    this.contentEl.empty();
  }
}
```

### 4. 설정 탭 연동

```typescript
// src/ui/settings-tab.ts (기존 파일 수정)

// Repository URL 설정 아래에 추가
if (!this.plugin.settings.repositoryUrl) {
  new Setting(containerEl)
    .setName('Create Quartz Repository')
    .setDesc('GitHub에 새 Quartz 리포지토리를 자동으로 생성합니다.')
    .addButton((btn) =>
      btn
        .setButtonText('Create Repository')
        .setCta()
        .onClick(() => {
          new CreateRepoModal(
            this.app,
            this.plugin.settings.githubToken,
            async (repoUrl) => {
              this.plugin.settings.repositoryUrl = repoUrl;
              await this.plugin.saveSettings();
              this.display(); // UI 갱신
            }
          ).open();
        })
    );
}
```

---

## Testing Checklist

- [ ] 유효한 PAT로 리포지토리 생성 성공
- [ ] 이미 존재하는 이름으로 생성 시 에러 메시지 표시
- [ ] 유효하지 않은 이름 입력 시 유효성 검사 에러
- [ ] Private 선택 시 GitHub Pro 필요 안내 표시
- [ ] 생성 완료 후 Repository URL 자동 설정
- [ ] 배포 가이드 모달 표시

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types.ts` | Modify | 타입 정의 추가 |
| `src/services/repository-creator.ts` | Create | 리포지토리 생성 서비스 |
| `src/ui/create-repo-modal.ts` | Create | 리포지토리 생성 모달 |
| `src/ui/deploy-guide-modal.ts` | Create | 배포 가이드 모달 |
| `src/ui/settings-tab.ts` | Modify | 생성 버튼 추가 |
| `tests/unit/services/repository-creator.test.ts` | Create | 서비스 테스트 |
