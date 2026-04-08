import { useEffect, useRef } from 'react';
import { useWindowStore, useAppStore } from '../os/stores';
import { tvContext } from '../os/context';

function getCartBaseUrl(): string {
  if (import.meta.env.DEV) return 'http://localhost:5173';
  return window.location.origin;
}

export function TVWindow() {
  const win = useWindowStore((s) => s.window);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const apps = useAppStore((s) => s.apps);
  const mountRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Escape key closes the window
  useEffect(() => {
    if (!win) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWindow();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [win, closeWindow]);

  // Mount / unmount app
  useEffect(() => {
    if (!win || !mountRef.current) return;
    const el = mountRef.current;

    // Special case: 'cart' virtual app — renders an iframe
    if (win.appId === 'cart') {
      const path = typeof win.args.path === 'string' ? win.args.path : '';
      const src = `${getCartBaseUrl()}/cart-runner.html?path=${encodeURIComponent(path)}`;
      el.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;background:#000;';
      iframe.allow = 'fullscreen';
      iframe.title = typeof win.args.title === 'string' ? win.args.title : 'Nova64 Game';
      el.appendChild(iframe);
      return () => { el.innerHTML = ''; };
    }

    // Regular registered app
    const app = apps.get(win.appId);
    if (!app) return;
    el.innerHTML = '';
    app.mount(el, tvContext, win.args);
    cleanupRef.current = () => app.unmount();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      el.innerHTML = '';
    };
  }, [win, apps]);

  if (!win) return null;

  const app = win.appId === 'cart' ? null : apps.get(win.appId);
  const appName = win.appId === 'cart'
    ? (typeof win.args.title === 'string' ? win.args.title : 'Game')
    : (app?.name ?? win.appId);
  const appIcon = win.appId === 'cart'
    ? '🎮'
    : (app?.icon ?? '📦');

  return (
    <div
      className="fixed inset-0 flex flex-col animate-slide-up"
      style={{ zIndex: 200 }}
    >
      {/* Glass top bar */}
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
          <span className="font-semibold text-base"
            style={{ color: 'var(--glass-text)' }}>
            {appName}
          </span>
        </div>

        <button
          onClick={closeWindow}
          className="rounded-full flex items-center justify-center w-9 h-9 transition-all duration-150 active:scale-90"
          style={{
            background: 'rgba(255,60,60,0.15)',
            border: '1px solid rgba(255,60,60,0.30)',
            color: 'rgba(255,100,100,0.90)',
            cursor: 'pointer',
            fontSize: 16,
          }}
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>

      {/* App mount area */}
      <div
        ref={mountRef}
        className="flex-1 overflow-hidden"
        style={{ background: '#000' }}
      />
    </div>
  );
}
