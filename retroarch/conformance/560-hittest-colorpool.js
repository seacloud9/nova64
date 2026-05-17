// Conformance cart 560: hitTest, circleHitTest, createColorPool, nextColor,
//                        createGridLayout, createCircleLayout.

let errors = [];
let pool;
let grid;
let circle;

export function init() {
   const needed = ['hitTest', 'circleHitTest', 'createColorPool', 'nextColor',
                   'createGridLayout', 'createCircleLayout'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // hitTest
   if (!hitTest(50, 50, 20, 20, 100, 100)) errors.push('hitTest-false-neg');
   if (hitTest(200, 200, 20, 20, 100, 100)) errors.push('hitTest-false-pos');

   // circleHitTest
   if (!circleHitTest(105, 105, 100, 100, 10)) errors.push('circle-false-neg');
   if (circleHitTest(200, 200, 100, 100, 10)) errors.push('circle-false-pos');

   // createColorPool
   pool = createColorPool([rgba8(255,0,0,255), rgba8(0,255,0,255), rgba8(0,0,255,255)]);
   if (!pool || !Array.isArray(pool._colors)) errors.push('colorpool-bad');

   // createGridLayout
   grid = createGridLayout(4, 3, 20, 100, 400, 180);
   if (!grid || grid.length !== 12) errors.push('grid-length');

   // createCircleLayout
   circle = createCircleLayout(8, 500, 180, 50);
   if (!circle || circle.length !== 8) errors.push('circle-layout-length');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('560 HIT POOL GRID', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Color pool cycling
   for (let i = 0; i < 12; i++) {
      const c = nextColor(pool);
      rectfill(20 + i * 45, 30, 60 + i * 45, 55, c);
   }

   // Grid layout dots
   for (let i = 0; i < grid.length; i++) {
      rectfill(Math.floor(grid[i].x)-4, Math.floor(grid[i].y)-4,
               Math.floor(grid[i].x)+4, Math.floor(grid[i].y)+4,
               rgba8(80, 200, 255, 220));
   }

   // Circle layout dots
   for (let i = 0; i < circle.length; i++) {
      circ(Math.floor(circle[i].x), Math.floor(circle[i].y), 4, rgba8(255, 200, 60, 255));
   }

   // hitTest visual
   const rect2 = {x:20, y:290, w:80, h:40};
   rectfill(rect2.x, rect2.y, rect2.x+rect2.w, rect2.y+rect2.h, rgba8(40, 40, 80, 255));
   const inside = hitTest(50, 310, rect2.x, rect2.y, rect2.w, rect2.h);
   print(inside ? 'INSIDE' : 'OUTSIDE', rect2.x, rect2.y - 12, rgba8(200, 255, 80, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
