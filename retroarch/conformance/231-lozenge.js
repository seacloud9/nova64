// Conformance cart 231: drawLozenge and fillLozenge(cx,cy,w,h,color).

let errors = [];

export function init() {
   if (typeof drawLozenge !== 'function') { errors.push('drawLozenge-missing'); return; }
   if (typeof fillLozenge !== 'function') { errors.push('fillLozenge-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('231 LOZENGE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Outline lozenges — different aspect ratios
   drawLozenge(80,  100, 80,  80,  rgba8(100, 200, 255, 255));  // square
   drawLozenge(220, 100, 120, 60,  rgba8(255, 160, 60,  255));  // wide
   drawLozenge(360, 100, 60,  100, rgba8(180, 255, 100, 255));  // tall
   drawLozenge(490, 100, 100, 100, rgba8(255, 100, 180, 255));  // large

   // Filled lozenges
   fillLozenge(80,  220, 80,  80,  rgba8(40, 120, 200, 255));
   drawLozenge(80,  220, 80,  80,  rgba8(100, 200, 255, 255));
   fillLozenge(220, 220, 120, 60,  rgba8(180, 100, 30, 255));
   drawLozenge(220, 220, 120, 60,  rgba8(255, 180, 80, 255));
   fillLozenge(360, 220, 60,  100, rgba8(80, 160, 40, 255));
   drawLozenge(360, 220, 60,  100, rgba8(160, 255, 80, 255));

   // Card suit diamond
   fillLozenge(500, 220, 60, 80, rgba8(200, 40, 40, 255));

   // Small tiles
   for (let i = 0; i < 8; i++) {
      const c = rgba8(60 + i*20, 120 + i*10, 200 - i*10, 255);
      fillLozenge(30 + i * 68, 310, 50, 50, c);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
