// Tests for window store: close, minimize, restore
import { describe, it, expect, beforeEach } from 'vitest';
import { useWindowStore } from '../os/stores';

function resetStore() {
  useWindowStore.setState({
    windows: [],
    activeWindowId: null,
    nextZIndex: 100,
  });
}

describe('WindowStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ---------------------------------------------------------------------------
  // createWindow
  // ---------------------------------------------------------------------------
  describe('createWindow', () => {
    it('creates a window with default values', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Test' });
      const win = useWindowStore.getState().windows.find((w) => w.id === id);
      expect(win).toBeDefined();
      expect(win!.title).toBe('Test');
      expect(win!.isMinimized).toBe(false);
      expect(win!.isShaded).toBe(false);
      expect(win!.isMaximized).toBe(false);
    });

    it('sets the new window as active', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Active' });
      expect(useWindowStore.getState().activeWindowId).toBe(id);
    });

    it('increments zIndex for each new window', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      const id2 = useWindowStore.getState().createWindow({ title: 'W2' });
      const w1 = useWindowStore.getState().windows.find((w) => w.id === id1)!;
      const w2 = useWindowStore.getState().windows.find((w) => w.id === id2)!;
      expect(w2.zIndex).toBeGreaterThan(w1.zIndex);
    });
  });

  // ---------------------------------------------------------------------------
  // closeWindow
  // ---------------------------------------------------------------------------
  describe('closeWindow', () => {
    it('removes the window from the list', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Close me' });
      expect(useWindowStore.getState().windows).toHaveLength(1);

      useWindowStore.getState().closeWindow(id);
      expect(useWindowStore.getState().windows).toHaveLength(0);
    });

    it('clears activeWindowId if closing the active window', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Active' });
      expect(useWindowStore.getState().activeWindowId).toBe(id);

      useWindowStore.getState().closeWindow(id);
      expect(useWindowStore.getState().activeWindowId).toBeNull();
    });

    it('does not clear activeWindowId when closing a non-active window', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      const id2 = useWindowStore.getState().createWindow({ title: 'W2' });
      // id2 is now active
      expect(useWindowStore.getState().activeWindowId).toBe(id2);

      useWindowStore.getState().closeWindow(id1);
      expect(useWindowStore.getState().activeWindowId).toBe(id2);
      expect(useWindowStore.getState().windows).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // minimizeWindow
  // ---------------------------------------------------------------------------
  describe('minimizeWindow', () => {
    it('sets isMinimized to true', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Minimize me' });
      useWindowStore.getState().minimizeWindow(id);

      const win = useWindowStore.getState().windows.find((w) => w.id === id)!;
      expect(win.isMinimized).toBe(true);
    });

    it('clears activeWindowId when minimizing the active window', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Active' });
      expect(useWindowStore.getState().activeWindowId).toBe(id);

      useWindowStore.getState().minimizeWindow(id);
      expect(useWindowStore.getState().activeWindowId).toBeNull();
    });

    it('does not clear activeWindowId when minimizing a non-active window', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      const id2 = useWindowStore.getState().createWindow({ title: 'W2' });

      useWindowStore.getState().minimizeWindow(id1);
      expect(useWindowStore.getState().activeWindowId).toBe(id2);
    });

    it('keeps the window in the list (not removed)', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Still here' });
      useWindowStore.getState().minimizeWindow(id);
      expect(useWindowStore.getState().windows).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // restoreWindow
  // ---------------------------------------------------------------------------
  describe('restoreWindow', () => {
    it('sets isMinimized to false', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Restore me' });
      useWindowStore.getState().minimizeWindow(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isMinimized).toBe(true);

      useWindowStore.getState().restoreWindow(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isMinimized).toBe(false);
    });

    it('sets the restored window as active', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      useWindowStore.getState().createWindow({ title: 'W2' });

      useWindowStore.getState().minimizeWindow(id1);
      useWindowStore.getState().restoreWindow(id1);
      expect(useWindowStore.getState().activeWindowId).toBe(id1);
    });

    it('brings the restored window to the front (highest zIndex)', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      const id2 = useWindowStore.getState().createWindow({ title: 'W2' });

      useWindowStore.getState().minimizeWindow(id1);
      useWindowStore.getState().restoreWindow(id1);

      const w1 = useWindowStore.getState().windows.find((w) => w.id === id1)!;
      const w2 = useWindowStore.getState().windows.find((w) => w.id === id2)!;
      expect(w1.zIndex).toBeGreaterThan(w2.zIndex);
    });
  });

  // ---------------------------------------------------------------------------
  // focusWindow
  // ---------------------------------------------------------------------------
  describe('focusWindow', () => {
    it('sets the window as active and brings it to front', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      useWindowStore.getState().createWindow({ title: 'W2' });

      useWindowStore.getState().focusWindow(id1);
      expect(useWindowStore.getState().activeWindowId).toBe(id1);
    });
  });

  // ---------------------------------------------------------------------------
  // toggleShade
  // ---------------------------------------------------------------------------
  describe('toggleShade', () => {
    it('toggles isShaded', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Shade' });
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isShaded).toBe(false);

      useWindowStore.getState().toggleShade(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isShaded).toBe(true);

      useWindowStore.getState().toggleShade(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isShaded).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // toggleMaximize
  // ---------------------------------------------------------------------------
  describe('toggleMaximize', () => {
    it('toggles isMaximized', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Max' });
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isMaximized).toBe(false);

      useWindowStore.getState().toggleMaximize(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isMaximized).toBe(true);

      useWindowStore.getState().toggleMaximize(id);
      expect(useWindowStore.getState().windows.find((w) => w.id === id)!.isMaximized).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: minimize → close, minimize → restore → minimize
  // ---------------------------------------------------------------------------
  describe('integration', () => {
    it('can close a minimized window', () => {
      const id = useWindowStore.getState().createWindow({ title: 'MinClose' });
      useWindowStore.getState().minimizeWindow(id);
      useWindowStore.getState().closeWindow(id);
      expect(useWindowStore.getState().windows).toHaveLength(0);
    });

    it('minimize → restore → minimize cycle works', () => {
      const id = useWindowStore.getState().createWindow({ title: 'Cycle' });
      const get = () => useWindowStore.getState().windows.find((w) => w.id === id)!;

      useWindowStore.getState().minimizeWindow(id);
      expect(get().isMinimized).toBe(true);

      useWindowStore.getState().restoreWindow(id);
      expect(get().isMinimized).toBe(false);

      useWindowStore.getState().minimizeWindow(id);
      expect(get().isMinimized).toBe(true);
    });

    it('multiple windows can be minimized independently', () => {
      const id1 = useWindowStore.getState().createWindow({ title: 'W1' });
      const id2 = useWindowStore.getState().createWindow({ title: 'W2' });
      const id3 = useWindowStore.getState().createWindow({ title: 'W3' });

      useWindowStore.getState().minimizeWindow(id1);
      useWindowStore.getState().minimizeWindow(id3);

      const wins = useWindowStore.getState().windows;
      expect(wins.find((w) => w.id === id1)!.isMinimized).toBe(true);
      expect(wins.find((w) => w.id === id2)!.isMinimized).toBe(false);
      expect(wins.find((w) => w.id === id3)!.isMinimized).toBe(true);
    });
  });
});
