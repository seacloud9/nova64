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

- Additional primitives:
  - Capsule: `createCapsule(radius, height, color, position)`.
  - Cylinder: `createCylinder(radiusTop, radiusBottom, height, color, position)`.
  - Torus: `createTorus(radius, tube, color, position)`.
  - Custom geometry: `createMesh(vertices, normals, uvs, indices, color)` for
    runtime-assembled geometry.
- Scene hierarchy and parent-child transforms:
  - `setParent(child, parent)`, `clearParent(child)`, world vs. local transform
    distinction. Required by any cart that assembles compound objects.
- Richer material model:
  - `setMeshRoughness(handle, value)` and `setMeshMetalness(handle, value)` for
    PBR-style shading in the GLES lit shader.
  - Normal map support: `setMeshNormalMap(handle, texHandle)`.
  - UV transforms: `setMeshUVOffset(handle, u, v)` and
    `setMeshUVScale(handle, u, v)`.
  - Blend modes: `setMeshBlend(handle, 'opaque'|'additive'|'multiply')`.
- Shadow maps:
  - Directional shadow map (shadow-casting and receiving already record state;
    the GLES shader needs a shadow sampler pass).
  - `setShadowQuality(resolution)` core option for performance/quality tradeoff.
- Orthographic camera:
  - `setCameraOrthographic(width, height)` / `setCameraPerspective()` toggle.
- Skybox / background:
  - `setSkyColor(top, bottom)` gradient background.
  - `setSkybox(texHandle)` cube-map skybox for environments that supply one.
- Offscreen render targets:
  - `createRenderTarget(width, height)`, `destroyRenderTarget(rt)`,
    `renderScene(rt)`, `renderTargetAsTexture(rt)`.
  - Needed for rear-view mirrors, portals, and preview thumbnails in carts.
- Instanced rendering:
  - `createInstancedMesh(geometry, count)`, `setInstanceTransform(mesh, i, mat)`
    for particle systems and tile-based 3D scenes.
- Conformance coverage for each new primitive type and shader feature.

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

Still missing:

- Full tilemap API (Godot/web parity):
  - `createTilemap(tileW, tileH, cols, rows)` — allocates a tilemap buffer.
  - `setTile(map, col, row, tileIndex)` — sets a cell.
  - `drawTilemap(map, dx, dy, tilesheetPath)` — draws using a package asset
    tilesheet. The tilesheet is an RGBA image; tile index picks the source crop.
  - `clearTilemap(map)`, `destroyTilemap(map)`.
  - Conformance: `31-tilemap.js` with a generated 4×4 tilesheet asset.
- Named sprite-sheet regions:
  - `createSpriteSheet(path, frameW, frameH)` — auto-slices a sheet into frames.
  - `sprFrame(sheet, frame, dx, dy)` — blit a single frame by index.
  - `sprNamed(sheet, name, dx, dy)` — blit by name from an atlas JSON sidecar.
  - Conformance: `32-spritesheet.js`.
- 2D camera transform:
  - `setCamera2D(x, y [, zoom [, rotation]])` — global 2D camera offset applied
    to all `pset`/`line`/`rect`/`circ`/`print`/`spr` calls.
  - `clearCamera2D()` — reset to no transform.
  - Needed by scrolling platformers and top-down RPGs.
- Blend modes for 2D:
  - `setBlend2D('normal'|'additive'|'multiply'|'screen')` — applied per-pixel in
    the software framebuffer blit path.
- Custom bitmap fonts:
  - `loadFont(path [, glyphW, glyphH])` — loads a package RGBA glyph sheet.
  - `print(text, x, y, color [, align [, font]])` — use a loaded font handle.
  - `textWidth(text, font)` — measure with a custom font.
- Palette helpers:
  - `setPalette(index, color)` — set entry in a 16-color palette.
  - `applyPaletteSwap(from, to)` — per-frame pixel-level color substitution for
    retro-style palette tricks.
- Draw-order / z-sorting for 2D sprites:
  - `spr(path, dx, dy, ..., z)` optional z depth for painter's sort.
- Conformance updates for all new 2D features.

### 8C: Audio Completion

The current audio covers procedural SFX and single-channel PCM playback. Missing:

- Streamed music:
  - `playMusic(path [, vol [, fadeIn]])` — stream a looping PCM/WAV from a
    package asset with optional fade-in time.
  - `stopMusic([fadeOut])` — stop with optional fade-out.
  - `setMusicVolume(vol)` and `pauseMusic()` / `resumeMusic()`.
  - Conformance: `33-music.js` with a generated 1-second loop.
