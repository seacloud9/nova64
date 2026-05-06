# Godot Voxel — Native Parity Plan

Status: actively in progress on `feature/godot-adapter`.

## Current checkpoint (2026-05-06)

The latest voxel-parity work split two paths that had different needs:

- Nova64 terrain chunks still use the native `voxel.uploadChunk` path with
  greedy chunk meshing and atlas/palette materials.
- Standalone MagicaVoxel `.vox` files now use a native exposed-face mesh path.
  This fixed `house.vox`, where the direct greedy pass could drop the authored
  front facade. The viewer now shows the front wall, windows, door, chimney,
  roof, and base slab.

The cart-facing VOX rule is now simple: `loadVoxModel()` resolves the asset path
and returns the native handle without applying hidden root rotation. Native
coordinate conversion and cart-authored transforms are the single source of
orientation truth.

Recent validation:

- Rebuilt Windows and Linux debug GDExtension binaries from WSL.
- `vox-viewer` Godot visual conformance passed with the exposed-face importer.
- `flash-demo`, `generative-art`, and `space-harrier-3d` also passed focused
  visual checks after related adapter parity fixes.

Next voxel-parity work:

- Keep `.vox` correctness first; add optimization only after more assets are
  visually confirmed.
- Port the browser voxel terrain noise/biome math into the Godot shim so
  terrain generation, trees, and block placement converge before doing deeper
  material work.
- After terrain shape parity improves, revisit per-face textures and light data
  for chunks.

## Older terrain checkpoint (2026-05-02, commit `550147e`)

Branch: `feature/godot-adapter`

Completed:
- **Phase 1** ✅ — Native `voxel.uploadChunk` face-culled mesher in C++
  (commit `4817332`). Replaced column-bucketing MultiMesh path with real
  chunk ArrayMesh builds. Shutdown double-free fixed (`_handles->clear(false)`).
- **Phase 2** ✅ — Greedy meshing in `_cmd_voxel_upload_chunk` (commit
  `299b03d`). Co-planar same-coloured faces merged into rectangles; ~5-10×
  fewer triangles on heightmap terrain.
- **Visual parity pass** ✅ (commit `00607ec`):
  - All 25 `VX_BLOCK_COLORS` in shim synced exactly to `runtime/api-voxel.js`.
  - `_vxSurfaceFor(biome)` and `_vxBiomeAt(x,z)` biome rules matched to web.
  - `light.setSun` bridge command added (pitch/yaw/energy/color → shared
    `_sun_light` DirectionalLight3D).
  - `setVoxelDayTime(t)` added to shim: computes sun angle, ambient energy,
    sky colour, fog colour and calls `light.setSun`.
  - `setClearColor` exposed on `globalThis`.
  - Fog now per-cart (removed forced fog override in `_vxGenerateWorld`).
- **Depth fog** ✅ (commit `550147e`): Replaced exponential fog approximation
  with Godot `FOG_MODE_DEPTH` using explicit near/far bounds. Improved
  minecraft-demo diff from ~47% → **37.21%**.

Current smoke-test status: **6/6 PASS** — voxel-terrain, minecraft-demo,
voxel-creative, wizardry-3d, star-fox-nova-3d, f-zero-nova-3d.

### Key files

| File | Purpose |
|------|---------|
| `nova64-godot/gdextension/src/bridge.cpp` | C++ GDExtension bridge — mesher, fog, light.setSun |
| `nova64-godot/gdextension/src/bridge.h` | Declarations — `_sun_light`, `_cmd_light_set_sun` |
| `nova64-godot/godot_project/shim/nova64-compat.js` | JS shim — terrain, biomes, APIs |
| `runtime/api-voxel.js` | Web engine ground truth for noise/biome/cart APIs |

### Shim constants (nova64-compat.js)

- `VX_BASE_Y = 60`, `VX_SEA_Y = 62` (matches web `SEA_LEVEL=62`)
- `CXSZ = CZSZ = 16`, `CY_ORIGIN = 55`, `CY_HEIGHT = 50`
- Biome thresholds: `t < 0.2` → Frozen, `t < 0.35 && m > 0.5` → Taiga,
  `t > 0.7 && m < 0.25` → Desert, `t > 0.6 && m > 0.6` → Jungle,
  `m < 0.3` → Savanna, `t > 0.4 && m > 0.4` → Forest, `t < 0.35` → Snowy,
  else → Plains
