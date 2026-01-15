# Quartz 날짜 처리 방식

Quartz 블로그에서 노트의 작성일/수정일을 어떻게 처리하는지 정리한 문서입니다.

## 날짜 데이터 소스

Quartz는 **3가지 데이터 소스**를 우선순위에 따라 사용합니다:

| 우선순위 | 소스 | 설명 |
|---------|------|------|
| 1 | `frontmatter` | 마크다운 프론트매터의 날짜 필드 |
| 2 | `git` | Git 커밋 히스토리 기반 |
| 3 | `filesystem` | 파일 시스템의 생성/수정 시간 |

기본 우선순위: `["frontmatter", "git", "filesystem"]`

## 지원되는 프론트매터 필드

### 생성일 (created)

```yaml
created: 2024-01-15
# 또는
date: 2024-01-15
```

### 수정일 (modified)

```yaml
modified: 2024-01-20
# 또는
lastmod: 2024-01-20
updated: 2024-01-20
last-modified: 2024-01-20
```

### 발행일 (published)

```yaml
published: 2024-01-15
# 또는
publishDate: 2024-01-15
date: 2024-01-15
```

> **참고**: `date` 필드는 생성일과 발행일 모두에서 사용될 수 있습니다.

## Quartz 설정

`quartz.config.ts`의 `CreatedModifiedDate` 플러그인에서 설정합니다:

```ts
Plugin.CreatedModifiedDate({
  priority: ["frontmatter", "git", "filesystem"]
})
```

### 설정 옵션

- **priority**: 날짜 정보를 가져올 데이터 소스 우선순위
  - `"frontmatter"`: 프론트매터에서 가져옴
  - `"git"`: Git 히스토리에서 가져옴
  - `"filesystem"`: 파일 시스템에서 가져옴

## 권장사항

### Git 기반 날짜 사용 시

`quartz.config.ts`에서 `defaultDateType`을 `modified`로 설정하세요:

```ts
const config: QuartzConfig = {
  configuration: {
    defaultDateType: "modified",
    // ...
  },
  // ...
}
```

### 호스팅 환경 주의사항

호스팅 환경에 따라 파일시스템 날짜가 로컬과 다를 수 있습니다:

- **GitHub Actions 배포**: Git clone 시 파일 시간이 변경됨
- **Vercel/Netlify**: 빌드 시점의 시간으로 설정될 수 있음

정확한 날짜가 필요하면 **frontmatter** 또는 **git** 사용을 권장합니다.

## 이 플러그인에서의 활용

Quartz Publish 플러그인에서 노트를 발행할 때 프론트매터에 날짜를 자동으로 추가할 수 있습니다:

```yaml
---
title: 노트 제목
created: 2024-01-15
modified: 2024-01-20
draft: false
---
```

## 참고 링크

- [Quartz Frontmatter 문서](https://quartz.jzhao.xyz/plugins/Frontmatter)
- [Quartz CreatedModifiedDate 문서](https://quartz.jzhao.xyz/plugins/CreatedModifiedDate)
- [Quartz Configuration 문서](https://quartz.jzhao.xyz/configuration)
