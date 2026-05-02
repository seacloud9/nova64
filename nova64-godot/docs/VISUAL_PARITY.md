# Godot Visual Parity Notes

Status of the Godot adapter's visual fidelity relative to the Three.js / Babylon
backends. Updated incrementally as parity work lands. The companion code lives
in `gdextension/src/bridge.cpp` (host) and `godot_project/shim/nova64-compat.js`
(cart-facing JS shim).

## Current state

Cart smoke: **57 / 63 PASS**. Pre-existing failures: `demoscene`,
`mystical-realm-3d`, `space-combat-3d`, `super-plumber-64` (GPU-effect headless
crashes — `createTSLMaterial` + bloom in headless mode), plus 2 intermittent
native-shutdown flakes. All unrelated to rendering or gameplay logic.

Both Linux (`platform=linux`) and Windows (`platform=windows use_mingw=yes`)
gdextension builds are clean.

## What's wired

### Phase 1 — initial parity (commits `1d2a7b2`, `3386527`)

- Auto `WorldEnvironment` with procedural sky, sky-sourced ambient and
  reflection, filmic tonemap, glow, and adjustment defaults.
- Default shadow-on directional light with tilted sun.
- Camera defaults: FOV 60, near 0.1, far 1000.
- `OmniLight3D` and `SpotLight3D` (`light.createPoint`, `light.createSpot`),
  plus `light.setColor` / `light.setEnergy`.
- Real `CylinderMesh`, cone (`CylinderMesh` with zero top radius), and
  `TorusMesh` geometry.
- `env.set` surface for ambient, background, fog, glow, tonemap, exposure.

### Phase 2 — sky / materials / post-FX (commit `b6bc514`)

- 9 sky presets via `env.set { skyPreset }`: `space`, `sunset`, `dawn`,
  `night`, `foggy`, `dusk`, `storm`, `alien`, `underwater`.
- `material.create` upgrade: shading mode (per-pixel / per-vertex / unshaded),
  diffuse mode (lambert / lambert_wrap / toon / burley), specular mode
  (toon / disabled / GGX), emission + energy, rim + tint, clearcoat + roughness,
  anisotropy, transparency (alpha / scissor / hash / depth_prepass), alpha cut,
  blend (add / sub / mul / alpha), cull (front / back / disabled), double
  sided, texture maps (albedo / normal / emission / roughness / metallic / AO),
  UV scale.
- Post-FX through `env.set`: SSR (+ steps), SSAO (+ intensity), volumetric fog
  (+ density), exposure, tonemap (linear / reinhard / filmic / aces),
  brightness / contrast / saturation, sky color tweaks.
- Shutdown crash fix: `WorldEnvironment` is detached and its `Sky` ref dropped
  before the JS runtime tears down, avoiding a SIGSEGV on some carts.

### Phase 3 — wire shim stubs to real bridge calls (commit `cf79abb`)

Cart-facing APIs that were `warnOnce` stubs now produce real Godot scene-graph
state. All entries below are in `godot_project/shim/nova64-compat.js`.

- `setCameraFOV(deg)` → `camera.setParams { fov }` against the tracked active
  camera.
- `createParticles` / `createParticleSystem` → `particles.create` with an
  auto-generated sphere draw-pass mesh and an unshaded additive emissive
  material so particles glow by default. Returns a fat handle with
  `destroy()` and `setPosition(x, y, z)`.
- `loadTexture(path[, cb])` → `texture.createFromImage` with cart-relative
  path resolution (`res://carts/<cart>/...`) and an optional callback.
- `createTexture({ path | width, height, pixels })` → `texture.createFromImage`.
- `createInstancedMesh(geom, count, color, opts)` → `mesh.createInstanced`
  using a real `MultiMeshInstance3D` (no longer the single-cube fallback).
  Accepts string geometry names (`'sphere'`, `'box'`, `'cylinder'`, `'cone'`,
  `'torus'`, `'plane'`). Optional emissive glow via `opts.emissive` /
  `opts.emissiveIntensity`. `setInstanceTransform` and `setInstancePosition`
  route through `instance.setTransform`.
