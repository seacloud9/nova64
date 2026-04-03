// Minecraft Demo - Ultimate Edition with Biomes, Ores, and Caves
let player = {
  x: 0,
  y: 80,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  speed: 0.15,
  jump: 0.35,
  size: 0.6,
  onGround: false,
  yaw: 0,
  pitch: 0,
};

let selectedBlock = 1; // 1 = Grass
let time = 0;
let loadState = 0;
let isLoaded = false;
let loadProgress = 0;
let currentBiome = 'Plains';
let selectedHotbarIdx = 0;

const BLOCK_NAMES = {
  1: 'GRASS',
  2: 'DIRT',
  3: 'STONE',
  4: 'SAND',
  5: 'WATER',
  6: 'WOOD',
  7: 'LEAVES',
  8: 'COBBLESTONE',
  9: 'PLANKS',
  11: 'BRICK',
  15: 'COAL ORE',
  16: 'IRON ORE',
  21: 'TORCH',
  22: 'GLOWSTONE',
};
const BLOCK_COLORS = {
  1: 0x55cc33,
  2: 0x996644,
  3: 0xaaaaaa,
  4: 0xffdd88,
  5: 0x2288dd,
  6: 0x774422,
  7: 0x116622,
  8: 0x667788,
  9: 0xddaa55,
  11: 0xcc4433,
  15: 0x444444,
  16: 0xccaa88,
  21: 0xffdd44,
  22: 0xffeeaa,
};
const HOTBAR_BLOCKS = [1, 3, 9, 6, 11, 21, 22, 8, 4];

const BIOME_COLORS = {
  'Frozen Tundra': rgba8(200, 220, 255),
  Taiga: rgba8(100, 180, 140),
  Desert: rgba8(255, 220, 130),
  Jungle: rgba8(80, 220, 80),
  Savanna: rgba8(220, 180, 100),
  Forest: rgba8(100, 200, 100),
  'Snowy Hills': rgba8(220, 230, 255),
  Plains: rgba8(150, 220, 150),
};

function createVoxelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      let noise = Math.random() * 60 - 30;
      let isBorder = x % 16 === 0 || y % 16 === 0 ? -20 : 0;
      let val = 180 + noise + isBorder;
      ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new globalThis.THREE.CanvasTexture(canvas);
  tex.magFilter = globalThis.THREE.NearestFilter;
  tex.minFilter = globalThis.THREE.NearestFilter;

  globalThis.window.VOXEL_MATERIAL = new globalThis.THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.0,
  });
}

export function init() {
  createVoxelTexture();
  setCameraPosition(0, 80, 0);
  setFog(0x87ceeb, 20, 80);
}

export function update() {
  if (loadState === 0) {
    loadState = 1;
    return;
  } else if (loadState === 1) {
    loadState = 2;
    return;
  } else if (loadState === 2) {
    if (typeof updateVoxelWorld === 'function') {
      updateVoxelWorld(0, 0);
    }
    // Use the new getVoxelHighestBlock API
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z)) + 2;
    } else {
      player.y = 80;
    }
    if (player.y < 5) player.y = 80;
    loadState = 3;
    isLoaded = true;
    return;
  }

  if (!isLoaded) return;

  time += 0.005;
  let skyR = Math.sin(time) > 0 ? 135 : 10;
  let skyG = Math.sin(time) > 0 ? 206 : 10;
  let skyB = Math.sin(time) > 0 ? 235 : 20;
  setFog((skyR << 16) | (skyG << 8) | skyB, 20, 80);

  // Detect current biome using the engine's built-in function
  if (typeof getVoxelBiome === 'function') {
    currentBiome = getVoxelBiome(player.x, player.z);
  }

  handleInput();
  updatePhysics();
  updateCamera();
  handleBlockInteraction();

  if (typeof updateVoxelWorld === 'function') {
    updateVoxelWorld(player.x, player.z);
  }
}

function handleInput() {
  if (key('ArrowLeft')) player.yaw -= 0.05;
  if (key('ArrowRight')) player.yaw += 0.05;
  if (key('ArrowUp') && player.pitch < Math.PI / 2) player.pitch += 0.05;
  if (key('ArrowDown') && player.pitch > -Math.PI / 2) player.pitch -= 0.05;

  let dx = 0,
    dz = 0;
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);

  if (key('KeyW')) {
    dx -= sinY;
    dz -= cosY;
  }
  if (key('KeyS')) {
    dx += sinY;
    dz += cosY;
  }
  if (key('KeyA')) {
    dx -= cosY;
    dz += sinY;
  }
  if (key('KeyD')) {
    dx += cosY;
    dz -= sinY;
  }

  if (dx !== 0 || dz !== 0) {
    const len = Math.sqrt(dx * dx + dz * dz);
    player.vx = (dx / len) * player.speed;
    player.vz = (dz / len) * player.speed;
  } else {
    player.vx = 0;
    player.vz = 0;
  }

  if (key('Space') && player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }

  // Number keys for block selection
  for (let i = 0; i < HOTBAR_BLOCKS.length && i < 9; i++) {
    if (keyp(`Digit${i + 1}`)) {
      selectedHotbarIdx = i;
      selectedBlock = HOTBAR_BLOCKS[i];
    }
  }

  if (btnp(0)) {
    selectedHotbarIdx = 0;
    selectedBlock = HOTBAR_BLOCKS[0];
  }
  if (btnp(1)) {
    selectedHotbarIdx = 1;
    selectedBlock = HOTBAR_BLOCKS[1];
  }
  if (btnp(2)) {
    selectedHotbarIdx = 2;
    selectedBlock = HOTBAR_BLOCKS[2];
  }
  if (btnp(3)) {
    selectedHotbarIdx = 3;
    selectedBlock = HOTBAR_BLOCKS[3];
  }

  // B key = respawn with new biome (random world + random position)
  if (keyp('KeyB') && typeof resetVoxelWorld === 'function') {
    resetVoxelWorld();
    player.x = (Math.random() - 0.5) * 400;
    player.z = (Math.random() - 0.5) * 400;
    updateVoxelWorld(player.x, player.z);
    if (typeof getVoxelHighestBlock === 'function') {
      player.y = getVoxelHighestBlock(Math.floor(player.x), Math.floor(player.z)) + 2;
    } else {
      player.y = 80;
    }
    if (player.y < 5) player.y = 80;
    player.vy = 0;
    player.onGround = false;
    player.yaw = 0;
    player.pitch = 0;
  }
}

