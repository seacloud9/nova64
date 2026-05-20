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
  - Procedural `sfx` and `setVolume` now mix deterministic stereo batches through
    RetroArch audio callbacks, with harness audio checksum coverage.
- Persistent cart storage distinct from save states.
- Asset loading for textures, sprites, data, models, and audio.
  - Zip-style `.nova` manifest assets are now staged in memory and readable by
    carts as text, JSON, or bytes. Binding those assets into texture/model/audio
    APIs remains later work.
- Model loading after primitive rendering is stable.
- More complete draw API coverage and richer text/sprite support.
- Persistent JSON cart storage is implemented as the first broader-runtime slice,
  using RetroArch save directories or `NOVA64_SAVE_DIR` in harness tests.

## Milestone 6: Full Runtime Sweep

Goal:

Close the gap between the browser Nova64 runtime and the native RetroArch host so
real carts can move across with minimal conditional code.

Areas:

- Complete the cart-facing 2D draw API:
  - Text alignment, richer font paths, sprites, sprite sheets, tilemaps, clipping,
    camera offsets, palette helpers, and deterministic framebuffer behavior.
  - `setClip(x, y, w, h)` and `clearClip()` apply a per-frame pixel-level clip
    region to all 2D draw operations via the `set_pixel` path. `nova64.frame()`
    and `nova64.time()` expose the frame counter and elapsed seconds.
    `stopSound(path)` and `stopAllSounds()` stop active PCM audio voices.
    `29-runtime-utils.js` covers clip arc rendering, frame/time advancement,
    and stopAllSounds in a visual conformance cart.
  - `circ(cx, cy, r, color)` and `circfill(cx, cy, r, color)` now draw circles
    via Bresenham's midpoint algorithm. `print` accepts an optional 5th alignment
    argument: `'left'` (default), `'center'`, or `'right'`. `textWidth(text)`
    returns the pixel width of a string using the built-in 5×7 font metrics.
    `26-draw2d.js` covers circles and aligned text in a visual conformance cart.
- Complete the cart-facing 3D scene API:
  - Primitive argument parity for cubes, planes, spheres, capsules/cylinders where
    practical, transform helpers, object lookup, material assignment, mesh
    destruction, and predictable handle lifecycle.
  - Cube size/box dimensions and sphere radius now map to native mesh scale, with
    array/object position arguments for cube, sphere, and plane creation.
  - Plane dimensions are now accepted directly through
    `createPlane(width, depth, color)` while preserving `createPlane(color)`.
  - Transform helpers now include position/rotation getters, additive
    `rotateMesh`/`moveMesh`, `setMeshVisible`, `removeMesh`, and a read-only
    `getMesh` snapshot.
  - Mesh helper state now includes opacity, flat-shading and shadow flags, plus
    basic 3D stats and backend capabilities for feature gating.
- Expand camera and lighting:
  - Orthographic/perspective options, fog, point lights, directional light parity,
    basic shadows where feasible, and command-log conformance for state changes.
  - Camera look-at, ambient intensity, directional color/intensity, fog state, and
    point-light lifecycle are now exposed with command-log conformance coverage.
  - Sky gradient background: `setSkyColor(top, bottom)` now renders a vertical
    software-harness gradient and exposes `getSkyColor()` state. `68-sky-gradient.js`
    covers the visual path and capability flag.
- Expand input:
  - Keyboard mappings, mouse buttons, relative mouse movement where RetroArch
    exposes it, touch/lightgun-style affordances if they map cleanly, and
    deterministic harness injection.
  - `key(name)` and `keyp(name)` now poll `RETRO_DEVICE_KEYBOARD` with
    per-frame hold/edge-detection arrays. Names cover arrows, space, enter,
    escape, backspace, tab, a-z, 0-9, F1-F12, and modifier keys. The harness
    `--key <name>` flag injects a held key for deterministic conformance.
    `23-keyboard.js` covers hold, edge, and false-positive key tests.
  - `mouseX()`, `mouseY()`, `mouseBtn(name)`, `mouseBtnp(name)` now poll
    `RETRO_DEVICE_MOUSE` for relative movement and left/right/middle button
    hold/edge state. Harness `--mouse-x N`, `--mouse-y N`, `--mouse-btn name`
    flags inject deterministic mouse state. `25-mouse.js` covers movement,
    button edge, and false-positive button tests.
