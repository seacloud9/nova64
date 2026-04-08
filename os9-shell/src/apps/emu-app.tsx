// eMU App — Retro game emulator powered by EmulatorJS
import { createRoot } from 'react-dom/client';
import { useState, useRef, useCallback } from 'react';
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';

const EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

interface SystemInfo {
  label: string;
  core: string;
  extensions: string[];
  icon: string;
}

const SYSTEMS: Record<string, SystemInfo> = {
  nes: { label: 'Nintendo (NES)', core: 'nes', extensions: ['.nes', '.zip'], icon: '🎮' },
  snes: { label: 'Super Nintendo (SNES)', core: 'snes', extensions: ['.sfc', '.smc', '.zip'], icon: '🕹️' },
  gb: { label: 'Game Boy', core: 'gb', extensions: ['.gb', '.zip'], icon: '🟢' },
  gba: { label: 'Game Boy Advance', core: 'gba', extensions: ['.gba', '.zip'], icon: '🟣' },
  n64: { label: 'Nintendo 64', core: 'n64', extensions: ['.n64', '.z64', '.v64', '.zip'], icon: '🔴' },
  nds: { label: 'Nintendo DS', core: 'nds', extensions: ['.nds', '.zip'], icon: '📱' },
  segaMD: { label: 'Sega Genesis / Mega Drive', core: 'segaMD', extensions: ['.md', '.gen', '.bin', '.zip'], icon: '🔵' },
  segaMS: { label: 'Sega Master System', core: 'segaMS', extensions: ['.sms', '.zip'], icon: '⬜' },
  segaGG: { label: 'Sega Game Gear', core: 'segaGG', extensions: ['.gg', '.zip'], icon: '🟡' },
  segaSaturn: { label: 'Sega Saturn', core: 'segaSaturn', extensions: ['.iso', '.bin', '.zip'], icon: '🪐' },
  psx: { label: 'PlayStation', core: 'psx', extensions: ['.bin', '.iso', '.cue', '.zip'], icon: '⚪' },
  atari2600: { label: 'Atari 2600', core: 'atari2600', extensions: ['.a26', '.bin', '.zip'], icon: '🕹️' },
  atari7800: { label: 'Atari 7800', core: 'atari7800', extensions: ['.a78', '.bin', '.zip'], icon: '🎰' },
  lynx: { label: 'Atari Lynx', core: 'lynx', extensions: ['.lnx', '.zip'], icon: '🐆' },
  jaguar: { label: 'Atari Jaguar', core: 'jaguar', extensions: ['.j64', '.jag', '.zip'], icon: '🐈' },
  '3do': { label: '3DO', core: '3do', extensions: ['.iso', '.bin', '.zip'], icon: '💿' },
  pce: { label: 'TurboGrafx-16 / PC Engine', core: 'pce', extensions: ['.pce', '.zip'], icon: '🎯' },
  ngp: { label: 'Neo Geo Pocket', core: 'ngp', extensions: ['.ngp', '.ngc', '.zip'], icon: '🏮' },
  ws: { label: 'WonderSwan', core: 'ws', extensions: ['.ws', '.wsc', '.zip'], icon: '🌸' },
  vb: { label: 'Virtual Boy', core: 'vb', extensions: ['.vb', '.zip'], icon: '🔴' },
  arcade: { label: 'Arcade (MAME)', core: 'mame2003', extensions: ['.zip'], icon: '🕹️' },
};

