// Nova64 Game Cart: SPACE HARRIER NOVA 64 (RetroArch port)
// Faithful port of examples/space-harrier-3d for cross-platform parity work.
// Arrows move, Z fires, X starts / retries.

const PALETTE = {
   sky:        rgba8(170,  34, 255, 255),
   // Match web's exact ground colors (0x22cc55 / 0x118833) — earlier bumped
   // contrast caused a "stepped voxel" illusion; web's tighter contrast looks
   // flatter and more like a real checker floor.
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
   enemyShot:  rgba8(255,  60, 220, 255),
   explosion:  rgba8(255, 140,  40, 255),
};

const FLOOR_Y = -2;
const TILE = 5;
const TILE_COLS = 22;
const TILE_ROWS = 35;
const TILE_START_Z = 20;
// Push fog start out: with FOG_NEAR=30 the floor's per-tile fog distance
// shows as visible "stepped" bands across the near/mid floor. NEAR=70 keeps
// the close 12 rows of tiles clean and only fogs the far distance.
const FOG_NEAR = 70;
const FOG_FAR  = 160;
// Gameplay sky tuned to web parity capture: neutral dark gray rgb(69,76,79)
const SKY_TOP = rgba8(72, 80, 86, 255);
const SKY_BOTTOM = rgba8(48, 54, 62, 255);
// Start sky tuned to web parity: muted purple rgb(95,57,137)
const START_SKY_TOP = rgba8(106, 64, 152, 255);
const START_SKY_BOTTOM = rgba8(48, 24, 78, 255);
const PLAYER_SPEED = 45;
const PLAYER_X_BOUND = 22;
const PLAYER_Y_MIN = 0;
const PLAYER_Y_MAX = 18;
const PLAYER_MAX_HP = 100;
const PLAYER_HIT_DMG = 25;
const PLAYER_INVULN_TIME = 1.4;   // brief i-frames after taking a hit
const PLAYER_RESPAWN_INVULN = 3.0; // longer shield after losing a life
const GLITCH_FLASH_TIME = 0.18;
const BULLET_SPEED = 180;
const BULLET_LIFE = 2.0;
const FIRE_COOLDOWN = 0.12;
const ENEMY_SPEED = 32;
const ENEMY_BULLET_SPEED = 70;
const ENEMY_BULLET_LIFE = 3.0;
const PLAYER_HIT_X = 1.6;  // half-width of player hit box (matches web ~1.5)
const PLAYER_HIT_Y = 2.0;
const PLAYER_HIT_Z = 2.0;
const SCROLL_SPEED = 45;
const MAX_BULLETS = 24;
const MAX_ENEMIES = 16;
const MAX_ENEMY_BULLETS = 24;
const MAX_SCENERY = 40;
const MAX_PARTICLES = 64;
const SCORE_PER_SEC = 25;          // distance score (web parity)
const WAVE_CLEAR_HOLD = 2.0;
const KILL_STREAK_WINDOW = 2.0;

