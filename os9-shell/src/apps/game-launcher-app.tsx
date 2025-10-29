import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { GameLauncher } from './GameLauncher';
import { createRoot } from 'react-dom/client';

const gameLauncherApp: Nova64App = {
  id: 'game-launcher',
  name: 'Game Launcher',
  icon: '🎮',
  
  mount(container, _ctx) {
    const root = createRoot(container);
    root.render(<GameLauncher />);
    
    return () => {
      root.unmount();
    };
  },

  unmount() {
    // Cleanup handled by return function
  },

  getInfo() {
    return {
      name: 'Game Launcher',
      version: '1.0',
      description: 'Browse and launch nova64 games',
      author: 'nova64 OS',
      icon: '🎮',
    };
  },
};

// Register the app
novaContext.registerApp(gameLauncherApp);
