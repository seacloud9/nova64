// Conformance cart 309: drawPentagram, fillPentagram.

let errors = [];

export function init() {
   if (typeof drawPentagram !== 'function') { errors.push('drawPentagram-missing'); return; }
   if (typeof fillPentagram !== 'function') { errors.push('fillPentagram-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 6, 18, 255));
   print('309 PENTAGRAM', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled pentagrams — various sizes and rotations
   fillPentagram(100, 180, 70, 0,                  rgba8(180, 40,  60,  255));
   fillPentagram(260, 180, 60, Math.PI / 5,        rgba8(40,  120, 220, 255));
   fillPentagram(420, 180, 80, Math.PI / 10,       rgba8(60,  200, 120, 255));

   // Outlined pentagrams on top
   drawPentagram(100, 180, 70, 0,                  rgba8(255, 100, 120, 200));
   drawPentagram(260, 180, 60, Math.PI / 5,        rgba8(100, 180, 255, 200));
   drawPentagram(420, 180, 80, Math.PI / 10,       rgba8(120, 255, 160, 200));

   // Small ring
   for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const px = 560 + Math.cos(ang) * 50;
      const py = 180 + Math.sin(ang) * 50;
      fillPentagram(px, py, 16, ang, colorFromHSL(i * 45, 0.9, 0.55));
   }

   // Star of different rotations
   for (let i = 0; i < 5; i++) {
      drawPentagram(100 + i * 100, 320, 25, i * Math.PI / 10, colorFromHSL(i * 72, 0.8, 0.6));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