- Expand audio:
  - Sampled asset playback, music/loop helpers, channel control, and volume/mute
    state that survives normal cart reset semantics.
  - `playSound(path, vol, loop)` plays a package asset as PCM audio. Raw int16
    LE mono at 44100Hz is the default format; standard RIFF/WAV PCM files are
    auto-detected and any sample rate is accepted via nearest-neighbor
    resampling. Looping is supported via the `loop` argument. `28-play-sound.js`
    covers a generated 440Hz sine beep with framebuffer and audio checksums.
- Expand assets and data:
  - Bind manifest assets into texture/model/audio APIs, expose typed data helpers,
    support safe package paths, and keep plain `.js` development carts ergonomic.
  - `spr(path, dx, dy [, imgw, imgh [, sx, sy [, bw, bh]]])` blits a raw RGBA
    package asset onto the 2D framebuffer with per-pixel alpha blending. Image
    dimensions default to a square root estimate; a source crop region can be
    specified for sprite-sheet use. `27-sprite.js` covers full-image and
    cropped-region blits in a visual conformance cart with a generated 4×4
    test sprite.
- Expand storage:
  - Namespaces, key listing, clear operations, quota/error behavior, and migration
    notes for save-directory layouts.
  - `nova64.storage.has(key)`, `nova64.storage.keys()`, and
    `nova64.storage.clear()` are now implemented via POSIX directory scanning.
    `keys()` returns the sanitized key names for all stored entries belonging to
    the current cart. `clear()` removes them all and returns the count.
    `24-storage-keys.js` covers save/has/keys/clear round-trips.
- Keep every new API covered by narrow conformance carts before adding broader
  showcase carts.
- Multi-API showcase: `30-showcase.js` combines 3D scene (cube/sphere/plane), 2D
  overlay HUD, keyboard input (space toggles CRT post-effect), mouse (pans cube),
  procedural audio (`sfx`), persistent storage (`saveJSON`/`loadJSON`), post
  effects (vignette + CRT), and runtime utilities (`nova64.frame()`). The cart
  runs in the harness with `--key space` injection and passes framebuffer and audio
  checksums.

Exit criteria:

- A representative browser demo cart runs in RetroArch without browser-only shims.
  `30-showcase.js` demonstrates cross-API cart portability without browser-only shims.
- Conformance covers all stable cart-facing API families.
- Command logs capture enough runtime state to debug parity regressions headlessly.

## Milestone 7: Shaders And Post Processing

Status: first pass implemented; texture sampling and three post effects are live.

Goal:

Bring Nova64's visual identity into the native renderer with programmable effects
that remain backend-neutral before Vulkan grows beyond the staged identity.

Areas:

- Define a cart-facing shader/effect API that can compile to GLES first and Vulkan
  later without exposing backend-specific handles.
- Add framebuffer/post passes:
  - CRT mask/scanline, bloom, vignette, color grading, pixelation, posterize,
    chromatic offset, blur, and palette/posterization effects.
  - CRT scanline/barrel, vignette, and pixelate are now implemented through a GLES
    FBO pipeline. `nova64.post.setCRT`, `setVignette`, `setPixelate`, `clear`, and
    `getState` are exposed to carts. Post state resets on cart reload.
  - `20-post.js` is implemented as a deterministic post-processing conformance cart.
- Add material shader hooks:
  - Basic unlit/lit variants, emissive color, texture sampling, UV transforms,
    alpha/blend modes, and a safe subset for custom fragment logic.
  - Texture handle allocation and binding are implemented: `createTexture`,
    `setMeshTexture`, `destroyTexture`. In software/headless mode handles are valid
    but no GL upload occurs. `19-texture.js` covers this path.
  - `setMeshColor` and a `draw3d` per-frame callback are now exposed.
  - Mesh shader now supports a `u_texture` sampler and `u_has_texture` guard so
    textured meshes sample the bound GL texture when hardware is available.
- Add render targets:
  - Offscreen passes for 2D/3D composition, HUD overlays, feedback effects, and
    deterministic fallback captures.
  - The post FBO (`post_fbo` + depth renderbuffer) routes 3D into an offscreen color
    texture before the post-program blit. The 2D overlay is always composited last.
- Add conformance:
  - Command-log coverage for pass graphs and shader options.
  - Software or checksum references for effect state where pixel-perfect hardware
    parity is impractical.
  - `19-texture.js` and `20-post.js` are implemented and passing.
