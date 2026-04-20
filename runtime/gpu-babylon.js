// runtime/gpu-babylon.js
// Babylon.js GPU backend for Nova64 — Phase 2 standalone runtime.
//
// This class provides the same cart-facing API as the Three.js backend
// (createCube, setCameraPosition, rotateMesh, etc.) but implemented entirely
// in Babylon.js.  It does NOT integrate with api-3d/primitives.js or the
// Three.js sub-module chain — it is a parallel, self-contained implementation.
//
// Phase 2 feature coverage:
//   Primitives:  createCube, createSphere, createPlane, createCylinder, createCone
//   Transforms:  setPosition, setScale, rotateMesh, getPosition
//   Camera:      setCameraPosition, setCameraTarget, setCameraFOV
//   Lights:      setAmbientLight, setLightDirection, createPointLight
//   Scene:       setFog, clearFog, destroyMesh, getMesh, get3DStats
//   2D HUD:      cls, print (via Canvas2D overlay)
//
// Phase 2 non-goals (Three.js-parity items deferred to later phases):
//   Post-processing effects (bloom, vignette, chromatic aberration)
//   GLB/GLTF model loading
//   Instanced meshes
//   Skybox system
//   Audio / physics (separate systems)
//
// Integration: see examples/babylon-demo/ for a working demo cart.

import {
  Engine,
  Scene,
  UniversalCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Texture,
  RawTexture,
  DynamicTexture,
  Material,
} from '@babylonjs/core';

import { Framebuffer64 } from './framebuffer.js';
import { createBabylonEngineAdapter } from './engine-adapter-babylon.js';
import { setEngineAdapter } from './engine-adapter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToColor3(hex) {
  return new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
}

function normalizePosition(pos) {
  if (Array.isArray(pos) && pos.length >= 3) return new Vector3(pos[0], pos[1], pos[2]);
  if (pos && typeof pos === 'object' && pos.x !== undefined)
    return new Vector3(pos.x, pos.y ?? 0, pos.z ?? 0);
  return Vector3.Zero();
}

// ---------------------------------------------------------------------------
// GpuBabylon — the main GPU class
// ---------------------------------------------------------------------------

