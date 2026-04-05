// Zustand stores for nova64 OS state management
import { create } from 'zustand';
import type {
  WindowState,
  Nova64App,
  MenuTemplate,
  ControlStripItem,
  SystemPreferences,
  AlertOptions,
} from '../types';

// ============================================================================
// Window Store
// ============================================================================

interface WindowStore {
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  
  createWindow: (window: Partial<WindowState>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  toggleShade: (id: string) => void;
  toggleMaximize: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  nextZIndex: 100,

  createWindow: (windowData) => {
    const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { nextZIndex } = get();
    
    const newWindow: WindowState = {
      id,
      title: 'Untitled',
      x: 100 + (get().windows.length * 30),
      y: 100 + (get().windows.length * 30),
      width: 400,
      height: 300,
      isShaded: false,
      isMaximized: false,
      isMinimized: false,
      zIndex: nextZIndex,
      appId: 'unknown',
      closable: true,
      resizable: true,
      ...windowData,
    };

    set((state) => ({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      nextZIndex: nextZIndex + 1,
    }));

    return id;
  },

  closeWindow: (id) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  focusWindow: (id) => {
    const { nextZIndex, windows } = get();
    const window = windows.find((w) => w.id === id);
    
    if (window) {
      set((state) => ({
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, zIndex: nextZIndex } : w
        ),
        activeWindowId: id,
        nextZIndex: nextZIndex + 1,
      }));
    }
  },

  updateWindow: (id, updates) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    }));
  },

  toggleShade: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isShaded: !w.isShaded } : w
      ),
    }));
  },

  toggleMaximize: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    }));
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
    }));
  },

  restoreWindow: (id) => {
    const { nextZIndex } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w
      ),
      activeWindowId: id,
      nextZIndex: nextZIndex + 1,
    }));
  },
}));

// ============================================================================
// Application Store
// ============================================================================

interface AppStore {
  apps: Map<string, Nova64App>;
  runningApps: Set<string>;
  foregroundApp: string | null;
  
  registerApp: (app: Nova64App) => void;
  unregisterApp: (appId: string) => void;
  launchApp: (appId: string) => void;
  quitApp: (appId: string) => void;
  setForeground: (appId: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  apps: new Map(),
  runningApps: new Set(),
  foregroundApp: null,

  registerApp: (app) => {
    set((state) => {
      const newApps = new Map(state.apps);
      newApps.set(app.id, app);
      return { apps: newApps };
    });
  },

  unregisterApp: (appId) => {
    set((state) => {
      const newApps = new Map(state.apps);
      newApps.delete(appId);
      return { apps: newApps };
    });
  },

  launchApp: (appId) => {
    set((state) => {
      const newRunning = new Set(state.runningApps);
      newRunning.add(appId);
      return { runningApps: newRunning, foregroundApp: appId };
    });
  },

  quitApp: (appId) => {
    set((state) => {
      const newRunning = new Set(state.runningApps);
      newRunning.delete(appId);
      return { 
        runningApps: newRunning,
        foregroundApp: state.foregroundApp === appId ? null : state.foregroundApp,
      };
    });
  },

  setForeground: (appId) => {
    set({ foregroundApp: appId });
  },
}));

// ============================================================================
// Menu Store
// ============================================================================

interface MenuStore {
  activeMenu: string | null;
  appMenus: Map<string, MenuTemplate[]>;
  
  setActiveMenu: (menuId: string | null) => void;
  setAppMenus: (appId: string, menus: MenuTemplate[]) => void;
  clearAppMenus: (appId: string) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  activeMenu: null,
  appMenus: new Map(),

  setActiveMenu: (menuId) => {
    set({ activeMenu: menuId });
  },

  setAppMenus: (appId, menus) => {
    set((state) => {
      const newMenus = new Map(state.appMenus);
      newMenus.set(appId, menus);
      return { appMenus: newMenus };
    });
  },

  clearAppMenus: (appId) => {
    set((state) => {
      const newMenus = new Map(state.appMenus);
      newMenus.delete(appId);
      return { appMenus: newMenus };
    });
  },
}));

// ============================================================================
// UI Store (alerts, toasts, control strip, etc.)
// ============================================================================

interface Toast {
  id: string;
  message: string;
  timestamp: number;
}

interface Alert {
  id: string;
  options: AlertOptions;
  resolve: (result: string) => void;
}

interface UIStore {
  toasts: Toast[];
  alerts: Alert[];
  controlStripCollapsed: boolean;
  controlStripItems: ControlStripItem[];
  showFPS: boolean;
  scanlines: boolean;
  
  addToast: (message: string) => void;
  removeToast: (id: string) => void;
  showAlert: (options: AlertOptions) => Promise<string>;
  dismissAlert: (id: string, result: string) => void;
  toggleControlStrip: () => void;
  addControlStripItem: (item: ControlStripItem) => void;
  removeControlStripItem: (id: string) => void;
  toggleFPS: () => void;
  toggleScanlines: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  toasts: [],
  alerts: [],
  controlStripCollapsed: false,
  controlStripItems: [],
  showFPS: false,
  scanlines: false,

  addToast: (message) => {
    const id = `toast-${Date.now()}`;
    const toast: Toast = { id, message, timestamp: Date.now() };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showAlert: (options) => {
    return new Promise((resolve) => {
      const id = `alert-${Date.now()}`;
      const alert: Alert = { id, options, resolve };
      
      set((state) => ({
        alerts: [...state.alerts, alert],
      }));
    });
  },

  dismissAlert: (id, result) => {
    const alert = get().alerts.find((a) => a.id === id);
    if (alert) {
      alert.resolve(result);
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
      }));
    }
  },

  toggleControlStrip: () => {
    set((state) => ({
      controlStripCollapsed: !state.controlStripCollapsed,
    }));
  },

  addControlStripItem: (item) => {
    set((state) => ({
      controlStripItems: [...state.controlStripItems, item],
    }));
  },

  removeControlStripItem: (id) => {
    set((state) => ({
      controlStripItems: state.controlStripItems.filter((i) => i.id !== id),
    }));
  },

  toggleFPS: () => {
    set((state) => ({
      showFPS: !state.showFPS,
    }));
  },

  toggleScanlines: () => {
    set((state) => ({
      scanlines: !state.scanlines,
    }));
  },
}));

// ============================================================================
// System Store (preferences, boot state, etc.)
// ============================================================================

interface SystemStore {
  booted: boolean;
  bootProgress: number;
  preferences: SystemPreferences;
  
  setBoot: (booted: boolean) => void;
  setBootProgress: (progress: number) => void;
  updatePreferences: (prefs: Partial<SystemPreferences>) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  booted: false,
  bootProgress: 0,
  preferences: {
    appearance: {
      theme: 'platinum',
      accentColor: '#0000DD',
      showScrollArrows: true,
    },
    sound: {
      volume: 0.7,
      alertSound: 'Sosumi',
      uiSounds: true,
    },
    displays: {
      brightness: 1.0,
      resolution: '800x600',
    },
    general: {
      showFPS: false,
      scanlines: false,
      smoothScrolling: true,
    },
  },

  setBoot: (booted) => {
    set({ booted });
  },

  setBootProgress: (progress) => {
    set({ bootProgress: progress });
  },

  updatePreferences: (prefs) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...prefs,
      },
    }));
  },
}));
