// Conformance cart 796: typewriter text effect
// Verifies createTypewriter / updateTypewriter / drawTypewriter /
//         isTypewriterDone / typewriterProgress / setTypewriterText / destroyTypewriter

let testDone = false;

export function init() {
   // ── Basic create ──
   const tw = createTypewriter('Hello, world!', 10, 10, rgba8(255, 255, 255, 255), 20);
   if (!tw) throw new Error('createTypewriter returned 0');

   // Fresh state: not done, progress 0
   if (isTypewriterDone(tw)) throw new Error('fresh typewriter should not be done');
   const p0 = typewriterProgress(tw);
   if (p0 > 0.001) throw new Error('fresh progress should be 0, got ' + p0);

   // 'Hello, world!' = 13 chars, speed=20 chars/s → done at 0.65s
   // After 0.325s → progress ~0.5
   updateTypewriter(tw, 0.325);
   const p1 = typewriterProgress(tw);
   if (p1 < 0.48 || p1 > 0.52) throw new Error('progress at half should be ~0.5, got ' + p1);
   if (isTypewriterDone(tw)) throw new Error('should not be done at half');

   // Advance past end
   updateTypewriter(tw, 0.5);
   if (!isTypewriterDone(tw)) throw new Error('should be done after 0.825 s');
   if (typewriterProgress(tw) < 0.999) throw new Error('done progress should be 1');

   // updateTypewriter after done is a no-op
   updateTypewriter(tw, 100.0);
   if (typewriterProgress(tw) < 0.999) throw new Error('extra update changed done progress');

   // ── setTypewriterText resets ──
   setTypewriterText(tw, 'New text');
   if (isTypewriterDone(tw)) throw new Error('after setText, should not be done');
   if (typewriterProgress(tw) > 0.001) throw new Error('after setText, progress should be 0');

   // Empty text → done immediately (length 0)
   const twe = createTypewriter('', 0, 0, rgba8(255, 255, 255, 255), 10);
   if (!twe) throw new Error('createTypewriter empty failed');
   if (typewriterProgress(twe) < 0.999) throw new Error('empty typewriter should be at full progress');
   destroyTypewriter(twe);

   // ── destroyTypewriter / re-create ──
   destroyTypewriter(tw);
   const tw2 = createTypewriter('Re-created', 0, 0, rgba8(255, 255, 255, 255), 10);
   if (!tw2) throw new Error('re-create after destroy failed');
   destroyTypewriter(tw2);

   testDone = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('796 TYPEWRITER', 4, 4, rgba8(200, 220, 255, 255));
   print(testDone ? 'API OK' : 'FAILED', 4, 14, rgba8(80, 255, 120, 255));

   // Display three typewriters at fixed progress values
   const lines = [
      { text: 'SYSTEM ONLINE...', x: 40, y: 80,  speed: 20, dt: 0.55 },
      { text: 'LOADING ASSETS..',  x: 40, y: 110, speed: 16, dt: 0.40 },
      { text: 'READY.',            x: 40, y: 140, speed: 12, dt: 0.18 },
   ];
   const cols = [
      rgba8(80, 255, 120, 255),
      rgba8(200, 200, 80, 255),
      rgba8(80, 180, 255, 255),
   ];
   for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const h = createTypewriter(ln.text, ln.x, ln.y, cols[i], ln.speed);
      updateTypewriter(h, ln.dt);
      drawTypewriter(h);
      destroyTypewriter(h);
   }
}
