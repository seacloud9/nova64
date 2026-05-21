# Nova64 Hardware GL on Windows — Status & Handover

**Last updated:** 2026-05-20 (late evening, handover to next LLM)
**Branch:** `main`
**Working tree:** dirty — see "Files modified this session" below

---

## TL;DR

- ✅ Hardware OpenGL (Core 3.3 / GLES 3) rendering works on Windows RetroArch
- ✅ Demoscene cart renders real 3D scenes with cinematic bloom + sky gradient
- ✅ CRT scanlines + RGB aperture-grille post effect (visible on dark scenes)
- ✅ FPS overlay built in (`Shift + F` toggle, works in any cart)
- ✅ Bitmap font now covers nearly all ASCII printable chars including proper lowercase
- ⚠️ User reports performance feels slow on Windows (~38–40 FPS, 31–35 ms/frame on AMD Radeon 780M)
- ⚠️ Linux Mesa software harness hits ~110 FPS at ~9 ms/frame, so Windows hardware *should* be vastly faster — Windows-specific bottleneck unidentified
- ⚠️ Numeric visual-parity score: 43.0% average / 41.4% strict average as of a fresh `NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs` run after adding scene-2 light cycles (the "85% mirage" is documented below — it was matching flat-color web wash to flat-color retroarch wash; real 3D detail intentionally diverges)

---

## What works now

### Hardware GL on Windows
- Driver: AMD Radeon 780M, OpenGL 4.6 Core Profile (reports as 3.3 Core to the libretro callback)
- Video driver: `glcore` in `retroarch.cfg`
- DLL: `C:\RetroArch-Win64\cores\nova64_libretro.dll` (built by `make platform=win-cross` in WSL)

### Demoscene runs with real 3D, gradient sky, and bloom
- s0 GRID_AWAKENING: voxel terrain + bright sun + magenta→purple sky gradient
- s1 DATA_TUNNEL: magenta torus portals with soft bloom halos + data streams
- s2 DIGITAL_CITY: towers and structures, restrained bloom
- s3 ENERGY_CORE: orbiting spheres + glowing rings, dark gradient sky
- s4 THE_VOID: floating glowing spheres with soft halos

### FPS overlay
- Toggle: `Shift + F` (edge-triggered, no spam from holding)
- Display: top-left yellow text `FPS N  M ms` with black drop shadow
- 500 ms wall-clock measurement window
- Core-level — works in every cart

### Font
- 5×7 bitmap font
- Coverage: A-Z, a-z (proper lowercase, not auto-upper), 0-9, and:
  - `! " ' ( ) * + , - . / : ; < = > ? @ [ \ ] _ # % & { | } ~ $ \``
- Lowercase has proper x-height, ascenders, descenders, and i/j dots
- Forward slash bug fixed (it was rendering as a backslash shape before)
- Anything outside this set still falls back to the 0x1F solid block

### Tooling
- `make platform=unix` — Linux .so (used by the harness for headless GLES testing)
- `make platform=win-cross` — Windows DLL via mingw64
- `make harness` — builds the EGL-based headless test harness
- `node retroarch/tests/demoscene_visual_parity.mjs` — runs web vs retroarch visual diff (Playwright + harness)
- `bash retroarch/tests/run_conformance.sh --from N --to N --skip-build` — conformance suite
- `NOVA64_PERF=1` env var enables periodic perf telemetry (already in `core_perf_now_us` / `core_perf_record_frame`)

---

## Bugs fixed this session arc

### 1. `libretro.h` struct layout mismatch *(root cause of all Windows GL issues)*

`retroarch/libretro.h` had `retro_hw_render_callback` fields in the wrong order and contained a `void *context_data` field not present upstream. RetroArch writes `get_current_framebuffer` at offset 16 (its layout); we read it at offset 24 (our layout) so the read got `get_proc_address` instead — calling it crashed with `0xC0000005`.

**Fix:** reordered fields to match upstream libretro.h; removed `context_data`. Already committed.

### 2. `hw_render` not zero-initialised + multi-call overwrites

`renderer_request_hardware_context()` is called 3 times by RetroArch. Later calls would overwrite `gles.requested = false` after we'd already got `true`, falling back to software.

