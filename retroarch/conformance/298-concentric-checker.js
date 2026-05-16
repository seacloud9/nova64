// Conformance cart 298: drawConcentricPolygons, fillCheckerCircle, colorFromRandom.

let errors = [];

export function init() {
   if (typeof drawConcentricPolygons !== 'function') { errors.push('drawConcentricPolygons-missing'); return; }
   if (typeof fillCheckerCircle      !== 'function') { errors.push('fillCheckerCircle-missing');      return; }
   if (typeof colorFromRandom        !== 'function') { errors.push('colorFromRandom-missing');        return; }

   // colorFromRandom: same seed = same color
   const c1 = colorFromRandom(42);
   const c2 = colorFromRandom(42);
   if (c1 !== c2) errors.push('cfrandom-deterministic');
   // different seeds should differ
   const c3 = colorFromRandom(43);
   if (c1 === c3) errors.push('cfrandom-same-diff-seeds');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('298 CONCENTRIC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Concentric polygons at various side counts
   drawConcentricPolygons(100, 180, 3, 80, 5, 12, rgba8(100, 200, 255, 255));
   drawConcentricPolygons(280, 180, 4, 75, 5, 10, rgba8(255, 180, 60,  255));
   drawConcentricPolygons(450, 180, 6, 80, 6, 10, rgba8(180, 255, 100, 255));
   drawConcentricPolygons(580, 180, 8, 50, 4, 8,  rgba8(255, 100, 200, 255));

   // Checker circles
   fillCheckerCircle(100, 310, 55, 10, rgba8(200, 220, 255, 255), rgba8(30, 60, 120, 255));
   fillCheckerCircle(220, 310, 45, 8,  rgba8(255, 200, 80, 255),  rgba8(120, 60, 20, 255));
   fillCheckerCircle(330, 310, 40, 6,  rgba8(100, 255, 140, 255), rgba8(20, 80, 40, 255));

   // Random color grid
   for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 5; j++) {
         const col = colorFromRandom(i*5+j+1);
         rectfill(420+i*10, 290+j*12, 428+i*10, 300+j*12, col);
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
