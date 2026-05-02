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
    // Three.js linear fog → Godot's exponential fog. Approximate the
    // density from the (near, far) range so distant objects fade out.
    ensureInit();
    const c = colorFromHex(typeof color === 'number' ? color : 0x7090b0);
    const n = typeof near === 'number' ? near : 10;
    const f = typeof far === 'number' ? far : 100;
    const span = Math.max(1, f - n);
    call('env.set', { fog: true, fogColor: c, fogDensity: 3.0 / span });
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

  function rgba8(r, g, b, a) {
    a = a == null ? 255 : a;
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
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
  // accept both shapes.
  function drawPanel(x, y, w, h, optsOrFill, border) {
    let fill = 0x101822, brd = 0x6699cc;
    if (typeof optsOrFill === 'object' && optsOrFill !== null) {
      if (optsOrFill.fill != null) fill = optsOrFill.fill;
      if (optsOrFill.background != null) fill = optsOrFill.background;
      if (optsOrFill.border != null) brd = optsOrFill.border;
    } else if (typeof optsOrFill === 'number') {
      fill = optsOrFill;
      if (typeof border === 'number') brd = border;
    }
    rectfill(x, y, w, h, fill);
    rect(x, y, w, h, brd, false);
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
    // Vertical gradient via N horizontal slices.
    const t = colorFromHex(top == null ? 0xffffff : top);
    const b = colorFromHex(bottom == null ? 0x000000 : bottom);
    const STEPS = Math.max(1, Math.min(64, h | 0));
    const sh = h / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const k = i / Math.max(1, STEPS - 1);
      const col = [
        t[0] + (b[0] - t[0]) * k,
        t[1] + (b[1] - t[1]) * k,
        t[2] + (b[2] - t[2]) * k,
        t[3] + (b[3] - t[3]) * k,
      ];
      const p = __tx(x, y + i * sh);
      __ops.push(['rect', p[0] | 0, p[1] | 0,
        Math.max(0, w | 0), Math.max(1, Math.ceil(sh)),
        col, true]);
    }
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
  function drawTriangle(x0, y0, x1, y1, x2, y2, color, _filled) {
    // Outline only (overlay batch has no native triangle fill).
    line(x0, y0, x1, y1, color);
    line(x1, y1, x2, y2, color);
    line(x2, y2, x0, y0, color);
  }
  function drawDiamond(cx, cy, size, color, filled) {
    const s = size | 0;
    drawTriangle(cx, cy - s, cx + s, cy, cx - s, cy, color, filled);
    drawTriangle(cx, cy + s, cx + s, cy, cx - s, cy, color, filled);
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
    const code = KEYMAP[i | 0] || '';
    return !!keysHeld[code] || !!gpHeld[i | 0];
  }
  function btnp(i) {
    pollInput();
    const code = KEYMAP[i | 0] || '';
    const keyJust = !!keysHeld[code] && !keysPrev[code];
    const padJust = !!gpHeld[i | 0] && !gpPrev[i | 0];
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
  function getPosition(_handle) { return [0, 0, 0]; }

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

  // Tween stubs — return chainable no-op handles so `createTween(...).play()`
  // and `.tick(dt)` survive. value defaults to `from` so reads work.
  function createTween(opts) {
    warnOnce('tween.createTween');
    const o = opts || {};
    const t = {
      value: o.from == null ? 0 : o.from,
      pause() { return t; },
      play() { return t; },
      stop() { return t; },
      reset() { return t; },
      tick(_dt) { return t; },
      onComplete() { return t; },
    };
    return t;
  }
  const Ease = {
    linear: function (t) { return t; },
    easeIn: function (t) { return t * t; },
    easeOut: function (t) { return t * (2 - t); },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    easeOutBounce: function (t) {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
      if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
      t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
    },
  };
  const tweenNs = { createTween, Ease };

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

  // UI / canvas-ui
  function clearButtons() {}
  function updateAllButtons() { return false; }
  function drawAllButtons() {}
  function drawGradientRect() {}
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
  function createButton(_opts) { warnOnce('ui.createButton'); return makeStub(); }
  function createLabel(_opts) { warnOnce('ui.createLabel'); return makeStub(); }
  function createPanel(_opts) { warnOnce('ui.createPanel'); return makeStub(); }
  function createSlider(_opts) { warnOnce('ui.createSlider'); return makeStub({ value: 0 }); }
  function createCheckbox(_opts) { warnOnce('ui.createCheckbox'); return makeStub({ checked: false }); }
  function createDialog(_opts) { warnOnce('ui.createDialog'); return makeStub(); }
  function parseCanvasUI(_src) { warnOnce('canvas-ui.parse'); return makeStub(); }
  function renderCanvasUI(_root) { warnOnce('canvas-ui.render'); }
  function updateCanvasUI(_root, _dt) { warnOnce('canvas-ui.update'); }

  // Stage / screens / movie clip / graphics nodes
  function createGraphicsNode(_opts) { warnOnce('createGraphicsNode'); return makeStub(); }
  function createMovieClip(_opts) { warnOnce('createMovieClip'); return makeStub({ currentFrame: 0, totalFrames: 1 }); }
  function createStage(_opts) { warnOnce('createStage'); return makeStub(); }
  function createScreen(_opts) { warnOnce('createScreen'); return makeStub(); }
  function pushScreen(_s) { warnOnce('pushScreen'); }
  function popScreen() { warnOnce('popScreen'); }
  function createShake(_opts) { warnOnce('createShake'); return makeStub({ value: 0 }); }
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
  function createTSLMaterial(kind, opts) {
    ensureInit();
    if (kind && typeof kind === 'object') {
      opts = kind;
      kind = opts.kind || opts.type || 'plasma';
    }
    opts = opts || {};
    const name = typeof kind === 'string' ? kind.toLowerCase() : 'plasma';
    const presets = {
      plasma: { color: 0xff66ff, emission: 0xff33ff, emissionEnergy: 3.0, blend: 'add' },
      lava: { color: 0xff6600, emission: 0xff3300, emissionEnergy: 3.0, blend: 'add' },
      void: { color: 0x88ffff, emission: 0x00ffff, emissionEnergy: 2.8, blend: 'add' },
      hologram: { color: 0x00ffff, emission: 0x00ffff, emissionEnergy: 2.4, blend: 'add' },
    };
    const preset = presets[name] || presets.plasma;
    const payload = materialPayload(preset.color, Object.assign({
      opacity: opts.opacity == null ? 0.85 : opts.opacity,
      transparent: true,
      unshaded: true,
      cull: 'disabled',
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

  // Voxel API stubs — return safe defaults so voxel demos boot.
  function configureVoxelWorld(_opts) { warnOnce('voxel.configure'); }
  function enableVoxelTextures(_b) { warnOnce('voxel.enableTextures'); }
  function setVoxel(_x, _y, _z, _id) { warnOnce('voxel.setVoxel'); }
  function getVoxel(_x, _y, _z) { return 0; }
  function spawnVoxelEntity(_opts) { warnOnce('voxel.spawnEntity'); return makeStub(); }
  function getVoxelEntityCount() { return 0; }
  function clearVoxels() { warnOnce('voxel.clear'); }
  function generateVoxelTerrain(_opts) { warnOnce('voxel.generateTerrain'); }

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
  const sceneNs = { createCube, createSphere, createPlane, createCylinder, createCone, createTorus, createAdvancedCube, removeMesh, destroyMesh: removeMesh, setPosition, setRotation, rotateMesh, setScale, getPosition, createInstancedMesh, setInstanceTransform, setInstancePosition, setInstanceColor, finalizeInstances, engine: global.engine };
  const cameraNs = { setCameraPosition, setCameraTarget, setCameraFOV };
  const lightNs = { setLightDirection, setFog, clearFog, createPointLight, createSpotLight, createAmbientLight, setAmbientLight, setLightColor, setLightEnergy };
  const drawNs = { cls, print: novaPrint, printCentered, printRight, rect, rectfill, line, pixel, pset, circle, circfill, ellipse, arc, bezier, drawRect, drawPanel, drawGlowText, drawGlowTextCentered, drawRadialGradient, drawGradient, drawProgressBar, drawHealthBar, drawPixelBorder, drawCrosshair, drawScanlines, drawNoise, drawTriangle, drawDiamond, drawStarburst, poly, rgba8, screenWidth, screenHeight };
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
  const uiNs = { createButton, createLabel, createPanel, createSlider, createCheckbox, createDialog, clearButtons, updateAllButtons, drawAllButtons, drawGradientRect, drawText, drawTextShadow, drawTextOutline, setFont, setTextAlign, setTextBaseline, grid, parseCanvasUI, renderCanvasUI, updateCanvasUI, uiColors: global.uiColors, centerX: function (w) { return Math.floor((640 - (w || 0)) / 2); }, centerY: function (h) { return Math.floor((360 - (h || 0)) / 2); } };
  const stageNs = { createGraphicsNode, createMovieClip, createStage, createScreen, pushScreen, popScreen, createShake, createCard, createMenu, createStartScreen };
  const particlesNs = { createParticleSystem, createEmitter2D, createParticles };
  const skyboxNs = { createSpaceSkybox, createGalaxySkybox, createSunsetSkybox, createDawnSkybox, createNightSkybox, createFoggySkybox, createDuskSkybox, createStormSkybox, createAlienSkybox, createUnderwaterSkybox, setSkybox, createSkybox };
  const modelsNs = { loadModel, createTexture, loadTexture, createInstancedMesh, createTSLMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial, createAdvancedCube };
  const voxelNs = { configureVoxelWorld, enableVoxelTextures, setVoxel, getVoxel, spawnVoxelEntity, getVoxelEntityCount, clearVoxels, generateVoxelTerrain };

  // Carts that go beyond the explicit lists above destructure things like
  // `nova64.shader.createTSLMaterial`, `nova64.voxel.simplexNoise2D`,
  // `nova64.physics.aabb`, etc. Provide top-level namespace objects with
  // a few real impls (where we have them) and let the namespace proxy
  // turn everything else into a named no-op.
  const shaderBacking = { createTSLMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial };
  const physicsBacking = {};
  const dataBacking = {
    t(key) { return key; },
    saveData(_k, _v) {},
    loadData(_k, fallback) { return fallback === undefined ? null : fallback; },
    deleteData(_k) {},
    remove(_k) {},
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

  // Tween namespace extras some carts call.
  tweenNs.killAllTweens = function () {};
  tweenNs.updateTweens = function (_dt) {};

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
    'killAllTweens', 'updateTweens',
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
