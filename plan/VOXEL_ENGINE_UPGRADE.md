# Nova64 Voxel Engine Upgrade Plan

**Inspired by**: [noa-engine](https://github.com/fenomas/noa) (powers Minecraft Classic), [voxel.js](https://github.com/voxel) ecosystem  
**Goal**: Transform `runtime/api-voxel.js` (~710 lines) into a production-quality voxel engine rivaling noa-engine, while staying true to Nova64's Three.js-based architecture and fantasy-console philosophy.

---

## Current State Assessment

### What We Have (v1 — single file, ~710 lines)
- 15 block types with vertex colors
- 16×64×16 chunks, render distance 4
- Naive per-face meshing (labeled "greedy" but isn't)
- Sin-hash noise (not real Perlin)
- 8 biomes with temperature/moisture
- Basic raycast (0.1 step marching)
- AABB collision
- No lighting, no transparency, no persistence, no workers

### Known Bugs
1. **Cave generation is 2D** — `perlinNoise` called with 5 args but only uses 4; `worldZ` becomes `octaves` param, so caves are columns, not tunnels
2. **Dead os9-shell API refs** — `createVoxelEngine`, `voxelSet`, `voxelGet`, `voxelClear`, `voxelRender` are passed to os9-shell evaluator but don't exist on `vxApi`
3. **Material leak** — `updateChunkMesh` disposes mesh on unload but creates a new `MeshStandardMaterial` per chunk on each rebuild when `window.VOXEL_MATERIAL` isn't set
4. **Raycast misses** — 0.1 step size can skip thin blocks at steep angles

---

## Phase 1: Foundation Fixes & Block Registry (Effort: Small)

**Files**: `runtime/api-voxel.js`

### 1.1 — Fix Cave Generation Bug
- Implement proper 3D noise function (`noise3D`) for cave generation
- Caves should carve 3D tunnels, not 2D columns

### 1.2 — Block Registry System
Replace the hardcoded `BLOCK_TYPES` / `BLOCK_COLORS` objects with an extensible registry:

```js
const registry = {
  blocks: [],
  register(id, { name, color, solid, transparent, fluid, lightEmit, lightBlock }) { ... },
  getSolidity(id) { ... },
  getTransparency(id) { ... },
  getColor(id) { ... },
};
```

- Carts can `registerVoxelBlock(id, opts)` to define custom blocks
- Max 255 block types (Uint8Array), but easy to upgrade to Uint16Array later
- Each block definition includes: `solid`, `transparent`, `fluid`, `lightEmit` (0-15), `lightBlock` (0-15)

### 1.3 — Fix Material Leak
- Share a single `MeshStandardMaterial` across all chunk meshes (unless cart provides `window.VOXEL_MATERIAL`)
- Dispose only on world reset

### 1.4 — Fix Dead os9-shell API References
- Wire up `createVoxelEngine`, `voxelSet`, `voxelGet`, `voxelClear`, `voxelRender` in `src/main.js` to actual `vxApi` methods (or remove the dead refs)

### 1.5 — Expose Noise Functions
- Expose `perlinNoise2D(x, z)` and `perlinNoise3D(x, y, z)` to carts for custom terrain generation

**Deliverable**: Bug-free foundation with extensible block system. All existing carts continue to work.

---

## Phase 2: Real Noise & Improved Terrain (Effort: Small)

**Files**: `runtime/api-voxel.js` (or extract to `runtime/voxel/noise.js`)

### 2.1 — Proper Simplex/Perlin Noise
Replace the sin-hash noise with a proper implementation:
- **Simplex 2D + 3D** noise (open-source, public-domain implementations available)
- Better gradient tables, proper permutation array seeded from `worldSeed`
- Eliminates visible repetition artifacts

### 2.2 — Improved Terrain Generator
- **3D caves** using worm-like noise tunnels (Perlin worms or threshold-based 3D noise)
- **Ore veins** — stone variants at different depth ranges (coal, iron, gold, diamond as new block types)
- **Overhangs & cliffs** using 3D density function instead of pure heightmap
- **Smooth biome transitions** — interpolate height/block between adjacent biomes

### 2.3 — Configurable World Generation
```js
createVoxelWorld({
  seed: 12345,
  chunkSize: 16,
  chunkHeight: 128,    // doubled from 64
  seaLevel: 62,
  generateTerrain: (chunk) => { /* custom */ },
  generateStructures: (chunk) => { /* custom */ },
});
```
- Carts can supply their own `generateTerrain` callback for fully custom worlds (flat, floating islands, etc.)
- Default terrain gen remains available as `defaultTerrainGenerator()`

**Deliverable**: Beautiful, varied terrain with real caves and extensible worldgen.

---

## Phase 3: Greedy Meshing (Effort: Medium)

**Files**: `runtime/voxel/mesher.js` (new, extracted)

### 3.1 — True Greedy Meshing Algorithm
Replace the naive per-face mesher with a proper greedy mesher:
- For each axis direction, sweep through the chunk in slices
- For each slice, find maximal rectangles of identical block faces
- Merge them into single quads → dramatically fewer vertices

**Expected impact**: 5-10× fewer vertices for typical terrain, massive GPU perf boost.

Reference: [Mikola Lysenko's greedy meshing article](https://0fps.net/2013/07/09/meshing-in-a-block-world/) (the same algorithm noa and voxel.js use).

### 3.2 — Separate Opaque & Transparent Passes
- Opaque faces → standard mesh, depth write ON
- Transparent faces (water, glass) → separate mesh, depth write OFF, alpha blending, rendered after opaque
- Water gets slight blue tint + animated UV offset

### 3.3 — Per-Vertex Ambient Occlusion
Replace the per-face-direction AO hack with proper per-vertex AO:
- For each vertex of a face, check the 3 adjacent blocks (side1, side2, corner)
- AO level = number of solid neighbors (0-3)
- Smooth shading via vertex color darkening
- Fix the "diagonal artifact" by flipping quad triangulation based on AO values

Reference: [0fps.net AO for voxels](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/)

**Deliverable**: 5-10× fewer draw calls, proper water/glass rendering, beautiful ambient occlusion.

---

## Phase 4: Lighting System (Effort: Medium-Large)

**Files**: `runtime/voxel/lighting.js` (new)

### 4.1 — Sky Light
- Light value 0-15 per block (stored in separate `Uint8Array` per chunk or packed into upper nibble)
- Sky light propagates downward from Y=max, filling air blocks
- Horizontal propagation with attenuation (BFS flood-fill)
- When a block is placed/removed, incrementally update light via BFS

### 4.2 — Block Light
- Torches, lava, glowstone emit light (0-15)
- BFS flood-fill propagation with decreasing intensity
- Separate channel from sky light (max of both used for rendering)
- Add block types: `TORCH` (emit 14), `GLOWSTONE` (emit 15), `LAVA` (emit 15)

### 4.3 — Smooth Light Interpolation
- Average light values across the 4 blocks sharing each vertex
- Creates smooth lighting gradients instead of flat per-face lighting
- Combines with AO for beautiful shadows in caves

### 4.4 — Day/Night Cycle Integration
- Sky light multiplied by a global `skyBrightness` factor (0.0-1.0)
- Carts control time of day: `setVoxelDayTime(0.0-1.0)`
- Smooth transitions between light levels

**Deliverable**: Minecraft-quality lighting with smooth shadows, torches, and day/night.

---

## Phase 5: DDA Raycasting & Improved Physics (Effort: Small)

**Files**: `runtime/api-voxel.js`

### 5.1 — DDA Voxel Traversal
Replace the naive 0.1-step raycast with Amanatides & Woo DDA algorithm:
- Never misses a voxel, regardless of angle
- Returns exact hit position, face normal, and adjacent block position
- Much faster (steps exactly once per voxel boundary)

### 5.2 — Swept AABB Collision
Replace the simple overlap check with swept AABB collision:
- Proper collision response for each axis (X, Y, Z resolved independently)
- `moveAndSlide(position, velocity, size, dt)` → returns new position + grounded flag
- Handles stairs (auto-step up 1 block), slopes, and edge cases
- Water buoyancy (slower fall, swim up with Space)

### 5.3 — Expose Physics to Carts
```js
// Cart API
const result = moveVoxelEntity(pos, vel, size, dt);
// result = { position, velocity, grounded, inWater, hitBlock }
```

**Deliverable**: Pixel-perfect raycasting and smooth, Minecraft-quality movement physics.

---

## Phase 6: Texture Atlas (Effort: Medium)

**Files**: `runtime/voxel/atlas.js` (new)

### 6.1 — Texture Atlas System
- Load block textures from a sprite sheet (e.g., 16×16 tiles in a 256×256 atlas)
- Each block face can reference a different tile (top/side/bottom)
- UV coordinates mapped to atlas sub-regions during meshing

### 6.2 — Default Texture Pack
- Ship a small built-in CC0/MIT texture atlas (16×16 pixel art per block)
- Procedurally generated fallback if atlas fails to load (current vertex-color behavior)

### 6.3 — Custom Texture Packs for Carts
```js
// Cart can load custom textures
loadVoxelTextures('/path/to/atlas.png', {
  grass: { top: [0,0], side: [1,0], bottom: [2,0] },
  stone: { all: [3,0] },
  ...
});
```

**Deliverable**: Block textures instead of flat colors, with easy customization.

---

## Phase 7: Chunk Workers (Effort: Medium)

**Files**: `runtime/voxel/chunk-worker.js` (new Web Worker)

### 7.1 — Off-Main-Thread Chunk Generation
- Move terrain generation + meshing to a Web Worker
- Main thread sends: chunk coordinates, world seed, block registry
- Worker returns: block data (`Uint8Array`) + mesh buffers (`Float32Array` for vertices, normals, colors, UVs + `Uint32Array` for indices)
- Use `Transferable` objects to avoid copying

### 7.2 — Chunk Generation Queue
- Priority queue sorted by distance to player
- Limit meshes rebuilt per frame (e.g., 2-4 per tick)
- Progressive loading: nearby chunks first, far chunks filled in

### 7.3 — Chunk LOD (Optional)
- Far-away chunks rendered at half resolution (2×2 block quads)
- Reduces vertex count for distant terrain
- Swap to full-res as player approaches

**Deliverable**: Silky-smooth chunk loading with zero main-thread jank.

---

## Phase 8: World Persistence (Effort: Medium)

**Files**: `runtime/voxel/storage.js` (new)

### 8.1 — Chunk Serialization
- Serialize modified chunks to compact binary format
- Run-Length Encoding (RLE) for common patterns (e.g., solid stone runs)
- Only save chunks that differ from procedural generation (delta compression)

### 8.2 — IndexedDB Storage
- Store chunks in IndexedDB (async, large capacity)
- Key: `world:{seed}:chunk:{x},{z}`
- Load saved chunks instead of regenerating
- Lazy: only save chunks player has modified

### 8.3 — Cart API
```js
saveVoxelWorld('my-world');      // persist all modified chunks
loadVoxelWorld('my-world');      // restore from IndexedDB
listVoxelWorlds();               // list saved worlds
deleteVoxelWorld('my-world');    // cleanup
exportVoxelWorld('my-world');    // download as .nova64world file
importVoxelWorld(file);          // load from file
```

**Deliverable**: Persistent worlds that survive page reloads.

---

## Phase 9: Entity & Object System (Effort: Large)

**Files**: `runtime/voxel/entities.js` (new)

### 9.1 — Voxel Entity System
Lightweight ECS (Entity Component System) inspired by noa:
- **Position** component (with local/global coordinate handling)
- **Physics** component (velocity, gravity, collision shape)
- **Mesh** component (Three.js mesh attached to entity)
- **AI** component (optional: pathfinding, behavior trees)

### 9.2 — Built-in Entity Types
```js
const zombie = spawnVoxelEntity('zombie', [x, y, z], {
  mesh: createCube(1, 0x00ff00),
  physics: { gravity: true, size: [0.8, 1.8, 0.8] },
  health: 20,
});
```

### 9.3 — Spatial Hashing
- Fast broad-phase collision detection between entities
- Efficient entity queries by region: `getEntitiesInRadius(pos, radius)`

**Deliverable**: A proper entity system for mobs, items, and interactive objects.

---

## Phase 10: Advanced Features (Effort: Large — Future)

### 10.1 — Multiplayer (WebSocket/WebRTC)
- Send chunk diffs + entity states
- Authoritative server mode or peer-to-peer
- Inspired by voxel-server / noa multiplayer examples

### 10.2 — Infinite Height (Cubic Chunks)
- Change from column chunks (16×64×16) to cubic chunks (16×16×16)
- Enables infinite vertical worlds (sky islands, deep underground)
- More complex neighbor management but better memory usage

### 10.3 — Advanced Biomes
- Rivers, ocean depths, floating islands
- Structure generation (villages, dungeons, temples)
- Multi-block structures that span chunk boundaries

### 10.4 — Shader-Based Effects
- Water reflections/refractions via custom Three.js shader
- Waving grass/leaves vertex animation
- Volumetric fog in caves
- Distance-based LOD color desaturation

---

## File Structure (After Full Upgrade)

```
runtime/
  api-voxel.js              ← Main API entry (thin wrapper, exposes globals)
  voxel/
    engine.js               ← Core engine class (init, tick, render)
    registry.js             ← Block registry system
    chunk.js                ← Chunk data structure
    world.js                ← World management, chunk loading/unloading
    mesher.js               ← Greedy mesher + transparent pass
    noise.js                ← Simplex 2D/3D noise
    terrain.js              ← Default terrain generator
    lighting.js             ← Sky light + block light propagation
    raycast.js              ← DDA voxel traversal
    physics.js              ← Swept AABB collision + movement
    atlas.js                ← Texture atlas system
    storage.js              ← IndexedDB world persistence
    entities.js             ← ECS for voxel entities
    chunk-worker.js         ← Web Worker for off-thread generation
```

---

## Implementation Priority

| Phase | Name | Impact | Effort | Status |
|-------|------|--------|--------|--------|
| 1 | Foundation Fixes & Registry | High | Small | **DONE** ✅ |
| 2 | Real Noise & Terrain | High | Small | **DONE** ✅ |
| 3 | Greedy Meshing + AO + Transparency | Very High | Medium | **DONE** ✅ |
| 4 | Lighting System (Sky + Block + Day/Night) | High | Medium-Large | **DONE** ✅ |
| 5 | DDA Raycast & Swept AABB Physics | Medium | Small | **DONE** ✅ |
| 6 | Texture Atlas | Medium | Medium | **DONE** ✅ |
| 7 | Chunk Workers | High | Medium | **DONE** ✅ |
| 8 | World Persistence (IndexedDB) | Medium | Medium | **DONE** ✅ |
| 9 | Entity System | Medium | Large | **DONE** ✅ |
| 10 | Advanced (Multiplayer, etc.) | High | Very Large | Future |

### Additional Improvements (Done ✅)
- **Biome-specific tree variety**: Oak, birch, spruce, jungle, acacia trees placed by biome
- **All voxel globals registered in eslint config** for cart linting
- **Procedural texture atlas**: 27 pixel-art tiles generated at runtime, per-face mapping (grass top/side/bottom), toggle with `enableVoxelTextures()`, custom atlas support via `loadVoxelTextureAtlas()`
- **Async chunk queue with frame budgeting**: Priority queue sorted by distance to player, configurable `maxTerrainGenPerFrame` (default 2) and `maxMeshRebuildsPerFrame` (default 4), `forceLoadVoxelChunks()` for sync initial load
- **Entity system with spatial hashing**: `spawnVoxelEntity()`, `updateVoxelEntities()`, `damageVoxelEntity()`, `getVoxelEntitiesInRadius()` with swept AABB physics, AI callbacks, auto mesh positioning, and 16-unit spatial hash for O(1) region queries

---

## Key Architecture Decisions

1. **Stay on Three.js** — noa uses Babylon.js, but Nova64 is Three.js-native. All rendering goes through Three.js. No engine switch.

2. **Keep the Fantasy Console API** — Everything exposed via simple global functions (`setVoxelBlock`, `getVoxelBlock`, etc.). Cart authors shouldn't need to understand chunks or ECS.

3. **Backward compatibility** — Current `BLOCK_TYPES`, `updateVoxelWorld()`, etc. continue to work. New features are additive.

4. **Module extraction** — Break the single 710-line file into focused modules under `runtime/voxel/`. The `api-voxel.js` file becomes a thin facade that imports from the sub-modules.

5. **No external dependencies** — All voxel code is self-contained (noise, meshing, physics). Only dependency is Three.js (already in the project).

---

## Success Metrics

- [ ] Minecraft demo runs at 60fps with render distance 8 (currently 4)
- [ ] True greedy meshing reduces vertex count by 5-10×
- [ ] 3D caves visible in generated terrain
- [ ] Smooth ambient occlusion on all block edges
- [ ] Block lighting with torch propagation
- [ ] Water renders as translucent with separate pass
- [ ] Chunk generation doesn't cause frame drops
- [ ] All 56+ existing tests continue to pass
- [ ] Minecraft demo updated to showcase new features
