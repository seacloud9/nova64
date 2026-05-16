// Conformance cart 217: drawStar and fillStar(cx,cy,outerR,innerR,points,color).

let errors = [];

export function init() {
   if (typeof drawStar !== 'function') { errors.push('drawStar-missing'); return; }
   if (typeof fillStar !== 'function') { errors.push('fillStar-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('217 DRAW/FILL STAR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Different point counts — outlines
   const ptCounts = [3, 4, 5, 6, 7, 8];
   for (let i = 0; i < 6; i++) {
      const cx2 = 60 + i * 92, cy2 = 90;
      drawStar(cx2, cy2, 36, 16, ptCounts[i], rgba8(100, 200, 255, 255));
      print('' + ptCounts[i] + 'pt', cx2 - 8, cy2 + 42, rgba8(140, 180, 220, 255));
   }

   // Filled stars with outline
   for (let i = 0; i < 6; i++) {
      const cx2 = 60 + i * 92, cy2 = 215;
      fillStar(cx2, cy2, 36, 14, ptCounts[i], rgba8(200, 140, 40, 255));
      drawStar(cx2, cy2, 36, 14, ptCounts[i], rgba8(255, 220, 100, 255));
   }

   // Nested stars (star rating)
   for (let i = 0; i < 5; i++) {
      fillStar(40 + i * 52, 295, 18, 7, 5, rgba8(220, 180, 40, 255));
      drawStar(40 + i * 52, 295, 18, 7, 5, rgba8(255, 230, 100, 255));
   }
   print('star rating', 300, 288, rgba8(160, 200, 240, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