function updatePhysics() {
  player.vy -= 0.02;

  let nx = player.x + player.vx;
  let ny = player.y + player.vy;
  let nz = player.z + player.vz;

  player.onGround = false;

  if (
    checkCollision(player.x, ny - player.size, player.z) ||
    checkCollision(player.x, ny + 0.2, player.z)
  ) {
    if (player.vy < 0) player.onGround = true;
    player.vy = 0;
    ny = player.y;
  }
  if (
    checkCollision(
      nx + (player.vx > 0 ? player.size : -player.size),
      player.y - player.size + 0.1,
      player.z
    )
  ) {
    player.vx = 0;
    nx = player.x;
  }
  if (
    checkCollision(
      player.x,
      player.y - player.size + 0.1,
      nz + (player.vz > 0 ? player.size : -player.size)
    )
  ) {
    player.vz = 0;
    nz = player.z;
  }

  player.x = nx;
  player.y = ny;
  player.z = nz;

  // Antifall fallback
  if (player.y < -10) {
    player.y = 40;
    player.vy = 0;
  }
}

function checkCollision(x, y, z) {
  if (typeof checkVoxelCollision === 'function') {
    return checkVoxelCollision([x, y, z], player.size);
  }
  const block = getVoxelBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  return block !== 0 && block !== undefined;
}

function updateCamera() {
  setCameraPosition(player.x, player.y + 0.8, player.z);
  const targetX = player.x - Math.sin(player.yaw) * Math.cos(player.pitch);
  const targetY = player.y + 0.8 + Math.sin(player.pitch);
  const targetZ = player.z - Math.cos(player.yaw) * Math.cos(player.pitch);
  setCameraTarget(targetX, targetY, targetZ);
}

function handleBlockInteraction() {
  if (typeof raycastVoxelBlock === 'function') {
    const dx = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const dy = Math.sin(player.pitch);
    const dz = -Math.cos(player.yaw) * Math.cos(player.pitch);

    const result = raycastVoxelBlock([player.x, player.y + 0.8, player.z], [dx, dy, dz], 6);

    if (result && result.hit) {
      if (keyp('KeyF') || keyp('KeyQ')) {
        // Break block
        setVoxelBlock(result.position[0], result.position[1], result.position[2], 0);
      }
      if (keyp('KeyE') || keyp('KeyR')) {
        // Place block on adjacent face
        setVoxelBlock(result.adjacent[0], result.adjacent[1], result.adjacent[2], selectedBlock);
      }
    }
  }
}

export function draw() {
  if (!isLoaded) {
    rectfill(0, 0, 640, 360, rgba8(10, 10, 20, 255));
    print('NOVA64 MINECRAFT EDITION', 20, 40, rgba8(255, 255, 255, 255));
    print('GENERATING WORLD...', 20, 60, rgba8(255, 255, 255, 255));
    return;
  }

  // Title bar
  rect(0, 0, 640, 16, rgba8(0, 0, 0, 150), true);
  print('MINECRAFT ULTIMATE 64', 5, 4, 0xffdd88);
  const pos = `${Math.floor(player.x)}, ${Math.floor(player.y)}, ${Math.floor(player.z)}`;
  print(pos, 560, 4, rgba8(200, 200, 200, 200));

  // Biome indicator
  const biomeCol = BIOME_COLORS[currentBiome] || rgba8(200, 200, 200);
  print(currentBiome, 220, 4, biomeCol);

  // Crosshair
  const cx = 320,
    cy = 180;
  rect(cx - 1, cy - 8, 2, 16, rgba8(255, 255, 255, 200), true);
  rect(cx - 8, cy - 1, 16, 2, rgba8(255, 255, 255, 200), true);

  // Hotbar
  const hbY = 340;
  const hbW = HOTBAR_BLOCKS.length * 32 + 8;
  const hbX = (640 - hbW) / 2;
  rect(hbX, hbY, hbW, 20, rgba8(0, 0, 0, 180), true);
  rect(hbX, hbY, hbW, 20, rgba8(100, 100, 100, 150), false);
  for (let i = 0; i < HOTBAR_BLOCKS.length; i++) {
    const bx = hbX + 4 + i * 32;
    const bid = HOTBAR_BLOCKS[i];
    const col = BLOCK_COLORS[bid] || 0xffffff;
    if (bid === selectedBlock) {
      rect(bx - 1, hbY - 1, 30, 22, rgba8(255, 255, 255, 255), false);
    }
    rect(bx + 2, hbY + 2, 24, 16, col, true);
    print(`${i + 1}`, bx + 10, hbY + 4, rgba8(255, 255, 255, 220));
  }
  // Block name below hotbar
  const bname = BLOCK_NAMES[selectedBlock] || 'UNKNOWN';
  print(bname, (640 - bname.length * 8) / 2, hbY - 14, rgba8(255, 255, 255, 200));

  // Controls hint
  print(
    'WASD=Move Space=Jump Arrows=Look F=Break E=Place 1-9=Block B=New World',
    30,
    20,
    rgba8(255, 255, 255, 200)
  );
}
