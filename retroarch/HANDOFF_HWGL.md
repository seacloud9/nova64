# Nova64 Hardware GL on Windows — Status & Handover

**Last updated:** 2026-05-20 (evening)
**Branch:** `main`
**Author of this session:** Claude (Opus 4.7)

---

## TL;DR

- ✅ Hardware OpenGL (Core 3.3 / GLES 3) rendering now works on Windows RetroArch
- ✅ Demoscene cart renders real 3D scenes (no more fake 2D bloom wash)
- ✅ CRT scanlines + RGB aperture-grille post effect applied (visible in dark scenes)
- ⚠️ Visual parity vs web is now 45.6% average (was a fake 85% before — see "The 85% Mirage" below)
- ⚠️ **User reports performance feels slow** — not yet investigated. See "Performance investigation" section.

---

## What works now

### Hardware GL on Windows
- Driver: AMD Radeon 780M, OpenGL 4.6 Core Profile (reports as 3.3 Core to the libretro callback)
- Video driver: `glcore` in `retroarch.cfg`
- DLL: `C:\RetroArch-Win64\cores\nova64_libretro.dll` (built by `make platform=win-cross` in WSL)

### Demoscene runs with real 3D
- s0 GRID_AWAKENING: voxel terrain + bright sun
- s1 DATA_TUNNEL: magenta torus portals + data streams
- s2 DIGITAL_CITY: towers and structures
- s3 ENERGY_CORE: orbiting spheres + glowing rings
- s4 THE_VOID: floating glowing spheres

### Tooling that works
- `make platform=unix` — Linux .so (used by the harness for headless GLES testing)
- `make platform=win-cross` — Windows DLL via mingw64
- `make harness` — builds the EGL-based headless test harness
- `node retroarch/tests/demoscene_visual_parity.mjs` — runs web vs retroarch visual diff (Playwright + harness)
- `bash retroarch/tests/run_conformance.sh --from N --to N --skip-build` — conformance suite

---

## The bugs we fixed this session

### 1. libretro.h struct layout mismatch *(root cause of all Windows GL issues)*

`retroarch/libretro.h` had `retro_hw_render_callback` fields in the wrong order and contained a `void *context_data` field not present upstream. RetroArch writes
`get_current_framebuffer` at offset 16 (its layout); we read it at offset 24 (our layout) so the read got the value of `get_proc_address` instead — calling it crashed with `0xC0000005`.

**Fix:** reordered fields to match upstream libretro.h; removed `context_data`.

### 2. `hw_render` not zero-initialised + multi-call overwrites

`renderer_request_hardware_context()` is called 3 times by RetroArch. Later calls would overwrite `gles.requested = false` after we'd already got `true`, falling back to software.

**Fix:** `memset(&hw_render, 0, sizeof(hw_render))` + early-exit `if (gles.requested) return;`.

### 3. Wrong shader version on Linux

I temporarily changed shaders to `#version 330` (desktop) — Mesa GLES 3.2 doesn't support that. Black screen on Linux harness, broke the parity test.

**Fix:** reverted all 10 shader headers to `#version 300 es\nprecision highp float;`. This works on both Mesa GLES and AMD Windows GL Core (via `GL_ARB_ES3_compatibility`).

### 4. `windows.h` macro pollution

`#include <windows.h>` clashed with code further down the file.

**Fix:** `#define WIN32_LEAN_AND_MEAN`, `#define NOMINMAX`, `#define VC_EXTRA_LEAN` before the include (all inside `#ifdef _WIN32`).

### 5. `get_proc_address` is NULL in glcore driver

The `glcore` driver intentionally leaves the proc-address callback null and expects the core to load GL functions natively.

**Fix:** Windows fallback path in `load_gles_proc()` that uses `GetModuleHandleA("opengl32.dll")` + `wglGetProcAddress`.

### 6. `neon-pinball.js` had a ReferenceError every frame

`lFlip`/`rFlip` used in `update()` but never declared at module scope.

**Fix:** added `let lFlip = 0, rFlip = 0;`.

### 7. Demoscene's `drawWebBloomWash()` was masking the entire 3D scene *(big visual reveal)*

The cart had a function that drew fullscreen flat-colored rectfills from `y=0` to `y=315`, covering the actual 3D rendering. It was added in a previous session to fake the web's heavy Three.js bloom appearance because GLES bloom was assumed weak.

