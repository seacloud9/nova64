// Conformance cart 170: colorRainbow(t) / colorTemperature(t).

let errors = [];

export function init() {
   if (typeof colorRainbow      !== 'function') { errors.push('colorRainbow-missing');      return; }
   if (typeof colorTemperature  !== 'function') { errors.push('colorTemperature-missing');  return; }

   const r0 = colorRainbow(0);
   if (typeof r0 !== 'number') errors.push('colorRainbow-not-number');
   const r1 = colorRainbow(1);
   if (typeof r1 !== 'number') errors.push('colorRainbow-1-not-number');

   const t0 = colorTemperature(0);
   if (typeof t0 !== 'number') errors.push('colorTemperature-not-number');
   const t1 = colorTemperature(1);
   if (typeof t1 !== 'number') errors.push('colorTemperature-1-not-number');

   // At t=0 rainbow should be reddish (R > G,B)
   if (colorR(r0) < 100) errors.push('colorRainbow-0-red: ' + colorR(r0));

   // colorTemperature(0)=cold=blue: B channel dominant
   if (colorB(t0) < colorR(t0)) errors.push('colorTemperature-0-not-blue: B=' + colorB(t0) + ' R=' + colorR(t0));
   // colorTemperature(1)=hot=red: R channel dominant
   if (colorR(t1) < colorB(t1)) errors.push('colorTemperature-1-not-red: R=' + colorR(t1) + ' B=' + colorB(t1));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('170 COLOR MAPS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const steps = 60;
   const w = 4;
   for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      rectfill(20 + i * w, 60,  20 + i * w + w, 90,  colorRainbow(t));
      rectfill(20 + i * w, 100, 20 + i * w + w, 130, colorTemperature(t));
   }
   print('rainbow', 20, 40, rgba8(180, 220, 255, 255));
   print('temperature', 20, 136, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