- Remaining post passes: bloom (5-tap bright-pass cross), chromatic aberration
  (per-channel UV offset along radial), color grade (per-channel RGB multiplier),
  and posterize (N-level quantize) are now implemented in the post shader and
  exposed via `nova64.post.setBloom`, `setChromatic`, `setColorGrade`,
  `setPosterize`. `getState()` returns all fields including `colorGrade[]`.
  `21-post-effects.js` covers state round-trips and is passing.
- Material hooks: `setMeshEmissive(handle, color, intensity)` and
  `setMeshAlpha(handle, alpha)` are now implemented. Emissive adds a lit
  contribution on top of the base color in both the GLES shader and the software
  preview renderer. Alpha maps to mesh opacity and enables per-mesh GL blend in
  hardware mode. `getBackendCapabilities()` exposes `emissive` and `meshAlpha`
  capability flags. `22-material.js` covers emissive glow and semi-transparent
  mesh rendering and is passing.

Exit criteria:

- At least three post effects are usable from carts and validated in harness.
- GLES owns the first implementation while the renderer boundary stays suitable
  for Vulkan.
- Effect state survives reset/load boundaries cleanly.

## Milestone 8: Full Runtime Parity And RetroArch Hardening

Goal:

Close the remaining gap between the native RetroArch core and the Godot/web
runtimes so that real carts can move across without browser-only shims. The
core is currently functional but covers only a fraction of the full Nova64 API
surface — this milestone is the big parity push.

### 8A: 3D Renderer Expansion

The current GLES renderer covers cube, sphere, and plane with basic ambient and
directional lighting. Everything below is missing or incomplete.

**Done this milestone:**

- Additional primitives:
  - Capsule: `createCapsule(radius, height, color [, position])` — software renderer
    draws rounded-rect body + hemispherical caps; GLES uses sphere proxy geometry.
    `44-capsule.js` conformance cart covers type check and scale validation.
  - Cylinder: `createCylinder(radiusTop, radiusBottom, height, color [, position])` —
    software renderer draws trapezoid body + top ellipse; GLES proxy. `45-cylinder.js`.
- Custom geometry: `createMesh(vertices, normals, uvs, indices, color)` for
  runtime-assembled geometry. `94-create-mesh.js` covers the full build path.
- Scene hierarchy: `setParent(child, parent)` / `clearParent(child)` with world-space
  transform propagation. `82-scene-hierarchy.js` covers parent/child transforms.
- Richer material model:
  - `setMeshRoughness`, `setMeshMetalness` (PBR-style): `100-pbr-material.js`.
  - UV transforms: `setMeshUVOffset`, `setMeshUVScale`: `101-uv-transform.js`.
  - Blend modes: `setMeshBlend('opaque'|'additive'|'multiply')`.
- Orthographic camera: `setCameraOrthographic(width, height)` / `setCameraPerspective()`.
  `47-camera-ortho.js` covers the projection toggle.
- Skybox / background: `setSkyColor(top, bottom)` sky gradient, `68-sky-gradient.js`.
  GLES renders a full-screen gradient quad before 3D geometry.
- 3D raycast: `raycast(origin, direction, maxDist)` — returns hit handle, point, normal.
  `85-raycast.js` covers mouse-picking and no-hit cases.
- Shadow maps: directional depth-FBO pass with PCF 3×3 filtering.
  `setCastShadow`, `setReceiveShadow`, `setShadowQuality('high'|'medium'|'low'|'off')`.
  `shadowMaps` capability flag. `103-shadow-map.js` covers the full API surface.
- Normal maps: object-space normal map on texture unit 2. `setMeshNormalMap(handle, texHandle)`.
  `normalMaps` capability flag. `104-normal-map.js` covers the full API surface.
- Offscreen render targets: `createRenderTarget(w, h)` → FBO + color RGBA tex + depth RBO.
  `renderScene(rt)` renders 3D scene into rt at rt dimensions. `renderTargetAsTexture(rt)`
  returns a borrowed texture handle usable with `setMeshTexture`. `destroyRenderTarget(rt)`.
  `renderTargets` capability flag. `106-render-target.js` covers the full API surface.