- Height: 4-octave FBM (scale 0.02) + 2-octave medium (0.06, ×0.4) +
  2-octave detail (0.15, ×0.15) using value noise
- Tree density: Jungle=0.025, Forest=0.018, Taiga=0.015, Plains=0.008;
  no-spawn radius 12 from origin

## Latest parity checkpoint

Run on 2026-05-03:

```bash
pnpm godot:visual -- --cart=minecraft-demo --frames=120 --wait-ms=3000 --max-diff=100
```

Result: **58.73%** pixel diff vs browser Three.js.

Improvements this session:
- Biome height formulas now match web engine exactly (was using reduced values)
- World seed derivation now matches browser (`hashStringToSeed('nova64-demo:' + cartName)`)
- Increased subsurface depth limit from 5 to 8 blocks

The remaining gap is primarily:
1. Rendering approach — Godot uses instanced 1x1x1 cubes, browser uses greedy-meshed chunks
2. Tree canopies — Godot uses single scaled cubes, browser uses individual leaf blocks
3. Lighting model — Godot vs Three.js material/lighting differences
4. HUD/hotbar — browser screenshot includes the cart's 2D overlay; Godot
   does not render the same HUD elements in the captured frame.

`meta.json` is supported in the Godot host path: `load_cart()` reads sidecar
metadata, exposes it as `globalThis.cart_meta`, and the compatibility shim
applies text, sky, fog, lighting, effects, and camera defaults before the cart
module evaluates. Voxel-specific defaults should continue to flow through
`configureVoxelWorld()` so carts keep one programming model across hosts.

## Remaining gaps vs the web engine

1. **Rendering approach** — Godot uses instanced 1x1x1 cubes for terrain;
   web uses greedy-meshed ArrayMesh chunks. Visually similar but different
   edge/shading characteristics.
2. **Tree canopies** — shim uses single scaled cubes for canopies; web engine
   renders individual leaf blocks with randomized holes for natural look.
3. **Caves / overhangs** — no 3D carve pass yet.
4. **Lighting** — no skylight propagation or torch emission.
5. **Per-face textures** — flat vertex colour only.

## Phased plan

### Phase 1 — Native voxel.uploadChunk (face-culled mesher) ✅ DONE (commit `4817332`)

Added `_cmd_voxel_upload_chunk` in C++: builds an ArrayMesh from a packed block
array, emitting one quad per visible face. Shim replaced column-bucketing path
with a chunk-builder calling `voxel.uploadChunk` per 16×50×16 chunk. Shutdown
double-free fixed (`_handles->clear(false)`).

### Phase 2 — Greedy meshing in C++ ✅ DONE (commit `299b03d`)

Same bridge command, smarter mesher: sweeps each axis plane, builds a 2D
visibility+color mask, merges same-colored adjacent faces into rectangles.
~5-10× fewer triangles for typical heightmap terrain.

### Phase 3 — Simplex noise + per-biome height formula ← NEXT

**Goal**: Eliminate the terrain generation divergence that accounts for most of
the remaining ~37% pixel diff.

**Step 1 — Port simplex noise from web engine into shim**

`runtime/api-voxel.js` uses OpenSimplex2 (lines ~100–243). Port or inline an
equivalent pure-JS `_vxSimplex2D(x, z)` into `nova64-compat.js`, then replace
`_vxFbm`/`_vxSmoothNoise` with:

```js
function _vxFbm2D(x, z, octaves, persistence, lacunarity, scale) { ... }
```

Use the same call sites as the web engine:
- Height: `_vxFbm2D(x + seed, z + seed, 4, 0.5, 2.0, 0.01)`
- Temperature: `_vxFbm2D(x + seed, z + seed, 2, 0.5, 2.0, 0.005)`
- Moisture: `_vxFbm2D(x + 1000 + seed, z + 1000 + seed, 2, 0.5, 2.0, 0.003)`

**Step 2 — Per-biome height formula**

Replace the single `VX_BASE_Y + blend * VX_HEIGHT_AMPLITUDE` formula with
biome-conditioned `heightBase + simplex * heightScale` matching the web engine:

| Biome | heightBase | heightScale |
|-------|-----------|-------------|
| Jungle | 58 | 22 |
| Desert | 63 | 4 |
| Plains | 64 | 6 |
| Forest | 64 | 8 |
| (etc — check `runtime/api-voxel.js` for all values) |

