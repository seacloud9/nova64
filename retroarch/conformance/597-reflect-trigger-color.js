// Conformance cart 597: reflectVec2, projectVec2,
//                        createRandomTrigger, tickRandomTrigger,
//                        colorAlpha, colorScale, frac.

let errors = [];

export function init() {
   const needed = ['reflectVec2', 'projectVec2',
                   'createRandomTrigger', 'tickRandomTrigger',
                   'colorAlpha', 'colorScale', 'frac'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // reflectVec2 — reflect (1,0) off normal (0,1) → (1,0) (no change, parallel)
   const r1 = reflectVec2(1, 0, 0, 1);
   if (typeof r1.x !== 'number' || typeof r1.y !== 'number') errors.push('reflectVec2-fields');
   // reflect (0,1) off normal (0,1) → (0,-1)
   const r2 = reflectVec2(0, 1, 0, 1);
   if (Math.abs(r2.x) > 0.001 || Math.abs(r2.y + 1) > 0.001) errors.push('reflectVec2-value');

   // projectVec2 — project (3,4) onto unit X axis (1,0) → (3,0)
   const p1 = projectVec2(3, 4, 1, 0);
   if (typeof p1.x !== 'number' || typeof p1.y !== 'number') errors.push('projectVec2-fields');
   if (Math.abs(p1.x - 3) > 0.001 || Math.abs(p1.y) > 0.001) errors.push('projectVec2-value');

   // createRandomTrigger / tickRandomTrigger
   const rt = createRandomTrigger(1.0); // always fires
   if (rt === null || rt === undefined) errors.push('createRandomTrigger-null');
   const fired = tickRandomTrigger(rt);
   if (fired !== true) errors.push('tickRandomTrigger-always');
   const rt0 = createRandomTrigger(0.0); // never fires
   const notFired = tickRandomTrigger(rt0);
   if (notFired !== false) errors.push('tickRandomTrigger-never');

   // colorAlpha — change alpha channel
   const c1 = rgba8(255, 128, 64, 255);
   const c2 = colorAlpha(c1, 100);
   if ((c2 & 0xff) !== 100) errors.push('colorAlpha-value');
   if ((c2 >>> 8) !== (c1 >>> 8)) errors.push('colorAlpha-rgb-changed');

   // colorScale — scale RGB channels by 0.5
   const c3 = rgba8(200, 100, 50, 255);
   const c4 = colorScale(c3, 0.5);
   const r = (c4 >>> 24) & 0xff;
   const g = (c4 >>> 16) & 0xff;
   const b = (c4 >>> 8) & 0xff;
   if (Math.abs(r - 100) > 2) errors.push('colorScale-r');
   if (Math.abs(g - 50) > 2) errors.push('colorScale-g');
   if (Math.abs(b - 25) > 2) errors.push('colorScale-b');

   // frac — fractional part
   if (Math.abs(frac(3.75) - 0.75) > 0.0001) errors.push('frac-positive');
   if (Math.abs(frac(0.0) - 0.0) > 0.0001) errors.push('frac-zero');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('597 REFLECT TRIGGER COLOR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // reflectVec2 — bounce ball off floor
   const nx = 0, ny = -1; // floor normal pointing up
   const vx = 40, vy = 60;
   const rv = reflectVec2(vx, vy, nx, ny);
   const cx = 80, cy = 160;
   line(cx, cy, cx + Math.floor(vx * 0.5), cy + Math.floor(vy * 0.5),
        rgba8(255, 80, 80, 255));
   line(cx, cy, cx + Math.floor(rv.x * 0.5), cy - Math.floor(rv.y * 0.5),
        rgba8(80, 255, 80, 255));
   line(cx - 40, cy, cx + 40, cy, rgba8(180, 180, 180, 200));

   // projectVec2 — shadow projection
   const axis = {x: 0.707, y: 0.707};
   const px2 = projectVec2(60, 40, axis.x, axis.y);
   line(200, 140, 260, 180, rgba8(200, 200, 80, 255));
   line(200, 140, 200 + Math.floor(px2.x), 140 + Math.floor(px2.y),
        rgba8(80, 200, 255, 200));

   // colorAlpha strip
   for (let i = 0; i < 16; i++) {
      const a = Math.floor((i / 15) * 255);
      rectfill(320 + i * 18, 100, 338 + i * 18, 130,
               colorAlpha(rgba8(80, 180, 255, 255), a));
   }

   // colorScale strip
   for (let i = 0; i < 16; i++) {
      const f = i / 15;
      rectfill(320 + i * 18, 140, 338 + i * 18, 170,
               colorScale(rgba8(255, 120, 60, 255), f));
   }

   // frac visualized as a repeating bar
   for (let i = 0; i < 200; i++) {
      const v = frac(i / 40);
      const h = Math.floor(v * 50);
      pset(100 + i, 250 - h, hslColor(i * 2, 0.8, 0.5, 220));
   }

   // tickRandomTrigger with 0.5 chance — draw random dots
   const rt = createRandomTrigger(0.5);
   for (let i = 0; i < 30; i++) {
      if (tickRandomTrigger(rt)) {
         pset(20 + i * 8, 280, rgba8(255, 200, 80, 255));
      } else {
         pset(20 + i * 8, 280, rgba8(80, 80, 120, 180));
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
