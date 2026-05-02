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

- **G1 — Spike** in progress. GDExtension links QuickJS, loads ES module carts, and exposes the first batch of adapter commands (material/geometry/mesh/transform/camera/light). The `01-cube.js` cart renders a rotating lit cube end-to-end.
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
