// Zustand stores for nova64 OS state management
import { create } from 'zustand';
import { useWorkspaceStore } from './workspaceStore';
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
      workspaceId: useWorkspaceStore.getState().activeWorkspace,
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
        w.id === id ? { ...w, isMaximized: !w.isMaximized, isShaded: false } : w
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
        w.id === id ? { ...w, isMinimized: false, isShaded: false, zIndex: nextZIndex } : w
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

// ============================================================================
// Desktop Theme Store — dark / light Glass UI
// ============================================================================

type DesktopTheme = 'dark' | 'light';

interface DesktopThemeStore {
  theme: DesktopTheme;
  setTheme: (t: DesktopTheme) => void;
  toggle: () => void;
}

const _savedDesktopTheme = ((): DesktopTheme => {
  try {
    const v = localStorage.getItem('nova64-desktop-theme');
    if (v === 'dark' || v === 'light') return v;
  } catch { /* ignore */ }
  return 'dark';
})();

export const useDesktopThemeStore = create<DesktopThemeStore>((set, get) => ({
  theme: _savedDesktopTheme,

  setTheme(t) {
    try { localStorage.setItem('nova64-desktop-theme', t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },

  toggle() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));

// ============================================================================
// Desktop Background Store — background customization
// ============================================================================

export type BackgroundType = 'preset' | 'color' | 'url';

export interface BackgroundPreset {
  id: string;
  name: string;
  type: 'gradient' | 'pattern' | 'image';
  value: string; // CSS background value
  thumbnail?: string; // preview color/gradient
}

// Built-in background presets
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'crystal-blue',
    name: 'Crystal Blue',
    type: 'image',
    thumbnail: 'linear-gradient(135deg, #061326 0%, #123a66 48%, #07192f 100%)',
    value: 'url("/os9-shell/wallpapers/deep-blue-crystal.svg") center/cover no-repeat, linear-gradient(160deg, #061326 0%, #123a66 48%, #07192f 100%)',
  },
  {
    id: 'ice-cavern',
    name: 'Ice Cavern',
    type: 'image',
    thumbnail: 'linear-gradient(135deg, #071827 0%, #1e6085 45%, #0b2a40 100%)',
    value: 'url("/os9-shell/wallpapers/ice-cavern.svg") center/cover no-repeat, linear-gradient(155deg, #071827 0%, #1e6085 45%, #0b2a40 100%)',
  },
  {
    id: 'quiet-orbit',
    name: 'Quiet Orbit',
    type: 'image',
    thumbnail: 'linear-gradient(135deg, #06101d 0%, #16436d 52%, #030914 100%)',
    value: 'url("/os9-shell/wallpapers/quiet-orbit.svg") center/cover no-repeat, linear-gradient(150deg, #06101d 0%, #16436d 52%, #030914 100%)',
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    type: 'gradient',
    thumbnail: 'linear-gradient(135deg, #050714 0%, #0d0d2b 50%, #0a0e27 100%)',
    value: `
      radial-gradient(ellipse at 20% 10%, rgba(120, 40, 200, 0.18) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 90%, rgba(20, 80, 200, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 20%, rgba(0, 180, 255, 0.08) 0%, transparent 40%),
      linear-gradient(135deg, #050714 0%, #0d0d2b 25%, #130d2e 50%, #0a1628 75%, #050714 100%)
    `,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    thumbnail: 'linear-gradient(135deg, #0a1a2e 0%, #1a4a3c 50%, #0d2a47 100%)',
    value: `
      radial-gradient(ellipse at 25% 15%, rgba(0, 255, 180, 0.12) 0%, transparent 45%),
      radial-gradient(ellipse at 75% 25%, rgba(100, 200, 255, 0.1) 0%, transparent 40%),
      radial-gradient(ellipse at 50% 70%, rgba(0, 180, 120, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 15% 85%, rgba(80, 255, 200, 0.08) 0%, transparent 35%),
      linear-gradient(160deg, #0a1a2e 0%, #0d2a3a 30%, #1a4a3c 50%, #0d2a47 70%, #081825 100%)
    `,
  },
  {
    id: 'nebula',
    name: 'Nebula',
    type: 'gradient',
    thumbnail: 'linear-gradient(135deg, #1a0a2e 0%, #2a1a4e 50%, #0a1a3e 100%)',
    value: `
      radial-gradient(ellipse at 30% 30%, rgba(200, 100, 255, 0.15) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 60%, rgba(100, 50, 200, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 80%, rgba(150, 80, 255, 0.1) 0%, transparent 40%),
      radial-gradient(ellipse at 85% 20%, rgba(80, 120, 255, 0.08) 0%, transparent 35%),
      linear-gradient(145deg, #1a0a2e 0%, #2a1a4e 30%, #1a1a5e 50%, #0a1a3e 75%, #0a0a1e 100%)
    `,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    type: 'gradient',
    thumbnail: 'linear-gradient(135deg, #1a1020 0%, #3a1a30 50%, #2a1525 100%)',
    value: `
      radial-gradient(ellipse at 50% 0%, rgba(255, 150, 100, 0.2) 0%, transparent 50%),
      radial-gradient(ellipse at 30% 30%, rgba(255, 100, 80, 0.12) 0%, transparent 45%),
      radial-gradient(ellipse at 70% 50%, rgba(200, 80, 120, 0.1) 0%, transparent 40%),
      radial-gradient(ellipse at 50% 100%, rgba(40, 20, 60, 0.3) 0%, transparent 60%),
      linear-gradient(180deg, #2a1525 0%, #3a1a30 25%, #301a35 50%, #1a1020 75%, #0a0815 100%)
    `,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    type: 'gradient',
    thumbnail: 'linear-gradient(135deg, #080812 0%, #101025 50%, #0a0a18 100%)',
    value: `
      radial-gradient(ellipse at 50% 50%, rgba(40, 40, 80, 0.15) 0%, transparent 60%),
      radial-gradient(circle at 20% 20%, rgba(60, 60, 100, 0.08) 0%, transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(50, 50, 90, 0.08) 0%, transparent 40%),
      linear-gradient(135deg, #080812 0%, #101025 50%, #0a0a18 100%)
    `,
  },
];

interface DesktopBackgroundStore {
  backgroundType: BackgroundType;
  presetId: string;
  solidColor: string;
  imageUrl: string;
  setPreset: (id: string) => void;
  setSolidColor: (color: string) => void;
  setImageUrl: (url: string) => void;
  getBackgroundStyle: () => string;
}

const _loadBackgroundSettings = (): { type: BackgroundType; presetId: string; solidColor: string; imageUrl: string } => {
  try {
    const saved = localStorage.getItem('nova64-desktop-background');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        type: parsed.type || 'preset',
        presetId: parsed.presetId || 'crystal-blue',
        solidColor: parsed.solidColor || '#1a3a5c',
        imageUrl: parsed.imageUrl || '',
      };
    }
  } catch { /* ignore */ }
  return { type: 'preset', presetId: 'crystal-blue', solidColor: '#1a3a5c', imageUrl: '' };
};

