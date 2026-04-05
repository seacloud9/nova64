// Core type definitions for nova64 OS 9 shell
import { ReactNode } from 'react';

// ============================================================================
// Filesystem Types
// ============================================================================

export interface FileStat {
  path: string;
  type: 'file' | 'directory' | 'alias';
  size: number;
  created: number;
  modified: number;
  permissions?: string;
}

export interface AliasData {
  type: 'alias';
  targetPath: string;
  created: number;
}

export interface FileSystemItem {
  path: string;
  type: 'file' | 'directory' | 'alias';
  data?: ArrayBuffer | string | AliasData;
  created: number;
  modified: number;
}

// ============================================================================
// Menu Types
// ============================================================================

export interface MenuItem {
  id?: string;
  label: string;
  type?: 'normal' | 'separator' | 'submenu';
  role?: 'copy' | 'paste' | 'cut' | 'quit' | 'hide' | 'zoom' | 'minimize' | 'about';
  accelerator?: string;
  enabled?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
  click?: () => void;
}

export interface MenuTemplate {
  label: string;
  submenu: MenuItem[];
}

// ============================================================================
// Window Types
// ============================================================================

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  isShaded: boolean;
  isMaximized: boolean;
  isMinimized: boolean;
  zIndex: number;
  appId: string;
  closable?: boolean;
  resizable?: boolean;
  content?: ReactNode;
}

// ============================================================================
// Application Types
// ============================================================================

export interface AppInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  icon: string;
}

export interface Nova64App {
  id: string;
  name: string;
  icon: string;
  menus?: MenuTemplate[];
  mount(el: HTMLElement, ctx: NovaContext): void;
  unmount(): void;
  onEvent?(evt: NovaEvent): void;
  getInfo?(): AppInfo;
}

// ============================================================================
// Control Strip Types
// ============================================================================

export interface ControlStripItem {
  id: string;
  icon: string;
  label: string;
  render?: (container: HTMLElement) => void;
  onClick?: () => void;
}

// ============================================================================
// Events Types
// ============================================================================

export interface NovaEvent {
  type: string;
  payload?: unknown;
  timestamp: number;
}

export type EventHandler = (evt: NovaEvent) => void;

// ============================================================================
// Alert/Dialog Types
// ============================================================================

export interface AlertOptions {
  title: string;
  message: string;
  buttons: string[];
  icon?: 'warning' | 'error' | 'info' | 'question';
}

// ============================================================================
// Desktop Item Types
// ============================================================================

export interface DesktopItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory' | 'alias' | 'disk' | 'app';
  icon: string;
  x: number;
  y: number;
}

// ============================================================================
// Context API (Main Interface for nova64 Runtime)
// ============================================================================

export interface NovaContext {
  version: string;

  // Filesystem API
  read(path: string): Promise<ArrayBuffer | string>;
  write(path: string, data: ArrayBuffer | string, opts?: { append?: boolean }): Promise<void>;
  mkdir(path: string): Promise<void>;
  rm(path: string, opts?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<FileStat>;
  readdir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  
  // Alias operations
  createAlias(targetPath: string, aliasPath: string): Promise<void>;
  resolveAlias(path: string): Promise<string>;

  // Application lifecycle
  registerApp(app: Nova64App): void;
  launchApp(appId: string, args?: unknown): Promise<void>;
  quitApp(appId: string): void;
  getRunningApps(): string[];

  // UI operations
  alert(opts: AlertOptions): Promise<string>;
  toast(msg: string): void;
  registerControlStrip(item: ControlStripItem): void;

  // Menu operations
  setAppMenus(appId: string, menus: MenuTemplate[]): void;
  clearAppMenus(appId: string): void;

  // Event system
  on(type: string, handler: EventHandler): () => void;
  emit(evt: NovaEvent): void;

  // Window management
  createWindow(opts: Partial<WindowState>): string;
  closeWindow(windowId: string): void;
  focusWindow(windowId: string): void;

  // Preferences
  getPref(key: string): Promise<unknown>;
  setPref(key: string, value: unknown): Promise<void>;
}

// ============================================================================
// Finder View Types
// ============================================================================

export type FinderViewMode = 'icon' | 'list' | 'column';

export interface FinderItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'alias' | 'app';
  icon: string;
  size?: number;
  modified?: number;
}

// ============================================================================
// System Preferences
// ============================================================================

export interface SystemPreferences {
  appearance: {
    theme: 'platinum' | 'grayscale';
    accentColor: string;
    showScrollArrows: boolean;
  };
  sound: {
    volume: number;
    alertSound: string;
    uiSounds: boolean;
  };
  displays: {
    brightness: number;
    resolution: string;
  };
  general: {
    showFPS: boolean;
    scanlines: boolean;
    smoothScrolling: boolean;
  };
}

// ============================================================================
// Boot/Extension Types
// ============================================================================

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  icon: string;
  description?: string;
  enabled: boolean;
  load?: () => Promise<void>;
}

// ============================================================================
// Drag & Drop Types
// ============================================================================

export interface DragData {
  type: 'file' | 'folder' | 'app';
  paths: string[];
  sourceWindow?: string;
}
