// Conformance cart 882: Batch 71 showcase — color ramps.

let t = 0;
let rampSunset, rampOcean, rampFire;
const BAR_Y = 100, BAR_W = 560, BAR_X = 40, BAR_H = 22;

export function init() {
   rampSunset = createColorRamp([
      rgba8(20,  10,  60,  255),
      rgba8(160, 40,  80,  255),
      rgba8(255, 120, 30,  255),
      rgba8(255, 220, 80,  255),
      rgba8(255, 255, 200, 255),
   ]);
   rampOcean = createColorRamp([
      rgba8(5,   10,  40,  255),
      rgba8(0,   60,  140, 255),
      rgba8(0,   160, 200, 255),
      rgba8(80,  220, 230, 255),
   ]);
   rampFire = createColorRamp([
      rgba8(20,  0,   0,   255),
      rgba8(180, 30,  0,   255),
      rgba8(255, 140, 0,   255),
      rgba8(255, 240, 80,  255),
      rgba8(255, 255, 240, 255),
   ]);
}

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('882 BATCH 71', 4, 4, rgba8(200, 220, 255, 255));
   print('color ramps', 4, 14, rgba8(80, 255, 120, 255));

   const ramps  = [rampSunset, rampOcean, rampFire];
   const labels = ['sunset', 'ocean', 'fire'];
   for (let r = 0; r < 3; r++) {
      const y = BAR_Y + r * (BAR_H + 10);
      for (let i = 0; i < BAR_W; i++) {
         const col = sampleColorRamp(ramps[r], i / (BAR_W - 1));
         rectfill(BAR_X + i, y, 1, BAR_H, col);
      }
      print(labels[r], BAR_X, y + BAR_H + 2, rgba8(160, 180, 255, 180));
   }

   // Animated sample marker
   const markerT = (Math.sin(t * 1.2) * 0.5 + 0.5);
   const mx = BAR_X + Math.floor(markerT * (BAR_W - 1));
   for (let r = 0; r < 3; r++) {
      const y = BAR_Y + r * (BAR_H + 10);
      vline(mx, y - 2, BAR_H + 4, rgba8(255, 255, 255, 200));
   }
}
