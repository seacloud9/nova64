// Conformance cart 324: screenDither, drawGlow.

let errors = [];

export function init() {
   if (typeof screenDither !== 'function') { errors.push('screenDither-missing'); return; }
   if (typeof drawGlow     !== 'function') { errors.push('drawGlow-missing');     return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   print('324 DITHER GLOW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Glow demo: dark background with glowing orbs
   rectfill(20, 40, 300, 200, rgba8(2, 2, 10, 255));
   drawGlow(80,  120, 50, rgba8(255, 80,  80,  255));
   drawGlow(160, 120, 45, rgba8(80,  255, 100, 255));
   drawGlow(240, 120, 55, rgba8(80,  120, 255, 255));
   circfill(80,  120, 8, rgba8(255, 200, 200, 255));
   circfill(160, 120, 8, rgba8(200, 255, 200, 255));
   circfill(240, 120, 8, rgba8(200, 200, 255, 255));

   // Dither demo on right panel
   for (let ys = 40; ys < 200; ys++) {
      for (let xv = 320; xv < 600; xv++) {
         const t = (xv - 320) / 280;
         pset(xv, ys, rgba8(
            (t * 200) | 0,
            ((1 - t) * 180) | 0,
            100, 255
         ));
      }
   }
   setClip(320, 40, 280, 160);
   screenDither(4);
   clearClip();
   print('dithered', 330, 45, rgba8(200, 200, 200, 200));
   print('gradient', 330, 205, rgba8(200, 200, 200, 200));

   // Reference gradient (no dither)
   for (let ys = 210; ys < 340; ys++) {
      for (let xv = 320; xv < 600; xv++) {
         const t = (xv - 320) / 280;
         pset(xv, ys, rgba8((t * 200) | 0, ((1 - t) * 180) | 0, 100, 255));
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
