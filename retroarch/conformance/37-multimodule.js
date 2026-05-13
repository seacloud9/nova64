// Conformance cart 37: .nova package relative ES module imports.

import { label, mixColor } from './lib/module-helper.js';
import value from './lib/value.js';

let ok = false;
let message = '';

export function init() {
   ok = label === 'multi-module' && value === 37;
   const color = mixColor(16);
   ok = ok && color === rgba8(16, 80, 160, 255);
   message = ok ? '37 modules ok' : `37 modules fail ${label} ${value}`;
}

export function update() {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   rect(24, 24, 96, 42, ok ? mixColor(16) : rgba8(180, 40, 40, 255), true);
   print(message, 4, 4, ok ? rgba8(80, 255, 120, 255) : rgba8(255, 120, 120, 255));
}
