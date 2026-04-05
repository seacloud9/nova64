import { novaContext } from '../os/context';
import type { Nova64App, FinderViewMode, FinderItem, FileStat } from '../types';

// ============================================================================
// Finder App — Full file browser with icon/list/column views
// ============================================================================

interface FinderState {
  currentPath: string;
  viewMode: FinderViewMode;
  items: FinderItem[];
  selectedItems: Set<string>;
  history: string[];
  historyIndex: number;
  columnPaths: string[]; // for column view
  sortBy: 'name' | 'date' | 'size' | 'kind';
  sortAsc: boolean;
  loading: boolean;
}

function iconForType(
  type: string,
  _name: string,
  ext: string
): string {
  if (type === 'directory') return '📁';
  if (type === 'alias') return '🔗';
  if (type === 'app') return '💿';
  // file extension icons
  const map: Record<string, string> = {
    json: '📋',
    txt: '📝',
    md: '📄',
    js: '📜',
    ts: '📜',
    tsx: '📜',
    html: '🌐',
    css: '🎨',
    png: '🖼️',
    jpg: '🖼️',
    svg: '🖼️',
    wav: '🔊',
    mp3: '🎵',
  };
  return map[ext] || '📄';
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.substring(i + 1).toLowerCase() : '';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getKind(item: FinderItem): string {
  if (item.type === 'directory') return 'Folder';
  if (item.type === 'alias') return 'Alias';
  if (item.type === 'app') return 'Application';
  const ext = getExtension(item.name);
  const kinds: Record<string, string> = {
    json: 'JSON Document',
    txt: 'Plain Text',
    md: 'Markdown',
    js: 'JavaScript',
    ts: 'TypeScript',
    html: 'HTML Document',
    css: 'Stylesheet',
    png: 'PNG Image',
    jpg: 'JPEG Image',
  };
  return kinds[ext] || 'Document';
}

class FinderApp {
  private el: HTMLElement | null = null;
  private state: FinderState = {
    currentPath: '/',
    viewMode: 'icon',
    items: [],
    selectedItems: new Set(),
    history: ['/'],
    historyIndex: 0,
    columnPaths: ['/'],
    sortBy: 'name',
    sortAsc: true,
    loading: false,
  };

  mount(el: HTMLElement, _ctx: any, startPath?: string) {
    this.el = el;
    if (startPath) {
      this.state.currentPath = startPath;
      this.state.history = [startPath];
      this.state.columnPaths = [startPath];
    }
    this.loadDirectory(this.state.currentPath);
  }

  unmount() {
    if (this.el) this.el.innerHTML = '';
    this.el = null;
  }

  private async loadDirectory(path: string) {
    this.state.loading = true;
    this.render();

    try {
      const entries = await novaContext.readdir(path);
      const items: FinderItem[] = [];

      for (const name of entries) {
        const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
        try {
          const stat: FileStat = await novaContext.stat(fullPath);
          const ext = getExtension(name);
          items.push({
            name,
            path: fullPath,
            type: stat.type as any,
            icon: iconForType(stat.type, name, ext),
            size: stat.size,
            modified: stat.modified,
          });
        } catch {
          items.push({
            name,
            path: fullPath,
            type: 'file',
            icon: '📄',
          });
        }
      }

      this.state.items = this.sortItems(items);
      this.state.selectedItems = new Set();
    } catch (e) {
      this.state.items = [];
    }

    this.state.loading = false;
    this.render();
  }

  private sortItems(items: FinderItem[]): FinderItem[] {
    const { sortBy, sortAsc } = this.state;
    const sorted = [...items].sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;

      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'date':
          cmp = (a.modified || 0) - (b.modified || 0);
          break;
        case 'size':
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case 'kind':
          cmp = getKind(a).localeCompare(getKind(b));
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }

  private navigate(path: string) {
    this.state.currentPath = path;
    // Update history
    this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    this.state.history.push(path);
    this.state.historyIndex = this.state.history.length - 1;
    // Update column paths for column view
    if (this.state.viewMode === 'column') {
      const depth = path.split('/').filter(Boolean).length;
      this.state.columnPaths = this.state.columnPaths.slice(0, depth);
      this.state.columnPaths.push(path);
    }
    this.loadDirectory(path);
  }

  private goBack() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.state.currentPath = this.state.history[this.state.historyIndex];
      this.loadDirectory(this.state.currentPath);
    }
  }

  private goForward() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.state.currentPath = this.state.history[this.state.historyIndex];
      this.loadDirectory(this.state.currentPath);
    }
  }

  private goUp() {
    const parent = this.state.currentPath.split('/').slice(0, -1).join('/') || '/';
    this.navigate(parent);
  }

  private selectItem(name: string, multi: boolean) {
    if (multi) {
      const s = new Set(this.state.selectedItems);
      if (s.has(name)) s.delete(name);
      else s.add(name);
      this.state.selectedItems = s;
    } else {
      this.state.selectedItems = new Set([name]);
    }
    this.render();
  }

  private setViewMode(mode: FinderViewMode) {
    this.state.viewMode = mode;
    if (mode === 'column') {
      // Reset column paths to current path chain
      const parts = this.state.currentPath.split('/').filter(Boolean);
      this.state.columnPaths = ['/'];
      let cur = '';
      for (const p of parts) {
        cur += '/' + p;
        this.state.columnPaths.push(cur);
      }
    }
    this.render();
  }

  private setSortBy(field: 'name' | 'date' | 'size' | 'kind') {
    if (this.state.sortBy === field) {
      this.state.sortAsc = !this.state.sortAsc;
    } else {
      this.state.sortBy = field;
      this.state.sortAsc = true;
    }
    this.state.items = this.sortItems(this.state.items);
    this.render();
  }

  private render() {
    if (!this.el) return;

    const { currentPath, viewMode, items, loading } = this.state;
    const pathParts = currentPath.split('/').filter(Boolean);
    const canBack = this.state.historyIndex > 0;
    const canForward = this.state.historyIndex < this.state.history.length - 1;
    const canUp = currentPath !== '/';
    const itemCount = items.length;

    this.el.innerHTML = `
      <div class="finder" style="display:flex;flex-direction:column;height:100%;background:var(--gnome-bg);color:var(--gnome-text);font-family:var(--font-system);">
        <!-- Toolbar -->
        <div class="finder-toolbar" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--gnome-panel);border-bottom:1px solid var(--gnome-border);flex-shrink:0;">
          <button class="finder-btn" data-action="back" ${canBack ? '' : 'disabled'} title="Back" style="font-size:14px;">◀</button>
          <button class="finder-btn" data-action="forward" ${canForward ? '' : 'disabled'} title="Forward" style="font-size:14px;">▶</button>
          <button class="finder-btn" data-action="up" ${canUp ? '' : 'disabled'} title="Enclosing Folder" style="font-size:14px;">▲</button>
          <div style="flex:1;min-width:0;">
            <div class="finder-breadcrumb" style="display:flex;align-items:center;gap:2px;font-size:12px;overflow-x:auto;white-space:nowrap;">
              <span class="finder-crumb" data-path="/" style="cursor:pointer;padding:2px 6px;border-radius:4px;">💾 Nova HD</span>
              ${pathParts
                .map((part, i) => {
                  const p = '/' + pathParts.slice(0, i + 1).join('/');
                  return `<span style="color:var(--gnome-text-disabled);">/</span><span class="finder-crumb" data-path="${p}" style="cursor:pointer;padding:2px 6px;border-radius:4px;">${part}</span>`;
                })
                .join('')}
            </div>
          </div>
          <div style="display:flex;gap:2px;border:1px solid var(--gnome-border);border-radius:6px;overflow:hidden;">
            <button class="finder-view-btn ${viewMode === 'icon' ? 'active' : ''}" data-view="icon" title="Icons" style="font-size:13px;">⊞</button>
            <button class="finder-view-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list" title="List" style="font-size:13px;">☰</button>
            <button class="finder-view-btn ${viewMode === 'column' ? 'active' : ''}" data-view="column" title="Columns" style="font-size:13px;">⫏</button>
          </div>
        </div>
        
        <!-- Content area -->
        <div class="finder-content" style="flex:1;overflow:auto;position:relative;">
          ${loading ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gnome-text-disabled);">Loading...</div>' : this.renderContent()}
        </div>
        
        <!-- Status bar -->
        <div style="padding:4px 10px;background:var(--gnome-panel);border-top:1px solid var(--gnome-border);font-size:11px;color:var(--gnome-text-secondary);flex-shrink:0;">
          ${itemCount} item${itemCount !== 1 ? 's' : ''}${this.state.selectedItems.size > 0 ? `, ${this.state.selectedItems.size} selected` : ''}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderContent(): string {
    switch (this.state.viewMode) {
      case 'icon':
        return this.renderIconView();
      case 'list':
        return this.renderListView();
      case 'column':
        return this.renderColumnView();
    }
  }

  private renderIconView(): string {
    const { items, selectedItems } = this.state;
    if (items.length === 0) {
      return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gnome-text-disabled);font-size:14px;">📂 Empty folder</div>';
    }
    return `
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:16px;align-content:flex-start;">
        ${items
          .map(
            (item) => `
          <div class="finder-icon-item ${selectedItems.has(item.name) ? 'selected' : ''}" data-name="${item.name}" data-path="${item.path}" data-type="${item.type}" style="width:90px;text-align:center;padding:10px 6px;border-radius:8px;cursor:pointer;transition:background 0.15s;">
            <div style="font-size:40px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">${item.icon}</div>
            <div style="font-size:11px;word-break:break-word;line-height:1.3;">${item.name}</div>
          </div>`
          )
          .join('')}
      </div>
    `;
  }

  private renderListView(): string {
    const { items, selectedItems, sortBy, sortAsc } = this.state;
    const arrow = (field: string) =>
      sortBy === field ? (sortAsc ? ' ▴' : ' ▾') : '';

    return `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:var(--gnome-panel);border-bottom:1px solid var(--gnome-border);position:sticky;top:0;z-index:1;">
            <th class="finder-sort-col" data-sort="name" style="text-align:left;padding:6px 10px;cursor:pointer;font-weight:600;user-select:none;">Name${arrow('name')}</th>
            <th class="finder-sort-col" data-sort="date" style="text-align:left;padding:6px 10px;cursor:pointer;font-weight:600;width:160px;user-select:none;">Date Modified${arrow('date')}</th>
            <th class="finder-sort-col" data-sort="size" style="text-align:right;padding:6px 10px;cursor:pointer;font-weight:600;width:80px;user-select:none;">Size${arrow('size')}</th>
            <th class="finder-sort-col" data-sort="kind" style="text-align:left;padding:6px 10px;cursor:pointer;font-weight:600;width:120px;user-select:none;">Kind${arrow('kind')}</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--gnome-text-disabled);">📂 Empty folder</td></tr>' : ''}
          ${items
            .map(
              (item) => `
            <tr class="finder-list-row ${selectedItems.has(item.name) ? 'selected' : ''}" data-name="${item.name}" data-path="${item.path}" data-type="${item.type}" style="cursor:pointer;border-bottom:1px solid var(--gnome-border);">
              <td style="padding:5px 10px;"><span style="margin-right:6px;">${item.icon}</span>${item.name}</td>
              <td style="padding:5px 10px;color:var(--gnome-text-secondary);">${item.modified ? formatDate(item.modified) : '—'}</td>
              <td style="padding:5px 10px;text-align:right;color:var(--gnome-text-secondary);">${item.type === 'directory' ? '—' : formatSize(item.size || 0)}</td>
              <td style="padding:5px 10px;color:var(--gnome-text-secondary);">${getKind(item)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  private renderColumnView(): string {
    // Render multiple columns for path traversal
    // This is async-heavy so we render a simplified version and load columns lazily
    return `
      <div class="finder-columns" style="display:flex;height:100%;overflow-x:auto;">
        ${this.state.columnPaths
          .map(
            (colPath, i) => `
          <div class="finder-column" data-col-path="${colPath}" data-col-index="${i}" style="min-width:200px;max-width:250px;border-right:1px solid var(--gnome-border);overflow-y:auto;flex-shrink:0;">
            <div style="padding:4px 0;" class="finder-col-items" data-col-path="${colPath}">
              <div style="color:var(--gnome-text-disabled);padding:8px 12px;font-size:11px;">Loading...</div>
            </div>
          </div>`
          )
          .join('')}
      </div>
    `;
  }

  private async loadColumnItems() {
    if (!this.el) return;
    for (const colPath of this.state.columnPaths) {
      const container = this.el.querySelector(
        `.finder-col-items[data-col-path="${colPath}"]`
      );
      if (!container) continue;

      try {
        const entries = await novaContext.readdir(colPath);
        const items: FinderItem[] = [];
        for (const name of entries) {
          const fullPath = colPath === '/' ? `/${name}` : `${colPath}/${name}`;
          try {
            const stat = await novaContext.stat(fullPath);
            items.push({
              name,
              path: fullPath,
              type: stat.type as any,
              icon: iconForType(stat.type, name, getExtension(name)),
              size: stat.size,
              modified: stat.modified,
            });
          } catch {
            items.push({ name, path: fullPath, type: 'file', icon: '📄' });
          }
        }
        const isLastCol =
          colPath === this.state.columnPaths[this.state.columnPaths.length - 1];

        container.innerHTML = items.length === 0
          ? '<div style="color:var(--gnome-text-disabled);padding:8px 12px;font-size:11px;">Empty</div>'
          : items
              .map(
                (item) => `
              <div class="finder-col-item ${this.state.selectedItems.has(item.name) && isLastCol ? 'selected' : ''}" data-name="${item.name}" data-path="${item.path}" data-type="${item.type}" style="display:flex;align-items:center;gap:6px;padding:4px 12px;cursor:pointer;font-size:12px;border-radius:4px;margin:1px 4px;">
                <span style="flex-shrink:0;">${item.icon}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</span>
                ${item.type === 'directory' ? '<span style="color:var(--gnome-text-disabled);font-size:10px;">▸</span>' : ''}
              </div>`
              )
              .join('');
      } catch {
        container.innerHTML =
          '<div style="color:var(--gnome-text-disabled);padding:8px 12px;font-size:11px;">Error</div>';
      }
    }
    // Attach column event listeners
    this.attachColumnEvents();
  }

  private attachColumnEvents() {
    if (!this.el) return;
    this.el.querySelectorAll('.finder-col-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement);
        const name = target.dataset.name!;
        const path = target.dataset.path!;
        const type = target.dataset.type!;
        
        // Find which column this item is in
        const colEl = target.closest('.finder-column') as HTMLElement;
        const colIndex = parseInt(colEl.dataset.colIndex || '0');

        // Highlight
        colEl.querySelectorAll('.finder-col-item').forEach((ci) => ci.classList.remove('selected'));
        target.classList.add('selected');

        if (type === 'directory') {
          // Trim columns after this one and add new path
          this.state.columnPaths = this.state.columnPaths.slice(0, colIndex + 1);
          this.state.columnPaths.push(path);
          this.state.currentPath = path;
          this.render();
        } else {
          this.state.selectedItems = new Set([name]);
        }
      });
      el.addEventListener('dblclick', (e) => {
        const target = (e.currentTarget as HTMLElement);
        const path = target.dataset.path!;
        const type = target.dataset.type!;
        if (type === 'directory') {
          this.navigate(path);
        }
      });
    });
  }

  private attachEvents() {
    if (!this.el) return;

    // Navigation buttons
    this.el.querySelectorAll('.finder-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'back') this.goBack();
        if (action === 'forward') this.goForward();
        if (action === 'up') this.goUp();
      });
    });

    // Breadcrumb navigation
    this.el.querySelectorAll('.finder-crumb').forEach((crumb) => {
      crumb.addEventListener('click', () => {
        const path = (crumb as HTMLElement).dataset.path!;
        this.navigate(path);
      });
    });

    // View mode buttons
    this.el.querySelectorAll('.finder-view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.view as FinderViewMode;
        this.setViewMode(mode);
      });
    });

    // Sort column headers (list view)
    this.el.querySelectorAll('.finder-sort-col').forEach((col) => {
      col.addEventListener('click', () => {
        const field = (col as HTMLElement).dataset.sort as any;
        this.setSortBy(field);
      });
    });

    // Icon view items
    this.el.querySelectorAll('.finder-icon-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const name = (el as HTMLElement).dataset.name!;
        this.selectItem(name, (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey);
      });
      el.addEventListener('dblclick', () => {
        const path = (el as HTMLElement).dataset.path!;
        const type = (el as HTMLElement).dataset.type!;
        if (type === 'directory') this.navigate(path);
      });
    });

    // List view rows
    this.el.querySelectorAll('.finder-list-row').forEach((el) => {
      el.addEventListener('click', (e) => {
        const name = (el as HTMLElement).dataset.name!;
        this.selectItem(name, (e as MouseEvent).metaKey || (e as MouseEvent).ctrlKey);
      });
      el.addEventListener('dblclick', () => {
        const path = (el as HTMLElement).dataset.path!;
        const type = (el as HTMLElement).dataset.type!;
        if (type === 'directory') this.navigate(path);
      });
    });

    // Column view — load items lazily
    if (this.state.viewMode === 'column') {
      this.loadColumnItems();
    }

    // Style injection for hover/selected states
    this.injectFinderStyles();
  }

  private injectFinderStyles() {
    if (!this.el) return;
    const id = 'finder-injected-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .finder-btn {
        background: var(--gnome-card);
        border: 1px solid var(--gnome-border);
        color: var(--gnome-text);
        border-radius: 6px;
        padding: 3px 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .finder-btn:hover:not(:disabled) { background: var(--gnome-hover); }
      .finder-btn:disabled { opacity: 0.3; cursor: default; }
      .finder-view-btn {
        background: var(--gnome-card);
        border: none;
        color: var(--gnome-text);
        padding: 4px 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .finder-view-btn:hover { background: var(--gnome-hover); }
      .finder-view-btn.active { background: var(--gnome-blue); color: #fff; }
      .finder-crumb:hover { background: var(--gnome-hover); }
      .finder-icon-item:hover { background: rgba(53,132,228,0.12); }
      .finder-icon-item.selected { background: rgba(53,132,228,0.3); box-shadow: 0 0 0 2px rgba(53,132,228,0.5); }
      .finder-list-row:hover { background: rgba(53,132,228,0.1); }
      .finder-list-row.selected { background: rgba(53,132,228,0.25); }
      .finder-col-item:hover { background: rgba(53,132,228,0.12); }
      .finder-col-item.selected { background: var(--gnome-blue); color: #fff; border-radius: 4px; }
    `;
    document.head.appendChild(style);
  }
}

