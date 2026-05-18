// Conformance cart 1069: Batch 88 showcase — smooth camera following a moving target.

let cam = 0;
let t = 0;

export function init() {
   cam = createCam2D(0, 0, 3.0);
}

export function update(dt) {
   t += dt;
   const tx = Math.cos(t * 0.4) * 80;
   const ty = Math.sin(t * 0.3) * 50;
   setCam2DTarget(cam, tx, ty);
   updateCam2D(cam, dt);
   applyCam2D(cam);
}

export function draw() {
   cls(rgba8(6, 8, 18, 255));

   // Tilemap-style world
   for (let tx2 = -3; tx2 < 14; tx2++) {
      for (let ty2 = -2; ty2 < 9; ty2++) {
         const col = (tx2 + ty2) % 2 === 0 ? rgba8(20, 30, 50, 255) : rgba8(14, 20, 36, 255);
         rectfill(tx2 * 50, ty2 * 40, 48, 38, col);
      }
   }

   // Moving target marker
   const wx = Math.cos(t * 0.4) * 80 + 320;
   const wy = Math.sin(t * 0.3) * 50 + 180;
   rectfill(wx - 8, wy - 8, 16, 16, rgba8(255, 200, 60, 255));

   clearCamera2D();

   const cx = getCam2DX(cam);
   const cy = getCam2DY(cam);
   print('cam: ' + cx.toFixed(0) + ',' + cy.toFixed(0), 4, 30, rgba8(80, 255, 120, 200));

   printBold('1069 BATCH 88', 4, 4, rgba8(200, 220, 255, 200));
   print('smooth cam2D', 4, 14, rgba8(80, 255, 120, 180));
}
