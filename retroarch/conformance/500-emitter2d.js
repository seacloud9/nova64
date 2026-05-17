// Conformance cart 500: createEmitter2D, burstEmitter2D, setEmitter2DActive,
//                        updateEmitter2D, drawEmitter2D, clearEmitter2D.

let errors = [];

export function init() {
   const needed = ['createEmitter2D', 'burstEmitter2D', 'setEmitter2DActive',
                   'updateEmitter2D', 'drawEmitter2D', 'clearEmitter2D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 6, 20, 255));
   print('500 EMITTER2D', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Create emitter — orange fire upward
   const em1 = createEmitter2D({
      x: 160, y: 280, spread: 0.4,
      speedMin: 40, speedMax: 100,
      lifetimeMin: 0.3, lifetimeMax: 0.8,
      gravY: 0,
      color: rgba8(255, 200, 60, 255),
      colorEnd: rgba8(255, 60, 0, 0),
      size: 5, sizeEnd: 0, maxCount: 80
   });

   // Burst emit 40 particles
   burstEmitter2D(em1, 40);

   // Create second emitter — blue sparkles
   const em2 = createEmitter2D({
      x: 400, y: 280, spread: 1.2,
      speedMin: 30, speedMax: 80,
      lifetimeMin: 0.5, lifetimeMax: 1.2,
      gravY: 60,
      color: rgba8(100, 160, 255, 255),
      colorEnd: rgba8(60, 80, 255, 0),
      size: 4, sizeEnd: 0, maxCount: 60
   });
   burstEmitter2D(em2, 30);

   // Active continuous emitter
   const em3 = createEmitter2D({
      x: 320, y: 220, spread: 3.14,
      speedMin: 20, speedMax: 50,
      lifetimeMin: 0.4, lifetimeMax: 0.9,
      gravY: 80,
      color: rgba8(200, 255, 100, 200),
      colorEnd: rgba8(80, 200, 60, 0),
      size: 3, sizeEnd: 0, rate: 60, maxCount: 40
   });
   setEmitter2DActive(em3, true);

   // Run several update steps
   for (let i = 0; i < 20; i++) updateEmitter2D(em3, 0.016);

   // Draw all emitters
   drawEmitter2D(em1);

   // Clear em2 before drawing
   clearEmitter2D(em2);

   // Verify emitter objects have _h property
   const structOk = typeof em1._h === 'number' && typeof em3._h === 'number';
   rectfill(20, 300, 60, 320, structOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
