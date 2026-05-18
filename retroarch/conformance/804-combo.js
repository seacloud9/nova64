// Conformance cart 804: combo — createCombo, hitCombo, resetCombo, updateCombo,
//   drawCombo, getComboCount, isComboActive, destroyCombo

let combo = 0;

export function init() {
   combo = createCombo(60, 140, 1.8);
   // Pre-load 7 hits so first frame shows an active combo
   for (let i = 0; i < 7; i++) hitCombo(combo);
}

export function draw() {
   cls(rgba8(12, 14, 26, 255));

   // Simple arena background
   rectfill(0, 0, 640, 360, rgba8(14, 18, 36, 255));
   rectfill(0, 300, 640, 60, rgba8(22, 28, 44, 255));

   // Enemy silhouette
   rectfill(380, 160, 50, 90, rgba8(60, 30, 30, 255));

   // Player silhouette
   rectfill(180, 180, 40, 80, rgba8(30, 60, 90, 255));

   const active = isComboActive(combo);
   const count  = getComboCount(combo);
   drawCombo(combo);

   printBold('804 COMBO', 4, 4, rgba8(200, 220, 255, 255));
   print('count:' + count + ' active:' + active, 4, 14, rgba8(80, 255, 120, 200));
}
