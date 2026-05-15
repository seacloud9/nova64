# Nova64 RetroArch Core

This directory contains the native Nova64 libretro core. It does not embed a browser,
Three.js, or Babylon.js. Carts run through QuickJS and call native Nova64 host APIs.

## Status

Milestones 1–8 are complete.

Implemented and conformance-tested:

- QuickJS ES module cart execution with `init()`, `update(dt)`, `draw()` lifecycle.
- 640×360 software 2D framebuffer; RGB565 output when hardware is unavailable.
- OpenGL ES 3.1 hardware renderer via RetroArch-owned hardware context.
- Cube, plane, low-poly sphere, capsule, and cylinder primitives with ambient/directional lighting.
- Orthographic and perspective camera projection.
- 2D overlay texture compositor (software framebuffer over GLES 3D output).
- Post-processing pipeline: CRT, vignette, pixelate, bloom, chromatic aberration,
  color grade, and posterize effects via GLES FBO.
- Texture handle allocation and per-mesh texture binding (GLES; software-mode handles
  are valid but no-op for GL upload).
- Material effects: emissive color, per-mesh alpha/transparency, roughness, metalness.
- UV offset and UV scale per mesh.
- Per-mesh blend modes: opaque, additive, multiply.
- Normal map support via `setMeshNormalMap`.
- Directional shadow maps with PCF 3×3 filtering and configurable quality.
- Scene hierarchy: parent/child mesh transforms via `setParent`/`clearParent`.
- Z-sorted sprite draw queue for 2D sprites with depth ordering.
- Custom mesh geometry via `createMesh`.
- Instanced mesh rendering via `createInstancedMesh` / `setInstanceTransform`.
- Equirectangular skybox via `setSkybox`.
- Offscreen render targets: `createRenderTarget`, `renderScene`, `renderTargetAsTexture`.
- Procedural SFX and PCM asset audio mixing through RetroArch audio callbacks.
- Streamed music: `playMusic`/`stopMusic`/`pauseMusic`/`resumeMusic`/`setMusicVolume`.
- Named audio channels with per-channel volume and pitch.
- Voice handle API: `sfx()` and `playSound()` return numeric voice handles.
- Positional 3D audio via `playSound3D` / `setListenerPos`.
- Audio echo effect via `setEcho`/`clearEcho`.
- Stereo panning.
- Persistent JSON cart storage using the RetroArch save directory.
- Compressed storage via zlib: `storageSetCompressed`/`storageGetCompressed`.
- Procedural noise: 1D/2D/3D Perlin gradient noise and fractal Brownian motion via `noise()`/`fbm()`.
- 2D particle system: up to 8 emitters, 512 particles, color/size lerp, gravity, continuous/burst modes.
- `.nova` zip-style package format with manifest asset staging and relative
  ES module imports.
- PNG asset decode for sprites and textures.
- Bitmap font loading and rendering via `loadFont`/`printFont`.
- Full keyboard and mouse input with per-frame hold/edge detection.
- Multi-port gamepad input (ports 0–3).
- Rumble output via `rumble()`.
- 2D AABB/circle physics colliders via `createCollider`/`moveAndCollide`.
- 3D raycast via `raycast()`.
- RetroAchievements cart RAM via `peek`/`poke`.
- In-cart developer console via `nova64.console`.
- Hot reload when `NOVA64_HOT_RELOAD=1`.
- Versioned save-state headers for deterministic host-owned state.

## Build

Use WSL for all build and test operations on Windows.
The core links zlib for zip-style `.nova` source extraction and compressed storage.

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
| `--frames <n>` | Run for N frames instead of the default 2 |
| `--key <name>` | Inject held keyboard key (e.g. `space`, `left`) |
| `--mouse-x <n>` | Inject relative mouse X movement |
| `--mouse-y <n>` | Inject relative mouse Y movement |
| `--mouse-btn left\|right\|middle` | Inject held mouse button |
| `--touch-x <n>` / `--touch-y <n>` | Inject pointer/touch coordinates |
| `--touch-count <n>` | Inject active pointer/touch count |
| `--gles` | Request GLES hardware context (Mesa headless) |