**Fix:** removed the `drawWebBloomWash()` call from the cart's `draw()`. Now the real 3D scene + working post pass is visible.

### 8. CRT scanlines were being washed out by additive bloom

Original shader applied scanlines inside the CRT block, then bloom *added* brightness on top, saturating to white and erasing the lines.

**Fix:** moved scanlines + RGB aperture-grille to the END of the post pipeline (after vignette, after bloom, after color grade) so they survive the additive bloom.

---

## The 85% Mirage

The previous parity test reported ~85% visual similarity between web and retroarch. That number was **misleading**:

- The web cart uses heavy Three.js bloom that **destroys detail** and produces flat colored washes.
- The retroarch cart was drawing flat colored rectfills (`drawWebBloomWash()`) on top of its 3D output to **mimic** that flat-color look.
- Both produced flat colored blocks. The diff was low. Score: 85%.

Once the wash was removed, retroarch now shows actual detailed 3D geometry with scanlines and real bloom halos. The web version still over-blooms. So the **numeric diff went up** (parity dropped to 45.6%) even though retroarch's output is **visually much better and more authentic**.

**This is a decision point:** do you want to chase the 85% number (by re-enabling fake washes or by cranking retroarch bloom to obliterate detail), or keep authentic rendering at lower numeric parity?

Current state: authentic rendering, 45.6% numeric parity.

---

## Performance investigation (NOT YET DONE)

> The user reports rendering feels slow / low FPS in the live Windows session.

### Candidate bottlenecks (in priority order)

1. **Bloom shader has 13 texture samples per fragment.** At 640×360 that's ~3M texture reads per frame just for bloom. AMD 780M should handle this easily, but if FBO size is being scaled up to window resolution (1920×1080), it's 9× more work.
2. **Per-frame `setInstanceTransform()` calls in JS.** The cart updates terrain cells and grid cells every frame:
   - Scene 0: terrainCells (~24 cells per group × several groups) + gridCells (similar count)
   - Each call is a QuickJS → C transition + matrix write
   - Could easily be 100s of JS↔C transitions per frame
3. **Software framebuffer overlay path.** Every frame we copy the 640×360×4 software framebuffer through `convert_framebuffer_to_overlay_rgba()` and `glTexSubImage2D` (~920 KB upload per frame). This is per-frame even when no 2D content changed.
4. **No mesh instancing for the GL draw calls.** Each cube/sphere is one `glDrawElements` call. The void scene has 37 meshes + 3 torus rings = 40+ draw calls. Scene 0 has more.
5. **QuickJS GC pauses** — possible but less likely on short frames.

### How to diagnose

Easiest path: add a frame-time logger in `retro_run()` that prints `update_us avg=N max=M draw_us avg=N max=M frames=K` every 60 frames (godot has this — see test-results/visual-parity/report.md for example output). Then run the harness with `--frames 1200` and read the avg/max.

```c
/* In retro_run, around the js_host_call_frame() and renderer_render_hardware_frame() */
static uint64_t s_perf_update_total = 0, s_perf_draw_total = 0;
static uint64_t s_perf_update_max = 0, s_perf_draw_max = 0;
static unsigned s_perf_frames = 0;

uint64_t t0 = nanos();
js_host_call_frame(1.0 / NOVA64_FPS);
uint64_t t1 = nanos();
... renderer ...
uint64_t t2 = nanos();

uint64_t update_us = (t1 - t0) / 1000, draw_us = (t2 - t1) / 1000;
s_perf_update_total += update_us; s_perf_draw_total += draw_us;
if (update_us > s_perf_update_max) s_perf_update_max = update_us;
if (draw_us > s_perf_draw_max) s_perf_draw_max = draw_us;
if (++s_perf_frames % 60 == 0) {
   nova64_log_line(RETRO_LOG_INFO, "[nova64-perf] update_us avg=%llu max=%llu draw_us avg=%llu max=%llu",
       s_perf_update_total / s_perf_frames, s_perf_update_max,
       s_perf_draw_total / s_perf_frames, s_perf_draw_max);
}
```

### Quick wins (if performance is the bottleneck)

