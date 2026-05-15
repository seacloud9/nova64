// Conformance cart 120: colorHSV(h, s, v [, a]) — HSV color constructor.

let errors = [];

export function init() {
   if (typeof colorHSV !== 'function') { errors.push('colorHSV-missing'); return; }

   const check = (label, got, expR, expG, expB, tol) => {
      const r = (got >> 24) & 0xff;
      const g = (got >> 16) & 0xff;
      const b = (got >>  8) & 0xff;
      const d = Math.max(Math.abs(r - expR), Math.abs(g - expG), Math.abs(b - expB));
      if (d > tol)
         errors.push(label + ': got ' + r + ',' + g + ',' + b + ' exp ' + expR + ',' + expG + ',' + expB);
   };

   // Pure red: h=0, s=255, v=255
   check('red',    colorHSV(0,   255, 255), 255, 0,   0,   2);
   // Pure green: h=120
   check('green',  colorHSV(120, 255, 255), 0,   255, 0,   2);
   // Pure blue: h=240
   check('blue',   colorHSV(240, 255, 255), 0,   0,   255, 2);
   // Yellow: h=60
   check('yellow', colorHSV(60,  255, 255), 255, 255, 0,   2);
   // White: s=0
   check('white',  colorHSV(0,   0,   255), 255, 255, 255, 2);
   // Black: v=0
   check('black',  colorHSV(0,   255, 0),   0,   0,   0,   2);
   // Hue wrap: h=360 == h=0
   const r360 = colorHSV(360, 255, 255);
   const r0   = colorHSV(0,   255, 255);
   if (r360 !== r0) errors.push('hue 360 != hue 0: ' + r360 + ' vs ' + r0);
   // Alpha channel preserved
   const withAlpha = colorHSV(0, 255, 255, 128);
   if ((withAlpha & 0xff) !== 128) errors.push('alpha not preserved: ' + (withAlpha & 0xff));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('120 COLOR HSV', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw a full hue wheel as a band
   for (let x = 0; x < 320; x++) {
      const h = (x / 320) * 360;
      line(x + 40, 60, x + 40, 90, colorHSV(h, 255, 220));
   }
   print('hue band', 4, 94, rgba8(180, 180, 255, 255));

   // Saturation gradient
   for (let x = 0; x < 200; x++) {
      line(x + 40, 110, x + 40, 130, colorHSV(200, Math.floor(x * 255 / 199), 220));
   }
   print('saturation', 4, 134, rgba8(180, 180, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
