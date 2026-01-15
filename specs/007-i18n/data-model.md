# Data Model: Internationalization (i18n) Support

**Feature**: 001-i18n  
**Date**: 2025-01-14

## Entities

### TranslationKey

번역 가능한 문자열을 식별하는 고유 키입니다.

**Format**: `category.subcategory.identifier`

**Examples**:
- `settings.github.title`
- `notice.publish.success`
- `dashboard.tab.new`
- `command.publishNote`

**Naming Convention**:
- 소문자, 점(.) 구분자
- 계층 구조: `영역.하위영역.식별자`
- 동적 값 위치: `{{placeholder}}`

### Locale

지원되는 언어 식별자입니다.

| Code | Name | Status |
|------|------|--------|
| `en` | English | Default (fallback) |
| `ko` | 한국어 | Supported |

**확장 규칙**: 새 언어 추가 시 `src/i18n/locales/{code}.ts` 파일 생성

### TranslationFile

특정 언어의 모든 번역을 포함하는 TypeScript 모듈입니다.

**Structure**:
```typescript
// 기본 언어 (en.ts) - 타입 정의 기준
export default {
  'key.path': 'Translation text',
} as const;

// 추가 언어 (ko.ts) - Partial 타입
import type en from './en';
const ko: Partial<typeof en> = { ... };
export default ko;
```

## Translation Key Categories

### 1. Settings (`settings.*`)

```
settings.github.title          # "GitHub Connection"
settings.github.token          # "GitHub Token"
settings.github.tokenDesc      # "Personal Access Token with repo scope"
settings.github.repoUrl        # "Repository URL"
settings.github.branch         # "Branch"
settings.github.testConnection # "Test Connection"
settings.github.createRepo     # "Create Quartz Repository"

settings.autoDate.title        # "Auto Date Fields"
settings.autoDate.created      # "Add created date"
settings.autoDate.modified     # "Add modified date"
settings.autoDate.published    # "Add published date"

settings.quartz.title          # "Quartz Configuration"
settings.quartz.load           # "Load Quartz Settings"
settings.quartz.siteInfo       # "Site Information"
settings.quartz.pageTitle      # "Page Title"
settings.quartz.baseUrl        # "Base URL"
settings.quartz.locale         # "Locale"
```

### 2. Dashboard (`dashboard.*`)

```
dashboard.title                # "Publish Dashboard"
dashboard.tab.new              # "New"
dashboard.tab.modified         # "Modified"
dashboard.tab.deleted          # "Deleted"
dashboard.tab.synced           # "Synced"

dashboard.action.publish       # "Publish"
dashboard.action.delete        # "Delete"
dashboard.action.syncAll       # "Sync All"
dashboard.action.close         # "Close"
dashboard.action.refresh       # "Refresh"

dashboard.status.loading       # "Loading status..."
dashboard.status.offline       # "Offline"
dashboard.status.noChanges     # "No changes to sync"

dashboard.empty.new            # "No new notes to publish"
dashboard.empty.modified       # "No modified notes"
dashboard.empty.deleted        # "No notes to delete"
dashboard.empty.synced         # "No synced notes"
```

### 3. Notices (`notice.*`)

```
notice.publish.start           # "Publishing {{filename}}..."
notice.publish.success         # "Published: {{filename}} → {{path}}"
notice.publish.failed          # "Failed to publish: {{filename}} ({{error}})"
notice.publish.error           # "Publish error: {{message}}"

notice.batch.success           # "{{count}} notes published"
notice.batch.partial           # "Published: {{succeeded}} success, {{failed}} failed"

notice.delete.success          # "{{count}} notes deleted"
notice.delete.partial          # "Deleted: {{succeeded}} success, {{failed}} failed"

notice.sync.success            # "{{count}} items synced"
notice.sync.noChanges          # "No changes to sync"

notice.connection.success      # "Connection successful!"
notice.connection.failed       # "Connection failed: {{message}}"

notice.network.offline         # "Please check your internet connection"

notice.settings.saved          # "Settings saved successfully"
notice.settings.discarded      # "Changes discarded"
notice.settings.validationFailed # "Validation failed: {{error}}"
```

### 4. Commands (`command.*`)

```
command.publishNote            # "Publish current note to Quartz"
command.openDashboard          # "Open Publish Dashboard"
```

### 5. Menus (`menu.*`)

```
menu.publishToQuartz           # "Publish to Quartz"
```

### 6. Modals (`modal.*`)

```
modal.confirm.title            # "Confirm"
modal.confirm.ok               # "OK"
modal.confirm.cancel           # "Cancel"

modal.delete.title             # "Confirm Delete"
modal.delete.message           # "Delete {{count}} notes from GitHub?"

modal.sync.title               # "Confirm Sync"
modal.sync.message             # "Publish {{publish}} and delete {{delete}} notes?"

modal.conflict.title           # "Config Conflict"
modal.conflict.reload          # "Reload"
modal.conflict.overwrite       # "Force Overwrite"

modal.largeFile.title          # "Large File Warning"
modal.largeFile.message        # "{{count}} files exceed {{size}}"
modal.largeFile.continue       # "Continue Anyway"
```

### 7. Errors (`error.*`)

```
error.github.invalidToken      # "Invalid or expired GitHub token"
error.github.notFound          # "Repository not found or no access"
error.github.notQuartz         # "Not a Quartz repository"
error.github.rateLimit         # "GitHub API rate limit exceeded"
error.github.network           # "Network error"

error.validation.pageTitle     # "Page title is required"
error.validation.baseUrl       # "Invalid URL format"
```

## State Transitions

```
┌─────────────┐
│  Unloaded   │
└─────┬───────┘
      │ initI18n()
      ▼
┌─────────────┐
│   Ready     │ ◄── 언어 결정됨 (moment.locale())
└─────────────┘
      │
      │ Obsidian 재시작
      ▼
┌─────────────┐
│  Reloaded   │ ◄── 새 언어 설정 반영
└─────────────┘
```

## Validation Rules

1. **TranslationKey**: 
   - 소문자, 숫자, 점(.) 구분자만 허용
   - 패턴: `^[a-z]+(\.[a-z0-9]+)+$`

2. **Placeholder**:
   - `{{identifier}}` 형식
   - 패턴: `\{\{[a-zA-Z][a-zA-Z0-9]*\}\}`

3. **Locale Code**:
   - BCP 47 형식 (단순화)
   - 패턴: `^[a-z]{2}(-[A-Z]{2})?$`
