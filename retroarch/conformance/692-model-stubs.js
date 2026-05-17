// Conformance cart 692: loadModel, loadVoxModel, playAnimation, stopAnimation,
// updateAnimations, getAnimationNames, setAnimationSpeed, isAnimationPlaying,
// animationProgress (all stubs — verify they exist and don't crash)

let errors = [];

export function init() {
   const needed = ['loadModel','loadVoxModel','playAnimation','stopAnimation',
                   'updateAnimations','getAnimationNames','setAnimationSpeed',
                   'isAnimationPlaying','animationProgress'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const h = loadModel('nonexistent.glb');
   if (h !== 0) errors.push('model-nonzero:' + h);

   const v = loadVoxModel('nonexistent.vox');
   if (v !== 0) errors.push('vox-nonzero:' + v);

   playAnimation(0, 'walk');
   stopAnimation(0);
   updateAnimations(0.016);

   const names = getAnimationNames(0);
   if (!Array.isArray(names)) errors.push('anim-names-bad');
   if (names.length !== 0) errors.push('anim-names-nonempty');

   setAnimationSpeed(0, 1.5);
   const playing = isAnimationPlaying(0);
   if (playing !== false) errors.push('playing-not-false');

   const prog = animationProgress(0);
   if (prog !== 0) errors.push('progress-not-zero:' + prog);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('692 MODEL STUBS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('model/anim stubs ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
