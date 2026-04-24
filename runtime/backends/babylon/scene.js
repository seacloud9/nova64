// runtime/backends/babylon/scene.js
// Scene, fog, render loop, and backend lifecycle methods for Babylon.

import { Color4, Scene } from '@babylonjs/core';

import { BABYLON_BACKEND_CAPABILITIES, warnUnsupportedBabylonFeature } from './capabilities.js';
import { setupDefaultLights } from './bootstrap.js';
import { hexToColor3 } from './common.js';

function logRenderDebug(self) {
  console.log('[GpuBabylon:DEBUG]', {
    frame: self._debugFrameCount,
    drawCalls: self.renderer.drawCalls ?? 0,
    meshes: self._meshes.size,
    sceneMeshes: self.scene.meshes.length,
    activeMeshes: self.scene.getActiveMeshes().length,
    camera: {
      x: self.camera.position.x,
      y: self.camera.position.y,
      z: self.camera.position.z,
    },
  });
}

export function createBabylonSceneApi(self) {
  return {
    getFramebuffer() {
      return self.fb;
    },

    supportsSpriteBatch() {
      return false;
    },

    getScene() {
      return self.scene;
    },

    getCamera() {
      return self.camera;
    },

    getRenderer() {
      return self.renderer;
    },

    getBackendCapabilities() {
      return self.backendCapabilities;
    },

    setClearColor(color) {
      const r = ((color >> 16) & 0xff) / 255;
      const g = ((color >> 8) & 0xff) / 255;
      const b = (color & 0xff) / 255;
      self.scene.clearColor = new Color4(r, g, b, 1);
    },

    resize(w, h) {
      self.w = w;
      self.h = h;
      self.canvas.width = w;
      self.canvas.height = h;
      if (self._hudCanvas) {
        self._hudCanvas.width = w;
        self._hudCanvas.height = h;
      }
      self.fb.resize(w, h);
      self._fbImageData = null;
      self.renderer.resize();
    },

    beginFrame() {
      self.fb.fill(0, 0, 0, 0);
      self._hudCtx?.clearRect(0, 0, self.w, self.h);
    },

    endFrame() {
      self._debugFrameCount++;
      self.scene.render();
      if (
        self._debugEnabled &&
        (self._debugFrameCount === 1 || self._debugFrameCount % 120 === 0)
      ) {
        logRenderDebug(self);
      }
      self._compositeFramebuffer?.();
      self.stats.drawCalls = self.renderer.drawCalls ?? 0;
    },

    update(dt) {
      void dt;
    },

    render() {
      self.scene.render();
    },

    get3DStats() {
      return {
        triangles: self.stats.triangles,
        drawCalls: self.renderer.drawCalls ?? 0,
        meshes: self._meshes.size,
        backend: 'babylon',
      };
    },

    setFog(color = 0x000000, near = 10, far = 100) {
      self.scene.fogMode = Scene.FOGMODE_LINEAR;
      self.scene.fogColor = hexToColor3(color);
      self.scene.fogStart = near;
      self.scene.fogEnd = far;
    },

    clearFog() {
      self.scene.fogMode = Scene.FOGMODE_NONE;
    },

    clearScene() {
      self._meshes.forEach(mesh => mesh.dispose?.());
      self._meshes.clear();
      self._cartLights.forEach(light => light.dispose?.());
      self._cartLights.clear();
      setupDefaultLights(self);
      self._hudCtx?.clearRect(0, 0, self.w, self.h);
    },

    clearAnimatedMeshes() {
      return false;
    },

    enablePixelation(factor = 2) {
      self.renderer.setHardwareScalingLevel(factor <= 0 ? 1 : factor);
    },

    enableDithering(_enabled = true) {
      if (!BABYLON_BACKEND_CAPABILITIES.dithering) {
        warnUnsupportedBabylonFeature(
          'dithering',
          'Dithering is not supported with the Babylon.js backend'
        );
      }
      return false;
    },

    createParticleSystem(_maxParticles = 200, _options = {}) {
      if (!BABYLON_BACKEND_CAPABILITIES.particles) {
        warnUnsupportedBabylonFeature(
          'particles',
          'Particle systems are not yet implemented for the Babylon.js backend'
        );
      }
      return -1;
    },

    getPixelRatio() {
      return 1;
    },
  };
}
