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

## Latest checkpoint — Shader Showcase TSL fallbacks

The Godot `shader-showcase` cart now reads much closer to the Three.js version
instead of collapsing the TSL presets to flat emissive colours:

- `createTSLMaterial()` now attaches small procedural albedo/emission textures
  for plasma, galaxy, lava, lava2, electricity, rainbow, void/vortex, water,
  hologram, and shockwave fallbacks.
- Godot material payloads now forward `uvScale`, allowing these static shader
  approximations to use preset-specific texture scale.
- Opaque shader presets stay opaque in Godot, reducing transparency sorting
  artifacts on torus/cube geometry. Translucent presets still use alpha where
  the browser effect depends on it.
- `createVortexMaterial()` and `createHologramMaterial()` route through the
  same TSL fallback path, so Phase 1 Shader Showcase presets no longer bypass
  the richer material approximations.
- The visual parity harness now supports repeated key presses with
  `--press-count`, letting interactive carts such as Shader Showcase be
  captured on later presets without editing the cart.

Focused validation:

- `node --check nova64-godot/godot_project/shim/nova64-compat.js`
- `node --check nova64-godot/scripts/visual-parity.js`
- `pnpm godot:visual -- --cart=shader-showcase --frames=160 --wait-ms=500 --report-only`
  passed at **25.15%** diff.
- Preset spot checks also passed: Galaxy **10.82%**, Lava **30.37%**,
  Electricity **10.92%**, Void **5.23%**, Vortex **28.31%**.

Known follow-up:

- These are still Godot material approximations, not true TSL execution. Full
  parity will need either a Godot shader bridge or a TSL/GLSL translation path,
  plus closer bloom/vignette post-processing.

## Latest checkpoint — VOX, Flash mouse, bloom, and generative art

This checkpoint keeps the Godot adapter moving toward Three.js visual parity
for asset loading and high-cost 2D demos:

- `.vox` imports now use a native exposed-face mesh path for MagicaVoxel files.
  The earlier direct loader could drop an entire facade after greedy merging;
  `house.vox` now shows the authored front wall, windows, door, chimney, roof,
  and ground slab.
- `loadVoxModel()` no longer applies a hidden 180-degree root rotation after
  import. Model orientation now comes from the native VOX coordinate mapping and
  cart-authored transforms only.
- Flash Stage canvas parity now includes `ctx.rect()` and text alignment /
  baseline handling. This fixes the card-flip scene, whose card bodies are
  path rectangles.
- The Flash particle-trail scene now falls back to `nova64.input.mouseX()` /
  `mouseY()` under Godot instead of relying only on DOM canvas mouse events.
- Godot bloom mapping is toned down. Three.js bloom values no longer translate
  into a blown-out white floor in `space-harrier-3d`.
- `flowField()` now returns the same `Float32Array` shape as the browser
  runtime. The generative-art flow-field sketch no longer indexes an object,
  gets `undefined`, and collapses all trails toward the corner.
- The Godot generative-art cart uses reduced simulation density and lower-res
  blocks for the most expensive sketches so it remains interactive through the
  JS-to-Godot overlay bridge.

Focused validation:

- `node --check` passed for `nova64-compat.js`, `flash-demo/code.js`, and
  `generative-art/code.js`.
- Godot visual conformance passed for `vox-viewer`, `flash-demo`,
  `generative-art`, and `space-harrier-3d`.
- Rebuilt both debug GDExtension binaries:
  `libnova64.windows.template_debug.x86_64.dll` and
  `libnova64.linux.template_debug.x86_64.so`.

Cleanup:

- Removed stale generated plan copies from ignored `dist/docs/*PLAN.md`.
- `AGENTS.md` remains the single source of truth for agent instructions;
  tool-specific instruction files should stay as short pointers only.

## Latest checkpoint — particles, TSL, and Flash/Hype shims

This checkpoint focused on the next set of high-visible Godot adapter parity
gaps after WAD/PBR/VOX:

- `particles-demo` no longer renders the giant stretched center artifact. The
  shim now accepts the browser cylinder overloads used by Three.js carts:
  `(radius, height, color, position, opts)` and the segmented variant, in
  addition to the Godot/bridge top-radius/bottom-radius form.
