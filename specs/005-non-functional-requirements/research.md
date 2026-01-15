# Research: 비기능 요구사항

**Date**: 2026-01-14
**Feature**: 005-non-functional-requirements

## 1. 네트워크 연결 상태 감지

### Decision
`navigator.onLine` API와 `online`/`offline` 이벤트를 활용하여 네트워크 상태를 감지합니다.

### Rationale
- Obsidian은 Electron 기반으로, 브라우저 API인 `navigator.onLine`을 사용할 수 있습니다.
- 실시간 상태 변경 감지를 위해 `window.addEventListener('online'/'offline')` 이벤트를 활용합니다.
- 단순하고 신뢰할 수 있으며, 추가 의존성이 필요 없습니다.

### Alternatives Considered
| 대안 | 장점 | 단점 | 채택 여부 |
|------|------|------|----------|
| `navigator.onLine` | 간단, 빠름, 내장 API | 일부 환경에서 부정확할 수 있음 | ✅ 채택 |
| GitHub API ping | 실제 연결 확인 가능 | 지연 발생, Rate Limit 소모 | ❌ 보조 용도로만 |
| fetch HEAD 요청 | 실제 연결 확인 | 지연 발생, CORS 문제 가능 | ❌ 미채택 |

### Implementation Notes
```typescript
// NetworkService 클래스 구조
class NetworkService {
  isOnline(): boolean {
    return navigator.onLine;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    // 이벤트 리스너 등록/해제
  }
}
```

---

## 2. 대용량 파일 검증

### Decision
발행 전 첨부파일 크기를 검사하고, 10MB 초과 시 경고 모달을 표시합니다.

### Rationale
- 기존 `MAX_FILE_SIZE` 상수(10MB)가 이미 정의되어 있습니다.
- 현재 `publish.ts`에서 첨부파일 업로드 시 크기 검사를 하지만, 사전 경고 없이 스킵만 합니다.
- 사용자가 발행 전에 대용량 파일을 인지하고 선택할 수 있어야 합니다.

### Alternatives Considered
| 대안 | 장점 | 단점 | 채택 여부 |
|------|------|------|----------|
| 사전 경고 모달 + 선택 | 사용자 제어권, 명확한 UX | 추가 클릭 필요 | ✅ 채택 |
| 자동 스킵 + Notice | 간단 | 사용자가 인지하지 못할 수 있음 | ❌ 미채택 |
| 자동 압축 | 파일 크기 감소 | 품질 저하, 복잡성 증가 | ❌ 미채택 |

### Implementation Notes
```typescript
// FileValidatorService 클래스 구조
interface LargeFileInfo {
  file: TFile;
  size: number;
  formattedSize: string;
}

class FileValidatorService {
  findLargeFiles(files: TFile[]): LargeFileInfo[];
  formatFileSize(bytes: number): string;
}
```

---

## 3. UI 패턴 조사

### Decision
Obsidian의 기존 Modal 클래스를 확장하여 경고 모달을 구현합니다.

### Rationale
- 프로젝트에서 이미 `DashboardModal` 등 Modal 패턴을 사용 중입니다.
- Obsidian 디자인 가이드라인과 일관성을 유지합니다.
- TailwindCSS `qp:` 프리픽스 클래스를 사용합니다.

### Modal Structure
```typescript
// LargeFileWarningModal 구조
class LargeFileWarningModal extends Modal {
  private largeFiles: LargeFileInfo[];
  private onConfirm: () => void;
  private onCancel: () => void;

  // 파일 목록 표시 + 계속/취소 버튼
}
```

---

## 4. 기존 코드 통합 지점

### 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/main.ts` | 발행 명령 실행 전 네트워크 검사 추가 |
| `src/services/publish.ts` | 발행 전 대용량 파일 검사 훅 추가 |
| `src/ui/dashboard-modal.ts` | 일괄 발행 전 검사 로직 추가 |

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/services/network.ts` | 네트워크 상태 감지 서비스 |
| `src/services/file-validator.ts` | 파일 크기 검증 서비스 |
| `src/ui/large-file-warning-modal.ts` | 대용량 파일 경고 모달 |

---

## 5. 오류 메시지 정의

### 오프라인 메시지
- Notice: "인터넷 연결을 확인해주세요. 발행하려면 네트워크 연결이 필요합니다."
- Dashboard 상태: "오프라인 - 발행 불가"

### 대용량 파일 경고 모달
- 제목: "대용량 파일 경고"
- 본문: "다음 파일이 10MB를 초과합니다. 발행 시 해당 파일이 업로드되지 않을 수 있습니다."
- 파일 목록: 파일명 + 크기
- 버튼: "계속 진행" / "취소"

---

## 결론

모든 NEEDS CLARIFICATION 항목이 해결되었습니다. 기존 코드베이스의 패턴을 따르며, `navigator.onLine` API와 Modal 패턴을 활용하여 구현합니다.