**Fix:** `memset(&hw_render, 0, sizeof(hw_render))` + early-exit `if (gles.requested) return;`. Already committed.

### 3. Wrong shader version on Linux

Briefly changed shaders to `#version 330` (desktop) — Mesa GLES 3.2 doesn't support that. Black screen on Linux harness, broke the parity test.

**Fix:** all 10 shader headers use `#version 300 es\nprecision highp float;`. Works on both Mesa GLES and AMD Windows GL Core via `GL_ARB_ES3_compatibility`. Already committed.

### 4. `windows.h` macro pollution

`#include <windows.h>` clashed with code further down the file.

**Fix:** `#define WIN32_LEAN_AND_MEAN`, `#define NOMINMAX`, `#define VC_EXTRA_LEAN` before the include (all inside `#ifdef _WIN32`). Already committed.

### 5. `get_proc_address` is NULL in glcore driver

**Fix:** Windows fallback in `load_gles_proc()` using `GetModuleHandleA("opengl32.dll")` + `wglGetProcAddress`. Already committed.

### 6. `neon-pinball.js` `ReferenceError: lFlip is not defined` every frame

**Fix:** added `let lFlip = 0, rFlip = 0;`. Already committed.

### 7. Demoscene `drawWebBloomWash()` was masking the entire 3D scene

Cart drew fullscreen flat-color rectfills from `y=0` to `y=315`, hiding the actual 3D rendering. Originally added to fake the web's heavy Three.js bloom.

**Fix:** removed the `drawWebBloomWash()` call from the cart's `draw()`. Already committed.

### 8. CRT scanlines washed out by additive bloom

Original shader applied scanlines inside the CRT block, then bloom *added* brightness on top, saturating to white and erasing the lines.

**Fix:** moved scanlines + RGB aperture-grille to the END of the post pipeline (after vignette, after bloom, after color grade) so they survive the additive bloom. Already committed.

### 9. Forward slash glyph rendered as backslash shape

The original `0x01 << (6 - row > 4 ? 4 : 6 - row)` formula visually produced a backslash, not a forward slash. Affected all carts that print `/`.

**Fix this session:** replaced with explicit `{0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x10}` array. **Note:** this will shift checksums for conformance tests that print `/`. Re-baseline expected hashes when next running the suite.

### 10. Demoscene `skyPanel` cube hack

Cart was rendering a giant flat cube to fake a sky behind the 3D scene because `setSkyColor()` only changed the clear color.

**Fix this session:** added a real `render_gles_sky_gradient()` path that draws a fullscreen NDC quad with a `smoothstep`'d top→bottom color mix when `setSkyColor()` is set without an equirectangular skybox texture. Removed the `skyPanel` cube creations from scenes 0 and 3 in the cart.

---

## The 85% Mirage (still relevant context)

The earliest parity test reported ~85% similarity between web and retroarch. That number was **misleading**: both engines were producing flat colored blocks. The web from heavy Three.js bloom destroying detail. The retroarch from `drawWebBloomWash()` painting fake flat rectangles. Mediocre rendering matched against mediocre rendering.

Once the wash was removed, retroarch shows actual detailed 3D geometry with scanlines, real bloom halos, sky gradients. The web still over-blooms to flat washes. **Numeric diff went up (parity dropped to ~43%) even though retroarch's output is visually much better.**

The decision point: chase the 85% number (by re-enabling fake washes or destroying detail with extreme bloom), or keep authentic rendering at lower numeric parity. We went with **authentic rendering**.

Recent score progression on visual parity test:
- After wash removal: 45.6%
- After sky gradient: 42.6%
- After heavier bloom: 43.0%
- Fresh Codex validation after handover review: 44.1% average / 42.6% strict average
- After scene-2 light cycles + placement fix: 43.0% average / 41.4% strict average

Score barely moves because every visual improvement diverges further from the web's flat-color reference. Visually we keep getting closer to a *good-looking* render; numerically we keep moving away from the web's *blown-out* render. Don't optimise for the number.

---

## Performance investigation (NOT YET DONE — high priority)

> User reports rendering feels slow / low FPS in the live Windows session.
> FPS overlay shows ~38–40 FPS at 31–35 ms/frame on AMD Radeon 780M.

