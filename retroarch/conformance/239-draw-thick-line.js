// Conformance cart 239: drawThickLine(x1,y1,x2,y2,w,color).

let errors = [];

export function init() {
   if (typeof drawThickLine !== 'function') { errors.push('drawThickLine-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('239 DRAW THICK LINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Different widths — horizontal
   const widths = [1, 2, 4, 6, 10, 16];
   for (let i = 0; i < widths.length; i++) {
      drawThickLine(30, 50 + i * 30, 300, 50 + i * 30, widths[i], rgba8(100, 200, 255, 255));
      print('w' + widths[i], 310, 44 + i * 30, rgba8(140, 180, 220, 255));
   }

   // Diagonal thick lines
   drawThickLine(360, 50, 500, 200, 4,  rgba8(255, 160, 60, 255));
   drawThickLine(500, 50, 360, 200, 8,  rgba8(180, 255, 100, 255));
   drawThickLine(540, 60, 600, 200, 12, rgba8(255, 100, 180, 255));

   // Thick line grid
   for (let i = 0; i < 4; i++) {
      drawThickLine(20 + i * 60, 240, 20 + i * 60, 330, 3, rgba8(60, 140, 220, 200));
      drawThickLine(20, 240 + i * 30, 230, 240 + i * 30, 3, rgba8(60, 140, 220, 200));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