`NOVA64_SAVE_DIR=<path>` sets the cart storage directory for harness runs.
`NOVA64_RENDER_COMMAND_LOG=<path>` enables command logging outside the harness.
`NOVA64_HOT_RELOAD=1` causes `retro_reset` to re-read the cart from disk.
`NOVA64_GLES_TESTS=1` enables GLES conformance cases in the test suite.

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
colorLerp(a, b, t)
colorR(color) / colorG(color) / colorB(color) / colorA(color)
screenWidth() / screenHeight()
cls(color)                                // clear framebuffer
clsGradient(colorA, colorB [, vertical])
pset(x, y, color)
pget(x, y)
replaceColor(fromColor, toColor)
screenFade(color, amount)
screenTint(color, amount)
screenInvert()
screenGrayscale()
screenPosterize(levels)
screenThreshold(threshold, lowColor, highColor)
screenScanlines(color, amount [, step])
screenVignette(amount [, color])
line(x0, y0, x1, y1, color [, thickness])
hline(x0, y, x1, color)
vline(x, y0, y1, color)
lineGradient(x0, y0, x1, y1, colorA, colorB [, thickness])
rect(x, y, w, h, color, filled)
rectfill(x, y, w, h, color)
rectGradient(x, y, w, h, colorA, colorB [, vertical])
roundRect(x, y, w, h, radius, color)
roundRectFill(x, y, w, h, radius, color)
circ(cx, cy, r, color)                    // Bresenham outline circle
circfill(cx, cy, r, color)               // filled circle
oval(cx, cy, rx, ry, color)
ovalfill(cx, cy, rx, ry, color)
tri(x0, y0, x1, y1, x2, y2, color)
trifill(x0, y0, x1, y1, x2, y2, color)
print(text, x, y, color [, align])       // align: 'left'|'center'|'right'
textWidth(text)                           // pixel width of text string
textHeight(text)
textSize(text)                            // { w, h, lines }
printShadow(text, x, y, color, shadowColor [, dx [, dy [, align]]])
printOutline(text, x, y, color, outlineColor [, align])
spr(path, dx, dy [, imgW, imgH [, sx, sy [, bw, bh [, z]]]])  // blit RGBA/PNG asset; z for depth sort
createSpriteSheet(path, frameW, frameH)  // auto-slice RGBA sheet
sprFrame(sheet, frame, dx, dy)            // draw indexed frame
sprNamed(sheet, name, dx, dy)             // draw atlas JSON region
setClip(x, y, w, h)                      // set 2D clip region
clearClip()                               // remove clip region
getClip()                                 // { active, x, y, w, h }
pushClip() / popClip()
setCamera2D(x, y [, zoom [, rotation]])
getCamera2D()                             // { x, y, zoom, rotation }
clearCamera2D()
pushCamera2D() / popCamera2D()
setBlend2D(mode)                          // normal|alpha|additive|multiply|screen
getBlend2D()
clearBlend2D()
pushBlend2D() / popBlend2D()
setPalette(index, color)                  // update 16-color draw palette
getPalette(index)                         // read palette color or null
applyPaletteSwap(from, to)                // exact-color palette substitution
clearPaletteSwap()                        // disable active palette swap
resetPalette()
pushPalette() / popPalette()
getDrawState()                            // { clip, camera2D, blend, palette }
clearDrawState()
draw3d()                                  // flush 3D scene to framebuffer
draw3d(fn)                                // flush 3D scene, invoke callback after
```

### Font

```js
loadFont(path [, size])       // load bitmap font from package asset; returns handle
printFont(handle, text, x, y, color [, align])
destroyFont(handle)
```

### Input — Gamepad

```js
btn(nameOrIndex [, port])   // held: 'up','down','left','right','a','b','x','y', or 0-7
btnp(nameOrIndex [, port])  // edge (just pressed); port 0-3 for multi-player
rumble(strength)             // controller rumble 0.0–1.0
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
touchX([i])               // pointer/touch X, 0 if inactive
touchY([i])               // pointer/touch Y, 0 if inactive
touchCount()              // active pointer/touch count
```

### Audio

```js
sfx(idOrOpts [, opts])               // procedural synth SFX; returns voice handle
setVolume(value)                      // global volume 0.0–1.0
playSound(path [, vol [, loop [, channel [, pitch]]]])  // play PCM/WAV asset; returns voice handle
stopSound(path)                       // stop a specific looping sound
stopAllSounds()                       // stop all active audio voices

