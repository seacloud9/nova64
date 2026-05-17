// Nova64 Game Cart: STAR RIFT
// A 3D space shooter. Arrow keys to move, Z to shoot.
//
// Showcases: createCone, createSphere, createTorus, createInstancedMesh,
//             setMeshPos, getMeshPos, setMeshRot, setRotation, setMeshVisible,
//             project3DToScreen, isInFrustum, setInstanceColor, setInstanceTransform

// ──────────────────────────────────────────────────────────────────────────────
// Config
const FIELD_W = 12;
const FIELD_H = 7;
const BULLET_SPEED = 18;
const ENEMY_SPEED_BASE = 1.2;
const ENEMY_COLS = 7;
const ENEMY_ROWS = 3;
const MAX_BULLETS = 20;
const SHOOT_COOLDOWN = 0.18;
const STARS = 80;

// ──────────────────────────────────────────────────────────────────────────────
// State
let player, playerX, playerY, playerSpeed;
let bullets = [];
let enemies = [];
let enemyDir = 1, enemyDropTimer = 0, enemySpeed;
let score = 0, lives = 3, gameOver = false, win = false;
let shootTimer = 0;
let t = 0;
let starMesh, ringMesh;
let explosions = [];

// ──────────────────────────────────────────────────────────────────────────────
export function init() {
   setCamera([0, 4, 12], [0, 0, 0]);
   setLight([1, 2, 1]);

   // Player ship: cone pointing forward
   player = createCone(0.4, 0.9, rgba8(80, 200, 255, 255));
   playerX = 0; playerY = -2.5;
   playerSpeed = 6;
   setPosition(player, playerX, playerY, 0);
   setRotation(player, 0, 0, 0);

   // Background stars (instanced spheres)
   starMesh = createInstancedMesh('sphere', STARS);
   for (let i = 0; i < STARS; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 20;
      const z = -Math.random() * 25 - 2;
      const s = 0.04 + Math.random() * 0.06;
      const m = [s,0,0,0, 0,s,0,0, 0,0,s,0, x,y,z,1];
      setInstanceTransform(starMesh, i, m);
      const br = 160 + Math.floor(Math.random() * 95);
      setInstanceColor(starMesh, i, rgba8(br, br, Math.min(255, br + 40), 200));
   }

   // Decorative torus ring in the distance
   ringMesh = createTorus(3.5, 0.12, rgba8(60, 120, 220, 120));
   setPosition(ringMesh, 0, 0, -10);

   // Enemy grid
   enemySpeed = ENEMY_SPEED_BASE;
   spawnEnemies();

   score = 0; lives = 3; gameOver = false; win = false;
}

function spawnEnemies() {
   enemies = [];
   for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
         const x = (col - (ENEMY_COLS - 1) / 2) * 1.8;
         const y = 1.5 + row * 1.4;
         const colors = [rgba8(255, 80, 80, 255), rgba8(255, 160, 40, 255), rgba8(200, 60, 255, 255)];
         const mesh = createSphere(0.38, colors[row]);
         setPosition(mesh, x, y, 0);
         enemies.push({ mesh, x, y, alive: true, bobPhase: (col + row * 3) * 0.7 });
      }
   }
}

function spawnBullet(x, y) {
   if (bullets.length >= MAX_BULLETS) return;
   const m = createSphere(0.12, rgba8(120, 255, 200, 255));
   setPosition(m, x, y, 0);
   bullets.push({ mesh: m, x, y });
}

function spawnExplosion(x, y) {
   explosions.push({ x, y, age: 0, lifetime: 0.4 });
}

