// Conformance cart 102: audio format resilience
// playSound with missing asset returns falsy; mono PCM works normally.
let ok = false;
export function init() {
   // Missing asset must return falsy, not throw
   const r = playSound('audio/missing.wav', 1.0);
   if (r) throw new Error('missing asset must return falsy, got ' + r);
   ok = true;
}
export function update(dt) {}
export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('102 AUDIO RESILIENCE', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
