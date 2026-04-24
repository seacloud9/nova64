# Backend Runtime Structure

Nova64 now treats `runtime/` as the stable public/runtime layer and moves renderer-specific implementation into backend folders.

## Folder Layout

```text
runtime/
  api-3d.js
  gpu-threejs.js
  gpu-babylon.js
  api-3d/
  backends/
    threejs/
    babylon/
  shared/
```

## Ownership

- `runtime/`
  Public entrypoints, stable cart-facing wrappers, and compatibility re-exports.
- `runtime/backends/threejs/`
  Three.js-specific implementation modules used by `runtime/api-3d.js`.
- `runtime/backends/babylon/`
  Babylon-specific implementation modules composed by `runtime/gpu-babylon.js`.
- `runtime/shared/`
  Cross-backend contracts and helpers that should not belong to only one renderer.

## Public Compatibility Rules

- Keep flat globals stable: `createCube`, `setCameraPosition`, `createPointLight`, and similar functions must not change names.
- Keep `nova64.*` namespaces stable.
- Keep `runtime/api-3d/*` import paths working through re-export wrappers while backend internals live in `runtime/backends/threejs/*`.
- Keep `runtime/gpu-babylon.js` as the public Babylon entrypoint, even though the implementation now lives in `runtime/backends/babylon/gpu-babylon.js`.

## Backend Surface Contract

`runtime/shared/backend-surface.js` defines the shared backend surface used to keep Three.js and Babylon aligned.

It currently separates:

- Required surface keys
  Functions that both backends must expose for cart/runtime parity.
- Capability-gated keys
  Functions that may be backend-specific or intentionally unsupported.

This contract is used to:

- expose Babylon cart-facing APIs without a handwritten export list
- keep required camera/light/mesh/scene accessors synchronized
- make parity regressions visible in Playwright

## Capability Flags

Each backend exposes explicit capability flags:

- `runtime/backends/threejs/capabilities.js`
- `runtime/backends/babylon/capabilities.js`

Use capability checks for behavior that is intentionally unsupported instead of silent no-ops. Current examples include Babylon skybox and dithering behavior.

## Tests That Guard This Split

- `tests/playwright/api-compatibility.spec.js`
  Required backend surface, camera access, point-light mutation, instancing, and unsupported-capability behavior.
- `tests/playwright/wad-vox-regression.spec.js`
  Focused WAD and VOX Babylon smoke coverage.
- `tests/playwright/backend-parity.spec.js`
  Broader cross-backend cart parity coverage.

## Babylon Notes

`runtime/gpu-babylon.js` is now a thin façade over grouped backend modules. The main implementation areas are:

- `bootstrap.js`
- `scene.js`
- `camera.js`
- `lights.js`
- `primitives.js`
- `transforms.js`
- `models.js`
- `instancing.js`
- `surface.js`

Current Babylon design rules:

- `engine` must mean the Nova64 engine adapter, not the raw Babylon renderer.
- `getRenderer()` returns the raw Babylon engine when direct renderer access is needed.
- Unsupported features should fail safely and advertise capability flags.

## Remaining Babylon Backlog

- native skybox parity instead of safe capability-gated warnings
- fuller particle-system parity
- broader model-loading parity beyond VOX coverage
- continued removal of façade-only glue as shared contracts mature

## Extending The Runtime

When adding a new cart-facing 3D API:

1. Add the function to the appropriate backend module(s).
2. Update `runtime/shared/backend-surface.js` if it is required or capability-gated.
3. Expose it through the public wrapper layer.
4. Add or update parity coverage in Playwright.

When behavior is backend-specific:

1. Add an explicit capability flag.
2. Fail safely instead of throwing in normal cart usage.
3. Cover the limitation with a focused regression or compatibility test.
