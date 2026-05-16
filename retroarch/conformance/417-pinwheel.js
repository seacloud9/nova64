// Conformance cart 417: drawPinwheel, fillPinwheel.

let errors = [];

export function init() {
   if (typeof drawPinwheel !== 'function') { errors.push('drawPinwheel-missing'); return; }
   if (typeof fillPinwheel !== 'function') { errors.push('fillPinwheel-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 6, 18, 255));
   print('417 PINWHEEL', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Outline pinwheels
   drawPinwheel(130, 190, 80, 6, rgba8(80, 180, 255, 255));
   drawPinwheel(300, 190, 70, 4, rgba8(255, 160, 60, 220));
   drawPinwheel(460, 190, 70, 8, rgba8(200, 100, 255, 220));

   // Filled pinwheels
   fillPinwheel(200, 320, 60, 5, rgba8(100, 220, 100, 200));
   fillPinwheel(380, 320, 55, 7, rgba8(255, 100, 160, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
