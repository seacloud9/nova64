// Nova64 game: Neon Pinball
// Z = left flipper, X = right flipper. Hit bumpers, chain combos, survive.

let t = 0;
let bx = 320, by = 160;
let vx = 60, vy = -80;
const BALL_R = 6;
const GRAVITY = 280;

// Table bounds
const TX = 60, TY = 42, TW = 520, TH = 308;
const TX2 = TX + TW, TY2 = TY + TH;          // 580, 350

// Flippers — moved inward so the gap is tight
const LFX = 210, RFX = 430, FY = TY2 - 12, FL = 95;

// Bumpers — 3 colour families
const BUMPERS = [
   { x: 210, y: 130, r: 22, col: 0 },
   { x: 320, y: 108, r: 26, col: 1 },
   { x: 430, y: 130, r: 22, col: 2 },
   { x: 265, y: 205, r: 18, col: 2 },
   { x: 375, y: 205, r: 18, col: 0 },
];
const BCOLS = [
   [255,  60, 200],   // magenta
   [ 60, 220, 255],   // cyan
   [140, 255,  60],   // lime
];

let bumperFlash = [0, 0, 0, 0, 0];
let bursts = [];
let score = 0;
let lives = 3;
let lost = false;
let introTimer = 3.0;
let combo = 0, comboTimer = 0;
let trail = [];
let lFlip = 0, rFlip = 0;

function reflectBumper(i) {
   const b = BUMPERS[i];
   const dx = bx - b.x, dy = by - b.y;
   const len = Math.sqrt(dx*dx + dy*dy) || 1;
   const nx = dx/len, ny = dy/len;
   const dot = vx*nx + vy*ny;
   vx -= 2*dot*nx; vy -= 2*dot*ny;
   const spd = Math.sqrt(vx*vx + vy*vy);
   const ns = Math.max(spd, 180) * 1.12;
   vx = vx/spd*ns; vy = vy/spd*ns;
   bx = b.x + nx*(b.r + BALL_R + 1);
   by = b.y + ny*(b.r + BALL_R + 1);
   const c = BCOLS[b.col];
   const burst = createBurst(b.x, b.y, 16, 55);
   setBurstColors(burst, rgba8(c[0],c[1],c[2],255), rgba8(255,255,200,255), rgba8(255,255,255,160));
   bursts.push(burst);
   combo++;
   comboTimer = 2.5;
   score += 100 * Math.max(1, combo);
}

export function update(dt) {
   if (lost) {
      if (btnp("z")) {
         lost = false; lives = 3; score = 0;
         bx = 320; by = 160; vx = 60; vy = -80;
         combo = 0; trail = []; introTimer = 0;
      }
      return;
   }
   if (introTimer > 0) {
      introTimer -= dt;
      if (btnp("z") || btnp("x")) introTimer = 0;
      return;
   }
   t += dt;
   if (comboTimer > 0) { comboTimer -= dt; } else { combo = 0; }

   lFlip = btn("z") ? 1 : 0;
   rFlip = btn("x") ? 1 : 0;

   // Ball trail
   trail.push({ x: bx, y: by, age: 0 });
   for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].age += dt;
      if (trail[i].age > 0.1) trail.splice(i, 1);
   }

   // Physics
   vy += GRAVITY * dt;
   bx += vx * dt;
   by += vy * dt;

   // Walls
   if (bx < TX + BALL_R)  { bx = TX + BALL_R;  vx =  Math.abs(vx); }
   if (bx > TX2 - BALL_R) { bx = TX2 - BALL_R; vx = -Math.abs(vx); }
   if (by < TY + BALL_R)  { by = TY + BALL_R;  vy =  Math.abs(vy) * 0.8; }

   // Diagonal gutter bounces — funnels ball toward flippers
   if (bx < LFX && by > FY - 25) {
      const wall = TY2 - (bx - TX) * 0.4;
      if (by > wall) { vx = Math.abs(vx) + 15; }
   }
   if (bx > RFX && by > FY - 25) {
      const wall = TY2 - (TX2 - bx) * 0.4;
      if (by > wall) { vx = -(Math.abs(vx) + 15); }
   }

   // Drain
   if (by > TY2 + 20) {
      lives--;
      trail = [];
      bx = 320; by = 160;
      vx = 20 + rngRandom() * 60; vy = -110;
      combo = 0;
      if (lives <= 0) lost = true;
      return;
   }

   // Flipper physics — correct mirror symmetry
   const lAngle = lFlip ? -0.5 : 0.4;
   const rAngle = rFlip ? Math.PI + 0.5 : Math.PI - 0.4;

   if (vy > 0) {
      const ldx = bx - LFX;
      if (ldx > 0 && ldx < FL && Math.abs(by - FY) < 14 && lFlip) {
         vy = -Math.abs(vy) * 1.15; vx += 45; score += 10;
      }
      const rdx = RFX - bx;
      if (rdx > 0 && rdx < FL && Math.abs(by - FY) < 14 && rFlip) {
         vy = -Math.abs(vy) * 1.15; vx -= 45; score += 10;
      }
   }

   // Bumper collisions
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const dx = bx - b.x, dy = by - b.y;
      if (dx*dx + dy*dy < (b.r + BALL_R)*(b.r + BALL_R)) {
         reflectBumper(i);
         bumperFlash[i] = 0.18;
      }
      if (bumperFlash[i] > 0) bumperFlash[i] -= dt;
   }

   // Speed cap
   const spd = Math.sqrt(vx*vx + vy*vy);
   if (spd > 480) { vx = vx/spd*480; vy = vy/spd*480; }

   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i], dt);
      if (isBurstDone(bursts[i])) { destroyBurst(bursts[i]); bursts.splice(i, 1); }
   }
}