let tilePlanes = [];
let player = {
   x: 0, y: 2, z: -5,
   hp: PLAYER_MAX_HP,
   invuln: 0,    // remaining seconds of invulnerability
   meshes: {},
};
let bulletMesh = null;
let bullets = [];
// Enemies are now per-enemy mesh groups (core sphere + eye + wings) to match web
let enemies = [];
let enemyBullets = [];
let enemyBulletMesh = null;
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
let glitchT = 0;
let baseChromatic = 0.003;
let dmgPopups = [];   // floating "-25" texts: { x, y, life }
let hpFlash = 0;      // health-bar red flash timer (0..1)
// Wave / streak / particles
let waveEnemiesLeft = 0;
let waveClear = false;
let waveClearT = 0;
let killStreak = 0;
let streakT = 0;
let particles = [];   // explosion particles: { mesh, x, y, z, vx, vy, vz, life, maxLife }

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
   // Higher bloom (was 0.28, before that 0.38) so bright objects get a soft
   // atmospheric halo like the web cart — the web's bloom is what made the
   // scene feel 3D and cinematic instead of flat.
   nova64.post.setBloom(0.55);
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
   // Web cart shows a strong pink halo around the player from bloom.
   // 0.18 was too subtle to read at distance; 0.30 gives the bright halo
   // while still preserving body shading.
   setMeshEmissive(m.body, PALETTE.playerBody, 0.30);
   m.head = createSphere(0.6, PALETTE.playerHead);
   setMeshEmissive(m.head, PALETTE.playerHead, 0.18);
   m.hair = createCube(0.77, 0.28, 0.77, PALETTE.hair);
   m.jetpack = createCube(0.96, 1.2, 0.4, PALETTE.jetpack);
   // Bright gold halo around jetpack — matches web's golden glow around player
   setMeshEmissive(m.jetpack, rgba8(255, 200, 60, 255), 0.55);
   m.gun = createCube(0.3, 0.3, 1.75, PALETTE.gun);
   setMeshEmissive(m.gun, rgba8(255, 240, 180, 255), 0.35);
   m.armL = createCube(0.28, 0.72, 0.28, PALETTE.playerBody);
   m.armR = createCube(0.28, 0.72, 0.28, PALETTE.playerBody);
   m.legL = createCube(0.32, 0.8, 0.32, PALETTE.playerBody);
   m.legR = createCube(0.32, 0.8, 0.32, PALETTE.playerBody);
   m.flameL = createCube(0.3, 0.3, 0.3, PALETTE.flame);
   m.flameR = createCube(0.3, 0.3, 0.3, PALETTE.flame);
   // Flames stay strongly emissive — they're meant to glow, and the bloom
   // halo around them is what actually marks the player's position at distance.
   setMeshEmissive(m.flameL, PALETTE.flame, 1.0);
   setMeshEmissive(m.flameR, PALETTE.flame, 1.0);
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
   if (enemyBulletMesh) setMeshVisible(enemyBulletMesh, v);
   for (const e of enemies) {
      if (!e.meshes) continue;
      setMeshVisible(e.meshes.core, v);
      setMeshVisible(e.meshes.eye, v);
      setMeshVisible(e.meshes.wingL, v);
      setMeshVisible(e.meshes.wingR, v);
   }
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
      const h = 3 + Math.random() * 6;
      const trunk = createCube(1, h, 1, PALETTE.treeTrunk);
      const trunkY = FLOOR_Y + h / 2;
      setPosition(trunk, x, trunkY, z);
      const top = createSphere(3.0 + Math.random() * 0.8, PALETTE.treeLeaves);
      // Subtle emissive only — keep most of the sphere's diffuse gradient so
      // trees read as round, not flat green disks (web uses 0 emissive).
      setMeshEmissive(top, PALETTE.treeLeaves, 0.06);
      const topY = FLOOR_Y + h + 1.4;
      setPosition(top, x, topY, z);
      sceneryItems.push({ mesh: trunk, mesh2: top, x, z, oy: trunkY, topOy: topY, type: 'tree' });
   }
}

function spawnEnemy(forcedType) {
   if (enemies.length >= MAX_ENEMIES) return;
   // Pick a type — boss override > wave-based distribution
   let type = forcedType || 'normal';
   if (!forcedType) {
      const roll = Math.random();
      if (roll < 0.25) type = 'fast';
      else if (roll < 0.40 && wave >= 4) type = 'tank';
   }

   let color = PALETTE.enemy;
   let hp = 1;
   let speed = 32 + Math.random() * 14;
   let size = 1.6;
   if (type === 'fast') {
      color = PALETTE.enemyFast;
      hp = 1;
      speed = 56 + Math.random() * 20;
      size = 1.2;
   } else if (type === 'tank') {
      color = rgba8(255, 80, 30, 255);
      hp = 3;
      speed = 22 + Math.random() * 10;
      size = 2.2;
   } else if (type === 'boss') {
      color = rgba8(255, 30, 30, 255);
      hp = 20 + wave * 4;
      speed = 14;
      size = 3.6;
   }

   const x = (Math.random() - 0.5) * 36;
   const y = 3 + Math.random() * 10;
   const z = -120;

   // Per-enemy mesh group (core + eye + two wings) — matches web exactly
   const core = createSphere(size, color);
   // Subtle core emissive — keep sphere gradient, let bloom do the popping
   setMeshEmissive(core, color, 0.18);
   setPosition(core, x, y, z);

   const eye = createSphere(size * 0.42, PALETTE.enemyEye);
   // Eye keeps high emissive — it's meant to look like a glowing eye
   setMeshEmissive(eye, PALETTE.enemyEye, 1.0);
   setPosition(eye, x, y, z + size * 0.6);

   const wingL = createCube(size * 1.8, 0.18, size * 0.6, rgba8(85, 0, 170, 255));
   setMeshEmissive(wingL, rgba8(85, 0, 170, 255), 0.1);
   setPosition(wingL, x - size * 1.0, y, z);

   const wingR = createCube(size * 1.8, 0.18, size * 0.6, rgba8(85, 0, 170, 255));
   setMeshEmissive(wingR, rgba8(85, 0, 170, 255), 0.1);
   setPosition(wingR, x + size * 1.0, y, z);

   enemies.push({
      x, y, z,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 6,
      speed,
      hp,
      type,
      size,
      seed: Math.random() * Math.PI * 2,
      timer: 0,
      meshes: { core, eye, wingL, wingR },
   });
}

