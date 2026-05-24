# Nova64 Hardware GL on Windows — Status & Handover

**Last updated:** 2026-05-24 (web-cart compatibility layer handoff)
**Branch:** `main`
**Working tree:** expected clean after committing this pass; source changes listed below

---

## TL;DR

- ✅ Latest shipped work: web-cart compatibility layer. `examples/*/code.js`
  carts can now be loaded directly by the RA runtime without manual ports.
- ✅ First compat probe is `9 PASS`, `4 WARN`, `5 FAIL` across 19 web carts.
  Details and remaining API gaps are tracked in `BACKLOG.md`.
- ✅ `examples/space-harrier-3d/code.js` now loads unmodified on RA. Treat web
  carts as source of truth; make RA runtime/compat changes to reach parity.
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
- ⚠️ Numeric visual-parity score: 89.6% average / 87.8% strict average after stabilizing the browser reference hook and softening scene-0 terrain. The "85% mirage" warning is still relevant: do not reintroduce the old flat `drawWebBloomWash()` overlay. This score comes from scene-level sky/fog/ambient/emissive/post tuning plus HUD metric alignment against deterministic screenshots.
- ✅ Full 519-case conformance sweep has been re-baselined and passes with the current screenshot set.
- ✅ Tight text effect variants are wired globally and under `nova64.draw`.
- ✅ `drawLightning` now keeps the legacy Batch 25 six-argument shape while also supporting a newer glow/branch options shape.
- ✅ New `retroarch/BACKLOG.md` captures deferred Windows perf work, queued visual features, stale-file cleanup, and code-anchored TODOs
- ✅ Implemented the selected visual feature: **HDR post target (`RGBA16F`) + multi-mip bloom**, with `RGBA8` fallback if float render targets are not supported and old single-pass bloom kept as fallback
- ✅ Recent C changes include the Shift+F perf overlay diagnostics plus the new HDR/multi-mip bloom post-processing path

---

## Current 2026-05-24 web-cart compat state

Latest commits:

```
d65d8e7 feat(runtime): web-cart compat layer - examples/space-harrier-3d.js now loads unmodified
0e60c5b feat(runtime): expand web-cart compat - 5/19 -> 9/19 carts now load
ef10683 docs(backlog): document web-cart compat layer landing + remaining gaps
```

What's in this delta:

- Runtime-side compatibility landed in `retroarch/nova64_libretro.c`; no web
  cart rewrites are required for the working set.
- New and expanded namespaces include `console`, `nova64.fx`, `nova64.util`,
  `nova64.scene`, `nova64.ui`, `nova64.camera`, `nova64.light`,
  `nova64.input`, `nova64.data`, and `nova64.tween`.
- `drawScanlines` now accepts the web convention of alpha values in the
  `0..255` range, avoiding opaque-black scanline output from unchanged web
  carts.
- `space-harrier-3d` can run both as the existing RA port and as the unmodified
  web cart loaded through the compat layer.

Validation / probe notes:

- First 19-cart compat probe: `9 PASS`, `4 WARN`, `5 FAIL`.
- Working unmodified web carts include `hello-world`, `hello-namespaced`,
  `filter-glitch`, `hud-demo`, `space-harrier-3d`, `particle-fireworks`,
  `screen-demo`, `input-showcase`, and `boids-flocking`.
- Remaining gaps are listed in `BACKLOG.md` under "push web-cart compat from
  9/19 -> all-green".

Next target:

1. Investigate the WARN carts first: `hello-3d`, `hello-skybox`,
   `3d-advanced`, `camera-platformer`, and `demoscene`.
2. Keep web carts as the source of truth. Prefer RA runtime compatibility
   shims over changing `examples/*/code.js`.
3. After each compat improvement, rerun the small probe and update `BACKLOG.md`
   with the changed pass/warn/fail counts.

---

## Current 2026-05-22 deterministic-reference parity state

Latest work after the HUD/final-scene pass:

```
1d42aa8 feat: refine RetroArch demoscene HUD parity
```

What's in this delta:

- `examples/demoscene/code.js` debug hook now calls `resetRandom()` and sets
  `gameTime` to the cumulative scene timeline before capturing a frozen web
  reference. Before this, scene 0 could drift depending on page warmup and
  prior random work.
