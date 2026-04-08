import type { TVApp, TVContext } from '../types';
import { useAppStore, useWindowStore, useToastStore } from './stores';

export const tvContext: TVContext = {
  version: '1.0.0',

  registerApp(app: TVApp): void {
    useAppStore.getState().registerApp(app);
  },

  launchApp(appId: string, args?: Record<string, unknown>): void {
    useWindowStore.getState().openWindow(appId, args);
  },

  quitApp(): void {
    useWindowStore.getState().closeWindow();
  },

  toast(msg: string): void {
    useToastStore.getState().addToast(msg);
  },
};

// Expose for debugging / cart interop
(window as unknown as Record<string, unknown>).tvContext = tvContext;
