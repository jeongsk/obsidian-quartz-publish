/**
 * Obsidian API Mock for Vitest
 *
 * 이 파일은 Obsidian 플러그인 단위 테스트를 위한 모의 API 구현을 제공합니다.
 * 실제 Obsidian 앱 없이 테스트를 실행할 수 있습니다.
 *
 * ## 사용법
 *
 * ```ts
 * import { App, TFile, Vault, MetadataCache } from '../../mocks/obsidian';
 *
 * // 기본 사용
 * const app = new App();
 * const file = new TFile('test.md');
 * app.vault._addFile('test.md', '# content');
 *
 * // 메타데이터 설정
 * app.metadataCache._setMetadata('test.md', {
 *   frontmatter: { title: 'Test' }
 * });
 * ```
 *
 * ## Mock 기능
 *
 * ### 파일 시스템 (Vault)
 * - `getMarkdownFiles()`: 마크다운 파일 목록 반환
 * - `read()`, `cachedRead()`: 파일 내용 읽기
 * - `modify()`, `create()`, `delete()`: 파일 조작
 * - `_addFile()`, `_setContent()`: 테스트 헬퍼
 *
 * ### 메타데이터 (MetadataCache)
 * - `getFileCache()`: 파일의 캐시된 메타데이터 반환
 * - `_setMetadata()`: 테스트용 메타데이터 설정
 *
 * ### UI 컴포넌트
 * - `Modal`, `Setting`, `Notice`
 * - `TextComponent`, `ToggleComponent`, `ButtonComponent`, `DropdownComponent`
 *
 * ### HTMLElement 확장
 * - `empty()`, `addClass()`, `removeClass()`, `toggleClass()`
 * - `createEl()`, `createDiv()`, `createSpan()`
 *
 * ## 제한사항
 *
 * 1. **비동기 처리**: 실제 Obsidian의 파일 연산은 비동기이지만,
 *    이 mock은 동기적으로 동작하여 테스트 속도를 높입니다.
 *
 * 2. **이벤트 시스템**: Obsidian의 이벤트 버스/트리거는 시뮬레이션되지 않습니다.
 *
 * 3. **HTMLElement 확장**: Obsidian 전용 확장 메서드는 근사적으로 구현되었으며,
 *    실제 Obsidian의 DOM 동작과 완전히 동일하지 않을 수 있습니다.
 *
 * 4. **Workspace**: `getActiveFile()`는 항상 `null`을 반환합니다.
 *
 * 5. **파일 탐색**: 폴더 구조 탐색은 완전히 구현되지 않았습니다.
 *
 * 6. **컴포넌트 상호작용**: UI 컴포넌트의 `onChange`, `onClick` 등의
 *    콜백은 호출되지 않습니다.
 */

import { vi } from "vitest";

// ============================================================================
// Type Safety Notes
// ============================================================================
//
// ## 타입 단언 사용 이유
//
// 테스트에서 `vault as unknown as import("obsidian").Vault`와 같은
// 타입 단언을 사용하는 이유:
//
// 1. **프로덕션 코드 타입**: PublishService 등의 프로덕션 코드는
//    `import("obsidian").Vault` 타입을 기대합니다.
//
// 2. **Mock 타입 불일치**: 우리의 Mock 클래스는 실제 Obsidian 타입을
//    상속받지 않습니다 (순환 참조 방지).
//
// 3. **런타임 호환성**: 런타임에서는 Mock이 동일한 메서드를 가지고 있어
//    정상 동작합니다. 타입 단언은 컴파일타임 검사를 우회할 뿐입니다.
//
// ## 개선 방안
//
// 타입 안전성을 높이려면:
// - 프로덕션 코드에서 인터페이스 추출 및 Mock과 공유
// - 또는 `--ts-no-check`를 사용하여 타입 검사 건너뛰기
//
// 현재는 실용성을 위해 타입 단언을 사용합니다.

// ============================================================================
// TFile Mock
// ============================================================================

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: { mtime: number; ctime: number; size: number };
  parent: TFolder | null;

  constructor(path: string) {
    this.path = path;
    this.name = path.split("/").pop() ?? "";
    this.extension = this.name.split(".").pop() ?? "";
    this.basename = this.name.replace(`.${this.extension}`, "");
    this.stat = { mtime: Date.now(), ctime: Date.now(), size: 100 };
    this.parent = null;
  }
}

export class TFolder {
  path: string;
  name: string;
  children: (TFile | TFolder)[];
  parent: TFolder | null;
  isRoot: () => boolean;

