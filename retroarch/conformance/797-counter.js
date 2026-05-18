// Conformance cart 797: animated numeric counters
// Verifies createCounter / setCounterTarget / updateCounter / drawCounter /
//         getCounterValue / isCounterAtTarget / destroyCounter

let testDone = false;

export function init() {
   // ── Basic create ──
   const c = createCounter(10, 10, rgba8(255, 255, 255, 255), 100);
   if (!c) throw new Error('createCounter returned 0');

   // Fresh: value=0, target=0, at target
   const v0 = getCounterValue(c);
   if (v0 < -0.001 || v0 > 0.001) throw new Error('fresh value should be 0, got ' + v0);
   if (!isCounterAtTarget(c)) throw new Error('fresh counter should be at target');

   // ── Chase upward ──
   setCounterTarget(c, 500);
   if (isCounterAtTarget(c)) throw new Error('should not be at target after setTarget(500)');

   // speed=100, after 2s → value += 200 → value=200
   updateCounter(c, 2.0);
   const v1 = getCounterValue(c);
   if (v1 < 199 || v1 > 201) throw new Error('expected ~200 after 2s at speed 100, got ' + v1);
   if (isCounterAtTarget(c)) throw new Error('should not be at 500 yet');

   // advance 3 more seconds → overshoots to 500 (clamped)
   updateCounter(c, 3.0);
   const v2 = getCounterValue(c);
   if (v2 < 499 || v2 > 501) throw new Error('expected 500 after clamp, got ' + v2);
   if (!isCounterAtTarget(c)) throw new Error('should be at target 500');

   // ── Chase downward ──
   setCounterTarget(c, 200);
   updateCounter(c, 1.0);
   const v3 = getCounterValue(c);
   if (v3 < 399 || v3 > 401) throw new Error('expected ~400 going down, got ' + v3);

   // ── Instant snap (speed=0) ──
   const ci = createCounter(0, 0, rgba8(255, 255, 255, 255), 0);
   if (!ci) throw new Error('createCounter(speed=0) failed');
   setCounterTarget(ci, 9999);
   const vi = getCounterValue(ci);
   if (vi < 9998 || vi > 10000) throw new Error('instant snap should set value=9999, got ' + vi);
   if (!isCounterAtTarget(ci)) throw new Error('instant-snap should be at target');
   destroyCounter(ci);

   // ── destroyCounter / re-create ──
   destroyCounter(c);
   const c2 = createCounter(0, 0, rgba8(255, 255, 255, 255), 50);
   if (!c2) throw new Error('re-create after destroy failed');
   destroyCounter(c2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('797 COUNTER', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Show counters at various progress points
   const specs = [
      { target: 1000, dt: 2.5,  speed: 200, y: 60,  col: rgba8(200, 80,  80,  255) },
      { target: 5000, dt: 10.0, speed: 400, y: 90,  col: rgba8(80,  200, 80,  255) },
      { target: 100,  dt: 0.3,  speed: 100, y: 120, col: rgba8(80,  120, 255, 255) },
      { target: 99999,dt: 200,  speed: 500, y: 150, col: rgba8(220, 200, 40,  255) },
   ];
   for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const h = createCounter(40, s.y, s.col, s.speed);
      setCounterTarget(h, s.target);
      updateCounter(h, s.dt);
      print('>', 32, s.y, rgba8(100, 120, 160, 200));
      drawCounter(h);
      destroyCounter(h);
   }
}
