# 🤖 Nova64 Ultimate 3D Fantasy Console - GitHub Copilot Development Guide

This comprehensive guide provides GitHub Copilot with detailed context for developing with the **Nova64 Ultimate 3D Fantasy Console** - a revolutionary JavaScript-based 3D game engine featuring Nintendo 64/PlayStation aesthetics with modern performance.

## 🚀 **Project Overview**

**Nova64** is a cutting-edge 3D fantasy console that combines retro gaming aesthetics with modern web technology:

### 🎯 **Core Architecture (v0.2.0)**
- **Three.js Rendering**: Hardware-accelerated 3D graphics with WebGL2 backend
- **ES6+ Modules**: Modern JavaScript with hot reloading and live updates
- **Hybrid 2D/3D**: Seamless combination of pixel art overlays and 3D worlds
- **Professional Materials**: Holographic, metallic, emissive, and animated surfaces
- **Advanced Lighting**: Multi-layered ambient, directional, and point lighting
- **100% Test Coverage**: 35+ API functions thoroughly validated

### 🏗️ **Technology Stack**
```javascript
// Core rendering engine
Three.js ^0.157.0        // 3D graphics, materials, lighting
Vite ^5.4.0             // Build system, hot reloading
ES2022 Modules          // Modern JavaScript features

// Development tools
Node.js 18+             // Runtime environment
pnpm                    // Package management (required)
VS Code                 // Recommended editor
```

## 🖥️ **Windows Development Environment**

**⚠️ IMPORTANT: On Windows machines, always use WSL (Windows Subsystem for Linux):**

```bash
# First, open WSL terminal, then set Node.js version
nvm use 20

# Now you can run pnpm commands
pnpm dev
```

**Key points:**
- Always use **WSL** on Windows (not PowerShell or CMD)
- Run `nvm use 20` before any pnpm commands  
- All pnpm commands should be executed inside WSL

## 🎮 **Quick Development Commands**

```bash
# 🔥 Start development server (hot reloading)
pnpm dev                # Usually http://localhost:5173

# 🏗️ Build optimized production version
pnpm build

# 👁️ Preview production build locally
pnpm preview

# ✅ Run complete test suite (35/35 tests)
pnpm test

# 📦 Install dependencies
pnpm install
```

## 🏗️ **Project Structure**

```
nova64/                          # 🏰 Ultimate 3D Fantasy Console
├── 📋 package.json             # Dependencies: Three.js, Vite
├── 🚀 src/main.js              # Main entry point & cart loader
├── 🎪 runtime/                 # 💎 Advanced 3D Engine Core
│   ├── 🎨 gpu-threejs.js       # Three.js GPU backend (primary)
│   ├── 📚 api.js               # Core 2D API (cls, print, pset, etc.)
│   ├── 🎯 api-3d.js            # Complete 3D API (35+ functions)
│   ├── 🖼️ api-sprites.js       # 2D sprite system with batching
│   ├── 🎮 input.js             # Enhanced input (WASD, gamepad, mouse)
│   ├── 🖥️ console.js           # Nova64 class with cart loading
│   ├── 🔊 audio.js             # Spatial 3D audio system
│   ├── ⚛️ physics.js           # 3D physics & collision detection
│   ├── 💾 storage.js           # Persistent game data
│   ├── ✍️ font.js              # Bitmap font rendering
│   └── 🎨 editor.js            # In-browser sprite editor
├── 🎪 examples/                # 🌟 Spectacular 3D Demo Gallery
│   ├── 🏰 mystical-realm-3d/   # Fantasy adventure world
│   ├── 🏛️ crystal-cathedral-3d/ # Ultimate graphics showcase
│   ├── 🚀 star-fox-nova-3d/    # Epic space combat
│   ├── 🏁 f-zero-nova-3d/      # High-speed racing
│   ├── 🌃 cyberpunk-city-3d/   # Neon metropolis
│   ├── ⚛️ physics-demo-3d/     # Advanced simulation
│   ├── 🔫 shooter-demo-3d/     # Intense space combat
│   └── ⚔️ strider-demo-3d/     # Fantasy platformer
├── 🧪 tests/                   # 100% test coverage
│   ├── test-3d-api.js          # 3D API validation
│   ├── test-gpu-threejs.js     # GPU backend testing
│   └── test-runner.html        # Test execution
└── 🎮 retroarch/               # RetroArch libretro core
    ├── nova64_libretro.c       # C implementation
    └── Makefile                # Cross-platform builds
```

## 🎯 **Nova64 Cart Development**

### 🎪 **Cart Structure (ES Modules)**
Nova64 carts are JavaScript ES modules that create immersive 3D experiences:

