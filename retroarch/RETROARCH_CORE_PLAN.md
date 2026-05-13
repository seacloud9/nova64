# Nova64 RetroArch Core Plan

Roadmap for turning the Nova64 libretro core into a native RetroArch runtime with
QuickJS execution, `.js` and `.nova` content support, OpenGL ES 3.1 first, and
Vulkan 1.2 next.

## Direction

Nova64 RetroArch is a native host. It does not run browser Three.js or Babylon.js
inside RetroArch. Carts call a Nova64-compatible API bridge backed by native
renderer, input, audio, storage, and asset subsystems.

The renderer strategy is:

- OpenGL ES 3.1 first, using RetroArch-owned hardware render contexts.
- Vulkan 1.2 second, with partial-to-mostly complete parity as the next major
  renderer milestone.
- A backend-neutral renderer interface so cart APIs and QuickJS hosting do not need
  to change when Vulkan lands.

## Milestone 1: QuickJS + GLES Shell

Status: implemented as the first real core slice.

Included:

- Complete enough local `libretro.h` hardware-render declarations for GLES setup.
- OpenGL ES 3.1 context request through `RETRO_ENVIRONMENT_SET_HW_RENDER`.
- GLES proc-address loading through the libretro callback.
- QuickJS built from `nova64-godot/gdextension/third_party/quickjs`.
- ES module loading for carts.
- Cached lifecycle exports: `init`, `update`, `draw`.
- Exception logging through RetroArch logs.
- 640x360 software 2D framebuffer.
- `rgba8`, `cls`, `pset`, `line`, `rect`, and minimal `print`.
- Player-one `btn` and `btnp` with edge tracking.
- Minimal 3D opaque handle bridge:
  - `createCube`
  - `createSphere`
  - `createPlane`
  - `destroyMesh`
  - `setPosition`
  - `setRotation`
  - `setScale`
  - `setCameraPosition`
  - `setCameraTarget`
  - `setCameraFOV`
  - `setAmbientLight`
  - `setLightDirection`
  - `clearScene`
- Versioned save-state header for host-owned deterministic state.
- Make and SCons build paths.
- A native callback-stub harness for loading conformance carts outside RetroArch.
- Harness PPM screen capture output for software-framebuffer renders.
- Harness checksum assertions and a one-command conformance runner.
- A deterministic solid-shaded software primitive preview for conformance renders.
- Raw `.nova` JS compatibility plus zip-style `.nova` manifest `"main"` and
  `code.js` extraction.

Known limits:

- QuickJS heap serialization is deliberately not attempted.
- GLES primitive drawing now covers the first cube, plane, and low-poly sphere
  path, but advanced materials and richer mesh types are still pending.
- Software 2D overlay compositing over GLES is implemented for the first HUD path.
- Software fallback previews 3D commands; Vulkan primitive rendering is still
  pending.
- `.nova` metadata parsing currently selects the executable source path; full
  asset parsing is still pending.

## Milestone 2: Content And Conformance

Goals:

- Expand `.nova` package parsing while preserving plain `.js` development carts.
- Define `.nova` as a package format, not a new programming model.
- Load package asset manifests without executing code.
  - Zip-style `.nova` manifests now stage `name`, `main`, safe `assets: []`
    paths, missing asset counts, and asset byte totals in renderer command logs.
    Full asset loading remains later.
- Add conformance carts:
  - `00-boot.js`: lifecycle/log order. Done.
  - `01-framebuffer.js`: deterministic 2D checksum. Done.
  - `02-input.js`: hold and edge transitions. Done.
  - `03-errors.js`: controlled exceptions. Done.
  - `06-cube.js`: minimal camera/light/mesh command scene. Done.
- Expand conformance coverage around package assets and additional API families.

## Milestone 3: OpenGL ES 3.1 Renderer

Status: first pass implemented; advanced materials and richer mesh families remain.

Goals:

- Render cube, sphere, and plane primitives through GLES 3.1.
  - Cube, plane, and low-poly sphere rendering are implemented through a lit
    shader/VBO/IBO path.
- Upload the 2D framebuffer as an overlay texture and composite it after 3D.
  - First overlay texture upload/composite path is implemented.
- Add a mixed 3D plus HUD conformance cart.
  - `09-overlay-scene.js` is implemented with a deterministic software capture.
- Keep all GL calls behind the renderer interface.
  - Hardware context request, context callbacks, and hardware-frame presentation
    now route through renderer boundary helpers instead of direct libretro calls.
- Support basic materials, ambient light, directional light, and camera transforms.
  - GLES primitive shaders now consume per-vertex normals plus ambient and
    directional light state for basic lit material color.
  - `10-lighting.js` is implemented as a deterministic material/light conformance
    scene with framebuffer and command-log checks.
- Add a deterministic command-log mode for headless conformance tests.
  - `NOVA64_RENDER_COMMAND_LOG` and harness `--command-log` are implemented for
    camera, light, overlay, and mesh-state checks.

## Milestone 4: Vulkan 1.2 Renderer

Goals:

- Add a Vulkan backend next to GLES, not instead of it.
  - The `nova64_renderer` core option and `NOVA64_RENDERER` env override now
    recognize `vulkan12` as a staged backend identity.
  - The current `vulkan12` selection records command-log state and falls back to
    the working GLES request until Vulkan command execution exists.
- Target Vulkan 1.2 with a pragmatic partial-to-mostly implementation first.
- Reuse the same opaque handles and renderer command structs.
- Add primitives, camera, lighting, and overlay composition before advanced effects.
- Keep the fallback software 2D path for tests and non-hardware environments.
- Preserve the software capture path as the reference render for fast harness
  regression tests.

## Milestone 5: Broader Nova64 Runtime

Goals:

- Audio mixing into RetroArch sample batches.
- Persistent cart storage distinct from save states.
- Asset loading for textures, sprites, data, models, and audio.
- Model loading after primitive rendering is stable.
- More complete draw API coverage and richer text/sprite support.

## Validation

Use WSL on Windows:

```bash
cd /mnt/c/Users/brend/exp/nova64
make -C retroarch clean all
make -C retroarch DEBUG=1
scons -f retroarch/SConstruct DEBUG=1
bash retroarch/tests/run_conformance.sh
```

Manual RetroArch smoke targets:

- Load a `.js` boot cart.
- Load a deterministic framebuffer cart.
- Load `06-cube.js`, `08-sphere.js`, and `09-overlay-scene.js` with a GLES-capable
  RetroArch video driver.