// Music (streamed)
playMusic(path [, volume [, loop]])
stopMusic()
pauseMusic()
resumeMusic()
setMusicVolume(volume)
musicActive()                         // true if music is currently playing

// Named channels
setChannelVolume(channel, volume)
getChannelVolume(channel)             // 0.0–1.0
stopChannel(channel)
setChannelPitch(channel, pitch)
getChannelPitch(channel)
nova64.audio.setChannelVolume / getChannelVolume / stopChannel
nova64.audio.setChannelPitch / getChannelPitch

// Voice handles (returned by sfx/playSound)
stopVoice(handle)
setVoicePitch(handle, pitch)
getVoicePitch(handle)
getVoiceVolume(handle)
voiceActive(handle)                   // true if voice is still playing

// Effects
setEcho(delay, decay)                 // echo/delay effect
clearEcho()

// Positional 3D audio
setListenerPos(x, y, z)
playSound3D(path, x, y, z [, vol [, loop [, channel]]])
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
nova64.storage.open(namespace)   // isolated store: save/load/delete/has
nova64.storage.cartIds()         // array of cart IDs that have stored data

// Compressed storage (zlib deflate — stored as <key>.z)
storageSetCompressed(key, value)            // JSON-stringify + compress; returns bool
storageGetCompressed(key [, fallback])      // decompress + JSON-parse; returns fallback if missing
storageHasCompressed(key)                   // true if <key>.z exists
nova64.storage.saveCompressed / loadCompressed / hasCompressed
```

Top-level aliases: `saveData`, `loadData`, `deleteData`, `saveJSON`, `loadJSON`,
`remove`, `hasData`, `storageKeys`, `storageClear`.

Storage versioning:

```js
storageVersion()             // returns current version number
storageSetVersion(n)         // set version; triggers migration hooks on load
```

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
createCapsule(radius, height, color [, position])
createCylinder(radius, height, color [, position])

// Custom geometry
createMesh(positions, normals, indices)  // Float32Array positions, Float32Array normals, Uint16Array indices

// Mesh lifecycle
destroyMesh(handle)
removeMesh(handle)
getMesh(handle)    // snapshot: { x, y, z, rx, ry, rz, sx, sy, sz, visible,
                   //             opacity, castShadow, receiveShadow, flatShading,
                   //             blendMode, emissiveColor, emissiveIntensity }

// Transforms
setPosition(handle, x, y, z)
setRotation(handle, x, y, z)
setScale(handle, x, y, z)
getPosition(handle)          // { x, y, z }
getRotation(handle)          // { x, y, z }
rotateMesh(handle, dx, dy, dz)
moveMesh(handle, dx, dy, dz)

// Scene hierarchy
setParent(child, parent)     // child inherits parent's world transform
clearParent(child)
getWorldPosition(handle)     // { x, y, z } in world space

// Material
setMeshVisible(handle, visible)
setMeshOpacity(handle, opacity)           // 0.0–1.0
setFlatShading(handle, enabled)
setCastShadow(handle, enabled)
setReceiveShadow(handle, enabled)
setMeshColor(handle, color)
setMeshEmissive(handle, color, intensity)
setMeshAlpha(handle, alpha)
setMeshTexture(handle, texHandle)
setMeshNormalMap(handle, texHandle)       // tangent-space normal map
setMeshRoughness(handle, value)           // 0.0–1.0 (PBR roughness)
setMeshMetalness(handle, value)           // 0.0–1.0 (PBR metalness)
setMeshUVOffset(handle, u, v)
setMeshUVScale(handle, u, v)
setMeshBlend(handle, mode)                // 'opaque'|'additive'|'multiply'

// Shadow quality
setShadowQuality(quality)   // 'low'|'medium'|'high' — changes shadow map resolution

// Textures
createTexture(width, height, rgbaBytes)
destroyTexture(texHandle)

// Stats and capabilities
get3DStats()               // { meshCount, triangleCount, visibleMeshes, pointLights, backend }
getBackendCapabilities()   // { hardwareGLES, softwareFallback, emissive, meshAlpha,
                           //   textures, normalMaps, shadowMaps, renderTargets, skybox, ... }
```

