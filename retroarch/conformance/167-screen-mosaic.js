// Conformance cart 167: screenMosaic(n) — pixelates screen using n×n blocks.

let errors = [];

export function init() {
   if (typeof screenMosaic !== 'function') { errors.push('screenMosaic-missing'); return; }
   // Degenerate calls must not crash
   screenMosaic(0);
   screenMosaic(-1);
   screenMosaic(1);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('167 SCREEN MOSAIC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw some shapes, then apply mosaic
   for (let i = 0; i < 5; i++) {
      circfill(60 + i * 60, 130, 25,
         rgba8(50 + i * 40, 80 + i * 30, 200 - i * 30, 255));
   }

   const t = nova64.time();
   const n = 4 + Math.floor((Math.sin(t * 0.8) * 0.5 + 0.5) * 12);
   screenMosaic(n);

   print('mosaic n=' + n, 8, 40, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
