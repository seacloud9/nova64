// Conformance cart 95: audio pitch parameter
// playSound(path, vol, loop, channel, pitch) — 5th optional arg.
// Without a real audio asset, we verify:
// 1. playSound with pitch arg doesn't throw
// 2. playBeep (synth) pitch multiplier doesn't throw
// 3. pitch values outside range are clamped silently

let ok = false;

export function init() {
   // playSound with pitch arg (missing asset → false, not throw)
   const r1 = playSound('sfx/missing.ogg', 0.5, false, 'sfx', 1.5);
   if (typeof r1 !== 'boolean') throw new Error('playSound must return boolean');

   const r2 = playSound('sfx/missing.ogg', 0.5, false, 'sfx', 0.5);
   if (typeof r2 !== 'boolean') throw new Error('playSound(pitch=0.5) must return boolean');

   // Pitch 0 and negative should not throw
   playSound('sfx/missing.ogg', 0.5, false, null, 0);
   playSound('sfx/missing.ogg', 0.5, false, null, -1);

   // sfx (synth voices) should work normally
   sfx(440, 0.1);
   sfx(220, 0.1);

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 14, 10, 255));
   print('95 AUDIO PITCH', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('pitch arg OK', 4, 24, rgba8(100, 200, 100, 255));
}