```javascript
// 🌟 Complete Nova64 3D cart template
let gameState = {
  player: { x: 0, y: 1, z: 0 },
  objects: [],
  score: 0,
  time: 0
};

// 🏗️ Initialize 3D scene, load assets, setup lighting
export function init() {
  console.log("🚀 Initializing spectacular 3D world...");
  
  // 📷 Professional camera setup
  setCameraPosition(0, 8, 15);       // Behind and above origin
  setCameraTarget(0, 2, 0);          // Look at player level
  setCameraFOV(75);                  // Wide-angle view
  
  // 🌫️ Atmospheric effects for immersion
  setFog(0x1a1a2e, 10, 30);         // Deep purple distance fog
  
  // 💡 Advanced lighting system
  setAmbientLight(0x404080, 0.3);    // Cool ambient light
  setDirectionalLight(0xffffff, 0.8); // Strong sun light
  
  // 🌍 Create immersive world
  createWorld();
}

// 🎮 Handle input, update game logic, animate objects
export function update() {
  gameState.time += 0.016; // 60 FPS delta time
  
  // 🎮 Enhanced WASD + gamepad input
  const moveSpeed = 0.15;
  if (key('KeyW') || btn(2)) gameState.player.z -= moveSpeed;
  if (key('KeyS') || btn(3)) gameState.player.z += moveSpeed;
  if (key('KeyA') || btn(0)) gameState.player.x -= moveSpeed;
  if (key('KeyD') || btn(1)) gameState.player.x += moveSpeed;
  if (key('Space') || btn(4)) gameState.player.y += 0.1;
  
  // ⚛️ Apply physics
  gameState.player.y -= 0.02; // Gravity
  if (gameState.player.y < 1) gameState.player.y = 1; // Ground
  
  // 🎪 Animate world objects
  animateObjects();
  
  // 📷 Smooth camera following
  updateCamera();
}

// 🎨 Render 3D scene + 2D HUD overlay
export function draw() {
  // 🎯 3D scene renders automatically via draw3d()
  draw3d(() => {
    // All 3D objects render with advanced materials
    renderPlayer();
    renderWorld();
    renderEffects();
  });
  
  // 📊 Professional HUD system (2D overlay)
  cls(); // Clear transparent overlay
  
  // 🏆 Game UI with modern styling
  print(`🏆 SCORE: ${gameState.score}`, 10, 10, 0xffffff);
  print(`⚡ ENERGY: ${'█'.repeat(10)}`, 10, 26, 0x44ff88);
  print(`🌍 POSITION: ${Math.floor(gameState.player.x)}, ${Math.floor(gameState.player.z)}`, 10, 42, 0x4488ff);
  
  // 🎮 Control instructions
  print('WASD: Move • Space: Jump • Mouse: Look', 10, 165, 0x888888);
}

// 🌟 Helper functions for 3D world creation
function createWorld() {
  // 🌍 Ground plane with realistic materials
  const ground = createPlane(0, 0, 0, 50, 50, {
    material: 'standard',
    color: 0x2a4d3a,     // Forest green
    roughness: 0.8       // Natural surface
  });
  rotateMesh(ground, -Math.PI/2, 0, 0);
  
  // ✨ Magical crystal array
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const crystal = createCube(
      Math.cos(angle) * 8,  // Circular formation
      2,                    // Floating height
      Math.sin(angle) * 8,
      1,
      {
        material: 'holographic', // Ultimate visual effect
        color: 0xff0088,         // Hot pink
        emissive: 0x440022       // Subtle glow
      }
    );
    gameState.objects.push({ mesh: crystal, spin: i * 0.1 });
  }
}

function renderPlayer() {
  // 👤 Player representation with metallic materials
  const playerMesh = createCube(
    gameState.player.x,
    gameState.player.y,
    gameState.player.z,
    1,
    {
      material: 'metallic',
      color: 0x0088ff,
      emissive: 0x002244,
      metalness: 0.9,
      roughness: 0.1
    }
  );
}

function animateObjects() {
  // 🎪 Spectacular object animations
  gameState.objects.forEach(obj => {
    obj.spin += 0.03;
    rotateMesh(obj.mesh, obj.spin, obj.spin * 1.3, obj.spin * 0.7);
    
    // 🌊 Floating motion
    const pos = getMeshPosition(obj.mesh);
    const floatY = 2 + Math.sin(gameState.time * 2 + obj.spin) * 0.5;
    setPosition(obj.mesh, pos.x, floatY, pos.z);
  });
}

function updateCamera() {
  // 📷 Cinematic camera following with smooth interpolation
  const offsetX = 8, offsetY = 6, offsetZ = 12;
  setCameraPosition(
    gameState.player.x + offsetX,
    gameState.player.y + offsetY,
    gameState.player.z + offsetZ
  );
  setCameraTarget(
    gameState.player.x,
    gameState.player.y + 1,
    gameState.player.z
  );
}
```

### 🎯 **Cart Loading System**
To test your cart, modify the import path in `src/main.js` (around line 109):

```javascript
// 🎮 Change this line to load your spectacular cart
import * as cart from '../examples/your-amazing-3d-world/code.js';
```

## 🎨 **Complete Nova64 3D API Reference**

### 🏗️ **3D Object Creation (Advanced Materials)**

```javascript
// 🎯 Core 3D primitives with professional materials
createCube(x, y, z, size, options)      // Versatile cubes
createSphere(x, y, z, radius, options)  // Smooth spheres  
createPlane(x, y, z, width, height, options) // Planes & terrain

// 🎨 Advanced material options
{
  material: 'standard' | 'metallic' | 'holographic' | 'emissive',
  color: 0xRRGGBB,        // Base color (default: 0xffffff)
  emissive: 0xRRGGBB,     // Glow color (default: 0x000000)
  metalness: 0.0-1.0,     // Metallic reflection (default: 0.5)
  roughness: 0.0-1.0,     // Surface roughness (default: 0.5)
  transparent: boolean,   // Enable transparency
  opacity: 0.0-1.0,      // Transparency level
  wireframe: boolean      // Show wireframe
}

// 🌟 Material examples
const metalSphere = createSphere(0, 2, -5, 1.5, {
  material: 'metallic',
  color: 0x4488ff,
  metalness: 0.9,
  roughness: 0.1
});

const holoCube = createCube(3, 1, -3, 1, {
  material: 'holographic',
  color: 0x00ff88,
  emissive: 0x004400,
  transparent: true,
  opacity: 0.8
});
```

### 📐 **3D Object Manipulation**

```javascript
// ⚡ Transform operations (all take mesh reference from create functions)
setPosition(mesh, x, y, z)      // Absolute positioning
setRotation(mesh, x, y, z)      // Absolute rotation (radians)
setScale(mesh, x, y, z)         // Scale factors
rotateMesh(mesh, x, y, z)       // Additive rotation
moveMesh(mesh, x, y, z)         // Additive movement
removeMesh(mesh)                // Remove from scene

// 📊 Query functions
getMeshPosition(mesh)           // Returns [x, y, z]
getMeshRotation(mesh)           // Returns [x, y, z] radians
getMeshScale(mesh)              // Returns [x, y, z]
```

### 📷 **Advanced Camera System**

```javascript
// 🎥 Professional camera controls
setCameraPosition(x, y, z)      // Camera world position
setCameraTarget(x, y, z)        // Look-at target
setCameraFOV(degrees)           // Field of view (default: 75)

// 🎪 Camera animation helpers
function smoothCameraFollow(target, offset, speed = 0.1) {
  const currentPos = getCameraPosition();
  const targetPos = {
    x: target.x + offset.x,
    y: target.y + offset.y,
    z: target.z + offset.z
  };
  
  setCameraPosition(
    lerp(currentPos.x, targetPos.x, speed),
    lerp(currentPos.y, targetPos.y, speed),
    lerp(currentPos.z, targetPos.z, speed)
  );
}
```

### 🌫️ **Scene Effects & Lighting**

```javascript
// 🌫️ Atmospheric effects
setFog(color, near, far)        // Distance fog
clearFog()                      // Remove fog

// 💡 Advanced lighting system
setAmbientLight(color, intensity)        // Overall illumination
setDirectionalLight(color, intensity)    // Sun/moon lighting
setPointLight(x, y, z, color, intensity) // Local light sources

// 🎪 Visual enhancements
enablePostProcessing(enabled)    // ACES tone mapping + bloom
setRenderQuality('low'|'medium'|'high') // Performance vs quality
enablePixelation(factor)         // N64-style pixelation
enableDithering(enabled)         // Retro color dithering
```

### 🎮 **Enhanced Input System**

