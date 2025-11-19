import { Nova64App } from '../types';
import { DemoScene } from './DemoScene';
import { novaContext } from '../os/context';

// Register the DemoScene app
const demosceneApp: Nova64App = {
  id: 'demoscene',
  name: '✨ DemoScene - Tron Odyssey',
  icon: '💿',
  mount(el: HTMLElement) {
    // Create a React root and render the DemoScene component
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(el);
      root.render(<DemoScene />);
      // Store root for cleanup
      (el as any).__reactRoot = root;
    });
  },
  unmount() {
    // Cleanup handled by React useEffect
  },
  getInfo() {
    return {
      name: 'DemoScene - Tron Odyssey',
      version: '1.0.0',
      description: 'An epic visual journey through a neon digital realm with bloom, post-processing, particles, and dynamic effects',
      author: 'Nova64 Team',
      icon: '💿'
    };
  }
};

// Auto-register when module is imported
if (typeof window !== 'undefined') {
  novaContext.registerApp(demosceneApp);
}

export default demosceneApp;
