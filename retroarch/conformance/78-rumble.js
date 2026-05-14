// Conformance cart 78: rumble API
// Verifies rumble() accepts 0-1 range values without throwing.
// In harness mode rumble_fn is NULL so the call is a safe no-op.

export function init() {
   // Full strength both motors
   rumble(1, 1);
   // Zero — should stop any running rumble
   rumble(0, 0);
   // Partial values
   rumble(0.5, 0.25);
   // Out-of-range clamped by the binding
   rumble(2, -1);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(20, 10, 30, 255));
   print('78 RUMBLE', 4, 4, rgba8(255, 180, 80, 255));
   print('strong/weak ok', 4, 14, rgba8(180, 255, 180, 255));
}
