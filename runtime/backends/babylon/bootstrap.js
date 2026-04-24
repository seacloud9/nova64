// runtime/backends/babylon/bootstrap.js
// Babylon engine, scene, camera, adapter, and HUD bootstrap helpers.

import {
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  StandardMaterial,
  PBRMaterial,
  Texture,
  RawTexture,
  DynamicTexture,
  Material,
} from '@babylonjs/core';

import { Framebuffer64 } from '../../framebuffer.js';
import { createBabylonEngineAdapter } from '../../engine-adapter-babylon.js';
import { setEngineAdapter } from '../../engine-adapter.js';
import { BABYLON_BACKEND_CAPABILITIES } from './capabilities.js';
import { isBabylonVerboseDebugEnabled } from './common.js';

export function setupDefaultLights(self) {
  self._hemisphereLight?.dispose?.();
  self._mainLight?.dispose?.();

  if (!self._cartLights) self._cartLights = new Map();
  else self._cartLights.clear();

  self._hemisphereLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), self.scene);
  self._hemisphereLight.intensity = 0.6;
  self._hemisphereLight.diffuse = new Color3(1, 1, 1);
  self._hemisphereLight.groundColor = new Color3(0.1, 0.1, 0.2);

  self._mainLight = new DirectionalLight('main', new Vector3(-1, -2, -1), self.scene);
  self._mainLight.intensity = 1.2;
  self._mainLight.diffuse = new Color3(1, 1, 1);
}

export function setupHudOverlay(self, mainCanvas, w, h) {
  const hud = document.createElement('canvas');
  hud.width = w;
  hud.height = h;
  hud.style.cssText =
    'position:absolute;top:0;left:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:10;image-rendering:pixelated;' +
    'background:transparent;';

  const container = mainCanvas.parentElement ?? document.body;
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(hud);
  self._hudCanvas = hud;
  self._hudCtx = hud.getContext('2d', { alpha: true });
  self._hudCtx?.clearRect(0, 0, w, h);
}

export function initializeBabylonBackend(self, canvas, w, h) {
  self.canvas = canvas;
  self.w = w;
  self.h = h;
  self.backendName = 'babylon';
  self.backendCapabilities = BABYLON_BACKEND_CAPABILITIES;
  self._debugEnabled = isBabylonVerboseDebugEnabled();

  self.renderer = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    powerPreference: 'high-performance',
    adaptToDeviceRatio: false,
    disableWebGL2Support: false,
  });

  self.scene = new Scene(self.renderer);
  self.scene.useRightHandedSystem = true;
  self.scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);

  self.camera = new UniversalCamera('cam', new Vector3(0, 5, -10), self.scene);
  self.camera.setTarget(Vector3.Zero());
  self.camera.minZ = 0.1;
  self.camera.maxZ = 1000;
  self.camera.fov = (75 * Math.PI) / 180;
  self.camera.attachControl(canvas, true);
  self.scene.activeCamera = self.camera;

  self._meshes = new Map();
  self._instancedMeshes = new Map();
  self._lodObjects = new Map();
  self._particleSystems = new Map();
  self._particleCounter = 0;
  self._counter = 0;
  self._cameraTarget = Vector3.Zero();
  self._debugFrameCount = 0;
  self._compositeDebugCounter = 0;

  self.fb = new Framebuffer64(w, h);
  self._fbImageData = null;
  self._fbCanvas = null;
  self._fbCanvasCtx = null;

  self.stats = { triangles: 0, drawCalls: 0, geometries: 0 };

  setupDefaultLights(self);
  setupHudOverlay(self, canvas, w, h);

  const BABYLON_NS = {
    StandardMaterial,
    PBRMaterial,
    Color3,
    Texture,
    RawTexture,
    DynamicTexture,
    Material,
  };

  self._adapter = createBabylonEngineAdapter(BABYLON_NS, self.scene, {
    resolveMesh: id => self._meshes.get(id) ?? null,
  });
  self.engine = self._adapter;

  self.canvas.width = w;
  self.canvas.height = h;
  self.canvas.style.setProperty('display', 'block', 'important');
  self.canvas.style.setProperty('visibility', 'visible', 'important');
  self.canvas.style.setProperty('opacity', '1', 'important');
  self.canvas.style.setProperty('position', 'absolute', 'important');
  self.canvas.style.setProperty('z-index', '9', 'important');
  self.renderer.setHardwareScalingLevel(1);
  self.renderer.resize(true);
  setEngineAdapter(self._adapter);
}
