import { createRoot } from 'react-dom/client';
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';

function getBaseUrl(): string {
  const { hostname, port } = window.location;
  if (hostname === 'localhost' && (port === '3000' || port === '3001')) {
    return 'http://localhost:5173';
  }
  return window.location.origin;
}

interface CartFrameProps {
  path: string;
}

function CartFrame({ path }: CartFrameProps) {
  const src = `${getBaseUrl()}/console.html?path=${encodeURIComponent(path)}`;
  return (
    <iframe
      src={src}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#000' }}
      allow="fullscreen"
      title="Nova64 Cart"
    />
  );
}

const cartRunnerApp: Nova64App = {
  id: 'cart-runner',
  name: 'Cart Runner',
  icon: '🕹️',

  mount(container, _ctx, args) {
    const a = (args && typeof args === 'object') ? args as Record<string, unknown> : {};
    const path = typeof a.path === 'string' ? a.path : '/examples/hello-3d/code.js';
    const root = createRoot(container);
    root.render(<CartFrame path={path} />);
    // Store root for cleanup
    (container as HTMLElement & { _novaRoot?: ReturnType<typeof createRoot> })._novaRoot = root;
  },

  unmount() {
    // unmount is handled by window close / root lifecycle
  },

  getInfo() {
    return {
      name: 'Cart Runner',
      version: '1.0',
      description: 'Run Nova64 game carts in an OS window',
      author: 'Nova64 OS',
      icon: '🕹️',
    };
  },
};

novaContext.registerApp(cartRunnerApp);
