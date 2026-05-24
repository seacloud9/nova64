// Nova64 Game Cart: SPACE HARRIER NOVA 64 (RetroArch port)
// Faithful port of examples/space-harrier-3d for cross-platform parity work.
// Arrows move, Z fires, X starts / retries.

const PALETTE = {
   sky:        rgba8(170,  34, 255, 255),
   ground1:    rgba8( 34, 204,  85, 255),
   ground2:    rgba8( 17, 136,  51, 255),
   playerBody: rgba8(255,  51,  51, 255),
   playerHead: rgba8(255, 204, 170, 255),
   hair:       rgba8( 90,  45,  12, 255),
   jetpack:    rgba8(136, 136, 136, 255),
   gun:        rgba8(204, 204, 204, 255),
   flame:      rgba8(255, 170,   0, 255),
   bullet:     rgba8(255, 255,   0, 255),
   enemy:      rgba8(170,  34, 255, 255),
   enemyFast:  rgba8(  0, 204, 255, 255),
   enemyEye:   rgba8(  0, 255,   0, 255),
   treeTrunk:  rgba8(139,  69,  19, 255),
   treeLeaves: rgba8( 17, 170,  85, 255),
   pillar:     rgba8(255, 170,   0, 255),
   sun:        rgba8(255, 220, 120, 255),
};

const FLOOR_Y = -2;
const TILE = 5;
const TILE_COLS = 22;
const TILE_ROWS = 35;
const TILE_START_Z = 20;
const FOG_NEAR = 30;
const FOG_FAR  = 150;
// Gameplay sky tuned to web parity capture: neutral dark gray rgb(65,68,75)
const SKY_TOP = rgba8(54, 58, 68, 255);
const SKY_BOTTOM = rgba8(38, 40, 50, 255);
// Start sky tuned to web parity: muted purple rgb(95,57,137)
const START_SKY_TOP = rgba8(106, 64, 152, 255);
const START_SKY_BOTTOM = rgba8(48, 24, 78, 255);
const PLAYER_SPEED = 45;
const PLAYER_X_BOUND = 22;
const PLAYER_Y_MIN = 0;
const PLAYER_Y_MAX = 18;
const BULLET_SPEED = 180;
const BULLET_LIFE = 2.0;
const FIRE_COOLDOWN = 0.12;
const ENEMY_SPEED = 32;
const ENEMY_HIT_RADIUS = 2.0;
const SCROLL_SPEED = 45;
const MAX_BULLETS = 16;
const MAX_ENEMIES = 16;
const MAX_SCENERY = 40;
const SPAWN_INTERVAL = 1.0;

let tilePlanes = [];
let player = {
   x: 0, y: 0, z: -5,
   meshes: {},
};
let bulletMesh = null;
let bullets = [];
let enemyMesh = null;
let enemies = [];
let sceneryItems = [];
let sunMesh = null;
let scrollOff = 0;
let score = 0;
let best = 0;
let lives = 3;
let wave = 1;
let cooldown = 0;
let spawnT = 0;
let time = 0;
let state = 'start';
let startT = 0;
let shakeT = 0;

function applyStartVisuals() {
   setFog(PALETTE.sky, 18, 110);
   setSkyColor(START_SKY_TOP, START_SKY_BOTTOM);
   nova64.post.setBloom(0.38);
   nova64.post.setChromatic(0.003);
   nova64.post.setVignette(0.12);
   nova64.post.setCRT(true);
}

function applyGameplayVisuals() {
   setFog(PALETTE.sky, FOG_NEAR, FOG_FAR);
   setSkyColor(SKY_TOP, SKY_BOTTOM);
   nova64.post.setBloom(0.38);
   nova64.post.setChromatic(0.003);
   nova64.post.setVignette(0.12);
   nova64.post.setCRT(true);
}

function writeMat4(out, off, sx, sy, sz, tx, ty, tz) {
   out[off+0]=sx; out[off+1]=0;  out[off+2]=0;  out[off+3]=0;
   out[off+4]=0;  out[off+5]=sy; out[off+6]=0;  out[off+7]=0;
   out[off+8]=0;  out[off+9]=0;  out[off+10]=sz;out[off+11]=0;
   out[off+12]=tx;out[off+13]=ty;out[off+14]=tz;out[off+15]=1;
}

