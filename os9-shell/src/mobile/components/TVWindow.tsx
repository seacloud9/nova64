import { useEffect, useRef } from 'react';
import { useWindowStore, useAppStore } from '../os/stores';
import { tvContext } from '../os/context';

export function TVWindow() {
  const win = useWindowStore((s) => s.window);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const apps = useAppStore((s) => s.apps);
  // mountRef is ALWAYS in the DOM — never removed during reconciliation.
  // This prevents the React "removeChild" conflict that occurs when returning
  // null (unmounting the tree) while an inner React root is also being cleaned up.
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!win) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWindow();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [win, closeWindow]);

  useEffect(() => {
    const el = mountRef.current;
    if (!win || !el) return;

    // ── KEY FIX ──────────────────────────────────────────────────────────────
    // Each app render gets its OWN child container.  When this effect re-runs
    // (win changes), the OLD container and its React root are torn down on a
    // dedicated node while the NEW container mounts on a completely separate
    // node.  This eliminates the "removeChild" conflict that occurs when React's
    // async fiber teardown and a new mount share the same parent element.
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;height:100%;position:relative;';
    el.appendChild(container);

    console.groupCollapsed(`[TVWindow] mount  → ${win.appId}`);
    console.log('container:', container);
    console.groupEnd();

    // 'cart' — iframe only, no inner React root
    if (win.appId === 'cart') {
      const path = typeof win.args.path === 'string' ? win.args.path : '';
      const src = `${window.location.origin}/cart-runner.html?path=${encodeURIComponent(path)}`;
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:#000;';
      iframe.allow = 'fullscreen';
      iframe.title = typeof win.args.title === 'string' ? win.args.title : 'Nova64 Game';
      container.appendChild(iframe);
      return () => {
        console.log(`[TVWindow] unmount → ${win.appId} (iframe)`);
        container.remove();
      };
    }

    const app = apps.get(win.appId);
    if (!app) {
      console.warn(`[TVWindow] no app registered for id: ${win.appId}`);
      container.remove();
      return;
    }

    app.mount(container, tvContext, win.args);

    return () => {
      console.log(`[TVWindow] unmount → ${win.appId} (React root)`);
      // Call unmount first — React schedules async fiber teardown.
      app.unmount();
      // Defer DOM removal past React's cleanup microtasks so the fiber tree
      // finishes tearing down before the container node disappears.
      setTimeout(() => container.remove(), 0);
    };
  }, [win, apps]);

  const app = win && win.appId !== 'cart' ? apps.get(win.appId) : null;
  const appName = win
    ? win.appId === 'cart'
      ? (typeof win.args.title === 'string' ? win.args.title : 'Game')
      : (app?.name ?? win.appId)
    : '';
  const appIcon = win ? (win.appId === 'cart' ? '🎮' : (app?.icon ?? '📦')) : '';

  // Always render — stable mountRef. The animate-slide-up replays on each
  // display:none → display:flex transition because browsers restart animations
  // when an element re-enters the rendering context.
  return (
    <div
      className="fixed inset-0 animate-slide-up"
      style={{
        zIndex: 200,
        display: win ? 'flex' : 'none',
        flexDirection: 'column',
      }}
    >
      {/* Top bar — only rendered when a window is active */}
      {win && (
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{
            background: 'var(--statusbar-bg)',
            borderBottom: '1px solid var(--statusbar-border)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            color: 'var(--glass-text)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{appIcon}</span>
            <span className="font-semibold text-base" style={{ color: 'var(--glass-text)' }}>
              {appName}
            </span>
          </div>

          <button
            onClick={closeWindow}
            className="rounded-full flex items-center justify-center w-9 h-9 transition-all duration-150 active:scale-90"
            style={{
              background: 'rgba(255,60,60,0.15)',
              border: '1px solid rgba(255,80,80,0.30)',
              color: 'rgba(255,120,120,0.9)',
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stable mount target — always in the DOM */}
      <div
        ref={mountRef}
        className="flex-1 overflow-hidden"
        style={{ background: '#000' }}
      />
    </div>
  );
}