const _saveBackgroundSettings = (settings: { type: BackgroundType; presetId: string; solidColor: string; imageUrl: string }) => {
  try {
    localStorage.setItem('nova64-desktop-background', JSON.stringify(settings));
  } catch { /* ignore */ }
};

const _cssUrl = (url: string) => url.replace(/"/g, '%22');

const _initialBg = _loadBackgroundSettings();

export const useDesktopBackgroundStore = create<DesktopBackgroundStore>((set, get) => ({
  backgroundType: _initialBg.type,
  presetId: _initialBg.presetId,
  solidColor: _initialBg.solidColor,
  imageUrl: _initialBg.imageUrl,

  setPreset(id) {
    set({ backgroundType: 'preset', presetId: id });
    _saveBackgroundSettings({ type: 'preset', presetId: id, solidColor: get().solidColor, imageUrl: get().imageUrl });
  },

  setSolidColor(color) {
    set({ backgroundType: 'color', solidColor: color });
    _saveBackgroundSettings({ type: 'color', presetId: get().presetId, solidColor: color, imageUrl: get().imageUrl });
  },

  setImageUrl(url) {
    set({ backgroundType: 'url', imageUrl: url });
    _saveBackgroundSettings({ type: 'url', presetId: get().presetId, solidColor: get().solidColor, imageUrl: url });
  },

  getBackgroundStyle() {
    const { backgroundType, presetId, solidColor, imageUrl } = get();

    if (backgroundType === 'color') {
      return solidColor;
    }

    if (backgroundType === 'url' && imageUrl) {
      return `url("${_cssUrl(imageUrl)}") center/cover no-repeat, #07192f`;
    }

    // Find preset
    const preset = BACKGROUND_PRESETS.find(p => p.id === presetId);
    if (preset) {
      return preset.value;
    }

    // Fallback to crystal-blue
    return BACKGROUND_PRESETS[0].value;
  },
}));
