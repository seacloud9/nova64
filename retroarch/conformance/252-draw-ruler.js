// Conformance cart 252: drawRuler(x, y, len, vertical, step, color).

let errors = [];

export function init() {
   if (typeof drawRuler !== 'function') { errors.push('drawRuler-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 14, 24, 255));
   print('252 DRAW RULER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal rulers at different scales
   drawRuler(20,  60,  600, 0, 10,  rgba8(180, 220, 255, 255));
   drawRuler(20,  90,  600, 0, 20,  rgba8(100, 200, 140, 255));
   drawRuler(20, 120,  600, 0, 50,  rgba8(255, 180, 80,  255));
   drawRuler(20, 150,  300, 0, 5,   rgba8(200, 100, 255, 255));

   // Vertical rulers
   drawRuler(40,  180, 150, 1, 10,  rgba8(180, 220, 255, 255));
   drawRuler(80,  180, 150, 1, 20,  rgba8(100, 200, 140, 255));
   drawRuler(120, 180, 150, 1, 30,  rgba8(255, 180, 80,  255));

   // Labels
   print('step 10', 22,  66, rgba8(140, 160, 200, 255));
   print('step 20', 22,  96, rgba8(140, 160, 200, 255));
   print('step 50', 22, 126, rgba8(140, 160, 200, 255));
   print('step 5',  22, 156, rgba8(140, 160, 200, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
