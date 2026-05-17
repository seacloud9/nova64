// Conformance cart 525: drawFlash, drawPixelBorder, hslColor, scrollingText,
//                        drawDiamond, poly.

let errors = [];
let t = 0;

export function init() {
   const needed = ['drawFlash', 'drawPixelBorder', 'hslColor', 'scrollingText',
                   'drawDiamond', 'poly'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // hslColor smoke test
   const c = hslColor(0, 1, 0.5, 255);  // pure red = rgba8(255,0,0,255)
   if (typeof c !== 'number') errors.push('hslColor-type');
}

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(8, 10, 28, 255));
   print('525 FLASH POLY HSL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // HSL color row — hue sweep
   for (let i = 0; i < 360; i++) {
      const c = hslColor(i, 0.8, 0.5, 255);
      rectfill(20 + Math.floor(i * 590 / 360), 25, 21 + Math.floor(i * 590 / 360), 40, c);
   }

   // Diamonds — filled and outline
   drawDiamond(80, 90, 40, 25, rgba8(255, 180, 60, 255), true);
   drawDiamond(180, 90, 35, 20, rgba8(80, 200, 255, 255), false);
   drawDiamond(280, 90, 30, 30, rgba8(200, 80, 255, 255), true);

   // Poly — triangle filled
   poly([{x:370,y:70},{x:440,y:110},{x:300,y:110}], rgba8(80, 255, 120, 255), true);
   // Poly — pentagon outline
   const pts = [];
   for (let i = 0; i < 5; i++) {
      const a = deg2rad(i * 72 - 90);
      pts.push({ x: 530 + Math.floor(30 * Math.cos(a)), y: 90 + Math.floor(30 * Math.sin(a)) });
   }
   poly(pts, rgba8(255, 200, 80, 255), false);

   // Pixel borders
   drawPixelBorder(20, 130, 180, 60, rgba8(220, 220, 220, 255), rgba8(60, 60, 60, 255), 2);
   drawPixelBorder(220, 130, 180, 60, rgba8(255, 200, 80, 255), rgba8(100, 60, 0, 255), 3);

   // scrollingText
   scrollingText('BATCH 40  NOVA64  BATCH 40  NOVA64  ', 210, 40, t,
                 rgba8(255, 220, 80, 255), 1, 600);

   // drawFlash — dim overlay pulse
   const fp = pulse(t, 0.5) * 0.15;
   drawFlash(rgba8(200, 180, 255, Math.floor(fp * 255)));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
