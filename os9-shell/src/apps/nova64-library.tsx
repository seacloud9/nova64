// Nova64 games for the eMU apps (desktop eMU and mobile eMUI): the WASM
// libretro player, the QWEN Arcade shelf and the Nova64 game library.
import { useEffect, useRef, useState } from 'react';
import { GAMES, type Game } from './gameCatalog';
import { getNovaBaseUrl } from '../utils/cartCode';
import { getRetroArchWebUrl, getRetroArchWebMessageUrl } from '../utils/retroarchWeb';

/** What the Nova64 player is running: a cart path/URL, or a dropped file. */
export type NovaCart = { kind: 'path'; path: string; title: string } | { kind: 'file'; file: File; title: string };

/**
 * Nova64 carts run on the libretro core compiled to WebAssembly, inside
 * RetroArch's web player. Paths load by URL; dropped files are sent to the
 * player over postMessage, because a cross-origin iframe can't fetch the
 * shell's blob: URLs.
 */
export function NovaPlayer({ cart }: { cart: NovaCart }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const src = cart.kind === 'path' ? getRetroArchWebUrl(cart.path) : getRetroArchWebMessageUrl(cart.file.name);

  useEffect(() => {
    if (cart.kind !== 'file') return;
    const onMessage = async (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || e.data?.type !== 'nova64:ready') return;
      const bytes = await cart.file.arrayBuffer();
      frameRef.current?.contentWindow?.postMessage({ type: 'nova64:cart', name: cart.file.name, bytes }, '*', [bytes]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [cart]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={`Nova64 — ${cart.title}`}
      allow="fullscreen; gamepad; autoplay"
      style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#000' }}
      onLoad={() => frameRef.current?.focus()}
    />
  );
}

interface QwenGame {
  id: string;
  title: string;
  blurb: string;
  description: string;
  path: string;
  cover: string | null;
}

/** QWEN Arcade: games written by a local Qwen model (examples/QWEN/arcade.json). */
function useQwenArcade(): { games: QwenGame[]; article: string | null } {
  const [state, setState] = useState<{ games: QwenGame[]; article: string | null }>({ games: [], article: null });
  useEffect(() => {
    let alive = true;
    fetch(new URL('/examples/QWEN/arcade.json', getNovaBaseUrl()).toString())
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (alive && m && Array.isArray(m.games)) setState({ games: m.games, article: m.article || null });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function QwenShelf({ onPlay }: { onPlay: (path: string, title: string) => void }) {
  const { games, article } = useQwenArcade();
  if (!games.length) return null;
  const base = getNovaBaseUrl();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 2, color: '#c4b5fd' }}>✦ QWEN ARCADE</span>
        <span style={{ fontSize: 11, color: '#888' }}>made by a local Qwen model</span>
        {article && (
          <a href={new URL(article, base).toString()} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 11, color: '#38bdf8' }}>
            How it was made →
          </a>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        {games.map((g) => (
          <button
            key={g.id}
            onClick={() => onPlay(g.path, g.title)}
            title={g.description}
            style={{
              padding: 0,
              background: '#151826',
              border: '2px solid rgba(167,139,250,0.35)',
              borderRadius: 10,
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                aspectRatio: '16 / 9',
                background: g.cover ? `#0b0d14 center / cover url("${new URL(g.cover, base).toString()}")` : '#0b0d14',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 3, background: 'rgba(124,58,237,0.9)' }}>AI</span>
            </div>
            <div style={{ padding: '8px 10px 10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: 12 }}>{g.title}</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 2 }}>{g.blurb}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NovaLibrary({ onPlay }: { onPlay: (game: Game) => void }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 'bold', color: '#aaa', marginBottom: 8, display: 'block' }}>
        NOVA64 LIBRARY · click a game to play it on the WASM libretro core
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => onPlay(g)}
            title={g.description}
            style={{
              padding: '14px 12px',
              background: `linear-gradient(135deg, ${g.color1}, ${g.color2})`,
              border: '2px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: 26 }}>{g.emoji}</div>
            <div style={{ fontWeight: 'bold', fontSize: 13, marginTop: 6, letterSpacing: 1 }}>{g.name}</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{g.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Display title for a cart path: the catalog name, else its folder name ("neon-orbit-dodger" -> "Neon Orbit Dodger"). */
export function titleForPath(path: string): string {
  const known = GAMES.find((g) => g.path === path);
  if (known) return known.name;
  const folder = path.split('?')[0].split('/').filter(Boolean).slice(-2, -1)[0];
  if (!folder) return path;
  return folder
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
