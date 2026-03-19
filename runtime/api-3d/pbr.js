// runtime/api-3d/pbr.js
// Normal maps, PBR roughness/metalness/AO maps

import * as THREE from 'three';

export function pbrModule({ meshes }) {
  const _texLoader = new THREE.TextureLoader();

  function loadNormalMap(url) {
    return new Promise((resolve, reject) => {
      _texLoader.load(
        url,
        texture => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          resolve(texture);
        },
        undefined,
        err => reject(err)
      );
    });
  }

  function _upgradeToStandard(mesh) {
    if (!mesh?.material) return;
    if (mesh.material.isMeshStandardMaterial) return;
    const old = mesh.material;
    const standard = new THREE.MeshStandardMaterial({
      color: old.color?.clone() ?? new THREE.Color(0xffffff),
      map: old.map ?? null,
      metalness: 0.0,
      roughness: 0.6,
      transparent: old.transparent ?? false,
      opacity: old.opacity ?? 1.0,
    });
    old.dispose();
    mesh.material = standard;
  }

  function setNormalMap(meshId, texture) {
    const mesh = meshes.get(meshId);
    if (!mesh) return false;
    _upgradeToStandard(mesh);
    mesh.material.normalMap = texture;
    mesh.material.needsUpdate = true;
    return true;
  }

  function setPBRMaps(meshId, maps = {}) {
    const mesh = meshes.get(meshId);
    if (!mesh) return false;
    _upgradeToStandard(mesh);
    const mat = mesh.material;
    if (maps.normalMap) {
      mat.normalMap = maps.normalMap;
    }
    if (maps.roughnessMap) {
      mat.roughnessMap = maps.roughnessMap;
    }
    if (maps.aoMap) {
      mat.aoMap = maps.aoMap;
    }
    if (maps.metalness !== undefined) mat.metalness = maps.metalness;
    if (maps.roughness !== undefined) mat.roughness = maps.roughness;
    mat.needsUpdate = true;
    return true;
  }

  return { loadNormalMap, setNormalMap, setPBRMaps };
}