- Multi-channel audio:
  - Named channels: `playSound(path, vol, loop, channel)` plays on a named
    channel so carts can manage sound groups (e.g. 'sfx', 'ambient').
  - `setChannelVolume(channel, vol)`, `stopChannel(channel)`.
- Audio effects:
  - Simple reverb/echo: `setReverb(mix, delay)`, `clearReverb()`.
  - Pitch shift: `setPlaybackRate(voice, rate)` for sound stretching tricks.
- Positional 3D audio:
  - `playSound3D(path, x, y, z [, maxDist])` for spatial panning based on
    camera position. Low cost: simple left/right pan from angle to listener.
- Better PCM format support:
  - OGG Vorbis decode (via stb_vorbis or minimp3): most cart audio will be OGG.
  - Stereo PCM/WAV asset playback (current path only handles mono).
- Conformance coverage for music loop, channel groups, and OGG.

### 8D: Input Expansion

Current: keyboard, mouse, single gamepad, analog sticks, triggers, multi-port. Done:

  - `axis(side, axis [, port])` polls `RETRO_DEVICE_ANALOG` for left/right stick
    X/Y axes, normalized to -1..1. `trigger('left'|'right' [, port])` polls L2/R2,
    normalized to 0..1. Multi-port: `btn(name, port)` and `btnp(name, port)` accept
    an optional port argument (0-3) backed by `mp_buttons[4][NOVA64_BUTTON_COUNT]`
    arrays polled each frame. Harness flags: `--analog-lx N`, `--analog-ly N`,
    `--analog-rx N`, `--analog-ry N`, `--trigger-l N`, `--trigger-r N`.
    `34-analog.js` covers axis range checks and false-zero assertions.

Still missing:

- Analog sticks:
  - `axis(side, axis)` → float −1..1 for `RETRO_DEVICE_ANALOG`.
    `side` is `'left'|'right'`, `axis` is `'x'|'y'`.
  - `RETRO_DEVICE_ANALOG` is device 5, index 0/1, id 0/1.
  - Conformance: `34-analog.js` with harness `--analog-lx N` injection.
- Trigger axes:
  - `trigger('left'|'right')` → float 0..1 from analog L2/R2.
- Multiple controllers:
  - Port argument to `btn`, `btnp`, `key`, `axis`: `btn('a', port)` where
    port is 0–3.
  - Harness `--port N` flag to inject input on a specific port.
- Controller rumble:
  - `rumble(strong, weak [, duration])` — calls `RETRO_ENVIRONMENT_SET_RUMBLE_INTERFACE`.
- Touch / pointer:
  - `touchX(i)`, `touchY(i)`, `touchCount()` if `RETRO_DEVICE_POINTER` is
    available; graceful degradation when not.
- Conformance updates.

### 8E: Scripting And Runtime

Deterministic RNG done:

  - `nova64.random.seed(n)` (xorshift64), `.next()` → float [0,1),
    `.int(lo, hi)` → integer [lo, hi]. Seeding with the same value reproduces
    the same sequence. `35-rng.js` covers seed determinism and int range bounds.

Still needed:

- Multi-module carts:
  - Allow a cart's `init/update/draw` module to `import` other local modules
    from the same `.nova` package via relative paths.
  - QuickJS already supports ES modules; the core needs to resolve intra-package
    module paths through the staged asset map.
- Better JS error reporting:
  - Line numbers and stack traces from QuickJS exceptions currently show internal
    bytecode offsets. Map them back to cart source lines for debuggable errors.
  - Print the errant line of source code alongside the error message.
- Deterministic RNG:
  - `nova64.random(seed)` — seeded random number generator that produces the
    same sequence on every platform. Important for procedural carts.
  - Harness `--seed N` to inject a deterministic seed for conformance.
- Cart metadata and title screens:
  - Read `manifest.json` `"title"`, `"author"`, `"version"` and expose via
    `nova64.meta.title()`, `.author()`, `.version()`.
  - RetroArch core info content database matching on these fields.
- Performance profiling:
  - `nova64.perf.begin(label)` / `.end(label)` — lightweight in-cart timer.
  - `nova64.perf.report()` — returns a snapshot of accumulated times.
  - Harness `--perf` flag to print the report after the run.

### 8F: Asset Pipeline Expansion

- PNG decode:
  - `spr()` and `createTexture()` should accept `.png` assets decoded via
    `stb_image` at load time. Currently only raw RGBA `.rgba` is supported.
  - Conformance: a `.nova` package with a PNG sprite.
- Atlas/tilesheet definitions:
  - Accept a sidecar `.json` describing named regions alongside image assets.
  - `sprNamed()` reads from this atlas rather than auto-slicing.
