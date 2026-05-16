// Conformance cart 427: batch 31 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawSnowflake', 'fillSnowflake', 'drawVenn', 'drawParabola',
                   'drawPinwheel', 'fillPinwheel', 'drawIsometricTile', 'fillIsometricTile',
                   'drawTunnel', 'drawCompass', 'screenBokeh', 'colorNeon'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('427 BATCH 31', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Snowflakes
   drawSnowflake(80, 100, 60, 6, rgba8(180, 220, 255, 255));
   fillSnowflake(200, 100, 55, 6, rgba8(80, 160, 255, 200));

   // Venn
   drawVenn(320, 100, 55, 0.4, rgba8(255, 100, 100, 200), rgba8(100, 100, 255, 200));

   // Parabola
   drawParabola(390, 50, 200, 90, rgba8(100, 220, 120, 220));

   // Isometric tile grid
   for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
         const tx = 20 + c * 50 + r * 25;
         const ty = 170 + r * 18;
         fillIsometricTile(tx, ty, 50, 25, rgba8(50 + c * 30, 80 + r * 25, 150, 200));
         drawIsometricTile(tx, ty, 50, 25, rgba8(160, 200, 255, 180));
      }
   }

   // Tunnel
   drawTunnel(490, 190, 110, 5, rgba8(80, 200, 255, 200));

   // Pinwheels
   fillPinwheel(80, 290, 55, 6, rgba8(255, 140, 60, 200));
   drawPinwheel(200, 290, 50, 4, rgba8(200, 80, 255, 220));

   // Compass
   drawCompass(330, 300, 50, Math.PI * 0.3, rgba8(220, 220, 255, 255));

   // Neon color strip
   for (let i = 0; i < 8; i++) {
      const col = colorNeon(rgba8(200, 60 + i * 20, 80, 255), 0.7);
      rectfill(410 + i * 22, 270, 430 + i * 22, 300, col);
   }

   // Bokeh over the scatter of dots
   for (let i = 0; i < 6; i++) {
      circfill(430 + i * 28, 310, 12, rgba8(60 + i * 30, 80, 200, 180));
   }
   setClip(410, 300, 610, 340);
   screenBokeh(4);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
