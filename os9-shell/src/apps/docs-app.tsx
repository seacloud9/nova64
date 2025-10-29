import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { DocsViewer } from './DocsViewer';
import { createRoot } from 'react-dom/client';

const docsApp: Nova64App = {
  id: 'docs',
  name: 'Documentation',
  icon: '📚',
  
  mount(container, _ctx) {
    const root = createRoot(container);
    root.render(<DocsViewer />);
    
    return () => {
      root.unmount();
    };
  },

  unmount() {
    // Cleanup handled by return function
  },

  getInfo() {
    return {
      name: 'Documentation',
      version: '1.0',
      description: 'nova64 API documentation and tutorials',
      author: 'nova64 OS',
      icon: '📚',
    };
  },
};

// Register the app
novaContext.registerApp(docsApp);
