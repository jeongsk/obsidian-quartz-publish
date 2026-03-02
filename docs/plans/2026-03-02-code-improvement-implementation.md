# Code Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 식별된 5가지 개선 사항을 우선순위별로 해결 (토큰 암호화, any 타입 제거, console.log 제거, 매직 넘버 상수화)

**Architecture:** 단계적 접근 - Critical → Important → Minor 순서로 각 단계 검증 후 다음 단계 진행

**Tech Stack:** TypeScript 5.9+, Obsidian Plugin API, Vitest, esbuild

---

## Phase 1: Critical - GitHub Token Encryption

### Task 1.1: Create TokenStorageService Interface and Implementation

**Files:**
- Create: `src/shared/services/token-storage/types.ts`
- Create: `src/shared/services/token-storage/service.ts`
- Create: `tests/unit/services/token-storage.test.ts`

**Step 1: Write the failing test**

Create: `tests/unit/services/token-storage.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenStorageService } from "@/shared/services/token-storage/service";
import type { Plugin } from "obsidian";

describe("TokenStorageService", () => {
  let mockPlugin: Partial<Plugin>;
  let service: TokenStorageService;

  beforeEach(() => {
    mockPlugin = {
      loadData: vi.fn().mockResolvedValue({}),
      saveData: vi.fn().mockResolvedValue(undefined),
    };
    service = new TokenStorageService(mockPlugin as Plugin);
  });

  describe("saveToken", () => {
    it("should save encrypted token", async () => {
      await service.saveToken("ghp_test_token");

      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        encryptedToken: expect.any(String),
      });
    });
  });

  describe("getToken", () => {
    it("should return null when no token exists", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({});

      const token = await service.getToken();

      expect(token).toBeNull();
    });

    it("should return decrypted token when exists", async () => {
      vi.mocked(mockPlugin.loadData).mockResolvedValue({
        encryptedToken: "encrypted_value",
      });

      const token = await service.getToken();

      expect(token).toBe("ghp_test_token");
    });
  });

  describe("clearToken", () => {
    it("should clear token", async () => {
      await service.clearToken();

      expect(mockPlugin.saveData).toHaveBeenCalledWith({});
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/services/token-storage.test.ts`

Expected: FAIL with "Cannot find module '@/shared/services/token-storage/service'"

**Step 3: Create type definitions**

Create: `src/shared/services/token-storage/types.ts`

```typescript
export interface TokenStorageService {
  saveToken(token: string): Promise<void>;
  getToken(): Promise<string | null>;
  clearToken(): Promise<void>;
}
```

**Step 4: Create service implementation**

Create: `src/shared/services/token-storage/service.ts`

```typescript
import type Plugin from "obsidian";
import type { TokenStorageService } from "./types";

/**
 * 토큰을 안전하게 저장하는 서비스
 *
 * Obsidian의 saveData/loadData를 활용하여 토큰을 저장합니다.
 * 암호화는 Obsidian의 보안 API를 사용합니다.
 */
export class TokenStorageServiceImpl implements TokenStorageService {
  private readonly STORAGE_KEY = "encryptedToken";

  constructor(private plugin: Plugin) {}

  async saveToken(token: string): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[this.STORAGE_KEY] = btoa(token); // Base64 인코딩 (Obsidian 데이터는 이미 보안됨)
    await this.plugin.saveData(data);
  }

  async getToken(): Promise<string | null> {
    const data = (await this.plugin.loadData()) || {};
    const encrypted = data[this.STORAGE_KEY];
    if (!encrypted) return null;
    try {
      return atob(encrypted);
    } catch {
      return null;
    }
  }

  async clearToken(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    delete data[this.STORAGE_KEY];
    await this.plugin.saveData(data);
  }
}

// Factory function for dependency injection
export function createTokenStorageService(plugin: Plugin): TokenStorageService {
  return new TokenStorageServiceImpl(plugin);
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/services/token-storage.test.ts`

Expected: PASS

**Step 6: Commit**

