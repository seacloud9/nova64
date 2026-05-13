// Conformance cart 29: runtime utilities (frame/time, clip, stopAllSounds)
// Tests nova64.frame(), nova64.time(), setClip/clearClip, stopAllSounds.

let errors = [];
let lastFrame = -1;
let lastTime  = -1;

export function init() {
   if (typeof nova64.frame  !== 'function') throw new Error('nova64.frame missing');
   if (typeof nova64.time   !== 'function') throw new Error('nova64.time missing');
   if (typeof setClip       !== 'function') throw new Error('setClip missing');
   if (typeof clearClip     !== 'function') throw new Error('clearClip missing');
   if (typeof stopAllSounds !== 'function') throw new Error('stopAllSounds missing');
   stopAllSounds(); // must not throw
}

export function update(dt) {
   const f = nova64.frame();
   const t = nova64.time();
   if (typeof f !== 'number' || f < 0) errors.push('frame:' + f);
   if (typeof t !== 'number' || t < 0) errors.push('time:' + t);
   // Frame should strictly increase each call
   if (lastFrame >= 0 && f <= lastFrame) errors.push('frame-not-advancing:' + f);
   // Time should match frame / FPS
   if (lastTime >= 0 && t <= lastTime) errors.push('time-not-advancing:' + t);
   lastFrame = f;
   lastTime  = t;
}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('29 RUNTIME UTILS', 4, 4, rgba8(255, 220, 80, 255));

   // Clip to a small region and draw outside it; only pixels inside should appear
   setClip(100, 100, 80, 40);
   circ(140, 120, 30, rgba8(255, 100, 60, 255));  // overlaps clip boundary
   clearClip();

   // After clearClip, draw normally
   circ(320, 180, 40, rgba8(80, 160, 255, 255));

   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
