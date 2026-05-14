// Conformance cart 86: bitmap font API
// loadFont / printFont / destroyFont
// Font asset not required — API must not throw even when asset is missing.

let ok = false;
let fh = 0;

export function init() {
   // loadFont with missing asset must return 0 without throwing
   fh = loadFont('fonts/missing.png', 8, 8);
   if (typeof fh !== 'number') throw new Error('loadFont must return number: ' + typeof fh);

   // printFont with handle 0 must be a no-op (not throw)
   printFont('TEST', 4, 4, rgba8(255, 255, 255, 255), 0);

   // destroyFont on 0 must be a no-op
   destroyFont(0);

   // nova64.draw aliases exist
   if (typeof nova64.draw.loadFont !== 'function') throw new Error('nova64.draw.loadFont missing');
   if (typeof nova64.draw.printFont !== 'function') throw new Error('nova64.draw.printFont missing');
   if (typeof nova64.draw.destroyFont !== 'function') throw new Error('nova64.draw.destroyFont missing');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 10, 20, 255));
   print('86 BITMAP FONT', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('handle=' + fh, 4, 24, rgba8(180, 200, 180, 255));
   // printFont with invalid handle is a no-op — should draw nothing
   printFont('ABC', 4, 34, rgba8(255, 100, 100, 255), fh);
}
