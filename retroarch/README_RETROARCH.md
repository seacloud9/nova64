# Nova64 RetroArch Core

This directory contains the native Nova64 libretro core. It does not embed a browser,
Three.js, or Babylon.js. Carts run through QuickJS and call native Nova64 host APIs.

## Current Milestone

The first executable core milestone is now wired around:

- QuickJS runtime/context creation from the shared source in
  `nova64-godot/gdextension/third_party/quickjs`.
- ES module carts with cached `init()`, `update(dt)`, and `draw()` exports.
- Plain `.js` cart loading plus `.nova` extension compatibility for package work.
- A 640x360 software 2D framebuffer presented as RGB565 when hardware rendering is
  unavailable.
- A RetroArch-owned OpenGL ES hardware context request targeting OpenGL ES 3.1.
- A minimal backend-neutral 3D command table for opaque mesh handles.
- Versioned save-state headers for host-owned deterministic state only.

Vulkan 1.2 is the next renderer target. The C renderer boundary is intentionally
shaped so a Vulkan backend can be added beside GLES without replacing the
QuickJS/runtime layer.

## Build

Use WSL for Windows development.
The core links zlib for zip-style `.nova` source extraction.

```bash
cd /mnt/c/Users/brend/exp/nova64
make -C retroarch clean all
make -C retroarch DEBUG=1
```

An optional SCons entry point is available:

```bash
scons -f retroarch/SConstruct
scons -f retroarch/SConstruct DEBUG=1
```

Both paths build from the shared QuickJS source tree and place generated object
files under `retroarch/build/`.

## Native Harness

The lightweight harness stubs libretro callbacks and runs a cart without launching
RetroArch:

```bash
cc -Iretroarch -o retroarch/build/harness retroarch/tests/harness.c -ldl
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/00-boot.js
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/06-cube.js --capture screenshots/retroarch/06-cube.ppm
```

The optional third argument writes the most recent software framebuffer as a PPM
screen capture. `--expect <hex>` turns the harness into a checksum assertion.

Run the full conformance suite:

```bash
bash retroarch/tests/run_conformance.sh
```

The suite builds the core, compiles the harness, generates `.nova` package
fixtures, and checks golden frame checksums.

## Supported Content

- `.js`: supported as the primary development cart format.
- `.nova`: kept as a compatibility extension. Raw JS payloads execute directly;
  zip-style `.nova` packages prefer `manifest.json`'s `"main"` path, then fall
  back to `code.js`, `game/code.js`, or `src/code.js`.

## Implemented Cart APIs

Lifecycle:

- `init()`
- `update(dt)`
- `draw()`

2D:

- `rgba8(r, g, b, a)`
- `cls(color)`
- `pset(x, y, color)`
- `line(x0, y0, x1, y1, color)`
- `rect(x, y, w, h, color, filled)`
- `print(text, x, y, color)`

Input:

- `btn(nameOrIndex)`
- `btnp(nameOrIndex)`

3D command bridge:

- `createCube(color)`
- `createSphere(color)`
- `createPlane(color)`
- `destroyMesh(handle)`
- `setPosition(handle, x, y, z)`
- `setRotation(handle, x, y, z)`
- `setScale(handle, x, y, z)`
- `setCameraPosition(x, y, z)`
- `setCameraTarget(x, y, z)`
- `setCameraFOV(degrees)`
- `setAmbientLight(color)`
- `setLightDirection(x, y, z)`
- `clearScene()`

These functions are exposed both under `nova64.draw`, `nova64.input`,
`nova64.scene`, `nova64.camera`, and `nova64.light`, and as top-level compatibility
helpers for tiny conformance carts.

## Renderer Roadmap

1. OpenGL ES 3.1: first hardware renderer. The current core requests the context and
   loads functions through the libretro proc-address callback. Full primitive
   drawing and 2D overlay compositing are next.
2. Vulkan 1.2: planned second backend. The goal is partial-to-mostly complete
   Nova64 primitive/material coverage without changing cart-facing APIs.
3. Package/assets: `.nova` package parsing, assets, textures, model loading, and
   deterministic conformance coverage.

## Limitations

- QuickJS heap state is not serialized. Save states currently include only
  framebuffer, input, camera, light, and native mesh-table state.
- `.nova` package parsing currently uses manifest metadata only to find executable
  cart source; assets remain staged next.
- GLES 3D primitive drawing is a command bridge smoke path; geometry rendering and
  overlay composition are staged next.
- The software fallback includes a deterministic primitive preview renderer so
  conformance carts can produce solid shaded captures before the full GLES/Vulkan
  paths are complete.
- Audio and persistent cart storage are not implemented yet.
