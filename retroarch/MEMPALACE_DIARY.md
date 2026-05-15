# MemPalace Diary: RetroArch Rollout Preferences

This is a memory/progress note for MemPalace mining, not a replacement for the
canonical repository instructions in `../AGENTS.md`.

- Use WSL for Nova64 repo work on Windows.
- Before `pnpm` commands, run `nvm use 20`.
- Use `pnpm`, not npm or yarn.
- During RetroArch feature rollout, prefer fast batches:
  - Add several focused features at a time.
  - Add focused conformance carts and screenshots as features land.
  - Run `pnpm run retroarch:test:recent` for iteration.
  - Save the full `pnpm run retroarch:test` suite for the commit gate or when the
    user explicitly asks for full validation.
- Keep screenshots under `screenshots/retroarch/`.
- Use `pnpm run mempalace:mine:retroarch` after meaningful RetroArch progress.
- The current rollout is expanding the native libretro API surface with many
  small deterministic visual/runtime helpers, prioritizing quick conformance
  coverage and visible screenshots.

## 2026-05-15 — M8 Shadow Maps + Normal Maps session

### What landed this session (commits 11e8309..b0ecd65)
- **createCube/createSphere color-first arg fix** (commit 11e8309): Added
  `&& !JS_IsArray(argv[1])` guard so `createCube(rgba8(...), [x,y,z])` is
  correctly detected. Re-collected software checksums for ~40 affected carts.
- **GLES directional shadow maps** (commit b78bfd7): Full depth-FBO pipeline —
  depth-only pass from directional light POV, PCF 3x3 in cube fragment shader,
  `setCastShadow` / `setReceiveShadow` / `setShadowQuality`. `shadowMaps` capability
  flag. Conformance cart 103 (software + GLES locked checksums).
- **Plan doc cleanup** (commits 8ab85f6, 2ba8125): Updated 8A "Still missing" to
  mark custom mesh, scene hierarchy, PBR, ortho camera, raycast done. Marked all
  8B/8C/8F/8G/8H items done (they were implemented in prior sessions but plan was not updated).
- **GLES normal maps** (commit b0ecd65): Object-space normal map on texture unit 2.
  `v_normal` varying added to vertex shader. Fragment shader re-computes diffuse when
  `u_has_normal_map != 0`. `setMeshNormalMap(handle, texHandle)`. `normalMaps` cap flag.
  Conformance cart 104.

### Current true M8 gaps (all else is done)
- **8A**: Instanced rendering (render targets done; normal maps done; z-sort done)
- **8I**: Real hardware GLES smoke matrix; netplay review (manual/doc tasks)
- **8J**: `--frames N` conformance for all cart types

### Lessons
- Always `wsl -e bash` for git/make; PowerShell breaks husky hooks.
- GLES conformance needs `GALLIUM_DRIVER=softpipe MESA_LOADER_DRIVER_OVERRIDE=swrast`.
- GLSL ES 1.00 uniforms shared between vertex+fragment need matching precision;
  adding `uniform highp vec4` in fragment shader matches the vertex default.
- Shadow FBO needs a dummy color RBO (RGB565) for completeness — GLES does not allow
  depth-only FBOs on all drivers.

## 2026-05-15 — M8 Render Targets session

### What landed this session (commits 3e76598..5db0963)
- **Offscreen render targets** (commit 3e76598): GLES FBO + RGBA color texture + depth
  RBO. `createRenderTarget(w, h)` allocates; `renderScene(rt)` renders 3D scene at rt
  dimensions, reusing shadow map; `renderTargetAsTexture(rt)` returns borrowed texture
  handle (new `borrowed` flag on nova64_texture prevents double-free);
  `destroyRenderTarget(rt)`. `renderTargets` capability flag. Conformance cart 106
  sw=44044eca0be4f87f gles=f05b3c17d784bd72.
- Fixed forward declaration chain: `rt_destroy_gl`, `gles_any_cast_shadow_mesh`,
  `gles_init_shadow_resources`, `build_shadow_light_vp`, `render_gles_shadow_pass`,
  `gles_load_functions`, `gles_init_resources`. Added `#define GL_LINEAR 0x2601`.
- **8I complete** (commit 7dbadc1): `GLES_SMOKE_MATRIX.md` + `NETPLAY_NOTES.md`.
  `--frames N` propagation added to all conformance runner functions.
- **Instanced rendering** (commit 5db0963): `NOVA64_MESH_INSTANCED` type.
  `createInstancedMesh(geometry, count)`, `setInstanceTransform(mesh, i, mat16)`,
  `getInstanceCount(mesh)`. GLES: shared material uniforms + per-instance MVP loop.
  Conformance cart 107 sw=4fd99c7a95f90255 gles=f01a0e0dc49c9e0e.

### Current true M8 gaps (all else is done)
- **All 8A–8J items complete** as of 2026-05-15

## 2026-05-15 — Post-M8 documentation + noise API session

### What landed this session (commits 1b68724..d48cce1)
- **Comprehensive README update** (commit 1b68724): Fixed 3 stale Known Gaps
  (shadow maps, ortho camera, streamed music — all implemented). Added ~20 missing
  API sections: capsule/cylinder, createMesh, scene hierarchy, ortho camera, PBR,
  UV transforms, normal maps, shadow quality, blend modes, render targets, instanced
  mesh, skybox, music, voice handles, channels, positional audio, echo, physics,
  raycast, bitmap font, compressed storage, dev console, resolution, cheevos RAM,
  multi-port input, rumble, procedural noise. Extended conformance table from cart
  77 to 111. RELEASE_CHECKLIST.md: removed 4 stale gaps, added GLES screenshot checks.
- **MIGRATION.md** (commit d48cce1): Replaced stale known-gaps list (PNG decode,
  scene hierarchy, raycast all wrongly listed as missing) with accurate M8 state.
- **Procedural noise API** (commit d48cce1): `noise(x)`, `noise(x,y)`, `noise(x,y,z)`
  2D/3D Perlin gradient noise using classic 256-entry permutation table + quintic smoothing.
  `fbm(x, y, octaves, lacunarity, gain)` fractal Brownian motion normalized to [-1,1].
  `nova64.random.noise` / `nova64.random.fbm` aliases. Conformance cart 111
  sw=4847bd983f0c57e0.

### Full conformance sweep result
- Carts 0–50: all pass (build + harness)
- Carts 51–99: all pass
- Carts 100–111: all pass
- Total: 111 conformance carts passing

### State of the codebase
- All M1–M8 complete; no known pending gaps except Vulkan backend (M4, staged)
  and QuickJS heap serialization (out of scope per plan).
- next candidate: consider particle system, more math utilities, or Vulkan M4.