```javascript
// ⌨️ Keyboard input (modern WASD + classic arrows)
key('KeyW')    // W key
key('KeyA')    // A key  
key('KeyS')    // S key
key('KeyD')    // D key
key('Space')   // Spacebar
key('ArrowUp') // Arrow keys still supported

// 🎮 Gamepad input (standard mapping)
btn(0)  // Left/X button
btn(1)  // Right/A button
btn(2)  // Up/Y button
btn(3)  // Down/B button
btn(4)  // Z/LB button
btn(5)  // C/RB button

// 🖱️ Mouse input for 3D interaction
mouseX(), mouseY()              // Screen coordinates
mouseButton(0)                  // Left click
raycastFromCamera(x, y)         // 3D object picking
```

### 🎨 **2D Overlay System (HUD)**

```javascript
// 🖼️ 2D graphics over 3D scene (320x180 pixel overlay)
cls(color?)                     // Clear overlay (transparent by default)
pset(x, y, color)              // Set pixel
line(x0, y0, x1, y1, color)    // Draw line
rect(x, y, w, h, color, fill?) // Draw rectangle
print(text, x, y, color)       // Text with bitmap font

// 🎨 Color utilities
rgba8(r, g, b, a?)             // 8-bit RGBA color
packRGBA64(r16, g16, b16, a16) // High-precision color
```

### 🔊 **Spatial Audio System**

```javascript
// 🎵 3D positioned audio
playSound3D(audioData, x, y, z, options)  // 3D positioned sound
playMusic(audioData, loop?)               // Background music
setListenerPosition(x, y, z)              // Audio listener position
setMasterVolume(0.0-1.0)                  // Global volume control
```

### 💾 **Storage & Data Management**

```javascript
// 💾 Persistent game data
saveData(key, value)           // Save to localStorage
loadData(key, defaultValue?)   // Load from localStorage
clearData(key?)                // Clear saved data
listDataKeys()                 // List all keys
```

## 🎯 **Advanced Development Patterns**

### 🎪 **Object Pool Pattern**
```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.create = createFn;
    this.reset = resetFn;
    this.pool = Array(initialSize).fill().map(() => this.create());
    this.active = [];
  }
  
  get() {
    const obj = this.pool.pop() || this.create();
    this.active.push(obj);
    return obj;
  }
  
  release(obj) {
    const index = this.active.indexOf(obj);
    if (index > -1) {
      this.active.splice(index, 1);
      this.reset(obj);
      this.pool.push(obj);
    }
  }
}

// Usage for particles or projectiles
const bulletPool = new ObjectPool(
  () => createCube(0, 0, 0, 0.2, { material: 'emissive', color: 0xffff00 }),
  (bullet) => setPosition(bullet, 0, -100, 0) // Move offscreen
);
```

### 🌟 **State Management Pattern**
```javascript
class GameStateManager {
  constructor() {
    this.states = {};
    this.currentState = null;
  }
  
  addState(name, state) {
    this.states[name] = state;
  }
  
  setState(name) {
    if (this.currentState) this.currentState.exit?.();
    this.currentState = this.states[name];
    this.currentState.enter?.();
  }
  
  update() {
    this.currentState?.update?.();
  }
  
  draw() {
    this.currentState?.draw?.();
  }
}

// Usage
const gameState = new GameStateManager();
gameState.addState('menu', menuState);
gameState.addState('playing', playingState);
gameState.addState('gameover', gameOverState);
gameState.setState('menu');
```

### 🎯 **Component System Pattern**
```javascript
class Entity {
  constructor() {
    this.components = new Map();
    this.id = Math.random().toString(36);
  }
  
  addComponent(type, component) {
    this.components.set(type, component);
    return this;
  }
  
  getComponent(type) {
    return this.components.get(type);
  }
  
  hasComponent(type) {
    return this.components.has(type);
  }
}

// Usage
const player = new Entity()
  .addComponent('position', { x: 0, y: 1, z: 0 })
  .addComponent('velocity', { x: 0, y: 0, z: 0 })
  .addComponent('mesh', createCube(0, 1, 0, 1, { material: 'metallic' }))
  .addComponent('health', { current: 100, max: 100 });
```

## 🧪 **Testing & Quality Assurance**

### ✅ **Test Coverage (35/35 Tests Passing)**
```bash
# Run complete test suite
pnpm test

# Test categories:
# - 3D API functions: 15/15 ✅
# - GPU backend: 8/8 ✅
# - Input system: 7/7 ✅  
# - Material system: 5/5 ✅
```

### 🐛 **Debugging Tools**
```javascript
// 📊 Performance monitoring
const stats = get3DStats();
console.log(`FPS: ${stats.fps}, Triangles: ${stats.triangles}`);

// 🎯 Object inspection
const mesh = createCube(0, 0, 0, 1);
console.log('Position:', getMeshPosition(mesh));
console.log('Rotation:', getMeshRotation(mesh));

// 🌐 Renderer information
console.log('Renderer:', getRendererInfo());
console.log('WebGL Extensions:', getWebGLExtensions());
```

## 🎯 **Performance Optimization**

### 📈 **Best Practices**
- **Triangle Budget**: Keep scenes under 10,000 triangles for 60 FPS
- **Object Pooling**: Reuse objects instead of creating/destroying
- **LOD System**: Use lower detail for distant objects
- **Frustum Culling**: Automatic - objects outside view are not rendered
- **Texture Atlasing**: Combine small textures into larger atlases

### ⚡ **Optimization Functions**
```javascript
// 🎯 Performance helpers
setRenderQuality('low');        // Reduce quality for performance
enableFrustumCulling(true);     // Hide objects outside view
setMaxObjects(100);             // Limit active objects
enableObjectPooling(true);      // Automatic object reuse
```

## 🌟 **Common Usage Patterns**

### 🎮 **First-Person Controller**
```javascript
let player = { 
  position: { x: 0, y: 1.6, z: 0 },
  rotation: { x: 0, y: 0 },
  velocity: { x: 0, y: 0, z: 0 }
};

export function update() {
  const speed = 0.1;
  const sensitivity = 0.002;
  
  // Mouse look
  player.rotation.y += (mouseX() - 160) * sensitivity;
  player.rotation.x += (mouseY() - 90) * sensitivity;
  
  // WASD movement
  const forward = { 
    x: Math.sin(player.rotation.y), 
    z: Math.cos(player.rotation.y) 
  };
  const right = { 
    x: forward.z, 
    z: -forward.x 
  };
  
  if (key('KeyW')) {
    player.position.x += forward.x * speed;
    player.position.z += forward.z * speed;
  }
  if (key('KeyS')) {
    player.position.x -= forward.x * speed;
    player.position.z -= forward.z * speed;
  }
  if (key('KeyA')) {
    player.position.x -= right.x * speed;
    player.position.z -= right.z * speed;
  }
  if (key('KeyD')) {
    player.position.x += right.x * speed;
    player.position.z += right.z * speed;
  }
  
  // Update camera
  setCameraPosition(player.position.x, player.position.y, player.position.z);
  setCameraTarget(
    player.position.x + forward.x,
    player.position.y,
    player.position.z + forward.z
  );
}
```

