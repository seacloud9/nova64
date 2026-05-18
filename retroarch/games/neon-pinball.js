// Nova64 game: Neon Pinball
// Press Z/X to control left/right flippers. Keep the ball alive for high score.
// Uses glow rendering and particle bursts on bumper hits.

let t = 0;
let bx = 320, by = 160;
let vx = 60, vy = -80;
const BALL_R = 6;
const GRAVITY = 260;

// Flippers
let lFlip = 0, rFlip = 0;  // 0=down, 1=up
const LFX = 130, RFX = 510, FY = 320, FL = 80;

// Bumpers
const BUMPERS = [
   { x: 200, y: 120, r: 20 },
   { x: 320, y: 100, r: 22 },
   { x: 440, y: 120, r: 20 },
   { x: 260, y: 190, r: 16 },
   { x: 380, y: 190, r: 16 },
];

let bumper_flash = [0, 0, 0, 0, 0];
let bursts = [];
let score = 0;
let lives = 3;
let lost = false;

function reflectBumper(b) {
   const dx = bx - b.x, dy = by - b.y;
   const dist = Math.sqrt(dx*dx + dy*dy) || 1;
   const nx = dx / dist, ny = dy / dist;
   const dot = vx * nx + vy * ny;
   vx = vx - 2 * dot * nx;
   vy = vy - 2 * dot * ny;
   const spd = Math.sqrt(vx*vx + vy*vy);
   const newSpd = Math.max(spd, 160) * 1.1;
   vx = vx / spd * newSpd;
   vy = vy / spd * newSpd;
   bx = b.x + nx * (b.r + BALL_R + 1);
   by = b.y + ny * (b.r + BALL_R + 1);
   const burst = createBurst(b.x, b.y, 14, 60);
   setBurstColors(burst, rgba8(255, 80, 200, 255), rgba8(80, 200, 255, 255), rgba8(255, 255, 200, 255));
   bursts.push(burst);
   score += 100;
}

export function update(dt) {
   if (lost) {
      if (btnp("z")) { lost = false; lives = 3; score = 0; bx = 320; by = 160; vx = 60; vy = -80; }
      return;
   }
   t += dt;

   lFlip = btn("z") ? 1 : 0;
   rFlip = btn("x") ? 1 : 0;

   // Physics
   vy += GRAVITY * dt;
   bx += vx * dt;
   by += vy * dt;

   // Walls
   if (bx < 50 + BALL_R)   { bx = 50 + BALL_R; vx = Math.abs(vx); }
   if (bx > 590 - BALL_R)  { bx = 590 - BALL_R; vx = -Math.abs(vx); }
   if (by < 50 + BALL_R)   { by = 50 + BALL_R; vy = Math.abs(vy) * 0.8; }

   // Lost ball
   if (by > 370) {
      lives--;
      bx = 320; by = 160; vx = 30 + rngRandom() * 60; vy = -100;
      if (lives <= 0) lost = true;
      return;
   }

   // Flippers
   const lAngle = lFlip ? -0.5 : 0.4;
   const rAngle = rFlip ? -0.5 + Math.PI : -0.4 + Math.PI;
   const lTipX = LFX + Math.cos(lAngle) * FL;
   const lTipY = FY  + Math.sin(lAngle) * FL;
   const rTipX = RFX + Math.cos(rAngle) * FL;
   const rTipY = FY  + Math.sin(rAngle) * FL;

   // Simple flipper hit: if ball near flipper line and moving down
   if (vy > 0) {
      const ldx = bx - LFX, ldy = by - FY;
      if (ldx > 0 && ldx < FL && Math.abs(ldy) < 12 && lFlip) {
         vy = -Math.abs(vy) * 1.1; vx += 30;
         score += 10;
      }
      const rdx = RFX - bx, rdy = by - FY;
      if (rdx > 0 && rdx < FL && Math.abs(rdy) < 12 && rFlip) {
         vy = -Math.abs(vy) * 1.1; vx -= 30;
         score += 10;
      }
   }

   // Bumpers
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const dx = bx - b.x, dy = by - b.y;
      if (dx*dx + dy*dy < (b.r + BALL_R) * (b.r + BALL_R)) {
         reflectBumper(b);
         bumper_flash[i] = 0.15;
      }
      if (bumper_flash[i] > 0) bumper_flash[i] -= dt;
   }

   // Cap speed
   const spd = Math.sqrt(vx*vx + vy*vy);
   if (spd > 400) { vx = vx/spd*400; vy = vy/spd*400; }

   // Bursts
   for (let i = bursts.length - 1; i >= 0; i--) {
      updateBurst(bursts[i], dt);
      if (isBurstDone(bursts[i])) { destroyBurst(bursts[i]); bursts.splice(i, 1); }
   }
}

export function draw() {
   cls(rgba8(4, 2, 14, 255));

   // Table
   rectfill(50, 50, 540, 300, rgba8(8, 6, 20, 255));
   glowRect(50, 50, 540, 300, rgba8(80, 60, 180, 200), 3);

   // Bumpers
   for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i];
      const lit = bumper_flash[i] > 0;
      const col = lit ? rgba8(255, 80, 200, 255) : rgba8(180, 60, 255, 200);
      glowCircle(b.x, b.y, b.r, col, lit ? 8 : 4);
   }

   // Flippers
   const lAngle = lFlip ? -0.5 : 0.4;
   const rAngle = rFlip ? -0.5 + Math.PI : -0.4 + Math.PI;
   const ltx = LFX + Math.cos(lAngle) * FL;
   const lty = FY  + Math.sin(lAngle) * FL;
   const rtx = RFX + Math.cos(rAngle) * FL;
   const rty = FY  + Math.sin(rAngle) * FL;
   glowLine(LFX, FY, ltx, lty, rgba8(80, 200, 255, 255), lFlip ? 5 : 3);
   glowLine(RFX, FY, rtx, rty, rgba8(80, 200, 255, 255), rFlip ? 5 : 3);

   // Ball
   glowCircle(bx, by, BALL_R, rgba8(255, 240, 80, 255), 5);

   // Bursts
   for (let i = 0; i < bursts.length; i++) drawBurst(bursts[i]);

   // Rainbow score
   printRainbow(200, 340, 'SCORE:' + score, t);

   // HUD
   rectfill(0, 0, 640, 46, rgba8(4, 4, 12, 220));
   printBold('NEON PINBALL', 10, 6, rgba8(200, 80, 255, 255));
   for (let i = 0; i < lives; i++)
      glowCircle(480 + i * 22, 20, 8, rgba8(80, 200, 255, 255), 4);
   print('Z=left  X=right flipper', 10, 22, rgba8(120, 100, 180, 160));

   if (lost) {
      rectfill(150, 130, 340, 80, rgba8(10, 4, 30, 230));
      printGradient(200, 145, 'GAME OVER', rgba8(255, 80, 60, 255), rgba8(255, 200, 60, 255));
      printBold('SCORE ' + score, 250, 170, rgba8(200, 200, 255, 255));
      printFlash(230, 188, 'Z TO REPLAY', rgba8(180, 180, 255, 255), t, 2.0);
   }
}
