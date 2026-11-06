// eMUI — Mobile retro emulator powered by EmulatorJS, plus Nova64 carts on our
// WASM libretro core. Glass-themed, touch-optimised TVApp for the mobile shell.
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { useState, useRef, useCallback } from 'react';
import type { TVApp } from '../../types';
import { NovaLibrary, NovaPlayer, QwenShelf, titleForPath, type NovaCart } from '../../../apps/nova64-library';

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

// ─── System catalogue ─────────────────────────────────────────────────────────

interface SystemInfo {
  label: string;
  short: string;
  core: string;
  extensions: string[];
  icon: string;
  color: string;
}

const SYSTEMS: Record<string, SystemInfo> = {
  nova64:      { label: 'Nova64 (WASM core)',    short: 'NOVA64',  core: 'nova64',    extensions: ['.js','.nova'], icon: '🌌', color: '#a78bfa' },
  nes:         { label: 'Nintendo NES',         short: 'NES',     core: 'nes',       extensions: ['.nes','.zip'], icon: '🎮', color: '#E4252C' },
  snes:        { label: 'Super Nintendo',        short: 'SNES',    core: 'snes',      extensions: ['.sfc','.smc','.zip'], icon: '🕹️', color: '#7033A2' },
  gb:          { label: 'Game Boy',              short: 'GB',      core: 'gb',        extensions: ['.gb','.zip'], icon: '🟢', color: '#5B7A35' },
  gbc:         { label: 'Game Boy Color',        short: 'GBC',     core: 'gbc',       extensions: ['.gbc','.zip'], icon: '🌈', color: '#9B4094' },
  gba:         { label: 'Game Boy Advance',      short: 'GBA',     core: 'gba',       extensions: ['.gba','.zip'], icon: '🟣', color: '#5D5D9A' },
  n64:         { label: 'Nintendo 64',           short: 'N64',     core: 'n64',       extensions: ['.n64','.z64','.v64','.zip'], icon: '🔴', color: '#1B3B6F' },
  nds:         { label: 'Nintendo DS',           short: 'NDS',     core: 'nds',       extensions: ['.nds','.zip'], icon: '📱', color: '#C0282E' },
  psx:         { label: 'PlayStation',           short: 'PS1',     core: 'psx',       extensions: ['.bin','.iso','.cue','.zip'], icon: '⚪', color: '#003087' },
  segaMD:      { label: 'Sega Genesis',          short: 'GEN',     core: 'segaMD',    extensions: ['.md','.gen','.bin','.zip'], icon: '🔵', color: '#00AAFF' },
  segaMS:      { label: 'Sega Master System',    short: 'SMS',     core: 'segaMS',    extensions: ['.sms','.zip'], icon: '⬜', color: '#1A1A4E' },
  segaGG:      { label: 'Sega Game Gear',        short: 'GG',      core: 'segaGG',    extensions: ['.gg','.zip'], icon: '🟡', color: '#3D3D3D' },
  segaSaturn:  { label: 'Sega Saturn',           short: 'SAT',     core: 'segaSaturn',extensions: ['.iso','.bin','.zip'], icon: '🪐', color: '#7B5F2E' },
  atari2600:   { label: 'Atari 2600',            short: '2600',    core: 'atari2600', extensions: ['.a26','.bin','.zip'], icon: '🕹️', color: '#FF6B00' },
  pce:         { label: 'TurboGrafx-16',         short: 'PCE',     core: 'pce',       extensions: ['.pce','.zip'], icon: '🎯', color: '#B22222' },
  ngp:         { label: 'Neo Geo Pocket',        short: 'NGP',     core: 'ngp',       extensions: ['.ngp','.ngc','.zip'], icon: '🏮', color: '#C0392B' },
  ws:          { label: 'WonderSwan',            short: 'WSC',     core: 'ws',        extensions: ['.ws','.wsc','.zip'], icon: '🌸', color: '#2980B9' },
  arcade:      { label: 'Arcade (MAME)',         short: 'MAME',    core: 'mame2003',  extensions: ['.zip'], icon: '🕹️', color: '#F39C12' },
};

// ─── Component ────────────────────────────────────────────────────────────────

