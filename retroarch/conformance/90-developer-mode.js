// Conformance cart 90: developer mode
// isDeveloperMode() must return a boolean. nova64.isDeveloperMode() alias.

let ok = false;

export function init() {
   const dev = isDeveloperMode();
   if (typeof dev !== 'boolean') throw new Error('isDeveloperMode must return boolean: ' + typeof dev);

   const dev2 = nova64.isDeveloperMode();
   if (typeof dev2 !== 'boolean') throw new Error('nova64.isDeveloperMode must return boolean');

   // Both calls must agree
   if (dev !== dev2) throw new Error('isDeveloperMode mismatch between global and namespace');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 16, 10, 255));
   print('90 DEVELOPER MODE', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('dev=' + isDeveloperMode(), 4, 24, rgba8(180, 200, 180, 255));
}
