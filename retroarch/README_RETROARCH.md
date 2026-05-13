# Nova64 RetroArch Core

This directory contains the native Nova64 libretro core. It does not embed a browser,
Three.js, or Babylon.js. Carts run through QuickJS and call native Nova64 host APIs.

## Status

Milestones 1–7 are complete. The core is in Milestone 8 (Release Hardening).

Implemented and conformance-tested:

- QuickJS ES module cart execution with `init()`, `update(dt)`, `draw()` lifecycle.
- 640×360 software 2D framebuffer; RGB565 output when hardware is unavailable.
- OpenGL ES 3.1 hardware renderer via RetroArch-owned hardware context.
- Cube, plane, and low-poly sphere primitives with ambient/directional lighting.
- 2D overlay texture compositor (software framebuffer over GLES 3D output).
- Post-processing pipeline: CRT, vignette, pixelate, bloom, chromatic aberration,
  color grade, and posterize effects via GLES FBO.
- Texture handle allocation and per-mesh texture binding.
- Material effects: emissive color and per-mesh alpha/transparency.
- Procedural SFX and PCM asset audio mixing through RetroArch audio callbacks.
- Persistent JSON cart storage using the RetroArch save directory.
- `.nova` zip-style package format with manifest asset staging and relative
  ES module imports.
- Full keyboard and mouse input with per-frame hold/edge detection.
- Versioned save-state headers for deterministic host-owned state.

## Build

Use WSL for all build and test operations on Windows.
The core links zlib for zip-style `.nova` source extraction.

```bash
cd /mnt/c/Users/brend/exp/nova64
make -C retroarch clean all
make -C retroarch DEBUG=1
```

Optional SCons entry point:

```bash
scons -f retroarch/SConstruct
scons -f retroarch/SConstruct DEBUG=1
```

Both paths build from the shared QuickJS source tree in
`nova64-godot/gdextension/third_party/quickjs` and place generated object files
under `retroarch/build/`.

## Native Harness

The lightweight harness stubs libretro callbacks and runs a cart without launching
RetroArch:

```bash
cc -Iretroarch -o retroarch/build/harness retroarch/tests/harness.c -ldl
retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/00-boot.js
```

Harness flags:

| Flag | Effect |
|------|--------|
| `--expect <hex>` | Assert framebuffer checksum matches |
| `--expect-audio <hex>` | Assert audio batch checksum matches |
| `--capture <path.ppm>` | Write software framebuffer as PPM |
| `--command-log <path>` | Write deterministic renderer command log |
| `--renderer opengles3\|vulkan12` | Select renderer backend |
| `--seed <n>` | Inject deterministic initial RNG seed |
| `--perf` | Log `nova64.perf` report on unload |
| `--key <name>` | Inject held keyboard key (e.g. `space`, `left`) |
| `--mouse-x <n>` | Inject relative mouse X movement |
| `--mouse-y <n>` | Inject relative mouse Y movement |
| `--mouse-btn left\|right\|middle` | Inject held mouse button |

`NOVA64_SAVE_DIR=<path>` sets the cart storage directory for harness runs.
`NOVA64_RENDER_COMMAND_LOG=<path>` enables command logging outside the harness.

Run the full conformance suite:

```bash
bash retroarch/tests/run_conformance.sh
```

During implementation, run only the newest cases:

```bash
bash retroarch/tests/run_conformance.sh --recent 2
# or
pnpm run retroarch:test:recent
```

The suite builds the core, compiles the harness, generates `.nova` package
fixtures, then checks framebuffer checksums, audio checksums, renderer command
logs, and visual screenshot captures for the conformance carts.

## Renderer Selection

The core exposes a `nova64_renderer` option with `opengles3` (default) and
`vulkan12` (staged). `opengles3` is the active hardware renderer. `vulkan12`
records the selection in logs/command logs and requests the GLES fallback until
the Vulkan backend is implemented. `NOVA64_RENDERER=<value>` mirrors the option
for harness and shell-driven tests.

## Supported Content

- `.js` — primary development cart format.
- `.nova` — zip-style package. Manifest `"main"` selects the entry point; falls
  back to `code.js`, `game/code.js`, or `src/code.js`. Assets declared in
  `manifest.json` `"assets": []` are staged in memory and readable by carts.
  Relative imports from the main module are resolved against staged package
  assets, so helper modules should be listed in `"assets"`.

## Cart-Facing API

### Lifecycle

```js
export function init() {}
export function update(dt) {}  // dt: seconds since last frame
export function draw() {}
```

### 2D Draw

