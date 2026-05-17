// Conformance cart 739: Batch 58 showcase — audio utils + color grade.
// setMasterVolume, getMasterVolume, isMusicPlaying, getActiveSoundCount,
// setListenerDir, getListenerPos, setAudioRolloff, getAudioRolloff,
// stopAllSounds, setColorGrade, crossfade, scheduleSound

let errors = [];
let t = 0;
let spheres = [];
const N = 8;

export function init() {
   const needed = ['setMasterVolume','getMasterVolume','isMusicPlaying',
                   'getActiveSoundCount','setListenerDir','getListenerPos',
                   'setAudioRolloff','getAudioRolloff','stopAllSounds',
                   'setColorGrade','crossfade','scheduleSound'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 3, 10], [0, 0, 0]);
   setLightDirection(0.8, 1.5, 1);

   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.45, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle) * 3, 0, Math.sin(angle) * 3 - 3);
      spheres.push(m);
   }

   // Audio utils
   setMasterVolume(0.5);
   const mv = getMasterVolume();
   if (Math.abs(mv - 0.5) > 0.05) errors.push('vol-bad');
   setMasterVolume(0.4);

   setListenerDir(0, 0, -1);
   const lp = getListenerPos();
   if (!Array.isArray(lp)) errors.push('lp-bad');

   setAudioRolloff(1.0);

   stopAllSounds();
   crossfade(1, 2, 0.5);
   scheduleSound('test.ogg', 2.0);
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   for (let i = 0; i < spheres.length; i++) {
      const angle = (i / N) * Math.PI * 2 + t * 0.5;
      setPosition(spheres[i], Math.cos(angle) * 3, Math.sin(t + i * 0.8) * 0.5, Math.sin(angle) * 3 - 3);
   }
   // Pulse color grade with time
   const rg = 0.9 + Math.sin(t * 1.2) * 0.15;
   const gg = 0.95 + Math.cos(t * 0.9) * 0.1;
   const bg = 1.0 + Math.sin(t * 0.7 + 1) * 0.2;
   setColorGrade(rg, gg, bg);
   // Listener follows "player"
   setListenerDir(Math.sin(t * 0.5), 0, -Math.cos(t * 0.5));
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('739 BATCH 58', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('audio utils + colorgrade', 4, 24, rgba8(200, 200, 255, 200));
   print('master vol: ' + getMasterVolume().toFixed(2), 4, 34, rgba8(160, 200, 255, 180));
   print('rolloff: ' + getAudioRolloff().toFixed(1), 4, 44, rgba8(160, 200, 255, 180));
   print('active sounds: ' + getActiveSoundCount(), 4, 54, rgba8(160, 200, 255, 160));
}
