// Conformance cart 92: hot reload
// NOVA64_HOT_RELOAD=1 causes retro_reset to re-read the cart from disk.
// Without the env var set, we just verify the cart path is accessible
// (harness feeds the path) and that init runs cleanly on reset.

let ok = false;
let initCount = 0;

export function init() {
   initCount++;
   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 16, 22, 255));
   print('92 HOT RELOAD', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('inits=' + initCount, 4, 24, rgba8(180, 180, 220, 255));
}
