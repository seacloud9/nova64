// Conformance cart 25: mouse input (mouseX/Y, mouseBtn/mouseBtnp)
// Harness injects --mouse-x 5 --mouse-y -3 --mouse-btn left for all frames.
// Frame 0: left button newly pressed (edge), X=5, Y=-3.
// Frame 1+: left held but no edge.

let frame = 0;
let errors = [];

export function init() {
   if (typeof mouseX !== 'function') throw new Error('mouseX missing');
   if (typeof mouseY !== 'function') throw new Error('mouseY missing');
   if (typeof mouseBtn !== 'function') throw new Error('mouseBtn missing');
   if (typeof mouseBtnp !== 'function') throw new Error('mouseBtnp missing');
}

export function update(dt) {
   const mx = mouseX();
   const my = mouseY();
   const left  = mouseBtn('left');
   const right = mouseBtn('right');
   const ledge = mouseBtnp('left');

   if (frame === 0) {
      if (mx !== 5)   errors.push('f0:mx=' + mx);
      if (my !== -3)  errors.push('f0:my=' + my);
      if (!left)      errors.push('f0:left-not-held');
      if (!ledge)     errors.push('f0:left-no-edge');
      if (right)      errors.push('f0:right-false-held');
   } else {
      if (mx !== 5)   errors.push('f' + frame + ':mx=' + mx);
      if (my !== -3)  errors.push('f' + frame + ':my=' + my);
      if (!left)      errors.push('f' + frame + ':left-not-held');
      if (ledge)      errors.push('f' + frame + ':left-repeat-edge');
   }
   frame++;
}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('25 MOUSE', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
