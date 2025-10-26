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
npm test

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

**🤖 This guide provides GitHub Copilot with comprehensive context for Nova64 development. The fantasy console combines retro gaming nostalgia with cutting-edge 3D technology, creating an unparalleled development experience for modern web-based gaming.**

**🎮 Happy coding with Nova64 - where retro meets the future!**