# Nova64 Handoff — 2026-05-19

## 2026-05-19 update

The original post-state black-output fix is already committed in history. The current
RetroArch parity pass moved on to the remaining GLES visual mismatches in the
demoscene cart and renderer:

Latest continuation:

- MemPalace MCP startup is now documented in `AGENTS.md` and `README.md`, and
  `.vscode/mcp.json` starts the server through WSL with `pipenv run
  mempalace-mcp`.
- Added focused `package.json` scripts for memory health and workflow:
  `mempalace:status`, `mempalace:wake`, `mempalace:repair-status`, and
  `mempalace:sync:retroarch`.
- Scene 3, `ENERGY CORE`, now has a bright emissive core, vertical energy beam,
  rotating neon rings, and orbiting energy shards so the RetroArch capture no
  longer reads as HUD over a black scene.
- Scene 4, `THE VOID`, now has a central glow, denser emissive void objects,
  chromatic/vignette tuning, and rotating torus halos.
- Scene 0 received broad magenta/cyan terrain shards to better match the browser
  reference capture's luminous terrain/horizon mass.
- Scene 2 received emissive light lanes through the skyline to reduce the flat
  blue city read.
- Follow-up direct browser capture used `console.html?demo=demoscene` and canvas
  screenshots at 640x360. That showed scene 0 is primarily an overbright
  magenta/cyan horizon/sun composition in the web runtime. RetroArch scene 0 now
  uses a web-style rising camera, an instanced terrain field shifted toward the
  horizon, and a large emissive horizon glow to match that first read.
- Current subjective visual parity estimate: ~90% vs the available browser
  captures. This is not an automated SSIM/LPIPS score; the next useful step is a
  small repeatable browser-vs-RetroArch capture comparator for all five scene
  beats.

- `cls()` / `clsGradient()` no longer draw the software 3D preview over an active
  GLES hardware scene.
- GLES scene clears now honor cart `cls()` / framebuffer clear values when no sky
  color is active.
- GLES post shader uniforms now match the C uniform uploads (`vec4` for resolution
  and color grade), so post color-grade output no longer goes black.
- GLES post processing now has a visible fullscreen pass: linear post-FBO
  sampling, FXAA-style edge smoothing for post-active scenes, and a wider
  bright-pass bloom sample pattern. RetroArch/libretro does not expose an MSAA
  flag in this core's `retro_hw_render_callback`, so this pass is the current
  anti-aliasing path for demoscene/post-enabled carts.
- GLES instanced meshes now apply per-instance colors and set their normal,
  emissive, roughness, metalness, UV, fog, and texture-related uniforms explicitly.
- GLES torus meshes no longer double-apply radius scale after baking geometry.
- Core/cart reset now initializes the 2D draw transform to identity before cart
  code runs. This fixes the RetroArch HUD collapsing to `(0,0)` and appearing
  upside-down/backwards while leaving the 3D camera and post path unchanged.
- `retroarch/games/demoscene.js` has first-pass scene tuning for sky colors,
  ambient light, bloom, fog, torus thickness, and grid density. Scene 0 now
  splits the grid into three instanced meshes so cyan/magenta/blue tiles can
  keep separate emissive colors on the GLES path. The HUD now uses RetroArch's
  `rect(..., false)` outline semantics so panels match the web-style overlay
  instead of filling with accent colors.
- Follow-up cart-only parity pass added web-reference cues without changing the
  renderer: orbiting crystals and expanding pulse rings in scene 0, longer
  neon data streams in scene 1, and brighter emissive city lighting plus a
  central beacon in scene 2.
- `retroarch/tests/ppm_to_png.py` now reads the full P6 header through `maxval`
  before copying pixel data. The previous parser stopped after width/height for
  the harness header shape, causing converted PNG screenshots to display shifted
  colors even when the raw PPM was correct.
