import { useState } from 'react';
import { useAppStore } from '../os/stores';

interface Game {
  id: string;
  name: string;
  description: string;
  emoji: string;
  path: string;
  category: 'racing' | 'platformer' | 'adventure' | 'demo';
  color1: string;
  color2: string;
}

const GAMES: Game[] = [
  {
    id: 'fzero',
    name: 'F-ZERO RACING',
    description: 'Hyper-speed quantum racing',
    emoji: '🏎️',
    path: '/examples/f-zero-nova-3d/code.js',
    category: 'racing',
    color1: '#FF006E',
    color2: '#8338EC',
  },
  {
    id: 'knight',
    name: 'KNIGHT QUEST',
    description: 'Medieval combat realm',
    emoji: '⚔️',
    path: '/examples/strider-demo-3d/code.js',
    category: 'platformer',
    color1: '#06FFA5',
    color2: '#0066FF',
  },
  {
    id: 'cyberpunk',
    name: 'NEO TOKYO 2077',
    description: 'Neon dystopian adventure',
    emoji: '🌆',
    path: '/examples/cyberpunk-city-3d/code.js',
    category: 'adventure',
    color1: '#FF006E',
    color2: '#FFBE0B',
  },
  {
    id: 'strider',
    name: 'CYBER STRIDER',
    description: 'Slash through dimensions',
    emoji: '🎮',
    path: '/examples/strider-demo-3d/code.js',
    category: 'platformer',
    color1: '#7209B7',
    color2: '#F72585',
  },
  {
    id: 'demoscene',
    name: 'DEMO∞SCENE',
    description: 'Audiovisual hypnosis',
    emoji: '✨',
    path: '/examples/demoscene/code.js',
    category: 'demo',
    color1: '#4CC9F0',
    color2: '#4361EE',
  },
  {
    id: 'space-combat',
    name: 'VOID HUNTER',
    description: 'Deep space warfare',
    emoji: '🚀',
    path: '/examples/star-fox-nova-3d/code.js',
    category: 'racing',
    color1: '#FF006E',
    color2: '#3A0CA3',
  },
  {
    id: 'minecraft',
    name: 'VOXEL REALM',
    description: 'Infinite procedural worlds',
    emoji: '⛏️',
    path: '/examples/minecraft-demo/code.js',
    category: 'adventure',
    color1: '#06FFA5',
    color2: '#FFB703',
  },
];

export function GameLauncher() {
  const launchApp = useAppStore((state) => state.launchApp);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const launchGame = (game: Game) => {
    // Determine the nova64 console base URL
    // Check if we're running on the OS shell's dev server (port 3000/3001)
    const isOsShellDevServer = window.location.hostname === 'localhost' && 
                               (window.location.port === '3000' || window.location.port === '3001');
    
    // If on OS shell dev server, point to main nova64 dev server (5173)
    // If on main server or production, use root of current origin
    const baseUrl = isOsShellDevServer ? 'http://localhost:5173' : window.location.origin;
    
    // Open the console page with the game path
    const gameUrl = `${baseUrl}/console.html?path=${encodeURIComponent(game.path)}`;
    console.log('🎮 Launching game:', game.name, 'at', gameUrl);
    
    window.open(gameUrl, `nova64-${game.id}`, 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const createNewGame = () => {
    launchApp('studio');
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0a', position: 'relative' }}>
      {/* Hero */}
      <div style={{ padding: '48px 32px', background: 'linear-gradient(135deg, #FF006E, #8338EC, #3A0CA3)', borderBottom: '4px solid #FF006E' }}>
        <h1 style={{ margin: 0, fontSize: 48, fontWeight: 900, color: '#FFF', textShadow: '0 0 20px #FF006E', letterSpacing: '3px' }}>⚡ NOVA64 ARCADE</h1>
      </div>
      
      {/* Games */}
      <div style={{ padding: 32 }}>
        <button onClick={createNewGame} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #06FFA5, #00D9FF)', border: '3px solid #06FFA5', borderRadius: 8, cursor: 'pointer', fontWeight: 900, fontSize: 16, color: '#000', marginBottom: 24 }}>
          ⚡ CREATE NEW GAME
        </button>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {GAMES.map((game) => (
            <div
              key={game.id}
              onClick={() => launchGame(game)}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              style={{
                background: hoveredGame === game.id ? `linear-gradient(135deg, ${game.color1}, ${game.color2})` : '#1a1a1a',
                border: `3px solid ${hoveredGame === game.id ? game.color1 : '#333'}`,
                borderRadius: 12,
                cursor: 'pointer',
                padding: 20,
                transition: 'all 0.3s',
                transform: hoveredGame === game.id ? 'translateY(-8px) scale(1.03)' : 'scale(1)',
                boxShadow: hoveredGame === game.id ? `0 0 40px ${game.color1}` : '0 4px 12px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ fontSize: 60, textAlign: 'center', marginBottom: 16, filter: `drop-shadow(0 0 20px ${game.color1})` }}>{game.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: hoveredGame === game.id ? '#FFF' : game.color1, textAlign: 'center', marginBottom: 8 }}>{game.name}</div>
              <div style={{ fontSize: 13, color: hoveredGame === game.id ? '#FFF' : '#888', textAlign: 'center' }}>{game.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
