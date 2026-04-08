import { useState, useEffect, useRef } from 'react';
import { tvContext } from '../os/context';

interface Game {
  name: string;
  emoji: string;
  path: string;
  category: string;
}

const GAMES: Game[] = [
  // Racing
  { name: 'F-ZERO RACING',     emoji: '🏎️', path: '/examples/f-zero-nova-3d/code.js',       category: 'Racing'      },
  { name: 'SPACE HARRIER',     emoji: '🛸', path: '/examples/space-harrier-3d/code.js',      category: 'Racing'      },
  // Shooter
  { name: 'STAR FOX NOVA',     emoji: '🚀', path: '/examples/star-fox-nova-3d/code.js',      category: 'Shooter'     },
  { name: 'FPS DEMO',          emoji: '🔫', path: '/examples/fps-demo-3d/code.js',           category: 'Shooter'     },
  { name: 'SPACE SHOOTER',     emoji: '🎯', path: '/examples/shooter-demo-3d/code.js',       category: 'Shooter'     },
  { name: 'SPACE COMBAT',      emoji: '🛸', path: '/examples/space-combat-3d/code.js',       category: 'Shooter'     },
  { name: 'WING COMMANDER',    emoji: '✈️', path: '/examples/wing-commander-space/code.js',  category: 'Shooter'     },
  // Adventure
  { name: 'CYBERPUNK CITY',    emoji: '🌆', path: '/examples/cyberpunk-city-3d/code.js',     category: 'Adventure'   },
  { name: 'THE VERDICT',       emoji: '🕵️', path: '/examples/adventure-comic-3d/code.js',   category: 'Adventure'   },
  { name: 'DUNGEON CRAWLER',   emoji: '🏰', path: '/examples/dungeon-crawler-3d/code.js',    category: 'Adventure'   },
  { name: 'WIZARDRY',          emoji: '🧙', path: '/examples/wizardry-3d/code.js',           category: 'Adventure'   },
  // Action
  { name: 'GAUNTLET 64',       emoji: '⚔️', path: '/examples/strider-demo-3d/code.js',       category: 'Action'      },
  { name: 'SUPER PLUMBER 64',  emoji: '🍄', path: '/examples/super-plumber-64/code.js',      category: 'Action'      },
  { name: 'FREEDOOM WAD',      emoji: '💀', path: '/examples/wad-demo/code.js',              category: 'Action'      },
  // Sandbox
  { name: 'VOXEL REALM',       emoji: '⛏️', path: '/examples/minecraft-demo/code.js',        category: 'Sandbox'     },
  { name: 'VOXEL TERRAIN',     emoji: '🌍', path: '/examples/voxel-terrain/code.js',         category: 'Sandbox'     },
  { name: 'VOXEL CREATIVE',    emoji: '🏗️', path: '/examples/voxel-creative/code.js',        category: 'Sandbox'     },
  { name: 'VOXEL CREATURES',   emoji: '🐄', path: '/examples/voxel-creatures/code.js',       category: 'Sandbox'     },
  // Demo
  { name: 'CRYSTAL CATHEDRAL', emoji: '🏛️', path: '/examples/crystal-cathedral-3d/code.js', category: 'Demo'        },
  { name: 'MYSTICAL REALM',    emoji: '🏰', path: '/examples/mystical-realm-3d/code.js',     category: 'Demo'        },
  { name: 'PHYSICS DEMO',      emoji: '⚛️', path: '/examples/physics-demo-3d/code.js',       category: 'Demo'        },
  { name: 'DEMOSCENE TRON',    emoji: '✨', path: '/examples/demoscene/code.js',             category: 'Demo'        },
  { name: 'NOVA DRIFT',        emoji: '🌌', path: '/examples/hello-skybox/code.js',          category: 'Demo'        },
  { name: 'BOIDS FLOCKING',    emoji: '🐦', path: '/examples/boids-flocking/code.js',        category: 'Demo'        },
  { name: 'GAME OF LIFE 3D',   emoji: '🧬', path: '/examples/game-of-life-3d/code.js',       category: 'Demo'        },
  { name: 'NATURE EXPLORER',   emoji: '🌿', path: '/examples/nature-explorer-3d/code.js',    category: 'Demo'        },
  { name: 'GENERATIVE ART',    emoji: '🎨', path: '/examples/generative-art/code.js',        category: 'Demo'        },
  { name: 'TSL SHOWCASE',      emoji: '✨', path: '/examples/tsl-showcase/code.js',          category: 'Demo'        },
  { name: 'ADVANCED 3D',       emoji: '🎯', path: '/examples/3d-advanced/code.js',           category: 'Demo'        },
  { name: 'ANIMATED MODELS',   emoji: '🦊', path: '/examples/model-viewer-3d/code.js',       category: 'Demo'        },
  { name: 'PARTICLES DEMO',    emoji: '✨', path: '/examples/particles-demo/code.js',        category: 'Demo'        },
  { name: 'PBR SHOWCASE',      emoji: '🔮', path: '/examples/pbr-showcase/code.js',          category: 'Demo'        },
  { name: 'SKYBOX SHOWCASE',   emoji: '🌌', path: '/examples/skybox-showcase/code.js',       category: 'Demo'        },
  { name: 'INSTANCING DEMO',   emoji: '⚡', path: '/examples/instancing-demo/code.js',       category: 'Demo'        },
  // Misc
  { name: 'HELLO WORLD',       emoji: '⭐', path: '/examples/hello-world/code.js',           category: 'Misc'        },
  { name: 'HELLO 3D',          emoji: '👋', path: '/examples/hello-3d/code.js',              category: 'Misc'        },
  { name: 'INPUT SHOWCASE',    emoji: '🎮', path: '/examples/input-showcase/code.js',        category: 'Misc'        },
  { name: 'AUDIO LAB',         emoji: '🎵', path: '/examples/audio-lab/code.js',             category: 'Misc'        },
  { name: 'STORAGE QUEST',     emoji: '💾', path: '/examples/storage-quest/code.js',         category: 'Misc'        },
  { name: 'SCREEN DEMO',       emoji: '🖥️', path: '/examples/screen-demo/code.js',           category: 'Misc'        },
  { name: 'UI DEMO',           emoji: '🎨', path: '/examples/ui-demo/code.js',               category: 'Misc'        },
  { name: 'NFT WORLDS',        emoji: '🌐', path: '/examples/nft-worlds/code.js',            category: 'Misc'        },
  { name: 'NFT ART GENERATOR', emoji: '🎲', path: '/examples/nft-art-generator/code.js',    category: 'Misc'        },
  { name: 'CREATIVE CODING',   emoji: '🎭', path: '/examples/creative-coding/code.js',       category: 'Misc'        },
];

