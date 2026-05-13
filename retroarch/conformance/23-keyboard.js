// Conformance cart 23: keyboard input (key/keyp bindings)
// Harness injects --key space so space is held for all 3 frames.
// key_prev_held starts at 0, so frame 0 sees space as a new press (edge).
// Frames 1+ see space held but no edge (already seen).
// init() verifies the bindings exist; update() accumulates validation errors;
// draw() renders deterministically based on error state.

let frame = 0;
let errors = [];

export function init() {
   if (typeof key !== 'function')
      throw new Error('key() binding missing');
   if (typeof keyp !== 'function')
      throw new Error('keyp() binding missing');
}

export function update(dt) {
   const held = key('space');
   const edge = keyp('space');
   const upHeld = key('up');
   const aHeld = key('a');
   const f1Held = key('f1');

   if (frame === 0) {
      // First frame: space is injected and prev=0 so it's a fresh press
      if (!held) errors.push('f0:space-not-held');
      if (!edge) errors.push('f0:space-no-edge');
      if (upHeld) errors.push('f0:up-false-held');
      if (aHeld) errors.push('f0:a-false-held');
      if (f1Held) errors.push('f0:f1-false-held');
   } else {
      // Subsequent frames: space held but no longer an edge
      if (!held) errors.push('f' + frame + ':space-not-held');
      if (edge) errors.push('f' + frame + ':space-repeat-edge');
   }
   frame++;
}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('23 KEYBOARD', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