- `createPBRMaterial(opts)` → full `StandardMaterial3D` PBR surface (albedo,
  metallic, roughness, specular, emission, rim, clearcoat, anisotropy,
  normal/albedo/roughness/metallic/AO/emission texture maps).
- `createHologramMaterial(opts)` → emissive + additive blend + alpha + rim,
  double sided, unshaded.
- `createVortexMaterial(opts)` → emissive additive alpha unshaded base.
- `createTSLMaterial(opts)` → tasteful emissive PBR fallback.
- `createAdvancedCube(color, pos)` → real PBR cube (metallic 0.6,
  roughness 0.3).
- Internal `_resolveGeomString` helper maps `'sphere'`/`'box'`/etc. to real
  geometry handles for any API that takes a geom name.

#### Phase 3 crash fix

The Phase 2 `createInstancedMesh` was passing a `null` emission color when
`opts.emission` was missing. That caused a deterministic shutdown SIGSEGV on
`cyberpunk-city-3d` during teardown of the multimesh material. Phase 3
hardens it to only forward properties the caller explicitly supplied.

### Phase 4 — 2D overlay, UI, TSL shaders, voxel improvements

Real 2D overlay path and UI widgets for HUD / start screen parity:

- **Gradient overlay op** (`bridge.cpp`): Native `overlay.batch` now handles
  `['gradient', x, y, w, h, topColor, bottomColor]` using
  `canvas_item_add_polygon` with per-vertex colors for smooth vertical
  gradients — no more banded horizontal slices.
- **Triangle overlay op**: Native filled/outlined triangles via
  `['triangle', x0, y0, x1, y1, x2, y2, color, filled]`.
- **`drawGradientRect(x, y, w, h, top, bottom, filled)`**: Uses the native
  gradient op for start screen backgrounds and HUD panels.
- **`createButton` / `updateAllButtons` / `drawAllButtons`**: Full button
  system with hover/pressed states, click detection via `mouseX/mouseY/
  mouseDown/mousePressed`, and customizable colors.
- **`createPanel` / `drawPanel`**: Panel objects with shadow, gradient fill,
  and border support. Both the simple `(x,y,w,h,fill,border)` signature and
  the object-based signature from `ui.createPanel` work.

TSL shader material fallbacks expanded to 15 presets:

- `plasma`, `plasma2`, `lava`, `lava2`, `void`, `hologram`, `electricity`,
  `rainbow`, `vortex`, `galaxy`, `water`, `shockwave`, `fire`, `ice`, `neon`.
- Each preset has tuned color, emission, emissionEnergy, blend mode, metallic,
  roughness, and rim settings to approximate the animated GLSL shaders.

Voxel parity enhancements:

- **Individual block rendering**: Voxel terrain now renders as individual
  1x1x1 cubes instead of stretched vertical columns. This creates the
  authentic Minecraft blocky aesthetic that matches the browser renderer.
- **Multi-layer terrain**: Surface block + 3 subsurface layers (dirt, stone)
  are rendered, showing terrain depth and natural block variation.
- **Ore generation**: Coal and iron ore blocks spawn at depth with proper
  colors (dark gray and tan specks respectively).
- **Individual tree blocks**: Tree trunks render as stacked 1x1 blocks, and
  leaf canopies render as clusters of individual leaf blocks with random
  holes for a natural look.
- **Multi-octave terrain noise**: Height generation uses 3 octaves of FBM
  noise at different frequencies for more natural terrain variation with
  hills, valleys, and fine detail.
- **Block type constants** (`VX_BLOCK_TYPES`): Exposed as `nova64.voxel.
  BLOCK_TYPES` matching the browser's 26+ block types (GRASS, DIRT, STONE,
  SAND, WATER, WOOD, LEAVES, ores, etc.).
- **Improved block colors**: All 26 block types now have accurate colors
  matching the browser renderer (diamond ore cyan, gold ore golden, etc.).
- **Biome-specific terrain**: Surface colors vary by biome (desert sand,
  snowy tundra white, jungle deep green, etc.).
- **Biome-specific trees**: Tree density, trunk color, leaf color, and canopy
  shape now vary by biome (tall narrow Taiga spruce, wide Jungle canopy,
  flat Savanna acacia).
