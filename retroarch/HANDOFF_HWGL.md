# Nova64 Hardware GL on Windows — Status & Handover

**Last updated:** 2026-05-25 (Claude pass — WAD texture pipeline)
**Branch:** `main`
**Working tree:** clean after this commit (WAD textures + face-UV cube shader)
**Windows DLL deployed:** fresh; cross-built and copied to `C:\RetroArch-Win64\cores\nova64_libretro.dll`

---

## 🤝 HANDOFF FOR CODEX — 2026-05-26 (Claude WAD texture pool bump)

User report after commit `3119cd4` (correct colours + alpha-test): walls
and HUD were correct, but enemies and items still rendered as **grey
squares** with no visible texture or alpha cutout.

### Root cause: 64-slot texture pool was too small for WAD content

`NOVA64_MAX_TEXTURES = 64`. The texture upload path is:

1. `engine.createDataTexture(pixels, w, h)` →
   `nova64.scene.createDataTexture` →
   `js_create_data_texture` →
   `allocate_texture()` returns `0` when the pool is full.
2. When C returns 0, the WAD bundle's IIFE stub falls back to its
   placeholder object `{__wadStubTex: true, ...}`.
3. `engine.setMeshMaterial(sprite, {map: placeholder, ...})` sees
   `typeof mat.map === 'object'`, the `hasTex` branch is skipped, and
   no texture is bound. Plane renders as the cart's default fill
   colour, lit by ambient — i.e. a grey square.

E1M1's WAD compositor produces 60+ unique wall textures before
enemies/pickups even spawn. By the time `getSpriteTexture` ran, every
texture slot was already taken; every sprite call returned `0`. With
many wall textures also competing, walls past the first ~60 also lost
their textures, which is why the previous capture showed only crude
shading instead of brick patterns.

Bumped `NOVA64_MAX_TEXTURES` from 64 → 512. Static footprint grows by
~32 KB (`sizeof(nova64_texture)` ~64 × 448 new slots). Covers the
largest FreeDoom maps with sprites + atlases + flats + transient effect
textures comfortably.

### After the fix

The same capture frame (player start, `--press 30=enter`, 80 frames)
now shows:

- **Detailed wall textures** — proper STARTAN gray brick patterns with
  visible mortar / concrete detail.
- **Architectural depth** — the doorway shows lighter ceiling
  recesses, brown floor accents at the sides.
- **HUD intact** — green HP100 bar, yellow AMMO 50, orange E1M1 |
  SCORE: 0 banner, crosshair, gun model.

Enemies/items aren't in this view (typical of E1M1's first room), but
the sprite plane → texture handle → setMeshTexture → alpha-test
pipeline is now end-to-end functional (verified earlier with the
diamond test cart).

### Conformance

Software 0-32 + GLES 0-99 pass unchanged. The pool grows uniformly,
so existing carts that allocate ≤ 64 textures are bit-identical.

### Commit

```
PENDING fix(retroarch): bump texture pool 64 → 512 for WAD-scale carts
```

---

## 🤝 HANDOFF FOR CODEX — 2026-05-26 (Claude WAD colour + alpha-test)

User report after the previous pass: "less teal more green, still doesn't
match web; enemies and items are squares". Two real bugs were stacked.

### Root cause: 24-bit colour literals were being read as cyan

nova64's native colour encoding is `0xRRGGBBAA`. wad-demo (and the rest
of the Three-ecosystem cart corpus) writes colour as `0xRRGGBB` literals
— so `0xffffff` was unpacked as `(R=0, G=255, B=255, A=255)` = **pure
cyan**. Every wall, every mesh, every light colour the cart passed was
secretly cyan, and the entire scene read as a teal wash.

There's an existing `nova64.post.use24BitColors(true)` flag that
promotes `0xRRGGBB → 0xRRGGBBFF` on the way through `color_from_js`,
but it can't distinguish a Three-style literal from an `rgba8()` output
that happens to have `R=0` (e.g. the green HUD bar at
`rgba8(0, 255, 100, 255)`). The previous pass tried the global flag and
the HUD turned magenta.

The fix is surgical: the WAD bundle wraps the 3D-scene colour-accepting
functions (`createCube`/`createSphere`/`createPlane`/`createCone`/
`createCylinder`/`createTorus`/`createCapsule`, plus `setMeshColor`,
`createPointLight`, `setFog`) and promotes any value `0x000000..0xFFFFFF`
to `value << 8 | 0xFF` before it reaches C. The 2D draw functions (which
take packed `rgba8()` results) keep the old interpretation, so the HUD
stays correctly green/yellow/red.

The bundle's earlier ambient/directional neutralisation also had to be
fixed — passing `0xb0b0b0` to the C lighting setter unpacked as cyan
ambient (which had been re-tinting everything teal). Now passes the
fully-qualified `0xb0b0b0ff` / `0xffffffff`.

### Alpha-test for Doom sprite cutouts

Doom sprites have `alpha=0` for transparent background pixels. Without
discard, those pixels rendered as opaque (showing whatever lit colour
the shader produced) → sprites appeared as opaque rectangles around
the actual painted shape.

New per-mesh `alpha_test` field + `u_alpha_test` uniform in the cube
shader. When non-zero, the fragment shader discards any sampled
texel whose alpha is below the threshold. Wired through new
`nova64.scene.setMeshAlphaTest(handle, threshold)` JS API; the
compat layer's `engine.setMeshMaterial` opts the mesh in whenever
`mat.alphaTest > 0` or `mat.transparent` is true. Default off so
no conformance baseline shifts.

### Visibility setter (carried over from the previous pass)

The earlier `getMesh(handle).visible = false` fix is still in place —
without it the cyan emissive cube placeholder under each sprite stayed
visible. The new pass keeps that fix; combined with alpha-test + correct
colours, enemies/pickups should render as proper Doom sprite cutouts.

### Conformance

Software 0-32 + GLES 0-99 pass unchanged. The alpha-test path is
opt-in per mesh (default 0.0) and the colour promotion is scoped to
the WAD bundle, so no existing conformance baseline shifts.

### Commit

```
PENDING fix(retroarch): wad-demo correct colours + sprite alpha cutout
```

---

## 🤝 HANDOFF FOR CODEX — 2026-05-25 (Claude WAD teal + sprites)

User report: "it is teal way too teal solve that issue also items and
enemies are not being rendered properly". Three more wad-demo issues
debugged + fixed.

### 1. Enemy/pickup cube placeholders never hid

`spawnEnemy` / `spawnPickupAt` build a coloured cube first, then if a
WAD sprite lookup succeeds they hide the cube with
`nova64.scene.getMesh(handle).visible = false`. The compat layer's
`createCube` returns a `wrap()` object (`__meshHandle:int, position,
rotation, …`) so the cart can treat it as a Three Object3D. That
wrap was inert — setting `.visible` just modified a JS field. So
every enemy/pickup kept an emissive cyan cube glowing at its
position on top of the sprite, and the scene filled with cyan-glow
boxes. Wired the wrap's `visible` property through `Object.defineProperty`
so its setter calls `nova64.scene.setMeshVisible(handle, value)` in
C — cubes now actually hide.

### 2. `engine.setMeshMaterial` double-darkened textured walls

WAD walls pass `mat.color = engine.createColor(bri, bri, bri)` where
`bri` is the WAD sector's 0..1 light level. My compat packed that
into 0x7F7F7F and called `setMeshColor`, then the shader multiplied
that 50% grey by the (already-dim Doom palette) texture — and the
result blends into the tinted ambient as a uniform teal-ish smear.
`setMeshMaterial` now skips the colour multiplier whenever a real
texture is bound and lets the texture render at full brightness;
the engine's lighting still does sector dimming via the directional
+ ambient lights. Solid-coloured fallback walls (no texture) keep
the old colour path so they still tint correctly.

### 3. WAD bundle now neutralises the cart's blue tint

The cart's `init()` sets `setAmbientLight(0x334466, 0.4)` (blue-purple)
and `setDirectionalLight(…, 0xaabbdd, 0.8)` (light-blue). On the web
Three.js renderer with its built-in tone mapping that reads as
atmospheric haze; in RA it multiplies straight onto the cyan accent
walls and pushes the whole scene toward teal. The WAD bundle patches
`nova64.light.setAmbientLight` / `setDirectionalLight` so any colour
the cart passes is replaced with neutral grey/white (intensity
preserved), and re-applies the neutral values once. Also calls
`nova64.post.setSaturation(0.7)` to dial back the overall colour
intensity without changing per-pixel hue identity — the cyan accent
walls now read as muted blue-grey instead of overpowering teal.

### Conformance

Software 0-32 + GLES 0-99 both pass with no rebaselines. All three
changes are opt-in (visible setter only fires when a cart sets
`mesh.visible = false`; the lighting/saturation overrides live only
in the WAD bundle; texture-vs-color branch in setMeshMaterial only
diverges when both a color AND a texture are passed).

### Commit

```
c19e14d fix(retroarch): wad-demo teal wash + sprite/cube visibility
```

---

## 🤝 HANDOFF FOR CODEX — 2026-05-25 (Claude WAD texture pipeline)

User report: WAD demo loads + plays after the previous freeze-fix commit
(`8b59683`), but walls render as solid teal blocks instead of WAD wall
textures. Investigated end-to-end and shipped a real GPU texture pipeline
plus a one-line cube shader fix that unblocks every cube-with-texture use
case in the codebase.

### What was missing

1. **No data-texture API in C.** `js_create_texture` only loaded from a
   `.nova` package asset path. WAD textures are composited at runtime
   from palette + patch data in pure JS — no asset path. Added
   `js_create_data_texture(pixels, w, h, opts)` that accepts a
   `Uint8Array` (or `ArrayBuffer`) of RGBA bytes and uploads to GLES
   via `gles.TexImage2D`. Returns an integer handle compatible with
   `setMeshTexture`. Wraps `GL_REPEAT` by default for wall tiling.
2. **Engine adapter stubs were one-line no-ops.** The bundled
   `wad.js` IIFE used `__wad_engine_stub.createDataTexture` that just
   returned `{__wadStubTex:true}` — placeholder objects that the cart
   stored as "texture handles" but no GL upload ever happened. Now the
   stub forwards into `nova64.scene.createDataTexture`, returning the
   real handle.
