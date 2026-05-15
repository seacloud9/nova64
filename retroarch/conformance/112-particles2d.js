// Conformance cart 112: 2D particle system.
// createParticles2D(opts) → handle; emitParticles2D(h, count);
// setEmitterPos2D(h, x, y); setEmitterActive2D(h, bool);
// updateParticles(dt); drawParticles(); getParticleCount();
// destroyParticles2D(h).

let errors = [];
let em = 0;

export function init() {
   if (typeof createParticles2D !== 'function')   { errors.push('createParticles2D-missing'); return; }
   if (typeof emitParticles2D !== 'function')      { errors.push('emitParticles2D-missing'); return; }
   if (typeof setEmitterPos2D !== 'function')      { errors.push('setEmitterPos2D-missing'); return; }
   if (typeof setEmitterActive2D !== 'function')   { errors.push('setEmitterActive2D-missing'); return; }
   if (typeof updateParticles !== 'function')      { errors.push('updateParticles-missing'); return; }
   if (typeof drawParticles !== 'function')        { errors.push('drawParticles-missing'); return; }
   if (typeof getParticleCount !== 'function')     { errors.push('getParticleCount-missing'); return; }
   if (typeof destroyParticles2D !== 'function')   { errors.push('destroyParticles2D-missing'); return; }

   // Create emitter with custom options
   em = createParticles2D({
      x: 320, y: 200,
      color:       rgba8(255, 220, 60, 255),
      colorEnd:    rgba8(255, 60, 0, 0),
      size: 5, sizeEnd: 0,
      speedMin: 40, speedMax: 100,
      lifetimeMin: 0.3, lifetimeMax: 0.8,
      gravX: 0, gravY: 150,
      spread: Math.PI * 0.6,
      dirX: 0, dirY: -1,
   });
   if (!em || em === 0) { errors.push('createParticles2D returned 0'); return; }

   // Initially no particles
   if (getParticleCount() !== 0)
      errors.push('expected 0 particles before emit, got ' + getParticleCount());

   // Burst 20 particles
   emitParticles2D(em, 20);
   if (getParticleCount() !== 20)
      errors.push('expected 20 particles after emit, got ' + getParticleCount());

   // Advance 0.05s — particles should still be alive (min lifetime 0.3s)
   updateParticles(0.05);
   if (getParticleCount() !== 20)
      errors.push('expected 20 particles after 0.05s, got ' + getParticleCount());

   // Advance far past max lifetime (0.8s) — all should die
   updateParticles(1.0);
   if (getParticleCount() !== 0)
      errors.push('expected 0 particles after 1.05s, got ' + getParticleCount());

   // setEmitterPos repositions the emitter
   setEmitterPos2D(em, 100, 50);

   // Continuous mode: enable, advance, should spawn particles
   setEmitterActive2D(em, true);
   // Create a high-rate emitter to ensure we get at least 1 particle in 0.1s
   const em2 = createParticles2D({ x: 200, y: 150, rate: 50, maxCount: 64 });
   setEmitterActive2D(em2, true);
   updateParticles(0.1);
   if (getParticleCount() < 1)
      errors.push('continuous emitter produced no particles in 0.1s');

   // Destroy first emitter, particles from em2 still active
   destroyParticles2D(em);

   // Second destroy clears everything
   destroyParticles2D(em2);
}

export function update(dt) {
   if (errors.length > 0) return;
   updateParticles(dt);
}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('112 PARTICLES 2D', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   drawParticles();
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
