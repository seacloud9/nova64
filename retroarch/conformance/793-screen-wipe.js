// Conformance cart 793: screen wipe transitions
// Verifies createWipe / startWipe / updateWipe / drawWipe /
//         isWipeDone / wipeProgress / destroyWipe

let wipeHandles = [];
let testDone = false;

export function init() {
   // Create one wipe per type
   for (let t = 0; t < 5; t++) {
      const h = createWipe(t);
      if (!h) throw new Error('createWipe(' + t + ') returned 0');
      wipeHandles.push(h);
   }

   // Fresh wipe: progress 0, not done
   if (wipeProgress(wipeHandles[0]) !== 0)
      throw new Error('fresh progress should be 0');
   if (isWipeDone(wipeHandles[0]))
      throw new Error('fresh wipe should not be done');

   // Start dir=0, step halfway
   startWipe(wipeHandles[0], 1.0, 0);
   updateWipe(wipeHandles[0], 0.5);
   const ph = wipeProgress(wipeHandles[0]);
   if (ph < 0.49 || ph > 0.51)
      throw new Error('expected ~0.5 progress, got ' + ph);
   if (isWipeDone(wipeHandles[0]))
      throw new Error('should not be done at 0.5');

   // Advance past duration → done + clamped at 1
   updateWipe(wipeHandles[0], 0.6);
   if (!isWipeDone(wipeHandles[0]))
      throw new Error('wipe should be done after 1.1 s');
   if (wipeProgress(wipeHandles[0]) < 0.999)
      throw new Error('done progress should be 1');

   // updateWipe after done is a no-op (timer stays clamped)
   updateWipe(wipeHandles[0], 1.0);
   if (wipeProgress(wipeHandles[0]) < 0.999)
      throw new Error('progress should still be 1 after extra update');

   // startWipe resets state
   startWipe(wipeHandles[0], 0.5, 1);
   if (isWipeDone(wipeHandles[0]))
      throw new Error('restarted wipe should not be done');
   if (wipeProgress(wipeHandles[0]) !== 0)
      throw new Error('restarted progress should be 0');

   // dir=1: progress 0→1 but coverage goes 1→0
   startWipe(wipeHandles[1], 0.8, 1);
   updateWipe(wipeHandles[1], 0.4);
   const p_in = wipeProgress(wipeHandles[1]);
   if (p_in < 0.49 || p_in > 0.51)
      throw new Error('in-wipe progress at 0.4/0.8 should be ~0.5, got ' + p_in);

   // destroyWipe / re-create
   destroyWipe(wipeHandles[4]);
   const newH = createWipe(4);
   if (!newH) throw new Error('re-create after destroy failed');
   wipeHandles[4] = newH;

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   // Colorful horizontal bands so wipe coverage is visible
   rectfill(0,   60, 640, 50, rgba8(200, 60,  60,  255));
   rectfill(0,  110, 640, 50, rgba8(60,  200, 60,  255));
   rectfill(0,  160, 640, 50, rgba8(60,  60,  220, 255));
   rectfill(0,  210, 640, 50, rgba8(220, 200, 40,  255));
   rectfill(0,  260, 640, 50, rgba8(180, 60,  220, 255));
   rectfill(0,  310, 640, 50, rgba8(40,  200, 200, 255));

   // Checker wipe at 50% coverage
   {
      const wA = createWipe(3);
      startWipe(wA, 1.0, 0);
      updateWipe(wA, 0.5);
      drawWipe(wA);
      destroyWipe(wA);
   }
   // Slide-left wipe at 20% coverage (right-side bar)
   {
      const wB = createWipe(0);
      startWipe(wB, 1.0, 0);
      updateWipe(wB, 0.2);
      drawWipe(wB);
      destroyWipe(wB);
   }

   printBold('793 SCREEN WIPE', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));
}
