// Game Window Component - Launches nova64 games in windows
import { useEffect, useRef } from 'react';

interface GameWindowProps {
  gamePath: string;
  gameName: string;
}

export function GameWindow({ gamePath, gameName }: GameWindowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Load and run the game
    const loadGame = async () => {
      try {
        console.log(`🎮 Loading game: ${gameName} from ${gamePath}`);
        
        // In a real implementation, you would:
        // 1. Load the game code from the path
        // 2. Initialize nova64 context for this canvas
        // 3. Execute the game code
        
        // For now, show a message
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#00FF00';
          ctx.font = '20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`🎮 ${gameName}`, 320, 150);
          ctx.fillStyle = '#FFF';
          ctx.font = '14px monospace';
          ctx.fillText('Game loading...', 320, 180);
          ctx.fillText(`Path: ${gamePath}`, 320, 200);
          ctx.fillStyle = '#888';
          ctx.font = '12px monospace';
          ctx.fillText('(Full game integration coming soon)', 320, 240);
        }
      } catch (error) {
        console.error('Error loading game:', error);
      }
    };

    loadGame();
  }, [gamePath, gameName]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      background: '#000', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          imageRendering: 'pixelated',
          border: '2px solid #00FFFF',
          boxShadow: '0 0 20px rgba(0,255,255,0.3)',
        }}
      />
    </div>
  );
}