```js
rgba8(r, g, b, a)                        // color constant
cls(color)                                // clear framebuffer
pset(x, y, color)
line(x0, y0, x1, y1, color)
rect(x, y, w, h, color, filled)
circ(cx, cy, r, color)                    // Bresenham outline circle
circfill(cx, cy, r, color)               // filled circle
print(text, x, y, color [, align])       // align: 'left'|'center'|'right'
textWidth(text)                           // pixel width of text string
spr(path, dx, dy [, imgW, imgH [, sx, sy [, bw, bh]]])  // blit RGBA asset
createSpriteSheet(path, frameW, frameH)  // auto-slice RGBA sheet
sprFrame(sheet, frame, dx, dy)            // draw indexed frame
sprNamed(sheet, name, dx, dy)             // draw atlas JSON region
setClip(x, y, w, h)                      // set 2D clip region
clearClip()                               // remove clip region
draw3d()                                  // flush 3D scene to framebuffer
```

### Input — Gamepad

```js
btn(nameOrIndex)   // held: 'up','down','left','right','a','b','x','y', or 0-7
btnp(nameOrIndex)  // edge (just pressed)
```

### Input — Keyboard

```js
key(name)    // held: 'space','enter','escape','backspace','tab','up','down',
             //       'left','right', 'a'-'z', '0'-'9', 'f1'-'f12',
             //       'lshift','rshift','lctrl','rctrl','lalt','ralt'
keyp(name)   // edge (just pressed)
```

### Input — Mouse

```js
mouseX()                  // relative X movement this frame
mouseY()                  // relative Y movement this frame
mouseBtn(name)            // held: 'left'|'right'|'middle'
mouseBtnp(name)           // edge (just pressed)
```

### Audio

```js
sfx(idOrOpts [, opts])          // procedural synth SFX
setVolume(value)                 // global volume 0.0–1.0
playSound(path [, vol [, loop]]) // play PCM asset (.pcm raw int16 or .wav)
stopSound(path)                  // stop a specific looping sound
stopAllSounds()                  // stop all active audio voices
```

SFX option keys: `wave` ('square'|'sine'|'triangle'|'noise'), `freq`, `dur`,
`vol`, `sweep`.

### Storage

```js
nova64.storage.saveData(key, value)
nova64.storage.loadData(key [, fallback])
nova64.storage.deleteData(key)
nova64.storage.saveJSON(key, value)
nova64.storage.loadJSON(key [, fallback])
nova64.storage.remove(key)
nova64.storage.has(key)          // true if key exists
nova64.storage.keys()            // array of stored key names for this cart
nova64.storage.clear()           // delete all keys for this cart; returns count
```

Top-level aliases: `saveData`, `loadData`, `deleteData`, `saveJSON`, `loadJSON`,
`remove`, `hasData`, `storageKeys`, `storageClear`.

### Assets

```js
nova64.assets.has(path)
nova64.assets.size(path)
nova64.assets.readText(path [, fallback])
nova64.assets.readJSON(path [, fallback])
nova64.assets.readBytes(path)     // Uint8Array
nova64.assets.list()              // array of asset paths from manifest
nova64.assets.quota()             // { used, max, count, missing, rejected }
```

Top-level aliases: `assetHas`, `assetSize`, `readAssetText`, `readAssetJSON`,
`readAssetBytes`, `listAssets`, `assetQuota`.

### Metadata And Perf

```js
nova64.meta.name()
nova64.meta.title()
nova64.meta.author()
nova64.meta.version()
nova64.meta.main()

nova64.perf.begin(label)
nova64.perf.end(label)
nova64.perf.report()             // { [label]: { total, count, active } }
nova64.perf.clear()
```

### 3D Scene

```js
// Primitives
createCube(color)
createCube(size, color [, position])
createCube(width, height, depth, color [, position])
createSphere(color)
createSphere(radius, color [, position])
createPlane(color)
createPlane(width, depth, color)

// Mesh lifecycle
destroyMesh(handle)
removeMesh(handle)
getMesh(handle)              // snapshot: { x, y, z, rx, ry, rz, sx, sy, sz, visible }

// Transforms
setPosition(handle, x, y, z)
setRotation(handle, x, y, z)
setScale(handle, x, y, z)
getPosition(handle)          // { x, y, z }
getRotation(handle)          // { x, y, z }
rotateMesh(handle, dx, dy, dz)
moveMesh(handle, dx, dy, dz)

// Material
setMeshVisible(handle, visible)
setMeshOpacity(handle, opacity)     // 0.0–1.0
setFlatShading(handle, enabled)
setCastShadow(handle, enabled)
setReceiveShadow(handle, enabled)
setMeshColor(handle, color)
setMeshEmissive(handle, color, intensity)
setMeshAlpha(handle, alpha)
setMeshTexture(handle, texHandle)

// Textures
createTexture(width, height, rgbaBytes)
destroyTexture(texHandle)

// Stats and capabilities
get3DStats()               // { meshCount, lightCount }
getBackendCapabilities()   // { emissive, meshAlpha, textures }
```

### Camera

```js
setCameraPosition(x, y, z)
setCameraTarget(x, y, z)
setCameraFOV(degrees)
setCameraLookAt(direction)
```

### Lighting