### 🎪 **Particle System**
```javascript
class ParticleSystem {
  constructor(maxParticles = 100) {
    this.particles = [];
    this.maxParticles = maxParticles;
  }
  
  emit(x, y, z, count = 1) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        mesh: createCube(x, y, z, 0.1, { 
          material: 'emissive', 
          color: 0xff4400 
        }),
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: Math.random() * 2,
          z: (Math.random() - 0.5) * 2
        },
        life: 1.0,
        decay: 0.02
      });
    }
  }
  
  update() {
    this.particles = this.particles.filter(particle => {
      // Update position
      particle.velocity.y -= 0.01; // Gravity
      const pos = getMeshPosition(particle.mesh);
      setPosition(
        particle.mesh,
        pos.x + particle.velocity.x,
        pos.y + particle.velocity.y,
        pos.z + particle.velocity.z
      );
      
      // Update life
      particle.life -= particle.decay;
      if (particle.life <= 0) {
        removeMesh(particle.mesh);
        return false;
      }
      
      return true;
    });
  }
}
```

### 🏰 **Scene Manager**
```javascript
class SceneManager {
  constructor() {
    this.objects = [];
    this.lighting = {
      ambient: { color: 0x404080, intensity: 0.3 },
      directional: { color: 0xffffff, intensity: 0.8 }
    };
  }
  
  addObject(type, x, y, z, options = {}) {
    let mesh;
    switch (type) {
      case 'cube':
        mesh = createCube(x, y, z, options.size || 1, options);
        break;
      case 'sphere':
        mesh = createSphere(x, y, z, options.radius || 1, options);
        break;
      case 'plane':
        mesh = createPlane(x, y, z, options.width || 1, options.height || 1, options);
        break;
    }
    
    const obj = { mesh, type, ...options };
    this.objects.push(obj);
    return obj;
  }
  
  removeObject(obj) {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      removeMesh(obj.mesh);
      this.objects.splice(index, 1);
    }
  }
  
  update() {
    this.objects.forEach(obj => {
      if (obj.update) obj.update();
    });
  }
  
  setupLighting() {
    setAmbientLight(this.lighting.ambient.color, this.lighting.ambient.intensity);
    setDirectionalLight(this.lighting.directional.color, this.lighting.directional.intensity);
  }
}
```

## 🚀 **Deployment & Distribution**

### 📦 **Build Configuration**
```javascript
// vite.config.js (if needed for custom builds)
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 5173,
    open: true
  }
});
```

### 🌐 **Platform Support**
- **🖥️ Desktop**: All modern browsers with WebGL 2.0 support
- **📱 Mobile**: iOS Safari 13+, Android Chrome 80+
- **🎮 Consoles**: RetroArch libretro core for homebrew systems
- **☁️ Web**: PWA-ready with service worker support

## 🏆 **Version History & Roadmap**

### 🌟 **v0.2.0 (Current) - Ultimate 3D Revolution**
- ✅ Complete Three.js integration with Nintendo 64/PlayStation aesthetics
- ✅ Advanced material system with holographic, metallic, emissive effects
- ✅ Professional lighting with 4K shadows and atmospheric effects
- ✅ Enhanced input system with WASD + gamepad + mouse support
- ✅ Spatial 3D audio with environmental effects
- ✅ 100% test coverage (35/35 tests passing)

### 🚀 **v0.3.0 (Planned) - Advanced Features**
- 🔄 Model loading system (GLTF/GLB with animation)
- 🎯 Advanced physics integration (Cannon.js/Ammo.js)
- 🌊 Procedural generation tools (terrain, cities, dungeons)
- 🎪 Visual scripting system for non-programmers
- 🔊 Advanced audio synthesis and music composition tools

### 🌟 **v0.1.0 - Foundation**
- ✅ Core 2D graphics system with high-precision color
- ✅ WebGL2 backend with shader pipeline
- ✅ Sprite system with batching and animation
- ✅ Input handling and persistent storage
- ✅ Development tools and hot reloading

## 🎓 **Learning Resources**

### 📖 **Documentation Files**
- **README.md**: Complete project overview and quick start
- **NOVA64_3D_API.md**: Comprehensive 3D API reference
- **MIGRATION_GUIDE.md**: Upgrading from 2D to 3D development
- **retroarch/README_RETROARCH.md**: RetroArch core implementation

### 🎪 **Example Projects**
1. **mystical-realm-3d**: Fantasy adventure with weather systems
2. **crystal-cathedral-3d**: Graphics showcase with advanced materials
3. **star-fox-nova-3d**: Space combat with cinematic camera work
4. **f-zero-nova-3d**: High-speed racing with particle effects
5. **cyberpunk-city-3d**: Urban environment with neon aesthetics

### 💡 **Development Tips**
- Start with simple cubes and spheres before complex scenes
- Use the built-in performance monitoring to optimize
- Test on both desktop and mobile devices
- Take advantage of the hot reloading for rapid iteration
- Study the example carts for best practice patterns

## 📝 **Commit Message Guidelines**

### 🎯 **Format Rules**
When creating commit messages for this project:

1. **NO single quotes, double quotes, OR BACKTICKS** in commit messages
   - Remove all ' (single quotes)
   - Remove all " (double quotes)  
   - Remove all ` (backticks)
   - This applies to ALL text: code examples, function names, file paths, variables
2. Use descriptive headers with emojis where appropriate
3. Break down changes into clear sections
4. List specific files modified
5. Include impact and testing information
6. Keep line length reasonable (70-80 chars for header)

### 🚫 **Critical: Quote Removal Process**
When updating COMMIT_MESSAGE.txt or creating commit messages:

Step 1: Write content normally
Step 2: Remove ALL quotes using this command:
```bash
sed "s/[\`'\"']//g" COMMIT_MESSAGE.txt > /tmp/commit_clean.txt
mv /tmp/commit_clean.txt COMMIT_MESSAGE.txt
```

Step 3: Verify quotes are removed before committing

Note: This removes all single quotes, double quotes, and backticks safely
without triggering zsh history expansion or other shell issues

### ❌ **WRONG Examples**
- Fixed the 'player.pos' variable
- Updated "COMMIT_MESSAGE.txt" file
- Changed `createCube()` function signature
- Added 'holographic' material type

### ✅ **CORRECT Examples**
- Fixed the player.pos variable
- Updated COMMIT_MESSAGE.txt file
- Changed createCube() function signature
- Added holographic material type

### ✅ **Good Commit Message Example**
```
feat: Add complete lowercase alphabet and emoji handling to font system

