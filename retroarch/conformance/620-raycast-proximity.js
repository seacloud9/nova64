// Conformance cart 620: raycastTilemap, createProximityTrigger, tickProximityTrigger.

let errors = [];

export function init() {
   const needed = ['raycastTilemap', 'createProximityTrigger', 'tickProximityTrigger'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // createProximityTrigger
   const pt = createProximityTrigger(50);
   if (!pt || typeof pt !== 'object') errors.push('createProximityTrigger-null');
   if (typeof pt.radius !== 'number') errors.push('proxTrigger-radius-field');

   // tickProximityTrigger — two points within radius
   const fired = tickProximityTrigger(pt, 100, 100, 130, 100); // dist=30 < r=50
   if (fired !== true) errors.push('tickProximityTrigger-near');

   // two points far apart
   const notFired = tickProximityTrigger(pt, 0, 0, 200, 200); // dist≈283 > r=50
   if (notFired !== false) errors.push('tickProximityTrigger-far');

   // raycastTilemap — simple 3x3 wall grid
   const grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
   ];
   function tileAt(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= 3 || ty >= 3) return 1;
      return grid[ty][tx];
   }
   // cast from inside (1,1) going right — should hit wall at x=2
   const hit = raycastTilemap(1.5, 1.5, 1, 0, 5, 32, tileAt);
   if (!hit || typeof hit !== 'object') errors.push('raycast-null');
   else if (typeof hit.x !== 'number') errors.push('raycast-x-field');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('620 RAYCAST PROXIMITY', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // draw a small tilemap and ray
   const ts = 40;
   const ox = 40, oy = 60;
   const grid = [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1],
   ];
   for (let ty = 0; ty < 5; ty++) {
      for (let tx = 0; tx < 5; tx++) {
         const c = grid[ty][tx] ? rgba8(100,120,180,255) : rgba8(20,24,50,255);
         rectfill(ox+tx*ts, oy+ty*ts, ox+tx*ts+ts-1, oy+ty*ts+ts-1, c);
      }
   }

   function tileAt2(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= 5 || ty >= 5) return 1;
      return grid[ty][tx];
   }
   // ray from center going right
   const hit = raycastTilemap(2.5, 2.5, 1, 0, 10, ts, tileAt2);
   if (hit) {
      const rx = ox + hit.x * ts;
      const ry = oy + hit.y * ts;
      line(ox + 2.5*ts, oy + 2.5*ts, rx, ry, rgba8(255,200,60,255));
      circle(Math.floor(rx), Math.floor(ry), 4, rgba8(255,80,80,255), true);
   }

   // proximity trigger circles
   const pt2 = createProximityTrigger(40);
   const ax = 350, ay = 150, bx = 380, by = 150;
   const near = tickProximityTrigger(pt2, ax, ay, bx, by);
   circle(ax, ay, 40, near ? rgba8(255,200,60,200) : rgba8(80,80,160,200), false);
   pset(bx, by, rgba8(255,80,80,255));
   print('prox ' + (near ? 'NEAR' : 'FAR'), 340, 200, rgba8(200,200,200,200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
