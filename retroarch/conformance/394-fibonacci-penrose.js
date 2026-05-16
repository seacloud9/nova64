// Conformance cart 394: drawFibonacci, drawPenrose, drawSandDune, fillSandDune.

let errors = [];

export function init() {
   if (typeof drawFibonacci !== 'function') { errors.push('drawFibonacci-missing'); return; }
   if (typeof drawPenrose   !== 'function') { errors.push('drawPenrose-missing');   return; }
   if (typeof drawSandDune  !== 'function') { errors.push('drawSandDune-missing');  return; }
   if (typeof fillSandDune  !== 'function') { errors.push('fillSandDune-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('394 FIBONACCI PENROSE DUNE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Fibonacci spirals
   drawFibonacci(130, 180, 90, rgba8(100, 220, 255, 255));
   drawFibonacci(320, 180, 70, rgba8(255, 180, 60, 220));

   // Penrose-like patterns
   drawPenrose(490, 180, 80, rgba8(180, 255, 100, 255));

   // Sand dunes
   fillSandDune(20, 285, 580, 60, 2, rgba8(220, 180, 80, 220));
   fillSandDune(20, 305, 580, 50, 3, rgba8(200, 160, 60, 180));
   drawSandDune(20, 285, 580, 60, 2, rgba8(255, 220, 120, 200));
   fillSandDune(20, 320, 580, 40, 4, rgba8(180, 140, 50, 160));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
