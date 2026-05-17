// Conformance cart 548: randInt, randRange, getDeltaTime, getFPS,
//                        createMinimap, drawMinimap.

let errors = [];
let mm;
let entities;

export function init() {
   const needed = ['randInt', 'randRange', 'getDeltaTime', 'getFPS',
                   'createMinimap', 'drawMinimap'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // randInt smoke test
   const n = randInt(1, 10);
   if (n < 1 || n > 10) errors.push('randInt-range');

   // randRange smoke test
   const r = randRange(0.5, 1.5);
   if (r < 0.5 || r >= 1.5) errors.push('randRange-range');

   mm = createMinimap({ x: 460, y: 20, width: 160, height: 120, worldW: 640, worldH: 360 });
   if (!mm || typeof mm.x !== 'number') errors.push('createMinimap-bad');

   entities = [
      { x: 320, y: 180, color: rgba8(255, 80, 80, 255) },
      { x: 100, y: 80,  color: rgba8(80, 255, 80, 255) },
      { x: 540, y: 300, color: rgba8(80, 180, 255, 255) },
   ];
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('548 RAND DELTA MM', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // getDeltaTime / getFPS
   const dt = getDeltaTime();
   const fps = getFPS();
   print('dt: ' + Math.floor(dt * 10000) / 10000, 20, 30, rgba8(180, 220, 100, 255));
   print('fps: ' + Math.floor(fps), 20, 42, rgba8(180, 220, 100, 255));

   // randInt visual: colored squares at random x positions
   for (let i = 0; i < 20; i++) {
      const px = randInt(20, 430);
      const c = rgba8(randInt(80, 255), randInt(80, 255), randInt(80, 255), 200);
      rectfill(px, 60, px + 8, 74, c);
   }

   // randRange visual: height-mapped strip
   for (let i = 0; i < 100; i++) {
      const h = Math.floor(randRange(5, 40));
      rectfill(20 + i * 4, 100 - h, 23 + i * 4, 100, rgba8(100, 180, 255, 180));
   }

   // Minimap
   drawMinimap(mm, entities);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
