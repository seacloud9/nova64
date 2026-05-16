// Conformance cart 186: drawGraph(values, x,y,w,h, minV,maxV, color).

let errors = [];
const samples = [];

export function init() {
   if (typeof drawGraph !== 'function') { errors.push('drawGraph-missing'); return; }
   // Edge: must not crash with fewer than 2 samples
   drawGraph([], 0, 0, 100, 50, 0, 1, rgba8(255,255,255,255));
   drawGraph([0.5], 0, 0, 100, 50, 0, 1, rgba8(255,255,255,255));

   // Build a sine wave dataset
   for (let i = 0; i < 64; i++) {
      samples.push(Math.sin(i / 64 * Math.PI * 4));
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('186 DRAW GRAPH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Axes
   rectfill(20, 50, 300, 180, rgba8(12, 18, 40, 255));
   rect(20, 50, 300, 180, rgba8(60, 80, 140, 255));
   hline(20, 300, 115, rgba8(40, 60, 100, 255));

   drawGraph(samples, 20, 50, 280, 130, -1, 1, rgba8(100, 200, 255, 255));

   // Bar graph below
   const bars = [12, 28, 18, 42, 35, 24, 50, 38];
   const bx = 20, by = 210, bw = 280, bh = 60;
   rectfill(bx, by, bx+bw, by+bh, rgba8(12, 18, 40, 255));
   rect(bx, by, bx+bw, by+bh, rgba8(60, 80, 140, 255));
   drawGraph(bars, bx, by, bw, bh, 0, 55, rgba8(255, 180, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
