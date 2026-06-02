// Conformance cart 293: controller-to-key bridge for keyboard-first carts.

let frame = 0;
let held = {};

const CHECKS = [
  ['KeyZ', 'KeyZ'],
  ['KeyX', 'KeyX'],
  ['KeyC', 'KeyC'],
  ['KeyV', 'KeyV'],
  ['KeyI', 'KeyI'],
  ['Tab', 'Tab'],
  ['btn15', 15],
];

export function init() {}

export function update() {
  frame++;
  if (frame === 2) {
    held = {};
    for (const [name, code] of CHECKS) {
      held[name] = typeof code === 'number' ? btn(code) : key(code);
    }
  }
}

export function draw() {
  cls(rgba8(9, 10, 18, 255));
  print('293 CONTROLLER KEY BRIDGE', 8, 4, rgba8(220, 225, 255, 255));

  for (let i = 0; i < CHECKS.length; i++) {
    const name = CHECKS[i][0];
    const y = 24 + i * 20;
    const on = !!held[name];
    const fill = on ? rgba8(80, 220, 100, 255) : rgba8(120, 42, 48, 255);
    rectfill(92, y, 180, 12, fill);
    print(name, 12, y + 2, rgba8(230, 230, 235, 255));
  }

  print('ok', 8, 174, rgba8(80, 255, 120, 255));
}