function destroyEnemyMeshes(e) {
   if (!e || !e.meshes) return;
   destroyMesh(e.meshes.core);
   destroyMesh(e.meshes.eye);
   destroyMesh(e.meshes.wingL);
   destroyMesh(e.meshes.wingR);
   e.meshes = null;
}

function spawnEnemyBullet(ex, ey, ez) {
   if (enemyBullets.length >= MAX_ENEMY_BULLETS) return;
   const dx = player.x - ex, dy = player.y - ey, dz = player.z - ez;
   const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
   const sp = ENEMY_BULLET_SPEED;
   enemyBullets.push({
      x: ex, y: ey, z: ez,
      vx: (dx / len) * sp,
      vy: (dy / len) * sp,
      vz: (dz / len) * sp,
      life: ENEMY_BULLET_LIFE,
      slot: enemyBullets.length,
   });
}

function spawnExplosion(x, y, z, color, count) {
   count = count || 8;
   for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) break;
      const p = createCube(0.4 + Math.random() * 0.3, color);
      setMeshEmissive(p, color, 0.8);
      setPosition(p, x, y, z);
      const a1 = Math.random() * Math.PI * 2;
      const a2 = Math.random() * Math.PI * 2;
      const sp = 12 + Math.random() * 20;
      particles.push({
         mesh: p, x, y, z,
         vx: Math.cos(a1) * Math.sin(a2) * sp,
         vy: Math.sin(a1) * sp,
         vz: Math.cos(a1) * Math.cos(a2) * sp,
         life: 0.32 + Math.random() * 0.25,
         maxLife: 0.5,
      });
   }
}

function startWave(n) {
   wave = n;
   const isBossWave = wave > 0 && (wave % 3 === 0);
   waveEnemiesLeft = isBossWave ? 1 : (4 + n * 2);
   spawnT = 0.5;
   waveClear = false;
}

function triggerHitGlitch() {
   glitchT = GLITCH_FLASH_TIME;
   // Much stronger chromatic + slight bloom punch on hit — was 0.022 (subtle)
   if (nova64.post) {
      if (nova64.post.setChromatic) nova64.post.setChromatic(0.045);
      if (nova64.post.setBloom)     nova64.post.setBloom(0.62);
   }
}

function clearGlitch() {
   glitchT = 0;
   if (nova64.post) {
      if (nova64.post.setChromatic) nova64.post.setChromatic(baseChromatic);
      if (nova64.post.setBloom)     nova64.post.setBloom(0.38);
   }
}

function spawnDamagePopup(amount) {
   // Floating "-25" red text rising from the HUD area
   dmgPopups.push({ amount, x: 320, y: 200, life: 1.0 });
   hpFlash = 1.0;
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

   // Enemy bullets — magenta spheres (instanced). Enemies themselves are
   // per-enemy mesh groups so the wings/eyes match the web cart visually.
   enemyBulletMesh = createInstancedMesh('cube', MAX_ENEMY_BULLETS);
   setMeshEmissive(enemyBulletMesh, PALETTE.enemyShot, 1.6);
   const heb = new Array(MAX_ENEMY_BULLETS * 16).fill(0);
   for (let i = 0; i < MAX_ENEMY_BULLETS; i++) {
      heb[i*16+15] = 1;
      setInstanceColor(enemyBulletMesh, i, PALETTE.enemyShot);
   }
   setInstanceTransforms(enemyBulletMesh, 0, heb);

   sunMesh = createSphere(14, PALETTE.sun);
   setMeshEmissive(sunMesh, PALETTE.sun, 1.0);
   setPosition(sunMesh, -8, 16, -120);

   for (let i = 0; i < MAX_SCENERY; i++) spawnScenery(true);
}

