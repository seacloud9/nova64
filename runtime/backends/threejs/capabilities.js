// runtime/backends/threejs/capabilities.js
// Explicit capability flags for the Three.js backend.

export const THREEJS_BACKEND_CAPABILITIES = Object.freeze({
  backend: 'threejs',
  cameraAccess: true,
  engineAdapter: true,
  rendererAccess: true,
  pointLights: true,
  instancing: true,
  voxModels: true,
  skybox: true,
  particles: true,
  dithering: true,
  loadModel: true,
  loadTexture: true,
  playAnimation: true,
  pbrMaps: true,
});
