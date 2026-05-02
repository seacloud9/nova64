# Godot Voxel — Native Parity Plan

Status: actively in progress on `feature/godot-adapter`.

## Where we are

- `runtime/api-voxel.js` (web) — full voxel engine: chunked greedy
  meshing, simplex noise terrain, biomes, ores, caves, trees, light
  propagation, swept AABB physics, day/night.
- Godot shim ([nova64-godot/godot_project/shim/nova64-compat.js](nova64-godot/godot_project/shim/nova64-compat.js))
  emulates the cart-facing voxel API in JS:
  - heightmap-based terrain (3-octave value noise, biome rules
    matching the web engine)
  - per-color MultiMesh batching (~7-10 multimeshes total)
  - sparse player-edits map
  - DDA raycast, swept AABB collision, gravity-driven entities
- C++ bridge ([nova64-godot/gdextension/src/bridge.cpp](nova64-godot/gdextension/src/bridge.cpp))
  exposes mesh / material / multimesh / camera / light / overlay
  commands. No voxel-specific commands yet.

This visibly works (snapshot `nova64-godot/test-results/snapshots/mc-demo-v4.png`)
but caps out below web parity in a few key ways.

## Latest parity checkpoint

Focused run on 2026-05-02:

```bash
pnpm godot:visual -- --cart=minecraft-demo --cart=voxel-terrain \
  --frames=120 --wait-ms=3000 --max-diff=100
```

Results:

- `minecraft-demo`: **60.53%** pixel diff vs browser Three.js.
- `voxel-terrain`: **95.08%** pixel diff vs browser Three.js.

Both carts boot, run, and draw through Godot. The remaining gap is visual
quality, not lifecycle. The screenshots show the current Godot path is washed
out by environment/fog tuning and, more importantly, still uses a 2.5D
heightmap/column approximation instead of the browser voxel engine's real
chunk mesh.

`meta.json` is supported in the Godot host path: `load_cart()` reads sidecar
metadata, exposes it as `globalThis.cart_meta`, and the compatibility shim
applies text, sky, fog, lighting, effects, and camera defaults before the cart
module evaluates. Voxel-specific defaults should continue to flow through
`configureVoxelWorld()` so carts keep one programming model across hosts.

## Gaps vs the web engine

1. **Per-block visibility** — shim renders a single tall box per (x,z)
   column. Player edits inside a column or under a cliff are not
   visible from the side, and we cannot represent caves, overhangs,
   ore deposits or any non-2.5D structure.
2. **Mesh fidelity** — no per-face culling against neighbors; no
   greedy quad merging; no per-face textures; flat per-block colour.
3. **Generation cost** — terrain heightmap and biome lookup run in JS.
   Acceptable at 64×64 but not at 16-chunk render distance.
4. **Lighting** — no skylight propagation or torch emission.

## Phased plan (each phase commits independently)

### Phase 1 — Native voxel.uploadChunk (face-culled mesher) ← starting now

Add a C++ bridge command that builds an ArrayMesh from a packed block
array, emitting one quad per visible face (face culled against the
chunk's own neighbors; chunk boundaries treated as air for now).

Bridge API:

```
voxel.uploadChunk {
  origin:  [x, y, z],          // world-space origin of chunk
  size:    [sx, sy, sz],       // dimensions in blocks
  blocks:  PackedByteArray,    // sx*sy*sz block ids, x-major then y, then z
  palette: { "1": 0x55aa44, ... }, // id -> hex color (id 0 = air)
} => { handle: <mesh> }
```

Returned handle is destroyable via `mesh.destroy`. Mesh uses a single
StandardMaterial3D per chunk; face vertex colours encode the block tint
so one material draws all blocks. No texturing yet.

Files touched:

- [nova64-godot/gdextension/src/bridge.cpp](nova64-godot/gdextension/src/bridge.cpp) — new `_cmd_voxel_upload_chunk`
- [nova64-godot/gdextension/src/bridge.h](nova64-godot/gdextension/src/bridge.h) — declaration

Shim changes:

- Replace the column-bucketing path with a chunk-builder that packs the
  heightmap into 16×Hslab×16 chunks and calls `voxel.uploadChunk` once
  per chunk. Player edits update the corresponding chunk and re-upload.

Validation:

- All voxel carts smoke-PASS.
- Snapshot diff vs `mc-demo-v4.png` should show identical biome
  distribution but with proper cliff detail and cube boundaries.
- Focused visual report should materially improve from the 2026-05-02 baseline:
  `minecraft-demo` 60.53% diff and `voxel-terrain` 95.08% diff.

### Phase 2 — Greedy meshing in C++

Same bridge command, smarter mesher: merge co-planar same-coloured
faces into rectangles. Roughly 5-10× fewer triangles for typical
heightmap terrain. No API change for the cart.

### Phase 3 — Cave / overhang generation

Move `_vxHeightAt` and biome rules into C++ (or keep the heightmap in
JS but add a 3D simplex carve-pass in C++). At this point the chunk
is no longer column-ish and Phase 1's per-block visibility pays off.

### Phase 4 — Per-block textures + skylight

A texture atlas resource bound at boot, plus an A8 light buffer
computed per chunk. Output as a vertex attribute.

## Native build prerequisites

WSL build chain is already validated this session:

```
wsl bash -lc 'cd nova64-godot/gdextension && \
  scons platform=linux target=template_debug -j$(nproc) && \
  scons platform=windows target=template_debug use_mingw=yes -j$(nproc)'
```

After native changes, run the smoke harness as usual:

```
powershell -NoProfile -ExecutionPolicy Bypass \
  -File nova64-godot/scripts/run-cart-smoke.ps1 \
  minecraft-demo voxel-creative voxel-terrain
```

## Decision log

- **C++ chosen over Rust** — godot-cpp bindings are mature and the
  existing bridge is already C++; introducing Rust would require a
  second toolchain and another FFI layer.
- **Heightmap stays in JS for Phase 1** — keeps the parity contract
  small (only one new bridge command) and makes the mesher easy to
  unit-test by feeding it a known PackedByteArray.
- **Vertex colours over per-face material** — one draw call per chunk
  beats one per block colour, and we can switch to a texture atlas in
  Phase 4 without breaking the chunk handle contract.
