import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { GameStudio } from './GameStudio';
import { createRoot } from 'react-dom/client';

const gameStudioApp: Nova64App = {
  id: 'studio',
  name: 'Game Studio',
  icon: '💻',
  
  mount(container, _ctx) {
    const root = createRoot(container);
    root.render(<GameStudio />);
    
    return () => {
      root.unmount();
    };
  },

  unmount() {
    // Cleanup handled by return function
  },

  getInfo() {
    return {
      name: 'Game Studio',
      version: '1.0',
      description: 'Create nova64 games with live code editing',
      author: 'nova64 OS',
      icon: '💻',
    };
  },
};

// Register the app
novaContext.registerApp(gameStudioApp);
