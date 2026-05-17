// Conformance cart 742: Batch 61 — mesh tagging + scene query.
// setMeshTag, getMeshTag, getMeshesByTag, setMeshName, getMeshName,
// getMeshByName, getMeshesInRadius, countActiveMeshes,
// setMeshInt, getMeshInt, setMeshUserFloat, getMeshUserFloat

let errors = [];

export function init() {
   const needed = ['setMeshTag','getMeshTag','getMeshesByTag','setMeshName',
                   'getMeshName','getMeshByName','getMeshesInRadius',
                   'countActiveMeshes','setMeshInt','getMeshInt',
                   'setMeshUserFloat','getMeshUserFloat'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,4,10],[0,0,0]);

   const a = createCube(0.6, rgba8(200,80,60,255));
   const b = createSphere(0.5, rgba8(60,200,100,255));
   const c = createCylinder(0.3, 1.0, rgba8(80,120,255,255));
   setPosition(a, -2,0,-3); setPosition(b, 0,0,-3); setPosition(c, 2,0,-3);

   // tag
   setMeshTag(a, 'enemy'); setMeshTag(b, 'enemy'); setMeshTag(c, 'wall');
   if (getMeshTag(a) !== 'enemy') errors.push('tag-a:'+getMeshTag(a));
   const enemies = getMeshesByTag('enemy');
   if (!Array.isArray(enemies)||enemies.length<2) errors.push('bytag:'+JSON.stringify(enemies));

   // name
   setMeshName(a, 'boss'); setMeshName(b, 'grunt');
   if (getMeshName(a) !== 'boss') errors.push('name-a:'+getMeshName(a));
   const found = getMeshByName('grunt');
   if (found !== b) errors.push('byname:'+found+'!='+b);
   if (getMeshByName('nonexistent') !== -1) errors.push('byname-miss');

   // getMeshesInRadius
   const inR = getMeshesInRadius(0,0,-3, 3.0);
   if (!Array.isArray(inR)||inR.length<2) errors.push('inradius:'+inR.length);

   // countActiveMeshes
   const cnt = countActiveMeshes();
   if (cnt < 3) errors.push('count:'+cnt);

   // user int/float
   setMeshInt(a, 42);
   if (getMeshInt(a) !== 42) errors.push('int:'+getMeshInt(a));
   setMeshUserFloat(b, 3.14);
   if (Math.abs(getMeshUserFloat(b)-3.14)>0.01) errors.push('float:'+getMeshUserFloat(b));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('742 BATCH 61', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('mesh tags + scene query', 4, 24, rgba8(200,200,255,200));
   print('active: ' + countActiveMeshes(), 4, 34, rgba8(160,200,255,180));
}
