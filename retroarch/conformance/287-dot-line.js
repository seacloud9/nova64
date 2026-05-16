// Conformance cart 287: drawDotLine.

let errors = [];

export function init() {
   if (typeof drawDotLine !== 'function') { errors.push('drawDotLine-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('287 DOT LINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal dotted lines at different spacings/radii
   drawDotLine(20,  60,  620,  60,  8,  3, rgba8(100, 200, 255, 255));
   drawDotLine(20,  90,  620,  90,  12, 2, rgba8(255, 180, 60,  255));
   drawDotLine(20,  120, 620,  120, 6,  4, rgba8(180, 255, 100, 255));
   drawDotLine(20,  150, 620,  150, 20, 5, rgba8(255, 100, 200, 255));

   // Diagonal dot lines
   drawDotLine(20,  200, 620,  340, 10, 3, rgba8(100, 180, 255, 220));
   drawDotLine(620, 200, 20,   340, 10, 3, rgba8(255, 160, 80,  220));

   // Dot line arc (approximated)
   const cx = 320, cy = 180;
   for (let i = 0; i < 12; i++) {
      const a1 = i / 12 * Math.PI * 2;
      const a2 = (i+1) / 12 * Math.PI * 2;
      const x1 = cx + Math.cos(a1)*120, y1 = cy + Math.sin(a1)*120;
      const x2 = cx + Math.cos(a2)*120, y2 = cy + Math.sin(a2)*120;
      drawDotLine(x1, y1, x2, y2, 6, 2, colorFromHSL(i*30, 0.8, 0.6));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
