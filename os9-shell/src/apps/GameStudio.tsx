import { useState, useEffect } from 'react';
import { filesystem } from '../os/filesystem';

const STARTER_CODE = `// nova64 Game Template
// Learn more: https://github.com/seacloud9/nova64

// Initialize your game
function init() {
  console.log('🎮 Game initialized!');
  
  // Example: Create a 3D scene
  // novaContext.scene3d.create();
  // novaContext.scene3d.addCube({ x: 0, y: 0, z: -5 });
  
  // Example: 2D rendering
  // novaContext.draw.rect(100, 100, 50, 50, '#FF0000');
}

// Game loop
function update(deltaTime) {
  // Update game logic here
}

function render() {
  // Draw your game here
  // novaContext.draw.clear('#000000');
}

// Start the game
init();

// Main game loop
function gameLoop() {
  const deltaTime = 1/60;
  update(deltaTime);
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
`;

export function GameStudio() {
  const [code, setCode] = useState(STARTER_CODE);
  const [fileName, setFileName] = useState('my-game.js');
  const [output, setOutput] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load saved game if exists
    filesystem.read('/Games/' + fileName).then((content) => {
      if (typeof content === 'string') {
        setCode(content);
      }
    }).catch(() => {
      // File doesn't exist yet
    });
  }, [fileName]);

  const saveGame = async () => {
    try {
      await filesystem.write('/Games/' + fileName, code);
      setIsSaved(true);
      setOutput((prev) => [...prev, `✅ Saved: ${fileName}`]);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      setOutput((prev) => [...prev, `❌ Error saving: ${error}`]);
    }
  };

  const runGame = () => {
    setOutput([]);
    
    // Intercept console.log
    const oldLog = console.log;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      oldLog(...args);
    };

    try {
      // Create a sandboxed function
      const gameFunction = new Function('novaContext', code);
      
      // Run the game code
      if (typeof window !== 'undefined' && (window as any).novaContext) {
        gameFunction((window as any).novaContext);
      } else {
        gameFunction({});
      }
      
      setOutput(['🎮 Game started!', ...logs]);
    } catch (error: any) {
      setOutput(['❌ Error: ' + error.message]);
    } finally {
      console.log = oldLog;
    }
  };

  const newGame = () => {
    if (confirm('Create a new game? Unsaved changes will be lost.')) {
      setCode(STARTER_CODE);
      setFileName('my-game.js');
      setOutput([]);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1E1E1E' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '10px 16px',
          background: 'linear-gradient(180deg, #4A4A4A 0%, #2A2A2A 100%)',
          borderBottom: '3px solid #000',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          fontSize: 18,
          marginRight: 12,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}>💻</div>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '2px solid #000',
            borderRadius: 6,
            fontFamily: 'Monaco, monospace',
            flex: 1,
            maxWidth: 250,
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            fontSize: 13,
            fontWeight: 'bold',
          }}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={newGame}
          style={{
            padding: '6px 16px',
            background: 'linear-gradient(180deg, #606060 0%, #404040 100%)',
            border: '2px solid #000',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            color: '#FFFFFF',
            fontWeight: 'bold',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #707070 0%, #505050 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #606060 0%, #404040 100%)';
          }}
        >
          📄 New
        </button>
        <button
          onClick={saveGame}
          style={{
            padding: '6px 16px',
            background: isSaved ? 'linear-gradient(180deg, #90EE90 0%, #60DD60 100%)' : 'linear-gradient(180deg, #6FA3EF 0%, #4A7FD0 100%)',
            border: '2px solid #000',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)';
          }}
        >
          💾 {isSaved ? 'Saved!' : 'Save'}
        </button>
        <button
          onClick={runGame}
          style={{
            padding: '8px 20px',
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
            border: '3px solid #000',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.4)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.4), 0 5px 12px rgba(255,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.4)';
          }}
        >
          ▶️ RUN GAME
        </button>
      </div>

      {/* Code Editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            padding: 12,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.5,
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: '#1E1E1E',
            color: '#D4D4D4',
            caretColor: '#FFFFFF',
          }}
        />
        
        {/* Output Console */}
        <div
          style={{
            width: 320,
            borderLeft: '3px solid #000',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
            color: '#00FF00',
            fontFamily: 'Monaco, Menlo, monospace',
            fontSize: 12,
            padding: 16,
            overflow: 'auto',
            boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: 12, 
            color: '#00FF00',
            fontSize: 14,
            textShadow: '0 0 10px #00FF00',
            borderBottom: '2px solid #003300',
            paddingBottom: 8,
          }}>
            📟 CONSOLE OUTPUT
          </div>
          {output.length === 0 ? (
            <div style={{ 
              color: '#006600',
              fontStyle: 'italic',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              &gt; Ready. Click "RUN GAME" to execute...
            </div>
          ) : (
            output.map((line, i) => (
              <div key={i} style={{ 
                marginBottom: 6,
                paddingLeft: 8,
                borderLeft: '2px solid #003300',
                animation: `slideIn 0.3s ease-out ${i * 0.05}s both`,
              }}>
                <span style={{ color: '#00AA00', marginRight: 8 }}>&gt;</span>
                {line}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: '8px 16px',
          background: 'linear-gradient(180deg, #4A4A4A 0%, #2A2A2A 100%)',
          borderTop: '3px solid #000',
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          color: '#CCCCCC',
          fontWeight: 'bold',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ color: '#00DD00' }}>⚡ nova64 Game Studio v1.0</span>
        <span>
          📝 {code.split('\n').length} lines | 
          🔤 {code.length} chars | 
          {isSaved ? <span style={{ color: '#00DD00' }}> ✓ Saved</span> : <span style={{ color: '#FFAA00' }}> ● Modified</span>}
        </span>
      </div>
    </div>
  );
}