  constructor(path: string) {
    this.path = path;
    this.name = path.split("/").pop() ?? "";
    this.children = [];
    this.parent = null;
    this.isRoot = () => this.path === "/";
  }
}

export class TAbstractFile {
  path: string;
  name: string;

  constructor(path: string) {
    this.path = path;
    this.name = path.split("/").pop() ?? "";
  }
}

// ============================================================================
// Vault Mock
// ============================================================================

export class Vault {
  private files: Map<string, TFile> = new Map();
  private fileContents: Map<string, string> = new Map();

  // 테스트용 헬퍼
  _addFile(path: string, content: string = ""): TFile {
    const file = new TFile(path);
    this.files.set(path, file);
    this.fileContents.set(path, content);
    return file;
  }

  _setContent(path: string, content: string): void {
    this.fileContents.set(path, content);
  }

  _clear(): void {
    this.files.clear();
    this.fileContents.clear();
  }

  getMarkdownFiles(): TFile[] {
    return Array.from(this.files.values()).filter((f) => f.extension === "md");
  }

  getFiles(): TFile[] {
    return Array.from(this.files.values());
  }

  getAbstractFileByPath(path: string): TFile | null {
    return this.files.get(path) ?? null;
  }

  async read(file: TFile): Promise<string> {
    return this.fileContents.get(file.path) ?? "";
  }

  async cachedRead(file: TFile): Promise<string> {
    return this.read(file);
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.fileContents.set(file.path, content);
  }

  async process(file: TFile, fn: (data: string) => string): Promise<string> {
    const content = this.fileContents.get(file.path) ?? "";
    const result = fn(content);
    this.fileContents.set(file.path, result);
    return result;
  }

  async readBinary(file: TFile): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  async create(path: string, content: string): Promise<TFile> {
    return this._addFile(path, content);
  }

  async delete(file: TFile): Promise<void> {
    this.files.delete(file.path);
    this.fileContents.delete(file.path);
  }

  getName(): string {
    return "Test Vault";
  }
}

// ============================================================================
// MetadataCache Mock
// ============================================================================

export interface CachedMetadata {
  frontmatter?: Record<string, unknown>;
  frontmatterPosition?: { start: { line: number }; end: { line: number } };
  links?: Array<{ link: string; displayText?: string; original: string }>;
  embeds?: Array<{ link: string; displayText?: string; original: string }>;
}

export class MetadataCache {
  private cache: Map<string, CachedMetadata> = new Map();

  // 테스트용 헬퍼
  _setMetadata(path: string, metadata: CachedMetadata): void {
    this.cache.set(path, metadata);
  }

  _clear(): void {
    this.cache.clear();
  }

  getFileCache(file: TFile): CachedMetadata | null {
    return this.cache.get(file.path) ?? null;
  }

  getCache(path: string): CachedMetadata | null {
    return this.cache.get(path) ?? null;
  }

  getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
    return null;
  }
}

// ============================================================================
// App Mock
// ============================================================================

export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: Workspace;

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
    this.workspace = new Workspace();
  }
}

// ============================================================================
// Workspace Mock
// ============================================================================

export class Workspace {
  getActiveFile(): TFile | null {
    return null;
  }
}

// ============================================================================
// HTMLElement Extensions (Obsidian-specific)
// ============================================================================

/**
 * Obsidian HTMLElement 확장 인터페이스
 */
interface ObsidianHTMLElement extends HTMLElement {
  empty(): void;
  addClass(...classes: string[]): void;
  removeClass(...classes: string[]): void;
  toggleClass(cls: string, value?: boolean): void;
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { text?: string; cls?: string; attr?: Record<string, string> }
  ): HTMLElementTagNameMap[K];
  createDiv(options?: { text?: string; cls?: string }): HTMLDivElement;
  createSpan(options?: { text?: string; cls?: string }): HTMLSpanElement;
}

/**
 * Obsidian HTMLElement 확장 메서드를 추가합니다.
 */
function extendHTMLElement(el: HTMLElement): ObsidianHTMLElement {
  const extended = el as ObsidianHTMLElement;

  extended.empty = function () {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  };

  extended.addClass = function (...classes: string[]) {
    this.classList.add(...classes);
  };

  extended.removeClass = function (...classes: string[]) {
    this.classList.remove(...classes);
  };

  extended.toggleClass = function (cls: string, value?: boolean) {
    if (value === undefined) {
      this.classList.toggle(cls);
    } else if (value) {
      this.classList.add(cls);
    } else {
      this.classList.remove(cls);
    }
  };

  extended.createEl = function <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { text?: string; cls?: string; attr?: Record<string, string> }
  ): HTMLElementTagNameMap[K] {
    const child = document.createElement(tag);
    if (options?.text) {
      child.textContent = options.text;
    }
    if (options?.cls) {
      child.className = options.cls;
    }
    if (options?.attr) {
      for (const [key, value] of Object.entries(options.attr)) {
        child.setAttribute(key, value);
      }
    }
    this.appendChild(child);
    return extendHTMLElement(child) as HTMLElementTagNameMap[K];
  };

  extended.createDiv = function (options?: { text?: string; cls?: string }): HTMLDivElement {
    return this.createEl("div", options);
  };

  extended.createSpan = function (options?: { text?: string; cls?: string }): HTMLSpanElement {
    return this.createEl("span", options);
  };

  return extended;
}

