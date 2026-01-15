# Quickstart: GitHub 저장소 및 배포 사이트 바로가기 버튼 추가

**Feature Branch**: `010-quick-links`
**Date**: 2026-01-15

## 개요

이 기능은 사용자가 설정된 GitHub 저장소와 배포된 Quartz 사이트에 빠르게 접근할 수 있는 바로가기 버튼과 커맨드를 추가합니다.

## 구현 범위

### 1. 설정 탭 버튼 (UI)

**위치**: `src/ui/settings-tab.ts` - GitHub 섹션 상단

```typescript
// GitHub 섹션 제목 아래, 토큰 입력 전에 버튼 그룹 추가
private createQuickLinksSection(containerEl: HTMLElement): void {
  const buttonContainer = containerEl.createDiv({ cls: 'qp:flex qp:gap-2 qp:mb-4' });

  // GitHub 저장소 버튼
  const githubBtn = buttonContainer.createEl('button', {
    text: t('settings.quickLinks.github'),
    cls: 'qp:...',
  });
  githubBtn.disabled = !this.isValidGitHubUrl(this.plugin.settings.repoUrl);
  githubBtn.onclick = () => this.openGitHubRepo();

  // 배포 사이트 버튼
  const siteBtn = buttonContainer.createEl('button', {
    text: t('settings.quickLinks.site'),
    cls: 'qp:...',
  });
  siteBtn.disabled = !this.currentBaseUrl;
  siteBtn.onclick = () => this.openDeployedSite();
}
```

### 2. 커맨드 팔레트 (Plugin)

**위치**: `src/main.ts` - onload() 메서드

```typescript
// GitHub 저장소 열기 커맨드
this.addCommand({
  id: 'open-github-repo',
  name: t('command.openGitHubRepo'),
  callback: () => {
    const repoUrl = this.settings.repoUrl;
    if (repoUrl && this.isValidGitHubUrl(repoUrl)) {
      window.open(repoUrl, '_blank');
    } else {
      new Notice(t('notice.noGitHubRepo'));
    }
  }
});

// 배포 사이트 열기 커맨드
this.addCommand({
  id: 'open-deployed-site',
  name: t('command.openDeployedSite'),
  callback: async () => {
    const baseUrl = await this.getBaseUrl();
    if (baseUrl) {
      window.open(this.normalizeBaseUrl(baseUrl), '_blank');
    } else {
      new Notice(t('notice.noBaseUrl'));
    }
  }
});
```

### 3. i18n 번역 키

**위치**: `src/i18n/locales/ko.ts` 및 `en.ts`

```typescript
// ko.ts
settings: {
  quickLinks: {
    github: 'GitHub 저장소 열기',
    site: '배포 사이트 열기',
  }
},
command: {
  openGitHubRepo: 'GitHub 저장소 열기',
  openDeployedSite: '배포 사이트 열기',
},
notice: {
  noGitHubRepo: 'GitHub 저장소가 설정되지 않았습니다.',
  noBaseUrl: '배포 사이트 URL이 설정되지 않았습니다.',
}
```

### 4. 유틸리티 함수

**위치**: `src/utils/url.ts` (새 파일 또는 기존 파일에 추가)

```typescript
export function isValidGitHubUrl(url: string): boolean {
  if (!url) return false;
  return /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(url);
}

export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
}
```

## 파일 변경 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/main.ts` | 수정 | 커맨드 2개 추가 |
| `src/ui/settings-tab.ts` | 수정 | 바로가기 버튼 섹션 추가 |
| `src/utils/url.ts` | 생성/수정 | URL 유틸리티 함수 추가 |
| `src/i18n/locales/ko.ts` | 수정 | 번역 키 추가 |
| `src/i18n/locales/en.ts` | 수정 | 번역 키 추가 |

## 테스트 체크리스트

- [ ] GitHub 저장소가 설정된 경우 버튼 활성화 확인
- [ ] GitHub 저장소가 설정되지 않은 경우 버튼 비활성화 확인
- [ ] baseUrl이 설정된 경우 버튼 활성화 확인
- [ ] baseUrl이 설정되지 않은 경우 버튼 비활성화 확인
- [ ] 커맨드 팔레트에서 두 명령 표시 확인
- [ ] 각 버튼/커맨드 클릭 시 외부 브라우저에서 열림 확인
- [ ] 프로토콜 없는 baseUrl에 https:// 자동 추가 확인
- [ ] 라이트/다크 테마에서 버튼 스타일 확인

## 의존성

- 기존 `PluginSettings` (repoUrl)
- 기존 `QuartzConfigService` (baseUrl 조회)
- 기존 i18n 시스템
- 기존 TailwindCSS 설정