```js
setAmbientLight(color [, intensity])
setLightDirection(x, y, z)
setLightColor(color)
setDirectionalLight(direction, color, intensity)
createPointLight(color, intensity, distance [, position])
setPointLightPosition(light, x, y, z)
setPointLightColor(light, color, intensity)
removeLight(light)
setFog(color, near, far)
clearFog()
clearScene()
```

### Post Processing

```js
nova64.post.setCRT(intensity)       // CRT scanline/barrel, 0.0–1.0
nova64.post.setVignette(intensity)  // vignette darkening, 0.0–1.0
nova64.post.setPixelate(size)       // pixelation block size (1 = off)
nova64.post.setBloom(intensity)     // bloom bright-pass, 0.0–1.0
nova64.post.setChromatic(intensity) // chromatic aberration, 0.0–1.0
nova64.post.setColorGrade(r, g, b)  // per-channel RGB multiplier
nova64.post.setPosterize(levels)    // color quantization levels (0 = off)
nova64.post.clear()                 // reset all post effects
nova64.post.getState()              // returns current effect state object
```

### Runtime Utilities

```js
nova64.frame()   // current frame counter (integer, increments each retro_run)
nova64.time()    // elapsed seconds (float)
```

## Known Gaps And Unsupported APIs

These browser-side Nova64 or Three.js features are not implemented:

- **QuickJS heap serialization**: save states include only native host state
  (framebuffer, input, camera, lights, mesh table). JS object state is reset on
  load. Carts must re-derive JS state from persistent storage or use deterministic
  init logic.
- **Advanced tilemap and sprite-sheet tooling**: first-pass tilemaps and
  sprite-sheet frame/atlas blits are implemented, but richer browser tooling
  such as z-sorted draw queues and complex atlas formats is not yet mapped.
- **Streamed music**: `playMusic()`, track looping, and crossfade are not
  implemented. Use `playSound(..., vol, true)` for looping PCM clips.
- **Texture binding in software mode**: `createTexture`/`setMeshTexture` allocate
  valid handles and track state but do not upload to GL in headless/software
  captures.
- **Shadow maps**: `setCastShadow`/`setReceiveShadow` record state but shading
  does not vary by shadow in the current GLES shader.
- **Orthographic camera**: only perspective projection is implemented.
- **Browser-only globals**: `window`, `document`, `THREE`, `BABYLON`, and any
  DOM/Web APIs are not available and will throw at cart load time.
- **Multiplayer/network**: no networking APIs.
- **Vulkan renderer**: staged but not yet functional; selects GLES fallback.

## Conformance Carts

| Cart | What it covers |
|------|----------------|
| `00-boot.js` | lifecycle and log order |
| `01-framebuffer.js` | deterministic 2D checksum |
| `02-input.js` | gamepad hold and edge transitions |
| `03-errors.js` | controlled exceptions |
| `06-cube.js` | camera/light/mesh command scene |
| `07-cube-plane.js` | cube + ground plane |
| `08-sphere.js` | sphere primitive |
| `09-overlay-scene.js` | 3D + 2D HUD composite |
| `10-lighting.js` | material and light |
| `11-storage.js` | saveJSON/loadJSON round-trip |
| `12-audio.js` | procedural SFX batch |
| `13-assets.js` | package asset reads |
| `14-plane-dimensions.js` | plane width/depth args |
| `15-primitive-args.js` | cube/sphere position args |
| `16-transforms.js` | rotateMesh/moveMesh/getters |
| `17-light-fog.js` | fog + point lights |
| `18-mesh-helpers.js` | opacity, visibility, flat-shading |
| `19-texture.js` | createTexture/setMeshTexture |
| `20-post.js` | CRT/vignette/pixelate post effects |
| `21-post-effects.js` | bloom/chromatic/colorGrade/posterize |
| `22-material.js` | emissive + mesh alpha |
| `23-keyboard.js` | key hold, edge, false-positive |
| `24-storage-keys.js` | has/keys/clear round-trip |
| `25-mouse.js` | mouseX/Y, button edge/hold |
| `26-draw2d.js` | circ/circfill, print alignment |
| `27-sprite.js` | spr() full and cropped blit |
| `28-play-sound.js` | PCM playback + audio checksum |
| `29-runtime-utils.js` | frame/time, setClip/clearClip |
| `30-showcase.js` | multi-API cross-subsystem demo |
| `31-tilemap.js` | tilemap draw from RGBA tilesheet |
| `32-spritesheet.js` | sprite-sheet frame and named atlas blit |
| `34-analog.js` | analog stick and trigger input |
| `35-rng.js` | deterministic RNG |
| `36-camera2d.js` | 2D camera offset and clear |
| `37-multimodule.js` | relative ES module imports from `.nova` packages |
| `38-seeded-rng.js` | harness initial RNG seed injection |
| `39-meta.js` | manifest metadata APIs |
| `40-perf.js` | perf begin/end/report/clear |
| `41-asset-quota.js` | asset quota reporting and rejection |