### Camera

```js
setCameraPosition(x, y, z)
setCameraTarget(x, y, z)
setCameraFOV(degrees)
setCameraLookAt(direction)
getCameraPosition()          // { x, y, z }
getCameraTarget()            // { x, y, z }
getCameraFOV()               // degrees

setCameraOrthographic(left, right, bottom, top, near, far)
setCameraPerspective()       // restore perspective projection
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
setSkyColor(topColor [, bottomColor])
getSkyColor()                 // { enabled, top, bottom }
clearSkyColor()
```

### Skybox

```js
setSkybox(texHandle)          // equirectangular panoramic texture as background (GLES only)
clearSkybox()                 // revert to gradient/solid background
```

`caps.skybox` reports whether the current backend supports skybox rendering.

### Render Targets

```js
createRenderTarget(width, height)   // returns handle; GLES only (software: handle 0)
renderScene(rtHandle)               // render current 3D scene into the render target
renderTargetAsTexture(rtHandle)     // returns a texture handle for use with setMeshTexture
destroyRenderTarget(rtHandle)
```

`caps.renderTargets` reports whether the current backend supports render targets.

### Instanced Mesh

```js
createInstancedMesh(geometry, count)         // geometry: 'cube'|'sphere'|'plane'|'capsule'|'cylinder'
setInstanceTransform(mesh, index, mat16)     // mat16: 16-element column-major Float32 model matrix
getInstanceCount(mesh)                       // returns instance count
```

### 2D Particles

```js
createParticles2D(opts)        // returns emitter handle; opts keys below
emitParticles2D(handle, count) // one-shot burst of N particles
setEmitterPos2D(handle, x, y)  // reposition emitter
setEmitterActive2D(handle, active)  // enable/disable continuous emission
destroyParticles2D(handle)
updateParticles(dt)            // advance all particles — call in update()
drawParticles()                // draw all active particles — call in draw()
getParticleCount()             // total active particle count
```

Emitter options object (all optional — shown with defaults):

```js
{
  x: 0, y: 0,                  // spawn position
  dirX: 0, dirY: -1,           // normalized emission direction (up)
  spread: 0.5,                 // cone half-angle radians
  speedMin: 30, speedMax: 80,  // pixels/second range
  lifetimeMin: 0.4, lifetimeMax: 1.0,  // seconds
  gravX: 0, gravY: 200,        // gravity acceleration pixels/sec²
  color: rgba8(255, 220, 60, 255),     // start color
  colorEnd: rgba8(255, 60, 0, 0),      // end color (lerped over lifetime)
  size: 4, sizeEnd: 0,         // start/end radius pixels
  rate: 0,                     // particles/second for continuous mode (0 = burst-only)
  maxCount: 64,                // cap on active particles from this emitter
}
```

Up to 8 simultaneous emitters and 512 total active particles.

### Physics

```js
createCollider(type, x, y, w, h)   // type: 'aabb'|'circle'; w/h for aabb, w as radius for circle
setColliderPos(handle, x, y)
checkCollision(a, b)               // { colliding, normal, depth }
moveAndCollide(handle, dx, dy, colliders)   // resolved movement vector
destroyCollider(handle)
```

### Raycast

```js
raycast(ox, oy, oz, dx, dy, dz [, maxDist])
// Returns { handle, distance, point: {x,y,z}, normal: {x,y,z} } or null if no hit
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

### Procedural Noise

```js
noise(x)                    // 1D Perlin gradient noise → approximately [-1, 1]
noise(x, y)                 // 2D Perlin gradient noise
noise(x, y, z)              // 3D Perlin gradient noise
fbm(x, y [, octaves [, lacunarity [, gain]]])
                            // fractal Brownian motion (layered noise); octaves default 6