Linux Mesa software harness hits ~110 FPS at ~9 ms/frame. Windows AMD GPU should be vastly faster than software, not slower. Something Windows-specific is wrong.

### Candidate bottlenecks (ranked)

1. **Framebuffer / viewport size mismatch.** The current post color/depth target allocation in `gles_init_post_resources()` uses `NOVA64_WIDTH × NOVA64_HEIGHT` (640×360), so the post FBO itself is not obviously window-sized from source. Still log the post allocation, `hw_render.get_current_framebuffer()` target, viewport, and RetroArch output size on Windows; if any pass is actually running at 1920×1080, fragment work scales by ~9× and explains the slowdown.
2. **AMD driver shader recompilation** — modern drivers re-optimise shaders on state changes; not common but possible.
3. **Excessive state changes** — 41 draw calls × state changes per call may cause pipeline stalls on AMD's command processor.
4. **Texture upload sync** — 920 KB glTexSubImage2D for the overlay every frame might be a CPU↔GPU sync point on Windows.
5. **RetroArch's own video shaders / overlays** — if user has a CRT shader, audio sync, or anything similar enabled in RA settings, that adds work on top of ours.

### How to diagnose

Perf telemetry is already wired (`NOVA64_PERF=1`). On Linux harness we get:
- `cart_us avg=150–1100`, `render_us avg=6200–9970`, `frame_us avg=6900–10200`
- `draw_calls/frame=18–55`, `overlay_uploads/frame=1`, `inst_xform/frame=0–6`

Next-session plan:
1. Run `NOVA64_PERF=1 retroarch.exe -L cores/nova64_libretro.dll <cart>` on Windows and capture the perf log.
2. Add logs around `gles_init_post_resources()` / `render_gles_post_pass()` for post FBO allocation, HW framebuffer id, viewport, and frontend output size. If any expensive pass is 1920×1080 instead of 640×360, that's our smoking gun.
3. If FBO is correct: instrument the post pass and overlay upload separately to find which segment is heaviest on Windows.

### Quick wins if confirmed bottlenecks

- **Reduce bloom from 13 taps to 5** if it's the bottleneck.
- **2-pass separable Gaussian at 1/2 res** (see "Bloom: explore-later" TODO note in `nova64_libretro.c` next to the bloom shader for the full multi-mip plan).
- **Dirty-flag the software framebuffer** — skip `glTexSubImage2D` when nothing changed since last frame.
- **Pre-build instance transforms in a Float32Array** — current `setInstanceTransforms` still iterates JS values one-at-a-time even after the batching helper.

---

## Files modified this session (still uncommitted)

```
M retroarch/games/demoscene.js
M retroarch/nova64_libretro.c
M retroarch/HANDOFF_HWGL.md
M retroarch/MEMPALACE_DIARY.md
```

### What's in `nova64_libretro.c`
- FPS overlay state (`g_fps_overlay_enabled`, `g_fps_value`, etc.) at ~line 1613
- `Shift+F` edge detect in `update_input()` around line 29900
- FPS overlay drawing in `retro_run()` next to developer console block (~line 33370)
- Font lowercase table `lowers[26][7]` in `glyph_row()` (~line 2880)
- Extra ASCII glyphs: `' , ! ? ( ) [ ] " ; + = _ * # % & < > @ { } | ^ ~ $` and corrected `/` and `\`
- Sky gradient program: `gles_create_sky_gradient_program()` + `render_gles_sky_gradient()` (~line 31881)
- `render_gles_skybox()` now falls back to gradient when no texture skybox is bound
- `gles_destroy_skybox_resources()` cleans up the gradient program too
- Bloom shader tuned: brightpass 0.32–0.85, wider kernel, final multiplier 1.0; explore-later note left in the shader source

- `NOVA64_PERF=1` telemetry now splits post pass, overlay conversion, overlay
  upload, and overlay draw timing; overlay draw-call counting no longer double
  counts the fullscreen overlay quad.

### What's in `games/demoscene.js`
- `skyPanel = createCube(...)` removed from `buildScene0()` and `buildScene3()` (the gradient quad now handles sky)
- Fixed a missing mesh handle in scene 2's lane `setPosition(...)` call.
- Added deterministic scene-2 light cycles with glowing trail meshes to recover
  a browser-visible city feature without reintroducing fake bloom wash blocks.

### Suggested commit message
```
feat: sky gradient shader, lowercase font, FPS overlay, heavier bloom