function buildFloor() {
   for (const t of tilePlanes) destroyMesh(t.mesh);
   tilePlanes = [];
   // Web-parity floor: rotated planes per tile (matches examples/space-harrier-3d).
   for (let r = 0; r < TILE_ROWS; r++) {
      for (let c = 0; c < TILE_COLS; c++) {
         const wx = (c - (TILE_COLS - 1) / 2) * TILE;
         const wz = TILE_START_Z - r * TILE - TILE / 2;
         const isAlt = ((r + c) & 1) === 0;
         const col = isAlt ? PALETTE.ground1 : PALETTE.ground2;
         const plane = createPlane(TILE, TILE, col, [wx, FLOOR_Y, wz]);
         rotateMesh(plane, -Math.PI / 2, 0, 0);
         tilePlanes.push({ mesh: plane, r, c, wx });
      }
   }
}

function buildPlayer() {
   const p = player;
   const bx = p.x, by = p.y, bz = p.z;
   const m = {};
   m.body = createCube(1.2, 1.56, 0.96, PALETTE.playerBody);
   m.head = createSphere(0.6, PALETTE.playerHead);
   m.hair = createCube(0.77, 0.28, 0.77, PALETTE.hair);
   m.jetpack = createCube(0.96, 1.2, 0.4, PALETTE.jetpack);
   m.gun = createCube(0.3, 0.3, 1.75, PALETTE.gun);
   m.armL = createCube(0.28, 0.72, 0.28, PALETTE.playerBody);
   m.armR = createCube(0.28, 0.72, 0.28, PALETTE.playerBody);
   m.legL = createCube(0.32, 0.8, 0.32, PALETTE.playerBody);
   m.legR = createCube(0.32, 0.8, 0.32, PALETTE.playerBody);
   m.flameL = createCube(0.3, 0.3, 0.3, PALETTE.flame);
   m.flameR = createCube(0.3, 0.3, 0.3, PALETTE.flame);
   p.meshes = m;
   placePlayer();
}

function placePlayer() {
   const p = player;
   const bx = p.x, by = p.y, bz = p.z;
   const m = p.meshes;
   setPosition(m.body, bx, by, bz);
   setPosition(m.head, bx, by + 1.2, bz);
   setPosition(m.hair, bx, by + 1.5, bz + 0.1);
   setPosition(m.jetpack, bx, by + 0.2, bz + 0.6);
   setPosition(m.gun, bx + 0.8, by, bz - 1.5);
   setPosition(m.armL, bx - 0.8, by + 0.2, bz);
   setPosition(m.armR, bx + 0.8, by + 0.2, bz);
   setPosition(m.legL, bx - 0.4, by - 1.0, bz);
   setPosition(m.legR, bx + 0.4, by - 1.0, bz);
   const flameBob = 0.7 + Math.sin(time * 18) * 0.25;
   setScale(m.flameL, 1, flameBob, 1);
   setScale(m.flameR, 1, flameBob, 1);
   setPosition(m.flameL, bx - 0.3, by - 0.6 - flameBob * 0.15, bz + 0.6);
   setPosition(m.flameR, bx + 0.3, by - 0.6 - flameBob * 0.15, bz + 0.6);
}

function setPlayerVisible(v) {
   for (const k in player.meshes) setMeshVisible(player.meshes[k], v);
}

function setSceneVisible(v) {
   for (const t of tilePlanes) setMeshVisible(t.mesh, v);
   for (const s of sceneryItems) {
      setMeshVisible(s.mesh, v);
      if (s.mesh2) setMeshVisible(s.mesh2, v);
   }
   if (sunMesh) setMeshVisible(sunMesh, v);
   if (bulletMesh) setMeshVisible(bulletMesh, v);
   if (enemyMesh) setMeshVisible(enemyMesh, v);
}

function spawnScenery(initial) {
   if (sceneryItems.length >= MAX_SCENERY) return;
   const isLeft = Math.random() > 0.5;
   const x = (isLeft ? -1 : 1) * (15 + Math.random() * 25);
   const z = initial ? (10 - Math.random() * 120) : -120;
   const isPillar = Math.random() > 0.5;
   if (isPillar) {
      const h = 6 + Math.random() * 8;
      const m = createCube(2, h, 2, PALETTE.pillar);
      setMeshEmissive(m, PALETTE.pillar, 0.15);
      const oy = FLOOR_Y + h / 2;
      setPosition(m, x, oy, z);
      sceneryItems.push({ mesh: m, x, z, type: 'pillar', oy });
   } else {
      const h = 3 + Math.random() * 5;
      const trunk = createCube(1, h, 1, PALETTE.treeTrunk);
      const trunkY = FLOOR_Y + h / 2;
      setPosition(trunk, x, trunkY, z);
      const top = createSphere(2.5 + Math.random(), PALETTE.treeLeaves);
      setMeshEmissive(top, PALETTE.treeLeaves, 0.18);
      const topY = FLOOR_Y + h + 1;
      setPosition(top, x, topY, z);
      sceneryItems.push({ mesh: trunk, mesh2: top, x, z, oy: trunkY, topOy: topY, type: 'tree' });
   }
}