- **Skip bloom multi-tap when `u_bloom <= 0.0`** (already done, but verify the cart isn't setting bloom=0 and still paying the bloom-test cost).
- **Reduce bloom taps from 13 to 5** for the smaller blur kernel.
- **Skip the software→overlay framebuffer upload entirely on frames where nothing was drawn to it.** Track a dirty flag in the 2D draw API.
- **Batch the instanced mesh transform writes** — JS side, build all transforms then push them in one C call.
- **Make `drawWebBloomWash` deletion permanent** — it was killing CPU time with thousands of `set_pixel`/`rectfill` calls. (Done.)

---

## Visual-parity-with-better-speed plan

The user's goal: match (or exceed) the web's look AND run faster than the web.

### Path forward

1. **Add per-frame perf telemetry first** (see snippet above). Without numbers we'll guess wrong.
2. **Profile demoscene scene-by-scene.** Find the worst scene and the worst frame.
3. **Cap bloom cost.** Move from 13-tap single-pass to a 2-pass separable Gaussian downsampled to 1/2 res. Cuts texture reads to ~1/4 with better quality.
4. **Cache JS→C calls.** Many `setInstanceTransform` calls write the same transform every frame. Add a JS-side "dirty" check.
5. **Match web look with stronger bloom** — once bloom is cheaper, we can crank intensity without paying frame budget.
6. **Add an HDR-ish backbuffer.** Currently the post FBO is 8-bit RGBA. A float16 backbuffer would let bloom roll off properly instead of clamping to 1.0.
7. **Apostrophe glyph** (`'`) is missing from the font atlas — the demoscene text shows `JOURNEY□S END`. Add it to the font.
8. **Sky gradient** — the cart's `skyPanel = createCube(140, 44, 0.2)` renders as a flat-edged cube. Replace with a proper fullscreen gradient quad rendered before the 3D pass.

### What the user should expect

After step 1+2 we'll know whether the bottleneck is JS, bloom, or upload. Then steps 3 or 4 should give a measurable FPS boost without touching the visuals. Step 5+6 then makes the visuals match the web's bloomy aesthetic at lower frame cost than Three.js does it.

---

## Files modified this session (relative to `main`)

| Path | What changed |
|---|---|
| `retroarch/libretro.h` | Reordered `retro_hw_render_callback` fields to match upstream; removed `context_data` |
| `retroarch/nova64_libretro.c` | Win32 includes, `load_gles_proc` Windows path, `hw_render` memset+guard, GL Core VAO, FBO from `get_current_framebuffer`, post shader reordering (scanlines after bloom), `#version 300 es` shaders |
| `retroarch/games/demoscene.js` | Removed `drawWebBloomWash()` call from `draw()` |
| `retroarch/games/neon-pinball.js` | Added missing `let lFlip = 0, rFlip = 0;` |
| `retroarch/HANDOFF_HWGL.md` | This file |
| `C:\RetroArch-Win64\retroarch.cfg` (Windows only) | `video_driver = "glcore"`, logging enabled |

### Untracked files (cleanup candidates)
- `retroarch/nova64_libretro_hw.c.bak`
- `retroarch/nova64_libretro_nohw.c`
- `retroarch/nova64_libretro.c.bak`
- `retroarch/torus_capture.ppm`
- `shot_959.png`

---

## How to verify on a fresh machine

```bash
# Build (in WSL)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make clean && make platform=win-cross

# Deploy
cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/

# Run
# In Windows: open RetroArch → Load Core → nova64 → Load Content →
# c:\Users\brend\exp\nova64\retroarch\games\demoscene.js

# Run parity test (in WSL)
source ~/.nvm/nvm.sh && nvm use 20
NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs

# Look at report.json:
cat retroarch/build/demoscene-parity/report.json | jq '.results[] | {id, name, visualScore, pixelSimilarity}'
```

---

## Open questions for the user

1. Performance: do you want me to add the perf telemetry first, then we look at the numbers together?
2. Bloom direction: match the web's washed-out heavy bloom (high parity number, less detail) or keep authentic detail at lower numeric parity?
3. Should I take the unsynced `_nohw.c`, `_hw.c.bak` files etc. out of the working tree before the next commit?
4. Do you want me to commit the current breakthrough now (struct fix + Windows GL working + demoscene wash removed) so it's locked in, before we move on to perf?
