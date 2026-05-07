import { useState, useEffect, useCallback } from 'react';
import { useWindowStore, useUIStore, useDesktopThemeStore } from '../os/stores';
import { useWorkspaceStore } from '../os/workspaceStore';
import { MenuBar } from './MenuBar';
import { Desktop } from './Desktop';
import { Window } from './Window';
import { WorkspaceCube } from './WorkspaceCube';
import { ControlStrip } from './ControlStrip';
import { AlertModal } from './AlertModal';
import { BootScreen } from './BootScreen';
import { FPSCounter } from './FPSCounter';
import { ContextMenuOverlay } from './ContextMenu';
import { AppSwitcher } from './AppSwitcher';
import { ScreensaverOverlay } from './ScreensaverOverlay';
import { useScreensaverStore } from '../os/screensaverStore';
import { novaContext } from '../os/context';
import '../theme/platinum.css';

export function App() {
  const [booted, setBooted] = useState(false);
  const { windows, activeWindowId, focusWindow, closeWindow, restoreWindow } = useWindowStore();
  const { showFPS, scanlines } = useUIStore();
  const { theme: desktopTheme } = useDesktopThemeStore();
  const { activeWorkspace, nextWorkspace, prevWorkspace, switchWorkspace, toggleExpo } =
    useWorkspaceStore();
  const { isActive: screensaverActive, deactivate: deactivateScreensaver } = useScreensaverStore();

  // Sync data-theme attribute whenever the theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', desktopTheme);
  }, [desktopTheme]);

  // ── Keyboard shortcuts for workspace switching ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Screensaver: any key dismisses
      if (screensaverActive) {
        deactivateScreensaver();
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          nextWorkspace();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          prevWorkspace();
        } else if (e.code === 'KeyE') {
          e.preventDefault();
          toggleExpo();
        } else if (e.code >= 'Digit1' && e.code <= 'Digit4') {
          e.preventDefault();
          switchWorkspace(parseInt(e.code.charAt(5)) - 1);
        }
      }
    },
    [screensaverActive, deactivateScreensaver, nextWorkspace, prevWorkspace, switchWorkspace, toggleExpo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Idle detection for screensaver ──
  const { activate: activateScreensaver, idleTimeoutMs } = useScreensaverStore();

  useEffect(() => {
    if (!booted) return;
    let timer: ReturnType<typeof setTimeout>;

    const resetIdle = () => {
      clearTimeout(timer);
      timer = setTimeout(activateScreensaver, idleTimeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((ev) => window.addEventListener(ev, resetIdle));
    resetIdle();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdle));
    };
  }, [booted, activateScreensaver, idleTimeoutMs]);

  const handleBootComplete = () => {
    setBooted(true);
    console.log('🔊 Startup chime!');
    
    const params = new URLSearchParams(window.location.search);
    const appParam = params.get('app');
    
    if (appParam) {
      console.log('🎯 URL parameter detected:', appParam);
      console.log('🚀 Auto-launching app:', appParam);
      
      setTimeout(() => {
        try {
          novaContext.launchApp(appParam);
          console.log('✅ App launched successfully');
        } catch (error) {
          console.error('❌ Failed to launch app:', error);
        }
      }, 500);
    }
  };

  const handleMenuCommand = (commandId: string) => {
    console.log('Menu command:', commandId);
  };

  const minimizedWindows = windows.filter((w) => w.isMinimized);

  // Render the windows for a specific workspace
  const renderWorkspace = (workspaceId: number) => {
    const wsWindows = windows.filter(
      (w) => w.workspaceId === workspaceId
    );
    return (
      <>
        <Desktop />
        {wsWindows.map((win) => (
          <Window
            key={win.id}
            {...win}
            isActive={win.id === activeWindowId}
            onFocus={() => focusWindow(win.id)}
            onClose={() => closeWindow(win.id)}
          />
        ))}
      </>
    );
  };

  return (
    <div className={scanlines ? 'scanlines' : ''}>
      {!booted && <BootScreen onComplete={handleBootComplete} />}
      
      {booted && (
        <>
          <MenuBar onCommand={handleMenuCommand} />

          <WorkspaceCube renderWorkspace={renderWorkspace} />

          {minimizedWindows.length > 0 && (
            <div className="minimized-dock">
              {minimizedWindows.map((win) => (
                <button
                  key={win.id}
                  className="minimized-dock-item"
                  onClick={() => {
                    // Switch to the window's workspace first, then restore
                    if (win.workspaceId !== activeWorkspace) {
                      switchWorkspace(win.workspaceId);
                    }
                    restoreWindow(win.id);
                  }}
                  title={`${win.title} (Desktop ${win.workspaceId + 1})`}
                >
                  {win.title}
                </button>
              ))}
            </div>
          )}

          <ControlStrip />
          <AlertModal />
          <ContextMenuOverlay />
          <AppSwitcher />
          <ScreensaverOverlay />
          
          {showFPS && <FPSCounter />}
        </>
      )}
    </div>
  );
}
