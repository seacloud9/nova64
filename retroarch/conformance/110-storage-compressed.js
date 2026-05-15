// Conformance cart 110: compressed storage (8G stretch).
// storageSetCompressed(key, value) writes zlib-deflated JSON to key.z file.
// storageGetCompressed(key, default) reads and decompresses it.
// storageHasCompressed(key) checks existence.
// nova64.storage.saveCompressed / loadCompressed / hasCompressed equivalents.

let errors = [];

export function init() {
   if (typeof storageSetCompressed !== 'function') { errors.push('storageSetCompressed-missing'); return; }
   if (typeof storageGetCompressed !== 'function') { errors.push('storageGetCompressed-missing'); return; }
   if (typeof storageHasCompressed !== 'function') { errors.push('storageHasCompressed-missing'); return; }

   const key = '__test_compressed__';

   // Write compressed
   const obj = { score: 9999, level: 42, tag: 'hello-world' };
   const wrote = storageSetCompressed(key, obj);
   if (!wrote) { errors.push('storageSetCompressed returned false'); return; }

   // Has
   if (!storageHasCompressed(key))
      errors.push('storageHasCompressed returned false after write');

   // Read back
   const loaded = storageGetCompressed(key, null);
   if (!loaded) { errors.push('storageGetCompressed returned null'); return; }
   if (loaded.score !== 9999)  errors.push('score mismatch: ' + loaded.score);
   if (loaded.level !== 42)    errors.push('level mismatch: ' + loaded.level);
   if (loaded.tag !== 'hello-world') errors.push('tag mismatch: ' + loaded.tag);

   // namespace alias
   if (typeof nova64.storage.saveCompressed !== 'function')
      errors.push('nova64.storage.saveCompressed-missing');

   // Default value for missing key
   const missing = storageGetCompressed('__nonexistent_key_xyz__', 'default_val');
   if (missing !== 'default_val')
      errors.push('default not returned for missing key');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 15, 25, 255));
   print('110 STORAGE COMPRESSED', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
