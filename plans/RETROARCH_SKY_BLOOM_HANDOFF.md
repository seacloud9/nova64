# RetroArch sky and bloom implementation handoff

Prepared for Claude continuation, 2026-11-12 (America/Los_Angeles).

## User request and state

User asked to implement `plans/RETROARCH_WEB_SKY_BLOOM_PARITY_PLAN.md`: bring latest
web skybox/bloom behavior into native RetroArch and demonstrate the current web
carts side by side. They then asked about usage availability and explicitly asked
for a handoff to Claude if tokens run low. Exact account quota is not accessible;
work was still running. No request to stop or abandon implementation.

Workspace: `/Users/brendonsmith/exp/nova64`, branch
`feat/babylon-parity-bloom-voxel`, HEAD `a14b3cff`. This workspace had extensive
unrelated Godot, distribution and other changes before this task. DO NOT reset,
stash wholesale, stage everything, or commit unrelated work. The user has now
authorized committing this work; inspect Git history for its commit. No push was
requested. Earlier Roblox planning was separately pushed
to main as `c38fc77b`; do not confuse it with this implementation.

Read root `AGENTS.md`. pnpm only; on this Mac use `source ~/.nvm/nvm.sh` then
`nvm use` (Node 24). MemPalace is unavailable (`~/ai-tools` absent); preserve WSL
configuration. Do not replace thin tool-specific instruction pointers with this
handoff. Root `BACKLOG.md` remains the sole queued-work list.

## Implementation files

- `retroarch/nova64_libretro.c`: native bindings, state/lifecycle, GL hooks,
  current-web color/light/bloom path, real PBR property setter, post glitch alias.
- `retroarch/skybox-compat.js`: native JS transport. Constructors/presets are
  injected from web source; Three Color/Vector3 math is bundled without WebGL.
- `scripts/gen-retroarch-sky.mjs` and `retroarch/generated/sky.h`: web GLSL,
  uniforms, presets and constructors embedded in native C/QuickJS. Rename GLSL
  `noise3` mechanically because desktop GL reserves that builtin name.
- `retroarch/skybox-bindings.h`: procedural/star uniforms, HDR and cube asset
  loading (stb HDR enabled), float environment pixel upload. Cube images require
  Three's X flip; HDR panoramas do not. That flip was measured and fixed.
- `retroarch/skybox-render.h`: fullscreen view-direction sky, native point stars,
  image/HDR rendering, GGX environment mips and cosine-weighted diffuse filtering.
- `retroarch/Makefile`: depend on all new headers.
- `scripts/build-nova.mjs`, `retroarch/tools/package_example_cart.py`: shared sky
  files and attribution are bundled AND listed in the generated manifest.
- `retroarch/tests/test-sky-compat.mjs`: six JS differential/API tests.
- `retroarch/tests/test_sky_packaging.py`: alternate packager manifest regression.
- `retroarch/tests/sky_bloom_native.mjs`, `retroarch/tests/carts/sky-bloom-api.js`:
  native API smoke in software and real GL, using a portable package outside the
  checkout so local public assets cannot mask a packaging bug.
- `retroarch/tests/sky_bloom_visual_parity.mjs` and
  `retroarch/tests/carts/sky-bloom-fixture.js`: fixed-step web/native capture,
  explicit sky fixture modes, labeled stills/videos and RGB error reports.
- Documentation: `AGENTS.md`, `retroarch/README.md`,
  `retroarch/GLES_SMOKE_MATRIX.md`, root backlog and implementation plan.
- `package.json`: added `retroarch:test:sky`, `retroarch:visual:sky` and the fast
  generated-header/JS checks to `pnpm test`. Preserve pre-existing Godot changes
  in this same file; stage only task hunks if committing later.

## Validated so far

- Native macOS `.dylib` builds; the offscreen CGL harness uses desktop GL on M4 Pro.
- `pnpm retroarch:test:sky` passes: generation, six JS tests, Python packager test,
  software/native GL smoke. Both image and HDR asset loads work outside checkout.
- Full software conformance passes with 47 existing macOS exclusions.
- Full GL conformance has 20 unlisted checksum failures plus 50 recorded platform
  exclusions. A pre-change core independently compiled from HEAD has EXACTLY the
  same 20 actual mismatch hashes. Do not relax/rebaseline them. Comparison evidence
  is in `retroarch/build/sky-bloom-parity/validation.json` and conformance logs.
- `pnpm test:cli`: 19 passed. `node --test tests/test-cli-package.js`: passed.
- Root quick validation fails on the pre-existing uncommitted Godot bloom mapping
  assertion (`0.26 + bloomThreshold * 0.36`). Do not rewrite that unrelated work.
