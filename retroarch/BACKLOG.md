# Nova64 RetroArch — Backlog

Anything that's a known issue, a deferred investigation, or a queued feature
lives here. Update this file as items are picked up or completed.

Last updated: 2026-05-21

**Latest feature shipped:** ENERGY_CORE luminous-volume parity tuning. Scene 3
now uses brighter real sky/fog/ambient/emissive values instead of the old fake
wash overlay, raising full demoscene parity to **74.1% / 70.9% strict**.

---

## 🔴 Deferred — Windows performance investigation

**Status:** diagnosis complete, fix not applied. Carry forward.

### What we know

User on **AMD Radeon 780M, Windows RetroArch, glcore driver** reports:

```
FPS 32  31 ms
js  0ms  gl 31ms  tot 31ms
post 0ms  ovl 0ms  draws 33
```

The full 31 ms/frame is **inside the GL pass** — every other subsystem
(JavaScript, bloom/post, software-framebuffer overlay) reports 0 ms.
With 33 draws/frame that's ~**0.94 ms per draw call**, which is the
classic signature of a driver doing a full pipeline flush on every draw.

For comparison, Linux Mesa **llvmpipe** software renderer (CPU, via the
headless harness) runs the same demoscene's 3D pass in **6–10 ms**. So
the AMD GPU on Windows is **3–5× slower than CPU software** at the same
workload. That rules out our shaders/buffers and points firmly at the
Windows AMD GL Core driver path.

### Ruled out by measurement

- Post FBO is correctly allocated at 640×360 (not window-sized)
- Bloom shader is essentially free on hardware (0 ms)
- Software framebuffer upload is essentially free (0 ms)
- Total draw count is small (33)
- Not a first-frame shader-compile spike — steady state

### Top hypothesis

`render_gles_meshes_sorted()` re-runs `VertexAttribPointer` +
`EnableVertexAttribArray` for every non-instanced mesh draw. AMD's Windows
GL Core driver appears to treat each setup as a state change requiring a
command-buffer flush. The fix is to configure vertex attribs **once** in a
per-program VAO and only change uniforms + draw per call.

### Action plan when picked up

1. **Apples-to-apples Linux measurement first.** Run RetroArch desktop on
   Linux (not the harness) with the same nova64 core + demoscene cart;
   press Shift+F and read the same numbers. If Linux is fast, it's
   confirmed Windows-AMD-specific. If Linux is also slow, it's a general
   draw-path issue.
2. **Tweak RetroArch frontend sync settings on Windows** as a quick
   no-code test (in this order):
   - Settings → Video → Synchronization → **Max Swapchain Images** = 2 (default is 3)
   - Settings → Video → Synchronization → **Hard GPU Sync** = OFF
   - Settings → Drivers → **Threaded Video** = OFF
3. **VAO refactor** for the cube/sphere/torus path. Configure vertex
   attribs once at program init. Per draw, bind the VAO, update uniforms,
   and call `DrawElements` only. Expected: 5–10× speedup on AMD.
4. Re-measure with the FPS overlay after each change.

### Diagnostic infra already in tree (no work needed to repro)

- FPS overlay: **Shift + F** in any cart, shows colored FPS + per-stage breakdown
- Per-stage telemetry is always-on when the overlay is enabled (no env var needed)
- One-shot frame-0 log line on context reset:
  ```
  [nova64-perf] frame0 NOVA64=… hw_fbo=… GL_VIEWPORT=… MAX_VP=… post_fbo=…
  ```
- Color preview swatch: `c:\tmp\fps_swatch_preview.png`

### MemPalace context

- Topic: `nova64-windows-perf-3d-mesh-pass-bottleneck` (2026-05-21)
- Topic: `nova64-catchup-after-codex-textfx` (2026-05-20)

---

## 🟡 Queued — visual/feature work

In rough priority order; pick what fits the user's mood.

### Parity / polish

- **Variable-width characters** — narrow `i` (3 cols), wide `m` (5 cols);
  improves text density and looks more professional. `printTight()`
  already exists; this would feed into it.
- **HUD font metrics for parity test** — `printTight()` helps density,
  but exact web-font metrics still differ; getting them aligned moves
  numeric parity scores up without losing detail.
- ~~**Scene-by-scene emissive/camera parity.**~~ Initial scene-by-scene
  pass shipped (see Recently shipped). Further refinement (e.g., matching
  web capture timestamps, animation speeds, particle counts) is still on
  the table when we want to push the numeric score past ~70.
- **Scene 2 + scene 4 luminous-volume pass** — scene 3 proved that matching
  web exposure with real sky/fog/emissive volume can move the score without
  hiding geometry. Apply the same screenshot-first approach to DIGITAL_CITY
  and THE_VOID before revisiting camera timing.

### Cleanup / technical debt

- ~~**Re-baseline conformance checksums.**~~ Done — full 519-case sweep
  re-baselined; `bash retroarch/tests/run_conformance.sh --skip-build`
  reports "Conformance passed." See Recently shipped.
