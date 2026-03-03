// ⭐ STAR FOX NOVA 64 — Space Combat Rail Shooter ⭐
// Fly through asteroid fields, blast enemy fighters, survive boss encounters

// ── State ──────────────────────────────────────────────
let gameState = 'start'; // 'start' | 'playing' | 'gameover'
let gameTime = 0;
let inputLockout = 0.6;

const C = {
  // Ship
  shipBody:   0x3388ff,
  shipWing:   0x2266cc,
  shipEngine: 0xff6600,
  shipCockpit:0x00ccff,
  // Enemies
  drone:      0xcc22ff,
  droneEye:   0x00ff44,
  droneWing:  0x8800cc,
  // Projectiles
  laser:      0x00ffff,
  enemyShot:  0xff0066,
  // Environment
  asteroid:   0x887766,
  ring:       0xffaa00,
  star:       0xffffff,
  // FX
  explosion:  0xff4400,
  spark:      0xffff44,
};

let game = {
  // Arwing
  player: {
    x: 0, y: 5, z: 0,
    vx: 0, vy: 0,
    roll: 0,
    health: 100,
    weaponTimer: 0,
    meshes: {},
    invuln: 0,
  },
  speed: 50,
  distance: 0,
  score: 0,
  wave: 1,
  kills: 0,

  // World
  gridPlanes: [],
  asteroids: [],
  enemies: [],
  bullets: [],
  enemyBullets: [],
  particles: [],
  rings: [],  // collectible score rings

  enemySpawnTimer: 0,
  ringSpawnTimer: 0,
};

// ── Init ───────────────────────────────────────────────
export async function init() {
  console.log('🚀 STAR FOX NOVA 64 — Loading...');

  // Camera — behind and above the Arwing
  setCameraPosition(0, 10, 18);
  setCameraTarget(0, 4, -30);
  setCameraFOV(72);

  // Lighting — dramatic space lighting
  setAmbientLight(0x334466, 0.8);
  setLightDirection(-0.4, -1, -0.6);
  setLightColor(0xeeeeff);

  // Deep space fog
  setFog(0x020610, 60, 280);

  // Space skybox
  if (typeof createSpaceSkybox === 'function') {
    createSpaceSkybox({ starCount: 2500, starSize: 2.5, nebulae: true, nebulaColor: 0x1a0044 });
  }

  // Post-processing — cinematic space feel
  enableBloom(1.4, 0.4, 0.12);
  enableFXAA();
  enableVignette(1.2, 0.92);
  if (typeof enableChromaticAberration === 'function') enableChromaticAberration(0.001);

  // Build world
  createGridFloor();
  createArwing();
  for (let i = 0; i < 20; i++) spawnAsteroid(true);

  // Start screen
  initStartScreen();
  console.log('✅ STAR FOX NOVA 64 — Ready!');
}

// ── World Building ─────────────────────────────────────
function createGridFloor() {
  // Neon grid floor (like Tron / Star Fox SNES)
  const cols = 18, rows = 30, size = 6;
  const startX = -(cols * size) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const alt = (r + c) % 2 === 0;
      const color = alt ? 0x0a1428 : 0x0c1a35;
      const x = startX + c * size + size / 2;
      const z = 15 - r * size - size / 2;

      const plane = createPlane(size, size, color, [x, -3, z]);
      rotateMesh(plane, -Math.PI / 2, 0, 0);
      game.gridPlanes.push({ mesh: plane, x, z });
    }
  }
}

function createArwing() {
  const p = game.player;
  const px = p.x, py = p.y, pz = p.z;

  // Fuselage — sleek elongated body
  p.meshes.body = createCube(1.8, C.shipBody, [px, py, pz]);
  setScale(p.meshes.body, 0.8, 0.5, 2.5);

  // Cockpit canopy
  p.meshes.cockpit = createSphere(0.5, C.shipCockpit, [px, py + 0.4, pz + 0.8], 8);
  setScale(p.meshes.cockpit, 0.8, 0.6, 1.2);

  // Wings — wide delta
  p.meshes.wingL = createCube(1, C.shipWing, [px - 2.2, py - 0.1, pz - 0.3]);
  setScale(p.meshes.wingL, 2.5, 0.12, 1.8);

  p.meshes.wingR = createCube(1, C.shipWing, [px + 2.2, py - 0.1, pz - 0.3]);
  setScale(p.meshes.wingR, 2.5, 0.12, 1.8);

  // Engine glow pods
  p.meshes.engineL = createCube(0.4, C.shipEngine, [px - 1.2, py - 0.15, pz - 2.0]);
  setScale(p.meshes.engineL, 0.7, 0.5, 1.0);

  p.meshes.engineR = createCube(0.4, C.shipEngine, [px + 1.2, py - 0.15, pz - 2.0]);
  setScale(p.meshes.engineR, 0.7, 0.5, 1.0);

  // Tail fin
  p.meshes.tail = createCube(0.3, C.shipWing, [px, py + 0.8, pz - 1.8]);
  setScale(p.meshes.tail, 0.15, 1.2, 1.0);
}

