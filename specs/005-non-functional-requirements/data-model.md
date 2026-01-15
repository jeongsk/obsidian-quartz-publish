# Data Model: 비기능 요구사항

**Date**: 2026-01-14
**Feature**: 005-non-functional-requirements

## 개요

이 기능은 새로운 데이터 저장이 필요하지 않습니다. 기존 타입 시스템을 확장하여 런타임 상태 관리에만 집중합니다.

---

## 신규 타입 정의

### NetworkStatus (런타임 상태)

```typescript
/**
 * 네트워크 연결 상태
 */
export type NetworkStatus = 'online' | 'offline' | 'unknown';

/**
 * 네트워크 상태 변경 콜백
 */
export type NetworkStatusCallback = (status: NetworkStatus) => void;
```

### LargeFileInfo (검증 결과)

```typescript
/**
 * 대용량 파일 정보
 */
export interface LargeFileInfo {
  /** 파일 객체 */
  file: TFile;
  /** 파일 크기 (bytes) */
  size: number;
  /** 포맷된 크기 (예: "12.5 MB") */
  formattedSize: string;
}

/**
 * 파일 검증 결과
 */
export interface FileValidationResult {
  /** 검증 통과 여부 */
  isValid: boolean;
  /** 대용량 파일 목록 */
  largeFiles: LargeFileInfo[];
  /** 총 대용량 파일 수 */
  count: number;
}
```

### PublishPreflightResult (발행 전 검사 결과)

```typescript
/**
 * 발행 전 검사 결과
 */
export interface PublishPreflightResult {
  /** 발행 가능 여부 */
  canPublish: boolean;
  /** 네트워크 상태 */
  networkStatus: NetworkStatus;
  /** 대용량 파일 검증 결과 */
  fileValidation: FileValidationResult;
  /** 차단 사유 (발행 불가 시) */
  blockReason?: 'offline' | 'large_files_rejected';
}
```

---

## 기존 타입 확장

### PublishError 확장

```typescript
// types.ts의 PublishError에 추가
export type PublishError =
  | 'not_connected'
  | 'no_publish_flag'
  | 'file_too_large'
  | 'network_error'
  | 'rate_limited'
  | 'conflict'
  | 'offline'        // [신규] 오프라인 상태
  | 'unknown';
```

---

## 상태 흐름

```
발행 요청
    │
    ▼
┌─────────────────┐
│ 네트워크 검사   │ ──offline──▶ Notice 표시 + 중단
└────────┬────────┘
         │ online
         ▼
┌─────────────────┐
│ 파일 크기 검사  │ ──large files──▶ 경고 모달
└────────┬────────┘                      │
         │ no large files         ┌──────┴──────┐
         │                        │             │
         ▼                   "계속"         "취소"
┌─────────────────┐              │             │
│ 기존 발행 로직  │◀─────────────┘             ▼
└─────────────────┘                       중단
```

---

## 관계도

```
┌─────────────────┐       ┌──────────────────┐
│  NetworkService │◀──────│    main.ts       │
└─────────────────┘       └──────────────────┘
                                   │
                                   ▼
┌─────────────────┐       ┌──────────────────┐
│ FileValidator   │◀──────│  PublishService  │
│    Service      │       └──────────────────┘
└─────────────────┘               │
         │                        ▼
         │              ┌──────────────────┐
         └─────────────▶│ LargeFileWarning │
                        │      Modal       │
                        └──────────────────┘
```

---

## 데이터 저장

이 기능은 영구 저장이 필요 없습니다:
- 네트워크 상태: 런타임에서만 관리
- 파일 크기: 매 발행 시 실시간 검사
- 사용자 선택: 세션 단위, 저장하지 않음
