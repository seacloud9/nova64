# Gaussian feasibility continuation handoff

Prepared 2026-11-12. User requested continuing the PlayCanvas-style Gaussian
splatting work, across Three.js/Godot/Native/WASM eventually. This turn implemented
a bounded Three.js feasibility reference, not a four-target Gaussian release.

## Workspace and prior work

Work is in `/private/tmp/nova64-glass`, branch `feat/native-glass-transmission`,
based on main `1494831c`. Main already has earlier sky/PBR/three-way work pushed.
This worktree retains the uncommitted native glass/GGX/absorption/four-view work
from prior turns. Do not reset or wholesale stage it. The original workspace at
`/Users/brendonsmith/exp/nova64` has unrelated Godot changes; preserve them.
No new commit or push was requested by this continuation.

Read AGENTS.md. The repo cart-dev skill at
`.claude/skills/nova64-cart-dev/SKILL.md` was read before cart work. No files under
examples/ were edited. Prototype code is under experiments/ and is not advertised
as a production backend capability. Node 24 via nvm; pnpm commands only.
MemPalace remains unavailable on this Mac (`~/ai-tools` absent); preserve WSL config.

## New implementation

- `experiments/gaussian-splatting/data.js`: ASCII/binary little-endian float32
  Gaussian PLY, bounds, validation, log-scale/logit decode, wxyz-to-xyzw rotation,
  DC-to-linear color. Reports discarded higher SH explicitly.
- `renderer.js`: instanced ellipse projection from 3D covariance; one global batch
  per scene; synchronous bounded CPU sort across resource groups. Scene callback
  is chained and restored. Resources live under a root Group so the existing
  scene clear does not double-dispose geometry before the custom reset hook.
- `synthetic.js` and deterministic `synthetic.ply`: analytic, project-owned torus.
- `cart.js`: console-loadable Three-only cart, two overlapping transformed assets,
  mesh occlusion, orbit camera, clear Three-only/synthetic labels and reset hook.
- `tests/test-gaussian-feasibility.mjs`: parser/contracts/order/covariance/disposal.
- `scripts/gaussian-feasibility.mjs`: real browser pixel checks and motion capture.
- Package scripts `test:gaussian:prototype`, `gaussian:prototype:capture`;
  AGENTS.md updated first for these experimental commands (CRLF preserved).
- Experiment README describes limits, execution and the next milestone.

## Verification

Five Node tests passed. Browser checks passed for elongated ellipse moments,
rotation, camera reversal changing red/blue compositing order, opaque cube
occlusion, and cart reset releasing geometry exactly once. Actual console direct
path and asset fetch are used, without intercepted cart/asset responses.

A refreshed 48-second 640x360 motion capture completed after switching to a real
static PLY asset and actual console `path` loading. Log:
`/tmp/nova64-gaussian-capture.log`. Vite is already serving this worktree
at http://127.0.0.1:5193 (started in an earlier turn).

Artifacts: `retroarch/build/gaussian-prototype/`, including screenshots, PLY,
report and `showcase.mp4`. The screenshot shows two colored Gaussian torus forms
and a normal mesh cube. This is synthetic proof, not photorealistic scan footage.
On the current M4 Pro/ANGLE Metal setup, a preliminary 2,304-Gaussian CPU prepare
median was about 0.5 ms. It includes transforms/sort/packing, excludes GPU draw
and is not gameplay FPS or a memory peak. Preserve renderer identity and hashes.

## Next steps

1. Keep the 48-second motion video labeled Three.js-only. Artifacts and this
   handoff are copied to the original workspace for durable review.
2. Root BACKLOG and the proposal now identify the implemented feasibility
   reference; public loader/worker and other hosts remain unimplemented.
3. Run relevant checks after further source edits; current Node and browser
   tests pass. No shipping runtime API was changed by this prototype.
4. Next implementation milestone: a small licensed real scan, color/SH conventions,
   bounded worker sorting and a portable asset/handle contract, then Native/WASM
   and Godot. Do not claim PlayCanvas parity from this synthetic experiment.


## Latest user direction: worlds and live portals

User wants World Labs-style explorable worlds with PlayCanvas-style splat shader
effects, Babylon support, Apple Gaussian/USDZ exploration, and actual portals
that reveal the destination world with correct perspective and permit crossing.
The revised SPLAT_MAPPING_PROPOSAL.md records the portal rendering, per-view
sorting, clipping, collision and validation requirements. These features are
planned, not implemented. Do not present the synthetic ring demo as meeting them.
Spark is a researched Three.js candidate; it has not been installed or integrated.
A Babylon Assets skull.splat was downloaded locally under experiment assets;
license attribution, pinned origin and hashes must be recorded before distribution.
MemPalace remains unavailable on this Mac (~/ai-tools absent).


## Browser world implementation checkpoint

The previously planned browser world/portal milestone has now been implemented
in `experiments/splat-worlds/` in `/private/tmp/nova64-glass`. Spark 2.4.0 is
installed and integrated; both Three.js and Babylon load the licensed apartment
and skull assets, apply GPU effects and render/traverse linked live portals.
See SPLAT_WORLDS_HANDOFF.md for current checks, footage and remaining limits.
Earlier statements that these browser features are only planned are superseded
by this checkpoint. Native/Godot/WASM Gaussian rendering is still pending.
