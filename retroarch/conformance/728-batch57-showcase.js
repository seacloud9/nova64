// Conformance cart 728: Batch 57 showcase — scene hierarchy + global post.
// attachMesh, detachMesh, getChildren, getParent,
// setCRT, setVignette, setBloom, setChromatic, setPixelate, setPosterize,
// resetPost, getPostState

let errors = [];
let t = 0;
let root, arms = [];
const ARM_COUNT = 5;

export function init() {
   const needed = ['attachMesh','detachMesh','getChildren','getParent',
                   'setCRT','setVignette','setBloom','setChromatic',
                   'setPixelate','setPosterize','resetPost','getPostState'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 5, 10], [0, 0, 0]);
   setLightDirection(1, 2, 1);

   // Central body
   root = createSphere(0.6, rgba8(100, 180, 255, 255));
   setPosition(root, 0, 0, -4);

   // Orbiting arms (children)
   for (let i = 0; i < ARM_COUNT; i++) {
      const angle = (i / ARM_COUNT) * Math.PI * 2;
      const arm = createCone(0.25, 0.8, rgba8(
         (i * 50 + 80) & 255, (i * 80 + 120) & 255, (i * 120 + 180) & 255, 255));
      setPosition(arm, Math.cos(angle) * 2, 0, Math.sin(angle) * 2 - 4);
      attachMesh(arm, root);
      arms.push(arm);
   }

   // Verify hierarchy
   const kids = getChildren(root);
   if (!Array.isArray(kids) || kids.length < ARM_COUNT) errors.push('children-count:' + (kids ? kids.length : '?'));
   if (getParent(arms[0]) !== root) errors.push('parent-fail');

   // Apply some post effects
   setBloom(0.4);
   setVignette(0.3);
   const ps = getPostState();
   if (!ps || (ps.bloom || 0) < 0.1) errors.push('postState-bloom');
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   setRotation(root, 0, t * 0.4, 0);
   for (let i = 0; i < arms.length; i++) {
      const angle = (i / ARM_COUNT) * Math.PI * 2 + t * 1.2;
      setPosition(arms[i],
         Math.cos(angle) * 2,
         Math.sin(t * 1.5 + i) * 0.4,
         Math.sin(angle) * 2 - 4);
      setRotation(arms[i], 0, t * 2.0 + i, t * 0.5);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('728 BATCH 57', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('hierarchy + post', 4, 24, rgba8(160, 220, 255, 200));
   const kids = getChildren(root);
   print('children: ' + (kids ? kids.length : 0), 4, 34, rgba8(140, 200, 255, 160));
}
