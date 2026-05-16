// Conformance cart 283: batch 19 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['colorLighten', 'colorDarken', 'colorDifference',
                   'screenBrightnessContrast', 'drawSineWave', 'drawSquiggle',
                   'screenGlitch', 'drawBubble', 'fillBubble',
                   'colorPinLight', 'drawConnector', 'drawHatch'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 16, 255));
   printBold('283 BATCH 19', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Hatched background region
   drawHatch(0, 0, 640, 360, 30, 20, rgba8(20, 30, 60, 80));

   // Bubble cluster
   fillBubble(100, 150, 60, rgba8(60, 140, 220, 180));
   fillBubble(190, 130, 40, rgba8(200, 80, 180, 180));
   fillBubble(260, 155, 28, rgba8(80, 200, 120, 180));
   drawBubble(360, 145, 55, rgba8(180, 220, 255, 220));

   // Sine waves
   drawSineWave(20, 240, 600, 20, 2.0, 0,           rgba8(100, 200, 255, 200));
   drawSineWave(20, 260, 600, 15, 3.5, Math.PI*0.7, rgba8(255, 160, 80,  200));

   // Squiggles
   drawSquiggle(20, 290, 320, 290, 6, 5, rgba8(180, 255, 140, 200));

   // Connector flow
   rectfill(450, 60,  530, 90,  rgba8(30, 60, 120, 255));
   rectfill(550, 60,  630, 90,  rgba8(60, 30, 100, 255));
   drawConnector(530, 75, 550, 75, rgba8(140, 200, 255, 255));
   print('A', 482, 70, rgba8(200, 220, 255, 255));
   print('B', 582, 70, rgba8(220, 200, 255, 255));

   // Color blend swatches
   const base = rgba8(100, 60, 200, 255);
   for (let i = 0; i < 10; i++) {
      const b2 = colorFromHSL(i*36, 0.8, 0.5);
      rectfill(20+i*58, 310, 72+i*58, 345, colorLighten(base, b2));
   }

   // Brightness contrast applied to right section
   setClip(320, 100, 130, 130);
   screenBrightnessContrast(0.15, 1.5);
   clearClip();

   // Glitch strip
   setClip(460, 200, 170, 50);
   screenGlitch(5);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
