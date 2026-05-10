# Nova64 Coverage Report — v0.5.0

**Generated**: 2026-05-09
**Tool**: [c8](https://github.com/bcoe/c8) v10 (V8 native coverage, ESM-friendly drop-in for nyc)
**Test corpus**: `node tests/test-cli.js all` — 16 suites, 383 tests, 378 passing (98.7%)
**Scope**: `runtime/**/*.js` — every file the cart runtime ships, with `--all` so unimported files still count as 0%.

```
Statements : 19.34% ( 6452 / 33344 )
Branches   : 62.16% (  690 / 1110  )
Functions  : 34.10% (  220 / 645   )
Lines      : 19.34% ( 6452 / 33344 )
```

Branches & functions look healthier than lines because the unit-tested files (namespace, tween, hype, engine adapters, gameutils) are rich in branchy logic, whereas the zeros pull lines down via large 2D/3D draw modules.

Reproduce locally:

```bash
pnpm test:coverage           # text + html + lcov, writes coverage/
pnpm test:coverage:summary   # one-line summary only
open coverage/index.html
```

---

## TL;DR — the knockout report

**🥇 Champion belt (≥80% lines):**

| File | Lines | Funcs | Branches |
|------|------:|------:|---------:|
| `runtime/framebuffer.js` | **100.00%** | 100% | 85.71% |
| `runtime/namespace.js` | **99.85%** | 100% | 88.88% |
| `runtime/font.js` | **89.69%** | 100% | 61.11% |
| `runtime/studio-executor.js` | **89.47%** | 100% | 75.00% |

**🥈 Contenders (40–80% lines):**

| File | Lines | Funcs | Notes |
|------|------:|------:|-------|
| `runtime/tween.js` | 78.84% | 32.81% | core paths covered, easing edge cases unfilled |
| `runtime/engine-adapter.js` | 75.38% | 46.37% | dispatch logic exercised via mocks |
| `runtime/engine-adapter-babylon.js` | 67.94% | 57.89% | bootstrap covered, surface API less so |
| `runtime/hype.js` | 68.54% | 46.23% | swarms/pools/triggers covered, layouts thin |
| `runtime/api.js` | 63.67% | 76.47% | drawing primitives untested, math helpers ok |
| `runtime/logger.js` | 58.33% | 11.11% | constructor only |
| `runtime/screens.js` | 55.00% | 35.00% | switchTo path covered, transitions are not |
| `runtime/backends/babylon/compat.js` | 49.88% | 12.96% | parity shims half-traced |
| `runtime/api-voxel.js` | 47.10% | 49.01% | core voxel ops + entities; persistence/JSON gaps |

**🥉 Cameo appearances (1–40% lines):**

| File | Lines | Funcs |
|------|------:|------:|
| `runtime/data.js` | 30.33% | 0% |
| `runtime/i18n.js` | 30.76% | 0% |
| `runtime/asset-loader.js` | 26.53% | 0% |
| `runtime/manifest.js` | 24.20% | 0% |
| `runtime/env.js` | 17.83% | 0% |

These are mostly module-level imports — the test loaded the file but never called any of its exports.

**🚨 Glass jaws (0% — never imported by any test):**

53 files. Bucketed:

- **Drawing/primitives**: `api-2d`, `api-3d`, `api-blend`, `api-effects`, `api-filters`, `api-generative`, `api-particles-2d`, `api-presets`, `api-skybox`, `api-sprites`
- **Backends — Three.js (whole tree)**: `runtime/backends/threejs/*` — 14 files, 0% across the board
- **Backends — Babylon (most of the tree)**: `runtime/backends/babylon/*` except `compat.js`
- **GPU surfaces**: `gpu-canvas2d`, `gpu-webgl2`, `gpu-babylon`, `gpu-threejs`
- **Input/audio/physics**: `input.js`, `audio.js`, `physics.js`, `collision.js`, `mediapipe.js`
- **UI/stage/movieclip**: `ui.js`, `runtime/ui/*`, `stage.js`, `movie-clip.js`, `canvas-ui.js`, `editor.js`, `textinput.js`, `console.js`, `debug-panel.js`, `debug-logger.js`, `fullscreen-button.js`
- **Voxel infra**: `voxel-mesh-worker.js`
- **Loaders/storage**: `wad.js`, `cart-reset.js`, `assets.js`, `storage.js`, `store.js`, `nft-seed.js`
- **XR**: `xr.js`
- **Camera/skybox/effects**: `camera-2d.js`, `runtime/shared/backend-surface.js`
- **Misc entry**: `runtime/index.js`

---

## Gap analysis — where the misses hurt

### 1. The whole Three.js backend is unmeasured

`runtime/backends/threejs/*` is at 0% because every existing Node-side test mocks the GPU. Visual parity with Babylon is enforced via Playwright (`tests/playwright/*.spec.js`) which c8 doesn't see. **This isn't a real gap** — it's a coverage-tool blind spot. Recommendation: keep visual-regression specs as the source of truth here; don't try to backfill Node tests for the Three.js renderer.

### 2. `api-effects.js` (0%, 892 lines)

Surfaces all post-processing (bloom/FXAA/vignette/chromatic/glitch/glow). The recently-added `enableGlow`/`disableGlow` Babylon flourish is untested at the unit level. Playwright `visual-regression.spec.js` covers it indirectly through `space-combat-3d` and `wing-commander-space`. Worth adding: a Node smoke test that imports `api-effects.js` and asserts `enableGlow` exists and is callable as a no-op.

### 3. `api-2d.js` (0%, 1162 lines)

Largest 2D drawing module — all primitives, gradients, HUD. Currently exercised only via `examples/*` running in Playwright. Could be unit-tested by mocking `ctx` and asserting draw calls (similar to wizardry tests, modulo the Windows path bug).

### 4. `wad.js` (0%, 995 lines)

WAD loader has been hardened across recent commits (Phase 3 — `c6d882d`, `cdc2cce`). Covered manually via `fps-demo-3d` cart but no automated tests. Adding a test that loads a fixture WAD and asserts `convertWADMap` output structure would be high-value.

### 5. `runtime/ui/*` and `canvas-ui.js`

UI primitives are untested. `parseCanvasUI`/`renderCanvasUI` could be unit-tested with a mock surface.

### 6. `voxel-mesh-worker.js` (0%, 677 lines)

Only `api-voxel.js` (47%) hits the worker indirectly. The worker file itself is loaded as a Web Worker in production so c8 can't see it from Node. Acceptable blind spot.

---

## Punch list — next tests to add (ranked by ROI)

1. **`tests/test-effects.js`** — import `runtime/api-effects.js` and assert presence + no-op behavior of `enableBloom`, `enableFXAA`, `enableVignette`, `enableChromaticAberration`, `enableGlitch`, `enableGlow`, `disableGlow`. Cheap; verifies the flat→namespace mapping in `runtime/namespace.js` matches the actual exports. Should bump `api-effects.js` to ~20%.
2. **`tests/test-wad.js`** — fixture-driven: feed `WADLoader` a small synthetic WAD blob, assert `convertWADMap` returns expected sectors/walls/things. Locks down the Phase 3 parity work.
3. **`tests/test-canvas-ui.js`** — feed `parseCanvasUI` a small declarative UI, assert tree shape. No GPU needed.
4. **Fix `tests/test-wizardry.js` Windows path bug** — the 5 failures are `Received protocol 'c:'` from a non-`pathToFileURL` import. Same shape as the `test-cli.js` fix already landed in this branch.
5. **`tests/test-storage.js`** — `saveData`/`loadData`/`saveJSON`/`loadJSON` are pure with `localStorage` mockable. Easy 80%+.
6. **`tests/test-physics.js`** — `aabb`, `circleCollision`, `raycastTilemap` are pure functions. 5-minute test, ~80% coverage of `physics.js` + `collision.js`.
7. **`tests/test-i18n.js`** — `t()`, `setLocale`, `getAvailableLocales`, `addStrings`. Pure.

Implementing 1–7 would lift overall lines from 19% to roughly 28–32% without touching anything graphical.

---

## What won't move the needle (and why that's fine)

- **Three.js & Babylon backends**: covered by Playwright visual regression. Adding Node tests would require huge mocks for marginal value.
- **`xr.js` (771 lines)**: requires WebXR runtime; can't be unit-tested meaningfully.
- **`mediapipe.js` (384 lines)**: requires camera + WASM; same story.
- **`debug-panel.js`, `editor.js`, `console.js`, `fullscreen-button.js`**: DOM-bound dev tooling; not shipped to production carts. Low ROI.
- **`voxel-mesh-worker.js`**: Web Worker — lives in a separate context.

Realistic ceiling for Node-side line coverage given the runtime's nature: ~45–55%. Anything above that is rendered logic that *must* be tested in a browser, which Playwright already does.

---

## Coverage by directory

| Directory | Lines | Functions | Branches |
|-----------|------:|----------:|---------:|
| `runtime/` | 26.47% | 38.65% | 64.48% |
| `runtime/backends/babylon/` | 3.82% | 9.33% | 38.46% |
| `runtime/backends/threejs/` | 0.00% | 0.00% | 0.00% |
| `runtime/shared/` | 0.00% | 0.00% | 0.00% |
| `runtime/ui/` | 0.00% | 0.00% | 0.00% |
| **Total** | **19.34%** | **34.10%** | **62.16%** |

---

## Reproducibility

`coverage/` is git-ignored (or should be — add it if not). The HTML report (`coverage/index.html`) is the most useful artifact for drilling into uncovered lines. `coverage/lcov.info` plugs into IDE gutters (VS Code's *Coverage Gutters* extension) and external dashboards (Codecov, Coveralls) without further config.

CI hookup: `pnpm test:coverage` returns non-zero on test failure, so it's drop-in for GitHub Actions. To enforce a floor, append `--lines=20 --functions=30 --branches=60` to the c8 invocation in `package.json`.
