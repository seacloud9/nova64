import { Nova64 } from '../runtime/console.js';
import { GpuThreeJS } from '../runtime/gpu-threejs.js';
import { stdApi } from '../runtime/api.js';
import { spriteApi } from '../runtime/api-sprites.js';
import { threeDApi } from '../runtime/api-3d.js';
import { editorApi } from '../runtime/editor.js';
import { physicsApi } from '../runtime/physics.js';
import { textInputApi } from '../runtime/textinput.js';
import { aabb, circle as circleCollision, raycastTilemap } from '../runtime/collision.js';
import { audioApi } from '../runtime/audio.js';
import { inputApi } from '../runtime/input.js';
import { storageApi } from '../runtime/storage.js';
import { screenApi } from '../runtime/screens.js';
import { skyboxApi } from '../runtime/api-skybox.js';
import { uiApi } from '../runtime/ui.js';
import { effectsApi } from '../runtime/api-effects.js';
import { voxelApi } from '../runtime/api-voxel.js';

const canvas = document.getElementById('screen');

// ONLY use Three.js renderer - Nintendo 64/PlayStation style 3D console
let gpu;
try { 
  gpu = new GpuThreeJS(canvas, 640, 360); 
  console.log('✅ Using Three.js renderer - Nintendo 64/PlayStation GPU mode');
}
catch (e) { 
  console.error('❌ Three.js renderer failed to initialize:', e);
  throw new Error('Fantasy console requires 3D GPU support (Three.js)');
}

const api = stdApi(gpu);
const sApi = spriteApi(gpu);
const threeDApi_instance = threeDApi(gpu);
const eApi = editorApi(sApi);
const pApi = physicsApi();
const tApi = textInputApi();
const aApi = audioApi();
const iApi = inputApi();
const stApi = storageApi('nova64');
const scrApi = screenApi();
const skyApi = skyboxApi(gpu);
const fxApi = effectsApi(gpu);
const vxApi = voxelApi(gpu);

// Create UI API - needs to be created after api is fully initialized
let uiApiInstance;

// gather and expose to global
const g = {};
api.exposeTo(g);
sApi.exposeTo(g);
threeDApi_instance.exposeTo(g);
eApi.exposeTo(g);
pApi.exposeTo(g);
tApi.exposeTo(g);
Object.assign(g, { aabb, circleCollision, raycastTilemap });
aApi.exposeTo(g);
iApi.exposeTo(g);
stApi.exposeTo(g);
scrApi.exposeTo(g);
skyApi.exposeTo(g);
fxApi.exposeTo(g);
vxApi.exposeTo(g);

// Now create UI API after g has rgba8 and other functions
uiApiInstance = uiApi(gpu, g);
uiApiInstance.exposeTo(g);

// Connect input system to UI system for mouse events
iApi.connectUI(uiApiInstance.setMousePosition, uiApiInstance.setMouseButton);

Object.assign(globalThis, g);
// inject camera ref into sprite system
if (g.getCamera) sApi.setCameraRef(g.getCamera());

const nova = new Nova64(gpu);

let paused = false;
let stepOnce = false;
let statsEl = document.getElementById('stats');

async function loadCart(path) {
  await nova.loadCart(path);
}

function attachUI() {
  const sel = document.getElementById('cart');
  const pauseBtn = document.getElementById('pause');
  const stepBtn = document.getElementById('step');
  const shotBtn = document.getElementById('shot');
  const editorBtn = document.getElementById('editor');

  sel.addEventListener('change', async () => {
    paused = false; pauseBtn.textContent = 'Pause';
    await loadCart(sel.value);
  });
  
  // Renderer is now fixed to Three.js only - no UI controls needed
  
  editorBtn.addEventListener('click', () => { openSpriteEditor(); });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  });
  stepBtn.addEventListener('click', () => { stepOnce = true; });
  shotBtn.addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'nova64.png'; a.click();
  });
}

let last = performance.now();
let uMs=0, dMs=0, fps=0;
let currentDt = 0;

// Expose timing functions globally
globalThis.getDeltaTime = () => currentDt;
globalThis.getFPS = () => fps;

function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last)/1000);
  currentDt = dt;
  last = now;

  if (!paused || stepOnce) {
    iApi.step();
    const u0 = performance.now();
    
    // Update cart first (for manual screen management)
    // Check if cart exists to prevent errors during scene transitions
    if (nova.cart && nova.cart.update) {
      nova.cart.update(dt);
    }
    
    // Then update screen manager (for automatic screen management)
    scrApi.manager.update(dt);
    
    const u1 = performance.now();
    uMs = u1 - u0;

    gpu.beginFrame();
    const d0 = performance.now();
    
    // Draw cart first (for manual rendering)
    // Check if cart exists to prevent errors during scene transitions
    if (nova.cart && nova.cart.draw) {
      nova.cart.draw();
    }
    
    // Then draw screen manager (for automatic screen rendering)
    scrApi.manager.draw();
    
    const d1 = performance.now();
    dMs = d1 - d0;
    gpu.endFrame();
  }
  if (stepOnce) { stepOnce = false; }

  fps = Math.round(1000 / (performance.now() - now));
  
  // 3D GPU stats
  let statsText = `3D GPU (Three.js) • fps: ${fps}, update: ${uMs.toFixed(2)}ms, draw: ${dMs.toFixed(2)}ms`;
  
  // Add 3D stats if available
  if (typeof get3DStats === 'function') {
    const stats3D = get3DStats();
    if (stats3D.render) {
      statsText += ` • triangles: ${stats3D.render.triangles}, calls: ${stats3D.render.calls}`;
    }
  }
  
  statsEl.textContent = statsText;
  requestAnimationFrame(loop);
}

attachUI();
// default cart - load simple 3D demo first
(async () => {
  await loadCart('/examples/hello-3d/code.js');
  requestAnimationFrame(loop);
})();