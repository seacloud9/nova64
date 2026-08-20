/** Type declarations for @nova64/workspace-core (host-neutral workspace model). */

// ── paths ──────────────────────────────────────────────────────────────────
export function segments(p: string): string[];
export function normalizeRelative(input: string): string;
export function isSafeRelative(p: string): boolean;
export function basename(p: string): string;
export function dirname(p: string): string;
export function extname(p: string): string;
export function joinRelative(...parts: string[]): string;

// ── file tree ──────────────────────────────────────────────────────────────
export type FileEntry = { path: string; type: 'file' | 'dir' };

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

export function buildFileTree(entries: FileEntry[]): TreeNode;

// ── workspace ──────────────────────────────────────────────────────────────
export interface TabState {
  path: string;
  content: string;
  savedContent: string;
}

export interface TabSummary {
  path: string;
  dirty: boolean;
  active: boolean;
}

export interface WorkspaceSession {
  root: string;
  open: string[];
  active: string | null;
}

export class Workspace {
  constructor(opts?: { root?: string; name?: string });
  root: string;
  name: string;
  entries: FileEntry[];
  tree: TreeNode;
  tabs: Map<string, TabState>;
  order: string[];
  activePath: string | null;
  setEntries(entries: FileEntry[]): TreeNode;
  openTab(path: string, content?: string): TabState;
  closeTab(path: string, opts?: { force?: boolean }): boolean;
  setContent(path: string, content: string): void;
  markSaved(path: string, content?: string): void;
  setActive(path: string): void;
  isDirty(path: string): boolean;
  anyDirty(): boolean;
  listTabs(): TabSummary[];
  serialize(): WorkspaceSession;
}

// ── filesystem contract ────────────────────────────────────────────────────
export interface NovaFileSystem {
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  list(path?: string): Promise<FileEntry[]>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

export class MemoryFileSystem implements NovaFileSystem {
  constructor(initial?: Record<string, string>);
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  list(path?: string): Promise<FileEntry[]>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
