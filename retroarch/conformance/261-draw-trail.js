// Conformance cart 261: drawTrail(x1,y1,x2,y2,w1,w2,color).

let errors = [];

export function init() {
   if (typeof drawTrail !== 'function') { errors.push('drawTrail-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('261 DRAW TRAIL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Comet trails
   drawTrail(600, 60,  80,  200, 1, 20, rgba8(255, 220, 100, 220));
   drawTrail(600, 130, 100, 220, 1, 16, rgba8(180, 220, 255, 200));
   drawTrail(580, 200, 120, 240, 1, 12, rgba8(255, 120, 80,  200));

   // Direction arrows as trails
   for (let i = 0; i < 5; i++) {
      const x = 80 + i*100;
      const y = 300;
      drawTrail(x+40, y, x, y, 12, 1, rgba8(100+i*30, 200, 150, 255));
   }

   // Circular trail effect
   const cx = 460, cy = 170;
   for (let i = 0; i < 24; i++) {
      const a1 = i     / 24 * Math.PI * 2;
      const a2 = (i+1) / 24 * Math.PI * 2;
      const x1 = cx + Math.cos(a1)*60, y1 = cy + Math.sin(a1)*60;
      const x2 = cx + Math.cos(a2)*60, y2 = cy + Math.sin(a2)*60;
      const fade = (i / 24);
      drawTrail(x1, y1, x2, y2, 8*fade, 8*(i+1)/24,
                rgba8(80+fade*175|0, 200, 100+fade*155|0, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
