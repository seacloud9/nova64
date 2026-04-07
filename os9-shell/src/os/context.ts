// Nova Context API - The main interface for nova64 runtime integration
import { filesystem } from './filesystem';
import { eventBus, createEvent } from './events';
import { useAppStore, useMenuStore, useUIStore, useWindowStore } from './stores';
import { UISounds } from './sounds';
import type {
  NovaContext,
  Nova64App,
  FileStat,
  MenuTemplate,
  ControlStripItem,
  AlertOptions,
  EventHandler,
  NovaEvent,
  WindowState,
} from '../types';

class NovaContextImpl implements NovaContext {
  version = '1.0.0';

  // Filesystem API
  async read(path: string): Promise<ArrayBuffer | string> {
    return filesystem.read(path);
  }

  async write(
    path: string,
    data: ArrayBuffer | string,
    opts?: { append?: boolean }
  ): Promise<void> {
    await filesystem.write(path, data, opts);
    eventBus.emit(createEvent('fs:changed', { path, action: 'write' }));
  }

  async mkdir(path: string): Promise<void> {
    await filesystem.mkdir(path);
    eventBus.emit(createEvent('fs:changed', { path, action: 'mkdir' }));
  }

  async rm(path: string, opts?: { recursive?: boolean }): Promise<void> {
    await filesystem.rm(path, opts);
    eventBus.emit(createEvent('fs:changed', { path, action: 'rm' }));
  }

  async stat(path: string): Promise<FileStat> {
    return filesystem.stat(path);
  }

  async readdir(path: string): Promise<string[]> {
    return filesystem.readdir(path);
  }

  async exists(path: string): Promise<boolean> {
    return filesystem.exists(path);
  }

  async createAlias(targetPath: string, aliasPath: string): Promise<void> {
    await filesystem.createAlias(targetPath, aliasPath);
    eventBus.emit(createEvent('fs:changed', { path: aliasPath, action: 'alias' }));
  }

  async resolveAlias(path: string): Promise<string> {
    return filesystem.resolveAlias(path);
  }

  // Application lifecycle
  registerApp(app: Nova64App): void {
    useAppStore.getState().registerApp(app);
    console.log(`✅ Registered app: ${app.id} (${app.name})`);
    eventBus.emit(createEvent('app:registered', { appId: app.id }));
  }

  async launchApp(appId: string, args?: unknown): Promise<void> {
    console.log(`🚀 launchApp called with appId: ${appId}`);
    const app = useAppStore.getState().apps.get(appId);
    
    if (!app) {
      const availableApps = Array.from(useAppStore.getState().apps.keys());
      console.error(`❌ App not found: ${appId}`);
      console.error(`Available apps:`, availableApps);
      throw new Error(`App not found: ${appId}. Available: ${availableApps.join(', ')}`);
    }

    console.log(`✅ Found app:`, app.name);
    UISounds.windowOpen();
    useAppStore.getState().launchApp(appId);
    
    // Support custom window properties passed through args
    const a = (args && typeof args === 'object') ? args as Record<string, unknown> : {};
    const windowTitle  = (typeof a.windowTitle === 'string'  ? a.windowTitle  : undefined) ?? app.name;
    const windowWidth  = (typeof a.width       === 'number'  ? a.width        : undefined) ?? 800;
    const windowHeight = (typeof a.height      === 'number'  ? a.height       : undefined) ?? 600;

    // cart-runner (Nova64 Console) always opens maximized
    const startMaximized = appId === 'cart-runner';

    // Create a window for the app
    const windowId = useWindowStore.getState().createWindow({
      title: windowTitle,
      appId,
      width: windowWidth,
      height: windowHeight,
      isMaximized: startMaximized,
    });

    // Get the window element and mount the app
    setTimeout(() => {
      const windowElement = document.querySelector(`[data-window-id="${windowId}"] .window-content`);
      if (windowElement && app.mount) {
        app.mount(windowElement as HTMLElement, this, args);
      }
    }, 0);

    // Set app menus if provided
    if (app.menus) {
      this.setAppMenus(appId, app.menus);
    }

    eventBus.emit(createEvent('app:launched', { appId, args }));
  }

  quitApp(appId: string): void {
    const app = useAppStore.getState().apps.get(appId);
    if (app && app.unmount) {
      app.unmount();
    }

    // Close all windows for this app
    const windows = useWindowStore.getState().windows.filter((w) => w.appId === appId);
    windows.forEach((w) => {
      useWindowStore.getState().closeWindow(w.id);
    });

    useAppStore.getState().quitApp(appId);
    this.clearAppMenus(appId);
    eventBus.emit(createEvent('app:quit', { appId }));
  }

  getRunningApps(): string[] {
    return Array.from(useAppStore.getState().runningApps);
  }

  // UI operations
  async alert(opts: AlertOptions): Promise<string> {
    return useUIStore.getState().showAlert(opts);
  }

  toast(msg: string): void {
    useUIStore.getState().addToast(msg);
  }

  registerControlStrip(item: ControlStripItem): void {
    useUIStore.getState().addControlStripItem(item);
  }

  // Menu operations
  setAppMenus(appId: string, menus: MenuTemplate[]): void {
    useMenuStore.getState().setAppMenus(appId, menus);
    eventBus.emit(createEvent('menu:updated', { appId }));
  }

  clearAppMenus(appId: string): void {
    useMenuStore.getState().clearAppMenus(appId);
  }

  // Event system
  on(type: string, handler: EventHandler): () => void {
    return eventBus.on(type, handler);
  }

  emit(evt: NovaEvent): void {
    eventBus.emit(evt);
  }

  // Window management
  createWindow(opts: Partial<WindowState>): string {
    return useWindowStore.getState().createWindow(opts);
  }

  closeWindow(windowId: string): void {
    useWindowStore.getState().closeWindow(windowId);
  }

  focusWindow(windowId: string): void {
    useWindowStore.getState().focusWindow(windowId);
  }

  // Preferences
  async getPref(key: string): Promise<unknown> {
    try {
      const prefs = await this.read('/Users/Player/Library/Preferences/com.nova64.shell.json');
      const prefsObj = JSON.parse(prefs as string);
      return prefsObj[key];
    } catch {
      return undefined;
    }
  }

  async setPref(key: string, value: unknown): Promise<void> {
    try {
      let prefs: Record<string, unknown> = {};
      try {
        const prefsData = await this.read('/Users/Player/Library/Preferences/com.nova64.shell.json');
        prefs = JSON.parse(prefsData as string);
      } catch {
        // File doesn't exist yet
      }
      
      prefs[key] = value;
      await this.write('/Users/Player/Library/Preferences/com.nova64.shell.json', JSON.stringify(prefs, null, 2));
      eventBus.emit(createEvent('prefs:changed', { key, value }));
    } catch (error) {
      console.error('Failed to set preference:', error);
    }
  }
}

// Export singleton instance
export const novaContext = new NovaContextImpl();

// Make it available globally for external integration
if (typeof window !== 'undefined') {
  (window as unknown as { novaContext: NovaContext }).novaContext = novaContext;
}
