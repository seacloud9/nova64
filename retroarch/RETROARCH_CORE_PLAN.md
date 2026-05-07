# Nova64 RetroArch Core Plan

Roadmap for turning the current Nova64 libretro stub into a real RetroArch core that can run Nova64 carts through QuickJS, load `.nova` distributable packages, and expose a compact Nova64-compatible backend.

## Summary

The current RetroArch core is a useful shell, but it is not yet a cart runtime. `retroarch/nova64_libretro.c` loads cart bytes, advertises `js|nova` extensions, maps a basic controller shape, allocates a framebuffer, and renders a generated test pattern. It does not parse cart packages, execute JavaScript, expose Nova64 APIs, render cart-driven output, handle audio, or provide versioned save state data.

The target is a small, portable libretro core with these parts:

- A libretro shell for video, audio, input, lifecycle, logging, and serialization.
- A QuickJS VM that loads Nova64 carts as ES modules.
- A cart package loader for `.nova`, plus plain `.js` support for development.
- A Nova64 API bridge implemented natively in C or C++, not by embedding browser Three.js or Babylon.js.
- Renderer, audio, input, storage, and save-state subsystems that grow in staged compatibility passes.

The RetroArch backend should be API-compatible before it is visually identical to browser backends. The first goal is to run small conformance carts deterministically. Visual parity with Three.js and Babylon.js comes later, one feature family at a time.

## Assumptions

- The referenced ChatGPT share link was not readable from this environment; it exposed only the login shell. This plan is based on the live repository, `GODOT.md`, `nova64-godot`, and the existing RetroArch stub.
- First implementation target is WSL/Linux desktop.
- CLI work uses Node 20 through WSL, matching the repository development rules.
- Native core work uses Make/libretro on Linux first, then expands to other platforms.
- `.nova` is a package format for distribution, not a new cart programming model.
- Plain `.js` carts stay supported for development and small smoke tests.

## Current State

`retroarch/nova64_libretro.c` already provides:

- Basic libretro entry points.
- Core metadata through `retro_get_system_info`.
- `valid_extensions = "js|nova"`.
- A fixed 640x360, 60 FPS video mode.
- RGB565 presentation through `retro_video_refresh_t`.
- A temporary RGBA64 working framebuffer converted into RGB565.
- Joypad mapping placeholders for Nova64 buttons.
- Cart byte loading through `retro_load_game`.
- Stub serialization over the placeholder JS context and framebuffer.
- A generated gradient/test-pattern frame in `execute_js_frame`.

Important gaps:

- No QuickJS runtime or context.
- No JavaScript module loader.
- No lifecycle calls to `init`, `update(dt)`, or `draw`.
- No `.nova` package parsing.
- No asset loading.
- No Nova64 cart-facing APIs such as `cls`, `pset`, `line`, `rect`, `print`, `btn`, or `btnp`.
- No native 3D command bridge.
- No audio implementation.
- No persistent storage implementation.
- No meaningful save-state versioning.
- No automated tests that prove a cart was executed.

## Design Principles

- Keep the core small and native. Do not claim that Three.js or Babylon.js run inside RetroArch.
- Preserve the Nova64 cart programming model: carts keep using `init`, `update(dt)`, and `draw`.
- Make `.nova` packaging a distribution concern, not a source-code rewrite.
- Favor deterministic conformance carts over large demo ports during early development.
- Reuse the Godot bridge strategy where it fits: QuickJS, ES modules, whitelisted commands, handle tables, and small adapter tests.
- Prefer explicit host APIs over reflection-style passthroughs.
- Keep save states versioned from the first real implementation.

## Target Architecture

```text
RetroArch frontend
        |
        v
libretro shell
        |
        +-- lifecycle: init, reset, run, load_game, unload_game
        +-- video: framebuffer or hardware renderer path
        +-- audio: sample batch output
        +-- input: joypad polling
        +-- serialization: versioned core state
        |
        v
Nova64 core host
        |
        +-- cart package loader
        +-- QuickJS runtime and module loader
        +-- Nova64 API bridge
        +-- renderer subsystem
        +-- audio subsystem
        +-- storage subsystem
        +-- diagnostics and logging
```