SUMMARY
-------
Fixed text rendering issue where lowercase letters, arrows, and emojis 
were displaying as question marks. The bitmap font now supports 95+ 
characters with smart emoji handling.

CHANGES
-------
- Added complete lowercase alphabet (a-z) with 5x7 pixel bitmaps
- Added 25+ special characters and punctuation marks
- Added Unicode arrow characters (←→↑↓↔↕) as ASCII art
- Implemented smart emoji replacement/filtering system
- Created cleanText() function to preprocess strings before rendering

FILES MODIFIED
--------------
- runtime/font.js - Extended character set and emoji handling
- examples/test-font/code.js - Comprehensive character test demo
- FONT_FIX_COMPLETE.md - Complete fix documentation
- FONT_CHARACTER_REFERENCE.md - Character reference guide

IMPACT
------
- All demos now render text correctly without question marks
- Star Fox, F-Zero, Mystical Realm demos display arrows properly
- Emoji characters are gracefully handled across all examples
- Font now supports uppercase, lowercase, numbers, and symbols

TESTING
-------
- Verified across all example demos
- Created dedicated test-font demo
- Tested with mixed case text, arrows, and emoji characters
- All 95+ characters render correctly
```

### ❌ **Avoid**
```
Fix: Added 'lowercase' letters and "emoji" handling
```

---

## 🚀 **Nova64 Systematic Improvement Plan**

This section documents a comprehensive plan for systematically enhancing Nova64 across all areas: performance, code quality, features, and demo coverage.

### 📊 **Current State Assessment**

**Project Metrics (as of analysis date):**
- **Total Codebase**: 278MB (6,238 LOC runtime, 12,949 LOC examples, 3,140 LOC tests)
- **Architecture Quality**: A- (Strong foundation with minor organizational issues)
- **Test Coverage**: 35/35 tests passing (100% core API coverage)
- **Demo Portfolio**: 25 spectacular 3D carts across 10+ genres
- **Performance**: Good but unoptimized (no instancing, no frustum culling)
- **Documentation**: Excellent (15+ comprehensive guides)

**Critical Issues Identified:**
1. pnpm-lock.yaml merge conflict (blocks dependency resolution)
2. Memory leaks in light/material cleanup systems
3. 20+ untracked patch files in repository
4. Large monolithic modules (api-3d.js: 850 LOC, ui.js: 400 LOC)
5. Missing vite.config.js for explicit build configuration

---

### 🎯 **Phase 1: Critical Fixes & Stability** (Priority: URGENT)

#### 1.1 Resolve Dependency Conflicts
**File**: pnpm-lock.yaml
**Issue**: Merge conflict between Three.js v0.182 and v0.157
**Impact**: Dependency installation may be unreliable

**Actions**:
```bash
# Step 1: Resolve merge conflict in pnpm-lock.yaml
# Choose Three.js v0.182 (latest version)
git checkout --ours pnpm-lock.yaml

# Step 2: Regenerate lock file cleanly
rm pnpm-lock.yaml
pnpm install

# Step 3: Verify all dependencies resolve
pnpm list
```

**Files Modified**: pnpm-lock.yaml
**Testing**: Run pnpm install && pnpm test to verify stability

---

#### 1.2 Fix Memory Leaks in Light System
**File**: runtime/api-3d.js (lines 604-637)
**Issue**: removeLight() doesn't dispose light objects, cartLights Map grows unbounded

**Current Code Problem**:
```javascript
function removeLight(id) {
  const light = cartLights.get(id);
  if (light) {
    scene.remove(light);  // ❌ Doesn't dispose light object
    cartLights.delete(id);
  }
}
```

**Fixed Implementation**:
```javascript
function removeLight(id) {
  const light = cartLights.get(id);
  if (light) {
    scene.remove(light);

    // Dispose shadow map if it exists
    if (light.shadow && light.shadow.map) {
      light.shadow.map.dispose();
    }

    // Dispose light object
    if (light.dispose) {
      light.dispose();
    }

    cartLights.delete(id);
  }
}

// Also add cleanup in clearScene()
function clearScene() {
  // ... existing mesh cleanup ...

  // Clean up all lights
  cartLights.forEach((light, id) => {
    removeLight(id);
  });
  cartLights.clear();
}
```

**Files Modified**: runtime/api-3d.js
**Testing**: Create/remove 1000 lights in loop, verify no memory growth

---

#### 1.3 Fix Incomplete Material Cleanup
**File**: runtime/api-3d.js (lines 474-521)
**Issue**: clearScene() only disposes material.map, misses normalMap, roughnessMap, metalnessMap, etc.

**Current Code Problem**:
```javascript
if (mesh.material.map) {
  mesh.material.map.dispose();  // ❌ Only disposes diffuse texture
}
```

**Fixed Implementation**:
```javascript
function disposeMaterial(material) {
  // Dispose all texture types
  const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap',
                        'aoMap', 'emissiveMap', 'bumpMap', 'displacementMap',
                        'alphaMap', 'lightMap', 'envMap'];

  textureProps.forEach(prop => {
    if (material[prop]) {
      material[prop].dispose();
    }
  });

  material.dispose();
}

function clearScene() {
  scene.children.forEach(child => {
    if (child.isMesh) {
      scene.remove(child);

      if (child.geometry) {
        child.geometry.dispose();
      }

      // Handle both single material and array of materials
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => disposeMaterial(mat));
      } else if (child.material) {
        disposeMaterial(child.material);
      }
    }
  });

  meshes.clear();
}
```

**Files Modified**: runtime/api-3d.js
**Testing**: Load/unload carts 100 times, monitor memory usage

---

#### 1.4 Clean Up Repository
**Files**: 20+ untracked patch/fix scripts
**Issue**: Cluttered repository with do_patch.js, fix.js, patch_*.cjs files

**Actions**:
```bash
# Step 1: Review each patch file to understand purpose
ls -la *.js *.cjs *.mjs | grep -E "patch|fix|do_"

# Step 2: If patches are needed, move to scripts/ directory
mkdir -p scripts/patches
mv patch_*.cjs scripts/patches/
mv fix*.js scripts/patches/
mv do_patch.js scripts/patches/

# Step 3: If patches are obsolete, remove them
git clean -fd -n  # Preview what will be removed
git clean -fd     # Actually remove untracked files

