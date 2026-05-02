// nova64-compat.js — Nova64 high-level API shim for the Godot host.
//
// Maps the Nova64 cart-facing API (nova64.scene.*, nova64.camera.*,
// nova64.light.*, nova64.draw.*, nova64.input.*, plus flat globals like
// createCube, setPosition, print, cls, rgba8) onto the Godot adapter
// contract exposed via `engine.call(method, payload)`.
//
// Loaded by the host before each cart module so cart code that imports
// none of these as ES modules (they're declared globals in Nova64) finds
// them as free identifiers.
//
// Coverage is intentionally minimal — just enough for the G5 Tier 1 port.
// Unsupported features log a one-time warning and behave as no-ops so
// carts that touch them can still boot.

(function installNova64Compat(global) {
  if (global.nova64 && global.nova64.__compatLoaded) return;

  // ---------------- helpers ---------------------------------------------
  const warned = new Set();
  function warnOnce(name) {
    if (warned.has(name)) return;
    warned.add(name);
    print('[nova64-compat] gap: ' + name + ' (no-op shim)');
  }

  // Cache of named no-op functions returned by the namespace fallback proxy.
  // Reusing the same function across calls keeps reference counts stable so
  // QuickJS shutdown doesn't end up double-collecting transient closures.
  // The returned function yields a generic stub object so cart code that
  // does `getMesh(h).position.x = 5` etc. doesn't blow up.
  const noopCache = Object.create(null);
  function namedNoop(ns, key) {
    const cacheKey = ns + '.' + key;
    if (!noopCache[cacheKey]) {
      noopCache[cacheKey] = function () {
        warnOnce(cacheKey);
        return makeStub();
      };
    }
    return noopCache[cacheKey];
  }

  // Wrap a real backing namespace object so any property the cart asks for
  // resolves to either the real implementation, a numeric/object default,
  // or a named no-op function. This stops `const { foo } = nova64.bar`
  // from throwing when `bar` is incomplete.
  function wrapNamespace(name, backing) {
    return new Proxy(backing, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        // Common numeric / object-shaped defaults.
        if (prop === 'length' || prop === 'size' || prop === 'count') return 0;
        return namedNoop(name, String(prop));
      },
      has() { return true; },
    });
  }

  function call(method, payload) {
    const r = engine.call(method, payload || {});
    if (r && r.error) {
      print('[nova64-compat] ' + method + ' error: ' + r.error);
    }
    return r;
  }

  // Hex int 0xRRGGBB or 0xAARRGGBB → [r,g,b,a] floats 0..1
  function colorFromHex(hex, alpha) {
    if (Array.isArray(hex)) {
      const a = hex.length >= 4 ? hex[3] : 1;
      return [hex[0], hex[1], hex[2], a];
    }
    if (typeof hex === 'object' && hex !== null) {
      return [hex.r || 0, hex.g || 0, hex.b || 0, hex.a == null ? 1 : hex.a];
    }
    const n = (hex | 0) >>> 0;
    let r, g, b, a;
    if (n > 0xffffff) {
      a = ((n >>> 24) & 0xff) / 255;
      r = ((n >>> 16) & 0xff) / 255;
      g = ((n >>> 8) & 0xff) / 255;
      b = (n & 0xff) / 255;
    } else {
      r = ((n >>> 16) & 0xff) / 255;
      g = ((n >>> 8) & 0xff) / 255;
      b = (n & 0xff) / 255;
      a = alpha == null ? 1 : alpha;
    }
    return [r, g, b, a];
  }

  function ensureArray3(x, y, z, fallback) {
    if (Array.isArray(x)) return [x[0] || 0, x[1] || 0, x[2] || 0];
    if (x == null && fallback) return fallback.slice();
    return [x || 0, y || 0, z || 0];
  }

  // Per-handle Euler rotation cache so rotateMesh can advance without a
  // round-trip to the host (bridge has no get_rotation yet).
  const rotState = new Map();
  function getRot(handle) {
    let r = rotState.get(handle);
    if (!r) { r = [0, 0, 0]; rotState.set(handle, r); }
    return r;
  }

  // ---------------- defaults --------------------------------------------
  let cameraHandle = 0;
  let cameraTarget = [0, 0, 0];
  let cameraPos = [0, 5, 10];
  let dirLightHandle = 0;
  let initialized = false;

  function ensureInit() {
    if (initialized) return;
    initialized = true;
    call('engine.init', {});
    cameraHandle = (call('camera.create', {}) || {}).handle || 0;
    if (cameraHandle) {
      call('transform.set', { handle: cameraHandle, position: cameraPos });
      call('camera.setActive', { handle: cameraHandle });
    }
    dirLightHandle = (call('light.createDirectional', {
      color: [1, 1, 1, 1],
      energy: 1.0,
    }) || {}).handle || 0;
  }

  function applyCameraLookAt() {
    if (!cameraHandle) return;
    const dx = cameraTarget[0] - cameraPos[0];
    const dy = cameraTarget[1] - cameraPos[1];
    const dz = cameraTarget[2] - cameraPos[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const fx = dx / len, fy = dy / len, fz = dz / len;
    // Godot cameras look down -Z. Convert forward → Euler XY (no roll).
    const yaw = Math.atan2(-fx, -fz);
    const pitch = Math.asin(fy);
    call('transform.set', {
      handle: cameraHandle,
      position: cameraPos,
      rotation: [pitch, yaw, 0],
    });
  }

  // ---------------- mesh factories --------------------------------------
  // Many carts (especially Three.js-style ones) treat meshes as objects with
  // mutable .position/.rotation/.scale. Wrap each numeric bridge handle in a
  // fat object that satisfies that shape AND coerces back to the numeric
  // handle when passed to bridge-calling helpers (via Symbol.toPrimitive).
  function unwrapHandle(h) {
    if (h && typeof h === 'object' && typeof h.handle === 'number') return h.handle;
    return h | 0;
  }
  function makeTrackedVector(initial, onChange) {
    const values = [(initial && initial[0]) || 0, (initial && initial[1]) || 0, (initial && initial[2]) || 0];
    const vector = {};
    function setValue(index, value, notify) {
      values[index] = typeof value === 'number' && isFinite(value) ? value : 0;
      if (notify !== false) onChange(values.slice());
    }
    Object.defineProperties(vector, {
      x: { get() { return values[0]; }, set(v) { setValue(0, v, true); } },
      y: { get() { return values[1]; }, set(v) { setValue(1, v, true); } },
      z: { get() { return values[2]; }, set(v) { setValue(2, v, true); } },
    });
    vector._set = function (next, notify) {
      setValue(0, next && next[0], false);
      setValue(1, next && next[1], false);
      setValue(2, next && next[2], false);
      if (notify !== false) onChange(values.slice());
    };
    vector.toArray = function () { return values.slice(); };
    return vector;
  }
  function makeMeshHandle(rawHandle, pos) {
    const px = (pos && pos[0]) || 0;
    const py = (pos && pos[1]) || 0;
    const pz = (pos && pos[2]) || 0;
    const obj = {
      handle: rawHandle | 0,
      visible: true,
    };
    let materialHandle = null;
    obj.position = makeTrackedVector([px, py, pz], function (v) {
      if (obj.handle) call('transform.set', { handle: obj.handle, position: v });
    });
    obj.rotation = makeTrackedVector([0, 0, 0], function (v) {
      if (!obj.handle) return;
      rotState.set(obj.handle, v.slice());
      call('transform.set', { handle: obj.handle, rotation: v });
    });
    obj.scale = makeTrackedVector([1, 1, 1], function (v) {
      if (obj.handle) call('transform.set', { handle: obj.handle, scale: v });
    });
    Object.defineProperty(obj, 'material', {
      get() { return materialHandle; },
      set(value) {
        materialHandle = value;
        const matHandle = unwrapHandle(value);
        if (obj.handle && matHandle) call('mesh.setMaterial', { mesh: obj.handle, material: matHandle });
      },
    });
    obj[Symbol.toPrimitive] = function () { return obj.handle; };
    return obj;
  }

  function materialPayload(color, opts) {
    opts = opts || {};
    const baseColor = opts.color != null ? opts.color : (opts.albedo != null ? opts.albedo : (color == null ? 0xffffff : color));
    const alpha = opts.opacity != null ? opts.opacity : opts.alpha;
    const payload = {
      albedo: colorFromHex(baseColor, alpha == null ? 1 : alpha),
      metallic: typeof opts.metallic === 'number' ? opts.metallic : 0.05,
      roughness: typeof opts.roughness === 'number' ? opts.roughness : 0.6,
    };
    const emission = opts.emissive != null ? opts.emissive : opts.emission;
    if (emission != null) {
      payload.emission = colorFromHex(emission);
      payload.emissionEnergy = typeof opts.emissiveIntensity === 'number'
        ? opts.emissiveIntensity
        : (typeof opts.emissionEnergy === 'number' ? opts.emissionEnergy : 1.0);
    }
    if (opts.unshaded) payload.unshaded = true;
    if (opts.flatShading) payload.shadingMode = 'per_vertex';
    if (opts.shadingMode) payload.shadingMode = opts.shadingMode;
    if (opts.diffuseMode) payload.diffuseMode = opts.diffuseMode;
    if (opts.specularMode) payload.specularMode = opts.specularMode;
    if (opts.blend) payload.blend = opts.blend;
    if (opts.additive) payload.blend = 'add';
    if (opts.transparent || (alpha != null && alpha < 1)) payload.transparency = 'alpha';
    if (opts.transparency) payload.transparency = opts.transparency;
    if (opts.cull) payload.cull = opts.cull;
    if (opts.doubleSided || opts.side === 'double') payload.doubleSided = true;
    if (opts.rim != null) payload.rim = opts.rim;
    if (opts.rimTint != null) payload.rimTint = opts.rimTint;
    if (opts.clearcoat != null) payload.clearcoat = opts.clearcoat;
    if (opts.clearcoatRoughness != null) payload.clearcoatRoughness = opts.clearcoatRoughness;
    return payload;
  }

  function spawnMesh(geomHandle, color, pos, opts) {
    ensureInit();
    const mat = call('material.create', materialPayload(color, opts));
    const matHandle = mat ? mat.handle : 0;
    const mesh = call('mesh.create', { geometry: geomHandle, material: matHandle });
    const meshHandle = mesh ? mesh.handle : 0;
    if (meshHandle && matHandle) {
      call('mesh.setMaterial', { mesh: meshHandle, material: matHandle });
    }
    if (meshHandle) {
      call('transform.set', { handle: meshHandle, position: ensureArray3(pos && pos[0], pos && pos[1], pos && pos[2]) });
    }
    return meshHandle ? makeMeshHandle(meshHandle, pos) : 0;
  }

  function createCube(size, color, pos, opts) {
    ensureInit();
    const s = typeof size === 'number' ? size : 1;
    const geom = call('geometry.createBox', { size: [s, s, s] });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function createSphere(radius, color, pos, _segments, opts) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const geom = call('geometry.createSphere', { radius: r, height: r * 2 });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function createPlane(w, h, color, pos, opts) {
    ensureInit();
    const sx = typeof w === 'number' ? w : 1;
    const sz = typeof h === 'number' ? h : 1;
    const geom = call('geometry.createPlane', { size: [sx, 0, sz] });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  // Cylinder + cone + torus primitives — backed by real Godot meshes.
  function createCylinder(radiusTop, radiusBottom, height, color, pos, opts) {
    ensureInit();
    const rt = typeof radiusTop === 'number' ? radiusTop : 0.5;
    const rb = typeof radiusBottom === 'number' ? radiusBottom : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createCylinder', {
      topRadius: rt, bottomRadius: rb, height: h, sides: 24,
    });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function createCone(radius, height, color, pos, opts) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createCone', { radius: r, height: h, sides: 24 });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function createTorus(innerRadius, outerRadius, color, pos, opts) {
    ensureInit();
    const inner = typeof innerRadius === 'number' ? innerRadius : 0.3;
    const outer = typeof outerRadius === 'number' ? outerRadius : 0.5;
    const geom = call('geometry.createTorus', { innerRadius: inner, outerRadius: outer });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function removeMesh(handle) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('mesh.destroy', { handle: h });
    rotState.delete(h);
    if (handle && typeof handle === 'object') handle.handle = 0;
  }

  function setPosition(handle, x, y, z) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    const p = ensureArray3(x, y, z);
    call('transform.set', { handle: h, position: p });
    if (handle && typeof handle === 'object' && handle.position) {
      if (typeof handle.position._set === 'function') handle.position._set(p, false);
      else { handle.position.x = p[0]; handle.position.y = p[1]; handle.position.z = p[2]; }
    }
  }

  function setRotation(handle, x, y, z) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    const r = ensureArray3(x, y, z);
    rotState.set(h, r.slice());
    call('transform.set', { handle: h, rotation: r });
    if (handle && typeof handle === 'object' && handle.rotation) {
      if (typeof handle.rotation._set === 'function') handle.rotation._set(r, false);
      else { handle.rotation.x = r[0]; handle.rotation.y = r[1]; handle.rotation.z = r[2]; }
    }
  }

  function rotateMesh(handle, dx, dy, dz) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    const r = getRot(h);
    r[0] += dx || 0; r[1] += dy || 0; r[2] += dz || 0;
    call('transform.set', { handle: h, rotation: r });
    if (handle && typeof handle === 'object' && handle.rotation) {
      if (typeof handle.rotation._set === 'function') handle.rotation._set(r, false);
      else { handle.rotation.x = r[0]; handle.rotation.y = r[1]; handle.rotation.z = r[2]; }
    }
  }

  function setScale(handle, x, y, z) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    const s = ensureArray3(x, y, z, [1, 1, 1]);
    call('transform.set', { handle: h, scale: s });
    if (handle && typeof handle === 'object' && handle.scale) {
      if (typeof handle.scale._set === 'function') handle.scale._set(s, false);
      else { handle.scale.x = s[0]; handle.scale.y = s[1]; handle.scale.z = s[2]; }
    }
  }

  // ---------------- camera ----------------------------------------------
  function setCameraPosition(x, y, z) {
    ensureInit();
    cameraPos = ensureArray3(x, y, z);
    applyCameraLookAt();
  }
  function setCameraTarget(x, y, z) {
    ensureInit();
    cameraTarget = ensureArray3(x, y, z);
    applyCameraLookAt();
  }
  function setCameraFOV(deg) {
    ensureInit();
    if (!cameraHandle || typeof deg !== 'number') return;
    call('camera.setParams', { handle: cameraHandle, fov: deg });
  }
  function setCameraLookAt(direction) {
    ensureInit();
    if (Array.isArray(direction) && direction.length >= 3) {
      cameraTarget = [cameraPos[0] + direction[0], cameraPos[1] + direction[1], cameraPos[2] + direction[2]];
    } else if (direction && typeof direction === 'object') {
      cameraTarget = [cameraPos[0] + (direction.x || 0), cameraPos[1] + (direction.y || 0), cameraPos[2] + (direction.z || 0)];
    }
    applyCameraLookAt();
  }

  // ---------------- light -----------------------------------------------
  function setLightDirection(x, y, z) {
    ensureInit();
    if (!dirLightHandle) return;
    const dx = x || 0, dy = y || -1, dz = z || 0;
    const len = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / len, ny = dy / len, nz = dz / len;
    const yaw = Math.atan2(-nx, -nz);
    const pitch = Math.asin(ny);
    call('transform.set', {
      handle: dirLightHandle,
      rotation: [pitch, yaw, 0],
    });
  }
  function setFog(color, near, far) {
    // Three.js fog is linear near..far; map to Godot depth fog and keep
    // a light density term for aerial perspective.
    ensureInit();
    const c = colorFromHex(typeof color === 'number' ? color : 0x7090b0);
    const n = typeof near === 'number' ? near : 10;
    const f = typeof far === 'number' ? far : 100;
    const span = Math.max(1, f - n);
    call('env.set', {
      fog: true,
      fogColor: c,
      fogNear: n,
      fogFar: f,
      fogCurve: 1.0,
      fogDensity: 0.08 / span,
    });
  }
  function clearFog() {
    ensureInit();
    call('env.set', { fog: false });
  }
  function createPointLight(color, energy, pos) {
    ensureInit();
    const r = call('light.createPoint', {
      color: colorFromHex(typeof color === 'number' ? color : 0xffffff),
      energy: typeof energy === 'number' ? energy : 1.0,
      position: ensureArray3(pos && pos[0], pos && pos[1], pos && pos[2]),
    });
    return r ? r.handle : 0;
  }
  function createSpotLight(color, energy, pos, angle) {
    ensureInit();
    const r = call('light.createSpot', {
      color: colorFromHex(typeof color === 'number' ? color : 0xffffff),
      energy: typeof energy === 'number' ? energy : 1.0,
      angle: typeof angle === 'number' ? angle : 35.0,
      position: ensureArray3(pos && pos[0], pos && pos[1], pos && pos[2]),
    });
    return r ? r.handle : 0;
  }
  function createAmbientLight(color, energy) {
    ensureInit();
    call('env.set', {
      ambient: colorFromHex(typeof color === 'number' ? color : 0x404040),
      ambientEnergy: typeof energy === 'number' ? energy : 1.0,
    });
    return 0;
  }
  function setAmbientLight(color, energy) {
    ensureInit();
    call('env.set', {
      ambient: colorFromHex(typeof color === 'number' ? color : 0x404040),
      ambientEnergy: typeof energy === 'number' ? energy : 1.0,
    });
  }
  function setLightColor(handle, color) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('light.setColor', {
      handle: h,
      color: colorFromHex(typeof color === 'number' ? color : 0xffffff),
    });
  }
  function setLightEnergy(handle, energy) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('light.setEnergy', { handle: h, energy: typeof energy === 'number' ? energy : 1.0 });
  }

  // ---------------- draw / 2D overlay ----------------------------------
  // All cart draw calls enqueue ops into a per-frame buffer. The host
  // calls __nova64_overlayFlush() once after the cart's draw fn returns,
  // which dispatches the whole batch in a single engine.call. This keeps
  // the JS↔C++ round-trip count to O(1) per frame instead of O(N) per
  // primitive — critical for boids (3000+ lines/frame) and generative-art.
  //
  // A 2D affine transform stack (3x3) is applied in the shim before
  // points enter the queue, so generative-art's pushMatrix/translate/
  // rotate/scale produce visually correct output.

  const __ops = [];
  // Affine matrix [a, b, c, d, e, f]:
  //   x' = a*x + c*y + e
  //   y' = b*x + d*y + f
  let __mtx = [1, 0, 0, 1, 0, 0];
  const __mtxStack = [];
  function __identity() { return __mtx[0] === 1 && __mtx[1] === 0 && __mtx[2] === 0 && __mtx[3] === 1 && __mtx[4] === 0 && __mtx[5] === 0; }
  function __tx(x, y) {
    if (__identity()) return [x, y];
    return [__mtx[0] * x + __mtx[2] * y + __mtx[4], __mtx[1] * x + __mtx[3] * y + __mtx[5]];
  }
  function __mtxScale() {
    // Uniform scale magnitude for radii / line widths.
    const sx = Math.sqrt(__mtx[0] * __mtx[0] + __mtx[1] * __mtx[1]);
    const sy = Math.sqrt(__mtx[2] * __mtx[2] + __mtx[3] * __mtx[3]);
    return (sx + sy) * 0.5;
  }
  function pushMatrix() { __mtxStack.push([__mtx[0], __mtx[1], __mtx[2], __mtx[3], __mtx[4], __mtx[5]]); }
  function popMatrix() { if (__mtxStack.length > 0) __mtx = __mtxStack.pop(); }
  function translate(x, y) {
    __mtx[4] += __mtx[0] * x + __mtx[2] * y;
    __mtx[5] += __mtx[1] * x + __mtx[3] * y;
  }
  function rotateMtx(a) {
    const c = Math.cos(a), s = Math.sin(a);
    const a0 = __mtx[0], b0 = __mtx[1], c0 = __mtx[2], d0 = __mtx[3];
    __mtx[0] = a0 * c + c0 * s;
    __mtx[1] = b0 * c + d0 * s;
    __mtx[2] = a0 * -s + c0 * c;
    __mtx[3] = b0 * -s + d0 * c;
  }
  function scaleMtx(sx, sy) {
    if (sy == null) sy = sx;
    __mtx[0] *= sx; __mtx[1] *= sx;
    __mtx[2] *= sy; __mtx[3] *= sy;
  }

  // Host-invoked at end of cart_draw(). One engine.call drains the queue.
  global.__nova64_overlayFlush = function () {
    if (__ops.length === 0) return;
    call('overlay.batch', { ops: __ops });
    __ops.length = 0;
    // Transform stack should be balanced by the cart but reset defensively
    // so a cart bug can't bleed into the next frame.
    __mtx = [1, 0, 0, 1, 0, 0];
    __mtxStack.length = 0;
  };

  // Host-invoked once per frame (start of cart_update) to advance the
  // input "previous frame" window so btnp/keyp/mousePressed give a clean
  // single-frame edge.
  global.__nova64_inputStep = function () { _inputStep(); };
  // Pre-update hook: tick active tweens + novaStore time each frame.
  global.__nova64_preUpdate = function (dt) {
    updateTweens(dt);
    novaStore.setState(function (s) { return { time: s.time + dt }; });
  };

  function rgba8(r, g, b, a) {
    a = a == null ? 255 : a;
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  }
  // Unpack rgba8 int → { r, g, b, a } 0-255
  function _unpackColor(c) {
    const n = (c | 0) >>> 0;
    if (n > 0xffffff) {
      return { a: (n >>> 24) & 0xff, r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff };
    }
    return { r: (n >>> 16) & 0xff, g: (n >>> 8) & 0xff, b: n & 0xff, a: 255 };
  }
  function colorLerp(c1, c2, t) {
    const a = _unpackColor(c1), b = _unpackColor(c2);
    return rgba8(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, a.a + (b.a - a.a) * t);
  }
  function colorMix(c, factor) {
    const { r, g, b, a } = _unpackColor(c);
    return rgba8(Math.min(255, r * factor), Math.min(255, g * factor), Math.min(255, b * factor), a);
  }
  function hslColor(h, s, l, alpha) {
    s = s == null ? 1 : s; l = l == null ? 0.5 : l; alpha = alpha == null ? 255 : alpha;
    h = ((h % 360) + 360) % 360;
    const c2 = (1 - Math.abs(2 * l - 1)) * s;
    const x = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c2 / 2;
    let r, g, b;
    if (h < 60)      { r = c2; g = x;  b = 0;  }
    else if (h < 120){ r = x;  g = c2; b = 0;  }
    else if (h < 180){ r = 0;  g = c2; b = x;  }
    else if (h < 240){ r = 0;  g = x;  b = c2; }
    else if (h < 300){ r = x;  g = 0;  b = c2; }
    else             { r = c2; g = 0;  b = x;  }
    return rgba8(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), alpha);
  }
  // n64Palette: named retro colors
  const n64Palette = {
    black: rgba8(0,0,0), white: rgba8(255,255,255), red: rgba8(220,30,30),
    green: rgba8(30,200,60), blue: rgba8(30,80,220), yellow: rgba8(255,220,0),
    cyan: rgba8(0,220,220), magenta: rgba8(200,0,200), orange: rgba8(255,140,0),
    purple: rgba8(120,0,200), teal: rgba8(0,160,160), brown: rgba8(140,80,30),
    grey: rgba8(128,128,128), darkGrey: rgba8(60,60,60), lightGrey: rgba8(200,200,200),
    sky: rgba8(70,130,200), gold: rgba8(255,210,50), silver: rgba8(192,192,210),
  };
  function measureText(text, scale) {
    scale = typeof scale === 'number' ? scale : 1;
    // Approximate: 8 pixels per character at scale 1
    return { width: (text ? text.length : 0) * 8 * scale };
  }
  function scrollingText(text, y, speed, time, color, scale, width) {
    scale = typeof scale === 'number' ? scale : 1;
    width = typeof width === 'number' ? width : 640;
    const tw = measureText(text, scale).width;
    const x = ((width - ((time * speed) % (width + tw))) | 0);
    novaPrint(text, x, y, color, scale);
  }
  function drawWave(x, y, w, amplitude, frequency, phase, color, _thickness) {
    // Approximate as a series of small rects along a sine path
    const steps = Math.min(w, 80) | 0;
    const step = w / (steps || 1);
    for (let i = 0; i < steps; i++) {
      const px = x + i * step;
      const py = y + Math.sin(i * step * frequency + phase) * amplitude;
      __ops.push(['rect', px | 0, py | 0, 2, 2, colorFromHex(color || 0xffffff)]);
    }
  }
  function drawPulsingText(text, cx, y, color, time, opts) {
    opts = opts || {};
    const freq = opts.frequency != null ? opts.frequency : 3;
    const minAlpha = opts.minAlpha != null ? opts.minAlpha : 120;
    const scale = opts.scale != null ? opts.scale : 1;
    const alpha = Math.floor((Math.sin(time * freq) * 0.5 + 0.5) * (255 - minAlpha) + minAlpha);
    const { r, g, b } = _unpackColor(color || 0xffffff);
    const pulsedColor = rgba8(r, g, b, alpha);
    printCentered(text, cx, y, pulsedColor, scale);
  }
  function drawCheckerboard(x, y, w, h, c1, c2, size) {
    size = typeof size === 'number' ? size : 8;
    // Draw a simplified checkerboard using a grid of rects
    for (let ty = 0; ty < h; ty += size) {
      for (let tx = 0; tx < w; tx += size) {
        const cell = (((tx / size) | 0) + ((ty / size) | 0)) % 2;
        __ops.push(['rectfill', (x + tx) | 0, (y + ty) | 0, Math.min(size, w - tx) | 0, Math.min(size, h - ty) | 0, colorFromHex(cell === 0 ? c1 : c2)]);
      }
    }
  }
  function drawFloatingTexts(system, offsetX, offsetY) {
    if (!system || typeof system.getTexts !== 'function') return;
    offsetX = offsetX || 0; offsetY = offsetY || 0;
    const texts = system.getTexts();
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      const alpha = Math.min(255, Math.floor((t.timer / t.maxTimer) * 255));
      const color = typeof t.color === 'bigint' ? Number(t.color) : (t.color || 0xffffff);
      const { r, g, b } = _unpackColor(color);
      novaPrint(t.text, (t.x + offsetX) | 0, (t.y + offsetY) | 0, rgba8(r, g, b, alpha), t.scale || 1);
    }
  }
  function drawFloatingTexts3D(system, projectFn) {
    if (!system || typeof system.getTexts !== 'function') return;
    if (typeof projectFn !== 'function') return;
    const texts = system.getTexts();
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      const proj = projectFn(t.x, t.y, t.z || 0);
      if (!proj) continue;
      const sx = proj[0] != null ? proj[0] : proj.x;
      const sy = proj[1] != null ? proj[1] : proj.y;
      if (typeof sx !== 'number' || typeof sy !== 'number') continue;
      const alpha = Math.min(255, Math.floor((t.timer / t.maxTimer) * 255));
      const color = typeof t.color === 'bigint' ? Number(t.color) : (t.color || 0xffffff);
      const { r, g, b } = _unpackColor(color);
      novaPrint(t.text, sx | 0, sy | 0, rgba8(r, g, b, alpha), t.scale || 1);
    }
  }
  function createMinimap(opts) {
    opts = opts || {};
    return { __isMinimap: true, opts: opts, revealed: new Set() };
  }
  function drawMinimap(minimapOrX, timeOrY, sizeArg, entitiesArg, bgColorArg) {
    if (!minimapOrX) return;
    let mm, x, y, size;
    if (minimapOrX && minimapOrX.__isMinimap) {
      mm = minimapOrX;
      const o = mm.opts;
      x = o.x != null ? o.x : 540; y = o.y != null ? o.y : 10;
      size = o.width || o.size || 80;
    } else {
      x = minimapOrX || 540; y = timeOrY || 10; size = sizeArg || 80;
    }
    // Draw a simple minimap rectangle background
    __ops.push(['rectfill', x | 0, y | 0, size | 0, size | 0, colorFromHex(0x000000, 0.7)]);
    __ops.push(['rect', x | 0, y | 0, size | 0, size | 0, colorFromHex(0x888888)]);
    // Draw entities if available
    const entities = (mm && mm.opts.entities) || entitiesArg || [];
    const player = mm && mm.opts.player;
    const worldW = (mm && mm.opts.worldW) || 100;
    const worldH = (mm && mm.opts.worldH) || 100;
    const scale = size / Math.max(worldW, worldH);
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const ex = x + (e.x || 0) * scale; const ey = y + (e.y || 0) * scale;
      __ops.push(['rectfill', (ex - 1) | 0, (ey - 1) | 0, 3, 3, colorFromHex(e.color || 0xff4444)]);
    }
    if (player) {
      const px2 = x + (player.x || 0) * scale; const py2 = y + (player.y || 0) * scale;
      __ops.push(['rectfill', (px2 - 2) | 0, (py2 - 2) | 0, 4, 4, colorFromHex(0xffff00)]);
    }
  }
  function drawSkyGradient(topColor, bottomColor) {
    // Draw a vertical gradient as stacked rects
    const H = 360, W = 640, steps = 36;
    const stepH = H / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const { r: r1, g: g1, b: b1 } = _unpackColor(topColor || 0x112244);
      const { r: r2, g: g2, b: b2 } = _unpackColor(bottomColor || 0x000000);
      const cr = Math.round(r1 + (r2 - r1) * t);
      const cg = Math.round(g1 + (g2 - g1) * t);
      const cb = Math.round(b1 + (b2 - b1) * t);
      __ops.push(['rectfill', 0, (i * stepH) | 0, W, (stepH + 1) | 0, colorFromHex(rgba8(cr, cg, cb))]);
    }
  }
  function cls(color) {
    __ops.push(['cls', colorFromHex(color == null ? 0x000000 : color)]);
  }
  function novaPrint(text, x, y, color, scale) {
    const p = __tx(x, y);
    const sc = (typeof scale === 'number' ? scale : 1) * __mtxScale();
    __ops.push(['text', p[0] | 0, p[1] | 0,
      text == null ? '' : ('' + text),
      colorFromHex(color == null ? 0xffffff : color), sc]);
  }
  // Canonical browser signature: printCentered(text, cx, y, color, scale=1).
  function printCentered(text, cx, y, color, scale) {
    const s = text == null ? '' : ('' + text);
    const sc = typeof scale === 'number' ? scale : 1;
    // 6px per char * scale matches the browser font metric.
    const w = s.length * 6 * sc;
    novaPrint(s, (cx | 0) - (w / 2) | 0, y | 0, color, sc);
  }
  function printRight(text, rx, y, color, scale) {
    const s = text == null ? '' : ('' + text);
    const sc = typeof scale === 'number' ? scale : 1;
    const w = s.length * 6 * sc;
    novaPrint(s, (rx | 0) - w | 0, y | 0, color, sc);
  }
  function rect(x, y, w, h, color, filled) {
    const p = __tx(x, y);
    const ms = __mtxScale();
    __ops.push(['rect', p[0] | 0, p[1] | 0,
      Math.max(0, (w * ms) | 0), Math.max(0, (h * ms) | 0),
      colorFromHex(color == null ? 0xffffff : color),
      filled === true]);
  }
  function rectfill(x, y, w, h, color) {
    const p = __tx(x, y);
    const ms = __mtxScale();
    __ops.push(['rect', p[0] | 0, p[1] | 0,
      Math.max(0, (w * ms) | 0), Math.max(0, (h * ms) | 0),
      colorFromHex(color == null ? 0xffffff : color), true]);
  }
  function line(x0, y0, x1, y1, color) {
    const a = __tx(x0, y0), b = __tx(x1, y1);
    __ops.push(['line', a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0,
      colorFromHex(color == null ? 0xffffff : color)]);
  }
  function pixel(x, y, color) {
    const p = __tx(x, y);
    __ops.push(['pset', p[0] | 0, p[1] | 0,
      colorFromHex(color == null ? 0xffffff : color)]);
  }
  function circle(x, y, r, color, filled) {
    const p = __tx(x, y);
    const rr = Math.max(1, (r * __mtxScale()) | 0);
    __ops.push(['circle', p[0] | 0, p[1] | 0, rr,
      colorFromHex(color == null ? 0xffffff : color),
      filled === true]);
  }
  function circfill(x, y, r, color) {
    const p = __tx(x, y);
    const rr = Math.max(1, (r * __mtxScale()) | 0);
    __ops.push(['circle', p[0] | 0, p[1] | 0, rr,
      colorFromHex(color == null ? 0xffffff : color), true]);
  }
  function ellipse(x, y, rx, ry, color, filled) {
    // Approximate as average-radius circle. Real ellipse rasterisation
    // would need a polyline; cheap stand-in keeps generative-art alive.
    const r = Math.max(1, ((rx | 0) + (ry | 0)) >> 1);
    circle(x, y, r, color, filled !== false);
  }
  function arc(x, y, r, _a0, _a1, color) {
    circle(x, y, Math.max(1, r | 0), color, false);
  }
  function bezier(x0, y0, _cx, _cy, x1, y1, color) {
    line(x0, y0, x1, y1, color);
  }
  function pset(x, y, color) { pixel(x, y, color); }
  function drawRect(x, y, w, h, color, filled) { rect(x, y, w, h, color, filled); }
  // Canonical browser signature: drawPanel(x, y, w, h, opts={}).
  // Some carts also call drawPanel(x,y,w,h, fillColor, borderColor) — so
  // accept both shapes. Also handles panel objects from createPanel().
  function drawPanel(panelOrX, y, w, h, optsOrFill, border) {
    // If first arg is a panel object (from createPanel or ui.createPanel)
    if (typeof panelOrX === 'object' && panelOrX !== null && 'x' in panelOrX && 'w' in panelOrX) {
      const p = panelOrX;
      // Shadow (offset dark rect behind)
      if (p.shadow) {
        rectfill(p.x + 4, p.y + 4, p.w, p.h, 0x000000);
      }
      // Fill (gradient or solid)
      if (p.gradient && p.gradientColor != null) {
        drawGradient(p.x, p.y, p.w, p.h, p.bgColor, p.gradientColor);
      } else {
        rectfill(p.x, p.y, p.w, p.h, p.bgColor != null ? p.bgColor : 0x101822);
      }
      // Border
      rect(p.x, p.y, p.w, p.h, p.borderColor != null ? p.borderColor : 0x6699cc, false);
      return;
    }
    // Simple signature: drawPanel(x, y, w, h, fill, border) or drawPanel(x, y, w, h, opts)
    let fill = 0x101822, brd = 0x6699cc;
    if (typeof optsOrFill === 'object' && optsOrFill !== null) {
      if (optsOrFill.fill != null) fill = optsOrFill.fill;
      if (optsOrFill.background != null) fill = optsOrFill.background;
      if (optsOrFill.border != null) brd = optsOrFill.border;
    } else if (typeof optsOrFill === 'number') {
      fill = optsOrFill;
      if (typeof border === 'number') brd = border;
    }
    rectfill(panelOrX, y, w, h, fill);
    rect(panelOrX, y, w, h, brd, false);
  }
  // Canonical browser signature:
  //   drawGlowText(text, x, y, color, glowColor, scale=1)
  //   drawGlowTextCentered(text, cx, y, color, glowColor, scale=1)
  function drawGlowText(text, x, y, color, glowColor, scale) {
    const sc = typeof scale === 'number' ? scale : 1;
    const g = glowColor == null ? 0x404060 : glowColor;
    const offsets = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    for (let i = 0; i < offsets.length; i++) {
      novaPrint(text, x + offsets[i][0], y + offsets[i][1], g, sc);
    }
    novaPrint(text, x, y, color == null ? 0xffffff : color, sc);
  }
  function drawGlowTextCentered(text, cx, y, color, glowColor, scale) {
    const s = text == null ? '' : ('' + text);
    const sc = typeof scale === 'number' ? scale : 1;
    const w = s.length * 6 * sc;
    drawGlowText(s, (cx | 0) - (w / 2) | 0, y | 0, color, glowColor, sc);
  }
  // Canonical: drawRadialGradient(cx, cy, radius, innerColor, outerColor)
  // Cheap approximation: concentric filled rings stepping inner→outer.
  function drawRadialGradient(cx, cy, radius, innerColor, outerColor) {
    const inner = colorFromHex(innerColor == null ? 0xffffff : innerColor);
    const outer = colorFromHex(outerColor == null ? 0x000000 : outerColor);
    const STEPS = 8;
    for (let i = STEPS; i >= 1; i--) {
      const t = i / STEPS;
      const r = Math.max(1, (radius * t) | 0);
      const col = [
        outer[0] + (inner[0] - outer[0]) * (1 - t),
        outer[1] + (inner[1] - outer[1]) * (1 - t),
        outer[2] + (inner[2] - outer[2]) * (1 - t),
        outer[3] + (inner[3] - outer[3]) * (1 - t),
      ];
      const p = __tx(cx, cy);
      __ops.push(['circle', p[0] | 0, p[1] | 0, r, col, true]);
    }
  }
  function drawGradient(x, y, w, h, top, bottom) {
    // Use native gradient op for smooth vertical gradient
    const t = colorFromHex(top == null ? 0xffffff : top);
    const b = colorFromHex(bottom == null ? 0x000000 : bottom);
    const p = __tx(x, y);
    const ms = __mtxScale();
    __ops.push(['gradient', p[0] | 0, p[1] | 0,
      Math.max(0, (w * ms) | 0), Math.max(0, (h * ms) | 0), t, b]);
  }
  function drawProgressBar(x, y, w, h, value, color, bgColor) {
    const v = Math.max(0, Math.min(1, value || 0));
    rectfill(x, y, w, h, bgColor == null ? 0x202028 : bgColor);
    rectfill(x, y, (w * v) | 0, h, color == null ? 0x60c0ff : color);
    rect(x, y, w, h, 0x404048, false);
  }
  function drawHealthBar(x, y, w, h, value, max) {
    const v = max > 0 ? value / max : 0;
    drawProgressBar(x, y, w, h, v,
      v > 0.5 ? 0x60ff60 : v > 0.25 ? 0xffd040 : 0xff4040, 0x301818);
  }
  function drawPixelBorder(x, y, w, h, color) {
    rect(x, y, w, h, color == null ? 0xffffff : color, false);
  }
  function drawCrosshair(x, y, size, color) {
    const s = size | 0;
    const c = color == null ? 0xffffff : color;
    line(x - s, y, x + s, y, c);
    line(x, y - s, x, y + s, c);
  }
  function drawScanlines(_alpha, _spacing) { /* host postFX handles this */ }
  function drawNoise(_alpha) { /* expensive in shim; skip */ }
  function drawTriangle(x0, y0, x1, y1, x2, y2, color, filled) {
    // Use native triangle op for filled triangles
    const p0 = __tx(x0, y0), p1 = __tx(x1, y1), p2 = __tx(x2, y2);
    const c = colorFromHex(color == null ? 0xffffff : color);
    __ops.push(['triangle', p0[0] | 0, p0[1] | 0, p1[0] | 0, p1[1] | 0,
      p2[0] | 0, p2[1] | 0, c, filled !== false]);
  }
  function drawDiamond(cx, cy, size, color, filled) {
    const s = size | 0;
    const c = color == null ? 0xffffff : color;
    const f = filled !== false;
    drawTriangle(cx, cy - s, cx + s, cy, cx, cy, c, f);
    drawTriangle(cx + s, cy, cx, cy + s, cx, cy, c, f);
    drawTriangle(cx, cy + s, cx - s, cy, cx, cy, c, f);
    drawTriangle(cx - s, cy, cx, cy - s, cx, cy, c, f);
  }
  function drawStarburst(cx, cy, n, r0, r1, color) {
    n = n | 0; if (n < 3) n = 3;
    const c = color == null ? 0xffffff : color;
    let prevX = cx + r1, prevY = cy;
    for (let i = 1; i <= n * 2; i++) {
      const ang = (i / (n * 2)) * Math.PI * 2;
      const rr = (i & 1) ? r0 : r1;
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr;
      line(prevX, prevY, x, y, c);
      prevX = x; prevY = y;
    }
  }
  function poly(points, color, _filled) {
    if (!Array.isArray(points) || points.length < 4) return;
    const c = color == null ? 0xffffff : color;
    for (let i = 0; i < points.length; i += 2) {
      const j = (i + 2) % points.length;
      line(points[i], points[i + 1], points[j], points[j + 1], c);
    }
  }
  function flowField(_w, _h, _scale) {
    return { sample(x, y) { return noise(x * 0.01, y * 0.01) * Math.PI * 2; } };
  }

  function screenWidth() { return 640; }
  function screenHeight() { return 360; }

  // ---------------- input ------------------------------------------------
  // Web-parity surface: every fn in runtime/input.js exposeTo() ends up here
  // with matching semantics. The bridge polls the actual Godot Input
  // singleton once per frame; everything else (just-pressed deltas,
  // KEYMAP[0..15] lookup, single-char key normalization) is handled
  // client-side so cart code that ports from the browser sees identical
  // results.
  //
  // KEYMAP — mirrors runtime/input.js verbatim so btn(i)/btnp(i) behave
  // the same on both backends.
  const KEYMAP = {
    0: 'ArrowLeft', 1: 'ArrowRight', 2: 'ArrowUp', 3: 'ArrowDown',
    4: 'KeyZ',  5: 'KeyX',  6: 'KeyC',  7: 'KeyV',
    8: 'KeyA',  9: 'KeyS', 10: 'KeyQ', 11: 'KeyW',
    12: 'Enter', 13: 'Space',
  };

  let inputState = {
    left: false, right: false, up: false, down: false,
    action: false, cancel: false,
    axisX: 0, axisY: 0,
    mouseX: 0, mouseY: 0, mouseDown: false,
    keys: [],
    gpConnected: false,
    gpLeftX: 0, gpLeftY: 0, gpRightX: 0, gpRightY: 0,
    gpButtons: [],
  };

  // Tracked client-side so we can compute keyp/btnp/mousePressed correctly
  // even though the bridge call is stateless.
  let keysHeld = Object.create(null);
  let keysPrev = Object.create(null);
  let gpHeld   = Object.create(null);
  let gpPrev   = Object.create(null);
  let inputPrevState = inputState;
  let mouseDownPrev = false;
  let mousePressedFlag = false;
  let _lastPollFrame = -1;
  let _frameTick = 0;

  function _toBoolMap(arr) {
    const m = Object.create(null);
    if (Array.isArray(arr)) {
      for (let i = 0; i < arr.length; i++) m[arr[i]] = true;
    }
    return m;
  }

  function pollInput() {
    // Snapshot prev-state once per host frame (cart_update + cart_draw both
    // call into input fns; we want a single delta per frame).
    if (_lastPollFrame !== _frameTick) {
      keysPrev = keysHeld;
      gpPrev = gpHeld;
      inputPrevState = inputState;
      mouseDownPrev = !!inputState.mouseDown;
      _lastPollFrame = _frameTick;
    }
    const r = call('input.poll', {});
    if (r) {
      inputState = r;
      keysHeld = _toBoolMap(r.keys);
      gpHeld = _toBoolMap(r.gpButtons);
      // Edge-trigger mousePressed (true for one frame after a press).
      if (!!r.mouseDown && !mouseDownPrev) mousePressedFlag = true;
    }
    return inputState;
  }

  // Called by the host once per frame to advance our "previous frame"
  // window — see Nova64Host::cart_update glue.
  function _inputStep() {
    _frameTick++;
    mousePressedFlag = false;
  }

  function _normKey(code) {
    if (code === ' ') return 'Space';
    if (typeof code !== 'string') return '';
    if (code.length === 1) return 'Key' + code.toUpperCase();
    return code;
  }

  function key(code) {
    pollInput();
    return !!keysHeld[code];
  }
  function keyp(code) {
    pollInput();
    return !!keysHeld[code] && !keysPrev[code];
  }
  function isKeyDown(code) {
    pollInput();
    return !!keysHeld[_normKey(code)];
  }
  function isKeyPressed(code) {
    pollInput();
    const k = _normKey(code);
    return !!keysHeld[k] && !keysPrev[k];
  }
  function btn(i) {
    pollInput();
    const index = i | 0;
    const code = KEYMAP[index] || '';
    if (index === 0) return !!inputState.left  || !!keysHeld[code] || !!gpHeld[index];
    if (index === 1) return !!inputState.right || !!keysHeld[code] || !!gpHeld[index];
    if (index === 2) return !!inputState.up    || !!keysHeld[code] || !!gpHeld[index];
    if (index === 3) return !!inputState.down  || !!keysHeld[code] || !!gpHeld[index];
    return !!keysHeld[code] || !!gpHeld[index];
  }
  function btnp(i) {
    pollInput();
    const index = i | 0;
    const code = KEYMAP[index] || '';
    const keyJust = !!keysHeld[code] && !keysPrev[code];
    const padJust = !!gpHeld[index] && !gpPrev[index];
    if (index === 0) return keyJust || padJust || (!!inputState.left  && !inputPrevState.left);
    if (index === 1) return keyJust || padJust || (!!inputState.right && !inputPrevState.right);
    if (index === 2) return keyJust || padJust || (!!inputState.up    && !inputPrevState.up);
    if (index === 3) return keyJust || padJust || (!!inputState.down  && !inputPrevState.down);
    return keyJust || padJust;
  }
  function mouseX() { pollInput(); return inputState.mouseX | 0; }
  function mouseY() { pollInput(); return inputState.mouseY | 0; }
  function mouseDown() { pollInput(); return !!inputState.mouseDown; }
  function mousePressed() {
    pollInput();
    return mousePressedFlag || (!!inputState.mouseDown && !mouseDownPrev);
  }
  function gamepadAxis(name) {
    pollInput();
    switch (name) {
      case 'leftX':  return +inputState.gpLeftX  || 0;
      case 'leftY':  return +inputState.gpLeftY  || 0;
      case 'rightX': return +inputState.gpRightX || 0;
      case 'rightY': return +inputState.gpRightY || 0;
      default: return 0;
    }
  }
  function gamepadConnected() { pollInput(); return !!inputState.gpConnected; }
  function leftStickX()  { return gamepadAxis('leftX'); }
  function leftStickY()  { return gamepadAxis('leftY'); }
  function rightStickX() { return gamepadAxis('rightX'); }
  function rightStickY() { return gamepadAxis('rightY'); }

  // ---------------- effects (mapped to Godot WorldEnvironment) ---------
  let effectsEnabled = false;
  function enablePixelation(_n) { warnOnce('enablePixelation'); /* TODO: SubViewport */ }
  function enableDithering(_b) { warnOnce('enableDithering'); }
  function enableBloom(strengthOrEnabled, radius, threshold) {
    ensureInit();
    const enabled = strengthOrEnabled !== false;
    const strength = typeof strengthOrEnabled === 'number' ? strengthOrEnabled : 0.8;
    effectsEnabled = effectsEnabled || enabled;
    call('env.set', {
      glow: enabled,
      glowIntensity: strength,
      glowStrength: typeof radius === 'number' ? Math.max(0.1, radius * 2.0) : 1.2,
      glowBloom: typeof threshold === 'number' ? Math.max(0.0, threshold) : 0.2,
      glowThreshold: typeof threshold === 'number' ? Math.max(0.0, threshold * 0.6) : 0.25,
    });
    return enabled;
  }
  function setBloomStrength(v) {
    ensureInit();
    effectsEnabled = true;
    const strength = typeof v === 'number' ? v : 1.0;
    call('env.set', { glow: true, glowIntensity: strength, glowStrength: Math.max(0.4, strength) });
    return true;
  }
  function enableFXAA(_b) { effectsEnabled = true; return true; }
  function enableChromaticAberration(amount) {
    ensureInit();
    effectsEnabled = true;
    const a = typeof amount === 'number' ? Math.max(0, Math.min(1, amount * 100)) : 0.2;
    call('env.set', { contrast: 1.0 + a * 0.08, saturation: 1.0 + a * 0.12 });
    return true;
  }
  function enableVignette(amount, _hardness) {
    ensureInit();
    // Vignette via adjustment darkening — not a real radial vignette but a
    // close enough cheap stand-in.
    const a = typeof amount === 'number' ? Math.max(0, Math.min(1, amount)) : 0.3;
    effectsEnabled = true;
    call('env.set', { brightness: 1.0 - a * 0.4, contrast: 1.0 + a * 0.2 });
    return true;
  }
  function setN64Mode(b) {
    // Punchy color, low-saturation glow for that warm CRT look.
    ensureInit();
    if (b === false) {
      call('env.set', { glow: true, glowIntensity: 0.8, contrast: 1.05, saturation: 1.05, brightness: 1.0 });
      return;
    }
    call('env.set', {
      glow: true, glowIntensity: 0.6, glowStrength: 1.2, glowBloom: 0.15,
      tonemap: 'filmic', exposure: 1.05,
      contrast: 1.15, saturation: 1.25, brightness: 1.02,
    });
  }
  function setPSXMode(b) {
    // Lower brightness, slightly desaturated, harder contrast.
    ensureInit();
    if (b === false) {
      call('env.set', { glow: true, glowIntensity: 0.8, contrast: 1.05, saturation: 1.05, brightness: 1.0 });
      return;
    }
    call('env.set', {
      glow: false,
      tonemap: 'linear', exposure: 0.95,
      contrast: 1.2, saturation: 0.85, brightness: 0.95,
    });
  }
  function enableRetroEffects(b) { setN64Mode(b !== false); }
  function isEffectsEnabled() { return effectsEnabled; }

  function enableSSR(b) {
    ensureInit();
    call('env.set', { ssr: b !== false });
  }
  function enableSSAO(b, intensity) {
    ensureInit();
    call('env.set', {
      ssao: b !== false,
      ssaoIntensity: typeof intensity === 'number' ? intensity : 1.0,
    });
  }
  function enableVolumetricFog(b, density) {
    ensureInit();
    call('env.set', {
      volumetricFog: b !== false,
      volumetricFogDensity: typeof density === 'number' ? density : 0.05,
    });
  }
  function enableDOF(_b) {
    // CameraAttributes-based DOF is Phase 3 — soft no-op for now.
    warnOnce('enableDOF');
  }
  function setExposure(v) {
    ensureInit();
    call('env.set', { exposure: typeof v === 'number' ? v : 1.0 });
  }
  function setTonemap(name) {
    ensureInit();
    call('env.set', { tonemap: typeof name === 'string' ? name : 'filmic' });
  }
  function setColorAdjustment(brightness, contrast, saturation) {
    ensureInit();
    call('env.set', {
      brightness: typeof brightness === 'number' ? brightness : 1.0,
      contrast: typeof contrast === 'number' ? contrast : 1.0,
      saturation: typeof saturation === 'number' ? saturation : 1.0,
    });
  }

  // ---------------- stats / util / audio / tween (no-op stubs) ---------
  function get3DStats() {
    return { meshes: 0, lights: 0, drawCalls: 0, backend: 'godot-quickjs' };
  }
  function clearFog() {
    ensureInit();
    call('env.set', { fog: false });
  }
  function getPosition(handle) {
    if (handle && typeof handle === 'object' && handle.position) {
      const p = handle.position;
      return [p.x != null ? p.x : (p[0] || 0), p.y != null ? p.y : (p[1] || 0), p.z != null ? p.z : (p[2] || 0)];
    }
    return [0, 0, 0];
  }
  function moveMesh(handle, dx, dy, dz) {
    if (!handle) return;
    const cur = getPosition(handle);
    setPosition(handle, cur[0] + (dx || 0), cur[1] + (dy || 0), cur[2] + (dz || 0));
  }
  function setMeshVisible(handle, visible) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('transform.set', { handle: h, visible: !!visible });
    if (handle && typeof handle === 'object') handle.visible = !!visible;
  }
  function createAdvancedSphere(radiusOrOpts, optsOrPos, maybePos, _segments) {
    ensureInit();
    let radius = 0.5, opts = {}, pos = maybePos;
    if (typeof radiusOrOpts === 'number') {
      radius = radiusOrOpts;
      if (optsOrPos && typeof optsOrPos === 'object' && !Array.isArray(optsOrPos)) {
        opts = optsOrPos; pos = maybePos;
      } else { pos = optsOrPos; }
    } else if (radiusOrOpts && typeof radiusOrOpts === 'object') {
      opts = radiusOrOpts; pos = optsOrPos;
    }
    const r = typeof radius === 'number' ? radius : 0.5;
    const geomR = call('geometry.createSphere', { radius: r, height: r * 2 });
    return geomR ? spawnMesh(geomR.handle, opts.color, pos, Object.assign({ metallic: 0.1, roughness: 0.5 }, opts)) : 0;
  }
  function createCapsule(radius, height, color, pos, opts) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.3;
    const h = typeof height === 'number' ? height : 1;
    // Godot doesn't have capsule geometry in the current bridge — use cylinder as stand-in
    const geom = call('geometry.createCylinder', { topRadius: r, bottomRadius: r, height: h, sides: 16 });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  const TWO_PI = Math.PI * 2;
  const HALF_PI = Math.PI / 2;
  const QUARTER_PI = Math.PI / 4;
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // hsb(h:0..360, s:0..1, b:0..1, a:0..255) → packed rgba8 int. Mirrors
  // runtime/api-generative.js so generative-art / boids produce the same
  // colors on the Godot adapter as in the browser. Cart code that passes
  // s/b in 0..100 (technically out-of-spec) gets the same saturated /
  // wrapped colors the browser produces from the identical math.
  function hsb(h, s, b, a) {
    if (s == null) s = 1;
    if (b == null) b = 1;
    if (a == null) a = 255;
    h = ((((h || 0) % 360) + 360) % 360);
    const c = b * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    let r, g, bl;
    if (h < 60)       { r = c; g = x; bl = 0; }
    else if (h < 120) { r = x; g = c; bl = 0; }
    else if (h < 180) { r = 0; g = c; bl = x; }
    else if (h < 240) { r = 0; g = x; bl = c; }
    else if (h < 300) { r = x; g = 0; bl = c; }
    else              { r = c; g = 0; bl = x; }
    return rgba8((r + m) * 255, (g + m) * 255, (bl + m) * 255, a);
  }

  // ─── Perlin noise (canonical port from runtime/api-generative.js) ────────
  // Real Perlin is essential for FLOW FIELD, PERLIN LANDSCAPE, FRACTAL TREE
  // etc. — the previous sin-hash stand-in produced no spatial coherence,
  // so flow fields and landscapes rendered as TV static.
  const _perm = new Uint8Array(512);
  let _noiseOctaves = 4;
  let _noiseFalloff = 0.5;
  const _grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ];
  function _initPerm(seed) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let st = seed | 0;
    for (let i = 255; i > 0; i--) {
      st = (st * 1664525 + 1013904223) & 0x7fffffff;
      const j = st % (i + 1);
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) _perm[i] = p[i & 255];
  }
  _initPerm(0);
  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _plerp(a, b, t) { return a + (b - a) * t; }
  function _perlin3(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);
    const u = _fade(xf), v = _fade(yf), w = _fade(zf);
    const A = _perm[X] + Y;
    const AA = _perm[A] + Z;
    const AB = _perm[A + 1] + Z;
    const B = _perm[X + 1] + Y;
    const BA = _perm[B] + Z;
    const BB = _perm[B + 1] + Z;
    function g(hash, dx, dy, dz) {
      const gr = _grad3[hash % 12];
      return gr[0] * dx + gr[1] * dy + gr[2] * dz;
    }
    return _plerp(
      _plerp(
        _plerp(g(_perm[AA], xf, yf, zf), g(_perm[BA], xf - 1, yf, zf), u),
        _plerp(g(_perm[AB], xf, yf - 1, zf), g(_perm[BB], xf - 1, yf - 1, zf), u),
        v
      ),
      _plerp(
        _plerp(g(_perm[AA + 1], xf, yf, zf - 1), g(_perm[BA + 1], xf - 1, yf, zf - 1), u),
        _plerp(g(_perm[AB + 1], xf, yf - 1, zf - 1), g(_perm[BB + 1], xf - 1, yf - 1, zf - 1), u),
        v
      ),
      w
    );
  }
  function noise(x, y, z) {
    if (y == null) y = 0;
    if (z == null) z = 0;
    let total = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < _noiseOctaves; i++) {
      total += _perlin3(x * freq, y * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= _noiseFalloff;
      freq *= 2;
    }
    return (total / maxAmp + 1) * 0.5;
  }
  function noiseSeed(seed) { _initPerm(seed); }
  function noiseDetail(octaves, falloff) {
    _noiseOctaves = Math.max(1, Math.min(8, octaves == null ? 4 : octaves));
    _noiseFalloff = Math.max(0, Math.min(1, falloff == null ? 0.5 : falloff));
  }
  function noiseMap(w, h, scale, ox, oy) {
    if (scale == null) scale = 0.02;
    if (ox == null) ox = 0;
    if (oy == null) oy = 0;
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      out[y * w + x] = noise((x + ox) * scale, (y + oy) * scale);
    }
    return out;
  }
  function fbmNoise(x, y, z, octaves, persistence, lacunarity, scale) {
    octaves = octaves == null ? 4 : octaves;
    persistence = persistence == null ? 0.5 : persistence;
    lacunarity = lacunarity == null ? 2.0 : lacunarity;
    scale = scale == null ? 0.01 : scale;
    let total = 0, amplitude = 1, frequency = scale, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += _perlin3((x || 0) * frequency, (y || 0) * frequency, (z || 0) * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return maxValue > 0 ? (total / maxValue + 1) * 0.5 : 0.5;
  }

  const utilNs = { TWO_PI, HALF_PI, QUARTER_PI, clamp, lerp, hsb, noise, noiseSeed, noiseDetail, noiseMap };

  // Audio stubs — no host audio yet.
  function sfx(_name, _vol) { warnOnce('audio.sfx'); }
  function playMusic(_name, _vol, _loop) { warnOnce('audio.playMusic'); }
  function stopMusic() { warnOnce('audio.stopMusic'); }
  const audioNs = { sfx, playMusic, stopMusic };

  // ── Easing library (full parity with runtime/tween.js Ease object) ──────────
  const Ease = (function () {
    function outBounce(t) {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75; }
      if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375; }
      t -= 2.625 / d; return n * t * t + 0.984375;
    }
    return {
      linear: function (t) { return t; },
      // Quad
      inQuad: function (t) { return t * t; },
      outQuad: function (t) { return t * (2 - t); },
      inOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
      // Cubic
      inCubic: function (t) { return t * t * t; },
      outCubic: function (t) { return --t * t * t + 1; },
      inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
      // Quart
      inQuart: function (t) { return t * t * t * t; },
      outQuart: function (t) { return 1 - --t * t * t * t; },
      inOutQuart: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t; },
      // Sine
      inSine: function (t) { return 1 - Math.cos(t * Math.PI / 2); },
      outSine: function (t) { return Math.sin(t * Math.PI / 2); },
      inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
      // Expo
      inExpo: function (t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
      outExpo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
      // Elastic
      outElastic: function (t) {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      },
      inElastic: function (t) {
        if (t === 0 || t === 1) return t;
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3);
      },
      // Back
      outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * --t * t * t + c * t * t; },
      inBack: function (t) { var c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
      // Bounce
      outBounce: outBounce,
      inBounce: function (t) { return 1 - outBounce(1 - t); },
      inOutBounce: function (t) { return t < 0.5 ? (1 - outBounce(1 - 2 * t)) / 2 : (1 + outBounce(2 * t - 1)) / 2; },
      // Aliases used by hype.js-style strings ('easeOutCubic' etc.)
      easeLinear: function (t) { return t; },
      easeIn: function (t) { return t * t; },
      easeOut: function (t) { return t * (2 - t); },
      easeInOut: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
      easeInQuad: function (t) { return t * t; },
      easeOutQuad: function (t) { return t * (2 - t); },
      easeInOutQuad: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
      easeInCubic: function (t) { return t * t * t; },
      easeOutCubic: function (t) { return --t * t * t + 1; },
      easeInOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1; },
      easeInSine: function (t) { return 1 - Math.cos(t * Math.PI / 2); },
      easeOutSine: function (t) { return Math.sin(t * Math.PI / 2); },
      easeInOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
      easeInExpo: function (t) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
      easeOutExpo: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
      easeOutBack: function (t) { var c = 1.70158; return 1 + (c + 1) * --t * t * t + c * t * t; },
      easeInBack: function (t) { var c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
      easeOutBounce: outBounce,
      easeInBounce: function (t) { return 1 - outBounce(1 - t); },
      easeOutElastic: function (t) {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      },
    };
  }());

  // ── Real tween engine ─────────────────────────────────────────────────────────
  // Supports both hype-style { from, to, duration } and nova-style (target, toProps, dur, opts)
  var _activeTweens = [];
  function _resolveEaseFn(e) {
    if (typeof e === 'function') return e;
    if (typeof e === 'string' && Ease[e]) return Ease[e];
    return Ease.linear;
  }
  function createTween(arg1, arg2, arg3, arg4) {
    // ── Hype style: createTween({ from, to, duration, ease, ... }) ──
    if (arg1 !== null && typeof arg1 === 'object' && arg2 === undefined &&
        ('from' in arg1 || 'to' in arg1 || 'duration' in arg1)) {
      var o = arg1;
      var fromV = o.from != null ? o.from : 0;
      var toV   = o.to   != null ? o.to   : 1;
      var dur   = o.duration || 1;
      var easeFn = _resolveEaseFn(o.ease);
      var loop = o.loop === true || o.loop === 'loop';
      var pingpong = o.loop === 'pingpong' || o.yoyo === true;
      var elapsed = 0, playing = o.autoPlay !== false, dir = 1;
      var isArr = Array.isArray(fromV);
      var fromArr = isArr ? fromV : [fromV];
      var toArr   = isArr ? toV   : [toV];
      var vals = fromArr.slice();
      var tween = {
        get value() { return isArr ? vals : vals[0]; },
        get values() { return vals; },
        get progress() { return Math.min(1, elapsed / dur); },
        get done() { return !playing && elapsed >= dur; },
        tick: function (dt) {
          if (!playing) return;
          elapsed += dt * dir;
          var p = Math.max(0, Math.min(1, elapsed / dur));
          var ep = easeFn(p);
          for (var i = 0; i < vals.length; i++) vals[i] = fromArr[i] + (toArr[i] - fromArr[i]) * ep;
          if (o.onUpdate) o.onUpdate(isArr ? vals : vals[0], p);
          if (elapsed >= dur) {
            if (pingpong) { dir = -dir; elapsed = dir > 0 ? 0 : dur; }
            else if (loop) { elapsed = 0; }
            else { playing = false; elapsed = dur; if (o.onComplete) o.onComplete(); }
          } else if (elapsed <= 0 && pingpong) {
            dir = 1; elapsed = 0;
          }
        },
        play:    function () { playing = true;  return tween; },
        pause:   function () { playing = false; return tween; },
        stop:    function () { playing = false; return tween; },
        restart: function () { elapsed = 0; dir = 1; playing = true; return tween; },
        kill:    function () { playing = false; elapsed = dur; return tween; },
        register:   function () { _activeTweens.push(tween); return tween; },
        unregister: function () {
          var i = _activeTweens.indexOf(tween);
          if (i >= 0) _activeTweens.splice(i, 1);
          return tween;
        },
      };
      return tween;
    }
    // ── Nova style: createTween(target, toProps, duration, opts) ──
    var target = arg1, toProps = arg2, duration = arg3 || 1, opts = arg4 || {};
    if (!target || !toProps) {
      var noop2 = { value: 0, values: [], progress: 0, done: true,
        tick: function () {}, play: function () { return noop2; }, pause: function () { return noop2; },
        stop: function () { return noop2; }, restart: function () { return noop2; },
        kill: function () { return noop2; }, register: function () { return noop2; }, unregister: function () { return noop2; } };
      return noop2;
    }
    var keys = Object.keys(toProps);
    var fromVals = {}, toVals = {};
    for (var ki = 0; ki < keys.length; ki++) {
      fromVals[keys[ki]] = target[keys[ki]] != null ? target[keys[ki]] : 0;
      toVals[keys[ki]] = toProps[keys[ki]];
    }
    var easeFn2 = _resolveEaseFn(opts.ease);
    var loop2 = opts.loop === true || opts.loop === 'loop';
    var pp2 = opts.loop === 'pingpong' || opts.yoyo;
    var delay2 = opts.delay || 0;
    var elapsed2 = 0, delayRemain = delay2, playing2 = true, dir2 = 1;
    var novaTween = {
      value: undefined, values: [],
      get progress() { return Math.max(0, Math.min(1, elapsed2 / (duration || 1))); },
      get done() { return !playing2 && elapsed2 >= duration; },
      tick: function (dt) {
        if (!playing2) return;
        if (delayRemain > 0) { delayRemain -= dt; return; }
        elapsed2 += dt * dir2;
        var p = Math.max(0, Math.min(1, elapsed2 / (duration || 1)));
        var ep = easeFn2(p);
        for (var ki2 = 0; ki2 < keys.length; ki2++) {
          target[keys[ki2]] = fromVals[keys[ki2]] + (toVals[keys[ki2]] - fromVals[keys[ki2]]) * ep;
        }
        if (opts.onUpdate) opts.onUpdate(target, p);
        if (elapsed2 >= duration) {
          if (pp2) { dir2 = -1; elapsed2 = duration; }
          else if (loop2) { elapsed2 = 0; }
          else { playing2 = false; elapsed2 = duration; if (opts.onComplete) opts.onComplete(target); }
        } else if (elapsed2 <= 0 && pp2) { dir2 = 1; elapsed2 = 0; }
      },
      play:    function () { playing2 = true;  return novaTween; },
      pause:   function () { playing2 = false; return novaTween; },
      stop:    function () { playing2 = false; return novaTween; },
      restart: function () { elapsed2 = 0; dir2 = 1; delayRemain = delay2; playing2 = true; return novaTween; },
      kill:    function () {
        playing2 = false;
        var idx = _activeTweens.indexOf(novaTween);
        if (idx >= 0) _activeTweens.splice(idx, 1);
        return novaTween;
      },
      register:   function () { _activeTweens.push(novaTween); return novaTween; },
      unregister: function () {
        var idx = _activeTweens.indexOf(novaTween);
        if (idx >= 0) _activeTweens.splice(idx, 1);
        return novaTween;
      },
    };
    if (opts.autoReg !== false) _activeTweens.push(novaTween);
    return novaTween;
  }
  function updateTweens(dt) {
    for (var i = 0; i < _activeTweens.length; i++) _activeTweens[i].tick(dt);
    // prune done tweens
    for (var j = _activeTweens.length - 1; j >= 0; j--) {
      if (_activeTweens[j].done) _activeTweens.splice(j, 1);
    }
  }
  function killAllTweens() { _activeTweens.length = 0; }
  const tweenNs = { createTween, updateTweens, killAllTweens, Ease };

  // ---------------- broader cart compat stubs --------------------------
  // Most of these return inert objects whose methods chain to themselves
  // (or no-ops), and whose getters return safe defaults. The goal is to
  // let carts that touch these APIs *boot* and tick cleanly under the
  // headless harness — visual fidelity for these features remains a TODO.

  function noopReturnSelf() { return this; }
  function makeStub(extra) {
    const s = Object.assign({
      handle: 0,
      x: 0, y: 0, z: 0, w: 0, h: 0,
      width: 0, height: 0,
      value: 0, alpha: 1, visible: true,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: null,
      mesh: null,
      length: 0,
      setPosition() { return s; },
      setRotation() { return s; },
      setScale() { return s; },
      setColor() { return s; },
      setText() { return s; },
      setVisible() { return s; },
      setAlpha() { return s; },
      setSize() { return s; },
      setStyle() { return s; },
      setOpacity() { return s; },
      setIntensity() { return s; },
      onClick() { return s; },
      onChange() { return s; },
      onUpdate() { return s; },
      addChild() { return s; },
      removeChild() { return s; },
      remove() { return s; },
      destroy() { return s; },
      update() { return s; },
      draw() { return s; },
      tick() { return s; },
      start() { return s; },
      stop() { return s; },
      play() { return s; },
      pause() { return s; },
      reset() { return s; },
      emit() { return s; },
      show() { return s; },
      hide() { return s; },
      // Canvas2D-ish surface methods so carts that get a "ctx" can render
      // without throwing on unknown gradient / path / text APIs.
      createLinearGradient() { return makeStub({ addColorStop() {} }); },
      createRadialGradient() { return makeStub({ addColorStop() {} }); },
      createPattern() { return makeStub(); },
      addColorStop() {},
      beginPath() { return s; },
      closePath() { return s; },
      moveTo() { return s; },
      lineTo() { return s; },
      arc() { return s; },
      arcTo() { return s; },
      bezierCurveTo() { return s; },
      quadraticCurveTo() { return s; },
      rect() { return s; },
      fill() { return s; },
      stroke() { return s; },
      fillRect() { return s; },
      strokeRect() { return s; },
      clearRect() { return s; },
      fillText() { return s; },
      strokeText() { return s; },
      measureText() { return { width: 0 }; },
      save() { return s; },
      restore() { return s; },
      translate() { return s; },
      scaleCtx() { return s; },
      rotate() { return s; },
      transform() { return s; },
      setTransform() { return s; },
      resetTransform() { return s; },
      drawImage() { return s; },
      clip() { return s; },
      // Style-ish properties carts assign to (writes are silently dropped
      // by the proxy below, but assignment to a real property is fine too).
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '10px sans',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      // Make stubs iterable (empty) so `for (const x of someStub) { ... }`
      // and `[...someStub]` don't throw "value is not iterable".
      [Symbol.iterator]: function* () { /* yields nothing */ },
    }, extra || {});
    // Wrap in a Proxy so unknown method calls / property reads return safe
    // stubs instead of throwing. Property writes pass through normally.
    const proxy = new Proxy(s, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop === 'symbol') return undefined;
        // Unknown properties: synthesise a self-chaining no-op function that
        // returns the Proxy itself (so further unknown access keeps chaining)
        // and also coerces to 0 / "" / false in numeric / string / boolean ctx.
        const fn = function () { return proxy; };
        fn[Symbol.toPrimitive] = function (hint) {
          if (hint === 'number') return 0;
          if (hint === 'string') return '';
          return false;
        };
        // Cache on the target so repeated reads return the same identity.
        target[prop] = fn;
        return fn;
      },
    });
    return proxy;
  }

  // UI / canvas-ui — real button/panel implementation for Godot parity
  const __uiButtons = [];
  let __uiButtonIdCounter = 0;

  function clearButtons() {
    __uiButtons.length = 0;
  }

  function createButton(x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const btn = {
      id: ++__uiButtonIdCounter,
      x: x | 0, y: y | 0, w: w | 0, h: h | 0,
      label: label || '',
      onClick: typeof onClick === 'function' ? onClick : function () {},
      normalColor: opts.normalColor != null ? opts.normalColor : 0x4a90e2,
      hoverColor: opts.hoverColor != null ? opts.hoverColor : 0x6aa8f2,
      pressedColor: opts.pressedColor != null ? opts.pressedColor : 0x3a70c2,
      textColor: opts.textColor != null ? opts.textColor : 0xffffff,
      borderColor: opts.borderColor != null ? opts.borderColor : 0xffffff,
      hovered: false,
      pressed: false,
    };
    __uiButtons.push(btn);
    return btn;
  }

  function updateAllButtons() {
    const mx = mouseX(), my = mouseY();
    const down = mouseDown();
    const wasPressed = mousePressed();
    let anyClicked = false;

    for (let i = 0; i < __uiButtons.length; i++) {
      const btn = __uiButtons[i];
      const inside = mx >= btn.x && mx < btn.x + btn.w &&
                     my >= btn.y && my < btn.y + btn.h;
      btn.hovered = inside;
      btn.pressed = inside && down;

      if (inside && wasPressed) {
        try { btn.onClick(); } catch (e) { print('[ui] button error: ' + e); }
        anyClicked = true;
      }
    }
    return anyClicked;
  }

  function drawAllButtons() {
    const savedFont = __uiState.currentFont;
    const savedAlign = __uiState.textAlign;
    const savedBaseline = __uiState.textBaseline;

    setFont('normal');
    setTextAlign('center');
    setTextBaseline('middle');

    for (let i = 0; i < __uiButtons.length; i++) {
      const btn = __uiButtons[i];
      let bgColor = btn.normalColor;
      if (btn.pressed) bgColor = btn.pressedColor;
      else if (btn.hovered) bgColor = btn.hoverColor;

      // Button background
      rectfill(btn.x, btn.y, btn.w, btn.h, bgColor);
      // Border
      rect(btn.x, btn.y, btn.w, btn.h, btn.borderColor, false);
      // Label
      drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, btn.textColor, 1);
    }

    __uiState.currentFont = savedFont;
    __uiState.textAlign = savedAlign;
    __uiState.textBaseline = savedBaseline;
  }

  // drawGradientRect(x, y, w, h, topColor, bottomColor, filled)
  function drawGradientRect(x, y, w, h, topColor, bottomColor, filled) {
    if (filled === false) {
      // Just draw border
      rect(x, y, w, h, topColor, false);
    } else {
      // Draw gradient fill
      drawGradient(x, y, w, h, topColor, bottomColor);
    }
  }

  // createPanel returns an object describing the panel; drawPanel renders it
  function createPanel(x, y, w, h, opts) {
    opts = opts || {};
    return {
      x: x | 0, y: y | 0, w: w | 0, h: h | 0,
      bgColor: opts.bgColor != null ? opts.bgColor : opts.fill != null ? opts.fill : 0x101822,
      borderColor: opts.borderColor != null ? opts.borderColor : 0x6699cc,
      borderWidth: opts.borderWidth || 1,
      shadow: !!opts.shadow,
      gradient: !!opts.gradient,
      gradientColor: opts.gradientColor != null ? opts.gradientColor : opts.bgColor,
    };
  }

  // Font / text alignment state mirrors runtime/ui/text.js so the same
  // setFont('large') / setTextAlign('right') / drawTextShadow(...) sequence
  // produces the same pixel layout under Godot as it does on web.
  const __uiFonts = {
    tiny:   { size: 0.5, spacing: 1 },
    small:  { size: 1,   spacing: 2 },
    normal: { size: 2,   spacing: 1 },
    large:  { size: 3,   spacing: 1 },
    huge:   { size: 4,   spacing: 2 },
  };
  const __uiState = { currentFont: 'normal', textAlign: 'left', textBaseline: 'top' };
  function setFont(fontName) {
    if (__uiFonts[fontName]) __uiState.currentFont = fontName;
  }
  function setTextAlign(align) { __uiState.textAlign = align || 'left'; }
  function setTextBaseline(baseline) { __uiState.textBaseline = baseline || 'top'; }
  function __uiMeasure(text, scale) {
    const f = __uiFonts[__uiState.currentFont] || __uiFonts.normal;
    const s = (typeof scale === 'number' ? scale : 1) * f.size;
    const str = text == null ? '' : ('' + text);
    return { width: str.length * 6 * s, height: 8 * s, finalScale: s };
  }
  function drawText(text, x, y, color, scale) {
    const m = __uiMeasure(text, scale);
    let dx = x | 0, dy = y | 0;
    if (__uiState.textAlign === 'center') dx = (x - m.width / 2) | 0;
    else if (__uiState.textAlign === 'right') dx = (x - m.width) | 0;
    if (__uiState.textBaseline === 'middle') dy = (y - m.height / 2) | 0;
    else if (__uiState.textBaseline === 'bottom') dy = (y - m.height) | 0;
    novaPrint(text == null ? '' : ('' + text), dx, dy,
      color == null ? 0xffffff : color, m.finalScale);
  }
  function drawTextShadow(text, x, y, color, shadowColor, offset, scale) {
    const off = typeof offset === 'number' ? offset : 2;
    const sc = typeof scale === 'number' ? scale : 1;
    drawText(text, x + off, y + off, shadowColor == null ? 0x000000 : shadowColor, sc);
    drawText(text, x, y, color == null ? 0xffffff : color, sc);
  }
  function drawTextOutline(text, x, y, color, outlineColor, scale) {
    const sc = typeof scale === 'number' ? scale : 1;
    const oc = outlineColor == null ? 0x000000 : outlineColor;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        if (ox !== 0 || oy !== 0) drawText(text, x + ox, y + oy, oc, sc);
      }
    }
    drawText(text, x, y, color == null ? 0xffffff : color, sc);
  }
  function grid(cols, rows, w, h) {
    return {
      cols: cols || 1,
      rows: rows || 1,
      cellWidth: (w || 640) / (cols || 1),
      cellHeight: (h || 360) / (rows || 1),
    };
  }
  function createLabel(_opts) { warnOnce('ui.createLabel'); return makeStub(); }
  // createButton and createPanel are defined above with real implementations
  function createSlider(_opts) { warnOnce('ui.createSlider'); return makeStub({ value: 0 }); }
  function createCheckbox(_opts) { warnOnce('ui.createCheckbox'); return makeStub({ checked: false }); }
  function createDialog(_opts) { warnOnce('ui.createDialog'); return makeStub(); }
  function parseCanvasUI(_src) { warnOnce('canvas-ui.parse'); return makeStub(); }
  function renderCanvasUI(_root) { warnOnce('canvas-ui.render'); }
  function updateCanvasUI(_root, _dt) { warnOnce('canvas-ui.update'); }

  // ── Game utilities — pure logic, full parity with runtime/api-gameutils.js ──

  // Screen Shake
  function createShake(opts) {
    opts = opts || {};
    return { mag: 0, x: 0, y: 0, decay: opts.decay != null ? opts.decay : 4, maxMag: opts.maxMag != null ? opts.maxMag : 20 };
  }
  function triggerShake(shake, magnitude) {
    shake.mag = Math.min(shake.mag + magnitude, shake.maxMag);
  }
  function updateShake(shake, dt) {
    if (shake.mag > 0.01) {
      shake.x = (Math.random() - 0.5) * shake.mag * 1.5;
      shake.y = (Math.random() - 0.5) * shake.mag * 1.5;
      shake.mag -= shake.decay * dt;
    } else { shake.mag = 0; shake.x = 0; shake.y = 0; }
  }
  function getShakeOffset(shake) { return [shake.x, shake.y]; }

  // Cooldown Timers
  function createCooldown(duration) { return { remaining: 0, duration: duration || 0 }; }
  function useCooldown(cd) {
    if (cd.remaining > 0) return false;
    cd.remaining = cd.duration;
    return true;
  }
  function cooldownReady(cd) { return cd.remaining <= 0; }
  function cooldownProgress(cd) {
    if (!cd.duration) return 1;
    return Math.max(0, 1 - cd.remaining / cd.duration);
  }
  function updateCooldown(cd, dt) {
    if (cd.remaining > 0) cd.remaining = Math.max(0, cd.remaining - dt);
  }
  function createCooldownSet(defs) {
    var set = {};
    var keys = Object.keys(defs);
    for (var i = 0; i < keys.length; i++) set[keys[i]] = createCooldown(defs[keys[i]]);
    return set;
  }
  function updateCooldowns(set, dt) {
    var keys = Object.keys(set);
    for (var i = 0; i < keys.length; i++) updateCooldown(set[keys[i]], dt);
  }

  // Hit State / Invulnerability
  function createHitState(opts) {
    opts = opts || {};
    return {
      invulnTimer: 0,
      invulnDuration: opts.invulnDuration != null ? opts.invulnDuration : 0.8,
      blinkRate: opts.blinkRate != null ? opts.blinkRate : 25,
      flashTimer: 0,
    };
  }
  function triggerHit(hitState) {
    if (hitState.invulnTimer > 0) return false;
    hitState.invulnTimer = hitState.invulnDuration;
    hitState.flashTimer = 0.1;
    return true;
  }
  function isInvulnerable(hitState) { return hitState.invulnTimer > 0; }
  function isVisible(hitState, time) {
    if (hitState.invulnTimer <= 0) return true;
    return Math.sin((time || 0) * hitState.blinkRate) > 0;
  }
  function isFlashing(hitState) { return hitState.flashTimer > 0; }
  function updateHitState(hitState, dt) {
    if (hitState.invulnTimer > 0) hitState.invulnTimer = Math.max(0, hitState.invulnTimer - dt);
    if (hitState.flashTimer > 0) hitState.flashTimer = Math.max(0, hitState.flashTimer - dt);
  }

  // Spawn Wave Manager
  function createSpawner(opts) {
    opts = opts || {};
    return {
      wave: 0, totalSpawned: 0, active: true,
      timer: opts.initialDelay != null ? opts.initialDelay : (opts.waveInterval || 10),
      waveInterval: opts.waveInterval || 10,
      baseCount: opts.baseCount != null ? opts.baseCount : 3,
      countGrowth: opts.countGrowth != null ? opts.countGrowth : 1,
      maxCount: opts.maxCount || 20,
      spawnFn: opts.spawnFn || null,
    };
  }
  function updateSpawner(spawner, dt) {
    if (!spawner.active) return;
    spawner.timer -= dt;
    if (spawner.timer <= 0) {
      spawner.wave++;
      spawner.timer = spawner.waveInterval;
      var count = Math.min(spawner.baseCount + (spawner.wave - 1) * spawner.countGrowth, spawner.maxCount);
      if (spawner.spawnFn) {
        for (var i = 0; i < count; i++) { spawner.spawnFn(spawner.wave, i, count); spawner.totalSpawned++; }
      }
    }
  }
  function triggerWave(spawner) { spawner.timer = 0; }
  function getSpawnerWave(spawner) { return spawner.wave; }

  // Object Pool
  function createPool(maxSize, factory) {
    maxSize = maxSize || 100;
    var _f = factory || function () { return {}; };
    var items = [];
    for (var i = 0; i < maxSize; i++) { var o = _f(); o._poolAlive = false; items.push(o); }
    return {
      items: items,
      spawn: function (initFn) {
        for (var i = 0; i < items.length; i++) {
          if (!items[i]._poolAlive) { items[i]._poolAlive = true; if (initFn) initFn(items[i]); return items[i]; }
        }
        return null;
      },
      forEach: function (fn) {
        for (var i = 0; i < items.length; i++) {
          if (!items[i]._poolAlive) continue;
          if (fn(items[i], i) === false) items[i]._poolAlive = false;
        }
      },
      kill: function (obj) { obj._poolAlive = false; },
      recycle: function () { for (var i = 0; i < items.length; i++) items[i]._poolAlive = false; },
      get count() { var n = 0; for (var i = 0; i < items.length; i++) if (items[i]._poolAlive) n++; return n; },
    };
  }

  // Floating Text System
  function createFloatingTextSystem() {
    var texts = [];
    return {
      spawn: function (text, x, y, opts) {
        opts = opts || {};
        var is3D = opts.z !== undefined;
        texts.push({
          text: String(text), x: x, y: y, z: opts.z,
          vx: opts.vx != null ? opts.vx : 0,
          vy: opts.vy != null ? opts.vy : (is3D ? -(opts.riseSpeed || 2) : -(opts.riseSpeed || 30)),
          vz: opts.vz != null ? opts.vz : 0,
          timer: opts.duration != null ? opts.duration : 1.0,
          maxTimer: opts.duration != null ? opts.duration : 1.0,
          color: opts.color != null ? opts.color : 0xffffff,
          scale: opts.scale != null ? opts.scale : 1,
        });
      },
      update: function (dt) {
        for (var i = texts.length - 1; i >= 0; i--) {
          var t = texts[i]; t.x += t.vx * dt; t.y += t.vy * dt;
          if (t.z !== undefined) t.z += t.vz * dt;
          t.timer -= dt; if (t.timer <= 0) texts.splice(i, 1);
        }
      },
      getTexts: function () { return texts; },
      clear: function () { texts.length = 0; },
      get count() { return texts.length; },
    };
  }

  // State Machine
  function createStateMachine(initialState) {
    var current = initialState, elapsed = 0, handlers = {};
    return {
      on: function (state, fns) { handlers[state] = fns; return this; },
      switchTo: function (state) {
        if (handlers[current] && handlers[current].exit) handlers[current].exit();
        current = state; elapsed = 0;
        if (handlers[current] && handlers[current].enter) handlers[current].enter();
      },
      update: function (dt) {
        elapsed += dt;
        if (handlers[current] && handlers[current].update) handlers[current].update(dt, elapsed);
      },
      getState: function () { return current; },
      getElapsed: function () { return elapsed; },
      is: function (state) { return current === state; },
    };
  }

  // Timer
  function createTimer(duration, opts) {
    opts = opts || {};
    return {
      elapsed: 0, duration: duration, loop: !!opts.loop, done: false,
      onComplete: opts.onComplete || null,
      update: function (dt) {
        if (this.done && !this.loop) return;
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
          this.elapsed = this.loop ? this.elapsed - this.duration : this.duration;
          if (!this.loop) this.done = true;
          if (this.onComplete) this.onComplete();
        }
      },
      progress: function () { return Math.min(1, this.elapsed / (this.duration || 1)); },
      reset: function () { this.elapsed = 0; this.done = false; },
    };
  }

  // createGameStore — Zustand-compatible reactive store (polyfill, no Zustand dep needed)
  function createGameStore(initialState) {
    var state = typeof initialState === 'function' ? initialState() : (initialState || {});
    var listeners = [];
    return {
      getState: function () { return state; },
      setState: function (partial, replace) {
        var next = typeof partial === 'function' ? partial(state) : partial;
        var nextState = replace ? next : Object.assign({}, state, next);
        if (nextState !== state) {
          var prev = state; state = nextState;
          for (var i = 0; i < listeners.length; i++) listeners[i](state, prev);
        }
      },
      subscribe: function (listener) {
        listeners.push(listener);
        return function () { var idx = listeners.indexOf(listener); if (idx >= 0) listeners.splice(idx, 1); };
      },
      destroy: function () { listeners.length = 0; },
    };
  }
  var novaStore = createGameStore({ gameState: 'start', score: 0, lives: 3, level: 1, time: 0, paused: false, playerX: 0, playerY: 0 });

  // Stage / screens / movie clip / graphics nodes
  function createGraphicsNode(_opts) { warnOnce('createGraphicsNode'); return makeStub(); }
  function createMovieClip(_opts) { warnOnce('createMovieClip'); return makeStub({ currentFrame: 0, totalFrames: 1 }); }
  function createStage(_opts) { warnOnce('createStage'); return makeStub(); }
  function createScreen(_opts) { warnOnce('createScreen'); return makeStub(); }
  function pushScreen(_s) { warnOnce('pushScreen'); }
  function popScreen() { warnOnce('popScreen'); }
  function createCard(_opts) { warnOnce('createCard'); return makeStub(); }
  function createMenu(_opts) { warnOnce('createMenu'); return makeStub(); }
  function createStartScreen(_opts) { warnOnce('createStartScreen'); return makeStub(); }

  // Particles (2D + 3D) — backed by GPUParticles3D (3D) and a software
  // simulation for 2D fallback. Both return a stub object with a .destroy()
  // method so cart code can hold onto the handle.
  function createParticleSystem(opts) { return createParticles(opts); }
  function createEmitter2D(_opts)     { warnOnce('createEmitter2D'); return makeStub(); }
  function createParticles(opts) {
    ensureInit();
    opts = opts || {};
    // Need a draw-pass mesh — make a small sphere by default.
    const geomR = call('geometry.createSphere', { radius: 0.08, height: 0.16 });
    if (!geomR) return makeStub();
    // Optional emissive material so particles glow.
    const mat = call('material.create', {
      albedo: colorFromHex(typeof opts.color === 'number' ? opts.color : 0xffffff),
      unshaded: true,
      emission: colorFromHex(typeof opts.color === 'number' ? opts.color : 0xffffff),
      emissionEnergy: typeof opts.emissionEnergy === 'number' ? opts.emissionEnergy : 1.5,
      blend: 'add',
    });
    const r = call('particles.create', {
      geometry: geomR.handle,
      material: mat ? mat.handle : 0,
      amount: opts.count || opts.amount || 64,
      lifetime: opts.lifetime || 2.0,
      oneShot: !!opts.oneShot,
      emissionBoxExtents: opts.spread ? [opts.spread, opts.spread, opts.spread] : [1, 1, 1],
      gravity: Array.isArray(opts.gravity) ? opts.gravity
              : (opts.gravity === false ? [0, 0, 0] : [0, opts.gravity || -1, 0]),
      initialVelocityMin: opts.velocityMin || 0.5,
      initialVelocityMax: opts.velocityMax || 2.0,
      scale: opts.scale || 1.0,
    });
    if (!r) return makeStub();
    if (Array.isArray(opts.position)) {
      call('transform.set', { handle: r.handle, position: ensureArray3.apply(null, opts.position) });
    }
    return makeStub({
      handle: r.handle,
      destroy() { call('particles.destroy', { handle: r.handle }); },
      setPosition(x, y, z) {
        call('transform.set', { handle: r.handle, position: ensureArray3(x, y, z) });
      },
    });
  }

  // Skybox — wired to env.set sky presets.
  function createSpaceSkybox(_opts)   { ensureInit(); call('env.set', { skyPreset: 'space',     sky: true }); return 1; }
  function createGalaxySkybox(_opts)  { ensureInit(); call('env.set', { skyPreset: 'space',     sky: true, glow: true, glowIntensity: 1.6 }); return 1; }
  function createSunsetSkybox(_opts)  { ensureInit(); call('env.set', { skyPreset: 'sunset',    sky: true }); return 1; }
  function createDawnSkybox(_opts)    { ensureInit(); call('env.set', { skyPreset: 'dawn',      sky: true }); return 1; }
  function createNightSkybox(_opts)   { ensureInit(); call('env.set', { skyPreset: 'night',     sky: true }); return 1; }
  function createFoggySkybox(_opts)   { ensureInit(); call('env.set', { skyPreset: 'foggy',     sky: true }); return 1; }
  function createDuskSkybox(_opts)    { ensureInit(); call('env.set', { skyPreset: 'dusk',      sky: true }); return 1; }
  function createStormSkybox(_opts)   { ensureInit(); call('env.set', { skyPreset: 'storm',     sky: true }); return 1; }
  function createAlienSkybox(_opts)   { ensureInit(); call('env.set', { skyPreset: 'alien',     sky: true }); return 1; }
  function createUnderwaterSkybox(_opts) { ensureInit(); call('env.set', { skyPreset: 'underwater', sky: true }); return 1; }
  function setSkybox(name) {
    ensureInit();
    if (typeof name === 'string') call('env.set', { skyPreset: name, sky: true });
    else call('env.set', { sky: true });
  }
  function createSkybox(opts) {
    ensureInit();
    if (opts && typeof opts === 'object') {
      const payload = { sky: true };
      if (typeof opts.preset === 'string') payload.skyPreset = opts.preset;
      if (typeof opts.topColor === 'number') payload.skyTopColor = colorFromHex(opts.topColor);
      if (typeof opts.horizonColor === 'number') payload.skyHorizonColor = colorFromHex(opts.horizonColor);
      if (typeof opts.groundColor === 'number') payload.groundBottomColor = colorFromHex(opts.groundColor);
      call('env.set', payload);
    } else {
      call('env.set', { sky: true });
    }
    return 1;
  }

  // Models / textures / advanced materials.
  function loadModel(path, cb) {
    // GLB/GLTF loader is a Phase 3 item — stub model load but still call cb.
    const stub = makeStub({ handle: 0, path: path });
    if (typeof cb === 'function') {
      try { cb(stub); } catch (_e) { /* swallow */ }
    }
    return stub;
  }
  function _resolveGeomString(name) {
    // Accepts handle objects/numbers OR string names like 'sphere'/'box'.
    if (name && typeof name === 'object' && name.handle) return name.handle;
    if (typeof name === 'number') return name;
    if (typeof name !== 'string') {
      const r = call('geometry.createBox', { size: [1, 1, 1] });
      return r ? r.handle : 0;
    }
    const n = name.toLowerCase();
    let r;
    if (n === 'sphere')        r = call('geometry.createSphere',   { radius: 0.5, height: 1 });
    else if (n === 'plane')    r = call('geometry.createPlane',    { size: [1, 0, 1] });
    else if (n === 'cylinder') r = call('geometry.createCylinder', { topRadius: 0.5, bottomRadius: 0.5, height: 1, sides: 24 });
    else if (n === 'cone')     r = call('geometry.createCone',     { radius: 0.5, height: 1, sides: 24 });
    else if (n === 'torus')    r = call('geometry.createTorus',    { innerRadius: 0.3, outerRadius: 0.5 });
    else                       r = call('geometry.createBox',      { size: [1, 1, 1] });
    return r ? r.handle : 0;
  }
  function createTexture(opts) {
    ensureInit();
    if (!opts) return 0;
    if (typeof opts === 'string') return loadTexture(opts);
    if (opts.path) return loadTexture(opts.path);
    if (opts.width && opts.height && opts.pixels) {
      const r = call('texture.createFromImage', {
        width: opts.width, height: opts.height, pixels: opts.pixels,
      });
      return r ? r.handle : 0;
    }
    return 0;
  }
  function loadTexture(path, cb) {
    ensureInit();
    if (typeof path !== 'string') return 0;
    // Cart paths are typically relative to the cart dir; normalize to res://carts/<cart>/...
    let resPath = path;
    if (!path.startsWith('res://') && !path.startsWith('user://')) {
      const cart = (typeof globalThis.__nova64_cart_path === 'string')
          ? globalThis.__nova64_cart_path : 'res://carts/current';
      resPath = cart.replace(/\/?$/, '/') + path.replace(/^\.?\//, '');
    }
    const r = call('texture.createFromImage', { path: resPath });
    const handle = r && r.handle ? r.handle : 0;
    if (typeof cb === 'function') {
      try { cb(handle); } catch (_e) { /* swallow */ }
    }
    return handle;
  }
  function createInstancedMesh(geom, count, color, opts) {
    ensureInit();
    opts = opts || {};
    const n = (count | 0) > 0 ? (count | 0) : 1;
    const geomHandle = _resolveGeomString(geom);
    if (!geomHandle) return makeStub({ handle: 0, count: 0 });
    const matPayload = {
      albedo: colorFromHex(typeof color === 'number' ? color : 0xffffff),
    };
    if (typeof opts.emissive === 'number') {
      matPayload.emission = colorFromHex(opts.emissive);
      matPayload.emissionEnergy = opts.emissiveIntensity || 1.0;
    }
    if (opts.unshaded) matPayload.unshaded = true;
    const matR = call('material.create', matPayload);
    const r = call('mesh.createInstanced', {
      geometry: geomHandle,
      count: n,
      material: matR ? matR.handle : 0,
    });
    if (!r || !r.handle) return makeStub({ handle: 0, count: 0 });
    const stub = makeStub({ handle: r.handle, count: n });
    stub.setInstanceTransform = function (i, x, y, z, rx, ry, rz, sx, sy, sz) {
      call('instance.setTransform', {
        handle: r.handle,
        index: i | 0,
        position: [x || 0, y || 0, z || 0],
        rotation: [rx || 0, ry || 0, rz || 0],
        scale: [sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz],
      });
      return stub;
    };
    stub.setInstancePosition = function (i, x, y, z) {
      call('instance.setTransform', {
        handle: r.handle, index: i | 0, position: ensureArray3(x, y, z),
      });
      return stub;
    };
    stub.setInstanceColor = function () { return stub; };
    stub.addInstance = function () { return stub; };
    return stub;
  }
  // Freestanding versions used by carts that destructure
  // nova64.scene.setInstanceTransform / finalizeInstances etc. The handle
  // argument is the value returned by createInstancedMesh (stub object or
  // raw numeric handle).
  function _resolveInstanceHandle(h) {
    if (h == null) return 0;
    if (typeof h === 'number') return h | 0;
    if (typeof h.handle === 'number') return h.handle | 0;
    return 0;
  }
  function setInstanceTransform(handle, i, x, y, z, rx, ry, rz, sx, sy, sz) {
    const h = _resolveInstanceHandle(handle);
    if (!h) return;
    call('instance.setTransform', {
      handle: h,
      index: i | 0,
      position: [x || 0, y || 0, z || 0],
      rotation: [rx || 0, ry || 0, rz || 0],
      scale: [sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz],
    });
  }
  function setInstancePosition(handle, i, x, y, z) {
    const h = _resolveInstanceHandle(handle);
    if (!h) return;
    call('instance.setTransform', {
      handle: h, index: i | 0, position: ensureArray3(x, y, z),
    });
  }
  function setInstanceColor() { /* not yet bridged */ }
  function finalizeInstances(_handle) { /* upload-on-each-set is fine for now */ }
  // PBR — full StandardMaterial3D PBR surface.
  function createPBRMaterial(opts) {
    ensureInit();
    opts = opts || {};
    const payload = materialPayload(opts.color != null ? opts.color : opts.albedo, Object.assign({
      metallic: 0.0,
      roughness: 0.5,
    }, opts));
    payload.specular = typeof opts.specular === 'number' ? opts.specular : 0.5;
    if (typeof opts.rim === 'number') { payload.rim = opts.rim; payload.rimTint = opts.rimTint || 0.5; }
    if (typeof opts.clearcoat === 'number') {
      payload.clearcoat = opts.clearcoat;
      payload.clearcoatRoughness = opts.clearcoatRoughness || 0.1;
    }
    if (typeof opts.anisotropy === 'number') payload.anisotropy = opts.anisotropy;
    if (opts.normalMap) payload.normalMap = unwrapHandle(opts.normalMap);
    if (opts.albedoTexture || opts.diffuseMap)
      payload.albedoTexture = unwrapHandle(opts.albedoTexture || opts.diffuseMap);
    if (opts.roughnessMap) payload.roughnessMap = unwrapHandle(opts.roughnessMap);
    if (opts.metallicMap)  payload.metallicMap  = unwrapHandle(opts.metallicMap);
    if (opts.aoMap)        payload.aoMap        = unwrapHandle(opts.aoMap);
    if (opts.emissionMap)  payload.emissionMap  = unwrapHandle(opts.emissionMap);
    const r = call('material.create', payload);
    return r ? r.handle : 0;
  }
  // Hologram = unshaded + emissive + additive blend + rim glow.
  function createHologramMaterial(opts) {
    ensureInit();
    opts = opts || {};
    const c = typeof opts.color === 'number' ? opts.color : 0x00ffff;
    const r = call('material.create', {
      albedo: colorFromHex(c, 0.7),
      emission: colorFromHex(c),
      emissionEnergy: opts.energy || 2.0,
      blend: 'add',
      transparency: 'alpha',
      cull: 'disabled',
      unshaded: true,
      rim: 0.6, rimTint: 0.8,
    });
    return r ? r.handle : 0;
  }
  function createVortexMaterial(opts) {
    ensureInit();
    opts = opts || {};
    const c = typeof opts.color === 'number' ? opts.color : 0xff00ff;
    const r = call('material.create', {
      albedo: colorFromHex(c, 0.8),
      emission: colorFromHex(c),
      emissionEnergy: opts.energy || 2.5,
      blend: 'add',
      transparency: 'alpha',
      cull: 'disabled',
      unshaded: true,
    });
    return r ? r.handle : 0;
  }
  // TSL (Three Shading Language) → emit a themed emissive material fallback.
  // These match the browser's animated shaders as closely as possible with
  // static Godot StandardMaterial3D settings.
  function createTSLMaterial(kind, opts) {
    ensureInit();
    if (kind && typeof kind === 'object') {
      opts = kind;
      kind = opts.kind || opts.type || 'plasma';
    }
    opts = opts || {};
    const name = typeof kind === 'string' ? kind.toLowerCase() : 'plasma';

    // Extended preset library matching runtime/backends/threejs/tsl.js
    const presets = {
      // Animated pink/blue plasma wave
      plasma: {
        color: 0xff44aa, emission: 0xff2288, emissionEnergy: 2.5,
        blend: 'add', metallic: 0, roughness: 1,
      },
      plasma2: {
        color: 0xaa44ff, emission: 0x8822ff, emissionEnergy: 2.8,
        blend: 'add', metallic: 0, roughness: 1,
      },
      // Fiery lava with cracks
      lava: {
        color: 0xff4400, emission: 0xff2200, emissionEnergy: 3.5,
        blend: 'add', metallic: 0.1, roughness: 0.8,
      },
      lava2: {
        color: 0xffaa00, emission: 0xff6600, emissionEnergy: 4.0,
        blend: 'add', metallic: 0, roughness: 0.6,
      },
      // Dark swirling void/portal
      void: {
        color: 0x4422aa, emission: 0x2211aa, emissionEnergy: 2.0,
        blend: 'add', metallic: 0.3, roughness: 0.5,
      },
      // Cyan holographic effect
      hologram: {
        color: 0x00ffff, emission: 0x00ccff, emissionEnergy: 2.5,
        blend: 'add', metallic: 0.8, roughness: 0.2, rim: 0.8, rimTint: 0.5,
      },
      // Electric bolts
      electricity: {
        color: 0x44aaff, emission: 0x22aaff, emissionEnergy: 3.0,
        blend: 'add', metallic: 0, roughness: 1,
      },
      // Rainbow gradient
      rainbow: {
        color: 0xff88ff, emission: 0xff44ff, emissionEnergy: 2.0,
        blend: 'add', metallic: 0.5, roughness: 0.3,
      },
      // Swirling vortex portal
      vortex: {
        color: 0x8800ff, emission: 0x6600ff, emissionEnergy: 2.8,
        blend: 'add', metallic: 0.2, roughness: 0.6, rim: 0.5,
      },
      // Galaxy spiral
      galaxy: {
        color: 0x4488ff, emission: 0x2266ff, emissionEnergy: 2.2,
        blend: 'add', metallic: 0.4, roughness: 0.4,
      },
      // Water surface
      water: {
        color: 0x2288cc, emission: 0x116688, emissionEnergy: 1.2,
        blend: 'alpha', metallic: 0.6, roughness: 0.1,
      },
      // Shockwave ripple
      shockwave: {
        color: 0xffffff, emission: 0xaaccff, emissionEnergy: 2.5,
        blend: 'add', metallic: 0, roughness: 1,
      },
      // Fire effect
      fire: {
        color: 0xff6600, emission: 0xff4400, emissionEnergy: 3.8,
        blend: 'add', metallic: 0, roughness: 1,
      },
      // Ice/frost
      ice: {
        color: 0x88ddff, emission: 0x44aaff, emissionEnergy: 1.5,
        blend: 'alpha', metallic: 0.7, roughness: 0.15,
      },
      // Neon glow
      neon: {
        color: 0xff00ff, emission: 0xff00ff, emissionEnergy: 4.0,
        blend: 'add', metallic: 0, roughness: 1,
      },
    };

    const preset = presets[name] || presets.plasma;

    // Build material payload merging preset with user options
    const payload = materialPayload(preset.color, Object.assign({
      opacity: opts.opacity == null ? 0.9 : opts.opacity,
      transparent: true,
      unshaded: true,
      cull: 'disabled',
      doubleSided: true,
    }, preset, opts));

    const r = call('material.create', payload);
    return r ? r.handle : 0;
  }
  function createAdvancedCube(sizeOrColor, optsOrPos, maybePos) {
    ensureInit();
    let size = 1;
    let opts = {};
    let pos = maybePos;
    if (typeof optsOrPos === 'object' && optsOrPos && !Array.isArray(optsOrPos)) {
      size = typeof sizeOrColor === 'number' ? sizeOrColor : (optsOrPos.size || 1);
      opts = optsOrPos;
    } else {
      opts = { color: sizeOrColor == null ? 0xffffff : sizeOrColor };
      pos = optsOrPos;
    }
    const s = typeof size === 'number' ? size : 1;
    const geomR = call('geometry.createBox', { size: [s, s, s] });
    return geomR ? spawnMesh(geomR.handle, opts.color, pos, Object.assign({
      metallic: 0.35,
      roughness: 0.3,
    }, opts)) : 0;
  }

  // ---------------- voxel: heightmap-based world ---------------------
  // The web voxel engine uses chunked greedy meshing with simplex noise
  // terrain, biomes, ores, caves and trees. We don't have GPU-side
  // chunk meshing under Godot yet, so this layer fakes parity by:
  //   - generating a heightmap with cheap value noise (matches the
  //     web engine's overall feel: rolling hills, occasional spikes)
  //   - rendering one column-shaped box per (x,z) cell, biome-tinted
  //   - sampling the same noise for biome name (mirrors the web rules)
  //   - scattering simple trees (trunk + leaf canopy) per biome
  //   - tracking sparse blocks placed/broken by the player
  // Collision, raycast and getHighestBlock all consult the heightmap so
  // gameplay feels right even though the meshes are coarse.
  const VX_BASE_Y = 60;          // bottom of generated columns
  const VX_SEA_Y = 62;           // matches runtime/api-voxel.js SEA_LEVEL
  const VX_HEIGHT_AMPLITUDE = 12;
  const VX_RADIUS = 32;          // half-width in blocks (=> 64x64 columns)
  const VX_TREE_CHANCE = 0.012;
  // Block types matching runtime/api-voxel.js BLOCK_TYPES
  const VX_BLOCK_TYPES = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5,
    WOOD: 6, LEAVES: 7, COBBLESTONE: 8, PLANKS: 9, GLASS: 10,
    BRICK: 11, SNOW: 12, ICE: 13, BEDROCK: 14, COAL_ORE: 15,
    IRON_ORE: 16, GOLD_ORE: 17, DIAMOND_ORE: 18, GRAVEL: 19,
    CLAY: 20, TORCH: 21, GLOWSTONE: 22, LAVA: 23, OBSIDIAN: 24,
    MOSSY_COBBLESTONE: 25,
  };

  // Block colors — kept exactly in sync with runtime/api-voxel.js register() calls
  // so Godot and Three.js produce identical colour output per block type.
  const VX_BLOCK_COLORS = {
    0: 0x000000,    // AIR (not rendered)
    1: 0x55cc33,    // GRASS
    2: 0x996644,    // DIRT
    3: 0xaaaaaa,    // STONE
    4: 0xffdd88,    // SAND
    5: 0x2288dd,    // WATER
    6: 0x774422,    // WOOD
    7: 0x116622,    // LEAVES
    8: 0x667788,    // COBBLESTONE
    9: 0xddaa55,    // PLANKS
    10: 0xccffff,   // GLASS
    11: 0xcc4433,   // BRICK
    12: 0xeeeeff,   // SNOW
    13: 0x99ddff,   // ICE
    14: 0x333333,   // BEDROCK
    15: 0x444444,   // COAL_ORE
    16: 0xccaa88,   // IRON_ORE
    17: 0xffcc33,   // GOLD_ORE
    18: 0x44ffee,   // DIAMOND_ORE
    19: 0x888888,   // GRAVEL
    20: 0xbbaa99,   // CLAY
    21: 0xffdd44,   // TORCH
    22: 0xffeeaa,   // GLOWSTONE
    23: 0xff4400,   // LAVA
    24: 0x220033,   // OBSIDIAN
    25: 0x668855,   // MOSSY_COBBLESTONE
  };
  const vxBlocks = new Map();    // 'x,y,z' -> { id, mesh } (sparse, player edits)
  const vxMultimeshes = [];      // kept for legacy resetVoxelWorld compat
  const vxChunkHandles = [];     // mesh.destroy handles for voxel.uploadChunk meshes
  const vxEntities = [];
  const vxConfig = { seed: 1337, renderDistance: 3, maxMeshRebuildsPerFrame: 3, enableLOD: true };
  let vxGenerated = false;
  let vxWaterMesh = 0;
  // Cached height / biome lookups to avoid re-computing FBM per block per chunk.
  const _vxHeightCache = new Map();
  const _vxBiomeCache  = new Map();

  function _vxKey(x, y, z) { return ((x | 0) + ',' + (y | 0) + ',' + (z | 0)); }
  function _vxColKey(x, z) { return ((x | 0) + ',' + (z | 0)); }

  // Deterministic hash used for ore/tree scatter decisions.
  function _vxHash2(x, y, seed) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function _vxCreateSimplexNoise(seed) {
    const grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let st = seed | 0;
    const rand = () => {
      st = (st * 1664525 + 1013904223) | 0;
      return (st >>> 0) / 4294967296;
    };
    for (let i = 255; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const dot2 = (g, x, y) => g[0] * x + g[1] * y;

    function noise2D(xin, yin) {
      let n0, n1, n2;
      const s = (xin + yin) * F2;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const t = (i + j) * G2;
      const x0 = xin - (i - t);
      const y0 = yin - (j - t);
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = x0 > y0 ? 0 : 1;
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;

      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 < 0) n0 = 0;
      else {
        t0 *= t0;
        n0 = t0 * t0 * dot2(grad3[perm[ii + perm[jj]] % 12], x0, y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 < 0) n1 = 0;
      else {
        t1 *= t1;
        n1 = t1 * t1 * dot2(grad3[perm[ii + i1 + perm[jj + j1]] % 12], x1, y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 < 0) n2 = 0;
      else {
        t2 *= t2;
        n2 = t2 * t2 * dot2(grad3[perm[ii + 1 + perm[jj + 1]] % 12], x2, y2);
      }
      return 70 * (n0 + n1 + n2);
    }

    function fbm2D(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 0.01) {
      let total = 0;
      let frequency = scale;
      let amplitude = 1;
      let maxValue = 0;
      for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      return (total / maxValue) * 0.5 + 0.5;
    }

    return { fbm2D };
  }

  let _vxNoise = _vxCreateSimplexNoise(vxConfig.seed | 0);

  function _vxBiomeAt(x, z) {
    const seed = vxConfig.seed | 0;
    const t = _vxNoise.fbm2D(x + seed, z + seed, 2, 0.5, 2.0, 0.005);
    const m = _vxNoise.fbm2D(x + 1000 + seed, z + 1000 + seed, 2, 0.5, 2.0, 0.003);
    if (t < 0.2) return 'Frozen Tundra';
    if (t < 0.35 && m > 0.5) return 'Taiga';
    if (t > 0.7 && m < 0.25) return 'Desert';
    if (t > 0.6 && m > 0.6) return 'Jungle';
    if (m < 0.3) return 'Savanna';
    if (t > 0.4 && m > 0.4) return 'Forest';
    if (t < 0.35) return 'Snowy Hills';
    return 'Plains';
  }
  function _vxBiomeProfile(biome) {
    switch (biome) {
      case 'Frozen Tundra': return { heightScale: 6, heightBase: 65 };
      case 'Taiga':         return { heightScale: 18, heightBase: 66 };
      case 'Desert':        return { heightScale: 4, heightBase: 63 };
      case 'Jungle':        return { heightScale: 22, heightBase: 58 };
      case 'Savanna':       return { heightScale: 5, heightBase: 65 };
      case 'Forest':        return { heightScale: 14, heightBase: 64 };
      case 'Snowy Hills':   return { heightScale: 35, heightBase: 62 };
      default:              return { heightScale: 6, heightBase: 64 };
    }
  }
  function _vxSurfaceFor(biome) {
    // Surface block + color matches the web engine biome→surfaceBlock mapping
    // in runtime/api-voxel.js so rendered colours are identical.
    switch (biome) {
      case 'Desert':     return { id: 4,  color: VX_BLOCK_COLORS[4],  sub: VX_BLOCK_COLORS[4]  }; // SAND
      case 'Frozen Tundra':
      case 'Snowy Hills':return { id: 12, color: VX_BLOCK_COLORS[12], sub: VX_BLOCK_COLORS[13] }; // SNOW / ICE
      case 'Taiga':      return { id: 8,  color: VX_BLOCK_COLORS[8],  sub: VX_BLOCK_COLORS[3]  }; // COBBLESTONE / STONE
      case 'Jungle':     return { id: 7,  color: VX_BLOCK_COLORS[7],  sub: VX_BLOCK_COLORS[2]  }; // LEAVES / DIRT
      case 'Forest':     return { id: 1,  color: VX_BLOCK_COLORS[1],  sub: VX_BLOCK_COLORS[2]  }; // GRASS / DIRT
      case 'Savanna':    return { id: 2,  color: VX_BLOCK_COLORS[2],  sub: VX_BLOCK_COLORS[4]  }; // DIRT / SAND
      case 'Swamp':      return { id: 1,  color: 0x5a7a4a,            sub: VX_BLOCK_COLORS[2]  }; // muddy grass
      case 'Mountains':  return { id: 3,  color: VX_BLOCK_COLORS[3],  sub: VX_BLOCK_COLORS[3]  }; // STONE
      default:           return { id: 1,  color: VX_BLOCK_COLORS[1],  sub: VX_BLOCK_COLORS[2]  }; // Plains GRASS
    }
  }
  function _vxTreeColor(biome) {
    // Match web engine leaf colors (api-voxel.js LEAVES block = 0x116622 base,
    // with biome tinting applied as the web engine does for each tree type).
    if (biome === 'Jungle') return 0x0d5218;          // dark jungle leaves
    if (biome === 'Taiga' || biome === 'Snowy Hills' || biome === 'Frozen Tundra') return 0x1a4a28; // spruce
    if (biome === 'Savanna') return 0x5a6e22;         // acacia — yellow-green
    if (biome === 'Swamp') return 0x2a4a1a;
    return VX_BLOCK_COLORS[7]; // 0x116622 oak/birch
  }
  function _vxTrunkColor(biome) {
    if (biome === 'Jungle') return 0x5a3a18;
    if (biome === 'Taiga') return 0x4a2a10;
    if (biome === 'Savanna') return 0x7a5a28;
    return 0x6b4423;
  }
  function _vxTreeAllowed(biome) {
    return biome === 'Forest' || biome === 'Jungle' || biome === 'Taiga' ||
           biome === 'Plains' || biome === 'Savanna' || biome === 'Snowy Hills';
  }
  function _vxTreeDensity(biome) {
    // Match runtime/api-voxel.js biome treeChance values.
    if (biome === 'Jungle') return 0.15;
    if (biome === 'Forest') return 0.08;
    if (biome === 'Taiga') return 0.06;
    if (biome === 'Snowy Hills') return 0.02;
    if (biome === 'Savanna') return 0.005;
    if (biome === 'Plains') return 0.015;
    return 0.0;
  }

  function _vxHeightAt(x, z) {
    const biome = _vxBiomeAtCached(x, z);
    const p = _vxBiomeProfile(biome);
    return Math.floor(_vxNoise.fbm2D(x, z, 4, 0.5, 2.0, 0.01) * p.heightScale + p.heightBase) + 3;
  }

  function _vxHeightAtCached(x, z) {
    const k = (x | 0) + ',' + (z | 0);
    let h = _vxHeightCache.get(k);
    if (h === undefined) { h = _vxHeightAt(x, z); _vxHeightCache.set(k, h); }
    return h;
  }
  function _vxBiomeAtCached(x, z) {
    const k = (x | 0) + ',' + (z | 0);
    let b = _vxBiomeCache.get(k);
    if (b === undefined) { b = _vxBiomeAt(x, z); _vxBiomeCache.set(k, b); }
    return b;
  }

  // Return the hex colour of the block at world position (wx, wy, wz),
  // or 0 for air.  Used by the chunk-based terrain generator.
  function _vxBlockColorAt(wx, wy, wz) {
    const height = _vxHeightAtCached(wx, wz);

    if (wy <= height) {
      // --- solid terrain ---
      if (wy < VX_BASE_Y - 2) return VX_BLOCK_COLORS[3]; // deep stone
      const biome = _vxBiomeAtCached(wx, wz);
      const surface = _vxSurfaceFor(biome);
      const dy = height - wy;
      if (dy === 0) {
        // surface block
        if (wy < VX_SEA_Y) return wy >= VX_SEA_Y - 1 ? surface.color : 0x6b5a3a;
        return surface.color;
      }
      if (dy < 3) return surface.sub || VX_BLOCK_COLORS[2]; // dirt
      // Stone with ore veins at a specific depth
      if (height > VX_BASE_Y + 10 && dy === 4) {
        const oreRoll = _vxHash2(wx, wz, vxConfig.seed + 77);
        if (oreRoll > 0.97) return VX_BLOCK_COLORS[15]; // coal ore
        if (oreRoll > 0.95) return VX_BLOCK_COLORS[16]; // iron ore
      }
      return VX_BLOCK_COLORS[3]; // stone
    }

    // --- above terrain: trees ---
    // Trunk at exactly (wx, wz)
    const h2 = _vxHeightAtCached(wx, wz);
    if (h2 >= VX_SEA_Y) {
      const biome2 = _vxBiomeAtCached(wx, wz);
      if (_vxTreeAllowed(biome2)) {
        const td = _vxTreeDensity(biome2);
        if (_vxHash2(wx, wz, vxConfig.seed + 31) < td) {
          let baseH = 4, varH = 2;
          if (biome2 === 'Jungle') { baseH = 6; varH = 4; }
          else if (biome2 === 'Taiga') { baseH = 5; varH = 3; }
          const trunkH = baseH + Math.floor(_vxHash2(wx, wz, vxConfig.seed + 53) * varH);
          if (wy >= h2 + 1 && wy <= h2 + trunkH) return _vxTrunkColor(biome2);
        }
      }
    }

    // Canopy leaves originating from any tree within max canopy radius
    const MAX_CANOPY_R = 3;
    for (let dx = -MAX_CANOPY_R; dx <= MAX_CANOPY_R; dx++) {
      for (let dz = -MAX_CANOPY_R; dz <= MAX_CANOPY_R; dz++) {
        const tx = wx + dx, tz = wz + dz;
        const th = _vxHeightAtCached(tx, tz);
        if (th < VX_SEA_Y) continue;
        const tb = _vxBiomeAtCached(tx, tz);
        if (!_vxTreeAllowed(tb)) continue;
        if (!(_vxHash2(tx, tz, vxConfig.seed + 31) < _vxTreeDensity(tb))) continue;
        let baseH = 4, varH = 2;
        if (tb === 'Jungle') { baseH = 6; varH = 4; }
        else if (tb === 'Taiga') { baseH = 5; varH = 3; }
        const trunkH = baseH + Math.floor(_vxHash2(tx, tz, vxConfig.seed + 53) * varH);
        const canopyY = th + trunkH + 1;
        let canopyR = 2;
        if (tb === 'Taiga') canopyR = 1;
        else if (tb === 'Savanna') canopyR = 3;
        const lx = wx - tx, lz = wz - tz, ly = wy - canopyY;
        if (lx < -canopyR || lx > canopyR || lz < -canopyR || lz > canopyR) continue;
        if (ly < 0 || ly > 2) continue;
        if (Math.abs(lx) + Math.abs(lz) + ly > canopyR + 1) continue;
        if (_vxHash2(wx, wz, vxConfig.seed + ly + 99) > 0.75) continue;
        return _vxTreeColor(tb);
      }
    }

    return 0; // air
  }

  // Spawn individual blocks for a column position — renders surface + subsurface
  // blocks as individual cubes for authentic Minecraft look
  function _vxSpawnBlocks(x, z, bucket) {
    const biome = _vxBiomeAt(x, z);
    const surface = _vxSurfaceFor(biome);
    const height = _vxHeightAt(x, z);

    const cx = x + 0.5, cz = z + 0.5;

    // Render surface block + a few visible layers below (dirt/stone)
    // This creates the authentic blocky Minecraft look
    const VISIBLE_DEPTH = 4; // How many layers below surface to render
    const stoneColor = VX_BLOCK_COLORS[3]; // Stone gray
    const dirtColor = surface.sub || VX_BLOCK_COLORS[2]; // Dirt or biome sub-color

    for (let dy = 0; dy < VISIBLE_DEPTH; dy++) {
      const y = height - dy;
      if (y < VX_BASE_Y - 2) break;

      let color;
      if (dy === 0) {
        // Surface block
        if (height < VX_SEA_Y) {
          color = height >= VX_SEA_Y - 1 ? surface.color : 0x6b5a3a; // sand underwater
        } else {
          color = surface.color;
        }
      } else if (dy < 3) {
        // Dirt/sub-surface layer
        color = dirtColor;
      } else {
        // Stone layer
        color = stoneColor;
      }

      let arr = bucket.get(color);
      if (!arr) { arr = []; bucket.set(color, arr); }
      arr.push({ cx, cy: y + 0.5, cz, sx: 1, sy: 1, sz: 1 });
    }

    // Ore generation in deeper visible blocks (rare chance)
    if (height > VX_BASE_Y + 10) {
      const oreRoll = _vxHash2(x, z, vxConfig.seed + 77);
      if (oreRoll > 0.97) {
        // Coal ore
        const oreY = height - VISIBLE_DEPTH;
        let oreArr = bucket.get(VX_BLOCK_COLORS[15]);
        if (!oreArr) { oreArr = []; bucket.set(VX_BLOCK_COLORS[15], oreArr); }
        oreArr.push({ cx, cy: oreY + 0.5, cz, sx: 1, sy: 1, sz: 1 });
      } else if (oreRoll > 0.95) {
        // Iron ore
        const oreY = height - VISIBLE_DEPTH;
        let oreArr = bucket.get(VX_BLOCK_COLORS[16]);
        if (!oreArr) { oreArr = []; bucket.set(VX_BLOCK_COLORS[16], oreArr); }
        oreArr.push({ cx, cy: oreY + 0.5, cz, sx: 1, sy: 1, sz: 1 });
      }
    }

    // Trees scatter — individual trunk blocks + leaf cube
    const treeDensity = _vxTreeDensity(biome);
    if (_vxTreeAllowed(biome) && height >= VX_SEA_Y &&
        _vxHash2(x, z, vxConfig.seed + 31) < treeDensity) {

      // Vary tree height by biome
      let baseH = 4, varH = 2;
      if (biome === 'Jungle') { baseH = 6; varH = 4; }
      else if (biome === 'Taiga') { baseH = 5; varH = 3; }
      const trunkH = baseH + Math.floor(_vxHash2(x, z, vxConfig.seed + 53) * varH);

      // Biome-specific trunk color — render as individual blocks
      const trunkColor = _vxTrunkColor(biome);
      let trunkArr = bucket.get(trunkColor);
      if (!trunkArr) { trunkArr = []; bucket.set(trunkColor, trunkArr); }

      // Individual trunk blocks (authentic look)
      for (let ty = 1; ty <= trunkH; ty++) {
        trunkArr.push({ cx, cy: height + ty + 0.5, cz, sx: 1, sy: 1, sz: 1 });
      }

      // Biome-specific leaf color and canopy
      const leafColor = _vxTreeColor(biome);
      let leafArr = bucket.get(leafColor);
      if (!leafArr) { leafArr = []; bucket.set(leafColor, leafArr); }

      // Canopy as a cluster of leaf blocks (more authentic)
      const canopyY = height + trunkH + 1;
      let canopyR = 2;
      if (biome === 'Taiga') canopyR = 1;
      else if (biome === 'Jungle') canopyR = 2;
      else if (biome === 'Savanna') canopyR = 3;

      // Render leaf blocks in a rough sphere/dome shape
      for (let lx = -canopyR; lx <= canopyR; lx++) {
        for (let lz = -canopyR; lz <= canopyR; lz++) {
          for (let ly = 0; ly <= 2; ly++) {
            const dist = Math.abs(lx) + Math.abs(lz) + ly;
            // Skip corners for rounder shape
            if (dist > canopyR + 1) continue;
            // Random holes for natural look
            if (_vxHash2(x + lx, z + lz, vxConfig.seed + ly + 99) > 0.75) continue;

            leafArr.push({
              cx: cx + lx, cy: canopyY + ly + 0.5, cz: cz + lz,
              sx: 1, sy: 1, sz: 1
            });
          }
        }
      }
    }
  }

  function _vxGenerateWorld() {
    if (vxGenerated) return;
    vxGenerated = true;

    // Clear caches from any previous generation (seed change, reset).
    _vxHeightCache.clear();
    _vxBiomeCache.clear();

    const worldMinX = -VX_RADIUS, worldMaxX = VX_RADIUS;
    const worldMinZ = -VX_RADIUS, worldMaxZ = VX_RADIUS;

    // Upload as one terrain chunk to avoid exposed vertical seam walls from
    // per-chunk boundary culling (the native mesher currently treats chunk
    // borders as air).
    const CXSZ = (worldMaxX - worldMinX);
    const CZSZ = (worldMaxZ - worldMinZ);
    const CY_ORIGIN = VX_BASE_Y - 5;   // world-y origin of each chunk
    const CY_HEIGHT = 50;              // covers y 55..104, above any tree

    for (let cx = worldMinX; cx < worldMaxX; cx += CXSZ) {
      for (let cz = worldMinZ; cz < worldMaxZ; cz += CZSZ) {
        const sx = Math.min(CXSZ, worldMaxX - cx);
        const sz = Math.min(CZSZ, worldMaxZ - cz);
        const sy = CY_HEIGHT;

        // Pack block ids into a flat Uint8Array (x fastest, z slowest).
        const blocks = new Uint8Array(sx * sy * sz);
        const colorToId = new Map();
        let nextId = 1;
        let hasBlocks = false;

        for (let lz = 0; lz < sz; lz++) {
          for (let ly = 0; ly < sy; ly++) {
            for (let lx = 0; lx < sx; lx++) {
              const color = _vxBlockColorAt(cx + lx, CY_ORIGIN + ly, cz + lz);
              if (color !== 0) {
                let id = colorToId.get(color);
                if (id === undefined) { id = nextId++; colorToId.set(color, id); }
                blocks[lx + sx * ly + sx * sy * lz] = id;
                hasBlocks = true;
              }
            }
          }
        }

        if (!hasBlocks) continue;

        const palette = {};
        for (const [color, id] of colorToId) palette[String(id)] = color;

        const result = call('voxel.uploadChunk', {
          origin: [cx, CY_ORIGIN, cz],
          size:   [sx, sy, sz],
          blocks: Array.from(blocks),
          palette,
        });
        if (result && result.handle) vxChunkHandles.push(result.handle);
      }
    }

    // Water plane with semi-transparency for better visual parity
    vxWaterMesh = createPlane(VX_RADIUS * 2, VX_RADIUS * 2, VX_BLOCK_COLORS[5],
      [0, VX_SEA_Y + 0.05, 0], {
        material: 'standard',
        roughness: 0.15,
        metallic: 0.4,
        opacity: 0.75,
        transparent: true,
      });
    // Fog is set by each cart's init() — do not override it here.
  }

  function configureVoxelWorld(opts) {
    if (opts && typeof opts === 'object') Object.assign(vxConfig, opts);
    // Update seed-dependent values if seed changed
    if (opts && opts.seed != null) {
      _vxNoise = _vxCreateSimplexNoise(vxConfig.seed | 0);
      _vxHeightCache.clear();
      _vxBiomeCache.clear();
      vxGenerated = false; // Force regeneration on next load
    }
  }
  function enableVoxelTextures(_b) { /* visual only — flat colours for now */ }
  function getVoxelConfig() { return Object.assign({}, vxConfig); }
  function getVoxelBiome(x, z) { return _vxBiomeAt(x | 0, z | 0); }

  function getVoxelHighestBlock(x, z) {
    const xi = x | 0, zi = z | 0;
    const baseH = _vxHeightAtCached(xi, zi);
    for (let y = baseH + 32; y > baseH; y--) {
      if (vxBlocks.has(_vxKey(xi, y, zi))) return y;
    }
    return baseH;
  }

  function getVoxelBlock(x, y, z) {
    const xi = x | 0, yi = y | 0, zi = z | 0;
    const k = _vxKey(xi, yi, zi);
    if (vxBlocks.has(k)) return vxBlocks.get(k).id;
    const baseH = _vxHeightAt(xi, zi);
    if (yi < VX_BASE_Y) return 3;
    if (yi <= baseH) {
      const biome = _vxBiomeAt(xi, zi);
      return _vxSurfaceFor(biome).id;
    }
    return 0;
  }

  function setVoxelBlock(x, y, z, id) {
    const xi = x | 0, yi = y | 0, zi = z | 0;
    const k = _vxKey(xi, yi, zi);
    const existing = vxBlocks.get(k);
    if (existing && existing.mesh) {
      removeMesh(existing.mesh);
      vxBlocks.delete(k);
    }
    if (!id) return;
    const color = VX_BLOCK_COLORS[id] || 0x888888;
    const mesh = createCube(1, color, [xi + 0.5, yi + 0.5, zi + 0.5],
      { material: 'standard', roughness: 0.85 });
    vxBlocks.set(k, { id, mesh });
  }

  function loadVoxelWorld(_name) { _vxGenerateWorld(); return true; }
  function forceLoadVoxelChunks(_cx, _cz) { _vxGenerateWorld(); }
  function updateVoxelWorld(_x, _z) { _vxGenerateWorld(); }

  function resetVoxelWorld() {
    // Destroy native chunk meshes from voxel.uploadChunk path.
    for (const h of vxChunkHandles) {
      if (h) call('mesh.destroy', { handle: h });
    }
    vxChunkHandles.length = 0;
    // Legacy multimesh cleanup (may be empty in new path).
    for (const mm of vxMultimeshes) {
      const h = _resolveInstanceHandle(mm);
      if (h) call('mesh.destroy', { handle: h });
    }
    vxMultimeshes.length = 0;
    if (vxWaterMesh) { removeMesh(vxWaterMesh); vxWaterMesh = 0; }
    for (const v of vxBlocks.values()) if (v.mesh) removeMesh(v.mesh);
    vxBlocks.clear();
    for (const e of vxEntities) if (e.mesh) removeMesh(e.mesh);
    vxEntities.length = 0;
    _vxHeightCache.clear();
    _vxBiomeCache.clear();
    vxGenerated = false;
  }
  function saveVoxelWorld(_name) { return true; }
  function setVoxelDayTime(t) {
    // Mirror the web engine: t in [0,1], noon=0.25.
    // Set DirectionalLight (sun) elevation and ambient energy so the
    // Godot scene brightness matches the Three.js renderer.
    ensureInit();
    const angle = (t || 0) * Math.PI * 2;
    const brightness = Math.max(0.15, Math.sin(angle) * 0.5 + 0.5); // 0.15..1.0
    // Sun pitch: highest at noon (t=0.25), below horizon at night.
    const sunPitch = Math.sin(angle) * 60; // degrees, -60..+60
    // Sky background color changes with time (matches minecraft-demo getSkyColorForTime)
    const dayPhase = brightness;
    const skyR = (10 + 125 * dayPhase) / 255;
    const skyG = (10 + 196 * dayPhase) / 255;
    const skyB = (20 + 215 * dayPhase) / 255;
    const skyHex = (Math.round(skyR * 255) << 16) | (Math.round(skyG * 255) << 8) | Math.round(skyB * 255);
    const skyC = colorFromHex(skyHex);
    // Update environment: background colour, sun, ambient.
    call('env.set', {
      background:    skyC,
      fog:           true,
      fogColor:      skyC,
      ambient:       skyC,
      ambientEnergy: 0.4 + 0.6 * brightness,
    });
    call('light.setSun', {
      pitch:  sunPitch,
      yaw:    -45,
      energy: 0.3 + 1.0 * brightness,
      color:  brightness > 0.5
                ? { r: 1.0, g: 0.95, b: 0.85, a: 1 }   // warm daylight
                : { r: 0.6, g: 0.65, b: 0.9,  a: 1 },  // cool twilight
    });
  }

  // Swept AABB vs heightmap + sparse placed blocks. The cart treats the
  // velocity as already-scaled per frame and passes dt=1.0; we honour
  // the dt scale so callers using per-second velocities still work.
  function moveVoxelEntity(pos, vel, size, dt) {
    const dts = typeof dt === 'number' ? dt : 1.0;
    const px = pos[0] || 0, py = pos[1] || 0, pz = pos[2] || 0;
    const dx = (vel[0] || 0) * dts;
    const dy = (vel[1] || 0) * dts;
    const dz = (vel[2] || 0) * dts;
    const sx = (size && size[0]) || 0.6;
    const sy = (size && size[1]) || 1.8;
    const sz = (size && size[2]) || 0.6;
    let nx = px + dx, ny = py + dy, nz = pz + dz;
    let grounded = false;
    // Heightmap floor: highest column height under the entity's footprint.
    const hx = sx * 0.5, hz = sz * 0.5;
    let floorY = -Infinity;
    for (let ix = Math.floor(nx - hx); ix <= Math.floor(nx + hx); ix++) {
      for (let iz = Math.floor(nz - hz); iz <= Math.floor(nz + hz); iz++) {
        const h = getVoxelHighestBlock(ix, iz) + 1;
        if (h > floorY) floorY = h;
      }
    }
    if (ny < floorY) { ny = floorY; grounded = true; }
    // Sparse placed-block test.
    if (vxBlocks.size > 0) {
      for (const k of vxBlocks.keys()) {
        const parts = k.split(',');
        const bx = +parts[0], by = +parts[1], bz = +parts[2];
        if (nx + hx > bx && nx - hx < bx + 1 &&
            nz + hz > bz && nz - hz < bz + 1 &&
            ny < by + 1 && ny + sy > by) {
          if ((vel[1] || 0) <= 0 && py >= by + 1) { ny = by + 1; grounded = true; }
        }
      }
    }
    return {
      position: [nx, ny, nz],
      velocity: [grounded && dy < 0 ? 0 : (vel[0] || 0),
                 grounded ? 0 : (vel[1] || 0),
                 grounded && dy < 0 ? 0 : (vel[2] || 0)],
      grounded,
      inWater: ny < VX_SEA_Y + 1,
    };
  }

  function checkVoxelCollision(pos, _halfSize) {
    const x = pos[0] || 0, y = pos[1] || 0, z = pos[2] || 0;
    return getVoxelBlock(Math.floor(x), Math.floor(y), Math.floor(z)) !== 0;
  }

  // DDA voxel ray traversal (uses heightmap-aware getVoxelBlock).
  function raycastVoxelBlock(origin, dir, maxDist) {
    const ox = origin[0] || 0, oy = origin[1] || 0, oz = origin[2] || 0;
    const dx = dir[0] || 0, dy = dir[1] || 0, dz = dir[2] || 0;
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tMaxX = dx !== 0 ? ((dx > 0 ? (x + 1 - ox) : (ox - x)) / Math.abs(dx)) : Infinity;
    let tMaxY = dy !== 0 ? ((dy > 0 ? (y + 1 - oy) : (oy - y)) / Math.abs(dy)) : Infinity;
    let tMaxZ = dz !== 0 ? ((dz > 0 ? (z + 1 - oz) : (oz - z)) / Math.abs(dz)) : Infinity;
    let lastAxis = -1, traveled = 0;
    const maxD = typeof maxDist === 'number' ? maxDist : 6;
    for (let i = 0; i < 256 && traveled < maxD; i++) {
      const block = getVoxelBlock(x, y, z);
      if (block !== 0) {
        const adj = [x, y, z];
        if (lastAxis === 0) adj[0] -= stepX;
        else if (lastAxis === 1) adj[1] -= stepY;
        else if (lastAxis === 2) adj[2] -= stepZ;
        return { hit: true, position: [x, y, z], adjacent: adj, block };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; traveled = tMaxX; tMaxX += tDeltaX; lastAxis = 0; }
      else if (tMaxY < tMaxZ)               { y += stepY; traveled = tMaxY; tMaxY += tDeltaY; lastAxis = 1; }
      else                                  { z += stepZ; traveled = tMaxZ; tMaxZ += tDeltaZ; lastAxis = 2; }
    }
    return { hit: false };
  }

  function spawnVoxelEntity(opts) {
    opts = opts || {};
    const size = opts.size || [0.8, 0.8, 0.8];
    const x = opts.x || 0;
    const z = opts.z || 0;
    const y = opts.y == null ? getVoxelHighestBlock(x | 0, z | 0) + 2 : opts.y;
    const color = opts.color != null ? opts.color : 0xffaaaa;
    const mesh = createCube(1, color, [x, y, z], { material: 'standard' });
    if (mesh && typeof setScale === 'function') setScale(mesh, size[0], size[1], size[2]);
    const ent = {
      id: vxEntities.length + 1,
      type: opts.type || 'entity',
      x, y, z, vx: 0, vy: 0, vz: 0,
      mesh, onGround: false, data: {},
      health: opts.health == null ? 10 : opts.health,
      size,
    };
    vxEntities.push(ent);
    return ent;
  }
  function updateVoxelEntities(dt) {
    const dts = typeof dt === 'number' ? dt : 1 / 60;
    for (const ent of vxEntities) {
      ent.vy -= 9.8 * dts;
      ent.x += ent.vx * dts;
      ent.y += ent.vy * dts;
      ent.z += ent.vz * dts;
      const sy = (ent.size && ent.size[1]) || 0.8;
      const floor = getVoxelHighestBlock(ent.x | 0, ent.z | 0) + sy * 0.5 + 0.5;
      if (ent.y < floor) { ent.y = floor; ent.vy = 0; ent.onGround = true; }
      else ent.onGround = false;
      if (ent.mesh) setPosition(ent.mesh, ent.x, ent.y, ent.z);
    }
  }
  function getVoxelEntityCount() { return vxEntities.length; }
  function cleanupVoxelEntities(centerX, centerZ, radius) {
    const r = typeof radius === 'number' ? radius : 64;
    const r2 = r * r;
    const cx = centerX || 0, cz = centerZ || 0;
    for (let i = vxEntities.length - 1; i >= 0; i--) {
      const e = vxEntities[i];
      const ddx = e.x - cx, ddz = e.z - cz;
      if (ddx * ddx + ddz * ddz > r2) {
        if (e.mesh) removeMesh(e.mesh);
        vxEntities.splice(i, 1);
      }
    }
  }
  // Legacy aliases for older voxel API names (some demos still call these).
  function setVoxel(x, y, z, id) { setVoxelBlock(x, y, z, id); }
  function getVoxel(x, y, z) { return getVoxelBlock(x, y, z); }
  function clearVoxels() { resetVoxelWorld(); }
  function generateVoxelTerrain(_opts) { _vxGenerateWorld(); }

  // Storage / i18n / WAD / hype / NFT / XR — shallow no-ops.
  const storageNs = {
    save(_k, _v) { warnOnce('storage.save'); },
    load(_k, fallback) { return fallback === undefined ? null : fallback; },
    remove(_k) { warnOnce('storage.remove'); },
    clear() { warnOnce('storage.clear'); },
  };
  // i18n state — populated by applyCartMeta() from meta.text.
  const i18nState = {
    defaultLocale: 'en',
    activeLocale: 'en',
    strings: Object.create(null),
    locales: Object.create(null),
  };
  const i18nNs = {
    setLocale(l) { if (typeof l === 'string') i18nState.activeLocale = l; },
    t(key, fallback) {
      if (typeof key !== 'string') return fallback != null ? fallback : '';
      const al = i18nState.activeLocale;
      if (al && al !== i18nState.defaultLocale) {
        const lt = i18nState.locales && i18nState.locales[al];
        if (lt && key in lt) return lt[key];
      }
      if (key in i18nState.strings) return i18nState.strings[key];
      return fallback != null ? fallback : key;
    },
    getLocale() { return i18nState.activeLocale; },
  };
  const wadNs = {
    load(_path) { warnOnce('wad.load'); return null; },
    get(_path) { return null; },
  };

  // Browser-ish scheduler shims. We don't actually defer; the cart still
  // boots, and most demos only use setTimeout for one-off setup.
  let _timerId = 1;
  function setTimeout_(_fn, _ms) { warnOnce('setTimeout'); return _timerId++; }
  function setInterval_(_fn, _ms) { warnOnce('setInterval'); return _timerId++; }
  function clearTimeout_(_id) { /* no-op */ }
  function clearInterval_(_id) { /* no-op */ }
  function requestAnimationFrame_(_fn) { warnOnce('requestAnimationFrame'); return _timerId++; }
  function cancelAnimationFrame_(_id) { /* no-op */ }

  // Extra input stubs — kept for cart code that still imports the old names.
  const buttonState = { a: false, b: false, x: false, y: false, l: false, r: false, start: false, select: false };
  const padNs = {
    button(i, _b) { return btn(i); },
    axis(_i, _a) { return 0; },
    isConnected(_i) { return gamepadConnected(); },
    leftX:  leftStickX,
    leftY:  leftStickY,
    rightX: rightStickX,
    rightY: rightStickY,
  };
  const mouseNs = {
    get x() { return mouseX(); },
    get y() { return mouseY(); },
    isDown(_b) { return mouseDown(); },
    wasPressed(_b) { return mousePressed(); },
  };

  // Misc free helpers some carts grab off globalThis.
  function rand(min, max) {
    if (max == null) { max = min; min = 0; }
    return min + Math.random() * ((max == null ? 1 : max) - min);
  }
  function randInt(min, max) { return Math.floor(rand(min, max)); }
  function choose(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined; }


  // ---------------- namespace + global aliases -------------------------
  const defaultUiColors = {
    primary: 0x4a90e2, secondary: 0x9b9b9b, light: 0xeeeeee, dark: 0x222222,
    success: 0x4caf50, warning: 0xffb300, danger: 0xe53935,
    white: 0xffffff, black: 0x000000, accent: 0xff8800,
  };
  if (typeof global.uiColors === 'undefined') global.uiColors = defaultUiColors;
  const sceneNs = { createCube, createSphere, createPlane, createCylinder, createCone, createTorus, createAdvancedCube, createAdvancedSphere, createCapsule, removeMesh, destroyMesh: removeMesh, setPosition, setRotation, rotateMesh, moveMesh, setScale, getPosition, getMesh: function() { return null; }, createInstancedMesh, setInstanceTransform, setInstancePosition, setInstanceColor, finalizeInstances, setMeshVisible, setMeshOpacity: function(h, o) { setMeshVisible(h, o > 0); }, setCastShadow: function() {}, setReceiveShadow: function() {}, setFlatShading: function() {}, setPBRProperties: function() {}, createLODMesh: function() { return null; }, removeLODMesh: function() {}, updateLODs: function() {}, removeInstancedMesh: removeMesh, raycastFromCamera: function() { return null; }, get3DStats: function() { return {}; }, getRenderer: function() { return null; }, getScene: function() { return null; }, getRotation: function() { return [0, 0, 0]; }, engine: global.engine };
  const cameraNs = { setCameraPosition, setCameraTarget, setCameraFOV, setCameraLookAt };
  const lightNs = { setLightDirection, setFog, clearFog, createPointLight, createSpotLight, createAmbientLight, setAmbientLight, setLightColor, setLightEnergy };
  const drawNs = { cls, print: novaPrint, printCentered, printRight, rect, rectfill, line, pixel, pset, circle, circfill, ellipse, arc, bezier, drawRect, drawPanel, drawGlowText, drawGlowTextCentered, drawRadialGradient, drawGradient, drawProgressBar, drawHealthBar, drawPixelBorder, drawCrosshair, drawScanlines, drawNoise, drawTriangle, drawDiamond, drawStarburst, poly, rgba8, screenWidth, screenHeight, colorLerp, colorMix, hslColor, hexColor: function(hex, alpha) { return colorFromHex(hex, alpha); }, n64Palette, measureText, scrollingText, drawWave, drawPulsingText, drawCheckerboard, drawFloatingTexts, drawFloatingTexts3D, createMinimap, drawMinimap, drawSkyGradient };
  const inputNs = {
    // raw key code surface (web-style codes)
    key, keyp, isKeyDown, isKeyPressed,
    // indexed buttons (KEYMAP[0..15])
    btn, btnp,
    // mouse
    mouseX, mouseY, mouseDown, mousePressed,
    // gamepad
    gamepadAxis, gamepadConnected,
    leftStickX, leftStickY, rightStickX, rightStickY,
    // grouped object accessors used by some carts
    pad: padNs, mouse: mouseNs,
    // host hooks
    pollInput,
  };
  const fxNs = { enablePixelation, enableDithering, enableBloom, setBloomStrength, enableFXAA, enableChromaticAberration, enableVignette, setN64Mode, setPSXMode, enableRetroEffects, isEffectsEnabled, enableSSR, enableSSAO, enableVolumetricFog, enableDOF, setExposure, setTonemap, setColorAdjustment };
  const uiNs = { createButton, createLabel, createPanel, createSlider, createCheckbox, createDialog, clearButtons, updateAllButtons, drawAllButtons, drawGradientRect, drawPanel, drawText, drawTextShadow, drawTextOutline, setFont, setTextAlign, setTextBaseline, grid, parseCanvasUI, renderCanvasUI, updateCanvasUI, uiColors: global.uiColors, centerX: function (w) { return Math.floor((640 - (w || 0)) / 2); }, centerY: function (h) { return Math.floor((360 - (h || 0)) / 2); }, Screen: (function() { function Screen() { this.data = {}; } Screen.prototype.enter = function(d) { this.data = Object.assign({}, this.data, d || {}); }; Screen.prototype.exit = function() {}; Screen.prototype.update = function() {}; Screen.prototype.draw = function() {}; return Screen; }()), getFont: function() { return 'default'; }, uiProgressBar: drawProgressBar };
  const stageNs = { createGraphicsNode, createMovieClip, createStage, createScreen, pushScreen, popScreen,
    createShake, triggerShake, updateShake, getShakeOffset,
    createCard, createMenu, createStartScreen };
  const particlesNs = { createParticleSystem, createEmitter2D, createParticles };
  const skyboxNs = { createSpaceSkybox, createGalaxySkybox, createSunsetSkybox, createDawnSkybox, createNightSkybox, createFoggySkybox, createDuskSkybox, createStormSkybox, createAlienSkybox, createUnderwaterSkybox, setSkybox, createSkybox };
  const modelsNs = { loadModel, createTexture, loadTexture, createInstancedMesh, createTSLMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial, createAdvancedCube };
  const voxelNs = {
    configureVoxelWorld, enableVoxelTextures, getVoxelConfig, getVoxelBiome,
    getVoxelHighestBlock, getVoxelBlock, setVoxelBlock, loadVoxelWorld,
    forceLoadVoxelChunks, updateVoxelWorld, resetVoxelWorld, saveVoxelWorld,
    setVoxelDayTime, moveVoxelEntity, checkVoxelCollision, raycastVoxelBlock,
    spawnVoxelEntity, updateVoxelEntities, getVoxelEntityCount, cleanupVoxelEntities,
    setVoxel, getVoxel, clearVoxels, generateVoxelTerrain,
    // Block type constants for cart parity
    BLOCK_TYPES: VX_BLOCK_TYPES,
  };

  // Carts that go beyond the explicit lists above destructure things like
  // `nova64.shader.createTSLMaterial`, `nova64.voxel.simplexNoise2D`,
  // `nova64.physics.aabb`, etc. Provide top-level namespace objects with
  // a few real impls (where we have them) and let the namespace proxy
  // turn everything else into a named no-op.
  const shaderBacking = { createTSLMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial };
  const physicsBacking = {};
  const dataBacking = {
    t: function (key) { return key; },
    saveData: function (_k, _v) {},
    loadData: function (_k, fallback) { return fallback === undefined ? null : fallback; },
    deleteData: function (_k) {},
    remove: function (_k) {},
    createGameStore: createGameStore,
    novaStore: novaStore,
  };

  // Augment a few namespaces with extra known names cart code expects.
  // (Real impls already exist above; we just publish more aliases.)
  drawNs.BM = { add: 0, multiply: 1, screen: 2, alpha: 3 };
  drawNs.withBlend = function (_mode, fn) { if (typeof fn === 'function') fn(makeStub()); };

  utilNs.color = function (r, g, b, a) { return rgba8((r || 0) * 255 | 0, (g || 0) * 255 | 0, (b || 0) * 255 | 0, a == null ? 255 : (a * 255 | 0)); };
  utilNs.flowField = flowField;
  utilNs.pushMatrix = pushMatrix;
  utilNs.popMatrix = popMatrix;
  utilNs.translate = translate;
  // 2D matrix rotate (single arg). Carts that need the point-rotation
  // helper can call utilNs.rotatePoint directly.
  utilNs.rotate = rotateMtx;
  utilNs.scale = scaleMtx;
  utilNs.rotatePoint = function (x, y, ang) { const c = Math.cos(ang), s = Math.sin(ang); return [x * c - y * s, x * s + y * c]; };
  utilNs.smoothstep = function (a, b, t) {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a || 1)));
    return x * x * (3 - 2 * x);
  };
  utilNs.pulse = function (t, freq) { return 0.5 + 0.5 * Math.sin((t || 0) * (freq || 1) * TWO_PI); };
  utilNs.remap = function (v, a, b, c, d) { return c + (d - c) * ((v - a) / (b - a || 1)); };
  utilNs.bezier = function (a, b, c, d, t) {
    const it = 1 - t;
    return it * it * it * a + 3 * it * it * t * b + 3 * it * t * t * c + t * t * t * d;
  };
  utilNs.arc = function (cx, cy, r, ang) { return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]; };
  utilNs.ellipse = function (cx, cy, rx, ry, ang) { return [cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]; };


  // Voxel namespace gets simplex helpers (alias of shim's noise).
  voxelNs.simplexNoise2D = function (x, y, octaves, persistence, lacunarity, scale) {
    return fbmNoise(x, y, 0, octaves, persistence, lacunarity, scale);
  };
  voxelNs.simplexNoise3D = function (x, y, z, octaves, persistence, lacunarity, scale) {
    return fbmNoise(x, y, z, octaves, persistence, lacunarity, scale);
  };

  // Tween namespace is fully wired (createTween, updateTweens, killAllTweens already on tweenNs).
  // util namespace: add gameutils
  utilNs.createShake = createShake;
  utilNs.triggerShake = triggerShake;
  utilNs.updateShake = updateShake;
  utilNs.getShakeOffset = getShakeOffset;
  utilNs.createCooldown = createCooldown;
  utilNs.useCooldown = useCooldown;
  utilNs.cooldownReady = cooldownReady;
  utilNs.cooldownProgress = cooldownProgress;
  utilNs.updateCooldown = updateCooldown;
  utilNs.createCooldownSet = createCooldownSet;
  utilNs.updateCooldowns = updateCooldowns;
  utilNs.createHitState = createHitState;
  utilNs.triggerHit = triggerHit;
  utilNs.isInvulnerable = isInvulnerable;
  utilNs.isVisible = isVisible;
  utilNs.isFlashing = isFlashing;
  utilNs.updateHitState = updateHitState;
  utilNs.createSpawner = createSpawner;
  utilNs.updateSpawner = updateSpawner;
  utilNs.triggerWave = triggerWave;
  utilNs.getSpawnerWave = getSpawnerWave;
  utilNs.createPool = createPool;
  utilNs.createFloatingTextSystem = createFloatingTextSystem;
  utilNs.createStateMachine = createStateMachine;
  utilNs.createTimer = createTimer;
  utilNs.createGameStore = createGameStore;
  utilNs.novaStore = novaStore;

  // Wrap every namespace so missing properties become named no-ops instead
  // of TypeErrors at destructure time.
  const sceneNsP = wrapNamespace('scene', sceneNs);
  const cameraNsP = wrapNamespace('camera', cameraNs);
  const lightNsP = wrapNamespace('light', lightNs);
  const drawNsP = wrapNamespace('draw', drawNs);
  const inputNsP = wrapNamespace('input', inputNs);
  const fxNsP = wrapNamespace('fx', fxNs);
  const utilNsP = wrapNamespace('util', utilNs);
  const audioNsP = wrapNamespace('audio', audioNs);
  const tweenNsP = wrapNamespace('tween', tweenNs);
  const uiNsP = wrapNamespace('ui', uiNs);
  const stageNsP = wrapNamespace('stage', stageNs);
  const particlesNsP = wrapNamespace('particles', particlesNs);
  const skyboxNsP = wrapNamespace('skybox', skyboxNs);
  const modelsNsP = wrapNamespace('models', modelsNs);
  const voxelNsP = wrapNamespace('voxel', voxelNs);
  const shaderNsP = wrapNamespace('shader', shaderBacking);
  const physicsNsP = wrapNamespace('physics', physicsBacking);
  const dataNsP = wrapNamespace('data', dataBacking);
  const storageNsP = wrapNamespace('storage', storageNs);
  const i18nNsP = wrapNamespace('i18n', i18nNs);
  const wadNsP = wrapNamespace('wad', wadNs);

  global.nova64 = {
    __compatLoaded: true,
    scene: sceneNsP,
    camera: cameraNsP,
    light: lightNsP,
    draw: drawNsP,
    input: inputNsP,
    effects: fxNsP,
    fx: fxNsP,
    util: utilNsP,
    audio: audioNsP,
    tween: tweenNsP,
    ui: uiNsP,
    stage: stageNsP,
    particles: particlesNsP,
    skybox: skyboxNsP,
    models: modelsNsP,
    voxel: voxelNsP,
    shader: shaderNsP,
    physics: physicsNsP,
    data: dataNsP,
    storage: storageNsP,
    i18n: i18nNsP,
    wad: wadNsP,
  };

  // Flat-global aliases so older carts that don't destructure still work.
  Object.assign(global, sceneNs, cameraNs, lightNs, drawNs, inputNs, fxNs, utilNs, audioNs, tweenNs,
    uiNs, stageNs, particlesNs, skyboxNs, modelsNs, voxelNs);
  global.get3DStats = get3DStats;
  global.rand = rand;
  global.randInt = randInt;
  global.choose = choose;
  global.storage = storageNsP;
  global.i18n = i18nNsP;
  global.wad = wadNsP;
  // Some carts use bare `engine` as the bridge handle.
  if (!global.engine) global.engine = engine;

  // Browser-ish globals so demos that reach for them don't ReferenceError.
  if (!global.setTimeout) global.setTimeout = setTimeout_;
  if (!global.setInterval) global.setInterval = setInterval_;
  if (!global.clearTimeout) global.clearTimeout = clearTimeout_;
  if (!global.clearInterval) global.clearInterval = clearInterval_;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = requestAnimationFrame_;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = cancelAnimationFrame_;
  if (!global.performance) global.performance = { now: function () { return Date.now(); } };
  if (!global.window) global.window = global;

  // Minecraft-demo (and similar) call `globalThis.setClearColor?.(hexColor)` to
  // synchronise the clear colour with the day-time sky.  Wire that to env.set.
  global.setClearColor = function (hexColor) {
    ensureInit();
    const c = colorFromHex(typeof hexColor === 'number' ? hexColor : 0x87ceeb);
    call('env.set', { background: c });
  };

  // `console` polyfill for carts that use console.log
  if (!global.console) {
    global.console = {
      log: function () { print.apply(null, arguments); },
      warn: function () { print.apply(null, arguments); },
      error: function () { print.apply(null, arguments); },
    };
  }

  // Bare-global fallback. Earlier versions tried to install a Proxy as
  // globalThis's prototype to auto-resolve any unknown identifier, but that
  // tripped intermittent QuickJS GC crashes during cart shutdown. Instead,
  // explicitly publish no-op stubs for every bare-global name we've seen
  // ported carts use. Adding a missing one is cheap; the smoke runner will
  // surface it as a `[nova64] cart …: ReferenceError` so we know.
  const flatStubNames = [
    // 2D draw helpers carts call as bare globals.
    'drawText', 'drawTextShadow', 'drawTextOutline', 'drawGradientRect',
    'drawPanel', 'drawProgressBar', 'drawSprite', 'drawTile',
    'circfill', 'ellipsefill', 'trifill', 'spr', 'sspr',
    'scrollingText', 'drawWave', 'drawPulsingText', 'drawCheckerboard',
    'drawFloatingTexts', 'drawFloatingTexts3D', 'createMinimap', 'drawMinimap',
    'drawSkyGradient', 'measureText',
    'colorLerp', 'colorMix', 'hslColor', 'hexColor',
    // Input helpers some carts grab without destructuring.
    'getMouseX', 'getMouseY', 'mouseDown', 'isKeyDown',
    'getHandGesture', 'getHandLandmarks', 'initHandTracking',
    'showCameraBackground',
    // Mesh / scene helpers used bare in a few carts.
    'getMeshPosition', 'destroyMesh', 'clearScene', 'playAnimation',
    // FX / shader helpers used bare.
    'enableChromaticAberration', 'enableRetroEffects',
    'createTSLMaterial', 'createTSLShaderMaterial', 'createShaderMaterial',
    'updateShaderUniform', 'createParticleSystem', 'updateParticles',
    // UI helpers used bare.
    'drawAllButtons', 'updateAllButtons', 'createButton',
    // NOTE: updateTweens / killAllTweens now have real implementations installed
    // above, so they are NOT in flatStubNames (would override real impls).
    // Camera helpers used bare.
    'cam2DApply', 'cam2DPush', 'cam2DPop', 'cam2DReset',
    'setFont', 'setTextAlign', 'setTextBaseline',
    'setCamera', 'setCameraTarget', 'setCameraPosition',
    'setLookAt', 'lookAt',
  ];
  for (let i = 0; i < flatStubNames.length; i++) {
    const fname = flatStubNames[i];
    if (typeof global[fname] === 'undefined') {
      global[fname] = namedNoop('global', fname);
    }
  }
  // Layout helpers many carts use as `centerX(width)` to center on a 640x480
  // virtual canvas.
  if (typeof global.centerX === 'undefined') {
    global.centerX = function (w) { return Math.floor((640 - (w || 0)) / 2); };
  }
  if (typeof global.centerY === 'undefined') {
    global.centerY = function (h) { return Math.floor((480 - (h || 0)) / 2); };
  }
  // Minimal DOM stub. Some carts feature-test `typeof document !== 'undefined'`
  // before doing browser-only work; provide a stub that returns no-op stubs.
  if (typeof global.document === 'undefined') {
    global.document = makeStub();
  }
  if (typeof global.window === 'undefined') {
    global.window = global;
  }
  // Some carts read `mouseX`/`mouseY` as bare names; some call them as
  // functions (`mouseX()`). Use numeric-coercible callables so both shapes work.
  if (typeof global.mouseX === 'undefined') {
    const mxFn = function () { return 0; };
    mxFn[Symbol.toPrimitive] = function () { return 0; };
    global.mouseX = mxFn;
  }
  if (typeof global.mouseY === 'undefined') {
    const myFn = function () { return 0; };
    myFn[Symbol.toPrimitive] = function () { return 0; };
    global.mouseY = myFn;
  }
  // Style/colour palette objects some carts read fields off of.
  if (typeof global.uiColors === 'undefined') {
    global.uiColors = {
      primary: 0x4a90e2, secondary: 0x9b9b9b, light: 0xeeeeee, dark: 0x222222,
      success: 0x4caf50, warning: 0xffb300, danger: 0xe53935,
      white: 0xffffff, black: 0x000000, accent: 0xff8800,
    };
  }
  if (typeof global.hexColor === 'undefined') {
    global.hexColor = function (hex, alpha) { return colorFromHex(hex, alpha); };
  }
  // Install real implementations for bare-global draw helpers.
  // These run AFTER flatStubNames so they override the no-op stubs.
  global.colorLerp = colorLerp;
  global.colorMix = colorMix;
  global.hslColor = hslColor;
  global.n64Palette = n64Palette;
  global.measureText = measureText;
  global.scrollingText = scrollingText;
  global.drawWave = drawWave;
  global.drawPulsingText = drawPulsingText;
  global.drawCheckerboard = drawCheckerboard;
  global.drawFloatingTexts = drawFloatingTexts;
  global.drawFloatingTexts3D = drawFloatingTexts3D;
  global.createMinimap = createMinimap;
  global.drawMinimap = drawMinimap;
  global.drawSkyGradient = drawSkyGradient;
  global.setCameraLookAt = setCameraLookAt;
  global.setMeshVisible = setMeshVisible;
  global.moveMesh = moveMesh;
  global.getPosition = getPosition;
  // Game utilities as bare globals (carts that don't destructure nova64.util still work)
  global.createShake = createShake;
  global.triggerShake = triggerShake;
  global.updateShake = updateShake;
  global.getShakeOffset = getShakeOffset;
  global.createCooldown = createCooldown;
  global.useCooldown = useCooldown;
  global.cooldownReady = cooldownReady;
  global.cooldownProgress = cooldownProgress;
  global.updateCooldown = updateCooldown;
  global.createCooldownSet = createCooldownSet;
  global.updateCooldowns = updateCooldowns;
  global.createHitState = createHitState;
  global.triggerHit = triggerHit;
  global.isInvulnerable = isInvulnerable;
  global.isFlashing = isFlashing;
  global.updateHitState = updateHitState;
  global.createSpawner = createSpawner;
  global.updateSpawner = updateSpawner;
  global.triggerWave = triggerWave;
  global.getSpawnerWave = getSpawnerWave;
  global.createPool = createPool;
  global.createFloatingTextSystem = createFloatingTextSystem;
  global.createStateMachine = createStateMachine;
  global.createTimer = createTimer;
  global.createGameStore = createGameStore;
  global.novaStore = novaStore;
  global.updateTweens = updateTweens;
  global.killAllTweens = killAllTweens;
  global.Ease = Ease;

  // ---------------- meta.json processing -------------------------------
  // The host parses meta.json and exposes it as `globalThis.cart_meta` just
  // before each cart loads. We translate the cart-facing schema (clearColor,
  // fog, lighting, sky, skybox, effects, camera, text) onto the same env.set
  // payloads the runtime/manifest.js path uses in the browser, so the cart's
  // environment looks the way the author authored it without the cart having
  // to call setFog/setSkybox/setAmbientLight by hand.
  function parseMetaColor(v, alphaFallback) {
    if (v == null) return [0, 0, 0, 1];
    if (typeof v === 'string') {
      let s = v.trim();
      if (s.charAt(0) === '#') s = s.slice(1);
      if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
      const n = parseInt(s, 16);
      if (!isFinite(n)) return [0, 0, 0, 1];
      return colorFromHex(n, alphaFallback);
    }
    return colorFromHex(v, alphaFallback);
  }
  function applyCartMeta() {
    const meta = global.cart_meta;
    if (!meta || typeof meta !== 'object') return;
    ensureInit();

    // Text / i18n.
    if (meta.text && typeof meta.text === 'object') {
      i18nState.defaultLocale = typeof meta.text.defaultLocale === 'string'
        ? meta.text.defaultLocale : 'en';
      i18nState.activeLocale = i18nState.defaultLocale;
      i18nState.strings = (meta.text.strings && typeof meta.text.strings === 'object')
        ? meta.text.strings : Object.create(null);
      i18nState.locales = (meta.text.locales && typeof meta.text.locales === 'object')
        ? meta.text.locales : Object.create(null);
    }

    const d = meta.defaults;
    if (!d || typeof d !== 'object') return;

    // clearColor → solid background (overridden later if a sky preset exists).
    if (d.clearColor != null) {
      call('env.set', { background: parseMetaColor(d.clearColor) });
    }

    // sky / skybox → procedural sky preset + colors.
    function applySkyConfig(s) {
      if (s == null) return;
      if (typeof s === 'string') {
        call('env.set', { sky: true, skyPreset: s });
        return;
      }
      if (typeof s !== 'object') return;
      const payload = { sky: true };
      if (typeof s.preset === 'string') payload.skyPreset = s.preset;
      if (s.top) payload.skyTopColor = parseMetaColor(s.top);
      if (s.horizon) payload.skyHorizonColor = parseMetaColor(s.horizon);
      if (s.ground) payload.groundHorizonColor = parseMetaColor(s.ground);
      if (s.bottom) payload.groundBottomColor = parseMetaColor(s.bottom);
      if (s.color && payload.skyTopColor === undefined) {
        // Single-color sky — paint top + horizon the same.
        const c = parseMetaColor(s.color);
        payload.skyTopColor = c;
        payload.skyHorizonColor = c;
      }
      call('env.set', payload);
    }
    applySkyConfig(d.sky);
    applySkyConfig(d.skybox);

    // Lighting.
    if (d.lighting && typeof d.lighting === 'object') {
      const lp = {};
      if (d.lighting.ambient != null) lp.ambient = parseMetaColor(d.lighting.ambient);
      if (typeof d.lighting.ambientIntensity === 'number') {
        lp.ambientEnergy = d.lighting.ambientIntensity;
      }
      if (Object.keys(lp).length) call('env.set', lp);
      const dl = d.lighting.directional;
      if (dl && typeof dl === 'object') {
        if (Array.isArray(dl.direction)) {
          setLightDirection(dl.direction[0], dl.direction[1], dl.direction[2]);
        }
        if (dirLightHandle && dl.color != null) {
          call('light.setColor', {
            handle: dirLightHandle,
            color: parseMetaColor(dl.color),
          });
        }
        if (dirLightHandle && typeof dl.intensity === 'number') {
          call('light.setEnergy', { handle: dirLightHandle, energy: dl.intensity });
        }
      }
    }

    // Fog.
    if (d.fog && typeof d.fog === 'object') {
      const near = typeof d.fog.near === 'number' ? d.fog.near : 10;
      const far  = typeof d.fog.far  === 'number' ? d.fog.far  : 100;
      const span = Math.max(1, far - near);
      const payload = {
        fog: true,
        fogColor: parseMetaColor(d.fog.color != null ? d.fog.color : '#7090b0'),
        fogDensity: typeof d.fog.density === 'number' ? d.fog.density : (3.0 / span),
      };
      call('env.set', payload);
    } else if (d.fog === false) {
      call('env.set', { fog: false });
    }

    // Effects.
    if (d.effects && typeof d.effects === 'object') {
      const e = d.effects;
      if (e.bloom) {
        if (e.bloom === true) {
          enableBloom(true);
        } else if (typeof e.bloom === 'object') {
          const strength = e.bloom.strength != null ? e.bloom.strength
                          : (e.bloom.intensity != null ? e.bloom.intensity : true);
          enableBloom(strength, e.bloom.radius, e.bloom.threshold);
        }
      }
      if (typeof e.exposure === 'number') call('env.set', { exposure: e.exposure });
      if (typeof e.tonemap === 'string') call('env.set', { tonemap: e.tonemap });
      if (e.ssao) {
        if (e.ssao === true) call('env.set', { ssao: true });
        else if (typeof e.ssao === 'object') {
          call('env.set', {
            ssao: e.ssao.enabled !== false,
            ssaoIntensity: typeof e.ssao.intensity === 'number' ? e.ssao.intensity : 1.0,
          });
        }
      }
      if (e.ssr) {
        const enabled = e.ssr === true || (typeof e.ssr === 'object' && e.ssr.enabled !== false);
        call('env.set', { ssr: enabled });
      }
      if (e.volumetricFog) {
        if (e.volumetricFog === true) {
          call('env.set', { volumetricFog: true });
        } else if (typeof e.volumetricFog === 'object') {
          call('env.set', {
            volumetricFog: e.volumetricFog.enabled !== false,
            volumetricFogDensity: typeof e.volumetricFog.density === 'number'
              ? e.volumetricFog.density : 0.05,
          });
        }
      }
      if (typeof e.brightness === 'number'
          || typeof e.contrast === 'number'
          || typeof e.saturation === 'number') {
        call('env.set', {
          brightness: typeof e.brightness === 'number' ? e.brightness : 1.0,
          contrast:   typeof e.contrast   === 'number' ? e.contrast   : 1.0,
          saturation: typeof e.saturation === 'number' ? e.saturation : 1.0,
        });
      }
    }

    // Camera defaults.
    if (d.camera && typeof d.camera === 'object') {
      if (Array.isArray(d.camera.position)) {
        setCameraPosition(d.camera.position[0], d.camera.position[1], d.camera.position[2]);
      }
      if (Array.isArray(d.camera.target)) {
        setCameraTarget(d.camera.target[0], d.camera.target[1], d.camera.target[2]);
      }
      if (typeof d.camera.fov === 'number') setCameraFOV(d.camera.fov);
    }
  }
  // Host invokes this between setting `globalThis.cart_meta` and evaluating
  // the cart module, so the cart's init() sees an environment that already
  // matches its meta.json defaults.
  global.__nova64_applyCartMeta = applyCartMeta;

  print('[nova64-compat] shim loaded');
})(globalThis);
