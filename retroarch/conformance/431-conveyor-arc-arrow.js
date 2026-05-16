// Conformance cart 431: drawConveyorBelt, drawArcArrow.

let errors = [];

export function init() {
   if (typeof drawConveyorBelt !== 'function') { errors.push('drawConveyorBelt-missing'); return; }
   if (typeof drawArcArrow     !== 'function') { errors.push('drawArcArrow-missing');     return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 20, 255));
   print('431 CONVEYOR ARC ARROW', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Conveyor belts
   drawConveyorBelt(20, 80, 580, 25, 0, rgba8(180, 160, 80, 255));
   drawConveyorBelt(20, 130, 580, 20, 8, rgba8(80, 180, 255, 220));
   drawConveyorBelt(20, 175, 300, 30, 4, rgba8(200, 100, 80, 220));

   // Arc arrows
   drawArcArrow(150, 300, 70, -Math.PI * 0.8, Math.PI * 0.8, rgba8(100, 220, 100, 255));
   drawArcArrow(350, 300, 60, 0, Math.PI * 1.7, rgba8(255, 160, 60, 255));
   drawArcArrow(520, 300, 55, Math.PI * 0.5, Math.PI * 2.5, rgba8(200, 100, 255, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
