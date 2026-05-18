// Conformance cart 1025: Batch 84 showcase — neon/glow shapes scene.
// Synthwave-style cityscape using glow primitives.

let t = 0;

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(4, 2, 12, 255));

   // Sky gradient bands
   rectfill(0, 0, 640, 120, rgba8(6, 4, 20, 255));
   rectfill(0, 120, 640, 60, rgba8(40, 10, 60, 255));
   rectfill(0, 180, 640, 40, rgba8(80, 20, 80, 255));

   // Ground
   rectfill(0, 220, 640, 140, rgba8(8, 4, 18, 255));

   // Horizon glow line
   glowLine(0, 222, 640, 222, rgba8(200, 60, 255, 255), 5);

   // Grid lines on ground (perspective)
   for (let i = 0; i < 8; i++) {
      const gy = 222 + i * 18;
      const alpha = 80 + i * 20;
      glowLine(0, gy, 640, gy, rgba8(100, 20, 180, alpha), 2);
   }
   // Vertical grid lines (converging)
   for (let i = -5; i <= 5; i++) {
      const gx = 320 + i * 60;
      const bx = 320 + i * 200;
      glowLine(gx, 222, bx, 360, rgba8(100, 20, 180, 100), 2);
   }

   // Sun / moon
   glowCircle(320, 160, 60, rgba8(220, 40, 180, 255), 8);
   glowCircle(320, 160, 40, rgba8(255, 80, 220, 255), 5);

   // Scan lines on sun
   for (let i = 0; i < 6; i++) {
      const sy = 115 + i * 16;
      glowLine(262, sy, 378, sy, rgba8(4, 2, 12, 255), 1);
   }

   // Buildings (left)
   rectfill(20, 130, 60, 100, rgba8(8, 6, 22, 255));
   glowRect(20, 130, 60, 100, rgba8(80, 200, 255, 200), 3);
   rectfill(100, 150, 50, 80, rgba8(8, 6, 22, 255));
   glowRect(100, 150, 50, 80, rgba8(80, 200, 255, 160), 2);

   // Buildings (right)
   rectfill(490, 120, 70, 110, rgba8(8, 6, 22, 255));
   glowRect(490, 120, 70, 110, rgba8(255, 120, 60, 200), 3);
   rectfill(570, 145, 50, 85, rgba8(8, 6, 22, 255));
   glowRect(570, 145, 50, 85, rgba8(255, 120, 60, 160), 2);

   // Window lights
   const wins = [[30,140],[50,140],[30,160],[50,170],[110,160],[130,155]];
   for (let i = 0; i < wins.length; i++)
      glowPset(wins[i][0], wins[i][1], rgba8(220, 210, 80, 255), 3);
   const rwins = [[500,130],[520,145],[540,130],[500,155],[580,155],[590,165]];
   for (let i = 0; i < rwins.length; i++)
      glowPset(rwins[i][0], rwins[i][1], rgba8(80, 200, 255, 255), 3);

   // Logo text glow
   glowLine(200, 350, 440, 350, rgba8(200, 60, 255, 255), 2);
   printBold('NOVA  64', 248, 340, rgba8(220, 80, 255, 255));

   printBold('1025 BATCH 84', 4, 4, rgba8(200, 220, 255, 200));
   print('glow shapes', 4, 14, rgba8(80, 255, 120, 180));
}