- **Water plane** with semi-transparency (opacity 0.75) and better material
  (roughness 0.15, metallic 0.4).
- **Atmospheric fog** automatically set when voxel world generates, with
  sky-blue color matching render distance.

### Phase 5 — Voxel visual parity push

Major improvements to close the gap between Godot and browser voxel rendering:

- **Block ID to texture atlas mapping fix**: The chunk upload now sends actual
  block type IDs (1=GRASS, 2=DIRT, 3=STONE, etc.) instead of sequential palette
  indices. This allows `bridge.cpp`'s `voxel_tile_index_for_face()` to select
  the correct texture atlas tile for each block, giving grass its green top
  texture, dirt its brown texture, etc.

- **Increased render radius**: Changed from 32 blocks to 40 blocks (80x80
  columns). This is a balance between visual coverage and performance.

- **Fast hash-based ore generation**: Ores spawn in the visible stone layer
  (3-6 blocks below surface) using fast 3D hashing instead of expensive FBM:
  - Diamond ore: y < 16, very rare (0.5%)
  - Gold ore: y < 32, rare (1.5%)
  - Iron ore: y < 64 (3.5%)
  - Coal ore: common (6%)

- **3D simplex noise**: Added `noise3D()` and `fbm3D()` to the JS shim for
  future use (currently not used for world gen due to performance).

### Phase 5b — Voxel terrain visual improvements

Fixes for broken voxel rendering (stretched columns, zigzag trees, visual artifacts):

- **Reduced biome height extremes**: Terrain height scales significantly reduced
  to eliminate extreme cliffs and visual artifacts:
  - Snowy Hills: 35 → 12
  - Taiga: 18 → 8
  - Jungle: 22 → 10
  - Forest: 14 → 6
  - Other biomes similarly adjusted for smoother, natural terrain

- **Smart subsurface rendering**: Instead of rendering fixed depth layers,
  the system now checks neighboring column heights to determine which subsurface
  blocks are actually visible on slopes. Limited to 5 layers max to prevent
  overdraw. Shows dirt (first 2 layers) and stone (deeper layers).

- **Simplified tree canopies**: Replaced individual leaf block clusters (which
  created zigzag visual artifacts) with single scaled cubes per canopy:
  - Taiga: Tall narrow spruce (2×3×2)
  - Jungle: Wide canopy (4×3×4)
  - Savanna: Flat umbrella acacia (5×1.5×5)
  - Default/Forest: Standard (3×2×3)
  - Tree trunks remain as individual 1×1×1 blocks for authentic blocky look

- **Atmospheric fog**: Sky-blue fog automatically set when voxel world generates,
  with near/far distances scaled to render radius for proper distance fade.

### Phase 6 — Input play-feel and default visual punch (commit `TBD`)

Improvements to core play responsiveness and out-of-the-box scene atmosphere.

#### Input improvements (`bridge.cpp` + `nova64-compat.js`)

- **Stick response shaping** — `_cmd_input_poll` now applies a tuned response
  curve to gamepad axes before using them. A 0.18 deadzone rejects joystick
  noise; the remaining range is normalized and raised to a 1.35 power for a
  natural feel (`shape_axis` lambda in bridge.cpp).
- **Stick → directional fallback** — left-stick X/Y beyond a `dir_threshold`
  of 0.35 now sets the `left` / `right` / `up` / `down` boolean flags in the
  poll result alongside D-pad presses. Previously a stick push had no effect
  on `btn(0-3)`.
- **`btn(i)` / `btnp(i)` unified directions** — the shim's `btn()` and
  `btnp()` functions for indices 0–3 additionally check
  `inputState.left/right/up/down` from the polled state object, matching the
  web runtime's unified directional surface. Gamepad steering now works
  identically to keyboard arrows for any cart that uses the `btn()` API.
- **Input conformance test** — `nova64-godot/tests/conformance/test-input-parity.mjs`
  extended with a `'directional fallback from polled state'` group. Result:
  **42 passed, 0 failed**.

#### Visual improvements (`bridge.cpp` `_ensure_environment()`)