function EMUIApp({ initialCart }: { initialCart?: NovaCart }) {
  const [selectedSystem, setSelectedSystem] = useState<string>('nova64');
  const [romUrl, setRomUrl]   = useState('');
  const [isPlaying, setIsPlaying] = useState(!!initialCart);
  const [novaCart, setNovaCart] = useState<NovaCart | null>(initialCart ?? null);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<'file' | 'url'>('file');
  const playerRef             = useRef<HTMLDivElement>(null);
  const fileInputRef          = useRef<HTMLInputElement>(null);

  // ── Launch ──────────────────────────────────────────────────────────────────

  const playNova = useCallback((cart: NovaCart) => {
    setError('');
    setNovaCart(cart);
    setIsPlaying(true);
  }, []);

  const launchGame = useCallback((gameUrl: string, core: string) => {
    if (!playerRef.current) return;
    setError('');
    setIsPlaying(true);

    const container = playerRef.current;
    container.innerHTML = '';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'emui-player';
    playerDiv.style.cssText = 'width:100%;height:100%;';
    container.appendChild(playerDiv);

    const w = window as unknown as Record<string, unknown>;
    w.EJS_player       = '#emui-player';
    w.EJS_gameUrl      = gameUrl;
    w.EJS_core         = core;
    w.EJS_pathToData   = EJS_CDN;
    w.EJS_startOnLoaded = true;
    w.EJS_color        = 'var(--glass-accent, #7c3aed)';
    w.EJS_backgroundColor = '#000000';

    const script = document.createElement('script');
    script.src = `${EJS_CDN}loader.js`;
    script.onerror = () => {
      setError('Failed to load EmulatorJS — check your connection.');
      setIsPlaying(false);
    };
    container.appendChild(script);
  }, []);

  const handleBack = useCallback(() => {
    setIsPlaying(false);
    setNovaCart(null);
    setRomUrl('');
    const w = window as unknown as Record<string, unknown>;
    ['EJS_player','EJS_gameUrl','EJS_core','EJS_pathToData','EJS_startOnLoaded','EJS_color','EJS_backgroundColor'].forEach(k => delete w[k]);
  }, []);

  const handleUrlLaunch = () => {
    const url = romUrl.trim();
    if (!url) { setError('Please enter a ROM URL'); return; }
    if (selectedSystem === 'nova64') {
      playNova({ kind: 'path', path: url, title: titleForPath(url) });
      return;
    }
    launchGame(url, SYSTEMS[selectedSystem].core);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (selectedSystem === 'nova64') { playNova({ kind: 'file', file, title: file.name }); return; }
    launchGame(URL.createObjectURL(file), SYSTEMS[selectedSystem].core);
  }, [selectedSystem, launchGame, playNova]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedSystem === 'nova64') { playNova({ kind: 'file', file, title: file.name }); return; }
    launchGame(URL.createObjectURL(file), SYSTEMS[selectedSystem].core);
  };

  // ── Playing screen ──────────────────────────────────────────────────────────

  if (isPlaying) {
    const sys = SYSTEMS[selectedSystem];
    return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* Mini bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.85)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleBack}
            style={{
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 999,
              color: 'var(--glass-text, #fff)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            ← Library
          </button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {novaCart ? `🌌 ${novaCart.title}` : `${sys.icon} ${sys.label}`}
          </span>
        </div>

        {/* Player fills remaining space */}
        {novaCart ? (
          <div style={{ flex: 1, overflow: 'hidden', background: '#000' }}>
            <NovaPlayer cart={novaCart} />
          </div>
        ) : (
          <div ref={playerRef} style={{ flex: 1, overflow: 'hidden', background: '#000' }} />
        )}
      </div>
    );
  }

  // ── Launcher screen ─────────────────────────────────────────────────────────

  const sys = SYSTEMS[selectedSystem];

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--shell-bg, #0f0f1a)',
        color: 'var(--glass-text, #e0e0f0)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
          background: 'var(--glass-tile, rgba(255,255,255,0.05))',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28 }}>🕹️</span>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--glass-accent, #7c3aed)' }}>
            eMUI
          </div>
          <div style={{ fontSize: 11, color: 'var(--glass-muted, rgba(255,255,255,0.4))', marginTop: 1 }}>
            Retro Console Emulator · EmulatorJS + Nova64 WASM core
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>

        {/* Nova64 is the default system, so its games come first. */}
        {selectedSystem === 'nova64' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            <QwenShelf onPlay={(path, title) => playNova({ kind: 'path', path, title })} />
            <NovaLibrary onPlay={(g) => playNova({ kind: 'path', path: g.path, title: g.name })} />
          </div>
        )}

        {/* ── System Selector ── */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--glass-muted, rgba(255,255,255,0.4))', marginBottom: 10, textTransform: 'uppercase' }}>
          Select System
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {Object.entries(SYSTEMS).map(([key, s]) => {
            const active = key === selectedSystem;
            return (
              <button
                key={key}
                onClick={() => setSelectedSystem(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: active
                    ? `2px solid ${s.color}`
                    : '2px solid var(--glass-border, rgba(255,255,255,0.1))',
                  background: active
                    ? `${s.color}22`
                    : 'var(--glass-tile, rgba(255,255,255,0.05))',
                  color: active ? s.color : 'var(--glass-muted, rgba(255,255,255,0.6))',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ lineHeight: 1.2 }}>{s.short}</span>
              </button>
            );
          })}
        </div>

        {/* ── ROM Loader ── */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--glass-muted, rgba(255,255,255,0.4))', marginBottom: 10, textTransform: 'uppercase' }}>
          Load ROM — {sys.icon} {sys.label}
        </p>

        {/* Tab pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['file', 'url'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 18px',
                borderRadius: 999,
                border: tab === t
                  ? '1.5px solid var(--glass-accent, #7c3aed)'
                  : '1.5px solid var(--glass-border, rgba(255,255,255,0.12))',
                background: tab === t
                  ? 'rgba(124,58,237,0.18)'
                  : 'var(--glass-tile, rgba(255,255,255,0.05))',
                color: tab === t ? 'var(--glass-accent, #7c3aed)' : 'var(--glass-muted, rgba(255,255,255,0.5))',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              {t === 'file' ? '📂 File' : '🔗 URL'}
            </button>
          ))}
        </div>

        {/* File tab */}
        {tab === 'file' && (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: 32,
                borderRadius: 16,
                border: '2px dashed var(--glass-border, rgba(255,255,255,0.18))',
                background: 'var(--glass-tile, rgba(255,255,255,0.04))',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--glass-muted, rgba(255,255,255,0.5))',
                fontSize: 14,
                fontWeight: 500,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div>Tap to browse or drop a ROM file</div>
              <div style={{ fontSize: 11, marginTop: 6, color: 'var(--glass-muted, rgba(255,255,255,0.3))' }}>
                {sys.extensions.join('  ·  ')}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={sys.extensions.join(',')}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* URL tab */}
        {tab === 'url' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="url"
              value={romUrl}
              onChange={(e) => setRomUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlLaunch()}
              placeholder={selectedSystem === 'nova64' ? '/examples/hello-world/code.js' : 'https://example.com/game.nes'}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--glass-border, rgba(255,255,255,0.15))',
                background: 'var(--glass-tile, rgba(255,255,255,0.06))',
                color: 'var(--glass-text, #e0e0f0)',
                fontSize: 14,
                outline: 'none',
                backdropFilter: 'blur(8px)',
              }}
            />
            <button
              onClick={handleUrlLaunch}
              style={{
                padding: '13px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, var(--glass-accent, #7c3aed), #a855f7)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
              }}
            >
              ▶ Launch
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(255,60,60,0.12)',
              border: '1px solid rgba(255,80,80,0.3)',
              color: '#ff7b7b',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Info footer */}
        <div
          style={{
            marginTop: 24,
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--glass-tile, rgba(255,255,255,0.03))',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.07))',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--glass-muted, rgba(255,255,255,0.3))', marginBottom: 6, textTransform: 'uppercase' }}>
            About eMUI
          </div>
          <div style={{ fontSize: 12, color: 'var(--glass-muted, rgba(255,255,255,0.4))', lineHeight: 1.6 }}>
            eMUI runs retro games directly in your browser via{' '}
            <strong style={{ color: 'var(--glass-muted, rgba(255,255,255,0.6))' }}>EmulatorJS</strong>.
            Supports {Object.keys(SYSTEMS).length} systems. You must provide your own ROM files. Pick{' '}
            <strong style={{ color: 'var(--glass-muted, rgba(255,255,255,0.6))' }}>Nova64</strong> to play Nova64 carts on
            our libretro core compiled to WebAssembly, with on-screen touch controls.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TVApp export ─────────────────────────────────────────────────────────────

let reactRoot: Root | null = null;

export const emuiApp: TVApp = {
  id: 'emui',
  name: 'eMUI',
  icon: '🕹️',
  category: 'Entertainment',
  description: 'Retro console emulator · Nova64 WASM core + EmulatorJS',

  mount(el, _ctx, args) {
    // launchApp('emui', { path: '/examples/x/code.js' }) opens straight into a cart.
    const a = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    const path = typeof a.path === 'string' && a.path ? a.path : undefined;
    const initialCart: NovaCart | undefined = path
      ? { kind: 'path', path, title: titleForPath(path) }
      : undefined;
    reactRoot = createRoot(el);
    reactRoot.render(<EMUIApp initialCart={initialCart} />);
  },

  unmount() {
    reactRoot?.unmount();
    reactRoot = null;
  },
};