function spawnEnemy() {
   if (enemies.length >= MAX_ENEMIES) return;
   const fast = Math.random() < 0.3;
   enemies.push({
      x: (Math.random() - 0.5) * 36,
      y: 3 + Math.random() * 10,
      z: -120,
      speed: fast ? 56 : 32 + Math.random() * 14,
      seed: Math.random() * Math.PI * 2,
      fast,
      slot: enemies.length,
   });
}

function init_meshes() {
   buildFloor();
   buildPlayer();

   bulletMesh = createInstancedMesh('cube', MAX_BULLETS);
   setMeshEmissive(bulletMesh, PALETTE.bullet, 0.8);
   const hb = new Array(MAX_BULLETS * 16).fill(0);
   for (let i = 0; i < MAX_BULLETS; i++) {
      hb[i*16+15] = 1;
      setInstanceColor(bulletMesh, i, PALETTE.bullet);
   }
   setInstanceTransforms(bulletMesh, 0, hb);

   enemyMesh = createInstancedMesh('cube', MAX_ENEMIES);
   setMeshEmissive(enemyMesh, PALETTE.enemy, 0.4);
   const he = new Array(MAX_ENEMIES * 16).fill(0);
   for (let i = 0; i < MAX_ENEMIES; i++) he[i*16+15] = 1;
   setInstanceTransforms(enemyMesh, 0, he);

   sunMesh = createSphere(14, PALETTE.sun);
   setMeshEmissive(sunMesh, PALETTE.sun, 1.0);
   setPosition(sunMesh, -8, 16, -120);

   for (let i = 0; i < MAX_SCENERY; i++) spawnScenery(true);
}

function destroyAll() {
   for (const t of tilePlanes) destroyMesh(t.mesh);
   tilePlanes = [];
   if (bulletMesh) { destroyMesh(bulletMesh); bulletMesh = null; }
   if (enemyMesh)  { destroyMesh(enemyMesh);  enemyMesh = null; }
   if (sunMesh)    { destroyMesh(sunMesh);    sunMesh = null; }
   for (const k in player.meshes) destroyMesh(player.meshes[k]);
   player.meshes = {};
   for (const s of sceneryItems) {
      destroyMesh(s.mesh);
      if (s.mesh2) destroyMesh(s.mesh2);
   }
   sceneryItems = [];
   bullets = [];
   enemies = [];
}

function resetRun() {
   player.x = 0; player.y = 0;
   scrollOff = 0;
   score = 0;
   lives = 3;
   wave = 1;
   cooldown = 0;
   spawnT = 0;
   time = 0;
   shakeT = 0;
   bullets = [];
   enemies = [];
   placePlayer();
}

export function init() {
   destroyAll();
   state = 'start';
   startT = 0;
   best = best || 0;

   setCameraPosition(0, 5, 12);
   setCameraTarget(0, 3, -50);
   setCameraFOV(70);
   setAmbientLight(rgba8(255, 255, 255, 255), 0.78);
   setLightDirection(-0.5, -1, -0.5);
   setLightColor(rgba8(255, 240, 221, 255));
   applyStartVisuals();

   init_meshes();
   setPlayerVisible(false);
   setSceneVisible(false);
}

function uploadInstances() {
   if (bulletMesh) {
      const N = MAX_BULLETS;
      const data = new Array(N * 16).fill(0);
      for (let i = 0; i < N; i++) data[i*16+15] = 1;
      for (const b of bullets) {
         writeMat4(data, b.slot * 16, 0.32, 0.32, 1.4, b.x, b.y, b.z);
      }
      setInstanceTransforms(bulletMesh, 0, data);
   }
   if (enemyMesh) {
      const N = MAX_ENEMIES;
      const data = new Array(N * 16).fill(0);
      for (let i = 0; i < N; i++) data[i*16+15] = 1;
      for (const e of enemies) {
         const s = e.fast ? 1.0 : 1.25;
         writeMat4(data, e.slot * 16, s, s, s, e.x, e.y, e.z);
         setInstanceColor(enemyMesh, e.slot, e.fast ? PALETTE.enemyFast : PALETTE.enemy);
      }
      setInstanceTransforms(enemyMesh, 0, data);
   }
   if (tilePlanes.length) {
      const totalLength = TILE_ROWS * TILE;
      const off = scrollOff % totalLength;
      for (const t of tilePlanes) {
         let wz = TILE_START_Z - t.r * TILE - TILE / 2 + off;
         if (wz > TILE_START_Z) wz -= totalLength;
         setPosition(t.mesh, t.wx, FLOOR_Y, wz);
         const phase = Math.floor((t.r * TILE - scrollOff) / TILE) + t.c;
         setMeshColor(t.mesh, (phase & 1) ? PALETTE.ground2 : PALETTE.ground1);
      }
   }
}

