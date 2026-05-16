// Conformance cart 241: drawCheck(cx,cy,size,color).

let errors = [];

export function init() {
   if (typeof drawCheck !== 'function') { errors.push('drawCheck-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('241 DRAW CHECK', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Different sizes
   const sizes = [8, 14, 20, 28, 40];
   for (let i = 0; i < sizes.length; i++) {
      drawCheck(60 + i * 110, 100, sizes[i], rgba8(80, 220, 100, 255));
      print('s' + sizes[i], 44 + i * 110, 124 + sizes[i] / 2, rgba8(140, 180, 220, 255));
   }

   // Checkbox list
   const items = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];
   const checked = [true, false, true, true, false];
   for (let i = 0; i < 5; i++) {
      const y = 170 + i * 30;
      rectfill(20, y - 8, 36, y + 8, rgba8(30, 40, 80, 255));
      rect(20, y - 8, 36, y + 8, rgba8(100, 130, 200, 255));
      if (checked[i]) drawCheck(28, y, 10, rgba8(80, 220, 100, 255));
      print(items[i], 44, y - 3, rgba8(200, 220, 255, 255));
   }

   print('checkmark symbol', 8, 330, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
