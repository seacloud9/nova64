// Conformance cart 571: batch 43 combined showcase.

let errors = [];
let pool;
let grid;
let circLayout;
let t = 0;

export function init() {
   const needed = ['hitTest', 'circleHitTest', 'createColorPool', 'nextColor',
                   'createGridLayout', 'createCircleLayout', 'shuffleArray',
                   'pickRandom', 'weightedRandom', 'setRandomSeed',
                   'subVec2', 'scaleVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   setRandomSeed(2024);
   pool = createColorPool([
      rgba8(255, 80, 80, 255), rgba8(255, 200, 60, 255), rgba8(80, 255, 120, 255),
      rgba8(80, 180, 255, 255), rgba8(200, 80, 255, 255)
   ]);
   grid = createGridLayout(8, 4, 20, 80, 420, 200);
   circLayout = createCircleLayout(12, 550, 200, 70);
}

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('571 BATCH 43', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Color pool cycling grid cells
   for (let i = 0; i < grid.length; i++) {
      const c = nextColor(pool);
      rectfill(Math.floor(grid[i].x)-20, Math.floor(grid[i].y)-20,
               Math.floor(grid[i].x)+20, Math.floor(grid[i].y)+20, c);
   }

   // Circle layout with animated scale
   for (let i = 0; i < circLayout.length; i++) {
      const s = 1.0 + 0.3 * Math.sin(t * 2 + i * 0.5);
      const scaled = scaleVec2(circLayout[i].x - 550, circLayout[i].y - 200, s);
      const px = Math.floor(550 + scaled.x);
      const py = Math.floor(200 + scaled.y);
      circ(px, py, 5, lerpColor(rgba8(80,200,255,255), rgba8(255,80,200,255), i/11));
   }

   // hitTest interactive point
   const px = 320 + Math.floor(Math.sin(t) * 100);
   const py = 290;
   const inRect = hitTest(px, py, 220, 275, 200, 30);
   rectfill(220, 275, 420, 305, rgba8(30, 40, 80, 200));
   rectfill(px-3, py-3, px+3, py+3, inRect ? rgba8(80,255,80,255) : rgba8(255,80,80,255));
   print(inRect ? 'IN' : 'OUT', 430, 285, rgba8(200, 220, 255, 255));

   // subVec2 arrow
   const va = {x:20, y:330}; const vb = {x:160, y:330};
   const diff = subVec2(vb.x, vb.y, va.x, va.y);
   line(va.x, va.y, vb.x, vb.y, rgba8(255, 200, 80, 255));
   print('len:' + Math.floor(dist(va.x,va.y,vb.x,vb.y)), 170, 326, rgba8(200, 220, 255, 255));

   // Weighted random bar
   const ws = [1, 4, 7, 4, 1];
   const idx = weightedRandom(ws);
   for (let i = 0; i < 5; i++) {
      const c2 = i === idx ? rgba8(255,200,60,255) : rgba8(60,80,120,200);
      rectfill(20 + i*60, 340, 75 + i*60, 355, c2);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
