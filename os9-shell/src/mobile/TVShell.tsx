import { useState, useCallback, useEffect } from 'react';
import { useThemeStore, useWindowStore } from './os/stores';
import { tvContext } from './os/context';
import { StatusBar } from './components/StatusBar';
import { AppGrid } from './components/AppGrid';
import { TVWindow } from './components/TVWindow';
import { Toasts } from './components/Toasts';
import { GamesDrawer } from './components/GamesDrawer';
import { LandscapePrompt } from './components/LandscapePrompt';

export function TVShell() {
  const { theme } = useThemeStore();
  const openWindow = useWindowStore((s) => s.openWindow);
  const [gamesOpen, setGamesOpen] = useState(false);

  // Sync theme to html attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLaunch = useCallback(
    (appId: string) => {
      tvContext.launchApp(appId);
    },
    [openWindow]
  );

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden relative"
      style={{ background: 'var(--shell-bg)', color: 'var(--glass-text)' }}
    >
      {/* Background overlay layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--shell-bg-layer)' }}
      />

      {/* Shell chrome */}
      <div className="relative flex flex-col h-full">
        <StatusBar
          onToggleGames={() => setGamesOpen((v) => !v)}
          isGamesOpen={gamesOpen}
        />

        {/* Section label */}
        <div className="px-6 pt-5 pb-2 shrink-0">
          <h2
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--glass-muted)' }}
          >
            Applications
          </h2>
        </div>

        <AppGrid onLaunch={handleLaunch} />
      </div>

      {/* Full-screen app overlay */}
      <TVWindow />

      {/* Games drawer */}
      <GamesDrawer open={gamesOpen} onClose={() => setGamesOpen(false)} />

      {/* Toast notifications */}
      <Toasts />

      {/* Landscape orientation prompt */}
      <LandscapePrompt />
    </div>
  );
}