- Font loading:
  - Accept a `.ttf` or glyph-sheet PNG plus JSON metrics for `loadFont()`.
- Audio formats:
  - OGG Vorbis (stb_vorbis) and multi-channel WAV decode at asset-load time.
- Hot reload in development:
  - `NOVA64_HOT_RELOAD=1` env flag: re-read cart file from disk on cart reset
    so incremental edit cycles don't require a full RetroArch restart.
- Asset size limits and quota:
  - Enforce a configurable maximum total asset size to prevent OOM on constrained
    devices. Report quota via `nova64.assets.quota()`.

### 8G: Storage Expansion

- Namespaced storage:
  - `nova64.storage.open(namespace)` — opens a sub-store keyed by cart + namespace.
  - Prevents key collisions in carts that share storage between subsystems.
- Migration helpers:
  - `nova64.storage.version()` — returns the stored data-version integer.
  - `nova64.storage.setVersion(n)` — update it after a migration.
- Key compression:
  - Optionally store values as compressed JSON (LZ4 or miniz deflate) to reduce
    save-directory file sizes for large cart state.
- Enumerate all carts:
  - `nova64.storage.cartIds()` — list all cart IDs that have stored data. Useful
    for a cart hub or launcher built on top of Nova64.

### 8H: Physics (Lightweight)

Carts that need collision currently implement their own AABB logic. A thin
built-in physics layer removes this burden without adding a heavy dependency.

- AABB / circle collision helpers:
  - `createCollider(type, ...)` — 'box' or 'circle' with dimensions.
  - `moveAndCollide(collider, dx, dy, others)` — returns collision result.
  - No dynamics engine; purely kinematic. Works for platformers, top-down RPGs.
- 3D raycast:
  - `raycast(origin, direction, maxDist)` — returns hit handle, point, normal
    against scene meshes. Used for mouse picking and terrain probing.
- Conformance: `35-physics.js` with a simple AABB bounce test.

### 8I: Platform, RetroArch Parity, And Packaging

- Real hardware GLES smoke matrix:
  - Manual test log for: RetroArch GL, GLES, Vulkan video drivers on Linux/Android.
  - Confirm overlay texture compositing, post FBO, and input work in a live
    RetroArch install, not just the harness.
- Core option expansion:
  - `nova64_resolution` — 640×360, 320×180, 1280×720 options feeding
    `RETRO_ENVIRONMENT_SET_GEOMETRY`.
  - `nova64_audio_latency` — control the audio batch size for low-latency vs.
    stable audio.
  - `nova64_developer_mode` — enables hot reload and perf overlay.
- Netplay compatibility:
  - Review which cart-facing state is non-deterministic (audio RNG, time sources).
  - Mark all harness-injectable inputs as the sole source of non-determinism.
  - Document save-state coverage so netplay rollback knows what it controls.
- RetroAchievements (cheevos) foundation:
  - Expose memory map via `RETRO_ENVIRONMENT_SET_MEMORY_MAPS` so achievement
    scripts can watch cart-accessible storage fields.
- Platform packaging:
  - `retroarch/nova64_libretro.info` is done. Add makefile target `make info`.
  - Document build steps for Linux, Windows (WSL), and macOS (native clang).
  - CI-friendly single-command test: `make -C retroarch conformance`.
  - Reproducible release archive: `make -C retroarch release` produces
    `nova64_libretro.so` + `nova64_libretro.info` + README in a tar.gz.

### 8J: Developer Experience And Tooling

- Harness improvements (first pass done):
  - Auto-save failure PPM at `/tmp/nova64-fail-<cart>.ppm` on checksum mismatch.
  - Print frame dimensions in the summary line.
  - `--verbose` flag: echo each JS API call through the render command log path.
  - `--seed N`: inject deterministic RNG seed.
  - `--port N`: inject input on a specific controller port.
  - `--frames N`: already done; confirm it works for all cart types.
- Command-log diff tooling:
  - `retroarch/tests/diff_commands.sh old.commands new.commands` — line-by-line
    diff with friendly field names instead of raw hex.
- In-cart developer console:
  - `nova64.console.print(text)` — writes to a small on-screen debug overlay
    toggled by `nova64_developer_mode`. Does not corrupt the game framebuffer.
- Cart migration guide:
  - `retroarch/MIGRATION.md` — step-by-step guide for porting a browser/Godot
    cart to a `.nova` package, including shim replacements for `window`,
    `THREE`, `BABYLON`, and async patterns.
- Auto-generated API reference:
  - A script that reads the JS binding registrations from `nova64_libretro.c`
    and emits a Markdown function reference table.

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