- Instanced mesh: `createInstancedMesh(geometry, count)` → NOVA64_MESH_INSTANCED handle.
  `setInstanceTransform(mesh, i, mat16)` sets per-instance column-major mat4.
  `setInstanceTransforms(mesh, start, mat16s)` uploads a flat array of
  consecutive matrices in one JS-to-C call for hot animated grids.
  `getInstanceCount(mesh)` returns count. GLES path: shared material uniforms once,
  per-instance MVP + 3×3 normal matrix, one DrawElements call per instance (soft loop).
  Software path: proxy cube at translation column of each instance matrix.
  `107-instanced-mesh.js` conformance cart sw=4fd99c7a95f90255 gles=f01a0e0dc49c9e0e.
  `681-instance-batch.js` covers the batched upload API.

- ~~`setSkybox(texHandle)`~~ **Done**: equirectangular panoramic skybox on GLES.
  `setSkybox(texHandle)` sets background; `clearSkybox()` reverts to gradient.
  Inverse-VP matrix used to reconstruct view ray per fragment; UV = atan2/asin
  equirectangular mapping. `skybox` capability flag. `108-skybox.js` cart
  sw=38f18480f256541a gles=a4ad0833d5acff46.

- ~~Conformance coverage for new shader features~~ **Done**: `109-blend-modes.js` covers
  additive/multiply/opaque blend round-trips with GLES visual output.

All 8A items complete.

### 8B: 2D Draw API Completion

Tilemap first pass done:

  - `createTilemap(tileW, tileH, cols, rows)` → handle; `setTile(map, col, row, idx)`;
    `drawTilemap(map, dx, dy, path)` blits tiles from a horizontal strip RGBA asset;
    `clearTilemap(map)`, `destroyTilemap(map)`. Max 16 active tilemaps.
    `31-tilemap.js` covers a 4×3 grid drawn from a 4-color tilesheet package asset.

2D camera done:

  - `setCamera2D(x, y)` sets a per-frame world-space scroll offset subtracted
    from all 2D draw coordinate inputs: pset, line, rect, circ, circfill, print,
    spr, drawTilemap. `clearCamera2D()` resets to (0, 0). Offset is reset on
    cart reload. `36-camera2d.js` verifies offset shifts and clear.
  - Advanced camera transform: `setCamera2D(x, y, zoom, rotation)` now tracks
    zoom/rotation for core 2D primitives and `getCamera2D()` reports state.
    `71-camera2d-transform.js` covers the state and visual path.

Expanded 2D primitives done:

  - `line(..., thickness)`, `rectGradient()`, `tri()`, `trifill()`, `oval()`,
    and `ovalfill()` are exposed globally and under `nova64.draw`.
    `70-draw-shapes.js` covers the visual output.
  - Fast helper expansion: `screenWidth()`, `screenHeight()`, `pget()`,
    `clsGradient()`, `hline()`, `vline()`, `lineGradient()`, `rectfill()`,
    `roundRect()`, `roundRectFill()`, `getClip()`, `resetPalette()`,
    `colorLerp()`, and `colorR/G/B/A()` are exposed globally and under
    `nova64.draw`. `72-draw-state.js` and `73-lines-rounded.js` cover the
    state and visual paths.
  - Framebuffer effects: `replaceColor()`, `screenFade()`, `screenTint()`,
    `screenInvert()`, `screenGrayscale()`, `screenPosterize()`,
    `screenThreshold()`, `screenScanlines()`, and `screenVignette()` are exposed
    globally and under `nova64.draw`. `74-screen-effects.js` and
    `75-screen-threshold.js` cover the visual paths.
  - Text and draw-state ergonomics: `textHeight()`, `textSize()`,
    `printShadow()`, `printOutline()`, `push/popClip()`,
    `push/popCamera2D()`, `push/popBlend2D()`, `push/popPalette()`,
    `getDrawState()`, and `clearDrawState()` are exposed globally and under
    `nova64.draw`. `76-text-effects.js` and `77-draw-state-stack.js` cover the
    visual and state paths.

Sprite-sheet first pass done:

  - `createSpriteSheet(path, frameW, frameH)` auto-slices raw RGBA sheets,
    using an adjacent JSON atlas for image dimensions and named regions when
    present. `sprFrame(sheet, frame, dx, dy)` draws by index, and
    `sprNamed(sheet, name, dx, dy)` draws named atlas regions. `32-spritesheet.js`
    covers indexed and named blits from a generated package asset.

**Done (since last update):**