function destroyAll() {
   for (const t of tilePlanes) destroyMesh(t.mesh);
   tilePlanes = [];
   if (bulletMesh)      { destroyMesh(bulletMesh);      bulletMesh = null; }
   if (enemyBulletMesh) { destroyMesh(enemyBulletMesh); enemyBulletMesh = null; }
   if (sunMesh)         { destroyMesh(sunMesh);         sunMesh = null; }
   for (const k in player.meshes) destroyMesh(player.meshes[k]);
   player.meshes = {};
   for (const e of enemies) destroyEnemyMeshes(e);
   enemies = [];
   for (const p of particles) destroyMesh(p.mesh);
   particles = [];
   for (const s of sceneryItems) {
      destroyMesh(s.mesh);
      if (s.mesh2) destroyMesh(s.mesh2);
   }
   sceneryItems = [];
   bullets = [];
   enemyBullets = [];
}

function resetRun() {
   player.x = 0; player.y = 2;
   player.hp = PLAYER_MAX_HP;
   player.invuln = PLAYER_RESPAWN_INVULN;
   scrollOff = 0;
   score = 0;
   lives = 3;
   cooldown = 0;
   spawnT = 0;
   time = 0;
   shakeT = 0;
   hpFlash = 0;
   dmgPopups = [];
   bullets = [];
   for (const e of enemies) destroyEnemyMeshes(e);
   enemies = [];
   enemyBullets = [];
   for (const p of particles) destroyMesh(p.mesh);
   particles = [];
   killStreak = 0;
   streakT = 0;
   waveClear = false;
   waveClearT = 0;
   startWave(1);
   clearGlitch();
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
   // Web parity ambient: web uses 0.62 with Babylon. Our cube shader range
   // is compressed (0.58..1.0 surface_light), so we settle around 0.42:
   // enough lift to match web's average brightness without clipping the
   // diffuse gradient on round meshes (trees, player head, enemy cores).
   setAmbientLight(rgba8(255, 250, 232, 255), 0.42);
   // Web's exact direction — keeps floor tile lighting UNIFORM across the
   // checker (an angled light gives adjacent tiles different diffuse values
   // which reads as a "stepped/voxel terrain" instead of flat floor).
   setLightDirection(-0.5, -1, -0.5);
   setLightColor(rgba8(255, 232, 200, 255));
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
   // Enemy mesh groups (core/eye/wings) — position each part relative to enemy
   for (const e of enemies) {
      if (!e.meshes) continue;
      const bob = Math.sin(e.timer * 4 + e.seed) * 1.6;
      setPosition(e.meshes.core,  e.x,                  e.y + bob,        e.z);
      setPosition(e.meshes.eye,   e.x,                  e.y + bob,        e.z + e.size * 0.6);
      setPosition(e.meshes.wingL, e.x - e.size * 1.0,   e.y + bob,        e.z);
      setPosition(e.meshes.wingR, e.x + e.size * 1.0,   e.y + bob,        e.z);
   }
   if (enemyBulletMesh) {
      const N = MAX_ENEMY_BULLETS;
      const data = new Array(N * 16).fill(0);
      for (let i = 0; i < N; i++) data[i*16+15] = 1;
      for (let i = 0; i < enemyBullets.length; i++) {
         const b = enemyBullets[i];
         writeMat4(data, i * 16, 0.6, 0.6, 0.6, b.x, b.y, b.z);
      }
      setInstanceTransforms(enemyBulletMesh, 0, data);
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

function damagePlayer(amount) {
   if (player.invuln > 0) return;
   player.hp -= amount;
   player.invuln = PLAYER_INVULN_TIME;
   shakeT = Math.max(shakeT, 0.6);   // bumped 0.35 -> 0.6 for clearer feedback
   triggerHitGlitch();
   spawnDamagePopup(amount);
   if (player.hp <= 0) {
      // Lose a life; respawn with shield + full hp unless game over.
      spawnExplosion(player.x, player.y, player.z, PALETTE.playerBody, 14);
      lives -= 1;
      killStreak = 0;
      if (lives <= 0) {
         state = 'over';
         if (score > best) best = score | 0;
         setPlayerVisible(false);
      } else {
         player.hp = PLAYER_MAX_HP;
         player.x = 0;
         player.y = 4;
         player.invuln = PLAYER_RESPAWN_INVULN;
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

   if (player.invuln > 0) {
      player.invuln = Math.max(0, player.invuln - dt);
      // Blink player parts while invulnerable
      const visible = Math.floor(time * 18) % 2 === 0;
      setMeshVisible(player.meshes.body, visible);
      setMeshVisible(player.meshes.head, visible);
   } else {
      // Make sure body/head are visible after invuln ends
      if (player.meshes.body) setMeshVisible(player.meshes.body, true);
      if (player.meshes.head) setMeshVisible(player.meshes.head, true);
   }

   if (glitchT > 0) {
      glitchT -= dt;
      if (glitchT <= 0) clearGlitch();
   }
   if (hpFlash > 0) hpFlash = Math.max(0, hpFlash - dt * 1.6);
   for (let i = dmgPopups.length - 1; i >= 0; i--) {
      const p = dmgPopups[i];
      p.life -= dt * 1.2;
      p.y -= dt * 40;
      if (p.life <= 0) dmgPopups.splice(i, 1);
   }

   cooldown -= dt;
   if (btn('z') && cooldown <= 0) {
      if (bullets.length < MAX_BULLETS) {
         bullets.push({ x: player.x + 0.8, y: player.y, z: player.z - 2, slot: bullets.length, life: BULLET_LIFE });
         cooldown = FIRE_COOLDOWN;
      }
   }

   scrollOff += SCROLL_SPEED * dt;
   // Distance-based score (web parity: game.score += dt * 25)
   score += dt * SCORE_PER_SEC;

   // Wave management
   if (waveClear) {
      waveClearT -= dt;
      if (waveClearT <= 0) startWave(wave + 1);
   } else if (waveEnemiesLeft <= 0 && enemies.length === 0) {
      waveClear = true;
      waveClearT = WAVE_CLEAR_HOLD;
      score += wave * 200;   // wave-clear bonus, matches web
   } else {
      // Spawn at a wave-scaled rate
      spawnT += dt;
      const interval = Math.max(0.4, 1.4 - wave * 0.08);
      if (spawnT >= interval && waveEnemiesLeft > 0) {
         spawnT = 0;
         waveEnemiesLeft--;
         // Boss waves spawn one boss; otherwise normal/fast/tank mix
         const isBossWave = wave > 0 && (wave % 3 === 0);
         if (isBossWave && waveEnemiesLeft === 0) spawnEnemy('boss');
         else spawnEnemy();
      }
   }

   // Kill-streak timer
   if (streakT > 0) {
      streakT -= dt;
      if (streakT <= 0) killStreak = 0;
   }

   // Player bullets
   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.z -= BULLET_SPEED * dt;
      b.life -= dt;
      if (b.life <= 0 || b.z < -130) bullets.splice(i, 1);
   }

   // Enemy update + collision (proper AABB against player, not just z>plane)
   for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.timer += dt;
      // Per-frame motion (forward + drift)
      e.z += e.speed * dt;
      e.x += e.vx * dt + Math.sin(time * 1.8 + e.seed) * 4 * dt;
      e.y += e.vy * dt + Math.cos(time * 2.1 + e.seed) * 2 * dt;
      if (e.x < -28 || e.x > 28) e.vx *= -1;
      if (e.y < 2 || e.y > 16) e.vy *= -1;

      // Occasionally fire at the player once close enough
      if (e.timer > 1.0 && e.z > -90 && e.z < -8) {
         const fireChance = e.type === 'boss' ? 0.04
                          : e.type === 'tank' ? 0.012
                          : 0.006;
         if (Math.random() < fireChance) spawnEnemyBullet(e.x, e.y, e.z);
         // Bosses also throw a spread shot occasionally
         if (e.type === 'boss' && Math.random() < 0.012) {
            for (let a = -2; a <= 2; a++) spawnEnemyBullet(e.x + a * 3, e.y, e.z);
         }
      }

      // If enemy crosses near the player plane, check AABB collision
      if (e.z > -8 && e.z < 6) {
         const dx = Math.abs(e.x - player.x);
         const dy = Math.abs(e.y - player.y);
         const dz = Math.abs(e.z - player.z);
         if (dx < (PLAYER_HIT_X + e.size) && dy < (PLAYER_HIT_Y + e.size) && dz < (PLAYER_HIT_Z + e.size)) {
            damagePlayer(PLAYER_HIT_DMG);
            destroyEnemyMeshes(e);
            enemies.splice(i, 1);
            continue;
         }
      }

      // Off-screen behind camera — flew past
      if (e.z > 10) {
         destroyEnemyMeshes(e);
         enemies.splice(i, 1);
         continue;
      }

      // Bullet vs enemy collision
      for (let j = bullets.length - 1; j >= 0; j--) {
         const b = bullets[j];
         const dx = b.x - e.x, dy = b.y - e.y, dz = b.z - e.z;
         const r = e.size + 0.4;
         if (dx*dx + dy*dy + dz*dz < r * r) {
            e.hp -= 1;
            bullets.splice(j, 1);
            if (e.hp <= 0) {
               const pts = e.type === 'boss' ? 3000
                         : e.type === 'tank' ? 500
                         : e.type === 'fast' ? 250
                         : 150;
               score += pts;
               killStreak += 1;
               streakT = KILL_STREAK_WINDOW;
               if (killStreak >= 3) score += killStreak * 50;
               spawnExplosion(e.x, e.y, e.z, e.type === 'boss' ? rgba8(255, 80, 30, 255) : PALETTE.explosion || rgba8(255, 140, 40, 255), e.type === 'boss' ? 18 : 10);
               destroyEnemyMeshes(e);
               enemies.splice(i, 1);
            }
            break;
         }
      }
   }

   // Particles (explosion shrapnel)
   for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 28 * dt;        // gravity
      p.life -= dt;
      const a = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0 || a < 0.05) {
         destroyMesh(p.mesh);
         particles.splice(i, 1);
         continue;
      }
      setPosition(p.mesh, p.x, p.y, p.z);
      setScale(p.mesh, a, a, a);
   }

   // Enemy bullets
   for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.life -= dt;
      const dx = Math.abs(b.x - player.x);
      const dy = Math.abs(b.y - player.y);
      const dz = Math.abs(b.z - player.z);
      if (dx < PLAYER_HIT_X && dy < PLAYER_HIT_Y && dz < PLAYER_HIT_Z) {
         damagePlayer(PLAYER_HIT_DMG);
         enemyBullets.splice(i, 1);
         continue;
      }
      if (b.life <= 0 || b.z > 14 || b.z < -130) enemyBullets.splice(i, 1);
   }

   for (let i = 0; i < bullets.length; i++) bullets[i].slot = i;

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
   // Web-parity HUD: BIG yellow SCORE + cyan WAVE upper-left at 2x scale,
   // red lives squares row, health bar upper-right (red bg + green fill).
   print('SCORE: ' + (score | 0), 20, 14, rgba8(255, 200, 0, 255), 2);
   print('WAVE ' + wave, 20, 36, rgba8(0, 240, 255, 255), 2);
   for (let i = 0; i < lives; i++) {
      rectfill(170 + i * 18, 22, 12, 12, rgba8(255, 80, 80, 255));
   }
   const hp = Math.max(0, player.hp);
   // Health bar flashes red briefly when hit
   const bgRed = hpFlash > 0 ? (50 + (hpFlash * 180)) | 0 : 50;
   rectfill(420, 16, 200, 20, rgba8(bgRed, 0, 0, 220));
   const hpw = ((hp / PLAYER_MAX_HP) * 200) | 0;
   const hpFill = hp > 60 ? rgba8(80, 220, 120, 255)
                : hp > 25 ? rgba8(255, 200, 60, 255)
                          : rgba8(255, 60, 60, 255);
   rectfill(420, 16, hpw, 20, hpFill);
   // false = outline only — without this, rect() defaults to filled and
   // paints WHITE over the green fill (user-reported bug: 'bar is white,
   // never changes'). With outline, the actual green hpFill shows through.
   rect(420, 16, 200, 20, rgba8(220, 230, 255, 240), false);
   // HP number to the right of the bar so the change is unmistakable
   printTight('HP ' + hp, 626, 18, rgba8(255, 240, 240, 240), 'right');
   // Invuln/shield indicator (only when meaningfully active)
   if (player.invuln > 0.1) {
      printTight('SHIELD ' + player.invuln.toFixed(1) + 's', 420, 40, rgba8(0, 220, 255, 230));
   }
   // Floating damage popups
   for (const p of dmgPopups) {
      const a = Math.max(0, Math.min(1, p.life)) * 255 | 0;
      printScaled('-' + p.amount, p.x, p.y, rgba8(255, 60, 60, a), 2);
   }

   // Kill streak banner (web shows after 3+ kills in 2s window)
   if (killStreak >= 3) {
      printScaled(killStreak + 'x STREAK!', 230, 70, rgba8(255, 220, 60, 255), 2);
   }

   // Wave clear banner
   if (waveClear) {
      const wy = 140;
      rectfill(140, wy - 6, 360, 56, rgba8(0, 30, 0, 220));
      rect(140, wy - 6, 360, 56, rgba8(80, 255, 120, 255), false);
      printScaled('WAVE ' + wave + ' CLEAR!', 240, wy, rgba8(80, 255, 120, 255), 2);
      printTight('+' + (wave * 200) + ' BONUS', 274, wy + 26, rgba8(255, 220, 100, 255));
   }
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

   // Title (web uses drawGlowTextCentered with bob)
   const bob = Math.floor(Math.sin(startT * 1.8) * 7);
   drawGlowTextCentered('SPACE', 320, 44 + bob, rgba8(255, 200, 0, 255), rgba8(180, 80, 0, 200), 2);
   drawGlowTextCentered('HARRIER', 320, 92 + bob, rgba8(255, 110, 30, 255), rgba8(170, 40, 0, 200), 2);
   printTight('NOVA 64 EDITION', 270, 144, rgba8(140, 210, 255, 245));
   printTight('THE LEGENDARY RAIL SHOOTER RETURNS', 200, 162, rgba8(220, 180, 255, 225));

   // Narrower centered info panel (web uses ~440 wide, centered, magenta border with green glow)
   rectfill(140, 196, 360, 78, rgba8(20, 8, 42, 220));
   rect(140, 196, 360, 78, rgba8(190, 70, 255, 255), false);
   printTight('Blast through waves of alien enemies', 188, 208, rgba8(225, 235, 255, 245));
   printTight('Dodge projectiles and collect power-ups', 180, 224, rgba8(225, 235, 255, 245));
   printTight('Retro N64 rail-shooter with 3D visuals', 184, 240, rgba8(225, 235, 255, 245));
   // Start button
   rectfill(228, 254, 184, 16, rgba8(40, 200, 110, 235));
   rect(228, 254, 184, 16, rgba8(120, 245, 180, 255), false);
   printTight('START MISSION', 268, 258, rgba8(8, 32, 16, 255));

   printTight('WASD / Arrows: Move   Space: Shoot', 188, 308, rgba8(200, 190, 255, 220));
   printFlash(196, 326, 'PRESS SPACE TO LAUNCH', rgba8(255, 180, 40, 255), -startT, 1.6);
}

