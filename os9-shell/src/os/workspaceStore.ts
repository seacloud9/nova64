// Zustand store for Compiz-style workspace management
import { create } from 'zustand';

const WORKSPACE_COUNT = 4;

interface WorkspaceStore {
  activeWorkspace: number;
  isTransitioning: boolean;
  isExpoMode: boolean;

  switchWorkspace: (n: number) => void;
  nextWorkspace: () => void;
  prevWorkspace: () => void;
  toggleExpo: () => void;
  setTransitioning: (v: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeWorkspace: 0,
  isTransitioning: false,
  isExpoMode: false,

  switchWorkspace: (n: number) => {
    const target = ((n % WORKSPACE_COUNT) + WORKSPACE_COUNT) % WORKSPACE_COUNT;
    if (target === get().activeWorkspace && !get().isExpoMode) return;
    set({ activeWorkspace: target, isTransitioning: true, isExpoMode: false });
    setTimeout(() => set({ isTransitioning: false }), 650);
  },

  nextWorkspace: () => {
    const next = (get().activeWorkspace + 1) % WORKSPACE_COUNT;
    get().switchWorkspace(next);
  },

  prevWorkspace: () => {
    const prev = (get().activeWorkspace - 1 + WORKSPACE_COUNT) % WORKSPACE_COUNT;
    get().switchWorkspace(prev);
  },

  toggleExpo: () => {
    set((s) => ({ isExpoMode: !s.isExpoMode }));
  },

  setTransitioning: (v: boolean) => {
    set({ isTransitioning: v });
  },
}));

export { WORKSPACE_COUNT };
