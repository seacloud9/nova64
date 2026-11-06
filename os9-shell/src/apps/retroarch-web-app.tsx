// RetroArch Web — runs Nova64 carts on the native libretro core compiled to
// WebAssembly, inside RetroArch's web player (served from /retroarch-web/).
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { normalizeCartPath } from '../utils/cartCode';
import { GAMES } from './gameCatalog';

export { getRetroArchWebUrl, getRetroArchWebMessageUrl } from '../utils/retroarchWeb';
import { getRetroArchWebUrl } from '../utils/retroarchWeb';

function RetroArchWeb({ initialPath }: { initialPath: string }) {
  const [path, setPath] = useState(initialPath);
  const options = GAMES.some((g) => g.path === path)
    ? GAMES
    : [{ id: 'custom', name: path, path } as (typeof GAMES)[number], ...GAMES];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', background: '#ddd' }}>
        <label htmlFor="ra-cart" style={{ fontSize: 12 }}>
          Cart:
        </label>
        <select
          id="ra-cart"
          aria-label="Cart"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          style={{ fontSize: 12, flex: 1, minWidth: 0 }}
        >
          {options.map((g) => (
            <option key={g.id} value={g.path}>
              {g.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: '#444' }}>libretro core · WASM</span>
      </div>
      <iframe
        key={path}
        src={getRetroArchWebUrl(path)}
        style={{ flex: 1, width: '100%', border: 'none', display: 'block', background: '#000' }}
        allow="fullscreen; gamepad; autoplay"
        title="Nova64 RetroArch Web"
      />
    </div>
  );
}

const retroArchWebApp: Nova64App = {
  id: 'retroarch-web',
  name: 'RetroArch Web',
  icon: '👾',

  mount(container, _ctx, args) {
    const a = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    const path = normalizeCartPath(typeof a.path === 'string' ? a.path : undefined);
    const root = createRoot(container);
    root.render(<RetroArchWeb initialPath={path} />);
    (container as HTMLElement & { _novaRoot?: ReturnType<typeof createRoot> })._novaRoot = root;
  },

  unmount() {
    // unmount is handled by window close / root lifecycle
  },

  getInfo() {
    return {
      name: 'RetroArch Web',
      version: '1.0',
      description: 'Run Nova64 carts on the libretro core (WebAssembly) in RetroArch web',
      author: 'Nova64 OS',
      icon: '👾',
    };
  },
};

novaContext.registerApp(retroArchWebApp);
