# 🎮 Nova64 — Ultimate 3D Fantasy Console

**Nova64** is a revolutionary fantasy console that brings the magic of Nintendo 64 and PlayStation era 3D graphics to the modern web. Experience the perfect fusion of retro aesthetics with cutting-edge technology, featuring full GPU acceleration, advanced lighting systems, and spectacular visual effects that rival modern games while maintaining that nostalgic charm.

> ✨ **Pure 3D Gaming Experience** — Advanced Three.js integration with Nintendo 64/PlayStation-style rendering, holographic materials, dynamic lighting, and cinematic post-processing effects!

🌐 **Live Site:** [starcade9.github.io](https://starcade9.github.io/)

[![Version](https://img.shields.io/badge/version-0.4.8-blue.svg)](https://github.com/seacloud9/nova64)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](tests/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)

---

## Babylon.js WAD Visual Parity

- **WAD Texture Parity**: Babylon WAD walls, floors, and sprite materials now receive engine-assigned textures through the same mesh proxy path used by Three.js carts
- **Visual Regression Guardrail**: `wad-demo` gameplay-frame comparison is back in the low-single-digit diff range against Three.js
- **Safer Post-Processing Boot**: Babylon vignette setup now falls back gracefully when image-processing pipeline internals are unavailable, preventing WAD cart boot failures

## Babylon.js XR/AR Parity

- **Latest Babylon.js**: The Babylon backend now targets `@babylonjs/core` 9.4.1
- **Native Babylon WebXR**: `enableAR()` and `enableVR()` use Babylon's own WebXR experience path in Babylon mode
- **Cardboard Fallback**: When native WebXR VR is unavailable, Babylon mode offers a Cardboard stereoscopic fallback instead of a dead-end unsupported state
- **AR Demo Resilience**: MediaPipe camera backgrounds and the AR hand demo now degrade cleanly when camera access or hand tracking is unavailable

## Babylon.js TSL Visual Parity

- **Deterministic Galaxy Showcase**: The first `tsl-showcase` scene now uses seeded star placement so Babylon.js and Three.js screenshots compare the same galaxy layout
- **High-Strength Bloom Mapping**: Babylon bloom parameters now better match Three.js for high-glow shader carts without forcing low-strength PBR scenes into the same over-bright path
- **Focused Guardrail**: `tests/playwright/visual-regression.spec.js` includes a `tsl-showcase` Galaxy scene comparison so future shader/post-processing changes have a narrow parity check

---

## 🌟 **Recent Updates (v0.4.8)**

### 🃏 **NEW: hyperNova — HyperCard/Flash Authoring Tool** ⭐

- **Card-Based Editor**: Create interactive stacks of cards — presentations, stories, mini-apps, and animations — using a WYSIWYG drag-and-drop editor
- **NovaTalk Scripting**: A HyperTalk-inspired scripting language with full tokenizer → parser → interpreter, supporting `on handler`, `put X into Y`, `send` messages, `repeat`/`if`/`else` control flow, and HyperCard-style object references
- **Symbol Library & MovieClips**: Flash-style reusable components with keyframe timelines, frame-by-frame animation, and GSAP-powered tweens (`fadeIn`, `slideIn`, `pulse`, `shake`, etc.)
- **Keyframe Timeline Strip**: Per-object tween editing with easing, duration, position, rotation, scale, and skew
- **Save/Load/Export**: Auto-save to localStorage, export as `.hcard.json` or as a Nova64 `.code.js` cart
- **Built-in Examples**: Interactive story templates and demo stacks included

### 🌐 **NEW: Internationalization (i18n)**

- **3-Language Support**: Full English, Spanish (ES), and Japanese (JA) translations across the main website, console, and OS9 shell
- **Language Picker**: Language selector in the navbar (main site & console) and OS9 shell menu bar
- **Cart i18n API**: Runtime `t()`, `setLocale()`, `getLocale()`, `addStrings()`, `getAvailableLocales()` for translatable carts
- **OS9 Shell Menus**: All system menus (File, Edit, View, Special, Activities) fully translated
- **Persistent Preference**: Language choice saved to localStorage, synced across site and OS

### 🖥️ **OS9 Desktop Shell**

- **Mac OS 9-Style GUI**: Full desktop environment with window management, taskbar, and app launcher
- **Crystal Desktop Experience**: NovaOS now opens onto a calm deep-blue crystal wallpaper with a modernized translucent boot/loading sequence
- **Background Customization**: Right-click the desktop or open Appearance to choose built-in wallpapers, a solid color, a custom image URL, or a visual-only sandboxed HTML iframe URL
- **Game Studio**: In-browser game IDE with code editor, live preview, and cart management
- **Model Viewer**: Load and inspect GLB/GLTF models with Draco compression and DOOM WAD maps with full texture/sprite rendering
- **Game Launcher**: Browse and launch all 60+ demo carts from a visual gallery
- **Sprite Editor**: Pixel art editor integrated into the desktop environment
- **eMU Emulator**: RetroArch-based retro game emulator
- **Docs Viewer**: Browse API documentation directly in the shell
- **Debug Panel**: F9 overlay with scene graph, camera inspector, lights editor, and performance stats
- **Three.js DevTools Bridge**: Exposes scene/renderer/camera for the Three.js browser extension
- **Screensaver System**: Multiple screensaver hacks selectable from the Special menu
- **Theme Toggle**: Dark/light desktop theme switching

### 🎮 **Game Studio Improvements**

- **Cart Switching**: Reliable iframe lifecycle management for seamless cart switching
- **Demo Read-Only Mode**: Demo carts open in read-only mode with localStorage persistence for user carts
- **API Injection Fix**: Resolved identifier conflicts with cart code (`t` variable clash)
- **Auto-Run**: Demos auto-run on selection with proper scene cleanup

### 🔧 **Model Viewer Enhancements**

- **GLB Draco Support**: DRACOLoader for compressed GLB/GLTF geometry
- **WAD Rendering**: Full DOOM WAD map visualization with wall/floor/ceiling textures, flat textures, sprite billboards for monsters/items/decorations, sector-based lighting, and batched rendering
- **Babylon WAD Parity**: Babylon.js now resolves mesh proxies for engine-level material assignment, so WAD textures and runtime-created materials render closely to the Three.js backend
- **Complete Geometry**: Floors, ceilings, and two-sided walls properly rendered

### 📱 **Planned: Unity Native Host Bridge**

- **Mobile-Focused Direction**: Nova64 JS game logic can drive native Unity C# behavior for iOS/Android shipping
- **Controlled Host API**: The bridge is designed as a whitelist-based host API, not arbitrary C# execution
- **Safe Runtime Boundary**: Handle-based, command-buffered messaging keeps the JS↔C# boundary portable and performant
- **Architecture Doc**: See [docs/UNITY_BRIDGE_ARCHITECTURE.md](docs/UNITY_BRIDGE_ARCHITECTURE.md) for the decision, constraints, and phased rollout

### 🗺️ **Roadmap**

- **Backend Expansion**: Babylon.js, Unity, and Godot support are tracked in [ROADMAP.md](ROADMAP.md)
- **Realtime Follow-Up**: The roadmap also sketches the Colyseus + WebRTC follow-up plan for multiplayer, presence, chat, and RTC features

### 🧊 **Voxel Engine**

- **Minecraft-Style Worlds**: Full voxel engine with chunk-based terrain, biomes, simplex noise generation
- **Deterministic Default Seeds**: Shared voxel carts now derive stable default world seeds so Three.js and Babylon render the same terrain unless a cart opts into a custom seed
- **Babylon NOA Probe Seam**: Babylon voxel parity work now includes an experimental `noa-engine` probe path for future backend-specific investigation without replacing Nova64's shared voxel API yet
- **Block System**: Extensible block types with custom shapes and bounding boxes
- **Fluid Simulation**: Water/lava fluid dynamics with source/drain mechanics
- **Entity System**: ECS-style entities with archetypes, pathfinding, health, and spatial queries
- **World Persistence**: Save/load/export voxel worlds with JSON serialization

### 🎨 **Effects & Post-Processing**

- **TSL Shader Pack**: Custom Three.js Shading Language effects (hologram, dissolve, force field, etc.)
- **Retro Modes**: `enableN64Mode()`, `enablePSXMode()`, `enableLowPolyMode()` for authentic retro looks
- **Post-Processing**: Bloom, vignette, glitch, chromatic aberration, FXAA
- **Skybox System**: Space, gradient, and solid skyboxes with auto-animation

---

## 🚀 Quick Start

### 📦 **Install & Play**

```bash
# Install globally
pnpm add -g nova64

# Create a new game project
nova64 init my-game
cd my-game && nova64 dev
```

Your browser opens to a spinning cube starter at `http://localhost:5173` — edit `code.js` and see changes instantly.

### 🎨 **Start from a Template**

```bash
# Browse 60+ example games and demos interactively
nova64 template

# Or clone a specific template directly
nova64 template star-fox-nova-3d
cd star-fox-nova-3d && nova64 dev
```

### 🏁 **Development Setup**

```bash
git clone https://github.com/seacloud9/nova64.git
cd nova64
pnpm install
pnpm dev
# Visit http://localhost:5173
```

### 🔧 **CLI Commands**

```bash
nova64 init [name]               # Scaffold a new project (prompts if name omitted)
nova64 template [name]           # Pick from 60+ example templates
nova64 dev                       # Start dev server for the current project
nova64 --start-demo              # Launch console with all demos (requires build)
nova64 --help                    # Show all options
```

**Options:**

```bash
-p, --port NUM                   # Port to listen on (default: 3000)
--no-open                        # Don't auto-open the browser
```

### 🔍 **Debug Tools**

```bash
# In the browser while running any cart:
F9                               # Toggle debug panel (scene graph, camera, lights, stats)
Shift+X                          # Toggle dev console (cheats, meta.json, env, entities)
?debug=1                         # Add to URL to auto-open debug panel on load
```

---

## 🏗️ **Architecture**

```
nova64/
├── index.html               # Main console launcher
├── package.json             # Dependencies & scripts
├── bin/nova64.js            # CLI entry point (init, template, dev, --start-demo)
├── bin/commands/             # CLI subcommand implementations
│   ├── init.js              # Project scaffolding (code.js, package.json, index.html)
│   ├── template.js          # Interactive template picker (60+ examples)
│   └── dev.js               # Vite dev server for user projects
├── src/main.js              # Core engine bootstrap
├── runtime/                 # Advanced 3D Engine runtime + public API layer
│   ├── gpu-threejs.js       # Public Three.js backend wrapper
│   ├── gpu-babylon.js       # Public Babylon backend wrapper
│   ├── backends/            # Internal backend implementations (threejs/, babylon/)
│   ├── shared/              # Cross-backend runtime contracts and helpers
│   ├── debug-panel.js       # F9 debug panel (scene graph, camera, lights, stats)
│   ├── env.js               # Environment config + Shift+X dev console (cheats, meta)
│   ├── api.js               # Core 2D API (cls, pset, line, rect, print)
│   ├── api-3d.js            # 3D API (createCube, setCameraPosition, etc.)
│   ├── api-effects.js       # Post-processing effects (bloom, vignette, glitch)
│   ├── api-skybox.js        # Skybox system (space, gradient, solid)
│   ├── api-sprites.js       # 2D sprite system with GPU batching
│   ├── api-voxel.js         # Voxel engine API (blocks, chunks, entities)
│   ├── cart-reset.js        # Shared cart-load reset hook registry
│   ├── api-gameutils.js     # Game utilities (shake, cooldowns, spawners, pools)
│   ├── api-generative.js    # Generative art utilities
│   ├── api-presets.js       # Preset configurations
│   ├── input.js             # Input system (WASD, gamepad, mouse, touch)
│   ├── audio.js             # Spatial 3D audio system
│   ├── physics.js           # Physics with AABB collision and gravity
│   ├── collision.js         # Raycasting and spatial partitioning
│   ├── storage.js           # Persistent game data (localStorage)
│   ├── screens.js           # Screen/state management system
│   ├── ui.js                # UI components (buttons, panels, progress bars)
│   ├── wad.js               # DOOM WAD file loader and renderer
│   ├── console.js           # Nova64 class with ES module cart loading
│   ├── framebuffer.js       # High-precision RGBA64 framebuffer
│   ├── font.js              # Bitmap font rendering
│   ├── i18n.js              # Internationalization
│   └── ...                  # editor, store, manifest, nft-seed, logger, etc.
├── os9-shell/               # Mac OS 9-Style Desktop Environment
│   └── src/
│       ├── apps/            # Desktop apps (GameStudio, ModelViewer, hyperNova, etc.)
│       │   └── hypernova/   # HyperCard/Flash authoring tool with NovaTalk scripting
│       ├── components/      # Window manager, taskbar, desktop UI
│       ├── i18n.ts          # Internationalization (EN/ES/JA)
│       ├── os/              # OS-level services and state
│       └── theme/           # Retro Mac OS 9 styling
├── examples/                # 47 Demo Carts
│   ├── minecraft-demo/      # Voxel world with mining and building
│   ├── star-fox-nova-3d/    # Space combat with squadron battles
│   ├── f-zero-nova-3d/      # High-speed futuristic racing
│   ├── cyberpunk-city-3d/   # Neon-lit metropolis
│   ├── dungeon-crawler-3d/  # First-person dungeon exploration
│   ├── wizardry-3d/         # Classic RPG dungeon crawler
│   ├── wing-commander-space/# Space flight sim
│   ├── super-plumber-64/    # 3D platformer
│   └── ...                  # 39 more demos
├── docs/                    # API documentation (HTML & Markdown)
└── tests/                   # Test suites
```

`runtime/` stays the stable public layer. The public `runtime/gpu-threejs.js` and
`runtime/gpu-babylon.js` entrypoints now delegate into `runtime/backends/{threejs,babylon}`,
while `runtime/shared/` holds cross-backend contracts and helpers used by both renderers.
Babylon also has a dedicated compatibility layer in `runtime/backends/babylon/compat.js`
for cart-facing Three-style expectations such as `scene.traverse`, `mesh.visible`,
`material.map`, color helpers, and texture repeat/offset parity.
Engine-level Babylon material assignment now resolves both numeric mesh IDs and mesh
proxies, which keeps WAD-generated wall/floor/sprite materials attached in the same
cart-facing path as Three.js.
Voxel carts now also have a backend-native Babylon path in `runtime/backends/babylon/voxel.js`,
with `runtime/api-voxel.js` delegating chunk/entity mesh creation through backend-aware helpers
instead of constructing raw Three.js meshes in Babylon mode.
The backend split and parity rules are documented in
[docs/BACKEND_RUNTIME.md](docs/BACKEND_RUNTIME.md).
That document also covers the shared cart-reset lifecycle used to clear runtime state on cart loads and dashboard cart switches.

---

## 🎨 **Creating Your First 3D Cart**

Nova64 carts are **ES modules** with three lifecycle functions:

```javascript
let player, ground;
let score = 0;

export function init() {
  // Create ALL 3D objects here — never inside draw()
  ground = createPlane(50, 50, 0x2a4d3a, [0, 0, 0]);
  rotateMesh(ground, -Math.PI / 2, 0, 0);
  player = createCube(1, 0x0088ff, [0, 1, 0], { material: 'metallic' });

  setFog(0x1a1a2e, 10, 30);
  setAmbientLight(0x334466, 1.0);
}

export function update(dt) {
  // Handle input and game logic
  if (key('KeyW')) setPosition(player, 0, 1, -5 * dt);
  if (key('KeyS')) setPosition(player, 0, 1, 5 * dt);

  setCameraPosition(0, 5, 10);
  setCameraTarget(0, 1, 0);
}

export function draw() {
  // 2D HUD overlay — 3D renders automatically
  print(`Score: ${score}`, 10, 10, 0xffffff);
}
```

Load your cart by changing the import path in `src/main.js`.

---

## 📚 **API Reference**

### 🎯 **3D Scene**

```javascript
// Camera
setCameraPosition(x, y, z);
setCameraTarget(x, y, z);
setCameraFOV(degrees);

// Atmospheric
setFog(color, near, far);
clearFog();
setAmbientLight(color, intensity);
createPointLight(color, intensity, distance, [x, y, z]);
```

### 📦 **3D Objects**

```javascript
// Primitives — createX(size/args, color, [x,y,z], options?)
createCube(size, color, [x,y,z], { material, metalness, roughness, emissive, ... })
createSphere(radius, color, [x,y,z], options)
createPlane(w, h, color, [x,y,z], options)
createCylinder(radiusTop, radiusBottom, height, color, [x,y,z], options)
createCone(radius, height, color, [x,y,z], options)
createCapsule(radius, length, color, [x,y,z], options)
createTorus(radius, tube, color, [x,y,z], options)

// Material types: 'standard', 'metallic', 'holographic', 'emissive'

// Transforms
rotateMesh(mesh, x, y, z)
setPosition(mesh, x, y, z)
setScale(mesh, x, y, z)
removeMesh(mesh)          // also: destroyMesh(mesh)
```

### 🎮 **Input**

```javascript
key(keyCode); // Keyboard key held
keyp(keyCode); // Key just pressed
btn(index); // Gamepad button held
btnp(index); // Gamepad button just pressed
(mouseX(), mouseY()); // Mouse position
mouseButton(index); // Mouse button state
```

### 🎨 **2D Overlay**

```javascript
cls(color?)               // Clear screen
pset(x, y, color)         // Set pixel
line(x0, y0, x1, y1, color)
rect(x, y, w, h, color, fill?)
circ(cx, cy, r, color, fill?)
print(text, x, y, color)
printCentered(text, y, color)
drawGlowText(text, x, y, color)
drawCrosshair(x, y, size, color)
drawProgressBar(x, y, w, h, pct, fgColor, bgColor)
```

### 🌌 **Skybox & Effects**

```javascript
createSpaceSkybox();
createGradientSkybox(topColor, bottomColor);
createSolidSkybox(color);
enableSkyboxAutoAnimate(speed);

enableBloom(strength, radius, threshold);
enableVignette(darkness, offset);
enableGlitch(amount);
enableChromaticAberration(offset);
enableN64Mode();
enablePSXMode();
enableLowPolyMode();
```

### 🔊 **Audio**

```javascript
sfx(preset); // Named presets: 'jump', 'coin', 'explosion', ...
sfx({ wave, freq, dur }); // Custom sound
setVolume(level); // Master volume 0.0–1.0
```

### 💾 **Storage**

```javascript
saveData(key, value)
loadData(key, fallback?)
deleteData(key)
```

### 🧊 **Voxel Engine** (selection)

```javascript
updateVoxelWorld(playerX, playerY, playerZ);
setVoxelBlock(x, y, z, blockType);
getVoxelBlock(x, y, z);
raycastVoxelBlock(origin, direction, maxDist);
checkVoxelCollision(x, y, z, w, h, d);
spawnVoxelEntity(type, x, y, z, components);
configureVoxelWorld(options);
saveVoxelWorld(name);
loadVoxelWorld(name);
```

### 🎮 **Game Utilities**

```javascript
createShake() / triggerShake() / updateShake();
createCooldown() / useCooldown() / updateCooldowns();
createPool() / createSpawner() / updateSpawner();
createStateMachine() / createTimer();
createFloatingTextSystem() / drawFloatingTexts();
createMinimap(opts) / drawMinimap(mm, time);
```

### ⚛️ **Physics**

```javascript
createBody(options);
stepPhysics(dt);
setGravity(x, y, z);
setCollisionMap(fn);
```

---

## 🎪 **Demo Gallery** (47 Carts)

| Category              | Demos                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Space & Combat**    | Star Fox Nova, Space Harrier, Wing Commander, Space Combat, Shooter Demo, FPS Demo                          |
| **Racing & Action**   | F-Zero Nova, Super Plumber 64, Strider Demo                                                                 |
| **RPG & Exploration** | Mystical Realm, Dungeon Crawler, Wizardry, Nature Explorer, Adventure Comic                                 |
| **Graphics Showcase** | Crystal Cathedral, Cyberpunk City, PBR Showcase, Skybox Showcase, Particles Demo, TSL Showcase              |
| **Voxel**             | Minecraft Demo, Voxel Creative, Voxel Creatures, Voxel Terrain                                              |
| **Creative & Art**    | Generative Art, Creative Coding, Demoscene, NFT Art Generator, NFT Worlds, Boids Flocking, Game of Life 3D  |
| **Tech Demos**        | Physics Demo, Instancing Demo, Audio Lab, Model Viewer, Input Showcase, Hello 3D, Hello World, Hello Skybox |
| **UI & System**       | UI Demo, Screen Demo, Storage Quest, Test 2D Overlay, Test Font, Test Minimal                               |

---

## 🧪 **Testing**

```bash
pnpm test                # Run all tests
pnpm test:api            # 3D API functions
pnpm test:input          # Input system
pnpm test:starfox        # Star Fox demo validation
pnpm test:integration    # Integration tests
```

---

## 🔧 **Renderer Architecture**

Nova64 uses progressive enhancement with automatic fallback:

1. **Three.js** (default) — Full 3D with advanced materials, lighting, shadows, post-processing
2. **WebGL2** (fallback) — RGBA16F framebuffer, GPU sprite batching, ACES tone mapping
3. **Canvas2D** (compatibility) — CPU rendering with ordered dithering for maximum compatibility

---

## 📄 **License**

MIT — see `LICENSE` for details.

## Version History

### v0.4.8 (Current)

- **hyperNova**: HyperCard/Flash-inspired authoring tool with card stacks, NovaTalk scripting, symbol library, keyframe timelines, and GSAP tweens
- **Internationalization (i18n)**: Full EN/ES/JA support across main site, console, and OS9 shell with runtime `t()` API for carts
- **Debug Panel**: F9 overlay with scene graph, camera inspector, lights editor, and Three.js DevTools bridge
- **TSL Shader Pack**: Custom Three.js Shading Language effects
- **60+ Demo Carts**: Expanded gallery including shader showcase, blend modes, camera platformer, VR/AR demos
- **OS9 Shell Enhancements**: Screensaver system, theme/background customization, locale-aware menus, eMU emulator

See [CHANGELOG.md](CHANGELOG.md) for full version history.
