// Nova64 Game Cart: TEST MINIMAL (RetroArch port)
// Tiny 2D primitive smoke test mirroring examples/test-minimal.

let t = 0;

export function init() {
  t = 0;
}

export function update(dt) {
  t += dt;
}

export function draw() {
  cls(rgba8(16, 18, 32, 255));
  rect(50, 50, 200, 100, rgba8(255, 0, 0, 255), true);
  rect(50, 50, 200, 100, rgba8(255, 255, 255, 255), false);
  print('TEST TEXT', 100, 100, rgba8(255, 255, 0, 255), 1);
  print('2D primitives OK  t=' + t.toFixed(1), 50, 168, rgba8(120, 220, 255, 255), 1);
}