- **Punchier sky** — default procedural sky gradients are darker and more
  saturated: sky top `(0.12, 0.22, 0.40)`, horizon `(0.42, 0.50, 0.62)`.
  Scenes look atmospheric rather than washed-out from the first frame.
- **Lower ambient energy** — default ambient down to `0.72` so scene contrast
  is not flattened by over-bright fill light.
- **Sharper post-processing baseline** — `adjustment_contrast 1.12`,
  `adjustment_saturation 1.08` for that warm retro feel without a meta.json
  override.
- **Tuned glow baseline** — `glow_intensity 0.92`, `glow_strength 1.15`,
  `glow_bloom 0.08`, `hdr_bleed_threshold 0.9`; emissive materials read
  correctly out of the box.
- **Tighter tonemap** — filmic tonemapper with `exposure 0.96`, `white 5.0`
  prevents over-bright emissive blowout while keeping rich darks.

## Deferred

These are intentionally unwired and remain `warnOnce` stubs or fallbacks.

- DOF — Godot 4 moved DOF off `Environment` onto `CameraAttributesPractical`.
  Wiring it requires a new `camera.setAttributes` bridge command.
- `loadModel(path, cb)` — needs a `model.load` bridge command using
  `ResourceLoader::load(path, "PackedScene")` and instancing under the host.
- Pixelation, dither, real radial vignette — would need `SubViewport` and
  fragment shader materials.
- `createEmitter2D`, stage / screens / cards / menus — UI primitives,
  lower priority. **`createShake` / `triggerShake` / `updateShake` are now real
  (Phase 5).**
- Custom shader materials and animated UV scrolling for the vortex /
  hologram presets — would need `material.setUvScale` per frame.

## Build / smoke commands

### Phase 5 — gameplay systems: tween engine, game utilities, reactive store (commit `0a28f6e`)

Pure-logic gameplay primitives that carts use for polish, progression, and HUD.
No C++ rebuild was needed for the JS portions; `bridge.cpp` gained one new hook.

#### Tween engine

- **`Ease` object** — 30+ named easing functions covering linear, quad, cubic,
  quart, sine, expo, elastic, back, and bounce families, plus all `hype.js`
  alias names (`easeOutCubic`, `easeOutElastic`, etc.).
- **`createTween(opts)`** — hype-style (`{ from, to, duration, ease, loop, yoyo,
  onUpdate, onComplete }`) returns a live tween with `.value`, `.progress`,
  `.done`, `.tick(dt)`, `.play()/.pause()/.stop()/.restart()/.kill()`,
  `.register()/.unregister()` for the active-tween registry.
- **`createTween(target, toProps, dur, opts)`** — nova-style: mutates the target
  object's properties each `.tick(dt)`, auto-registered by default.
- **`updateTweens(dt)`** — advances every registered tween; done tweens are
  pruned automatically.
- **`killAllTweens()`** — clears the entire registry.
- **`bridge.cpp` `__nova64_preUpdate` hook** — called each frame before the
  cart's `update(dt)`. Ticks `updateTweens(dt)` and advances `novaStore.time`
  so carts that don't call `updateTweens` manually still get correct tween
  advancement.

#### Screen shake

- **`createShake(opts)`** — `{ mag, x, y, decay, maxMag }` struct.
- **`triggerShake(shake, magnitude)`** — stacks an impulse capped at `maxMag`.
- **`updateShake(shake, dt)`** — decays `mag` and randomises `x/y` offsets.
- **`getShakeOffset(shake)`** — returns `[x, y]` for HUD offset.

#### Cooldown system

- **`createCooldown(duration)`**, **`useCooldown(cd)`** (returns `false` if not
  ready), **`cooldownReady(cd)`**, **`cooldownProgress(cd)`**,
  **`updateCooldown(cd, dt)`**, **`createCooldownSet(defs)`**,
  **`updateCooldowns(set, dt)`**.

#### Hit state / invulnerability

- **`createHitState(opts)`** — `{ invulnTimer, invulnDuration, blinkRate,
  flashTimer }`.
