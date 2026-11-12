# Nova64 Roblox host and unchanged-cart compilation plan

Prepared: 2026-11-12. Status: proposed research and implementation plan;
no Roblox prototype or compatibility claim has been validated yet.

## Goal and assumptions

An author exports an existing Nova64 JavaScript cart to Roblox without editing
the cart source. Players launch the resulting Roblox experience and the game
works: lifecycle, controls, gameplay, camera, HUD, audio, assets, and saves behave
as expected. Generated intermediate files may differ completely from the source.
Automatic compilation and compatibility helpers are allowed; requiring a manual
Luau rewrite or Roblox-specific branches in the cart is not success.

Assume Roblox Studio, a test account/experience with publishing permissions,
asset-upload access, and desktop/mobile testing become available in the near
future. They are not available to this project session yet. Begin offline work
first; do not treat future access as already granted or count waiting time as
engineering effort. Recheck current platform requirements when access arrives.

Unchanged source is the product goal, not a promise that arbitrary browser or
Three.js programs can run on Roblox. Establish and expand an explicit tested
compatibility boundary. Reject unsupported behavior with source locations rather
than silently dropping it. Broader compatibility remains queued when the first
release supports only a measured subset of carts.

## Evidence and existing seams

- [roblox-ts](https://roblox-ts.com/docs/) compiles TypeScript to Luau and supports
  compiler transformer plugins. It is the planned backend toolchain, not a
  general-purpose JavaScript engine or automatic browser compatibility layer.
- Its [setup flow](https://roblox-ts.com/docs/quick-start/) uses the compiler,
  Rojo, and Roblox Studio. Follow this repository's pnpm convention when tooling
  is added; do not install dependencies as part of this planning change.
- Roblox scripts use [Luau](https://create.roblox.com/docs/scripting).
  [loadstring restrictions](https://create.roblox.com/docs/scripting/capabilities)
  make it unsuitable as a client JavaScript execution strategy.
- [EditableMesh](https://create.roblox.com/docs/reference/engine/classes/EditableMesh)
  and [EditableImage](https://create.roblox.com/docs/reference/engine/classes/EditableImage)
  provide procedural geometry and image operations. Mesh APIs require experience
  configuration, asset permissions, and attention to client memory budgets.
- [PBR texture support](https://create.roblox.com/docs/art/modeling/surface-appearance)
  provides material building blocks, not identical Three.js rendering semantics.
- [Open Cloud](https://create.roblox.com/docs/cloud) can support later publishing
  and asset workflows; it does not execute our JavaScript carts.
- Local design references: `docs/ADAPTER_CONTRACT.md`,
  `runtime/engine-adapter.js`, `docs/GODOT_HOST_CONTRACT.md`, and
  `nova64-godot/godot_project/shim/nova64-compat.js`. Reuse contract concepts,
  lifecycle, handles, and conformance expectations, not the QuickJS embedding.

MemPalace is unavailable on this Mac (`~/ai-tools` is absent). This plan uses
live repository files and public documentation. Preserve Windows/WSL memory
configuration; consult memory when it becomes available.

## Preferred architecture: compile before publishing

```text
Unmodified cart + dependencies + assets
                 |
      AST analysis and compatibility report
                 |
      JavaScript semantic lowering to generated TypeScript
                 |
      roblox-ts + Nova64 compatibility runtime
                 |
      Luau modules + asset manifest + Rojo project
                 |
      Roblox Studio / published test experience
```

Use an AST-based frontend. Merely renaming `.js` to `.ts`, disabling type checks,
or applying regex replacements cannot preserve JavaScript semantics. Determine
whether existing compiler infrastructure can do the necessary lowering before
building a custom compiler. Keep generated files outside source cart folders.

Author the Roblox runtime in TypeScript compiled by roblox-ts, with a minimal
Luau boundary only where necessary. Map Nova64 operations to Roblox Instances,
camera, input, GUI, sound, and storage. Keep frame-by-frame game logic on the
client; do not stream rendering commands across a network each frame.

Bundle known cart code at export time. Package asset references into an explicit
manifest mapping source paths to Roblox assets or generated resources. Preserve
asynchronous loading behavior where observable. A `.nova` container is not itself
executable in Roblox; define extraction and bundling after checking its format.

The initial experience is single-player gameplay per client. Server-owned saves,
purchases, or shared state require narrow validated requests. General multiplayer
conversion is outside the initial scope and must not be inferred from Roblox's
hosting model. Do not trust client-supplied rewards or persistent state blindly.

## Compatibility research that determines feasibility

Build an inventory across existing carts and their reachable dependencies, then
test language features independently of rendering:

| Concern | Required investigation |
| --- | --- |
| JavaScript values | Truthiness (especially 0 and empty strings), null/undefined, coercion, equality, NaN, bitwise behavior, numeric precision |
| Containers | Zero-based arrays, holes, length, mutation, sort comparators, object keys, iteration order, identity, Map/Set |
| Functions and objects | Closures, `this`, callbacks, classes/prototypes, getters, destructuring, spread, default arguments |
| Scheduling | Promises, async/await, timers, exceptions, lifecycle order and reset |
| Binary and modules | Typed arrays, ArrayBuffer/DataView, imports, dependency bundling, asset decoding |
| Host dependencies | DOM/canvas, WebAudio, fetch, storage, direct THREE/BABYLON calls, dynamic code and imports |

For each feature record: encountered carts, implementation strategy, differential
test, unsupported cases, and cost. A compiler that changes gameplay is a failed
export even when the output builds. Capability reporting must reflect actual
support; never hide gaps behind no-op stubs.

Evaluate three routes during research:

1. **Preferred:** static compilation with explicit JavaScript semantic helpers,
   using roblox-ts for the Roblox runtime and generated compatible TypeScript.
2. **Contingency:** an interpreter or bytecode VM implemented in Luau for features
   compilation cannot reasonably preserve. Benchmark language coverage, memory,
   licensing, debugging, and CPU cost before choosing it. This is a separate
   research branch, not a commitment to build a JavaScript engine from scratch.
3. **Reject as product outcome:** manually translating each cart. A hand-authored
   renderer fixture may test Roblox APIs, but does not prove unchanged-cart support.

If roblox-ts cannot accept the necessary generated forms, document the evidence
and compare alternatives rather than forcing an expensive or incorrect pipeline.

## Rendering and platform mapping

Start with primitives, transforms, camera, input, simple materials, text/HUD,
audio playback, lifecycle, and cleanup. Add imported meshes, procedural meshes,
textures, particles, collision, and save behavior based on cart inventory.

Explicitly validate coordinate conventions, rotations, light positioning,
material brightness, transparency, texture orientation/filtering, and collision
semantics. Existing Godot parity fixes show why these cannot be assumed.
Use Roblox approximations for effects only when visual differences are declared
and gameplay remains correct. Exact custom shaders, postprocessing, raw WebGL,
DOM, and Three.js object access require separate investigation; no blanket parity
claim. Voxel worlds and WAD-heavy carts belong in later stress testing.

Assets need ownership/permission checks, upload and moderation status tracking,
cacheable manifests, and actionable errors. Test a published experience as well
as Studio: local Studio behavior alone is insufficient evidence.

## Phases and acceptance gates

### 0. Offline inventory and compiler spike — 1–2 person-weeks

- Catalogue real carts and dependency/API usage without modifying their code.
- Select three unchanged source fixtures: a small primitive/HUD cart, a gameplay
  cart with input/collision, and an asset/asynchronous-loading cart. Prefer original
  Nova64 content suitable for a public test experience.
- Compile a language fixture corpus and one source cart through generated
  TypeScript and roblox-ts. Record tool versions and generated artifacts.
- Produce an initial compatibility matrix and compare compilation with the VM
  contingency. Identify cases that cannot be decided without Studio.

Gate: source hashes remain unchanged; generated Luau builds; unsupported features
produce locations and reasons. This proves buildability only, not runtime parity.

### 1. Roblox runtime proof — additional 2–4 person-weeks

Requires the expected Studio/account/test-experience access. Implement the narrow
runtime, connect the exported cart, and validate in Studio and a published place.

Gate: an unchanged cart executes init/update/draw correctly; movement, camera,
HUD, collisions, audio, and reset match a web reference. Record desktop/mobile
frame times, memory, device details, and measured scene sizes. Establish numeric
performance budgets from those measurements before proceeding.

### 2. Unchanged-cart vertical slice — additional 3–5 person-weeks

Expand semantic helpers, assets, and runtime support for all three selected carts.
Add repeatable export, reproducible manifests, runtime error mapping back to cart
source where practical, and explicit compatibility diagnostics.

Gate: all three sources remain unchanged, pass gameplay checkpoints and language
semantics tests, and work after joining/rejoining/resetting on target devices.
No per-cart handwritten Luau or hidden no-op fallback is accepted as a pass.

### 3. Supported-corpus release — additional 4–8 person-weeks

Expand to at least ten representative existing carts, covering different gameplay
and rendering patterns. Add CLI integration and docs only after the pipeline is
proven; proposed command shape is `nova64 export roblox <cart>` (not implemented).

Gate: publish an exact supported-corpus list, compatibility matrix, asset workflow,
known visual differences, regression results, and performance measurements.
Every supported cart passes its defined gameplay checks from unchanged source.
Unsupported carts fail clearly. Web/Godot behavior remains covered by existing
tests when shared code changes.

### 4. Broader compatibility — separately estimated after phase 2

Prioritize remaining JavaScript semantics, canvas-heavy carts, renderer-specific
object use, advanced effects, procedural assets, and complex scenes from evidence.
Reassess any interpreter route and its performance. General browser equivalence
and automatic multiplayer are not implied by a supported-corpus release.

## Estimates and decision points

These estimates supersede the earlier restricted-exporter estimate because the
user requires unchanged JavaScript source. They assume one experienced developer
with AI assistance, full-time effort, and prompt Studio/device feedback once
access arrives. They are engineering effort, not a calendar promise; exclude
account setup delays, moderation queues, and unrelated release work.

| Outcome | Cumulative effort | Confidence |
| --- | --- | --- |
| Compiler feasibility report | 1–2 person-weeks | Medium |
| First unchanged playable cart | 3–6 person-weeks | Low until semantic spike |
| Three-cart usable vertical slice | 6–11 person-weeks | Low to medium after phase 1 |
| Supported-corpus initial release | 10–19 person-weeks (roughly 3–5 months) | Low until phase 2 |
| Broad unchanged-cart coverage | 6–12+ person-months total | Low; may require scope tradeoffs |
| Arbitrary JavaScript/browser/Three.js compatibility | No defensible fixed estimate | Unproven |

If a substantial JavaScript VM becomes necessary, re-estimate before proceeding;
do not treat the broad range above as a ceiling. AI can accelerate implementation
but does not replace platform tests or resolve semantic differences automatically.

After phase 0, continue only if compilation has a credible semantic strategy and
bounded gaps. After phase 1, continue only if published-device performance is
viable. After phase 2, choose a release corpus and revise estimates using measured
cost per language/API feature. If unchanged source cannot be achieved for that
corpus, report the blocker rather than silently redefining the goal.

## Verification and handoff

- Hash source carts before and after export; retain hashes with test results.
- Compare deterministic input/seed/time fixtures in JavaScript and generated
  Luau for numeric results, event traces, object lifetimes, and gameplay outcomes.
- Test visual output separately with documented tolerances; matching screenshots
  alone cannot prove gameplay parity.
- Test reset/disposal, asynchronous completion, missing/denied assets, saves,
  repeated joins, and mobile controls in published experiences.
- Use pnpm and the narrowest relevant checks. Add compiler/runtime regression
  checks when implemented; do not add implementation-mirroring tests now.
- Keep queued work in root `BACKLOG.md`; this file is the design and milestone
  plan. No Roblox dependencies, scripts, publishing, or cart changes are authorized
  merely by saving this plan. Implementation begins as a subsequent task.

Next action: phase 0 inventory and an isolated roblox-ts compilation spike,
followed by a written go/no-go result. Recheck live documentation and available
access at that point. No Roblox credentials are needed in this document.
