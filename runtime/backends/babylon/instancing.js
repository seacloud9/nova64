// runtime/backends/babylon/instancing.js
// Thin-instance support for the Babylon backend.

import { Matrix, MeshBuilder, Quaternion, StandardMaterial, Vector3 } from '@babylonjs/core';

import { hexToColor3 } from './common.js';

export function createBabylonInstancingApi(self) {
  return {
    createInstancedMesh(shape = 'cube', count = 100, color = 0xffffff, options = {}) {
      const {
        size = 1,
        width = 1,
        height = 1,
        segments = 6,
        roughness = 0.7,
        metalness = 0.0,
        emissive = 0x000000,
        emissiveIntensity = 1.0,
      } = options;

      let baseMesh;
      const meshName = `instancedMesh_${++self._counter}`;

      switch (shape) {
        case 'sphere':
          baseMesh = MeshBuilder.CreateSphere(
            meshName,
            { diameter: size * 2, segments },
            self.scene
          );
          break;
        case 'plane':
          baseMesh = MeshBuilder.CreatePlane(meshName, { width, height }, self.scene);
          break;
        case 'cylinder':
          baseMesh = MeshBuilder.CreateCylinder(
            meshName,
            { diameter: size * 2, height: height || 2, tessellation: 16 },
            self.scene
          );
          break;
        case 'cone':
          baseMesh = MeshBuilder.CreateCylinder(
            meshName,
            { diameterTop: 0, diameterBottom: size * 2, height: height || 2, tessellation: 16 },
            self.scene
          );
          break;
        case 'cube':
        default:
          baseMesh = MeshBuilder.CreateBox(meshName, { size }, self.scene);
      }

      const mat = new StandardMaterial(`${meshName}_mat`, self.scene);
      mat.diffuseColor = hexToColor3(color);
      mat.roughness = roughness;
      mat.metallic = metalness;
      mat.emissiveColor = hexToColor3(emissive);
      if (emissive !== 0x000000) {
        mat.emissiveColor.scaleInPlace(emissiveIntensity);
      }

      baseMesh.material = mat;
      baseMesh.isVisible = false;
      baseMesh.thinInstanceEnablePicking = false;

      const bufferMatrices = new Float32Array(16 * count);
      baseMesh.thinInstanceSetBuffer('matrix', bufferMatrices, 16);

      const instanceId = self._counter;
      self._instancedMeshes.set(instanceId, {
        mesh: baseMesh,
        count,
        currentIndex: 0,
        matrices: bufferMatrices,
        colors: new Float32Array(4 * count),
        hasColors: false,
      });
      self._meshes.set(instanceId, baseMesh);
      return instanceId;
    },

    setInstanceTransform(
      instancedId,
      index,
      x = 0,
      y = 0,
      z = 0,
      rx = 0,
      ry = 0,
      rz = 0,
      sx = 1,
      sy = 1,
      sz = 1
    ) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry || index < 0 || index >= entry.count) return false;

      const matrix = Matrix.Compose(
        new Vector3(sx, sy, sz),
        Quaternion.RotationYawPitchRoll(ry, rx, rz),
        new Vector3(x, y, z)
      );
      matrix.copyToArray(entry.matrices, index * 16);
      entry.mesh.thinInstanceBufferUpdated('matrix');
      return true;
    },

    setInstanceColor(instancedId, index, color) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry || index < 0 || index >= entry.count) return false;

      const c = hexToColor3(color);
      const offset = index * 4;
      entry.colors[offset] = c.r;
      entry.colors[offset + 1] = c.g;
      entry.colors[offset + 2] = c.b;
      entry.colors[offset + 3] = 1.0;
      entry.hasColors = true;
      return true;
    },

    finalizeInstances(instancedId) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry) return false;
      entry.mesh.thinInstanceBufferUpdated('matrix');
      if (entry.hasColors) {
        entry.mesh.thinInstanceSetBuffer('color', entry.colors, 4);
      }
      return true;
    },

    removeInstancedMesh(instancedId) {
      const entry = self._instancedMeshes.get(instancedId);
      if (!entry) return false;
      entry.mesh.dispose();
      self._instancedMeshes.delete(instancedId);
      self._meshes.delete(instancedId);
      return true;
    },
  };
}
