// Conformance cart 79: storage versioning
// Verifies storageVersion() / storageSetVersion() round-trip.

let ok = false;

export function init() {
   // Start at 0 (clean save dir for each test run)
   storageSetVersion(0);
   const v0 = storageVersion();
   if (v0 !== 0) throw new Error('expected v=0 got ' + v0);

   storageSetVersion(3);
   const v3 = storageVersion();
   if (v3 !== 3) throw new Error('expected v=3 got ' + v3);

   // Also accessible via nova64.storage namespace
   nova64.storage.setVersion(7);
   const v7 = nova64.storage.version();
   if (v7 !== 7) throw new Error('expected v=7 got ' + v7);

   // Reset to 0 for next run
   storageSetVersion(0);
   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(15, 20, 30, 255));
   print('79 STORAGE VERSION', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14, ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
