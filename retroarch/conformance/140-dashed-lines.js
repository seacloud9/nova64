// Conformance cart 140: drawDashedLine / drawDashedRect.

let errors = [];

export function init() {
   if (typeof drawDashedLine !== 'function') { errors.push('drawDashedLine-missing'); return; }
   if (typeof drawDashedRect !== 'function') { errors.push('drawDashedRect-missing'); return; }
   // Must not crash with degenerate inputs
   drawDashedLine(0, 0, 0, 0, 4, 4, rgba8(255, 255, 255, 255));
   drawDashedRect(0, 0, 0, 0, 4, 4, rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('140 DASHED LINES', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal dashed line
   drawDashedLine(40, 60, 280, 60, 6, 4, rgba8(200, 200, 80, 255));
   // Vertical dashed line
   drawDashedLine(160, 40, 160, 200, 4, 4, rgba8(80, 200, 200, 255));
   // Diagonal dashed line
   drawDashedLine(40, 100, 280, 200, 5, 3, rgba8(200, 100, 200, 255));
   // Dashed rect
   drawDashedRect(80, 120, 240, 200, 8, 4, rgba8(255, 160, 60, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
