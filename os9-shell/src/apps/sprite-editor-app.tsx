import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { SpriteEditor } from './SpriteEditor';
import { createRoot } from 'react-dom/client';

const spriteEditorApp: Nova64App = {
  id: 'sprite-editor',
  name: 'Sprite Editor',
  icon: '🎨',
  
  mount(container) {
    const root = createRoot(container);
    root.render(<SpriteEditor />);
    
    return () => {
      root.unmount();
    };
  },

  unmount() {
    // Cleanup handled by return function
  },

  getInfo() {
    return {
      name: 'Sprite Editor',
      version: '1.0',
      description: 'Create pixel art sprites with drawing tools and color palette',
      author: 'nova64 OS',
      icon: '🎨',
    };
  },
};

// Register the app
novaContext.registerApp(spriteEditorApp);
