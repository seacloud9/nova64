import { createRoot } from 'react-dom/client';
import { useRef, useCallback } from 'react';
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { getNovaBaseUrl } from '../utils/cartCode';

function ConsoleFrame() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFullscreen = useCallback(() => {
    const el = iframeRef.current;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  }, []);

  const src = `${getNovaBaseUrl()}/console.html`;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#000' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 10px',
        background: '#0a0a0a',
        borderBottom: '1px solid #222',
        flexShrink: 0,
      }}>
        <span style={{ color: '#888', fontSize: 11, fontFamily: 'monospace' }}>
          🎮 Nova64 Console
        </span>
        <button
          onClick={handleFullscreen}
          title="Fullscreen"
          style={{
            background: 'none',
            border: '1px solid #333',
            borderRadius: 4,
            color: '#aaa',
            fontSize: 12,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          ⛶ Fullscreen
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        style={{ flex: 1, border: 'none', display: 'block', background: '#000' }}
        allow="fullscreen"
        title="Nova64 Console"
      />
    </div>
  );
}

const nova64ConsoleApp: Nova64App = {
  id: 'nova64-console',
  name: 'Nova64 Console',
  icon: '🎮',

  mount(container, _ctx) {
    const root = createRoot(container);
    root.render(<ConsoleFrame />);
    (container as HTMLElement & { _novaRoot?: ReturnType<typeof createRoot> })._novaRoot = root;
  },

  unmount() {
    // cleanup handled by window lifecycle
  },

  getInfo() {
    return {
      name: 'Nova64 Console',
      version: '1.0',
      description: 'Full-screen Nova64 game console',
      author: 'Nova64 OS',
      icon: '🎮',
    };
  },
};

novaContext.registerApp(nova64ConsoleApp);
