// Conformance cart 259: batch 17 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['reflectVector', 'rotateVector',
                   'colorMultiply', 'colorScreen', 'colorOverlay',
                   'sinD', 'cosD', 'atan2D', 'degToRad', 'radToDeg',
                   'screenGlow', 'drawRuler'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   printBold('259 BATCH 17', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Trig circle (sinD/cosD)
   const cx = 80, cy = 130, r = 55;
   for (let d = 0; d < 360; d += 2) {
      const x = cx + cosD(d)*r, y = cy + sinD(d)*r;
      pset(x|0, y|0, rgba8(100+cosD(d)*100|0, 200, 100+sinD(d)*100|0, 255));
   }
   for (let d = 0; d < 360; d += 60) {
      line(cx, cy, cx+cosD(d)*(r-5)|0, cy+sinD(d)*(r-5)|0, rgba8(255,220,80,200));
   }

   // Blend mode swatches
   const base = rgba8(200, 80, 160, 255);
   const over = rgba8(80, 200, 100, 255);
   rectfill(170, 50,  240, 90,  base);
   rectfill(170, 100, 240, 140, over);
   rectfill(170, 150, 240, 190, colorMultiply(base, over));
   rectfill(170, 200, 240, 240, colorScreen(base, over));
   rectfill(170, 250, 240, 290, colorOverlay(base, over));
   print('base',     244, 65,  rgba8(160,200,240,255));
   print('blend',    244, 115, rgba8(160,200,240,255));
   print('multiply', 244, 165, rgba8(160,200,240,255));
   print('screen',   244, 215, rgba8(160,200,240,255));
   print('overlay',  244, 265, rgba8(160,200,240,255));

   // Reflect vector diagram
   const rcx = 380, rcy = 160;
   line(rcx-60, rcy+60, rcx+60, rcy+60, rgba8(80,120,200,255));
   const rv = reflectVector(1, 1.5, 0, -1);
   drawArrow(rcx, rcy+60, rcx+60, rcy+60+rv.y*30|0, rgba8(255,180,60,255));
   drawArrow(rcx, rcy+60, rcx-60, rcy+60+1.5*30|0,  rgba8(80,220,140,255));

   // Rotation wheel
   for (let i = 0; i < 8; i++) {
      const rv2 = rotateVector(40, 0, i*45);
      const col = rgba8(100+i*19, 180, 220, 255);
      line(500, 130, 500+rv2.x|0, 130+rv2.y|0, col);
   }

   // Rulers
   drawRuler(20,  310, 600, 0, 20, rgba8(140, 180, 220, 200));
   drawRuler(20,  330, 300, 0, 10, rgba8(100, 200, 140, 200));

   // Glow on bright stars
   circfill(440, 260, 6,  rgba8(255, 240, 120, 255));
   circfill(520, 240, 4,  rgba8(200, 160, 255, 255));
   circfill(580, 270, 5,  rgba8(100, 220, 255, 255));
   setClip(410, 220, 200, 80);
   screenGlow(5, 0.8);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
