// Conformance cart 800: scrolling starfield
// Verifies createStarfield / updateStarfield / drawStarfield /
//         setStarfieldSpeed / setStarfieldAngle / setStarfieldColors / destroyStarfield

let testDone = false;

export function init() {
   // ── Basic create ──
   const sf = createStarfield(80, 50);
   if (!sf) throw new Error('createStarfield returned 0');

   // ── setStarfieldSpeed ──
   setStarfieldSpeed(sf, 120);

   // ── setStarfieldAngle ──
   setStarfieldAngle(sf, 0);   // rightward

   // ── setStarfieldColors ──
   setStarfieldColors(sf,
      rgba8(50,  60,  90,  160),
      rgba8(100, 120, 160, 200),
      rgba8(200, 220, 255, 255));

   // updateStarfield moves stars
   updateStarfield(sf, 1.0);   // 1 second at speed 120, angle=0 (rightward)

   // ── destroyStarfield / re-create ──
   destroyStarfield(sf);
   const sf2 = createStarfield(60, 30);
   if (!sf2) throw new Error('re-create after destroy failed');
   destroyStarfield(sf2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(2, 3, 8, 255));
   printBold('800 STARFIELD', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Draw starfield scrolled 0.6s at default angle (downward)
   const sf = createStarfield(140, 45);
   setStarfieldColors(sf,
      rgba8(40,  50,  80,  150),
      rgba8(100, 120, 170, 200),
      rgba8(210, 230, 255, 255));
   updateStarfield(sf, 0.6);
   drawStarfield(sf);
   destroyStarfield(sf);
}