export function draw() {
   cls(rgba8(4, 2, 14, 255));

   // ── Intro ──────────────────────────────────────────────────────────────────
   if (introTimer > 0) {
      rectfill(80, 50, 480, 280, rgba8(6,4,22,245));
      glowRect(80, 50, 480, 280, rgba8(180,60,255,220), 7);
      printBold('NEON PINBALL', 182, 70, rgba8(210,80,255,255));
      glowLine(100, 98, 560, 98, rgba8(80,60,200,200), 2);
      print('CONTROLS:', 110, 110, rgba8(160,140,220,255));
      printBold('Z', 110, 130, rgba8(80,220,255,255));
      print('= LEFT flipper', 130, 130, rgba8(200,200,255,220));
      printBold('X', 110, 150, rgba8(80,220,255,255));
      print('= RIGHT flipper', 130, 150, rgba8(200,200,255,220));
      glowLine(100, 172, 560, 172, rgba8(60,60,180,160), 1);
      print('Hit bumpers to score points', 110, 182, rgba8(180,160,240,200));
      print('Chain hits before timer expires for combos', 110, 198, rgba8(180,160,240,200));
      print('Ball drain = -1 life   (3 lives total)', 110, 214, rgba8(180,160,240,200));
      glowLine(100, 234, 560, 234, rgba8(80,60,200,200), 2);
      printFlash(200, 248, 'Press Z or X to start!', rgba8(255,200,80,255), -introTimer, 2.5);
      return;
   }

   // ── Table ─────────────────────────────────────────────────────────────────
   rectfill(TX, TY, TW, TH, rgba8(8,6,20,255));
   // Subtle lane grid
   for (let gx = TX+52; gx < TX2; gx += 52)
      vline(gx, TY+2, TH-4, rgba8(14,12,32,255));
   for (let gy = TY+44; gy < TY2; gy += 44)
      hline(TX+2, gy, TW-4, rgba8(14,12,32,255));
   // Border
   glowRect(TX, TY, TW, TH, rgba8(80,60,210,230), 4);
   // Corner accents
   const ca = rgba8(120,140,255,200), cs = 16;
   hline(TX,        TY,        cs, ca); vline(TX,        TY,        cs, ca);
   hline(TX2-cs,    TY,        cs, ca); vline(TX2,       TY,        cs, ca);
   hline(TX,        TY2,       cs, ca); vline(TX,        TY2-cs,    cs, ca);
   hline(TX2-cs,    TY2,       cs, ca); vline(TX2,       TY2-cs,    cs, ca);

   // Gutter diagonals
   const gc = rgba8(60,80,200,200);
   glowLine(TX,        FY-28,  LFX-18, TY2+8, gc, 3);
   glowLine(TX2,       FY-28,  RFX+18, TY2+8, gc, 3);

   // ── Bumpers ───────────────────────────────────────────────────────────────
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const c = BCOLS[b.col];
      const lit = bumperFlash[i] > 0;
      const pulse = 0.65 + 0.35 * Math.sin(t * 3.2 + i * 1.4);
      const col = lit
         ? rgba8(255, 255, 180, 255)
         : rgba8(c[0], c[1], c[2], Math.floor(160 + 95*pulse));
      glowCircle(b.x, b.y, b.r,     col, lit ? 14 : Math.floor(4 + 5*pulse));
      circfill(  b.x, b.y, b.r - 7, lit ? rgba8(255,255,220,255) : rgba8(c[0],c[1],c[2],230));
      circ(      b.x, b.y, b.r,     rgba8(200,200,255,60));
   }

   // ── Flippers ──────────────────────────────────────────────────────────────
   const lFlipVal = btn("z") ? 1 : 0;
   const rFlipVal = btn("x") ? 1 : 0;
   const lAngle = lFlipVal ? -0.5 : 0.4;
   const rAngle = rFlipVal ? Math.PI + 0.5 : Math.PI - 0.4;
   const ltx = LFX + Math.cos(lAngle)*FL, lty = FY + Math.sin(lAngle)*FL;
   const rtx = RFX + Math.cos(rAngle)*FL, rty = FY + Math.sin(rAngle)*FL;
   const fc = rgba8(80, 210, 255, 255);
   glowLine(LFX, FY, ltx, lty, fc, lFlipVal ? 7 : 3);
   glowLine(RFX, FY, rtx, rty, fc, rFlipVal ? 7 : 3);
   circfill(LFX, FY, 5, rgba8(130,230,255,255));
   circfill(RFX, FY, 5, rgba8(130,230,255,255));

   // ── Ball trail ────────────────────────────────────────────────────────────
   for (const tr of trail) {
      const a = 1 - tr.age / 0.1;
      const r = Math.floor(BALL_R * a * 0.65);
      if (r > 0) circfill(Math.floor(tr.x), Math.floor(tr.y), r,
                          rgba8(255, 200, 60, Math.floor(160*a)));
   }

   // ── Ball ──────────────────────────────────────────────────────────────────
   glowCircle(bx, by, BALL_R + 1, rgba8(255, 240, 80, 255), 7);
   circfill(bx, by, BALL_R - 1, rgba8(255, 255, 190, 255));

   // ── Particle bursts ───────────────────────────────────────────────────────
   for (const b of bursts) drawBurst(b);

   // ── HUD ───────────────────────────────────────────────────────────────────
   rectfill(0, 0, 640, 38, rgba8(4,4,14,235));
   glowLine(0, 38, 640, 38, rgba8(60,80,200,160), 2);
   printBold('NEON PINBALL', 8, 5, rgba8(200,80,255,255));
   print('Z:left  X:right', 8, 22, rgba8(90,110,190,160));
   printBold('SCORE', 248, 5, rgba8(110,150,255,200));
   printBold('' + score, 300, 5, rgba8(255,240,80,255));
   // Combo indicator
   if (comboTimer > 0 && combo > 1) {
      const alpha = Math.floor((comboTimer / 2.5) * 255);
      printBold('x' + combo + ' COMBO', 434, 5, rgba8(255,200,50,alpha));
   }
   // Lives as glowing dots
   for (let i = 0; i < lives; i++)
      glowCircle(532 + i * 28, 20, 9, rgba8(80,200,255,255), 5);
   print('lives', 528, 5, rgba8(90,130,200,160));

   // ── Game Over overlay ─────────────────────────────────────────────────────
   if (lost) {
      rectfill(148, 132, 344, 106, rgba8(8,4,28,240));
      glowRect(148, 132, 344, 106, rgba8(255,60,60,200), 5);
      printGradient(190, 150, 'GAME OVER', rgba8(255,80,60,255), rgba8(255,200,60,255));
      printBold('SCORE  ' + score, 226, 178, rgba8(200,200,255,255));
      printFlash(222, 204, 'Z TO REPLAY', rgba8(180,180,255,255), t, 2.0);
   }
}
