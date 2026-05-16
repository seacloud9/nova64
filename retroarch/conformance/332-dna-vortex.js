// Conformance cart 332: drawDNA, fillDNA, drawVortex.

let errors = [];

export function init() {
   if (typeof drawDNA    !== 'function') { errors.push('drawDNA-missing');    return; }
   if (typeof fillDNA    !== 'function') { errors.push('fillDNA-missing');    return; }
   if (typeof drawVortex !== 'function') { errors.push('drawVortex-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   print('332 DNA VORTEX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // DNA strands
   drawDNA(100, 180, 28, 3, 140, rgba8(100, 200, 255, 255));
   fillDNA(240, 180, 25, 4, 130, rgba8(180, 255, 100, 255));
   drawDNA(380, 180, 22, 5, 120, rgba8(255, 160, 60,  255));

   // Vortexes
   drawVortex(500, 140, 55, 3, rgba8(200, 100, 255, 220));
   drawVortex(570, 260, 40, 5, rgba8(100, 220, 255, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