### Libretro Shell

Responsibilities:

- Own RetroArch callbacks and frontend communication.
- Advertise supported extensions: `js|nova`.
- Load content either from memory or full path, depending on package-loader needs.
- Poll RetroArch input once per frame.
- Present video frames at 640x360 initially.
- Emit audio samples when the audio subsystem lands.
- Provide deterministic reset and unload behavior.
- Serialize only explicitly versioned state.

Early implementation can keep software RGB565 presentation. Hardware rendering can be added later if 3D work needs it.

### QuickJS VM

Responsibilities:

- Initialize one runtime and one context per loaded cart.
- Register host APIs before evaluating cart code.
- Load carts as ES modules.
- Cache exported lifecycle functions:
  - `init()`
  - `update(dt)`
  - `draw()`
- Surface JavaScript exceptions through RetroArch logs with useful file/module context.
- Track allocated JS values and release them on unload/reset.

The Godot bridge already proves the shape of this approach in `nova64-godot/gdextension`: QuickJS runtime, ES module cart loading, cached lifecycle hooks, and a host bridge.

### Cart Package Loader

Responsibilities:

- Accept plain `.js` files as source carts.
- Accept `.nova` packages as distributable carts.
- Parse metadata without executing cart code.
- Expose package assets to the host bridge through predictable logical paths.
- Reject malformed packages with clear errors.

The loader should be independent from QuickJS so CLI tests can validate `.nova` files without running the core.

### Nova64 API Bridge

Responsibilities:

- Expose the cart-facing Nova64 API surface inside QuickJS.
- Route API calls to native subsystems.
- Keep host methods whitelisted and typed.
- Return plain JS values or opaque handles, not raw native pointers.
- Fail with structured errors where possible.

Initial 2D APIs should be implemented directly. Future 3D APIs should use a command bridge similar to the Godot plan:

```text
cart JS -> Nova64 API -> host command -> native renderer object table
```

### Renderer Subsystem

Start with a software framebuffer:

- `cls`
- `pset`
- `line`
- `rect`
- filled rectangles
- palette/color conversion
- text/print smoke support

Then add a compact 3D layer:

- Handle tables for geometry, material, mesh, camera, light, texture, particles, and scene objects.
- Software or hardware-backed primitives selected by platform capability.
- Deterministic fallback rendering for conformance tests.

### Input Subsystem

Responsibilities:

- Map RetroArch joypad state into Nova64 `btn` and `btnp`.
- Track previous-frame state for edge detection.
- Provide stable button names and numeric indexes.
- Keep player-one support first, then add multiplayer if the cart API requires it.

Initial mapping can keep the existing enum:

```text
left, right, up, down, z, x, c, v
```

### Audio Subsystem

Responsibilities:

- Provide a minimal sound API once core execution is stable.
- Mix into RetroArch sample batches.
- Keep sample rate aligned with `retro_get_system_av_info`.
- Include deterministic tests for envelope/tone generation where practical.

Audio is not required for the first executable-cart milestone.

### Storage And Save States

Responsibilities:

- Separate persistent cart storage from RetroArch save states.
- Version serialized state with a magic header and schema version.
- Include VM state only if it can be restored safely and deterministically.
- Otherwise serialize host-owned deterministic state and require carts to rebuild transient JS objects on reset/load.

Do not expand the existing stub serialization without adding a versioned format.

## `.nova` Package Format

`.nova` should be a zip-like distributable package with a small required surface:

```text
game.nova
|-- code.js
|-- meta.json
|-- assets/
|   |-- sprites/
|   |-- audio/
|   `-- data/
`-- manifest.json
```

Required:

- `code.js`: ES module cart entry.

Optional:

- `meta.json`: cart title, author, version, description, dimensions, icon, and runtime hints.
- `manifest.json`: generated package manifest with file list, sizes, hashes, and package format version.
- `assets/`: relative asset paths available to the cart.

