# GODOT.md

Plan for the Nova64 → Godot JavaScript bridge.

This document is the working plan and tooling reference for building, testing, and validating the Godot host bridge **before** porting any real Nova64 carts to it. It complements `ROADMAP.md` Phase 3 with concrete tooling, milestones, and verification steps.

## Strategy

Two distinct phases, executed in order:

1. **Bridge-first** — build the Godot side of the bridge against synthetic, minimal test carts that exercise one adapter method at a time. The goal is a stable, conformance-tested host before any real cart code touches it.
2. **Port-second** — once the bridge passes the shared adapter conformance suite, port real Nova64 carts from `examples/` onto Godot one at a time, in increasing complexity order.

This is the same discipline already applied to the Babylon backend: prove the contract under controlled conditions, then expand.

## Why Godot First (Recap)

- `JavaScriptBridge` is web-only and not relevant for native targets — both Godot and Unity need an embedded JS runtime.
- Godot's **GDExtension** uses a plain C ABI, which maps cleanly onto **QuickJS** (also C). The impedance mismatch is small.
- One Godot project exports to Windows, macOS, Linux, iOS, and Android without per-platform plugin matrices.
- Open-source license means we can patch the engine or extension if the bridge needs deeper hooks.
- Validating the host contract on Godot first gives Unity a concrete reference implementation to mirror.

## Tooling

### JavaScript Runtime

- **QuickJS** (or QuickJS-NG) as the embedded JS engine.
  - Small footprint, ES2020+ support, fast startup, friendly C API.
  - Builds for all five target platforms.
  - Interpreter-only, which sidesteps iOS App Store JIT restrictions.
- Optional alternative: **V8** if performance profiling later shows QuickJS is the bottleneck. Default to QuickJS until proven otherwise.

### Godot

- **Godot 4.x** stable.
- **GDExtension** for the native bridge (preferred over deprecated GDNative).
- **godot-cpp** bindings checked out at the matching Godot version.
- C++17 or newer for the extension.

### Build System

