// Conformance cart 223: drawXMark and fillXMark(cx,cy,size,w,color).

let errors = [];

export function init() {
   if (typeof drawXMark !== 'function') { errors.push('drawXMark-missing'); return; }
   if (typeof fillXMark !== 'function') { errors.push('fillXMark-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('223 X MARK', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Outline X marks — different sizes
   const sizes = [6, 10, 14, 20, 28];
   for (let i = 0; i < sizes.length; i++) {
      drawXMark(70 + i * 110, 90, sizes[i], rgba8(100, 200, 255, 255));
      print('s' + sizes[i], 60 + i * 110, 122, rgba8(140, 180, 220, 255));
   }

   // Filled X marks — various widths
   const widths = [1, 2, 3, 5, 8];
   for (let i = 0; i < widths.length; i++) {
      fillXMark(70 + i * 110, 200, 20, widths[i], rgba8(255, 160, 60, 255));
      print('w' + widths[i], 58 + i * 110, 228, rgba8(140, 180, 220, 255));
   }

   // X over colored background (close button style)
   for (let i = 0; i < 5; i++) {
      const x = 50 + i * 106;
      circfill(x, 295, 20, rgba8(200 - i*30, 60, 60, 255));
      fillXMark(x, 295, 12, 3, rgba8(255, 255, 255, 255));
   }
   print('close buttons', 40, 322, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
