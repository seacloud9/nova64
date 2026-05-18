// Conformance cart 860: Batch 69 showcase — 2D trails.

let t = 0;
const NUM = 4;
let trails = [], orbs = [];

// Orbital radii and speeds for determinism
const RADII  = [90, 130, 65, 110];
const SPEEDS = [1.3, 0.8, 1.8, 1.1];
const COLORS_H = [
   rgba8(255, 80,  80,  255),
   rgba8(80,  200, 255, 255),
   rgba8(255, 220, 50,  255),
   rgba8(150, 255, 80,  255),
];
const COLORS_T = [
   rgba8(255, 80,  80,  0),
   rgba8(80,  200, 255, 0),
   rgba8(255, 220, 50,  0),
   rgba8(150, 255, 80,  0),
];
const CX = 320, CY = 180;

export function init() {
   for (let i = 0; i < NUM; i++) {
      const tr = createTrail2D(24);
      setTrail2DColors(tr, COLORS_H[i], COLORS_T[i]);
      setTrail2DWidth(tr, 3, 1);
      trails.push(tr);
      orbs.push({ angle: (i / NUM) * Math.PI * 2 });
   }
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < NUM; i++) {
      orbs[i].angle += SPEEDS[i] * dt;
      const x = CX + Math.cos(orbs[i].angle) * RADII[i];
      const y = CY + Math.sin(orbs[i].angle) * RADII[i] * 0.5;
      addTrail2DPoint(trails[i], x, y);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('860 BATCH 69', 4, 4, rgba8(200, 220, 255, 255));
   print('2D trails', 4, 14, rgba8(80, 255, 120, 255));
   for (let i = 0; i < NUM; i++) {
      drawTrail2D(trails[i]);
   }
   // Draw orb heads
   for (let i = 0; i < NUM; i++) {
      const x = CX + Math.cos(orbs[i].angle) * RADII[i];
      const y = CY + Math.sin(orbs[i].angle) * RADII[i] * 0.5;
      circfill(x, y, 4, COLORS_H[i]);
   }
}