nova64.random.noise(...)    // namespace alias
nova64.random.fbm(...)      // namespace alias
```

Noise values are deterministic (same inputs always produce the same output). Use
`fbm` for terrain heights, animated clouds, water surfaces, and other fractal
patterns.

### Batch Pixel I/O

```js
setPixels(x, y, w, h, array)   // write w×h packed colors from flat array to framebuffer
getPixels(x, y, w, h)           // read w×h region as flat packed-color array
```

### Off-Screen Canvas

```js
createCanvas(w, h)              // allocate off-screen pixel buffer → handle
canvasClear(handle, color)      // fill canvas with color
canvasPset(handle, x, y, color) // set pixel in canvas
canvasPget(handle, x, y)        // read pixel from canvas
canvasBlit(handle, dx, dy [, sx, sy, sw, sh])
                                // copy canvas region to main framebuffer; alpha-blended
canvasWidth(handle)             // canvas pixel width
canvasHeight(handle)            // canvas pixel height
destroyCanvas(handle)           // free canvas memory
```

Up to 4 canvases. Maximum size 1280×720.

### Nine-Slice

```js
drawNineSlice(path, dx, dy, dw, dh, border [, imgw, imgh])
                                // scale RGBA asset as a 9-slice panel; border sets
                                // corner/edge pixel thickness in both source and dest
```

### Screen Blur

```js
screenBlur(radius)              // separable box blur over the framebuffer; radius 1–8
```

### Text Alignment

```js
printRight(text, x, y [, color])    // right-aligned: text ends at x
printCentered(text, x, y [, color]) // horizontally centered at x
```

### Timers

```js
createTimer(duration)       // countdown timer over duration seconds → handle
timerDone(handle)           // true when elapsed >= duration
timerElapsed(handle)        // seconds elapsed since start/reset
timerProgress(handle)       // normalized 0→1 progress
resetTimer(handle)          // restart from 0
destroyTimer(handle)        // free timer slot
```

Up to 32 timers active simultaneously. Advance automatically each frame.

### Logical Grid

```js
createGrid(cols, rows [, cellW, cellH])  // create integer-value grid → handle
setCell(handle, col, row, value)         // write integer cell value
getCell(handle, col, row)                // read cell value (0 if OOB)
clearGrid(handle [, value])              // fill all cells with value (default 0)
gridCols(handle)                         // number of columns
gridRows(handle)                         // number of rows
destroyGrid(handle)                      // free grid slot
```

Up to 8 grids, 4096 cells each. Cells store 32-bit integers.

### Text Measurement

```js
measureText(text)           // { width, height, lines } in pixels/lines
printCentered(text, x, y [, color])     // horizontally centered text at x
```

### Arc Drawing

```js
drawArc(cx, cy, radius, startDeg, endDeg, color [, segments])
                            // stroke an arc (portion of circle)
fillArc(cx, cy, radius, startDeg, endDeg, color [, segments])
                            // filled pie sector
```

### Spline

```js
drawSpline(points, color [, stepsPerSeg [, closed]])
                            // Catmull-Rom smooth curve through control points
                            // points: flat [x0,y0,...] or [[x,y],...]
                            // stepsPerSeg default 16; closed=true closes the loop
```

### Scaled Text

```js
stampText(text, x, y [, scaleX [, scaleY [, color]]])
                            // integer-scaled pixel-font text; scaleX/Y default 2
```

### Color Utilities

```js
colorHSV(h, s, v [, a])    // h:0-360  s:0-255  v:0-255  a:0-255 → packed color
colorLerp2D(c00, c10, c01, c11, tx, ty)
                            // bilinear interpolation between 4 corner colors
```

### Polygon Draw/Fill

```js
drawPoly(points, color [, closed])   // stroke polyline; points = flat [x0,y0,...] or [[x,y],...]
fillPoly(points, color)              // scanline fill polygon (even-odd rule)
```

Up to 128 points; same format as `moveTo`/`lineTo` but as a one-shot array call.

### Screen Pixelate

```js
screenPixelate(blockSize)   // average-downsample framebuffer into blockSize×blockSize blocks
```

### Text Box

```js
textBox(text, x, y [, maxWidth [, color]])   // word-wrapped text block
```

Wraps on spaces; line height is 9 pixels. Respects `\n` in text.

### Sprite Transform

```js
sprTransform(path, cx, cy, angle_deg, scaleX, scaleY
             [, imgw, imgh [, srcx, srcy [, bw, bh]]])
