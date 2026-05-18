// Conformance cart 803: toast — createToast, showToast, updateToast, drawToast,
//   isToastDone, destroyToast

let toast = 0;

export function init() {
   toast = createToast('NOVA64 RUNTIME READY', 3.0);
}

export function draw() {
   cls(rgba8(14, 16, 28, 255));

   // Background UI scene
   rectfill(20, 60, 600, 200, rgba8(20, 24, 40, 255));
   rectfill(20, 60, 600, 1, rgba8(80, 100, 180, 200));
   print('Main Menu', 40, 80, rgba8(180, 200, 255, 200));
   print('Settings', 40, 100, rgba8(140, 160, 210, 160));
   print('Exit', 40, 120, rgba8(140, 160, 210, 160));

   const done = isToastDone(toast);
   drawToast(toast);

   printBold('803 TOAST', 4, 4, rgba8(200, 220, 255, 255));
   print('done:' + done, 4, 14, rgba8(80, 255, 120, 200));
}