function EMULauncher() {
  const [selectedSystem, setSelectedSystem] = useState<string>('nes');
  const [romUrl, setRomUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const playerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const launchGame = useCallback((gameUrl: string, core: string) => {
    if (!playerRef.current) return;
    setError('');
    setIsPlaying(true);

    const container = playerRef.current;
    container.innerHTML = '';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'emu-player';
    playerDiv.style.width = '100%';
    playerDiv.style.height = '100%';
    container.appendChild(playerDiv);

    // Set EmulatorJS config on window
    const w = window as unknown as Record<string, unknown>;
    w.EJS_player = '#emu-player';
    w.EJS_gameUrl = gameUrl;
    w.EJS_core = core;
    w.EJS_pathToData = EJS_CDN;
    w.EJS_startOnLoaded = true;
    w.EJS_color = '#1a1a2e';

    // Load EmulatorJS loader script
    const script = document.createElement('script');
    script.src = EJS_CDN + 'loader.js';
    script.onerror = () => {
      setError('Failed to load EmulatorJS. Check your internet connection.');
      setIsPlaying(false);
    };
    container.appendChild(script);
  }, []);

  const handleUrlLaunch = () => {
    if (!romUrl.trim()) {
      setError('Please enter a ROM URL');
      return;
    }
    const sys = SYSTEMS[selectedSystem];
    launchGame(romUrl.trim(), sys.core);
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const sys = SYSTEMS[selectedSystem];
    launchGame(url, sys.core);
  }, [selectedSystem, launchGame]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const sys = SYSTEMS[selectedSystem];
    launchGame(url, sys.core);
  };

  const handleBack = () => {
    setIsPlaying(false);
    setRomUrl('');
    // Clean up EJS globals
    const w = window as unknown as Record<string, unknown>;
    delete w.EJS_player;
    delete w.EJS_gameUrl;
    delete w.EJS_core;
    delete w.EJS_pathToData;
    delete w.EJS_startOnLoaded;
    delete w.EJS_color;
  };

  if (isPlaying) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '4px 12px', background: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #333' }}>
          <button
            onClick={handleBack}
            style={{ padding: '4px 12px', background: '#333', border: '1px solid #555', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            ← Back
          </button>
          <span style={{ color: '#888', fontSize: 12 }}>
            {SYSTEMS[selectedSystem]?.icon} {SYSTEMS[selectedSystem]?.label}
          </span>
        </div>
        <div ref={playerRef} style={{ flex: 1, position: 'relative' }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.4)', borderBottom: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 32 }}>🕹️</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>eMU</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Retro Console Emulator · Powered by EmulatorJS</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* System Selector */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 'bold', color: '#aaa', marginBottom: 8, display: 'block' }}>SELECT SYSTEM</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {Object.entries(SYSTEMS).map(([key, sys]) => (
              <button
                key={key}
                onClick={() => setSelectedSystem(key)}
                style={{
                  padding: '10px 14px',
                  background: selectedSystem === key ? 'rgba(100, 100, 255, 0.3)' : 'rgba(255,255,255,0.05)',
                  border: selectedSystem === key ? '2px solid #6666ff' : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ marginRight: 8 }}>{sys.icon}</span>
                {sys.label}
              </button>
            ))}
          </div>
        </div>

        {/* ROM Loading */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* URL Input */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: 13, fontWeight: 'bold', color: '#aaa', marginBottom: 8, display: 'block' }}>LOAD ROM FROM URL</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={romUrl}
                onChange={(e) => setRomUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlLaunch()}
                placeholder="https://example.com/game.nes"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleUrlLaunch}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ▶ Play
              </button>
            </div>
          </div>

          {/* File Drop Zone */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: 13, fontWeight: 'bold', color: '#aaa', marginBottom: 8, display: 'block' }}>LOAD ROM FROM FILE</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: 20,
                background: 'rgba(255,255,255,0.05)',
                border: '2px dashed rgba(255,255,255,0.2)',
                borderRadius: 8,
                textAlign: 'center',
                cursor: 'pointer',
                color: '#888',
                fontSize: 14,
              }}
            >
              📂 Drop ROM file here or click to browse
              <div style={{ fontSize: 11, marginTop: 4, color: '#555' }}>
                Supported: {SYSTEMS[selectedSystem]?.extensions.join(', ')}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={SYSTEMS[selectedSystem]?.extensions.join(',')}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 16px', background: 'rgba(255,50,50,0.2)', border: '1px solid rgba(255,50,50,0.4)', borderRadius: 8, color: '#ff6b6b', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Info */}
        <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 8 }}>ABOUT eMU</div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            eMU uses <strong>EmulatorJS</strong> to emulate retro consoles directly in your browser.
            Supports 20+ systems including NES, SNES, Game Boy, N64, PlayStation, Sega Genesis, and more.
            Load ROMs from a URL or drag &amp; drop a local file to start playing.
            You must provide your own ROM files.
          </div>
        </div>
      </div>
    </div>
  );
}

export const emuApp: Nova64App = {
  id: 'emu',
  name: 'eMU',
  icon: '🕹️',

  mount(container) {
    const root = createRoot(container);
    root.render(<EMULauncher />);
    (container as HTMLElement & { _novaRoot?: ReturnType<typeof createRoot> })._novaRoot = root;
  },

  unmount() {},

  getInfo() {
    return {
      name: 'eMU',
      version: '1.0',
      description: 'Retro console emulator powered by EmulatorJS',
      author: 'Nova64 OS',
      icon: '🕹️',
    };
  },
};

novaContext.registerApp(emuApp);
