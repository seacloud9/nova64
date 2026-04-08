import { create } from 'zustand';
import type { TVApp, Theme, WindowState } from '../types';

// ─── App Store ───────────────────────────────────────────────────────────────

interface AppStore {
  apps: Map<string, TVApp>;
  registerApp: (app: TVApp) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  apps: new Map(),
  registerApp: (app) =>
    set((state) => {
      const next = new Map(state.apps);
      next.set(app.id, app);
      return { apps: next };
    }),
}));

// ─── Window Store ─────────────────────────────────────────────────────────────

interface TVWindowStore {
  window: WindowState | null;
  openWindow: (appId: string, args?: Record<string, unknown>) => void;
  closeWindow: () => void;
}

export const useWindowStore = create<TVWindowStore>((set) => ({
  window: null,
  openWindow: (appId, args = {}) => set({ window: { appId, args } }),
  closeWindow: () => set({ window: null }),
}));

// ─── Theme Store ──────────────────────────────────────────────────────────────

type ThemeStore = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const savedTheme = ((): Theme => {
  try {
    const v = localStorage.getItem('nova64-mobile-theme');
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return 'dark';
})();

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: savedTheme,
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('nova64-mobile-theme', next); } catch { /* ignore */ }
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setTheme: (t) => {
    try { localStorage.setItem('nova64-mobile-theme', t); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },
}));

// ─── Toast Store ──────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (msg: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
