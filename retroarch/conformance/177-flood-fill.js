// Conformance cart 177: floodFill(x, y, color).

let errors = [];

export function init() {
   if (typeof floodFill !== 'function') { errors.push('floodFill-missing'); return; }
   // Out-of-bounds must not crash
   floodFill(-10, -10, rgba8(255, 0, 0, 255));
   floodFill(9999, 9999, rgba8(255, 0, 0, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('177 FLOOD FILL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw three closed shapes and flood-fill them
   // Rectangle
   rect(30, 60, 110, 130, rgba8(120, 140, 200, 255));
   floodFill(70, 95, rgba8(40, 80, 180, 255));

   // Circle
   circ(180, 95, 36, rgba8(120, 200, 120, 255));
   floodFill(180, 95, rgba8(40, 160, 60, 255));

   // Triangle (manually drawn)
   line(260, 130, 310, 60, rgba8(200, 140, 80, 255));
   line(310, 60, 360, 130, rgba8(200, 140, 80, 255));
   line(260, 130, 360, 130, rgba8(200, 140, 80, 255));
   floodFill(310, 105, rgba8(180, 100, 30, 255));

   print('3 filled shapes', 8, 145, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
