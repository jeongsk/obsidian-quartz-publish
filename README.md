<img width="2816" height="1536" alt="Gemini_Generated_Image_bbpsx0bbpsx0bbps" src="https://github.com/user-attachments/assets/7bb95f7c-6b3e-4dd3-a993-d345d2bc63cf" />


# Quartz Publish

[![GitHub License](https://img.shields.io/github/license/jeongsk/obsidian-quartz-publish)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/jeongsk/obsidian-quartz-publish)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![GitHub Downloads](https://img.shields.io/github/downloads/jeongsk/obsidian-quartz-publish/total)](https://github.com/jeongsk/obsidian-quartz-publish/releases)
[![CI](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml/badge.svg)](https://github.com/jeongsk/obsidian-quartz-publish/actions/workflows/test.yml)

[**한국어 문서 보기**](README.ko.md)

An Obsidian plugin for publishing notes directly to your [Quartz](https://quartz.jzhao.xyz/) blog.

## Features

### Publishing

- Publish Obsidian notes directly to Quartz repository
- Configure publish paths using frontmatter
- Choose between draft or publish status
- Automatic deployment via GitHub repository integration

### Publish Filtering

- Folder-based publish target filtering
- Tag-based publish target filtering
- Flexible filter settings using Glob patterns

### Quartz Management

- Quartz configuration management (site info, analytics, locale, etc.)
- Quartz version upgrade support
- Remote file management (direct management of files in Quartz repository)

### Beginner Support

- Automatic GitHub repository creation
- Deployment guide provided

### Other

- Network offline detection
- Warning for large file publishing
- Multi-language support (English, Korean)

## Installation

### Manual Installation

1. Download the latest version from [Releases](https://github.com/jeongsk/obsidian-quartz-publish/releases).
2. Copy `main.js`, `manifest.json`, and `styles.css` to the `.obsidian/plugins/quartz-publish/` folder in your Obsidian vault.
3. Restart Obsidian and enable "Quartz Publish" in Settings > Community Plugins.

### Installation via BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. Select "Add Beta plugin" in BRAT settings.
3. Enter `jeongsk/obsidian-quartz-publish` and add it.

## Configuration

Configure the following items in the plugin settings:

- **GitHub Token**: GitHub Personal Access Token (repo permission required)
- **Repository**: GitHub repository where Quartz is installed (e.g., `username/quartz`)
- **Branch**: Branch to publish to (default: `main`)
- **Content Path**: Quartz content path (default: `content`)

## Usage

1. Open the note you want to publish.
2. Search for "Quartz Publish" in the command palette (Cmd/Ctrl + P).
3. Select publishing options and publish.

### Frontmatter Settings

You can configure publishing options in your note's frontmatter:

```yaml
---
title: Note Title
draft: false
publish: true
path: custom-url-path
---
```

## Documentation

- [Quartz Blog Setup Guide](docs/quartz-blog-setup-guide.md) - Create and deploy a Quartz blog using a GitHub template
- [Quartz Date Handling](docs/quartz-date-handling.md) - How Quartz handles created/updated dates
- [Quartz Settings Guide](docs/quartz-settings-guide.md) - Detailed guide to Quartz configuration options
- [Dashboard Guide](docs/dashboard-guide.md) - How to use the publishing dashboard
- [Plugin Usage Guide](docs/plugin-usage-guide.md) - Complete plugin usage guide

## Development

### Requirements

- Node.js >= 22.0.0
- npm

### Installation

```bash
git clone https://github.com/jeongsk/obsidian-quartz-publish.git
cd obsidian-quartz-publish
npm install
```

### Development Commands

```bash
npm run dev            # Development mode (watch)
npm run build          # Production build
npm run test           # Run tests
npm run test:watch     # Test watch mode
npm run test:coverage  # Coverage report
npm run lint           # Lint check
npm run lint:fix       # Auto-fix linting
npm run version        # Version upgrade
```

### Project Structure

```
src/
├── main.ts                           # Plugin main class
├── types.ts                          # Type definitions
├── constants/                        # Constants
│   ├── analytics.ts                  # Analytics constants
│   ├── locales.ts                    # Locale constants
│   ├── guide-steps.ts                # Guide steps constants
│   └── icons.ts                      # Icon constants
├── i18n/                             # Internationalization
│   ├── index.ts                      # i18n initialization
│   └── locales/
│       ├── en.ts                     # English translations
│       └── ko.ts                     # Korean translations
├── services/
│   ├── github.ts                     # GitHub API service
│   ├── publish.ts                    # Publishing service
│   ├── quartz-config.ts              # Quartz configuration management
│   ├── quartz-upgrade.ts             # Quartz upgrade
│   ├── status.ts                     # Status management
│   ├── transformer.ts                # Content transformation
│   ├── network.ts                    # Network detection
│   ├── file-validator.ts             # File validation
│   ├── publish-filter.ts             # Publish filtering
│   ├── pending-changes.ts            # Change tracking
│   ├── publish-record-storage.ts     # Publish record storage
│   ├── repository-creator.ts         # Repository creation
│   ├── remote-file.ts                # Remote file management
│   ├── google-fonts.ts               # Google Fonts service
│   └── setup-status.ts               # Setup status management
├── ui/
│   ├── settings-tab.ts               # Settings tab
│   ├── dashboard-modal.ts            # Dashboard modal
│   ├── deploy-guide-modal.ts         # Deployment guide modal
│   ├── github-guide-modal.ts         # GitHub guide modal
│   ├── create-repo-modal.ts          # Repository creation modal
│   ├── remote-file-manager-modal.ts  # Remote file manager modal
│   ├── frontmatter-editor-modal.ts   # Frontmatter editor modal
│   ├── large-file-warning-modal.ts   # Large file warning
│   ├── components/                   # Common UI components
│   │   ├── confirm-modal.ts          # Confirmation modal
│   │   ├── unsaved-warning.ts        # Unsaved warning
│   │   ├── note-suggest-modal.ts     # Note suggest modal
│   │   ├── folder-suggest-modal.ts   # Folder suggest modal
│   │   ├── conflict-modal.ts         # Conflict modal
│   │   ├── font-picker-modal.ts      # Font picker modal
│   │   └── apply-button.ts           # Apply button
│   └── sections/                     # Settings tab sections
│       ├── publish-filter-section.ts # Publish filter section
│       ├── site-info-section.ts      # Site info section
│       ├── typography-section.ts     # Typography section
│       ├── analytics-section.ts      # Analytics section
│       ├── comments-section.ts       # Comments section
│       ├── behavior-section.ts       # Behavior section
│       └── publishing-section.ts     # Publishing section
├── utils/
│   ├── glob-validator.ts             # Glob pattern validation
│   ├── path-matcher.ts               # Path matching
│   ├── validators.ts                 # Validation utilities
│   ├── cn.ts                         # Classname utility
│   └── url.ts                        # URL utility
└── styles/
    └── main.css                      # TailwindCSS styles
```

### Tech Stack

- **Language**: TypeScript 5.9+
- **Styling**: TailwindCSS v4
- **Bundler**: esbuild
- **Testing**: Vitest
- **Linter**: ESLint + eslint-plugin-obsidianmd

## License

[MIT](LICENSE) © Jeongsk
