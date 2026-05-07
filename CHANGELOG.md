# Changelog

All notable changes to Nova64 are documented here.

## v0.4.9 (Current)

- **Godot native host — merged to trunk** 🎉:
  - The GDExtension (`nova64-godot/gdextension/`), QuickJS bridge,
    cart shim, conformance harness, and visual-parity tooling are
    now part of the main build. Nova64 carts run end-to-end through
    a native Godot 4.x host.
  - Carts running natively: `minecraft-demo`, `f-zero-nova-3d`,
    `star-fox-nova-3d`, `space-harrier-3d`, `fps-demo-3d`, plus the
    00–10 conformance series and the standard 3D/UI/particle demos.
  - `fps-demo-3d` ships a Godot-side WAD start-screen map picker
    that loads `freedoom1.wad` through `nova64.wad.load()`
    (Left/Right or A/D to select a map, Enter/Space/click to start).
    Fixes shipped alongside the picker:
    - Mesh proxy `.visible = false` now dispatches to the host
      (`nova64-compat.js`), so WAD enemy/pickup billboards no longer
      show the placeholder cube behind them.
    - `buildWADLevel()` hides the bootstrap floor/ceiling planes so
      they no longer z-fight with the WAD floor (the "blink") or
      stretch a dummy material across the WAD ceiling.
    - `spawnPickup()` accepts a `doomType` and creates a textured
      WAD sprite billboard for items, matching enemy rendering.
    - `btn()` calls in the cart now use proper integer indices —
      `btn('A')` was being coerced to `btn(0)` (= `ArrowLeft`) and
      both started the game on the picker and fired the gun on
      strafe-left.
  - Outstanding work: WAD wall/flat/sprite/sector-light parity,
    desktop/mobile export proofs, and host-contract docs. Tracked in
    [ROADMAP.md](ROADMAP.md) Phase 3 → *WAD Sub-Roadmap*. **WAD
    parity changes must not regress voxel rendering** — run
    `pnpm godot:visual minecraft-demo` and a `voxel-creative` /
    `voxel-terrain` smoke before landing shared-adapter changes.
- **Godot adapter — voxel parity push** (`feature/godot-adapter`):
  - `minecraft-demo` now boots and renders end-to-end under the Godot
    host. Implements the full 22-function voxel API surface in the JS
    shim (`getVoxelBlock`, `setVoxelBlock`, `moveVoxelEntity`,
    `raycastVoxelBlock`, `spawnVoxelEntity`, `checkVoxelCollision`,
    `getVoxelHighestBlock`, etc.) over a sparse-Map + heightmap model.
  - Heightmap-based terrain generation: 3-octave value noise, 8-biome
    classification matching the web engine's temp/moisture rules,
    biome-aware surface colours, scattered trees with trunk + canopy.
  - MultiMesh-batched terrain rendering: per-colour buckets render
    thousands of columns in ~7-10 multimeshes total. Render distance
    bumped to 64×64 columns with smooth fog falloff.
  - Cart-facing UI text APIs (`drawText`, `drawTextShadow`,
    `drawTextOutline`, `setFont`, `setTextAlign`, `setTextBaseline`)
    and instance APIs (`setInstanceTransform`, `setInstancePosition`,
    `setInstanceColor`, `finalizeInstances`) implemented in the shim;
    HUDs and instanced effects in f-zero / star-fox / space-harrier
    now render correctly under Godot.
  - F-zero camera fix: race start no longer perspective-jumps because
    the init position now matches updatePlaying's z=12 framing.
  - New plan doc: [docs/GODOT_VOXEL_PLAN.md](docs/GODOT_VOXEL_PLAN.md)
    — phased roadmap toward native (C++) voxel parity (face-culled
    chunk mesher, greedy meshing, caves/overhangs, per-block textures
    + skylight).
- **OS9 Shell cart launching**: Fixed Game Studio demo loading, Game Launcher cart routing, and Nova HD demoscene startup to use the standard cart runner path.
- **Game Studio executor**: Removed API parameter injection that collided with modern `nova64.*` destructuring patterns.
- **Regression coverage**: Added tests for OS shell cart URL helpers, Game Launcher catalog paths, and Game Studio cart execution.

## v0.4.8

- **hyperNova**: HyperCard/Flash-inspired authoring tool with card stacks, NovaTalk scripting, symbol library, keyframe timelines, and GSAP tweens
- **Internationalization (i18n)**: Full EN/ES/JA support across main site, console, and OS9 shell with runtime `t()` API for carts
- **Debug Panel**: F9 overlay with scene graph, camera inspector, lights editor, and Three.js DevTools bridge
- **TSL Shader Pack**: Custom Three.js Shading Language effects
- **60+ Demo Carts**: Expanded gallery including shader showcase, blend modes, camera platformer, VR/AR demos
- **OS9 Shell Enhancements**: Screensaver system, theme toggle, locale-aware menus, eMU emulator

## v0.4.0

- **OS9 Desktop Shell**: Full Mac OS 9-style GUI with window management, taskbar, app launcher
- **Game Studio**: In-browser IDE with code editor, live preview, reliable cart switching
- **Model Viewer**: GLB/GLTF with Draco support, DOOM WAD maps with textures/sprites
- **Voxel Engine**: Minecraft-style worlds with chunks, biomes, entities, fluid simulation
- **47 Demo Carts**: Massive expansion of example games and demos
- **Effects API**: N64/PSX/LowPoly retro modes, bloom, vignette, glitch effects
- **Game Utilities**: Shake, cooldowns, spawners, pools, floating text, minimaps, state machines
- **Skybox System**: Space, gradient, and solid skyboxes with auto-animation

## v0.3.x

- **Game Studio Fixes**: Cart switching race conditions, iframe lifecycle management
- **WAD Rendering**: Full DOOM WAD texture/flat/sprite rendering in Model Viewer
- **GLB Draco**: DRACOLoader support for compressed 3D models
- **API Bug Fixes**: Identifier conflicts, scene cleanup, API injection robustness

## v0.2.0

- **Three.js Integration**: Complete transition to Three.js rendering pipeline
- **Advanced Materials**: Holographic, metallic, emissive materials
- **Cinematic Lighting**: Multi-layered lighting with 4K shadow mapping
- **UI System**: Buttons, panels, fonts, progress bars, start screens
- **8 Demo Carts**: Initial demo gallery

## v0.1.0

- **Core 2D API**: Pixel-perfect graphics with RGBA64 precision
- **WebGL2 Backend**: Hardware-accelerated rendering
- **Sprite System**: Batched rendering with animation
- **Physics & Audio**: 2D physics, WebAudio synthesis