# Step 4: Add .gitignore entry
echo "scripts/patches/" >> .gitignore
```

**Files Affected**: 20+ patch files, .gitignore
**Testing**: Verify no required functionality is lost

---

#### 1.5 Create Explicit Build Configuration
**File**: vite.config.js (NEW)
**Issue**: No explicit Vite configuration, relies on defaults

**Implementation**:
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for deployment
  base: './',

  // Build configuration
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Optimize output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // Keep console for debugging
        drop_debugger: true
      }
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        console: resolve(__dirname, 'console.html')
      }
    }
  },

  // Dev server configuration
  server: {
    port: 5173,
    open: true,
    host: true,  // Allow network access

    // Hot module replacement
    hmr: {
      overlay: true
    }
  },

  // Optimizations
  optimizeDeps: {
    include: ['three', 'zustand']
  },

  // Plugin configuration
  plugins: [],

  // Resolve configuration
  resolve: {
    alias: {
      '@runtime': resolve(__dirname, 'runtime'),
      '@examples': resolve(__dirname, 'examples')
    }
  }
});
```

**Files Created**: vite.config.js
**Testing**: Run pnpm build && pnpm preview

---

### ⚡ **Phase 2: Performance Optimization** (Priority: HIGH)

#### 2.1 Implement GPU Instancing
**File**: runtime/gpu-threejs.js (NEW section)
**Impact**: 10-100x draw call reduction for repeated geometries

**Implementation Strategy**:
```javascript
// Add to gpu-threejs.js

class InstancedMeshManager {
  constructor(scene) {
    this.scene = scene;
    this.instances = new Map(); // geometryKey -> InstancedMesh
    this.nextIndex = new Map(); // geometryKey -> next available index
  }

  createInstance(geometry, material, maxCount = 1000) {
    const key = this.getGeometryKey(geometry, material);

    if (!this.instances.has(key)) {
      const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(instancedMesh);

      this.instances.set(key, instancedMesh);
      this.nextIndex.set(key, 0);
    }

    return this.instances.get(key);
  }

  addInstance(geometry, material, matrix) {
    const instancedMesh = this.createInstance(geometry, material);
    const index = this.nextIndex.get(this.getGeometryKey(geometry, material));

    instancedMesh.setMatrixAt(index, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.nextIndex.set(this.getGeometryKey(geometry, material), index + 1);
    return { instancedMesh, index };
  }

  getGeometryKey(geometry, material) {
    return `${geometry.type}_${material.uuid}`;
  }

  clear() {
    this.instances.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.dispose();
    });
    this.instances.clear();
    this.nextIndex.clear();
  }
}

// Expose for API usage
const instanceManager = new InstancedMeshManager(scene);
```

**API Changes** (runtime/api-3d.js):
```javascript
// Add new function for instanced objects
function createInstancedCubes(positions, size, options) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = createN64Material(options);

  positions.forEach(pos => {
    const matrix = new THREE.Matrix4();
    matrix.setPosition(pos.x, pos.y, pos.z);
    instanceManager.addInstance(geometry, material, matrix);
  });
}

// Usage in demos:
// Instead of: for (let i = 0; i < 100; i++) createCube(...)
// Use: createInstancedCubes(positions, 1, { material: 'holographic' })
```

**Files Modified**: runtime/gpu-threejs.js, runtime/api-3d.js
**Testing**: Create 10,000 cubes, measure FPS improvement
**Expected Gain**: 50-100x fewer draw calls

---

#### 2.2 Add Frustum Culling
**File**: runtime/gpu-threejs.js (update render loop)
**Impact**: Eliminate rendering of off-screen objects

**Implementation**:
```javascript
// Add to gpu-threejs.js

const frustum = new THREE.Frustum();
const cameraViewProjectionMatrix = new THREE.Matrix4();

function updateFrustum() {
  camera.updateMatrixWorld();
  cameraViewProjectionMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
}

function endFrame(framebuffer) {
  // Update frustum culling
  updateFrustum();

  // Cull objects outside view
  let culledCount = 0;
  scene.traverse(object => {
    if (object.isMesh) {
      // Check if object is in frustum
      object.visible = frustum.intersectsObject(object);
      if (!object.visible) culledCount++;
    }
  });

  // Render scene
  renderer.render(scene, camera);

  // Update 2D overlay
  update2DOverlay(framebuffer);

  // Return stats
  return { culledObjects: culledCount };
}
```

**Files Modified**: runtime/gpu-threejs.js
**Testing**: Create scene with 1000 objects spread over large area, measure FPS
**Expected Gain**: 2-5x FPS improvement in large scenes

---

#### 2.3 Implement Material Caching
**File**: runtime/api-3d.js
**Impact**: Eliminate redundant material allocations

**Implementation**:
```javascript
// Add to api-3d.js

const materialCache = new Map();

function getMaterialKey(options) {
  return JSON.stringify({
    material: options.material || 'standard',
    color: options.color || 0xffffff,
    emissive: options.emissive || 0x000000,
    metalness: options.metalness,
    roughness: options.roughness,
    transparent: options.transparent,
    opacity: options.opacity
  });
}

function getCachedMaterial(options) {
  const key = getMaterialKey(options);

  if (materialCache.has(key)) {
    return materialCache.get(key);
  }

  const material = createN64Material(options);
  materialCache.set(key, material);
  return material;
}

// Update all create functions to use cache:
function createCube(x, y, z, size, options = {}) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = getCachedMaterial(options);  // Use cached material
  const mesh = new THREE.Mesh(geometry, material);
  // ... rest of function
}
```

**Files Modified**: runtime/api-3d.js
**Testing**: Create 1000 cubes with same material, verify only 1 material created
**Expected Gain**: 10-50x reduction in material allocations

---

#### 2.4 Optimize Scene Traversal
**File**: runtime/gpu-threejs.js (lines 494-510)
**Impact**: Eliminate expensive scene.traverse() every frame

**Current Problem**:
```javascript
// Called every frame - expensive!
scene.traverse(child => {
  if (child.userData.animateTexture && child.material.map) {
    // Animate texture
  }
  if (child.userData.animateEmissive) {
    // Animate emissive
  }
});
```

**Optimized Implementation**:
```javascript
// Add to gpu-threejs.js

const animatedObjects = {
  textures: [],
  emissive: []
};

function registerAnimatedObject(mesh, type) {
  if (type === 'texture') {
    animatedObjects.textures.push(mesh);
  } else if (type === 'emissive') {
    animatedObjects.emissive.push(mesh);
  }
}

function update(deltaTime) {
  // Only iterate registered animated objects
  animatedObjects.textures.forEach(mesh => {
    if (mesh.material.map) {
      mesh.material.map.offset.x += deltaTime * 0.1;
      mesh.material.map.offset.y += deltaTime * 0.05;
    }
  });

  animatedObjects.emissive.forEach(mesh => {
    if (mesh.material.emissive) {
      const pulse = Math.sin(Date.now() * 0.002) * 0.3 + 0.7;
      mesh.material.emissiveIntensity = pulse;
    }
  });

  // Clean up disposed objects
  animatedObjects.textures = animatedObjects.textures.filter(m => m.parent);
  animatedObjects.emissive = animatedObjects.emissive.filter(m => m.parent);
}
```

