// Conformance cart 93: in-cart developer console
// nova64.console.print(text) appends to the overlay ring buffer.
// nova64.console.clear() empties it.
// nova64.console.lines() returns the current lines array.
// devPrint(text) is the global alias.

let ok = false;

export function init() {
   nova64.console.clear();

   if (typeof nova64.console.print !== 'function')
      throw new Error('nova64.console.print missing');
   if (typeof nova64.console.clear !== 'function')
      throw new Error('nova64.console.clear missing');
   if (typeof nova64.console.lines !== 'function')
      throw new Error('nova64.console.lines missing');

   nova64.console.print('line A');
   nova64.console.print('line B');
   nova64.console.print('line C');

   const lines = nova64.console.lines();
   if (!Array.isArray(lines)) throw new Error('lines() must return array');
   if (lines.length !== 3) throw new Error('expected 3 lines, got ' + lines.length);
   if (lines[0] !== 'line A') throw new Error('lines[0] mismatch: ' + lines[0]);
   if (lines[2] !== 'line C') throw new Error('lines[2] mismatch');

   nova64.console.clear();
   if (nova64.console.lines().length !== 0)
      throw new Error('clear() did not empty the buffer');

   // Ring buffer wrap — add more than NOVA64_DEV_CON_LINES (12) entries
   for (let i = 0; i < 14; i++)
      nova64.console.print('wrap-' + i);
   const after = nova64.console.lines();
   if (after.length !== 12) throw new Error('ring wrap: expected 12, got ' + after.length);
   if (after[0] !== 'wrap-2') throw new Error('ring oldest wrong: ' + after[0]);

   // Global alias
   if (typeof devPrint !== 'function') throw new Error('devPrint global missing');
   devPrint('from global');

   nova64.console.clear();
   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 14, 20, 255));
   print('93 DEV CONSOLE', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
