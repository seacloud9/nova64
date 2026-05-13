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
- A first OpenGL ES cube/plane/sphere primitive renderer using RetroArch proc-address
  loading, with per-vertex normals and basic ambient/directional lighting.
- A small renderer boundary that owns hardware context request, context lifecycle,
  and frame presentation decisions ahead of the Vulkan backend.
- A first OpenGL ES 2D overlay texture compositor that uploads the software
  framebuffer after 3D rendering.
- A small native SFX mixer that writes deterministic stereo sample batches through
  RetroArch audio callbacks.
- Persistent cart JSON storage using RetroArch's save directory, with
  `NOVA64_SAVE_DIR` for harness and shell-driven tests.
- `.nova` manifest assets staged in memory for cart reads as text, JSON, or bytes.
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
`--command-log <path>` writes a deterministic renderer command log for headless
checks of camera, light, overlay, and mesh state. The same path can be enabled
outside the harness with `NOVA64_RENDER_COMMAND_LOG=/tmp/nova64.commands`.

Run the full conformance suite:

```bash
bash retroarch/tests/run_conformance.sh
```

The suite builds the core, compiles the harness, generates `.nova` package
fixtures, checks golden frame checksums, and verifies renderer command logs for
the mixed 3D/HUD scene, lighting/material scene, and staged Vulkan selection.

## Renderer Selection

The core exposes a `nova64_renderer` option with `opengles3` and `vulkan12`.
`opengles3` is the active implemented hardware renderer. `vulkan12` is a staged
backend identity for the next renderer milestone; selecting it currently records
the Vulkan preference in logs and command logs, then requests the working GLES
fallback until the Vulkan backend is implemented.

For harness or shell-driven tests, `NOVA64_RENDERER=vulkan12` mirrors the core
option. The harness also accepts `--renderer opengles3|vulkan12`.

## Supported Content

- `.js`: supported as the primary development cart format.
- `.nova`: kept as a compatibility extension. Raw JS payloads execute directly;
  zip-style `.nova` packages prefer `manifest.json`'s `"main"` path, then fall
  back to `code.js`, `game/code.js`, or `src/code.js`. Package manifests now stage
  `name`, `main`, and safe `assets: []` path metadata, verify those asset entries
  exist in the package, and record asset byte totals for command-log conformance;
  full asset loading remains a later milestone.

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

Audio:

- `nova64.audio.sfx(idOrOpts, maybeOpts)`
- `nova64.audio.setVolume(value)`
- Top-level compatibility aliases: `sfx`, `setVolume`
- Supported SFX options: `wave`, `freq`, `dur`, `vol`, `sweep`
- Supported preset ids/names match the browser runtime's small SFX preset table.

Assets:

- `nova64.assets.has(path)`
- `nova64.assets.size(path)`
- `nova64.assets.readText(path, fallback)`
- `nova64.assets.readJSON(path, fallback)`
- `nova64.assets.readBytes(path)`
- `nova64.assets.list()`
- Top-level compatibility aliases: `assetHas`, `assetSize`, `readAssetText`,
  `readAssetJSON`, `readAssetBytes`, `listAssets`
- Only safe paths declared in a zip-style `.nova` manifest `assets: []` list are
  staged for reads.

Storage:

- `nova64.storage.saveData(key, value)`
- `nova64.storage.loadData(key, fallback)`
- `nova64.storage.deleteData(key)`
- `nova64.storage.saveJSON(key, value)`
- `nova64.storage.loadJSON(key, fallback)`
- `nova64.storage.remove(key)`
- Top-level compatibility aliases: `saveData`, `loadData`, `deleteData`,
  `saveJSON`, `loadJSON`, `remove`

3D command bridge:

- `createCube(color)`
- `createCube(size, color, position)`
- `createCube(width, height, depth, color, position)`
- `createSphere(color)`
- `createSphere(radius, color, position)`
- `createPlane(color)`
- `createPlane(width, depth, color)`
- `destroyMesh(handle)`
- `removeMesh(handle)`
- `getMesh(handle)` snapshot
- `setPosition(handle, x, y, z)`
- `setRotation(handle, x, y, z)`
- `setScale(handle, x, y, z)`
- `getPosition(handle)`
- `getRotation(handle)`
- `rotateMesh(handle, dx, dy, dz)`
- `moveMesh(handle, dx, dy, dz)`
- `setMeshVisible(handle, visible)`
- `setFlatShading(handle, enabled)`
- `setMeshOpacity(handle, opacity)`
- `setCastShadow(handle, enabled)`
- `setReceiveShadow(handle, enabled)`
- `get3DStats()`
- `getBackendCapabilities()`
- `setCameraPosition(x, y, z)`
- `setCameraTarget(x, y, z)`
- `setCameraFOV(degrees)`
- `setCameraLookAt(direction)`
- `setAmbientLight(color)`
- `setAmbientLight(color, intensity)`
- `setLightDirection(x, y, z)`
- `setLightColor(color)`
- `setDirectionalLight(direction, color, intensity)`
- `createPointLight(color, intensity, distance, position)`
- `setPointLightPosition(light, x, y, z)`
- `setPointLightColor(light, color, intensity)`
- `removeLight(light)`
- `setFog(color, near, far)`
- `clearFog()`
- `clearScene()`

These functions are exposed both under `nova64.draw`, `nova64.input`,
`nova64.scene`, `nova64.camera`, `nova64.light`/`nova64.lights`, and as top-level
compatibility helpers for tiny conformance carts.

## Renderer Roadmap

1. OpenGL ES 3.1: first hardware renderer. The current core requests the context and
   loads functions through the libretro proc-address callback. Cube, plane, and
   low-poly sphere rendering, basic lit material color, and 2D overlay texture
   compositing are in place.
2. Vulkan 1.2: planned second backend. The goal is partial-to-mostly complete
   Nova64 primitive/material coverage without changing cart-facing APIs.
3. Package/assets: `.nova` package parsing, assets, textures, model loading, and
   deterministic conformance coverage.

## Limitations

- QuickJS heap state is not serialized. Save states currently include only
  framebuffer, input, camera, light/fog, point-light, and native mesh-table state.
- `.nova` package parsing currently uses manifest metadata only to find executable
  cart source; assets remain staged next.
- GLES currently renders cube, plane, and low-poly sphere primitives with basic
  ambient/directional lighting and composites the 2D framebuffer as a texture
  overlay.
- Hardware GLES presentation still needs manual smoke coverage inside RetroArch;
  the native harness validates the same carts through deterministic software
  captures and renderer command logs when no hardware context is available.
- The software fallback includes a deterministic primitive preview renderer so
  conformance carts can produce solid shaded captures before the full GLES/Vulkan
  paths are complete.
- Audio currently covers procedural SFX only; streamed music and sampled assets are
  not implemented yet.
- Package asset loading currently covers manifest-declared in-memory data reads;
  texture/model/audio asset binding remains a later milestone.
- Persistent cart storage currently stores JSON values only.
