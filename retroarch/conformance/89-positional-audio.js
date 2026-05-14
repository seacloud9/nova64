// Conformance cart 89: positional 3D audio API
// setListenerPos / playSound3D API surface test (no audio asset needed).

let ok = false;

export function init() {
   // setListenerPos must not throw
   setListenerPos(0, 0, 0);
   setListenerPos(1.5, -2.0, 3.0);

   // nova64.audio.setListenerPos alias
   if (typeof nova64.audio.setListenerPos !== 'function')
      throw new Error('nova64.audio.setListenerPos missing');
   nova64.audio.setListenerPos(0, 0, 0);

   // playSound3D with missing asset must return false (not throw)
   const r = playSound3D('sfx/missing.ogg', 5, 0, 0, 1.0, 20.0);
   if (typeof r !== 'boolean') throw new Error('playSound3D must return boolean: ' + typeof r);

   // Source beyond maxDist must return false (inaudible)
   const far = playSound3D('sfx/missing.ogg', 999, 0, 0, 1.0, 10.0);
   if (far !== false) throw new Error('far sound must return false');

   // nova64.audio.playSound3D alias
   if (typeof nova64.audio.playSound3D !== 'function')
      throw new Error('nova64.audio.playSound3D missing');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 14, 18, 255));
   print('89 POSITIONAL AUDIO', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