- ~~Custom bitmap fonts~~ **Done**: `loadFont(path [, glyphW, glyphH])`, `printFont(text, x, y, color, handle)`, `textWidthFont(text, handle)`. `86-bitmap-font.js`.
- ~~Stereo pan / voice handle state~~ **Done**: `setVoicePitch`, `setVoiceVolume`, `stopVoice`, `getVoicePitch`, `getVoiceVolume`. `91-stereo-pan.js`, `99-voice-handle.js`.
- ~~Hot reload~~ **Done**: `NOVA64_HOT_RELOAD=1` re-reads cart from disk on reset. `92-hot-reload.js`.

- ~~Draw-order / z-sorting for 2D sprites~~ **Done**: `spr(path, dx, dy, ..., z)` optional
  10th arg; deferred queue flushed after `draw()` returns, sorted ascending by z.
  Backward-compatible (sprites without z arg blit immediately). `105-z-sort-sprites.js`.

All 8B items complete.

### 8C: Audio Completion

The current audio covers procedural SFX and single-channel PCM playback.

**Done this milestone:**

- OGG Vorbis decode via stb_vorbis: `playSound()` auto-detects `.ogg` extension
  and decodes via `stb_vorbis_decode_memory()` at play time. Owned buffer freed on
  voice reuse or reset.
- Streamed music API:
  - `playMusic(path [, vol [, loop]])` — loads a looping PCM/WAV or OGG asset
    into the dedicated `nova64_music_state`, mixed into every audio frame.
  - `stopMusic()`, `setMusicVolume(vol)`, `pauseMusic()`, `resumeMusic()`,
    `musicActive()`. All exposed under `nova64.audio.*` and as globals.
  - `33-music.js` conformance cart covers all API binding and behavior contracts.

**Done this milestone:**

- ~~Multi-channel audio~~ **Done** — `playSound(path, vol, loop, channel, pitch)`;
  `setChannelVolume(channel, vol)`, `setChannelPitch(channel, pitch)`,
  `getChannelVolume(channel)`, `getChannelPitch(channel)`, `stopChannel(channel)`.
  Conformance carts 95 and 96.
- ~~Audio pitch~~ **Done** — per-voice `pitch` arg in `playSound`/`sfx`; per-channel
  `setChannelPitch`; live voice control `setVoicePitch(handle, pitch)`,
  `stopVoice(handle)`. Conformance cart 99.
- ~~Echo/reverb~~ **Done** — `setEcho(mix, delay, decay)` / `clearEcho()`.
- ~~Positional 3D audio~~ **Done** — `setListenerPos(x,y,z)`, `playSound3D(path, x,y,z,vol,maxDist)`.

**Done (since last update):**

- ~~Stereo WAV~~ **Done**: `102-stereo-audio.js` covers stereo PCM decode and mix.
- ~~`getVoicePitch`/`getVoiceVolume`~~ **Done**: live state accessors. `99-voice-handle.js`.

All 8C items complete.

### 8D: Input Expansion

Current: keyboard, mouse, single gamepad, analog sticks, triggers, multi-port. Done:

  - `axis(side, axis [, port])` polls `RETRO_DEVICE_ANALOG` for left/right stick
    X/Y axes, normalized to -1..1. `trigger('left'|'right' [, port])` polls L2/R2,
    normalized to 0..1. Multi-port: `btn(name, port)` and `btnp(name, port)` accept
    an optional port argument (0-3) backed by `mp_buttons[4][NOVA64_BUTTON_COUNT]`
    arrays polled each frame. Harness flags: `--analog-lx N`, `--analog-ly N`,
    `--analog-rx N`, `--analog-ry N`, `--trigger-l N`, `--trigger-r N`.
    `34-analog.js` covers axis range checks and false-zero assertions.
  - `touchX([i])`, `touchY([i])`, and `touchCount()` poll
    `RETRO_DEVICE_POINTER`, with harness `--touch-x`, `--touch-y`, and
    `--touch-count` injection. `42-touch.js` covers pointer input.

All 8D items now done:

- ~~Analog sticks~~ **Done** — `axis('left'|'right', 'x'|'y' [, port])`.
- ~~Trigger axes~~ **Done** — `trigger('left'|'right' [, port])`.
- ~~Multiple controllers~~ **Done** — port arg on `btn`, `btnp`, `axis`, `trigger`.
  Harness `--port N` / `--btn name` inject joypad on any port (0–3).
  Conformance cart 97.
- ~~Controller rumble~~ **Done** — `rumble(strong, weak)` calls
  `RETRO_ENVIRONMENT_GET_RUMBLE_INTERFACE`; no-op when unavailable.

### 8E: Scripting And Runtime

