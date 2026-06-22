// Headless test of the multiplayer-lobby cart logic with a mocked nova64 (no
// engine, no server). Proves the two fixes: init() doesn't block/throw, and the
// dot renders + moves from input even when OFFLINE (no room). This is exactly
// the "spins / arrows do nothing" regression.

import assert from 'assert';

const drawCalls = [];
const held = new Set();
globalThis.nova64 = {
  draw: {
    cls() {},
    rgba8() {
      return 0;
    },
    print() {},
    rectfill(x, y, w, h) {
      drawCalls.push({ x, y, w, h });
    },
  },
  input: {
    key(code) {
      return held.has(code);
    },
  },
  // net + auth intentionally undefined -> the offline code path
};

(async () => {
  const cart = await import('../../examples/multiplayer-lobby/code.js?t=' + Date.now());
  assert.strictEqual(typeof cart.init, 'function', 'init exported');

  // init must be synchronous (not a Promise) and must not throw.
  const r = cart.init();
  assert.ok(!(r && typeof r.then === 'function'), 'init() is non-blocking (not async)');

  // First frame already renders the avatar (no server, no hang).
  drawCalls.length = 0;
  cart.draw();
  let dots = drawCalls.filter((c) => c.w === 12 && c.h === 12);
  assert.ok(dots.length >= 1, 'avatar rendered on first frame while offline');
  const startX = dots[dots.length - 1].x;

  // Hold ArrowRight for several frames; the dot must move even with no room.
  held.add('ArrowRight');
  for (let i = 0; i < 10; i++) cart.update(0.1);
  drawCalls.length = 0;
  cart.draw();
  dots = drawCalls.filter((c) => c.w === 12 && c.h === 12);
  const movedX = dots[dots.length - 1].x;
  assert.ok(movedX > startX + 50, `dot moved right while offline (${startX} -> ${movedX})`);

  console.log(`PASS lobby: renders + moves with NO server (x ${startX} -> ${movedX}), init non-blocking`);
  process.exit(0);
})().catch((e) => {
  console.error('FAIL lobby:', e && e.message ? e.message : e);
  process.exit(1);
});
