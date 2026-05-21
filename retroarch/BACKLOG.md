# Nova64 RetroArch — Backlog

Anything that's a known issue, a deferred investigation, or a queued feature
lives here. Update this file as items are picked up or completed.

Last updated: 2026-05-21

**Selected next feature:** A — HDR backbuffer (`RGBA16F`) plus multi-mip bloom.
This is the next visual parity push. Start with a guarded float post target
with `RGBA8` fallback, then add the mip/blur/combine chain behind the existing
single-pass bloom path.

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
   attribs once at program init. Per-draw: `glBindVertexArray` + uniforms
   + `DrawElements` only. Expected: 5–10× speedup on AMD.
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
- **Larger font variant** — 8×16 or doubled 5×7 for titles. Useful for HUD
  text that wants more weight.
- **Variable-width characters** — narrow `i` (3 cols), wide `m` (5 cols);
  improves text density and looks more professional. `printTight()`
  already exists; this would feed into it.
- **HUD font metrics for parity test** — `printTight()` helps density,
  but exact web-font metrics still differ; getting them aligned moves
  numeric parity scores up without losing detail.
- **HDR backbuffer (RGBA16F) + multi-mip bloom.** **Selected next.** Promote the post FBO
  to float16 so brightness > 1.0 survives until tonemap; replace the
  current 13-tap single-pass bloom with 5-mip downsample + separable
  Gaussian + upsample/combine. See TODO comment next to the bloom
  shader in `nova64_libretro.c` for the full plan; also raises parity
  numbers because it closer-matches Three.js UnrealBloomPass.

### Cleanup / technical debt
- **Re-baseline conformance checksums.** The lowercase-font + `/` glyph
  fixes shift hashes for any cart that prints text. Codex flagged cart
  `536 draw text shapes` (`actual=2e174a2556f278f8`); others likely
  affected. Sweep and re-run conformance to update expected hashes.
- **Delete stale files** in working tree root: `retroarch/nova64_libretro_nohw.c`,
  `retroarch/nova64_libretro_hw.c.bak`, `retroarch/nova64_libretro.c.bak`,
  `retroarch/torus_capture.ppm`, `shot_959.png`.

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
