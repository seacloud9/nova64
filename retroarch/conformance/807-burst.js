// Conformance cart 807: burst — createBurst, triggerBurst, updateBurst,
//   drawBurst, isBurstDone, setBurstColors, destroyBurst

let burst = 0;
let t = 0;

export function init() {
   burst = createBurst(200, 180, 20, 60);
   setBurstColors(burst, rgba8(255, 200, 60, 255), rgba8(255, 100, 20, 255), rgba8(255, 255, 100, 255));
}

export function update(dt) {
   t += dt;
   updateBurst(burst, dt);
}

export function draw() {
   cls(rgba8(8, 6, 18, 255));

   rectfill(140, 60, 160, 160, rgba8(20, 18, 40, 255));
   print('BURST DEMO', 160, 70, rgba8(200, 180, 255, 200));

   drawBurst(burst);

   const done = isBurstDone(burst);
   print('done:' + done, 4, 30, rgba8(80, 255, 120, 200));

   printBold('807 BURST', 4, 4, rgba8(200, 220, 255, 255));
   print('createBurst triggerBurst updateBurst drawBurst', 4, 14, rgba8(80, 255, 120, 180));
}