Deterministic RNG done:

  - `nova64.random.seed(n)` (xorshift64), `.next()` → float [0,1),
    `.int(lo, hi)` → integer [lo, hi]. Seeding with the same value reproduces
    the same sequence. `35-rng.js` covers seed determinism and int range bounds.
    Harness `--seed N` now injects the initial RNG state before cart `init()`.
    `38-seeded-rng.js` covers seeded replay from the harness.

Multi-module package carts done:

  - QuickJS now has a package module loader for relative ES module imports.
    `.nova` mains are evaluated under their manifest path (for example
    `src/main.js`), and `import './lib/foo.js'` resolves through the staged
    package asset map. Helper modules should be listed in manifest `"assets"`.
    `37-multimodule.js` covers default and named imports from a generated
    package.

Manifest metadata done:

  - `manifest.json` `name`, `title`, `author`, `version`, and `main` are exposed
    through `nova64.meta.*()` accessors. `39-meta.js` verifies metadata from a
    generated `.nova` package.

Performance profiling done:

  - `nova64.perf.begin(label)`, `.end(label)`, `.report()`, and `.clear()` track
    lightweight per-label CPU timing. Harness `--perf` enables unload-time perf
    logging. `40-perf.js` covers timer reporting and clearing.

JS error reporting done:

  - Exceptions now log the source line for the first stack frame when the source
    is available from the active cart or staged package assets.

Still needed:

- RetroArch core info content database matching on manifest metadata fields (manual task, no code change).

### 8F: Asset Pipeline Expansion

**Done (since last update):**

- ~~PNG decode~~ **Done**: `spr()` and `createTexture()` accept `.png` assets via built-in PNG decoder (`decode_png_asset`). Sprites and textures loaded from package assets auto-detect PNG vs raw RGBA by magic bytes.
- ~~Atlas/tilesheet definitions~~ **Done**: `sprNamed(sheet, name, dx, dy)` reads sidecar JSON atlas. `32-spritesheet.js`.
- ~~Font loading~~ **Done**: `loadFont(path)` accepts glyph-sheet RGBA/PNG with optional JSON metrics. `86-bitmap-font.js`.
- ~~OGG Vorbis~~ **Done**: `stb_vorbis` auto-detected on `.ogg` assets in `playSound`/`playMusic`.
- ~~Hot reload~~ **Done**: `NOVA64_HOT_RELOAD=1`. `92-hot-reload.js`.
- ~~Asset quota~~ **Done**: `NOVA64_ASSET_QUOTA`; `nova64.assets.quota()`. `41-asset-quota.js`.

All 8F items complete.

### 8G: Storage Expansion

Namespaced storage done:

  - `nova64.storage.open(namespace)` returns an isolated sub-store with
    save/load/delete aliases and `has`, keyed under the current cart plus the
    namespace. `43-storage-namespace.js` covers namespace isolation.

**Done (since last update):**

- ~~Migration helpers~~ **Done**: `storageVersion()` / `storageSetVersion(n)` / `nova64.storage.version()`. `84-storage-cart-ids.js`.
- ~~Enumerate all carts~~ **Done**: `cartIds()` / `nova64.storage.cartIds()`. `84-storage-cart-ids.js`.

- ~~Key compression~~ **Done**: `storageSetCompressed(key, value)` / `storageGetCompressed(key, default)` /
  `storageHasCompressed(key)` — JSON + zlib deflate, 4-byte length prefix, stored in `<key>.z`.
  `nova64.storage.saveCompressed` / `loadCompressed` / `hasCompressed` namespace aliases.
  `110-storage-compressed.js` conformance cart.

All 8G items complete.

### 8H: Physics (Lightweight)

Carts that need collision currently implement their own AABB logic. A thin
built-in physics layer removes this burden without adding a heavy dependency.

**Done:**

- ~~AABB / circle colliders~~ **Done**: `createCollider('box'|'circle', ...)`, `moveAndCollide(...)`.
- ~~3D raycast~~ **Done**: `raycast(origin, direction, maxDist)`. `85-raycast.js`.

All 8H items complete.

### 8I: Platform, RetroArch Parity, And Packaging

**Done this milestone:**

