// Conformance cart 210: drawRing(cx,cy,r1,r2,color).

let errors = [];

export function init() {
   if (typeof drawRing !== 'function') { errors.push('drawRing-missing'); return; }
   drawRing(0, 0, 0, 0, rgba8(100,100,100,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('210 DRAW RING', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Thin ring
   drawRing(100, 130, 30, 40, rgba8(100, 200, 255, 255));
   print('thin', 78, 176, rgba8(140, 180, 220, 255));

   // Thick ring
   drawRing(240, 130, 20, 50, rgba8(255, 160, 60, 255));
   print('thick', 218, 186, rgba8(140, 180, 220, 255));

   // Colored rings
   const radii = [10, 16, 22, 28, 34, 40];
   const cols = [
      rgba8(255,60,60,255), rgba8(255,160,60,255), rgba8(255,255,60,255),
      rgba8(60,255,60,255), rgba8(60,160,255,255), rgba8(160,60,255,255),
   ];
   for (let i = 0; i < 6; i++) {
      drawRing(440, 140, radii[i], radii[i] + 4, cols[i]);
   }
   print('concentric', 395, 190, rgba8(140, 180, 220, 255));

   // Coin-like
   drawRing(140, 270, 28, 40, rgba8(220, 180, 40, 255));
   circfill(140, 270, 27, rgba8(200, 160, 30, 255));
   print('coin', 122, 316, rgba8(140, 180, 220, 255));

   // Loading indicator
   for (let i = 0; i < 8; i++) {
      const a1 = i * 45, a2 = i * 45 + 36;
      const bright = 60 + i * 24;
      drawRing(350, 270, 20, 34, rgba8(bright, bright, 255, 255));
   }
   print('indicator', 318, 310, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