const CATEGORIES = ['All', ...Array.from(new Set(GAMES.map((g) => g.category)))];

interface GamesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GamesDrawer({ open, onClose }: GamesDrawerProps) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const filtered = GAMES.filter((g) => {
    const matchCat = filter === 'All' || g.category === filter;
    const matchSearch = search === '' || g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const launchGame = (game: Game) => {
    tvContext.launchApp('cart', { path: game.path, title: `${game.emoji} ${game.name}` });
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 150, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full flex flex-col"
        style={{
          zIndex: 160,
          width: 'min(400px, 100vw)',
          background: 'var(--drawer-bg)',
          borderLeft: '1px solid var(--drawer-border)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.33, 1, 0.68, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--drawer-border)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>🎮</span>
            <span
              className="font-black text-base tracking-widest uppercase"
              style={{ color: 'var(--glass-accent)' }}
            >
              NOVA64 ARCADE
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center w-8 h-8 transition-all active:scale-90"
            style={{
              background: 'rgba(255,60,60,0.12)',
              border: '1px solid rgba(255,80,80,0.25)',
              color: 'rgba(255,120,120,0.9)',
              cursor: 'pointer',
              fontSize: 16,
            }}
            aria-label="Close games drawer"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--glass-tile)',
              border: '1px solid var(--glass-border)',
              color: 'var(--glass-text)',
              backdropFilter: 'blur(8px)',
            }}
          />
        </div>

        {/* Category pills */}
        <div className="px-4 py-2 flex gap-2 flex-wrap shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95"
              style={{
                background: filter === cat ? 'var(--glass-accent)' : 'var(--glass-tile)',
                color: filter === cat ? '#fff' : 'var(--glass-muted)',
                border: `1px solid ${filter === cat ? 'var(--glass-accent)' : 'var(--glass-border)'}`,
                cursor: 'pointer',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="px-5 py-1 shrink-0">
          <span className="text-xs" style={{ color: 'var(--glass-muted)' }}>
            {filtered.length} game{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Games list */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--glass-muted)' }}>
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm">No games found</div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((game) => (
                <button
                  key={game.path}
                  onClick={() => launchGame(game)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full transition-all duration-150 active:scale-95"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'var(--glass-text)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--drawer-item-hover)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }}
                  type="button"
                >
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{game.emoji}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate tracking-wide">{game.name}</span>
                    <span className="text-xs" style={{ color: 'var(--glass-muted)' }}>{game.category}</span>
                  </div>
                  <span className="ml-auto text-xs opacity-40">▶</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
