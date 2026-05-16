// Conformance cart 224: drawChevron(x,y,size,dir,color).

let errors = [];

export function init() {
   if (typeof drawChevron !== 'function') { errors.push('drawChevron-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('224 DRAW CHEVRON', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // 4 directions
   const dirs = [0, 1, 2, 3];
   const labels = ['right', 'down', 'left', 'up'];
   const cx2s = [80, 220, 360, 500];
   for (let i = 0; i < 4; i++) {
      drawChevron(cx2s[i], 100, 30, dirs[i], rgba8(100, 200, 255, 255));
      print(labels[i], cx2s[i] - 14, 140, rgba8(140, 180, 220, 255));
   }

   // Different sizes
   const sizes = [6, 10, 16, 24, 36];
   for (let i = 0; i < sizes.length; i++) {
      drawChevron(60 + i * 110, 210, sizes[i], 0, rgba8(255, 160, 60, 255));
      print('s' + sizes[i], 46 + i * 110, 250, rgba8(140, 180, 220, 255));
   }

   // Pagination arrows
   rectfill(20, 290, 80, 320, rgba8(40, 60, 120, 255));
   drawChevron(50, 305, 12, 2, rgba8(200, 220, 255, 255));  // prev
   rectfill(560, 290, 620, 320, rgba8(40, 60, 120, 255));
   drawChevron(590, 305, 12, 0, rgba8(200, 220, 255, 255)); // next
   print('page 1 / 5', 270, 302, rgba8(160, 200, 255, 255));

   // Dropdown chevrons
   for (let i = 0; i < 4; i++) {
      rectfill(140 + i * 80, 286, 210 + i * 80, 322, rgba8(30, 40, 80, 255));
      drawChevron(175 + i * 80, 304, 8, i % 2 == 0 ? 1 : 3, rgba8(160, 200, 255, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
