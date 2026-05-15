// Conformance cart 151: fillCircleGradient(cx, cy, r, colorCenter, colorEdge).

let errors = [];

export function init() {
   if (typeof fillCircleGradient !== 'function') {
      errors.push('fillCircleGradient-missing');
   }
   fillCircleGradient(160, 120, 0, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255));
   fillCircleGradient(160, 120, -5, rgba8(255, 255, 255, 255), rgba8(0, 0, 0, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('151 CIRCLE GRADIENT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   fillCircleGradient(160, 130, 80, rgba8(255, 220, 100, 255), rgba8(60, 20, 80, 255));
   fillCircleGradient(80, 100, 35, rgba8(100, 220, 255, 255), rgba8(10, 40, 100, 255));
   fillCircleGradient(240, 160, 25, rgba8(255, 80, 60, 255), rgba8(80, 10, 10, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