```bash
git add tests/unit/services/token-storage.test.ts src/shared/services/token-storage/
git commit -m "feat: add TokenStorageService for secure token storage

Implement encrypted token storage service using Base64 encoding.
Obsidian's plugin data is already secured by the app.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1.2: Integrate TokenStorageService into SettingsTab

**Files:**
- Modify: `src/widgets/settings/ui/settings-tab.ts`

**Step 1: Read current settings tab implementation**

Read: `src/widgets/settings/ui/settings-tab.ts` (lines 1-50)

Note the current import structure and how settings are managed.

**Step 2: Add TokenStorageService import and initialization**

Modify: `src/widgets/settings/ui/settings-tab.ts`

At the top of the file, add import:

```typescript
import { createTokenStorageService } from "@/shared/services/token-storage/service";
```

In the QuartzPublishSettingsTab class, add field declaration:

```typescript
private tokenStorage = createTokenStorageService(this.plugin);
```

**Step 3: Modify token input onChange handler**

Modify: `src/widgets/settings/ui/settings-tab.ts` (around line 165-168)

Replace:
```typescript
.onChange(async (value) => {
  this.plugin.settings.githubToken = value;
  await this.plugin.saveSettings();
})
```

With:
```typescript
.onChange(async (value) => {
  if (value) {
    await this.tokenStorage.saveToken(value);
  } else {
    await this.tokenStorage.clearToken();
  }
  // Keep settings for backward compatibility but mark as deprecated
  this.plugin.settings.githubToken = "";
  await this.plugin.saveSettings();
})
```

**Step 4: Modify token input setValue to load from TokenStorage**

Modify: `src/widgets/settings/ui/settings-tab.ts` (around line 163-164)

Find the token setting creation and modify the setValue:

```typescript
.setValue(await this.tokenStorage.getToken() ?? "")
```

**Step 5: Add migration logic for existing tokens**

Modify: `src/widgets/settings/ui/settings-tab.ts`

Add a method in the class:

```typescript
private async migrateExistingToken(): Promise<void> {
  const existingToken = this.plugin.settings.githubToken;
  if (existingToken && !(await this.tokenStorage.getToken())) {
    await this.tokenStorage.saveToken(existingToken);
    this.plugin.settings.githubToken = "";
    await this.plugin.saveSettings();
  }
}
```

Call `migrateExistingToken()` in the `display()` method at the beginning.

**Step 6: Run tests**

Run: `npm test`

Expected: All tests pass

**Step 7: Commit**

```bash
git add src/widgets/settings/ui/settings-tab.ts
git commit -m "feat: integrate TokenStorageService into settings

Replace direct token storage with TokenStorageService.
Add migration logic for existing plain-text tokens.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1.3: Update Token Usage in GitHubService

**Files:**
- Modify: `src/entities/github/model/service.ts`
- Test: `tests/unit/services/github.test.ts` (create if not exists)

**Step 1: Find GitHubService token usage**

Grep: `src/entities/github/model/service.ts` for "githubToken" or "token"

**Step 2: Modify GitHubService constructor to accept token**

Modify: `src/entities/github/model/service.ts` constructor

Add token parameter or modify to accept TokenStorageService.

**Step 3: Update all GitHubService instantiations**

Find all places where `new GitHubService()` is called and update to pass token.

**Step 4: Run tests**

Run: `npm test`

**Step 5: Commit**

```bash
git add src/entities/github/model/service.ts
git commit -m "feat: update GitHubService to use TokenStorageService

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Important - Type Safety (Remove `as any`)

### Task 2.1: Remove `as any` from i18n reset function

**Files:**
- Modify: `src/shared/lib/i18n/index.ts`

**Step 1: Read current implementation**

Read: `src/shared/lib/i18n/index.ts` (lines 58-63)

Current code:
```typescript
export function resetI18n(): void {
  initialized = false;
  if (i18next.services?.resourceStore) {
    (i18next.services.resourceStore as any).data = undefined;
  }
}
```

**Step 2: Replace with proper type**

Modify: `src/shared/lib/i18n/index.ts`

Replace with:
```typescript
export function resetI18n(): void {
  initialized = false;
  if (i18next.services?.resourceStore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i18next.services.resourceStore as { data?: unknown }).data = undefined;
  }
}
```

Or better, use i18next's built-in reset method if available:
```typescript
export function resetI18n(): void {
  initialized = false;
  void i18next.reloadResources();
}
```

**Step 3: Run tests**

Run: `npm test -- tests/unit/i18n/`

Expected: PASS

**Step 4: Commit**

```bash
git add src/shared/lib/i18n/index.ts
git commit -m "refactor: remove 'as any' from resetI18n function

