// runtime/backends/babylon/lights.js
// Dynamic light controls for the Babylon backend.

import { DirectionalLight, PointLight, Vector3 } from '@babylonjs/core';
import { hexToColor3, normalizePointLightArgs, normalizeVectorArgs } from './common.js';

export function createBabylonLightsApi(self) {
  return {
    setAmbientLight(color = 0x404040, intensity = 1) {
      if (!self._hemisphereLight) return;
      self._hemisphereLight.diffuse = hexToColor3(color);
      self._hemisphereLight.intensity = intensity;
    },

    setLightDirection(x, y, z) {
      if (!self._mainLight) return;
      const direction = normalizeVectorArgs(x, y, z, 0);
      self._mainLight.direction = new Vector3(direction.x, direction.y, direction.z).normalize();
    },

    setLightColor(color = 0xffffff) {
      if (!self._mainLight) return;
      self._mainLight.diffuse = hexToColor3(color);
    },

    createPointLight(
      color = 0xffffff,
      intensity = 1,
      distanceOrPosition = 20,
      x = 0,
      y = 5,
      z = 0
    ) {
      const { distance, position } = normalizePointLightArgs(distanceOrPosition, x, y, z);
      const id = `pointLight_${Date.now()}`;
      const light = new PointLight(id, new Vector3(position.x, position.y, position.z), self.scene);
      light.diffuse = hexToColor3(color);
      light.intensity = intensity;
      if (distance > 0) light.range = distance;
      const lightId = ++self._counter;
      self._cartLights.set(lightId, light);
      return lightId;
    },

    setPointLightPosition(lightId, x, y, z) {
      const light = self._cartLights.get(lightId);
      if (!light || !(light instanceof PointLight)) return false;
      const position = normalizeVectorArgs(x, y, z, 0);
      light.position.copyFromFloats(position.x, position.y, position.z);
      return true;
    },

    setPointLightColor(lightId, color = 0xffffff, intensity) {
      const light = self._cartLights.get(lightId);
      if (!light) return false;
      light.diffuse = hexToColor3(color);
      if (intensity !== undefined) light.intensity = intensity;
      return true;
    },

    removeLight(lightId) {
      const light = self._cartLights.get(lightId);
      if (!light) return false;
      light.dispose();
      self._cartLights.delete(lightId);
      return true;
    },

    setDirectionalLight(direction, color = 0xffffff, intensity = 1.0) {
      self._cartLights.forEach((light, id) => {
        if (light instanceof DirectionalLight) {
          light.dispose();
          self._cartLights.delete(id);
        }
      });

      const id = `dirLight_${Date.now()}`;
      const light = new DirectionalLight(id, new Vector3(0, -1, 0), self.scene);
      light.diffuse = hexToColor3(color);
      light.intensity = intensity;

      if (Array.isArray(direction) && direction.length >= 3) {
        const normalized = normalizeVectorArgs(direction, 0, 0, 0);
        light.direction = new Vector3(normalized.x, normalized.y, normalized.z).normalize();
      } else if (direction && typeof direction === 'object') {
        const normalized = normalizeVectorArgs(direction, 0, 0, 0);
        light.direction = new Vector3(normalized.x, normalized.y, normalized.z).normalize();
      } else {
        light.direction = new Vector3(1, -2, 1).normalize();
      }

      const lightId = ++self._counter;
      self._cartLights.set(lightId, light);
      return lightId;
    },
  };
}
