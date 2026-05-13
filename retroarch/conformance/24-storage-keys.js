// Conformance cart 24: storage keys(), has(), and clear()
// Verifies that keys() lists stored entries, has() detects them,
// and clear() removes them all.

let errors = [];

export function init() {
   if (typeof nova64.storage.has !== 'function')
      throw new Error('nova64.storage.has missing');
   if (typeof nova64.storage.keys !== 'function')
      throw new Error('nova64.storage.keys missing');
   if (typeof nova64.storage.clear !== 'function')
      throw new Error('nova64.storage.clear missing');

   // Clean slate before the test
   nova64.storage.clear();

   // Save three entries
   nova64.storage.saveData('alpha', { n: 1 });
   nova64.storage.saveData('beta', { n: 2 });
   nova64.storage.saveData('gamma', { n: 3 });

   // has() positive cases
   if (!nova64.storage.has('alpha')) errors.push('has:alpha-missing');
   if (!nova64.storage.has('beta'))  errors.push('has:beta-missing');
   if (!nova64.storage.has('gamma')) errors.push('has:gamma-missing');

   // has() negative case
   if (nova64.storage.has('noexist')) errors.push('has:false-positive');

   // keys() should return all three
   const ks = nova64.storage.keys();
   if (!Array.isArray(ks)) {
      errors.push('keys:not-array');
   } else {
      const sorted = ks.slice().sort();
      if (sorted.length !== 3)         errors.push('keys:count=' + sorted.length);
      if (sorted[0] !== 'alpha')       errors.push('keys:0=' + sorted[0]);
      if (sorted[1] !== 'beta')        errors.push('keys:1=' + sorted[1]);
      if (sorted[2] !== 'gamma')       errors.push('keys:2=' + sorted[2]);
   }

   // clear() removes all entries; returns count
   const removed = nova64.storage.clear();
   if (removed !== 3) errors.push('clear:count=' + removed);

   // keys() should now be empty
   const after = nova64.storage.keys();
   if (!Array.isArray(after) || after.length !== 0)
      errors.push('keys-after-clear:' + (Array.isArray(after) ? after.length : 'notarray'));

   // has() should return false after clear
   if (nova64.storage.has('alpha')) errors.push('has-after-clear:alpha');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('24 STORAGE KEYS', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
