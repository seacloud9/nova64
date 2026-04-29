import { createRoot } from 'react-dom/client';
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { getCartRunnerUrl, normalizeCartPath } from '../utils/cartCode';

interface CartFrameProps {
  path: string;
}

function CartFrame({ path }: CartFrameProps) {
  const src = getCartRunnerUrl(path);
  return (
    <iframe
      src={src}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: '#000',
      }}
      allow="fullscreen"
      title="Nova64 Cart"
    />
  );
}

const cartRunnerApp: Nova64App = {
  id: 'cart-runner',
  name: 'Nova64 Console',
  icon: '🎮',

  mount(container, _ctx, args) {
    const a = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    const path = normalizeCartPath(typeof a.path === 'string' ? a.path : undefined);
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
      name: 'Nova64 Console',
      version: '1.0',
      description: 'Run Nova64 game carts in an OS window',
      author: 'Nova64 OS',
      icon: '🎮',
    };
  },
};

novaContext.registerApp(cartRunnerApp);
