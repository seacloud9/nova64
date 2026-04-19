// Zustand store for screensaver state
import { create } from 'zustand';

interface ScreensaverStore {
  isActive: boolean;
  selectedHackId: string;  // 'random' or specific hack id
  idleTimeoutMs: number;   // default 5 minutes

  activate: () => void;
  deactivate: () => void;
  setHack: (id: string) => void;
  setTimeout: (ms: number) => void;
}

export const useScreensaverStore = create<ScreensaverStore>((set) => ({
  isActive: false,
  selectedHackId: 'random',
  idleTimeoutMs: 5 * 60 * 1000,

  activate: () => set({ isActive: true }),
  deactivate: () => set({ isActive: false }),
  setHack: (id: string) => set({ selectedHackId: id }),
  setTimeout: (ms: number) => set({ idleTimeoutMs: ms }),
}));