Recommended `manifest.json` fields:

```json
{
  "format": "nova64-package",
  "version": 1,
  "entry": "code.js",
  "meta": "meta.json",
  "files": [
    {
      "path": "code.js",
      "size": 1234,
      "sha256": "..."
    }
  ]
}
```

Rules:

- Paths are UTF-8 and normalized with forward slashes.
- Absolute paths and `..` segments are invalid.
- `code.js` must exist and must be a file.
- Duplicate normalized paths are invalid.
- Package parser must enforce size limits before allocation.
- Metadata inspection must not execute JavaScript.

## CLI Responsibilities

Add packaging commands to `bin/nova64.js` and `bin/commands/` without changing the cart programming model.

Proposed commands:

```bash
nova64 pack <project> --out game.nova
nova64 inspect game.nova
```

`nova64 pack` should:

- Locate `code.js` in the project root by default.
- Include `meta.json` when present.
- Include `assets/` when present.
- Generate `manifest.json`.
- Normalize paths and reject unsafe package entries.
- Produce deterministic output when inputs are unchanged.

`nova64 inspect` should:

- Print package format version.
- Print entry file.
- Print metadata summary when present.
- List packaged files with sizes and hashes.
- Return a non-zero exit code for malformed packages.

CLI tests should cover:

- Pack a minimal cart into `.nova`.
- Pack a cart with `meta.json` and assets.
- Inspect `.nova` metadata.
- Reject missing `code.js`.
- Reject malformed or unsafe package paths.

## Phased Milestones

### R0: Planning And Build Hygiene

Acceptance criteria:

- `retroarch/RETROARCH_CORE_PLAN.md` exists.
- Existing RetroArch stub still builds.
- Current limitations are documented.
- No claim is made that browser renderers run inside RetroArch.

### R1: `.nova` CLI Packaging

Acceptance criteria:

- `nova64 pack <project> --out game.nova` creates a valid package.
- `nova64 inspect game.nova` prints metadata and file list.
- Malformed packages fail with useful errors.
- Packaging tests run through pnpm on WSL with Node 20.
- `.js` carts remain supported.

### R2: Core Package Loader

Acceptance criteria:

- The libretro core loads plain `.js` content.
- The libretro core loads `.nova` content and extracts `code.js`.
- Invalid packages fail during `retro_load_game`.
- Loading errors are visible through RetroArch logs.
- Package parsing has bounds checks and path validation.

### R3: QuickJS Lifecycle Runtime

Acceptance criteria:

- QuickJS is vendored or referenced consistently with repository policy.
- The core evaluates a cart ES module.
- `init` is called once after successful load.
- `update(dt)` and `draw()` are called in order during `retro_run`.
- JavaScript exceptions are logged without crashing the frontend.
- `retro_unload_game` and `retro_deinit` release JS resources.

### R4: 2D Framebuffer API

Acceptance criteria:

- A smoke cart can call `cls`, `pset`, `line`, `rect`, and `print`.
- Output is deterministic for a fixed cart and input sequence.
- Core tests can compare framebuffer checksums.
- `btn` and `btnp` reflect RetroArch joypad state.
- Reset clears input edge state and cart-owned framebuffer state.

### R5: Save-State Foundation

Acceptance criteria:

- Save-state data starts with a magic value and version.
- Serialization size is stable for a given runtime version.
- Unsupported future versions fail cleanly.
- A load-save-load smoke test confirms deterministic framebuffer output.

### R6: Minimal 3D Command Bridge

Acceptance criteria:

- Native handle tables exist for renderer objects.
- Unsupported methods return structured errors.
- Minimal geometry, material, mesh, transform, camera, and light commands work.
- A synthetic cube cart renders or produces deterministic render commands.
- The API shape mirrors the Godot bridge where practical.

### R7: Particles, Audio, Storage, And Performance

Acceptance criteria:

- Particle APIs have a compact native implementation or deterministic fallback.
- Audio emits RetroArch sample batches.
- Persistent storage has a documented location and key namespace.
- Performance is profiled on WSL/Linux desktop before expanding platforms.
- Large demos are ported only after conformance carts pass.

