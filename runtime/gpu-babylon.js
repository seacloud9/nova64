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

    console.log('[GpuBabylon] Initializing Babylon.js engine...', { canvas, w, h });
    // Babylon engine + scene
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      powerPreference: 'high-performance',
      adaptToDeviceRatio: false, // Prevent automatic DPI scaling
      disableWebGL2Support: false,
    });

    this.scene = new Scene(this.engine);

    // CRITICAL: Use right-handed coordinate system to match Three.js
    // Babylon.js is left-handed by default, but Three.js is right-handed
    // This ensures player controls and positioning work identically in both backends
    this.scene.useRightHandedSystem = true;

    // TEMPORARY DEBUG: Use bright magenta clear color to verify canvas is visible
    this.scene.clearColor = new Color4(1, 0, 1, 1); // BRIGHT MAGENTA for testing
    // this.scene.clearColor = new Color4(0.04, 0.04, 0.06, 1); // Original dark blue

    console.log(
      '[GpuBabylon] Scene created with RIGHT-HANDED coordinate system, clearColor:',
      this.scene.clearColor
    );
    // Free-look camera (position-based, matches Nova64's camera model)
    this.camera = new UniversalCamera('cam', new Vector3(0, 5, -10), this.scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1000;
    this.camera.fov = (75 * Math.PI) / 180; // 75° FOV
    this.camera.attachControl(canvas, true);

    // CRITICAL: Set as active camera for the scene
    this.scene.activeCamera = this.camera;

    // Lighting
    console.log(
      '[GpuBabylon] Camera created and attached:',
      this.camera.position,
      'target:',
      this.camera.target,
      'activeCamera set:',
      !!this.scene.activeCamera
    );
    this._setupLights();

    // Three.js compatibility: scene.add() method (Babylon auto-adds meshes, so this is a no-op)
    this.scene.add = _mesh => {
      console.log(
        '[GpuBabylon] scene.add() called (Three.js compatibility shim) - Babylon auto-adds meshes'
      );
      // In Babylon, meshes are automatically added to scene when created, so this is a no-op
    };

    // Mesh registry: meshId → BABYLON.AbstractMesh
    this._meshes = new Map();
    this._counter = 0;

    // Camera state mirrors
    this._cameraTarget = Vector3.Zero();

    // Framebuffer64 for 2D HUD (used by stdApi, api-2d, api-generative)
    this.fb = new Framebuffer64(w, h);
    // Persistent Uint8 pixel buffer for putImageData (reused each frame)
    this._fbImageData = null;
    // Temp canvas for framebuffer composite (needed because putImageData ignores composite ops)
    this._fbCanvas = null;
    this._fbCanvasCtx = null;

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

    // CRITICAL: Set canvas BUFFER dimensions (for rendering resolution)
    // But allow CSS to scale DISPLAY size to fill container
    this.canvas.width = w; // WebGL buffer: 640x360
    this.canvas.height = h; // WebGL buffer: 640x360

    // DO NOT override width/height in CSS - let babylon_console.html's "width: 100%; height: 100%" fill container
    // The canvas will render at 640x360 internally but display scaled to fill the container

    // Set visibility and positioning (but NOT width/height)
    this.canvas.style.setProperty('display', 'block', 'important');
    this.canvas.style.setProperty('visibility', 'visible', 'important');
    this.canvas.style.setProperty('opacity', '1', 'important');
    this.canvas.style.setProperty('position', 'absolute', 'important');
    // CRITICAL: Set z-index BELOW scanlines/glare but ABOVE background
    // Z-index only works with positioned elements (position: absolute/relative/fixed)
    // The .scanlines and .screen-glare divs have z-index 10 and 11
    // Set to 9 so it's visible but under the CRT effects
    this.canvas.style.setProperty('z-index', '9', 'important');
    this.engine.setHardwareScalingLevel(1);
    this.engine.resize(true); // Force exact buffer size
    console.log(
      '[GpuBabylon] Canvas buffer:',
      w,
      'x',
      h,
      '| Display: 100% (fills container) | z-index: 9'
    );

    console.log(
      '[GpuBabylon] ✅ Init complete. Canvas:',
      this.canvas.width,
      'x',
      this.canvas.height,
      'Engine:',
      this.engine.getRenderWidth(),
      'x',
      this.engine.getRenderHeight()
    );
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
      'pointer-events:none;z-index:10;image-rendering:pixelated;' +
      'background:transparent;'; // CRITICAL: Explicit transparent background!
    const container = mainCanvas.parentElement ?? document.body;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(hud);
    this._hudCanvas = hud;
    this._hudCtx = hud.getContext('2d', { alpha: true });
    // CRITICAL: Clear the HUD canvas to transparent so 3D scene is visible underneath
    this._hudCtx.clearRect(0, 0, w, h);
    console.log(
      '[GpuBabylon] HUD overlay created with EXPLICIT transparent background, z-index:10'
    );
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
    // Clear HUD canvas at the start of each frame
    if (this._hudCtx) {
      this._hudCtx.clearRect(0, 0, this.w, this.h);
    }
  }

  _compositeFramebuffer() {
    if (!this._hudCtx) return;
    const W = this.fb.width;
    const H = this.fb.height;

    // Check if framebuffer has any non-transparent pixels
    const src = this.fb.pixels;
    let hasContent = false;
    let nonZeroPixels = 0;
    for (let i = 0; i < W * H * 4; i += 4) {
      if (src[i + 3] > 0) {
        // Check alpha channel
        hasContent = true;
        nonZeroPixels++;
      }
    }

    // DEBUG: Log framebuffer status every 60 frames (dev mode only)
    if (globalThis._debugLogger?.devOnly) {
      if (!this._compositeDebugCounter) this._compositeDebugCounter = 0;
      this._compositeDebugCounter++;
      if (this._compositeDebugCounter % 60 === 0 && hasContent) {
        globalThis._debugLogger.devOnly(`Framebuffer composite: ${nonZeroPixels} non-zero pixels`);
      }
    }

    // Skip composite if framebuffer is empty (all transparent)
    if (!hasContent) return;

    // Create temporary canvas for framebuffer (lazily)
    if (!this._fbCanvas) {
      this._fbCanvas = document.createElement('canvas');
      this._fbCanvasCtx = this._fbCanvas.getContext('2d', { alpha: true });
    }
    if (this._fbCanvas.width !== W || this._fbCanvas.height !== H) {
      this._fbCanvas.width = W;
      this._fbCanvas.height = H;
    }

    // Create ImageData if needed
    if (!this._fbImageData || this._fbImageData.width !== W || this._fbImageData.height !== H) {
      this._fbImageData = this._fbCanvasCtx.createImageData(W, H);
    }

    // Convert framebuffer to ImageData
    const dst = this._fbImageData.data;
    for (let i = 0; i < W * H; i++) {
      const s = i * 4;
      dst[s] = src[s] / 257; // R 16→8 bit
      dst[s + 1] = src[s + 1] / 257; // G
      dst[s + 2] = src[s + 2] / 257; // B
      dst[s + 3] = src[s + 3] / 257; // A
    }

    // Put framebuffer data onto temporary canvas
    this._fbCanvasCtx.putImageData(this._fbImageData, 0, 0);

    // Draw temp canvas onto HUD canvas
    // drawImage DOES respect globalCompositeOperation (putImageData does NOT!)
    // Use 'source-over' (default) to draw framebuffer content ON TOP
    // This is correct for most cases - start screens, HUD overlays, etc.
    this._hudCtx.globalCompositeOperation = 'source-over';
    this._hudCtx.drawImage(this._fbCanvas, 0, 0);
  }

  endFrame() {
    // Debug BEFORE render
    if (!this._debugFrameCount) this._debugFrameCount = 0;
    this._debugFrameCount++;

    if (this._debugFrameCount === 1) {
      console.log('=== [GpuBabylon] PRE-RENDER DEBUG (Frame 1) ===');
      const gl = this.engine._gl;
      if (gl) {
        console.log('[GpuBabylon] WebGL Context BEFORE render:', {
          contextLost: gl.isContextLost(),
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          currentFramebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
          currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
        });
      }
      console.log('[GpuBabylon] Canvas element:', {
        id: this.canvas.id,
        width: this.canvas.width,
        height: this.canvas.height,
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        offsetWidth: this.canvas.offsetWidth,
        offsetHeight: this.canvas.offsetHeight,
      });
    }

    // RENDER
    this.scene.render();

    // Debug AFTER render
    if (this._debugFrameCount === 1 || this._debugFrameCount % 120 === 0) {
      console.log('=== [GpuBabylon] FRAME', this._debugFrameCount, 'DEBUG ===');

      // CRITICAL: Check actual WebGL state after render
      const gl = this.engine._gl;
      if (gl) {
        console.log('[GpuBabylon] WebGL State AFTER render:', {
          contextLost: gl.isContextLost(),
          drawingBufferWidth: gl.drawingBufferWidth,
          drawingBufferHeight: gl.drawingBufferHeight,
          viewport: gl.getParameter(gl.VIEWPORT),
          clearColor: gl.getParameter(gl.COLOR_CLEAR_VALUE),
          colorMask: gl.getParameter(gl.COLOR_WRITEMASK),
          depthTest: gl.getParameter(gl.DEPTH_TEST),
          cullFace: gl.getParameter(gl.CULL_FACE),
          blend: gl.getParameter(gl.BLEND),
          scissorTest: gl.getParameter(gl.SCISSOR_TEST),
          currentFramebuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
        });

        // CRITICAL: Read back pixels from multiple locations to verify rendering
        const center = new Uint8Array(4);
        const topLeft = new Uint8Array(4);
        const bottomRight = new Uint8Array(4);
        gl.readPixels(320, 180, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
        gl.readPixels(10, 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, topLeft);
        gl.readPixels(630, 350, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bottomRight);
        console.log('[GpuBabylon] Pixel samples (RGBA 0-255):');
        console.log(
          `  Center (320,180): R=${center[0]} G=${center[1]} B=${center[2]} A=${center[3]}`
        );
        console.log(
          `  TopLeft (10,10): R=${topLeft[0]} G=${topLeft[1]} B=${topLeft[2]} A=${topLeft[3]}`
        );
        console.log(
          `  BottomRight (630,350): R=${bottomRight[0]} G=${bottomRight[1]} B=${bottomRight[2]} A=${bottomRight[3]}`
        );
      }

      // CRITICAL: Check canvas visibility in DOM
      const canvasStyle = window.getComputedStyle(this.canvas);
      console.log('[GpuBabylon] Canvas DOM/CSS:', {
        id: this.canvas.id,
        display: canvasStyle.display,
        visibility: canvasStyle.visibility,
        opacity: canvasStyle.opacity,
        zIndex: canvasStyle.zIndex,
        position: canvasStyle.position,
        width: canvasStyle.width,
        height: canvasStyle.height,
        top: canvasStyle.top,
        left: canvasStyle.left,
        backgroundColor: canvasStyle.backgroundColor,
      });

      console.log('[GpuBabylon] Camera:', {
        position: this.camera.position.toString(),
        target: this.camera.target.toString(),
        fov: this.camera.fov,
        minZ: this.camera.minZ,
        maxZ: this.camera.maxZ,
        isActive: this.scene.activeCamera === this.camera,
      });
      console.log('[GpuBabylon] Canvas/Engine:', {
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        engineWidth: this.engine.getRenderWidth(),
        engineHeight: this.engine.getRenderHeight(),
        hwScaling: this.engine.getHardwareScalingLevel(),
        aspectRatio: this.engine.getAspectRatio(this.camera),
      });

      if (this._meshes.size > 0) {
        const meshArray = Array.from(this._meshes.values());
        console.log('[GpuBabylon] Meshes in scene:', meshArray.length);
        meshArray.forEach((mesh, idx) => {
          console.log(`  [${idx}] ${mesh.name}:`, {
            pos: mesh.position.toString(),
            visible: mesh.isVisible,
            enabled: mesh.isEnabled(),
            material: mesh.material?.name || 'none',
            isReady: mesh.isReady(),
          });
        });
      }

      console.log(
        '[GpuBabylon] Lights:',
        this.scene.lights.map(l => `${l.name}(${l.getClassName()})`).join(', ')
      );
      console.log(
        '[GpuBabylon] Scene ready:',
        this.scene.isReady(),
        'Meshes ready:',
        this.scene.meshes.filter(m => m.isReady()).length,
        '/',
        this.scene.meshes.length
      );
      console.log('[GpuBabylon] Engine stats:', {
        drawCalls: this.engine.drawCalls,
        renderPasses: this.engine._renderPassId || 0,
      });

      // CRITICAL: Check materials and rendering state
      /*onsole.log("[GpuBabylon] Material check:");
      this.scene.meshes.forEach((mesh, idx) => {
        if (mesh.material) {
          console.log(`  Mesh ${idx} "${mesh.name}":`, {
            materialReady: mesh.material.isReady(mesh),
            materialType: mesh.material.getClassName(),
            alpha: mesh.material.alpha,
            backFaceCulling: mesh.material.backFaceCulling,
            wireframe: mesh.material.wireframe
          });
        } else {
          console.log(`  Mesh ${idx} "${mesh.name}": NO MATERIAL`);
        }
      });
  */
      // CRITICAL: Check if meshes are being rendered
      console.log('[GpuBabylon] Render stats:', {
        totalMeshes: this.scene.meshes.length,
        activeMeshes: this.scene.getActiveMeshes().length,
        totalVertices: this.scene.getTotalVertices(),
        activeIndices: this.scene.getActiveIndices(),
        activeBones: this.scene.getActiveBones(),
        activeParticles: this.scene.getActiveParticles(),
      });

      console.log('=== END FRAME DEBUG ===');
    }

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
        mesh = MeshBuilder.CreateGround(
          name,
          { width: geometryDesc.width, height: geometryDesc.height },
          this.scene
        );
        // CreateGround creates a horizontal plane in XZ (like Three.js), no rotation needed
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
    console.log(
      '[GpuBabylon] createMesh:',
      geometryDesc.geometryType,
      'at position:',
      pos,
      'material:',
      !!material
    );
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

  createAdvancedCube(size = 1, materialOptions = {}, position = [0, 0, 0]) {
    const geo = this.createBoxGeometry(size, size, size);
    const mat = this.createN64Material(materialOptions);
    return this.createMesh(geo, mat, position);
  }

  createSphere(radius = 1, color = 0xffffff, position = [0, 0, 0], segments = 8, options = {}) {
    const geo = this.createSphereGeometry(radius, segments);
    const mat = this.createN64Material({ color, ...options });
    return this.createMesh(geo, mat, position);
  }

  createAdvancedSphere(radius = 1, materialOptions = {}, position = [0, 0, 0], segments = 16) {
    const geo = this.createSphereGeometry(radius, segments);
    const mat = this.createN64Material(materialOptions);
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
      // Babylon.js Vector3 doesn't have .set() - use copyFromFloats instead
      mesh.position.copyFromFloats(x, y, z);
      return;
    }
    const light = this._cartLights.get(id);
    if (light) light.position.copyFromFloats(x, y, z);
  }

  getPosition(id) {
    const mesh = this._meshes.get(id);
    if (!mesh) return { x: 0, y: 0, z: 0 };
    return { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
  }

  setScale(id, x, y, z) {
    const mesh = this._meshes.get(id);
    if (mesh) mesh.scaling.copyFromFloats(x, y, z);
  }

  setRotation(id, x, y, z) {
    const mesh = this._meshes.get(id);
    if (mesh) mesh.rotation.copyFromFloats(x, y, z);
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

  setMeshVisible(id, visible) {
    const mesh = this._meshes.get(id);
    if (mesh) {
      mesh.isVisible = visible;
    }
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  setCameraPosition(x, y, z) {
    this.camera.position.copyFromFloats(x, y, z);
    // Keep looking at target after reposition
    this.camera.setTarget(this._cameraTarget);
  }

  setCameraTarget(x, y, z) {
    this._cameraTarget.copyFromFloats(x, y, z);
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

  setDirectionalLight(direction, color = 0xffffff, intensity = 1.0) {
    // Remove existing cart directional lights
    this._cartLights.forEach((light, id) => {
      if (light instanceof DirectionalLight) {
        light.dispose();
        this._cartLights.delete(id);
      }
    });

    // Create new directional light
    const id = `dirLight_${Date.now()}`;
    const light = new DirectionalLight(id, new Vector3(0, -1, 0), this.scene);
    light.diffuse = hexToColor3(color);
    light.intensity = intensity;

    // Set direction
    if (Array.isArray(direction) && direction.length >= 3) {
      light.direction = new Vector3(direction[0], direction[1], direction[2]).normalize();
    } else {
      light.direction = new Vector3(1, -2, 1).normalize();
    }

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

  clearScene() {
    // Dispose all cart meshes
    this._meshes.forEach(mesh => {
      mesh.dispose();
    });
    this._meshes.clear();

    // Remove dynamic lights
    this._cartLights.forEach(light => {
      light.dispose();
    });
    this._cartLights.clear();

    // Reset default lights
    this._setupLights();

    // Clear HUD overlay
    if (this._hudCtx) {
      this._hudCtx.clearRect(0, 0, this.w, this.h);
    }

    console.log('✅ Babylon.js scene cleared');
  }

  clearAnimatedMeshes() {
    // Placeholder for compatibility with Three.js backend
    // Babylon.js doesn't have a separate animated mesh registry yet
  }

  enablePixelation(factor = 2) {
    // In Babylon.js, use hardware scaling to achieve pixelation effect
    if (factor <= 0) {
      // Restore default quality
      this.engine.setHardwareScalingLevel(1);
    } else {
      // Higher factor = lower resolution = more pixelated
      this.engine.setHardwareScalingLevel(factor);
    }
  }

  enableDithering(_enabled = true) {
    // Babylon.js doesn't have built-in dithering like Three.js
    // This is a no-op for compatibility
    console.log('[GpuBabylon] Dithering not supported (Three.js only)');
  }

  // ---------------------------------------------------------------------------
  // 2D HUD
  // ---------------------------------------------------------------------------

  cls(color = 0x000000) {
    if (!this._hudCtx) return;
    // CRITICAL: Convert BigInt to Number if needed (for compatibility with different color formats)
    const colorNum = typeof color === 'bigint' ? Number(color) : color;
    const r = (colorNum >> 16) & 0xff;
    const g = (colorNum >> 8) & 0xff;
    const b = colorNum & 0xff;
    this._hudCtx.fillStyle = `rgb(${r},${g},${b})`;
    this._hudCtx.fillRect(0, 0, this.w, this.h);
  }

  print(text, x, y, color = 0xffffff, size = 12) {
    if (!this._hudCtx) return;
    // CRITICAL: Convert BigInt to Number if needed
    const colorNum = typeof color === 'bigint' ? Number(color) : color;
    const r = (colorNum >> 16) & 0xff;
    const g = (colorNum >> 8) & 0xff;
    const b = colorNum & 0xff;
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
      createAdvancedCube: (s, mo, p) => self.createAdvancedCube(s, mo, p),
      createSphere: (r, c, p, seg, o) => self.createSphere(r, c, p, seg, o),
      createAdvancedSphere: (r, mo, p, seg) => self.createAdvancedSphere(r, mo, p, seg),
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
      setMeshVisible: (id, visible) => self.setMeshVisible(id, visible),

      // Camera
      setCameraPosition: (x, y, z) => self.setCameraPosition(x, y, z),
      setCameraTarget: (x, y, z) => self.setCameraTarget(x, y, z),
      setCameraFOV: fov => self.setCameraFOV(fov),

      // Lights
      setAmbientLight: (c, i) => self.setAmbientLight(c, i),
      setLightDirection: (x, y, z) => self.setLightDirection(x, y, z),
      setLightColor: c => self.setLightColor(c),
      createPointLight: (c, i, x, y, z) => self.createPointLight(c, i, x, y, z),
      setDirectionalLight: (d, c, i) => self.setDirectionalLight(d, c, i),

      // Scene
      setFog: (c, n, f) => self.setFog(c, n, f),
      clearFog: () => self.clearFog(),
      get3DStats: () => self.get3DStats(),
      clearScene: () => self.clearScene(),
      enablePixelation: f => self.enablePixelation(f),
      enableDithering: e => self.enableDithering(e),

      // 2D HUD - NOTE: print() is provided by api.js, not by gpu-babylon
      // We only expose cls() here since it needs direct canvas access
      cls: c => self.cls(c),
      // print: removed - using api.js print() which supports BitmapFont + Framebuffer64
    });
  }

  // ---------------------------------------------------------------------------
  // Three.js Compatibility Layer
  // ---------------------------------------------------------------------------

  /**
   * Three.js compatibility stub - returns pixel ratio for post-processing effects.
   * Babylon.js uses hardware scaling level instead, but we return 1 for compatibility.
   */
  getPixelRatio() {
    return 1; // Babylon.js doesn't use pixel ratio the same way
  }
}
