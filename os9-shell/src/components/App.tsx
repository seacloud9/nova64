import { useState } from 'react';
import { useWindowStore, useUIStore } from '../os/stores';
import { MenuBar } from './MenuBar';
import { Desktop } from './Desktop';
import { Window } from './Window';
import { ControlStrip } from './ControlStrip';
import { AlertModal } from './AlertModal';
import { BootScreen } from './BootScreen';
import { FPSCounter } from './FPSCounter';
import { novaContext } from '../os/context';
import '../theme/platinum.css';

export function App() {
  const [booted, setBooted] = useState(false);
  const { windows, activeWindowId, focusWindow, closeWindow } = useWindowStore();
  const { showFPS, scanlines } = useUIStore();

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

  return (
    <div className={scanlines ? 'scanlines' : ''}>
      {!booted && <BootScreen onComplete={handleBootComplete} />}
      
      {booted && (
        <>
          <MenuBar onCommand={handleMenuCommand} />
          <Desktop />
          
          {windows.map((window) => (
            <Window
              key={window.id}
              {...window}
              isActive={window.id === activeWindowId}
              onFocus={() => focusWindow(window.id)}
              onClose={() => closeWindow(window.id)}
            />
          ))}

          <ControlStrip />
          <AlertModal />
          
          {showFPS && <FPSCounter />}
        </>
      )}
    </div>
  );
}
