// Conformance cart 475: batch 35 combined showcase — matrix stack, noise, curve, ellipse, hsb.

let errors = [];

export function init() {
   const needed = ['pushMatrix', 'popMatrix', 'translate', 'rotate', 'scale2d', 'resetMatrix',
                   'noiseSeed', 'noiseDetail', 'quadCurve', 'ellipse', 'ellipsefill', 'hsb'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 16, 255));
   printBold('475 BATCH 35', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Noise terrain strip
   noiseSeed(123);
   noiseDetail(3, 0.5);
   for (let x = 0; x < 600; x++) {
      const h = Math.floor(noise(x * 0.015) * 60);
      rectfill(20 + x, 200 - h, 21 + x, 200, hsb(120 - h * 1.5, 0.7, 0.6, 200));
   }
   noiseDetail(1, 0.5);

   // HSB rainbow arch via quadCurve
   for (let i = 0; i < 12; i++) {
      quadCurve(60, 330, 320, 120 + i * 6, 580, 330, hsb(i * 30, 0.9, 0.9, 180));
   }

   // Matrix-transformed ellipse grid
   for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
         pushMatrix();
         translate(50 + col * 90, 240 + row * 50);
         rotate(col * 0.3);
         ellipsefill(0, 0, 50, 22, hsb(col * 72 + row * 20, 0.8, 0.8, 180));
         ellipse(0, 0, 50, 22, hsb(col * 72 + row * 20, 0.5, 1.0, 220));
         popMatrix();
      }
   }

   // Scaled + translated squares in corner
   pushMatrix();
   translate(480, 30);
   for (let i = 0; i < 5; i++) {
      pushMatrix();
      scale2d(1.0 - i * 0.15, 1.0 - i * 0.15);
      rectfill(-30, -30, 30, 30, hsb(200 + i * 20, 0.7, 0.8, 160));
      popMatrix();
      rotate(0.1);
   }
   popMatrix();

   // resetMatrix safety
   translate(999, 999);
   resetMatrix();
   rectfill(20, 360, 50, 380, rgba8(80, 255, 80, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