- **Keep docs tidy.** `retroarch/README.md` is the stable folder README,
  `HANDOFF_HWGL.md` is the active implementation handoff, `HANDOFF.md` is only
  a short index, and generated captures/binaries should stay untracked.

### Driver / platform coverage

- **Fill out `GLES_SMOKE_MATRIX.md`** — real-hardware smoke tests for
  Linux `gl` driver, Vulkan, Android, Raspberry Pi 4. Currently only
  Mesa softpipe + glcore are ✅ passed.

---

## 🟢 Definitely-explore-later notes (anchor points in code)

These have inline TODO comments in `nova64_libretro.c` so a future LLM
will trip over them while editing the relevant code:

- **Multi-mip / RGBA16F bloom** — see comment block above the bloom
  shader (around `if (u_bloom > 0.0)`). References this backlog +
  diary topic `nova64-bloom-tuning-three-js-style`.

---

## ✅ Recently shipped (for context)

The last session arc closed out:

- ★ Full conformance suite re-baseline. Swept all 519 cases, captured
  current actual checksums, and updated `retroarch/tests/run_conformance.sh`.
  Most of the drift came from the lowercase font + corrected `/` glyph
  - scene-by-scene tuning + HDR/multi-mip bloom — all intentional changes
    with visual confirmation. `bash retroarch/tests/run_conformance.sh
--skip-build` now reports "Conformance passed." across the board
    (previously failing on the first batch).
- ★ Scene-by-scene parity tuning for the demoscene. Shifted each scene's
  sky gradient, ambient, fog, and vignette toward the colour distribution
  of the web Three.js reference (heavy bloom wash). Result: visual parity
  numeric score jumped from 46.3% / 44.6% strict to **67.1% / 63.6% strict**
  (+20.8 / +19.0). Per scene:
  - s0 GRID_AWAKENING 54 → 72 (brighter pink sky, lighter vignette)
  - s1 DATA_TUNNEL 50 → 71 (sky shifted from navy to cyan to match web's cyan wash)
  - s2 DIGITAL_CITY 39 → 66 (magenta sky + pink-tinted city emissive, lighter vignette)
  - s3 ENERGY_CORE 50 → 60 (brighter pink sky, softer vignette)
  - s4 THE_VOID 38 → 66 (saturated magenta sky/fog/ambient, vignette 1.35 → 0.42)
    Visually the scenes now read as authentic Three.js-style bloom-washed
    cyberpunk while still showing 3D detail through the wash.
- ★ ENERGY_CORE luminous-volume parity pass. Brighter magenta/pink sky, lighter
  vignette, closer fog, stronger ambient, and higher emissive core/ring/orb
  values moved scene 3 from about 60% to 89% and the full comparator from
  **67.1% / 63.6% strict** to **74.1% / 70.9% strict**. A camera-only web
  formula experiment regressed the scene to ~39%, so the winning path is
  real exposure/volume matching, not camera displacement.
- ★ Variable-width tight text effect variants: `printShadowTight`,
  `printOutlineTight`, `printRainbowTight`, `printWaveTight`,
  `printFlashTight`, `printShakeTight`, `printGradientTight`. Same call
  shape as their fixed-width counterparts; glyphs advance by content
  width + 1 px via the existing `glyph_tight_advance` path. Registered on
  both global and `nova64.draw` namespaces. Side-by-side preview saved at
  `c:\tmp\tight_effects_preview.png`.

- ★ Windows hardware GL working (libretro.h struct fix was the keystone)
- ★ Demoscene `drawWebBloomWash` removal — real 3D scenes visible
- ★ Sky gradient shader replacing the `skyPanel` cube hack
- ★ Bloom shader tuned to Three.js UnrealBloomPass intensity
- ★ Full lowercase a-z + missing ASCII punctuation in the bitmap font
- ★ Forward-slash glyph bug fix (was rendering as backslash shape)
- ★ Shift+F in-game FPS overlay with color-coded health + per-stage breakdown
- ★ Demoscene scene-2 light cycles (Codex)
- ★ `printTight()` / `tightTextWidth()` variable-width text path (Codex)
- ★ `drawGlowText(..., scale)` honors scale arg (Codex)
- ★ `nova64.draw` namespace aliases for Batch 41 helpers (Codex)
- ★ Per-stage perf telemetry (post / overlay convert / overlay upload / overlay draw)
- ★ Diagnostic frame-0 one-shot log
- ★ HDR post target (`RGBA16F` with `RGBA8` fallback) + guarded 5-mip bloom chain
- ★ RetroArch docs cleanup: folder-local README, short handoff index, stale
  tracked backup/capture files removed
- ★ Browser-style scaled text: `print(..., scale)`, `printCentered(..., scale)`,
  `printRight(..., scale)`, `printScaled()`, and `printTightScaled()`
- ★ Post-chain tuning after HDR/mips: wider bloom mip weighting, softer
  brightpass ramp, lighter CRT scanlines/grille, and edge smoothing moved after
  CRT barrel warp