- `retroarch/games/demoscene.js` scene 0 now softens the instanced terrain/grid
  meshes with opacity `0.42`, which reduced the hard block silhouettes against
  the stabilized browser reference.
- Rejected during this pass: stronger scene-0 glow/atmosphere, extra opacity on
  non-instanced scene-0 props, lower scene-4 object opacity, and a larger cyan
  scene-4 horizon. These all regressed focused scores.

Validation from this pass:

- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `86.7`
  - s1 `91.2`
  - s2 `90.2`
  - s3 `90.4`
  - s4 `89.5`
  - average `89.6`
  - strictAverage `87.8`

Next target:

1. The remaining 90% push is scene-0 composition. The deterministic reference
   makes that target stable now.
2. Keep `drawWebBloomWash()` disabled and avoid broad global bloom changes;
   mesh opacity/scene composition moved the real blocker more than exposure did.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 HUD + final-scene parity state

Latest work after the near-90 pass:

```
c6b1d1e feat: push RetroArch demoscene parity near 90
```

What's in this delta:

- Top HUD panel metrics now more closely follow the web cart:
  panel fill color/alpha, title x/y, progress bar y/height/color, status panel
  text x/y, and bottom panel fill/text colors were aligned.
- Bottom description/watermark text stays centered in RetroArch. An experiment
  to draw it from x=320 like the apparent web behavior regressed focused scene
  scores and was reverted.
- Scene 2 was backed off from an overly white city wash to a slightly more
  magenta reference match.
- Scene 3 was whitened/coolened slightly so the energy-core wash is less
  saturated-magenta and closer to the browser capture.
- Scene 4 received a small cyan horizon/less-red atmosphere correction.

Validation from this pass:

- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `87.8`
  - s1 `91.3`
  - s2 `90.3`
  - s3 `90.4`
  - s4 `89.4`
  - average `89.8`
  - strictAverage `88.1`

Next target:

1. A durable 90% likely needs scene-0 composition/reference determinism work
   rather than more bloom. Scene 0 still varies most between focused and full
   browser captures.
2. Do not move the bottom HUD text to x=320; that was tested and made focused
   scenes worse.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 all-scene luminous-volume parity state

Latest work after the ENERGY_CORE pass:

```
13e470c feat: boost RetroArch demoscene energy core parity
```

What's in this delta:

- `retroarch/games/demoscene.js` scenes 0, 1, 2, and 4 were retuned after the
  ENERGY_CORE pass using the same screenshot-first luminous-volume method.
- Scene 0 now balances a magenta field with a right-side white horizon glow.
- Scene 1 reduces opaque magenta ring dominance with lower torus emissive +
  opacity and a brighter cyan atmospheric field.
- Scenes 2 and 4 use brighter sky/fog/ambient values and stronger but balanced
  emissives to match the web reference's bloom-washed frames while preserving
  faint 3D silhouettes.
- `drawWebBloomWash()` remains disabled. The high score is from cart-facing
  scene parameters and native post bloom.

Validation from this pass:

- Previous `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` pass:
  - s0 `87.6`
  - s1 `91.1`
  - s2 `90.0`
  - s3 `89.1`
  - s4 `89.3`
  - average `89.4`
  - strictAverage `87.6`

Next target:

1. Reaching a durable 90% likely needs small scene-0/scene-3/scene-4 composition
   improvements, not more global bloom. Scene 0 still has the lowest score.
2. Judge screenshots together with the metric; several browser reference frames
   are intentionally very bloom-washed, but avoid returning to a fake fullscreen
   mask.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 ENERGY_CORE parity state

Latest work after the 67% rebaseline commit:

```
d7b4faa feat: tune RetroArch demoscene parity and rebaseline conformance
```

What's in this delta:

- `retroarch/games/demoscene.js` scene 3 (`ENERGY_CORE`) now uses a brighter
  magenta/pink sky gradient, much lighter vignette, closer fog, stronger
  ambient light, and higher emissive values for the core beam, central sphere,
  rings, and orbiting energy bodies.
- A camera-only experiment that matched the web formula exactly dropped scene 3
  from roughly `60` to `39`, so it was reverted. The useful match was luminous
  volume and exposure, not moving the camera away from the core.
- `drawWebBloomWash()` remains disabled. The current scene-3 frame is bright
  like the web reference but still comes from 3D objects, fog, and post bloom.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- Focused scene-3 run:
  `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene -- --scene=s3`
  reports `score=89.1`, `strictAverage=87.4`.
