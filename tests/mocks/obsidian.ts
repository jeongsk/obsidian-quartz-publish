/**
 * Obsidian API Mock
 *
 * Vitest에서 사용할 Obsidian API 모의 구현입니다.
 */

import { vi } from 'vitest';

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
		this.name = path.split('/').pop() ?? '';
		this.extension = this.name.split('.').pop() ?? '';
		this.basename = this.name.replace(`.${this.extension}`, '');
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
		this.name = path.split('/').pop() ?? '';
		this.children = [];
		this.parent = null;
		this.isRoot = () => this.path === '/';
	}
}

export class TAbstractFile {
	path: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() ?? '';
	}
}

// ============================================================================
// Vault Mock
// ============================================================================

export class Vault {
	private files: Map<string, TFile> = new Map();
	private fileContents: Map<string, string> = new Map();

	// 테스트용 헬퍼
	_addFile(path: string, content: string = ''): TFile {
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
		return Array.from(this.files.values()).filter(f => f.extension === 'md');
	}

	getFiles(): TFile[] {
		return Array.from(this.files.values());
	}

	getAbstractFileByPath(path: string): TFile | null {
		return this.files.get(path) ?? null;
	}

	async read(file: TFile): Promise<string> {
		return this.fileContents.get(file.path) ?? '';
	}

	async cachedRead(file: TFile): Promise<string> {
		return this.read(file);
	}

	async modify(file: TFile, content: string): Promise<void> {
		this.fileContents.set(file.path, content);
	}

	async create(path: string, content: string): Promise<TFile> {
		return this._addFile(path, content);
	}

	async delete(file: TFile): Promise<void> {
		this.files.delete(file.path);
		this.fileContents.delete(file.path);
	}

	getName(): string {
		return 'Test Vault';
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

	extended.empty = function() {
		while (this.firstChild) {
			this.removeChild(this.firstChild);
		}
	};

	extended.addClass = function(...classes: string[]) {
		this.classList.add(...classes);
	};

	extended.removeClass = function(...classes: string[]) {
		this.classList.remove(...classes);
	};

	extended.toggleClass = function(cls: string, value?: boolean) {
		if (value === undefined) {
			this.classList.toggle(cls);
		} else if (value) {
			this.classList.add(cls);
		} else {
			this.classList.remove(cls);
		}
	};

	extended.createEl = function<K extends keyof HTMLElementTagNameMap>(
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

	extended.createDiv = function(options?: { text?: string; cls?: string }): HTMLDivElement {
		return this.createEl('div', options);
	};

	extended.createSpan = function(options?: { text?: string; cls?: string }): HTMLSpanElement {
		return this.createEl('span', options);
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
		this.contentEl = extendHTMLElement(document.createElement('div'));
		this.modalEl = extendHTMLElement(document.createElement('div'));
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
		callback(new TextComponent(document.createElement('input')));
		return this;
	}

	addToggle(callback: (toggle: ToggleComponent) => void): this {
		callback(new ToggleComponent(document.createElement('div')));
		return this;
	}

	addButton(callback: (button: ButtonComponent) => void): this {
		callback(new ButtonComponent(document.createElement('button')));
		return this;
	}

	addDropdown(callback: (dropdown: DropdownComponent) => void): this {
		callback(new DropdownComponent(document.createElement('select')));
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
	private value: string = '';

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
	private value: string = '';

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
		this.containerEl = document.createElement('div');
	}

	display(): void {}
	hide(): void {}
}

// ============================================================================
// Request Functions
// ============================================================================

export async function requestUrl(options: { url: string; method?: string; headers?: Record<string, string>; body?: string }): Promise<{ json: unknown; text: string; status: number }> {
	return { json: {}, text: '', status: 200 };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function sanitizeHTMLToDom(html: string): DocumentFragment {
	const template = document.createElement('template');
	template.innerHTML = html;
	return template.content;
}

// ============================================================================
// Moment Mock
// ============================================================================

export const moment = {
	locale: () => 'en',
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