- Added GLES-only regression carts:
  - `retroarch/conformance/gles-clear-color.js`
  - `retroarch/conformance/gles-post-color-grade.js`
  - `retroarch/conformance/gles-instance-colors.js`
  - `retroarch/conformance/gles-torus-scale.js`
  - `retroarch/conformance/gles-overlay-orientation.js`
- `retroarch/tests/run_conformance.sh` now locks those GLES checksums, plus the
  updated GLES checksums for overlay/text-bearing tests after the draw-state
  initialization fix.

Validated:

```bash
cd /mnt/c/Users/brend/exp/nova64/retroarch && make
cd /mnt/c/Users/brend/exp/nova64
bash -n retroarch/tests/run_conformance.sh
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/21-post-effects.js --gles --expect 702c95f9f4112efc
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/107-instanced-mesh.js --gles --expect ca8b6fa284e8a82b
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/gles-clear-color.js --gles --frames 3 --expect cfc2e94e23f70383
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/gles-post-color-grade.js --gles --frames 3 --expect bedad38d3f3f5612
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/gles-instance-colors.js --gles --frames 3 --expect abcd5e293f0c7187
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/gles-torus-scale.js --gles --frames 3 --expect db701fac656d76cd
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/gles-overlay-orientation.js --gles --frames 3 --expect 837f452f8df778a3
```

Latest local visual captures from this pass:

```text
retroarch/build/demoscene-scene0-split.png
retroarch/build/demoscene-scene0-post-aa.png
retroarch/build/demoscene-scene1-post-aa.png
retroarch/build/gles-post-fxaa-bloom.png
retroarch/build/gles-instance-colors-after.png
retroarch/build/gles-overlay-orientation-fixed.png
retroarch/build/demoscene-webparity-s0-hudfixed2.png
retroarch/build/demoscene-webparity-s1-hudfixed2.png
retroarch/build/demoscene-webparity-s0-90pass3.png
retroarch/build/demoscene-webparity-s1-90pass2.png
retroarch/build/demoscene-webparity-s2-90pass3.png
retroarch/build/demoscene-webparity-s0-final2.png
retroarch/build/demoscene-webparity-s2-final2.png
retroarch/build/demoscene-webparity-s3-90pass.png
retroarch/build/demoscene-webparity-s4-90pass.png
retroarch/build/demoscene-browser-canvas-s0-current.png
retroarch/build/demoscene-browser-canvas-s0-late-current.png
retroarch/build/demoscene-webparity-s0-sunmatch6.png
```

Remaining parity work:

- Compare the captures above against the web renderer reference once a reference
  capture is available.
- Scene 1 is now correctly sized after the torus scale fix. The earlier
  yellow/green capture was a PNG conversion artifact, not a renderer output issue.
- `run_conformance.sh --from 107 --to 110 --skip-build` still trips the known
  stale `108 skybox` software checksum (`expected=38f18480f256541a`,
  `actual=34dab61bf1f4ebb9` in this workspace). Touched GLES checks were
  validated directly.
- Package `hello-3d.js`, `particle-fireworks.js`, and `demoscene.js` as `.nova`
  carts if that is still needed for the RetroArch distribution flow.

## What was just fixed

**Root bug**: `post_state.color_grade` is zero-initialized in C (static global struct).
`post_is_active()` returned true when any `color_grade[i] != 1.0`. With all three at 0.0,
it was always true → scene rendered to `gles.post_fbo` → post blit multiplied pixels by
`(0,0,0)` → black output. This masked ALL 3D rendering for the entire GLES pipeline.

**Fix location**: `retroarch/nova64_libretro.c`, function `retro_init()` (~line 32162):
```c
reset_post_state();  // added — ensures color_grade starts at {1,1,1}
```
`reset_post_state()` sets `color_grade[0/1/2] = 1.0f` (identity = no color change).

## Current state

- All conformance tests 0–130 pass with zero checksum mismatches
- Run command:
  ```bash
  # In WSL (use nvm use 20 first, then):
  cd /mnt/c/Users/brend/exp/nova64/retroarch
  NOVA64_GLES_TESTS=1 NOVA64_SAVE_DIR=/tmp/nova64-saves \
    bash tests/run_conformance.sh --from 0 --to 130 --skip-build
  ```