**Files Modified**: runtime/gpu-threejs.js, runtime/api-3d.js
**Testing**: Measure frame time with 1000 objects
**Expected Gain**: 2-10ms per frame reduction

---

### 🎨 **Phase 3: Code Quality & Architecture** (Priority: MEDIUM)

#### 3.1 Refactor Large Modules
**Files**: runtime/api-3d.js (850 LOC), runtime/ui.js (400 LOC)
**Goal**: Break into smaller, focused modules

**Proposed Structure**:
```
runtime/
├── api-3d/
│   ├── primitives.js       # createCube, createSphere, createPlane
│   ├── transforms.js       # setPosition, rotateMesh, setScale
│   ├── materials.js        # Material creation and management
│   ├── lighting.js         # Light creation and control
│   ├── camera.js           # Camera positioning and animation
│   └── index.js            # Exports all functions
├── ui/
│   ├── buttons.js          # Button creation and interaction
│   ├── panels.js           # Panel and container UI
│   ├── text.js             # Text rendering utilities
│   ├── progress.js         # Progress bars and indicators
│   └── index.js            # Exports all functions
```

**Implementation Pattern**:
```javascript
// runtime/api-3d/primitives.js
export function createCube(x, y, z, size, options) {
  // Implementation
}

export function createSphere(x, y, z, radius, options) {
  // Implementation
}

// runtime/api-3d/index.js
export * from './primitives.js';
export * from './transforms.js';
export * from './materials.js';
export * from './lighting.js';
export * from './camera.js';

// src/main.js - No API changes
import * as api3d from '../runtime/api-3d/index.js';
```

**Files Created**: 10+ new module files
**Files Modified**: src/main.js (updated imports)
**Testing**: Run full test suite, verify no regressions

---

#### 3.2 Implement Logging System
**File**: runtime/logger.js (NEW)
**Goal**: Replace console.log with configurable logging

**Implementation**:
```javascript
// runtime/logger.js

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

class Logger {
  constructor(level = LogLevel.INFO) {
    this.level = level;
    this.history = [];
    this.maxHistory = 100;
  }

  debug(...args) {
    if (this.level <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
      this.addToHistory('DEBUG', args);
    }
  }

  info(...args) {
    if (this.level <= LogLevel.INFO) {
      console.log('[INFO]', ...args);
      this.addToHistory('INFO', args);
    }
  }

  warn(...args) {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
      this.addToHistory('WARN', args);
    }
  }

  error(...args) {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args);
      this.addToHistory('ERROR', args);
    }
  }

  addToHistory(level, args) {
    this.history.push({
      level,
      message: args,
      timestamp: Date.now()
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getHistory() {
    return this.history;
  }

  setLevel(level) {
    this.level = level;
  }
}

const logger = new Logger();

// In production builds, set to WARN
if (import.meta.env.PROD) {
  logger.setLevel(LogLevel.WARN);
}

export { logger, LogLevel };
```

**Usage Throughout Codebase**:
```javascript
// Replace: console.log('Loading cart...');
// With: logger.info('Loading cart...');

// Replace: console.error('Failed to load:', err);
// With: logger.error('Failed to load:', err);
```

