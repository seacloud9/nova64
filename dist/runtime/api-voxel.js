/**
 * Nova64 Voxel Engine API v2
 *
 * A production-quality voxel engine inspired by noa-engine / voxel.js:
 * - Block registry with extensible block definitions
 * - Proper Simplex noise (2D + 3D) with seeded permutation tables
 * - True 3D cave generation (worm tunnels, not 2D columns)
 * - Ore vein generation at depth-dependent layers
 * - Per-vertex ambient occlusion (smooth shadows)
 * - DDA voxel raycasting (never misses a block)
 * - Shared material (no per-chunk material leak)
 * - Configurable world generation (custom generators for carts)
 * - Chunk-based world management with dirty tracking
 */

import * as THREE from 'three';

// ─── Simplex Noise (seeded, 2D + 3D) ───────────────────────────────────────
// Based on Stefan Gustavson's simplex noise (public domain)

function createSimplexNoise(seed) {
  // Seeded pseudo-random shuffle for permutation table
  function seededRandom(s) {
    let x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  const perm = new Uint8Array(512);
  const grad3 = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
  ];

  // Build seeded permutation table
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function dot2(g, x, y) {
    return g[0] * x + g[1] * y;
  }
  function dot3(g, x, y, z) {
    return g[0] * x + g[1] * y + g[2] * z;
  }

  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  function noise2D(xin, yin) {
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * dot2(grad3[perm[ii + perm[jj]] % 12], x0, y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * dot2(grad3[perm[ii + i1 + perm[jj + j1]] % 12], x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * dot2(grad3[perm[ii + 1 + perm[jj + 1]] % 12], x2, y2);
    }
    return 70.0 * (n0 + n1 + n2); // range approx [-1, 1]
  }

  function noise3D(xin, yin, zin) {
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * dot3(grad3[perm[ii + perm[jj + perm[kk]]] % 12], x0, y0, z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 =
        t1 * t1 * dot3(grad3[perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12], x1, y1, z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 =
        t2 * t2 * dot3(grad3[perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12], x2, y2, z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) {
      n3 = 0.0;
    } else {
      t3 *= t3;
      n3 =
        t3 * t3 * dot3(grad3[perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12], x3, y3, z3);
    }
    return 32.0 * (n0 + n1 + n2 + n3); // range approx [-1, 1]
  }

  // Multi-octave fractal noise (returns 0..1)
  function fbm2D(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.01) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (total / maxValue) * 0.5 + 0.5; // normalize to 0..1
  }

  function fbm3D(x, y, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.01) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return (total / maxValue) * 0.5 + 0.5; // normalize to 0..1
  }

  return { noise2D, noise3D, fbm2D, fbm3D };
}

// ─── Block Registry ─────────────────────────────────────────────────────────

function createBlockRegistry() {
  const blocks = [];

  function register(id, opts) {
    blocks[id] = {
      id,
      name: opts.name || `block_${id}`,
      color: opts.color !== undefined ? opts.color : 0xff00ff,
      solid: opts.solid !== undefined ? opts.solid : true,
      transparent: opts.transparent || false,
      fluid: opts.fluid || false,
      lightEmit: opts.lightEmit || 0,
      lightBlock: opts.lightBlock !== undefined ? opts.lightBlock : 15,
    };
  }

  function get(id) {
    return blocks[id] || blocks[0];
  }
  function isSolid(id) {
    const b = blocks[id];
    return b ? b.solid : false;
  }
  function isTransparent(id) {
    const b = blocks[id];
    return b ? b.transparent : false;
  }
  function isFluid(id) {
    const b = blocks[id];
    return b ? b.fluid : false;
  }
  function getColor(id) {
    const b = blocks[id];
    return b ? b.color : 0xff00ff;
  }

  // Register built-in blocks
  register(0, { name: 'air', color: 0x000000, solid: false, transparent: true, lightBlock: 0 });
  register(1, { name: 'grass', color: 0x55cc33 });
  register(2, { name: 'dirt', color: 0x996644 });
  register(3, { name: 'stone', color: 0xaaaaaa });
  register(4, { name: 'sand', color: 0xffdd88 });
  register(5, {
    name: 'water',
    color: 0x2288dd,
    solid: false,
    transparent: true,
    fluid: true,
    lightBlock: 2,
  });
  register(6, { name: 'wood', color: 0x774422 });
  register(7, { name: 'leaves', color: 0x116622, transparent: true, lightBlock: 1 });
  register(8, { name: 'cobblestone', color: 0x667788 });
  register(9, { name: 'planks', color: 0xddaa55 });
  register(10, {
    name: 'glass',
    color: 0xccffff,
    transparent: true,
    lightBlock: 0,
  });
  register(11, { name: 'brick', color: 0xcc4433 });
  register(12, { name: 'snow', color: 0xeeeeff });
  register(13, { name: 'ice', color: 0x99ddff, transparent: true, lightBlock: 1 });
  register(14, { name: 'bedrock', color: 0x333333 });
  // New blocks (Phase 1)
  register(15, { name: 'coal_ore', color: 0x444444 });
  register(16, { name: 'iron_ore', color: 0xccaa88 });
  register(17, { name: 'gold_ore', color: 0xffcc33 });
  register(18, { name: 'diamond_ore', color: 0x44ffee });
  register(19, { name: 'gravel', color: 0x888888 });
  register(20, { name: 'clay', color: 0xbbaa99 });
  register(21, { name: 'torch', color: 0xffdd44, solid: false, transparent: true, lightEmit: 14, lightBlock: 0 });
  register(22, { name: 'glowstone', color: 0xffeeaa, lightEmit: 15 });
  register(23, { name: 'lava', color: 0xff4400, solid: false, fluid: true, lightEmit: 15, lightBlock: 0 });
  register(24, { name: 'obsidian', color: 0x220033 });
  register(25, { name: 'mossy_cobblestone', color: 0x668855 });

  return { register, get, isSolid, isTransparent, isFluid, getColor, blocks };
}

// ─── Main Voxel API ─────────────────────────────────────────────────────────

export function voxelApi(gpu) {
  const registry = createBlockRegistry();

  // World configuration
  let CHUNK_SIZE = 16;
  let CHUNK_HEIGHT = 128;
  let RENDER_DISTANCE = 4;
  let SEA_LEVEL = 62;

  // Block type constants (backward compatible)
  const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    SAND: 4,
    WATER: 5,
    WOOD: 6,
    LEAVES: 7,
    COBBLESTONE: 8,
    PLANKS: 9,
    GLASS: 10,
    BRICK: 11,
    SNOW: 12,
    ICE: 13,
    BEDROCK: 14,
    COAL_ORE: 15,
    IRON_ORE: 16,
    GOLD_ORE: 17,
    DIAMOND_ORE: 18,
    GRAVEL: 19,
    CLAY: 20,
    TORCH: 21,
    GLOWSTONE: 22,
    LAVA: 23,
    OBSIDIAN: 24,
    MOSSY_COBBLESTONE: 25,
  };

  // World data
  const chunks = new Map();
  const chunkMeshes = new Map();
  let worldSeed = Math.floor(Math.random() * 50000);
  let noise = createSimplexNoise(worldSeed);

  // Shared materials (fix material leak — one material for all chunks)
  let sharedOpaqueMaterial = null;
  let sharedTransparentMaterial = null;

  function getOpaqueMaterial() {
    if (window.VOXEL_MATERIAL) return window.VOXEL_MATERIAL;
    if (!sharedOpaqueMaterial) {
      sharedOpaqueMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1,
      });
    }
    return sharedOpaqueMaterial;
  }

  function getTransparentMaterial() {
    if (!sharedTransparentMaterial) {
      sharedTransparentMaterial = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.6,
        metalness: 0.0,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }
    return sharedTransparentMaterial;
  }

  // Custom terrain generator (carts can override)
  let customTerrainGenerator = null;

  // ─── Chunk class ────────────────────────────────────────────────────────

  class Chunk {
    constructor(chunkX, chunkZ) {
      this.chunkX = chunkX;
      this.chunkZ = chunkZ;
      this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
      this.dirty = true;
    }

    getBlock(x, y, z) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return BLOCK_TYPES.AIR;
      }
      return this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    setBlock(x, y, z, blockType) {
      if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
        return;
      }
      this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockType;
      this.dirty = true;
    }
  }

  function getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!chunks.has(key)) {
      const chunk = new Chunk(chunkX, chunkZ);
      if (customTerrainGenerator) {
        customTerrainGenerator(chunk, { BLOCK_TYPES, noise, CHUNK_SIZE, CHUNK_HEIGHT, SEA_LEVEL, worldSeed });
      } else {
        generateChunkTerrain(chunk);
      }
      chunks.set(key, chunk);
    }
    return chunks.get(key);
  }

  function getChunkIfExists(chunkX, chunkZ) {
    return chunks.get(`${chunkX},${chunkZ}`) || null;
  }

  // ─── Terrain Generation ─────────────────────────────────────────────────

  function generateChunkTerrain(chunk) {
    const baseX = chunk.chunkX * CHUNK_SIZE;
    const baseZ = chunk.chunkZ * CHUNK_SIZE;
    const pendingTrees = [];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = baseX + x;
        const worldZ = baseZ + z;

        // Biome selection via temperature + moisture (simplex fbm)
        const temperature = noise.fbm2D(worldX + worldSeed, worldZ + worldSeed, 2, 0.5, 2.0, 0.005);
        const moisture = noise.fbm2D(
          worldX + 1000 + worldSeed,
          worldZ + 1000 + worldSeed,
          2,
          0.5,
          2.0,
          0.003
        );

        let heightScale = 20;
        let heightBase = 64;
        let surfaceBlock = BLOCK_TYPES.GRASS;
        let subBlock = BLOCK_TYPES.DIRT;
        let treeChance = 0;

        if (temperature < 0.2) {
          surfaceBlock = BLOCK_TYPES.SNOW;
          subBlock = BLOCK_TYPES.ICE;
          heightScale = 6;
          heightBase = 65;
          treeChance = 0;
        } else if (temperature < 0.35 && moisture > 0.5) {
          surfaceBlock = BLOCK_TYPES.COBBLESTONE;
          subBlock = BLOCK_TYPES.STONE;
          heightScale = 18;
          heightBase = 66;
          treeChance = 0.06;
        } else if (temperature > 0.7 && moisture < 0.25) {
          surfaceBlock = BLOCK_TYPES.SAND;
          subBlock = BLOCK_TYPES.SAND;
          heightScale = 4;
          heightBase = 63;
          treeChance = 0;
        } else if (temperature > 0.6 && moisture > 0.6) {
          surfaceBlock = BLOCK_TYPES.LEAVES;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 22;
          heightBase = 58;
          treeChance = 0.15;
        } else if (moisture < 0.3) {
          surfaceBlock = BLOCK_TYPES.DIRT;
          subBlock = BLOCK_TYPES.SAND;
          heightScale = 5;
          heightBase = 65;
          treeChance = 0.005;
        } else if (temperature > 0.4 && moisture > 0.4) {
          surfaceBlock = BLOCK_TYPES.GRASS;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 14;
          heightBase = 64;
          treeChance = 0.08;
        } else if (temperature < 0.35) {
          surfaceBlock = BLOCK_TYPES.SNOW;
          subBlock = BLOCK_TYPES.STONE;
          heightScale = 35;
          heightBase = 62;
          treeChance = 0.02;
        } else {
          surfaceBlock = BLOCK_TYPES.GRASS;
          subBlock = BLOCK_TYPES.DIRT;
          heightScale = 6;
          heightBase = 64;
          treeChance = 0.015;
        }

        const height = Math.floor(
          noise.fbm2D(worldX, worldZ, 4, 0.5, 2.0, 0.01) * heightScale + heightBase
        );

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            chunk.setBlock(x, y, z, BLOCK_TYPES.BEDROCK);
          } else if (y < height - 3) {
            // Stone with ore generation
            let block = BLOCK_TYPES.STONE;

            // Ore veins using 3D noise at different scales per ore type
            if (y < 16) {
              const dOre = noise.fbm3D(worldX, y, worldZ, 2, 0.5, 2.0, 0.15);
              if (dOre > 0.78) block = BLOCK_TYPES.DIAMOND_ORE;
            }
            if (y < 32 && block === BLOCK_TYPES.STONE) {
              const gOre = noise.fbm3D(worldX + 500, y, worldZ + 500, 2, 0.5, 2.0, 0.12);
              if (gOre > 0.76) block = BLOCK_TYPES.GOLD_ORE;
            }
            if (y < 64 && block === BLOCK_TYPES.STONE) {
              const iOre = noise.fbm3D(worldX + 1000, y, worldZ + 1000, 2, 0.5, 2.0, 0.1);
              if (iOre > 0.73) block = BLOCK_TYPES.IRON_ORE;
            }
            if (block === BLOCK_TYPES.STONE) {
              const cOre = noise.fbm3D(worldX + 2000, y, worldZ + 2000, 2, 0.5, 2.0, 0.08);
              if (cOre > 0.72) block = BLOCK_TYPES.COAL_ORE;
            }
            // Gravel pockets
            if (block === BLOCK_TYPES.STONE && y < 40) {
              const grav = noise.fbm3D(worldX + 3000, y, worldZ + 3000, 1, 0.5, 2.0, 0.06);
              if (grav > 0.8) block = BLOCK_TYPES.GRAVEL;
            }

            chunk.setBlock(x, y, z, block);
          } else if (y < height - 1) {
            chunk.setBlock(x, y, z, subBlock);
          } else if (y === height - 1) {
            chunk.setBlock(x, y, z, surfaceBlock);
          } else if (y < SEA_LEVEL && y >= height) {
            chunk.setBlock(x, y, z, BLOCK_TYPES.WATER);
          }

          // 3D cave generation using proper 3D simplex noise
          if (y > 0 && y < height - 5) {
            // Primary cave network — winding tunnels
            const cave1 = noise.fbm3D(worldX, y, worldZ, 3, 0.5, 2.0, 0.04);
            // Secondary smaller caves
            const cave2 = noise.fbm3D(worldX + 7777, y + 7777, worldZ + 7777, 2, 0.5, 2.0, 0.08);

            // Carve cave if noise is in a narrow band (creates tunnel shapes)
            const caveThreshold1 = Math.abs(cave1 - 0.5) < 0.04;
            const caveThreshold2 = Math.abs(cave2 - 0.5) < 0.03;

            if (caveThreshold1 || caveThreshold2) {
              // Don't carve through bedrock
              if (y > 1) {
                chunk.setBlock(x, y, z, BLOCK_TYPES.AIR);
              }
            }

            // Lava pools at very low levels
            if (y <= 10 && (caveThreshold1 || caveThreshold2)) {
              if (y <= 5 && chunk.getBlock(x, y, z) === BLOCK_TYPES.AIR) {
                chunk.setBlock(x, y, z, BLOCK_TYPES.LAVA);
              }
            }
          }
        }

        // Clay near water
        if (height <= SEA_LEVEL + 2 && height >= SEA_LEVEL - 3) {
          for (let cy = Math.max(1, height - 4); cy < height - 1; cy++) {
            const clayNoise = noise.fbm3D(worldX + 5000, cy, worldZ + 5000, 1, 0.5, 2.0, 0.1);
            if (clayNoise > 0.7 && chunk.getBlock(x, cy, z) === BLOCK_TYPES.STONE) {
              chunk.setBlock(x, cy, z, BLOCK_TYPES.CLAY);
            }
          }
        }

        // Tree placement
        if (height > SEA_LEVEL && treeChance > 0) {
          const treeSeed = noise.noise2D(worldX * 0.7, worldZ * 0.7);
          const treeRoll = (treeSeed + 1.0) * 0.5; // normalize to 0..1
          if (treeRoll < treeChance && x > 2 && x < CHUNK_SIZE - 3 && z > 2 && z < CHUNK_SIZE - 3) {
            pendingTrees.push({ x, y: height, z });
          }
        }
      }
    }

    // Place trees after terrain is filled
    for (const t of pendingTrees) {
      const hash = noise.noise2D(t.x * 7.1 + baseX, t.z * 13.3 + baseZ);
      const trunkHeight = 4 + Math.floor(Math.abs(hash) * 3);
      for (let i = 0; i < trunkHeight; i++) {
        chunk.setBlock(t.x, t.y + i, t.z, BLOCK_TYPES.WOOD);
      }
      const leafY = t.y + trunkHeight;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4) {
              const lx = t.x + dx;
              const ly = leafY + dy;
              const lz = t.z + dz;
              if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && ly < CHUNK_HEIGHT) {
                if (chunk.getBlock(lx, ly, lz) === BLOCK_TYPES.AIR) {
                  chunk.setBlock(lx, ly, lz, BLOCK_TYPES.LEAVES);
                }
              }
            }
          }
        }
      }
    }
  }

  // ─── AO helpers ─────────────────────────────────────────────────────────

  // Get whether a block at the given local/cross-chunk position is opaque for AO
  function isBlockOpaqueForAO(chunk, x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
      const id = chunk.getBlock(x, y, z);
      return registry.isSolid(id) && !registry.isTransparent(id);
    }
    // Cross-chunk: check neighbor
    const ncx = chunk.chunkX + Math.floor(x / CHUNK_SIZE);
    const ncz = chunk.chunkZ + Math.floor(z / CHUNK_SIZE);
    const nc = getChunkIfExists(ncx, ncz);
    if (!nc) return false;
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const id = nc.getBlock(lx, y, lz);
    return registry.isSolid(id) && !registry.isTransparent(id);
  }

  // Compute AO value for a vertex of a face. side1, side2, corner are booleans.
  // Returns 0 (darkest) to 3 (brightest)
  function vertexAO(side1, side2, corner) {
    if (side1 && side2) return 0;
    return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
  }

  // ─── Meshing ────────────────────────────────────────────────────────────

  function createChunkMesh(chunk) {
    const opaqueVerts = [];
    const opaqueNorms = [];
    const opaqueColors = [];
    const opaqueUvs = [];
    const opaqueIdx = [];
    let opaqueVCount = 0;

    const transVerts = [];
    const transNorms = [];
    const transColors = [];
    const transUvs = [];
    const transIdx = [];
    let transVCount = 0;

    // Face normals and vertex offsets for each of the 6 faces
    // Each face: [normal, v0, v1, v2, v3] where vertices are offsets from block origin
    // Vertex order: counter-clockwise for front face
    const faceData = [
      // +Z (front)
      { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
      // -Z (back)
      { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
      // +X (right)
      { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
      // -X (left)
      { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
      // +Y (top)
      { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
      // -Y (bottom)
      { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    ];

    // AO neighbor offsets per face per vertex: [side1, side2, corner]
    // For each face direction, for each of 4 vertices, which neighbors to check
    // These are relative to the face normal direction
    const aoOffsets = [
      // +Z face: vertices at z+1 plane
      [
        [[-1, 0, 1], [0, -1, 1], [-1, -1, 1]], // v0 (0,0,1)
        [[1, 0, 1], [0, -1, 1], [1, -1, 1]],   // v1 (1,0,1)
        [[1, 0, 1], [0, 1, 1], [1, 1, 1]],      // v2 (1,1,1)
        [[-1, 0, 1], [0, 1, 1], [-1, 1, 1]],    // v3 (0,1,1)
      ],
      // -Z face
      [
        [[1, 0, -1], [0, -1, -1], [1, -1, -1]],
        [[-1, 0, -1], [0, -1, -1], [-1, -1, -1]],
        [[-1, 0, -1], [0, 1, -1], [-1, 1, -1]],
        [[1, 0, -1], [0, 1, -1], [1, 1, -1]],
      ],
      // +X face
      [
        [[1, 0, 1], [1, -1, 0], [1, -1, 1]],
        [[1, 0, -1], [1, -1, 0], [1, -1, -1]],
        [[1, 0, -1], [1, 1, 0], [1, 1, -1]],
        [[1, 0, 1], [1, 1, 0], [1, 1, 1]],
      ],
      // -X face
      [
        [[-1, 0, -1], [-1, -1, 0], [-1, -1, -1]],
        [[-1, 0, 1], [-1, -1, 0], [-1, -1, 1]],
        [[-1, 0, 1], [-1, 1, 0], [-1, 1, 1]],
        [[-1, 0, -1], [-1, 1, 0], [-1, 1, -1]],
      ],
      // +Y face
      [
        [[-1, 1, 0], [0, 1, 1], [-1, 1, 1]],
        [[1, 1, 0], [0, 1, 1], [1, 1, 1]],
        [[1, 1, 0], [0, 1, -1], [1, 1, -1]],
        [[-1, 1, 0], [0, 1, -1], [-1, 1, -1]],
      ],
      // -Y face
      [
        [[-1, -1, 0], [0, -1, -1], [-1, -1, -1]],
        [[1, -1, 0], [0, -1, -1], [1, -1, -1]],
        [[1, -1, 0], [0, -1, 1], [1, -1, 1]],
        [[-1, -1, 0], [0, -1, 1], [-1, -1, 1]],
      ],
    ];

    function shouldRenderFace(x, y, z, dir) {
      const nx = x + dir[0];
      const ny = y + dir[1];
      const nz = z + dir[2];

      if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
        const neighbor = chunk.getBlock(nx, ny, nz);
        return !registry.isSolid(neighbor) || registry.isTransparent(neighbor);
      }

      if (nx < 0 || nx >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
        const neighborChunkX = chunk.chunkX + Math.floor(nx / CHUNK_SIZE);
        const neighborChunkZ = chunk.chunkZ + Math.floor(nz / CHUNK_SIZE);
        const neighborChunk = getChunkIfExists(neighborChunkX, neighborChunkZ);
        if (!neighborChunk) return true;
        const localX = ((nx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((nz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const neighbor = neighborChunk.getBlock(localX, ny, localZ);
        return !registry.isSolid(neighbor) || registry.isTransparent(neighbor);
      }

      return ny < 0 || ny >= CHUNK_HEIGHT;
    }

    function addFace(x, y, z, faceIdx, blockType) {
      const face = faceData[faceIdx];
      const isTransparent = registry.isTransparent(blockType);
      const blockColor = registry.getColor(blockType);
      const baseColor = new THREE.Color(blockColor);

      const verts = isTransparent ? transVerts : opaqueVerts;
      const norms = isTransparent ? transNorms : opaqueNorms;
      const cols = isTransparent ? transColors : opaqueColors;
      const uvArr = isTransparent ? transUvs : opaqueUvs;
      const idxArr = isTransparent ? transIdx : opaqueIdx;
      let vCount = isTransparent ? transVCount : opaqueVCount;

      const baseX = chunk.chunkX * CHUNK_SIZE;
      const baseZ = chunk.chunkZ * CHUNK_SIZE;

      // Compute per-vertex AO
      const ao = [3, 3, 3, 3];
      const aoOff = aoOffsets[faceIdx];
      for (let vi = 0; vi < 4; vi++) {
        const s1 = isBlockOpaqueForAO(chunk, x + aoOff[vi][0][0], y + aoOff[vi][0][1], z + aoOff[vi][0][2]);
        const s2 = isBlockOpaqueForAO(chunk, x + aoOff[vi][1][0], y + aoOff[vi][1][1], z + aoOff[vi][1][2]);
        const cn = isBlockOpaqueForAO(chunk, x + aoOff[vi][2][0], y + aoOff[vi][2][1], z + aoOff[vi][2][2]);
        ao[vi] = vertexAO(s1, s2, cn);
      }

      // AO to color multiplier (0=0.4, 1=0.6, 2=0.8, 3=1.0)
      const aoScale = [0.4, 0.6, 0.8, 1.0];

      for (let i = 0; i < 4; i++) {
        const v = face.v[i];
        verts.push(v[0] + x + baseX, v[1] + y, v[2] + z + baseZ);
        norms.push(face.n[0], face.n[1], face.n[2]);
        const c = baseColor.clone().multiplyScalar(aoScale[ao[i]]);
        cols.push(c.r, c.g, c.b);
      }
      uvArr.push(0, 1, 1, 1, 1, 0, 0, 0);

      // Flip quad triangulation if AO values suggest it (fixes diagonal artifact)
      if (ao[0] + ao[2] > ao[1] + ao[3]) {
        idxArr.push(vCount, vCount + 1, vCount + 2);
        idxArr.push(vCount, vCount + 2, vCount + 3);
      } else {
        idxArr.push(vCount + 1, vCount + 2, vCount + 3);
        idxArr.push(vCount + 1, vCount + 3, vCount);
      }

      if (isTransparent) {
        transVCount += 4;
      } else {
        opaqueVCount += 4;
      }
    }

    // Iterate all blocks
    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const blockType = chunk.getBlock(x, y, z);
          if (blockType === BLOCK_TYPES.AIR) continue;

          const blockIsTransparent = registry.isTransparent(blockType);

          for (let d = 0; d < 6; d++) {
            const dir = faceData[d].n;
            const nx = x + dir[0];
            const ny = y + dir[1];
            const nz = z + dir[2];

            // For transparent blocks, only render face if neighbor is air or a different transparent block
            if (blockIsTransparent) {
              let neighborId = BLOCK_TYPES.AIR;
              if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_HEIGHT && nz >= 0 && nz < CHUNK_SIZE) {
                neighborId = chunk.getBlock(nx, ny, nz);
              } else if (ny >= 0 && ny < CHUNK_HEIGHT) {
                if (nx < 0 || nx >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
                  const ncx = chunk.chunkX + Math.floor(nx / CHUNK_SIZE);
                  const ncz = chunk.chunkZ + Math.floor(nz / CHUNK_SIZE);
                  const nc = getChunkIfExists(ncx, ncz);
                  if (nc) {
                    neighborId = nc.getBlock(
                      ((nx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
                      ny,
                      ((nz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
                    );
                  }
                }
              }
              if (neighborId === blockType) continue; // skip face between same transparent blocks
              if (registry.isSolid(neighborId) && !registry.isTransparent(neighborId)) continue;
              addFace(x, y, z, d, blockType);
            } else {
              if (shouldRenderFace(x, y, z, dir)) {
                addFace(x, y, z, d, blockType);
              }
            }
          }
        }
      }
    }

    // Build opaque geometry
    let opaqueGeometry = null;
    if (opaqueVerts.length > 0) {
      opaqueGeometry = new THREE.BufferGeometry();
      opaqueGeometry.setAttribute('position', new THREE.Float32BufferAttribute(opaqueVerts, 3));
      opaqueGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNorms, 3));
      opaqueGeometry.setAttribute('color', new THREE.Float32BufferAttribute(opaqueColors, 3));
      opaqueGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
      opaqueGeometry.setIndex(opaqueIdx);
      opaqueGeometry.computeBoundingSphere();
    }

    // Build transparent geometry
    let transGeometry = null;
    if (transVerts.length > 0) {
      transGeometry = new THREE.BufferGeometry();
      transGeometry.setAttribute('position', new THREE.Float32BufferAttribute(transVerts, 3));
      transGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(transNorms, 3));
      transGeometry.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));
      transGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(transUvs, 2));
      transGeometry.setIndex(transIdx);
      transGeometry.computeBoundingSphere();
    }

    return { opaqueGeometry, transGeometry };
  }

  // ─── Chunk mesh update ──────────────────────────────────────────────────

  function updateChunkMesh(chunk) {
    if (!chunk.dirty) return;

    const key = `${chunk.chunkX},${chunk.chunkZ}`;

    // Remove old meshes
    if (chunkMeshes.has(key)) {
      const entry = chunkMeshes.get(key);
      if (entry.opaque) {
        gpu.scene.remove(entry.opaque);
        entry.opaque.geometry.dispose();
      }
      if (entry.transparent) {
        gpu.scene.remove(entry.transparent);
        entry.transparent.geometry.dispose();
      }
      chunkMeshes.delete(key);
    }

    const { opaqueGeometry, transGeometry } = createChunkMesh(chunk);
    const entry = { opaque: null, transparent: null };

    if (opaqueGeometry) {
      const mesh = new THREE.Mesh(opaqueGeometry, getOpaqueMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      gpu.scene.add(mesh);
      entry.opaque = mesh;
    }

    if (transGeometry) {
      const mesh = new THREE.Mesh(transGeometry, getTransparentMaterial());
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.renderOrder = 1; // render after opaque
      gpu.scene.add(mesh);
      entry.transparent = mesh;
    }

    if (entry.opaque || entry.transparent) {
      chunkMeshes.set(key, entry);
    }

    chunk.dirty = false;
  }

  // ─── World coordinates ──────────────────────────────────────────────────

  function worldToChunk(x, z) {
    return {
      chunkX: Math.floor(x / CHUNK_SIZE),
      chunkZ: Math.floor(z / CHUNK_SIZE),
      localX: ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
      localZ: ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    };
  }

  function getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    return chunk.getBlock(localX, y, localZ);
  }

  function setBlock(x, y, z, blockType) {
    if (y < 0 || y >= CHUNK_HEIGHT) return;
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    chunk.setBlock(localX, y, localZ, blockType);

    if (localX === 0) getChunk(chunkX - 1, chunkZ).dirty = true;
    if (localX === CHUNK_SIZE - 1) getChunk(chunkX + 1, chunkZ).dirty = true;
    if (localZ === 0) getChunk(chunkX, chunkZ - 1).dirty = true;
    if (localZ === CHUNK_SIZE - 1) getChunk(chunkX, chunkZ + 1).dirty = true;
  }

  // ─── Chunk loading / unloading ──────────────────────────────────────────

  function updateChunks(playerX, playerZ) {
    const centerChunkX = Math.floor(playerX / CHUNK_SIZE);
    const centerChunkZ = Math.floor(playerZ / CHUNK_SIZE);

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const chunk = getChunk(centerChunkX + dx, centerChunkZ + dz);
        updateChunkMesh(chunk);
      }
    }

    // Unload far chunks
    const keysToRemove = [];
    for (const [key, entry] of chunkMeshes.entries()) {
      const [cx, cz] = key.split(',').map(Number);
      if (
        Math.abs(cx - centerChunkX) > RENDER_DISTANCE + 1 ||
        Math.abs(cz - centerChunkZ) > RENDER_DISTANCE + 1
      ) {
        if (entry.opaque) {
          gpu.scene.remove(entry.opaque);
          entry.opaque.geometry.dispose();
        }
        if (entry.transparent) {
          gpu.scene.remove(entry.transparent);
          entry.transparent.geometry.dispose();
        }
        keysToRemove.push(key);
        chunks.delete(key);
      }
    }
    keysToRemove.forEach(key => chunkMeshes.delete(key));
  }

  // ─── World reset ────────────────────────────────────────────────────────

  function resetWorld() {
    for (const entry of chunkMeshes.values()) {
      if (entry.opaque) {
        gpu.scene.remove(entry.opaque);
        entry.opaque.geometry.dispose();
      }
      if (entry.transparent) {
        gpu.scene.remove(entry.transparent);
        entry.transparent.geometry.dispose();
      }
    }
    chunkMeshes.clear();
    chunks.clear();
    worldSeed += 5000 + Math.floor(Math.random() * 10000);
    noise = createSimplexNoise(worldSeed);
  }

  // ─── DDA Raycast (Amanatides & Woo) ────────────────────────────────────

  function raycastBlock(origin, direction, maxDistance = 10) {
    let ox = origin[0];
    let oy = origin[1];
    let oz = origin[2];
    let dx = direction[0];
    let dy = direction[1];
    let dz = direction[2];

    // Normalize direction
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len === 0) return { hit: false };
    dx /= len;
    dy /= len;
    dz /= len;

    let ix = Math.floor(ox);
    let iy = Math.floor(oy);
    let iz = Math.floor(oz);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const tDeltaX = dx !== 0 ? Math.abs(1.0 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1.0 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1.0 / dz) : Infinity;

    let tMaxX = dx > 0 ? (ix + 1 - ox) / dx : dx < 0 ? (ox - ix) / -dx : Infinity;
    let tMaxY = dy > 0 ? (iy + 1 - oy) / dy : dy < 0 ? (oy - iy) / -dy : Infinity;
    let tMaxZ = dz > 0 ? (iz + 1 - oz) / dz : dz < 0 ? (oz - iz) / -dz : Infinity;

    let dist = 0;
    let nx = 0,
      ny = 0,
      nz = 0; // face normal

    for (let i = 0; i < maxDistance * 3 + 1; i++) {
      const blockType = getBlock(ix, iy, iz);
      if (blockType !== BLOCK_TYPES.AIR && registry.isSolid(blockType)) {
        return {
          hit: true,
          position: [ix, iy, iz],
          normal: [nx, ny, nz],
          adjacent: [ix + nx, iy + ny, iz + nz],
          blockType,
          distance: dist,
        };
      }

      // Advance to next voxel boundary
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          if (dist > maxDistance) break;
          ix += stepX;
          tMaxX += tDeltaX;
          nx = -stepX;
          ny = 0;
          nz = 0;
        } else {
          dist = tMaxZ;
          if (dist > maxDistance) break;
          iz += stepZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          if (dist > maxDistance) break;
          iy += stepY;
          tMaxY += tDeltaY;
          nx = 0;
          ny = -stepY;
          nz = 0;
        } else {
          dist = tMaxZ;
          if (dist > maxDistance) break;
          iz += stepZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      }
    }

    return { hit: false };
  }

  // ─── Collision detection ────────────────────────────────────────────────

  function checkCollision(pos, size) {
    const minX = Math.floor(pos[0] - size);
    const maxX = Math.floor(pos[0] + size);
    const minY = Math.floor(pos[1]);
    const maxY = Math.floor(pos[1] + size * 2);
    const minZ = Math.floor(pos[2] - size);
    const maxZ = Math.floor(pos[2] + size);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const blockType = getBlock(x, y, z);
          if (registry.isSolid(blockType) && !registry.isFluid(blockType)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Check if position is in water/fluid
  function checkFluid(pos, size) {
    const bx = Math.floor(pos[0]);
    const by = Math.floor(pos[1]);
    const bz = Math.floor(pos[2]);
    for (let dy = 0; dy <= Math.ceil(size * 2); dy++) {
      const id = getBlock(bx, by + dy, bz);
      if (registry.isFluid(id)) return true;
    }
    return false;
  }

  // ─── Structures ─────────────────────────────────────────────────────────

  function placeTree(x, y, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < trunkHeight; i++) {
      setBlock(x, y + i, z, BLOCK_TYPES.WOOD);
    }
    const leafY = y + trunkHeight;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 4) {
            setBlock(x + dx, leafY + dy, z + dz, BLOCK_TYPES.LEAVES);
          }
        }
      }
    }
  }

  // ─── Configuration ──────────────────────────────────────────────────────

  function configureWorld(opts = {}) {
    if (opts.seed !== undefined) {
      worldSeed = opts.seed;
      noise = createSimplexNoise(worldSeed);
    }
    if (opts.chunkSize !== undefined) CHUNK_SIZE = opts.chunkSize;
    if (opts.chunkHeight !== undefined) CHUNK_HEIGHT = opts.chunkHeight;
    if (opts.renderDistance !== undefined) RENDER_DISTANCE = opts.renderDistance;
    if (opts.seaLevel !== undefined) SEA_LEVEL = opts.seaLevel;
    if (opts.generateTerrain !== undefined) customTerrainGenerator = opts.generateTerrain;
  }

  // Find the highest solid block at a given (x,z) position
  function getHighestBlock(x, z) {
    const { chunkX, chunkZ, localX, localZ } = worldToChunk(x, z);
    const chunk = getChunk(chunkX, chunkZ);
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      const id = chunk.getBlock(localX, y, localZ);
      if (id !== BLOCK_TYPES.AIR && id !== BLOCK_TYPES.WATER) return y;
    }
    return 0;
  }

  // Get biome name at world position (for HUD display)
  function getBiome(x, z) {
    const temperature = noise.fbm2D(x + worldSeed, z + worldSeed, 2, 0.5, 2.0, 0.005);
    const moisture = noise.fbm2D(x + 1000 + worldSeed, z + 1000 + worldSeed, 2, 0.5, 2.0, 0.003);

    if (temperature < 0.2) return 'Frozen Tundra';
    if (temperature < 0.35 && moisture > 0.5) return 'Taiga';
    if (temperature > 0.7 && moisture < 0.25) return 'Desert';
    if (temperature > 0.6 && moisture > 0.6) return 'Jungle';
    if (moisture < 0.3) return 'Savanna';
    if (temperature > 0.4 && moisture > 0.4) return 'Forest';
    if (temperature < 0.35) return 'Snowy Hills';
    return 'Plains';
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  return {
    BLOCK_TYPES,
    CHUNK_SIZE,
    CHUNK_HEIGHT,
    registry,

    // World management
    updateChunks,
    getBlock,
    setBlock,
    getHighestBlock,
    getBiome,

    // Block interaction
    raycastBlock,
    checkCollision,
    checkFluid,

    // Structures
    placeTree,

    // World reset & config
    resetWorld,
    configureWorld,

    // Noise (exposed for carts)
    noise,

    // os9-shell compatibility aliases
    createVoxelEngine: configureWorld,
    voxelSet: setBlock,
    voxelGet: getBlock,
    voxelClear: resetWorld,
    voxelRender: updateChunks,

    // Expose to global game context
    exposeTo: function (g) {
      g.BLOCK_TYPES = BLOCK_TYPES;
      g.updateVoxelWorld = updateChunks;
      g.getVoxelBlock = getBlock;
      g.setVoxelBlock = setBlock;
      g.raycastVoxelBlock = raycastBlock;
      g.checkVoxelCollision = checkCollision;
      g.checkVoxelFluid = checkFluid;
      g.placeVoxelTree = placeTree;
      g.resetVoxelWorld = resetWorld;
      g.configureVoxelWorld = configureWorld;
      g.getVoxelHighestBlock = getHighestBlock;
      g.getVoxelBiome = getBiome;
      g.registerVoxelBlock = registry.register;
      g.simplexNoise2D = noise.fbm2D;
      g.simplexNoise3D = noise.fbm3D;
    },
  };
}