export function draw() {
   cls(rgba8(2, 2, 14, 255));

   if (state === 'start') {
      drawStartScreen();
      return;
   }

   drawHud();

   if (state === 'over') {
      // Web parity: full-screen red translucent overlay + centered text.
      // Previously the panel started at x=180 with width 460 -> overflowed
      // the 640 screen by 0px on right and was visually off-center.
      rectfill(0, 0, 640, 360, rgba8(100, 0, 0, 150));
      // GAME OVER huge centered with black shadow (matches web drawTextShadow)
      const goText = 'GAME OVER';
      const goScale = 3;
      const goW = goText.length * 4 * goScale;   // ~108
      const goX = 320 - (goW >> 1);
      printScaled(goText, goX + 3, 110 + 3, rgba8(0, 0, 0, 255), goScale);
      printScaled(goText, goX,     110,     rgba8(255, 80, 160, 255), goScale);
      // Score centered
      const sf = 'FINAL SCORE: ' + (score | 0);
      const sfW = sf.length * 4 * 2;
      printScaled(sf, 320 - (sfW >> 1), 180, rgba8(255, 220, 80, 255), 2);
      // Best centered (floor — score accumulates as float from distance)
      const bs = 'BEST: ' + (best | 0);
      const bsW = bs.length * 4 * 2;
      printScaled(bs, 320 - (bsW >> 1), 210, rgba8(120, 200, 255, 255), 2);
      // Retry hint flashing centered
      const rt = 'PRESS Z TO RETRY';
      const rtW = rt.length * 4 * 2;
      printFlash(320 - (rtW >> 1), 270, rt, rgba8(255, 220, 80, 255), -time, 1.6);
   }
}
