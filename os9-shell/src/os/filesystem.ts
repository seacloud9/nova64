// IndexedDB-based filesystem for nova64 OS
import { get, set, del, keys } from 'idb-keyval';
import type { FileStat, FileSystemItem, AliasData } from '../types';

const FS_PREFIX = 'nova64-fs:';

export class Nova64FileSystem {
  private cache: Map<string, FileSystemItem> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  private async initializeDefaults(): Promise<void> {
    // Check if filesystem is already initialized
    const exists = await this.exists('/System');
    if (!exists) {
      await this.seedFilesystem();
    }
  }

  private async seedFilesystem(): Promise<void> {
    // Create directory structure
    const dirs = [
      '/System',
      '/System/Extensions',
      '/System/Control Panels',
      '/Applications',
      '/Users',
      '/Users/Player',
      '/Users/Player/Desktop',
      '/Users/Player/Documents',
      '/Users/Player/Library',
      '/Users/Player/Library/Preferences',
      '/Trash',
    ];

    for (const dir of dirs) {
      await this.mkdir(dir);
    }

    // Create initial files
    await this.write(
      '/Users/Player/Library/Preferences/com.nova64.shell.json',
      JSON.stringify({
        appearance: { theme: 'platinum', accentColor: '#0000FF', showScrollArrows: true },
        sound: { volume: 0.7, alertSound: 'Sosumi', uiSounds: true },
        displays: { brightness: 1.0, resolution: '800x600' },
        general: { showFPS: false, scanlines: false, smoothScrolling: true },
      })
    );

    // Seed extensions
    const extensions = [
      { id: 'com.nova64.graphics', name: 'Graphics Accelerator', icon: '🎨' },
      { id: 'com.nova64.sound', name: 'Sound Manager', icon: '🔊' },
      { id: 'com.nova64.network', name: 'Network Extension', icon: '🌐' },
      { id: 'com.nova64.memory', name: 'Memory Manager', icon: '💾' },
    ];

    for (const ext of extensions) {
      await this.write(
        `/System/Extensions/${ext.id}.json`,
        JSON.stringify({ ...ext, version: '1.0', enabled: true })
      );
    }

    // Create desktop items
    await this.createAlias('/Applications', '/Users/Player/Desktop/Applications');
    await this.createAlias('/Users/Player/Documents', '/Users/Player/Desktop/Documents');
  }

  private getKey(path: string): string {
    return FS_PREFIX + path;
  }

  private normalizePath(path: string): string {
    // Remove trailing slashes except for root
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  async read(path: string): Promise<ArrayBuffer | string> {
    path = this.normalizePath(path);
    
    // Check cache first
    if (this.cache.has(path)) {
      const item = this.cache.get(path)!;
      if (item.type === 'file' && item.data) {
        return item.data as ArrayBuffer | string;
      }
    }

    const item = await get<FileSystemItem>(this.getKey(path));
    if (!item) {
      throw new Error(`File not found: ${path}`);
    }

    if (item.type === 'directory') {
      throw new Error(`Cannot read directory: ${path}`);
    }

    if (item.type === 'alias') {
      const aliasData = item.data as AliasData;
      return this.read(aliasData.targetPath);
    }

    this.cache.set(path, item);
    return (item.data as ArrayBuffer | string) || '';
  }

  async write(
    path: string,
    data: ArrayBuffer | string,
    opts?: { append?: boolean }
  ): Promise<void> {
    path = this.normalizePath(path);
    
    // Ensure parent directory exists
    const parentPath = this.getParentPath(path);
    if (parentPath && !(await this.exists(parentPath))) {
      await this.mkdir(parentPath);
    }

    let finalData = data;
    if (opts?.append && (await this.exists(path))) {
      const existing = await this.read(path);
      if (typeof existing === 'string' && typeof data === 'string') {
        finalData = existing + data;
      }
    }

    const now = Date.now();
    let item = await get<FileSystemItem>(this.getKey(path));
    
    if (!item) {
      item = {
        path,
        type: 'file',
        created: now,
        modified: now,
      };
    }

    item.data = finalData;
    item.modified = now;

    await set(this.getKey(path), item);
    this.cache.set(path, item);
  }

  async mkdir(path: string): Promise<void> {
    path = this.normalizePath(path);
    
    if (await this.exists(path)) {
      return; // Already exists
    }

    // Create parent directories recursively
    const parts = path.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath += '/' + part;
      
      if (!(await this.exists(currentPath))) {
        const now = Date.now();
        const item: FileSystemItem = {
          path: currentPath,
          type: 'directory',
          created: now,
          modified: now,
        };
        
        await set(this.getKey(currentPath), item);
        this.cache.set(currentPath, item);
      }
    }
  }

