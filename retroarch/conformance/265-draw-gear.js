// Conformance cart 265: drawGear, fillGear.

let errors = [];

export function init() {
   if (typeof drawGear !== 'function') { errors.push('drawGear-missing'); return; }
   if (typeof fillGear !== 'function') { errors.push('fillGear-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('265 DRAW GEAR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Outline gears
   drawGear(120, 120, 70, 12, 10, rgba8(180, 200, 240, 255));
   drawGear(260, 120, 45, 8,  8,  rgba8(140, 180, 220, 220));
   drawGear(360, 120, 30, 6,  6,  rgba8(100, 160, 200, 200));

   // Filled gears
   fillGear(120, 280, 65, 10, 10, rgba8(60,  120, 200, 255));
   fillGear(255, 280, 40, 8,  7,  rgba8(80,  180, 120, 255));
   fillGear(340, 280, 25, 6,  5,  rgba8(200, 100, 60,  255));

   // Small gear cluster
   fillGear(480, 150, 50, 10, 8,  rgba8(80,  140, 220, 255));
   fillGear(560, 130, 30, 6,  6,  rgba8(220, 120, 60,  255));
   fillGear(570, 200, 25, 5,  5,  rgba8(100, 220, 80,  255));

   // Gear with center hole
   fillGear(520, 290, 40, 8, 7, rgba8(160, 180, 220, 255));
   circfill(520, 290, 14, rgba8(10, 12, 20, 255));
   circ(520, 290, 14, rgba8(180, 200, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
