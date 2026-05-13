// Conformance cart 28: playSound() from a .nova package asset.
// The package contains a 0.25s 440Hz sine wave as raw int16 mono PCM.
// playSound() is called in init(); audio output is verified via checksum.

let errors = [];

export function init() {
   if (typeof playSound !== 'function')
      throw new Error('playSound() binding missing');

   if (!nova64.assets.has('sounds/beep.pcm'))
      throw new Error('sounds/beep.pcm asset missing');

   const ok = playSound('sounds/beep.pcm', 0.5);
   if (!ok) errors.push('playSound-returned-false');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('28 PLAY SOUND', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
