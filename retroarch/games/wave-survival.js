// Nova64 game: Wave Survival Arena
// Use arrow keys or WASD to move, Z/Space to shoot.
// Survive waves of enemies with particle bursts on kill.

let t = 0;
let px = 320, py = 280;
let bullets = [];
let enemies = [];
let bursts = [];
let score = 0;
let mgr = 0;
let cam = 0;
let shootCooldown = 0;
let waveDelay = 0;
let paused = false;

const SPEED = 90;
const BULLET_SPEED = 220;
const ARENA_X = 40, ARENA_Y = 40, ARENA_W = 560, ARENA_H = 260;

function spawnEnemy(wave) {
   const side = Math.floor(rngRandom() * 4);
   let ex, ey;
   if (side === 0) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y; }
   else if (side === 1) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y + ARENA_H; }
   else if (side === 2) { ex = ARENA_X; ey = ARENA_Y + rngRandom() * ARENA_H; }
   else { ex = ARENA_X + ARENA_W; ey = ARENA_Y + rngRandom() * ARENA_H; }
   enemies.push({ x: ex, y: ey, hp: 1 + Math.floor(wave / 3), spd: 40 + wave * 5 });
}

export function init() {
   mgr = createWaveManager();
   cam = createCam2D(0, 0, 4.0);
   startWave(mgr, 4);
   for (let i = 0; i < 4; i++) spawnEnemy(1);
}

export function update(dt) {
   if (paused) return;
   t += dt;
   shootCooldown -= dt;

   // Player movement
   const left  = btn("left");
   const right = btn("right");
   const up    = btn("up");
   const down  = btn("down");
   if (left)  px -= SPEED * dt;
   if (right) px += SPEED * dt;
   if (up)    py -= SPEED * dt;
   if (down)  py += SPEED * dt;
   px = Math.max(ARENA_X + 6, Math.min(ARENA_X + ARENA_W - 6, px));
   py = Math.max(ARENA_Y + 6, Math.min(ARENA_Y + ARENA_H - 6, py));

   // Shoot
   if (btn("z") && shootCooldown <= 0) {
      shootCooldown = 0.18;
      bullets.push({ x: px, y: py, dx: 0, dy: -1 });
   }

   // Bullets
   for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx * BULLET_SPEED * dt;
      b.y += b.dy * BULLET_SPEED * dt;
      if (b.y < ARENA_Y || b.y > ARENA_Y + ARENA_H || b.x < ARENA_X || b.x > ARENA_X + ARENA_W)
         bullets.splice(i, 1);
   }

   // Enemies
   for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = px - e.x, dy = py - e.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      e.x += (dx/len) * e.spd * dt;
      e.y += (dy/len) * e.spd * dt;

      // Bullet collision
      for (let j = bullets.length - 1; j >= 0; j--) {
         const bul = bullets[j];
         if (Math.abs(bul.x - e.x) < 8 && Math.abs(bul.y - e.y) < 8) {
            e.hp--;
            bullets.splice(j, 1);
            if (e.hp <= 0) {
               const burst = createBurst(e.x, e.y, 16, 50);
               setBurstColors(burst, rgba8(255, 100, 40, 255), rgba8(255, 220, 60, 255), rgba8(255, 255, 200, 255));
               bursts.push(burst);
               enemies.splice(i, 1);
               enemyDefeated(mgr);
               score += 10 * getWaveNumber(mgr);
               break;
            }
         }
      }
   }

   // Bursts
   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i], dt);
      if (isBurstDone(bursts[i])) {
         destroyBurst(bursts[i]);
         bursts.splice(i, 1);
      }
   }

   // Wave completion
   if (!isWaveActive(mgr) && enemies.length === 0) {
      waveDelay -= dt;
      if (waveDelay <= 0) {
         const next = getWaveNumber(mgr) + 1;
         const count = 4 + next * 2;
         startWave(mgr, count);
         for (let i = 0; i < count; i++) spawnEnemy(next);
         waveDelay = 3.0;
      }
   }

   // Smooth cam follow
   setCam2DTarget(cam, px - 320, py - 180);
   updateCam2D(cam, dt);
}

export function draw() {
   cls(rgba8(8, 8, 20, 255));

   // Arena
   rectfill(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, rgba8(12, 14, 28, 255));
   rectfill(ARENA_X, ARENA_Y, ARENA_W, 2, rgba8(60, 60, 120, 255));
   rectfill(ARENA_X, ARENA_Y + ARENA_H - 2, ARENA_W, 2, rgba8(60, 60, 120, 255));
   rectfill(ARENA_X, ARENA_Y, 2, ARENA_H, rgba8(60, 60, 120, 255));
   rectfill(ARENA_X + ARENA_W - 2, ARENA_Y, 2, ARENA_H, rgba8(60, 60, 120, 255));

   // Enemies
   for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      rectfill(e.x - 7, e.y - 7, 14, 14, rgba8(200, 40, 40, 255));
      print('E', e.x - 3, e.y - 4, rgba8(255, 180, 180, 255));
   }

   // Bullets
   for (let i = 0; i < bullets.length; i++)
      rectfill(bullets[i].x - 2, bullets[i].y - 4, 4, 8, rgba8(255, 240, 60, 255));

   // Player
   rectfill(px - 6, py - 6, 12, 12, rgba8(60, 140, 255, 255));
   rectfill(px - 2, py - 10, 4, 6,  rgba8(80, 200, 255, 255));

   // Particle bursts
   for (let i = 0; i < bursts.length; i++)
      drawBurst(bursts[i]);

   // HUD
   rectfill(0, 0, 640, 36, rgba8(6, 6, 16, 220));
   printBold('WAVE ' + getWaveNumber(mgr), 10, 6, rgba8(255, 200, 60, 255));
   print('enemies: ' + getRemainingEnemies(mgr), 10, 18, rgba8(255, 100, 80, 200));
   printBold('SCORE ' + score, 490, 6, rgba8(80, 220, 255, 255));
   if (!isWaveActive(mgr) && enemies.length === 0)
      printFlash(230, 14, 'WAVE CLEAR!', rgba8(80, 255, 120, 255), t, 3.0);
}
