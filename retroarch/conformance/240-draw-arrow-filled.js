// Conformance cart 240: drawArrowFilled(x1,y1,x2,y2,hw,hl,color).

let errors = [];

export function init() {
   if (typeof drawArrowFilled !== 'function') { errors.push('drawArrowFilled-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('240 DRAW ARROW FILLED', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // 4 directions
   drawArrowFilled(100, 140,  200, 140,  8, 14, rgba8(100, 200, 255, 255)); // right
   drawArrowFilled(200, 80,   200, 160,  8, 14, rgba8(255, 160, 60,  255)); // down
   drawArrowFilled(300, 100,  220, 100,  8, 14, rgba8(180, 255, 100, 255)); // left
   drawArrowFilled(300, 180,  300, 80,   8, 14, rgba8(255, 100, 180, 255)); // up

   // Different head sizes
   const heads = [4, 8, 12, 18, 24];
   for (let i = 0; i < 5; i++) {
      const hw = heads[i], hl = heads[i] * 1.5;
      drawArrowFilled(380, 80 + i * 36, 530, 80 + i * 36, hw, hl, rgba8(200, 100, 255, 255));
      print('hw' + hw, 542, 74 + i * 36, rgba8(140, 180, 220, 255));
   }

   // Diagonal arrows
   drawArrowFilled(40, 240, 160, 320, 6, 12, rgba8(60, 200, 255, 255));
   drawArrowFilled(160, 240, 40, 320, 6, 12, rgba8(255, 200, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
