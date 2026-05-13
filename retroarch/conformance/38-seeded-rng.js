// Conformance cart 38: harness/core initial RNG seed injection.

let values = [];

export function init() {
   values = [
      nova64.random.int(0, 255),
      nova64.random.int(0, 255),
      nova64.random.int(0, 255),
      nova64.random.int(0, 255),
   ];
}

export function update() {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   for (let i = 0; i < values.length; i++) {
      const v = values[i];
      rect(24 + i * 34, 36, 24, 48 + i * 8, rgba8(v, 255 - v, 90 + i * 30, 255), true);
   }
   print('38 seed ' + values.join(','), 4, 4, rgba8(90, 255, 130, 255));
}
