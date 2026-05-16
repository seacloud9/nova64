// Conformance cart 286: colorFromLab, screenZoom, oscillate, pulseValue.

let errors = [];

export function init() {
   if (typeof colorFromLab !== 'function') { errors.push('colorFromLab-missing'); return; }
   if (typeof screenZoom   !== 'function') { errors.push('screenZoom-missing');   return; }
   if (typeof oscillate    !== 'function') { errors.push('oscillate-missing');    return; }
   if (typeof pulseValue   !== 'function') { errors.push('pulseValue-missing');   return; }

   // colorFromLab: L=50, a=0, b=0 → neutral gray
   const gray = colorFromLab(50, 0, 0);
   if (colorR(gray) < 100 || colorR(gray) > 160) errors.push('lab-gray-R: ' + colorR(gray));

   // colorFromLab: L=50, a=60, b=0 → reddish
   const red = colorFromLab(50, 60, 0);
   if (colorR(red) < colorG(red)) errors.push('lab-red-R vs G');

   // oscillate: t=0 → lo
   if (Math.abs(oscillate(0, 1, 0, 10) - 0) > 0.1) errors.push('osc(0): ' + oscillate(0,1,0,10));
   // oscillate: t=0.25 → hi (peak of sin)
   if (Math.abs(oscillate(0.25, 1, 0, 10) - 10) > 0.5) errors.push('osc(0.25): ' + oscillate(0.25,1,0,10));

   // pulseValue
   if (Math.abs(pulseValue(0.5, 1.0) - 0.5) > 0.01) errors.push('pulse: ' + pulseValue(0.5,1.0));
   if (Math.abs(pulseValue(1.5, 1.0) - 0.5) > 0.01) errors.push('pulse2: ' + pulseValue(1.5,1.0));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('286 LAB ZOOM UTIL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Lab color sweep (hue-like using a,b params)
   for (let i = 0; i < 36; i++) {
      const angle = i / 36 * Math.PI * 2;
      const alab = Math.cos(angle) * 60;
      const blab = Math.sin(angle) * 60;
      const col = colorFromLab(60, alab, blab);
      rectfill(20+i*16, 50, 34+i*16, 90, col);
   }
   print('Lab hue sweep', 20, 96, rgba8(140, 180, 220, 255));

   // oscillate demo
   for (let x = 0; x < 580; x++) {
      const t = x / 580;
      const y1 = 150 - oscillate(t, 2, 0, 40)|0;
      const y2 = 180 - oscillate(t, 4, 0, 25)|0;
      pset(30+x, y1, rgba8(100, 200, 255, 255));
      pset(30+x, y2, rgba8(255, 180, 60, 255));
   }
   print('oscillate', 30, 210, rgba8(140, 180, 220, 255));

   // pulseValue demo (sawtooth-like)
   for (let x = 0; x < 580; x++) {
      const t = x / 580 * 5;
      const v = pulseValue(t, 1.0);
      pset(30+x, 250-(v*40)|0, rgba8(180, 255, 140, 255));
   }
   print('pulseValue', 30, 260, rgba8(140, 180, 220, 255));

   // Draw something to zoom into
   circfill(320, 320, 30, rgba8(200, 100, 60, 255));
   circfill(280, 310, 15, rgba8(60, 200, 180, 255));
   circfill(360, 310, 12, rgba8(200, 80, 200, 255));
   setClip(240, 280, 160, 70);
   screenZoom(1.5, 320, 315);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
