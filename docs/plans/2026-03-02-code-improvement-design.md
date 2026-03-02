# Code Improvement Design Document

**Date**: 2026-03-02
**Status**: Approved
**Author**: Claude Code

## Overview

이 문서는 Obsidian Quartz Publish 플러그인의 코드 리뷰 결과에 따른 개선 사항에 대한 설계를 기술합니다.

코드 리뷰에서 식별된 5가지 개선 사항을 우선순위별로 단계적으로 해결합니다.

## Priority Items

| Priority | Item | Location |
|----------|------|----------|
| 🔴 Critical | GitHub 토큰 암호화 저장 | settings-tab.ts |
| 🟡 Important | 하드코딩된 한국어 메시지 i18n 적용 | publisher.ts:374 |
| 🟡 Important | any 타입 제거 | service.ts:1325-1327 |
| 🟢 Minor | 디버그용 console.log 제거 | main.ts:450-495 |
| 🟢 Minor | 매직 넘버 상수화 | 전체 코드 |

---

## Phase 1: Critical - GitHub Token Encryption

### Current Issue

GitHub PAT(Personal Access Token)가 암호화 없이 `data.json`에 평문으로 저장됩니다.

```typescript
// settings-tab.ts:174-176
tokenInputEl.type = "password";
tokenInputEl.autocomplete = "off";
// Token is stored in plain text in data.json
```

### Design: Obsidian Encryption API

Obsidian Plugin API의 암호화 기능을 활용하여 토큰을 안전하게 저장합니다.

### Components

1. **TokenStorageService** (New Service)
   - Location: `entities/quartz-site-config/token-storage.service.ts` or `shared/services/token-storage.service.ts`
   - Interface:
     ```typescript
     interface TokenStorageService {
       saveToken(token: string): Promise<void>;
       getToken(): Promise<string | null>;
       clearToken(): Promise<void>;
     }
     ```

2. **Files to Modify**
   - `app/settings-tab.ts`: Use TokenStorageService instead of direct storage
   - `entities/quartz-site-config/`: Separate token storage logic

3. **Migration Strategy**
   - Automatically migrate existing plain-text tokens to encrypted format
   - Show migration notice to user on first run

### Implementation Notes

- Use Obsidian's built-in encryption APIs
- Ensure backward compatibility for existing users
- Add error handling for encryption/decryption failures

---

## Phase 2: Important - i18n & Type Safety

### 2-A: i18n for Hardcoded Messages

#### Current Issue

```typescript
// publisher.ts:374-378
error: isNetworkError
  ? "네트워크 연결을 확인하고 다시 시도해주세요."
  : error instanceof Error ? error.message : "Unknown error",
```

#### Design

1. **Add Translation Keys**
   - `shared/lib/i18n/locales/ko.ts`: Add `error.networkConnectionFailed`
   - `shared/lib/i18n/locales/en.ts`: Add English translation

2. **Modify PublisherService**
   - Inject i18n `t()` function via constructor
   - Replace hardcoded message with `t('error.networkConnectionFailed')`

### 2-B: Remove `any` Types

#### Current Issue

```typescript
// service.ts:1325-1327
succeeded: succeeded as any,
failed: failed as any,
```

#### Design

1. **Improve Type Definitions**
   - Define proper return types for the function
   - Use generics or interfaces based on actual types of `succeeded`/`failed`

2. **Code Modification**
   - Remove `as any` type assertions
   - Use type guards or type narrowing

---

## Phase 3: Minor - Code Cleanup

### 3-A: Remove Debug console.log

#### Current Issue

Multiple `console.log` statements in `main.ts:450-495`

#### Design

**Option A (Recommended)**: Remove entirely
- Obsidian has built-in debugger
- No additional logging dependency needed

**Option B**: Conditional logger
- Create `shared/lib/logger.ts`
- Only log in development mode

**Decision**: Option A - Remove all console.log statements

### 3-B: Constantize Magic Numbers

#### Current Issue

```typescript
// publisher.ts
await this.delay(500);  // Rate limit delay

// service.ts
12 * 60 * 60 * 1000  // Cleanup interval
```

#### Design

1. **Constant Files**
   - `shared/constants/rate-limits.ts`: Rate limit related constants
   - `shared/constants/time.ts`: Time related constants

2. **Example Constants**
   ```typescript
   export const GITHUB_API_DELAY_MS = 500;
   export const CACHE_CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;
   ```

---

## Execution Order

| Phase | Description | Dependencies |
|-------|-------------|--------------|
| 1 | Token encryption implementation | None |
| 2 | i18n and type safety | Phase 1 complete |
| 3 | Code cleanup | Phase 2 complete |

Each phase will be tested and verified before proceeding to the next.

---

## Success Criteria

- [ ] Token is encrypted at rest
- [ ] All user-facing messages use i18n
- [ ] No `any` types in production code
- [ ] No console.log in production code
- [ ] All magic numbers are constants
- [ ] All tests pass (89.7% coverage maintained)
- [ ] No breaking changes for existing users

---

## References

- Code Review Report: `review.txt` (2026-03-02)
- Obsidian Plugin API Documentation
- Project Constitution: `.specify/memory/constitution.md`