  async rm(path: string, opts?: { recursive?: boolean }): Promise<void> {
    path = this.normalizePath(path);
    
    if (!(await this.exists(path))) {
      throw new Error(`Path not found: ${path}`);
    }

    const item = await this.stat(path);
    
    if (item.type === 'directory') {
      if (!opts?.recursive) {
        const children = await this.readdir(path);
        if (children.length > 0) {
          throw new Error(`Directory not empty: ${path}`);
        }
      } else {
        // Recursively delete children
        const children = await this.readdir(path);
        for (const child of children) {
          await this.rm(`${path}/${child}`, { recursive: true });
        }
      }
    }

    await del(this.getKey(path));
    this.cache.delete(path);
  }

  async stat(path: string): Promise<FileStat> {
    path = this.normalizePath(path);
    
    const item = await get<FileSystemItem>(this.getKey(path));
    if (!item) {
      throw new Error(`Path not found: ${path}`);
    }

    let size = 0;
    if (item.type === 'file' && item.data) {
      if (typeof item.data === 'string') {
        size = item.data.length;
      } else if (item.data instanceof ArrayBuffer) {
        size = item.data.byteLength;
      }
    }

    return {
      path: item.path,
      type: item.type,
      size,
      created: item.created,
      modified: item.modified,
    };
  }

  async readdir(path: string): Promise<string[]> {
    path = this.normalizePath(path);
    
    if (!(await this.exists(path))) {
      throw new Error(`Directory not found: ${path}`);
    }

    const item = await this.stat(path);
    if (item.type !== 'directory') {
      throw new Error(`Not a directory: ${path}`);
    }

    const allKeys = await keys();
    const prefix = this.getKey(path + '/');
    const children: string[] = [];

    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        const relativePath = key.substring(prefix.length);
        // Only immediate children (no slashes in relative path)
        if (!relativePath.includes('/')) {
          children.push(relativePath);
        }
      }
    }

    return children.sort();
  }

  async exists(path: string): Promise<boolean> {
    path = this.normalizePath(path);
    
    if (this.cache.has(path)) {
      return true;
    }

    const item = await get<FileSystemItem>(this.getKey(path));
    if (item) {
      this.cache.set(path, item);
    }
    return !!item;
  }

  async createAlias(targetPath: string, aliasPath: string): Promise<void> {
    targetPath = this.normalizePath(targetPath);
    aliasPath = this.normalizePath(aliasPath);
    
    if (!(await this.exists(targetPath))) {
      throw new Error(`Target not found: ${targetPath}`);
    }

    const now = Date.now();
    const aliasData: AliasData = {
      type: 'alias',
      targetPath,
      created: now,
    };

    const item: FileSystemItem = {
      path: aliasPath,
      type: 'alias',
      data: aliasData,
      created: now,
      modified: now,
    };

    await set(this.getKey(aliasPath), item);
    this.cache.set(aliasPath, item);
  }

  async resolveAlias(path: string, depth: number = 0): Promise<string> {
    if (depth > 10) {
      throw new Error('Alias chain too deep (circular reference?)');
    }

    path = this.normalizePath(path);
    
    const item = await get<FileSystemItem>(this.getKey(path));
    if (!item) {
      throw new Error(`Path not found: ${path}`);
    }

    if (item.type !== 'alias') {
      return path;
    }

    const aliasData = item.data as AliasData;
    return this.resolveAlias(aliasData.targetPath, depth + 1);
  }

  private getParentPath(path: string): string | null {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    parts.pop();
    return parts.length === 0 ? '/' : '/' + parts.join('/');
  }

  // Utility: Move to trash
  async moveToTrash(path: string): Promise<void> {
    path = this.normalizePath(path);
    
    const stat = await this.stat(path);
    const name = path.split('/').pop() || 'unknown';
    const trashPath = `/Trash/${name}`;

    // Handle name conflicts
    let finalTrashPath = trashPath;
    let counter = 1;
    while (await this.exists(finalTrashPath)) {
      finalTrashPath = `/Trash/${name}.${counter}`;
      counter++;
    }

    // Read and copy
    if (stat.type === 'file') {
      const data = await this.read(path);
      await this.write(finalTrashPath, data);
    } else if (stat.type === 'directory') {
      await this.mkdir(finalTrashPath);
      const children = await this.readdir(path);
      for (const child of children) {
        await this.moveToTrash(`${path}/${child}`);
      }
    }

    await this.rm(path, { recursive: true });
  }

  async emptyTrash(): Promise<void> {
    const items = await this.readdir('/Trash');
    for (const item of items) {
      await this.rm(`/Trash/${item}`, { recursive: true });
    }
  }
}

export const filesystem = new Nova64FileSystem();
