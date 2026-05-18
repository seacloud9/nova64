// Conformance cart 795: radial arc gauges
// Verifies createGauge / setGaugeValue / setGaugeAngles / setGaugeColors /
//         drawGauge / getGaugeRatio / destroyGauge

const TWO_PI = Math.PI * 2;
let testDone = false;

export function init() {
   // ── Basic create + defaults ──
   const g = createGauge(100, 100, 50, 8);
   if (!g) throw new Error('createGauge returned 0');

   // Default ratio should be 0 (value=0, max=1)
   const r0 = getGaugeRatio(g);
   if (r0 < -0.001 || r0 > 0.001) throw new Error('default ratio should be 0, got ' + r0);

   // ── setGaugeValue ──
   setGaugeValue(g, 0.75, 1.0);
   const r1 = getGaugeRatio(g);
   if (r1 < 0.74 || r1 > 0.76) throw new Error('ratio should be 0.75, got ' + r1);

   setGaugeValue(g, 50, 100);
   const r2 = getGaugeRatio(g);
   if (r2 < 0.49 || r2 > 0.51) throw new Error('ratio 50/100 should be 0.5, got ' + r2);

   // ── Clamping ──
   setGaugeValue(g, 200, 100);
   if (getGaugeRatio(g) > 1.001) throw new Error('ratio should be clamped to 1');
   setGaugeValue(g, -10, 100);
   if (getGaugeRatio(g) < -0.001) throw new Error('ratio should be clamped to 0');

   // ── setGaugeAngles ──
   setGaugeAngles(g, -Math.PI / 2, Math.PI * 1.5);

   // ── setGaugeColors ──
   setGaugeColors(g, rgba8(30, 30, 50, 255), rgba8(200, 80, 80, 255));

   // ── destroyGauge / re-create ──
   destroyGauge(g);
   const g2 = createGauge(200, 200, 40, 6);
   if (!g2) throw new Error('re-create after destroy failed');
   destroyGauge(g2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('795 GAUGE', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Draw four gauges at fixed values/styles
   const specs = [
      { cx: 120, cy: 170, r: 70, w: 10, val: 0.25, fg: rgba8(200, 60,  60,  255) },
      { cx: 280, cy: 170, r: 70, w: 10, val: 0.50, fg: rgba8(60,  200, 60,  255) },
      { cx: 440, cy: 170, r: 70, w: 10, val: 0.75, fg: rgba8(60,  120, 255, 255) },
      { cx: 560, cy: 170, r: 50, w: 14, val: 1.00, fg: rgba8(255, 200, 40,  255) },
   ];
   const bg = rgba8(30, 34, 52, 255);

   for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const h = createGauge(s.cx, s.cy, s.r, s.w);
      setGaugeValue(h, s.val, 1.0);
      setGaugeColors(h, bg, s.fg);
      drawGauge(h);
      destroyGauge(h);
      print(Math.round(s.val * 100) + '%', s.cx - 8, s.cy - 6, rgba8(255, 255, 255, 200));
   }

   // Semi-circle gauge (custom angles)
   const hs = createGauge(320, 310, 55, 12);
   setGaugeValue(hs, 0.6, 1.0);
   setGaugeAngles(hs, Math.PI, 2 * Math.PI);  // bottom half
   setGaugeColors(hs, bg, rgba8(180, 60, 220, 255));
   drawGauge(hs);
   destroyGauge(hs);
   print('60% arc', 290, 315, rgba8(180, 60, 220, 200));
}
