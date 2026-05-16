// Conformance cart 222: drawHexCell and fillHexCell(cx,cy,r,color).

let errors = [];

export function init() {
   if (typeof drawHexCell !== 'function') { errors.push('drawHexCell-missing'); return; }
   if (typeof fillHexCell !== 'function') { errors.push('fillHexCell-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('222 HEX CELL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hex grid using fillHexCell + drawHexCell
   const r = 24;
   const rows = 6, cols = 10;
   const dxRow = r * Math.sqrt(3);
   const dyCol = r * 1.5;
   for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
         const cx2 = 36 + col * dxRow + (row % 2) * (dxRow / 2);
         const cy2 = 50 + row * dyCol;
         const hue = (row * cols + col) * 20;
         const brightness = 60 + (row * cols + col) * 4;
         const fill = rgba8(
            40 + (Math.sin(hue * Math.PI / 180) * 50 + 50) | 0,
            80 + (Math.cos(hue * Math.PI / 180) * 60 + 60) | 0,
            120 + (Math.sin((hue + 60) * Math.PI / 180) * 50 + 50) | 0, 255);
         fillHexCell(cx2, cy2, r - 1, fill);
         drawHexCell(cx2, cy2, r - 1, rgba8(100, 140, 200, 255));
      }
   }

   // Different sizes
   const sizes = [6, 10, 16, 22, 30];
   for (let i = 0; i < sizes.length; i++) {
      fillHexCell(100 + i * 100, 300, sizes[i], rgba8(60, 140, 220, 255));
      drawHexCell(100 + i * 100, 300, sizes[i], rgba8(140, 200, 255, 255));
      print('r' + sizes[i], 90 + i * 100, 316 + sizes[i], rgba8(140, 180, 220, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
