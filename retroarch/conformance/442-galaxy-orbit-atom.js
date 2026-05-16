// Conformance cart 442: drawSpiralGalaxy, drawOrbit, drawAtom.

let errors = [];

export function init() {
   if (typeof drawSpiralGalaxy !== 'function') { errors.push('drawSpiralGalaxy-missing'); return; }
   if (typeof drawOrbit        !== 'function') { errors.push('drawOrbit-missing');        return; }
   if (typeof drawAtom         !== 'function') { errors.push('drawAtom-missing');         return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 2, 14, 255));
   print('442 GALAXY ORBIT ATOM', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Spiral galaxy
   drawSpiralGalaxy(170, 190, 120, 2, rgba8(180, 200, 255, 220));

   // Orbiting planets
   drawOrbit(420, 160, 80, Math.PI * 0.3, 8, rgba8(100, 180, 255, 255));
   drawOrbit(420, 160, 50, Math.PI * 1.1, 6, rgba8(255, 200, 80, 255));
   drawOrbit(420, 160, 25, Math.PI * 2.0, 4, rgba8(200, 100, 255, 255));
   // center star
   circfill(420, 160, 10, rgba8(255, 220, 80, 255));

   // Atoms
   drawAtom(530, 290, 55, 3, rgba8(80, 200, 255, 220));
   drawAtom(130, 310, 45, 2, rgba8(255, 160, 80, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
