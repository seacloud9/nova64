// TV-optimized Game Launcher — full Nova64 game catalog
import { useState, useRef, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { TVApp } from '../../types';
import { tvContext } from '../../os/context';

// ─── Game data ────────────────────────────────────────────────────────────────

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
  // Racing
  { id: 'fzero',        name: 'F-ZERO RACING',     description: 'Hyper-speed quantum racing',       emoji: '🏎️', path: '/examples/f-zero-nova-3d/code.js',        category: 'Racing',    color: '#FF006E' },
  { id: 'harrier',      name: 'SPACE HARRIER',      description: 'Retro rail shooter',               emoji: '🛸', path: '/examples/space-harrier-3d/code.js',      category: 'Racing',    color: '#FF6B9D' },
  // Shooter
  { id: 'starfox',      name: 'STAR FOX NOVA',      description: 'Epic space combat',                emoji: '🚀', path: '/examples/star-fox-nova-3d/code.js',      category: 'Shooter',   color: '#3A86FF' },
  { id: 'fps',          name: 'FPS DEMO',            description: 'First-person shooter',             emoji: '🔫', path: '/examples/fps-demo-3d/code.js',           category: 'Shooter',   color: '#F43F5E' },
  { id: 'shooter',      name: 'SPACE SHOOTER',       description: 'Intense space combat',             emoji: '🎯', path: '/examples/shooter-demo-3d/code.js',       category: 'Shooter',   color: '#EF4444' },
  { id: 'spacecombat',  name: 'SPACE COMBAT',        description: 'Deep space warfare',               emoji: '🛸', path: '/examples/space-combat-3d/code.js',       category: 'Shooter',   color: '#8B5CF6' },
  { id: 'wingcmd',      name: 'WING COMMANDER',      description: 'Legendary space battles',          emoji: '✈️', path: '/examples/wing-commander-space/code.js',  category: 'Shooter',   color: '#EC4899' },
  // Adventure
  { id: 'cyberpunk',    name: 'CYBERPUNK CITY',      description: 'Neon dystopian adventure',         emoji: '🌆', path: '/examples/cyberpunk-city-3d/code.js',     category: 'Adventure', color: '#FF6B35' },
  { id: 'verdict',      name: 'THE VERDICT',         description: 'Noir adventure comic',             emoji: '🕵️', path: '/examples/adventure-comic-3d/code.js',   category: 'Adventure', color: '#F59E0B' },
  { id: 'dungeon',      name: 'DUNGEON CRAWLER',     description: 'Dark dungeon exploration',         emoji: '🏰', path: '/examples/dungeon-crawler-3d/code.js',    category: 'Adventure', color: '#D97706' },
  { id: 'wizardry',     name: 'WIZARDRY',            description: 'Classic RPG dungeon quest',        emoji: '🧙', path: '/examples/wizardry-3d/code.js',           category: 'Adventure', color: '#7C3AED' },
  // Action
  { id: 'gauntlet',     name: 'GAUNTLET 64',         description: 'Medieval combat realm',            emoji: '⚔️', path: '/examples/strider-demo-3d/code.js',       category: 'Action',    color: '#06FFA5' },
  { id: 'plumber',      name: 'SUPER PLUMBER 64',    description: 'Classic platformer adventure',     emoji: '🍄', path: '/examples/super-plumber-64/code.js',      category: 'Action',    color: '#FFD60A' },
  { id: 'freedoom',     name: 'FREEDOOM WAD',        description: 'Classic FPS shooter',              emoji: '💀', path: '/examples/wad-demo/code.js',              category: 'Action',    color: '#6B7280' },
  // Sandbox
  { id: 'voxelrealm',   name: 'VOXEL REALM',         description: 'Infinite procedural worlds',       emoji: '⛏️', path: '/examples/minecraft-demo/code.js',         category: 'Sandbox',   color: '#10B981' },
  { id: 'voxelterrain', name: 'VOXEL TERRAIN',       description: 'Vast voxel landscapes',            emoji: '🌍', path: '/examples/voxel-terrain/code.js',          category: 'Sandbox',   color: '#34D399' },
  { id: 'voxelcreate',  name: 'VOXEL CREATIVE',      description: 'Build your voxel world',           emoji: '🏗️', path: '/examples/voxel-creative/code.js',         category: 'Sandbox',   color: '#6EE7B7' },
  { id: 'voxelcreatures', name: 'VOXEL CREATURES',   description: 'Voxel creature simulation',        emoji: '🐄', path: '/examples/voxel-creatures/code.js',       category: 'Sandbox',   color: '#A7F3D0' },
  // Demo
  { id: 'crystal',      name: 'CRYSTAL CATHEDRAL',   description: 'Ultimate graphics showcase',       emoji: '🏛️', path: '/examples/crystal-cathedral-3d/code.js',  category: 'Demo',      color: '#A78BFA' },
  { id: 'mystical',     name: 'MYSTICAL REALM',      description: 'Fantasy world showcase',           emoji: '🏰', path: '/examples/mystical-realm-3d/code.js',     category: 'Demo',      color: '#34D399' },
  { id: 'physics',      name: 'PHYSICS DEMO',        description: 'Realistic physics sandbox',        emoji: '⚛️', path: '/examples/physics-demo-3d/code.js',        category: 'Demo',      color: '#06B6D4' },
  { id: 'demoscene',    name: 'DEMOSCENE TRON',       description: 'Audiovisual hypnosis',             emoji: '✨', path: '/examples/demoscene/code.js',             category: 'Demo',      color: '#4CC9F0' },
  { id: 'novadrift',    name: 'NOVA DRIFT',          description: 'Procedural skybox experience',     emoji: '🌌', path: '/examples/hello-skybox/code.js',           category: 'Demo',      color: '#818CF8' },
  { id: 'boids',        name: 'BOIDS FLOCKING',      description: 'Emergent swarm behavior',          emoji: '🐦', path: '/examples/boids-flocking/code.js',         category: 'Demo',      color: '#7DD3FC' },
  { id: 'gol',          name: 'GAME OF LIFE 3D',     description: '3D Conway simulation',             emoji: '🧬', path: '/examples/game-of-life-3d/code.js',        category: 'Demo',      color: '#4ADE80' },
  { id: 'nature',       name: 'NATURE EXPLORER',     description: 'Lush procedural environments',     emoji: '🌿', path: '/examples/nature-explorer-3d/code.js',    category: 'Demo',      color: '#22C55E' },
  { id: 'genart',       name: 'GENERATIVE ART',      description: 'Procedural visual art',            emoji: '🎨', path: '/examples/generative-art/code.js',         category: 'Demo',      color: '#F472B6' },
  { id: 'tsl',          name: 'TSL SHOWCASE',        description: 'Three.js Shading Language demo',   emoji: '✨', path: '/examples/tsl-showcase/code.js',           category: 'Demo',      color: '#C084FC' },
  { id: 'advanced3d',   name: 'ADVANCED 3D',         description: 'Advanced 3D techniques',           emoji: '🎯', path: '/examples/3d-advanced/code.js',            category: 'Demo',      color: '#FB923C' },
  { id: 'animmodels',   name: 'ANIMATED MODELS',     description: 'GLB/GLTF model showcase',          emoji: '🦊', path: '/examples/model-viewer-3d/code.js',        category: 'Demo',      color: '#FBBF24' },
  { id: 'particles',    name: 'PARTICLES DEMO',      description: 'GPU particle systems',              emoji: '✨', path: '/examples/particles-demo/code.js',         category: 'Demo',      color: '#E879F9' },
  { id: 'pbr',          name: 'PBR SHOWCASE',        description: 'Physically-based rendering',       emoji: '🔮', path: '/examples/pbr-showcase/code.js',           category: 'Demo',      color: '#22D3EE' },
  { id: 'skybox',       name: 'SKYBOX SHOWCASE',     description: 'Procedural skybox gallery',        emoji: '🌌', path: '/examples/skybox-showcase/code.js',        category: 'Demo',      color: '#60A5FA' },
  { id: 'instancing',   name: 'INSTANCING DEMO',     description: 'GPU instancing performance',       emoji: '⚡', path: '/examples/instancing-demo/code.js',        category: 'Demo',      color: '#FDE047' },
  // Misc
  { id: 'helloworld',   name: 'HELLO WORLD',         description: 'Nova64 starter template',          emoji: '⭐', path: '/examples/hello-world/code.js',            category: 'Misc',      color: '#94A3B8' },
  { id: 'hello3d',      name: 'HELLO 3D',            description: '3D starter template',              emoji: '👋', path: '/examples/hello-3d/code.js',              category: 'Misc',      color: '#94A3B8' },
  { id: 'input',        name: 'INPUT SHOWCASE',      description: 'Controller & keyboard demo',       emoji: '🎮', path: '/examples/input-showcase/code.js',         category: 'Misc',      color: '#64748B' },
  { id: 'audiolab',     name: 'AUDIO LAB',           description: 'Synthesizer playground',           emoji: '🎵', path: '/examples/audio-lab/code.js',             category: 'Misc',      color: '#A855F7' },
  { id: 'storage',      name: 'STORAGE QUEST',       description: 'LocalStorage demo game',           emoji: '💾', path: '/examples/storage-quest/code.js',          category: 'Misc',      color: '#14B8A6' },
  { id: 'screen',       name: 'SCREEN DEMO',         description: 'Screen system showcase',           emoji: '🖥️', path: '/examples/screen-demo/code.js',            category: 'Misc',      color: '#0EA5E9' },
  { id: 'uidemo',       name: 'UI DEMO',             description: 'Nova64 UI API showcase',           emoji: '🎨', path: '/examples/ui-demo/code.js',               category: 'Misc',      color: '#F97316' },
  { id: 'nftworlds',    name: 'NFT WORLDS',          description: 'Generative art worlds',            emoji: '🌐', path: '/examples/nft-worlds/code.js',            category: 'Misc',      color: '#06B6D4' },
  { id: 'nftart',       name: 'NFT ART GENERATOR',  description: 'Algorithmic NFT art',              emoji: '🎲', path: '/examples/nft-art-generator/code.js',     category: 'Misc',      color: '#8B5CF6' },
  { id: 'creative',     name: 'CREATIVE CODING',     description: 'Creative code experiments',        emoji: '🎭', path: '/examples/creative-coding/code.js',        category: 'Misc',      color: '#EC4899' },
];

