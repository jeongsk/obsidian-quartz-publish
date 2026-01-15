# Research: Quartz Publish Plugin

**Feature**: 001-quartz-publish
**Date**: 2026-01-13

## 1. GitHub API Integration

### Decision
GitHub REST API v3를 사용하여 Contents API로 파일 업로드/삭제 처리

### Rationale
- Obsidian 플러그인 환경에서 직접 git 명령 실행 불가
- Contents API는 단일 파일 CRUD 작업에 적합
- Personal Access Token 기반 인증이 단순하고 안전

### Alternatives Considered
- **Git Data API (low-level)**: 트리/블롭 직접 조작 가능하나 구현 복잡도 높음
- **octokit/rest.js**: 기능 풍부하나 번들 크기 증가, Obsidian 환경에서 fetch API로 충분
- **GraphQL API v4**: 배치 쿼리에 유리하나 단일 파일 작업에는 과도함

### Implementation Notes
```typescript
// Base URL: https://api.github.com
// Auth Header: Authorization: Bearer <token>

// 파일 읽기/쓰기
GET/PUT /repos/{owner}/{repo}/contents/{path}

// 리포지토리 정보
GET /repos/{owner}/{repo}

// Rate Limit 확인
GET /rate_limit
```

---

## 2. Obsidian Plugin Architecture

### Decision
Obsidian Plugin API를 활용한 표준 플러그인 구조 (main.ts, settings.ts, 서비스 모듈 분리)

### Rationale
- Obsidian 공식 플러그인 패턴 준수로 호환성 보장
- 설정 탭, 커맨드 팔레트, 파일 메뉴 등 표준 UI 컴포넌트 활용
- TFile, Vault API를 통한 안전한 파일 접근

### Key APIs
```typescript
// 플러그인 라이프사이클
Plugin.onload(), Plugin.onunload()

// 설정 관리
Plugin.loadData(), Plugin.saveData()

// 커맨드 등록
Plugin.addCommand({ id, name, callback })

// 파일 메뉴
Plugin.registerEvent(app.workspace.on('file-menu', callback))

// 파일 접근
app.vault.read(file), app.vault.modify(file, content)
app.metadataCache.getFileCache(file) // 프론트매터 파싱
```

### Alternatives Considered
- **직접 파일시스템 접근**: Obsidian API 우회 시 동기화 문제 발생 가능
- **Electron IPC**: 플랫폼 종속적, 모바일 미지원

---

## 3. Content Transformation

### Decision
마크다운 파서 없이 정규식 기반 변환으로 내부 링크와 이미지 참조 처리

### Rationale
- `[[링크]]` 형식은 단순 패턴 매칭으로 충분
- 외부 라이브러리 의존성 최소화
- Quartz는 기본적으로 Obsidian 형식 지원하므로 최소 변환만 필요

### Transformation Rules
```typescript
// 내부 링크 (발행된 노트만 링크 유지)
[[note]] → [note](note.md) (발행됨)
[[note]] → note (미발행)

// 이미지 임베드
![[image.png]] → ![image](/static/images/note-name/image.png)

// 위키링크 with alias
[[note|alias]] → [alias](note.md)
```

### Alternatives Considered
- **remark/unified**: 완전한 AST 파싱 가능하나 번들 크기 큼
- **obsidian-dataview 파서**: 복잡한 쿼리 지원 불필요

---

## 4. State Management (발행 기록 추적)

### Decision
플러그인 데이터 (`data.json`)에 해시 기반 발행 기록 저장

### Rationale
- Obsidian의 `Plugin.saveData()` API로 자동 영속화
- 노트 파일 오염 없이 상태 관리 가능
- MD5/SHA256 해시로 변경 감지 정확도 보장

### Data Structure
```typescript
interface PublishRecord {
  localPath: string;      // 볼트 내 경로
  remotePath: string;     // 리포지토리 내 경로
  contentHash: string;    // SHA256 해시
  publishedAt: number;    // Unix timestamp
  attachments: string[];  // 함께 발행된 첨부파일
}

interface PluginData {
  githubToken: string;    // 암호화 권장
  repoUrl: string;
  publishRecords: Record<string, PublishRecord>;
}
```

