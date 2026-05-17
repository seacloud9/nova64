// Conformance cart 717: setMasterVolume, getMasterVolume, isMusicPlaying,
// getActiveSoundCount, setListenerDir, getListenerPos, setAudioRolloff,
// getAudioRolloff, stopAllSounds, setColorGrade, crossfade, scheduleSound

let errors = [];

export function init() {
   const needed = ['setMasterVolume','getMasterVolume','isMusicPlaying',
                   'getActiveSoundCount','setListenerDir','getListenerPos',
                   'setAudioRolloff','getAudioRolloff','stopAllSounds',
                   'setColorGrade','crossfade','scheduleSound'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setMasterVolume(0.7);
   const mv = getMasterVolume();
   if (Math.abs(mv - 0.7) > 0.05) errors.push('masterVol:' + mv.toFixed(3));

   setMasterVolume(0.4); // restore default

   const playing = isMusicPlaying();
   if (typeof playing !== 'boolean') errors.push('isMusicPlaying-type');

   const cnt = getActiveSoundCount();
   if (typeof cnt !== 'number') errors.push('soundCount-type');

   setListenerDir(0, 0, -1);
   const lp = getListenerPos();
   if (!Array.isArray(lp) || lp.length < 3) errors.push('listenerPos-bad');

   setAudioRolloff(1.5);
   const ro = getAudioRolloff();
   if (Math.abs(ro - 1.5) > 0.05) errors.push('rolloff:' + ro.toFixed(3));
   setAudioRolloff(1.0);

   setColorGrade(1.1, 0.95, 1.2);
   setColorGrade(1.0, 1.0, 1.0); // restore

   stopAllSounds();
   crossfade(1, 2, 0.5);
   scheduleSound('test.wav', 1.0);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('717 AUDIO UTILS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('audio utils ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
