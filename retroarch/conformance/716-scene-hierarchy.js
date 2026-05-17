// Conformance cart 716: attachMesh, detachMesh, getChildren, getParent,
// setCRT, setVignette, setBloom, setChromatic, setPixelate, setPosterize,
// resetPost, getPostState

let errors = [];

export function init() {
   const needed = ['attachMesh','detachMesh','getChildren','getParent',
                   'setCRT','setVignette','setBloom','setChromatic',
                   'setPixelate','setPosterize','resetPost','getPostState'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 2, 8], [0, 0, 0]);

   const parent = createCube(1.5, rgba8(80, 140, 220, 255));
   setPosition(parent, 0, 0, 0);

   const c1 = createSphere(0.4, rgba8(255, 160, 60, 255));
   const c2 = createSphere(0.4, rgba8(60, 220, 160, 255));
   setPosition(c1, 1.2, 0, 0);
   setPosition(c2, -1.2, 0, 0);

   attachMesh(c1, parent);
   attachMesh(c2, parent);

   const p1 = getParent(c1);
   if (p1 !== parent) errors.push('parent-c1:' + p1 + '!=' + parent);

   const kids = getChildren(parent);
   if (!Array.isArray(kids) || kids.length < 2) errors.push('children-bad:' + (kids ? kids.length : 'null'));

   detachMesh(c1);
   if (getParent(c1) !== 0) errors.push('detach-fail');

   // Post-processing
   setBloom(0.3);
   setVignette(0.4);
   setChromatic(0.002);
   const ps = getPostState();
   if (!ps || typeof ps.bloom !== 'number') errors.push('postState-bad');
   if (Math.abs((ps.bloom||0) - 0.3) > 0.05) errors.push('bloom-val:' + ps.bloom);

   resetPost();
   const ps2 = getPostState();
   if (ps2 && ps2.bloom > 0.01) errors.push('reset-bloom:' + ps2.bloom);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('716 HIERARCHY', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('attach/detach + post', 4, 24, rgba8(160, 220, 255, 200));
   }
}