- Controlled fixed-camera sky error on a 0–255 RGB scale: procedural 0.12,
  rotated HDR 0.35, cube image 0.48, studio environment 0.39. These are background
  measurements, NOT full engine parity percentages.

## Artifacts and reproduction

Six labeled 1280x388 comparisons have been recorded under
`retroarch/build/sky-bloom-parity/<cart>/comparison.mp4` for:
`skybox-showcase`, `pbr-showcase`, `space-harrier-3d`, `f-zero-nova-3d`,
`demoscene`, `hello-skybox`. Demoscene presses Space at frame 90 and runs for
52 seconds; the other five are 30 seconds. Web is left; offscreen native core GL is right.
`report.json` contains source hashes and demo metrics; native logs and stills
are beside videos. These ignored build artifacts are LOCAL, not published.
This is native core footage, not an actual RetroArch frontend recording.

Commands:

```bash
source ~/.nvm/nvm.sh
nvm use
node scripts/gen-retroarch-sky.mjs
make -C retroarch all harness
pnpm retroarch:test:sky
# Vite was started by this task on port 5191:
pnpm exec vite --host 127.0.0.1 --port 5191
# Separate terminal:
pnpm retroarch:visual:sky -- --base=http://127.0.0.1:5191 --seconds=30
# Full five-scene demoscene capture (merge/report separately if needed):
pnpm retroarch:visual:sky -- --carts=demoscene --seconds=52 --out=retroarch/build/demoscene-sky-bloom-parity
# A controlled fixture (also accepts hdr, image, environment, bloom):
pnpm retroarch:visual:sky -- --carts=sky-bloom-fixture --seconds=1 --fixture-mode=gradient --out=retroarch/build/sky-gradient-parity --stills-only
```

The capture script forces Metal for Chromium on macOS (default headless Chromium
was SwiftShader). It freezes/steps requestAnimationFrame and time; it must capture
`canvas.toDataURL()` in the SAME evaluate call as the frame step, otherwise the
non-preserved drawing buffer can be black. Playwright `waitForFunction` options
are its THIRD argument (`null` second), with polling set to 100ms: using the second
argument deadlocked slower async initializations under the frozen animation clock.
Both hosts receive an identical RNG prelude in instrumentation copies; source
carts on disk are unchanged. Internal host constructors consume RNG differently,
so full demo positions/implicit sky seeds can still differ. Explicit-seed fixtures
separate that issue from shader parity. Raw frames are cleaned after video encoding
unless `--keep-frames` is requested.

## Immediate next work

The isolated emissive-cube fixture caught two issues and both are now fixed:
RGB black in the new PBR setter must have opaque alpha (without globally changing
legacy native color parsing), and Three.js UnrealBloomPass retains its 3x composite
scale. The native palette/zero-intensity/black-alpha regression passes, and the
isolated bloom fixture passes its image gate at mean RGB error 3.97/255. Residual
halo/material differences remain; do not call it pixel-perfect bloom parity.
The final six-demo recordings have been refreshed after those fixes. All six
are at 1280x388 (five 30-second demos and a 52-second demoscene covering all five
scenes); `highlight-reel.mp4` and `contact-sheet.png` provide
a quick overview. The report includes the current native binary SHA-256.

Implementation, artifact assembly and current handoff are complete. Review the
videos and the remaining limitations before choosing the next task. Re-run narrow
checks after edits; do not repeat broad suites without a reason.
The user subsequently authorized committing the completed work. Keep unrelated
Godot and distribution changes out of the commit; no push was requested.
Their visual review identifies native glass refraction as the next PBR priority.
The console/npm badge is also included across the main, Babylon and alternate
console layouts. Vite injects the version from package metadata; unbundled Node
imports report `development`. This avoids JSON import syntax unsupported by the
repository's ESLint parser and avoids fetching a separate package.json at runtime.

## Remaining limitations

### Three-way sky comparison requested after the commit

The completed native implementation was committed as `3e4ac033` on
`feat/babylon-parity-bloom-voxel`; no push. The user then requested three-way
Three.js/Godot/RetroArch comparison, native plus web, explicitly including skies.
Working assumption: three columns now, RetroArch WASM/web as an additional
target when runnable. Do not represent the native GL harness as WASM footage.

Added `scripts/capture-three-way-sky.mjs` and `pnpm visual:three-way:sky`.
It reuses the existing web/native fixture capture and the current Godot
conformance runner (does not edit the unrelated Godot changes). Godot 4.5 is
installed at `/Applications/Godot.app/Contents/MacOS/Godot` despite not being on
PATH. The current extension and working-tree shim are used; their identities
and runner/source hashes are recorded. Godot logs report an unavailable optional
Colyseus macOS extension, while Nova64Host loads and writes all seven snapshots.

