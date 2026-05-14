// Conformance cart 97: multi-port input
// btn(id, port) and btnp(id, port) accept an optional port argument (0-3).
// Without harness port injection, all port ≥1 buttons read false.
// We verify: correct return type, no throw, API parity.

let ok = false;

export function init() {
   // Port 0 (default) — same as btn(id)
   const b0a = btn('a');
   const b0b = btn('a', 0);
   if (typeof b0a !== 'boolean') throw new Error('btn must return boolean');
   if (b0a !== b0b) throw new Error('btn(id) and btn(id,0) must agree');

   // Ports 1-3 — not injected by harness, should return false
   for (let p = 1; p <= 3; p++) {
      const r = btn('a', p);
      if (typeof r !== 'boolean') throw new Error('btn(id,' + p + ') must return boolean');
   }

   // btnp port arg
   const bp0a = btnp('start');
   const bp0b = btnp('start', 0);
   if (typeof bp0a !== 'boolean') throw new Error('btnp must return boolean');
   if (bp0a !== bp0b) throw new Error('btnp(id) and btnp(id,0) must agree');
   for (let p = 1; p <= 3; p++) {
      const r = btnp('b', p);
      if (typeof r !== 'boolean') throw new Error('btnp(id,' + p + ') must return boolean');
   }

   // nova64.input namespace
   if (typeof nova64.input.btn !== 'function') throw new Error('nova64.input.btn missing');
   if (typeof nova64.input.btnp !== 'function') throw new Error('nova64.input.btnp missing');
   nova64.input.btn('a', 2);
   nova64.input.btnp('b', 3);

   // axis and trigger with port arg
   if (typeof axis !== 'function') throw new Error('axis missing');
   if (typeof trigger !== 'function') throw new Error('trigger missing');
   const ax = axis('left', 'x', 0);
   if (typeof ax !== 'number') throw new Error('axis must return number');
   const tr = trigger('left', 0);
   if (typeof tr !== 'number') throw new Error('trigger must return number');
   // port 2
   axis('right', 'y', 2);
   trigger('right', 2);

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 10, 20, 255));
   print('97 MULTIPORT INPUT', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('p0=' + btn('a', 0), 4, 24, rgba8(180, 200, 180, 255));
   print('p1=' + btn('a', 1), 4, 34, rgba8(180, 200, 180, 255));
}