### R8: Platform Expansion

Acceptance criteria:

- Linux/WSL build is stable.
- macOS build is verified.
- Windows build is verified.
- Raspberry Pi build is evaluated for software-rendering performance.
- Steam Deck build is verified through RetroArch.

## Testing Matrix

### CLI

| Test               | Expected Result                                          |
| ------------------ | -------------------------------------------------------- |
| Pack minimal cart  | `.nova` contains `code.js` and generated `manifest.json` |
| Pack metadata cart | `meta.json` is included and inspectable                  |
| Pack assets        | Asset paths are normalized and hashed                    |
| Missing `code.js`  | Command fails with useful error                          |
| Malformed package  | Inspect fails without executing code                     |
| Unsafe path        | Package is rejected                                      |

### Core Unit And Smoke Tests

| Test              | Expected Result                              |
| ----------------- | -------------------------------------------- |
| Load plain `.js`  | `retro_load_game` succeeds                   |
| Load `.nova`      | Package loader extracts entry JS             |
| Lifecycle order   | `init`, `update`, `draw` are called in order |
| JS exception      | Error is logged and core remains stable      |
| Input mapping     | RetroArch buttons map to `btn` and `btnp`    |
| Framebuffer smoke | Known cart produces known checksum           |
| Reset             | Cart and input state reset deterministically |
| Serialization     | Save-state header and size are stable        |

### Integration

| Platform          | Check                                    |
| ----------------- | ---------------------------------------- |
| WSL/Linux desktop | Build `retroarch/nova64_libretro`        |
| WSL/Linux desktop | Launch sample `.js` cart in RetroArch    |
| WSL/Linux desktop | Launch sample `.nova` cart in RetroArch  |
| macOS             | Build and run smoke cart                 |
| Windows           | Build and run smoke cart                 |
| Raspberry Pi      | Measure software framebuffer performance |
| Steam Deck        | Launch packaged cart through RetroArch   |

## Conformance Carts

Use small carts before real demos:

- `00-boot.js`: exports lifecycle functions and logs call order.
- `01-framebuffer.js`: draws known pixels and rectangles.
- `02-input.js`: records button state transitions.
- `03-errors.js`: throws controlled exceptions in lifecycle hooks.
- `04-package-assets.js`: loads a packaged asset by logical path.
- `05-save-state.js`: produces deterministic state before and after serialization.
- `06-cube.js`: exercises minimal 3D command bridge.

These should be intentionally smaller than browser demos. Their job is to prove host contracts.

## Reuse From Godot Bridge

The Godot bridge work is the best reference implementation for native hosting:

- QuickJS or QuickJS-NG as embedded runtime.
- ES module cart loading.
- Cached lifecycle exports.
- A whitelisted host command bridge.
- Opaque handles for native renderer objects.
- Small synthetic carts before real demo ports.
- Shared conformance thinking with browser adapters.

RetroArch should borrow the approach, not the Godot renderer. Godot owns nodes and resources; RetroArch needs native renderer/storage/audio subsystems appropriate for libretro.

## Explicit Non-Goals

- Do not embed a browser engine.
- Do not claim Three.js or Babylon.js run inside RetroArch.
- Do not make `.nova` a new source language.
- Do not port large demos before lifecycle, input, framebuffer, and package tests pass.
- Do not add unversioned save-state blobs.
- Do not expose raw native pointers to JavaScript.

## First Implementation Checklist

1. Add CLI package module and tests for `.nova`.
2. Add a small shared package parser that can be reused by tests and native planning docs.
3. Vendor or configure QuickJS for the RetroArch core.
4. Replace cart byte storage with a loaded-cart structure.
5. Register minimal Nova64 2D/input APIs in QuickJS.
6. Call `init`, `update(dt)`, and `draw` from `retro_run`.
7. Add framebuffer checksum smoke tests.
8. Add versioned serialization header.
9. Build and run the core on WSL/Linux.
10. Only then begin minimal 3D bridge work.
