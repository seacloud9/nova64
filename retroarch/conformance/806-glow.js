// Conformance cart 806: glow — glowRect, glowRectFill, glowCircle, glowLine, glowPset

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   // Glow lines forming an X
   glowLine(100, 60, 220, 160, rgba8(80, 200, 255, 255), 4);
   glowLine(220, 60, 100, 160, rgba8(80, 200, 255, 255), 4);

   // Glow circles
   glowCircle(400, 100, 50, rgba8(255, 160, 60, 255), 6);
   glowCircle(400, 100, 30, rgba8(255, 220, 100, 255), 4);
   glowCircle(400, 100, 10, rgba8(255, 255, 200, 255), 3);

   // Glow rects (hollow + filled)
   glowRect(80, 200, 160, 80, rgba8(80, 255, 120, 255), 5);
   glowRectFill(300, 210, 80, 60, rgba8(180, 80, 255, 255), 5);

   // Glow psets
   const pts = [[500, 80],[520, 100],[540, 80],[530, 120],[510, 120]];
   for (let i = 0; i < pts.length; i++)
      glowPset(pts[i][0], pts[i][1], rgba8(255, 80, 80, 255), 6);

   printBold('806 GLOW', 4, 4, rgba8(200, 220, 255, 255));
   print('glowRect glowCircle glowLine glowPset', 4, 14, rgba8(80, 255, 120, 180));
}
