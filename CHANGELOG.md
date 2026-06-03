# Changelog

All notable changes to Nova64 are documented here.

## v0.5.2 (Current) — _Hippie Sunshine_

RetroArch core parity push + cross-platform release-cores expansion +
publish-pipeline hardening.

- **RetroArch core — Canvas UI extensions** (`retroarch/nova64_libretro.c`):
  - `parseCanvasUI` now renders `<image>` tags, text effects, quadratic
    Bézier paths, smooth cubic paths, SVG arcs, group clipping, advanced
    cube transparency, and font-family selection.
- **RetroArch core — controller face-key bridge**: RetroPad face buttons
  bridge to DOM-style `KeyZ`/`KeyX`/`KeyC`/`KeyV`, and SELECT bridges to
  `KeyI`/`Tab`, so inventory/menu carts work on a gamepad without
  per-cart edits.
- **release-cores Linux armhf target**: `nova64_libretro_linux_armhf.so`
  now ships via `dockcross/linux-armv7`, alongside Linux x86_64, macOS
  universal, Windows, Linux ARM64 (Pi), and Android (3 ABIs).
- **dockcross zlib hardening**: arm64/armhf cross-builds now build zlib
  with `-fPIC` from a pinned GitHub tag, with shell quoting preserved
  end-to-end through CI.
- **Linux core CI smoke test**: runs before the npm/release publish to
  catch broken cores before they ship.
- **`prepublishOnly` hardened**: was `validate && build`, now
  `lint && test:all && build` — npm publishes are blocked on lint and
  the full `test:all` suite.
- **Publish workflow ordering**: `.github/workflows/publish.yml` runs
  tests **before** build so a failing suite cannot ship a stale `dist/`
  (matches the strengthened `prepublishOnly`).
- **Agent guardrails consolidated**: `AGENTS.md` is now the single source
  of truth for repo guidance across all coding agents. `CLAUDE.md`,
  `CODEX.md`, `GEMINI.md`, `COPILOT.md` are thin pointers.
- **Local cart save dir gitignored**: `/nova64/` (runtime save data
  written by the RetroArch core under local testing) is no longer
  surfaced in `git status`.

## v0.5.1

- Package metadata refresh and post-namespace-migration polish.

## v0.5.0 — _The Great Namespace Push_

- **Grouped `nova64.*` namespace**: 100+ bare globals retired. Every
  cart in the official gallery (71+) and every internal runtime callsite
  migrated to `nova64.draw.*`, `nova64.scene.*`, `nova64.camera.*`,
  `nova64.light.*`, `nova64.fx.*`, `nova64.shader.*`, `nova64.input.*`,
  `nova64.audio.*`, `nova64.physics.*`, `nova64.voxel.*`, `nova64.ui.*`,
  `nova64.tween.*`, `nova64.sprite.*`, `nova64.data.*`, `nova64.util.*`,
  `nova64.xr.*`, `nova64.wad.*`. `runtime/namespace.js` (`NAMESPACE_MAP`
  + `buildNamespace()`) is the single canonical cart-facing contract
  shared by Three.js, Babylon, and Godot.
- **Babylon Noa voxel adapter**: `runtime/backends/babylon/noa-adapter.js`
  + `noa-prototype.js` lets Babylon back the shared `nova64.voxel.*` API
  with native chunk meshing — identical cart code, two voxel runtimes.
- **Babylon WAD/XR/TSL parity**: WAD walls/floors/sprites flow through
  the same engine-assigned mesh proxy path Three.js uses; native Babylon
  WebXR (`@babylonjs/core` 9.4.1) with Cardboard fallback; deterministic
  seeded TSL galaxy showcase guardrail.
- **Godot native host trunk-class**: `minecraft-demo`, `f-zero-nova-3d`,
  `star-fox-nova-3d`, `space-harrier-3d`, `fps-demo-3d` (with WAD map
  picker) running natively via GDExtension + QuickJS; JS syntax
  highlighting + ESLint wired into the Godot editor for cart `code.js`
  files.
- **Runtime hardening**: cart-reset hook registry
  (`runtime/cart-reset.js`), `_loadGeneration` race guard in the cart
  loader, namespace-aware effects pipeline so stale bindings cannot
  silently no-op.
- **Migration tooling shipped**: `scripts/migrate-to-namespace.{cjs,js}`,
  `scripts/audit-carts.mjs`, `scripts/walk-carts.mjs`.

## v0.4.9

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
