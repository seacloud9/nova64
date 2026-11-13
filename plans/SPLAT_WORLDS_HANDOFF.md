# Splat worlds and live portals — implementation handoff

2026-11-12. User approved implementation of World Labs-style explorable worlds,
PlayCanvas-style splat shader effects, Babylon support and live walk-through
portals. Apple Gaussian/USDZ interoperability and existing native/WASM/Godot
parity goals remain in scope for subsequent milestones.

## Workspace and source

Active implementation: `/private/tmp/nova64-glass`, branch
`feat/native-glass-transmission`, based on main `1494831c`.
Changes are uncommitted. Earlier native/PBR/WASM improvements in that same
worktree remain uncommitted too; preserve them. The original checkout has
unrelated dirty Godot/release/dist work and must not be reset or overwritten.

- `experiments/splat-worlds/cart.js`: actual Nova64 lifecycle cart, movement,
  crossing, HUD and reset registration. No production cart API added.
- `portal-math.js`: doorway transform, swept bounded crossing, exit plane and
  oblique near-plane projection.
- `three-host.js`: Spark 2.4.0, separate scenes/renderers per world, portal camera
  and half-float target, depth-tested aperture, shader modifier and disposal.
- `babylon-host.js`: installed Gaussian renderer, shared effect plugin, separate
  world camera layers and sorting resources, render target, clipping and cleanup.
- `effects.js`: common GLSL semantics for radial reveal, dissolve, pulse and tint.
- `tests/test-splat-portals.mjs`: transform reversibility, swept crossing,
  perspective correspondence and near-plane rejection.
- `scripts/splat-worlds-check.mjs`: Playwright pixel/lifecycle checks, asset hashes
  and optional 48-second fixed-step moving comparison.
- `package.json` / `pnpm-lock.yaml`: pinned Spark 2.4.0 and fflate 0.8.2; the
  `test:splat:worlds` command. Existing unrelated script additions are preserved.
- AGENTS, BACKLOG, docs/BACKEND_RUNTIME and proposal updated.

## Robustness (2026-11-12, commit after da9dd569)

- Committed: `261d13f9` native glass/PBR, `da9dd569` splat worlds.
- Scan binaries are gitignored; `pnpm splat:assets` fetches + verifies SHA-256.
  The cart preflights assets and fails with that instruction if missing.
- dt clamped to 1/20 s; NaN-safe movement; re-init disposes the old host;
  host `dispose()` is idempotent (also safe on partial-load failure).
- 8 math/collision tests; both browser backends pass `pnpm test:splat:worlds`.

## Run and inspect

Vite is running on 127.0.0.1:5193 from the active worktree.

```sh
source ~/.nvm/nvm.sh
nvm use
pnpm dev --host 127.0.0.1 --port 5193
pnpm test:splat:worlds
node scripts/splat-worlds-check.mjs --capture
```

Open `/console.html?path=/experiments/splat-worlds/cart.js&w=640&h=360`.
For Babylon add `backend=babylon&` before `path`.
WASD moves, arrows turn, Shift accelerates; 0–4 select effects.

The apartment is 661,466 splats; skull is 162,598. Babylon pads these counts to
661,472 / 162,608. Apartment attribution: Stephane Agullo, SA3D_R&D_XP47,
https://sa3d.fr; source superspl.at/view?id=cdcec084, CC BY 4.0. Skull is from
BabylonJS Assets, CC BY 4.0 under the repository asset license; individual creator
not identified. Pinned source URLs and SHA-256 accompany the assets under
`experiments/gaussian-splatting/assets/`. Preserve attribution in distributions.
These assets are separate from the Nova64/Spark MIT licenses.

## Verified evidence

Both browser paths pass actual green/red destination-plane clipping, blue
foreground occlusion, lateral parallax (~33 pixels), crossing and return,
outside-door rejection, WASD movement, actual scan tint and reset cleanup, with
no recorded browser errors. Math suite passes all four tests. Targeted ESLint
passes. The full existing `pnpm test` passes. Frozen install and production build
pass. Generated tracked build HTML was restored after verification.

Artifacts: `retroarch/build/splat-worlds/` (ignored), including scan screenshots,
controlled pixel fixtures, report.json and optional videos. The combined moving
comparison is 48 seconds at 15 output fps, Three.js/Spark left and Babylon right.
Capture output fps is not a real-time rendering performance claim. Babylon's
canvas is normalized to 640x360 for comparison; the live renderer sizes itself
to its console viewport.

## Limits and next steps

- Collision: `collision.js` resolves a swept circle (r=0.25) against each
  world's authored `walk` region (bounds + solid boxes) with sliding and no
  tunnelling; door posts are solid. Furniture boxes for the two scans are not
  yet authored (`blockers: []`) — measure them against the scans and add them.
- One visible destination view, one bounce; equal-scale upright doors. No recursive
  portals or progressive world loading. Both assets load before cart readiness.
- Assets/code currently load through Vite from the checkout. Portable `.nova`
  packaging and built-site deployment are not established by this demo.
- No public Gaussian/portal API, USDZ/USDC converter, general NeRF renderer or
  World Labs world-generation service integration yet.
- Godot/native/WASM Gaussian rendering and secondary-view portal paths are pending.
  Preserve the older four-view material/sky results as separate evidence.
- Babylon's SOG loader uses WebP object URLs internally. Long-session memory
  accounting across repeated real asset reloads still needs measurement; do not
  claim zero growth from the structural disposal check alone.
- Verify practical device frame time and peak CPU/GPU memory, including two
  simultaneous worlds, before setting supported scene sizes/performance claims.
- MemPalace is unavailable on this Mac because ~/ai-tools is absent. Existing
  WSL configuration was preserved.
