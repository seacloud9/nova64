# Nova64 Handoff — 2026-05-18

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
