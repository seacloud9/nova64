// Conformance cart 772: Batch 61 showcase — mesh tagging + scene query.
// setMeshTag, getMeshTag, getMeshesByTag, setMeshName, getMeshByName,
// getMeshesInRadius, countActiveMeshes, setMeshInt, getMeshUserFloat

let errors = [];
let t = 0;
let meshes = [];
const TAGS = ['enemy','ally','neutral'];
const COLORS = [rgba8(255,80,60,255), rgba8(60,255,120,255), rgba8(120,160,255,255)];

export function init() {
   const needed = ['setMeshTag','getMeshTag','getMeshesByTag','setMeshName',
                   'getMeshByName','getMeshesInRadius','countActiveMeshes',
                   'setMeshInt','getMeshInt','setMeshUserFloat','getMeshUserFloat'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0,6,12],[0,0,-2]);
   setLightDirection(1,2,0.5);

   // Create 12 objects with tags, names, user data
   for (let i = 0; i < 12; i++) {
      const tagIdx = i % 3;
      const m = createSphere(0.35, COLORS[tagIdx]);
      const angle = (i/12)*Math.PI*2;
      setPosition(m, Math.cos(angle)*4, 0, Math.sin(angle)*4-2);
      setMeshTag(m, TAGS[tagIdx]);
      setMeshName(m, 'obj_' + i);
      setMeshInt(m, i * 10);
      setMeshUserFloat(m, i * 0.5);
      meshes.push(m);
   }

   // Verify queries
   const enemies = getMeshesByTag('enemy');
   if (!Array.isArray(enemies)||enemies.length<4) errors.push('tag-count:'+enemies.length);
   const found = getMeshByName('obj_5');
   if (found !== meshes[5]) errors.push('byname-fail:'+found);
   if (getMeshInt(meshes[3])!==30) errors.push('int-fail:'+getMeshInt(meshes[3]));
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   for (let i = 0; i < meshes.length; i++) {
      const angle = (i/12)*Math.PI*2 + t*0.4;
      setPosition(meshes[i], Math.cos(angle)*4, Math.sin(t*1.2+i*0.5)*0.4, Math.sin(angle)*4-2);
   }
}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('772 BATCH 61', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('mesh tags + query', 4, 24, rgba8(200,200,255,200));
   print('total: ' + countActiveMeshes(), 4, 34, rgba8(160,200,255,180));
   const inR = getMeshesInRadius(0,0,-2, 4.5);
   print('in r=4.5: ' + inR.length, 4, 44, rgba8(160,200,255,180));
   const enemies = getMeshesByTag('enemy');
   print('enemies: ' + enemies.length, 4, 54, rgba8(255,120,100,160));
}
