# Nova64 RetroArch Handoff

This file is now a short index so the RetroArch notes stay navigable instead of
competing with each other.

## Current Status

### 2026-06-19 Demoscene / Renderer Handoff

Completed and committed:

- Commit `dbefb02 fix(runtime): restore threejs color vibrancy`.
- Root cause: Three.js default renderer path was washing out cart colors through
  global ACES tone mapping / exposure and default `MeshStandardMaterial`
  environment response. Fixed with `NoToneMapping`, no fake exposure bloom, and
  diffuse default material shading for non-PBR geometry.
- Added regression coverage in
  `tests/playwright/visual-regression.spec.js`: Hello World Three.js must retain
  saturated cyan/blue cube pixels.
- Moved `retroarch/BACKLOG.md` to root `../BACKLOG.md` and documented root
  backlog as the single source of truth in `AGENTS.md`.
- Updated MemPalace after the renderer/backlog work.

Validation already run:

- `pnpm exec playwright test tests/playwright/visual-regression.spec.js --grep 'hello-world Three.js should keep vibrant blue cube color|hello-3d should look similar|hello-skybox should look similar' --reporter=line` passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm build` passed.
- `pnpm test:babylon:api` was attempted but exceeded the 4-minute tool timeout;
  the spawned Playwright/dev-server processes were terminated.

Current uncommitted follow-up:

- `retroarch/games/demoscene.js` has a first-pass retune against the corrected
  vivid browser reference:
  - lowered old bloom/wash values,
  - darkened sky/fog for all scenes,
  - reduced full-screen white/pink haze,
  - reframed scene 0/1 cameras closer to the web cart.
- Syntax check passed: `node --check retroarch/games/demoscene.js`.
- Latest parity run:
  `node retroarch/tests/demoscene_visual_parity.mjs --out=retroarch/build/demoscene-parity --scene=s0,s1,s2,s3,s4`
  passed and improved average from `67.2` / strict `64.9` to `79.7` / strict
  `76.9`.
  - s0 `80.6`
  - s1 `84.1`
  - s2 `77.7`
  - s3 `77.4`
  - s4 `78.8`

Next recommended pass:

- Inspect `retroarch/build/demoscene-parity/browser/*.png` vs
  `retroarch/build/demoscene-parity/retroarch/*.png`.
- Scenes 2/3/4 still need closer composition and luminance tuning. Scene 1 is
  the best aligned after the first retune.
- Keep tuning RetroArch toward the corrected browser reference; do not restore
  the old washed-out web look.
- After the next tuning pass, rerun the demoscene parity script and then run the
  focused RetroArch/GLES validation slice if available.

Read these in order:

1. `HANDOFF_HWGL.md` - current hardware-GL status, latest validation, parity
   numbers, and next implementation target.
2. `../BACKLOG.md` - queued feature work, deferred Windows performance notes, and
   cleanup items.
3. `MEMPALACE_DIARY.md` - chronological session memory for MemPalace mining.
4. `README.md` - stable RetroArch core usage, build, harness, and API docs.
5. `GLES_SMOKE_MATRIX.md` - real-driver/manual smoke coverage.

## Current Runtime Baseline

As of 2026-05-24, the latest shipped work is the web-cart compatibility layer:

- Latest commit: `ef10683 docs(backlog): document web-cart compat layer landing + remaining gaps`.
- `examples/*/code.js` carts are now a first-class RetroArch target. Web remains
  the source of truth; prefer runtime compatibility fixes over editing web carts.
- Current compat probe: `9 PASS`, `4 WARN`, `5 FAIL` across the first 19 web carts.
- Newly loading unmodified through the RA runtime: `hello-world`,
  `hello-namespaced`, `filter-glitch`, `hud-demo`, `space-harrier-3d`,
  `particle-fireworks`, `screen-demo`, `input-showcase`, and `boids-flocking`.
- The next target is in `../BACKLOG.md`: push web-cart compat from `9/19` toward
  all-green by filling missing `nova64.scene`, UI, tween, voxel, and material
  compatibility gaps.

## Current Visual Baseline

As of 2026-05-22 after the all-scene luminous-volume parity pass:

- Visual parity comparator: `average=89.6`, `strictAverage=87.8` after
  stabilizing the browser reference hook.
- Per-scene scores: s0 `86.7`, s1 `91.2`, s2 `90.2`, s3 `90.4`, s4 `89.5`.
- Scene-by-scene sky, fog, ambient, vignette, and emissive tuning moved the
  demoscene much closer to the web reference's heavy Three.js bloom wash while
  still preserving real 3D geometry.
- Scene 3 was retuned with real sky/fog/ambient/emissive changes, raising it
  from roughly `59.7` to `89.3` without re-enabling `drawWebBloomWash()`.
- Scenes 0, 1, 2, and 4 were then retuned with the same screenshot-first
  luminous-volume approach, bringing the full comparator to just under 90%.
- The latest pass aligned top-HUD panel metrics with the web cart and nudged
  scenes 2, 3, and 4, improving strict parity while keeping bottom HUD text
  centered because matching the web's apparent bottom-text offset regressed.
- The web demoscene debug jump now resets RNG and cumulative `gameTime`, so the
  comparator captures deterministic reference frames instead of drifting with
  page warmup time. Scene 0 terrain/grid opacity was softened to match that
  stabilized reference.
- HDR post target is guarded: `RGBA16F` is attempted first, `RGBA8` is the
  fallback.
- Bloom now uses a guarded 5-mip downsample/blur/combine chain, with the old
  13-tap single-pass bloom kept as fallback.
- CRT-enabled post now applies edge smoothing after the barrel-warp sample, so
  demoscene scenes no longer bypass the FXAA-like smoothing path.
- Text helpers now honor browser-style scaling: `print(..., scale)`,
  `printCentered(..., scale)`, `printRight(..., scale)`, plus explicit
  `printScaled()` and `printTightScaled()`.
- Tight text effect variants are wired globally and under `nova64.draw`:
  `printShadowTight`, `printOutlineTight`, `printRainbowTight`,
  `printWaveTight`, `printFlashTight`, `printShakeTight`,
  `printGradientTight`.
- Full conformance was re-baselined and passes with the current source and
  screenshot set.
- The earlier 85%+ number was a mirage caused by flat bloom-wash fields. Do not
  chase it by hiding real 3D detail.

## Working Rules

- Keep generated captures and binaries out of commits.
- Do not reintroduce tracked backup source snapshots.
- Use `pnpm run mempalace:mine:retroarch` after meaningful RetroArch progress.
- Keep this file short. Put durable workflow and build details in `README.md`,
  current implementation notes in `HANDOFF_HWGL.md`, and queued work in
  `../BACKLOG.md`.
