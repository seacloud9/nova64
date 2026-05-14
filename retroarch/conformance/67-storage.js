// Conformance cart 67: storage round-trip.
// Tests saveData / loadData / hasData / deleteData / storageKeys / storageClear.
// All operations use unique keys to avoid cross-test pollution.

let errors = [];

export function init() {
   if (typeof saveData !== 'function')
      throw new Error('saveData() binding missing');
   if (typeof loadData !== 'function')
      throw new Error('loadData() binding missing');
   if (typeof hasData !== 'function')
      throw new Error('hasData() binding missing');
   if (typeof deleteData !== 'function')
      throw new Error('deleteData() binding missing');
   if (typeof storageKeys !== 'function')
      throw new Error('storageKeys() binding missing');
   if (typeof storageClear !== 'function')
      throw new Error('storageClear() binding missing');

   // Namespace checks
   if (typeof nova64.storage.saveData !== 'function')
      errors.push('nova64.storage.saveData-missing');
   if (typeof nova64.storage.loadData !== 'function')
      errors.push('nova64.storage.loadData-missing');
   if (typeof nova64.storage.hasData !== 'function')
      errors.push('nova64.storage.hasData-missing');
   if (typeof nova64.storage.deleteData !== 'function')
      errors.push('nova64.storage.deleteData-missing');
   if (typeof nova64.storage.storageKeys !== 'function')
      errors.push('nova64.storage.storageKeys-missing');
   if (typeof nova64.storage.storageClear !== 'function')
      errors.push('nova64.storage.storageClear-missing');

   const KEY1 = 'conf67_num';
   const KEY2 = 'conf67_obj';
   const KEY3 = 'conf67_arr';

   // Clear any prior state
   storageClear();

   // hasData returns false before save
   if (hasData(KEY1) !== false)
      errors.push('hasData-before-save-expected-false');

   // saveData returns true
   const ok1 = saveData(KEY1, 99);
   if (ok1 !== true)
      errors.push('saveData-number-expected-true: ' + ok1);

   // hasData returns true after save
   if (hasData(KEY1) !== true)
      errors.push('hasData-after-save-expected-true');

   // loadData returns saved value
   const v1 = loadData(KEY1);
   if (v1 !== 99)
      errors.push('loadData-number: ' + v1);

   // Object round-trip
   saveData(KEY2, { score: 42, level: 7 });
   const v2 = loadData(KEY2);
   if (!v2 || v2.score !== 42 || v2.level !== 7)
      errors.push('loadData-object: ' + JSON.stringify(v2));

   // Array round-trip
   saveData(KEY3, [1, 2, 3]);
   const v3 = loadData(KEY3);
   if (!Array.isArray(v3) || v3[0] !== 1 || v3[2] !== 3)
      errors.push('loadData-array: ' + JSON.stringify(v3));

   // storageKeys includes saved keys
   const keys = storageKeys();
   if (!Array.isArray(keys))
      errors.push('storageKeys-not-array: ' + typeof keys);
   else if (!keys.includes(KEY1))
      errors.push('storageKeys-missing-KEY1');

   // deleteData removes the key
   const del1 = deleteData(KEY1);
   if (del1 !== true)
      errors.push('deleteData-expected-true: ' + del1);
   if (hasData(KEY1) !== false)
      errors.push('hasData-after-delete-expected-false');

   // loadData missing key returns default
   const def = loadData('no_such_key', 'default_val');
   if (def !== 'default_val')
      errors.push('loadData-default: ' + def);

   // storageClear removes all
   storageClear();
   if (hasData(KEY2) !== false)
      errors.push('hasData-after-storageClear-expected-false');

   // Minimal visual
   clearScene();
   createCube(rgba8(80, 200, 160, 255), [0, 0, -4]);
   setCameraPosition(0, 2, 5);
   setCameraTarget(0, 0, -4);
   setAmbientLight(rgba8(60, 100, 90, 255), 1.0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 16, 14, 255));
   print('67 STORAGE', 4, 4, rgba8(80, 200, 160, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
