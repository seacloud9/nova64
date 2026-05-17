// Conformance cart 669: getMeshPos, getMeshRot, getMeshScale, setMeshPos,
// setMeshRot, setMeshScl, getWorldUp

let errors = [];

export function init() {
   const needed = ['getMeshPos','getMeshRot','getMeshScale',
                   'setMeshPos','setMeshRot','setMeshScl','getWorldUp'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const m = createCube(1, rgba8(200, 100, 255, 255));
   if (!m) { errors.push('cube-fail'); return; }

   setMeshPos(m, 3, 2, -5);
   const pos = getMeshPos(m);
   if (!Array.isArray(pos) || pos.length < 3) { errors.push('pos-bad'); return; }
   if (Math.abs(pos[0] - 3) > 0.01) errors.push('pos-x:' + pos[0].toFixed(3));
   if (Math.abs(pos[1] - 2) > 0.01) errors.push('pos-y:' + pos[1].toFixed(3));

   setMeshRot(m, 0.1, 0.2, 0.3);
   const rot = getMeshRot(m);
   if (!Array.isArray(rot) || rot.length < 3) { errors.push('rot-bad'); return; }
   if (Math.abs(rot[1] - 0.2) > 0.01) errors.push('rot-y:' + rot[1].toFixed(3));

   setMeshScl(m, 2, 3, 1.5);
   const scl = getMeshScale(m);
   if (!Array.isArray(scl) || scl.length < 3) { errors.push('scl-bad'); return; }
   if (Math.abs(scl[0] - 2) > 0.01) errors.push('scl-x:' + scl[0].toFixed(3));

   const up = getWorldUp();
   if (!Array.isArray(up) || up.length < 3) { errors.push('up-bad'); return; }
   if (Math.abs(up[1] - 1) > 0.01) errors.push('up-y:' + up[1].toFixed(3));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('669 MESH TRS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('get/setMesh TRS ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
