# 🎮 Nova64 — Ultimate 3D Fantasy Console

**Nova64** is a revolutionary fantasy console that brings the magic of Nintendo 64 and PlayStation era 3D graphics to the modern web. Experience the perfect fusion of retro aesthetics with cutting-edge technology, featuring full GPU acceleration, advanced lighting systems, and spectacular visual effects that rival modern games while maintaining that nostalgic charm.

> ✨ **Pure 3D Gaming Experience** — Advanced Three.js integration with Nintendo 64/PlayStation-style rendering, holographic materials, dynamic lighting, and cinematic post-processing effects!

🌐 **Live Site:** [starcade9.github.io](https://starcade9.github.io/)

[![Version](https://img.shields.io/badge/version-0.4.9-blue.svg)](https://github.com/seacloud9/nova64)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](tests/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)

---

## Godot Native Host (in progress)

Nova64 carts now run end-to-end through a native Godot 4.x host via a
GDExtension that embeds QuickJS. See [ROADMAP.md](ROADMAP.md) Phase 3
and [docs/GODOT_VOXEL_PLAN.md](docs/GODOT_VOXEL_PLAN.md) for the
voxel-parity sub-plan.

- **Voxel demo parity push**: `minecraft-demo` boots end-to-end with
  full HUD, hotbar, biome label and rolling biome-tinted terrain
  rendered via Godot MultiMesh. 64×64 column render distance with fog
  falloff. All voxel carts pass the smoke harness.
- **Cart-facing UI APIs filled in**: `drawText`, `drawTextShadow`,
  `drawTextOutline`, `setFont`, `setTextAlign`, `setTextBaseline`,
  plus `setInstanceTransform` / `setInstancePosition` for instanced
  meshes — HUDs in f-zero / star-fox / space-harrier render correctly
  under Godot.
- **Build**: `cd nova64-godot/gdextension && scons platform=linux
  target=template_debug` (and the matching Windows MinGW invocation).
  See [nova64-godot/README.md](nova64-godot/README.md).
- **Smoke**: `powershell -File nova64-godot/scripts/run-cart-smoke.ps1
  <cart-name>` runs each cart for 300 frames against the conformance
  harness.

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

## 🌟 **Recent Updates (v0.4.9)**

### 🛠️ **OS9 Shell Cart Launch Reliability**

- **Game Studio Demo Loading**: Demo carts now fetch through the shared Nova64 runtime URL helpers and execute without colliding with modern `nova64.*` destructuring.
- **Game Launcher Catalog**: Launcher cards now point to their intended demo carts, with tests guarding against missing or duplicate cart paths.
- **Nova HD Demoscene**: The Nova HD demo opens through the standard cart runner instead of a partial custom runtime.

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
- **Babylon NOA Adapter Seam**: Babylon voxel parity work now includes guarded `noa-engine` probe and adapter paths for backend-specific investigation without replacing Nova64's shared voxel API
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
createCube(width, height, depth, color, [x,y,z], options)
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

## 🎪 **Demo Gallery** (71 Carts)

<div align="center">
  <a href="https://starcade9.github.io/console.html?cart=3d-advanced" title="3d Advanced">
    <img src="public/assets/cart-thumbs/3d-advanced.png" width="100" height="100" alt="3d Advanced" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=adventure-comic-3d" title="Adventure Comic 3d">
    <img src="public/assets/cart-thumbs/adventure-comic-3d.png" width="100" height="100" alt="Adventure Comic 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=ar-hand-demo" title="Ar Hand Demo">
    <img src="public/assets/cart-thumbs/ar-hand-demo.png" width="100" height="100" alt="Ar Hand Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=audio-lab" title="Audio Lab">
    <img src="public/assets/cart-thumbs/audio-lab.png" width="100" height="100" alt="Audio Lab" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=babylon-demo" title="Babylon Demo">
    <img src="public/assets/cart-thumbs/babylon-demo.png" width="100" height="100" alt="Babylon Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=blend-aurora" title="Blend Aurora">
    <img src="public/assets/cart-thumbs/blend-aurora.png" width="100" height="100" alt="Blend Aurora" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=boids-flocking" title="Boids Flocking">
    <img src="public/assets/cart-thumbs/boids-flocking.png" width="100" height="100" alt="Boids Flocking" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=camera-platformer" title="Camera Platformer">
    <img src="public/assets/cart-thumbs/camera-platformer.png" width="100" height="100" alt="Camera Platformer" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=canvas-ui-showcase" title="Canvas Ui Showcase">
    <img src="public/assets/cart-thumbs/canvas-ui-showcase.png" width="100" height="100" alt="Canvas Ui Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=creative-coding" title="Creative Coding">
    <img src="public/assets/cart-thumbs/creative-coding.png" width="100" height="100" alt="Creative Coding" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=crystal-cathedral-3d" title="Crystal Cathedral 3d">
    <img src="public/assets/cart-thumbs/crystal-cathedral-3d.png" width="100" height="100" alt="Crystal Cathedral 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=cyberpunk-city-3d" title="Cyberpunk City 3d">
    <img src="public/assets/cart-thumbs/cyberpunk-city-3d.png" width="100" height="100" alt="Cyberpunk City 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=demoscene" title="Demoscene">
    <img src="public/assets/cart-thumbs/demoscene.png" width="100" height="100" alt="Demoscene" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=dungeon-crawler-3d" title="Dungeon Crawler 3d">
    <img src="public/assets/cart-thumbs/dungeon-crawler-3d.png" width="100" height="100" alt="Dungeon Crawler 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=f-zero-nova-3d" title="F Zero Nova 3d">
    <img src="public/assets/cart-thumbs/f-zero-nova-3d.png" width="100" height="100" alt="F Zero Nova 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=filter-glitch" title="Filter Glitch">
    <img src="public/assets/cart-thumbs/filter-glitch.png" width="100" height="100" alt="Filter Glitch" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=flash-demo" title="Flash Demo">
    <img src="public/assets/cart-thumbs/flash-demo.png" width="100" height="100" alt="Flash Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=fps-demo-3d" title="Fps Demo 3d">
    <img src="public/assets/cart-thumbs/fps-demo-3d.png" width="100" height="100" alt="Fps Demo 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=game-of-life-3d" title="Game Of Life 3d">
    <img src="public/assets/cart-thumbs/game-of-life-3d.png" width="100" height="100" alt="Game Of Life 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=generative-art" title="Generative Art">
    <img src="public/assets/cart-thumbs/generative-art.png" width="100" height="100" alt="Generative Art" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hello-3d" title="Hello 3d">
    <img src="public/assets/cart-thumbs/hello-3d.png" width="100" height="100" alt="Hello 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hello-namespaced" title="Hello Namespaced">
    <img src="public/assets/cart-thumbs/hello-namespaced.png" width="100" height="100" alt="Hello Namespaced" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hello-skybox" title="Hello Skybox">
    <img src="public/assets/cart-thumbs/hello-skybox.png" width="100" height="100" alt="Hello Skybox" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hello-world" title="Hello World">
    <img src="public/assets/cart-thumbs/hello-world.png" width="100" height="100" alt="Hello World" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hero-demo" title="Hero Demo">
    <img src="public/assets/cart-thumbs/hero-demo.png" width="100" height="100" alt="Hero Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hud-demo" title="Hud Demo">
    <img src="public/assets/cart-thumbs/hud-demo.png" width="100" height="100" alt="Hud Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=hype-demo" title="Hype Demo">
    <img src="public/assets/cart-thumbs/hype-demo.png" width="100" height="100" alt="Hype Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=input-showcase" title="Input Showcase">
    <img src="public/assets/cart-thumbs/input-showcase.png" width="100" height="100" alt="Input Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=instancing-demo" title="Instancing Demo">
    <img src="public/assets/cart-thumbs/instancing-demo.png" width="100" height="100" alt="Instancing Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=minecraft-demo" title="Minecraft Demo">
    <img src="public/assets/cart-thumbs/minecraft-demo.png" width="100" height="100" alt="Minecraft Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=model-viewer-3d" title="Model Viewer 3d">
    <img src="public/assets/cart-thumbs/model-viewer-3d.png" width="100" height="100" alt="Model Viewer 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=movie-clock" title="Movie Clock">
    <img src="public/assets/cart-thumbs/movie-clock.png" width="100" height="100" alt="Movie Clock" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=mystical-realm-3d" title="Mystical Realm 3d">
    <img src="public/assets/cart-thumbs/mystical-realm-3d.png" width="100" height="100" alt="Mystical Realm 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=nature-explorer-3d" title="Nature Explorer 3d">
    <img src="public/assets/cart-thumbs/nature-explorer-3d.png" width="100" height="100" alt="Nature Explorer 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=nft-art-generator" title="Nft Art Generator">
    <img src="public/assets/cart-thumbs/nft-art-generator.png" width="100" height="100" alt="Nft Art Generator" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=nft-worlds" title="Nft Worlds">
    <img src="public/assets/cart-thumbs/nft-worlds.png" width="100" height="100" alt="Nft Worlds" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=particle-fireworks" title="Particle Fireworks">
    <img src="public/assets/cart-thumbs/particle-fireworks.png" width="100" height="100" alt="Particle Fireworks" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=particle-trail" title="Particle Trail">
    <img src="public/assets/cart-thumbs/particle-trail.png" width="100" height="100" alt="Particle Trail" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=particles-demo" title="Particles Demo">
    <img src="public/assets/cart-thumbs/particles-demo.png" width="100" height="100" alt="Particles Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=pbr-showcase" title="Pbr Showcase">
    <img src="public/assets/cart-thumbs/pbr-showcase.png" width="100" height="100" alt="Pbr Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=physics-demo-3d" title="Physics Demo 3d">
    <img src="public/assets/cart-thumbs/physics-demo-3d.png" width="100" height="100" alt="Physics Demo 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=screen-demo" title="Screen Demo">
    <img src="public/assets/cart-thumbs/screen-demo.png" width="100" height="100" alt="Screen Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=shader-showcase" title="Shader Showcase">
    <img src="public/assets/cart-thumbs/shader-showcase.png" width="100" height="100" alt="Shader Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=shooter-demo-3d" title="Shooter Demo 3d">
    <img src="public/assets/cart-thumbs/shooter-demo-3d.png" width="100" height="100" alt="Shooter Demo 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=skybox-showcase" title="Skybox Showcase">
    <img src="public/assets/cart-thumbs/skybox-showcase.png" width="100" height="100" alt="Skybox Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=space-combat-3d" title="Space Combat 3d">
    <img src="public/assets/cart-thumbs/space-combat-3d.png" width="100" height="100" alt="Space Combat 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=space-harrier-3d" title="Space Harrier 3d">
    <img src="public/assets/cart-thumbs/space-harrier-3d.png" width="100" height="100" alt="Space Harrier 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=stage-cards" title="Stage Cards">
    <img src="public/assets/cart-thumbs/stage-cards.png" width="100" height="100" alt="Stage Cards" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=stage-menu" title="Stage Menu">
    <img src="public/assets/cart-thumbs/stage-menu.png" width="100" height="100" alt="Stage Menu" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=star-fox-nova-3d" title="Star Fox Nova 3d">
    <img src="public/assets/cart-thumbs/star-fox-nova-3d.png" width="100" height="100" alt="Star Fox Nova 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=startscreen-demo" title="Startscreen Demo">
    <img src="public/assets/cart-thumbs/startscreen-demo.png" width="100" height="100" alt="Startscreen Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=storage-quest" title="Storage Quest">
    <img src="public/assets/cart-thumbs/storage-quest.png" width="100" height="100" alt="Storage Quest" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=strider-demo-3d" title="Strider Demo 3d">
    <img src="public/assets/cart-thumbs/strider-demo-3d.png" width="100" height="100" alt="Strider Demo 3d" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=super-plumber-64" title="Super Plumber 64">
    <img src="public/assets/cart-thumbs/super-plumber-64.png" width="100" height="100" alt="Super Plumber 64" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=test-2d-overlay" title="Test 2d Overlay">
    <img src="public/assets/cart-thumbs/test-2d-overlay.png" width="100" height="100" alt="Test 2d Overlay" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=test-font" title="Test Font">
    <img src="public/assets/cart-thumbs/test-font.png" width="100" height="100" alt="Test Font" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=test-minimal" title="Test Minimal">
    <img src="public/assets/cart-thumbs/test-minimal.png" width="100" height="100" alt="Test Minimal" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=tsl-showcase" title="Tsl Showcase">
    <img src="public/assets/cart-thumbs/tsl-showcase.png" width="100" height="100" alt="Tsl Showcase" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=tween-bounce" title="Tween Bounce">
    <img src="public/assets/cart-thumbs/tween-bounce.png" width="100" height="100" alt="Tween Bounce" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=tween-logo" title="Tween Logo">
    <img src="public/assets/cart-thumbs/tween-logo.png" width="100" height="100" alt="Tween Logo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=tween-typewriter" title="Tween Typewriter">
    <img src="public/assets/cart-thumbs/tween-typewriter.png" width="100" height="100" alt="Tween Typewriter" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=ui-demo" title="Ui Demo">
    <img src="public/assets/cart-thumbs/ui-demo.png" width="100" height="100" alt="Ui Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=vox-viewer" title="Vox Viewer">
    <img src="public/assets/cart-thumbs/vox-viewer.png" width="100" height="100" alt="Vox Viewer" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=voxel-creative" title="Voxel Creative">
    <img src="public/assets/cart-thumbs/voxel-creative.png" width="100" height="100" alt="Voxel Creative" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=voxel-creatures" title="Voxel Creatures">
    <img src="public/assets/cart-thumbs/voxel-creatures.png" width="100" height="100" alt="Voxel Creatures" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=voxel-terrain" title="Voxel Terrain">
    <img src="public/assets/cart-thumbs/voxel-terrain.png" width="100" height="100" alt="Voxel Terrain" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=vr-demo" title="Vr Demo">
    <img src="public/assets/cart-thumbs/vr-demo.png" width="100" height="100" alt="Vr Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=vr-sword-combat" title="Vr Sword Combat">
    <img src="public/assets/cart-thumbs/vr-sword-combat.png" width="100" height="100" alt="Vr Sword Combat" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=wad-demo" title="Wad Demo">
    <img src="public/assets/cart-thumbs/wad-demo.png" width="100" height="100" alt="Wad Demo" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=wing-commander-space" title="Wing Commander Space">
    <img src="public/assets/cart-thumbs/wing-commander-space.png" width="100" height="100" alt="Wing Commander Space" style="margin: 2px; object-fit: cover;">
  </a>
  <a href="https://starcade9.github.io/console.html?cart=wizardry-3d" title="Wizardry 3d">
    <img src="public/assets/cart-thumbs/wizardry-3d.png" width="100" height="100" alt="Wizardry 3d" style="margin: 2px; object-fit: cover;">
  </a>
</div>

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

### v0.4.9 (Current)

- Fixed OS9 Shell Game Studio, Game Launcher, and Nova HD cart launch regressions
- Added regression tests for cart URL helpers, Game Launcher catalog paths, and Game Studio cart execution

### v0.4.8

- **hyperNova**: HyperCard/Flash-inspired authoring tool with card stacks, NovaTalk scripting, symbol library, keyframe timelines, and GSAP tweens
- **Internationalization (i18n)**: Full EN/ES/JA support across main site, console, and OS9 shell with runtime `t()` API for carts
- **Debug Panel**: F9 overlay with scene graph, camera inspector, lights editor, and Three.js DevTools bridge
- **TSL Shader Pack**: Custom Three.js Shading Language effects
- **60+ Demo Carts**: Expanded gallery including shader showcase, blend modes, camera platformer, VR/AR demos
- **OS9 Shell Enhancements**: Screensaver system, theme/background customization, locale-aware menus, eMU emulator

See [CHANGELOG.md](CHANGELOG.md) for full version history.