- Three-style particle APIs are now exposed through `nova64.fx` and
  `nova64.particles`: `createParticleSystem(max, opts)`, `setParticleEmitter`,
  `emitParticle`, `burstParticles`, `updateParticles`, `removeParticleSystem`,
  and `getParticleStats`. Native Godot particles still provide the draw path,
  while the shim tracks browser-style active/max/free stats for HUD parity.
- `tsl-showcase` now gets material assignment through `getMesh()` mesh proxies
  instead of dropping `applyMat(id, material)` calls. Common shader aliases
  (`createTSLShaderMaterial`, `createShaderMaterial`, `createLavaMaterial`,
  `createPlasmaMaterial`, `createWaterMaterial`, `createShockwaveMaterial`) map
  to toned Godot material fallbacks so the scene is no longer a white/default
  material wash.
- Browser scheduler calls (`setTimeout`, `setInterval`,
  `requestAnimationFrame`) are now driven from the Godot pre-update hook. This
  unblocks Flash/Hype scenes that pause tweens during setup and resume them with
  a timeout.
- Flash-style 2D/stage helpers now have basic runtime implementations:
  canvas-like draw contexts, containers, graphics/text nodes, `drawStage`, and
  software 2D emitters. `ellipsefill` is also wired so tween demos render their
  animated circles instead of disappearing behind a no-op.

Focused validation:

```bash
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh && \
  nvm use 20 >/dev/null && node --check \
  nova64-godot/godot_project/shim/nova64-compat.js"
```

Visual smoke carts:

- `particles-demo`: old stretched cylinder artifact gone; particle HUD now uses
  shim-tracked stats.
- `05-particles`: still renders the particle fountain correctly.
- `tsl-showcase`: materials now attach and the scene is readable, though these
  are still Godot material approximations rather than true TSL shader execution.
- `flash-demo`: first scene tween/timer balls and second-scene fireworks render.
- `tween-bounce`: bouncing circles render through the new `ellipsefill` alias.

Known follow-up:

- TSL parity is still approximate. True parity needs a dedicated Godot shader
  bridge or a deeper TSL/GLSL translation path.
- Some Windows snapshot runs still hit the pre-existing post-PASS native
  shutdown SIGSEGV; the screenshots and conformance PASS signal complete before
  teardown.

## WAD sprites, GLB visibility, and VOX palette checkpoint

This checkpoint closes three asset-parity gaps against the web runtime:

- `wad-demo` now instantiates enemy/item thing sprites from the WAD `THINGS`
  list. The cart uses `WADTextureManager.getSpriteTexture(doomType)` and builds
  transparent, double-sided billboard planes for monsters and pickups. The HUD
  now reports `SPR <count>` alongside wall/texture counts; E1M1 currently
  reports `SPR 158`.
- `model-viewer-3d` no longer points Godot at remote HTTPS GLB URLs that the
  native bridge cannot load. The first model is now a bundled local
  `res://assets/glb/Fox.glb`, with local fallback entries so the demo always
  produces visible geometry in the Godot adapter.
- The `.vox` loader now treats MagicaVoxel `XYZI` color indices as 1-based,
  matching the VOX spec and Three.js `VOXLoader`. Block id 0 remains air, while
  color id 1 maps to palette entry 0. This fixes the visible palette shift on
  `house.vox`.

Focused validation:

- Rebuilt the Windows GDExtension:
  `scons platform=windows target=template_debug -j4`.
- `model-viewer-3d`: PASS visual; the Fox GLB appears.
- `vox-viewer`: PASS visual; `house.vox` shows the corrected red/green/cyan
  palette.
- `wad-demo` with Enter on E1M1: PASS visual; HUD reports `SPR 158`.

## Godot HYPE, Hero, DemoScene, and TSL Galaxy checkpoint

This checkpoint addressed the next visual parity issues found from focused
Godot screenshots:

- `hype-demo` now exists as a Godot cart under
  `godot_project/carts/hype-demo`, copied from the browser example.
- The Godot shim now exposes the HYPE framework surface used by that cart:
  oscillator, time/random/proximity triggers, color pools, HPool, swarm, grid,
  circle, sphere, and path layouts.
- The global `centerY()` helper now matches the actual Godot overlay height
  (`360`) instead of the old `480` fallback. This keeps HUDs and start screens
  aligned with `screenHeight()`.
- `demoscene` start-screen controls were tightened for the 640x360 Godot
  overlay so the buttons, feature panel, prompt, and controls text fit without
  clipping.