// ──────────────────────────────────────────────────────────────────────────────
export function update(dt) {
   if (gameOver || win) return;
   t += dt;
   shootTimer -= dt;

   // Player movement
   const speed = playerSpeed * dt;
   if (btn(BUTTON_LEFT)  && playerX > -FIELD_W / 2) playerX -= speed;
   if (btn(BUTTON_RIGHT) && playerX <  FIELD_W / 2) playerX += speed;
   if (btn(BUTTON_UP)    && playerY <  FIELD_H / 2 - 1) playerY += speed * 0.6;
   if (btn(BUTTON_DOWN)  && playerY > -FIELD_H / 2) playerY -= speed * 0.6;
   setPosition(player, playerX, playerY, 0);
   setRotation(player, Math.sin(t * 3) * 0.05, 0, -playerX * 0.05);

   // Shoot
   if (btnp(BUTTON_Z) && shootTimer <= 0) {
      spawnBullet(playerX, playerY + 0.5);
      shootTimer = SHOOT_COOLDOWN;
   }

   // Bullets
   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += BULLET_SPEED * dt;
      setPosition(b.mesh, b.x, b.y, 0);
      if (b.y > FIELD_H + 2) {
         destroyMesh(b.mesh);
         bullets.splice(i, 1);
      }
   }

   // Enemies move
   const alive = enemies.filter(e => e.alive);
   if (alive.length === 0) { win = true; return; }

   const leftmost  = alive.reduce((m, e) => Math.min(m, e.x), Infinity);
   const rightmost = alive.reduce((m, e) => Math.max(m, e.x), -Infinity);

   // Drop and reverse
   if ((rightmost > FIELD_W / 2 - 0.5 && enemyDir > 0) ||
       (leftmost  < -FIELD_W / 2 + 0.5 && enemyDir < 0)) {
      for (const e of alive) { e.y -= 0.6; }
      enemyDir *= -1;
      enemySpeed += 0.15;
   }

   for (const e of alive) {
      e.x += enemyDir * enemySpeed * dt;
      e.y += Math.sin(t * 1.8 + e.bobPhase) * 0.003;
      setPosition(e.mesh, e.x, e.y, 0);
      setRotation(e.mesh, 0, t * 1.2 + e.bobPhase, 0);

      // Enemy reached player row → game over
      if (e.y < playerY + 0.5) {
         lives--;
         destroyMesh(e.mesh);
         e.alive = false;
         if (lives <= 0) { gameOver = true; return; }
      }
   }

   // Collision: bullets vs enemies
   for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let hit = false;
      for (const e of enemies) {
         if (!e.alive) continue;
         const dx = b.x - e.x, dy = b.y - e.y;
         if (Math.sqrt(dx*dx + dy*dy) < 0.55) {
            spawnExplosion(e.x, e.y);
            destroyMesh(e.mesh);
            e.alive = false;
            destroyMesh(b.mesh);
            bullets.splice(bi, 1);
            score += 100;
            hit = true;
            break;
         }
      }
      if (hit) continue;
   }

   // Ring spin
   setRotation(ringMesh, 0, t * 0.3, t * 0.2);

   // Explosions
   explosions = explosions.filter(ex => { ex.age += dt; return ex.age < ex.lifetime; });
}

// ──────────────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(2, 3, 12, 255));

   if (gameOver) {
      printBold('GAME OVER', 220, 150, rgba8(255, 60, 60, 255));
      print('Score: ' + score, 260, 170, rgba8(200, 200, 255, 255));
      print('Press START to retry', 196, 190, rgba8(160, 160, 200, 180));
      return;
   }
   if (win) {
      printBold('YOU WIN!', 230, 150, rgba8(80, 255, 160, 255));
      print('Score: ' + score, 260, 170, rgba8(200, 200, 255, 255));
      return;
   }

   // Explosions (2D overlay via project3DToScreen)
   for (const ex of explosions) {
      const p = project3DToScreen(ex.x, ex.y, 0);
      if (p && p.visible) {
         const age = ex.age / ex.lifetime;
         const r = Math.floor(8 + (1 - age) * 20);
         for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2 + ex.age * 10;
            const er = r * age;
            pset(Math.floor(p.x + Math.cos(angle) * er),
                 Math.floor(p.y + Math.sin(angle) * er),
                 hslColor(Math.floor(age * 60), 0.9, 0.7, 255 - age * 200));
         }
      }
   }

   // HUD
   printBold('STAR RIFT', 4, 4, rgba8(80, 180, 255, 255));
   print('SCORE ' + score, 4, 16, rgba8(200, 220, 255, 220));
   print('LIVES', 560, 4, rgba8(200, 220, 255, 220));
   for (let i = 0; i < lives; i++) {
      print('♦', 560 + i * 14, 16, rgba8(80, 255, 200, 255));
   }
   const alive = enemies.filter(e => e.alive).length;
   print('ENEMIES ' + alive, 4, 26, rgba8(160, 200, 255, 180));
}