// ============================================================================
// Modal Mock
// ============================================================================

export class Modal {
  app: App;
  contentEl: ObsidianHTMLElement;
  modalEl: ObsidianHTMLElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = extendHTMLElement(document.createElement("div"));
    this.modalEl = extendHTMLElement(document.createElement("div"));
  }

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

// ============================================================================
// Notice Mock
// ============================================================================

export class Notice {
  message: string;
  timeout: number;

  constructor(message: string, timeout: number = 5000) {
    this.message = message;
    this.timeout = timeout;
  }

  hide(): void {}
}

// ============================================================================
// Setting Mock
// ============================================================================

export class Setting {
  private containerEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }

  setName(name: string): this {
    return this;
  }

  setDesc(desc: string): this {
    return this;
  }

  addText(callback: (text: TextComponent) => void): this {
    callback(new TextComponent(document.createElement("input")));
    return this;
  }

  addToggle(callback: (toggle: ToggleComponent) => void): this {
    callback(new ToggleComponent(document.createElement("div")));
    return this;
  }

  addButton(callback: (button: ButtonComponent) => void): this {
    callback(new ButtonComponent(document.createElement("button")));
    return this;
  }

  addDropdown(callback: (dropdown: DropdownComponent) => void): this {
    callback(new DropdownComponent(document.createElement("select")));
    return this;
  }

  setClass(cls: string): this {
    return this;
  }
}

// ============================================================================
// Components Mock
// ============================================================================

export class TextComponent {
  inputEl: HTMLInputElement;
  private value: string = "";

  constructor(inputEl: HTMLInputElement) {
    this.inputEl = inputEl;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class ToggleComponent {
  toggleEl: HTMLElement;
  private value: boolean = false;

  constructor(toggleEl: HTMLElement) {
    this.toggleEl = toggleEl;
  }

  getValue(): boolean {
    return this.value;
  }

  setValue(value: boolean): this {
    this.value = value;
    return this;
  }

  onChange(callback: (value: boolean) => void): this {
    return this;
  }
}

export class ButtonComponent {
  buttonEl: HTMLButtonElement;

  constructor(buttonEl: HTMLButtonElement) {
    this.buttonEl = buttonEl;
  }

  setButtonText(text: string): this {
    return this;
  }

  setCta(): this {
    return this;
  }

  setWarning(): this {
    return this;
  }

  setDisabled(disabled: boolean): this {
    return this;
  }

  onClick(callback: () => void): this {
    return this;
  }
}

export class DropdownComponent {
  selectEl: HTMLSelectElement;
  private value: string = "";

  constructor(selectEl: HTMLSelectElement) {
    this.selectEl = selectEl;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  addOption(value: string, display: string): this {
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

// ============================================================================
// Plugin Mock
// ============================================================================

export abstract class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<unknown> {
    return {};
  }

  async saveData(data: unknown): Promise<void> {}

  addCommand(command: Command): Command {
    return command;
  }

  addSettingTab(tab: PluginSettingTab): void {}

  registerEvent(event: unknown): void {}
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  author: string;
  description: string;
}

export interface Command {
  id: string;
  name: string;
  callback?: () => void;
  checkCallback?: (checking: boolean) => boolean | void;
}

export abstract class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }

  display(): void {}
  hide(): void {}
}

// ============================================================================
// Request Functions
// ============================================================================

export async function requestUrl(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ json: unknown; text: string; status: number }> {
  return { json: {}, text: "", status: 200 };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function sanitizeHTMLToDom(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

// ============================================================================
// Moment Mock
// ============================================================================

export const moment = {
  locale: () => "en",
};

// ============================================================================
// Icon & Tooltip Utilities
// ============================================================================

export async function setIcon(element: HTMLElement, iconId: string): Promise<void> {
  // 테스트에서는 아무 동작 하지 않음
}

export function setTooltip(element: HTMLElement, tooltip: string): void {
  // 테스트에서는 아무 동작 하지 않음
}
