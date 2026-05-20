// Nova64 game: Wave Survival Arena
// Arrow keys to move, Z to shoot toward nearest enemy (or last move direction).
// Survive waves of enemies with particle bursts on kill.

let t = 0;
let px = 320, py = 280;
let bullets = [];
let enemies = [];
let bursts = [];
let score = 0;
let mgr = 0;
let shootCooldown = 0;
let waveDelay = 0;
let paused = false;
let shootAngle = -Math.PI / 2;  // default: shoot up

const SPEED = 90;
const BULLET_SPEED = 260;
const ARENA_X = 40, ARENA_Y = 50, ARENA_W = 560, ARENA_H = 260;
const GRID_STEP = 40;

function spawnEnemy(wave) {
   const side = Math.floor(rngRandom() * 4);
   let ex, ey;
   if (side === 0) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y; }
   else if (side === 1) { ex = ARENA_X + rngRandom() * ARENA_W; ey = ARENA_Y + ARENA_H; }
   else if (side === 2) { ex = ARENA_X; ey = ARENA_Y + rngRandom() * ARENA_H; }
   else { ex = ARENA_X + ARENA_W; ey = ARENA_Y + rngRandom() * ARENA_H; }
   const hp = 1 + Math.floor(wave / 3);
   enemies.push({ x: ex, y: ey, hp, maxHp: hp, spd: 40 + wave * 5, phase: rngRandom() * 6.28 });
}

export function init() {
   mgr = createWaveManager();
   startWave(mgr, 4);
   for (let i = 0; i < 4; i++) spawnEnemy(1);
}

export function update(dt) {
   if (paused) return;
   t += dt;
   shootCooldown -= dt;

   // Player movement — track last move direction for aiming
   const left  = btn("left");
   const right = btn("right");
   const up    = btn("up");
   const down  = btn("down");
   let mdx = 0, mdy = 0;
   if (left)  mdx -= 1;
   if (right) mdx += 1;
   if (up)    mdy -= 1;
   if (down)  mdy += 1;
   if (mdx !== 0 || mdy !== 0) {
      const ml = Math.sqrt(mdx*mdx + mdy*mdy);
      shootAngle = Math.atan2(mdy / ml, mdx / ml);
      px += (mdx / ml) * SPEED * dt;
      py += (mdy / ml) * SPEED * dt;
   }
   px = Math.max(ARENA_X + 8, Math.min(ARENA_X + ARENA_W - 8, px));
   py = Math.max(ARENA_Y + 8, Math.min(ARENA_Y + ARENA_H - 8, py));

   // Shoot — aim at nearest enemy if present, else use last move direction
   if (btn("z") && shootCooldown <= 0) {
      shootCooldown = 0.15;
      let ax = Math.cos(shootAngle), ay = Math.sin(shootAngle);
      let bestDist = Infinity;
      for (const e of enemies) {
         const dx = e.x - px, dy = e.y - py;
         const d = Math.sqrt(dx*dx + dy*dy);
         if (d < bestDist) { bestDist = d; ax = dx / d; ay = dy / d; }
      }
      bullets.push({ x: px, y: py, dx: ax, dy: ay });
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

      for (let j = bullets.length - 1; j >= 0; j--) {
         const bul = bullets[j];
         if (Math.abs(bul.x - e.x) < 10 && Math.abs(bul.y - e.y) < 10) {
            e.hp--;
            bullets.splice(j, 1);
            if (e.hp <= 0) {
               const burst = createBurst(e.x, e.y, 18, 55);
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
      if (isBurstDone(bursts[i])) { destroyBurst(bursts[i]); bursts.splice(i, 1); }
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
}

export function draw() {
   cls(rgba8(6, 6, 18, 255));

   // Subtle arena grid
   for (let gx = ARENA_X; gx <= ARENA_X + ARENA_W; gx += GRID_STEP)
      vline(gx, ARENA_Y, ARENA_H, rgba8(20, 24, 50, 255));
   for (let gy = ARENA_Y; gy <= ARENA_Y + ARENA_H; gy += GRID_STEP)
      hline(ARENA_X, gy, ARENA_W, rgba8(20, 24, 50, 255));

   // Arena floor fill + glowing border
   rectfill(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, rgba8(10, 12, 26, 180));
   glowRect(ARENA_X, ARENA_Y, ARENA_W, ARENA_H, rgba8(60, 80, 200, 200), 5);

   // Corner accents
   const ca = rgba8(100, 120, 255, 180);
   const cs = 10;
   hline(ARENA_X, ARENA_Y, cs, ca); vline(ARENA_X, ARENA_Y, cs, ca);
   hline(ARENA_X + ARENA_W - cs, ARENA_Y, cs, ca); vline(ARENA_X + ARENA_W, ARENA_Y, cs, ca);
   hline(ARENA_X, ARENA_Y + ARENA_H, cs, ca); vline(ARENA_X, ARENA_Y + ARENA_H - cs, cs, ca);
   hline(ARENA_X + ARENA_W - cs, ARENA_Y + ARENA_H, cs, ca); vline(ARENA_X + ARENA_W, ARENA_Y + ARENA_H - cs, cs, ca);

   // Enemies — glowing circles, pulse on hp
   for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const pulse = 0.7 + 0.3 * Math.sin(t * 4 + e.phase);
      const r = Math.floor(8 + 4 * pulse);
      const alpha = Math.floor(200 + 55 * pulse);
      glowCircle(e.x, e.y, r, rgba8(220, 40, 40, alpha), Math.floor(4 + 4 * pulse));
      circfill(e.x, e.y, 5, rgba8(255, 120, 120, 255));
      // HP pips
      for (let h = 0; h < e.maxHp; h++) {
         const hx = e.x - (e.maxHp - 1) * 4 + h * 8;
         circfill(hx, e.y - 14, 2, h < e.hp ? rgba8(255, 80, 80, 255) : rgba8(60, 20, 20, 180));
      }
   }

   // Bullets — glowing streaks
   for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      const tx = b.x - b.dx * 10, ty = b.y - b.dy * 10;
      glowLine(tx, ty, b.x, b.y, rgba8(255, 240, 80, 255), 3);
      glowCircle(b.x, b.y, 3, rgba8(255, 255, 180, 255), 4);
   }

   // Player — glowing ship shape
   const playerGlow = rgba8(60, 160, 255, 255);
   glowCircle(px, py, 9, playerGlow, 6);
   circfill(px, py, 6, rgba8(120, 200, 255, 255));
   // Direction pointer
   const pdx = Math.cos(shootAngle), pdy = Math.sin(shootAngle);
   glowLine(px + pdx * 8, py + pdy * 8, px + pdx * 16, py + pdy * 16,
            rgba8(200, 240, 255, 200), 3);

   // Particle bursts
   for (let i = 0; i < bursts.length; i++) drawBurst(bursts[i]);

   // HUD bar
   rectfill(0, 0, 640, 44, rgba8(4, 4, 14, 230));
   glowLine(0, 44, 640, 44, rgba8(60, 80, 200, 160), 2);
   printBold('WAVE ' + getWaveNumber(mgr), 10, 6, rgba8(255, 200, 60, 255));
   print('enemies: ' + getRemainingEnemies(mgr), 10, 22, rgba8(255, 100, 80, 200));
   printBold('SCORE ' + score, 470, 6, rgba8(80, 220, 255, 255));
   print('Arrows:move  Z:shoot', 470, 22, rgba8(120, 140, 200, 160));
   if (!isWaveActive(mgr) && enemies.length === 0)
      printFlash(220, 18, 'WAVE CLEAR!', rgba8(80, 255, 120, 255), t, 3.0);
}