export class GpuBabylon {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} w  — logical width
   * @param {number} h  — logical height
   */
  constructor(canvas, w, h) {
    this.canvas = canvas;
    this.w = w;
    this.h = h;

    // Babylon engine + scene
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      powerPreference: 'high-performance',
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);

    // Free-look camera (position-based, matches Nova64's camera model)
    this.camera = new UniversalCamera('cam', new Vector3(0, 5, -10), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.fov = (75 * Math.PI) / 180; // 75° FOV

    // Lighting
    this._setupLights();

    // Mesh registry: meshId → BABYLON.AbstractMesh
    this._meshes = new Map();
    this._counter = 0;

    // Camera state mirrors
    this._cameraTarget = Vector3.Zero();

    // Framebuffer64 for 2D HUD (used by stdApi, api-2d, api-generative)
    this.fb = new Framebuffer64(w, h);
    // Persistent Uint8 pixel buffer for putImageData (reused each frame)
    this._fbImageData = null;

    // Canvas2D overlay for 2D HUD (print, cls)
    this._hudCanvas = null;
    this._hudCtx = null;
    this._setupHUD(canvas, w, h);

    // Stats
    this.stats = { triangles: 0, drawCalls: 0, geometries: 0 };

    // Wire up the engine adapter so cart code that uses engine.createMaterial etc.
    // goes through this backend.
    const BABYLON_NS = {
      StandardMaterial,
      PBRMaterial,
      Color3,
      Texture,
      RawTexture,
      DynamicTexture,
      Material,
    };

    this._adapter = createBabylonEngineAdapter(BABYLON_NS, this.scene, {
      resolveMesh: id => this._meshes.get(id) ?? null,
    });

    setEngineAdapter(this._adapter);
  }

  // ---------------------------------------------------------------------------
  // Internal setup
  // ---------------------------------------------------------------------------

  _setupLights() {
    // Hemisphere light (sky/ground ambient)
    this._hemisphereLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    this._hemisphereLight.intensity = 0.6;
    this._hemisphereLight.diffuse = new Color3(1, 1, 1);
    this._hemisphereLight.groundColor = new Color3(0.1, 0.1, 0.2);

    // Main directional light
    this._mainLight = new DirectionalLight('main', new Vector3(-1, -2, -1), this.scene);
    this._mainLight.intensity = 1.2;
    this._mainLight.diffuse = new Color3(1, 1, 1);

    // Store for dynamic control
    this._cartLights = new Map();
  }

  _setupHUD(mainCanvas, w, h) {
    const hud = document.createElement('canvas');
    hud.width = w;
    hud.height = h;
    hud.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:10;image-rendering:pixelated;';
    const container = mainCanvas.parentElement ?? document.body;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(hud);
    this._hudCanvas = hud;
    this._hudCtx = hud.getContext('2d');
  }

  // ---------------------------------------------------------------------------
  // GpuThreeJS-compatible accessors (used by api-3d.js, but GpuBabylon
  // won't be passed to threeDApi — these are provided for completeness and
  // future integration).
  // ---------------------------------------------------------------------------

  // 2D compatibility — required by api.js, api-2d.js, api-generative.js
  getFramebuffer() {
    return this.fb;
  }

  supportsSpriteBatch() {
    return false;
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.engine;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this._hudCanvas) {
      this._hudCanvas.width = w;
      this._hudCanvas.height = h;
    }
    this.fb.resize(w, h);
    this._fbImageData = null; // will be recreated next frame
    this.engine.resize();
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  beginFrame() {
    // Clear framebuffer (transparent black)
    this.fb.fill(0, 0, 0, 0);
  }

  _compositeFramebuffer() {
    if (!this._hudCtx) return;
    const W = this.fb.width;
    const H = this.fb.height;
    // Lazily create (or recreate after resize)
    if (!this._fbImageData || this._fbImageData.width !== W || this._fbImageData.height !== H) {
      this._fbImageData = this._hudCtx.createImageData(W, H);
    }
    const src = this.fb.pixels;
    const dst = this._fbImageData.data;
    for (let i = 0; i < W * H; i++) {
      const s = i * 4;
      dst[s] = src[s] / 257; // R 16→8 bit
      dst[s + 1] = src[s + 1] / 257; // G
      dst[s + 2] = src[s + 2] / 257; // B
      dst[s + 3] = src[s + 3] / 257; // A
    }
    this._hudCtx.clearRect(0, 0, W, H);
    this._hudCtx.putImageData(this._fbImageData, 0, 0);
  }

  endFrame() {
    this.scene.render();
    // Composite 2D framebuffer onto HUD canvas
    this._compositeFramebuffer();
    // Update stats after render
    this.stats.drawCalls = this.engine.drawCalls ?? 0;
  }

  update(dt) {
    // Placeholder — Babylon handles its own animation system.
    // Cart-driven animations (rotateMesh) are applied each update() call
    // from the cart's update() function directly.
    void dt;
  }

  render() {
    this.scene.render();
  }

  get3DStats() {
    return {
      triangles: this.stats.triangles,
      drawCalls: this.engine.drawCalls ?? 0,
      meshes: this._meshes.size,
      backend: 'babylon',
    };
  }

  // ---------------------------------------------------------------------------
  // Material factory
  // ---------------------------------------------------------------------------

  createN64Material(opts = {}) {
    const type =
      opts.material === 'holographic' || opts.material === 'emissive'
        ? 'standard'
        : (opts.material ?? 'standard');
    const mat = this._adapter.createMaterial(type, {
      color: opts.color ?? 0xffffff,
      roughness: opts.roughness ?? 0.7,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      wireframe: opts.wireframe ?? false,
      flatShading: opts.flatShading ?? false,
    });
    return mat;
  }

  // ---------------------------------------------------------------------------
  // Primitive creation
  // ---------------------------------------------------------------------------

  _addMesh(babylonMesh, material) {
    if (material) babylonMesh.material = material;
    babylonMesh.receiveShadows = true;
    const id = ++this._counter;
    this._meshes.set(id, babylonMesh);
    return id;
  }

  createBoxGeometry(w, h, d) {
    return Object.freeze({ __babylonGeometry: true, geometryType: 'box', w, h, d });
  }

  createSphereGeometry(r, segments = 8) {
    return Object.freeze({ __babylonGeometry: true, geometryType: 'sphere', r, segments });
  }

  createPlaneGeometry(w, h) {
    return Object.freeze({ __babylonGeometry: true, geometryType: 'plane', width: w, height: h });
  }

  createCylinderGeometry(rTop, rBottom, h, segments = 16) {
    return Object.freeze({
      __babylonGeometry: true,
      geometryType: 'cylinder',
      rTop,
      rBottom,
      h,
      segments,
    });
  }

  createConeGeometry(r, h, segments = 16) {
    return Object.freeze({ __babylonGeometry: true, geometryType: 'cone', r, h, segments });
  }

  createCapsuleGeometry(r, h, segments = 8) {
    return Object.freeze({ __babylonGeometry: true, geometryType: 'capsule', r, h, segments });
  }

  /**
   * Create a Babylon mesh from a geometry descriptor and a material.
   * This is the Babylon equivalent of `new THREE.Mesh(geometry, material)`.
   */
  createMesh(geometryDesc, material, position = [0, 0, 0]) {
    if (!geometryDesc) return null;

    const pos = normalizePosition(position);
    let mesh;
    const name = `nova64_mesh_${this._counter + 1}`;

    switch (geometryDesc.geometryType) {
      case 'box':
        mesh = MeshBuilder.CreateBox(
          name,
          { width: geometryDesc.w, height: geometryDesc.h, depth: geometryDesc.d },
          this.scene
        );
        break;
      case 'sphere':
        mesh = MeshBuilder.CreateSphere(
          name,
          { diameter: geometryDesc.r * 2, segments: geometryDesc.segments },
          this.scene
        );
        break;
      case 'plane':
        mesh = MeshBuilder.CreatePlane(
          name,
          { width: geometryDesc.width, height: geometryDesc.height },
          this.scene
        );
        break;
      case 'cylinder':
        mesh = MeshBuilder.CreateCylinder(
          name,
          {
            diameterTop: (geometryDesc.rTop ?? 1) * 2,
            diameterBottom: (geometryDesc.rBottom ?? 1) * 2,
            height: geometryDesc.h ?? 2,
            tessellation: geometryDesc.segments ?? 16,
          },
          this.scene
        );
        break;
      case 'cone':
        mesh = MeshBuilder.CreateCylinder(
          name,
          {
            diameterTop: 0,
            diameterBottom: (geometryDesc.r ?? 1) * 2,
            height: geometryDesc.h ?? 2,
            tessellation: geometryDesc.segments ?? 16,
          },
          this.scene
        );
        break;
      case 'capsule':
        mesh = MeshBuilder.CreateCapsule(
          name,
          {
            radius: geometryDesc.r ?? 0.5,
            height: geometryDesc.h ?? 2,
            tessellation: geometryDesc.segments ?? 8,
          },
          this.scene
        );
        break;
      default:
        mesh = MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
    }

    mesh.position.copyFrom(pos);
    return this._addMesh(mesh, material);
  }

  // ---------------------------------------------------------------------------
  // Cart-facing primitive API (same names as Three.js Nova64 API)
  // ---------------------------------------------------------------------------

  createCube(size = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    const geo = this.createBoxGeometry(size, size, size);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  createSphere(radius = 1, color = 0xffffff, position = [0, 0, 0], segments = 8, options = {}) {
    const geo = this.createSphereGeometry(radius, segments);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  createPlane(width = 1, height = 1, color = 0xffffff, position = [0, 0, 0], options = {}) {
    const geo = this.createPlaneGeometry(width, height);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  createCylinder(
    rTop = 1,
    rBottom = 1,
    h = 2,
    color = 0xffffff,
    position = [0, 0, 0],
    options = {}
  ) {
    const geo = this.createCylinderGeometry(rTop, rBottom, h);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  createCone(radius = 1, height = 2, color = 0xffffff, position = [0, 0, 0], options = {}) {
    const geo = this.createConeGeometry(radius, height);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  destroyMesh(id) {
    const mesh = this._meshes.get(id);
    if (mesh) {
      mesh.dispose();
      this._meshes.delete(id);
    }
  }

  getMesh(id) {
    return this._meshes.get(id) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Transforms
  // ---------------------------------------------------------------------------

  setPosition(id, x, y, z) {
    const mesh = this._meshes.get(id);
    if (mesh) {
      mesh.position.set(x, y, z);
      return;
    }
    const light = this._cartLights.get(id);
    if (light) light.position.set(x, y, z);
  }

  getPosition(id) {
    const mesh = this._meshes.get(id);
    if (!mesh) return { x: 0, y: 0, z: 0 };
    return { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
  }

  setScale(id, x, y, z) {
    const mesh = this._meshes.get(id);
    if (mesh) mesh.scaling.set(x, y, z);
  }

  setRotation(id, x, y, z) {
    const mesh = this._meshes.get(id);
    if (mesh) mesh.rotation.set(x, y, z);
  }

  /**
   * Add incremental rotation to a mesh (called from cart update() loops).
   */
  rotateMesh(id, rx, ry, rz) {
    const mesh = this._meshes.get(id);
    if (mesh) {
      mesh.rotation.x += rx;
      mesh.rotation.y += ry;
      mesh.rotation.z += rz;
    }
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
    // Keep looking at target after reposition
    this.camera.setTarget(this._cameraTarget);
  }

  setCameraTarget(x, y, z) {
    this._cameraTarget.set(x, y, z);
    this.camera.setTarget(this._cameraTarget);
  }

  setCameraFOV(fovDegrees) {
    this.camera.fov = (fovDegrees * Math.PI) / 180;
  }

  // ---------------------------------------------------------------------------
  // Lights
  // ---------------------------------------------------------------------------

  setAmbientLight(color = 0x404040, intensity = 1) {
    if (this._hemisphereLight) {
      this._hemisphereLight.diffuse = hexToColor3(color);
      this._hemisphereLight.intensity = intensity;
    }
  }

  setLightDirection(x, y, z) {
    if (this._mainLight) {
      this._mainLight.direction = new Vector3(x, y, z).normalize();
    }
  }

  setLightColor(color = 0xffffff) {
    if (this._mainLight) {
      this._mainLight.diffuse = hexToColor3(color);
    }
  }

  createPointLight(color = 0xffffff, intensity = 1, x = 0, y = 5, z = 0) {
    const id = `pointLight_${Date.now()}`;
    const light = new PointLight(id, new Vector3(x, y, z), this.scene);
    light.diffuse = hexToColor3(color);
    light.intensity = intensity;
    const lightId = ++this._counter;
    this._cartLights.set(lightId, light);
    return lightId;
  }

  // ---------------------------------------------------------------------------
  // Scene / fog
  // ---------------------------------------------------------------------------

  setFog(color = 0x000000, near = 10, far = 100) {
    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogColor = hexToColor3(color);
    this.scene.fogStart = near;
    this.scene.fogEnd = far;
  }

  clearFog() {
    this.scene.fogMode = Scene.FOGMODE_NONE;
  }

  // ---------------------------------------------------------------------------
  // 2D HUD
  // ---------------------------------------------------------------------------

  cls(color = 0x000000) {
    if (!this._hudCtx) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this._hudCtx.fillStyle = `rgb(${r},${g},${b})`;
    this._hudCtx.fillRect(0, 0, this.w, this.h);
  }

  print(text, x, y, color = 0xffffff, size = 12) {
    if (!this._hudCtx) return;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this._hudCtx.fillStyle = `rgb(${r},${g},${b})`;
    this._hudCtx.font = `${size}px monospace`;
    this._hudCtx.fillText(String(text), x, y + size);
  }

  // ---------------------------------------------------------------------------
  // exposeTo — wire all cart-facing functions onto a target object (globalThis)
  // ---------------------------------------------------------------------------

  exposeTo(target) {
    const self = this;
    Object.assign(target, {
      // Primitives
      createCube: (s, c, p, o) => self.createCube(s, c, p, o),
      createSphere: (r, c, p, seg, o) => self.createSphere(r, c, p, seg, o),
      createPlane: (w, h, c, p, o) => self.createPlane(w, h, c, p, o),
      createCylinder: (rT, rB, h, c, p, o) => self.createCylinder(rT, rB, h, c, p, o),
      createCone: (r, h, c, p, o) => self.createCone(r, h, c, p, o),
      destroyMesh: id => self.destroyMesh(id),
      removeMesh: id => self.destroyMesh(id),
      getMesh: id => self.getMesh(id),

      // Transforms
      setPosition: (id, x, y, z) => self.setPosition(id, x, y, z),
      setScale: (id, x, y, z) => self.setScale(id, x, y, z),
      setRotation: (id, x, y, z) => self.setRotation(id, x, y, z),
      getPosition: id => self.getPosition(id),
      rotateMesh: (id, rx, ry, rz) => self.rotateMesh(id, rx, ry, rz),

      // Camera
      setCameraPosition: (x, y, z) => self.setCameraPosition(x, y, z),
      setCameraTarget: (x, y, z) => self.setCameraTarget(x, y, z),
      setCameraFOV: fov => self.setCameraFOV(fov),

      // Lights
      setAmbientLight: (c, i) => self.setAmbientLight(c, i),
      setLightDirection: (x, y, z) => self.setLightDirection(x, y, z),
      setLightColor: c => self.setLightColor(c),
      createPointLight: (c, i, x, y, z) => self.createPointLight(c, i, x, y, z),

      // Scene
      setFog: (c, n, f) => self.setFog(c, n, f),
      clearFog: () => self.clearFog(),
      get3DStats: () => self.get3DStats(),

      // 2D HUD
      cls: c => self.cls(c),
      print: (t, x, y, c, s) => self.print(t, x, y, c, s),
    });
  }
}