Gallery: `retroarch/build/three-way-sky/index.html`. Six sky cases (highlands,
aurora, space, HDR studio panorama, six-face image studio, procedural studio
environment) plus the PBR coating fixture. Each has a 1920x396 three-column
still; `still-comparison-reel.mp4` is a 21-second slideshow, NOT motion footage.
All hosts get 60 fixed updates and the same fixture/RNG prelude. Godot gets
extra render-only frames to read the viewport; wall-clock shader animation is
not guaranteed synchronized. Space in Godot uses a baked panorama.

Native whole-frame errors remain under the 5/255 fixture gate. Godot differences
are report-only: gradient 36.51, aurora 47.13, space 41.09, HDR 3.00,
image 0.002, environment 49.23 and coating 40.33 (0–255 RGB scale).
These expose current differences, not claims of three-way visual parity.

### Continued native PBR implementation

After the user reset usage and asked to continue, added native environment
clearcoat support: mesh defaults, partial property updates, clamping, getters,
both GL upload paths and a separate dielectric reflection layer. It uses F0
0.04 and the Three.js minimum coat roughness 0.0525, with Schlick environment
Fresnel and base-energy attenuation. This is NOT full Three physical parity:
direct-light coat highlights and the integrated environment BRDF remain missing.
No example cart source was edited.

`pnpm retroarch:test:sky` passed including software/native GL smoke and new
actual-pixel assertions: omitted and zero coat produce identical frames;
coat strength and coat roughness each change more than 500 channel values.
After a fog-order correction, the native smoke/readback tests passed again.
`retroarch/tests/carts/pbr-coating-fixture.js` isolates studio-environment light
on a rough red sphere with a glossy coat. Its web/native still is saved at
`retroarch/build/pbr-clearcoat-parity/pbr-coating-fixture/comparison.png`.
Whole-frame mean RGB error is 1.37/255; sphere-region error improved from
9.39 with zero coat to 7.91 with the new layer. Neither is a parity percentage.
The capture tool applies its existing 5/255 fixture gate to this fixture too.

Refreshed seven-scene footage goes under
`retroarch/build/pbr-clearcoat-scenes-parity/`; the 48-second video and separate
12-second POV-Ray-style clip completed without browser/cart/shader errors.
Final-frame RGB error is 9.89/255 (previous run 11.97); it measures only that
frame, not the full seven-scene video. Preserve earlier captures.
The user also explicitly wants WASM support. The Makefile already has an
Emscripten static-core target (`emmake make platform=emscripten`), but `emcc`
is absent on this Mac. Shader changes stay in the GLES3-compatible path;
WASM compilation/browser execution are UNVERIFIED, not implicitly passing.

### PBR / POV-Ray follow-up

The user additionally asked to see PBR and possibly POV-Ray. The capture timeline
now selects all seven unchanged PBR Showcase scenes at six-second intervals;
use `pnpm retroarch:visual:sky --carts=pbr-showcase --seconds=48
--out=retroarch/build/pbr-scenes-parity` (one shell command). The last twelve
seconds cover the nine-second scanline reveal and completed scene. Native capture
instrumentation supplies a simulation-based `performance.now()` explicitly,
matching the web capture clock rather than letting host rendering speed control
the reveal. This is capture instrumentation, not a runtime change.

The cart's "POV-Ray 1995" is a rasterized PBR scene with a timed overlay, NOT
an embedded POV-Ray renderer or true recursive ray tracing. Its chrome/glass
appearance still depends on native PBR limitations. Real POV-Ray integration
would be separate work; do not describe this demonstration as that integration.
Scene controls: 1 matrix, 2 metals, 3 glass/gems, 4 coatings, 5 neon/mirror,
6 showroom, 7 POV-Ray style; R restarts the reveal.
The output includes `pbr-showcase/comparison.mp4` (48 seconds) and a separate
`pov-ray-style-comparison.mp4` (last 12 seconds). Native final-frame inspection
confirmed the reveal completes; HUD color and glass differences remain visible.

Exact full-demo parity is NOT complete. Native environment filtering is GGX-based,
not exact Three.js PMREM; clearcoat is incomplete and glass is an environment
refraction approximation. Legacy geometry, TSL/material effects, HUD and random
scene differences remain visible (especially demoscene). F-Zero also shows missing track props and green HUD
colors becoming magenta: the existing global 24-bit promotion heuristic can
reinterpret red-zero RGBA32 values. Do not globally change rgba8 return types or
color parsing without compatibility tests; the current native API deliberately
returns Numbers for legacy bitwise callers. Windows/Linux drivers
and actual RetroArch frontend pacing/input/presentation still require validation.
The current web path intentionally retains neutral defaults; legacy native post
calls keep their previous rendering and checksums.
