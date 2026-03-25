# 🎮 Nova64 - Ultimate 3D Fantasy Console Development Guide

This file provides comprehensive guidance for AI assistants working with the **Nova64 Ultimate 3D Fantasy Console** codebase.

## �️ **Windows Development Environment**

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

## �🚀 **Development Commands**

**⚡ Always use `pnpm` for all package management and development tasks:**

```bash
# 📦 Install dependencies (ALWAYS use pnpm)
pnpm install

# 🔥 Start development server with hot reloading (ALWAYS use pnpm)
pnpm dev            # Usually http://localhost:5173

# 🏗️ Build for production (optimized) (ALWAYS use pnpm)
pnpm build

# 👁️ Preview production build (ALWAYS use pnpm)
pnpm preview

# 🧪 Run complete test suite (35/35 tests passing) (ALWAYS use pnpm)
pnpm test

# 🎯 Run specific test suites (ALWAYS use pnpm)
pnpm test:api
pnpm test:input
pnpm test:starfox
pnpm test:integration
```

**🚨 CRITICAL: Never use `npm` or `yarn` - Always use `pnpm` for consistency and performance.**

## 🏗️ **Architecture Overview**

Nova64 is a revolutionary **JavaScript 3D Fantasy Console** featuring:

- **🎯 Pure 3D Graphics Engine** with Three.js integration
- **⚡ 100% Test Coverage** (35/35 tests passing)
- **🎨 Nintendo 64/PlayStation Aesthetics** with modern performance
- **✨ Advanced Materials System** (holographic, metallic, emissive effects)
- **🌫️ Cinematic Lighting & Atmospherics** with 4K shadow mapping

### 🎯 **Core Components**

**🎪 Advanced 3D Engine** (`runtime/`):

- `gpu-threejs.js` - **🚀 Three.js GPU Backend** with advanced materials, lighting, and shader systems
- `api.js` - **📚 Complete 3D API** (35+ functions) with camera, primitives, and scene management
- `input.js` - **🎮 Enhanced Input System** with key(), btn(), btnp() functions for WASD + gamepad support
- `console.js` - **🖥️ Main Nova64 Class** with dynamic ES module cart loading and hot reloading
- `framebuffer.js` - **🎨 High-Precision Framebuffer** for 2D overlay compositing over 3D scenes

**🎨 Visual Systems**:

- `gpu-webgl2.js` - **⚡ WebGL2 Fallback** with RGBA16F textures and ACES tone mapping
- `gpu-canvas2d.js` - **🖼️ Canvas2D Fallback** with ordered dithering for maximum compatibility
- `api-sprites.js` - **🖼️ 2D Sprite System** with GPU batching and parallax scrolling
- `font.js` - **✍️ Text Rendering** with bitmap fonts and color support

**🔧 Extended APIs**:

- `audio.js` - **🔊 WebAudio System** with spatial 3D audio and sound effects
- `physics.js` - **⚛️ Physics Engine** with AABB collision and gravity simulation
- `collision.js` - **💥 Collision System** with raycasting and spatial partitioning
- `storage.js` - **💾 Persistent Storage** with JSON serialization and localStorage
- `textinput.js` - **⌨️ Text Input System** with overlay and keyboard handling
- `editor.js` - **🎨 In-Browser Editor** for real-time sprite and asset editing

### 🎮 **Spectacular 3D Cart System**

Nova64 carts are **ES modules** that create immersive 3D experiences:

```javascript
// 🌟 Complete 3D cart structure
let cube;

export function init() {
  // 🏗️ Create 3D objects ONCE here — never inside draw()
  cube = createCube(2, 0x0088ff, [0, 0, -5], { material: 'holographic' });
  setCameraPosition(0, 5, 10);
  setFog(0x1a1a2e, 10, 30);
}

export function update(dt) {
  // 🎮 Handle input, update game logic, animate objects
  if (key('KeyW')) player.z -= 5 * dt;
  rotateMesh(cube, 0, dt, 0);
}

export function draw() {
  // 🎨 3D scene renders automatically — just draw 2D HUD here
  print('Score: 1000', 10, 10, 0xffffff);
}
```

**🎯 Cart Loading**: Modify import path in `src/main.js` (line ~109) to test different spectacular demos.

### 🏗️ **Key Architectural Patterns**

**🔗 Global API Exposure**: All runtime modules expose APIs via `.exposeTo(globalThis)` for seamless cart access

- **35+ 3D Functions**: createCube(), setCameraPosition(), rotateMesh(), setFog(), etc.
- **Enhanced Input**: key(), btn(), btnp() functions with WASD + gamepad support
- **Material System**: Advanced holographic, metallic, and emissive materials

**📷 Advanced Camera System**: Shared camera state between 3D engine and 2D overlay systems

- **Dynamic Positioning**: setCameraPosition(), setCameraTarget(), setCameraFOV()
- **Smooth Transitions**: Interpolated camera movement for cinematic feel
- **Multiple Modes**: First-person, third-person, and orbital camera controls