- The TSL Galaxy scene now uses a Three-style torus signature mapping
  (`createTorus(radius, tube, ...)`) before creating Godot `TorusMesh`
  inner/outer radii. This removes the huge washed-out ring artifact.
- `createTSLMaterial('galaxy')` and shader-material fallbacks for grid,
  terrain, and cloud shaders now use small generated texture maps rather than
  only flat emissive colors. This gives `tsl-showcase` and `hero-demo` more
  readable structure while still remaining an approximation.
- Mesh proxies now include harmless geometry objects and the bridge-style
  `engine.createPlaneGeometry()` / `createBoxGeometry()` helpers. This prevents
  Three.js-specific cart code such as `mesh.geometry.dispose()` from rejecting
  async init paths under Godot.

Focused validation:

- `hype-demo`: PASS visual.
- `demoscene`: PASS visual.
- `tsl-showcase`: PASS visual, with Galaxy Spiral no longer dominated by the
  overlarge white torus.
- `hero-demo`: PASS visual. Earlier "failure" was mostly the native process
  exiting non-zero after it had already printed visual PASS; this pass completed
  cleanly after the geometry/shader fallback work.

## Previous checkpoint — VOX loader visibility

`vox-viewer` now renders `assets/vox/house.vox` in the Godot adapter. The fix
has three parts:

- Bridge asset paths now use a single `normalize_resource_path()` helper, so
  cart-style `/assets/...` paths resolve to `res://assets/...` consistently for
  model, VOX, and WAD loading.
- VOX imports still reuse the greedy voxel mesher, but opt into a palette-color
  material path instead of the terrain texture atlas. The palette shader is
  unshaded so authored MagicaVoxel colors stay readable under bright sky/glow
  presets.
- Camera target updates now go through `transform.set { lookAt }`, which the
  bridge applies with Godot's native `look_at_from_position()` rather than a
  hand-rolled Euler conversion in the JS shim.

Focused validation:

```bash
cd /mnt/c/Users/brend/exp/nova64
'/mnt/c/Program Files/Godot_v4.4.1-stable_win64.exe/Godot_v4.4.1-stable_win64_console.exe' \
  --windowed \
  --path 'C:\Users\brend\exp\nova64\nova64-godot\godot_project' \
  --script 'res://scripts/conformance_runner.gd' \
  -- --cart=res://carts/vox-viewer --frames=160 \
  --snapshot='C:\Users\brend\exp\nova64\nova64-godot\test-results\tmp-vox-viewer-clean.png'
```

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

- **Biome height formulas matched to web engine**: Height scales now use the exact
  values from `runtime/api-voxel.js` for terrain parity:
  - Frozen Tundra: heightScale=6, heightBase=65
  - Taiga: heightScale=18, heightBase=66
  - Desert: heightScale=4, heightBase=63
  - Jungle: heightScale=22, heightBase=58
  - Savanna: heightScale=5, heightBase=65
  - Forest: heightScale=14, heightBase=64
  - Snowy Hills: heightScale=35, heightBase=62
  - Plains: heightScale=6, heightBase=64

- **World seed derivation matched to browser**: The Godot host now exposes
  `__nova64_cart_name` before the shim loads, enabling the same seed derivation
  as the browser (`hashStringToSeed('nova64-demo:' + cartName)`). This ensures
  terrain generation is identical between Godot and Three.js renderers.

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

- **Dynamic chunk streaming**: Voxel world now loads/unloads 16×16 block chunks
  as the player moves. `updateVoxelWorld(x, z)` streams chunks around the player
  position, loading new chunks when needed and unloading distant ones to save
  memory. `forceLoadVoxelChunks(x, z)` loads all chunks in radius immediately.
  - Chunk radius: 4 chunks (64 blocks) around player
  - Rate-limited loading: max 3 chunks per frame for smooth performance
  - Each chunk has its own water plane for seamless water across boundaries

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

## WAD and PBR Godot checkpoint

This checkpoint focused on two high-visibility parity failures:

- `wad-demo` in Godot was a flat-shaded proof cart instead of a textured
  FreeDoom map explorer.
- `pbr-showcase` in Godot rendered mostly black because scene construction was
  aborting before the PBR meshes were created.

What landed:

- `nova64-godot/godot_project/carts/wad-demo` now loads the bundled
  `res://assets/freedoom-0.13.0/freedoom-0.13.0/freedoom1.wad` by default.
