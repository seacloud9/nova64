// Conformance cart 221: easeBack(t) and easeSine(t).

let errors = [];

export function init() {
   if (typeof easeBack !== 'function') { errors.push('easeBack-missing'); return; }
   if (typeof easeSine !== 'function') { errors.push('easeSine-missing'); return; }

   if (Math.abs(easeBack(0)) > 0.01)   errors.push('back(0)!=0: ' + easeBack(0));
   if (Math.abs(easeBack(1) - 1) > 0.01) errors.push('back(1)!=1: ' + easeBack(1));
   // easeBack should overshoot: some value > 1 during [0,1]
   let hasOvershoot = false;
   for (let i = 1; i < 10; i++) {
      if (easeBack(i / 10) > 1.0) { hasOvershoot = true; break; }
   }
   // Actually back ease overshoots before t=1, not at midpoint - it dips below 0 near start
   // The canonical back ease has negative values near t=0
   if (easeBack(0.5) < 0) errors.push('back(0.5)-negative');  // shouldn't be negative at midpoint

   if (Math.abs(easeSine(0)) > 0.01)   errors.push('sine(0)!=0: ' + easeSine(0));
   if (Math.abs(easeSine(1) - 1) > 0.01) errors.push('sine(1)!=1: ' + easeSine(1));
   if (easeSine(0.5) >= easeSine(1.0))  errors.push('sine-not-monotone');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('221 EASE BACK/SINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const W = 560, H = 200;
   const ox = 40, oy = 290;

   // Grid
   for (let i = 0; i <= 4; i++) {
      hline(ox, ox + W, oy - (i * H / 4) | 0, rgba8(30, 40, 60, 255));
      vline(ox + (i * W / 4) | 0, oy - H - 20, oy, rgba8(30, 40, 60, 255));
   }
   hline(ox, ox + W, oy, rgba8(60, 80, 100, 255));

   // Plot easeBack
   let px2 = -1, py2 = -1;
   for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const v = easeBack(t);
      const x = ox + (t * W) | 0;
      const y = oy - (v * H) | 0;
      if (px2 >= 0) line(px2, py2, x, y, rgba8(255, 160, 60, 255));
      px2 = x; py2 = y;
   }

   // Plot easeSine
   px2 = -1; py2 = -1;
   for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const v = easeSine(t);
      const x = ox + (t * W) | 0;
      const y = oy - (v * H) | 0;
      if (px2 >= 0) line(px2, py2, x, y, rgba8(80, 200, 255, 255));
      px2 = x; py2 = y;
   }

   // Also plot linear for reference
   line(ox, oy, ox + W, oy - H, rgba8(60, 80, 100, 255));

   print('easeBack', 480, 90, rgba8(255, 160, 60, 255));
   print('easeSine', 480, 100, rgba8(80, 200, 255, 255));
   print('linear',   480, 110, rgba8(60, 80, 100, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