```

Blits a sprite centered at `(cx, cy)` with rotation `angle_deg` (degrees) and
independent x/y scale. Uses inverse-transform sampling for correct pixel mapping.
Parameters match `spr()` crop convention: optional `srcx/srcy/bw/bh` select a
sub-region of the source image.

### Path Drawing

```js
beginPath()                 // reset the path point buffer
moveTo(x, y)                // add first point
lineTo(x, y)                // add subsequent point
closePath()                 // mark path as closed (connects last point to first)
strokePath(color)           // draw line segments along path
fillPath(color)             // fill polygon (even-odd rule, scanline)
```

Up to 128 path points per path. Path is reset by each `beginPath()` call.

### Screen Flash

```js
screenFlash(color, duration)   // overlay color that fades out over duration seconds
```

Applied automatically each frame after `draw()` returns. Useful for hit-flash,
screen transitions, and damage indicators.

### Math Utilities

```js
lerp(a, b, t)               // linear interpolation between a and b by t ∈ [0,1]
clamp(v, lo, hi)            // clamp v to [lo, hi]
map(v, a, b, c, d)          // remap v from [a,b] to [c,d]
smoothstep(lo, hi, x)       // cubic Hermite smooth step: 0 below lo, 1 above hi
wrap(v, lo, hi)             // modular wrap: keeps v within [lo, hi)
approach(cur, target, step) // move cur toward target by at most step
between(v, lo, hi)          // true if v ∈ [lo, hi]
```

### Camera Orbit And Shake

```js
setCameraOrbit(tx, ty, tz, distance, azimuth, elevation)
                            // position camera on a sphere of radius distance around (tx,ty,tz);
                            // azimuth and elevation in degrees
addCameraShake(intensity, duration)
                            // add noise-based camera shake; decays linearly over duration seconds
stopCameraShake()           // immediately stop all shake
```

### Tweens

```js
createTween(from, to, duration [, easing])
                            // create a tween from `from` to `to` over `duration` seconds;
                            // easing string: 'linear' (default), 'quadIn', 'quadOut',
                            // 'sineIn', 'sineOut', 'cubicIn', 'cubicOut',
                            // 'bounceOut', 'elasticOut'
