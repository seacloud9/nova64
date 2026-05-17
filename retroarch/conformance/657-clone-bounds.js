// Conformance cart 657: cloneMesh, getMeshBounds

let errors = [];

export function init() {
   const needed = ['cloneMesh','getMeshBounds'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const src = createCube(2, rgba8(200, 100, 50, 255));
   setPosition(src, 0, 0, -4);

   const dst = cloneMesh(src);
   if (!dst) { errors.push('clone-zero'); return; }
   if (dst === src) { errors.push('clone-same-handle'); return; }

   setPosition(dst, 3, 0, -4);
   setMeshColor(dst, rgba8(50, 200, 100, 255));

   const b = getMeshBounds(src);
   if (!b || typeof b.min === 'undefined') { errors.push('bounds-null'); return; }
   if (!Array.isArray(b.min) || b.min.length < 3) { errors.push('bounds-min-bad'); return; }
   if (!Array.isArray(b.size) || b.size.length < 3) { errors.push('bounds-size-bad'); return; }
   // cube with scale 2 → size should be ~2 along each axis
   if (b.size[0] < 1.5 || b.size[0] > 2.5) errors.push('bounds-size-x:' + b.size[0].toFixed(2));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('657 CLONE BOUNDS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('clone + bounds ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
