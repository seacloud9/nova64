// Conformance cart 297: drawParallelogram, fillParallelogram, drawTrapezoid, fillTrapezoid.

let errors = [];

export function init() {
   if (typeof drawParallelogram !== 'function') { errors.push('drawParallelogram-missing'); return; }
   if (typeof fillParallelogram !== 'function') { errors.push('fillParallelogram-missing'); return; }
   if (typeof drawTrapezoid     !== 'function') { errors.push('drawTrapezoid-missing');     return; }
   if (typeof fillTrapezoid     !== 'function') { errors.push('fillTrapezoid-missing');     return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('297 PARA TRAP', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Parallelograms
   drawParallelogram(20, 50, 120, 60, 30, rgba8(100, 200, 255, 255));
   fillParallelogram(180, 50, 120, 60, 25, rgba8(60, 140, 220, 255));
   fillParallelogram(340, 50, 120, 60, -20, rgba8(200, 100, 60, 255));
   drawParallelogram(500, 50, 100, 60, -30, rgba8(180, 255, 100, 255));

   // Trapezoids
   drawTrapezoid(20, 160, 100, 160, 60, rgba8(255, 180, 60, 255));   // wider bottom
   fillTrapezoid(200, 160, 120, 60,  60, rgba8(200, 60, 200, 255));  // narrower bottom
   fillTrapezoid(380, 160, 80,  140, 60, rgba8(60, 200, 180, 255));  // wider bottom
   drawTrapezoid(520, 160, 80,  40,  60, rgba8(180, 100, 255, 255));

   // 3D box effect with parallelogram
   fillParallelogram(200, 250, 140, 80, 40, rgba8(60, 100, 180, 255));   // left face
   fillParallelogram(340, 250, 120, 80, 40, rgba8(40, 70, 140, 255));    // right face
   fillTrapezoid(240, 210, 140, 120, 40, rgba8(80, 140, 220, 255));       // top face
   drawParallelogram(200, 250, 140, 80, 40, rgba8(100, 160, 255, 200));
   drawParallelogram(340, 250, 120, 80, 40, rgba8(80, 120, 220, 200));
   drawTrapezoid(240, 210, 140, 120, 40, rgba8(120, 180, 255, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
