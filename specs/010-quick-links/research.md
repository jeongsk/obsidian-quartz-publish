# Research: GitHub 저장소 및 배포 사이트 바로가기 버튼 추가

**Feature Branch**: `010-quick-links`
**Date**: 2026-01-15

## 기술 조사 결과

### 1. 기존 데이터 소스 확인

#### GitHub 저장소 URL
- **위치**: `PluginSettings.repoUrl` (`src/types.ts:104`)
- **형식**: `https://github.com/user/quartz`
- **접근 방법**: `plugin.settings.repoUrl`

#### 배포 사이트 URL (baseUrl)
- **위치**: `QuartzSiteConfig.baseUrl` (`src/types.ts:290`)
- **형식**: 프로토콜 없이 저장됨 (예: `example.com` 또는 `example.com/blog`)
- **접근 방법**: QuartzConfigService를 통해 GitHub에서 가져옴
- **주의**: https:// 프로토콜 추가 필요

### 2. 외부 브라우저 열기 API

#### Obsidian API
- **메서드**: `window.open(url, '_blank')` 또는 Electron의 `shell.openExternal(url)`
- **권장 방식**: Obsidian에서는 `window.open(url, '_blank')`가 외부 브라우저로 열림
- **대안**: `navigator.clipboard.writeText()` (클립보드 복사 후 안내)

**Decision**: `window.open(url, '_blank')` 사용
**Rationale**: 가장 간단하고 Obsidian 플러그인에서 일반적으로 사용되는 방식
**Alternatives considered**: Electron shell API (불필요한 복잡성)

### 3. 커맨드 팔레트 등록

#### 기존 패턴 (`src/main.ts`)
```typescript
this.addCommand({
  id: 'command-id',
  name: t('command.name'),
  callback: () => { /* 실행 로직 */ }
});
```

**Decision**: 기존 패턴 따라 두 개의 커맨드 추가
**Rationale**: 일관성 유지

### 4. 설정 탭 버튼 배치

#### 현재 구조 (`src/ui/settings-tab.ts`)
- `display()` 메서드에서 섹션별로 UI 생성
- GitHub 섹션이 최상단에 위치
- `Setting` 클래스를 사용한 Obsidian 네이티브 UI

**Decision**: GitHub 섹션 상단에 버튼 그룹 추가
**Rationale**: 관련 컨텍스트에서 자연스러운 접근, Linear 이슈 결정사항 준수

### 5. 비활성화 상태 처리

#### 조건
- GitHub 버튼: `!plugin.settings.repoUrl` 또는 URL 형식 유효하지 않음
- 홈페이지 버튼: `!quartzSiteConfig.baseUrl`

#### UI 표현
- `button.disabled = true`
- 시각적 피드백: `qp:opacity-50 qp:cursor-not-allowed`

### 6. URL 유효성 검증

#### GitHub 저장소 URL
```typescript
const isValidGitHubUrl = (url: string): boolean => {
  return /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/.test(url);
};
```

#### baseUrl 프로토콜 추가
```typescript
const normalizeBaseUrl = (baseUrl: string): string => {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
};
```

## 의존성 분석

| 의존성 | 상태 | 비고 |
|--------|------|------|
| `PluginSettings.repoUrl` | 존재 | 직접 접근 가능 |
| `QuartzSiteConfig.baseUrl` | 존재 | QuartzConfigService 필요 |
| `QuartzConfigService` | 존재 | 설정 탭에서 이미 사용 중 |
| i18n (`t()` 함수) | 존재 | 번역 키 추가 필요 |

## 미해결 항목

**없음** - 모든 기술적 질문이 해결됨

## 결론

이 기능은 기존 인프라를 활용하여 구현 가능합니다:
1. 데이터 소스가 이미 존재함 (repoUrl, baseUrl)
2. UI 패턴이 확립되어 있음 (Setting 클래스, addCommand)
3. 스타일링 시스템이 있음 (TailwindCSS + Obsidian CSS 변수)
