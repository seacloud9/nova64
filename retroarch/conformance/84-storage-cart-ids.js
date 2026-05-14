// Conformance cart 84: storage.cartIds()
// Must return an Array (empty or populated). Must not throw.

let ok = false;

export function init() {
   // cartIds() returns an array
   const ids = cartIds();
   if (!Array.isArray(ids)) throw new Error('cartIds() must return Array: ' + typeof ids);

   // nova64.storage.cartIds() alias
   const ids2 = nova64.storage.cartIds();
   if (!Array.isArray(ids2)) throw new Error('nova64.storage.cartIds() must return Array');

   // All entries must be strings
   for (const id of ids) {
      if (typeof id !== 'string') throw new Error('cartId entry not string: ' + typeof id);
   }

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 14, 20, 255));
   print('84 CART IDS', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   const ids = cartIds();
   print('count=' + ids.length, 4, 24, rgba8(180, 200, 180, 255));
}