### Alternatives Considered
- **프론트매터 저장**: 노트 파일 수정 필요, 사용자 경험 저하
- **별도 SQLite DB**: 복잡도 증가, Obsidian 동기화와 충돌 가능
- **localStorage**: 용량 제한, 볼트 간 공유 불가

---

## 5. UI Components

### Decision
Obsidian Modal 클래스 확장 + TailwindCSS v4로 대시보드 UI 구현

### Rationale
- CLAUDE.md에 TailwindCSS v4 사용 명시
- Obsidian 네이티브 모달로 일관된 UX 제공
- `hn:` 프리픽스로 스타일 충돌 방지

### Component Structure
```typescript
// 대시보드 모달
class PublishDashboardModal extends Modal {
  // 상태별 노트 목록 표시
  // 일괄 선택/발행 기능
  // 진행률 표시
}

// 설정 탭
class QuartzPublishSettingTab extends PluginSettingTab {
  // GitHub 토큰 입력
  // 리포지토리 URL 설정
  // 연결 테스트 버튼
  // Quartz 옵션 (Phase 3)
}
```

### Alternatives Considered
- **React/Svelte**: 추가 빌드 설정 필요, 번들 크기 증가
- **순수 DOM API**: 복잡한 UI에서 유지보수 어려움

---

## 6. Error Handling & Rate Limiting

### Decision
GitHub API 응답 기반 재시도 로직 + 사용자 친화적 오류 메시지

### Rationale
- GitHub API rate limit (5000 req/hour for authenticated)
- 네트워크 오류 시 안전한 실패 처리 필수

### Implementation
```typescript
// Rate Limit 헤더 확인
X-RateLimit-Remaining, X-RateLimit-Reset

// 재시도 전략
- 403 rate limit → 대기 시간 표시 후 재시도
- 401 unauthorized → 토큰 재설정 안내
- 404 not found → 리포지토리/파일 경로 확인 안내
- 5xx server error → 일정 시간 후 자동 재시도 (최대 3회)
```

---

## 7. Security Considerations

### Decision
GitHub PAT를 Obsidian 플러그인 데이터에 저장 (기본 난독화)

### Rationale
- Obsidian은 `data.json`을 평문 저장하지만 로컬 전용
- 복잡한 암호화보다 사용 편의성 우선
- 토큰 권한 범위 최소화 권장 (repo scope만)

### Recommendations
- 설정 UI에서 토큰 입력 시 password 타입 사용
- 토큰 발급 시 최소 권한 안내 (repo only)
- 민감 정보 로깅 금지

### Alternatives Considered
- **OS Keychain 연동**: Electron API 필요, 모바일 미지원
- **OAuth App**: 서버 필요, 개인 프로젝트에 과도함

---

## 8. Quartz Compatibility

### Decision
Quartz v4 기본 설정과 호환되는 콘텐츠 구조 유지

### Rationale
- `content/` 폴더에 마크다운 저장 (Quartz 기본)
- `static/` 폴더에 정적 파일 저장 (이미지 등)
- 프론트매터 `draft: true` 지원 (RemoveDrafts 플러그인)

### Quartz Config Integration (Phase 3)
```typescript
// quartz.config.ts 파싱 및 수정 대상
{
  configuration: {
    ignorePatterns: string[]
  },
  plugins: {
    filters: Plugin[]  // ExplicitPublish() 추가/제거
  }
}
```

---

## Summary of Technical Decisions

| Area | Decision | Key Reason |
|------|----------|------------|
| GitHub API | REST API v3 + fetch | 단순성, 번들 크기 |
| Plugin Architecture | Obsidian 표준 패턴 | 호환성, 안정성 |
| Content Transform | 정규식 기반 | 최소 의존성 |
| State Management | Plugin data + hash | 파일 비오염 |
| UI | Modal + TailwindCSS v4 | 프로젝트 요구사항 |
| Error Handling | 재시도 + 친화적 메시지 | UX |
| Security | 평문 저장 + 최소 권한 | 편의성 우선 |
| Quartz | v4 기본 구조 호환 | 범용성 |
