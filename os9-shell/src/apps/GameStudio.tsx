import { useState, useEffect, useRef } from 'react';
import { filesystem } from '../os/filesystem';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface DemoWithPath {
  name: string;
  path: string;
}

interface DemoWithCode {
  name: string;
  code: string;
}

type DemoExample = DemoWithPath | DemoWithCode;

const DEMO_EXAMPLES: Record<string, DemoExample> = {
  'fzero': {
    name: '🏎️ F-ZERO Racing',
    path: '/examples/f-zero-nova-3d/code.js',
  },
  'knight': {
    name: '⚔️ Knight Platformer',
    path: '/examples/strider-demo-3d/code.js',
  },
  'demoscene': {
    name: '✨ Demoscene',
    path: '/examples/demoscene/code.js',
  },
  'space-combat': {
    name: '🚀 Space Combat',
    path: '/examples/star-fox-nova-3d/code.js',
  },
  'minecraft': {
    name: '⛏️ Voxel Realm',
    path: '/examples/minecraft-demo/code.js',
  },
  'cyberpunk': {
    name: '🌆 Cyberpunk City',
    path: '/examples/cyberpunk-city-3d/code.js',
  },
};

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
  const [showDemos, setShowDemos] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Refs for editor
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    const startState = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCode(update.state.doc.toString());
            setIsSaved(false);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [code]);

  // Update editor content when code changes externally (e.g., loading demos)
  useEffect(() => {
    const view = editorViewRef.current;
    if (view && view.state.doc.toString() !== code) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: code,
        },
      });
    }
  }, [code]);

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

  const runGame = async () => {
    console.log('🎮 runGame called');
    setOutput(['Starting game preview...']);
    setShowPreview(true);

    setTimeout(async () => {
      console.log('🎮 setTimeout callback starting');
      const canvas = document.getElementById('game-preview-canvas') as HTMLCanvasElement;
      console.log('🎮 Canvas element:', canvas);
      
      if (!canvas) {
        const msg = 'Canvas not ready';
        console.error('❌', msg);
        setOutput(prev => [...prev, msg]);
        return;
      }

      try {
        console.log('🎮 Starting module loading...');
        setOutput(prev => [...prev, 'Loading Nova64 runtime...']);
        
        const baseUrl = window.location.origin;
        console.log('🎮 Base URL:', baseUrl);
        
        // Load all required modules
        console.log('🎮 Importing modules...');
        const [
          gpuModule,
          apiModule,
          api3dModule,
          inputModule,
          uiModule,
          skyboxModule,
          api2dModule,
        ] = await Promise.all([
          import(/* @vite-ignore */ `${baseUrl}/runtime/gpu-threejs.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-3d.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/input.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/ui.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-skybox.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-2d.js`),
        ]);

        console.log('✅ Modules loaded:', { gpuModule, apiModule, api3dModule, inputModule, uiModule, skyboxModule, api2dModule });

        const { GpuThreeJS } = gpuModule;
        const { stdApi } = apiModule;
        const { threeDApi } = api3dModule;
        const { inputApi } = inputModule;
        const { uiApi } = uiModule;
        const { skyboxApi } = skyboxModule;
        const { api2d } = api2dModule;

        setOutput(prev => [...prev, 'Runtime loaded']);
        setOutput(prev => [...prev, 'Initializing graphics...']);

        console.log('🎨 Initializing GPU...');
        // Initialize GPU
        const gpu = new GpuThreeJS(canvas, 640, 360);
        console.log('✅ GPU initialized:', gpu);

        // Initialize APIs
        console.log('🎨 Initializing APIs...');
        const api = stdApi(gpu);
        const threeDApi_instance = threeDApi(gpu);
        const iApi = inputApi();
        const skybox = skyboxApi(gpu);
        const api2d_instance = api2d(gpu);
        
        // Create a temporary object to hold API functions for UI initialization
        const g: Record<string, unknown> = {};
        api.exposeTo(g);
        
        // Now initialize UI with the g object that has rgba8 and other functions
        const ui = uiApi(gpu, g);
        console.log('✅ APIs initialized');

        setOutput(prev => [...prev, 'Graphics initialized']);
        setOutput(prev => [...prev, 'Setting up API functions...']);

        // Make API functions available globally for the game code
        // Use the exposeTo method that each API provides
        console.log('🌍 Setting up global API functions...');
        api.exposeTo(window);
        threeDApi_instance.exposeTo(window);
        iApi.exposeTo(window);
        ui.exposeTo(window);
        skybox.exposeTo(window);
        api2d_instance.exposeTo(window);
        
        // Create simplified 3D API wrappers for easier use in demos
        // These provide a simpler interface similar to PICO-8 3D functions
        interface GameWindow extends Window {
          rect3d?: (x: number, y: number, z: number, w: number, h: number, d: number, color: bigint | number) => void;
          setCamera?: (x: number, y: number, z: number) => void;
          lookAt?: (x: number, y: number, z: number) => void;
          createCube?: (size: number, color: number, position: number[], options?: unknown) => number;
          setCameraPosition?: (x: number, y: number, z: number) => void;
          setCameraTarget?: (x: number, y: number, z: number) => void;
          clearScene?: () => void;
          setPosition?: (meshId: number, x: number, y: number, z: number) => void;
          setScale?: (meshId: number, x: number, y: number, z: number) => void;
        }
        
        const win = window as GameWindow;
        
        win.rect3d = (x: number, y: number, z: number, w: number, h: number, d: number, color: bigint | number) => {
          // For immediate mode rendering, we create cubes each frame
          // Convert bigint color to hex number if needed
          let hexColor = 0xffffff;
          if (typeof color === 'bigint') {
            // Extract RGB from rgba8 format (simplified)
            hexColor = Number((color >> 32n) & 0xffffffn);
          } else {
            hexColor = color;
          }
          
          if (win.createCube && win.setPosition && win.setScale) {
            const meshId = win.createCube(1, hexColor, [x, y, z]);
            if (meshId !== null && meshId !== undefined) {
              win.setScale(meshId, w, h, d);
            }
          }
        };
        
        win.setCamera = (x: number, y: number, z: number) => {
          if (win.setCameraPosition) {
            win.setCameraPosition(x, y, z);
          }
        };
        
        win.lookAt = (x: number, y: number, z: number) => {
          if (win.setCameraTarget) {
            win.setCameraTarget(x, y, z);
          }
        };
        
        // Add circfill wrapper for filled circles (used in demoscene)
        interface CircleWindow extends Window {
          circle?: (x: number, y: number, r: number, color: bigint | number, fill?: boolean) => void;
          circfill?: (x: number, y: number, r: number, color: bigint | number) => void;
        }
        const circWin = window as CircleWindow;
        
        if (circWin.circle) {
          circWin.circfill = (x: number, y: number, r: number, color: bigint | number) => {
            if (circWin.circle) {
              circWin.circle(x, y, r, color, true);
            }
          };
        }
        
        console.log('✅ Global API functions ready');

        setOutput(prev => [...prev, 'Executing your code...']);

        console.log('📝 User code length:', code.length);
        console.log('📝 User code preview:', code.substring(0, 200));

        // Process the code to handle ES6 modules
        // Remove export statements and make functions available globally
        let processedCode = code;
        
        // Remove 'export async function' and 'export function' - convert to regular functions
        processedCode = processedCode.replace(/export\s+async\s+function/g, 'async function');
        processedCode = processedCode.replace(/export\s+function/g, 'function');
        
        // Remove 'export const' and 'export let' - convert to regular declarations
        processedCode = processedCode.replace(/export\s+const/g, 'const');
        processedCode = processedCode.replace(/export\s+let/g, 'let');
        
        // Remove any standalone 'export default' or 'export { ... }'
        processedCode = processedCode.replace(/export\s+default\s+/g, '');
        processedCode = processedCode.replace(/export\s*\{[^}]*\}\s*;?/g, '');
        
        // Execute the user's code in the global context
        // Use indirect eval to execute in global scope
        console.log('⚡ Executing code in global scope...');
        (0, eval)(processedCode);
        console.log('✅ Code executed');

        setOutput(prev => [...prev, 'Code executed successfully!']);
        setOutput(prev => [...prev, 'Starting game loop...']);

        // Check if update, draw, and init functions were defined
        const w = window as { 
          init?: () => void | Promise<void>; 
          update?: (dt: number) => void; 
          draw?: () => void;
        };
        const init = w.init;
        const update = w.update;
        const draw = w.draw;

        console.log('🔍 Checking for game functions:', { 
          hasInit: !!init,
          hasUpdate: !!update, 
          hasDrawFunc: !!draw,
          initType: typeof init,
          updateType: typeof update,
          drawType: typeof draw
        });

        // Call init if it exists
        if (init && typeof init === 'function') {
          console.log('🎬 Calling init()...');
          setOutput(prev => [...prev, 'Initializing game...']);
          try {
            const initResult = init();
            if (initResult instanceof Promise) {
              await initResult;
              console.log('✅ Async init() completed');
            } else {
              console.log('✅ Init() completed');
            }
            setOutput(prev => [...prev, 'Game initialized!']);
          } catch (e) {
            console.error('❌ Error in init():', e);
            setOutput(prev => [...prev, `❌ Init error: ${(e as Error).message}`]);
          }
        }

        if (!update && !draw) {
          const msg = '⚠️ Warning: No update() or draw() functions found';
          console.warn(msg);
          setOutput(prev => [...prev, msg]);
        }

        // Start the game loop
        console.log('🔄 Starting game loop...');
        let lastTime = performance.now();
        let frameCount = 0;

        const gameLoop = () => {
          const now = performance.now();
          const dt = Math.min(0.1, (now - lastTime) / 1000);
          lastTime = now;
          frameCount++;

          if (frameCount === 1) {
            console.log('🎬 First frame rendering...');
          }

          // Step input system to update button states
          iApi.step();

          // Call update if it exists
          if (update && typeof update === 'function') {
            try {
              update(dt);
            } catch (e) {
              console.error('❌ Error in update():', e);
            }
          }

          // Render frame
          try {
            // Note: 3D scenes are persistent - meshes stay until explicitly removed
            // 2D canvas is cleared automatically by gpu.beginFrame()
            
            gpu.beginFrame();
            if (draw && typeof draw === 'function') {
              draw();
            }
            gpu.endFrame();
          } catch (e) {
            console.error('❌ Error in draw():', e);
          }

          if (frameCount === 1) {
            console.log('✅ First frame rendered');
          }

          requestAnimationFrame(gameLoop);
        };

        gameLoop();
        setOutput(prev => [...prev, '✅ Game is running!']);
        console.log('✅ Game loop started!');

      } catch (error) {
        const err = error as Error;
        const msg = `❌ Error: ${err.message}`;
        console.error('💥 Game execution error:', error);
        console.error('Stack:', err.stack);
        setOutput(prev => [...prev, msg]);
      }
    }, 100);
  };

  const loadDemo = async (demoKey: string) => {
    const demo = DEMO_EXAMPLES[demoKey];
    if (demo) {
      setOutput([`📚 Loading demo: ${demo.name}...`]);
      setShowDemos(false);
      
      // Check if demo has inline code or needs to be fetched
      if ('code' in demo) {
        setCode(demo.code as string);
        setFileName(`${demoKey}.js`);
        setOutput([`📚 Loaded demo: ${demo.name}`]);
      } else if ('path' in demo) {
        try {
          // Fetch the code from the path
          const response = await fetch(demo.path as string);
          if (!response.ok) {
            throw new Error(`Failed to load: ${response.statusText}`);
          }
          const gameCode = await response.text();
          setCode(gameCode);
          setFileName(`${demoKey}.js`);
          setOutput([`📚 Loaded demo: ${demo.name}`]);
        } catch (error) {
          const err = error as Error;
          setOutput([`❌ Failed to load demo: ${err.message}`]);
          console.error('Failed to load demo:', error);
        }
      }
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
      <style>{`
        .cm-editor {
          height: 100%;
          font-size: 13px;
        }
        .cm-scroller {
          overflow: auto;
          font-family: Monaco, Menlo, "Courier New", monospace;
        }
        .cm-content {
          padding: 12px;
        }
        .cm-gutters {
          background: #1E1E1E;
          border-right: 1px solid #333;
        }
      `}</style>
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
          onClick={() => setShowDemos(!showDemos)}
          style={{
            padding: '6px 16px',
            background: 'linear-gradient(180deg, #9B59B6 0%, #8E44AD 100%)',
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
            e.currentTarget.style.background = 'linear-gradient(180deg, #A569BD 0%, #9B59B6 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(180deg, #9B59B6 0%, #8E44AD 100%)';
          }}
        >
          📚 Demos
        </button>
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

      {/* Demo Selector */}
      {showDemos && (
        <div
          style={{
            background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)',
            borderBottom: '2px solid #000',
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)',
          }}
        >
          {Object.entries(DEMO_EXAMPLES).map(([key, demo]) => (
            <button
              key={key}
              onClick={() => loadDemo(key)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: '2px solid #000',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#FFFFFF',
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102,126,234,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
              }}
            >
              {demo.name}
            </button>
          ))}
        </div>
      )}

      {/* Code Editor */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div 
          ref={editorRef}
          style={{ 
            flex: 1, 
            overflow: 'auto', 
            background: '#1E1E1E',
            fontSize: 13,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
          }} 
        />
        
        {/* Right Panel - Preview/Console */}
        <div
          style={{
            width: 480,
            borderLeft: '3px solid #000',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.5)',
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #000',
            background: '#0a0a0a',
          }}>
            <button
              onClick={() => setShowPreview(true)}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: showPreview 
                  ? 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)'
                  : 'transparent',
                border: 'none',
                borderRight: '1px solid #000',
                borderBottom: showPreview ? '3px solid #00FFFF' : 'none',
                color: showPreview ? '#00FFFF' : '#666666',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textShadow: showPreview ? '0 0 10px #00FFFF' : 'none',
              }}
            >
              🎮 PREVIEW
            </button>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: !showPreview 
                  ? 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)'
                  : 'transparent',
                border: 'none',
                borderBottom: !showPreview ? '3px solid #00FF00' : 'none',
                color: !showPreview ? '#00FF00' : '#666666',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textShadow: !showPreview ? '0 0 10px #00FF00' : 'none',
              }}
            >
              📟 CONSOLE
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {showPreview ? (
              // Preview Panel with Canvas
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
                <canvas
                  id="game-preview-canvas"
                  width={640}
                  height={360}
                  style={{
                    border: '3px solid #00FFFF',
                    borderRadius: 8,
                    imageRendering: 'pixelated',
                    boxShadow: '0 0 20px rgba(0,255,255,0.3)',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              </div>
            ) : (
              // Console Panel
              <div
                style={{
                  flex: 1,
                  color: '#00FF00',
                  fontFamily: 'Monaco, Menlo, monospace',
                  fontSize: 12,
                  padding: 16,
                  overflow: 'auto',
                }}
              >
                {output.length === 0 ? (
                  <div style={{ color: '#006600' }}>
                    <div style={{ marginBottom: 12, fontStyle: 'italic' }}>
                      &gt; Game Studio Ready
                    </div>
                    <div style={{ marginBottom: 8, color: '#00AAAA' }}>
                      💡 Click <strong>📚 Demos</strong> to load example games
                    </div>
                    <div style={{ marginBottom: 8, color: '#00AAAA' }}>
                      💡 Edit your code in the editor
                    </div>
                    <div style={{ marginBottom: 8, color: '#00AAAA' }}>
                      💡 Click <strong>▶️ RUN GAME</strong> to preview
                    </div>
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,255,0,0.05)', border: '1px solid #003300', borderRadius: 4 }}>
                      <div style={{ color: '#00FF00', fontWeight: 'bold', marginBottom: 6 }}>🎮 AVAILABLE DEMOS:</div>
                      <div style={{ color: '#00AA00', fontSize: 11, lineHeight: 1.6 }}>
                        • 👋 Hello 3D World<br/>
                        • 🏃 Platformer Demo<br/>
                        • 🚀 Space Shooter
                      </div>
                    </div>
                  </div>
                ) : (
                  output.map((line, i) => (
                    <div key={i} style={{ 
                      marginBottom: 6,
                      paddingLeft: 8,
                      borderLeft: '2px solid #003300',
                    }}>
                      <span style={{ color: '#00AA00', marginRight: 8 }}>&gt;</span>
                      {line}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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
