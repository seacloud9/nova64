// Conformance cart 370: screenSepia2, colorFromHex, easeElastic2, clampXY, screenMirror.

let errors = [];

export function init() {
   if (typeof screenSepia2  !== 'function') { errors.push('screenSepia2-missing');  return; }
   if (typeof colorFromHex  !== 'function') { errors.push('colorFromHex-missing');  return; }
   if (typeof easeElastic2  !== 'function') { errors.push('easeElastic2-missing');  return; }
   if (typeof clampXY       !== 'function') { errors.push('clampXY-missing');       return; }
   if (typeof screenMirror  !== 'function') { errors.push('screenMirror-missing');  return; }

   // colorFromHex
   const red = colorFromHex('#FF0000');
   const rr = (red >>> 24) & 0xFF;
   if (rr < 250) errors.push('fromHex-r:' + rr);

   const green = colorFromHex('00FF00FF');
   const gr = (green >>> 16) & 0xFF;
   if (gr < 250) errors.push('fromHex-g:' + gr);

   // easeElastic2: at t=0 returns 0, at t=1 returns 1
   const e0 = easeElastic2(0);
   const e1 = easeElastic2(1);
   if (Math.abs(e0) > 0.01) errors.push('elastic2-0:' + e0);
   if (Math.abs(e1 - 1) > 0.01) errors.push('elastic2-1:' + e1);

   // clampXY
   const pt = clampXY(150, -20, 0, 0, 100, 100);
   if (pt[0] !== 100) errors.push('clamp-x:' + pt[0]);
   if (pt[1] !== 0)   errors.push('clamp-y:' + pt[1]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 20, 255));
   print('370 SEPIA HEX EASE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // colorFromHex swatches
   const hexColors = ['#FF4444', '#44FF44', '#4444FF', '#FFAA00', '#AA44FF', '#44FFAA'];
   for (let i = 0; i < hexColors.length; i++) {
      rectfill(20 + i * 50, 40, 68 + i * 50, 80, colorFromHex(hexColors[i]));
   }

   // easeElastic2 curve
   for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const ev = easeElastic2(t);
      pset(20 + i, 160 - (ev * 50) | 0, colorFromHSL(t * 200 + 60, 0.8, 0.6));
   }
   print('easeElastic2', 20, 170, rgba8(160, 160, 200, 200));

   // clampXY: bouncing point within rect
   const pts2 = [[150, 50], [220, 80], [50, 120], [300, 10], [180, 200]];
   for (const pt of pts2) {
      const cp = clampXY(pt[0], pt[1], 280, 40, 400, 200);
      pset(pt[0] + 220, pt[1] + 180, rgba8(255, 100, 100, 255));
      pset(cp[0], cp[1] + 180, rgba8(100, 255, 100, 255));
      line(pt[0] + 220, pt[1] + 180, cp[0], cp[1] + 180, rgba8(200, 200, 200, 100));
   }
   rect(500, 220, 620, 380, rgba8(100, 100, 200, 200));

   // Sepia on scene
   rectfill(310, 270, 490, 355, rgba8(10, 30, 80, 255));
   circfill(360, 310, 25, rgba8(200, 100, 60, 255));
   circfill(430, 310, 20, rgba8(60, 200, 80, 255));
   setClip(310, 270, 180, 85);
   screenSepia2(0.8);
   clearClip();
   print('sepia', 315, 358, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
