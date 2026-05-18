// Conformance cart 1036: Batch 85 showcase — particle burst fireworks scene.

let t = 0;
let bursts = [];

const COLORS = [
   [rgba8(255, 220, 60, 255),  rgba8(255, 120, 20, 255)],
   [rgba8(80, 200, 255, 255),  rgba8(20, 80, 180, 255)],
   [rgba8(180, 60, 255, 255),  rgba8(255, 80, 160, 255)],
   [rgba8(80, 255, 120, 255),  rgba8(20, 160, 60, 255)],
];

const SITES = [
   [160, 160], [320, 120], [480, 150], [240, 200], [400, 190],
];

export function init() {
   for (let i = 0; i < SITES.length; i++) {
      const b = createBurst(SITES[i][0], SITES[i][1], 20, 55 + i * 8);
      const ci = i % COLORS.length;
      setBurstColors(b, COLORS[ci][0], COLORS[ci][1], rgba8(255, 255, 200, 255));
      bursts.push(b);
   }
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < bursts.length; i++)
      updateBurst(bursts[i], dt);
}

export function draw() {
   cls(rgba8(4, 4, 14, 255));

   // Night sky gradient
   rectfill(0, 0, 640, 180, rgba8(4, 4, 20, 255));
   rectfill(0, 180, 640, 180, rgba8(8, 6, 16, 255));

   // Ground
   rectfill(0, 310, 640, 50, rgba8(10, 14, 10, 255));

   // Silhouette buildings
   rectfill(0,   240, 80, 70,  rgba8(6, 6, 10, 255));
   rectfill(100, 260, 60, 50,  rgba8(6, 6, 10, 255));
   rectfill(480, 250, 80, 60,  rgba8(6, 6, 10, 255));
   rectfill(570, 265, 70, 45,  rgba8(6, 6, 10, 255));

   for (let i = 0; i < bursts.length; i++)
      drawBurst(bursts[i]);

   printBold('1036 BATCH 85', 4, 4, rgba8(200, 220, 255, 200));
   print('particle burst', 4, 14, rgba8(80, 255, 120, 180));
}