function updatePlay(dt) {
   if (btn('left'))  player.x -= PLAYER_SPEED * dt;
   if (btn('right')) player.x += PLAYER_SPEED * dt;
   if (btn('up'))    player.y += PLAYER_SPEED * dt;
   if (btn('down'))  player.y -= PLAYER_SPEED * dt;
   if (player.x < -PLAYER_X_BOUND) player.x = -PLAYER_X_BOUND;
   if (player.x >  PLAYER_X_BOUND) player.x =  PLAYER_X_BOUND;
   if (player.y < PLAYER_Y_MIN) player.y = PLAYER_Y_MIN;
   if (player.y > PLAYER_Y_MAX) player.y = PLAYER_Y_MAX;

   cooldown -= dt;
   if (btn('z') && cooldown <= 0) {
      if (bullets.length < MAX_BULLETS) {
         bullets.push({ x: player.x + 0.8, y: player.y, z: player.z - 2, slot: bullets.length, life: BULLET_LIFE });
         cooldown = FIRE_COOLDOWN;
      }
   }

   scrollOff += SCROLL_SPEED * dt;

   spawnT += dt;
   if (spawnT >= SPAWN_INTERVAL) {
      spawnT = 0;
      spawnEnemy();
   }

   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.z -= BULLET_SPEED * dt;
      b.life -= dt;
      if (b.life <= 0 || b.z < -130) bullets.splice(i, 1);
   }

   for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.z += e.speed * dt;
      e.x += Math.sin(time * 1.8 + e.seed) * 5 * dt;
      e.y += Math.cos(time * 2.1 + e.seed) * 2 * dt;
      if (e.z > 8) {
         enemies.splice(i, 1);
         lives -= 1;
         shakeT = 0.4;
         if (lives <= 0) {
            state = 'over';
            if (score > best) best = score;
         }
         continue;
      }
      for (let j = bullets.length - 1; j >= 0; j--) {
         const b = bullets[j];
         const dx = b.x - e.x, dy = b.y - e.y, dz = b.z - e.z;
         if (dx*dx + dy*dy + dz*dz < ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS) {
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            score += e.fast ? 200 : 100;
            break;
         }
      }
   }
   for (let i = 0; i < bullets.length; i++) bullets[i].slot = i;
   for (let i = 0; i < enemies.length; i++) enemies[i].slot = i;

   for (let i = sceneryItems.length - 1; i >= 0; i--) {
      const s = sceneryItems[i];
      s.z += SCROLL_SPEED * dt;
      if (s.z > 20) {
         destroyMesh(s.mesh);
         if (s.mesh2) destroyMesh(s.mesh2);
         sceneryItems.splice(i, 1);
         spawnScenery(false);
         continue;
      }
      setPosition(s.mesh, s.x, s.oy, s.z);
      if (s.mesh2) setPosition(s.mesh2, s.x, s.topOy, s.z);
   }
}

export function update(dt) {
   time += dt;
   if (state === 'start') {
      startT += dt;
      if (btnp('z') || btnp('x')) { state = 'playing'; applyGameplayVisuals(); setSceneVisible(true); setPlayerVisible(true); resetRun(); }
      return;
   }
   if (state === 'over') {
      if (btnp('z') || btnp('x')) { state = 'playing'; applyGameplayVisuals(); resetRun(); }
      return;
   }

   updatePlay(dt);

   const shake = shakeT > 0 ? Math.sin(time * 50) * shakeT * 0.6 : 0;
   shakeT = Math.max(0, shakeT - dt);
   const camFollow = 0.05;
   setCameraPosition(player.x * camFollow + shake, 5 + player.y * camFollow, 12);
   setCameraTarget(player.x * camFollow, 3 + player.y * camFollow, -50);
   placePlayer();
   uploadInstances();
}

