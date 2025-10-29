import { useState } from 'react';
import { useWindowStore, useUIStore } from '../os/stores';
import { MenuBar } from './MenuBar';
import { Desktop } from './Desktop';
import { Window } from './Window';
import { ControlStrip } from './ControlStrip';
import { AlertModal } from './AlertModal';
import { BootScreen } from './BootScreen';
import { FPSCounter } from './FPSCounter';
import '../theme/platinum.css';

export function App() {
  const [booted, setBooted] = useState(false);
  const { windows, activeWindowId, focusWindow, closeWindow } = useWindowStore();
  const { showFPS, scanlines } = useUIStore();

  const handleBootComplete = () => {
    setBooted(true);
    // Play startup chime (optional)
    console.log('🔊 Startup chime!');
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
