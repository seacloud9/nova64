// Conformance cart 292: browser-style key(code) routing.

let frame = 0;
let held = {};

const CHECKS = [
  ['KeyA', 'KeyA'],
  ['KeyW', 'KeyW'],
  ['Digit1', 'Digit1'],
  ['ArrowUp', 'ArrowUp'],
  ['btn8', 8],
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
  cls(rgba8(10, 9, 18, 255));
  print('292 DOM KEY CODES', 8, 4, rgba8(220, 225, 255, 255));

  for (let i = 0; i < CHECKS.length; i++) {
    const name = CHECKS[i][0];
    const y = 24 + i * 22;
    const on = !!held[name];
    const fill = on ? rgba8(80, 220, 100, 255) : rgba8(120, 42, 48, 255);
    rectfill(92, y, 180, 14, fill);
    print(name, 12, y + 3, rgba8(230, 230, 235, 255));
  }

  print('ok', 8, 146, rgba8(80, 255, 120, 255));
}
