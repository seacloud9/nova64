// hyperNova – app registration for novaOS
import { createRoot } from 'react-dom/client';
import type { Nova64App } from '../../types';
import { novaContext } from '../../os/context';
import { HyperNovaApp } from './HyperNovaApp';

const hyperNovaApp: Nova64App = {
  id: 'hypernova',
  name: 'hyperNova',
  icon: '🃏',

  mount(container) {
    const root = createRoot(container);
    root.render(<HyperNovaApp />);
    return () => {
      root.unmount();
    };
  },

  unmount() {
    // Cleanup handled by mount return function
  },

  getInfo() {
    return {
      name: 'hyperNova',
      version: '0.1.0',
      description: 'HyperCard-like stack editor — build interactive cards, presentations, and mini-apps for novaOS',
      author: 'nova64 OS',
      icon: '🃏',
    };
  },
};

// Self-register with the OS
novaContext.registerApp(hyperNovaApp);
