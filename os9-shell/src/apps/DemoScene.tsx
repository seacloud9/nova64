import { useState, useEffect, useRef } from 'react';

export function DemoScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const moduleRefs = useRef<{
    gpu?: unknown;
    init?: () => void | Promise<void>;
    update?: (dt: number) => void;
    draw?: () => void;
  }>({});

  useEffect(() => {
    let mounted = true;
    let lastTime = performance.now();
    let gpuInstance: unknown = null;

    const loadAndRunDemoScene = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not found');
        }

        console.log('🎬 Loading DemoScene...');
        setIsLoading(true);

        const baseUrl = window.location.origin;

        // Load all required modules
        const [
          gpuModule,
          apiModule,
          api3dModule,
          inputModule,
          uiModule,
          skyboxModule,
          fxModule,
        ] = await Promise.all([
          import(/* @vite-ignore */ `${baseUrl}/runtime/gpu-threejs.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-3d.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/input.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/ui.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-skybox.js`),
          import(/* @vite-ignore */ `${baseUrl}/runtime/api-effects.js`),
        ]);

        const { GpuThreeJS } = gpuModule;
        const { stdApi } = apiModule;
        const { threeDApi } = api3dModule;
        const { inputApi } = inputModule;
        const { uiApi } = uiModule;
        const { skyboxApi } = skyboxModule;
        const { effectsApi } = fxModule;

        // Initialize GPU with the canvas
        const gpu = new GpuThreeJS(canvas, 640, 360);
        moduleRefs.current.gpu = gpu;
        gpuInstance = gpu;

        // Initialize APIs
        const api = stdApi(gpu);
        const threeDApi_instance = threeDApi(gpu);
        const iApi = inputApi();
        const skybox = skyboxApi(gpu);
        const fx = effectsApi(gpu);

        // Create temp object for UI init
        const g: Record<string, unknown> = {};
        api.exposeTo(g);
        const ui = uiApi(gpu, g);

        // Expose all APIs to window
        api.exposeTo(window);
        threeDApi_instance.exposeTo(window);
        iApi.exposeTo(window);
        ui.exposeTo(window);
        skybox.exposeTo(window);
        fx.exposeTo(window);

        console.log('✅ APIs loaded and exposed');

        // Load the demoscene code
        const response = await fetch(`${baseUrl}/examples/demoscene/code.js`);
        if (!response.ok) {
          throw new Error(`Failed to load demoscene: ${response.statusText}`);
        }

        const code = await response.text();
        console.log('📝 DemoScene code loaded:', code.length, 'characters');

        // Process the code to handle ES6 modules
        let processedCode = code;
        processedCode = processedCode.replace(/export\s+async\s+function/g, 'async function');
        processedCode = processedCode.replace(/export\s+function/g, 'function');
        processedCode = processedCode.replace(/export\s+const/g, 'const');
        processedCode = processedCode.replace(/export\s+let/g, 'let');
        processedCode = processedCode.replace(/export\s+default\s+/g, '');
        processedCode = processedCode.replace(/export\s*\{[^}]*\}\s*;?/g, '');

        // Execute the code
        console.log('⚡ Executing demoscene code...');
        (0, eval)(processedCode);

        // Get the game functions
        const w = window as { 
          init?: () => void | Promise<void>; 
          update?: (dt: number) => void; 
          draw?: () => void;
        };

        moduleRefs.current.init = w.init;
        moduleRefs.current.update = w.update;
        moduleRefs.current.draw = w.draw;

        // Call init if it exists
        if (moduleRefs.current.init) {
          console.log('🎬 Calling init()...');
          const initResult = moduleRefs.current.init();
          if (initResult instanceof Promise) {
            await initResult;
          }
          console.log('✅ Init completed');
        }

        if (!mounted) return;

        setIsLoading(false);
        console.log('✅ DemoScene ready!');

        // Start game loop
        const gameLoop = () => {
          if (!mounted) return;

          const now = performance.now();
          const dt = Math.min(0.1, (now - lastTime) / 1000);
          lastTime = now;

          // Update input
          iApi.step();

          // Update game logic
          if (moduleRefs.current.update) {
            try {
              moduleRefs.current.update(dt);
            } catch (e) {
              console.error('Error in update():', e);
            }
          }

          // Render
          try {
            gpu.beginFrame();
            if (moduleRefs.current.draw) {
              moduleRefs.current.draw();
            }
            gpu.endFrame();
          } catch (e) {
            console.error('Error in draw():', e);
          }

          animationFrameRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoop();

      } catch (err) {
        console.error('❌ Error loading DemoScene:', err);
        if (mounted) {
          setError((err as Error).message);
          setIsLoading(false);
        }
      }
    };

    loadAndRunDemoScene();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Cleanup GPU resources
      const gpu = gpuInstance as { dispose?: () => void };
      if (gpu && typeof gpu.dispose === 'function') {
        gpu.dispose();
      }
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      position: 'relative'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00ffff',
          fontSize: '24px',
          fontFamily: 'monospace',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div>✨ LOADING DEMOSCENE ✨</div>
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            Initializing post-processing effects...
          </div>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ff0000',
          fontSize: '16px',
          fontFamily: 'monospace',
          textAlign: 'center',
          padding: '20px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          borderRadius: '8px',
          zIndex: 10
        }}>
          <div>❌ Error Loading DemoScene</div>
          <div style={{ fontSize: '12px', marginTop: '10px' }}>{error}</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          imageRendering: 'auto', // Allow post-processing smooth rendering
          display: isLoading ? 'none' : 'block'
        }}
      />
    </div>
  );
}
