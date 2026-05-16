// Conformance cart 234: easeExpo(t) and easePower(t,p).

let errors = [];

export function init() {
   if (typeof easeExpo !== 'function')  { errors.push('easeExpo-missing'); return; }
   if (typeof easePower !== 'function') { errors.push('easePower-missing'); return; }

   if (easeExpo(0) !== 0)   errors.push('expo(0): ' + easeExpo(0));
   if (easeExpo(1) !== 1)   errors.push('expo(1): ' + easeExpo(1));
   if (easeExpo(0.5) < 0.03 || easeExpo(0.5) > 0.1) errors.push('expo(0.5): ' + easeExpo(0.5));

   if (Math.abs(easePower(0, 2)) > 0.001) errors.push('power(0,2): ' + easePower(0, 2));
   if (Math.abs(easePower(1, 2) - 1) > 0.001) errors.push('power(1,2): ' + easePower(1, 2));
   if (Math.abs(easePower(0.5, 2) - 0.25) > 0.01) errors.push('power(0.5,2): ' + easePower(0.5, 2));
   if (Math.abs(easePower(0.5, 1) - 0.5) > 0.01) errors.push('power(0.5,1): ' + easePower(0.5, 1));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('234 EASE EXPO/POWER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const W = 560, H = 200, ox = 40, oy = 280;

   // Grid
   for (let i = 0; i <= 4; i++) {
      hline(ox, ox + W, oy - (i * H / 4) | 0, rgba8(30, 40, 60, 255));
   }
   hline(ox, ox + W, oy, rgba8(60, 80, 100, 255));
   vline(ox, oy - H - 10, oy, rgba8(60, 80, 100, 255));

   // easeExpo
   let px2 = -1, py2 = -1;
   for (let i = 0; i <= 100; i++) {
      const t = i / 100, v = easeExpo(t);
      const x = ox + (t * W) | 0, y = oy - (v * H) | 0;
      if (px2 >= 0) line(px2, py2, x, y, rgba8(255, 100, 60, 255));
      px2 = x; py2 = y;
   }

   // easePower at p=0.5, 1, 2, 3
   const powers = [0.5, 1, 2, 3];
   const pColors = [
      rgba8(60, 200, 255, 255), rgba8(140, 140, 140, 255),
      rgba8(100, 220, 100, 255), rgba8(200, 100, 255, 255),
   ];
   for (let pi = 0; pi < 4; pi++) {
      px2 = -1; py2 = -1;
      for (let i = 0; i <= 100; i++) {
         const t = i / 100, v = easePower(t, powers[pi]);
         const x = ox + (t * W) | 0, y = oy - (v * H) | 0;
         if (px2 >= 0) line(px2, py2, x, y, pColors[pi]);
         px2 = x; py2 = y;
      }
   }

   print('expo', 530, 35, rgba8(255, 100, 60, 255));
   print('p0.5', 530, 46, pColors[0]);
   print('p1',   530, 57, pColors[1]);
   print('p2',   530, 68, pColors[2]);
   print('p3',   530, 79, pColors[3]);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