- **`triggerHit(hitState)`** — starts invuln window, returns `false` if already
  invulnerable.
- **`isInvulnerable(hitState)`**, **`isVisible(hitState, time)`** (blink logic),
  **`isFlashing(hitState)`**, **`updateHitState(hitState, dt)`**.

#### Spawn wave manager

- **`createSpawner(opts)`** — wave counter, interval timer, `baseCount +
  countGrowth` per wave, optional `spawnFn(wave, i, count)` callback.
- **`updateSpawner(spawner, dt)`**, **`triggerWave(spawner)`**,
  **`getSpawnerWave(spawner)`**.

#### Object pool

- **`createPool(maxSize, factory)`** — pre-allocates objects; `.spawn(initFn)`,
  `.forEach(fn)` (return `false` to kill), `.kill(obj)`, `.recycle()`,
  `.count` getter.

#### Floating text system

- **`createFloatingTextSystem()`** — `.spawn(text, x, y, opts)` (supports `z`
  for 3D), `.update(dt)`, `.getTexts()`, `.clear()`, `.count`.

#### State machine

- **`createStateMachine(initialState)`** — `.on(state, { enter, update, exit })`
  handler registration, `.switchTo(state)`, `.update(dt)`, `.getState()`,
  `.getElapsed()`, `.is(state)`.

#### Eased timer

- **`createTimer(duration, opts)`** — `.update(dt)`, `.progress()` (0→1),
  `.reset()`, `.done`, `.loop`, `.onComplete` callback.

#### Reactive game store

- **`createGameStore(initialState)`** — Zustand-compatible polyfill: `.getState()`,
  `.setState(partial | fn)`, `.subscribe(listener)` (returns unsubscribe fn),
  `.destroy()`.
- **`novaStore`** — global singleton pre-seeded with `{ gameState, score, lives,
  level, time, paused, playerX, playerY }`. `time` is auto-advanced by the
  `__nova64_preUpdate` bridge hook each frame.

#### Namespace exposure

All Phase 5 functions are available three ways:

1. **Bare globals** — `createShake(...)`, `triggerHit(...)`, `updateTweens(dt)`,
   `Ease.outCubic`, etc.
2. **`nova64.util` namespace** — all game utility functions.
3. **`nova64.stage` namespace** — shake functions.
   **`nova64.data` namespace** — `createGameStore`, `novaStore`.
   **`nova64.tween` namespace** — `createTween`, `updateTweens`, `killAllTweens`, `Ease`.

```bash
# Linux gdextension
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension \
  && scons platform=linux target=template_debug -j$(nproc)'

# Windows gdextension (mingw under WSL)
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension \
  && scons platform=windows target=template_debug use_mingw=yes -j$(nproc)'

# Sync example carts into the godot project
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64 \
  && bash nova64-godot/scripts/sync-carts.sh'

# Cart smoke (all carts)
powershell -NoProfile -ExecutionPolicy Bypass \
  -File nova64-godot\scripts\run-cart-smoke.ps1

# Cart smoke (specific carts)
powershell -NoProfile -ExecutionPolicy Bypass \
  -File nova64-godot\scripts\run-cart-smoke.ps1 cyberpunk-city-3d
```

## All-cart browser vs Godot parity harness

The dedicated parity harness compares every cart that exists in both
`examples/` and `nova64-godot/tests/carts/`.

It captures:

- browser Three.js reference PNGs
- Godot host PNGs
- pixelmatch diff PNGs
- `report.json`
- `report.md`

Outputs are written under:

```text
nova64-godot/test-results/visual-parity/
```

Run a report without failing on visual drift:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && pnpm godot:visual'
```

Run as a failing test gate:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && pnpm test:godot:visual'
```

Run one cart:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && \
  node nova64-godot/scripts/visual-parity.js --cart=particles-demo'
