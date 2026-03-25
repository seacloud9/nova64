// NATURE EXPLORER 3D — Serene Low-Poly World with GLB Models
// A peaceful walking sim through a generated landscape with real 3D models
// Uses Khronos glTF Sample Models (CC0/CC-BY) loaded directly from GitHub

const WORLD_SIZE = 100;
const TREE_COUNT = 30;
const ROCK_COUNT = 20;

let playerPos = { x: 0, y: 1, z: 0 };
let playerAngle = 0;
let time = 0;
let gameState = 'start';
let models = {};
let loadingProgress = 0;
let loadingText = '';
let trees = [];
let rocks = [];
let butterflies = [];
let clouds = [];
let sunAngle = 0;
let dayNightCycle = 0; // 0=noon, PI=midnight

// GLB model URLs (Khronos glTF samples — all CC0/CC-BY 4.0)
const MODEL_URLS = {
  fox: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
  duck: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
};

// Seeded random for consistent world gen
let seed = 12345;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function generateWorld() {
  // Ground plane
  createPlane(WORLD_SIZE * 2, WORLD_SIZE * 2, 0x4a8c3f, [0, 0, 0]);

  // Water plane (low, blue, slightly transparent)
  const water = createPlane(WORLD_SIZE * 4, WORLD_SIZE * 4, 0x2266aa, [0, -0.5, 0]);

  // Generate trees (tall cylinders + sphere canopies)
  seed = 42;
  for (let i = 0; i < TREE_COUNT; i++) {
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const height = 3 + seededRandom() * 4;
    const trunkColor = 0x8b5a2b + Math.floor(seededRandom() * 0x202020);
    const canopyColor = [0x228b22, 0x2e8b57, 0x3cb371, 0x006400][Math.floor(seededRandom() * 4)];

    const trunk = createCylinder(0.3, height, trunkColor, [x, height / 2, z]);
    const canopySize = 1.5 + seededRandom() * 2;
    const canopy = createSphere(canopySize, canopyColor, [x, height + canopySize * 0.5, z]);

    trees.push({ x, z, height, trunk, canopy });
  }

  // Generate rocks
  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const z = (seededRandom() - 0.5) * WORLD_SIZE * 1.5;
    const size = 0.5 + seededRandom() * 1.5;
    const gray = 0x666666 + Math.floor(seededRandom() * 0x333333);
    const rock = createCube(size, gray, [x, size / 2, z]);
    setScale(rock, 1 + seededRandom() * 0.5, 0.6 + seededRandom() * 0.8, 1 + seededRandom() * 0.5);
    rocks.push({ x, z, mesh: rock });
  }

  // Create butterfly particles (colored spheres)
  for (let i = 0; i < 15; i++) {
    const x = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;
    const colors = [0xff44aa, 0xffaa00, 0x44aaff, 0xaaff44, 0xff88ff];
    const mesh = createSphere(0.15, colors[i % colors.length], [x, 2, z]);
    butterflies.push({
      x,
      z,
      y: 2,
      vx: (Math.random() - 0.5) * 2,
      vz: (Math.random() - 0.5) * 2,
      mesh,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Clouds
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;
    const y = 25 + Math.random() * 15;
    const mesh = createSphere(3 + Math.random() * 4, 0xffffff, [x, y, z]);
    setScale(mesh, 2 + Math.random(), 0.5, 1 + Math.random());
    clouds.push({ mesh, x, z, y, speed: 0.5 + Math.random() * 1 });
  }

  // Hills
  for (let i = 0; i < 12; i++) {
    const x = (Math.random() - 0.5) * WORLD_SIZE * 2;
    const z = (Math.random() - 0.5) * WORLD_SIZE * 2;
    const height = 3 + Math.random() * 8;
    const radius = 5 + Math.random() * 10;
    const hill = createSphere(radius, 0x5a9c4f, [x, -radius + height, z]);
    setScale(hill, 1, 0.4, 1);
  }
}

async function loadModels() {
  try {
    loadingText = 'Loading Fox model...';
    loadingProgress = 0.2;
    models.fox = await loadModel(MODEL_URLS.fox, [5, 0, -5], 0.04);
    loadingProgress = 0.5;

    loadingText = 'Loading Duck model...';
    models.duck = await loadModel(MODEL_URLS.duck, [-3, 0, 3], 1.5);
    loadingProgress = 0.8;

    // Add more ducks in a pond area
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const dx = Math.cos(angle) * 4 - 10;
      const dz = Math.sin(angle) * 4;
      await loadModel(MODEL_URLS.duck, [dx, -0.3, dz], 1.2);
    }
    loadingProgress = 1.0;
    loadingText = 'World ready!';
  } catch (e) {
    console.warn('Model loading failed (CORS or network):', e);
    loadingText = 'Models unavailable — enjoying geometry world!';
    loadingProgress = 1.0;
  }
}

