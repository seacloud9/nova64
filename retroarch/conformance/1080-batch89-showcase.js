// Conformance cart 1080: Batch 89 showcase — spotlight stealth level.

let spot = 0;
let t = 0;

export function init() {
   spot = createSpotlight(200, 200, 80);
   setSpotlightColor(spot, rgba8(0, 0, 10, 200));
}

export function update(dt) {
   t += dt;
   const sx = 200 + Math.cos(t * 0.5) * 120;
   const sy = 200 + Math.sin(t * 0.4) * 60;
   setSpotlightPos(spot, sx, sy);
}

export function draw() {
   cls(rgba8(4, 6, 12, 255));

   // Level floor
   rectfill(0, 280, 640, 80, rgba8(18, 14, 10, 255));
   for (let i = 0; i < 10; i++)
      rectfill(i * 64, 280, 60, 4, rgba8(30, 24, 18, 255));

   // Boxes and items
   rectfill(60,  220, 50, 60, rgba8(80, 50, 20, 255));
   rectfill(280, 230, 40, 50, rgba8(80, 50, 20, 255));
   rectfill(450, 210, 60, 70, rgba8(80, 50, 20, 255));

   // Player
   rectfill(305, 240, 20, 36, rgba8(40, 80, 180, 255));

   drawSpotlight(spot);

   print('STEALTH MODE', 250, 340, rgba8(120, 120, 180, 160));

   printBold('1080 BATCH 89', 4, 4, rgba8(200, 220, 255, 200));
   print('spotlight overlay', 4, 14, rgba8(80, 255, 120, 180));
}