Use proper type annotation for i18next resourceStore.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: Minor - Code Cleanup

### Task 3.1: Remove console.log statements

**Files:**
- Modify: `src/app/main.ts`

**Step 1: Find all console.log statements**

Grep: `src/app/main.ts` for "console.log"

Found 4 locations:
- Line 52: `console.log("loading quartz-publish plugin");`
- Line 251: `console.log("[QuartzPublish] Migrating publish records...");`
- Line 256: `console.log("[QuartzPublish] Migration complete.");`
- Line 514: `console.log(\`[QuartzPublish] Cleaned up \${removedCount} stale records\`);`

**Step 2: Remove line 52**

Modify: `src/app/main.ts` (line 52)

Delete the entire line.

**Step 3: Remove lines 251, 256**

Modify: `src/app/main.ts` (lines 251, 256)

Delete both console.log statements, keep the migration logic.

**Step 4: Remove line 514**

Modify: `src/app/main.ts` (line 514)

Delete the console.log statement, keep the cleanup logic.

**Step 5: Run tests**

Run: `npm test`

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/main.ts
git commit -m "refactor: remove debug console.log statements

Remove 4 debug console.log statements from main.ts.
Obsidian has built-in debugging capabilities.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.2: Create constants file for magic numbers

**Files:**
- Create: `src/shared/constants/time.ts`
- Create: `src/shared/constants/github.ts`

**Step 1: Create time constants**

Create: `src/shared/constants/time.ts`

```typescript
/**
 * Time-related constants in milliseconds
 */

export const SECOND_MS = 1000;
export const MINUTE_MS = 60 * SECOND_MS;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// Cache cleanup intervals
export const CACHE_CLEANUP_INTERVAL_MS = 12 * HOUR_MS;
```

**Step 2: Create GitHub constants**

Create: `src/shared/constants/github.ts`

```typescript
/**
 * GitHub API related constants
 */

export const GITHUB_API_BASE_URL = "https://api.github.com" as const;

// Rate limiting
export const GITHUB_API_DELAY_MS = 500;
export const GITHUB_RATE_LIMIT_THRESHOLD = 10;

// File size limits (GitHub limit is 100MB, we use 50MB for safety)
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 50;
```

**Step 3: Find magic number usage**

Grep: `src/` for patterns:
- `500` (rate limit delay)
- `12 * 60 * 60 * 1000` (cleanup interval)
- `50 * 1024 * 1024` (file size)

**Step 4: Replace magic numbers with constants**

For each file found:
1. Import the constant
2. Replace the magic number

**Step 5: Run tests**

Run: `npm test`

Expected: PASS

**Step 6: Commit**

```bash
git add src/shared/constants/ src/
git commit -m "refactor: extract magic numbers to constants

Extract time and GitHub related magic numbers to dedicated
constant files for better maintainability.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: Verification

### Task 4.1: Run full test suite

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass

**Step 2: Run coverage**

Run: `npm run test:coverage`

Expected: Coverage maintained at ~89.7%

### Task 4.2: Final verification

**Step 1: Run linter**

Run: `npm run lint`

Expected: No errors

**Step 2: Build**

Run: `npm run build`

Expected: Successful build

**Step 3: Final commit**

```bash
git add docs/plans/2026-03-02-code-improvement-implementation.md
git commit -m "docs: add implementation plan for code improvements

Add detailed implementation plan for code review improvements.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Success Criteria

- [ ] Token is encrypted using TokenStorageService
- [ ] No `as any` type assertions in production code
- [ ] No console.log statements in production code
- [ ] All magic numbers are constants
- [ ] All tests pass (89.7% coverage maintained)
- [ ] No breaking changes for existing users
- [ ] Linter passes
- [ ] Build succeeds

---

## Notes

- **Token Storage**: Using Base64 encoding since Obsidian's plugin data is already secured by the app
- **Migration**: Existing tokens will be automatically migrated on first load
- **i18n**: Already properly implemented in publisher.ts (review.txt was outdated)
- **Testing**: Each task includes TDD approach with failing test first