3. **`engine.setMeshMaterial` never bound textures.** My earlier compat
   only copied the material color onto the mesh. Extended it: when
   `mat.map` is a numeric texture handle, calls `setMeshTexture` AND
   opts the mesh into per-face UVs (see #4).
4. **🔥 Root cause of "blue walls": cube shader's auto-UV was
   degenerate on side faces.** The vertex shader was computing
   `v_uv = (a_position.xz + 0.5) * u_uv_scale + u_uv_offset`. For top/
   bottom faces (normal aligned with Y), xz spans the face fine. For
   the X- or Z-perpendicular faces (which is what you see on a wall),
   one of x/z is constant — so the U sample is a single texture column
   stretched vertically across the whole wall. Tiled patterns vanish
   into one band of color. Added an opt-in path: when
   `setMeshFaceUVs(mesh, true)` is called, the shader picks the 2D
   plane perpendicular to the local normal and samples the texture
   correctly. Default off so every conformance baseline stays
   identical; `engine.setMeshMaterial` flips it on per-mesh when
   binding a real texture.
5. **`setWallUVs` was a no-op in RA.** Upstream `runtime/wad.js`
   pokes Three.js `BufferAttribute.setXY` fields that don't exist on
   the RA mesh stub. Wall textures used to render at the default
   `(0..1, 0..1)` UV range (one tile stretched across the whole wall)
   even if a texture was bound. The WAD bundle now monkey-patches
   `nova64.data.setWallUVs` after `wadApi().exposeTo()` so the same
   `tileU = doomLen / texW` math flows into `setMeshUVScale` /
   `setMeshUVOffset` on the RA side. Web is untouched.

### Verified

- **Isolated brick-wall test cart** renders a 32×32 brick texture
  tiling 4× across an 8-unit-long wall with the correct pattern on
  the side face. (`/tmp/test_wall_tex.js`)
- **WAD demo end-to-end** still loads E1M1 cleanly, walks through the
  level for 150 frames without exceptions, and HUD remains clean.
  Note: the player-start view in E1M1 is dominated by the cart's
  designed-in emissive accent walls (`i % 4 === 0 || w.step` branch)
  which by design render solid color regardless of texture binding.
  To verify textures visually in real RetroArch, move the player
  into a textured corridor (WAD walls with valid `texName` lookups).
- **Conformance:** software batches 0-32, 33-65, 66-99 + GLES 0-99
  all pass with no baseline drift (face-UV is opt-in per mesh).

### New / changed C APIs

- `nova64.scene.createDataTexture(pixelsUint8Array, w, h, opts)` →
  integer texture handle (or 0 on failure). `opts.filter`
  `'nearest'|'linear'`, `opts.wrap` `'repeat'|'clamp'`.
- `nova64.scene.setMeshFaceUVs(meshId, on)` — switches per-mesh to
  the correct box-mapping UV calc (normal-aware).
- `engine.setMeshMaterial` (compat layer) now forwards `mat.map`
  to `setMeshTexture` and opts the mesh into face-UVs.

### Known-good baselines (no changes)

- Cart 21 GLES `90acde686e82075e`
- gles-post-color-grade `027ee4f023ff3ed9`
- gles-overlay-orientation `c69230c1869b0db3`
- Cart 21 software `db290147bd8f8c0b`

---

## 🤝 HANDOFF FOR CODEX — 2026-05-25 (Claude third pass)

Picked up after my own `f90e74c`/`24e7be2`. User reported four issues from real
RetroArch play + asked for visual parity to continue. All four fixed plus a
30-cart sweep that surfaced three more compat gaps, also fixed.

### 1. Space Harrier "horizontal mirror" in the sky → bloom threshold (`8d3593a`)

The hand-tuned RA port called `nova64.post.setBloom(0.38)` without a
threshold. RA's default threshold is `0.32` — far below Three.js's `0.85`
convention. The mid-luma green checker floor was contributing to the highest
bloom mips, whose wide blur smeared it across the screen as a faint
"floor reflection" in the sky region. Fixed by passing the web cart's exact
triple at all four call sites: `setBloom(0.38, 0.22, 0.78)`. Comment block
in the cart documents the trap so future ports don't repeat it.

**Important pattern:** any cart that calls `setBloom(strength)` only will
inherit the same bug. The fix is per-cart for now, but a follow-up could
raise the global default threshold to `0.85` (would rebaseline ~5
conformance carts using bloom without explicit threshold: 21, 716, 728,
gles-overlay-orientation, gles-post-color-grade).

### 2. TSL cart (and any keyboard-only web cart) ignored gamepad presses (`8d3593a`)

`js_key` / `js_keyp` only checked the keyboard table. Added a small
key→joypad fallback map:

- Arrow keys → joypad d-pad buttons
- Space / Enter → ANY of the four face buttons (B, A, Y, X)

So `keyp('Space')`, `keyp('Enter')`, and `keyp('ArrowLeft/Right/Up/Down')`
now also fire on the corresponding gamepad presses. Conformance unaffected
because joypads aren't pressed by default in the harness.

### 3. WAD demo runs in RetroArch with FreeDoom bundled (`8d3593a`)

Three changes together:

- **`fetch()` shim upgraded.** Now tries `.nova` package assets first via
  `readAssetBytes`. Paths like `/assets/foo.wad`, `assets/foo.wad`, and
  `foo.wad` all resolve via prefix strips. Any cart that fetches a
  packaged asset works unmodified. Returns a real Response-shaped object
  with `arrayBuffer()` / `text()` / `json()` / `blob()` / `bytes()`.
- **Default asset quota raised 16 → 64 MiB** so a 29 MB WAD fits without
  the user needing to set `NOVA64_ASSET_QUOTA`.
- **New build script** `retroarch/tools/build_wad_nova.py` packs
  `runtime/wad.js` (with engine-adapter texture stubs) into the .nova
  alongside the cart and `freedoom1.wad`. `WADLoader`, `WADTextureManager`,
  `convertWADMap`, `setWallUVs` are auto-exposed on `nova64.data` before
  `code.js` runs. Loading `retroarch/games/wad-demo.nova` reports
  `963 wall, 240 flats, 853 sprites`.

### 4. vox-viewer loads real .vox models, not placeholder cubes (`8d3593a`)

Replaced the `loadVoxModel` compat stub with a minimal MagicaVoxel parser.
Walks SIZE + XYZI + RGBA chunks and builds an instanced cube mesh — one
cube per voxel, colored from the palette (defaults to MagicaVoxel's
standard palette when the RGBA chunk is absent). Falls back to the old
placeholder cube on parse failure. Bundled `retroarch/games/vox-viewer.nova`
includes `house.vox` at the path the cart expects.

### 5. Visual sweep surfaced three more compat gaps (`75f8f43`)

Ran 30 medium/large web carts (crystal-cathedral-3d, cyberpunk-city-3d,
f-zero-nova-3d, super-plumber-64, star-fox-nova-3d, ...) for 60 frames in
GLES. Three carts crashed with `TypeError: not a function`:

- **wizardry-3d:** `sparkPool.kill(s)` and `nova64.draw.setCamera(0,0)`.
  Added `kill / spawn / clear` to the pool augment shim. Registered
  `setCamera` / `clearCamera` aliases for the existing 2D helpers.
- **blend-aurora:** `ctx.createLinearGradient` inside `withBlend(...)`.
  `withBlend` now passes a synthetic Canvas-2D adapter that maps fillRect
  / strokeRect / fillText to nova64.draw primitives. Includes a CSS
  color-string parser (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()`,
  `hsla()`) so cards/aurora carts that compose colors as CSS strings
  render with the right hue. Gradients reduce to the middle color stop.
- **stage-cards:** `ctx.roundRect` inside a `createGraphicsNode` callback.
  Extended the stage stub ctx with `roundRect`, `arcTo`, `ellipse`,
  `setLineDash`, all three `create*Gradient` factories, `getImageData /
  putImageData / createImageData`, and the shadow* / textAlign / font
  properties as no-op fields. Cart now renders (geometry approximated by
  plain rectfill) instead of dead-ending.

Final sweep result: **0 JS exceptions across 30 carts.**

### 6. Conformance + Windows DLL

- Cart 21 software `db290147bd8f8c0b`, GLES `b9a78c64ab0a6ab8` — unchanged.
- Full batches 0-35 pass.
- Windows DLL cross-built and redeployed at `75f8f43`.

### Commits this pass (most recent first)

```
75f8f43 feat(retroarch): close 4 web-cart compat gaps surfaced by visual sweep
8d3593a feat(retroarch): four user-reported fixes + bundled WAD/vox carts
```

---

## What to do next — backlog (Claude third pass)

1. **Raise global default bloom threshold from 0.32 → 0.85.** Would rebaseline
   5 conformance carts (21, 716, 728, gles-overlay-orientation,
   gles-post-color-grade) but fix the "sky reflection" bug for every cart that
   calls `setBloom(strength)` only. Without this, every new cart inherits the
   trap unless the cart author knows to pass a threshold.

2. **Visual parity capture of the 30 swept carts.** They all run; nobody has
   compared frame-by-frame to the web reference yet. Use the existing
   `space_harrier_visual_parity.mjs` harness as a template — point it at any
   of the carts and capture browser vs RA side-by-sides. Expect issues with
   carts that use canvas-2D heavily (blend-aurora, stage-cards) because the
   adapter is approximate, not pixel-perfect.

3. **Port Three's separable Gaussian blur to the bloom downsample chain.**
   Still open from earlier handoffs. Source at
   `node_modules/.pnpm/three@0.182.0/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js:379`.

4. **Real WAD texture pipeline.** The WAD parser currently uses a texture
   stub that returns opaque handles but doesn't actually upload pixels to
   GLES. Walls render as solid colors. Wiring `engine.createDataTexture`
   into the libretro texture API would make Doom levels look like Doom.

5. **Add an edge-region-only sharpness metric to space_harrier_visual_parity.mjs.**
   Still open. CAS path is penalized by the whole-image gradient-average.

---

## Don't redo (Claude third pass)

- **Adding `setBloom(0.38)` without a threshold.** Defaults to 0.32 → wide
  bloom mip bleed → sky reflection bug. Always pass the full triple.

- **Stripping out the gradient/CSS-color parsing.** It looks like a lot of
  shim code, but every web cart that draws gradients through nova64.draw
  hits it. Keep the regex set even if it feels heavy.

---

---

## 🤝 HANDOFF FOR CODEX — 2026-05-25 (Claude second pass)

Picked up after Codex's `83a4b69` (plane contract + shading style + bloom default
= three). This pass focused on the user's three asks: API gaps, more games, and
conformance. All three landed cleanly.

### 1. Found and fixed a runtime regression — `rgba8` returning BigInt

Conformance carts `597-reflect-trigger-color` and `792-color-ramp` were silently
failing to compile/load with `TypeError: BigInt operands are forbidden for >>>`.
Root cause: my earlier commit `b0aea9d6` incidentally switched `js_rgba8` from
`JS_NewUint32` to `JS_NewBigUint64`. Bitwise unsigned-right-shift on a BigInt is
forbidden per ECMAScript. Reverted to `JS_NewUint32` (full 0..0xffffffff range
represented correctly as a regular Number). Both carts execute again.

### 2. Finished the paused conformance refresh (clean across 0-999)

Wrote two Python scanners (kept in `/tmp/find_drift.py` and
`/tmp/find_cmdlog_drift.py`, throwaway) that iterate every `run_visual_case`,
`run_command_log_case`, and `run_gles_case` row and report drifts. After the
`rgba8` revert + Codex's shading change, rebaselined:

- 13 software visual checksums (16, 70-77 sans 75, 237, 244, 487, 535, 692, 703)
- 4 command-log hashes (06 vulkan12, 09, 10, 14, 16, 22)
- 18 GLES checksums (06, 09, 10, 18, 45, 50, 59, 62, 66, 103, 107, plus 7 gles-*)

Cart 16 is no longer non-deterministic — stable at `54a1c87d41f0e652`. Cart 30
(`30-showcase`) remains non-deterministic in the showcase keypress path,
baseline unchanged.

Full validation passes:

```bash
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 0 --to 35
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 36 --to 99
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 100 --to 200
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 201 --to 500
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 501 --to 999
```

### 3. No API gaps for web carts — all 51 unported ones load

Probed every unported `examples/*/code.js` cart (minus the documented
XR/Babylon/NFT skip list) through the harness. Every single one of the 51 loaded
with no JS runtime errors. So the gap between "play any web cart in RetroArch"
and current state is NOT a missing API surface — it's that `games.lpl` didn't
know those paths.

### 4. Playlist refresh now imports web examples too (21 → 86 entries)

Extended `retroarch/tools/refresh_windows_imports.py` (`pnpm run
retroarch:refresh:windows`) to also scan `examples/*/code.js` and add each as a
playlist item. Web carts that have a hand-tuned RA sibling under the same slug
get a `[web]` suffix in the label (e.g. `demoscene` vs `demoscene [web]`). New
`--no-web` flag preserves the old retroarch/games-only behavior.

The `WEB_SKIP` set inside the tool is the canonical "not playable in RA" list
(XR/Babylon/NFT). Add to it when triaging new web carts.

### Commits this pass (most recent first)

```
f90e74c feat(retroarch): playlist refresh imports web examples/*/code.js too
ee0cf0c fix(retroarch): revert rgba8 BigUint64 + rebaseline carts shifted by Codex shading
```

Both built clean, Windows DLL deployed.

---

## What to do next — prioritized backlog (Claude second pass)

1. **Visual parity sweep of the newly-playable web carts.** Loading clean
   != rendering correctly. Pick a few high-value ones (`crystal-cathedral-3d`,
   `cyberpunk-city-3d`, `f-zero-nova-3d`, `super-plumber-64`,
   `star-fox-nova-3d`) and capture browser vs RA side-by-sides. The
   shading-style + bloom-style + sharp-style stack is now Three-aligned by
   default, so many should be close out of the box.

2. **Add an edge-region-only sharpness metric to `space_harrier_visual_parity.mjs`.**
   Still open from the earlier handoff. Current `sharpnessScore` (line 360) is
   whole-image gradient-average, which penalizes CAS because cleaner flats
   lower the metric even when edges go crisper.

3. **Port Three's separable Gaussian blur to the bloom downsample chain.**
   The composite is Three's UnrealBloomPass but the per-mip blur kernels are
   still RA's older ones. Three uses radii `[6, 10, 14, 18, 22]` with
   `0.39894 * exp(-0.5 * i² / σ²) / σ` where `σ = radius / 3`. Source at
   `node_modules/.pnpm/three@0.182.0/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js:379`.

4. **Fix the pre/post-bloom asymmetry in the classic unsharp.** Same fix the
   CAS branch already has — sample bloom mips at neighbor positions so the
   classic unsharp also sees post-bloom contrast. Will rebaseline carts that
   use bloom + sharpness in the classic path.

5. **Tackle the Space Harrier port-cart guard.** Hand-tuned RA port still
   has bespoke palette differences; re-run with `--guard=ra` after the
   web-cart sweep.

---

## Don't redo (Claude second pass additions)

- **Switching `js_rgba8` to `BigUint64`.** Carts use `(rgba8() >>> 8)` for
  channel extraction; BigInt forbids `>>>`. Must stay `JS_NewUint32`.

- **Cart 16 / cart 30 "nondeterministic" notes.** Cart 16 is now stable;
  remove the warning from any docs you read. Cart 30 IS still
  nondeterministic in the showcase keypress path.

---

## Codex continuation — 2026-05-25

Picked up from Claude's CAS/bloom/cart-port handoff. This pass focused on the
user's two latest requests: `setBloomStyle` should default to `three`, and the
GLES render path should look less dull than the web reference.

- `nova64.post.setBloomStyle()` now defaults/resets to `three`; `classic`
  remains available for the older normalized-mip bloom composite.
- Added `setShadingStyle('classic'|'three')` as a global API plus
  `nova64.light.setShadingStyle()` and `nova64.scene.setShadingStyle()`.
  The `three` style opens the compressed diffuse ramp and adds a cool sky /
  neutral ground fill inspired by the web renderer's AmbientLight +
  HemisphereLight setup.
- Web-compat `nova64.fx.enableBloom()` now opts into `setShadingStyle('three')`,
  CAS sharpening, `setSharpness(1.90)`, and a red/blue-friendly
  `setColorGrade(1.12, 0.98, 1.08)`.
- CAS anti-ringing now has a small contrast-scaled margin around the local
  min/max envelope. This keeps flat regions bounded while allowing real edge
  lift instead of pinning every bright edge back to the center sample.
- `64-directional-light.js` now covers `setShadingStyle`; conformance baselines
  were updated for that intentional visual/API change.

Focused validation passed:

```bash
make -C retroarch clean all harness
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 17 --to 22
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 64 --to 64
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-shading-grade --port=5178
make -C retroarch platform=win-cross clean all
cp retroarch/nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/nova64_libretro.dll
make -C retroarch clean all harness
```

Current focused checksums:

- `21-post-effects`: software `db290147bd8f8c0b`, GLES `b9a78c64ab0a6ab8`
- `64-directional-light`: software `cfff60f8dafc45cd`, GLES `57f8d371260efd0c`

Space Harrier web-cart smoke after the tune: average `90.9`, start `95.7`,
gameplay `86.1`, gameplay sharpness ratio `52.4%`. Remaining gap: gameplay
field color is still too dark/green and too saturated versus browser
(`ra rgb(48,110,70)` vs `web rgb(95,125,101)`).

MemPalace note: `pnpm run mempalace:wake` succeeded, but quarantined two HNSW
segments for drift/integrity failure before returning project context.

### Immediate follow-up: camera/horizon/detail fix — 2026-05-25

User reported that the RetroArch Space Harrier camera/horizon looked smushed,
dull, and far less detailed than the web renderer. The root cause was not the
camera math: RetroArch's `createPlane` primitive used an X/Z local plane, while
Three.js `PlaneGeometry` is an X/Y local plane with a +Z normal. Web carts,
including `examples/space-harrier-3d`, correctly call
`rotateMesh(plane, -Math.PI / 2, 0, 0)` to turn that X/Y plane into ground.
Because the RetroArch primitive was already horizontal, the same cart rotation
made checkerboard floor tiles vertical in RetroArch, producing the apparent
horizon drop-off and loss of detail.

Implemented fix:

- `retroarch/nova64_libretro.c`
  - GLES plane vertices are now X/Y local-space with +Z normals, matching
    Three.js.
  - Software plane corners now use the same X/Y contract.
  - `createPlane(width, height, ...)` now stores width in `scale[0]`, height in
    `scale[1]`, and leaves `scale[2]` at `1.0`.
- Existing RetroArch conformance carts that intended horizontal floor planes
  now explicitly rotate their planes by `-Math.PI / 2`, preserving the expected
  scene while testing the web-compatible contract:
  `07`, `09`, `10`, `14`, `15`, `18`, `22`, and `30`.
- Space Harrier hand port already had the web-style rotation, so it benefits
  directly from the primitive fix.

Measured impact from fresh captures:

```text
Before plane fix, web cart on RetroArch:
  average 90.9, start 95.7, play 86.1
  play sharpness ratio 52.7%
  play avg web rgb(95,125,101), RA rgb(48,110,70)

After plane fix, web cart on RetroArch:
  average 94.4, start 95.6, play 93.2
  play sharpness ratio 100.6%
  play avg web rgb(96,125,101), RA rgb(99,138,105)

After plane fix, hand port on RetroArch:
  average 92.2, start 93.1, play 91.3
```

Validation so far:

```bash
make -C retroarch clean all harness
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-plane-fix --port=5178
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-plane-fix --port=5178
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 7 --to 10
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 14 --to 22
```

Conformance status at handoff:

- `07`/`09`/`10` visual checksums stayed stable after adding explicit plane
  rotations.
- `09-overlay-scene` command-log hash needs updating for the new `rotateMesh`
  call. Observed actual hash: `5123bffc8a1ea64d55a906b0cf8f6ff66c46c211d507846b6c931dc214f4cf8c`.
- `14-plane-dimensions` visual checksum stayed stable.
- `15-primitive-args` now intentionally renders differently with the true
  Three-style plane contract. Observed software checksum:
  `d4051e86578b1be1`; continue the conformance refresh from there.
- Still need to finish/record command-log hashes for `14`, `15`, `18`, and
  `22`, plus any visual baselines changed by the X/Y plane contract.
- Still need cross-build + copy
  `retroarch/nova64_libretro.dll` to
  `C:\RetroArch-Win64\cores\nova64_libretro.dll`.

### Mesh shade contrast checkpoint — 2026-05-25

Added `setMeshShadeContrast(handle, value)` to deepen or flatten normal-based
lighting falloff per mesh without changing base color. This was added while
investigating washed-out tree tops/bottoms in RetroArch versus Three.js.

- New mesh field: `shadeContrast` (`1.0` neutral, clamp range `0.0..4.0`).
- Exposed as global `setMeshShadeContrast` and
  `nova64.scene.setMeshShadeContrast`.
- `getMesh()` now reports `shadeContrast`.
- `getBackendCapabilities()` now reports `meshShadeContrast: true`.
- GLES cube/primitive shader applies contrast around diffuse `0.5` before the
  material lighting ramp.
- Space Harrier hand-port tree leaves now remove the old emissive crutch and
  use lower roughness plus `setMeshShadeContrast(top, 1.85)`.

Focused validation passed before the plane fix:

```bash
make -C retroarch clean all harness
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 49 --to 49
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 65 --to 65
```

---

## 🤝 HANDOFF FOR CODEX — 2026-05-25 (late)

Picked up immediately after Codex's film-grain checkpoint (`0136411`), shipped
7 commits, now passing back. The work splits into three threads:

### 1. Codex's pending temperature work — committed clean

`3e31a88 feat(retroarch): add temperature post effect` — this was sitting
uncommitted on the working tree, fully wired with the predicted checksums
(`db290147bd8f8c0b` software / `16ebe9e50b3e1ec3` GLES). Validated and shipped.

### 2. New opt-in post APIs (all default-off so existing checksums hold)

| API | Style key | Where added | Web compat opt-in? |
|---|---|---|---|
| `nova64.post.setVibrance(amount)` | `vibrance` (float -2..2) | `5c39b08` | ❌ (regressed Space Harrier — see "Don't redo" below) |
| `nova64.post.setBloomStyle(s)` | `'classic'` / `'three'` | `8f49866` + Codex continuation | ✅ default/reset is now `'three'` |
| `nova64.post.setSharpStyle(s)` | `'unsharp'` / `'cas'` | `4f96791` + Codex continuation | ✅ `enableBloom` auto-sets `'cas'` + bumps sharpness 0.95 → 1.90 |
| `nova64.light.setShadingStyle(s)` | `'classic'` / `'three'` | Codex continuation | ✅ `enableBloom` auto-sets `'three'` |

Plus three smoke-test cart ports (`26faf22`: `hello-namespaced`, `test-font`,
`test-minimal`) and a one-cart bug fix (`c0faf6a`: hide enemy wing cubes in
`space-harrier-3d`).

### 3. Mined web-renderer code per user direction

User asked for "copy more of the web code over" and "GLES should be better
than WebGL". Ported two algorithms verbatim from `three/examples/jsm/`:

- **Three.js `UnrealBloomPass` composite** — `lerpBloomFactor(f) = mix(f, 1.2 - f, bloomRadius)` against per-mip factors `[1.0, 0.8, 0.6, 0.4, 0.2]`, 3.0 backwards-compat scale. Lives behind `u_bloom_style == 1` in the post fragment shader.
- **AMD CAS-spirit contrast-adaptive sharpening** — per-pixel luma-gradient gate with 0.25 floor + sqrt ramp, anti-ringing clamp bounded by source min/max (including center), bloom-aware neighbor sampling so the gate sees post-bloom contrast. Lives behind `u_sharp_style == 1`.

---

## What to do next — prioritized backlog

1. **Finish the plane-contract conformance refresh.** Continue from the paused
   `NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 14 --to 22`
   run. Known actuals so far: `15-primitive-args` software checksum
   `d4051e86578b1be1`; `09-overlay-scene` command-log hash
   `5123bffc8a1ea64d55a906b0cf8f6ff66c46c211d507846b6c931dc214f4cf8c`.
   Re-run and record any remaining visual/GLES/command-log changes for
   `14`, `15`, `18`, `22`, and `30`.

2. **Cross-build and redeploy the Windows DLL after the plane fix.** The native
   Linux build has been refreshed, but `C:\RetroArch-Win64\cores\nova64_libretro.dll`
   predates the X/Y plane geometry change. Use:
   ```bash
   make -C retroarch platform=win-cross clean all
   cp retroarch/nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/nova64_libretro.dll
   make -C retroarch clean all harness
   ```

3. **Port Three's separable Gaussian blur to the bloom downsample chain.** The composite is now Three's, but the *blur kernels* feeding each mip still use RA's older kernel. Three uses radii `[6, 10, 14, 18, 22]` with Gaussian coefficients `0.39894 * exp(-0.5 * i² / σ²) / σ` where `σ = radius / 3`. Source is in `node_modules/.pnpm/three@0.182.0/node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js` line 379 (`_getSeparableBlurMaterial`). This will further match Three's soft halo shape — biggest remaining bloom-parity lever.

4. **Fix the pre/post-bloom asymmetry in the classic unsharp.** The classic unsharp branch samples `u_scene` (pre-bloom) for neighbors but operates on `tone` (post-bloom). So `(tone - avg)` conflates bloom halos with edges. The CAS branch already fixes this (samples bloom mips at neighbor positions); applying the same fix to classic will **rebaseline cart 21 GLES checksum** but cleans up the legacy path. Worth doing if you're already touching the file.

5. **Add an edge-region-only sharpness metric to `space_harrier_visual_parity.mjs`.** The current `sharpnessScore` is whole-image gradient-average, which penalizes CAS because cleaner flats lower the metric even when edges go crisper. Add a second metric that samples only high-luma-gradient pixels so the CAS path can show its wins. Function lives at `retroarch/tests/space_harrier_visual_parity.mjs:360`.

6. **Tackle the Space Harrier port-cart guard.** The hand-tuned RA port now has
   the correct horizon/floor projection and scores `92.2` average in the smoke
   harness, but still has bespoke start-screen/palette differences from the web
   cart. Re-run with the current guard profile after the conformance refresh.

---

## Don't redo — already tried this session

- **Enabling vibrance in the `enableBloom` compat shim.** Tried `setVibrance(0.30)` default-on; Space Harrier play scene went 92.5 → 91.1 because the play scene is already slightly more saturated than the web reference (ra 0.37 vs web 0.32) and vibrance pushed it further off. The chroma gate did protect the HUD-heavy start scene (95.6 unchanged). Vibrance stays opt-in per-cart; the compat shim has a comment explaining this. (`771cd6f`)

- **CAS anti-ringing with neighbor-only min/max clamp.** First attempt did `clamp(tone + lift, min(n,s,e,w), max(n,s,e,w))` — silently killed the lift on every edge because center is already at the neighbor max on an edge. Parity sharpness metric was pinned at exactly `3.04` regardless of `u_sharpness` amount until I switched to `clamp(tone + lift, min(tone,n,s,e,w), max(tone,n,s,e,w))`. Don't go back to neighbor-only.

- **Old CAS sharpness > 1.45 note.** That ceiling applied before the
  contrast-scaled clamp margin. With the new margin, `setSharpness(1.90)`
  improved Space Harrier gameplay sharpness ratio `46.9% -> 52.4%` in the
  latest web-cart smoke without hurting the start screen. Re-test before
  pushing past 1.90.

---

## Validation commands (every session-end batch)

```bash
# Native Linux build
make -C retroarch clean all harness

# Cart 21 post-effects in both modes — anchors most of the post pipeline
bash retroarch/tests/run_conformance.sh --skip-build --from 21 --to 21
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 21 --to 21
# Expect: software db290147bd8f8c0b, GLES b9a78c64ab0a6ab8

# Space Harrier web-cart parity
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-plane-fix --port=5178
# Current smoke after plane fix: average 94.4, start 95.6, play 93.2.
# Gameplay sharpness ratio is now 100.6%; the horizon/floor detail bug is fixed.

# Windows DLL refresh (do not skip if you touched any C path)
make -C retroarch platform=win-cross clean all
cp retroarch/nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/nova64_libretro.dll
```

---

## Files this session touched (for fast catch-up)

- `retroarch/nova64_libretro.c` — temperature + vibrance + bloom-style + sharp-style APIs, Three-style GLES shading, all shader code, web compat shim updates
- `retroarch/conformance/21-post-effects.js` — temperature + vibrance + bloom-style round-trips
- `retroarch/conformance/64-directional-light.js` — `setShadingStyle` binding coverage
- `retroarch/tests/run_conformance.sh` — GLES/software baselines for post and directional-light coverage
- `retroarch/HANDOFF_HWGL.md` — checkpoints + measurements + this handoff
- `retroarch/README.md` — post pipeline summary
- `retroarch/GLES_SMOKE_MATRIX.md` — vibrance entry
- `retroarch/games/{hello-namespaced,test-font,test-minimal}.js` — three smoke carts
- `retroarch/games/space-harrier-3d.js` — wing-hide fix
- `C:\RetroArch-Win64\cores\nova64_libretro.dll` — cross-built and deployed twice (post Three-bloom, post CAS)
- `C:\RetroArch-Win64\playlists\games.lpl` — refreshed via `pnpm retroarch:refresh:windows` (18 → 21 entries)

---

## Latest API feature checkpoint

- Added `nova64.post.setVibrance(amount)` and global `setVibrance`. It is a
  smart-saturation pass that boosts low-chroma pixels much more than already
  vivid ones, so HUD primaries and palette-pure surfaces stay close to their
  authored hue. Web compat can lean on this without the uniform HUD tint that
  broad `setSaturation` produced above 1.05.
- Range is `[-2.0, 2.0]`, default `0.0` = identity. The pivot is per-pixel
  chroma (`maxc - minc`) and the mix target is Rec.601 luma.
- `nova64.post.getState()` now reports `vibrance`, and `resetPost()` clears it
  through the shared post reset path.
- Focused conformance coverage lives in `21-post-effects.js`; the software
  checksum is stable at `db290147bd8f8c0b` (vibrance is a GLES-only effect, so
  software state still readouts cleanly) and the GLES checksum intentionally
  moved to `aaba06aa0e6a85c9`.

### AMD CAS-spirit contrast-adaptive sharpening — opt-in sharp style

The legacy unsharp pass sharpens flat sky/HUD just as hard as real geometric
edges, which produces visible noise lift and washes the perceived crispness
out. Added a second sharpening path inspired by AMD FidelityFX CAS:

- Per-pixel luma-gradient gate (no sharpening on flat regions; full
  sharpening on high-contrast edges, smooth ramp via sqrt).
- Anti-ringing clamp bounded by the local source min/max INCLUDING center,
  so highlights cannot overshoot but real edge lifts are not clipped back.
- Bloom-aware neighbor sampling (mip0 + mip1) so the gate measures
  post-bloom contrast, not the smoother pre-bloom signal.

API:

- `nova64.post.setSharpStyle(s)` where `s in {unsharp, cas}` (default
  `unsharp` preserves all historical conformance checksums).
- `nova64.post.getState().sharpStyle` reports current style.

Web compat `enableBloom` now auto-opts into CAS and bumps `setSharpness`
from `0.95` → `1.90`. The higher amount is safe because CAS gates by
contrast, so flat regions still pick up zero grain.

Why the parity metric stays flat: Space Harrier `sharp` measure averages
gradient magnitude over the whole image, but the play scene is dominated
by smooth post-bloom sky, so cleaner gating actually pulls the metric down
even when edges look crisper. Per-pixel inspection shows CAS edges are
visibly sharper with cleaner flats; the parity score still improved
(play 92.5 → 93.7 in one run, ~94 average across runs) from cleaner
color matching.

### Three.js UnrealBloomPass composite — opt-in bloom style

Mined Three's verbatim composite from
`three/examples/jsm/postprocessing/UnrealBloomPass.js` and added it as a
second bloom path in the post fragment shader. Default/reset is now
`nova64.post.getState().bloomStyle === 'three'`, matching the browser
reference renderer's UnrealBloomPass path. `nova64.post.setBloomStyle('classic')`
still opts into the older normalized-mip average for carts that want the softer
legacy look.

Space Harrier web-cart parity after the opt-in: average `94.5`, play scene
`92.5 → 93.3` from richer sky/halo match; start scene held at `95.7`.

Sharpness is still the wider gap (`web=10.97 ra=5.21` on the play scene); see
the AMD CAS upgrade plan in the **Next-step backlog** section below for the
crispness work that will move the needle further.

### Vibrance + web compat: tried, intentionally NOT default-on

Enabling `setVibrance(0.30)` in the `enableBloom` compat shim was tested and
regressed Space Harrier web-cart parity from `94.5` → `93.3` (play scene only;
start scene stayed at `95.6` thanks to the chroma gate). The play scene was
already slightly more saturated than the web reference (`ra 0.37` vs
`web 0.32`), so vibrance pushed it further off. Vibrance stays opt-in per-cart
for the scenes that actually need it; the compat shim comment documents this.

### Previous API checkpoint

- Added `nova64.post.setTemperature(amount)` and global `setTemperature`.
  It is opt-in, defaults to neutral, accepts cool negative and warm positive
  values, and runs after tone mapping with approximate luma preservation.
- `nova64.post.getState()` now reports `temperature`, and `resetPost()` clears
  it through the shared post reset path.
- Focused conformance coverage in `21-post-effects.js`; software checksum was
  `db290147bd8f8c0b` and GLES checksum was `16ebe9e50b3e1ec3` before the
  vibrance pass shifted GLES forward.

### Earlier API checkpoint

- Added `nova64.post.setFilmGrain(amount, seed)` and global `setFilmGrain`.
  It is opt-in, deterministic, defaults to off, and runs after tone mapping so
  it adds a final camera/film texture without feeding bloom or shifting palette
  intent.
- `nova64.post.getState()` now reports `filmGrain` and `filmGrainSeed`.
- Global `resetPost()` now calls the shared reset path, so it also clears newer
  exposure, saturation, sharpness, and film-grain state instead of only the
  older post knobs.

---

## Windows RetroArch game import refresh

When delivering new or renamed RetroArch carts for Windows review, refresh the
RetroArch playlist directly from `retroarch/games/*.js`:

```bash
pnpm run retroarch:refresh:windows
```

The command updates `C:\RetroArch-Win64\playlists\games.lpl`, keeps a backup at
`C:\RetroArch-Win64\playlists\games.lpl.bak`, and points every entry at the dev
cart in `C:\Users\brend\exp\nova64\retroarch\games`.

---

## 🎯 FINAL HANDOFF (Codex 2026-05-25 late)

User feedback: the Space Harrier web cart was still too purple/dark in
RetroArch, the edges stayed too dim, and the START button was white/gray rather
than mint green. The browser web cart remains the source of truth; no changes
were made to `examples/space-harrier-3d/code.js`.

### Latest fix

1. **Web overlay color-space parity.** The Three.js backend uploads the 2D
   framebuffer as a `DataTexture` and renders it through the renderer output
   transform. RetroArch's overlay shader was sampling the 8-bit upload raw,
   which left the start-screen purples around `rgb(35,23,55)` instead of the
   browser's much brighter `rgb(83,59,124)`. Web-compat overlay rendering now
   applies linear-to-sRGB in the overlay shader when `use24BitColors(true)` is
   active. This is intentionally tied to web compat, not global RetroArch carts.

2. **Button border no longer erases button fill.** The compat UI shim drew
   `rect(..., colors.light)` after `rectfill(...)`; this core defaults `rect()`
   to filled when the sixth argument is omitted. The shim now passes `false`,
   so `uiColors.success` remains the visible mint START button.

3. **Conformance baselines for the already-normalized scanline path were
   refreshed.** `513-draw-shapes` and `523-batch39-showcase` now match the
   stable browser-style scanline output.

4. **Gameplay web-compat tune.** The unmodified web Space Harrier cart does
   not call `setSkyColor`; it only sets fog to `PALETTE.sky`, so the compat
   default sky is responsible for the RetroArch gameplay backdrop. That default
   was raised to `rgba8(55,56,68)` / `rgba8(34,36,45)`, web compat now applies
   a small scene-only color grade `1.08,0.98,0.94`, and sharpness is `0.95`.
   This keeps the start screen stable while improving gameplay sky parity and
   crispness without touching browser cart code.

5. **Sky intent is now tracked in web compat.** The bloom shim only installs a
   default sky when `nova64._skySet` is false, but the raw C `setSkyColor()`
   helper did not update that flag. The late compat layer now wraps global and
   namespaced `setSkyColor` / `clearSkyColor`, so explicit cart sky choices are
   preserved if bloom is enabled later.

6. **Space Harrier parity harness now seeds the web-cart `Math.random()` path.**
   Browser internals still consume random values differently than RetroArch, so
   layouts are not bit-identical, but both sides are deterministic run-to-run.
   This makes future visual parity regressions easier to read.

### Current validation

```bash
make -C retroarch all
pnpm exec node retroarch/tests/space_harrier_visual_parity.mjs --retro-cart=web --guard=web
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 151 --to 151
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 204 --to 205
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 513 --to 523
```

Web-cart Space Harrier is now passing:

| Moment                |                           Before |                             After |
| --------------------- | -------------------------------: | --------------------------------: |
| Start score           |                             77.7 |                              95.6 |
| Start average RGB     | RA `35,23,55` vs web `83,59,124` | RA `76,61,115` vs web `83,59,124` |
| Start sharpness ratio |                            51.5% |                             92.0% |
| Web-cart average      |               84.9, guard failed |                93.6, guard passed |

Follow-up gameplay tune:

| Metric                   | After overlay fix |                After gameplay tune |
| ------------------------ | ----------------: | ---------------------------------: |
| Gameplay score           |              91.5 | 91.4 in the final conservative run |
| Gameplay sky similarity  |             94.7% |                              99.2% |
| Gameplay sharpness ratio |             39.3% |                              54.7% |
| Web-cart average         |              93.6 |                               93.5 |

Note: a stronger grade reached `94.3` average, but visually pushed the sky
toward brown/magenta. The committed tune favors visual neutrality and sky
truth over the highest single-run score.

Remaining caveat: the hand-tuned RetroArch port cart still fails its stricter
guard (`90.0` average) on start sharpness and gameplay edge luma. Treat that as
separate port-cart tuning work; the unmodified web cart is now much closer to
browser truth.

---

## 🎬 FINAL HANDOFF (Claude 2026-05-25 evening)

### Latest delta on top of Codex's overlay-parity work

User feedback: _"the saturation looks very much off — the health bar is no
longer green"_ and _"we need to utilize all 128 bits!"_. Three runtime
tweaks shipped in `b0aea9d`:

1. **Saturation backed off 1.10 → 1.0**. The previous 1.10 boost was
   running over HUD primitives too (overlay goes through the same post
   shader as the scene), visibly tinting the green health-bar fill into a
   muddy tone. Per-cart palette colors still land correctly via the
   24-bit promotion alone.

2. **New `u_sharpness` post knob** — 5-tap cross-pattern unsharp mask
   after tone-map. Cart API `nova64.post.setSharpness(s)`, default 0 = off.
   Web compat now pins it to 0.35 (subtle crisp). Counters the geometry-
   edge softening that bloom inherently produces — bloom halo stays on
   bright objects, silhouettes stay sharp.

3. **RGBA32F HDR is now the DEFAULT** (was opt-in). Every cart now gets
   128-bit/pixel float-per-channel HDR. The 32F→16F auto-fallback already
   in place handles drivers without full-float color attachments. Mesa
   llvmpipe confirms — startup log shows `format=RGBA32F bloom_mips=5`.

### Full enableBloom → 7-step spell (web carts unmodified)

When a web cart calls `nova64.fx.enableBloom(0.38, 0.22, 0.78)` the
compat shim now runs all of:

| Step                        | Effect                                                                  | Why                                            |
| --------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| `setBloom(s, r, t)`         | strength + radius + threshold                                           | Matches Three's `UnrealBloomPass`              |
| `setExposure(1.25)`         | pre-ACES brightness multiplier                                          | Matches Three's `renderer.toneMappingExposure` |
| `use24BitColors(true)`      | promotes `0xRRGGBB` → `0xRRGGBBFF` and enables web overlay output color | Web palettes and 2D overlays render correctly  |
| `setHDRMode('32f')`         | RGBA32F post FBO                                                        | 128-bit precision (now also default)           |
| `setSaturation(1.0)`        | neutral pivot                                                           | 1.10+ tints HUD — held at 1.0                  |
| `setColorGrade(1.12,0.98,1.08)` | red/blue lift                                                       | Helps gameplay field color and start-screen sky |
| `setShadingStyle('three')`  | Three-like diffuse + sky/ground fill                                    | Reduces dull GLES material shading             |
| `setSharpStyle('cas')`      | contrast-adaptive sharpening                                            | Cleaner flats, crisper edges                   |
| `setSharpness(1.90)`        | stronger CAS amount                                                     | Latest tested sharpness lift                   |
| `setSkyColor(...)` if unset | default dark navy gray                                                  | Matches Babylon's default `scene.clearColor`   |

### New runtime APIs (all opt-in, default = identity, NO conformance impact)

```javascript
nova64.post.setExposure(e); // 0..8, default 1.0
nova64.post.setSaturation(s); // 0..4, default 1.0
nova64.post.setSharpness(amount); // 0..4, default 0.0
nova64.post.setHDRMode('32f' | '16f'); // takes effect on next context reset
nova64.post.use24BitColors(on); // toggle 0xRRGGBB hex promotion
```

### Parity progression (web cart `examples/space-harrier-3d/code.js` loaded unmodified)

| Phase                                      | Avg score | Play sky parity | Notes                     |
| ------------------------------------------ | --------- | --------------- | ------------------------- |
| Codex baseline (after vignette/bloom work) | 74.5      | 75.9%           | edge luma 41.6%           |
| + tone-map exposure 1.25                   | 73.3      | 76.5%           | edge luma 53.7%           |
| + 24-bit hex color promotion               | 77.9      | 77.9%           | pixel sim **43.4 → 84.5** |
| + saturation 1.10 + default sky            | **85.2**  | **90.3%**       | trial run                 |
| **+ saturation 1.0 + sharpness 0.35**      | 83.0      | 93.6%           | HUD-safe, current ship    |

### Commits this multi-day sweep (most recent first)

```
b0aea9d feat(retroarch): fix HUD wash + sharpness pass + default 128-bit HDR
d6cbab1 docs(retroarch): document overlay parity checkpoint            [Codex]
af4e238 refactor(retroarch): normalize overlay blending semantics      [Codex]
bd6f224 fix(retroarch): blend web overlay gradients and noise          [Codex]
14598b8 fix(retroarch): align web camera depth and sky balance         [Codex]
d85aa0d feat(retroarch): default 128-bit HDR sharp post path           [Codex]
8b7120b feat(retroarch): post saturation knob + default web sky -> 77.9 to 85.2
5b17909 feat(retroarch): OVERKILL MODE - opt-in RGBA32F post FBO
bdd0cec feat(retroarch): 24-bit hex color promotion (+15pts)
8abbcbd feat(retroarch): wire tone-map exposure for web brightness parity
```

### 7 findings worth preserving (gotchas, design notes)

1. **Three's `renderer.toneMappingExposure = 1.25` is the default in
   `gpu-threejs.js`.** RA's GLES post shader was at 1.0 — that alone
   accounts for ~12pp of the brightness gap.

2. **`0xRRGGBB` hex literal interpretation differs by engine.** Three/Babylon
   treat as 24-bit color with alpha implicitly 1.0. RA packs RGBA as
   `R<<24 | G<<16 | B<<8 | A`, so a 24-bit literal lands as `0x00RRGGBB`
   read as R=0, G=RR, B=GG, A=BB — R/B channel swap on the visible image.
   **Two heuristic auto-detect attempts broke conformance** (`02-input`,
   `18-mesh-helpers` legitimately use `rgba8(0, ...)`). Shipped fix is an
   **opt-in flag** that the web compat layer flips.

3. **Cube shader `surface_light = 0.58 + diffuse * 0.42` is compressed.**
   Ambient ≥ 0.6 clips the diffuse gradient, flattening 3D shading. Web
   uses 0.62 successfully because Babylon's StandardMaterial composes
   ambient differently. For RA carts use ambient 0.30-0.42. An attempted
   `u_shading_contrast` opt-in uniform was reverted because `16-transforms`
   is pre-existing nondeterministic on Mesa llvmpipe.

4. **HUD primitives go through the same post shader as the 3D scene.**
   Saturation > 1.05 tints HUD colors visibly. For now saturation in web
   compat is pinned to 1.0; future improvement: skip the saturation pass
   when sampling an overlay pixel (stencil bit during overlay upload).

5. **`16-transforms.js` checksum is nondeterministic on Mesa llvmpipe.**
   Verified by stashing all changes and re-running. Not from this session.
   Should be rebaselined or excluded from the conformance gate.

6. **`drawScanlines` alpha differs.** Web 0-255 byte, RA 0.0-1.0. The
   runtime now tolerates both (earlier commit).

7. **`rect()` defaults to filled=true with 5 args.** Silent bug magnet —
   discovered when health bar showed solid white (border rect filled over
   green hpFill). Always pass `false` as 6th arg for outlines.

### Remaining gaps (effort order, smallest first)

1. **Trees still mint vs web's bright green** — `setMeshEmissive(..., color, intensity)`
   likely doesn't run `color` through `color_from_js`'s 24-bit promotion.
   Trace where `emissive_color` gets assigned.
2. **Player cyan-shift in some captures** — `createCube`/`createSphere`
   already use `color_from_js`, so promotion DOES reach them. Likely
   bloom of nearby cyan enemies (`PALETTE.enemyFast = 0x00ccff`) is
   bleeding onto the player. Lower bloom radius or threshold.
3. **HUD-aware saturation** — bring 1.10 back but mask overlay region.
4. **Real Three FXAA pass AFTER bloom** (Codex tried before bloom, regressed).
5. **`16-transforms.js` rebaseline** — run 20×, pick stable checksum.
6. **Per-cart `setSaturation`/`setSharpness` exposure** — RA-port carts
   could call these for cinematic looks per scene.

### Deployed state

| Artifact            | Path                                           | Source commit       |
| ------------------- | ---------------------------------------------- | ------------------- |
| Windows .dll        | `C:\RetroArch-Win64\cores\nova64_libretro.dll` | `b0aea9d`           |
| Linux .so           | `retroarch/nova64_libretro.so`                 | `b0aea9d`           |
| 9 .nova carts       | `C:\RetroArch-Win64\content\nova64\*.nova`     | all latest          |
| 18 playlist entries | `C:\RetroArch-Win64\playlists\games.lpl`       | 1:1 with dev folder |

Working tree clean. User runs Windows RA so DLL must be redeployed after
every runtime change — this is captured in `feedback_retroarch_playlist_sync`
memory.

### Workflow one-liners

```bash
# Visual parity check
node retroarch/tests/space_harrier_visual_parity.mjs --retro-cart=web   # tests web cart on RA via compat
node retroarch/tests/space_harrier_visual_parity.mjs --retro-cart=port  # tests hand-tuned RA port

# Runtime iterate: build + cross-build + deploy
cd retroarch && make all && \
  cp -r build build-linux && rm -rf build && \
  make platform=win-cross && \
  cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/ && \
  rm -rf build && mv build-linux build

# Cart iterate
python3 -c "import zipfile; z=zipfile.ZipFile('retroarch/games/<cart>.nova','w',zipfile.ZIP_DEFLATED); z.write('retroarch/games/<cart>.js','code.js'); z.write('examples/<cart>/meta.json','meta.json'); z.close()"
cp retroarch/games/<cart>.nova /mnt/c/RetroArch-Win64/content/nova64/

# Compat probe (all 71 web carts)
/tmp/compat-all.sh
```

---

## 🔥 Prior checkpoint: web overlay blending + Space Harrier start-screen parity

Checkpoint commits:

- `bd6f224` — fixed web overlay gradients/noise.
- `af4e238` — normalized overlay blending semantics so the fix is shared policy.

The latest parity pass focused on the Space Harrier web-cart start screen. The
browser source-of-truth draws the title backdrop as layered 2D primitives over
the 3D scene: opaque gradient, alpha radial glows, scanlines, and full-screen
cosmic noise. RetroArch was still letting the 3D scene show through too much,
which made the start capture read dark/cyan instead of rich purple.

Root causes found and addressed:

- Browser `drawNoise(x, y, w, h, alpha, seed)` differs from the older RetroArch
  helper shape `drawNoise(x, y, w, h, density, color)`. The web Space Harrier
  call `drawNoise(0, 0, 640, 360, 22, seed)` was being interpreted as
  `density=1.0` plus a tiny numeric color, which polluted the whole title layer.
- Browser radial gradients alpha-blend per pixel. RetroArch's previous radial
  implementation drew nested filled ellipses with raw pixel writes, so the
  transparent outer rings could overwrite existing color and expose the scene
  underneath.
- Rect gradients now use the same alpha-blend helper, keeping transparent
  gradient cases aligned with the browser while preserving fully opaque writes.
- The legacy RetroArch `drawNoise(...density,color)` path remains raw/scatter
  compatible for older carts and conformance tests; only the browser-style
  alpha/seed path uses full-screen blended grain.
- Follow-up cleanup normalized the implementation so this is renderer policy
  rather than duct tape: normal alpha blending now uses the browser-compatible
  rounded channel helper, gradient interpolation uses the browser's endpoint
  denominator/floor behavior, radial gradients reuse shared `lerp_color()`, and
  `drawNoise` chooses between explicit named signatures instead of an inline
  heuristic.

RetroArch port-cart control was also retuned after the start-screen fix: its
gameplay sky constants were reduced from the older bright neutral values to
`rgba8(56,61,78)` / `rgba8(37,42,57)`, bringing the port guard sky sample back
to web parity without touching the browser example cart.

Validation from this checkpoint:

```bash
make -C retroarch all
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 204 --to 205
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 17 --to 22
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 151 --to 151
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 263 --to 263
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 478 --to 478
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5184 --guard=web
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5185 --guard=port
```

Latest Space Harrier web-cart source-of-truth parity:

- **86.6 avg** (start 81.9 / play 91.2), web guard passing.
- Start screen is now covered by blended purple/noise primitives instead of
  leaking the 3D world, but the score still says there is meaningful title-layer
  color work left: RA start sky is `rgb(36,29,52)` vs browser `rgb(95,57,137)`.
- Gameplay still passes but remains too dark in the sky and too soft on field
  detail: RA gameplay sky `rgb(48,51,60)` vs browser `rgb(68,69,74)`,
  gameplay sharpness ratio about **37.8%**.
- Port-cart control remains healthy: **91.8 avg** (start 93.8 / play 89.7),
  with gameplay sky similarity **98.8%** after the port sky retune.

Intentional baseline movement:

- `478 gradient hexcolor` checksum changed to `6c55dcfa031d1ae9` after
  gradient interpolation was normalized to browser endpoint semantics.

Next recommended work:

1. Continue from the web cart, not the port: match the browser start-screen
   purple layer first, then revisit gameplay sky brightness.
2. Compare browser `drawRadialGradient` and `drawNoise` outputs directly against
   the RetroArch blended helper; the signatures now line up, but the random
   distribution and alpha curve are still approximate.
3. Gameplay sharpness is still a material/scene/fog/pass-order issue. Do not
   solve it with stronger global sharpening alone, because the title layer is
   already sharper than browser.

---

## 🔥 Latest handoff: 128-bit exposure + web-depth/color balance

The user clarified the direction: RetroArch should use GLES advantages for
fidelity, usability, beauty, and "128 bit exposure" while keeping web as the
source of truth. Current interpretation:

- The **RGBA32F 128-bit/pixel HDR post target** is the headroom.
- `nova64.post.setExposure(1.25)` applies the Three-compatible exposure scalar
  inside that HDR pipeline before ACES tone mapping.
- Bloom, sharpness, color/sky/fog, and final output should be tuned with that
  headroom, not by washing everything with a global saturation boost.

Runtime changes in this checkpoint:

- GLES camera projection now uses a far plane of **1000** instead of 100,
  matching the Three.js browser camera (`PerspectiveCamera(..., 0.1, 1000)`).
  This keeps distant Space Harrier floor rows and scenery alive instead of
  clipping the horizon detail.
- Web-compat default sky for carts that do not call `setSkyColor()` is now a
  darker middle fallback: `rgba8(44,45,54)` to `rgba8(28,29,36)`. The previous
  bright navy fallback helped during the old dark-image phase but became too
  gray/cyan after 24-bit colors, exposure, and RGBA32F landed. Raw Three clear
  color (`0x0a0a0f`) was tested and crushed the RA sky too far, so this middle
  value currently gives the best browser-facing balance.

Validation from this checkpoint:

```bash
make -C retroarch all
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 17 --to 22
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178 --guard=web
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178 --guard=port
```

Latest Space Harrier web-cart source-of-truth parity:

- **86.0 avg** (start 79.6 / play 92.3).
- Gameplay average color is much closer: browser `rgb(94,124,102)`, RA
  `rgb(80,131,110)`.
- Gameplay sky is now close: browser `rgb(60,63,73)`, RA `rgb(48,52,59)`.
- Gameplay edge luma ratio is **99.7%**, so the old crushed-edge issue is gone.
- Gameplay sharpness is **41.5%** of browser. It is improving, but do not solve
  the rest with stronger global sharpening; next target should be scene/material
  contrast, pass ordering, or primitive/fog semantics.
- Port-cart control remains healthy: **91.0 avg** (start 93.2 / play 88.8).

Conformance rebaselines were intentional and projection-related:

- `18 mesh helpers` software checksum and command-log hash changed.
- GLES checksums changed for `17 light fog`, `18 mesh helpers`, and
  `22 material`.
- `screenshots/retroarch/18-mesh-helpers.png` was regenerated as the tracked
  visual baseline for the software projection change.

Next recommended work:

1. Investigate why the unmodified web cart start screen still lags: start score
   is 79.6 while gameplay is already 92.3.
2. Compare RA material/fog/scanline/pass ordering against Three's
   `EffectComposer` before adding any stronger global grade.
3. Consider a real color-grading/LUT stage for the "beat Dreamcast" goal, but
   keep HUD/UI isolated from broad chroma boosts.

---

## 🔥 Latest handoff: 128-bit HDR + crisp post path

Claude's latest committed checkpoint was `8b7120b`:

- 24-bit web color promotion had already fixed the big blue/cyan palette bug.
- Web-compat exposure was pinned to Three's `toneMappingExposure = 1.25`.
- Web carts without an explicit sky now receive a dark navy default sky.
- A broad `setSaturation(1.10)` lift improved parity but user/agent notes
  flagged HUD tinting; the health bar could stop reading as clean green.
- Optional RGBA32F support existed, and the user's next direction was to lean
  into "128 bit mind blowing graphics and fx."

This follow-up turns that into a validated runtime path:

- `nova64_compat_hdr_32f` now defaults to `true`. GLES tries an **RGBA32F
  128-bit/pixel post FBO** first and falls back to RGBA16F if the driver cannot
  complete the framebuffer.
- `nova64.post.setHDRMode('32f'|'16f'|boolean)` remains available for carts or
  tests that need to force the target.
- `nova64.post.setSharpness(amount)` adds a post-tone-map unsharp mask. Web
  compat uses `0.35`, which improved Space Harrier title sharpness without
  reintroducing the earlier broad FXAA-like blur.
- The web compat `enableBloom()` bridge now keeps `setSaturation(1.0)` neutral
  to avoid HUD tinting. Palette/color parity should come from 24-bit color
  promotion, real cart colors, lighting, fog, and sky, not a global chroma shove.
- `nova64.post.getState()` now exposes `exposure`, `saturation`, `sharpness`,
  requested `hdrMode`, actual `hdrActual`, and `hdrFormat`.
- `21-post-effects` now round-trips exposure/saturation/sharpness/HDR mode and
  the GLES checksum has been intentionally rebaselined to
  `89921835e5694410` for the RGBA32F path.

Validation from this checkpoint:

```bash
make -C retroarch all
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 20 --to 22
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178 --guard=web
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178 --guard=port
```

Current visual parity:

- Web-cart-on-RA source-of-truth path: **85.5 avg** (start 83.4 / play 87.7).
- Web-cart start sharpness is now **94.5%** of browser; gameplay pixel
  similarity is **86.8%**.
- Gameplay sharpness is still the stubborn gap at **33.3%** of browser, so the
  next parity move should be geometry/material/fog contrast or pass ordering,
  not a stronger global sharpen.
- Port-cart control remains healthy: **91.1 avg** (start 93.1 / play 89.0).

Next recommended work:

1. If the user wants Windows RetroArch testing, cross-build and redeploy the DLL.
2. Investigate the remaining gameplay sharpness gap by comparing floor/cart
   geometry contrast and post pass ordering against Three's `EffectComposer`.
3. Avoid restoring broad saturation >1.05 globally unless HUD/UI paths are
   isolated from the post chroma lift.

---

## 🎨 Color bit-depth (for the "coolest console" ask)

Nova64 RetroArch now prefers **RGBA32F (128-bit total — 32-bit float per
channel)** for the HDR post-processing FBO when the GL driver supports full
float color attachments. It falls back to **RGBA16F** if RGBA32F is not
framebuffer-complete. See `gles_init_post_resources` and the startup log line
which reports `format=RGBA32F bloom_mips=5` in the GLES harness.

Important: the bit depth is the headroom; the visible "wow factor" still comes
from bloom passes, tone mapping, palette correctness, sky/fog/material parity,
and careful sharpening. The 128-bit path is useful because it gives those
effects more room before final tone mapping.

Good next "bling" targets:

1. Add a **3D LUT color grading** stage (cinematic post)
2. Add **temporal anti-aliasing (TAA)** for crisper sub-pixel detail
3. Add a **chromatic aberration intensity per scene** option
4. Add **screen-space reflections** on the floor planes

---

## 🏆 Latest shipped: 24-bit hex color promotion (commit `bdd0cec`)

Found and fixed the dominant remaining web-cart parity bug.

**Root cause**: web Three/Babylon treat `0xRRGGBB` hex literals as 24-bit
color with implicit alpha 1.0. RA's `color_from_js` returned the int raw,
so `0xaa22ff` (magenta in web) landed as `0x00aa22ff` and the rgba8 packing
read it as R=0, G=0xAA, B=0x22, A=0xFF — green-ish with alpha. Result:
every web cart with palette literals rendered with R/B swap. Captures
showed cyan/blue instead of green/orange.

**Fix**: opt-in flag `nova64_compat_24bit_colors` (off by default). When
on, `color_from_js` promotes values with top byte 0 and middle bytes set
to `(u<<8)|0xFF`. The web compat shim flips the flag inside
`nova64.fx.enableBloom` (carts using web's enableBloom API are
near-100% Three/Babylon-style).

**Conformance**: default flag OFF preserves all checksums except
pre-existing flaky `16-transforms`.

**Parity numbers** (`--retro-cart=web`):

- Average: **73.3 → 77.9** (+4.6)
- Play score: **72.8 → 83.5** (+10.7)
- Play pixel similarity: **43.4 → 84.5** (DOUBLED)

Capture: `c:\tmp\ra-color-fixed.png` shows green floor + yellow pillars +
green tree spheres. Player ship still cyan-shifted (likely separate cube
color path that bypasses `color_from_js`); see "Next picks" below.

---

---

## 🔥 Next-session pickup: 24-bit hex color shift (root cause identified, fix not landed)

**The user-reported "blue/cyan instead of green/orange" in web-cart-on-RA captures is
a packing convention mismatch.** I diagnosed it this session but the safe runtime
fix is not yet shipped.

### The bug

Side-by-side capture at `c:\tmp\web-play-now.png` (web) vs
`c:\tmp\ra-play-now.png` (web cart on RA) shows:

- **Web**: green checker floor, orange/yellow pillars, green tree spheres, red+yellow player, magenta fog glow
- **RA**: BLUE floor, cyan pillars, cyan trees, yellow player (no red), cyan fog glow

That's not brightness — it's R↔B channel rotation. Tracked it to:

1. Web carts use `0xRRGGBB` hex literals (e.g. `PALETTE.sky = 0xaa22ff` = magenta).
   Three.js/Babylon treat these as 24-bit color with implicit alpha 1.0.
2. RA's `color_from_js` (line ~2004 of `nova64_libretro.c`) returns the int
   directly as `uint32_t`.
3. RA's rgba8 packing is `R<<24 | G<<16 | B<<8 | A`, so `0x00AA22FF` (the
   web literal padded to 32 bits) gets read as **R=0, G=0xAA, B=0x22, A=0xFF**.
4. Result: red drops to zero, what was magenta in web renders as green-ish
   tinted by the bottom byte. Combined with bloom/lighting this lands as
   blue/cyan in the final image.

### Why my obvious fix didn't ship

I tried adding a heuristic in `color_from_js` that promotes any value with
top byte 0 and middle/low bytes set to `<<8 | 0xFF`. Two attempts:

- `(u & 0xff000000)==0 && (u & 0x00ffffff)!=0` — broke `02-input.js`
  conformance because `rgba8(0,0,0,255)=0xff` got promoted to blue.
- `(u & 0xff000000)==0 && (u & 0x00ffff00)!=0` — broke `18-mesh-helpers.js`
  too. Plenty of RA-side carts use rgba8 with R=0 and the heuristic can't
  reliably distinguish them from web-style 0xRRGGBB literals.

The change is currently reverted. `color_from_js` is back to its original
3-line body.

### Three viable approaches for the next picker

1. **Opt-in runtime flag** — add `nova64.compat.use24BitColors(true)`. Web
   compat shim flips it when `nova64.fx.enableBloom` (web-style API) fires.
   `color_from_js` checks the flag; only promotes when on. **Cleanest.**
2. **Per-API JS wrappers** — wrap every color-accepting setter in the late
   compat eval (`setFog`, `setMeshColor`, `setMeshEmissive`, `setAmbientLight`,
   `setLightColor`, `createCube`, `createSphere`, `createPlane`,
   `setSkyColor`, etc.). Pre-translate 24-bit hex to 32-bit before calling
   native. Verbose but doesn't touch conformance at all.
3. **Stable rebaseline** — flip color_from_js to always promote, then
   rebaseline the ~10-30 affected conformance tests. Riskier but simpler
   final code path.

I'd pick option 1 — surgical, opt-in, defaulted to current behavior so all
existing conformance is preserved.

### Validation when shipping the fix

```bash
# Before: web cart shows blue/cyan scene
node retroarch/tests/space_harrier_visual_parity.mjs --retro-cart=web
# Capture web-play-now.png + ra-play-now.png side-by-side
# After fix: RA should show green floor + orange pillars + red player

# Conformance must still pass at 17+ (16-transforms is pre-existing flaky)
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 0 --to 100
```

---

## ⚡ Latest shipped: tone-map exposure for brightness parity (commit `8abbcbd`)

Codex's prior handoff identified the brightness gap (gameplay edge luma
browser 108.5 vs RA 54.9). Three sets `renderer.toneMappingExposure = 1.25`
in `runtime/backends/threejs/gpu-threejs.js` — RA's GLES post shader was
applying `linear_to_srgb(aces_filmic(color))` with no exposure scalar.

Runtime change:

- `nova64_post_state.exposure` field, default 1.0
- Post fragment shader multiplies `color.rgb * max(u_exposure, 0)` before ACES
- `nova64.post.setExposure(e)` JS API (range 0..8)
- Web compat shim: `nova64.fx.enableBloom` now also calls
  `p.setExposure(1.25)` so unmodified web carts get Three's default

Verification:

- `21-post-effects` checksum stayed `d5f674e4aa5e28a0` (default 1.0 = identical math)
- Web-cart edge luma ratio: **41.6% → 53.7%** (Codex baseline → after)
- Web-cart average score: 74.5 → 73.3 (slight wobble — the color shift
  above dominates whatever brightness helps)

---

---

## 🔄 HANDOFF FOR CODEX (2026-05-24 evening)

### Visual parity regression guard added

The Space Harrier visual parity harness now has optional failing guard profiles
so dark edges, soft output, and major color/sky regressions do not silently
slide by as console-only metrics.

Commands validated on 2026-05-24:

```bash
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178 --guard=web
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178 --guard=port
```

Guard behavior:

- `--guard=web` is the source-of-truth compat floor for the unmodified
  `examples/space-harrier-3d/code.js` cart packaged into `.nova`.
- `--guard=port` is a stricter control floor for the hand-tuned
  `retroarch/games/space-harrier-3d.js` cart.
- Custom thresholds are also supported:
  `--min-average`, `--min-moment-score`, `--min-sky`,
  `--min-edge-luma-ratio`, `--min-edge-center`,
  `--min-sharpness-ratio`, and `--max-saturation-delta`.
- The report now records `edgeLumaRatio` (`retro edge luma / browser edge
luma`) in addition to `edgeToCenter`, because relative edge/center can look
  okay even while the whole RA image is still much darker than web.

Latest guard results:

- Web-cart guard passed at **72.8 avg** (start 73.6 / play 71.9).
- Web-cart gameplay is still visibly behind: edge luma ratio **41.6%** and
  sharpness ratio **22.4%**. This is now pinned as a known baseline, not an
  acceptable final target.
- Port-cart guard passed at **91.3 avg** (start 93.1 / play 89.5).
- Port-cart gameplay edge luma ratio **84.1%** and sharpness ratio **205.1%**,
  which makes it a useful control that the harness catches source-cart runtime
  gaps rather than only visual design differences.

### Three/Babylon output pipeline checkpoint

I reviewed the local Three.js and Babylon.js post/effects sources while chasing
the remaining color/brightness gap:

- `runtime/backends/threejs/gpu-threejs.js` sets
  `renderer.outputColorSpace = THREE.SRGBColorSpace`,
  `renderer.toneMapping = THREE.ACESFilmicToneMapping`, and
  `renderer.toneMappingExposure = 1.25`.
- `runtime/api-effects.js` uses `EffectComposer`, `RenderPass`,
  `UnrealBloomPass`, and `ShaderPass`, but currently does **not** add
  Three's `OutputPass`.
- Local Three's `EffectComposer` marks the last enabled pass as
  `renderToScreen`; Three's own postprocessing examples use `OutputPass` for
  the final tone-mapping/color-space stage when a composer chain is active.
- `runtime/backends/babylon/effects.js` enables Babylon image processing for
  the default pipeline but explicitly disables tone mapping there.
- RA GLES currently folds final output through its post shader with
  `linear_to_srgb(aces_filmic(color.rgb))`.

Next high-value parity target: compare a browser capture with and without an
explicit Three `OutputPass` in the web composer path, then align RA to the
actual web source behavior. Do this experimentally first; the user has been
clear that web is the source of truth and RetroArch should move toward it, not
the other way around.

### Codex follow-up checkpoint — visual parity baseline

I reviewed this handoff, woke MemPalace (`pnpm run mempalace:wake`), and reran
the focused Space Harrier visual parity checks. Important distinction:

- **`--retro-cart=port`** tests `retroarch/games/space-harrier-3d.js`, the
  dedicated RA-port cart. It is useful for the hand-tuned port but is **not**
  the web source-of-truth path. Latest report in
  `retroarch/build/space-harrier-parity/report.json`: **91.0 avg**
  (start 92.4 / play 89.5).
- **`--retro-cart=web`** packages `examples/space-harrier-3d/code.js` directly
  into a temporary `.nova` and runs that unchanged web cart through the RA
  compat/runtime layer. This is the right check for implementation parity.
  Latest command:

```bash
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178
```

Latest web-cart-on-RA result: **79.7 avg** (start 74.5 / play 85.0).

Key color deltas from the web-cart check:

- Start/title average: RA is `rgb(-66,-15,-62)` versus browser; sky is
  `rgb(-86,-37,-115)`. This is the big purple/sky loss the user is seeing.
- Gameplay average: RA is `rgb(-23,-37,+29)` versus browser; sky is
  `rgb(-21,-8,-10)`. Gameplay is less bad than title but still darker,
  cooler/blue-shifted, and visibly less saturated.
- Pixel similarity is still only 53.2% on start and 64.1% in gameplay.

User-observed visual target:

- Browser/web carts are the source of truth.
- RA currently looks less sharp and less colorful. The web capture has crisper
  checkerboard edges, stronger saturation, and brighter magenta/green/orange
  material response.
- Prefer runtime/renderer parity fixes over editing `examples/*/code.js`.
  Only touch `retroarch/games/*` when explicitly improving the dedicated port.

Suggested next parity work:

1. Extend `space_harrier_visual_parity.mjs` with objective sharpness/chroma
   metrics: average saturation, edge/gradient magnitude, and center-vs-edge
   brightness so blur/vignette/color regressions are measurable.
2. Audit the RA post stack for unintended softness or darkening: scanlines,
   CRT/aperture pass, vignette, bloom resolve, and any framebuffer scaling.
3. Audit color pipeline differences: RGB565/RGBA8/float paths, sRGB vs linear
   assumptions, fog color mixing, tone/exposure, and material diffuse range.
4. Keep rerunning both modes: `--retro-cart=web` for implementation parity and
   `--retro-cart=port` only as a useful tuned-port comparison.

Notes from this checkpoint:

- The parity harness now has `--retro-cart=web|port` and a package script:
  `pnpm run retroarch:visual:space-harrier`.
- Runtime key names are already browser-tolerant in `decf293`: `Space`,
  `ArrowLeft`, uppercase letters, etc. The web cart starts gameplay through
  `nova64.input.isKeyPressed('Space')`, so do not regress that shim.

### Post/vignette parity follow-up

User called out two likely causes for the softer RA look: post-process blur and
an overwhelming vignette. Codex added whole-frame diagnostics to the Space
Harrier visual parity report:

- `browserSharpness` / `retroSharpness` / `sharpnessRatio`
- `browserSaturation` / `retroSaturation`
- `browserEdges` / `retroEdges` with `edgeToCenter`

Baseline before the post adjustment showed the problem clearly:

- Web-cart gameplay sharpness ratio: **25.2%**
- Web-cart gameplay edge/center: browser **0.933**, RA **0.201**
- Start/title edge/center: browser **0.652**, RA **0.166**

Runtime changes made in this pass:

- `nova64.fx.enableVignette(darkness, offset)` initially mapped web shader
  semantics into the RA one-value post scale with
  `darkness * offset * offset * 0.25`. A follow-up edge-darkness check showed
  that even this lighter mapping was still too punishing on top of the darker
  RA scene, so the web-compat vignette bridge now suppresses the RA vignette
  entirely. Direct `nova64.post.setVignette()` behavior is unchanged.
- The GLES post-pass 4-neighbor smoothing weight was reduced from `0.58` to
  `0.22`. It still behaves like lightweight FXAA, but no longer reads as a
  broad blur.

Validation after this pass:

```bash
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 20 --to 21
```

Post-adjustment web-cart results:

- Web-cart average: **79.8** (start 75.2 / play 84.5)
- Start/title edge/center improved to RA **0.830** versus browser **0.654**
- Gameplay edge/center improved to RA **0.652** versus browser **0.837**
- Start/title sharpness ratio improved to **77.3%**
- Gameplay sharpness is still low at **29.1%**, so remaining parity work is
  probably material/lighting/fog/color contrast and not only post blur.

Port-cart control check stayed healthy: **91.1 avg** (start 93.1 / play 89.1).

Follow-up edge-darkness check on 2026-05-24:

- With the `0.12` compat scale trial, web-cart average was **74.9** and gameplay
  edge/center was browser **0.891**, RA **0.664**.
- With web-compat vignette suppressed, web-cart average was **74.5**, start
  edge/center was browser **0.658**, RA **0.772**, and gameplay edge/center was
  browser **0.847**, RA **0.826**.
- Absolute brightness is still far too low: gameplay edge luma was browser
  **108.5**, RA **54.9**. Next parity pass should target RA material/fog/light
  color response and/or final tone mapping rather than treating vignette as the
  whole problem.
- `NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 20 --to 21`
  still passed with the existing GLES post-effects checksum
  `d5f674e4aa5e28a0`.

### Directional light color/intensity parity follow-up

The Three.js backend routes cart-facing light controls into real
`THREE.DirectionalLight` color/intensity, and `createN64Material()` uses
`MeshStandardMaterial`. RA GLES previously accepted `setLightColor()` and
`setDirectionalLight(direction, color, intensity)` but only used the direction
in the shader, so warm/cool key lights were ignored.

Runtime change:

- The GLES cube/material shader now has `u_light_color` and
  `u_light_intensity` uniforms.
- Direct light is tinted in linear color space and luminance-normalized before
  applying intensity. This keeps default white-light checksums stable while
  letting colored cart lights behave more like the Three.js source path.
- The uniforms are applied in both normal mesh and instanced mesh draw paths.

Validation:

```bash
make -C retroarch all
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 17 --to 17
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 64 --to 64
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 20 --to 21
```

Latest web-cart result after this narrow light-color pass: **74.6 avg** (start
73.9 / play 75.3). This is only a small improvement over the post-vignette
baseline and does **not** solve the broad brightness gap. Latest port-cart
control result remained healthy at **91.3 avg** (start 93.1 / play 89.4).

Next likely higher-impact target: compare Three.js `EffectComposer`/renderer
output behavior against the RA post shader and final `linear_to_srgb(ACES)`
path. The web composer currently does not add an explicit `OutputPass` in
`runtime/api-effects.js`, so tone/output ordering may differ from the GLES
single-pass approximation.

### Bloom radius/threshold shader follow-up

The user specifically asked to pay close attention to Three.js and Babylon.js
shader/effects code to bring more visual "wow" to RetroArch. Codex reviewed:

- `node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js`
- `node_modules/three/examples/jsm/shaders/LuminosityHighPassShader.js`
- `node_modules/three/examples/jsm/postprocessing/OutputPass.js`
- `runtime/backends/babylon/effects.js`

Findings:

- Three `UnrealBloomPass` uses a luminosity high-pass threshold, five blurred
  mip levels, and `bloomRadius` to shift weight toward wider mips.
- Babylon's `DefaultRenderingPipeline` bloom similarly exposes bloom weight,
  kernel/radius, threshold, and scale.
- RA already had a multi-mip bloom chain and a threshold uniform, but
  web-style `nova64.fx.enableBloom(strength, radius, threshold)` only forwarded
  strength. Radius/threshold were effectively ignored.

Runtime change:

- `nova64.post.setBloom(strength, radius, threshold)` now accepts optional
  radius/threshold args.
- `nova64.post.setBloomRadius()` and `nova64.post.setBloomThreshold()` were
  added, and `nova64.fx.enableBloom()` / `setBloomRadius()` /
  `setBloomThreshold()` now forward to the real post state.
- The GLES bloom chain now uses `post_state.bloom_threshold` for the first
  bright-pass and `u_bloom_radius` to shift final composite weight toward
  broader mips, inspired by Three's `lerpBloomFactor()`.
- Direct `setBloom(strength)` keeps the old defaults (`radius=0`,
  `threshold=0.32`), so existing post checksums remain stable.

Validation:

```bash
make -C retroarch all
NOVA64_GLES_TESTS=1 bash retroarch/tests/run_conformance.sh --skip-build --from 20 --to 21
pnpm run retroarch:visual:space-harrier -- --retro-cart=web --out=retroarch/build/space-harrier-web-parity --port=5178
pnpm run retroarch:visual:space-harrier -- --retro-cart=port --out=retroarch/build/space-harrier-port-parity --port=5178
```

Results:

- `21-post-effects` now asserts bloom radius/threshold state round-trips.
- GLES post checksum stayed `d5f674e4aa5e28a0` for old direct post defaults.
- Web-cart Space Harrier was **73.4 avg** after honoring its
  `enableBloom(0.38, 0.22, 0.78)` arguments. The high web threshold makes RA
  bloom more selective, so this does not solve the dark image by itself.
- Port-cart control stayed healthy at **90.9 avg**.

### Three.js shader investigation note

Codex reviewed the local Three.js shader sources:

- `node_modules/three/examples/jsm/shaders/FXAAShader.js`
- `node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js`
- Nova64 web wiring in `runtime/api-effects.js`

Findings:

- Web uses a real `FXAAShader`; RA previously used a small 4-neighbor
  smoothing approximation. A direct GLES adaptation of the Three FXAA logic was
  tested in the RA post shader. It compiled and ran, but did **not** improve
  Space Harrier web-cart gameplay parity; gameplay sharpness/score regressed in
  the tested capture. Do not reapply that direct port without also changing pass
  ordering, because web FXAA runs as an `EffectComposer` pass after bloom,
  whereas RA's single post shader samples the pre-bloom scene texture.
- Web `UnrealBloomPass` uses strength, radius, and threshold. RA currently
  forwards only bloom strength from `nova64.fx.enableBloom(s, r, t)` and uses a
  hard-coded GLES bright-pass threshold. A quick threshold-forwarding experiment
  was inconclusive and not retained. A proper future bloom parity pass should
  mirror the Three sequence: bright pass at half-res, progressive blur mips,
  radius-aware composite, then additive blend before FXAA/vignette.
- The retained change from this area remains the vignette semantic mapping and
  reduced smoothing weight from commit `62552ad`; that had a clear edge/center
  improvement without hurting the tuned port.

### Where Claude (Opus 4.7) left off

This whole-day session pushed two parallel tracks:

**Track 1 — `space-harrier-3d` RA-port cart**: now a real game with web-parity gameplay

- Visual parity score (`--retro-cart=port`): **91.0 avg** (start 92.4 / play 89.5)
- Health system: 100 HP, 25 dmg/hit, 1.4s invuln, 3s respawn shield, lives 3
- Hit feedback: red bg flash on health bar + HP numeric readout + tiered fill color + floating `-25` popup + 0.6 shake + chromatic glitch + bloom punch
- Enemy mesh groups (core sphere + green eye + 2 dark-purple wing slabs) match web exactly
- Tiered enemy types: normal, fast (cyan), tank (orange, wave 4+), boss (red, every 3rd wave with spread shot)
- Enemy bullets that aim at player
- Wave system with WAVE CLEAR banner + 200×wave bonus + escalating spawn rate
- Explosion particles on kill (pool of 64, color varies by type)
- Distance scoring + kill streak counter with bonus
- Game over screen full-screen red overlay with centered text (was off-screen earlier)
- **Critical bug fixed**: `rect(x,y,w,h,color)` defaults to filled=true in the runtime — my outline `rect()` calls were painting WHITE over the green health fill. All 4 cart `rect()` calls now pass `false` explicitly. Likely silent in other carts; worth an audit.
- Shadow casting on (`setShadowQuality('medium')`) for 3D depth
- Bloom tuned to web's exact 0.38 (was 0.55 → "out of focus" per user)

**Track 2 — web-cart runtime compat**: 54/71 → **67/71 PASS** (excluding XR)

- New shims (commit `decf293`, 228 lines): `drawRoundedRect`, `drawRect`, `withBlend`, `fetch`, `loadModel`/`loadVoxModel`/`loadVoxelWorld`/`playAnimation`, `getMousePosition`/`setMouseButton`/`isMouseDown`/`setTextBaseline`, `uiProgressBar`/`drawAllPanels`
- Augments: `createMinimap` now returns object with `.player {x,y,color,size}` + `.entities []`. `createEmitter2D` returns proxy object with mutable `.x/.y/.rate`. `createPool` (global) returns object with `.forEach/.filter/.length`.
- `nova64.draw.circle` properly aliased to global 5-arg `circle()` (not 4-arg `circ`)
- 14 carts newly passing this round: blend-aurora, flash-demo, instancing-demo, model-viewer-3d, nature-explorer-3d, nft-art-generator, nft-worlds, particle-trail, particles-demo, pbr-showcase, skybox-showcase, ui-demo, vox-viewer, wad-demo

### ❌ Out of scope (DO NOT WORK ON — user-confirmed)

- **All XR/AR carts**: `ar-hand-demo`, `vr-demo`, `vr-sword-combat`. No libretro webcam/XR device API. They load via stubs but real integration is not on the roadmap. Their WARN status is acknowledged and intentional.

### Remaining 3 real WARN carts

| Cart           | Gap                                                                                     | Effort                                  |
| -------------- | --------------------------------------------------------------------------------------- | --------------------------------------- |
| `blend-aurora` | Canvas2D `ctx.createLinearGradient` inside `withBlend(mode, cb=>...)`                   | Big — needs HTML5 Canvas API surface    |
| `stage-cards`  | Canvas2D `ctx.roundRect` (same surface)                                                 | Big — shares lift with blend-aurora     |
| `wizardry-3d`  | `nova64.util.createPool().forEach` (my global augment didn't reach this namespace path) | Small — wrap nova64.util.createPool too |

### Suggested next picks (in effort order, smallest first)

1. **Fix wizardry-3d**: my createPool augment didn't catch nova64.util.createPool — it runs after codex's mirror but maybe out-of-order. Re-check `compat_late_js` order in `nova64_libretro.c`. 10 minutes.
2. **Audit other carts for the `rect()` filled-bug** — many carts likely have the same silent issue. Grep for `rect\(.*,.*,.*,.*,[^,]*\)$` (5-arg) in `retroarch/games/*.js` and `examples/*/code.js`.
3. **Implement real `parseCanvasUI`** — currently a no-op stub. Would unlock hud-demo's actual XML UI rendering. Spec listed in BACKLOG.
4. **Per-mesh alpha API** — `createAdvancedCube` accepts `opts.opacity`/`opts.transparent` but ignores. Wire `setMeshAlpha(mesh, a)` + transparent z-sort pass.
5. **Canvas2D `ctx` API** — big lift but unlocks blend-aurora + stage-cards + future drawn-from-web carts.
6. **`ui.createButton` callback wiring** — `updateAllButtons()` currently doesn't poll pointer/joypad to fire stored callbacks.

### Current deployed state

| Artifact            | Path                                           | Source commit                   |
| ------------------- | ---------------------------------------------- | ------------------------------- |
| Windows .dll        | `C:\RetroArch-Win64\cores\nova64_libretro.dll` | `decf293` (compat round 3)      |
| Linux .so           | `retroarch/nova64_libretro.so`                 | `decf293`                       |
| 9 .nova carts       | `C:\RetroArch-Win64\content\nova64\*.nova`     | all latest                      |
| 18 playlist entries | `C:\RetroArch-Win64\playlists\games.lpl`       | 1:1 with `retroarch/games/*.js` |

All synced and ready to play in RetroArch.

### Probe + iterate workflow

```bash
# Compat probe (all 71 web carts)
/tmp/compat-all.sh    # (script at c:\tmp\compat-all.sh — packages each, runs harness, reports PASS/WARN/FAIL)

# Visual parity (web vs RA side-by-side)
node retroarch/tests/space_harrier_visual_parity.mjs --retro-cart=port
# Outputs PNGs to retroarch/build/space-harrier-parity/{browser,retroarch,diff}/

# Iterate cart-side
# 1. Edit retroarch/games/<cart>.js
# 2. Repack: python3 -c "import zipfile; z=zipfile.ZipFile('retroarch/games/<cart>.nova','w',zipfile.ZIP_DEFLATED); z.write('retroarch/games/<cart>.js','code.js'); z.write('examples/<cart>/meta.json','meta.json'); z.close()"
# 3. Sync: cp retroarch/games/<cart>.nova /mnt/c/RetroArch-Win64/content/nova64/

# Iterate runtime-side
cd retroarch && make all                # builds .so (Linux harness)
# Then cross-build Windows for live testing:
cp -r build build-linux && rm -rf build && \
  make platform=win-cross && \
  cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/ && \
  rm -rf build && mv build-linux build
```

### Key gotchas saved to mempalace (read these before touching anything)

- **`nova64.rect()` defaults to filled=true** when 5 args. Always pass `false` as 6th arg for outlines. Silent bug magnet.
- **`drawScanlines` alpha** — runtime now tolerates both 0-1 (RA) and 0-255 (web).
- **Cube shader range is compressed** (`0.58 + diffuse * 0.42`). Ambient ≥ 0.6 clips diffuse → flat look. Use 0.30-0.42. Web carts default to 0.62 which works in Babylon but flattens in RA. There's an in-progress attempt at an opt-in `setShadingContrast(c)` runtime API but it was reverted due to conformance instability — pre-existing `16-transforms.js` checksum is nondeterministic across runs. Future attempt: stable rebaseline first, then add the uniform.
- **Angled directional light** makes adjacent flat floor tiles look stepped/voxel. Use straight-down `(-0.5, -1, -0.5)`.
- **Too-high emissive flattens spheres into disks.** 0.05-0.20 for shaded-but-visible, 0.5+ for intentional glow.
- **Score-as-float** (from `score += dt * 25` distance scoring) — always `(score | 0)` for display + comparison to best.
- **DLL must be redeployed after runtime changes** — user runs Windows RA; if the .dll is stale even the latest cart code uses the old runtime.

### Commit chain this session (oldest → newest)

```
dae78e1 feat(space-harrier-3d): real gameplay parity — health, enemies, hit glitch
9a429b9 feat(space-harrier-3d): real 3D shading + visceral hit feedback
9322f80 feat(space-harrier-3d): wave mgmt + explosions + streaks + boss
d61697b fix(space-harrier-3d): health bar GREEN + centered game over + float BEST
d88d515 fix(space-harrier-3d): bloom 0.55->0.38 + enable shadow casting
decf293 feat(runtime): web-cart compat round 3 — 54/71 -> 67/71 PASS
9fd61a0 docs(backlog): pin XR/AR out-of-scope + reflect 67/71 PASS
69a4962 chore: commit Codex parity harness WIP (--retro-cart flag + npm script)
2cc92f6 docs(handoff): prepend Codex handoff section — full session status
```

---

---

## TL;DR

- ✅ Latest shipped work: web-cart compatibility layer. `examples/*/code.js`
  carts can now be loaded directly by the RA runtime without manual ports.
- ✅ First compat probe is `9 PASS`, `4 WARN`, `5 FAIL` across 19 web carts.
  Details and remaining API gaps are tracked in `BACKLOG.md`.
- ✅ `examples/space-harrier-3d/code.js` now loads unmodified on RA. Treat web
  carts as source of truth; make RA runtime/compat changes to reach parity.
- ✅ Hardware OpenGL (Core 3.3 / GLES 3) rendering works on Windows RetroArch
- ✅ Demoscene cart renders real 3D scenes with cinematic bloom + sky gradient
- ✅ CRT scanlines + RGB aperture-grille post effect (visible on dark scenes)
- ✅ FPS overlay built in (`Shift + F` toggle, works in any cart)
- ✅ Bitmap font now covers nearly all ASCII printable chars including proper lowercase
- ✅ Opt-in `printTight()` / `tightTextWidth()` variable-width text path is wired for denser HUDs
- ✅ Browser-style scaled text is wired: `print(..., scale)`, `printCentered(..., scale)`, `printRight(..., scale)`, `printScaled()`, and `printTightScaled()`
- ✅ `drawGlowText(..., scale)` and `drawGlowTextCentered(..., scale)` now honor the web API scale argument for larger glowing titles
- ✅ Browser-style `nova64.draw` aliases now include Batch 41 text/shape helpers (`drawTriangle`, glow/pulsing text, `tristrip`, floating text)
- ⚠️ User reports performance feels slow on Windows (~38–40 FPS, 31–35 ms/frame on AMD Radeon 780M)
- ⚠️ Linux Mesa software harness hits ~110 FPS at ~9 ms/frame, so Windows hardware _should_ be vastly faster — Windows-specific bottleneck unidentified
- ⚠️ Numeric visual-parity score: 89.6% average / 87.8% strict average after stabilizing the browser reference hook and softening scene-0 terrain. The "85% mirage" warning is still relevant: do not reintroduce the old flat `drawWebBloomWash()` overlay. This score comes from scene-level sky/fog/ambient/emissive/post tuning plus HUD metric alignment against deterministic screenshots.
- ✅ Full 519-case conformance sweep has been re-baselined and passes with the current screenshot set.
- ✅ Tight text effect variants are wired globally and under `nova64.draw`.
- ✅ `drawLightning` now keeps the legacy Batch 25 six-argument shape while also supporting a newer glow/branch options shape.
- ✅ New `retroarch/BACKLOG.md` captures deferred Windows perf work, queued visual features, stale-file cleanup, and code-anchored TODOs
- ✅ Implemented the selected visual feature: **HDR post target (`RGBA16F`) + multi-mip bloom**, with `RGBA8` fallback if float render targets are not supported and old single-pass bloom kept as fallback
- ✅ Recent C changes include the Shift+F perf overlay diagnostics plus the new HDR/multi-mip bloom post-processing path

---

## Current 2026-05-24 web-cart compat state

Latest commits:

```
d65d8e7 feat(runtime): web-cart compat layer - examples/space-harrier-3d.js now loads unmodified
0e60c5b feat(runtime): expand web-cart compat - 5/19 -> 9/19 carts now load
ef10683 docs(backlog): document web-cart compat layer landing + remaining gaps
```

What's in this delta:

- Runtime-side compatibility landed in `retroarch/nova64_libretro.c`; no web
  cart rewrites are required for the working set.
- New and expanded namespaces include `console`, `nova64.fx`, `nova64.util`,
  `nova64.scene`, `nova64.ui`, `nova64.camera`, `nova64.light`,
  `nova64.input`, `nova64.data`, and `nova64.tween`.
- `drawScanlines` now accepts the web convention of alpha values in the
  `0..255` range, avoiding opaque-black scanline output from unchanged web
  carts.
- `space-harrier-3d` can run both as the existing RA port and as the unmodified
  web cart loaded through the compat layer.

Validation / probe notes:

- First 19-cart compat probe: `9 PASS`, `4 WARN`, `5 FAIL`.
- Working unmodified web carts include `hello-world`, `hello-namespaced`,
  `filter-glitch`, `hud-demo`, `space-harrier-3d`, `particle-fireworks`,
  `screen-demo`, `input-showcase`, and `boids-flocking`.
- Remaining gaps are listed in `BACKLOG.md` under "push web-cart compat from
  9/19 -> all-green".

Next target:

1. Investigate the WARN carts first: `hello-3d`, `hello-skybox`,
   `3d-advanced`, `camera-platformer`, and `demoscene`.
2. Keep web carts as the source of truth. Prefer RA runtime compatibility
   shims over changing `examples/*/code.js`.
3. After each compat improvement, rerun the small probe and update `BACKLOG.md`
   with the changed pass/warn/fail counts.

---

## Current 2026-05-22 deterministic-reference parity state

Latest work after the HUD/final-scene pass:

```
1d42aa8 feat: refine RetroArch demoscene HUD parity
```

What's in this delta:

- `examples/demoscene/code.js` debug hook now calls `resetRandom()` and sets
  `gameTime` to the cumulative scene timeline before capturing a frozen web
  reference. Before this, scene 0 could drift depending on page warmup and
  prior random work.
- `retroarch/games/demoscene.js` scene 0 now softens the instanced terrain/grid
  meshes with opacity `0.42`, which reduced the hard block silhouettes against
  the stabilized browser reference.
- Rejected during this pass: stronger scene-0 glow/atmosphere, extra opacity on
  non-instanced scene-0 props, lower scene-4 object opacity, and a larger cyan
  scene-4 horizon. These all regressed focused scores.

Validation from this pass:

- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `86.7`
  - s1 `91.2`
  - s2 `90.2`
  - s3 `90.4`
  - s4 `89.5`
  - average `89.6`
  - strictAverage `87.8`

Next target:

1. The remaining 90% push is scene-0 composition. The deterministic reference
   makes that target stable now.
2. Keep `drawWebBloomWash()` disabled and avoid broad global bloom changes;
   mesh opacity/scene composition moved the real blocker more than exposure did.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 HUD + final-scene parity state

Latest work after the near-90 pass:

```
c6b1d1e feat: push RetroArch demoscene parity near 90
```

What's in this delta:

- Top HUD panel metrics now more closely follow the web cart:
  panel fill color/alpha, title x/y, progress bar y/height/color, status panel
  text x/y, and bottom panel fill/text colors were aligned.
- Bottom description/watermark text stays centered in RetroArch. An experiment
  to draw it from x=320 like the apparent web behavior regressed focused scene
  scores and was reverted.
- Scene 2 was backed off from an overly white city wash to a slightly more
  magenta reference match.
- Scene 3 was whitened/coolened slightly so the energy-core wash is less
  saturated-magenta and closer to the browser capture.
- Scene 4 received a small cyan horizon/less-red atmosphere correction.

Validation from this pass:

- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `87.8`
  - s1 `91.3`
  - s2 `90.3`
  - s3 `90.4`
  - s4 `89.4`
  - average `89.8`
  - strictAverage `88.1`

Next target:

1. A durable 90% likely needs scene-0 composition/reference determinism work
   rather than more bloom. Scene 0 still varies most between focused and full
   browser captures.
2. Do not move the bottom HUD text to x=320; that was tested and made focused
   scenes worse.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 all-scene luminous-volume parity state

Latest work after the ENERGY_CORE pass:

```
13e470c feat: boost RetroArch demoscene energy core parity
```

What's in this delta:

- `retroarch/games/demoscene.js` scenes 0, 1, 2, and 4 were retuned after the
  ENERGY_CORE pass using the same screenshot-first luminous-volume method.
- Scene 0 now balances a magenta field with a right-side white horizon glow.
- Scene 1 reduces opaque magenta ring dominance with lower torus emissive +
  opacity and a brighter cyan atmospheric field.
- Scenes 2 and 4 use brighter sky/fog/ambient values and stronger but balanced
  emissives to match the web reference's bloom-washed frames while preserving
  faint 3D silhouettes.
- `drawWebBloomWash()` remains disabled. The high score is from cart-facing
  scene parameters and native post bloom.

Validation from this pass:

- Previous `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` pass:
  - s0 `87.6`
  - s1 `91.1`
  - s2 `90.0`
  - s3 `89.1`
  - s4 `89.3`
  - average `89.4`
  - strictAverage `87.6`

Next target:

1. Reaching a durable 90% likely needs small scene-0/scene-3/scene-4 composition
   improvements, not more global bloom. Scene 0 still has the lowest score.
2. Judge screenshots together with the metric; several browser reference frames
   are intentionally very bloom-washed, but avoid returning to a fake fullscreen
   mask.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-22 ENERGY_CORE parity state

Latest work after the 67% rebaseline commit:

```
d7b4faa feat: tune RetroArch demoscene parity and rebaseline conformance
```

What's in this delta:

- `retroarch/games/demoscene.js` scene 3 (`ENERGY_CORE`) now uses a brighter
  magenta/pink sky gradient, much lighter vignette, closer fog, stronger
  ambient light, and higher emissive values for the core beam, central sphere,
  rings, and orbiting energy bodies.
- A camera-only experiment that matched the web formula exactly dropped scene 3
  from roughly `60` to `39`, so it was reverted. The useful match was luminous
  volume and exposure, not moving the camera away from the core.
- `drawWebBloomWash()` remains disabled. The current scene-3 frame is bright
  like the web reference but still comes from 3D objects, fog, and post bloom.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- Focused scene-3 run:
  `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene -- --scene=s3`
  reports `score=89.1`, `strictAverage=87.4`.
- Full comparator run:
  - s0 `77.0`
  - s1 `71.2`
  - s2 `66.3`
  - s3 `89.3`
  - s4 `66.4`
  - average `74.1`
  - strictAverage `70.9`

Next target:

1. Push the remaining low scenes, especially s2 and s4, by matching luminous
   volume/exposure first and camera timing only if the image proves it helps.
2. Keep judging screenshots alongside numbers; scene 3 proves legitimate bloom
   volume can score well without bringing back the flat wash overlay.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 scene parity / rebaseline state

Latest work after the post-chain pass:

```
045f1a9 fix: tune RetroArch post bloom and CRT anti-aliasing
accddaa feat: add scaled RetroArch text helpers
cf556eb docs: clean up RetroArch notes
```

What's in this delta:

- Demoscene scene-by-scene parity tuning in `retroarch/games/demoscene.js`.
  Sky gradients, ambient, fog, vignette, bloom, and a few emissive values were
  shifted toward the web Three.js reference's heavy bloom-wash color
  distribution while preserving visible 3D geometry.
- `nova64_libretro.c` adds tight variants of the text effects:
  `printShadowTight`, `printOutlineTight`, `printRainbowTight`,
  `printWaveTight`, `printFlashTight`, `printShakeTight`, and
  `printGradientTight`. They are registered on both global and `nova64.draw`.
- `drawLightning` was upgraded with a richer glow/branch implementation while
  preserving the legacy `drawLightning(x1, y1, x2, y2, segs, color)` behavior
  used by conformance cart 344.
- `retroarch/tests/run_conformance.sh` was re-baselined for the current
  screenshot set, including font/glyph fixes, post-chain changes, and the
  scene-tuned captures. Updated `screenshots/retroarch/*.png` files are part
  of this baseline.
- `BACKLOG.md` records the shipped work and leaves future parity work focused
  on scene timing, camera composition, particle density, and HUD/font metrics.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `bash retroarch/tests/run_conformance.sh --from 344 --to 344 --skip-build`
  passes with checksum `aaf171a255fb3792`.
- `bash retroarch/tests/run_conformance.sh --skip-build` passes across the
  full suite.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `72.4`
  - s1 `71.2`
  - s2 `66.2`
  - s3 `59.7`
  - s4 `66.1`
  - average `67.1`
  - strictAverage `63.6`

Next target:

1. Push parity beyond ~70 by matching capture timing, animation speeds,
   camera composition, particle counts, and HUD/font metrics.
2. Keep the fake `drawWebBloomWash()` path disabled. The current score is a
   real-scene score, not a mask.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 post-chain bloom/AA state

Latest work after the scaled-text pass:

```
accddaa feat: add scaled RetroArch text helpers
cf556eb docs: clean up RetroArch notes
72eaf39 docs: add RetroArch HDR bloom handoff
```

What's in the post-chain delta:

- Rebalanced multi-mip bloom combine weights toward the wider, lower-frequency
  mips so glow reads broader and less like a tight outline.
- Softened the first brightpass ramp (`threshold + 0.38`) so mid-bright neon
  contributes to bloom without painting fake fullscreen wash rectangles.
- Lightened the final CRT scanline/grille pass so bloom and dark-scene detail
  survive the CRT overlay better.
- Fixed a real AA bug: the previous FXAA-like smoothing happened before CRT
  barrel warp, then CRT overwrote the smoothed color with a fresh sample. The
  smoothing now runs after the final CRT UV is known, so CRT-enabled demoscene
  scenes no longer bypass it.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `54.0`
  - s1 `50.4`
  - s2 `39.0`
  - s3 `49.7`
  - s4 `38.5`
  - average `46.3`
  - strictAverage `44.6`
- A bloom-only tuning run measured average `47.4`, strictAverage `45.8`; that
  run was not kept as-is because it did not include the CRT-path AA fix.

Next target:

1. Scene-by-scene composition/emissive matching against browser captures. The
   browser reference is still heavily bloom-washed in several comparator frames,
   while RetroArch intentionally keeps real 3D geometry visible.
2. Variable-width glyph tuning inside `printTight()` if HUD density remains a
   focus.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 scaled-text state

Latest work after the HDR/mip pass:

```
cf556eb docs: clean up RetroArch notes
72eaf39 docs: add RetroArch HDR bloom handoff
94d9a9f feat: expose RetroArch text effects on nova64.draw
2c8bb5e fix: honor RetroArch glow text scale
a285271 feat: add tight RetroArch HUD text
```

What's in the scaled-text delta:

- `print(text, x, y, color, scale)` now treats a numeric fifth argument as
  browser-style scale. Existing string alignment still works, and an optional
  sixth argument can carry alignment.
- Added explicit `printScaled(text, x, y, color, scale, align)` and
  `printTightScaled(text, x, y, color, scale, align)` on both global and
  `nova64.draw`.
- `printTight(text, x, y, color, align, scale)` and
  `tightTextWidth(text, scale)` now support scaled tight text without changing
  the default scale-1 output.
- `measureText(text, scale)`, `printCentered(..., scale)`, and
  `printRight(..., scale)` now support the browser helper scale argument.
- Added `retroarch/conformance/1092-scaled-text.js` and locked checksum
  `305d05942969cdcd`.
- Demoscene start-screen call-to-action now uses the larger tight text path.
  The in-scene HUD intentionally stays web-sized so the parity target does not
  drift for a styling experiment.

Validation from this pass:

- `make clean && make platform=unix && make harness` passes.
- `make platform=unix && make harness` passes after the final cleanup.
- `bash retroarch/tests/run_conformance.sh --from 813 --to 815 --skip-build` passes.
- `bash retroarch/tests/run_conformance.sh --from 1092 --to 1092 --skip-build` passes.
- `NOVA64_GLES_TESTS=1 pnpm run retroarch:visual:demoscene` passes:
  - s0 `51.7`
  - s1 `49.4`
  - s2 `37.8`
  - s3 `46.1`
  - s4 `37.1`
  - average `44.4`
  - strictAverage `42.7`
- `130 measure text` still renders OK but its locked checksum is stale after
  earlier font/glyph changes: actual `090b644857ea88cd`.

Next target:

1. Bloom/emissive tuning against the current capture set, judging the actual
   images rather than only the metric.
2. Variable-width glyph tuning inside `printTight()` if HUD density remains a
   focus.
3. Windows perf investigation remains deferred unless the user asks.

---

## Current 2026-05-21 HDR/multi-mip bloom state

Latest committed work before this HDR/mip pass:

```
72eaf39 docs: add RetroArch HDR bloom handoff
94d9a9f feat: expose RetroArch text effects on nova64.draw
2c8bb5e fix: honor RetroArch glow text scale
a285271 feat: add tight RetroArch HUD text
7b415ff feat: add demoscene light cycles
b25e80f feat: batch instanced transform uploads
```

New `nova64_libretro.c` implementation points:

```
M  retroarch/nova64_libretro.c
M  retroarch/BACKLOG.md
M  retroarch/HANDOFF_HWGL.md
M  retroarch/MEMPALACE_DIARY.md
```

What's in the `nova64_libretro.c` delta from this pass:

- Added `GL_RGBA16F` / `GL_HALF_FLOAT` constants and a guarded HDR post target path.
- `gles_init_post_resources()` first attempts an `RGBA16F` color target, checks framebuffer completeness, and falls back to the old `RGBA8` path if unsupported.
- Added `NOVA64_BLOOM_MIPS=5` bloom resources: fbo/texture + ping fbo/texture per level.
- Added downsample and separable blur shaders. The first level applies a brightpass; later levels downsample the blurred previous level.
- Final post shader samples the 5 bloom mips and combines them with broad weighted halos. If mip resources fail, it falls back to the old 13-tap single-pass bloom.
- Post resource logs now include `format=RGBA16F|RGBA8` and `bloom_mips=N`.
- `gles_destroy_resources()` now also releases post/bloom resources so context resets do not leak the extra FBOs/textures.

MemPalace/MCP status:

- `.vscode/mcp.json` is wired to launch `mempalace-mcp` through WSL.
- `package.json` includes `mempalace:status`, `mempalace:wake`, `mempalace:repair-status`, `mempalace:mine`, `mempalace:mine:runtime`, `mempalace:mine:retroarch`, `mempalace:sync:retroarch`, and `mempalace:search`.
- `pnpm run mempalace:status` completed on 2026-05-21. It quarantined two corrupt HNSW segment directories automatically and still reported the `nova64_retroarch` room as available.

Validation from this pass:

- `make platform=unix` passes.
- `make harness` passes.
- Focused harness capture logs: `format=RGBA16F  bloom_mips=5`, checksum `880c5d0245871676`.
- `NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs` passes:
  - s0 `58.5`
  - s1 `49.6`
  - s2 `38.0`
  - s3 `47.1`
  - s4 `37.7`
  - average `46.2`
  - strictAverage `44.6`
- `make clean && make platform=win-cross` passes.

Next target:

1. Tune bloom weights/thresholds and scene emissive strengths from the new capture set; the infrastructure is no longer the blocker.
2. Keep comparing real captures visually, not only the numeric metric.
3. Windows perf investigation remains deferred unless the user asks; note the mip bloom path increases post draw calls when bloom is active.

---

## What works now

### Hardware GL on Windows

- Driver: AMD Radeon 780M, OpenGL 4.6 Core Profile (reports as 3.3 Core to the libretro callback)
- Video driver: `glcore` in `retroarch.cfg`
- DLL: `C:\RetroArch-Win64\cores\nova64_libretro.dll` (built by `make platform=win-cross` in WSL)

### Demoscene runs with real 3D, gradient sky, and bloom

- s0 GRID_AWAKENING: voxel terrain + bright sun + magenta→purple sky gradient
- s1 DATA_TUNNEL: magenta torus portals with soft bloom halos + data streams
- s2 DIGITAL_CITY: towers and structures, restrained bloom
- s3 ENERGY_CORE: orbiting spheres + glowing rings, dark gradient sky
- s4 THE_VOID: floating glowing spheres with soft halos

### FPS overlay

- Toggle: `Shift + F` (edge-triggered, no spam from holding)
- Display: top-left yellow text `FPS N  M ms` with black drop shadow
- 500 ms wall-clock measurement window
- Core-level — works in every cart

### Font

- 5×7 bitmap font
- Coverage: A-Z, a-z (proper lowercase, not auto-upper), 0-9, and:
  - `! " ' ( ) \* + , - . / : ; < = > ? @ [ \ ] \_ # % & { | } ~ $ \``
- Lowercase has proper x-height, ascenders, descenders, and i/j dots
- Forward slash bug fixed (it was rendering as a backslash shape before)
- Anything outside this set still falls back to the 0x1F solid block
- `printTight(text, x, y, color, align?)` and `tightTextWidth(text)` trim empty glyph columns for HUD text density. Existing `print()` / `textWidth()` stay fixed-width for compatibility.
- `drawGlowText(text, x, y, color, glowColor, scale?)` and
  `drawGlowTextCentered(text, cx, y, color, glowColor, scale?)` now scale the
  bitmap glyphs instead of ignoring the argument.
- `print(text, x, y, color, scaleOrAlign?, align?)` accepts browser-style
  numeric scaling while preserving string alignment.
- `printScaled()` and `printTightScaled()` provide explicit fixed-width and
  tight-glyph scaled variants for larger titles and prompts.
- `measureText(text, scale)`, `printCentered(..., scale)`, and
  `printRight(..., scale)` support the browser helper scale argument.

### Tooling

- `make platform=unix` — Linux .so (used by the harness for headless GLES testing)
- `make platform=win-cross` — Windows DLL via mingw64
- `make harness` — builds the EGL-based headless test harness
- `node retroarch/tests/demoscene_visual_parity.mjs` — runs web vs retroarch visual diff (Playwright + harness)
- `bash retroarch/tests/run_conformance.sh --from N --to N --skip-build` — conformance suite
- `NOVA64_PERF=1` env var enables periodic perf telemetry (already in `core_perf_now_us` / `core_perf_record_frame`)

---

## Bugs fixed this session arc

### 1. `libretro.h` struct layout mismatch _(root cause of all Windows GL issues)_

`retroarch/libretro.h` had `retro_hw_render_callback` fields in the wrong order and contained a `void *context_data` field not present upstream. RetroArch writes `get_current_framebuffer` at offset 16 (its layout); we read it at offset 24 (our layout) so the read got `get_proc_address` instead — calling it crashed with `0xC0000005`.

**Fix:** reordered fields to match upstream libretro.h; removed `context_data`. Already committed.

### 2. `hw_render` not zero-initialised + multi-call overwrites

`renderer_request_hardware_context()` is called 3 times by RetroArch. Later calls would overwrite `gles.requested = false` after we'd already got `true`, falling back to software.

**Fix:** `memset(&hw_render, 0, sizeof(hw_render))` + early-exit `if (gles.requested) return;`. Already committed.

### 3. Wrong shader version on Linux

Briefly changed shaders to `#version 330` (desktop) — Mesa GLES 3.2 doesn't support that. Black screen on Linux harness, broke the parity test.

**Fix:** all 10 shader headers use `#version 300 es\nprecision highp float;`. Works on both Mesa GLES and AMD Windows GL Core via `GL_ARB_ES3_compatibility`. Already committed.

### 4. `windows.h` macro pollution

`#include <windows.h>` clashed with code further down the file.

**Fix:** `#define WIN32_LEAN_AND_MEAN`, `#define NOMINMAX`, `#define VC_EXTRA_LEAN` before the include (all inside `#ifdef _WIN32`). Already committed.

### 5. `get_proc_address` is NULL in glcore driver

**Fix:** Windows fallback in `load_gles_proc()` using `GetModuleHandleA("opengl32.dll")` + `wglGetProcAddress`. Already committed.

### 6. `neon-pinball.js` `ReferenceError: lFlip is not defined` every frame

**Fix:** added `let lFlip = 0, rFlip = 0;`. Already committed.

### 7. Demoscene `drawWebBloomWash()` was masking the entire 3D scene

Cart drew fullscreen flat-color rectfills from `y=0` to `y=315`, hiding the actual 3D rendering. Originally added to fake the web's heavy Three.js bloom.

**Fix:** removed the `drawWebBloomWash()` call from the cart's `draw()`. Already committed.

### 8. CRT scanlines washed out by additive bloom

Original shader applied scanlines inside the CRT block, then bloom _added_ brightness on top, saturating to white and erasing the lines.

**Fix:** moved scanlines + RGB aperture-grille to the END of the post pipeline (after vignette, after bloom, after color grade) so they survive the additive bloom. Already committed.

### 9. Forward slash glyph rendered as backslash shape

The original `0x01 << (6 - row > 4 ? 4 : 6 - row)` formula visually produced a backslash, not a forward slash. Affected all carts that print `/`.

**Fix this session:** replaced with explicit `{0x01, 0x02, 0x04, 0x04, 0x08, 0x10, 0x10}` array. **Note:** this will shift checksums for conformance tests that print `/`. Re-baseline expected hashes when next running the suite.

### 10. Demoscene `skyPanel` cube hack

Cart was rendering a giant flat cube to fake a sky behind the 3D scene because `setSkyColor()` only changed the clear color.

**Fix this session:** added a real `render_gles_sky_gradient()` path that draws a fullscreen NDC quad with a `smoothstep`'d top→bottom color mix when `setSkyColor()` is set without an equirectangular skybox texture. Removed the `skyPanel` cube creations from scenes 0 and 3 in the cart.

---

## The 85% Mirage (still relevant context)

The earliest parity test reported ~85% similarity between web and retroarch. That number was **misleading**: both engines were producing flat colored blocks. The web from heavy Three.js bloom destroying detail. The retroarch from `drawWebBloomWash()` painting fake flat rectangles. Mediocre rendering matched against mediocre rendering.

Once the wash was removed, retroarch shows actual detailed 3D geometry with scanlines, real bloom halos, sky gradients. The web still over-blooms to flat washes. **Numeric diff went up (parity dropped to ~43%) even though retroarch's output is visually much better.**

The decision point: chase the 85% number (by re-enabling fake washes or destroying detail with extreme bloom), or keep authentic rendering at lower numeric parity. We went with **authentic rendering**.

Recent score progression on visual parity test:

- After wash removal: 45.6%
- After sky gradient: 42.6%
- After heavier bloom: 43.0%
- Fresh Codex validation after handover review: 44.1% average / 42.6% strict average
- After scene-2 light cycles + placement fix: 43.0% average / 41.4% strict average
- After tight HUD text pass: 44.1% average / 42.6% strict average
- After glow text scale pass: 44.7% average / 43.2% strict average

Score barely moves because every visual improvement diverges further from the web's flat-color reference. Visually we keep getting closer to a _good-looking_ render; numerically we keep moving away from the web's _blown-out_ render. Don't optimise for the number.

---

## Performance investigation (NOT YET DONE — high priority)

> User reports rendering feels slow / low FPS in the live Windows session.
> FPS overlay shows ~38–40 FPS at 31–35 ms/frame on AMD Radeon 780M.

Linux Mesa software harness hits ~110 FPS at ~9 ms/frame. Windows AMD GPU should be vastly faster than software, not slower. Something Windows-specific is wrong.

### Candidate bottlenecks (ranked)

1. **Framebuffer / viewport size mismatch.** The current post color/depth target allocation in `gles_init_post_resources()` uses `NOVA64_WIDTH × NOVA64_HEIGHT` (640×360), so the post FBO itself is not obviously window-sized from source. Still log the post allocation, `hw_render.get_current_framebuffer()` target, viewport, and RetroArch output size on Windows; if any pass is actually running at 1920×1080, fragment work scales by ~9× and explains the slowdown.
2. **AMD driver shader recompilation** — modern drivers re-optimise shaders on state changes; not common but possible.
3. **Excessive state changes** — 41 draw calls × state changes per call may cause pipeline stalls on AMD's command processor.
4. **Texture upload sync** — 920 KB glTexSubImage2D for the overlay every frame might be a CPU↔GPU sync point on Windows.
5. **RetroArch's own video shaders / overlays** — if user has a CRT shader, audio sync, or anything similar enabled in RA settings, that adds work on top of ours.

### How to diagnose

Perf telemetry is already wired (`NOVA64_PERF=1`). On Linux harness we get:

- `cart_us avg=150–1100`, `render_us avg=6200–9970`, `frame_us avg=6900–10200`
- `draw_calls/frame=18–55`, `overlay_uploads/frame=1`, `inst_xform/frame=0–6`

Next-session plan:

1. Run `NOVA64_PERF=1 retroarch.exe -L cores/nova64_libretro.dll <cart>` on Windows and capture the perf log.
2. Add logs around `gles_init_post_resources()` / `render_gles_post_pass()` for post FBO allocation, HW framebuffer id, viewport, and frontend output size. If any expensive pass is 1920×1080 instead of 640×360, that's our smoking gun.
3. If FBO is correct: instrument the post pass and overlay upload separately to find which segment is heaviest on Windows.

### Quick wins if confirmed bottlenecks

- **Reduce bloom from 13 taps to 5** if it's the bottleneck.
- **2-pass separable Gaussian at 1/2 res** (see "Bloom: explore-later" TODO note in `nova64_libretro.c` next to the bloom shader for the full multi-mip plan).
- **Dirty-flag the software framebuffer** — skip `glTexSubImage2D` when nothing changed since last frame.
- **Pre-build instance transforms in a Float32Array** — current `setInstanceTransforms` still iterates JS values one-at-a-time even after the batching helper.

---

## Files modified in the previous text-effects session (already committed)

```
M retroarch/games/demoscene.js
M retroarch/nova64_libretro.c
M retroarch/HANDOFF_HWGL.md
M retroarch/MEMPALACE_DIARY.md
A retroarch/conformance/815-draw-namespace-textfx.js
M retroarch/tests/run_conformance.sh
```

These were committed across:

- `a285271 feat: add tight RetroArch HUD text`
- `2c8bb5e fix: honor RetroArch glow text scale`
- `94d9a9f feat: expose RetroArch text effects on nova64.draw`

### What's in `nova64_libretro.c`

- FPS overlay state (`g_fps_overlay_enabled`, `g_fps_value`, etc.) at ~line 1613
- `Shift+F` edge detect in `update_input()` around line 29900
- FPS overlay drawing in `retro_run()` next to developer console block (~line 33370)
- Font lowercase table `lowers[26][7]` in `glyph_row()` (~line 2880)
- Extra ASCII glyphs: `' , ! ? ( ) [ ] " ; + = _ * # % & < > @ { } | ^ ~ $` and corrected `/` and `\`
- Sky gradient program: `gles_create_sky_gradient_program()` + `render_gles_sky_gradient()` (~line 31881)
- `render_gles_skybox()` now falls back to gradient when no texture skybox is bound
- `gles_destroy_skybox_resources()` cleans up the gradient program too
- Bloom shader tuned: brightpass 0.32–0.85, wider kernel, final multiplier 1.0; explore-later note left in the shader source

- `NOVA64_PERF=1` telemetry now splits post pass, overlay conversion, overlay
  upload, and overlay draw timing; overlay draw-call counting no longer double
  counts the fullscreen overlay quad.
- Added `printTight()` / `tightTextWidth()` on both the global API and
  `nova64.draw`. The new path trims empty glyph columns per character while
  keeping the legacy fixed-width print metrics unchanged.
- Fixed `drawGlowText` / `drawGlowTextCentered` so their `scale` argument
  actually draws scaled glyph pixels. Centering uses the web runtime's
  fixed-advance width (`text.length * 6 * scale`) for parity with
  `runtime/api-2d.js`.
- Added `nova64.draw` aliases for Batch 41 browser draw helpers:
  `drawTriangle`, `drawGlowText`, `drawGlowTextCentered`, `drawPulsingText`,
  `tristrip`, and `drawFloatingTexts`.
- `drawPulsingText` now accepts the browser-style options object
  (`{ frequency, minAlpha, glowColor, scale }`) while preserving the old
  numeric `frequency, minAlpha` call style.

### What's in `games/demoscene.js`

- `skyPanel = createCube(...)` removed from `buildScene0()` and `buildScene3()` (the gradient quad now handles sky)
- Fixed a missing mesh handle in scene 2's lane `setPosition(...)` call.
- Added deterministic scene-2 light cycles with glowing trail meshes to recover
  a browser-visible city feature without reintroducing fake bloom wash blocks.
- Switched the demoscene start screen and HUD copy to `printTight()` so the
  panels read closer to the web capture without disturbing the 3D camera path.
- Switched the start title and scene-title flash to scaled `drawGlowTextCentered`
  so the RetroArch demoscene has the larger glowing title treatment the web API
  already supports.

### What's in conformance/tests

- Added `retroarch/conformance/813-tight-text.js` to lock the new tight text
  API surface, width behavior, and center/right alignment rendering.
- Added the case to `retroarch/tests/run_conformance.sh` with checksum
  `0941661bd8f54b16`.
- Added `retroarch/conformance/814-glow-text-scale.js` to lock scaled glow
  text rendering. Checksum: `6d22128444356212`.
- Added `retroarch/conformance/815-draw-namespace-textfx.js` to lock the
  `nova64.draw` namespace aliases and the `drawPulsingText` options-object
  path. Checksum: `c1913cd545eb788f`.

### Suggested commit message

```
feat: expose RetroArch text effects on nova64.draw

- Add nova64.draw aliases for Batch 41 text/shape helpers used by browser
  carts: drawTriangle, drawGlowText, drawGlowTextCentered, drawPulsingText,
  tristrip, and drawFloatingTexts.
- Extend drawPulsingText to accept the browser-style options object with
  frequency, minAlpha, glowColor, and scale while preserving numeric arguments.
- Add conformance cart 815 to lock namespace availability and options-object
  rendering.
- Validate with retroarch:build and conformance 814-815.
```

---

## Untracked files in working tree

These are old test artifacts the user can safely delete:

- `retroarch/nova64_libretro_nohw.c`
- `retroarch/nova64_libretro_hw.c.bak`
- `retroarch/nova64_libretro.c.bak`
- `retroarch/torus_capture.ppm`
- `shot_959.png`

---

## Build commands

```bash
# Linux .so + harness (in WSL)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make clean && make platform=unix && make harness

# Windows DLL (in WSL via mingw cross)
cd /mnt/c/Users/brend/exp/nova64/retroarch
make clean && make platform=win-cross
# Then deploy:
cp nova64_libretro.dll /mnt/c/RetroArch-Win64/cores/

# Visual parity test (in WSL)
source ~/.nvm/nvm.sh && nvm use 20
NOVA64_GLES_TESTS=1 node retroarch/tests/demoscene_visual_parity.mjs

# View parity report
cat retroarch/build/demoscene-parity/report.json | python3 -m json.tool
```

Note: `make platform=unix` and `make platform=win-cross` produce different binary types. When you switch platforms you must `make clean` first.

---

## Open items for next LLM

In priority order — pick whichever the user asks for:

1. **Bloom/emissive tuning.** HDR/mip infrastructure is in; tune thresholds,
   weights, and cart emissive values from the actual capture set.
2. **Windows perf investigation** (deferred by user). The backlog preserves the
   full diagnosis. Telemetry is now better through the Shift+F overlay.
3. **HUD font metrics for parity test.** The tight text path helps density, but
   exact web-font metrics still differ.
4. **Re-baseline conformance checksums.** The lowercase/font and `/` glyph fixes
   shift hashes for older visual carts that print text. Known stale examples:
   `536 draw text shapes` actual `2e174a2556f278f8`; `130 measure text` actual
   `090b644857ea88cd`.

### Things to avoid

- **Don't** change shader version back to `#version 330`. Mesa GLES rejects it.
- **Don't** chase the parity score by destroying detail. The 85% number was a mirage — see section above.
- **Don't** call `hw_render.get_current_framebuffer()` without verifying the struct layout matches upstream. The previous crash signature was `0xC0000005`.
- **Don't** add per-frame log spam without gating it on `NOVA64_PERF` or a debug flag — RetroArch's log gets huge fast on Windows.

---

## MemPalace diary entries this session arc

Topics (newest first), all under agent `claude`:

- `nova64-font-lowercase-and-symbols`
- `nova64-bloom-tuning-three-js-style`
- `nova64-sky-gradient-shader`
- `nova64-fps-overlay-and-font-glyphs`
- `nova64-session-handover-2026-05-20`
- `nova64-demoscene-bloom-wash-removal`
- `nova64-shader-version-gotcha-and-parity`
- `nova64-libretro-h-struct-fix`
- `nova64-retroarch-hw-gl-windows`

Read with `mempalace_diary_read agent_name=claude last_n=10` to get full context.
