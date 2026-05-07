# nova64-godot

Godot 4.x host bridge for Nova64 carts. See [`../GODOT.md`](../GODOT.md) for the full plan.

## Layout

- `godot_project/` — Godot 4.x project that consumes the GDExtension and runs carts.
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

## Status

- **Merged to trunk** 🎉. The GDExtension, QuickJS bridge, cart shim, conformance harness, and visual-parity tooling are part of the main Nova64 build. Carts running natively include `minecraft-demo`, `f-zero-nova-3d`, `star-fox-nova-3d`, `space-harrier-3d`, `fps-demo-3d` (with WAD map picker), the full 00–10 conformance series, and the standard 3D/UI/particle demos.
- **Active polish**: WAD render fidelity (walls/flats/sprites/sector light), desktop + mobile export proofs, and finalised host-contract docs. See [`../ROADMAP.md`](../ROADMAP.md) Phase 3.
- **Non-regression rule**: WAD-driven shared-adapter changes must not degrade voxel rendering. Before landing, run `pnpm godot:visual minecraft-demo` and a `voxel-creative` / `voxel-terrain` smoke.
- Visual parity is tracked by `pnpm godot:visual`, which captures browser Three.js, Godot, and diff PNGs for every mirrored cart. See [`docs/VISUAL_PARITY.md`](docs/VISUAL_PARITY.md).

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
