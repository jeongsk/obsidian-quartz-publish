# Data Model: GitHub 저장소 및 배포 사이트 바로가기 버튼 추가

**Feature Branch**: `010-quick-links`
**Date**: 2026-01-15

## 엔티티 개요

이 기능은 **새로운 엔티티를 추가하지 않습니다**. 기존 데이터 구조를 읽기 전용으로 활용합니다.

## 기존 엔티티 활용

### 1. PluginSettings (읽기 전용)

**파일**: `src/types.ts`

| 필드 | 타입 | 용도 |
|------|------|------|
| `repoUrl` | `string` | GitHub 저장소 바로가기 URL 소스 |

**접근 패턴**:
```typescript
const repoUrl = this.plugin.settings.repoUrl;
```

### 2. QuartzSiteConfig (읽기 전용)

**파일**: `src/types.ts`

| 필드 | 타입 | 용도 |
|------|------|------|
| `baseUrl` | `string` | 배포 사이트 바로가기 URL 소스 (프로토콜 없음) |

**접근 패턴**:
```typescript
// QuartzConfigService를 통해 가져옴
const config = await quartzConfigService.getConfig();
const baseUrl = config?.siteConfig?.baseUrl;
```

## URL 변환 로직

### GitHub 저장소 URL

- **입력**: `https://github.com/user/repo` (그대로 사용)
- **유효성**: `^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$`
- **변환**: 없음

### 배포 사이트 URL

- **입력**: `example.com` 또는 `example.com/blog`
- **유효성**: 빈 문자열이 아닌지만 확인
- **변환**: `https://` 프로토콜 추가

```typescript
function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl;
  }
  return `https://${baseUrl}`;
}
```

## 상태 관리

### 버튼 활성화 상태

| 버튼 | 활성화 조건 |
|------|------------|
| GitHub 저장소 | `repoUrl`이 유효한 GitHub URL |
| 배포 사이트 | `baseUrl`이 비어있지 않음 |

### 커맨드 활성화 상태

커맨드는 항상 등록되지만, 실행 시 URL이 없으면 Notice로 안내합니다.

## 데이터 흐름

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ PluginSettings  │────▶│  QuickLinks      │────▶│ External Browser│
│ (repoUrl)       │     │  Component       │     │ (window.open)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│QuartzConfigSvc  │────▶│  QuickLinks      │────▶│ External Browser│
│ (baseUrl)       │     │  Component       │     │ (window.open)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 변경 사항 요약

- **새 테이블/엔티티**: 없음
- **새 필드**: 없음
- **마이그레이션**: 불필요
- **기존 데이터 영향**: 없음 (읽기 전용)
