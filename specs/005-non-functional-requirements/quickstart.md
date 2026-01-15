# Quickstart: 비기능 요구사항

**Date**: 2026-01-14
**Feature**: 005-non-functional-requirements

## 구현 순서

### 1단계: 네트워크 서비스 구현

```bash
# 파일 생성
touch src/services/network.ts
touch tests/unit/services/network.test.ts
```

**핵심 구현**:
- `NetworkService` 클래스 생성
- `isOnline()` 메서드: `navigator.onLine` 반환
- `onStatusChange()` 메서드: 이벤트 리스너 관리
- `destroy()` 메서드: 리스너 정리

### 2단계: 파일 검증 서비스 구현

```bash
# 파일 생성
touch src/services/file-validator.ts
touch tests/unit/services/file-validator.test.ts
```

**핵심 구현**:
- `FileValidatorService` 클래스 생성
- `findLargeFiles()` 메서드: 대용량 파일 필터링
- `formatFileSize()` 메서드: 바이트를 읽기 쉬운 형식으로 변환

### 3단계: 대용량 파일 경고 모달 구현

```bash
# 파일 생성
touch src/ui/large-file-warning-modal.ts
```

**핵심 구현**:
- `LargeFileWarningModal` 클래스 (Modal 확장)
- 파일 목록 테이블 렌더링
- "계속 진행" / "취소" 버튼
- Promise 기반 결과 반환

### 4단계: 기존 코드 통합

**main.ts 수정**:
```typescript
// 발행 명령 실행 전
if (!this.networkService.isOnline()) {
  new Notice('인터넷 연결을 확인해주세요.');
  return;
}
```

**publish.ts 수정**:
```typescript
// publishNote() 시작 부분에 preflight 검사 추가
const preflight = await this.runPreflight(file);
if (!preflight.canPublish) {
  return { success: false, file, error: preflight.blockReason };
}
```

**dashboard-modal.ts 수정**:
```typescript
// 일괄 발행 버튼 클릭 핸들러
// 1. 오프라인 체크
// 2. 대용량 파일 체크 → 모달 표시
// 3. 사용자 확인 후 발행 진행
```

---

## 테스트 실행

```bash
# 단위 테스트
npm run test

# 특정 테스트만 실행
npm run test -- --grep "NetworkService"
npm run test -- --grep "FileValidatorService"
```

---

## 수동 검증 체크리스트

### 오프라인 감지
- [ ] Wi-Fi 끄고 발행 명령 실행 → Notice 표시 확인
- [ ] Wi-Fi 끄고 대시보드에서 발행 → 버튼 비활성화 또는 안내 메시지 확인
- [ ] 발행 중 Wi-Fi 끊김 → 네트워크 오류 메시지 확인

### 대용량 파일 경고
- [ ] 10MB 초과 이미지 포함 노트 발행 → 경고 모달 표시 확인
- [ ] 경고 모달에서 "계속 진행" → 발행 진행 확인
- [ ] 경고 모달에서 "취소" → 발행 중단 확인
- [ ] 여러 대용량 파일 → 모든 파일 목록 표시 확인

---

## 디렉토리 구조 (최종)

```
src/
├── main.ts                          # 수정: 네트워크 검사 추가
├── types.ts                         # 수정: 새 타입 추가
├── services/
│   ├── publish.ts                   # 수정: preflight 검사 추가
│   ├── network.ts                   # 신규: 네트워크 서비스
│   └── file-validator.ts            # 신규: 파일 검증 서비스
└── ui/
    ├── dashboard-modal.ts           # 수정: 오프라인/대용량 파일 처리
    └── large-file-warning-modal.ts  # 신규: 경고 모달

tests/
└── unit/
    └── services/
        ├── network.test.ts          # 신규
        └── file-validator.test.ts   # 신규
```
