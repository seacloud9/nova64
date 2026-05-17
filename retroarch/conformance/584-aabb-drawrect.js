// Conformance cart 584: aabb, circleOverlap, drawRect, perpVec2, n64Palette.

let errors = [];

export function init() {
   const needed = ['aabb', 'circleOverlap', 'drawRect', 'perpVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof globalThis['n64Palette'] !== 'object' || globalThis['n64Palette'] === null)
      errors.push('n64Palette-missing');
   if (errors.length > 0) return;

   // aabb — true cases
   if (!aabb(0, 0, 10, 10, 5, 5, 10, 10)) errors.push('aabb-overlap');
   if (!aabb(0, 0, 10, 10, 9, 9, 10, 10)) errors.push('aabb-edge');
   // aabb — false cases
   if (aabb(0, 0, 10, 10, 10, 0, 10, 10)) errors.push('aabb-touch-right');
   if (aabb(0, 0, 10, 10, 0, 10, 10, 10)) errors.push('aabb-touch-bottom');
   if (aabb(0, 0, 5, 5, 20, 20, 5, 5))    errors.push('aabb-separated');

   // circleOverlap — true case
   if (!circleOverlap(0, 0, 5, 3, 0, 5)) errors.push('circle-overlap');
   // circleOverlap — false case
   if (circleOverlap(0, 0, 2, 10, 0, 2)) errors.push('circle-no-overlap');

   // perpVec2
   const p = perpVec2(1, 0);
   if (p.x !== 0 || p.y !== 1) errors.push('perp-right');
   const p2 = perpVec2(0, 1);
   if (p2.x !== -1 || p2.y !== 0) errors.push('perp-up');

   // n64Palette
   if (typeof n64Palette.red !== 'number')   errors.push('palette-red-type');
   if (typeof n64Palette.blue !== 'number')  errors.push('palette-blue-type');
   if (typeof n64Palette.gold !== 'number')  errors.push('palette-gold-type');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('584 AABB DRAWRECT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // drawRect grid
   const keys = ['red','green','blue','yellow','cyan','magenta','orange','purple','teal','brown','grey','gold','silver','sky','white','lightGrey','darkGrey','black'];
   for (let i = 0; i < keys.length; i++) {
      drawRect(20 + (i % 9) * 35, 30 + Math.floor(i / 9) * 25, 30, 20, n64Palette[keys[i]]);
   }

   // aabb visual
   const ra = {x:50, y:100, w:60, h:40};
   const rb = {x:90, y:115, w:60, h:40};
   const hit = aabb(ra.x, ra.y, ra.w, ra.h, rb.x, rb.y, rb.w, rb.h);
   rectfill(ra.x, ra.y, ra.x+ra.w, ra.y+ra.h, rgba8(80,120,200,120));
   rectfill(rb.x, rb.y, rb.x+rb.w, rb.y+rb.h, rgba8(200,80,80,120));
   print(hit ? 'OVERLAP' : 'CLEAR', 160, 115, rgba8(200, 255, 80, 255));

   // circleOverlap visual
   circ(200, 200, 25, rgba8(80, 200, 255, 200));
   circ(230, 200, 15, rgba8(255, 120, 80, 200));
   const co = circleOverlap(200, 200, 25, 230, 200, 15);
   print(co ? 'HIT' : 'MISS', 255, 197, rgba8(200, 255, 80, 255));

   // perpVec2 arrows
   const v = {x: 40, y: 0};
   const p3 = perpVec2(v.x, v.y);
   const ox = 350, oy = 200;
   line(ox, oy, ox + Math.floor(v.x * 0.8), oy, rgba8(80, 200, 255, 255));
   line(ox, oy, ox + Math.floor(p3.x * 0.8), oy + Math.floor(p3.y * 0.8), rgba8(255, 200, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
