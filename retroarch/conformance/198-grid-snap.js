// Conformance cart 198: gridSnap(v, gridSize).

let errors = [];

export function init() {
   if (typeof gridSnap !== 'function') { errors.push('gridSnap-missing'); return; }

   if (Math.abs(gridSnap(7, 8) - 8) > 1e-6)   errors.push('gridSnap-7-8: ' + gridSnap(7, 8));
   if (Math.abs(gridSnap(3, 8) - 0) > 1e-6)   errors.push('gridSnap-3-8: ' + gridSnap(3, 8));
   if (Math.abs(gridSnap(0, 16) - 0) > 1e-6)  errors.push('gridSnap-0: '   + gridSnap(0, 16));
   if (Math.abs(gridSnap(16, 16) - 16) > 1e-6) errors.push('gridSnap-16: ' + gridSnap(16,16));
   if (Math.abs(gridSnap(23, 16) - 16) > 1e-6) errors.push('gridSnap-23: ' + gridSnap(23,16));
   if (Math.abs(gridSnap(24, 16) - 32) > 1e-6) errors.push('gridSnap-24: ' + gridSnap(24,16));
   // Zero grid size must not crash
   const v0 = gridSnap(5, 0);
   if (typeof v0 !== 'number') errors.push('gridSnap-zero-grid: ' + typeof v0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('198 GRID SNAP', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const gridSize = 20;
   // Draw grid
   for (let x0 = 20; x0 <= 300; x0 += gridSize) {
      vline(x0, 40, 220, rgba8(40, 60, 100, 255));
   }
   for (let y0 = 40; y0 <= 220; y0 += gridSize) {
      hline(20, 300, y0, rgba8(40, 60, 100, 255));
   }

   // Moving dots: snapped and free
   const t = nova64.time();
   const rawX = 20 + ((t * 30) % 280);
   const rawY = 40 + ((t * 20) % 180);
   const snapX = gridSnap(rawX, gridSize);
   const snapY = gridSnap(rawY, gridSize);

   circfill(rawX,  rawY,  3, rgba8(255, 60, 60, 200));   // free (red)
   circfill(snapX, snapY, 5, rgba8(80, 200, 255, 255));   // snapped (blue)

   print('red=free blue=snapped', 8, 230, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