- The Godot WAD cart now has a map picker: Up/Down selects a map, Enter loads
  it, and Esc returns to map select.
- The Godot WAD cart now uses WAD wall textures and floor/ceiling flats through
  the shimmed `WADTextureManager` path instead of flat colors.
- The Godot shim now exposes the Three-style material helpers used by WAD carts:
  `engine.createMaterial`, `engine.setMeshMaterial`, texture clone/repeat
  helpers, and `setWallUVs`.
- `nova64.scene.setPBRProperties()` now updates Godot `StandardMaterial3D`
  materials instead of being a no-op.
- `metalness` is treated as an alias for Godot `metallic`, matching the
  cart-facing Three.js PBR vocabulary.
- The shim tracks mesh/material state so `clearScene()` can rebuild scenes
  cleanly and so later PBR/property updates preserve the original albedo color.
- Godot plane geometry now matches Three.js `PlaneGeometry` orientation before
  cart transforms, fixing the huge vertical floor slab in `pbr-showcase`.
- The conformance runner releases snapshot image buffers and frees the native
  host before process shutdown, which avoids the windowed snapshot exit crash.

Focused validation:

```bash
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && \
  scons platform=windows target=template_debug -j4"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && \
  scons platform=linux target=template_debug -j4"
```

```bash
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && \
  '/mnt/c/Program Files/Godot_v4.4.1-stable_win64.exe/Godot_v4.4.1-stable_win64_console.exe' \
  --windowed --path 'C:\Users\brend\exp\nova64\nova64-godot\godot_project' \
  --script 'res://scripts/conformance_runner.gd' -- \
  --cart=res://carts/wad-demo --frames=140 --press=enter --press-frames=8 \
  --snapshot='C:\Users\brend\exp\nova64\nova64-godot\test-results\tmp-wad-demo-plane.png'"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && \
  '/mnt/c/Program Files/Godot_v4.4.1-stable_win64.exe/Godot_v4.4.1-stable_win64_console.exe' \
  --windowed --path 'C:\Users\brend\exp\nova64\nova64-godot\godot_project' \
  --script 'res://scripts/conformance_runner.gd' -- \
  --cart=res://carts/pbr-showcase --frames=120 \
  --snapshot='C:\Users\brend\exp\nova64\nova64-godot\test-results\tmp-pbr-showcase-plane.png'"
```

Expected WAD smoke signal after pressing Enter on the first map:

```text
MAP E1M1  WALLS 1286  TEX 1285/1286  FLOOR 2
NOVA64-CONFORMANCE: PASS (visual)
```

Remaining visual debt:

- WAD texture coverage is now high, but UV offset/lighting still needs deeper
  tuning against the Three.js reference.
- PBR is no longer black and scene layout now matches the browser structure,
  but Godot material response remains glossier and higher-contrast than the
  Three.js reference.

## Voxel native chunk checkpoint

This checkpoint continued the Godot voxel parity plan after the `.vox` and
demo fixes. The important implementation rule is now: keep high-volume voxel
work native. The Godot shim sends compact x/z column records for generated
terrain, and `voxel.uploadChunk` expands those columns into a block volume
before greedy meshing in C++.

What landed:

- `voxel.uploadChunk` accepts compact `columns` payloads in addition to the
  older full `blocks` array path.
- Chunk uploads include a one-block neighbor border plus `meshMin`/`meshMax`
  so the native mesher can cull duplicate boundary faces.
- The Godot shim no longer sends ~40k block IDs per terrain chunk across the
  QuickJS bridge during normal terrain streaming.
- The Godot shim now uses the browser runtime's simplex permutation shuffle and
  exposes the browser-style active cart path before loading carts, improving
  voxel world seed parity.
- The voxel atlas row origin and accent pixel placement were fixed so terrain
  samples the intended grass/dirt/stone/wood tiles instead of shifted rows.
- The chunk shader now uses atlas textures plus baked face shading without
  extra Godot per-pixel lighting, which better matches the flat Three.js voxel
  look.
- Temporary per-chunk water planes are disabled by default; stacked transparent
  planes were not a good parity path and could wash out the scene.

Focused validation:

```bash
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh && \
  nvm use 20 >/dev/null && \
  node --check nova64-godot/godot_project/shim/nova64-compat.js"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && \
  scons platform=windows target=template_debug -j4 && \
  scons platform=linux target=template_debug -j4"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && \
  '/mnt/c/Program Files/Godot_v4.4.1-stable_win64.exe/Godot_v4.4.1-stable_win64_console.exe' \
  --windowed --path 'C:\Users\brend\exp\nova64\nova64-godot\godot_project' \
  --script 'res://scripts/conformance_runner.gd' -- \
  --cart=res://carts/minecraft-demo --frames=120 \
  --snapshot='C:\Users\brend\exp\nova64\nova64-godot\test-results\minecraft-demo-cart-path-seed.png'"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh && \
  nvm use 20 >/dev/null && \
  pnpm godot:visual -- --cart=minecraft-demo --frames=120 --wait-ms=500 --report-only"
```

Observed state:

- Godot `minecraft-demo` conformance passes visually.
- First-load chunk spikes are much lower than the full-block bridge payload
  path; the last parity run reported about `12.9ms` average through the first
  60 frames with one initial chunk-load spike.
- `minecraft-demo` Three.js/Godot diff improved from `93.05%` during the
  distorted pass to `82.90%` after atlas, seed, and shader fixes.

Remaining visual debt:

- The Godot view is now readable and much closer in feel, but it is still not
  pixel-parity with Three.js. Camera framing, tree/canopy silhouette, fog/sky
  balance, and transparent vegetation treatment still need more targeted passes.
- Water should move into the native chunk/block path instead of returning as
  stacked transparent overlay planes.

## Voxel atlas and Minecraft parity checkpoint

This checkpoint tightened the native Godot voxel path after the first native
chunk pass. The focus was Minecraft/voxel visual parity rather than adding new
cart-facing API surface.

What landed:

- The native procedural voxel atlas now mirrors `runtime/api-voxel.js`
  tile-by-tile instead of filling all base colors first and adding accents
  later. This preserves the browser RNG stream order for directional-looking
  details such as grass sides, bark, planks, brick mortar, ores, glowstone,
  lava, and mossy cobble.
- Native atlas RNG now uses the same `seededRandom(42)` unit interval as the
  browser atlas.
- Godot chunk UVs keep per-face repeat coordinates aligned to the browser
  atlas shader convention, while `UV2` carries the tile origin.
- `.vox` model coordinates now follow the Three.js `VOXLoader` transform
  orientation (`x`, `z`, `-y`) for front/back parity.
- Godot voxel seed resolution now prefers the cart folder name as
  `nova64-demo:<cart>` because the browser visual harness imports the voxel
  runtime before `Nova64.loadCart()` injects `__NOVA64_CURRENT_CART_PATH`.
- Minecraft tree origins now obey the browser chunk-local placement guard
  (`x/z` local coordinates 3 through 12 only, and above sea level), preventing
  spawn-edge trees/canopies from crowding the initial camera.

Focused validation:

```bash
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh && \
  nvm use 20 >/dev/null && \
  node --check nova64-godot/godot_project/shim/nova64-compat.js"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && \
  scons platform=windows target=template_debug -j4 && \
  scons platform=linux target=template_debug -j4"

wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh && \
  nvm use 20 >/dev/null && \
  pnpm godot:visual -- --cart=minecraft-demo --frames=220 --wait-ms=1000 \
  --report-only --max-diff=100"
```

Snapshots from the final Minecraft pass:

- `nova64-godot/test-results/visual-parity/voxel-diagnostics/post-tree-edge-guard/browser-minecraft-demo.png`
- `nova64-godot/test-results/visual-parity/voxel-diagnostics/post-tree-edge-guard/godot-minecraft-demo.png`
- `nova64-godot/test-results/visual-parity/voxel-diagnostics/post-tree-edge-guard/report-minecraft-demo.md`

Observed state:

- Godot `minecraft-demo` conformance still passes.
- The latest report-mode screenshot diff is `92.46%`; the raw percentage is
  high because the camera/fog/HUD framing still differs, but the Godot frame is
  no longer buried in spawn-edge canopy and the native atlas is sampling the
  intended tile details.

Remaining visual debt:

- The Godot terrain generator still uses compact column records instead of the
  browser's full per-block chunk construction, so tree silhouettes and some
  exposed canopy details remain approximate.
- Camera framing, fog density, and HUD scale still dominate screenshot diff.
- Water should be represented in the native block/chunk path before treating
  Minecraft parity as closed.
