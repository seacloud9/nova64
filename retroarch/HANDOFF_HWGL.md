# Nova64 Hardware GL on Windows — Status & Handover

**Last updated:** 2026-05-21 (Codex scaled-text parity pass)
**Branch:** `main`
**Working tree:** expected clean after committing this pass; source changes listed below

---

## TL;DR

- ✅ Hardware OpenGL (Core 3.3 / GLES 3) rendering works on Windows RetroArch
- ✅ Demoscene cart renders real 3D scenes with cinematic bloom + sky gradient
- ✅ CRT scanlines + RGB aperture-grille post effect (visible on dark scenes)
- ✅ FPS overlay built in (`Shift + F` toggle, works in any cart)
- ✅ Bitmap font now covers nearly all ASCII printable chars including proper lowercase
- ✅ Opt-in `printTight()` / `tightTextWidth()` variable-width text path is wired for denser HUDs
- ✅ Browser-style scaled text is wired: `print(..., scale)`, `printCentered(..., scale)`, `printRight(..., scale)`, `printScaled()`, and `printTightScaled()`
- ✅ `drawGlowText(..., scale)` and `drawGlowTextCentered(..., scale)` now honor the web API scale argument for larger glowing titles
- ✅ Browser-style `nova64.draw` aliases now include Batch 41 text/shape helpers (`drawTriangle`, glow/pulsing text, `tristrip`, floating text)
- ⚠️ User reports performance feels slow on Windows (~38–40 FPS, 31–35 ms/frame on AMD Radeon 780M)
- ⚠️ Linux Mesa software harness hits ~110 FPS at ~9 ms/frame, so Windows hardware _should_ be vastly faster — Windows-specific bottleneck unidentified
- ⚠️ Numeric visual-parity score: 44.4% average / 42.7% strict average after the scaled-text API pass. The HDR/multi-mip bloom pass previously measured 46.2% / 44.6%; the "85% mirage" is still relevant because high scores previously rewarded flat washed-out captures rather than real 3D detail.
- ✅ New `retroarch/BACKLOG.md` captures deferred Windows perf work, queued visual features, stale-file cleanup, and code-anchored TODOs
- ✅ Implemented the selected visual feature: **HDR post target (`RGBA16F`) + multi-mip bloom**, with `RGBA8` fallback if float render targets are not supported and old single-pass bloom kept as fallback
- ✅ Recent C changes include the Shift+F perf overlay diagnostics plus the new HDR/multi-mip bloom post-processing path

---

## Current 2026-05-21 scaled-text state

Latest work after the HDR/mip pass:

```
cf556eb docs: clean up RetroArch notes
72eaf39 docs: add RetroArch HDR bloom handoff
94d9a9f feat: expose RetroArch text effects on nova64.draw
2c8bb5e fix: honor RetroArch glow text scale
a285271 feat: add tight RetroArch HUD text
```

What's in the scaled-text delta:

- `print(text, x, y, color, scale)` now treats a numeric fifth argument as
  browser-style scale. Existing string alignment still works, and an optional
  sixth argument can carry alignment.
- Added explicit `printScaled(text, x, y, color, scale, align)` and
  `printTightScaled(text, x, y, color, scale, align)` on both global and
  `nova64.draw`.
- `printTight(text, x, y, color, align, scale)` and
  `tightTextWidth(text, scale)` now support scaled tight text without changing
  the default scale-1 output.
- `measureText(text, scale)`, `printCentered(..., scale)`, and
  `printRight(..., scale)` now support the browser helper scale argument.
- Added `retroarch/conformance/1092-scaled-text.js` and locked checksum
  `305d05942969cdcd`.
- Demoscene start-screen call-to-action now uses the larger tight text path.
  The in-scene HUD intentionally stays web-sized so the parity target does not
  drift for a styling experiment.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `make platform=unix && make harness` passes after the final cleanup.
- `bash retroarch/tests/run_conformance.sh --from 813 --to 815 --skip-build` passes.
- `bash retroarch/tests/run_conformance.sh --from 1092 --to 1092 --skip-build` passes.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `51.7`
  - s1 `49.4`
  - s2 `37.8`
  - s3 `46.1`
  - s4 `37.1`
  - average `44.4`
  - strictAverage `42.7`
- `130 measure text` still renders OK but its locked checksum is stale after
  earlier font/glyph changes: actual `090b644857ea88cd`.

Next target:

1. Bloom/emissive tuning against the current capture set, judging the actual
   images rather than only the metric.
2. Variable-width glyph tuning inside `printTight()` if HUD density remains a
   focus.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 HDR/multi-mip bloom state

