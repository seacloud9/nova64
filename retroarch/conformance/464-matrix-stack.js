// Conformance cart 464: pushMatrix, popMatrix, translate, rotate, scale2d, resetMatrix.

let errors = [];

export function init() {
   const needed = ['pushMatrix', 'popMatrix', 'translate', 'rotate', 'scale2d', 'resetMatrix'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('464 MATRIX STACK', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Identity — rect at fixed position
   resetMatrix();
   rectfill(20, 30, 80, 60, rgba8(100, 200, 100, 255));

   // Translate
   pushMatrix();
   translate(100, 0);
   rectfill(20, 30, 80, 60, rgba8(200, 100, 100, 255));
   popMatrix();

   // Nested push/pop
   pushMatrix();
   translate(220, 30);
   rectfill(0, 0, 60, 30, rgba8(100, 100, 200, 255));
   pushMatrix();
   translate(70, 0);
   rectfill(0, 0, 60, 30, rgba8(200, 200, 100, 255));
   popMatrix();
   rectfill(0, 35, 60, 65, rgba8(200, 100, 200, 255));
   popMatrix();

   // Scale
   pushMatrix();
   translate(20, 80);
   scale2d(2, 1);
   rectfill(0, 0, 40, 20, rgba8(80, 220, 220, 255));
   popMatrix();

   // Rotate a box 45deg around its centre
   pushMatrix();
   translate(120, 110);
   rotate(Math.PI * 0.25);
   rectfill(-20, -20, 20, 20, rgba8(255, 160, 60, 200));
   popMatrix();

   // resetMatrix clears to identity
   translate(999, 999);
   resetMatrix();
   rectfill(400, 80, 440, 100, rgba8(80, 255, 80, 255));

   // Row of translated circles
   for (let i = 0; i < 6; i++) {
      pushMatrix();
      translate(20 + i * 60, 140);
      circfill(0, 0, 18, rgba8(180, 80 + i * 28, 255, 200));
      popMatrix();
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