- Add render_gles_sky_gradient: real fullscreen NDC quad for setSkyColor
  with smoothstep top→bottom blend. Falls back from skybox texture path
  when no equirectangular texture is bound.
- Drop skyPanel cube hack from demoscene scenes 0 and 3 — gradient now
  produces a proper sky without the giant flat cube.
- Add Shift+F on-screen FPS overlay (core-level, works in any cart).
  Yellow text with drop shadow, 500 ms rolling window, shows "FPS N M ms".
- Add proper lowercase a-z bitmap font (was auto-uppercased before).
  Includes x-height, ascenders, descenders, i/j dots.
- Fix forward slash glyph (was rendering as backslash shape).
- Add backslash and curly brace + pipe/caret/tilde/dollar glyphs.
- Tune bloom shader: lower brightpass threshold, wider kernel, larger
  weights to approximate Three.js UnrealBloomPass intensity.
- Add scene-2 light cycles with glowing trail meshes and fix a missing
  setPosition mesh handle in the city lanes.
```

---

## Untracked files in working tree

These are old test artifacts the user can safely delete:
- `retroarch/nova64_libretro_nohw.c`
- `retroarch/nova64_libretro_hw.c.bak`
- `retroarch/nova64_libretro.c.bak`
- `retroarch/torus_capture.ppm`
- `shot_959.png`

---

## Build commands

```bash
# Linux .so + harness (in WSL)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make clean && make platform=unix && make harness

# Windows DLL (in WSL via mingw cross)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make clean && make platform=win-cross
# Then deploy:
cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/

# Visual parity test (in WSL)
source ~/.nvm/nvm.sh && nvm use 20
NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs

# View parity report
cat retroarch/build/demoscene-parity/report.json | python3 -m json.tool
```

Note: `make platform=unix` and `make platform=win-cross` produce different binary types. When you switch platforms you must `make clean` first.

---

## Open items for next LLM

In priority order — pick whichever the user asks for:

1. **Windows perf investigation** (highest impact). Start with the FBO size hypothesis. The handover doc above has the candidate list ranked. Telemetry already wired.
2. **Commit current working tree.** Files listed above; suggested commit message provided.
3. **Larger font variant.** 8×16 or doubled 5×7 for titles. Useful for HUD text that wants more weight.
4. **Variable-width font.** Narrow `i` = 3 cols, wide `m` = 5 cols. Improves text density and looks more professional.
5. **HDR backbuffer for bloom.** RGBA16F post FBO + multi-mip blur (see TODO note in shader). Would let bloom roll off properly above 1.0 brightness.
6. **HUD font metrics for parity test.** Make the demoscene HUD widths match the web reference more closely (small numerical bump in parity score).
7. **Re-baseline conformance checksums.** The `/` glyph fix shifts hashes for any cart that prints a forward slash.

### Things to avoid

- **Don't** change shader version back to `#version 330`. Mesa GLES rejects it.
- **Don't** chase the parity score by destroying detail. The 85% number was a mirage — see section above.
- **Don't** call `hw_render.get_current_framebuffer()` without verifying the struct layout matches upstream. The previous crash signature was `0xC0000005`.
- **Don't** add per-frame log spam without gating it on `NOVA64_PERF` or a debug flag — RetroArch's log gets huge fast on Windows.

---

## MemPalace diary entries this session arc

Topics (newest first), all under agent `claude`:
- `nova64-font-lowercase-and-symbols`
- `nova64-bloom-tuning-three-js-style`
- `nova64-sky-gradient-shader`
- `nova64-fps-overlay-and-font-glyphs`
- `nova64-session-handover-2026-05-20`
- `nova64-demoscene-bloom-wash-removal`
- `nova64-shader-version-gotcha-and-parity`
- `nova64-libretro-h-struct-fix`
- `nova64-retroarch-hw-gl-windows`

Read with `mempalace_diary_read agent_name=claude last_n=10` to get full context.
