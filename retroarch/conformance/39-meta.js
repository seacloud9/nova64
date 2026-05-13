// Conformance cart 39: manifest metadata exposed through nova64.meta.

let errors = [];

export function init() {
   if (!nova64.meta) throw new Error('nova64.meta missing');
   const expected = {
      name: 'meta-cart',
      title: 'Meta Cart',
      author: 'Nova Team',
      version: '1.2.3',
      main: 'src/main.js',
   };
   for (const key of Object.keys(expected)) {
      if (typeof nova64.meta[key] !== 'function') errors.push(key + ':fn');
      else if (nova64.meta[key]() !== expected[key]) errors.push(key + ':' + nova64.meta[key]());
   }
}

export function update() {}

export function draw() {
   cls(rgba8(12, 10, 22, 255));
   const ok = errors.length === 0;
   rect(20, 32, 150, 42, ok ? rgba8(80, 190, 255, 255) : rgba8(220, 60, 80, 255), true);
   print(ok ? '39 meta ok' : '39 meta fail', 4, 4, ok ? rgba8(90, 255, 140, 255) : rgba8(255, 110, 110, 255));
   if (!ok) print(errors[0], 4, 16, rgba8(255, 180, 140, 255));
}