**⚡ Progressive Enhancement**: Intelligent renderer fallback chain for maximum compatibility

1. **Three.js** (preferred) - Full 3D with advanced materials and lighting
2. **WebGL2** - High-performance 2D with shader effects
3. **Canvas2D** - Universal compatibility fallback

**🎨 Advanced Color Pipeline**: High-precision color system for professional visuals

- **64-bit RGBA**: Uint16 per channel for smooth gradients and professional color grading
- **ACES Tone Mapping**: Hollywood-grade color processing for cinematic look
- **Helper Functions**: packRGBA64(), rgba8(), unpackRGBA64() for easy color manipulation

## 🎨 **Spectacular 3D Cart Development**

### 🚀 **Creating Your Ultimate 3D Experience**:

1. **🏗️ Setup**: Create `examples/your-amazing-3d-world/code.js` with complete 3D structure
2. **⚡ Loading**: Update cart path in `src/main.js:109` for hot reloading
3. **🎮 Testing**: Use control panel dropdown to switch between spectacular demos
4. **🧪 Validation**: Run `pnpm test` to ensure 100% compatibility (35/35 tests)

### 🎯 **Complete Global API** (35+ Functions):

- **🎪 3D Graphics**: createCube(size,color,[x,y,z],opts), createSphere(), createPlane(), createCylinder(), createCone(), createCapsule(), createTorus()
- **📷 Camera Control**: setCameraPosition(), setCameraTarget(), setCameraFOV()
- **🎨 Materials**: Advanced holographic, metallic, emissive, and standard materials
- **⚡ Transforms**: rotateMesh(), setPosition(), setScale(), removeMesh() (also destroyMesh)
- **🌫️ Atmospherics**: setFog(), clearFog(), setAmbientLight(), createPointLight()
- **🎮 Enhanced Input**: key(code), keyp(code), btn(i), btnp(i) — WASD + gamepad + mouse
- **🌌 Skybox**: createSpaceSkybox(), createGradientSkybox(), createSolidSkybox(), enableSkyboxAutoAnimate()
- **✨ Effects**: enableBloom(), enableVignette(), enableN64Mode(), enablePSXMode(), enableLowPolyMode()
- **🔊 Audio**: sfx(preset), sfx({wave,freq,dur}), setVolume() — named presets: 'jump','coin','explosion',…
- **💾 Storage**: saveData(key,val), loadData(key,fallback), deleteData(key)
- **⚛️ Physics**: createBody(), stepPhysics(dt), setGravity(), setCollisionMap(fn)
- **✍️ Text**: print(), printCentered(), drawGlowText(), drawCrosshair(), drawProgressBar()
- **🗺️ Minimap**: createMinimap(opts), drawMinimap(mm,time) — tile maps, entity dots, fog of war, radar sweep, circle/rect shapes
- **🎮 Game Utils**: createShake/triggerShake/updateShake, createCooldown/useCooldown/updateCooldowns, createHitState/triggerHit/isInvulnerable/isVisible, createSpawner/updateSpawner, createPool, createFloatingTextSystem/drawFloatingTexts/drawFloatingTexts3D, createStateMachine, createTimer

## 🏗️ **Project Structure & Features**

### 🎪 **Spectacular Demo Gallery** (`examples/`):

- **🏰 mystical-realm-3d/**: Fantasy world with weather systems and crystal collection
- **🏛️ crystal-cathedral-3d/**: Ultimate graphics showcase with holographic architecture
- **🚀 star-fox-nova-3d/**: Epic space combat with squadron battles
- **🏁 f-zero-nova-3d/**: High-speed racing through futuristic circuits
- **🌃 cyberpunk-city-3d/**: Neon-lit metropolis with atmospheric effects
- **⚛️ physics-demo-3d/**: Advanced physics simulation with realistic interactions
- **🔫 shooter-demo-3d/**: Intense space combat with particle explosions
- **⚔️ strider-demo-3d/**: Fantasy platformer with magical environments

### 🎯 **Core Architecture**:

- **🚀 Main Entry**: `src/main.js` orchestrates the complete 3D fantasy console experience
- **⚡ Three.js Backend**: Hardware-accelerated 3D rendering with advanced shader pipeline
- **🎨 Material System**: Holographic, metallic, and emissive materials with real-time animation
- **🖼️ 2D Overlay**: High-precision framebuffer for HUD elements over 3D scenes
- **🎮 Hot Reloading**: Instant cart updates without losing game state
- **🧪 Test Coverage**: 100% validated functionality (35/35 tests passing)

### 🔧 **Advanced Development Tools**:

- **🎨 Real-time Editor**: In-browser sprite and material editing with GPU texture updates
- **📊 Performance Monitor**: FPS, triangle count, and memory usage analytics
- **🐛 Debug Console**: Comprehensive error reporting and validation systems
- **⚡ Build Pipeline**: Optimized production builds with asset bundling