Latest committed work before this HDR/mip pass:

```
72eaf39 docs: add RetroArch HDR bloom handoff
94d9a9f feat: expose RetroArch text effects on nova64.draw
2c8bb5e fix: honor RetroArch glow text scale
a285271 feat: add tight RetroArch HUD text
7b415ff feat: add demoscene light cycles
b25e80f feat: batch instanced transform uploads
```

New `nova64_libretro.c` implementation points:

```
M  retroarch/nova64_libretro.c
M  retroarch/BACKLOG.md
M  retroarch/HANDOFF_HWGL.md
M  retroarch/MEMPALACE_DIARY.md
```

What's in the `nova64_libretro.c` delta from this pass:

- Added `GL_RGBA16F` / `GL_HALF_FLOAT` constants and a guarded HDR post target path.
- `gles_init_post_resources()` first attempts an `RGBA16F` color target, checks framebuffer completeness, and falls back to the old `RGBA8` path if unsupported.
- Added `NOVA64_BLOOM_MIPS=5` bloom resources: fbo/texture + ping fbo/texture per level.
- Added downsample and separable blur shaders. The first level applies a brightpass; later levels downsample the blurred previous level.
- Final post shader samples the 5 bloom mips and combines them with broad weighted halos. If mip resources fail, it falls back to the old 13-tap single-pass bloom.
- Post resource logs now include `format=RGBA16F|RGBA8` and `bloom_mips=N`.
- `gles_destroy_resources()` now also releases post/bloom resources so context resets do not leak the extra FBOs/textures.

MemPalace/MCP status:

- `.vscode/mcp.json` is wired to launch `mempalace-mcp` through WSL.
- `package.json` includes `mempalace:status`, `mempalace:wake`, `mempalace:repair-status`, `mempalace:mine`, `mempalace:mine:runtime`, `mempalace:mine:retroarch`, `mempalace:sync:retroarch`, and `mempalace:search`.
- `pnpm run mempalace:status` completed on 2026-05-21. It quarantined two corrupt HNSW segment directories automatically and still reported the `nova64_retroarch` room as available.

Validation from this pass:

- `make platform=unix` passes.
- `make harness` passes.
- Focused harness capture logs: `format=RGBA16F  bloom_mips=5`, checksum `880c5d0245871676`.
- `NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs` passes:
  - s0 `58.5`
  - s1 `49.6`
  - s2 `38.0`
  - s3 `47.1`
  - s4 `37.7`
  - average `46.2`
  - strictAverage `44.6`
- `make clean && make platform=win-cross` passes.

Next target:

1. Tune bloom weights/thresholds and scene emissive strengths from the new capture set; the infrastructure is no longer the blocker.
2. Keep comparing real captures visually, not only the numeric metric.
3. Windows perf investigation remains deferred unless the user asks; note the mip bloom path increases post draw calls when bloom is active.

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
  - `! " ' ( ) \* + , - . / : ; < = > ? @ [ \ ] \_ # % & { | } ~ $ \``
- Lowercase has proper x-height, ascenders, descenders, and i/j dots
- Forward slash bug fixed (it was rendering as a backslash shape before)
- Anything outside this set still falls back to the 0x1F solid block
- `printTight(text, x, y, color, align?)` and `tightTextWidth(text)` trim empty glyph columns for HUD text density. Existing `print()` / `textWidth()` stay fixed-width for compatibility.
- `drawGlowText(text, x, y, color, glowColor, scale?)` and
  `drawGlowTextCentered(text, cx, y, color, glowColor, scale?)` now scale the
  bitmap glyphs instead of ignoring the argument.
- `print(text, x, y, color, scaleOrAlign?, align?)` accepts browser-style
  numeric scaling while preserving string alignment.
- `printScaled()` and `printTightScaled()` provide explicit fixed-width and
  tight-glyph scaled variants for larger titles and prompts.
- `measureText(text, scale)`, `printCentered(..., scale)`, and
  `printRight(..., scale)` support the browser helper scale argument.

### Tooling

- `make platform=unix` — Linux .so (used by the harness for headless GLES testing)
- `make platform=win-cross` — Windows DLL via mingw64
- `make harness` — builds the EGL-based headless test harness
- `node retroarch/tests/demoscene_visual_parity.mjs` — runs web vs retroarch visual diff (Playwright + harness)
- `bash retroarch/tests/run_conformance.sh --from N --to N --skip-build` — conformance suite
- `NOVA64_PERF=1` env var enables periodic perf telemetry (already in `core_perf_now_us` / `core_perf_record_frame`)

---

