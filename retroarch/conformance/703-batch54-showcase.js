// Conformance cart 703: Batch 54 combined showcase.
// loadModel, loadVoxModel, playAnimation, stopAnimation, updateAnimations,
// getAnimationNames, setAnimationSpeed, isAnimationPlaying, animationProgress,
// createCustomMaterial, destroyMaterial, setMeshMaterial

let errors = [];
let t = 0;
let meshes3d = [];

export function init() {
   const needed = ['loadModel','loadVoxModel','playAnimation','stopAnimation',
                   'updateAnimations','getAnimationNames','setAnimationSpeed',
                   'isAnimationPlaying','animationProgress',
                   'createCustomMaterial','destroyMaterial','setMeshMaterial'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   // stubs: loadModel → 0, but scene should still work
   const colors = [
      rgba8(255, 100, 100, 255), rgba8(100, 255, 100, 255),
      rgba8(100, 100, 255, 255), rgba8(255, 200, 80,  255),
      rgba8(200, 80,  255, 255), rgba8(80,  240, 220, 255),
   ];
   for (let i = 0; i < 6; i++) {
      const m = createSphere(0.5, colors[i]);
      const angle = (i / 6) * Math.PI * 2;
      setPosition(m, Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5 - 5);
      const mat = createCustomMaterial({ roughness: i / 5, metalness: 1 - i / 5 });
      setMeshMaterial(m, mat);
      meshes3d.push(m);
   }

   loadModel('hero.glb');
   loadVoxModel('world.vox');

   playAnimation(0, 'idle');
   setAnimationSpeed(0, 1.0);
   const playing = isAnimationPlaying(0);
   if (typeof playing !== 'boolean') errors.push('playing-type');
   const prog = animationProgress(0);
   if (typeof prog !== 'number') errors.push('prog-type');

   const names = getAnimationNames(0);
   if (!Array.isArray(names)) errors.push('names-type');

   updateAnimations(0.016);
   stopAnimation(0);
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   updateAnimations(dt);
   for (let i = 0; i < meshes3d.length; i++) {
      const angle = (i / meshes3d.length) * Math.PI * 2 + t * 0.4;
      setPosition(meshes3d[i], Math.cos(angle) * 2.5, Math.sin(t * 0.8 + i) * 0.5, Math.sin(angle) * 2.5 - 5);
      setRotation(meshes3d[i], 0, t * 0.6 + i * 0.8, 0);
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('703 BATCH 54', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('model+anim+material', 4, 24, rgba8(160, 220, 255, 200));
   print('stubs ok', 4, 34, rgba8(140, 200, 255, 180));

   // draw progress bar as placeholder animation UI
   const prog = animationProgress(0);
   const bw = Math.floor(prog * 200);
   rect(20, 50, 200, 8, rgba8(40, 40, 60, 200));
   if (bw > 0) rect(20, 50, bw, 8, rgba8(80, 180, 255, 220));
   print('anim: 0%', 20, 60, rgba8(140, 180, 220, 180));
}