const CATEGORIES = ['All', ...Array.from(new Set(GAMES.map((g) => g.category)))];

// ─── Component ────────────────────────────────────────────────────────────────

function TVGameLauncher() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = GAMES.filter((g) => {
    const matchCat = filter === 'All' || g.category === filter;
    const matchSearch = search === '' || g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const launchGame = useCallback((game: Game) => {
    // Defer to a new macrotask so root_A's current React event-handler batch fully
    // finishes before the store update fires.  Without this, React's concurrent
    // scheduler tries to reconcile root_A while TVWindow's outer root is
    // simultaneously calling root_A.unmount(), causing the "removeChild" crash.
    setTimeout(() => {
      tvContext.launchApp('cart', { path: game.path, title: `${game.emoji} ${game.name}` });
    }, 0);
  }, []);

  // D-pad navigation
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
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1
          className="text-xl font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--glass-accent)' }}
        >
          ⚡ NOVA64 ARCADE
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl text-sm mb-3 outline-none"
          style={{
            background: 'var(--glass-tile)',
            border: '1px solid var(--glass-border)',
            color: 'var(--glass-text)',
          }}
        />

        {/* Category filter pills */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95"
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

      {/* Count */}
      <div className="px-6 py-2 shrink-0">
        <span className="text-xs" style={{ color: 'var(--glass-muted)' }}>
          {filtered.length} game{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Game grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div
          ref={gridRef}
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
        >
          {filtered.map((game, i) => (
            <button
              key={game.id}
              data-game-tile
              onClick={() => launchGame(game)}
              tabIndex={i === 0 ? 0 : -1}
              className="glass-tile rounded-2xl flex flex-col items-center justify-center gap-2 p-4 cursor-pointer"
              style={{ minHeight: 140 }}
              type="button"
            >
              <span style={{ fontSize: 44, lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
                {game.emoji}
              </span>
              <span className="font-bold text-xs text-center leading-tight tracking-wide" style={{ color: 'var(--glass-text)' }}>
                {game.name}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: game.color + '22',
                  color: game.color,
                  border: `1px solid ${game.color}44`,
                }}
              >
                {game.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TVApp wrapper ────────────────────────────────────────────────────────────

let reactRoot: Root | null = null;

export const gameLauncherApp: TVApp = {
  id: 'game-launcher',
  name: 'Game Launcher',
  icon: '🎮',
  category: 'Games',
  description: 'Browse and launch all 44 Nova64 games',

  mount(el) {
    reactRoot = createRoot(el);
    reactRoot.render(<TVGameLauncher />);
  },

  unmount() {
    reactRoot?.unmount();
    reactRoot = null;
  },
};
