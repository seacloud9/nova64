// Conformance cart 212: drawGradientLine(x1,y1,x2,y2,c1,c2).

let errors = [];

export function init() {
   if (typeof drawGradientLine !== 'function') { errors.push('drawGradientLine-missing'); return; }
   drawGradientLine(0, 0, 0, 0, rgba8(255,0,0,255), rgba8(0,0,255,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('212 GRADIENT LINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal gradient lines
   const pairs = [
      [rgba8(255,60,60,255),  rgba8(60,100,255,255)],
      [rgba8(60,220,60,255),  rgba8(220,60,220,255)],
      [rgba8(255,200,40,255), rgba8(40,200,255,255)],
      [rgba8(200,60,255,255), rgba8(60,255,200,255)],
   ];
   for (let i = 0; i < 4; i++) {
      for (let t = 0; t < 8; t++) {
         drawGradientLine(20, 50 + i * 30 + t, 600, 50 + i * 30 + t, pairs[i][0], pairs[i][1]);
      }
   }

   // Diagonal gradient
   drawGradientLine(20, 180, 300, 280, rgba8(255,100,60,255), rgba8(60,200,255,255));
   drawGradientLine(320, 280, 600, 180, rgba8(60,200,255,255), rgba8(255,100,60,255));

   // Rainbow fan from center
   const cx = 320, cy = 180;
   const nRays = 24;
   for (let i = 0; i < nRays; i++) {
      const a = i / nRays * Math.PI * 2;
      const r = (i * 255 / nRays) | 0;
      const g = ((i * 255 / nRays) + 85) % 255 | 0;
      const b = ((i * 255 / nRays) + 170) % 255 | 0;
      drawGradientLine(cx, cy,
         cx + Math.cos(a) * 60 | 0,
         cy + Math.sin(a) * 60 | 0,
         rgba8(20,20,20,255), rgba8(r,g,b,255));
   }

   print('gradient lines', 8, 300, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