- **SCons** (Godot's standard) for the GDExtension.
- Cross-compile toolchains:
  - Windows: MSVC or MinGW
  - macOS: Xcode + clang
  - Linux: gcc/clang
  - iOS: Xcode
  - Android: Android NDK
- A single orchestration script (`scripts/build-all.sh`) that produces all five platform binaries from one source tree.

### Glue and CI

- **GDScript** (`nova64_host.gd`) for lifecycle wiring and Godot-side callbacks that don't belong in the C++ extension.
- **GitHub Actions** matrix covering Windows, macOS, Linux desktop, iOS simulator, and an Android emulator.

### Tooling Summary

| Concern             | Tool                                                  |
| ------------------- | ----------------------------------------------------- |
| Engine              | Godot 4.x stable                                      |
| Native plugin model | GDExtension (godot-cpp)                               |
| JS runtime          | QuickJS (vendored)                                    |
| Build system        | SCons                                                 |
| Language            | C++17                                                 |
| Glue script         | GDScript (`nova64_host.gd`)                           |
| Test harness        | Shared adapter conformance suite + Godot CLI exports  |
| CI                  | GitHub Actions matrix (Win/Mac/Linux/iOS sim/Android) |

## Repository Layout

A top-level directory inside this repository (move to a sibling repo later if native build artifacts or CI complexity justify it):

```text
nova64-godot/
|-- godot_project/            # Godot 4.x project that consumes the extension
|   |-- project.godot
|   |-- scenes/
|   |   |-- Main.tscn
|   |   `-- DemoCart.tscn
|   |-- scripts/
|   |   `-- nova64_host.gd    # GDScript glue for callbacks/lifecycle
|   `-- carts/                # synthetic + ported JS carts as project assets
|-- gdextension/
|   |-- src/
|   |   |-- bridge.cpp        # GDExtension entry, registers Nova64Host class
|   |   |-- quickjs_runtime.cpp
|   |   |-- command_buffer.cpp
|   |   |-- handle_table.cpp
|   |   `-- adapter/
|   |       |-- material.cpp
|   |       |-- texture.cpp
|   |       |-- geometry.cpp
|   |       |-- mesh.cpp
|   |       |-- camera.cpp
|   |       |-- transform.cpp
|   |       |-- input.cpp
|   |       `-- audio.cpp
|   |-- third_party/
|   |   |-- quickjs/          # vendored QuickJS source
|   |   `-- godot-cpp/        # submodule
|   |-- SConstruct
|   `-- nova64.gdextension    # Godot manifest
|-- tests/
|   |-- conformance/          # shared adapter conformance harness adapted for Godot
|   `-- carts/                # synthetic test carts
|-- scripts/
|   |-- build-all.sh
|   `-- run-conformance.sh
`-- README.md
```

## Bridge Architecture

The bridge mirrors `runtime/engine-adapter.js` and `docs/UNITY_BRIDGE_ARCHITECTURE.md`. Cart code does not change.

### Boundary Contract

- **Cart side (JS in QuickJS):** calls `engine.<namespace>.<method>(payload)` exactly as in browser builds. The Nova64 runtime JS bundle ships unchanged.
- **Bridge transport:** JS calls are marshaled into JSON command payloads and pushed into a per-frame command buffer.
- **Host side (Godot C++):** flushes the command buffer once per `_process` tick, dispatches to whitelisted handlers, returns plain data or opaque handles.

### Handle Model

- All Godot resources (`Mesh`, `Material`, `Texture2D`, `Camera3D`, `AudioStreamPlayer`, `Node3D`) are tracked in a `HandleTable` keyed by integer ID.
- JS receives only `{ __nova64Handle: true, backend: 'godot', kind, id }` objects — never live Godot pointers.
- Lifecycle: `create.*` allocates, `destroy.*` frees, dangling handles return a structured error to JS instead of crashing.

### Command Whitelist (MVP)

Each command has a typed payload schema validated host-side. New methods require an explicit C++ handler registration; there is no reflection-based passthrough.

| Method                    | Payload                                            | Returns                         |
| ------------------------- | -------------------------------------------------- | ------------------------------- |
| `engine.init`             | `{}`                                               | `{ capabilities }`              |
| `material.create`         | `{ color, side, transparent, opacity }`            | handle                          |
| `material.destroy`        | `{ handle }`                                       | `{ ok }`                        |
| `texture.createData`      | `{ width, height, pixels, filter, wrap }`          | handle                          |
| `texture.createCanvas`    | `{ width, height, dataUrl, filter, wrap }`         | handle                          |
| `texture.invalidate`      | `{ handle }`                                       | `{ ok }`                        |
| `geometry.createPlane`    | `{ width, height, segmentsX, segmentsY }`          | handle                          |
| `geometry.createBox`      | `{ width, height, depth }`                         | handle                          |
| `geometry.createSphere`   | `{ radius, segments }`                             | handle                          |
| `mesh.create`             | `{ geometry, material }`                           | handle                          |
| `mesh.setMaterial`        | `{ mesh, material }`                               | `{ ok }`                        |
| `mesh.destroy`            | `{ handle }`                                       | `{ ok }`                        |
| `transform.set`           | `{ handle, position, rotation, scale }`            | `{ ok }`                        |
| `transform.get`           | `{ handle }`                                       | `{ position, rotation, scale }` |
| `camera.create`           | `{ fov, near, far }`                               | handle                          |
| `camera.setActive`        | `{ handle }`                                       | `{ ok }`                        |
| `camera.getPosition`      | `{ handle }`                                       | `{ x, y, z }`                   |
| `camera.lookAt`           | `{ handle, target }`                               | `{ ok }`                        |
| `light.createDirectional` | `{ color, intensity, direction }`                  | handle                          |
| `light.createPoint`       | `{ color, intensity, position, range }`            | handle                          |
| `input.poll`              | `{}`                                               | `{ keys, mouse, gamepad }`      |
| `audio.loadStream`        | `{ url }`                                          | handle                          |
| `audio.play`              | `{ handle, volume, loop }`                         | `{ ok }`                        |
| `host.getCapabilities`    | `{}`                                               | capabilities object             |

Anything not on the whitelist returns `{ error: 'unsupported_method' }`.

### Frame Lifecycle

Per Godot `_process(dt)` tick:

1. Poll input (keyboard, mouse, gamepad, touch) and snapshot it.
2. Call cart `update(dt)` inside QuickJS.
3. Drain the JS-emitted command buffer and dispatch each command host-side.
4. Call cart `draw()` inside QuickJS (overlay/HUD; emits 2D drawing commands).
5. Flush 2D draw commands to a Godot `CanvasLayer`.
6. Godot performs native render pass.

### Capability Reporting

`host.getCapabilities` returns the same shape as `buildCapabilities()` in `runtime/engine-adapter.js`:

```json
{
  "backend": "godot",
  "contractVersion": "1.0.0",
  "adapterVersion": "0.1.0",
  "features": ["mesh.basic", "transform", "camera", "directional-light", "input.keyboard", "audio.stream"]
}
```

Cart-level feature detection through `engine.capabilities.supports(...)` continues to work unchanged.

## Synthetic Test Carts (Bridge Validation Phase)

Each cart lives under `nova64-godot/tests/carts/` and exists only to exercise one slice of the bridge. Each has an associated headless Godot test that boots the project, runs the cart for N frames, and asserts on host-side state plus expected JS return values.

| Cart                  | What it proves                                              |
| --------------------- | ----------------------------------------------------------- |
| `00-boot.js`          | QuickJS boots, `engine.init` returns capabilities           |
| `01-clear.js`         | Frame lifecycle ticks, clear color renders                  |
| `02-cube.js`          | Geometry + material + mesh + transform happy path           |
| `03-camera.js`        | Camera creation, activation, and movement                   |
| `04-input.js`         | Keyboard/mouse/gamepad polling round-trips                  |
| `05-many-meshes.js`   | Handle allocator scales to N meshes without leaks           |
| `06-destroy.js`       | Resource cleanup actually releases Godot memory             |
| `07-audio.js`         | Audio stream load + playback                                |
| `08-overlay.js`       | 2D draw commands hit the canvas layer                       |
| `09-stress.js`        | 1000+ commands per frame remain stable on mobile            |
| `10-error.js`         | Unsupported methods and invalid handles return clean errors |

## Conformance Suite

The shared adapter conformance suite already exists for Three.js and Babylon. Phase 3 ports it to Godot:

- Same test cases, same expected behavior.
- Differences caught here are documented in a Godot capability matrix, not silently allowed to drift.
- The suite runs in CI on every push to the Godot extension repo.

## Milestones

### G0 — Spike ✅

- GDExtension boots, registers a `Nova64Host` Godot class.
- QuickJS linked and initialized.
- One round-trip: `engine.init` returns capabilities.
- Desktop-only (Linux or Windows host).

**Exit:** `tests/carts/00-boot.js` passes on one desktop platform. ✅

### G1 — Core Render Loop ✅

- Command buffer + handle table.
- Material, geometry, mesh, transform, camera commands implemented.
- Frame lifecycle wired to `_process`.
- Synthetic carts `01–06` pass.

**Exit:** a spinning cube cart renders natively under Godot on desktop. ✅

### G2 — Input + Audio + Perf ✅

- Input polling implemented (keyboard, mouse, gamepad).
- Audio stream load + play.
- Texture upload from raw RGBA bytes.
- MultiMesh-backed instancing + `engine.flush` batched dispatch.
- GPU particles via `particles.create`.
- Synthetic carts `02–05` pass.

**Exit:** an interactive synthetic cart with keyboard movement, instanced
geometry, and particles runs correctly. ✅

### G3 — Conformance + Stress ✅

- Adapter conformance suite ported and green: `08-capabilities.js`,
  `09-errors.js`, `10-stress.js` (27/27 assertions pass).
- Headless harness (`scripts/run-conformance.sh` →
  `godot_project/scripts/conformance_runner.gd`) reads `__nova64_assert`
  via `Nova64Host.read_global` and exits non-zero on failure.
- Capability matrix exercised by `08-capabilities.js`.

**Exit:** Godot host is a first-class adapter from a contract-conformance
standpoint. ✅

### G4 — Mobile Export

- [x] Android export configured: `nova64.gdextension` declares
      `android.{debug,release}.{arm64,x86_64}`, bridge `.so` artifacts build via
      `scons platform=android arch={arm64,x86_64}` against NDK r23c (godot-cpp-pinned),
      and `godot_project/export_presets.cfg.example` has both `Android ARM64` (devices)
      and `Android x86_64 (Emulator)` presets wired to `org.nova64.host`. Toolchain
      bootstrap is automated via `nova64-godot/scripts/install-android-toolchain.sh`,
      `install-android-sdk-packages.sh`, `install-android-emulator.sh` (creates the
      `nova64-test` AVD), and `install-godot-templates.sh` (downloads the Godot export
      templates without opening the editor). Headless APK export, emulator boot, and
      end-to-end measurement run from the shell via `scripts/export-android.sh`,
      `scripts/boot-android-emulator.sh`, and the `scripts/android-all.sh` orchestrator
      — Android Studio and the Godot editor UI are never required. Full setup
      walkthrough lives in `nova64-godot/docs/ANDROID_SETUP.md`.
- [ ] iOS export configured. Cross-compiling iOS frameworks from a non-macOS host is
      not feasible, so this slice is parked behind a documented Mac/Xcode bootstrap
      (script + checklist) and a CI matrix entry that builds the bridge on a macOS
      runner. Manifest entries (`ios.debug.arm64`, `ios.release.arm64`) are already in
      place.
- [x] Build matrix produces shippable binaries for desktop+android (linux + windows via
      existing scripts; android arm64 + x86_64 via `scripts/build-all.sh android`;
      ios and macos still require a macOS host).
- [ ] Bridge latency and frame cost measured on a representative mobile device.
      Harness ready (`scripts/measure-android.sh`, `[nova64-perf]` log lines, AVD
      provisioned); awaits a booted emulator or physical device run.

**Exit:** a synthetic cart runs on a physical iOS or Android device with measured frame budget.

### G5 — First Cart Port

- [x] Picked `examples/hello-namespaced` — a small 3D cart with no TSL/PBR, no
      voxel system, and no MediaPipe — and ported it verbatim into
      `nova64-godot/godot_project/carts/hello-namespaced/code.js`.
- [x] Authored a JS compatibility shim at
      `nova64-godot/godot_project/shim/nova64-compat.js` that maps the
      cart-facing `nova64.{scene,camera,light,draw,input,effects}` namespaces
      (and flat globals) onto the bridge's `engine.call(...)` adapter contract.
      The bridge loads the shim once via `_load_compat_shim()` from
      `bridge.cpp` (using `JS_EVAL_TYPE_GLOBAL`) before evaluating each cart
      module, so ported carts run unchanged.
- [x] Unsupported adapter methods are stubbed via a `warnOnce` gap list
      (`setCameraFOV`, `setFog`, `createPointLight`, 2D `draw.print`/`rect`/
      `line`/`pixel`, effect toggles). They no-op safely until the bridge
      gains real coverage.
- [x] Cart runs end-to-end through the headless harness:
      `init=true update=true draw=true`, ticks 10 frames clean, no exception
      trace, conformance suite still 27/27 PASS on desktop.

**Exit:** at least one real Nova64 cart runs end-to-end through Godot on desktop. ✅

### G6 — Cart Compatibility Pass

- [x] Second port: `examples/hello-world` (minimal spinning cube + HUD label)
      copied verbatim into `nova64-godot/tests/carts/hello-world/`. Both
      ports (`hello-namespaced`, `hello-world`) now live under the canonical
      `tests/carts/` tree and are mirrored into `godot_project/carts/` by
      `scripts/sync-carts.sh`.
- [x] Tracked gaps surfaced by the new port and added as `warnOnce` no-op
      shims: `printCentered`, `setAmbientLight`, `setLightColor`, `rectfill`,
      `screenWidth`, `screenHeight`. The `nova64.fx` namespace is now an
      alias of `nova64.effects` for parity with carts that use `nova64.fx`.
- [x] Both ports load cleanly through the headless harness
      (`init=true update=true draw=true`, 10 frames each), conformance suite
      remains 27/27 PASS.
- [ ] Continue porting carts of increasing complexity (next candidates:
      `hello-skybox`, `instancing-demo`, `tween-bounce`).
- [ ] Decide which `warnOnce` gaps are worth promoting to real bridge work
      (FOV, fog, point light, 2D overlay) vs. living as no-ops.
- [ ] Create `docs/GODOT_CART_COMPAT.md` once a representative set of carts
      has been ported (deferred until ≥5 ports cover materially different
      surface areas; avoid an empty matrix that ages badly).

**Exit:** documented compatibility report covering a representative set of carts.

## Verification

Each milestone exits only when:

1. The synthetic cart(s) for that milestone pass in CI on at least one desktop target.
2. The conformance suite (where applicable) is green.
3. The capability matrix is updated with any divergences.
4. Frame cost and bridge latency for that milestone are recorded in a benchmark log.

Planned commands (defined in `nova64-godot`):

- `pnpm test:godot:boot` — run G0 cart
- `pnpm test:godot:carts` — run all synthetic carts
- `pnpm test:godot:conformance` — run shared adapter conformance suite
- `pnpm bench:godot` — measure frame cost and command throughput

## Bridge → Cart Port Plan

Once Milestones G0–G4 are complete, real cart porting begins.

### Selection Order

Port carts in increasing complexity to surface gaps early:

1. **Tier 1 — minimal 3D**: a small example cart that uses only mesh creation, transforms, camera, and input. No PBR, no voxels, no advanced effects.
2. **Tier 2 — gameplay**: a cart with audio, particles, and basic physics.
3. **Tier 3 — advanced rendering**: carts using bloom, fog, dithering, N64/PSX modes.
4. **Tier 4 — voxel**: carts using `runtime/api-voxel.js`. Likely needs a Godot-native voxel mesher; defer until other tiers prove the bridge.
5. **Tier 5 — hardware-bound**: WebXR, MediaPipe carts. These are unlikely to port directly and will need a Godot-native equivalent or be marked unsupported.

### Per-Cart Porting Checklist

For each cart attempted:

- Copy the cart JS unchanged into the Godot project's `carts/` directory.
- Run it under the Godot host.
- Log every adapter call that returns `unsupported_method`.
- For each gap, decide:
  - **Implement on host** if the method is general-purpose
  - **Stub on host** if the method is rare and the cart has a fallback
  - **Mark cart as unsupported on Godot** if the gap is structural (e.g. WebXR)
- Record the result in `docs/GODOT_CART_COMPAT.md`.
- Add an end-to-end test that boots the cart in Godot and checks frame output.

### Cart Code Compatibility Goal

The strong target: **zero changes to cart source code.** Any divergence between the browser cart behavior and the Godot cart behavior is treated as a bridge or runtime bug, not a cart bug. If a cart absolutely must branch on backend, it does so via the standard `engine.capabilities.supports(...)` path, not via Godot-specific imports.

## Open Questions

These are tracked here so they don't get lost during the spike:

- Does QuickJS performance hold for stress carts on iOS in JIT-disabled environments? (App Store rules forbid JIT in third-party processes — QuickJS is interpreter-only, which is fine, but the perf budget needs measurement at G4.)
- Should 2D overlay drawing go through a `CanvasLayer` with `Control` nodes, or a single `MeshInstance2D` with a custom shader? Decide at G2.
- How does Godot's gamepad input map onto the Nova64 input snapshot shape? Decide at G2.
- Does the Godot AudioStream API cover all the sound-effect cases used by current Nova64 carts, or do we need a custom mixer? Decide at G2.

## Out of Scope (Phase 3)

Explicitly **not** part of the bridge MVP:

- TSL parity
- WebXR
- MediaPipe
- Hot-reload of cart code while running
- Multi-room or multiplayer (handled by the realtime track in `ROADMAP.md`)
- A visual cart editor inside Godot

## Cross-References

- `ROADMAP.md` — Phase 3 (Godot) and Phase 4 (Unity) high-level plan
- `docs/UNITY_BRIDGE_ARCHITECTURE.md` — boundary principles shared with this plan
- `docs/ADAPTER_CONTRACT.md` — adapter surface every backend must implement
- `runtime/engine-adapter.js` — current browser adapter, reference implementation
