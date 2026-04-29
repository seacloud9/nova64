import { useState } from 'react';
import { novaContext } from '../os/context';
import { GAMES, type Game } from './gameCatalog';

export function GameLauncher() {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  const launchGame = (game: Game) => {
    novaContext.launchApp('cart-runner', {
      path: game.path,
      windowTitle: '🕹️ ' + game.name,
      width: 1100,
      height: 750,
    });
  };

  const createNewGame = () => {
    novaContext.launchApp('studio');
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0a0a0a', position: 'relative' }}>
      {/* Hero */}
      <div
        style={{
          padding: '48px 32px',
          background: 'linear-gradient(135deg, #FF006E, #8338EC, #3A0CA3)',
          borderBottom: '4px solid #FF006E',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            color: '#FFF',
            textShadow: '0 0 20px #FF006E',
            letterSpacing: '3px',
          }}
        >
          ⚡ NOVA64 ARCADE
        </h1>
      </div>

      {/* Games */}
      <div style={{ padding: 32 }}>
        <button
          onClick={createNewGame}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #06FFA5, #00D9FF)',
            border: '3px solid #06FFA5',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 900,
            fontSize: 16,
            color: '#000',
            marginBottom: 24,
          }}
        >
          ⚡ CREATE NEW GAME
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {GAMES.map(game => (
            <div
              key={game.id}
              onClick={() => launchGame(game)}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              style={{
                background:
                  hoveredGame === game.id
                    ? `linear-gradient(135deg, ${game.color1}, ${game.color2})`
                    : '#1a1a1a',
                border: `3px solid ${hoveredGame === game.id ? game.color1 : '#333'}`,
                borderRadius: 12,
                cursor: 'pointer',
                padding: 20,
                transition: 'all 0.3s',
                transform: hoveredGame === game.id ? 'translateY(-8px) scale(1.03)' : 'scale(1)',
                boxShadow:
                  hoveredGame === game.id
                    ? `0 0 40px ${game.color1}`
                    : '0 4px 12px rgba(0,0,0,0.8)',
              }}
            >
              <div
                style={{
                  fontSize: 60,
                  textAlign: 'center',
                  marginBottom: 16,
                  filter: `drop-shadow(0 0 20px ${game.color1})`,
                }}
              >
                {game.emoji}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: hoveredGame === game.id ? '#FFF' : game.color1,
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {game.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: hoveredGame === game.id ? '#FFF' : '#888',
                  textAlign: 'center',
                }}
              >
                {game.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
