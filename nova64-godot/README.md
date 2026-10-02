# nova64-godot

Godot 4.x host bridge for Nova64 carts. See [`../GODOT.md`](../GODOT.md) for the full plan,
[`../docs/GODOT_HOST_CONTRACT.md`](../docs/GODOT_HOST_CONTRACT.md) for the bridge command
surface, and [`../docs/GODOT_PARITY.md`](../docs/GODOT_PARITY.md) for how this host is kept
in step with the web runtime.

## Layout

- `godot_project/` — Godot 4.x project that consumes the GDExtension and runs carts.
  - `shim/nova64-compat.js` — the cart-facing `nova64.*` API for the QuickJS host.
    **Hand-maintained second copy of `runtime/`** — see _Shim parity_ below.
- `gdextension/` — C++ GDExtension source. Embeds QuickJS and exposes a `Nova64Host` Godot class.
  - `src/` — bridge implementation
  - `src/adapter/` — per-namespace command handlers (material, texture, geometry, mesh, camera, transform, input, audio)
  - `third_party/godot-cpp/` — godot-cpp submodule (Godot 4.3 branch)
  - `third_party/quickjs/` — QuickJS-NG submodule (vendored JS engine)
  - `SConstruct` — SCons build script
  - `nova64.gdextension` — Godot extension manifest
- `tests/carts/` — synthetic test carts (`00-boot.js` … `10-error.js`)
- `tests/conformance/` — shared adapter conformance harness (ported from Three.js / Babylon)
- `scripts/` — build and test orchestration

Engine version: `godot_project/project.godot` declares `config/features "4.5"`, and
`../scripts/lib/godot-binary.mjs` prefers a 4.5 install (then 4.4.1) over whatever `godot`
is on `PATH`. Override with `--godot=/path/to/godot` or `$GODOT`. The `godot-cpp` submodule
is pinned to the `4.3` branch — see the table below.

## Status

- **Merged to trunk** 🎉. The GDExtension, QuickJS bridge, cart shim, conformance harness, and visual-parity tooling are part of the main Nova64 build. Carts running natively include `minecraft-demo`, `f-zero-nova-3d`, `star-fox-nova-3d`, `space-harrier-3d`, `fps-demo-3d` (with WAD map picker), the full 00–10 conformance series, and the standard 3D/UI/particle demos.
- **Active polish**: WAD render fidelity (walls/flats/sprites/sector light), desktop + mobile export proofs, and finalised host-contract docs. See [`../ROADMAP.md`](../ROADMAP.md) Phase 3.
- **`indie-odyssey` initial port** (2026-06-19). The cross-backend dungeon crawler (Echoes of the Shardgrid) is synced into `tests/carts/indie-odyssey/` with its ~26MB asset bundle. Cart code runs against the QuickJS bridge unchanged. Known limitations on the Godot host pending follow-up: story-mode slides use `document.createElement('canvas')` (no DOM in Godot host); combat sprite overlay uses the same DOM-canvas path; combat skybox falls back gracefully to `nova64.light.createSolidSkybox` because the THREE-direct path is feature-checked. See cart `meta.json` notes for the running list.
- **Non-regression rule**: WAD-driven shared-adapter changes must not degrade voxel rendering. Before landing, run `pnpm godot:visual minecraft-demo` and a `voxel-creative` / `voxel-terrain` smoke.
- Visual parity is tracked by `pnpm godot:visual`, which captures browser Three.js, Godot, and diff PNGs for every mirrored cart. See [`docs/VISUAL_PARITY.md`](docs/VISUAL_PARITY.md).

## Shim parity

`godot_project/shim/nova64-compat.js` re-implements the cart-facing API on top of the
bridge. Nothing imports `runtime/` and no build step copies anything across, so a change
to the runtime that is not re-ported here makes the same cart behave differently under
Godot — silently. Two traps:

- **The shim answers unknown members with truthy no-op stubs**, so an unported function
  still passes `typeof x === 'function'`. Probe behaviour, never presence.
- **Divergences look like rendering bugs, not missing APIs** — a level too dark, a wall in
  the wrong place, a player who cannot move.

```bash
pnpm test:godot:parity   # shim vs. runtime on real FreeDoom maps; no Godot install needed
pnpm test                # includes the above — the blocking gate ci-preflight mirrors
pnpm visual:check        # screenshot every mirrored cart on BOTH hosts (contact sheet)
```

The three semantics that have actually bitten — directional lights take a _position_ and
not a direction of travel, `createMaterial(kind)` names a Three.js material class (only
`'standard'`/`'physical'` are PBR), and WAD collision must come from the segment collider
rather than the legacy `colSegs` point cloud — are written up with the measurements in
[`../docs/GODOT_PARITY.md`](../docs/GODOT_PARITY.md).

## Playtesting and footage

Two repository-backed skills drive a native build: `godot-game-tester` launches, plays,
tests and records it; `godot-trailer-maker` cuts the retained takes into review-ready
MP4s. Canonical sources live under `../.alpha-loop/templates/skills/`; `../.claude/skills/`
holds generated harness copies. See
[`../docs/GODOT_PLAYTEST_AND_TRAILER_WORKFLOW.md`](../docs/GODOT_PLAYTEST_AND_TRAILER_WORKFLOW.md).

## Quick Start (Linux/macOS, desktop)

```bash
# After cloning the parent repo with --recursive (or running `git submodule update --init --recursive`)
cd nova64-godot/gdextension
scons platform=linux target=template_debug
```

The compiled extension is dropped into `nova64-godot/godot_project/bin/` and picked up automatically by `godot_project/project.godot`.

## Submodules

This directory uses two git submodules. After cloning the parent repo:

```bash
git submodule update --init --recursive
```

| Path                                | Repo                                     | Branch  |
| ----------------------------------- | ---------------------------------------- | ------- |
| `gdextension/third_party/godot-cpp` | https://github.com/godotengine/godot-cpp | `4.3`   |
| `gdextension/third_party/quickjs`   | https://github.com/quickjs-ng/quickjs    | default |

## Roadmap

See [`../GODOT.md`](../GODOT.md) for the full milestone list (G0–G6) and exit criteria.