- Build commands (WSL):
  ```bash
  cd /mnt/c/Users/brend/exp/nova64/retroarch
  make 2>&1 | tail -30         # build the .so
  make harness 2>&1 | tail -30  # build the test harness
  ```

## Files modified but not yet committed

| File | Change |
|------|--------|
| `retroarch/nova64_libretro.c` | Added `reset_post_state()` in `retro_init()`; clean torus renderer; removed all debug code |
| `retroarch/tests/harness.c` | Removed diagnostic `fprintf` added during debugging |
| `retroarch/tests/run_conformance.sh` | Updated ALL checksums (were stale/wrong from broken all-black output); added test 110 (torus) |
| `retroarch/conformance/torus-test.js` | New conformance test: red torus at origin, camera at (0,0,10) |

There are also untracked game carts and backup files from prior sessions:
```
retroarch/info/           (retroarch info file for the core)
retroarch/games/          (game cart .js files)
retroarch/nova64_libretro.c.bak
retroarch/nova64_libretro_hw.c.bak
retroarch/nova64_libretro_nohw.c
```

## Pending tasks (priority order)

### 1. Commit the current fixes
Commit message suggestion:
```
fix: initialize post_state in retro_init to fix GLES black output

post_state.color_grade was zero-initialized (C global), causing
post_is_active() to always return true. Scene rendered to post_fbo
and post blit multiplied output by (0,0,0) → all black.

Fix: call reset_post_state() from retro_init() so color_grade starts
at {1,1,1} (identity).

Also: add real torus renderer, remove all debug code, regenerate all
conformance checksums (tests 0–130 pass).
```

### 2. Fix demoscene.js (retroarch/games/demoscene.js)
Known issues from prior session:
- Scene 0 intro flash: draw order issue — torus appears on top of flash overlay
- Scene 1: torus is too thin (minor radius too small), doesn't look impressive
- Scene 0 background colors could be more vibrant

### 3. Package game carts as .nova format
The `.nova` format is a zip containing `code.js` + `meta.json`.
Carts that need packaging: `hello-3d.js`, `particle-fireworks.js`, `demoscene.js`.
The skybox cart is already packaged as `skybox.nova`.

### 4. Skybox GLES checksum (test 108)
Test 108 uses `skybox.nova` — its GLES checksum (`a4ad0833d5acff46`) was NOT regenerated
because it requires the skybox.nova package. If the skybox.nova content changed, this
checksum will be stale. Check and update if needed.

### 5. Visual parity captures
Document retroarch vs web renderer output comparison for demoscene scenes (screenshots).

## Key code locations

```
nova64_libretro.c
  ~1636  reset_post_state()        — sets color_grade={1,1,1}, zeros fog/bloom/etc.
  ~1647  post_is_active()          — returns true if any color_grade[i] != 1.0
  ~30700 render_gles_torus()       — lazy VBO/IBO build + delegates to render_gles_primitive
  ~31247 render_gles_scene()       — main 3D render loop, FBO management
  ~31316 render_gles_post_pass()   — color grade + bloom blit
  ~32162 retro_init()              — THE FIX IS HERE
```

## How the test harness works

`retroarch/tests/harness.c` calls:
1. `retro_init()` → `retro_load_game()` (loads .js cart)
2. Runs N frames with `retro_run()`
3. `harness_video()` binds `g_fbo` (=1) and calls `glReadPixels`
4. Outputs a hex checksum of the pixel buffer

The harness does NOT call `retro_reset()`, which is why `retro_init()` must initialize
post state directly.

## WSL notes

- Always use WSL Bash with `nvm use 20` for builds and git operations
- PowerShell breaks the husky pre-commit hook
- GLES tests use Mesa EGL headlessly via `NOVA64_GLES_TESTS=1`
- Avoid `pow(x, computed_y)` in GLSL — Mesa/ANGLE handles it inconsistently
