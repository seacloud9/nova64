// Conformance cart 197: drawProgressBar(x,y,w,h, t, fgColor, bgColor) + drawMeter.

let errors = [];

export function init() {
   if (typeof drawProgressBar !== 'function') { errors.push('drawProgressBar-missing'); return; }
   if (typeof drawMeter       !== 'function') { errors.push('drawMeter-missing');       return; }
   // Must not crash on degenerate values
   drawProgressBar(0, 0, 0, 0, 0.5, rgba8(0,255,0,255), rgba8(0,0,0,255));
   drawProgressBar(0, 0, 100, 10, -1, rgba8(0,255,0,255), rgba8(0,0,0,255));
   drawProgressBar(0, 0, 100, 10,  2, rgba8(0,255,0,255), rgba8(0,0,0,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('197 PROGRESS BAR', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Animated progress bars
   const pcts = [0.25, 0.5, 0.75, 1.0];
   for (let i = 0; i < pcts.length; i++) {
      const y0 = 40 + i * 20;
      drawProgressBar(40, y0, 200, 12, pcts[i],
         rgba8(60 + i * 50, 160 + i * 20, 80, 255), rgba8(20, 30, 50, 255));
      print(Math.round(pcts[i] * 100) + '%', 248, y0 + 2, rgba8(180, 200, 255, 255));
   }

   // Animated meter
   const val = Math.sin(t) * 0.5 + 0.5;
   drawMeter(40, 130, 200, 14, val, 0, 1,
      colorHSV(val * 120, 200, 200, 255), rgba8(20, 30, 50, 255));
   print(percentStr(val), 248, 132, rgba8(180, 200, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
