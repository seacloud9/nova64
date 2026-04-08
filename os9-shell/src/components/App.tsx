import { useState, useEffect } from 'react';
import { useWindowStore, useUIStore, useDesktopThemeStore } from '../os/stores';
import { MenuBar } from './MenuBar';
import { Desktop } from './Desktop';
import { Window } from './Window';
import { ControlStrip } from './ControlStrip';
import { AlertModal } from './AlertModal';
import { BootScreen } from './BootScreen';
import { FPSCounter } from './FPSCounter';
import { ContextMenuOverlay } from './ContextMenu';
import { AppSwitcher } from './AppSwitcher';
import { novaContext } from '../os/context';
import '../theme/platinum.css';

export function App() {
  const [booted, setBooted] = useState(false);
  const { windows, activeWindowId, focusWindow, closeWindow, restoreWindow } = useWindowStore();
  const { showFPS, scanlines } = useUIStore();
  const { theme: desktopTheme } = useDesktopThemeStore();

  // Sync data-theme attribute whenever the theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', desktopTheme);
  }, [desktopTheme]);

  const handleBootComplete = () => {
    setBooted(true);
    console.log('🔊 Startup chime!');
    
    // Check URL immediately after boot and launch app if parameter is present
    const params = new URLSearchParams(window.location.search);
    const appParam = params.get('app');
    
    if (appParam) {
      console.log('� URL parameter detected:', appParam);
      console.log('🚀 Auto-launching app:', appParam);
      
      // Launch app after a brief delay to ensure everything is initialized
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
    // TODO: Handle menu commands
  };

  const minimizedWindows = windows.filter((w) => w.isMinimized);

  return (
    <div className={scanlines ? 'scanlines' : ''}>
      {!booted && <BootScreen onComplete={handleBootComplete} />}
      
      {booted && (
        <>
          <MenuBar onCommand={handleMenuCommand} />
          <Desktop />
          
          {windows.map((win) => (
            <Window
              key={win.id}
              {...win}
              isActive={win.id === activeWindowId}
              onFocus={() => focusWindow(win.id)}
              onClose={() => closeWindow(win.id)}
            />
          ))}

          {minimizedWindows.length > 0 && (
            <div className="minimized-dock">
              {minimizedWindows.map((win) => (
                <button
                  key={win.id}
                  className="minimized-dock-item"
                  onClick={() => restoreWindow(win.id)}
                  title={win.title}
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
          
          {showFPS && <FPSCounter />}
        </>
      )}
    </div>
  );
}
