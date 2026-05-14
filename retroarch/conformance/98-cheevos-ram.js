// Conformance cart 98: RetroAchievements cart RAM
// peek(addr) reads a byte, poke(addr, val) writes a byte.
// nova64.cheevos.peek / poke / ramSize aliases.
// 256-byte address space, byte values 0-255.

let ok = false;

export function init() {
   if (typeof peek !== 'function') throw new Error('peek missing');
   if (typeof poke !== 'function') throw new Error('poke missing');
   if (typeof nova64.cheevos !== 'object') throw new Error('nova64.cheevos missing');
   if (typeof nova64.cheevos.peek !== 'function') throw new Error('nova64.cheevos.peek missing');
   if (typeof nova64.cheevos.poke !== 'function') throw new Error('nova64.cheevos.poke missing');
   if (typeof nova64.cheevos.ramSize !== 'function') throw new Error('nova64.cheevos.ramSize missing');

   const size = nova64.cheevos.ramSize();
   if (size !== 256) throw new Error('ramSize must be 256, got ' + size);

   // Write and read back
   poke(0, 42);
   if (peek(0) !== 42) throw new Error('peek(0) after poke(0,42) failed: ' + peek(0));

   poke(255, 0xFF);
   if (peek(255) !== 255) throw new Error('peek(255) failed');

   // Byte truncation
   poke(1, 0x1FF);
   if (peek(1) !== 255) throw new Error('byte truncation failed: ' + peek(1));

   // Out-of-range returns 0, does not throw
   const oob = peek(512);
   if (typeof oob !== 'number') throw new Error('out-of-range peek must return number');

   // namespace aliases agree
   poke(10, 77);
   if (nova64.cheevos.peek(10) !== 77) throw new Error('namespace peek mismatch');
   nova64.cheevos.poke(10, 33);
   if (peek(10) !== 33) throw new Error('namespace poke mismatch');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('98 CHEEVOS RAM', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('peek(0)=' + peek(0), 4, 24, rgba8(180, 200, 180, 255));
}