// Register the Finder app
const finderInstance = new FinderApp();

const finderApp: Nova64App = {
  id: 'com.nova64.finder',
  name: 'Finder',
  icon: '📂',
  menus: [
    {
      label: 'File',
      submenu: [
        { label: 'New Folder', accelerator: '⌘⇧N' },
        { label: 'Open', accelerator: '⌘O' },
        { type: 'separator', label: '' },
        { label: 'Close Window', accelerator: '⌘W' },
        { label: 'Get Info', accelerator: '⌘I' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'as Icons', id: 'view-icon' },
        { label: 'as List', id: 'view-list' },
        { label: 'as Columns', id: 'view-column' },
      ],
    },
  ],
  mount(el: HTMLElement, ctx: any) {
    finderInstance.mount(el, ctx);
  },
  unmount() {
    finderInstance.unmount();
  },
};

novaContext.registerApp(finderApp);

// Also export a helper that lets other code open Finder at a specific path
export function openFinderAt(path: string) {
  const inst = new FinderApp();
  const windowId = novaContext.createWindow({
    title: `Finder — ${path}`,
    appId: 'com.nova64.finder',
    width: 700,
    height: 450,
  });
  setTimeout(() => {
    const el = document.querySelector(
      `[data-window-id="${windowId}"] .window-content`
    ) as HTMLElement;
    if (el) inst.mount(el, novaContext, path);
  }, 0);
}
