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
  Three.js-specific implementation modules used by `runtime/api-3d.js` and the public `runtime/gpu-threejs.js` wrapper.
- `runtime/backends/babylon/`
  Babylon-specific implementation modules composed by the public `runtime/gpu-babylon.js` wrapper.
- `runtime/shared/`
  Cross-backend contracts and helpers that should not belong to only one renderer.

## Public Compatibility Rules

- Keep flat globals stable: `createCube`, `setCameraPosition`, `createPointLight`, and similar functions must not change names.
- Keep `nova64.*` namespaces stable.
- Keep `runtime/api-3d/*` import paths working through re-export wrappers while backend internals live in `runtime/backends/threejs/*`.
- Keep `runtime/gpu-threejs.js` as the public Three.js entrypoint, even though the implementation now lives in `runtime/backends/threejs/gpu-threejs.js`.
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

Use capability checks for behavior that is intentionally unsupported instead of silent no-ops. Current examples include Babylon particles, post-processing, and dithering behavior.

## Tests That Guard This Split

- `tests/playwright/api-compatibility.spec.js`
  Required backend surface, camera access, point-light mutation, instancing, and unsupported-capability behavior.
- `tests/playwright/wad-vox-regression.spec.js`
  Focused WAD, VOX, and Wizardry Babylon smoke coverage.
- `tests/playwright/backend-parity.spec.js`
  Broader cross-backend cart parity coverage.
- `tests/playwright/visual-regression.spec.js`
  Visual guardrails for skybox and PBR scenes where Babylon should stay close to Three.js without claiming pixel-perfect parity.

## Public Backend Entry Points

- `runtime/gpu-threejs.js`
  Thin public wrapper over `runtime/backends/threejs/gpu-threejs.js`.
- `runtime/gpu-babylon.js`
  Thin public wrapper over `runtime/backends/babylon/gpu-babylon.js`.

## Babylon Notes

The Babylon backend implementation is grouped into focused modules. The main implementation areas are:

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

## Recent Babylon Rendering Work

Recent parity work focused on the places where carts were still clearly broken under Babylon:

- WAD wall, floor, and sprite materials now use a safer Babylon texture/material path, including alpha and color-space handling for runtime-created textures.
- `wizardry-3d` no longer depends on the old store polyfill behavior; plain-object game store initializers now work with real Zustand too.
- Procedural Babylon sky spheres now use the correct material path and ignore fog, which fixes the blown-out `hello-skybox` rendering.
- Image skyboxes now rebuild asynchronously in carts that clear the scene, and Babylon now splits environment-map usage from visible skybox usage instead of treating both as the same texture path.
- Babylon planes are created double-sided so rotated floor planes in carts like `pbr-showcase` and `wad-demo` render reliably.

Current visual status:

- `hello-skybox` is back in close visual range with Three.js and covered by Playwright visual regression.
- `pbr-showcase` is much closer than the earlier broken Babylon output, but it still does not match Three.js perfectly because Babylon does not yet have full PMREM and post-processing parity in Nova64.
- The visual regression threshold for `pbr-showcase` is intentionally looser than simple skybox scenes so it can still catch major regressions without pretending the two backends are identical today.

## Remaining Babylon Backlog

- fuller particle-system parity
- broader model-loading parity beyond VOX coverage
- post-processing parity beyond safe capability-gated warnings
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