getTweenValue(handle)       // current interpolated value
tweenDone(handle)           // true when tween has finished
destroyTween(handle)        // free tween slot
resetTween(handle)          // restart tween from beginning
```

Tweens advance automatically each frame (`retro_run`). Up to 16 tweens may be
active simultaneously.

### Runtime Utilities

```js
nova64.frame()              // current frame counter (integer, increments each retro_run)
nova64.time()               // elapsed seconds (float)
getResolution()             // { width, height }
nova64.getResolution()      // alias
isDeveloperMode()           // true when core is running in developer mode
nova64.isDeveloperMode()    // alias
devPrint(text)              // print to RetroArch on-screen notification (developer mode)
```

### RetroAchievements Cart RAM

```js
peek(addr)           // read byte at cheevos RAM address
poke(addr, value)    // write byte to cheevos RAM address
nova64.cheevos.peek / poke / ramSize
```

### Developer Console

```js
nova64.console.print(text)   // append line to in-cart overlay ring buffer
nova64.console.clear()       // clear overlay buffer
```

## Known Gaps And Unsupported APIs

These browser-side Nova64 or Three.js features are not implemented:

- **QuickJS heap serialization**: save states include only native host state
  (framebuffer, input, camera, lights, mesh table). JS object state is reset on
  load. Carts must re-derive JS state from persistent storage or use deterministic
  init logic.
- **Texture sampling in software mode**: `createTexture`/`setMeshTexture` allocate
  valid handles and track state but do not upload to GL in headless/software
  captures.
- **Skybox and render targets in software mode**: `caps.skybox` and
  `caps.renderTargets` report `false` without a GLES context. Both features require
  GLES 3.1.
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
| `33-music.js` | playMusic/stopMusic/pauseMusic/resumeMusic/setMusicVolume |
| `34-analog.js` | analog stick and trigger input |
| `35-rng.js` | deterministic RNG |
| `36-camera2d.js` | 2D camera offset and clear |
| `37-multimodule.js` | relative ES module imports from `.nova` packages |
| `38-seeded-rng.js` | harness initial RNG seed injection |
| `39-meta.js` | manifest metadata APIs |
| `40-perf.js` | perf begin/end/report/clear |
| `41-asset-quota.js` | asset quota reporting and rejection |
| `42-touch.js` | pointer/touch input |
| `43-storage-namespace.js` | namespaced storage stores |
| `44-capsule.js` | capsule primitive |
| `45-cylinder.js` | cylinder primitive |
| `46-blend2d.js` | 2D blend mode set/clear/visual |
| `47-camera-ortho.js` | setCameraOrthographic / setCameraPerspective |
| `48-sky-color.js` | setSkyColor / clearSkyColor |
| `49-mesh-material.js` | roughness, metalness, UV offset/scale, blendMode round-trips |
| `50-get3d-stats.js` | get3DStats fields and counts |
| `51-clear-scene.js` | clearScene mesh invalidation |
| `52-camera-getters.js` | getCameraPosition / getCameraTarget / getCameraFOV |
| `53-mesh-opacity.js` | setMeshOpacity round-trip and visible mesh count |
| `54-emissive.js` | setMeshEmissive round-trip |
| `55-shadow-flags.js` | setCastShadow / setReceiveShadow / setFlatShading round-trips |
| `56-point-lights.js` | createPointLight / setPointLightPosition / removeLight |
| `57-destroy-mesh.js` | destroyMesh / removeMesh handle invalidation |
| `58-mesh-color.js` | setMeshColor / setMeshAlpha round-trips |
| `59-move-rotate.js` | moveMesh / rotateMesh delta accumulation |
| `60-fog.js` | setFog / clearFog visual |
| `61-camera-lookat.js` | setCameraLookAt direction |
| `62-set-position-rotation.js` | setPosition / setRotation absolute vs delta |
| `63-texture-lifecycle.js` | createTexture / setMeshTexture / destroyTexture |
| `64-directional-light.js` | setAmbientLight / setLightDirection / setDirectionalLight |
| `65-backend-caps.js` | getBackendCapabilities full field validation |
| `66-draw3d-callback.js` | draw3d() no-arg + draw3d(fn) callback |
| `67-storage.js` | saveData / loadData / hasData / deleteData / storageKeys / storageClear |
| `68-sky-gradient.js` | software sky gradient + sky state |
| `69-palette-swap.js` | 16-color palette helpers and palette swap |
| `70-draw-shapes.js` | gradients, thick lines, triangles, ovals, alpha blend |
| `71-camera2d-transform.js` | 2D camera zoom/rotation and state |
| `72-draw-state.js` | screen size, pget, color channels, clip/palette state |
| `73-lines-rounded.js` | h/v lines, line gradients, rounded rectangles |
| `74-screen-effects.js` | framebuffer fade/tint/posterize/scanline/vignette |
| `75-screen-threshold.js` | invert/grayscale/threshold/replaceColor |
| `76-text-effects.js` | text size, shadow, and outline helpers |
| `77-draw-state-stack.js` | push/pop draw state helpers |
| `78-rumble.js` | rumble() API |
| `79-storage-version.js` | storageVersion / storageSetVersion round-trip |
| `80-physics.js` | AABB/circle colliders: createCollider/checkCollision/moveAndCollide |
| `81-png-sprite.js` | PNG asset decode in spr() and createTexture() |
| `82-scene-hierarchy.js` | setParent / clearParent / getWorldPosition |
| `83-audio-channels.js` | named channels: setChannelVolume / stopChannel |
| `84-storage-cart-ids.js` | storage.cartIds() |
| `85-raycast.js` | raycast() hit result and null miss |
| `86-bitmap-font.js` | loadFont / printFont / destroyFont |
| `87-resolution.js` | getResolution() |
| `88-echo.js` | setEcho / clearEcho |
| `89-positional-audio.js` | setListenerPos / playSound3D |
| `90-developer-mode.js` | isDeveloperMode() |
| `91-stereo-pan.js` | stereo panning via playSound3D |
| `92-hot-reload.js` | NOVA64_HOT_RELOAD=1 cart re-read on reset |
| `93-dev-console.js` | nova64.console.print / clear |
| `94-create-mesh.js` | createMesh custom geometry |
| `95-audio-pitch.js` | playSound pitch parameter |
| `96-channel-pitch.js` | setChannelPitch / getChannelPitch |
| `97-multiport-input.js` | btn/btnp port argument (multi-player) |
| `98-cheevos-ram.js` | peek / poke / ramSize |
| `99-voice-handle.js` | voice handles: stopVoice / setVoicePitch / voiceActive |
| `100-pbr-material.js` | PBR: roughness, metalness, blendMode |
| `101-uv-transform.js` | setMeshUVOffset / setMeshUVScale |
| `102-stereo-audio.js` | audio format resilience; missing asset graceful fail |
| `103-shadow-map.js` | setShadowQuality, shadowMaps cap, PCF shadow rendering |
| `104-normal-map.js` | setMeshNormalMap, normalMaps cap |
| `105-z-sort-sprites.js` | spr() z-depth parameter and draw order |
| `106-render-target.js` | createRenderTarget / renderScene / renderTargetAsTexture / destroyRenderTarget |
| `107-instanced-mesh.js` | createInstancedMesh / setInstanceTransform / getInstanceCount |
| `108-skybox.js` | setSkybox equirectangular panorama / clearSkybox |
| `109-blend-modes.js` | setMeshBlend opaque/additive/multiply; getMesh().blendMode round-trip |
| `110-storage-compressed.js` | storageSetCompressed / storageGetCompressed / storageHasCompressed |
| `111-noise.js` | noise(x/y/z) Perlin gradient noise; fbm() fractal Brownian motion |
| `112-particles2d.js` | createParticles2D/emitParticles2D/updateParticles/drawParticles lifecycle |
| `113-math-utils.js` | lerp/clamp/map/smoothstep/wrap/approach/between |
| `114-camera-orbit.js` | setCameraOrbit azimuth/elevation sphere positioning |
| `115-camera-shake.js` | addCameraShake/stopCameraShake noise-based screen shake |
| `116-tweens.js` | createTween/getTweenValue/tweenDone/destroyTween/resetTween with easing |
| `117-spr-transform.js` | sprTransform rotated/scaled sprite blit |
| `118-path-draw.js` | beginPath/moveTo/lineTo/closePath/strokePath/fillPath polygon draw |
| `119-screen-flash.js` | screenFlash auto-fading color overlay |
| `120-color-hsv.js` | colorHSV hue/saturation/value color constructor |
| `121-draw-fill-poly.js` | drawPoly/fillPoly from flat and nested point arrays |
| `122-screen-pixelate.js` | screenPixelate block-average post-process |
| `123-text-box.js` | textBox word-wrapped text block |
| `124-arc.js` | drawArc/fillArc circle arc and pie sector |
| `125-spline.js` | drawSpline Catmull-Rom smooth curve |
| `126-color-lerp2d.js` | colorLerp2D bilinear four-corner interpolation |
| `127-stamp-text.js` | stampText integer-scaled pixel-font text |
| `128-timers.js` | createTimer/timerDone/timerElapsed/timerProgress/resetTimer lifecycle |
| `129-grid.js` | createGrid/setCell/getCell/clearGrid/gridCols/gridRows logical grid |
| `130-measure-text.js` | measureText dimensions object; printCentered alignment |
| `131-pixels-print-right.js` | setPixels/getPixels batch I/O; printRight right-aligned text |
| `132-screen-blur.js` | screenBlur separable box blur post-process |
| `133-canvas.js` | createCanvas/canvasPset/canvasBlit off-screen pixel buffer |
| `134-nine-slice.js` | drawNineSlice 9-slice sprite panel API smoke test |