function spawnAsteroid(randomZ = false) {
  const side = Math.random() > 0.5 ? 1 : -1;
  const x = side * (8 + Math.random() * 30);
  const y = -2 + Math.random() * 12;
  const z = randomZ ? (10 - Math.random() * 200) : -200 - Math.random() * 40;
  const sz = 1 + Math.random() * 3;

  const mesh = createSphere(sz, C.asteroid, [x, y, z], 5);
  game.asteroids.push({
    mesh, x, y, z, sz,
    rotSpeed: (Math.random() - 0.5) * 2,
  });
}

function spawnEnemy() {
  const x = (Math.random() - 0.5) * 40;
  const y = 4 + Math.random() * 14;
  const z = -180 - Math.random() * 40;

  const core = createSphere(1.8, C.drone, [x, y, z], 6);
  const eye  = createSphere(0.8, C.droneEye, [x, y, z + 1.5], 6);
  const wL   = createCube(1, C.droneWing, [x - 2.5, y, z]);
  setScale(wL, 2.5, 0.15, 0.8);
  const wR   = createCube(1, C.droneWing, [x + 2.5, y, z]);
  setScale(wR, 2.5, 0.15, 0.8);

  game.enemies.push({
    parts: [
      { mesh: core, ox: 0, oy: 0, oz: 0 },
      { mesh: eye,  ox: 0, oy: 0, oz: 1.5 },
      { mesh: wL,   ox: -2.5, oy: 0, oz: 0 },
      { mesh: wR,   ox: 2.5,  oy: 0, oz: 0 },
    ],
    x, y, z,
    health: 25,
    vx: (Math.random() - 0.5) * 15,
    vy: (Math.random() - 0.5) * 8,
    vz: 35 + Math.random() * 25,
    timer: 0,
  });
}

function spawnRing() {
  const x = (Math.random() - 0.5) * 30;
  const y = 2 + Math.random() * 12;
  const z = -180 - Math.random() * 20;

  const mesh = createTorus(x, y, z, 2.0, 0.35, C.ring);
  game.rings.push({ mesh, x, y, z, collected: false });
}

// ── Shooting ───────────────────────────────────────────
function fireLaser() {
  const p = game.player;
  // Twin lasers from wing tips
  for (const offX of [-1.5, 1.5]) {
    const bx = p.x + offX, by = p.y, bz = p.z - 2;
    const mesh = createCube(0.6, C.laser, [bx, by, bz]);
    setScale(mesh, 0.25, 0.25, 4.0);
    game.bullets.push({ mesh, x: bx, y: by, z: bz, vz: -200, life: 2.5 });
  }
}

function fireEnemyShot(ex, ey, ez) {
  const p = game.player;
  const dx = p.x - ex, dy = p.y - ey, dz = p.z - ez;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const spd = 65;

  const mesh = createSphere(0.8, C.enemyShot, [ex, ey, ez], 4);
  game.enemyBullets.push({
    mesh, x: ex, y: ey, z: ez,
    vx: (dx / d) * spd, vy: (dy / d) * spd, vz: (dz / d) * spd,
    life: 3.5,
  });
}

function createExplosion(x, y, z, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const mesh = createCube(0.6, color, [x, y, z]);
    const spd = 12 + Math.random() * 20;
    const a1 = Math.random() * Math.PI * 2;
    const a2 = Math.random() * Math.PI * 2;
    game.particles.push({
      mesh, x, y, z,
      vx: Math.cos(a1) * Math.sin(a2) * spd,
      vy: Math.sin(a1) * spd * 0.6,
      vz: Math.cos(a1) * Math.cos(a2) * spd,
      life: 0.4 + Math.random() * 0.5,
      maxLife: 0.9,
    });
  }
}