- Full comparator run:
  - s0 `77.0`
  - s1 `71.2`
  - s2 `66.3`
  - s3 `89.3`
  - s4 `66.4`
  - average `74.1`
  - strictAverage `70.9`

Next target:

1. Push the remaining low scenes, especially s2 and s4, by matching luminous
   volume/exposure first and camera timing only if the image proves it helps.
2. Keep judging screenshots alongside numbers; scene 3 proves legitimate bloom
   volume can score well without bringing back the flat wash overlay.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 scene parity / rebaseline state

Latest work after the post-chain pass:

```
045f1a9 fix: tune RetroArch post bloom and CRT anti-aliasing
accddaa feat: add scaled RetroArch text helpers
cf556eb docs: clean up RetroArch notes
```

What's in this delta:

- Demoscene scene-by-scene parity tuning in `retroarch/games/demoscene.js`.
  Sky gradients, ambient, fog, vignette, bloom, and a few emissive values were
  shifted toward the web Three.js reference's heavy bloom-wash color
  distribution while preserving visible 3D geometry.
- `nova64_libretro.c` adds tight variants of the text effects:
  `printShadowTight`, `printOutlineTight`, `printRainbowTight`,
  `printWaveTight`, `printFlashTight`, `printShakeTight`, and
  `printGradientTight`. They are registered on both global and `nova64.draw`.
- `drawLightning` was upgraded with a richer glow/branch implementation while
  preserving the legacy `drawLightning(x1, y1, x2, y2, segs, color)` behavior
  used by conformance cart 344.
- `retroarch/tests/run_conformance.sh` was re-baselined for the current
  screenshot set, including font/glyph fixes, post-chain changes, and the
  scene-tuned captures. Updated `screenshots/retroarch/*.png` files are part
  of this baseline.
- `BACKLOG.md` records the shipped work and leaves future parity work focused
  on scene timing, camera composition, particle density, and HUD/font metrics.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `bash retroarch/tests/run_conformance.sh --from 344 --to 344 --skip-build`
  passes with checksum `aaf171a255fb3792`.
- `bash retroarch/tests/run_conformance.sh --skip-build` passes across the
  full suite.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `72.4`
  - s1 `71.2`
  - s2 `66.2`
  - s3 `59.7`
  - s4 `66.1`
  - average `67.1`
  - strictAverage `63.6`

Next target:

1. Push parity beyond ~70 by matching capture timing, animation speeds,
   camera composition, particle counts, and HUD/font metrics.
2. Keep the fake `drawWebBloomWash()` path disabled. The current score is a
   real-scene score, not a mask.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 post-chain bloom/AA state

Latest work after the scaled-text pass:

```
accddaa feat: add scaled RetroArch text helpers
cf556eb docs: clean up RetroArch notes
72eaf39 docs: add RetroArch HDR bloom handoff
```

What's in the post-chain delta:

- Rebalanced multi-mip bloom combine weights toward the wider, lower-frequency
  mips so glow reads broader and less like a tight outline.
- Softened the first brightpass ramp (`threshold + 0.38`) so mid-bright neon
  contributes to bloom without painting fake fullscreen wash rectangles.
- Lightened the final CRT scanline/grille pass so bloom and dark-scene detail
  survive the CRT overlay better.
- Fixed a real AA bug: the previous FXAA-like smoothing happened before CRT
  barrel warp, then CRT overwrote the smoothed color with a fresh sample. The
  smoothing now runs after the final CRT UV is known, so CRT-enabled demoscene
  scenes no longer bypass it.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `54.0`
  - s1 `50.4`
  - s2 `39.0`
  - s3 `49.7`
  - s4 `38.5`
  - average `46.3`
  - strictAverage `44.6`
- A bloom-only tuning run measured average `47.4`, strictAverage `45.8`; that
  run was not kept as-is because it did not include the CRT-path AA fix.

Next target:

1. Scene-by-scene composition/emissive matching against browser captures. The
   browser reference is still heavily bloom-washed in several comparator frames,
   while RetroArch intentionally keeps real 3D geometry visible.
2. Variable-width glyph tuning inside `printTight()` if HUD density remains a
   focus.
3. Windows perf investigation remains deferred unless the user asks.

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
