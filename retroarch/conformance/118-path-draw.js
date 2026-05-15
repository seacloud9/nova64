// Conformance cart 118: Path drawing.
// beginPath(); moveTo(x,y); lineTo(x,y); closePath();
// strokePath(color); fillPath(color).

let errors = [];

export function init() {
   if (typeof beginPath  !== 'function') { errors.push('beginPath-missing');  return; }
   if (typeof moveTo     !== 'function') { errors.push('moveTo-missing');     return; }
   if (typeof lineTo     !== 'function') { errors.push('lineTo-missing');     return; }
   if (typeof closePath  !== 'function') { errors.push('closePath-missing');  return; }
   if (typeof strokePath !== 'function') { errors.push('strokePath-missing'); return; }
   if (typeof fillPath   !== 'function') { errors.push('fillPath-missing');   return; }

   // Calling stroke/fill with no points should not crash
   beginPath();
   strokePath(rgba8(255, 255, 255, 255));
   fillPath(rgba8(255, 255, 255, 255));

   // Triangle fill: verify at least the center pixel was written
   beginPath();
   moveTo(160, 80);
   lineTo(200, 140);
   lineTo(120, 140);
   closePath();
   fillPath(rgba8(255, 100, 100, 255));
   const px = pget(160, 120);
   const pr = (px >> 24) & 0xff;
   const pg = (px >> 16) & 0xff;
   const pb = (px >>  8) & 0xff;
   if (pr !== 255 || pg !== 100 || pb !== 100)
      errors.push('triangle center pixel mismatch: ' + pr + ',' + pg + ',' + pb);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('118 PATH DRAW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Diamond stroke
   beginPath();
   moveTo(320, 80);
   lineTo(380, 130);
   lineTo(320, 180);
   lineTo(260, 130);
   closePath();
   strokePath(rgba8(100, 220, 255, 255));

   // Filled pentagon
   beginPath();
   for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = 100 + Math.cos(a) * 40;
      const y = 220 + Math.sin(a) * 40;
      if (i === 0) moveTo(x, y);
      else lineTo(x, y);
   }
   closePath();
   fillPath(rgba8(80, 200, 100, 255));
   strokePath(rgba8(200, 255, 200, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
