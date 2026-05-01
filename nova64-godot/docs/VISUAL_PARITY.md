# Godot Visual Parity Notes

Status of the Godot adapter's visual fidelity relative to the Three.js / Babylon
backends. Updated incrementally as parity work lands. The companion code lives
in `gdextension/src/bridge.cpp` (host) and `godot_project/shim/nova64-compat.js`
(cart-facing JS shim).

## Current state

Cart smoke: **62 / 63 PASS**. The single outstanding failure is
`space-combat-3d`, a pre-existing native shutdown flake unrelated to rendering.

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

## Deferred

These are intentionally unwired and remain `warnOnce` stubs or fallbacks.

- DOF — Godot 4 moved DOF off `Environment` onto `CameraAttributesPractical`.
  Wiring it requires a new `camera.setAttributes` bridge command.
- `loadModel(path, cb)` — needs a `model.load` bridge command using
  `ResourceLoader::load(path, "PackedScene")` and instancing under the host.
- Pixelation, dither, real radial vignette — would need `SubViewport` and
  fragment shader materials.
- `createEmitter2D`, stage / screens / cards / menus / shake — UI primitives,
  lower priority.
- Custom shader materials and animated UV scrolling for the vortex /
  hologram presets — would need `material.setUvScale` per frame.

## Build / smoke commands

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