export async function init() {
  clearScene();
  trees = [];
  rocks = [];
  butterflies = [];
  clouds = [];
  playerPos = { x: 0, y: 1, z: 0 };
  playerAngle = 0;
  time = 0;
  gameState = 'start';

  // Atmosphere
  setAmbientLight(0xffeedd, 0.5);
  setLightDirection(0.5, -1, 0.3);
  setFog(0x88bbdd, 40, 120);
  enableBloom(0.4, 0.3, 0.5);
  enableVignette(1.0, 0.85);

  if (typeof createGradientSkybox === 'function') {
    createGradientSkybox(0x88bbdd, 0x3366aa);
  }

  setCameraFOV(65);
  generateWorld();
  await loadModels();
  gameState = 'exploring';
}

export function update(dt) {
  time += dt;

  if (gameState === 'start') return;

  // Day/night cycle (slow)
  dayNightCycle += dt * 0.03;
  sunAngle = dayNightCycle;
  const daylight = Math.max(0.15, Math.cos(sunAngle) * 0.5 + 0.5);
  setAmbientLight(0xffeedd, daylight * 0.5);
  const sunDir = Math.cos(sunAngle);
  setLightDirection(sunDir, -Math.abs(Math.cos(sunAngle)) - 0.3, 0.3);

  // Player movement — WASD / arrows
  const moveSpeed = 8;
  const turnSpeed = 2.5;

  if (key('ArrowLeft') || key('KeyA')) playerAngle += turnSpeed * dt;
  if (key('ArrowRight') || key('KeyD')) playerAngle -= turnSpeed * dt;

  const forward = key('ArrowUp') || key('KeyW');
  const backward = key('ArrowDown') || key('KeyS');

  if (forward) {
    playerPos.x -= Math.sin(playerAngle) * moveSpeed * dt;
    playerPos.z -= Math.cos(playerAngle) * moveSpeed * dt;
  }
  if (backward) {
    playerPos.x += Math.sin(playerAngle) * moveSpeed * dt * 0.5;
    playerPos.z += Math.cos(playerAngle) * moveSpeed * dt * 0.5;
  }

  // Camera follows player (3rd person)
  const camDist = 12;
  const camHeight = 6;
  const camX = playerPos.x + Math.sin(playerAngle) * camDist;
  const camZ = playerPos.z + Math.cos(playerAngle) * camDist;
  setCameraPosition(camX, playerPos.y + camHeight, camZ);
  setCameraTarget(playerPos.x, playerPos.y + 1, playerPos.z);

  // Animate butterflies
  for (const b of butterflies) {
    b.phase += dt * 3;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y = 1.5 + Math.sin(b.phase) * 1.5 + Math.sin(b.phase * 2.3) * 0.5;

    // Wander
    b.vx += (Math.random() - 0.5) * dt * 3;
    b.vz += (Math.random() - 0.5) * dt * 3;
    b.vx *= 0.99;
    b.vz *= 0.99;

    setPosition(b.mesh, b.x, b.y, b.z);
  }

  // Animate clouds
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x > 120) c.x = -120;
    setPosition(c.mesh, c.x, c.y, c.z);
  }

  // Animate fox (circle around player)
  if (models.fox) {
    const foxAngle = time * 0.5;
    const foxX = playerPos.x + Math.cos(foxAngle) * 8;
    const foxZ = playerPos.z + Math.sin(foxAngle) * 8;
    setPosition(models.fox, foxX, 0, foxZ);
    setRotation(models.fox, 0, -foxAngle + Math.PI / 2, 0);
  }
}

export function draw() {
  if (gameState === 'start' || loadingProgress < 1) {
    rect(0, 0, 640, 360, rgba8(20, 40, 30, 200), true);
    printCentered('NATURE EXPLORER', 320, 80, rgba8(100, 220, 150));
    printCentered('A Peaceful Walk Through a Generated World', 320, 110, rgba8(150, 200, 170));

    // Loading bar
    rect(170, 170, 300, 16, rgba8(40, 60, 40), true);
    rect(170, 170, Math.floor(300 * loadingProgress), 16, rgba8(100, 220, 100), true);
    printCentered(loadingText, 320, 200, rgba8(180, 255, 180));
    printCentered('WASD/Arrows to explore', 320, 260, rgba8(120, 160, 140));
    return;
  }

  // Minimal immersive HUD
  const dayPct = Math.cos(sunAngle) * 0.5 + 0.5;
  const timeLabel =
    dayPct > 0.7 ? 'MIDDAY' : dayPct > 0.4 ? 'AFTERNOON' : dayPct > 0.2 ? 'DUSK' : 'NIGHT';

  rect(10, 10, 180, 35, rgba8(0, 0, 0, 80), true);
  print(`NATURE EXPLORER | ${timeLabel}`, 18, 18, rgba8(200, 240, 200, 200));
  print(
    `POS: ${playerPos.x.toFixed(0)}, ${playerPos.z.toFixed(0)}`,
    18,
    32,
    rgba8(150, 200, 150, 150)
  );
}