function drawHud() {
   // Web-parity HUD: yellow SCORE + cyan WAVE upper-left, lives squares right
   // of WAVE row, health bar upper-right with red bg + green fill + border.
   printOutlineTight('SCORE ' + score, 20, 16, rgba8(255, 210, 60, 255), rgba8(0, 0, 0, 220));
   printOutlineTight('WAVE ' + wave, 20, 36, rgba8(0, 240, 255, 255), rgba8(0, 0, 0, 220));
   for (let i = 0; i < lives; i++) {
      rectfill(170 + i * 18, 22, 12, 12, rgba8(255, 50, 50, 255));
   }
   const health = 100;
   rectfill(420, 16, 200, 20, rgba8(50, 0, 0, 200));
   const hpw = Math.max(0, (health / 100) * 200) | 0;
   rectfill(420, 16, hpw, 20, hpw > 80 ? rgba8(80, 220, 120, 255) : rgba8(255, 50, 60, 255));
   rect(420, 16, 200, 20, rgba8(220, 230, 255, 240));
}

function drawStartScreen() {
   rectfill(0, 0, 640, 360, rgba8(8, 0, 28, 255));
   drawGradient(0, 0, 640, 360, rgba8(128, 88, 200, 255), rgba8(42, 18, 90, 255), 'v');
   drawRadialGradient(320, 105, 230, rgba8(225, 95, 255, 76), rgba8(0, 0, 0, 0));
   drawRadialGradient(320, 440, 285, rgba8(120, 16, 190, 88), rgba8(0, 0, 0, 0));
   drawScanlines(0.08, 2);
   drawNoise(0, 0, 640, 360, 0.02, rgba8(238, 225, 255, 180));

   const sp = Math.sin(startT * 2) * 0.5 + 0.5;
   drawStarburst(30, 30, 18, 7, 6, rgba8(255, 210, 65, Math.floor(sp * 210)), true);
   drawStarburst(610, 30, 18, 7, 6, rgba8(255, 210, 65, Math.floor(sp * 210)), true);
   drawStarburst(80, 66, 7, 3, 4, rgba8(245, 245, 210, 170), true);
   drawStarburst(432, 72, 5, 2, 4, rgba8(245, 245, 220, 150), true);
   drawWave(0, 185, 640, 6, 0.028, startT * 2.2, rgba8(180, 0, 255, 120), 2);
   drawWave(0, 190, 640, 4, 0.042, startT * 2.8 + 1.0, rgba8(255, 100, 0, 85), 2);

   const bob = Math.floor(Math.sin(startT * 1.8) * 7);
   printBold('SPACE', 282, 44 + bob, rgba8(255, 210, 60, 255));
   printBold('HARRIER', 270, 98 + bob, rgba8(255, 146, 48, 255));
   printBold('NOVA 64 EDITION', 226, 142, rgba8(155, 215, 255, 245));
   printTight('THE LEGENDARY RAIL SHOOTER RETURNS', 174, 164, rgba8(225, 190, 255, 225));

   rectfill(90, 200, 440, 92, rgba8(15, 5, 35, 215));
   rect(90, 200, 440, 92, rgba8(180, 60, 255, 255));
   rect(180, 246, 216, 46, rgba8(184, 245, 220, 245));
   rectfill(181, 247, 214, 44, rgba8(178, 238, 218, 230));
   printTight('Blast through waves of alien enemies', 190, 218, rgba8(235, 240, 255, 245));
   printTight('Dodge projectiles and collect power-ups', 184, 233, rgba8(235, 240, 255, 245));
   printTight('Retro N64 rail-shooter with 3D visuals', 178, 248, rgba8(235, 240, 255, 245));
   printTight('START MISSION', 256, 272, rgba8(115, 160, 160, 255));
   printTight('WASD / Arrows: Move   Space: Shoot', 188, 318, rgba8(200, 190, 255, 220));
   printFlash(226, 334, 'PRESS SPACE TO LAUNCH', rgba8(255, 210, 65, 255), -startT, 1.6);
}

export function draw() {
   cls(rgba8(2, 2, 14, 255));

   if (state === 'start') {
      drawStartScreen();
      return;
   }

   drawHud();

   if (state === 'over') {
      rectfill(180, 120, 460, 224, rgba8(8, 4, 18, 240));
      glowRect(180, 120, 460, 224, rgba8(255, 80, 160, 230), 6);
      printBold('GAME OVER', 248, 134, rgba8(255, 80, 160, 255));
      printTight('Final: ' + score, 268, 162, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best,  268, 176, rgba8(120, 200, 255, 255));
      printFlash(248, 200, 'Z to retry', rgba8(255, 220, 80, 255), -time, 1.6);
   }
}