- Core option expansion:
  - ~~`nova64_resolution`~~ **Done** — reads `640x360|320x180|1280x720` from
    `RETRO_ENVIRONMENT_GET_VARIABLE` and applies `RETRO_ENVIRONMENT_SET_GEOMETRY`
    on change; `retro_get_system_av_info` uses runtime `g_res_width`/`g_res_height`.
  - ~~`nova64_audio_latency`~~ **Done** — `normal|low|high` maps to a
    `RETRO_ENVIRONMENT_SET_MINIMUM_AUDIO_LATENCY` hint (0/32/128 ms).
  - ~~`nova64_developer_mode`~~ **Done** — toggles hot reload and dev console overlay.
- RetroAchievements foundation:
  - ~~`RETRO_ENVIRONMENT_SET_MEMORY_MAPS`~~ **Done** — 256-byte `g_cheevos_ram`
    exposed; JS `peek(addr)` / `poke(addr, val)` and `nova64.cheevos.*` namespace.
    Conformance cart 98.
- Platform packaging:
  - ~~`make info`~~ **Done**, ~~`make conformance`~~ **Done**,
    ~~`make harness`~~ **Done**, ~~`make release`~~ **Done** — `nova64_libretro.info`
    bundled in tar.gz.

- Real hardware GLES smoke matrix: `GLES_SMOKE_MATRIX.md` — platform/driver matrix
  with pass/fail status and known gaps (Vulkan not yet implemented, GLES 3.1
  tested via Mesa softpipe automated; real Android/RPi rows marked todo).
- Netplay compatibility: `NETPLAY_NOTES.md` — documents that `retro_serialize` is
  not yet implemented, lists all non-deterministic state sources, and gives cart
  author guidance for staying in frame-sync until save-states land.

### 8J: Developer Experience And Tooling

**Done this milestone:**

- ~~Auto-save failure PPM~~ **Done** — written to `/tmp/nova64-fail-<cart>.ppm`
  on checksum mismatch when no `--capture` path is given.
- ~~`--verbose` flag~~ **Done** — echoes each JS API call via the render command log.
- ~~`--seed N`~~ **Done** — injects deterministic RNG state before `init()`.
- ~~`run_conformance.sh --recent N`~~ **Done** — runs only the newest N carts.
- ~~`--port N` / `--btn name`~~ **Done** — injects joypad input on a specific port.
- ~~Command-log diff tooling~~ **Done** — `diff_commands.sh old.commands new.commands`.
- ~~In-cart developer console~~ **Done** — `devPrint` / `nova64.console.print`;
  12-line ring buffer overlay; toggled by `nova64_developer_mode`.
- ~~Cart migration guide~~ **Done** — `MIGRATION.md` covers all shim replacements
  and has been updated to reflect M8 additions.
- ~~Auto-generated API reference~~ **Done** — `gen_api_ref.py` emits a Markdown
  function table from `set_function()` calls in `nova64_libretro.c`.

- ~~`--frames N` conformance for all cart types~~ **Done** — optional 5th parameter
  added to `run_case`, `run_visual_case`, `run_audio_case`, and `run_gles_case`.
  Pass a frame count to any call: `run_visual_case "label" name cart checksum 10`.
  Harness already supported `--frames N`; the runners now propagate it.

Exit criteria:

- All major subsystems (3D, 2D, audio, input, physics) reach rough parity with
  the Godot/web runtimes — a cart author choosing the native core should not be
  surprised by missing APIs.
- A representative showcase cart from the browser runtime (`30-showcase.js` or
  successor) runs in RetroArch on real hardware without browser-only shims.
- Conformance covers all new API families introduced in 8A–8J.
- The RELEASE_CHECKLIST.md can be completed by someone who did not implement the
  core, with no un-documented surprises.
- Known remaining gaps (Vulkan, netplay dynamics, cheevos scripting) are tracked
  as explicit compatibility notes rather than surprises.

## Alignment Batch: Web/Godot Parity Layer

Status: **complete**. Closes the cart-portability gap so that carts written against
the web/Godot runtime can run in RetroArch with no browser-only shims.

### Compatibility Shims Added To `nova64_libretro.c`

- **`nova64.input.isKeyDown` / `isKeyPressed`** — aliases for `key()` / `keyp()`.
  Carts that destructure `{ isKeyDown } = nova64.input` now work without changes.

- **`nova64.draw.BM` constants** — string constants matching the web enum:
  `BM.NORMAL="normal"`, `BM.ALPHA="alpha"`, `BM.ADD="additive"`,
  `BM.MULTIPLY="multiply"`, `BM.SCREEN="screen"`. Also exposed as a global `BM`
  object for carts that call `setBlend2D(BM.ADD)` at the top level.

