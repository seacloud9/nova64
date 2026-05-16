// Conformance cart 200: neonGlow(cx,cy,r, color, glowRadius).

let errors = [];

export function init() {
   if (typeof neonGlow !== 'function') { errors.push('neonGlow-missing'); return; }
   // Degenerate: must not crash
   neonGlow(100, 100, 0, rgba8(255,255,255,255), 0);
   neonGlow(-10, -10, 5, rgba8(255,255,255,255), 2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 14, 255));
   print('200 NEON GLOW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Neon circles with different colors and glow
   neonGlow(100, 160, 40, rgba8(255, 60, 100, 255), 8);
   neonGlow(220, 160, 30, rgba8(60, 220, 255, 255), 10);
   neonGlow(330, 160, 35, rgba8(100, 255, 100, 255), 6);
   neonGlow(440, 160, 28, rgba8(255, 200, 60, 255), 12);

   // Pulsing glow
   const pulse = 4 + Math.round(Math.sin(t * 2) * 3 + 3);
   neonGlow(540, 160, 25, rgba8(200, 80, 255, 255), pulse);

   print('neon glow circles', 8, 220, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
