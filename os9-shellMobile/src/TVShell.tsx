import { useCallback, useEffect } from 'react';
import { useThemeStore, useWindowStore } from './os/stores';
import { tvContext } from './os/context';
import { StatusBar } from './components/StatusBar';
import { AppGrid } from './components/AppGrid';
import { TVWindow } from './components/TVWindow';
import { Toasts } from './components/Toasts';

export function TVShell() {
  const { theme } = useThemeStore();
  const openWindow = useWindowStore((s) => s.openWindow);

  // Sync initial theme to html attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLaunch = useCallback((appId: string) => {
    tvContext.launchApp(appId);
  }, [openWindow]);

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden relative"
      style={{
        background: 'var(--shell-bg)',
        color: 'var(--glass-text)',
      }}
    >
      {/* Layered background overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--shell-bg-layer)' }}
      />

      {/* Shell chrome */}
      <div className="relative flex flex-col h-full">
        <StatusBar />

        {/* Section label */}
        <div className="px-8 pt-6 pb-2 shrink-0">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--glass-muted)' }}
          >
            All Applications
          </h2>
        </div>

        <AppGrid onLaunch={handleLaunch} />
      </div>

      {/* Full-screen app overlay */}
      <TVWindow />

      {/* Toast notifications */}
      <Toasts />
    </div>
  );
}