## Bugs fixed this session arc

### 1. `libretro.h` struct layout mismatch _(root cause of all Windows GL issues)_

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

Original shader applied scanlines inside the CRT block, then bloom _added_ brightness on top, saturating to white and erasing the lines.

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
- After tight HUD text pass: 44.1% average / 42.6% strict average
- After glow text scale pass: 44.7% average / 43.2% strict average

Score barely moves because every visual improvement diverges further from the web's flat-color reference. Visually we keep getting closer to a _good-looking_ render; numerically we keep moving away from the web's _blown-out_ render. Don't optimise for the number.

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

## Files modified in the previous text-effects session (already committed)

```
M retroarch/games/demoscene.js
M retroarch/nova64_libretro.c
M retroarch/HANDOFF_HWGL.md
M retroarch/MEMPALACE_DIARY.md
A retroarch/conformance/815-draw-namespace-textfx.js
M retroarch/tests/run_conformance.sh
```

These were committed across:

- `a285271 feat: add tight RetroArch HUD text`
- `2c8bb5e fix: honor RetroArch glow text scale`
- `94d9a9f feat: expose RetroArch text effects on nova64.draw`

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
- Added `printTight()` / `tightTextWidth()` on both the global API and
  `nova64.draw`. The new path trims empty glyph columns per character while
  keeping the legacy fixed-width print metrics unchanged.
- Fixed `drawGlowText` / `drawGlowTextCentered` so their `scale` argument
  actually draws scaled glyph pixels. Centering uses the web runtime's
  fixed-advance width (`text.length * 6 * scale`) for parity with
  `runtime/api-2d.js`.
- Added `nova64.draw` aliases for Batch 41 browser draw helpers:
  `drawTriangle`, `drawGlowText`, `drawGlowTextCentered`, `drawPulsingText`,
  `tristrip`, and `drawFloatingTexts`.
- `drawPulsingText` now accepts the browser-style options object
  (`{ frequency, minAlpha, glowColor, scale }`) while preserving the old
  numeric `frequency, minAlpha` call style.

### What's in `games/demoscene.js`

- `skyPanel = createCube(...)` removed from `buildScene0()` and `buildScene3()` (the gradient quad now handles sky)
- Fixed a missing mesh handle in scene 2's lane `setPosition(...)` call.
- Added deterministic scene-2 light cycles with glowing trail meshes to recover
  a browser-visible city feature without reintroducing fake bloom wash blocks.
- Switched the demoscene start screen and HUD copy to `printTight()` so the
  panels read closer to the web capture without disturbing the 3D camera path.
- Switched the start title and scene-title flash to scaled `drawGlowTextCentered`
  so the RetroArch demoscene has the larger glowing title treatment the web API
  already supports.

### What's in conformance/tests

- Added `retroarch/conformance/813-tight-text.js` to lock the new tight text
  API surface, width behavior, and center/right alignment rendering.
- Added the case to `retroarch/tests/run_conformance.sh` with checksum
  `0941661bd8f54b16`.
- Added `retroarch/conformance/814-glow-text-scale.js` to lock scaled glow
  text rendering. Checksum: `6d22128444356212`.
- Added `retroarch/conformance/815-draw-namespace-textfx.js` to lock the
  `nova64.draw` namespace aliases and the `drawPulsingText` options-object
  path. Checksum: `c1913cd545eb788f`.

### Suggested commit message

```
feat: expose RetroArch text effects on nova64.draw

- Add nova64.draw aliases for Batch 41 text/shape helpers used by browser
  carts: drawTriangle, drawGlowText, drawGlowTextCentered, drawPulsingText,
  tristrip, and drawFloatingTexts.
- Extend drawPulsingText to accept the browser-style options object with
  frequency, minAlpha, glowColor, and scale while preserving numeric arguments.
- Add conformance cart 815 to lock namespace availability and options-object
  rendering.
- Validate with retroarch:build and conformance 814-815.
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

1. **Bloom/emissive tuning.** HDR/mip infrastructure is in; tune thresholds,
   weights, and cart emissive values from the actual capture set.
2. **Windows perf investigation** (deferred by user). The backlog preserves the
   full diagnosis. Telemetry is now better through the Shift+F overlay.
3. **HUD font metrics for parity test.** The tight text path helps density, but
   exact web-font metrics still differ.
4. **Re-baseline conformance checksums.** The lowercase/font and `/` glyph fixes
   shift hashes for older visual carts that print text. Known stale examples:
   `536 draw text shapes` actual `2e174a2556f278f8`; `130 measure text` actual
   `090b644857ea88cd`.

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
