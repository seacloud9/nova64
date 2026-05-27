/*
 * 110-input-extended: regression test for the web-compat extended
 * button table (indices 8-13). Carts ported from the browser call
 * btn(N) / btnp(N) with N up to 13 — e.g. f-zero-nova-3d's start
 * screen needs btnp(13) to fire when a face button is pressed.
 * Before the extended table was added, indices >= 8 silently
 * returned false and the F-Zero title screen was unreachable.
 *
 * The cart paints one row per index. Green = btn(i) currently held
 * this frame; red = not held. The harness drives different button /
 * key combinations through --btn / --key so each invocation produces
 * a deterministic pixel checksum tied to which extended indices the
 * core wires up.
 */

let frame = 0;
let state = new Array(14).fill(false);

export function init() {}

export function update() {
  frame++;
  // Sample on frame 2 so the harness has pushed input through poll +
  // the core's previous-state book-keeping; btn(N) returns the
  // currently-held value, robust against btnp edge-vs-held semantics.
  if (frame === 2) {
    for (let i = 0; i < 14; i++) {
      state[i] = btn(i);
    }
  }
}

export function draw() {
  cls(rgba8(8, 8, 16, 255));
  print("EXTENDED BUTTON TABLE", 8, 4, rgba8(220, 220, 240, 255));
  for (let i = 0; i < 14; i++) {
    const y = 22 + i * 14;
    const held = state[i];
    const fill = held ? rgba8(80, 220, 80, 255) : rgba8(120, 40, 40, 255);
    rectfill(60, y, 120, 10, fill);
    print(`btn(${i})`, 8, y + 1, rgba8(220, 220, 220, 255));
  }
}
