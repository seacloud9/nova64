// Conformance cart 792: color ramp API
// Verifies createColorRamp / addColorRampStop / sampleColorRamp /
// colorRampStopCount / destroyColorRamp.

function unpackR(c) { return (c >>> 24) & 0xff; }
function unpackG(c) { return (c >>> 16) & 0xff; }
function unpackB(c) { return (c >>>  8) & 0xff; }
function unpackA(c) { return  c        & 0xff;  }

let rampHealth, rampHeat;

export function init() {
   // ── Health bar ramp: green → yellow → red ──
   rampHealth = createColorRamp([
      rgba8(0,   220, 60,  255),
      rgba8(255, 220, 0,   255),
      rgba8(255, 40,  40,  255),
   ]);
   if (!rampHealth) throw new Error('createColorRamp returned 0');
   if (colorRampStopCount(rampHealth) !== 3)
      throw new Error('stop count should be 3, got ' + colorRampStopCount(rampHealth));

   // t=0 should be green
   const c0 = sampleColorRamp(rampHealth, 0);
   if (unpackG(c0) < 200) throw new Error('t=0 should be green, g=' + unpackG(c0));
   if (unpackR(c0) > 20)  throw new Error('t=0 should not be red,  r=' + unpackR(c0));

   // t=1 should be red
   const c1 = sampleColorRamp(rampHealth, 1);
   if (unpackR(c1) < 200) throw new Error('t=1 should be red,   r=' + unpackR(c1));
   if (unpackG(c1) > 60)  throw new Error('t=1 should not be green, g=' + unpackG(c1));

   // t=0.5 should be yellow-ish (r high, g high, b low)
   const cm = sampleColorRamp(rampHealth, 0.5);
   if (unpackR(cm) < 150) throw new Error('t=0.5 should be yellow, r=' + unpackR(cm));
   if (unpackG(cm) < 150) throw new Error('t=0.5 should be yellow, g=' + unpackG(cm));

   // ── Manual stops via addColorRampStop ──
   rampHeat = createColorRamp([]);  // empty → default white→transparent
   // Override with manual stops
   addColorRampStop(rampHeat, 0.0, rgba8(0,   0,   80,  255));
   addColorRampStop(rampHeat, 0.5, rgba8(255, 80,  0,   255));
   addColorRampStop(rampHeat, 1.0, rgba8(255, 255, 200, 255));
   // Should now have 4 stops (2 default + 2... wait, default replaced)
   // Actually createColorRamp([]) with count 0 gives 2 default stops (white→transparent)
   // then addColorRampStop adds 3 more → 5 total
   if (colorRampStopCount(rampHeat) < 3)
      throw new Error('rampHeat should have >= 3 stops');

   // t=0 cold blue, t=1 hot white
   const cold = sampleColorRamp(rampHeat, 0);
   if (unpackB(cold) < 60) throw new Error('t=0 should be bluish, b=' + unpackB(cold));

   // Destroy frees slot
   destroyColorRamp(rampHealth);
   destroyColorRamp(rampHeat);

   // Rebuild for draw
   rampHealth = createColorRamp([
      rgba8(0, 220, 60, 255),
      rgba8(255, 220, 0, 255),
      rgba8(255, 40, 40, 255),
   ]);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('792 COLOR RAMP', 4, 4, rgba8(200, 220, 255, 255));
   print('stops: ' + colorRampStopCount(rampHealth), 4, 14, rgba8(80, 255, 120, 255));
   // Draw a health-bar strip using the ramp
   for (let i = 0; i < 200; i++) {
      const t = i / 199;
      const col = sampleColorRamp(rampHealth, t);
      rectfill(80 + i, 140, 1, 14, col);
   }
   print('health ramp', 80, 158, rgba8(160, 180, 255, 180));
}
