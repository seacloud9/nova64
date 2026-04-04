# Nova64 Upgrade Plan: NFT Seeds + Voxel Engine + Generative Art

**Date**: April 4, 2026
**Scope**: Three major improvement tracks for Nova64
**Competitive targets**: [noa-engine](https://github.com/fenomas/noa) (673★, powers Minecraft Classic), [Cryptovoxels/Voxels](https://www.voxels.com/), [voxel.js](https://github.com/voxel) ecosystem

---

## Executive Summary

| Track | What | Why |
|-------|------|-----|
| **NFT Seeds** | Deterministic world/art generation from token IDs | Enable NFT-backed procedural worlds and art |
| **Voxel Engine** | Fluid flow, async meshing, LOD, ECS, schematics, custom shapes | Compete with noa-engine feature set |
| **Generative Art** | 8+ new Processing-style sketches + 3D creative coding demo | Showcase Nova64's creative potential |

---

## Current State Assessment

### Voxel Engine (What We Have)
- 26 block types, 16×128×16 chunks, configurable render distance
- True greedy meshing with per-vertex ambient occlusion
- Seeded simplex noise (2D + 3D), 8 biomes
- 3D cave worm tunnels, DDA raycast, swept AABB collision
- BFS light propagation (sky + block light, day/night cycle)
- Entity system with AI callbacks, IndexedDB persistence w/ RLE
- 40+ API functions exposed globally

### Key Gaps vs noa-engine
| Feature | Nova64 | noa |
|---------|--------|-----|
| Fluid flow | Static only | Game-defined |
| Meshing thread | Main thread | Main thread (async-ready) |
| LOD | None | None built-in |
| Entity system | Simple AI callbacks | Full ECS |
| Max voxel ID | 255 (Uint8) | 65535 (Uint16) |
| Custom shapes | Cubes only | Via mesh components |
| World export | IndexedDB only | Game-defined |

### Generative Art Demos (Current)
- generative-art/ — 6 scenes (~650 LOC)
- demoscene/ — 5 scenes (~900+ LOC)
- boids-flocking/ — 4 modes (~380 LOC)
- game-of-life-3d/ — 5 rulesets (~380 LOC)

### NFT/Seed (Current)
- ✅ Seeded simplex noise, configureVoxelWorld({ seed }), seededRandom() LCG
- ❌ No hash-to-seed, no trait mapping, no metadata export, no global seed API

---

## Phase 1: NFT Seed System

### Step 1.1 — Create `runtime/nft-seed.js`
New functions:
- `createSeedFromHash(hash)` — FNV-1a hash, handles 0x prefix
- `createSeedRNG(seed)` — PRNG with .random(), .range(min,max), .float(min,max), .pick(arr), .shuffle(arr), .gaussian(mean,std), .color(), .bool(p)
- `seedToTraits(seed, schema)` — deterministic trait mapping from schema with values/weights/types
- `exportSeedMetadata(seed, traits, opts)` — ERC-721/1155 JSON metadata

### Step 1.2 — Integrate with existing engines
- configureVoxelWorld({ seed }) auto-converts hash strings via createSeedFromHash
- New global: setSeed(hashOrNumber) configures all subsystems

### Step 1.3 — `examples/nft-worlds/code.js` demo
- Text input for token ID/hash
- Generates unique voxel world from seed with trait breakdown HUD
- Press M to export metadata as JSON

### Step 1.4 — `examples/nft-art-generator/code.js` demo
- Seed-deterministic 2D generative art (flow field, geometric, organic, abstract)
- Each seed → unique palette + composition + animation
- N for next seed, P for previous

### Files (Phase 1)
| Action | Path |
|--------|------|
| Create | `runtime/nft-seed.js` |
| Create | `examples/nft-worlds/code.js` |
| Create | `examples/nft-art-generator/code.js` |
| Modify | `runtime/api-voxel.js` — accept hash seeds |
| Modify | `src/main.js` — expose + register demos |
| Modify | `console.html` / `new_console.html` — add to dropdown |
| Modify | `package.json` — eslint globals |

---

## Phase 2: Voxel Engine Upgrades

### 2A: Fluid Simulation (no deps)
- Water: 7-block horizontal spread, infinite downward. Tick every 4 frames
- Lava: 3-block horizontal spread, tick every 12 frames
- Fluid level (0-7) per block via separate Uint8Array per chunk
- Source blocks vs flowing blocks, BFS retraction on source removal
- Render: top face Y = blockY + level/7, animated UV for flow
- New API: setVoxelFluidSource(), removeVoxelFluidSource(), getVoxelFluidLevel()
- Files: runtime/api-voxel.js (~200-300 lines)

### 2B: Async Chunk Meshing / Web Workers (no deps, parallel with 2A)
- Create runtime/workers/voxel-mesher.worker.js
- Worker receives chunk data + neighbor borders, returns transferable Float32Arrays
- 2-4 worker pool, round-robin dispatch
- Priority queue: distance-based, dirty edits = max priority
- Frame budget: max 2 mesh uploads/frame (configurable)
- Fallback to main-thread meshing if Workers unavailable
- Files: runtime/workers/voxel-mesher.worker.js (create), runtime/api-voxel.js (modify)

### 2C: LOD System (no deps, parallel)
- LOD 0 (0-4 chunks): full greedy mesh + AO + lighting
- LOD 1 (5-8 chunks): simplified mesh (merge 2×2×2)
- LOD 2 (9+): skip/billboard
- Fade opacity during transition
- configureVoxelWorld({ lodLevels: [4, 8, 12] })
- Files: runtime/api-voxel.js

### 2D: Enhanced ECS (no deps, parallel)
- Components: mesh, physics, collider, animation, inventory, pathfind, interact
- Archetypes: mob, item, projectile, npc, vehicle
- A* pathfinding on voxel grid
- New API: setVoxelEntityComponent(), getVoxelEntityComponent(), queryVoxelEntities(), createVoxelEntityArchetype()
- Files: runtime/api-voxel.js (~200 lines expansion)

### 2E: Schematics / World Import/Export (no deps)
- exportVoxelRegion(x1,y1,z1, x2,y2,z2) → ArrayBuffer (RLE compressed)
- importVoxelRegion(data, x, y, z)
- exportVoxelWorldJSON() / importVoxelWorldJSON(json)
- Format: Header [version:u8, sizeX/Y/Z:u16] + RLE body
- Files: runtime/api-voxel.js (~150 lines)

### 2F: Custom Block Shapes (no deps, parallel)
- Predefined shapes: cube, slab_bottom, slab_top, stair_*, slope_*, fence, wall
- registerVoxelBlock(id, { shape, boundingBox }) extended
- Non-full shapes don't occlude neighbors
- Shape-specific collision AABBs
- Files: runtime/api-voxel.js (~200 lines in buildChunkMesh)

---

## Phase 3: Generative Art Expansion

### 3A: 8 New Sketches (parallel with all)
Add to examples/generative-art/code.js (6→14 scenes):
7. Reaction-Diffusion — Gray-Scott cellular automata, coral patterns
8. Fractal Tree — L-system branching, seasonal animation, wind
9. Voronoi Stained Glass — drifting seeds, jewel-tone filled cells
10. Mandelbrot Zoom — deep zoom, smooth iteration coloring
11. Particle Cloth — Verlet integration 30×30 cloth sim
12. Strange Attractors — Lorenz/Rössler 3D projected trails
13. Circle Packing — progressive fill, size-based coloring
14. Pixel Sorting — glitch art, brightness-sorted pixel bands

Each ~60-100 lines, follows existing initSketchN/updateSketchN/drawSketchN pattern.
File grows from ~650 to ~1500+ LOC.

### 3B: New `examples/creative-coding/code.js` — 3D Generative
4 scenes:
- Impossible Architecture — procedural Escher-like structures
- Crystal Growth — 3D DLA (diffusion-limited aggregation)
- Sound Sculpture — sphere vertex displacement via noise
- Organic Forms — metaball-like proximity merging

Files: examples/creative-coding/code.js (create), src/main.js (modify), console.html (modify)

---

## Phase 4: Documentation

| Step | Action |
|------|--------|
| 4.1 | Create docs/api-nft-seed.html |
| 4.2 | Update docs/api-voxel.html (fluid, LOD, ECS, schematics, shapes) |
| 4.3 | Update docs/VOXEL_ENGINE_GUIDE.md |
| 4.4 | Update CLAUDE.md API listing |
| 4.5 | Update package.json eslint globals |
| 4.6 | Update runtime/index.d.ts TypeScript declarations |

New globals: createSeedFromHash, createSeedRNG, seedToTraits, exportSeedMetadata, setSeed, setVoxelFluidSource, removeVoxelFluidSource, getVoxelFluidLevel, exportVoxelRegion, importVoxelRegion, exportVoxelWorldJSON, importVoxelWorldJSON, setVoxelEntityComponent, getVoxelEntityComponent, queryVoxelEntities, createVoxelEntityArchetype

---

## Implementation Order (Recommended)

1. Phase 1 (NFT seeds) — cleanest standalone, most novel
2. Phase 3A (gen art sketches) — parallel, quick wins
3. Phase 2A + 2D (fluid + ECS) — highest-impact voxel
4. Phase 2B (async meshing) — performance
5. Phase 2E + 2F (schematics + shapes) — features
6. Phase 2C (LOD) — polish
7. Phase 3B (3D creative coding) — showcase
8. Phase 4 (docs) — finalize

## Dependency Graph
- Phase 1.1 → 1.2 → 1.3/1.4
- All Phase 2 sub-phases are independent/parallel
- Phase 3 parallel with everything
- Phase 4 after all implementation

## Verification
- pnpm test after each step (56+ tests)
- Add NFT seed tests: determinism, hash conversion, metadata format
- Add fluid tests: spread correctness, retraction, levels
- Demo smoke test: load each new demo via pnpm dev
- NFT determinism: same token → same world, 3x
- Worker fallback: disable workers → main-thread meshing works
- Existing cart compat: minecraft-demo, voxel-creative, voxel-creatures, voxel-terrain

## Decisions
- FNV-1a hash (not crypto) — fast, deterministic, no deps
- Cellular automata fluids (not SPH) — proven at scale
- Worker meshing optional — progressive enhancement
- Predefined block shapes (not arbitrary) — manageable mesher
- No blockchain/wallet integration — seed system only
- No multiplayer yet — ECS designed serializable for future
- Uint8Array blocks (max 255) — sufficient; Uint16 upgrade documented
