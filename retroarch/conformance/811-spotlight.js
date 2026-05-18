// Conformance cart 811: spotlight — createSpotlight, setSpotlightPos,
//   setSpotlightRadius, setSpotlightColor, drawSpotlight, destroySpotlight

let spot = 0;

export function init() {
   spot = createSpotlight(320, 180, 100);
   setSpotlightColor(spot, rgba8(0, 0, 20, 180));
}

export function draw() {
   cls(rgba8(6, 8, 16, 255));

   // Scene underneath the spotlight
   rectfill(100, 100, 440, 200, rgba8(30, 60, 30, 255));
   print('SECRET AREA', 230, 185, rgba8(80, 220, 80, 200));
   rectfill(280, 140, 80, 60, rgba8(180, 140, 60, 200));

   drawSpotlight(spot);

   printBold('811 SPOTLIGHT', 4, 4, rgba8(200, 220, 255, 255));
   print('createSpotlight drawSpotlight', 4, 14, rgba8(80, 255, 120, 180));
}
