# Contract: QuartzConfigService

**Feature**: 004-advanced-quartz-config
**Date**: 2026-01-14

## Overview

Quartz 설정 파일(`quartz.config.ts`)의 파싱, 수정, 저장을 담당하는 서비스의 계약 정의.

## Interface Definition

```typescript
interface IQuartzConfigService {
  /**
   * GitHub에서 quartz.config.ts 파일을 가져와 파싱
   * @returns 파싱된 설정 객체와 파일 SHA
   * @throws NetworkError - 네트워크 연결 실패
   * @throws ParseError - 설정 파일 파싱 실패
   * @throws AuthError - GitHub 인증 실패
   */
  loadConfig(): Promise<{
    config: QuartzSiteConfig;
    sha: string;
  }>;

  /**
   * 현재 캐시된 설정 반환 (로드 없이)
   * @returns 캐시된 설정 또는 null
   */
  getCachedConfig(): QuartzSiteConfig | null;

  /**
   * 설정 변경사항을 GitHub에 커밋&푸시
   * @param config - 저장할 설정
   * @param originalSha - 충돌 감지용 원본 SHA
   * @param commitMessage - 커밋 메시지
   * @returns 업데이트 결과
   */
  saveConfig(
    config: QuartzSiteConfig,
    originalSha: string,
    commitMessage: string
  ): Promise<ConfigUpdateResult>;

  /**
   * 원격 파일의 현재 SHA 조회 (충돌 감지용)
   * @returns 현재 파일 SHA
   */
  getRemoteSha(): Promise<string>;

  /**
   * 설정 객체를 quartz.config.ts 형식 문자열로 변환
   * @param config - 변환할 설정
   * @param originalContent - 원본 파일 내용 (포맷 유지용)
   * @returns 변환된 파일 내용
   */
  serializeConfig(
    config: QuartzSiteConfig,
    originalContent: string
  ): string;

  /**
   * quartz.config.ts 내용을 파싱하여 설정 객체로 변환
   * @param content - 파일 내용
   * @returns 파싱된 설정
   * @throws ParseError - 파싱 실패
   */
  parseConfig(content: string): QuartzSiteConfig;
}
```

## Method Specifications

### loadConfig()

| Aspect | Specification |
|--------|---------------|
| Pre-conditions | GitHub 연결 설정 완료, 유효한 토큰 |
| Post-conditions | config와 sha가 캐시에 저장됨 |
| Performance | 5초 이내 응답 (SC-002) |
| Retry | 네트워크 오류 시 최대 3회 재시도 |

### saveConfig()

| Aspect | Specification |
|--------|---------------|
| Pre-conditions | config가 유효성 검사 통과, originalSha가 유효 |
| Post-conditions | 성공 시 캐시가 새 값으로 업데이트 |
| Performance | 15초 이내 응답 (SC-005) |
| Conflict Handling | SHA 불일치 시 `errorType: 'conflict'` 반환 |

### serializeConfig()

| Aspect | Specification |
|--------|---------------|
| Pre-conditions | config 객체가 유효 |
| Post-conditions | 원본 포맷/주석 최대한 보존 |
| Output | 유효한 TypeScript 코드 |

## Error Handling

```typescript
type ConfigServiceError =
  | { type: 'network'; message: string; retryable: true }
  | { type: 'auth'; message: string; retryable: false }
  | { type: 'parse'; message: string; retryable: false }
  | { type: 'conflict'; message: string; retryable: false; remoteSha: string }
  | { type: 'rate_limited'; message: string; retryable: true; retryAfter: number };
```

## Usage Example

```typescript
// 설정 로드
const { config, sha } = await configService.loadConfig();

// 설정 수정
const updatedConfig = { ...config, pageTitle: 'My Garden' };

// 충돌 확인 후 저장
const remoteSha = await configService.getRemoteSha();
if (remoteSha !== sha) {
  // 충돌 처리
  return;
}

const result = await configService.saveConfig(
  updatedConfig,
  sha,
  'Update Quartz config: pageTitle'
);

if (!result.success) {
  // 오류 처리
  console.error(result.errorMessage);
}
```

## Dependencies

- `GitHubService` - GitHub API 호출
- `QuartzSiteConfig` - 설정 타입 정의 (data-model.md 참조)

## Testing Requirements

- 각 메서드에 대한 단위 테스트
- 네트워크 오류 시나리오 모킹
- SHA 충돌 시나리오 테스트
- 다양한 설정 파일 형식 파싱 테스트
