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

### Tech Stack

- **Language**: TypeScript 5.9+
- **Styling**: TailwindCSS v4
- **Bundler**: esbuild
- **Testing**: Vitest
- **Linter**: ESLint + eslint-plugin-obsidianmd

## License

[MIT](LICENSE) © Jeongsk
