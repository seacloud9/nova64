// Conformance cart 608: beginCamera2D, endCamera2D,
//                        cam2DWorldToScreen, cam2DScreenToWorld, cam2DGetBounds,
//                        Ease constant.

let errors = [];

export function init() {
   const needed = ['beginCamera2D', 'endCamera2D',
                   'cam2DWorldToScreen', 'cam2DScreenToWorld', 'cam2DGetBounds'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof globalThis['Ease'] !== 'object' || globalThis['Ease'] === null)
      errors.push('Ease-missing');
   if (errors.length > 0) return;

   // cam2D roundtrip: move camera to (50, 30), check transforms
   const cam = {x: 50, y: 30};
   beginCamera2D(cam);

   const ws = cam2DWorldToScreen(150, 100, cam);
   if (Math.abs(ws.x - 100) > 0.5 || Math.abs(ws.y - 70) > 0.5)
      errors.push('worldToScreen-value');

   const sw = cam2DScreenToWorld(100, 70, cam);
   if (Math.abs(sw.x - 150) > 0.5 || Math.abs(sw.y - 100) > 0.5)
      errors.push('screenToWorld-value');

   const bounds = cam2DGetBounds(cam);
   if (typeof bounds.left !== 'number') errors.push('bounds-fields');
   if (Math.abs(bounds.left - 50) > 0.5)  errors.push('bounds-left');
   if (Math.abs(bounds.top  - 30) > 0.5)  errors.push('bounds-top');

   endCamera2D();

   // Ease: spot-check a few functions
   if (typeof Ease.linear   !== 'function') errors.push('Ease.linear-missing');
   if (typeof Ease.inQuad   !== 'function') errors.push('Ease.inQuad-missing');
   if (typeof Ease.outCubic !== 'function') errors.push('Ease.outCubic-missing');
   if (Math.abs(Ease.linear(0.5) - 0.5) > 0.001) errors.push('Ease.linear-value');
   if (Math.abs(Ease.inQuad(0.5) - 0.25) > 0.001) errors.push('Ease.inQuad-value');
   if (Math.abs(Ease.outSine(1.0) - 1.0) > 0.001) errors.push('Ease.outSine-value');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 7, 20, 255));
   print('608 CAMERA2D EASE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // camera offset demo: same circle drawn with and without camera
   const cam = {x: 60, y: 20};
   beginCamera2D(cam);
   circle(200, 150, 20, rgba8(80, 200, 255, 255), false);
   endCamera2D();
   circle(200, 150, 20, rgba8(255, 200, 60, 100), true);
   print('cam offset -60,-20', 4, 170, rgba8(180, 180, 220, 200));

   // Ease curve strip
   for (let i = 0; i < 40; i++) {
      const t = i / 39;
      const y = Math.floor(Ease.inCubic(t) * 60);
      pset(320 + i * 4, 200 - y, hslColor(i * 6, 0.8, 0.5, 255));
   }
   print('Ease.inCubic', 320, 210, rgba8(200, 200, 255, 200));

   // cam2DGetBounds display
   const b = cam2DGetBounds({x: 40, y: 10});
   print('bounds ok', 4, 220, rgba8(80, 255, 120, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
