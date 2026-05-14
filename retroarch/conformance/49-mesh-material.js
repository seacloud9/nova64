// Conformance cart 49: extended mesh material properties.
// Tests setMeshRoughness, setMeshMetalness, setMeshUVOffset, setMeshUVScale,
// setMeshBlend API existence and that they round-trip through getMesh().

let errors = [];
let cube = 0;

export function init() {
   // API existence checks
   const apis = [
      'setMeshRoughness', 'setMeshMetalness',
      'setMeshUVOffset', 'setMeshUVScale', 'setMeshBlend'
   ];
   for (const name of apis) {
      if (typeof globalThis[name] !== 'function')
         errors.push(name + '-missing');
   }

   const caps = getBackendCapabilities();
   if (!caps.meshRoughness)  errors.push('caps.meshRoughness-false');
   if (!caps.meshMetalness)  errors.push('caps.meshMetalness-false');
   if (!caps.meshUVTransform) errors.push('caps.meshUVTransform-false');
   if (!caps.meshBlend)      errors.push('caps.meshBlend-false');

   cube = createCube(rgba8(180, 200, 220, 255), [0, 0, -4]);
   if (!cube) { errors.push('createCube-falsy'); return; }

   // Apply material properties — none should throw
   try { setMeshRoughness(cube, 0.3); } catch (e) { errors.push('setMeshRoughness-threw'); }
   try { setMeshMetalness(cube, 0.7); } catch (e) { errors.push('setMeshMetalness-threw'); }
   try { setMeshUVOffset(cube, 0.1, 0.2); } catch (e) { errors.push('setMeshUVOffset-threw'); }
   try { setMeshUVScale(cube, 2.0, 2.0); } catch (e) { errors.push('setMeshUVScale-threw'); }
   try { setMeshBlend(cube, 'opaque'); } catch (e) { errors.push('setMeshBlend-opaque-threw'); }
   try { setMeshBlend(cube, 'additive'); } catch (e) { errors.push('setMeshBlend-additive-threw'); }
   try { setMeshBlend(cube, 'multiply'); } catch (e) { errors.push('setMeshBlend-multiply-threw'); }
   // restore opaque for visual
   setMeshBlend(cube, 'opaque');

   // Round-trip checks via getMesh
   const m = getMesh(cube);
   if (!m) { errors.push('getMesh-null'); return; }
   const eps = 0.001;
   if (Math.abs(m.roughness - 0.3) > eps)  errors.push('roughness:' + m.roughness);
   if (Math.abs(m.metalness - 0.7) > eps)  errors.push('metalness:' + m.metalness);
   if (Math.abs(m.uvOffset[0] - 0.1) > eps) errors.push('uvOffset[0]:' + m.uvOffset[0]);
   if (Math.abs(m.uvOffset[1] - 0.2) > eps) errors.push('uvOffset[1]:' + m.uvOffset[1]);
   if (Math.abs(m.uvScale[0] - 2.0) > eps)  errors.push('uvScale[0]:' + m.uvScale[0]);
   if (Math.abs(m.uvScale[1] - 2.0) > eps)  errors.push('uvScale[1]:' + m.uvScale[1]);

   setCameraPosition(0, 1.5, 6);
   setCameraTarget(0, 0, 0);
   setAmbientLight(rgba8(30, 40, 60, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 18, 255));
   print('49 MATERIAL', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