**Files Created**: runtime/logger.js
**Files Modified**: All runtime/*.js files
**Testing**: Verify log output in dev vs prod builds

---

#### 3.3 Add Pre-commit Hooks
**File**: .husky/pre-commit (NEW)
**Goal**: Enforce code quality before commits

**Implementation**:
```bash
# Step 1: Install husky
pnpm add -D husky lint-staged

# Step 2: Initialize husky
npx husky install

# Step 3: Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
pnpm lint

# Run tests
pnpm test

# Check for TODOs in committed files
git diff --cached --name-only | xargs grep -l 'TODO\|FIXME\|HACK' && {
  echo "Error: Commit contains TODO/FIXME/HACK comments"
  exit 1
}
EOF

chmod +x .husky/pre-commit
```

**Package.json updates**:
```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.js": ["prettier --write", "eslint --fix"]
  }
}
```

**Files Created**: .husky/pre-commit, .husky/_/husky.sh
**Files Modified**: package.json
**Testing**: Make commit, verify hooks run

---

### 🚀 **Phase 4: New Features** (Priority: MEDIUM)

#### 4.1 Add Level of Detail (LOD) System
**File**: runtime/api-3d/lod.js (NEW)
**Impact**: Automatic quality reduction for distant objects

**Implementation**:
```javascript
// runtime/api-3d/lod.js

import * as THREE from 'three';

function createLOD(x, y, z, options) {
  const lod = new THREE.LOD();

  // High detail (close up)
  const highDetail = createHighDetailMesh(options);
  lod.addLevel(highDetail, 0);

  // Medium detail (medium distance)
  const mediumDetail = createMediumDetailMesh(options);
  lod.addLevel(mediumDetail, 10);

  // Low detail (far away)
  const lowDetail = createLowDetailMesh(options);
  lod.addLevel(lowDetail, 30);

  lod.position.set(x, y, z);
  scene.add(lod);

  return lod;
}

function createHighDetailMesh(options) {
  // Full geometry complexity
  return new THREE.SphereGeometry(1, 32, 32);
}

function createMediumDetailMesh(options) {
  // Reduced complexity
  return new THREE.SphereGeometry(1, 16, 16);
}

function createLowDetailMesh(options) {
  // Minimal complexity
  return new THREE.SphereGeometry(1, 8, 8);
}

export { createLOD };
```

**API Function**:
```javascript
// Add to global API
function createLODSphere(x, y, z, radius, options) {
  return createLOD(x, y, z, { ...options, type: 'sphere', radius });
}
```

**Files Created**: runtime/api-3d/lod.js
**Files Modified**: runtime/api-3d/index.js, src/main.js
**Testing**: Create 100 LOD objects, verify detail changes with camera distance

---

#### 4.2 Add Normal Mapping Support
**File**: runtime/api-3d/materials.js
**Impact**: High-detail surfaces without geometry complexity

**Implementation**:
```javascript
// Update material creation to support normal maps

function createN64Material(options) {
  const matOptions = {
    color: options.color || 0xffffff,
    emissive: options.emissive || 0x000000,
    // ... existing options
  };

  // Add normal map support
  if (options.normalMap) {
    matOptions.normalMap = loadTexture(options.normalMap);
    matOptions.normalScale = new THREE.Vector2(
      options.normalScale || 1,
      options.normalScale || 1
    );
  }

  // Add roughness map
  if (options.roughnessMap) {
    matOptions.roughnessMap = loadTexture(options.roughnessMap);
  }

  // Add metalness map
  if (options.metalnessMap) {
    matOptions.metalnessMap = loadTexture(options.metalnessMap);
  }

  let material;
  switch (options.material) {
    case 'standard':
    case 'metallic':
    case 'holographic':
      material = new THREE.MeshStandardMaterial(matOptions);
      break;
    default:
      material = new THREE.MeshPhongMaterial(matOptions);
  }

  return material;
}
```

**API Usage**:
```javascript
// Enhanced material options
const wall = createCube(0, 0, -5, 2, {
  material: 'standard',
  color: 0x888888,
  normalMap: 'assets/textures/brick-normal.png',
  roughnessMap: 'assets/textures/brick-roughness.png',
  normalScale: 0.5
});
```

**Files Modified**: runtime/api-3d/materials.js
**Testing**: Load model with normal maps, verify lighting detail

---

### 🎮 **Phase 5: Demo Enhancement** (Priority: LOW)

#### 5.1 Create Input Showcase Demo
**File**: examples/input-showcase/code.js (NEW)
**Goal**: Demonstrate all input methods

**Content**:
- Keyboard visualization (WASD, arrows, all keys)
- Gamepad button mapping display
- Mouse position and click detection
- Touch controls for mobile
- Input rebinding UI

**Files Created**: examples/input-showcase/
**Testing**: Test on desktop + mobile + gamepad

---

#### 5.2 Create Audio Lab Demo
**File**: examples/audio-lab/code.js (NEW)
**Goal**: Demonstrate spatial 3D audio system

**Content**:
- 3D positioned sound sources
- Sound effect triggering
- Music loops and mixing
- Volume controls and panning
- Doppler effect demonstration

**Files Created**: examples/audio-lab/
**Testing**: Verify audio positioning and effects

---

#### 5.3 Create Storage Quest Demo
**File**: examples/storage-quest/code.js (NEW)
**Goal**: Demonstrate persistent storage APIs

**Content**:
- Save/load game progress
- High score persistence
- Player profile customization
- Settings storage
- Data export/import

**Files Created**: examples/storage-quest/
**Testing**: Verify data persists across sessions

---

### 📋 **Implementation Checklist**

#### Phase 1: Critical Fixes
- [x] Resolve pnpm-lock.yaml merge conflict (no conflict found — already clean)
- [x] Fix light memory leaks (removeLight disposal — implemented in api-3d.js)
- [x] Fix material cleanup (all texture types — disposeMaterial covers all maps)
- [x] Clean up untracked patch files (no patch files found in root)
- [x] Create vite.config.js (already exists with full config)
- [x] Fix npm→pnpm across all scripts, docs, and source files

#### Phase 2: Performance
- [x] Implement GPU instancing system (createInstancedMesh, setInstanceTransform, setInstanceColor, finalizeInstances, removeInstancedMesh)
- [x] Add frustum culling to render loop (animated mesh updates skip off-screen objects in gpu-threejs.js)
- [x] Implement material caching (materialCache in api-3d.js)
- [x] Optimize scene traversal — animatedMeshes registry in gpu-threejs.js (skips scene.traverse)
- [x] Benchmark and document improvements (docs/BENCHMARK.md, pnpm bench, pnpm bench:material/instancing/mesh)

#### Phase 3: Code Quality
- [x] Refactor api-3d.js into modules (runtime/api-3d/: materials, primitives, transforms, camera, lights, models, instancing, pbr, scene)
- [x] Refactor ui.js into modules (runtime/ui/: text, panels, buttons, widgets)
- [x] Implement logging system (runtime/logger.js — leveled, history-tracked, prod-safe)
- [x] Add pre-commit hooks (husky + lint-staged — runs ESLint + Prettier on staged files)
- [x] Update runtime files to use logger instead of console.log (api-3d.js, console.js, screens.js, store.js, api-effects.js)

#### Phase 4: New Features
- [x] Add LOD system (createLODMesh, setLODPosition, removeLODMesh — auto-updates in endFrame)
- [x] Add normal mapping support (loadNormalMap, setNormalMap, setPBRMaps — MeshPhong auto-upgrades to MeshStandard)
- [x] Implement GPU instancing (createInstancedMesh, setInstanceTransform, setInstanceColor, finalizeInstances, removeInstancedMesh)
- [ ] Add deferred rendering (optional)
- [ ] Add GPGPU particle system (optional)

#### Phase 5: Demo Enhancement
- [x] Create input-showcase demo (examples/input-showcase/code.js)
- [x] Create audio-lab demo (examples/audio-lab/code.js)
- [x] Create storage-quest demo (examples/storage-quest/code.js)
- [x] Create instancing-demo (examples/instancing-demo/code.js — GPU instancing + LOD showcase, 3 interactive scenes)
- [ ] Update all demos to use new features

---

### 📊 **Expected Outcomes**

**Performance Improvements**:
- 10-100x draw call reduction (instancing)
- 2-5x FPS improvement (frustum culling)
- 10-50x fewer material allocations (caching)
- 2-10ms per frame reduction (traversal optimization)

**Code Quality Improvements**:
- 850 LOC api-3d.js → 5 modules of ~170 LOC each
- 400 LOC ui.js → 4 modules of ~100 LOC each
- Configurable logging with history
- Automated code quality enforcement

**Feature Additions**:
- LOD system for automatic optimization
- Normal mapping for high-detail surfaces
- Complete API coverage in demos (100%)

**Stability Improvements**:
- Zero memory leaks
- Clean dependency resolution
- Explicit build configuration
- Proper git history

---

### 🎯 **Success Metrics**

**Performance**:
- 60 FPS maintained with 10,000+ objects
- Memory usage stable over 1 hour runtime
- Build size < 2MB (optimized)

**Code Quality**:
- No files > 300 LOC
- ESLint 0 warnings/errors
- Prettier 100% formatted
- All tests passing

**Coverage**:
- 100% API demonstrated in examples
- 100% documentation coverage
- Zero untracked files in repo

---

**🤖 This guide provides GitHub Copilot with comprehensive context for Nova64 development. The fantasy console combines retro gaming nostalgia with cutting-edge 3D technology, creating an unparalleled development experience for modern web-based gaming.**

**🎮 Happy coding with Nova64 - where retro meets the future!**