```

If Godot is not on `PATH`, point the harness at it:

```bash
GODOT=/path/to/godot pnpm godot:visual
```

### Godot binary autodiscovery (WSL / Windows)

The harness no longer requires `godot` to be on `PATH`.
`nova64-godot/scripts/visual-parity.js` resolves the Godot binary in this
order:

1. `$GODOT` if set.
2. `godot` or `godot4` on `PATH` (via `which` / `where`).
3. The standard Windows install used by `run-cart-smoke.ps1`:

   ```text
   C:\Program Files\Godot_v4.4.1-stable_win64.exe\Godot_v4.4.1-stable_win64_console.exe
   ```

   Under WSL this is auto-translated to:

   ```text
   /mnt/c/Program Files/Godot_v4.4.1-stable_win64.exe/Godot_v4.4.1-stable_win64_console.exe
   ```

4. Falls back to `godot` and emits a clear error if nothing is found.

So under WSL the canonical run is just:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && pnpm godot:visual'
```

No `GODOT=...` prefix, no manual PATH edits — the Windows Godot exe is
launched directly through `/mnt/c/...` and renders headlessly into the
parity report.

The report mode is intentionally non-gating because Godot still has broad
visual parity debt. Use the worst-diff table in `report.md` to choose the next
bridge/shim fixes.

## Voxel parity checkpoint

Focused command:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && \
  pnpm godot:visual -- --cart=minecraft-demo --cart=voxel-terrain --frames=120 --wait-ms=3000 --max-diff=100'
```

Latest measured diffs:

- `minecraft-demo`: **60.53%**
- `voxel-terrain`: **95.08%**

These are successful lifecycle captures, not acceptable parity results. The
Godot host is booting the carts, loading sidecar `meta.json`, drawing the HUD,
and rendering native scene content, but the voxel path is still the JS shim's
heightmap/column approximation. The next improvement should be the native
`voxel.uploadChunk` bridge command from `docs/GODOT_VOXEL_PLAN.md`, followed by
shader/environment tuning so the Godot frame is not washed out compared with
the browser reference.

## Demoscene parity push

The current focused target is `examples/demoscene`, captured after pressing
Space so the comparison samples the active scene rather than the title screen.

Current focused command:

```bash
wsl bash -lc 'export NVM_DIR=/home/seacloud9/.nvm; \
  . /home/seacloud9/.nvm/nvm.sh; nvm use 20; \
  cd /mnt/c/Users/brend/exp/nova64 && \
  pnpm godot:visual -- --cart=demoscene --press=Space --frames=300 --wait-ms=5000 --max-diff=100'
```

Latest measured diff: **41.41%**. That is a real improvement from the previous
timeout / invalid-reference state, but it is not the 90% parity target yet
(90% parity means approximately **10% or lower pixel diff** with the current
pixelmatch settings).

What landed for this pass:

- Browser capture now waits for `__nova64CartLoadState.ready` so heavy carts are
  compared after `init()` finishes.
- The debug panel console serializer handles `BigInt`, fixing the demoscene
  browser init crash.
- The demoscene cart uses a seeded RNG so procedural layout is stable between
  runs.
- Godot material assignment now works through `mesh.create { material }` and
  `mesh.material = handle` in the shim.
- Godot TSL fallbacks, bloom strength, chromatic-aberration approximation,
  effect status, UI button stubs, and normalized voxel noise were improved.
- Godot fog density now better approximates the heavy Three.js fog in the
  demoscene frame.
- The demoscene foreground cloud layer was reduced so it no longer hides the
  whole Three.js reference frame.

Remaining work to reach the 90% parity bar:

- ~~Add a real Godot 2D overlay path for `rect`, `print`, `drawText*`,
  `drawPanel`, and progress bars.~~ ✅ Done in Phase 4.
- ~~Replace the TSL placeholder materials with closer Godot shader fallbacks for
  `plasma` and `void`, including animated color/opacity.~~ ✅ Done in Phase 4
  (15 presets with tuned colors/emission).
- Add fixed-timestep browser capture or expose a deterministic capture frame,
  because the browser demoscene advances by wall-clock time while Godot advances
  by fixed frame count.
- Add real post-processing passes for vignette, chromatic aberration,
  pixelation, and dithering instead of only mapping what can fit into
  `WorldEnvironment`.
- Revisit camera/coordinate parity after overlay and post-FX land; the current
  remaining difference is dominated by foreground cloud/sky composition and
  timing differences.