// ── Update ─────────────────────────────────────────────
export function update(dt) {
  gameTime += dt;

  if (gameState === 'start' || gameState === 'gameover') {
    if (inputLockout > 0) inputLockout -= dt;
    updateAllButtons();
    updateGrid(dt * 0.3);
    updateArwingIdle(dt);
    if (inputLockout <= 0 && isKeyPressed('Space')) startGame();
    return;
  }

  // Playing
  game.distance += game.speed * dt;
  game.score += dt * 20;
  game.speed = Math.min(90, 50 + game.score * 0.001);

  // Increase difficulty
  if (game.kills > 0 && game.kills % 15 === 0 && game.wave < 10) {
    game.wave = Math.floor(game.kills / 15) + 1;
  }

  updateArwing(dt);
  updateGrid(dt);
  updateAsteroids(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateParticles(dt);
  updateRings(dt);
}

function startGame() {
  if (gameState === 'playing') return;
  gameState = 'playing';
  inputLockout = 0.3;

  game.score = 0;
  game.kills = 0;
  game.wave = 1;
  game.speed = 50;
  game.player.health = 100;
  game.player.invuln = 0;
  game.enemySpawnTimer = 0;
  game.ringSpawnTimer = 0;

  // Clean up old objects
  game.enemies.forEach(e => e.parts.forEach(p => destroyMesh(p.mesh)));
  game.bullets.forEach(b => destroyMesh(b.mesh));
  game.enemyBullets.forEach(b => destroyMesh(b.mesh));
  game.particles.forEach(p => destroyMesh(p.mesh));
  game.rings.forEach(r => destroyMesh(r.mesh));
  game.enemies = [];
  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.rings = [];

  clearButtons();
}

// ── Arwing Movement ────────────────────────────────────
function updateArwing(dt) {
  const p = game.player;

  if (p.health <= 0) {
    createExplosion(p.x, p.y, p.z, C.explosion, 20);
    gameState = 'gameover';
    inputLockout = 1.0;
    initGameOverScreen();
    return;
  }

  if (p.invuln > 0) p.invuln -= dt;

  // Input — smooth velocity-based movement
  let ix = 0, iy = 0;
  if (key('ArrowLeft')  || key('KeyA')) ix = -1;
  if (key('ArrowRight') || key('KeyD')) ix =  1;
  if (key('ArrowUp')    || key('KeyW')) iy =  1;
  if (key('ArrowDown')  || key('KeyS')) iy = -1;

  const accel = 120, friction = 4.0;
  p.vx += ix * accel * dt;
  p.vy += iy * accel * dt;
  p.vx *= (1 - friction * dt);
  p.vy *= (1 - friction * dt);

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Clamp to play area
  if (p.x < -22) { p.x = -22; p.vx = 0; }
  if (p.x >  22) { p.x =  22; p.vx = 0; }
  if (p.y <   1) { p.y =   1; p.vy = 0; }
  if (p.y >  18) { p.y =  18; p.vy = 0; }

  // Rolling tilt from lateral movement
  const targetRoll = -p.vx * 0.04;
  p.roll += (targetRoll - p.roll) * 6 * dt;

  // Position all ship meshes
  positionArwing(p, p.roll);

  // Shooting
  p.weaponTimer -= dt;
  if (key('Space') && p.weaponTimer <= 0) {
    fireLaser();
    p.weaponTimer = 0.12;
  }
}

function updateArwingIdle(dt) {
  const p = game.player;
  const bob = Math.sin(gameTime * 1.5) * 0.5;
  const sway = Math.sin(gameTime * 0.7) * 0.3;
  const idleRoll = Math.sin(gameTime * 0.9) * 0.06;

  p.x = sway;
  p.y = 5 + bob;
  positionArwing(p, idleRoll);
}

function positionArwing(p, roll) {
  const m = p.meshes;
  setPosition(m.body, p.x, p.y, p.z);
  setRotation(m.body, 0, 0, roll);

  setPosition(m.cockpit, p.x, p.y + 0.4, p.z + 0.8);
  setRotation(m.cockpit, 0, 0, roll);

  setPosition(m.wingL, p.x - 2.2, p.y - 0.1, p.z - 0.3);
  setRotation(m.wingL, 0, 0, roll);

  setPosition(m.wingR, p.x + 2.2, p.y - 0.1, p.z - 0.3);
  setRotation(m.wingR, 0, 0, roll);

  setPosition(m.engineL, p.x - 1.2, p.y - 0.15, p.z - 2.0);
  setRotation(m.engineL, 0, 0, roll);

  setPosition(m.engineR, p.x + 1.2, p.y - 0.15, p.z - 2.0);
  setRotation(m.engineR, 0, 0, roll);

  setPosition(m.tail, p.x, p.y + 0.8, p.z - 1.8);
  setRotation(m.tail, 0, 0, roll);
}

// ── World Updates ──────────────────────────────────────
function updateGrid(dt) {
  const total = 30 * 6;
  game.gridPlanes.forEach(g => {
    g.z += game.speed * dt;
    if (g.z > 15) g.z -= total;
    setPosition(g.mesh, g.x, -3, g.z);
  });
}

function updateAsteroids(dt) {
  for (let i = game.asteroids.length - 1; i >= 0; i--) {
    const a = game.asteroids[i];
    a.z += game.speed * dt;
    rotateMesh(a.mesh, a.rotSpeed * dt, a.rotSpeed * 0.5 * dt, 0);
    setPosition(a.mesh, a.x, a.y, a.z);

    if (a.z > 20) {
      destroyMesh(a.mesh);
      game.asteroids.splice(i, 1);
      spawnAsteroid(false);
    }
  }
}

function updateEnemies(dt) {
  // Spawning
  game.enemySpawnTimer -= dt;
  if (game.enemySpawnTimer <= 0 && game.enemies.length < 8) {
    spawnEnemy();
    game.enemySpawnTimer = Math.max(0.8, 3.5 - game.wave * 0.25);
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.timer += dt;

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;

    // Bounce off edges
    if (e.x < -35 || e.x > 35) e.vx *= -1;
    if (e.y < 1 || e.y > 20) e.vy *= -1;

    const bob = Math.sin(e.timer * 3.5) * 1.5;
    e.parts.forEach(part => {
      setPosition(part.mesh, e.x + part.ox, e.y + part.oy + bob, e.z + part.oz);
    });

    // Shoot at player
    if (e.timer > 1.5 && Math.random() < 0.015) {
      fireEnemyShot(e.x, e.y + bob, e.z);
    }

    // Passed player
    if (e.z > 25) {
      e.parts.forEach(part => destroyMesh(part.mesh));
      game.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.z += b.vz * dt;
    b.life -= dt;
    setPosition(b.mesh, b.x, b.y, b.z);

    if (b.life <= 0 || b.z < -220) {
      destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
      continue;
    }

    // Hit enemies
    let hit = false;
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (Math.abs(b.x - e.x) < 3 && Math.abs(b.y - e.y) < 3 && Math.abs(b.z - e.z) < 4) {
        e.health -= 15;
        hit = true;
        if (e.health <= 0) {
          createExplosion(e.x, e.y, e.z, C.explosion);
          game.score += 500;
          game.kills++;
          e.parts.forEach(part => destroyMesh(part.mesh));
          game.enemies.splice(j, 1);
        }
        break;
      }
    }

    // Hit asteroids (break small ones)
    if (!hit) {
      for (let j = game.asteroids.length - 1; j >= 0; j--) {
        const a = game.asteroids[j];
        const hitDist = a.sz + 1;
        if (Math.abs(b.x - a.x) < hitDist && Math.abs(b.y - a.y) < hitDist && Math.abs(b.z - a.z) < hitDist) {
          if (a.sz < 2) {
            createExplosion(a.x, a.y, a.z, C.spark, 6);
            game.score += 100;
            destroyMesh(a.mesh);
            game.asteroids.splice(j, 1);
            spawnAsteroid(false);
          }
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      destroyMesh(b.mesh);
      game.bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  const p = game.player;
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const b = game.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.life -= dt;
    setPosition(b.mesh, b.x, b.y, b.z);

    // Hit player
    if (p.invuln <= 0 &&
        Math.abs(b.x - p.x) < 1.8 &&
        Math.abs(b.y - p.y) < 1.5 &&
        Math.abs(b.z - p.z) < 2.0) {
      p.health -= 20;
      p.invuln = 0.8;
      createExplosion(p.x, p.y, p.z, C.spark, 6);
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.life <= 0 || b.z > 25) {
      destroyMesh(b.mesh);
      game.enemyBullets.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    setPosition(p.mesh, p.x, p.y, p.z);
    const s = Math.max(0.01, p.life / p.maxLife);
    setScale(p.mesh, s, s, s);

    if (p.life <= 0) {
      destroyMesh(p.mesh);
      game.particles.splice(i, 1);
    }
  }
}

function updateRings(dt) {
  // Spawn rings periodically
  game.ringSpawnTimer -= dt;
  if (game.ringSpawnTimer <= 0 && game.rings.length < 3) {
    spawnRing();
    game.ringSpawnTimer = 4 + Math.random() * 3;
  }

  const p = game.player;
  for (let i = game.rings.length - 1; i >= 0; i--) {
    const r = game.rings[i];
    r.z += game.speed * dt;

    // Spin the ring
    rotateMesh(r.mesh, 0, 2.5 * dt, 0);
    setPosition(r.mesh, r.x, r.y, r.z);

    // Collect
    if (Math.abs(r.x - p.x) < 3 && Math.abs(r.y - p.y) < 3 && Math.abs(r.z - p.z) < 3) {
      game.score += 300;
      createExplosion(r.x, r.y, r.z, C.ring, 8);
      destroyMesh(r.mesh);
      game.rings.splice(i, 1);
      continue;
    }

    if (r.z > 25) {
      destroyMesh(r.mesh);
      game.rings.splice(i, 1);
    }
  }
}

// ── Screens ────────────────────────────────────────────
function initStartScreen() {
  clearButtons();
  createButton(centerX(240), 250, 240, 52, '▶ START MISSION', () => {
    startGame();
  }, {
    normalColor: rgba8(0, 180, 255, 255),
    hoverColor:  rgba8(60, 220, 255, 255),
    pressedColor: rgba8(0, 120, 200, 255),
  });
}

function initGameOverScreen() {
  clearButtons();
  createButton(centerX(220), 265, 220, 50, '↻ RETRY', () => {
    gameState = 'start';
    inputLockout = 0.6;
    initStartScreen();
  }, {
    normalColor: rgba8(220, 50, 50, 255),
    hoverColor:  rgba8(255, 80, 80, 255),
    pressedColor: rgba8(180, 30, 30, 255),
  });
}

// ── Draw ───────────────────────────────────────────────
export function draw() {
  if (gameState === 'start') {
    drawStartScreen();
    return;
  }

  if (gameState === 'gameover') {
    drawGameOverScreen();
    return;
  }

  drawHUD();
}

function drawStartScreen() {
  // Deep space background
  cls(rgba8(2, 4, 16, 255));
  drawGradient(0, 0, 640, 360, rgba8(4, 8, 30, 255), rgba8(1, 2, 10, 255), 'v');

  // Nebula glow behind title
  drawRadialGradient(320, 90, 260, rgba8(40, 80, 255, 40), rgba8(0, 0, 0, 0));
  drawRadialGradient(320, 90, 160, rgba8(0, 200, 255, 25), rgba8(0, 0, 0, 0));

  // Star noise
  drawNoise(0, 0, 640, 360, 18, Math.floor(gameTime * 5));

  // Pulsing corner stars
  const sp = Math.sin(gameTime * 2.5) * 0.5 + 0.5;
  drawStarburst(40, 35, 14, 5, 6, rgba8(0, 200, 255, Math.floor(sp * 180)), true);
  drawStarburst(600, 35, 14, 5, 6, rgba8(0, 200, 255, Math.floor(sp * 180)), true);
  drawStarburst(100, 60, 6, 2, 4, rgba8(255, 200, 80, Math.floor((1 - sp) * 140)), true);
  drawStarburst(540, 70, 5, 2, 5, rgba8(180, 120, 255, Math.floor(sp * 120)), true);

  // Energy wave horizon
  drawWave(0, 180, 640, 5, 0.03, gameTime * 2.2, rgba8(0, 150, 255, 80), 2);
  drawWave(0, 184, 640, 3, 0.045, gameTime * 2.8 + 1, rgba8(0, 255, 200, 50), 1);

  // Title
  const bob = Math.sin(gameTime * 1.6) * 6;
  drawGlowTextCentered('STAR FOX', 320, 46 + bob,
    rgba8(0, 200, 255, 255), rgba8(0, 60, 180, 180), 2);
  drawGlowTextCentered('NOVA 64', 320, 100 + bob,
    rgba8(120, 180, 255, 255), rgba8(20, 40, 120, 160), 2);

  // Subtitle
  const subPulse = Math.sin(gameTime * 3) * 0.25 + 0.75;
  setFont('large');
  setTextAlign('center');
  drawText('SPACE COMBAT SQUADRON', 320, 148, rgba8(0, 255, 200, Math.floor(subPulse * 255)), 1);

  // Tagline
  setFont('normal');
  drawText('DEFEND THE LYLAT SYSTEM', 320, 170, rgba8(160, 200, 255, 190), 1);

  // Info panel
  const panel = createPanel(centerX(420), 195, 420, 86, {
    bgColor: rgba8(4, 10, 30, 215),
    borderColor: rgba8(0, 160, 255, 255),
    borderWidth: 2,
    shadow: true,
  });
  drawPanel(panel);

  setFont('small');
  drawText('◆ Blast enemy drones through asteroid fields', 320, 212, uiColors.light, 1);
  drawText('◆ Collect golden rings for bonus points', 320, 227, uiColors.light, 1);
  drawText('◆ Survive escalating waves of enemies', 320, 242, uiColors.light, 1);

  drawAllButtons();

  // Controls
  setFont('tiny');
  setTextAlign('center');
  drawText('WASD / Arrows: Fly  ◆  Space: Fire Lasers', 320, 316, uiColors.secondary, 1);

  // Pulsing prompt
  const alpha = Math.floor((Math.sin(gameTime * 5) * 0.5 + 0.5) * 255);
  drawText('◆ PRESS SPACE TO LAUNCH ◆', 320, 335, rgba8(0, 200, 255, alpha), 1);

  drawScanlines(35, 2);
}

function drawGameOverScreen() {
  // Red-tinted overlay
  rect(0, 0, 640, 360, rgba8(80, 0, 0, 150), true);

  // Static noise
  drawNoise(0, 0, 640, 360, 15, Math.floor(gameTime * 8));

  setFont('huge');
  setTextAlign('center');
  drawTextShadow('MISSION FAILED', 320, 100, rgba8(255, 60, 60, 255), rgba8(0, 0, 0, 255), 4, 1);

  setFont('large');
  drawText('FINAL SCORE', 320, 160, rgba8(180, 200, 255, 200), 1);

  setFont('huge');
  drawText(Math.floor(game.score).toString(), 320, 195, rgba8(0, 255, 200, 255), 1);

  setFont('normal');
  drawText('ENEMIES DESTROYED: ' + game.kills, 320, 235, rgba8(255, 180, 80, 220), 1);
  drawText('WAVE REACHED: ' + game.wave, 320, 255, rgba8(160, 200, 255, 200), 1);

  drawAllButtons();

  drawScanlines(30, 2);
}

function drawHUD() {
  setFont('normal');
  setTextAlign('left');

  // Score
  drawTextShadow('SCORE ' + Math.floor(game.score), 16, 16, rgba8(0, 255, 200, 255), rgba8(0, 0, 0, 200), 2, 1);

  // Wave
  drawText('WAVE ' + game.wave, 16, 36, rgba8(180, 200, 255, 200), 1);

  // Kills
  drawText('KILLS ' + game.kills, 16, 52, rgba8(255, 180, 80, 180), 1);

  // Speed indicator
  setTextAlign('right');
  drawText('SPD ' + Math.floor(game.speed), 624, 16, rgba8(100, 200, 255, 180), 1);

  // Health bar
  const barX = 420, barY = 340, barW = 200, barH = 14;
  rect(barX, barY, barW, barH, rgba8(40, 0, 0, 200), true);
  const hp = Math.max(0, game.player.health);
  const hpW = (hp / 100) * barW;
  const hpColor = hp > 50 ? rgba8(0, 220, 80, 255) :
                  hp > 25 ? rgba8(255, 180, 0, 255) :
                            rgba8(255, 40, 40, 255);
  rect(barX, barY, hpW, barH, hpColor, true);
  rect(barX, barY, barW, barH, rgba8(200, 200, 200, 120), false);

  setTextAlign('left');
  setFont('small');
  drawText('SHIELD', barX - 55, barY + 3, rgba8(180, 200, 255, 200), 1);

  // Damage flash
  if (game.player.invuln > 0) {
    const flashAlpha = Math.floor(Math.sin(gameTime * 30) * 40 + 40);
    rect(0, 0, 640, 360, rgba8(255, 0, 0, flashAlpha), true);
  }

  // Crosshair
  const cx = 320, cy = 160;
  line(cx - 8, cy, cx - 3, cy, rgba8(0, 255, 200, 120));
  line(cx + 3, cy, cx + 8, cy, rgba8(0, 255, 200, 120));
  line(cx, cy - 8, cx, cy - 3, rgba8(0, 255, 200, 120));
  line(cx, cy + 3, cx, cy + 8, rgba8(0, 255, 200, 120));
}
