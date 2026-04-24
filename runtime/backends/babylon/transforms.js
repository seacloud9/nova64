// runtime/backends/babylon/transforms.js
// Mesh and light transforms for the Babylon backend.

import { normalizeVectorArgs } from './common.js';

export function createBabylonTransformsApi(self) {
  return {
    destroyMesh(id) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.dispose?.();
      self._meshes.delete(id);
      return true;
    },

    removeMesh(id) {
      return this.destroyMesh(id);
    },

    getMesh(id) {
      return self._meshes.get(id) ?? null;
    },

    setPosition(id, x, y, z) {
      const position = normalizeVectorArgs(x, y, z, 0);
      const mesh = self._meshes.get(id);
      if (mesh) {
        mesh.position.copyFromFloats(position.x, position.y, position.z);
        return true;
      }
      const light = self._cartLights.get(id);
      if (light) {
        light.position.copyFromFloats(position.x, position.y, position.z);
        return true;
      }
      return false;
    },

    getPosition(id) {
      const mesh = self._meshes.get(id);
      if (!mesh) return null;
      return [mesh.position.x, mesh.position.y, mesh.position.z];
    },

    getRotation(id) {
      const mesh = self._meshes.get(id);
      if (!mesh) return null;
      return [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
    },

    setScale(id, x, y, z) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      if (Array.isArray(x) || (x && typeof x === 'object')) {
        const scale = normalizeVectorArgs(x, y, z, 1);
        mesh.scaling.copyFromFloats(scale.x, scale.y, scale.z);
        return true;
      }

      if (typeof y === 'undefined') {
        const uniformScale = Number.isFinite(x) && x > 0 ? x : 1;
        mesh.scaling.copyFromFloats(uniformScale, uniformScale, uniformScale);
        return true;
      }

      const scale = normalizeVectorArgs(x, y, z, 1);
      mesh.scaling.copyFromFloats(scale.x, scale.y, scale.z);
      return true;
    },

    setRotation(id, x, y, z) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      const rotation = normalizeVectorArgs(x, y, z, 0);
      mesh.rotation.copyFromFloats(rotation.x, rotation.y, rotation.z);
      return true;
    },

    rotateMesh(id, rx, ry, rz) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      const rotation = normalizeVectorArgs(rx, ry, rz, 0);
      mesh.rotation.x += rotation.x;
      mesh.rotation.y += rotation.y;
      mesh.rotation.z += rotation.z;
      return true;
    },

    moveMesh(id, dx, dy, dz) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.position.x += dx;
      mesh.position.y += dy;
      mesh.position.z += dz;
      return true;
    },

    setMeshVisible(id, visible) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.isVisible = visible;
      return true;
    },

    setMeshOpacity(id, opacity) {
      const mesh = self._meshes.get(id);
      if (!mesh?.material) return false;
      mesh.material.alpha = opacity;
      return true;
    },

    setReceiveShadow(id, receive) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.receiveShadows = receive;
      return true;
    },

    setCastShadow(id, cast) {
      const mesh = self._meshes.get(id);
      if (!mesh) return false;
      mesh.castShadow = cast;
      return true;
    },

    setFlatShading(id, enabled = true) {
      const mesh = self._meshes.get(id);
      if (!mesh || !enabled || typeof mesh.convertToFlatShadedMesh !== 'function') return false;
      mesh.convertToFlatShadedMesh();
      return true;
    },
  };
}
