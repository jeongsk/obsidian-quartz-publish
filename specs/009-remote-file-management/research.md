# Research: 원격 저장소 파일 관리

**Feature Branch**: `009-remote-file-management`
**Date**: 2026-01-15

## 1. GitHub API - 디렉토리 파일 목록 조회

### Decision
GitHub Contents API의 `GET /repos/{owner}/{repo}/contents/{path}` 엔드포인트 사용

### Rationale
- 기존 GitHubService에서 이미 유사한 API 호출 패턴 사용 중
- 재귀적 트리 조회(Git Trees API)보다 단순하고 충분한 정보 제공
- 파일 경로, 이름, SHA, 크기 등 필요한 모든 메타데이터 포함

### Alternatives Considered
1. **Git Trees API** (`GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1`)
   - 장점: 전체 트리를 한 번에 조회
   - 단점: 파일 크기, 마지막 수정일 정보 없음, 추가 API 호출 필요

2. **GraphQL API**
   - 장점: 필요한 필드만 선택적 조회
   - 단점: 기존 코드베이스가 REST API 기반, 일관성 저하

### Implementation Notes
```typescript
// 기존 GitHubService 메서드 확장 필요
async getDirectoryContents(path: string): Promise<GitHubFileInfo[]>
```

---

## 2. GitHub API - 파일 삭제

### Decision
기존 `GitHubService.deleteFile()` 메서드 재사용

### Rationale
- 이미 구현되어 있고 테스트된 메서드
- `DELETE /repos/{owner}/{repo}/contents/{path}` 엔드포인트 사용
- SHA 기반 동시성 제어 지원

### Implementation Notes
```typescript
// 기존 메서드 시그니처
async deleteFile(path: string, sha: string, message: string): Promise<void>
```

일괄 삭제 시 순차적 호출 필요 (GitHub API는 bulk delete 미지원)

---

## 3. 파일 목록 페이지네이션

### Decision
GitHub API의 기본 페이지네이션 활용 + 클라이언트 측 지연 로딩

### Rationale
- GitHub Contents API는 디렉토리당 최대 1,000개 파일 반환
- 대부분의 Quartz 사이트는 이 제한 이내
- 1,000개 초과 시 Git Trees API로 폴백 가능

### Alternatives Considered
1. **무한 스크롤**: UX 복잡도 증가, 구현 시간 증가
2. **전통적 페이지네이션**: 사용자 경험 단절
3. **가상 스크롤링**: Obsidian Modal 환경에서 구현 복잡

---

## 4. 중복 파일 감지 알고리즘

### Decision
파일명 기반 해시맵 그룹핑

### Rationale
- Clarification에서 "파일명만 비교"로 결정됨
- O(n) 시간 복잡도로 효율적
- 콘텐츠 비교 없이 빠른 감지

### Implementation
```typescript
function detectDuplicates(files: PublishedFile[]): DuplicateGroup[] {
  const fileNameMap = new Map<string, PublishedFile[]>();

  files.forEach(file => {
    const fileName = file.name;
    const existing = fileNameMap.get(fileName) || [];
    existing.push(file);
    fileNameMap.set(fileName, existing);
  });

  return Array.from(fileNameMap.entries())
    .filter(([_, files]) => files.length > 1)
    .map(([name, files]) => ({
      fileName: name,
      files,
      count: files.length
    }));
}
```

---

## 5. 세션 캐싱 전략

### Decision
클래스 인스턴스 변수로 캐싱, 모달 라이프사이클에 바인딩

### Rationale
- Clarification에서 "세션 단위 캐싱"으로 결정됨
- 모달이 열릴 때 로드, 닫힐 때 자동 폐기
- 수동 새로고침으로 갱신 가능

### Implementation
```typescript
class RemoteFileManagerModal extends Modal {
  private cachedFiles: PublishedFile[] | null = null;

  async loadFiles(forceRefresh = false): Promise<void> {
    if (this.cachedFiles && !forceRefresh) return;
    this.cachedFiles = await this.fetchFiles();
  }

  onClose(): void {
    this.cachedFiles = null;  // 자동 정리
  }
}
```

---

## 6. UI 컴포넌트 패턴

### Decision
기존 모달 패턴 준수 (Obsidian Modal 상속)

### Rationale
- 코드베이스 일관성 유지
- 기존 ConfirmModal, ConflictModal 패턴 재사용
- TailwindCSS `qp:` 프리픽스 사용

### Key Components
1. **RemoteFileManagerModal**: 메인 파일 관리 모달
2. **DeleteConfirmModal**: 삭제 확인 (ConfirmModal 확장 또는 재사용)
3. **FileListView**: 파일 목록 렌더링 컴포넌트

---

## 7. 설정 탭 통합

### Decision
기존 설정 탭에 "발행된 파일 관리" 버튼 추가

### Rationale
- Clarification에서 "설정 탭에 버튼 추가"로 결정됨
- 기존 `createGitHubSection` 또는 새 섹션에 추가
- GitHubService 연결 상태 확인 후 활성화

### Implementation Location
`src/ui/settings-tab.ts`의 GitHub 연동 섹션 하단

---

## 8. i18n 키 구조

### Decision
계층적 키 구조 유지

### New Keys Required
```typescript
// 모달
'modal.remoteFiles.title': 'Manage Published Files',
'modal.remoteFiles.empty': 'No published files found',
'modal.remoteFiles.loading': 'Loading files...',
'modal.remoteFiles.refresh': 'Refresh',
'modal.remoteFiles.delete': 'Delete Selected',
'modal.remoteFiles.search': 'Search files...',

// 삭제
'modal.remoteFiles.deleteConfirm.title': 'Confirm Deletion',
'modal.remoteFiles.deleteConfirm.message': 'Are you sure you want to delete {{count}} file(s)?',
'modal.remoteFiles.deleteSuccess': 'Successfully deleted {{count}} file(s)',
'modal.remoteFiles.deleteFailed': 'Failed to delete some files',

// 중복
'modal.remoteFiles.duplicates': 'Duplicate files detected',
'modal.remoteFiles.duplicateCount': '{{count}} duplicate groups',

// 설정
'settings.github.manageFiles': 'Manage Published Files',
'settings.github.manageFilesDesc': 'View and delete files from your remote repository',

// 에러
'error.remoteFiles.loadFailed': 'Failed to load file list',
'error.remoteFiles.deleteFailed': 'Failed to delete file: {{path}}',
'error.remoteFiles.maxFiles': 'Cannot delete more than {{max}} files at once',
```

---

## 9. 에러 처리 전략

### Decision
기존 GitHubError 패턴 재사용 + Notice 알림

### Error Scenarios
| 시나리오 | 처리 |
|----------|------|
| 네트워크 오류 | Notice + 재시도 버튼 |
| API 속도 제한 | Notice + 대기 시간 표시 |
| 권한 부족 | Notice + 토큰 확인 안내 |
| 일괄 삭제 부분 실패 | 성공/실패 요약 모달 |

---

## 10. 성능 고려사항

### Decision
지연 로딩 + 검색 디바운싱

### Implementation
- 파일 목록: 초기 로드 후 캐싱
- 검색: 300ms 디바운스
- 삭제: 순차 처리 + 진행률 표시 (5개 이상일 때)

### Performance Targets (from spec)
- 목록 로드: 5초 이내 (100개 파일 기준)
- 검색: 10초 이내에 원하는 파일 찾기
