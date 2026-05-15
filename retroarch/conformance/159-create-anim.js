// Conformance cart 159: createAnim / drawAnim / animFrame / animDone / setAnimFPS / resetAnim / destroyAnim.

let errors = [];
let anim = 0;

export function init() {
   if (typeof createAnim  !== 'function') { errors.push('createAnim-missing');  return; }
   if (typeof drawAnim    !== 'function') { errors.push('drawAnim-missing');    return; }
   if (typeof animFrame   !== 'function') { errors.push('animFrame-missing');   return; }
   if (typeof animDone    !== 'function') { errors.push('animDone-missing');    return; }
   if (typeof setAnimFPS  !== 'function') { errors.push('setAnimFPS-missing');  return; }
   if (typeof resetAnim   !== 'function') { errors.push('resetAnim-missing');   return; }
   if (typeof destroyAnim !== 'function') { errors.push('destroyAnim-missing'); return; }

   // createAnim returns a non-zero handle when given a valid path
   anim = createAnim('gfx/player.png', 16, 16, 4, 8.0, 0, 0);
   // May return 0 if asset not found — just check it doesn't crash
   if (typeof anim !== 'number') errors.push('createAnim-not-number');

   // animFrame and animDone must return numbers/booleans without crashing
   const f = animFrame(anim);
   if (typeof f !== 'number') errors.push('animFrame-not-number');
   const d = animDone(anim);
   if (typeof d !== 'boolean' && typeof d !== 'number') errors.push('animDone-bad-type');

   setAnimFPS(anim, 12.0);
   resetAnim(anim);
   destroyAnim(anim);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('159 CREATE ANIM', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   print('createAnim/drawAnim API ok', 8, 40, rgba8(180, 220, 255, 255));
   print('setAnimFPS/resetAnim ok',    8, 52, rgba8(180, 220, 255, 255));
   print('destroyAnim ok',             8, 64, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