- **`nova64.fx` namespace** (JS eval shim after global registration) — maps
  web-style effect calls to existing retroarch primitives:
  - Post-processing aliases: `enableBloom(s)`, `disableBloom()`, `enableVignette(d,o)`,
    `disableVignette()`, `enableCRT(s)`, `disableCRT()`, `enableChromatic(a)`,
    `disableChromatic()`, `enableFXAA()` (no-op), `disableAll()` → all route to
    `nova64.post.*` equivalents.
  - Emitter2D bridge: `createEmitter2D(x,y,n,life)`, `burstEmitter2D(e,n)`,
    `updateEmitter2D(e,dt)`, `drawEmitter2D(e)`, `isEmitter2DDone(e)`,
    `destroyEmitter2D(e)` → bridged to `createBurst` / `triggerBurst` /
    `updateBurst` / `drawBurst` / `isBurstDone` / `destroyBurst`.
  - `setBurstColors` re-exported directly.

- **`nova64.util` namespace** (JS eval shim) — pure-JS utility layer:
  - Screen shake: `createShake`, `triggerShake`, `updateShake`, `getShakeOffset`.
  - Cooldowns: `createCooldown`, `updateCooldown`, `useCooldown`, `cooldownReady`,
    `cooldownProgress`, `createCooldownSet`, `updateCooldowns`.
  - Hit state / invulnerability: `createHitState`, `triggerHit`, `isInvulnerable`,
    `updateHitState`, `isVisible`.
  - Math helpers: `lerp`, `clamp`, `randRange`, `randInt`, `dist`, `remap`.

### Game Cart Fixes

These retroarch-only carts were broken by API mismatches and are now fixed:

| Cart | Root Cause | Fix |
|------|-----------|-----|
| `space-shooter.js` | `setLight()` undefined; `BUTTON_*` globals not exported | Replaced with `setLightDirection()`; `btn("left")` etc. |
| `neon-pinball.js` | Right flipper flips wrong direction; gap too wide; plain visuals | `rAngle = rFlip ? Math.PI+0.5 : Math.PI-0.4`; LFX/RFX moved inward; full visual rewrite with trail, combo, color-family bumpers |
| `wave-survival.js` | 2D camera API unused; no visual polish | Full rewrite: glowRect arena, glowCircle enemies, bullet streaks, direction pointer |
| `dungeon-crawler.js` | `setCamera(pos, target)` routed to 2D camera; `createCube`/`createCylinder` wrong arg forms | All `setCamera*` → `setCameraPosition`+`setCameraTarget`; fixed arg counts |

### New Retroarch Game Carts

Retroarch-native ports of existing web/Godot showcase demos:

- **`hello-3d.js`** — 6 spinning cubes + 4 bouncing spheres, orbiting camera,
  fog, directional light. Start screen, Z to begin. Seeded geometry for visual
  regression testing.

- **`particle-fireworks.js`** — Fireworks over a city skyline using `createBurst` /
  `setBurstColors` / `drawBurst`. Rising trails, multi-color palette palettes,
  seeded buildings.

- **`demoscene.js`** — **TRON ODYSSEY** (RetroArch Edition). 5 auto-advancing
  scenes (GRID AWAKENING → DATA TUNNEL → DIGITAL CITY → ENERGY CORE → THE VOID)
  using instanced meshes, torus rings, post-processing bloom, seeded deterministic
  geometry. Z to skip scenes. **Designated visual parity candidate** for
  retroarch-vs-web regression testing.

### Visual Parity Testing Plan

`demoscene.js` is the designated visual regression target. Approach:

1. Run retroarch harness: `NOVA64_GLES_TESTS=1 ./build/harness nova64_libretro.so games/demoscene.js --gles --capture out.ppm --frames 60`
2. Run web version: Playwright screenshot at `localhost:5173/console.html?demo=demoscene`
3. Compare key frames at scene transitions (frame ~60, ~300, ~600, ~900, ~1200)
4. Metric: structural similarity on HUD text, scene title, and dominant color zones
   (pixel-perfect parity is not expected — TSL materials and Three.js shaders have
   no GLES equivalents; perceptual similarity on layout and palette is the target)

### Always Use Hardware Acceleration

All testing, screenshot capture, and visual regression must use GLES:
- `NOVA64_GLES_TESTS=1` env var
- `--gles` flag to the harness
- Never use software fallback renderer for visual work

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
