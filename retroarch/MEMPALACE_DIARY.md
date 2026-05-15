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
- **8A**: Offscreen render targets; instanced rendering
- **8B**: Draw-order z-sorting for 2D sprites
- **8I**: Real hardware GLES smoke matrix; netplay review (manual/doc tasks)
- **8J**: `--frames N` conformance for all cart types

### Lessons
- Always `wsl -e bash` for git/make; PowerShell breaks husky hooks.
- GLES conformance needs `GALLIUM_DRIVER=softpipe MESA_LOADER_DRIVER_OVERRIDE=swrast`.
- GLSL ES 1.00 uniforms shared between vertex+fragment need matching precision;
  adding `uniform highp vec4` in fragment shader matches the vertex default.
- Shadow FBO needs a dummy color RBO (RGB565) for completeness — GLES does not allow
  depth-only FBOs on all drivers.
