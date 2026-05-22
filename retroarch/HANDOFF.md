# Nova64 RetroArch Handoff

This file is now a short index so the RetroArch notes stay navigable instead of
competing with each other.

## Current Status

Read these in order:

1. `HANDOFF_HWGL.md` - current hardware-GL status, latest validation, parity
   numbers, and next implementation target.
2. `BACKLOG.md` - queued feature work, deferred Windows performance notes, and
   cleanup items.
3. `MEMPALACE_DIARY.md` - chronological session memory for MemPalace mining.
4. `README.md` - stable RetroArch core usage, build, harness, and API docs.
5. `GLES_SMOKE_MATRIX.md` - real-driver/manual smoke coverage.

## Current Visual Baseline

As of 2026-05-21 after the scene-by-scene parity + conformance rebaseline pass:

- Visual parity comparator: `average=67.1`, `strictAverage=63.6`.
- Per-scene scores: s0 `72.4`, s1 `71.2`, s2 `66.2`, s3 `59.7`, s4 `66.1`.
- Scene-by-scene sky, fog, ambient, vignette, and emissive tuning moved the
  demoscene much closer to the web reference's heavy Three.js bloom wash while
  still preserving real 3D geometry.
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
  `BACKLOG.md`.
