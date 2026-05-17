// Conformance cart 631: batch 48 combined showcase.
// raycastTilemap, createProximityTrigger, tickProximityTrigger,
// createSeedRNG, getSeedRNG, seedToTraits, exportSeedMetadata,
// mouseDown, mousePressed, gamepadAxis, gamepadConnected, rightStickX.

let errors = [];
let t = 0;
let playerX = 160, playerY = 180;
let pt = null;
let enemyX = 350, enemyY = 180;

const GRID = [
   [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
   [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
   [1,0,0,0,1,1,1,0,0,0,0,0,1,1,0,1],
   [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
   [1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1],
   [1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1],
   [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
   [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const TS = 28;
const OX = 4, OY = 30;

function tileAt(tx, ty) {
   if (tx < 0 || ty < 0 || ty >= GRID.length || tx >= GRID[0].length) return 1;
   return GRID[ty][tx];
}

export function init() {
   const needed = ['raycastTilemap', 'createProximityTrigger', 'tickProximityTrigger',
                   'createSeedRNG', 'seedToTraits', 'exportSeedMetadata',
                   'mouseDown', 'mousePressed', 'gamepadAxis', 'gamepadConnected', 'rightStickX'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   pt = createProximityTrigger(60);
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   // animate enemy
   enemyX = 350 + Math.cos(t * 0.7) * 80;
   enemyY = 180 + Math.sin(t * 0.5) * 40;
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('631 BATCH 48', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // draw tilemap
   for (let ty = 0; ty < GRID.length; ty++) {
      for (let tx = 0; tx < GRID[0].length; tx++) {
         if (GRID[ty][tx])
            rectfill(OX+tx*TS, OY+ty*TS, OX+tx*TS+TS-1, OY+ty*TS+TS-1, rgba8(60,80,130,255));
      }
   }

   // raycast from player to enemy
   const dx = enemyX - playerX, dy = enemyY - playerY;
   const dist = Math.sqrt(dx*dx+dy*dy);
   const hit = dist > 0 ? raycastTilemap(
      (playerX - OX) / TS, (playerY - OY) / TS,
      dx / dist, dy / dist,
      dist / TS + 1, TS, tileAt
   ) : null;
   const canSee = !hit || (hit.dist * TS) >= dist - 4;
   line(Math.floor(playerX), Math.floor(playerY),
        Math.floor(enemyX), Math.floor(enemyY),
        canSee ? rgba8(255,200,60,180) : rgba8(80,80,120,120));

   // proximity alert
   const near = pt ? tickProximityTrigger(pt, playerX, playerY, enemyX, enemyY) : false;
   circle(Math.floor(playerX), Math.floor(playerY), 6, rgba8(80,200,255,255), true);
   circle(Math.floor(enemyX), Math.floor(enemyY), 6,
          near ? rgba8(255,80,80,255) : rgba8(200,100,80,200), true);
   if (near)
      print('NEAR!', Math.floor(enemyX)-10, Math.floor(enemyY)-14, rgba8(255,200,60,255));

   // seed trait strip
   const rng = createSeedRNG(0xbeef);
   for (let i = 0; i < 20; i++) {
      const v = rng.next();
      rectfill(4 + i * 15, 262, 18 + i * 15, 274, hslColor(Math.floor(v * 360), 0.7, 0.5, 220));
   }
   print('seed RNG', 4, 278, rgba8(180,180,220,180));

   // input row
   const gx = gamepadAxis('leftX');
   const gy = gamepadAxis('leftY');
   print('pad: ' + (gamepadConnected() ? 'Y' : 'N') +
         ' L(' + gx.toFixed(1) + ',' + gy.toFixed(1) + ')', 4, 310, rgba8(160,220,160,180));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
