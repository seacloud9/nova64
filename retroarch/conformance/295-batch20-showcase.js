// Conformance cart 295: batch 20 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawTarget', 'fillTarget', 'drawSpiderWeb',
                   'drawBrickPattern', 'fillWaveShape', 'colorFromLab',
                   'drawFlame', 'fillFlame', 'screenZoom',
                   'drawDotLine', 'oscillate', 'pulseValue'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 16, 255));
   printBold('295 BATCH 20', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Brick wall background
   rectfill(0, 0, 640, 360, rgba8(120, 70, 40, 255));
   drawBrickPattern(0, 0, 640, 360, 50, 20, rgba8(60, 30, 10, 180));

   // Spider web in corner
   drawSpiderWeb(580, 50, 60, 4, 8, rgba8(200, 220, 240, 120));

   // Wave water at bottom
   fillWaveShape(0, 270, 640, 90, 12, 2.5, rgba8(20, 60, 180, 200));
   fillWaveShape(0, 290, 640, 70, 8,  3.5, rgba8(30, 100, 220, 180));

   // Flames along bottom
   for (let i = 0; i < 8; i++) {
      const h = 50 + oscillate(i/8, 1, 0, 20)|0;
      fillFlame(50+i*70, 280, h, colorFromHSL(10+i*3, 1.0, 0.5));
      fillFlame(50+i*70, 280, h-20, rgba8(255, 220, 80, 180));
   }

   // Targets
   fillTarget(100, 150, 50, 4, colorFromLab(40, 60, 50), colorFromLab(90, -10, 10));
   fillTarget(220, 130, 40, 3, colorFromLab(40, -20, 60), colorFromLab(90, 10, -20));

   // Dot lines as star pattern
   const cx = 430, cy = 150;
   for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      drawDotLine(cx, cy, cx+Math.cos(a)*80, cy+Math.sin(a)*80, 8, 3,
                  colorFromLab(60, Math.cos(a)*40, Math.sin(a)*40));
   }

   // Pulse bars
   for (let i = 0; i < 16; i++) {
      const t = i / 16;
      const v = pulseValue(t * 3, 1.0);
      const h = (v * 50)|0;
      rectfill(530+i*6, 200-h, 534+i*6, 200, colorFromHSL(t*180, 0.8, 0.5));
   }

   // Zoom a region
   circfill(320, 170, 25, rgba8(255, 200, 60, 255));
   setClip(270, 125, 100, 90);
   screenZoom(1.8, 320, 170);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
