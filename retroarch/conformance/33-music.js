// Conformance cart 33: music playback API.
// Tests that playMusic, stopMusic, setMusicVolume, pauseMusic, resumeMusic,
// and musicActive all exist and behave correctly without a real audio asset.

let errors = [];

export function init() {
   // Binding existence checks
   if (typeof playMusic !== 'function')
      throw new Error('playMusic() binding missing');
   if (typeof stopMusic !== 'function')
      throw new Error('stopMusic() binding missing');
   if (typeof setMusicVolume !== 'function')
      throw new Error('setMusicVolume() binding missing');
   if (typeof pauseMusic !== 'function')
      throw new Error('pauseMusic() binding missing');
   if (typeof resumeMusic !== 'function')
      throw new Error('resumeMusic() binding missing');
   if (typeof musicActive !== 'function')
      throw new Error('musicActive() binding missing');

   // Namespace checks
   if (typeof nova64.audio.playMusic !== 'function')
      errors.push('nova64.audio.playMusic-missing');
   if (typeof nova64.audio.stopMusic !== 'function')
      errors.push('nova64.audio.stopMusic-missing');
   if (typeof nova64.audio.setMusicVolume !== 'function')
      errors.push('nova64.audio.setMusicVolume-missing');
   if (typeof nova64.audio.pauseMusic !== 'function')
      errors.push('nova64.audio.pauseMusic-missing');
   if (typeof nova64.audio.resumeMusic !== 'function')
      errors.push('nova64.audio.resumeMusic-missing');
   if (typeof nova64.audio.musicActive !== 'function')
      errors.push('nova64.audio.musicActive-missing');

   // Before any playMusic call music should not be active
   if (musicActive() !== false) errors.push('musicActive-before-play');

   // Calling stop/pause/resume with no music playing should not throw
   stopMusic();
   pauseMusic();
   resumeMusic();

   // setMusicVolume should accept values in [0,1] silently
   setMusicVolume(0.8);
   setMusicVolume(0.0);
   setMusicVolume(1.0);

   // playMusic with a missing asset should return false, not throw
   const result = playMusic('sounds/nonexistent.ogg', 0.7);
   if (result !== false) errors.push('playMusic-missing-asset:' + result);

   // After failed playMusic, musicActive should still be false
   if (musicActive() !== false) errors.push('musicActive-after-failed-play');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('33 MUSIC API', 4, 4, rgba8(255, 220, 80, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