**Validation**:
- `pnpm godot:visual -- --cart=minecraft-demo --frames=120 --wait-ms=3000`
- Target: < 25% diff
- Smoke: all 6 carts still PASS

### Phase 4 — Cave / overhang generation

Move or extend `_vxBlockColorAt` to include a 3D noise carve-pass that punches
caves and overhangs. At this point the chunk is no longer column-ish; the
Phase 1 per-block face culling pays full dividends.

### Phase 5 — Per-block textures + skylight

A texture atlas resource bound at boot, plus an A8 light buffer computed per
chunk. Output as a vertex attribute.

## Build and test commands

```bash
# Build both platforms (WSL)
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64/nova64-godot/gdextension && scons platform=linux target=template_debug -j$(nproc) 2>&1 | tail -15 && scons platform=windows target=template_debug use_mingw=yes -j$(nproc) 2>&1 | tail -15'

# Smoke test (6 carts)
powershell -NoProfile -ExecutionPolicy Bypass -File nova64-godot\scripts\run-cart-smoke.ps1

# Visual parity — minecraft-demo
wsl bash -lc 'cd /mnt/c/Users/brend/exp/nova64 && source ~/.nvm/nvm.sh; nvm use 20 >/dev/null; pnpm godot:visual -- --cart=minecraft-demo --frames=120 --wait-ms=3000 --max-diff=100'

# Commit pattern (never git push)
Set-Content -Encoding utf8 .git/COMMIT_MSG_TMP "your message"
wsl bash -lc "cd /mnt/c/Users/brend/exp/nova64 && git add <files> && git -c core.hooksPath=/dev/null commit -F .git/COMMIT_MSG_TMP && rm .git/COMMIT_MSG_TMP"
```

## Decision log

- **C++ chosen over Rust** — godot-cpp bindings are mature and the
  existing bridge is already C++; introducing Rust would require a
  second toolchain and another FFI layer.
- **Current checkpoint: native-column terrain path** — `voxel.uploadChunk`
  now accepts compact terrain columns and expands them to a C++ block volume
  before greedy meshing. This replaced the slow full-block-array bridge path
  for generated Godot terrain and made the visual tuning loop responsive again.
- **Compact columns over the bridge** — Godot terrain chunks must avoid
  sending full `sx * sy * sz` JS block arrays during normal streaming.
  The shim now sends one compact column record per x/z column and lets
  `voxel.uploadChunk` expand that data into a block volume before greedy
  meshing in C++. This keeps chunk loading responsive while preserving
  the existing cart-facing voxel API.
- **Chunk-border culling belongs in the native mesher** — chunk uploads can
  include a one-block neighbor border plus `meshMin`/`meshMax`, so C++ can
  cull faces against adjacent terrain without rendering duplicate boundary
  slabs.
- **Seed parity uses the browser cart path** — the web runtime prefers
  `__NOVA64_CURRENT_CART_PATH` over `?demo=` when deriving voxel world seeds.
  The Godot host now exposes a browser-style `/examples/<cart>/code.js` path
  before the shim loads, and the shim uses that same seed source.
- **Texture atlas UVs are top-origin in Godot shader space** — the chunk
  shader now passes the row origin directly instead of vertically flipping it,
  matching how the generated Image atlas is filled.
- **Temporary water planes stay off by default** — per-chunk transparent water
  planes caused stacked blending and scene washout. Water should return as
  native chunk/block rendering when the fluid pass lands.
- **Heightmap stays in JS for Phase 1** — keeps the parity contract
  small (only one new bridge command) and makes the mesher easy to
  unit-test by feeding it a known PackedByteArray.
- **Vertex colours over per-face material** — one draw call per chunk
  beats one per block colour, and we can switch to a texture atlas in
  Phase 5 without breaking the chunk handle contract.
- **`FOG_MODE_DEPTH` over exponential** — Godot's depth fog maps directly
  to near/far world-space distances, matching how carts set fog in JS.
  Exponential density was too coarse to tune without washing out the scene.
- **`_handles->clear(false)` not `true`** — `true` calls `queue_free()` on
  chunk nodes while the scene tree also frees them on shutdown → double-free
  SIGSEGV. Let the scene tree own teardown; just null mesh refs first.
- **Terrain regression reverted** — attempted per-biome `heightBase`/
  `heightScale` port in shim, but it diverged from block-space coordinates;
  reverted and kept the fog improvement. Full fix is Phase 3 (simplex port).
