// TV-optimized Game Launcher — Phase 1 app for os9-shellMobile
import { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { TVApp } from '../../types';
import { tvContext } from '../../os/context';

interface Game {
  id: string;
  name: string;
  description: string;
  emoji: string;
  path: string;
  category: string;
  color: string;
}

const GAMES: Game[] = [
  { id: 'fzero',       name: 'F-ZERO RACING',      description: 'Hyper-speed quantum racing',    emoji: '🏎️', path: '/examples/f-zero-nova-3d/code.js',       category: 'Racing',      color: '#FF006E' },
  { id: 'starfox',     name: 'STAR FOX NOVA',       description: 'Epic space combat',             emoji: '🚀', path: '/examples/star-fox-nova-3d/code.js',     category: 'Shooter',     color: '#3A86FF' },
  { id: 'cyberpunk',   name: 'NEO TOKYO 2077',      description: 'Neon dystopian adventure',      emoji: '🌆', path: '/examples/cyberpunk-city-3d/code.js',    category: 'Adventure',   color: '#FF6B35' },
  { id: 'knight',      name: 'GAUNTLET 64',         description: 'Medieval combat realm',         emoji: '⚔️', path: '/examples/strider-demo-3d/code.js',      category: 'Action',      color: '#06FFA5' },
  { id: 'plumber',     name: 'SUPER PLUMBER 64',    description: 'Classic platformer adventure',  emoji: '🍄', path: '/examples/super-plumber-64/code.js',     category: 'Platformer',  color: '#FFD60A' },
  { id: 'minecraft',   name: 'VOXEL REALM',         description: 'Infinite procedural worlds',    emoji: '⛏️', path: '/examples/minecraft-demo/code.js',       category: 'Sandbox',     color: '#06FFA5' },
  { id: 'crystal',     name: 'CRYSTAL CATHEDRAL',   description: 'Ultimate graphics showcase',    emoji: '🏛️', path: '/examples/crystal-cathedral-3d/code.js', category: 'Demo',        color: '#A78BFA' },
  { id: 'mystical',    name: 'MYSTICAL REALM',      description: 'Fantasy world adventure',       emoji: '🏰', path: '/examples/mystical-realm-3d/code.js',   category: 'Adventure',   color: '#34D399' },
  { id: 'fps',         name: 'FPS DEMO',            description: 'First-person shooter',          emoji: '🔫', path: '/examples/fps-demo-3d/code.js',          category: 'Shooter',     color: '#F43F5E' },
  { id: 'space',       name: 'SPACE COMBAT',        description: 'Deep space warfare',            emoji: '🛸', path: '/examples/space-combat-3d/code.js',      category: 'Shooter',     color: '#8B5CF6' },
  { id: 'dungeons',    name: 'DUNGEON CRAWLER',     description: 'Dark dungeon exploration',      emoji: '🏰', path: '/examples/dungeon-crawler-3d/code.js',   category: 'RPG',         color: '#F59E0B' },
  { id: 'physics',     name: 'PHYSICS DEMO',        description: 'Realistic physics sandbox',     emoji: '⚛️', path: '/examples/physics-demo-3d/code.js',      category: 'Demo',        color: '#06B6D4' },
  { id: 'demoscene',   name: 'DEMO∞SCENE',         description: 'Audiovisual hypnosis',          emoji: '✨', path: '/examples/demoscene/code.js',            category: 'Demo',        color: '#4CC9F0' },
  { id: 'nature',      name: 'NATURE EXPLORER',     description: 'Lush procedural environments',  emoji: '🌿', path: '/examples/nature-explorer-3d/code.js',  category: 'Explorer',    color: '#22C55E' },
  { id: 'voxel-terrain', name: 'VOXEL TERRAIN',    description: 'Vast voxel landscapes',         emoji: '🌍', path: '/examples/voxel-terrain/code.js',        category: 'Sandbox',     color: '#10B981' },
  { id: 'boids',       name: 'BOIDS FLOCKING',      description: 'Emergent swarm behavior',       emoji: '🐦', path: '/examples/boids-flocking/code.js',       category: 'Simulation',  color: '#7DD3FC' },
];

const CATEGORIES = ['All', ...Array.from(new Set(GAMES.map((g) => g.category)))];

function TVGameLauncher() {
  const [filter, setFilter] = useState('All');
  const [focused, setFocused] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'All' ? GAMES : GAMES.filter((g) => g.category === filter);

  const launchGame = useCallback((game: Game) => {
    tvContext.launchApp('cart', { path: game.path, title: `🎮 ${game.name}` });
  }, []);

  // D-pad navigation between game tiles
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!gridRef.current) return;
      const tiles = Array.from(
        gridRef.current.querySelectorAll<HTMLElement>('[data-game-tile]')
      );
      const idx = tiles.findIndex((el) => el === document.activeElement);
      if (idx === -1) { tiles[0]?.focus(); return; }

      const colCount = Math.max(1, Math.floor(gridRef.current.clientWidth / 220));
      let next = -1;
      if (e.key === 'ArrowRight') next = Math.min(idx + 1, tiles.length - 1);
      else if (e.key === 'ArrowLeft') next = Math.max(idx - 1, 0);
      else if (e.key === 'ArrowDown') next = Math.min(idx + colCount, tiles.length - 1);
      else if (e.key === 'ArrowUp') next = Math.max(idx - colCount, 0);

      if (next !== -1 && next !== idx) {
        e.preventDefault();
        tiles[next].focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--shell-bg)', color: 'var(--glass-text)' }}
    >
      {/* Header */}
      <div
        className="px-8 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <h1
          className="text-2xl font-black tracking-widest uppercase mb-4"
          style={{ color: 'var(--glass-accent)' }}
        >
          ⚡ NOVA64 ARCADE
        </h1>

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95"
              style={{
                background: filter === cat ? 'var(--glass-accent)' : 'var(--glass-tile)',
                color: filter === cat ? '#fff' : 'var(--glass-muted)',
                border: `1px solid ${filter === cat ? 'var(--glass-accent)' : 'var(--glass-border)'}`,
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Game grid */}
      <div className="flex-1 overflow-y-auto p-8">
        <div
          ref={gridRef}
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
        >
          {filtered.map((game, i) => (
            <button
              key={game.id}
              data-game-tile
              tabIndex={i === 0 ? 0 : -1}
              onClick={() => launchGame(game)}
              onFocus={() => setFocused(game.id)}
              onBlur={() => setFocused(null)}
              className="glass-tile rounded-2xl p-5 text-left cursor-pointer"
              style={{
                outline: 'none',
                boxShadow: focused === game.id
                  ? `var(--glass-focus-ring), 0 0 30px ${game.color}33`
                  : 'var(--glass-tile-shadow)',
                borderColor: focused === game.id ? game.color : undefined,
              }}
            >
              {/* Color accent bar */}
              <div
                className="w-full h-1 rounded-full mb-4"
                style={{ background: `linear-gradient(90deg, ${game.color}, transparent)` }}
              />

              <div
                className="text-5xl mb-3 leading-none"
                style={{ filter: `drop-shadow(0 2px 8px ${game.color}66)` }}
              >
                {game.emoji}
              </div>

              <div
                className="font-black text-sm tracking-wide uppercase mb-1"
                style={{ color: game.color }}
              >
                {game.name}
              </div>

              <div className="text-xs leading-relaxed" style={{ color: 'var(--glass-muted)' }}>
                {game.description}
              </div>

              <div
                className="mt-3 inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${game.color}22`,
                  color: game.color,
                  border: `1px solid ${game.color}44`,
                }}
              >
                {game.category}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export const gameLauncherApp: TVApp = {
  id: 'game-launcher',
  name: 'Game Launcher',
  icon: '🎮',
  category: 'Entertainment',
  description: 'Browse and launch Nova64 games',

  mount(el, _ctx) {
    const root: Root = createRoot(el);
    root.render(<TVGameLauncher />);
    (el as HTMLElement & { _tvRoot?: Root })._tvRoot = root;
  },

  unmount() {
    // TVWindow el is cleared after unmount — root GC'd automatically
  },

  getInfo() {
    return {
      name: 'Game Launcher',
      version: '1.0',
      description: 'Browse and launch Nova64 games',
      author: 'Nova64 OS',
      icon: '🎮',
    };
  },
};
