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
  const meshes = new Map();
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
    call('transform.set', {
      handle: cameraHandle,
      position: cameraPos,
      lookAt: cameraTarget,
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
  const meshMaterialState = new Map();
  const materialPayloadState = new Map();
  const meshProxyState = new Map();
  const particleSystemState = new Map();
  const proceduralTextureState = new Map();
  let syntheticMaterialId = 1;
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
      isMesh: true,
    };
    // Three.js carts assign `mesh.visible = false` to hide a node. The plain
    // JS field would never reach the host, so cubes stayed rendered (e.g.
    // WAD enemy/item billboards would still show their fallback cubes).
    // Forward writes through transform.set so visibility actually applies.
    let visibleState = true;
    Object.defineProperty(obj, 'visible', {
      enumerable: true,
      configurable: true,
      get() { return visibleState; },
      set(v) {
        const next = !!v;
        if (next === visibleState) return;
        visibleState = next;
        if (obj.handle) call('transform.set', { handle: obj.handle, visible: next });
      },
    });
    obj.geometry = {
      handle: 0,
      dispose: function () {},
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
        if (obj.handle && matHandle) {
          call('mesh.setMaterial', { mesh: obj.handle, material: matHandle });
          meshMaterialState.set(obj.handle, {
            material: matHandle,
            payload: Object.assign({}, materialPayloadState.get(matHandle) || {}),
          });
        }
      },
    });
    obj.traverse = function (fn) {
      if (typeof fn === 'function') fn(obj);
    };
    obj[Symbol.toPrimitive] = function () { return obj.handle; };
    if (obj.handle) meshProxyState.set(obj.handle, obj);
    return obj;
  }

  function materialPayload(color, opts) {
    opts = opts || {};
    const baseColor = opts.color != null ? opts.color : (opts.albedo != null ? opts.albedo : (color == null ? 0xffffff : color));
    const alpha = opts.opacity != null ? opts.opacity : opts.alpha;
    const payload = {
      albedo: colorFromHex(baseColor, alpha == null ? 1 : alpha),
      metallic: typeof opts.metallic === 'number'
        ? opts.metallic
        : (typeof opts.metalness === 'number' ? opts.metalness : 0.05),
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
    if (opts.envMapIntensity != null) payload.envMapIntensity = opts.envMapIntensity;
    const map = opts.albedoTexture || opts.diffuseMap || opts.map || opts.texture;
    if (map) payload.albedoTexture = unwrapHandle(map);
    const emissionMap = opts.emissionMap || opts.emissiveMap;
    if (emissionMap) payload.emissionMap = unwrapHandle(emissionMap);
    if (opts.alphaTest != null) payload.alphaCut = opts.alphaTest;
    if (opts.uvScale) payload.uvScale = ensureArray3(opts.uvScale[0], opts.uvScale[1], opts.uvScale[2] == null ? 1 : opts.uvScale[2]);
    return payload;
  }

  function spawnMesh(geomHandle, color, pos, opts) {
    ensureInit();
    const payload = materialPayload(color, opts);
    const mat = call('material.create', payload);
    const matHandle = mat ? mat.handle : 0;
    const mesh = call('mesh.create', { geometry: geomHandle, material: matHandle });
    const meshHandle = mesh ? mesh.handle : 0;
    if (matHandle) materialPayloadState.set(matHandle, Object.assign({}, payload));
    if (meshHandle && matHandle) {
      meshMaterialState.set(meshHandle, { material: matHandle, payload: Object.assign({}, payload) });
    }
    if (meshHandle) meshes.set(meshHandle, { type: 'mesh' });
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
    // Planes are double-sided by default to match Three.js PlaneGeometry behavior
    const planeOpts = Object.assign({ doubleSided: true }, opts);
    return geom ? spawnMesh(geom.handle, color, pos, planeOpts) : 0;
  }

  function isPositionLike(value) {
    return Array.isArray(value) || (value && typeof value === 'object' && value.x !== undefined);
  }
  function isOptionsLike(value) {
    return value && typeof value === 'object' && !Array.isArray(value) && value.x === undefined;
  }
  function normalizeCylinderArgs(radiusTop, radiusBottom, height, color, pos, opts, argCount) {
    if (argCount <= 3 && Number.isFinite(height) && (height === 0 || Math.abs(height) > 128)) {
      return { radiusTop, radiusBottom: radiusTop, height: radiusBottom, color: height, position: pos, options: opts || {} };
    }
    if (isPositionLike(color) || isOptionsLike(color)) {
      return {
        radiusTop,
        radiusBottom: radiusTop,
        height: radiusBottom,
        color: height,
        position: isPositionLike(color) ? color : [0, 0, 0],
        options: isPositionLike(color) ? (pos || {}) : color,
      };
    }
    if (Number.isInteger(color) && color >= 3 && color <= 128 && isPositionLike(pos)) {
      return {
        radiusTop,
        radiusBottom: radiusTop,
        height: radiusBottom,
        color: height,
        position: pos,
        options: Object.assign({}, opts || {}, { segments: color }),
      };
    }
    return { radiusTop, radiusBottom, height, color, position: pos, options: opts || {} };
  }

  // Cylinder + cone + torus primitives — backed by real Godot meshes.
  function createCylinder(radiusTop, radiusBottom, height, color, pos, opts) {
    ensureInit();
    const args = normalizeCylinderArgs(
      typeof radiusTop === 'number' ? radiusTop : 1,
      typeof radiusBottom === 'number' ? radiusBottom : 1,
      typeof height === 'number' ? height : 1,
      color == null ? 0xffffff : color,
      pos || [0, 0, 0],
      opts || {},
      arguments.length
    );
    const geom = call('geometry.createCylinder', {
      topRadius: args.radiusTop,
      bottomRadius: args.radiusBottom,
      height: args.height,
      sides: (args.options && args.options.segments) || 24,
    });
    return geom ? spawnMesh(geom.handle, args.color, args.position, args.options) : 0;
  }

  function createCone(radius, height, color, pos, opts) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createCone', { radius: r, height: h, sides: 24 });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function createTorus(radius, tube, color, pos, opts) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 1;
    const t = typeof tube === 'number' ? tube : 0.3;
    // Browser carts use Three.js TorusGeometry(radius, tube). Godot TorusMesh
    // wants inner/outer radii, so translate instead of treating the tube as
    // the outer radius.
    const geom = call('geometry.createTorus', {
      innerRadius: Math.max(0.001, r - t),
      outerRadius: Math.max(0.002, r + t),
    });
    return geom ? spawnMesh(geom.handle, color, pos, opts) : 0;
  }

  function removeMesh(handle) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('mesh.destroy', { handle: h });
    rotState.delete(h);
    meshMaterialState.delete(h);
    meshProxyState.delete(h);
    meshes.delete(h);
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

  function getMesh(handle) {
    const h = unwrapHandle(handle);
    if (!h) return null;
    if (meshProxyState.has(h)) return meshProxyState.get(h);
    const proxy = makeMeshHandle(h, [0, 0, 0]);
    meshProxyState.set(h, proxy);
    return proxy;
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
    // Three.js fog is linear near..far; map to Godot depth fog. Three.js does
    // NOT auto-sync scene.background to the fog color; carts that want a
    // fog-colored sky should also call setClearColor() explicitly.
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
  function createPointLight(color, energy, rangeOrPos, maybePos) {
    ensureInit();
    // Three.js-style call sites use (color, energy, range, pos). The shim's
    // host bridge currently doesn't take a range, but we still accept the
    // 4-arg form so the third arg is treated as range (and ignored on the
    // host) instead of being mistaken for the position vector.
    let pos = maybePos;
    if (Array.isArray(rangeOrPos)) {
      pos = rangeOrPos;
    }
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
    // Support both signatures:
    // 1. setLightColor(color) - sets main directional light color (Space Harrier usage)
    // 2. setLightColor(handle, color) - sets specific light color

    if (typeof handle === 'number' && color === undefined) {
      // Single argument version - set main directional light color
      if (!dirLightHandle) return;
      call('light.setColor', {
        handle: dirLightHandle,
        color: colorFromHex(handle),
      });
      return;
    }

    // Two argument version - set specific light color
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
  // Three.js-style helpers used by carts like fps-demo-3d.
  // Destroys a light handle and frees host-side state. Falls back to
  // energy=0 + mesh.destroy because the host bridge doesn't expose a
  // dedicated light.destroy yet (see clearScene precedent).
  function removeLight(handle) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('light.setEnergy', { handle: h, energy: 0 });
    call('mesh.destroy', { handle: h });
    meshes.delete(h);
    if (handle && typeof handle === 'object') handle.handle = 0;
  }
  // Cart-facing combined directional-light setter:
  //   setDirectionalLight(dir, color, intensity)
  //   setDirectionalLight(color, intensity)            (no direction)
  function setDirectionalLight(dirOrColor, colorOrIntensity, maybeIntensity) {
    ensureInit();
    let dir = null, color, intensity;
    if (Array.isArray(dirOrColor)) {
      dir = dirOrColor;
      color = colorOrIntensity;
      intensity = maybeIntensity;
    } else {
      color = dirOrColor;
      intensity = colorOrIntensity;
    }
    if (dir) setLightDirection(dir[0], dir[1], dir[2]);
    if (dirLightHandle && typeof color === 'number') {
      call('light.setColor', { handle: dirLightHandle, color: colorFromHex(color) });
    }
    if (dirLightHandle && typeof intensity === 'number') {
      call('light.setEnergy', { handle: dirLightHandle, energy: intensity });
    }
  }
  function setPointLightPosition(handle, x, y, z) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    call('transform.set', { handle: h, position: ensureArray3(x, y, z) });
  }

  // ---------------- scene management -----------------------------------
  function clearScene() {
    // Clear all user-created meshes but preserve lighting and environment
    ensureInit();

    // Clear all meshes from the meshes map
    for (const [handle, info] of meshes.entries()) {
      if (info && info.type === 'mesh') {
        call('mesh.destroy', { handle });
      }
    }
    meshes.clear();
    meshProxyState.clear();
    meshMaterialState.clear();
    particleSystemState.clear();
    proceduralTextureState.clear();

    // Clear any user-created lights (not the default directional light)
    for (const [handle, info] of meshes.entries()) {
      if (info && info.type === 'light' && handle !== dirLightHandle) {
        // For now, we don't have a light.destroy command, so just clear from map
        meshes.delete(handle);
      }
    }

    // Note: We don't clear the environment, skybox, or default lighting
    // as those are typically re-applied after clearScene in carts
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
    _tickTimers(dt);
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
    const mm = {
      __isMinimap: true,
      x: opts.x != null ? opts.x : 540,
      y: opts.y != null ? opts.y : 10,
      width: opts.width != null ? opts.width : (opts.size != null ? opts.size : 80),
      height: opts.height != null ? opts.height : (opts.size != null ? opts.size : 80),
      bgColor: opts.bgColor != null ? opts.bgColor : rgba8(0, 0, 0, 180),
      borderLight: opts.borderLight != null ? opts.borderLight : rgba8(150, 150, 150),
      borderDark: opts.borderDark != null ? opts.borderDark : rgba8(50, 50, 50),
      shape: opts.shape || 'rect',
      follow: opts.follow || null,
      worldW: opts.worldW != null ? opts.worldW : 100,
      worldH: opts.worldH != null ? opts.worldH : 100,
      entities: Array.isArray(opts.entities) ? opts.entities : [],
      player: opts.player || null,
      gridLines: opts.gridLines || 0,
      gridColor: opts.gridColor != null ? opts.gridColor : rgba8(40, 60, 40, 120),
      revealed: new Set(),
    };
    // Older Godot shim callers used mm.opts; browser-compatible callers mutate
    // mm.player/mm.entities directly. Keep both paths pointing at one object.
    mm.opts = mm;
    return mm;
  }
  function drawMinimap(minimapOrX, timeOrY, sizeArg, entitiesArg, bgColorArg) {
    if (!minimapOrX) return;
    let mm, x, y, size, height;
    if (minimapOrX && minimapOrX.__isMinimap) {
      mm = minimapOrX;
      const o = mm.opts || mm;
      x = o.x != null ? o.x : 540; y = o.y != null ? o.y : 10;
      size = o.width || o.size || 80;
      height = o.height || size;
    } else {
      x = minimapOrX || 540; y = timeOrY || 10; size = sizeArg || 80; height = size;
    }
    // Draw a simple minimap rectangle background
    __ops.push(['rectfill', x | 0, y | 0, size | 0, height | 0, colorFromHex(0x000000, 0.7)]);
    __ops.push(['rect', x | 0, y | 0, size | 0, height | 0, colorFromHex(0x888888)]);
    // Draw entities if available
    const o = mm ? (mm.opts || mm) : null;
    const entities = (o && o.entities) || entitiesArg || [];
    const player = o && o.player;
    const worldW = (o && o.worldW) || 100;
    const worldH = (o && o.worldH) || 100;
    const scale = Math.min(size / Math.max(1, worldW), height / Math.max(1, worldH));
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
    const p = __tx(x, y);
    const sc = __mtxScale();
    __ops.push(['ellipse', p[0] | 0, p[1] | 0, (rx * sc) | 0, (ry * sc) | 0,
      colorFromHex(color == null ? 0xffffff : color), filled !== false]);
  }
  function ellipsefill(x, y, rx, ry, color) {
    ellipse(x, y, rx, ry, color, true);
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
  function poly(points, color, filled) {
    if (!Array.isArray(points) || points.length < 6) return;
    // Transform all points
    const sc = __mtxScale();
    const transformed = [];
    for (let i = 0; i < points.length; i += 2) {
      const p = __tx(points[i], points[i + 1]);
      transformed.push(p[0] | 0, p[1] | 0);
    }
    __ops.push(['polygon', transformed, colorFromHex(color == null ? 0xffffff : color), filled !== false]);
  }
  function flowField(cols, rows, scale, t) {
    scale = scale == null ? 0.06 : scale;
    t = t == null ? 0 : t;
    const field = new Float32Array(Math.max(0, cols | 0) * Math.max(0, rows | 0));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        field[y * cols + x] = noise(x * scale, y * scale, t) * Math.PI * 4;
      }
    }
    return field;
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
      glowIntensity: strength * 0.45,
      glowStrength: typeof radius === 'number' ? Math.max(0.1, radius * 0.9) : 0.55,
      glowBloom: typeof radius === 'number' ? Math.max(0.02, Math.min(0.18, radius * 0.18)) : 0.08,
      glowThreshold: typeof threshold === 'number' ? Math.max(0.85, threshold * 2.5) : 1.0,
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
    // Setting `.visible` on the proxy already dispatches transform.set via
    // its setter, so prefer that path when we have one to avoid a duplicate
    // host call. Only fall back to a direct call for raw integer handles.
    if (handle && typeof handle === 'object' && 'visible' in handle) {
      handle.visible = !!visible;
    } else {
      call('transform.set', { handle: h, visible: !!visible });
    }
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
  function dist(x1, y1, x2, y2) {
    const dx = (x2 || 0) - (x1 || 0);
    const dy = (y2 || 0) - (y1 || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function dist3d(x1, y1, z1, x2, y2, z2) {
    const dx = (x2 || 0) - (x1 || 0);
    const dy = (y2 || 0) - (y1 || 0);
    const dz = (z2 || 0) - (z1 || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
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

  const utilNs = {
    TWO_PI, HALF_PI, QUARTER_PI,
    clamp, lerp, dist, dist3d,
    hsb, noise, noiseSeed, noiseDetail, noiseMap,
  };

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
        start:   function () { elapsed = 0; dir = 1; playing = true; return tween; },
        resume:  function () { playing = true;  return tween; },
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
      start:   function () { elapsed2 = 0; delayRemain = delay2; dir2 = 1; playing2 = true; return novaTween; },
      resume:  function () { playing2 = true;  return novaTween; },
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
  const _hypeRegistry = [];
  function hypeRegister(behavior) {
    if (behavior && _hypeRegistry.indexOf(behavior) < 0) _hypeRegistry.push(behavior);
    return behavior;
  }
  function hypeUnregister(behavior) {
    const i = _hypeRegistry.indexOf(behavior);
    if (i >= 0) _hypeRegistry.splice(i, 1);
    return behavior;
  }
  function hypeUpdate(dt) {
    const copy = _hypeRegistry.slice();
    for (let i = 0; i < copy.length; i++) {
      if (copy[i] && typeof copy[i].tick === 'function') copy[i].tick(dt);
    }
  }
  function hypeReset() {
    _hypeRegistry.length = 0;
  }
  function _hypeHash(n) {
    n = (n | 0) ^ 61 ^ ((n | 0) >>> 16);
    n = (n + (n << 3)) | 0;
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ (n >>> 15);
    return ((n >>> 0) / 0xffffffff) * 2 - 1;
  }
  function _hypeNoise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const s = xf * xf * (3 - 2 * xf);
    const a = _hypeHash(xi);
    const b = _hypeHash(xi + 1);
    return a + (b - a) * s;
  }
  function createOscillator(opts) {
    opts = opts || {};
    const waveform = opts.waveform || 'sin';
    let min = opts.min != null ? opts.min : 0;
    let max = opts.max != null ? opts.max : 1;
    let speed = opts.speed != null ? opts.speed : 1;
    let offset = opts.offset || 0;
    let t = 0, raw = 0, value = (min + max) / 2;
    const osc = {
      get value() { return value; },
      get raw() { return raw; },
      tick: function (dt) {
        t += dt || 0;
        const phase = t * speed + offset;
        if (waveform === 'cos') raw = Math.cos(phase * Math.PI * 2);
        else if (waveform === 'tri') raw = 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
        else if (waveform === 'saw') raw = 2 * (phase - Math.floor(phase + 0.5));
        else if (waveform === 'noise') raw = _hypeNoise(phase * 3.7);
        else raw = Math.sin(phase * Math.PI * 2);
        value = min + (raw + 1) * 0.5 * (max - min);
      },
      reset: function () { t = 0; raw = 0; value = (min + max) / 2; return osc; },
      register: function () { return hypeRegister(osc); },
      unregister: function () { return hypeUnregister(osc); },
      setMin: function (v) { min = v; return osc; },
      setMax: function (v) { max = v; return osc; },
      setSpeed: function (v) { speed = v; return osc; },
      setOffset: function (v) { offset = v; return osc; },
      setRange: function (lo, hi) { min = lo; max = hi; return osc; },
    };
    osc.tick(0);
    if (opts.autoReg) hypeRegister(osc);
    return osc;
  }
  function createTimeTrigger(opts) {
    opts = opts || {};
    const interval = Math.max(0.0001, opts.interval != null ? opts.interval : (opts.delay || 1));
    let elapsed = 0, fired = false, active = opts.active !== false;
    const trg = {
      tick: function (dt) {
        if (!active || fired) return;
        elapsed += dt || 0;
        while (elapsed >= interval && !fired) {
          elapsed -= interval;
          if (typeof opts.callback === 'function') opts.callback();
          if (!opts.repeat) fired = true;
        }
      },
      reset: function () { elapsed = 0; fired = false; active = true; return trg; },
      start: function () { active = true; return trg; },
      stop: function () { active = false; return trg; },
      register: function () { return hypeRegister(trg); },
      unregister: function () { return hypeUnregister(trg); },
    };
    if (opts.autoReg) hypeRegister(trg);
    return trg;
  }
  function createRandomTrigger(opts) {
    opts = opts || {};
    const chance = opts.chance != null ? opts.chance : 0.01;
    const trg = {
      tick: function () { if (Math.random() < chance && typeof opts.callback === 'function') opts.callback(); },
      register: function () { return hypeRegister(trg); },
      unregister: function () { return hypeUnregister(trg); },
    };
    if (opts.autoReg) hypeRegister(trg);
    return trg;
  }
  function _readPoint(fn) {
    const p = typeof fn === 'function' ? fn() : (fn || {});
    return { x: p.x || 0, y: p.y || 0, z: p.z || 0 };
  }
  function createProximityTrigger(opts) {
    opts = opts || {};
    let inside = false, dist = 0;
    const radius = opts.radius != null ? opts.radius : 10;
    const trg = {
      get distance() { return dist; },
      get inside() { return inside; },
      tick: function () {
        const a = _readPoint(opts.getFrom);
        const b = _readPoint(opts.getTo);
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nowInside = dist <= radius;
        if (nowInside && !inside && typeof opts.onEnter === 'function') opts.onEnter(dist);
        if (!nowInside && inside && typeof opts.onExit === 'function') opts.onExit(dist);
        if (nowInside && typeof opts.onInside === 'function') opts.onInside(dist);
        inside = nowInside;
      },
      register: function () { return hypeRegister(trg); },
      unregister: function () { return hypeUnregister(trg); },
    };
    if (opts.autoReg) hypeRegister(trg);
    return trg;
  }
  function createColorPool(colors, mode) {
    let pool = (colors || []).slice();
    let idx = 0;
    mode = mode || 'sequential';
    function shuffle() {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      idx = 0;
    }
    const cp = {
      get current() { return pool[idx] || 0; },
      next: function () {
        if (!pool.length) return 0;
        if (mode === 'random') return pool[Math.floor(Math.random() * pool.length)];
        const c = pool[idx];
        idx = (idx + 1) % pool.length;
        if (mode === 'shuffle' && idx === 0) shuffle();
        return c;
      },
      getColor: function (i) { return pool.length ? pool[((i % pool.length) + pool.length) % pool.length] : 0; },
      shuffle: function () { shuffle(); return cp; },
      reset: function () { idx = 0; return cp; },
      add: function (c) { pool.push(c); return cp; },
    };
    if (mode === 'shuffle') shuffle();
    return cp;
  }
  function createHPool(opts) {
    opts = opts || {};
    const build = opts.build || function () { return {}; };
    const max = opts.max || 0;
    const waiting = [], active = [];
    function request() {
      if (max > 0 && active.length >= max) return null;
      let obj = waiting.length ? waiting.pop() : build();
      if (waiting.indexOf(obj) < 0 && active.indexOf(obj) < 0 && typeof opts.onCreate === 'function' && !obj.__hpoolCreated) {
        obj.__hpoolCreated = true;
        opts.onCreate(obj);
      }
      active.push(obj);
      if (typeof opts.onRequest === 'function') opts.onRequest(obj);
      return obj;
    }
    function release(obj) {
      const i = active.indexOf(obj);
      if (i < 0) return;
      active.splice(i, 1);
      if (typeof opts.onRelease === 'function') opts.onRelease(obj);
      waiting.push(obj);
    }
    return {
      get active() { return active; },
      get available() { return waiting.length; },
      request: request,
      release: release,
      requestAll: function (n) { const out = []; for (let i = 0; i < n; i++) { const o = request(); if (o) out.push(o); } return out; },
      releaseAll: function () { while (active.length) release(active[0]); },
      onEach: function (fn) { for (let i = 0; i < active.length; i++) fn(active[i], i); },
    };
  }
  function createGridLayout(opts) {
    opts = opts || {};
    const cols = opts.cols || 4, rows = opts.rows || 4, layers = opts.layers || 1;
    const sx = opts.spacingX || 50, sy = opts.spacingY || 50, sz = opts.spacingZ || 50;
    const ox = opts.originX || 0, oy = opts.originY || 0, oz = opts.originZ || 0;
    function getPositions() {
      const out = [];
      for (let l = 0; l < layers; l++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        out.push({ x: ox + c * sx - ((cols - 1) * sx) / 2, y: oy + r * sy - ((rows - 1) * sy) / 2, z: oz + l * sz - ((layers - 1) * sz) / 2 });
      }
      return out;
    }
    return { getPositions: getPositions, each: function (fn) { getPositions().forEach(fn); } };
  }
  function createCircleLayout(opts) {
    opts = opts || {};
    const count = opts.count || 8, radius = opts.radius || 100, plane = opts.plane || 'xz';
    const start = opts.startAngle || 0, end = opts.endAngle == null ? Math.PI * 2 : opts.endAngle;
    const cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
    function getPositions() {
      const out = [], span = end - start, step = count > 1 ? span / count : 0;
      for (let i = 0; i < count; i++) {
        const a = start + i * step, co = Math.cos(a) * radius, si = Math.sin(a) * radius;
        let x = cx, y = cy, z = cz;
        if (plane === 'xy') { x += co; y += si; }
        else if (plane === 'yz') { y += co; z += si; }
        else { x += co; z += si; }
        out.push({ x: x, y: y, z: z, angle: a });
      }
      return out;
    }
    return { getPositions: getPositions, each: function (fn) { getPositions().forEach(fn); } };
  }
  function createSphereLayout(opts) {
    opts = opts || {};
    const count = opts.count || 20, radius = opts.radius || 100, cx = opts.cx || 0, cy = opts.cy || 0, cz = opts.cz || 0;
    function getPositions() {
      const out = [], golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const yy = count > 1 ? (1 - (i / (count - 1)) * 2) * radius : 0;
        const rr = Math.sqrt(Math.max(0, radius * radius - yy * yy));
        const theta = golden * i;
        out.push({ x: cx + Math.cos(theta) * rr, y: cy + yy, z: cz + Math.sin(theta) * rr });
      }
      return out;
    }
    return { getPositions: getPositions, each: function (fn) { getPositions().forEach(fn); } };
  }
  function createPathLayout(opts) {
    opts = opts || {};
    const points = opts.points || [{ x: -100, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }];
    const count = opts.count || 10, mode = opts.mode || 'linear';
    function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }; }
    function bez(p0, p1, p2, p3, t) {
      const mt = 1 - t;
      return { x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
        y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
        z: mt*mt*mt*p0.z + 3*mt*mt*t*p1.z + 3*mt*t*t*p2.z + t*t*t*p3.z };
    }
    function getAt(t) {
      t = Math.max(0, Math.min(1, t));
      if (mode === 'bezier') {
        const segs = Math.max(1, Math.floor((points.length - 1) / 3));
        const seg = Math.min(Math.floor(t * segs), segs - 1);
        const base = seg * 3, local = t * segs - seg;
        return bez(points[base], points[base + 1], points[base + 2], points[base + 3], local);
      }
      const segs2 = Math.max(1, points.length - 1);
      const seg2 = Math.min(Math.floor(t * segs2), segs2 - 1);
      return lerp(points[seg2], points[seg2 + 1], t * segs2 - seg2);
    }
    function getPositions() { const out = []; for (let i = 0; i < count; i++) { const t = count > 1 ? i / (count - 1) : 0; out.push(Object.assign(getAt(t), { t: t })); } return out; }
    return { getAt: getAt, getPositions: getPositions, each: function (fn) { getPositions().forEach(fn); } };
  }
  function createHSwarm(opts) {
    opts = opts || {};
    const count = opts.count || 20, speed = opts.speed || 4, bounds = opts.bounds || null;
    const agents = [], goals = [];
    for (let i = 0; i < count; i++) {
      const a = { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: -10, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, vz: (Math.random() - 0.5) * speed };
      if (typeof opts.initFn === 'function') opts.initFn(a, i);
      agents.push(a);
    }
    const swarm = {
      agents: agents,
      goals: goals,
      addGoal: function (x, y, z, weight) { goals.push({ x: x || 0, y: y || 0, z: z || 0, weight: weight == null ? 1 : weight }); return swarm; },
      clearGoals: function () { goals.length = 0; return swarm; },
      tick: function (dt) {
        dt = dt || 0;
        for (let i = 0; i < agents.length; i++) {
          const a = agents[i];
          if (goals.length) {
            const g = goals[i % goals.length];
            a.vx += (g.x - a.x) * 0.25 * (g.weight || 1) * dt;
            a.vy += (g.y - a.y) * 0.25 * (g.weight || 1) * dt;
            a.vz += (g.z - a.z) * 0.25 * (g.weight || 1) * dt;
          }
          const len = Math.hypot(a.vx, a.vy, a.vz) || 1;
          if (len > speed) { a.vx = a.vx / len * speed; a.vy = a.vy / len * speed; a.vz = a.vz / len * speed; }
          a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
          if (bounds) {
            const hw = bounds.w / 2, hh = bounds.h / 2, hd = (bounds.d || bounds.w) / 2;
            const bx = bounds.x || 0, by = bounds.y || 0, bz = bounds.z || 0;
            if (a.x < bx - hw) a.x += bounds.w; else if (a.x > bx + hw) a.x -= bounds.w;
            if (a.y < by - hh) a.y += bounds.h; else if (a.y > by + hh) a.y -= bounds.h;
            if (a.z < bz - hd) a.z += (bounds.d || bounds.w); else if (a.z > bz + hd) a.z -= (bounds.d || bounds.w);
          }
        }
      },
      register: function () { return hypeRegister(swarm); },
      unregister: function () { return hypeUnregister(swarm); },
    };
    if (opts.autoReg) hypeRegister(swarm);
    return swarm;
  }

  const tweenNs = {
    createTween, updateTweens, killAllTweens, Ease,
    hypeRegister, hypeUnregister, hypeUpdate, hypeReset,
    createOscillator, createTimeTrigger, createRandomTrigger, createProximityTrigger,
    createHSwarm, createColorPool, createHPool,
    createGridLayout, createCircleLayout, createSphereLayout, createPathLayout,
  };

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

  // ══════════════════════════════════════════════════════════════════════════════
  // Canvas-UI (NML) — Minimal implementation for Godot using 2D draw primitives.
  // Supports: rect, circle, ellipse, triangle, star, line, text, button, progressbar, group, panel, path
  // ══════════════════════════════════════════════════════════════════════════════

  const NML_W = 640, NML_H = 360;

  // Decode XML entities
  function _decodeXmlEntities(str) {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  // Parse NML (subset of XML) into AST
  function _nmlParse(xmlString) {
    const str = (xmlString || '').trim();
    let pos = 0;
    function skipWS() { while (pos < str.length && /\s/.test(str[pos])) pos++; }
    function skipComment() {
      if (str.startsWith('<!--', pos)) { pos = str.indexOf('-->', pos + 4); pos = pos >= 0 ? pos + 3 : str.length; return true; }
      return false;
    }
    function readAttrValue() {
      if (str[pos] === '"' || str[pos] === "'") {
        const q = str[pos++]; let v = '';
        while (pos < str.length && str[pos] !== q) v += str[pos++];
        pos++; return _decodeXmlEntities(v);
      }
      let v = ''; while (pos < str.length && !/[\s>/]/.test(str[pos])) v += str[pos++];
      return _decodeXmlEntities(v);
    }
    function readAttrs() {
      const attrs = {}; skipWS();
      while (pos < str.length && str[pos] !== '>' && !(str[pos] === '/' && str[pos + 1] === '>')) {
        if (/[a-zA-Z_:]/.test(str[pos])) {
          let name = ''; while (pos < str.length && /[a-zA-Z0-9_:-]/.test(str[pos])) name += str[pos++];
          skipWS();
          if (str[pos] === '=') { pos++; skipWS(); attrs[name] = readAttrValue(); }
          else attrs[name] = true;
          skipWS();
        } else pos++;
      }
      return attrs;
    }
    function readText() { let t = ''; while (pos < str.length && str[pos] !== '<') t += str[pos++]; return _decodeXmlEntities(t.trim()); }
    function parseNode() {
      skipWS(); if (pos >= str.length) return null;
      if (skipComment()) return null;
      if (str[pos] !== '<') { const t = readText(); return t ? { tag: '#text', attrs: {}, children: [], text: t } : null; }
      pos++; if (str[pos] === '/') return null; if (str[pos] === '!') return null;
      let tag = ''; while (pos < str.length && /[a-zA-Z0-9_-]/.test(str[pos])) tag += str[pos++];
      tag = tag.toLowerCase();
      const attrs = readAttrs(), children = []; let text = '';
      if (str[pos] === '/' && str[pos + 1] === '>') { pos += 2; return { tag, attrs, children, text }; }
      if (str[pos] === '>') {
        pos++;
        // Inline SVG capture
        if (tag === 'svg' && !attrs.src) {
          let depth = 1, inner = '';
          while (pos < str.length && depth > 0) {
            if (str.startsWith('<svg', pos) && /[\s>/]/.test(str[pos + 4])) depth++;
            else if (str.startsWith('</svg>', pos)) { depth--; if (depth === 0) { pos += 6; break; } }
            if (depth > 0) inner += str[pos++];
          }
          attrs._innerSvg = inner.trim();
          return { tag, attrs, children, text };
        }
        while (pos < str.length) {
          skipWS();
          if (str.startsWith('</', pos)) { while (pos < str.length && str[pos] !== '>') pos++; pos++; break; }
          if (skipComment()) continue;
          if (str[pos] === '<') { const child = parseNode(); if (child) children.push(child); }
          else text += readText();
        }
      }
      return { tag, attrs, children, text: text.trim() };
    }
    return parseNode();
  }

  function _nmlResolveVal(val, parentDim) {
    if (val === undefined || val === null) return undefined;
    const s = String(val);
    if (s.endsWith('%')) return (parseFloat(s) / 100) * (parentDim || 0);
    const n = parseFloat(s); return isNaN(n) ? 0 : n;
  }

  function _nmlResolveColor(val) {
    if (!val) return null;
    const s = String(val).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) {
      return parseInt(s.slice(1), 16);
    }
    if (/^#[0-9a-fA-F]{8}$/.test(s)) {
      return parseInt(s.slice(1, 7), 16); // ignore alpha for now
    }
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1], g = s[2], b = s[3];
      return parseInt(r + r + g + g + b + b, 16);
    }
    return 0xffffff;
  }

  function _nmlBindData(val, data) {
    if (!val || !data) return val || '';
    return String(val).replace(/\{(\w+)\}/g, (_, k) => (data[k] !== undefined ? data[k] : ''));
  }

  function _nmlResolveRect(attrs, parentRect, NW, NH) {
    const pw = parentRect ? parentRect.w : NW, ph = parentRect ? parentRect.h : NH;
    const px = parentRect ? parentRect.x : 0, py = parentRect ? parentRect.y : 0;
    let x = _nmlResolveVal(attrs.x, pw) || 0, y = _nmlResolveVal(attrs.y, ph) || 0;
    const w = _nmlResolveVal(attrs.width || attrs.w, pw) || 0;
    const h = _nmlResolveVal(attrs.height || attrs.h, ph) || 0;
    const anchor = attrs.anchor || '';
    const ax = attrs['anchor-x'] || (anchor === 'center' ? 'center' : anchor === 'right' ? 'right' : null);
    const ay = attrs['anchor-y'] || (anchor === 'center' ? 'center' : anchor === 'bottom' ? 'bottom' : null);
    if (ax === 'center') x -= w / 2; else if (ax === 'right') x -= w;
    if (ay === 'center') y -= h / 2; else if (ay === 'bottom') y -= h;
    return { x: px + x, y: py + y, w, h };
  }

  // SVG path parser: converts SVG "d" attribute to an array of polyline segments.
  // Each segment is { points: [x,y,...], closed: bool }
  // Supports: M/m (moveto), L/l (lineto), H/h/V/v (horiz/vert), C/c (cubic bezier),
  // Q/q (quadratic bezier), S/s (smooth cubic), T/t (smooth quad), A/a (arc), Z/z (close)
  function _svgParsePath(d) {
    if (!d) return [];
    const segments = [];
    let curSeg = { points: [], closed: false };
    let cx = 0, cy = 0; // Current point
    let startX = 0, startY = 0; // Start of current subpath (for Z)
    let lastCmd = '', lastCx2 = 0, lastCy2 = 0; // For S/T smooth continuation

    // Tokenize: split into commands and numbers
    const tokens = [];
    const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;
    let m;
    while ((m = re.exec(d)) !== null) {
      if (m[1]) tokens.push({ type: 'cmd', val: m[1] });
      else tokens.push({ type: 'num', val: parseFloat(m[2]) });
    }

    let i = 0;
    function nextNum() { return i < tokens.length && tokens[i].type === 'num' ? tokens[i++].val : 0; }
    function hasMoreNums() { return i < tokens.length && tokens[i].type === 'num'; }

    // Cubic bezier to polyline (de Casteljau)
    function cubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, pts, steps = 12) {
      for (let t = 1; t <= steps; t++) {
        const u = t / steps;
        const u2 = u * u, u3 = u2 * u;
        const c = 1 - u, c2 = c * c, c3 = c2 * c;
        const x = c3 * x0 + 3 * c2 * u * x1 + 3 * c * u2 * x2 + u3 * x3;
        const y = c3 * y0 + 3 * c2 * u * y1 + 3 * c * u2 * y2 + u3 * y3;
        pts.push(x, y);
      }
    }

    // Quadratic bezier to polyline
    function quadBezier(x0, y0, x1, y1, x2, y2, pts, steps = 10) {
      for (let t = 1; t <= steps; t++) {
        const u = t / steps;
        const c = 1 - u;
        const x = c * c * x0 + 2 * c * u * x1 + u * u * x2;
        const y = c * c * y0 + 2 * c * u * y1 + u * u * y2;
        pts.push(x, y);
      }
    }

    // Arc to bezier segments (simplified)
    function arcToBeziers(x0, y0, rx, ry, angle, largeArc, sweep, x1, y1, pts) {
      // Degenerate: if either radius is 0 or endpoints are the same, just lineto
      if (rx === 0 || ry === 0 || (x0 === x1 && y0 === y1)) {
        pts.push(x1, y1);
        return;
      }
      // Normalize radii
      rx = Math.abs(rx); ry = Math.abs(ry);
      const phi = angle * Math.PI / 180;
      const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
      // Step 1: compute (x1', y1')
      const dx = (x0 - x1) / 2, dy = (y0 - y1) / 2;
      const x1p = cosPhi * dx + sinPhi * dy;
      const y1p = -sinPhi * dx + cosPhi * dy;
      // Adjust radii if too small
      let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; }
      // Step 2: compute (cx', cy')
      const sq = Math.max(0, (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) /
                 (rx * rx * y1p * y1p + ry * ry * x1p * x1p));
      const root = Math.sqrt(sq) * (largeArc === sweep ? -1 : 1);
      const cxp = root * rx * y1p / ry;
      const cyp = -root * ry * x1p / rx;
      // Step 3: compute center (cx, cy)
      const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
      const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;
      // Step 4: compute theta1 and dtheta
      function vecAngle(ux, uy, vx, vy) {
        const dot = ux * vx + uy * vy;
        const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
        let ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
        if (ux * vy - uy * vx < 0) ang = -ang;
        return ang;
      }
      const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dtheta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
      else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
      // Approximate arc with line segments
      const steps = Math.max(4, Math.ceil(Math.abs(dtheta) / (Math.PI / 8)));
      for (let s = 1; s <= steps; s++) {
        const t = theta1 + (s / steps) * dtheta;
        const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
        const px = cosPhi * ex - sinPhi * ey + cx;
        const py = sinPhi * ex + cosPhi * ey + cy;
        pts.push(px, py);
      }
    }

    function pushPoint(x, y) {
      curSeg.points.push(x, y);
      cx = x; cy = y;
    }

    function finishSeg() {
      if (curSeg.points.length >= 4) segments.push(curSeg);
      curSeg = { points: [], closed: false };
    }

    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.type === 'cmd') {
        const cmd = tok.val; i++;
        lastCmd = cmd;
        switch (cmd) {
          case 'M': case 'm': {
            if (curSeg.points.length > 0) finishSeg();
            let first = true;
            while (hasMoreNums()) {
              let x = nextNum(), y = nextNum();
              if (cmd === 'm') { x += cx; y += cy; }
              if (first) { startX = x; startY = y; first = false; }
              pushPoint(x, y);
            }
            break;
          }
          case 'L': case 'l':
            while (hasMoreNums()) {
              let x = nextNum(), y = nextNum();
              if (cmd === 'l') { x += cx; y += cy; }
              pushPoint(x, y);
            }
            break;
          case 'H': case 'h':
            while (hasMoreNums()) {
              let x = nextNum();
              if (cmd === 'h') x += cx;
              pushPoint(x, cy);
            }
            break;
          case 'V': case 'v':
            while (hasMoreNums()) {
              let y = nextNum();
              if (cmd === 'v') y += cy;
              pushPoint(cx, y);
            }
            break;
          case 'C': case 'c':
            while (hasMoreNums()) {
              let x1 = nextNum(), y1 = nextNum();
              let x2 = nextNum(), y2 = nextNum();
              let x = nextNum(), y = nextNum();
              if (cmd === 'c') {
                x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy;
              }
              cubicBezier(cx, cy, x1, y1, x2, y2, x, y, curSeg.points);
              lastCx2 = x2; lastCy2 = y2;
              cx = x; cy = y;
            }
            break;
          case 'S': case 's':
            while (hasMoreNums()) {
              // Reflect previous control point
              let x1 = 2 * cx - lastCx2, y1 = 2 * cy - lastCy2;
              let x2 = nextNum(), y2 = nextNum();
              let x = nextNum(), y = nextNum();
              if (cmd === 's') { x2 += cx; y2 += cy; x += cx; y += cy; }
              cubicBezier(cx, cy, x1, y1, x2, y2, x, y, curSeg.points);
              lastCx2 = x2; lastCy2 = y2;
              cx = x; cy = y;
            }
            break;
          case 'Q': case 'q':
            while (hasMoreNums()) {
              let x1 = nextNum(), y1 = nextNum();
              let x = nextNum(), y = nextNum();
              if (cmd === 'q') { x1 += cx; y1 += cy; x += cx; y += cy; }
              quadBezier(cx, cy, x1, y1, x, y, curSeg.points);
              lastCx2 = x1; lastCy2 = y1;
              cx = x; cy = y;
            }
            break;
          case 'T': case 't':
            while (hasMoreNums()) {
              let x1 = 2 * cx - lastCx2, y1 = 2 * cy - lastCy2;
              let x = nextNum(), y = nextNum();
              if (cmd === 't') { x += cx; y += cy; }
              quadBezier(cx, cy, x1, y1, x, y, curSeg.points);
              lastCx2 = x1; lastCy2 = y1;
              cx = x; cy = y;
            }
            break;
          case 'A': case 'a':
            while (hasMoreNums()) {
              const rx = nextNum(), ry = nextNum(), angle = nextNum();
              const largeArc = nextNum(), sweep = nextNum();
              let x = nextNum(), y = nextNum();
              if (cmd === 'a') { x += cx; y += cy; }
              arcToBeziers(cx, cy, rx, ry, angle, largeArc, sweep, x, y, curSeg.points);
              cx = x; cy = y;
            }
            break;
          case 'Z': case 'z':
            pushPoint(startX, startY);
            curSeg.closed = true;
            finishSeg();
            break;
        }
      } else {
        // Implicit command repeat (same as last command)
        i++;
      }
    }
    finishSeg();
    return segments;
  }

  // Render a single NML node using our 2D draw primitives
  function _nmlRenderNode(node, parentRect, data, handlers, scaleX, scaleY) {
    if (!node || node.tag === '#text') return;
    const { tag, attrs, children } = node;
    const bound = (v) => _nmlBindData(v, data);
    const r = _nmlResolveRect(attrs, parentRect, NML_W, NML_H);
    const fill = _nmlResolveColor(bound(attrs.fill));
    const stroke = _nmlResolveColor(bound(attrs.stroke));
    const color = _nmlResolveColor(bound(attrs.color));

    // Scale coordinates to screen
    const sx = (v) => v * scaleX, sy = (v) => v * scaleY;

    switch (tag) {
      case 'rect': {
        if (fill !== null) rect(sx(r.x), sy(r.y), sx(r.w), sy(r.h), fill);
        if (stroke !== null) {
          rect(sx(r.x), sy(r.y), sx(r.w), 1, stroke);
          rect(sx(r.x), sy(r.y + r.h - 1), sx(r.w), 1, stroke);
          rect(sx(r.x), sy(r.y), 1, sy(r.h), stroke);
          rect(sx(r.x + r.w - 1), sy(r.y), 1, sy(r.h), stroke);
        }
        break;
      }
      case 'circle': {
        // Support both NML (x,y) and SVG (cx,cy) attribute names
        const circX = _nmlResolveVal(attrs.cx || attrs.x, parentRect?.w || NML_W) || 0;
        const circY = _nmlResolveVal(attrs.cy || attrs.y, parentRect?.h || NML_H) || 0;
        const radius = parseFloat(attrs.r) || 10;
        if (fill !== null) circle(sx(circX + (parentRect?.x || 0)), sy(circY + (parentRect?.y || 0)), sx(radius), fill);
        if (stroke !== null) {
          // Draw stroked circle using ellipse (which supports stroke)
          ellipse(sx(circX + (parentRect?.x || 0)), sy(circY + (parentRect?.y || 0)), sx(radius), sy(radius), stroke, false);
        }
        break;
      }
      case 'ellipse': {
        // Support both NML (x,y) and SVG (cx,cy) attribute names
        const ecx = _nmlResolveVal(attrs.cx || attrs.x, parentRect?.w || NML_W) || 0;
        const ecy = _nmlResolveVal(attrs.cy || attrs.y, parentRect?.h || NML_H) || 0;
        const erx = parseFloat(attrs.rx) || 10, ery = parseFloat(attrs.ry) || erx;
        if (fill !== null) ellipse(sx(ecx + (parentRect?.x || 0)), sy(ecy + (parentRect?.y || 0)), sx(erx), sy(ery), fill, true);
        if (stroke !== null) ellipse(sx(ecx + (parentRect?.x || 0)), sy(ecy + (parentRect?.y || 0)), sx(erx), sy(ery), stroke, false);
        break;
      }
      case 'line': {
        const x1 = _nmlResolveVal(attrs.x1, parentRect?.w || NML_W) || 0;
        const y1 = _nmlResolveVal(attrs.y1, parentRect?.h || NML_H) || 0;
        const x2 = _nmlResolveVal(attrs.x2, parentRect?.w || NML_W) || 0;
        const y2 = _nmlResolveVal(attrs.y2, parentRect?.h || NML_H) || 0;
        const c = color || stroke || 0xffffff;
        line(sx(x1 + (parentRect?.x || 0)), sy(y1 + (parentRect?.y || 0)),
             sx(x2 + (parentRect?.x || 0)), sy(y2 + (parentRect?.y || 0)), c);
        break;
      }
      case 'path': {
        // SVG path element: parse d="" attribute and render as polylines
        const d = attrs.d;
        if (!d) break;
        const pathX = _nmlResolveVal(attrs.x, parentRect?.w || NML_W) || 0;
        const pathY = _nmlResolveVal(attrs.y, parentRect?.h || NML_H) || 0;
        const ox = sx(pathX + (parentRect?.x || 0));
        const oy = sy(pathY + (parentRect?.y || 0));
        const pathFill = attrs.fill !== 'none' ? fill : null;
        const pathStroke = attrs.stroke !== 'none' ? (stroke || color) : null;
        const segments = _svgParsePath(d);
        for (const seg of segments) {
          if (seg.points.length < 4) continue;
          // Transform points to screen coordinates with path offset
          const pts = [];
          for (let i = 0; i < seg.points.length; i += 2) {
            pts.push(ox + sx(seg.points[i]), oy + sy(seg.points[i + 1]));
          }
          if (pathFill !== null && seg.closed) poly(pts, pathFill, true);
          if (pathStroke !== null) poly(pts, pathStroke, false);
        }
        break;
      }
      case 'text': {
        const tx = _nmlResolveVal(attrs.x, parentRect?.w || NML_W) || 0;
        const ty = _nmlResolveVal(attrs.y, parentRect?.h || NML_H) || 0;
        const size = parseFloat(attrs.size) || 8;
        const c = color || 0xffffff;
        const txt = bound(node.text || attrs.text || '');
        const ax = attrs['anchor-x'];
        // novaPrint signature: (text, x, y, color, scale)
        // Scale is relative (1 = default size), not pixel size
        const fontScale = size / 8; // 8px is default font size
        if (ax === 'center') {
          printCentered(txt, sx(tx + (parentRect?.x || 0)), sy(ty + (parentRect?.y || 0)), c, fontScale * scaleY);
        } else {
          novaPrint(txt, sx(tx + (parentRect?.x || 0)), sy(ty + (parentRect?.y || 0)), c, fontScale * scaleY);
        }
        break;
      }
      case 'button': {
        const fillC = fill !== null ? fill : 0x333355;
        const textC = _nmlResolveColor(bound(attrs['text-color'])) || 0xffffff;
        const txt = bound(attrs.text || '');
        rect(sx(r.x), sy(r.y), sx(r.w), sy(r.h), fillC);
        if (stroke !== null) {
          rect(sx(r.x), sy(r.y), sx(r.w), 1, stroke);
          rect(sx(r.x), sy(r.y + r.h - 1), sx(r.w), 1, stroke);
          rect(sx(r.x), sy(r.y), 1, sy(r.h), stroke);
          rect(sx(r.x + r.w - 1), sy(r.y), 1, sy(r.h), stroke);
        }
        const fontSize = parseFloat(attrs['font-size']) || 10;
        const fontScale = fontSize / 8;
        printCentered(txt, sx(r.x + r.w / 2), sy(r.y + r.h / 2 - fontSize / 2), textC, fontScale * scaleY);
        break;
      }
      case 'progressbar': {
        const bg = _nmlResolveColor(bound(attrs.background)) || 0x222222;
        const fg = fill !== null ? fill : 0x44aa44;
        const val = parseFloat(bound(attrs.value)) || 0;
        const max = parseFloat(attrs.max) || 100;
        const pct = Math.max(0, Math.min(1, val / max));
        rect(sx(r.x), sy(r.y), sx(r.w), sy(r.h), bg);
        rect(sx(r.x), sy(r.y), sx(r.w * pct), sy(r.h), fg);
        if (attrs.label) {
          novaPrint(attrs.label, sx(r.x + 2), sy(r.y + r.h / 2 - 4), 0xffffff, 0.875 * scaleY);
        }
        break;
      }
      case 'star': {
        const cx = _nmlResolveVal(attrs.x, parentRect?.w || NML_W) || 0;
        const cy = _nmlResolveVal(attrs.y, parentRect?.h || NML_H) || 0;
        const outerR = parseFloat(bound(attrs.r)) || 10;
        const innerR = parseFloat(bound(attrs['inner-r'])) || outerR * 0.4;
        const points = parseInt(attrs.points) || 5;
        const rotation = parseFloat(bound(attrs.rotation)) || 0;
        const rotRad = (rotation - 90) * Math.PI / 180; // Start from top
        const pcx = sx(cx + (parentRect?.x || 0));
        const pcy = sy(cy + (parentRect?.y || 0));
        const starPts = [];
        for (let i = 0; i < points * 2; i++) {
          const angle = rotRad + (i * Math.PI / points);
          const r = (i % 2 === 0) ? sx(outerR) : sx(innerR);
          starPts.push(pcx + r * Math.cos(angle), pcy + r * Math.sin(angle));
        }
        if (fill !== null) poly(starPts, fill, true);
        if (stroke !== null) poly(starPts, stroke, false);
        break;
      }
      case 'triangle': {
        const cx = _nmlResolveVal(attrs.x, parentRect?.w || NML_W) || 0;
        const cy = _nmlResolveVal(attrs.y, parentRect?.h || NML_H) || 0;
        const size = parseFloat(attrs.size) || 20;
        const pcx = sx(cx + (parentRect?.x || 0));
        const pcy = sy(cy + (parentRect?.y || 0));
        const h = sy(size) * 0.866; // height of equilateral triangle
        const triPts = [
          pcx, pcy - h * 0.67,           // top
          pcx - sx(size) / 2, pcy + h * 0.33, // bottom-left
          pcx + sx(size) / 2, pcy + h * 0.33  // bottom-right
        ];
        if (fill !== null) poly(triPts, fill, true);
        if (stroke !== null) poly(triPts, stroke, false);
        break;
      }
      case 'group':
      case 'panel':
      case 'ui': {
        // Container: render children with this as parent rect
        if (tag === 'panel' && fill !== null) rect(sx(r.x), sy(r.y), sx(r.w), sy(r.h), fill);
        if (tag === 'panel' && attrs.title) {
          const titleH = parseFloat(attrs['title-height']) || 20;
          rect(sx(r.x), sy(r.y), sx(r.w), sy(titleH), 0x333355);
          const titleSize = parseFloat(attrs['title-size']) || 10;
          printCentered(attrs.title, sx(r.x + r.w / 2), sy(r.y + titleH / 2 - titleSize / 2), 0xffffff, (titleSize / 8) * scaleY);
        }
        for (const child of children) {
          _nmlRenderNode(child, r, data, handlers, scaleX, scaleY);
        }
        break;
      }
      case 'svg': {
        // Inline SVG block: parse the captured inner SVG and render its children
        // The parser captures raw SVG markup in attrs._innerSvg
        if (attrs._innerSvg) {
          // Parse the inner SVG as a root element and render its children
          const innerAst = _nmlParse('<root>' + attrs._innerSvg + '</root>');
          if (innerAst && innerAst.children) {
            // Create a rect for the SVG viewport
            const svgRect = { x: r.x, y: r.y, w: r.w || 128, h: r.h || 128 };
            // The inner elements use SVG coordinates, scale to fit the viewport
            // SVG viewBox would be [0,0,w,h] by default
            const svgW = parseFloat(attrs.viewBoxW) || svgRect.w;
            const svgH = parseFloat(attrs.viewBoxH) || svgRect.h;
            const innerScaleX = svgRect.w / svgW;
            const innerScaleY = svgRect.h / svgH;
            for (const child of innerAst.children) {
              // Render with combined scaling
              _nmlRenderNode(child, svgRect, data, handlers, scaleX * innerScaleX, scaleY * innerScaleY);
            }
          }
        } else {
          // External SVG (src=) - not supported, just render children
          for (const child of children) {
            _nmlRenderNode(child, r, data, handlers, scaleX, scaleY);
          }
        }
        break;
      }
      default:
        // Unknown tag — try rendering children
        for (const child of children) {
          _nmlRenderNode(child, parentRect, data, handlers, scaleX, scaleY);
        }
    }
  }

  class CanvasUIScene {
    constructor(ast, opts = {}) {
      this.ast = ast;
      this.NW = parseInt(ast?.attrs?.width || NML_W);
      this.NH = parseInt(ast?.attrs?.height || NML_H);
      this.state = new Map();
    }
    update(dt) {
      // Animation state updates would go here
    }
    render(data = {}, handlers = {}) {
      if (!this.ast) return;
      // The C++ overlay_scale() already handles 640x360 → screen scaling,
      // so we pass scale=1 to avoid double-scaling
      _nmlRenderNode(this.ast, null, data, handlers, 1, 1);
    }
    destroy() { this.ast = null; }
  }

  function parseCanvasUI(xmlString, opts = {}) {
    const ast = _nmlParse(xmlString);
    if (!ast) { console.warn('[CanvasUI] Failed to parse NML'); return makeStub(); }
    return new CanvasUIScene(ast, opts);
  }
  function renderCanvasUI(scene, data = {}, handlers = {}) {
    if (scene?.render) scene.render(data, handlers);
  }
  function updateCanvasUI(scene, dt) {
    if (scene?.update) scene.update(dt);
  }
  function destroyCanvasUI(scene) {
    if (scene?.destroy) scene.destroy();
  }

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

  function _cssColorToHex(value, fallback) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return fallback == null ? 0xffffff : fallback;
    const s = value.trim();
    if (s[0] === '#') return parseInt(s.slice(1), 16) || 0;
    const rgba = s.match(/rgba?\(([^)]+)\)/i);
    if (rgba) {
      const parts = rgba[1].split(',').map(function (v) { return parseFloat(v); });
      return rgba8(parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] == null ? 255 : parts[3] * 255);
    }
    const hsla = s.match(/hsla?\(([^)]+)\)/i);
    if (hsla) {
      const parts = hsla[1].split(',');
      return hslColor(parseFloat(parts[0]) || 0, (parseFloat(parts[1]) || 0) / 100, (parseFloat(parts[2]) || 0) / 100, parts[3] == null ? 255 : parseFloat(parts[3]) * 255);
    }
    return fallback == null ? 0xffffff : fallback;
  }
  function _makeCanvasContext() {
    const ctx = {
      fillStyle: 0xffffff,
      strokeStyle: 0xffffff,
      globalAlpha: 1,
      lineWidth: 1,
      font: '8px monospace',
      textAlign: 'left',
      textBaseline: 'top',
      _stack: [],
      _tx: 0, _ty: 0, _sx: 1, _sy: 1,
      save() { this._stack.push([this.fillStyle, this.strokeStyle, this.globalAlpha, this.lineWidth, this.font, this.textAlign, this.textBaseline, this._tx, this._ty, this._sx, this._sy]); },
      restore() { const s = this._stack.pop(); if (!s) return; this.fillStyle=s[0]; this.strokeStyle=s[1]; this.globalAlpha=s[2]; this.lineWidth=s[3]; this.font=s[4]; this.textAlign=s[5]; this.textBaseline=s[6]; this._tx=s[7]; this._ty=s[8]; this._sx=s[9]; this._sy=s[10]; },
      translate(x, y) { this._tx += (x || 0) * this._sx; this._ty += (y || 0) * this._sy; },
      scale(x, y) { this._sx *= x || 1; this._sy *= y == null ? (x || 1) : y; },
      createLinearGradient() {
        const stops = [];
        return { stops, addColorStop(_p, c) { stops.push(c); }, _isGradient: true };
      },
      _color(v) {
        const c = v && v._isGradient ? (v.stops[Math.floor(v.stops.length / 2)] || 0xffffff) : v;
        const hex = _cssColorToHex(c, 0xffffff);
        if (this.globalAlpha >= 0.999) return hex;
        const u = colorFromHex(hex);
        return [u[0], u[1], u[2], u[3] * this.globalAlpha];
      },
      fillRect(x, y, w, h) { rectfill(this._tx + x * this._sx, this._ty + y * this._sy, w * this._sx, h * this._sy, this._color(this.fillStyle)); },
      strokeRect(x, y, w, h) { rect(this._tx + x * this._sx, this._ty + y * this._sy, w * this._sx, h * this._sy, this._color(this.strokeStyle), false); },
      beginPath() { this._path = []; },
      moveTo(x, y) { this._path = [[x, y]]; },
      lineTo(x, y) { if (!this._path) this._path = []; this._path.push([x, y]); },
      quadraticCurveTo(_cx, _cy, x, y) { this.lineTo(x, y); },
      rect(x, y, w, h) {
        this._path = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
      },
      closePath() {},
      fill() {
        if (!this._path || this._path.length < 3) return;
        const pts = [];
        for (let i = 0; i < this._path.length; i++) {
          pts.push(this._tx + this._path[i][0] * this._sx, this._ty + this._path[i][1] * this._sy);
        }
        poly(pts, this._color(this.fillStyle), true);
      },
      stroke() { if (!this._path) return; for (let i = 1; i < this._path.length; i++) line(this._tx + this._path[i-1][0] * this._sx, this._ty + this._path[i-1][1] * this._sy, this._tx + this._path[i][0] * this._sx, this._ty + this._path[i][1] * this._sy, this._color(this.strokeStyle)); },
      _textPos(text, x, y) {
        const scale = Math.max(1, Math.abs(this._sx));
        const s = String(text == null ? '' : text);
        let px = this._tx + x * this._sx;
        let py = this._ty + y * this._sy;
        const align = this.textAlign || 'left';
        const baseline = this.textBaseline || 'alphabetic';
        const width = s.length * 6 * scale;
        const height = 8 * scale;
        if (align === 'center') px -= width / 2;
        else if (align === 'right' || align === 'end') px -= width;
        if (baseline === 'middle') py -= height / 2;
        else if (baseline === 'bottom' || baseline === 'ideographic') py -= height;
        return [s, px, py, scale];
      },
      fillText(text, x, y) {
        const p = this._textPos(text, x, y);
        novaPrint(p[0], p[1], p[2], this._color(this.fillStyle), p[3]);
      },
      strokeText(text, x, y) {
        const p = this._textPos(text, x, y);
        novaPrint(p[0], p[1], p[2], this._color(this.strokeStyle), p[3]);
      },
      arc(x, y, r) { circle(this._tx + x * this._sx, this._ty + y * this._sy, Math.abs(r * this._sx), this._color(this.fillStyle), true); },
    };
    return ctx;
  }

  // Stage / screens / movie clip / graphics nodes
  function createContainer() { return { children: [], x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1 }; }
  function addChild(parent, child) { if (parent && child) { (parent.children || (parent.children = [])).push(child); child.parent = parent; } return child; }
  function createGraphicsNode(drawFn) {
    const node = createContainer();
    node.draw = typeof drawFn === 'function' ? drawFn : function () {};
    node.tweenTo = function (props, dur, opts) { return createTween(node, props, dur, opts || {}); };
    return node;
  }
  function createTextNode(text, opts) {
    opts = opts || {};
    const node = createContainer();
    node.text = text || '';
    node.color = opts.color == null ? 0xffffff : opts.color;
    node.draw = function (_ctx, n) { novaPrint(n.text, n.x || 0, n.y || 0, n.color); };
    node.tweenTo = function (props, dur, twOpts) { return createTween(node, props, dur, twOpts || {}); };
    return node;
  }
  function drawStage(root) {
    const ctx = _makeCanvasContext();
    function drawNode(node) {
      if (!node) return;
      ctx.save();
      ctx.globalAlpha *= node.alpha == null ? 1 : node.alpha;
      ctx.translate(node.x || 0, node.y || 0);
      ctx.scale(node.scaleX == null ? 1 : node.scaleX, node.scaleY == null ? 1 : node.scaleY);
      if (typeof node.draw === 'function') node.draw(ctx, node);
      const kids = node.children || [];
      for (let i = 0; i < kids.length; i++) drawNode(kids[i]);
      ctx.restore();
    }
    drawNode(root);
  }
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
  function createParticleSystem(maxParticles, opts) {
    if (typeof maxParticles === 'number') {
      return createParticles(Object.assign({}, opts || {}, { count: maxParticles, amount: maxParticles }));
    }
    return createParticles(maxParticles || {});
  }
  function createEmitter2D(opts) {
    opts = opts || {};
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      tint: opts.tint == null ? 0xffffff : opts.tint,
      blendMode: opts.blendMode || opts.blending || 'source-over',
      maxParticles: opts.maxParticles || 128,
      emitRate: opts.emitRate || 0,
      speed: opts.speed || [20, 80],
      angle: opts.angle || [-Math.PI, Math.PI],
      life: opts.life || [0.4, 1.2],
      scale: opts.scale || [1, 2],
      gravity: opts.gravity || 0,
      fadeOut: opts.fadeOut !== false,
      scaleDown: opts.scaleDown !== false,
      particles: [],
      _carry: 0,
    };
  }
  function _range(v, fallback) {
    if (Array.isArray(v)) return (v[0] || 0) + Math.random() * ((v[1] == null ? v[0] : v[1]) - (v[0] || 0));
    return v == null ? fallback : v;
  }
  function _spawnEmitterParticle(em) {
    if (!em || em.particles.length >= em.maxParticles) return;
    const a = _range(em.angle, 0);
    const sp = _range(em.speed, 50);
    const life = Math.max(0.01, _range(em.life, 1));
    em.particles.push({
      x: em.x || 0,
      y: em.y || 0,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      age: 0,
      size: Math.max(1, _range(em.scale, 1)),
      color: em.tint == null ? 0xffffff : em.tint,
    });
  }
  function burstEmitter2D(em, count) {
    count = count == null ? 16 : count;
    for (let i = 0; i < count; i++) _spawnEmitterParticle(em);
  }
  function updateEmitter2D(em, dt) {
    if (!em) return;
    if (em.emitRate > 0) {
      em._carry += em.emitRate * dt;
      while (em._carry >= 1) { _spawnEmitterParticle(em); em._carry -= 1; }
    }
    const g = em.gravity || 0;
    for (let i = em.particles.length - 1; i >= 0; i--) {
      const p = em.particles[i];
      p.age += dt;
      if (p.age >= p.life) { em.particles.splice(i, 1); continue; }
      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  function drawEmitter2D(em) {
    if (!em) return;
    for (let i = 0; i < em.particles.length; i++) {
      const p = em.particles[i];
      const t = Math.max(0, Math.min(1, p.age / p.life));
      const alpha = em.fadeOut ? Math.floor((1 - t) * 255) : 255;
      const size = Math.max(1, em.scaleDown ? p.size * (1 - t) : p.size);
      circle(p.x, p.y, size, (alpha << 24) | (p.color & 0xffffff), true);
    }
  }
  function clearEmitter2D(em) {
    if (em && em.particles) em.particles.length = 0;
  }
  function _particleSystemFor(id) {
    const h = unwrapHandle(id);
    return h ? particleSystemState.get(h) : null;
  }
  function _particleLife(sys, overrides) {
    overrides = overrides || {};
    const minLife = overrides.minLife == null ? sys.emitter.minLife : overrides.minLife;
    const maxLife = overrides.maxLife == null ? sys.emitter.maxLife : overrides.maxLife;
    return Math.max(0.01, minLife + Math.random() * Math.max(0, maxLife - minLife));
  }
  function _trackParticleSpawn(sys, count, overrides) {
    if (!sys) return;
    count = Math.max(0, count | 0);
    for (let i = 0; i < count && sys.particles.length < sys.maxParticles; i++) {
      sys.particles.push({ age: 0, life: _particleLife(sys, overrides) });
    }
    sys.activeCount = sys.particles.length;
  }
  function setParticleEmitter(systemId, emitter) {
    const sys = _particleSystemFor(systemId);
    if (!sys) return;
    Object.assign(sys.emitter, emitter || {});
    if (sys.handle && (emitter.emitterX != null || emitter.emitterY != null || emitter.emitterZ != null)) {
      call('transform.set', {
        handle: sys.handle,
        position: [
          emitter.emitterX == null ? sys.emitter.emitterX : emitter.emitterX,
          emitter.emitterY == null ? sys.emitter.emitterY : emitter.emitterY,
          emitter.emitterZ == null ? sys.emitter.emitterZ : emitter.emitterZ,
        ],
      });
    }
  }
  function emitParticle(systemId, overrides) {
    _trackParticleSpawn(_particleSystemFor(systemId), 1, overrides || {});
  }
  function burstParticles(systemId, count, overrides) {
    _trackParticleSpawn(_particleSystemFor(systemId), count == null ? 10 : count, overrides || {});
  }
  function updateParticles(dt) {
    let total = 0;
    particleSystemState.forEach(function (sys) {
      sys.emitAccum += (sys.emitter.emitRate || 0) * (dt || 0);
      while (sys.emitAccum >= 1) {
        _trackParticleSpawn(sys, 1);
        sys.emitAccum -= 1;
      }
      for (let i = sys.particles.length - 1; i >= 0; i--) {
        const p = sys.particles[i];
        p.age += dt || 0;
        if (p.age >= p.life) sys.particles.splice(i, 1);
      }
      sys.activeCount = sys.particles.length;
      total += sys.activeCount;
    });
    return total;
  }
  function removeParticleSystem(systemId) {
    const h = unwrapHandle(systemId);
    if (!h) return false;
    call('particles.destroy', { handle: h });
    particleSystemState.delete(h);
    if (systemId && typeof systemId === 'object') systemId.handle = 0;
    return true;
  }
  function getParticleStats(systemId) {
    const sys = _particleSystemFor(systemId);
    if (!sys) return null;
    return {
      active: sys.activeCount,
      max: sys.maxParticles,
      free: Math.max(0, sys.maxParticles - sys.activeCount),
    };
  }
  function createParticles(opts) {
    ensureInit();
    opts = opts || {};
    const amount = opts.count || opts.amount || 64;
    const particleColor = typeof opts.color === 'number' ? opts.color
      : (typeof opts.startColor === 'number' ? opts.startColor
        : (typeof opts.emissive === 'number' ? opts.emissive : 0xffffff));
    // Need a draw-pass mesh — make a small sphere by default.
    const geomR = call('geometry.createSphere', { radius: 0.08, height: 0.16 });
    if (!geomR) return makeStub();
    // Optional emissive material so particles glow.
    const mat = call('material.create', {
      albedo: colorFromHex(particleColor),
      unshaded: true,
      emission: colorFromHex(particleColor),
      emissionEnergy: typeof opts.emissionEnergy === 'number' ? opts.emissionEnergy : 1.5,
      blend: 'add',
    });
    const r = call('particles.create', {
      geometry: geomR.handle,
      material: mat ? mat.handle : 0,
      amount,
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
    particleSystemState.set(r.handle, {
      handle: r.handle,
      maxParticles: amount,
      activeCount: 0,
      emitAccum: 0,
      particles: [],
      emitter: {
        emitRate: opts.emitRate || 0,
        minLife: opts.minLife || 0.8,
        maxLife: opts.maxLife || opts.lifetime || 2.0,
        emitterX: opts.emitterX || 0,
        emitterY: opts.emitterY || 0,
        emitterZ: opts.emitterZ || 0,
      },
    });
    return makeStub({
      handle: r.handle,
      destroy() { removeParticleSystem(r.handle); },
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
  // Gradient and image skyboxes — gradient uses procedural sky colors, image is stubbed.
  function createGradientSkybox(topColor, bottomColor) {
    ensureInit();
    const payload = { sky: true };
    if (typeof topColor === 'number') payload.skyTopColor = colorFromHex(topColor);
    if (typeof bottomColor === 'number') payload.groundBottomColor = colorFromHex(bottomColor);
    call('env.set', payload);
    return 1;
  }
  async function createImageSkybox(_urls) {
    // Image-based skybox (cubemap) not supported yet — reject so carts use their fallback.
    ensureInit();
    return Promise.reject(new Error('createImageSkybox not supported in Godot adapter'));
  }
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
  // Matches the Three.js signature: loadModel(url, position?, scale?, materialOptions?)
  // → Promise<handle>. Also accepts a legacy callback form (path, cb) used by
  // older carts; in that case cb is invoked with the resolved handle.
  function loadModel(path, position, scale, materialOptions) {
    ensureInit();
    const legacyCb = typeof position === 'function' ? position : null;
    const pos = (Array.isArray(position) && position.length >= 3) ? position : null;
    const sc = (typeof scale === 'number') ? scale : null;

    let resPath = path;
    if (typeof path === 'string'
        && !path.startsWith('res://')
        && !path.startsWith('user://')
        && !path.startsWith('/')) {
      const cart = (typeof globalThis.__nova64_cart_path === 'string')
          ? globalThis.__nova64_cart_path : 'res://carts/current';
      resPath = cart.replace(/\/?$/, '/') + path.replace(/^\.?\//, '');
    }

    const payload = { path: resPath };
    if (pos) payload.position = pos;
    if (sc != null) payload.scale = sc;

    const r = call('model.load', payload);
    const handle = (r && r.handle) ? r.handle : 0;

    if (legacyCb) {
      try { legacyCb(handle); } catch (_e) { /* swallow */ }
    }

    // Match the Three.js Promise<handle> shape; carts that `await loadModel(...)`
    // get the handle directly. Synchronous bridge call means resolution is immediate.
    return Promise.resolve(handle);
  }
  // loadVoxModel(url, position?, scale?, options?) -> Promise<handle>. Mirrors
  // the Three.js VOXLoader entrypoint; the bridge parses the .vox file
  // natively and builds the authored voxel mesh.
  function loadVoxModel(path, position, scale, _options) {
    ensureInit();
    const pos = (Array.isArray(position) && position.length >= 3) ? position : null;
    const sc = (typeof scale === 'number') ? scale : null;

    let resPath = path;
    if (typeof path === 'string'
        && !path.startsWith('res://')
        && !path.startsWith('user://')
        && !path.startsWith('/')) {
      const cart = (typeof globalThis.__nova64_cart_path === 'string')
          ? globalThis.__nova64_cart_path : 'res://carts/current';
      resPath = cart.replace(/\/?$/, '/') + path.replace(/^\.?\//, '');
    }

    const payload = { path: resPath };
    if (pos) payload.position = pos;
    if (sc != null) payload.scale = sc;

    const r = call('vox.load', payload);
    if (r && r.error) {
      return Promise.reject(new Error(r.message || r.method || r.error));
    }
    return Promise.resolve((r && r.handle) ? r.handle : 0);
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
  function _lerpByte(a, b, t) { return Math.max(0, Math.min(255, Math.round(a + (b - a) * t))); }
  function _clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function _smooth01(v) { v = _clamp01(v); return v * v * (3 - 2 * v); }
  function _wave01(v) { return Math.sin(v) * 0.5 + 0.5; }
  function _hsvToRgbBytes(h, s, v) {
    h = ((h % 1) + 1) % 1;
    s = _clamp01(s);
    v = _clamp01(v);
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = v, g = t, b = p;
    if (i % 6 === 1) { r = q; g = v; b = p; }
    else if (i % 6 === 2) { r = p; g = v; b = t; }
    else if (i % 6 === 3) { r = p; g = q; b = v; }
    else if (i % 6 === 4) { r = t; g = p; b = v; }
    else if (i % 6 === 5) { r = v; g = p; b = q; }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  function _pushPixel(pixels, r, g, b, a) {
    pixels.push(r & 255, g & 255, b & 255, a == null ? 255 : (a & 255));
  }
  function _proceduralTexture(name) {
    ensureInit();
    if (proceduralTextureState.has(name)) return proceduralTextureState.get(name);
    const w = 96, h = 96, pixels = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const v = y / (h - 1);
        if (name === 'grid') {
          const gx = Math.abs(((u * 24) % 1) - 0.5);
          const gy = Math.abs(((v * 36) % 1) - 0.5);
          const line = gx > 0.47 || gy > 0.47;
          const edge = Math.abs(u - 0.5) * 2;
          const fade = Math.max(0, Math.min(1, v * 1.4));
          const r = _lerpByte(0, 255, edge);
          const g = _lerpByte(255, 0, edge * 0.6);
          const b = _lerpByte(230, 255, edge);
          _pushPixel(pixels, r, g, b, line ? Math.floor(235 * fade) : 12);
        } else if (name === 'terrain') {
          const n = (Math.sin(u * 37.0) + Math.sin(v * 51.0 + u * 11.0) + Math.sin((u + v) * 29.0)) / 3;
          const ridge = Math.max(0, n);
          const wire = Math.abs(((u * 10) % 1) - 0.5) > 0.46 || Math.abs(((v * 28) % 1) - 0.5) > 0.47;
          const r = _lerpByte(15, 255, ridge * 0.8);
          const g = _lerpByte(0, wire ? 210 : 40, ridge);
          const b = _lerpByte(70, 210, 1 - ridge * 0.3);
          _pushPixel(pixels, r, g, b, 215);
        } else if (name === 'cloud') {
          const n = (Math.sin(u * 18.0 + v * 4.0) + Math.sin(u * 31.0 - v * 8.0) + Math.sin((u + v) * 22.0)) / 3;
          const a = Math.max(0, Math.min(180, Math.floor((n + 0.55) * 140)));
          _pushPixel(pixels, 60, 235, 255, a);
        } else if (name === 'galaxy') {
          const cx = u - 0.5, cy = v - 0.5;
          const d = Math.sqrt(cx * cx + cy * cy);
          const a = Math.atan2(cy, cx);
          const arm = _smooth01((_wave01(a * 3.5 + d * 34.0) - 0.34) * 2.1) * Math.max(0, 1 - d * 1.25);
          const haze = _smooth01((_wave01(u * 11.0 - v * 8.0) + arm - 0.58) * 1.6);
          const starSeed = Math.sin((x + 17) * 127.1 + (y + 31) * 311.7) * 43758.5453;
          const star = (starSeed - Math.floor(starSeed)) > 0.985 ? 1 : 0;
          const scan = (y % 3 === 0) ? 0.72 : 1.0;
          const glow = Math.max(arm, haze * 0.7);
          const r = Math.floor(_lerpByte(28, 255, glow) * scan + star * 55);
          const g = Math.floor(_lerpByte(8, 130, glow * 0.52) * scan + star * 70);
          const b = Math.floor(_lerpByte(55, 255, Math.max(glow, star)) * scan);
          _pushPixel(pixels, r, g, b, Math.floor(130 + glow * 105 + star * 20));
        } else if (name === 'plasma' || name === 'plasma2') {
          const swirl = _wave01(u * 8.0 + Math.sin(v * 5.0) * 1.7)
            + _wave01(v * 9.0 + Math.sin(u * 7.0) * 1.4)
            + _wave01((u - v) * 6.0);
          const field = swirl / 3;
          const magenta = _smooth01((field - 0.34) * 2.1);
          const cyan = _smooth01((_wave01(u * 13.0 - v * 10.0) * field - 0.46) * 3.8);
          const white = _smooth01((cyan - 0.58) * 2.6);
          const plasma2Bias = name === 'plasma2' ? 0.14 : 0;
          const r = _lerpByte(58, 255, Math.max(magenta, white));
          const g = _lerpByte(72, 255, cyan * 0.95 + white * 0.4);
          const b = _lerpByte(185, 255, Math.max(cyan, magenta * 0.55 + plasma2Bias));
          _pushPixel(pixels, r, g, b, 245);
        } else if (name === 'lava' || name === 'lava2') {
          const heat = 0.86 + _wave01(u * 9.0 + Math.sin(v * 5.0) * 1.5) * 0.10
            + _wave01((u + v) * 7.0) * 0.06;
          const scan = (y % 3 === 0) ? 0.86 : 1.0;
          const glow = _clamp01(name === 'lava2' ? heat + 0.06 : heat);
          const r = Math.floor(_lerpByte(235, 255, glow) * scan);
          const g = Math.floor(_lerpByte(108, 252, glow) * scan);
          const b = Math.floor(_lerpByte(12, 76, glow) * scan);
          _pushPixel(pixels, r, g, b, 255);
        } else if (name === 'fire') {
          const crack = Math.abs(Math.sin(u * 34.0 + Math.sin(v * 9.0) * 2.0))
            * Math.abs(Math.sin(v * 28.0 + Math.sin(u * 12.0) * 2.4));
          const heat = _smooth01(1 - crack * 1.65 + _wave01((u - v) * 17.0) * 0.25);
          const glow = name === 'lava2' ? _clamp01(heat * 1.15) : heat;
          const r = _lerpByte(50, 255, glow);
          const g = _lerpByte(5, name === 'lava2' ? 190 : 92, glow * glow);
          const b = _lerpByte(0, 22, glow);
          _pushPixel(pixels, r, g, b, 255);
        } else if (name === 'electricity') {
          const pathA = 0.5 + Math.sin(v * 15.0) * 0.13 + Math.sin(v * 47.0) * 0.045;
          const pathB = 0.28 + Math.sin(v * 11.0 + 1.4) * 0.10 + Math.sin(v * 39.0) * 0.035;
          const boltA = Math.abs(u - pathA);
          const boltB = Math.abs(u - pathB);
          const core = Math.max(_smooth01(1 - boltA * 34.0), _smooth01(1 - boltB * 28.0) * 0.75);
          const branch = _smooth01(1 - Math.abs((u + v * 0.72) % 0.38 - 0.19) * 24.0) * _wave01(v * 34.0);
          const glow = _clamp01(core + branch * 0.35);
          _pushPixel(pixels, _lerpByte(4, 190, glow), _lerpByte(20, 255, glow), 255, Math.floor(32 + glow * 210));
        } else if (name === 'rainbow') {
          const field = _wave01(u * 7.0 + Math.sin(v * 5.0) * 1.6);
          const violet = _smooth01((_wave01((u + v) * 8.0) - 0.62) * 3.1);
          const green = _smooth01((_wave01(u * 5.0 - v * 6.0) - 0.36) * 1.8);
          const white = _smooth01((field - 0.78) * 2.4);
          const r = _lerpByte(8, 190, violet * 0.85 + white * 0.55);
          const g = _lerpByte(168, 255, green * 0.85 + white * 0.35);
          const b = _lerpByte(210, 255, Math.max(field * 0.9, white * 0.6));
          _pushPixel(pixels, r, g, b, 245);
        } else if (name === 'water') {
          const ripple = _wave01(v * 42.0 + Math.sin(u * 16.0) * 3.5) * 0.55
            + _wave01((u + v) * 24.0) * 0.45;
          const foam = _smooth01((ripple - 0.62) * 4.0);
          _pushPixel(pixels, _lerpByte(6, 116, foam), _lerpByte(70, 235, ripple), _lerpByte(145, 255, ripple), 205);
        } else if (name === 'hologram') {
          const line = Math.abs(((v * 38.0) % 1) - 0.5) > 0.43;
          const pulse = _wave01(u * 18.0 + v * 6.0);
          _pushPixel(pixels, 20, _lerpByte(155, 255, pulse), 255, line ? 235 : 95);
        } else if (name === 'shockwave') {
          const cx = u - 0.5, cy = v - 0.5;
          const d = Math.sqrt(cx * cx + cy * cy);
          const rings = Math.max(0, 1 - Math.abs(Math.sin(d * 58.0)) * 2.7);
          const glow = _smooth01(rings * Math.max(0, 1 - d * 1.15));
          _pushPixel(pixels, _lerpByte(80, 255, glow), _lerpByte(135, 255, glow), 255, Math.floor(70 + glow * 185));
        } else if (name === 'vortex') {
          const cx = u - 0.5, cy = v - 0.5;
          const d = Math.sqrt(cx * cx + cy * cy);
          const a = Math.atan2(cy, cx);
          const spiral = _smooth01((_wave01(a * 3.0 + d * 26.0) - 0.38) * 2.6);
          const flare = _smooth01((_wave01(a * 1.4 - d * 19.0) - 0.56) * 3.5);
          const glow = Math.max(spiral * Math.max(0, 1 - d * 0.9), flare);
          const white = _smooth01((glow - 0.68) * 3.2);
          _pushPixel(pixels, _lerpByte(8, 245, white), _lerpByte(64, 255, glow), _lerpByte(105, 255, Math.max(glow, white)), Math.floor(70 + glow * 165));
        } else if (name === 'void') {
          const cx = u - 0.5, cy = v - 0.5;
          const d = Math.sqrt(cx * cx + cy * cy);
          const a = Math.atan2(cy, cx);
          const spiral = _wave01(a * 4.0 + d * 54.0);
          const rim = _smooth01((0.55 - Math.abs(d - 0.33)) * 3.2);
          const glow = Math.max(spiral * rim, Math.max(0, 1 - d * 2.5) * 0.8);
          _pushPixel(pixels, _lerpByte(8, 170, glow), _lerpByte(2, 55, glow), _lerpByte(32, 255, glow), Math.floor(80 + glow * 175));
        } else {
          const cx = u - 0.5, cy = v - 0.5;
          const d = Math.sqrt(cx * cx + cy * cy);
          const a = Math.atan2(cy, cx);
          const spiral = Math.sin(a * 3.0 + d * 42.0);
          const core = Math.max(0, 1 - d * 2.3);
          const arm = Math.max(0, spiral * 0.5 + 0.5) * Math.max(0, 1 - d * 1.4);
          const glow = Math.max(core, arm);
          const r = _lerpByte(50, 255, arm);
          const g = _lerpByte(80, 190, core);
          const b = _lerpByte(190, 255, glow);
          _pushPixel(pixels, r, g, b, Math.floor(Math.min(255, glow * 255)));
        }
      }
    }
    const handle = createTexture({ width: w, height: h, pixels });
    proceduralTextureState.set(name, handle);
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
    if (r && r.handle) materialPayloadState.set(r.handle, Object.assign({}, payload));
    return r ? r.handle : 0;
  }
  function setPBRProperties(handle, opts) {
    ensureInit();
    const meshHandle = unwrapHandle(handle);
    if (!meshHandle) return 0;
    opts = opts || {};
    const prev = meshMaterialState.get(meshHandle) || {};
    const payload = Object.assign({}, prev.payload || {});
    const next = materialPayload(opts.color != null ? opts.color : null, Object.assign({}, opts));
    if (opts.color == null && opts.albedo == null && opts.map == null && opts.texture == null
        && opts.albedoTexture == null && opts.diffuseMap == null) {
      delete next.albedo;
      delete next.albedoTexture;
    }
    Object.assign(payload, next);
    if (typeof opts.metalness === 'number') payload.metallic = opts.metalness;
    if (typeof opts.metallic === 'number') payload.metallic = opts.metallic;
    if (typeof opts.roughness === 'number') payload.roughness = opts.roughness;
    if (typeof opts.envMapIntensity === 'number') payload.envMapIntensity = opts.envMapIntensity;
    if (typeof opts.opacity === 'number' && opts.opacity < 1) payload.transparency = 'alpha';
    const r = call('material.create', payload);
    if (!r || !r.handle) return 0;
    materialPayloadState.set(r.handle, Object.assign({}, payload));
    meshMaterialState.set(meshHandle, { material: r.handle, payload: Object.assign({}, payload) });
    call('mesh.setMaterial', { mesh: meshHandle, material: r.handle });
    return r.handle;
  }
  function createEngineMaterial(_kind, opts) {
    ensureInit();
    opts = opts || {};
    const payload = materialPayload(opts.color != null ? opts.color : 0xffffff, opts);
    const tex = opts.map || opts.texture || opts.albedoTexture || opts.diffuseMap;
    if (tex) {
      payload.albedoTexture = unwrapHandle(tex);
      if (tex.__uvScale) payload.uvScale = tex.__uvScale.slice();
    }
    if (opts.transparent) payload.transparency = 'alpha';
    if (opts.alphaTest != null) payload.alphaCut = opts.alphaTest;
    if (opts.side === 'double') payload.doubleSided = true;
    const r = call('material.create', payload);
    if (!r || !r.handle) return 0;
    materialPayloadState.set(r.handle, Object.assign({}, payload));
    return r.handle;
  }
  function setMeshMaterial(mesh, material) {
    const meshHandle = unwrapHandle(mesh);
    const matHandle = unwrapHandle(material);
    if (!meshHandle || !matHandle) return;
    const payload = Object.assign({}, materialPayloadState.get(matHandle) || {});
    meshMaterialState.set(meshHandle, { material: matHandle, payload });
    call('mesh.setMaterial', { mesh: meshHandle, material: matHandle });
  }
  function createEngineColor(r, g, b, a) {
    return { r: r == null ? 1 : r, g: g == null ? 1 : g, b: b == null ? 1 : b, a: a == null ? 1 : a };
  }
  function cloneTexture(texture) {
    if (!texture) return texture;
    const copy = Object.assign({}, texture);
    if (texture.__uvScale) copy.__uvScale = texture.__uvScale.slice();
    return copy;
  }
  function setTextureRepeat(texture, u, v) {
    if (texture) texture.__uvScale = [u || 1, v || 1, 1];
    return texture;
  }
  function setWallUVs(mesh, wallW, wallH, texW, texH, _xoff, _yoff) {
    const meshHandle = unwrapHandle(mesh);
    if (!meshHandle) return;
    const prev = meshMaterialState.get(meshHandle);
    if (!prev || !prev.payload) return;
    const payload = Object.assign({}, prev.payload, {
      uvScale: [
        texW ? Math.max(0.001, wallW / texW) : 1,
        texH ? Math.max(0.001, wallH / texH) : 1,
        1,
      ],
    });
    const r = call('material.create', payload);
    if (!r || !r.handle) return;
    materialPayloadState.set(r.handle, Object.assign({}, payload));
    meshMaterialState.set(meshHandle, { material: r.handle, payload });
    call('mesh.setMaterial', { mesh: meshHandle, material: r.handle });
  }
  // Hologram = unshaded + emissive + additive blend + rim glow.
  function createHologramMaterial(opts) {
    ensureInit();
    return createTSLMaterial('hologram', opts || {});
  }
  function createVortexMaterial(opts) {
    ensureInit();
    return createTSLMaterial('vortex', opts || {});
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
        color: 0xffee55, emission: 0xffaa22, emissionEnergy: 4.2,
        blend: 'add', metallic: 0.05, roughness: 0.72,
      },
      lava2: {
        color: 0xffff55, emission: 0xffcc00, emissionEnergy: 4.4,
        blend: 'add', metallic: 0, roughness: 0.55,
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
        color: 0x44ffdd, emission: 0x22ffbb, emissionEnergy: 3.2,
        blend: 'add', metallic: 0.35, roughness: 0.28,
      },
      // Swirling vortex portal
      vortex: {
        color: 0x44ffee, emission: 0x00ffff, emissionEnergy: 2.8,
        blend: 'add', metallic: 0.2, roughness: 0.6, rim: 0.5,
      },
      // Galaxy spiral
      galaxy: {
        color: 0xd088ff, emission: 0xff88ff, emissionEnergy: 1.9,
        blend: 'alpha', metallic: 0.15, roughness: 0.65,
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
    const textureName = {
      plasma: 'plasma',
      plasma2: 'plasma2',
      lava: 'lava',
      lava2: 'lava2',
      fire: 'fire',
      electricity: 'electricity',
      rainbow: 'rainbow',
      void: 'void',
      vortex: 'vortex',
      galaxy: 'galaxy',
      water: 'water',
      hologram: 'hologram',
      shockwave: 'shockwave',
      neon: 'grid',
      ice: 'water',
    }[name] || 'plasma';

    // Godot does not run the browser TSL graph yet, so give the fallback
    // material a small static shader texture plus emission map. This preserves
    // the cart's "procedural shader sampler" read at a glance instead of
    // collapsing every preset to one flat albedo color.
    const translucent = name === 'galaxy' || name === 'void' || name === 'vortex'
      || name === 'electricity'
      || name === 'water' || name === 'hologram' || name === 'shockwave'
      || name === 'ice';
    const maxEmission = name === 'lava' || name === 'lava2' ? 4.1 : (name === 'fire' || name === 'electricity' || name === 'rainbow' ? 3.25 : 2.35);
    const tonedPreset = Object.assign({}, preset, {
      blend: translucent ? (preset.blend === 'add' ? 'alpha' : preset.blend) : undefined,
      emissionEnergy: Math.min(preset.emissionEnergy || 1, maxEmission),
      opacity: name === 'galaxy' ? 0.82 : (name === 'water' ? 0.72 : (translucent ? 0.88 : 1.0)),
      uvScale: name === 'plasma' || name === 'plasma2'
        ? [1.0, 1.0, 1]
        : (name === 'rainbow'
        ? [0.9, 0.9, 1]
        : (name === 'electricity'
        ? [1.2, 1.2, 1]
        : (name === 'galaxy'
        ? [0.8, 0.8, 1]
        : (name === 'void' || name === 'vortex'
        ? [1.4, 1.4, 1]
        : [2.2, 2.2, 1])))),
    });
    if (opts.map == null && opts.albedoTexture == null && opts.texture == null) {
      const tex = _proceduralTexture(textureName);
      tonedPreset.map = tex;
      tonedPreset.emissionMap = tex;
    }
    const payload = materialPayload(tonedPreset.color, Object.assign({
      opacity: opts.opacity == null ? (translucent ? 0.9 : 1.0) : opts.opacity,
      transparent: translucent,
      unshaded: true,
      cull: 'disabled',
      doubleSided: true,
    }, tonedPreset, opts));
    if (payload.emissionEnergy != null && opts.emissionEnergy == null && opts.emissiveIntensity == null) {
      payload.emissionEnergy = Math.min(payload.emissionEnergy, maxEmission);
    }

    const r = call('material.create', payload);
    if (r && r.handle) materialPayloadState.set(r.handle, Object.assign({}, payload));
    return r ? r.handle : 0;
  }
  function createTSLShaderMaterial(_vertexShader, fragmentShader, _uniforms, opts) {
    opts = opts || {};
    const src = typeof fragmentShader === 'string' ? fragmentShader.toLowerCase() : '';
    let kind = opts.kind || opts.type || 'plasma';
    if (src.indexOf('lava') >= 0 || src.indexOf('fire') >= 0) kind = 'lava';
    else if (src.indexOf('water') >= 0) kind = 'water';
    else if (src.indexOf('grid') >= 0 || src.indexOf('neon') >= 0) {
      kind = 'neon';
      opts = Object.assign({ map: _proceduralTexture('grid'), emissionMap: _proceduralTexture('grid'), color: 0x00ffff, emissive: 0xff00cc, opacity: 0.86, emissionEnergy: 1.25 }, opts);
    }
    else if (src.indexOf('cloud') >= 0 || src.indexOf('rainbow') >= 0) {
      kind = 'water';
      opts = Object.assign({ map: _proceduralTexture('cloud'), color: 0x44eaff, emissive: 0x00ccff, opacity: 0.45, emissionEnergy: 0.75 }, opts);
    }
    else if (src.indexOf('vheight') >= 0 || src.indexOf('fbm3') >= 0) {
      kind = 'vortex';
      opts = Object.assign({ map: _proceduralTexture('terrain'), emissionMap: _proceduralTexture('terrain'), color: 0x6611aa, emissive: 0x00ccff, opacity: 0.78, emissionEnergy: 1.05 }, opts);
    }
    else if (src.indexOf('void') >= 0 || src.indexOf('noise') >= 0) kind = 'void';
    else if (src.indexOf('rainbow') >= 0) kind = 'rainbow';
    return createTSLMaterial(kind, opts);
  }
  function createShaderMaterial(vertexShader, fragmentShader, uniforms, opts) {
    return createTSLShaderMaterial(vertexShader, fragmentShader, uniforms, opts);
  }
  function createLavaMaterial(opts) { return createTSLMaterial('lava2', opts); }
  function createPlasmaMaterial(opts) { return createTSLMaterial('plasma2', opts); }
  function createWaterMaterial(opts) { return createTSLMaterial('water', opts); }
  function createShockwaveMaterial(opts) { return createTSLMaterial('shockwave', opts); }
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
  const VX_RADIUS = 32;          // half-width in blocks (=> 64x64 columns) - fast loading, good coverage
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
  const VX_BLOCK_PALETTE = (function () {
    const p = {};
    for (const id in VX_BLOCK_COLORS) p[id] = VX_BLOCK_COLORS[id];
    return p;
  }());
  const vxBlocks = new Map();    // 'x,y,z' -> { id, mesh } (sparse, player edits)
  const vxMultimeshes = [];      // kept for legacy resetVoxelWorld compat
  const vxChunkHandles = [];     // legacy native chunk handles; vxLoadedChunks owns new chunk meshes
  const vxEntities = [];

  // Compute world seed matching the browser's resolveDefaultWorldSeed().
  // Browser resetWorld({ restoreDefaults: true, cartPath }) resolves the
  // active cart path before falling back to ?demo=... URLs, so Godot must do
  // the same once the host has exposed the cart path before shim evaluation.
  function _vxHashStringToSeed(input) {
    let hash = 2166136261;
    const text = String(input || 'nova64-voxel');
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 1000000;
  }
  function _vxResolveDefaultSeed() {
    const activeCartPath =
      global.__NOVA64_CURRENT_CART_PATH ||
      global.__nova64CurrentCartPath ||
      null;
    if (activeCartPath) {
      let normalizedPath = String(activeCartPath);
      const cartName = global.__nova64_cart_name;
      if (cartName && normalizedPath.indexOf('res://carts/') === 0) {
        normalizedPath = '/examples/' + cartName + '/code.js';
      }
      return _vxHashStringToSeed('nova64-cart-path:' + normalizedPath);
    }
    const cartName = global.__nova64_cart_name;
    if (cartName) {
      return _vxHashStringToSeed('nova64-demo:' + cartName);
    }
    return 1337; // fallback
  }

  const vxConfig = {
    seed: _vxResolveDefaultSeed(),
    renderDistance: 3,
    maxMeshRebuildsPerFrame: 3,
    enableLOD: true,
    enableCaves: true,
    enableOres: true,
    enableTrees: true,
    enableLava: true,
    enableWaterPlane: false,
  };
  let vxGenerated = false;
  let vxWaterMesh = 0;

  // Chunk streaming state
  const VX_CHUNK_SIZE = 16;      // blocks per chunk side
  const VX_CHUNK_HEIGHT = 128;   // matches runtime/api-voxel.js CHUNK_HEIGHT
  const VX_CHUNK_RADIUS = 4;     // fallback radius when cart does not configure renderDistance
  const vxLoadedChunks = new Map(); // 'cx,cz' -> { meshHandles: [...], waterMesh: handle }
  let vxLastPlayerChunkX = null;
  let vxLastPlayerChunkZ = null;
  // Cached height / biome lookups to avoid re-computing FBM per block per chunk.
  const _vxHeightCache = new Map();
  const _vxBiomeCache  = new Map();

  function _vxKey(x, y, z) { return ((x | 0) + ',' + (y | 0) + ',' + (z | 0)); }
  function _vxColKey(x, z) { return ((x | 0) + ',' + (z | 0)); }
  function _vxChunkRadius() {
    const r = vxConfig && vxConfig.renderDistance != null ? vxConfig.renderDistance : VX_CHUNK_RADIUS;
    return Math.max(1, Math.min(6, r | 0));
  }

  // Deterministic hash used for ore/tree scatter decisions.
  function _vxHash2(x, y, seed) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
    h = (h ^ (h >>> 13)) >>> 0;
    h = (h * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  // Fast 3D hash for ore generation
  function _vxHash3(x, y, z, seed) {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (z | 0) * 1013904223 + (seed | 0) * 1274126177;
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
    const seededRandom = s => {
      const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1));
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

    // 3D Simplex noise for ore vein generation
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    const dot3 = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z;

    function noise3D(xin, yin, zin) {
      let n0, n1, n2, n3;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const X0 = i - t, Y0 = j - t, Z0 = k - t;
      const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;

      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
        else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
        else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
      } else {
        if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
        else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
        else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
      }

      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
      const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;

      const ii = i & 255, jj = j & 255, kk = k & 255;
      const gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
      const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
      const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
      const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;

      let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
      if (t0 < 0) n0 = 0;
      else { t0 *= t0; n0 = t0 * t0 * dot3(grad3[gi0], x0, y0, z0); }

      let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
      if (t1 < 0) n1 = 0;
      else { t1 *= t1; n1 = t1 * t1 * dot3(grad3[gi1], x1, y1, z1); }

      let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
      if (t2 < 0) n2 = 0;
      else { t2 *= t2; n2 = t2 * t2 * dot3(grad3[gi2], x2, y2, z2); }

      let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
      if (t3 < 0) n3 = 0;
      else { t3 *= t3; n3 = t3 * t3 * dot3(grad3[gi3], x3, y3, z3); }

      return 32 * (n0 + n1 + n2 + n3);
    }

    function fbm3D(x, y, z, octaves = 2, persistence = 0.5, lacunarity = 2.0, scale = 0.1) {
      let total = 0;
      let frequency = scale;
      let amplitude = 1;
      let maxValue = 0;
      for (let i = 0; i < octaves; i++) {
        total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      return (total / maxValue) * 0.5 + 0.5;
    }

    return { noise2D, noise3D, fbm2D, fbm3D };
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
    // Match web engine (runtime/api-voxel.js) biome height values
    // These values directly correspond to the browser Three.js terrain
    switch (biome) {
      case 'Frozen Tundra': return { heightScale: 6, heightBase: 65 };  // t < 0.2
      case 'Taiga':         return { heightScale: 18, heightBase: 66 }; // t < 0.35 && m > 0.5
      case 'Desert':        return { heightScale: 4, heightBase: 63 };  // t > 0.7 && m < 0.25
      case 'Jungle':        return { heightScale: 22, heightBase: 58 }; // t > 0.6 && m > 0.6
      case 'Savanna':       return { heightScale: 5, heightBase: 65 };  // m < 0.3
      case 'Forest':        return { heightScale: 14, heightBase: 64 }; // t > 0.4 && m > 0.4
      case 'Snowy Hills':   return { heightScale: 35, heightBase: 62 }; // t < 0.35
      default:              return { heightScale: 6, heightBase: 64 };  // Plains
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
  function _vxTreeTypeFor(biome) {
    // 1=oak, 2=birch, 3=spruce, 4=jungle, 5=acacia.
    if (biome === 'Frozen Tundra' || biome === 'Taiga' || biome === 'Snowy Hills') return 3;
    if (biome === 'Jungle') return 4;
    if (biome === 'Desert' || biome === 'Savanna') return 5;
    if (biome === 'Forest') return 2;
    return 1;
  }
  function _vxTreeRoll(x, z) {
    return (_vxNoise.noise2D((x | 0) * 0.7, (z | 0) * 0.7) + 1.0) * 0.5;
  }
  function _vxChunkLocalCoord(v) {
    return ((v % VX_CHUNK_SIZE) + VX_CHUNK_SIZE) % VX_CHUNK_SIZE;
  }
  function _vxTreePlacementAllowedAt(x, z) {
    // Match runtime/api-voxel.js: pending trees are only accepted when their
    // local chunk origin is safely inside the chunk, so canopies do not cross
    // chunk boundaries or appear at spawn-edge columns.
    const lx = _vxChunkLocalCoord(x | 0);
    const lz = _vxChunkLocalCoord(z | 0);
    return lx > 2 && lx < VX_CHUNK_SIZE - 3 && lz > 2 && lz < VX_CHUNK_SIZE - 3;
  }
  function _vxTreeShapeHash(x, z) {
    const xi = x | 0;
    const zi = z | 0;
    const lx = _vxChunkLocalCoord(xi);
    const lz = _vxChunkLocalCoord(zi);
    const baseX = xi - lx;
    const baseZ = zi - lz;
    return _vxNoise.noise2D(lx * 7.1 + baseX, lz * 13.3 + baseZ);
  }
  function _vxTreeInfoAt(x, z) {
    if (vxConfig.enableTrees === false) return null;
    const xi = x | 0;
    const zi = z | 0;
    const height = _vxHeightAtCached(xi, zi);
    if (height <= VX_SEA_Y || !_vxTreePlacementAllowedAt(xi, zi)) return null;
    const biome = _vxBiomeAtCached(xi, zi);
    if (!_vxTreeAllowed(biome) || _vxTreeRoll(xi, zi) >= _vxTreeDensity(biome)) return null;
    const type = _vxTreeTypeFor(biome);
    const hash = _vxTreeShapeHash(xi, zi);
    const absHash = Math.abs(hash);
    let trunkH = 4 + Math.floor(absHash * 3);
    if (type === 2) trunkH = 5 + Math.floor(absHash * 2);
    else if (type === 3) trunkH = 6 + Math.floor(absHash * 4);
    else if (type === 4) trunkH = 8 + Math.floor(absHash * 6);
    else if (type === 5) trunkH = 4 + Math.floor(absHash * 3);
    return { height, type, trunkH, bendDir: hash > 0 ? 1 : -1 };
  }

  function _vxHeightAt(x, z) {
    const biome = _vxBiomeAtCached(x, z);
    const p = _vxBiomeProfile(biome);
    return Math.floor(_vxNoise.fbm2D(x, z, 4, 0.5, 2.0, 0.01) * p.heightScale + p.heightBase) - 1;
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

  // Return the BLOCK TYPE ID (not color!) at world position (wx, wy, wz),
  // or 0 for air.  Used by the chunk-based terrain generator to get correct
  // texture atlas tiles in bridge.cpp's voxel_tile_index_for_face().
  // Block IDs match web engine BLOCK_TYPES: 1=GRASS, 2=DIRT, 3=STONE, etc.
  function _vxBlockIdAt(wx, wy, wz) {
    const edit = vxBlocks.get(_vxKey(wx, wy, wz));
    if (edit) return edit.id || 0;

    const height = _vxHeightAtCached(wx, wz);

    if (wy <= height) {
      if (wy === 0) return 14; // BEDROCK

      if (vxConfig.enableCaves !== false && wy > 1 && wy < height - 5) {
        const cave1 = _vxNoise.fbm3D(wx, wy, wz, 3, 0.5, 2.0, 0.04);
        const cave2 = _vxNoise.fbm3D(wx + 7777, wy + 7777, wz + 7777, 2, 0.5, 2.0, 0.08);
        const carved = Math.abs(cave1 - 0.5) < 0.04 || Math.abs(cave2 - 0.5) < 0.03;
        if (carved) return (wy <= 5 && vxConfig.enableLava !== false) ? 23 : 0;
      }

      // --- solid terrain ---
      if (wy < VX_BASE_Y - 2) return 3; // deep stone (STONE)
      const biome = _vxBiomeAtCached(wx, wz);
      const surface = _vxSurfaceFor(biome);
      const dy = height - wy;
      if (dy === 0) {
        // surface block - return biome's surface block ID
        if (wy < VX_SEA_Y) return wy >= VX_SEA_Y - 1 ? surface.id : 4; // SAND underwater
        return surface.id;
      }
      if (dy < 3) return 2; // DIRT

      if (vxConfig.enableOres !== false) {
        if (wy < 16 && _vxNoise.fbm3D(wx, wy, wz, 2, 0.5, 2.0, 0.15) > 0.78) return 18;
        if (wy < 32 && _vxNoise.fbm3D(wx + 500, wy, wz + 500, 2, 0.5, 2.0, 0.12) > 0.76) return 17;
        if (wy < 64 && _vxNoise.fbm3D(wx + 1000, wy, wz + 1000, 2, 0.5, 2.0, 0.1) > 0.73) return 16;
        if (_vxNoise.fbm3D(wx + 2000, wy, wz + 2000, 2, 0.5, 2.0, 0.08) > 0.72) return 15;
        if (wy < 40 && _vxNoise.fbm3D(wx + 3000, wy, wz + 3000, 1, 0.5, 2.0, 0.06) > 0.8) return 19;
      }

      if (height <= VX_SEA_Y + 2 && height >= VX_SEA_Y - 3 && wy >= height - 4 && wy < height - 1) {
        if (_vxNoise.fbm3D(wx + 5000, wy, wz + 5000, 1, 0.5, 2.0, 0.1) > 0.7) return 20;
      }
      return 3; // STONE
    }

    if (wy < VX_SEA_Y && wy > height) return VX_BLOCK_TYPES.WATER;

    // --- above terrain: browser-like tree blocks ---
    // Check nearby tree origins because canopies and acacia bends can extend
    // away from their trunk origin.
    for (let dz = -4; dz <= 4; dz++) {
      for (let dx = -4; dx <= 4; dx++) {
        const tx = wx + dx;
        const tz = wz + dz;
        const info = _vxTreeInfoAt(tx, tz);
        if (!info) continue;
        const baseY = info.height + 1;
        const relX = wx - tx;
        const relZ = wz - tz;
        const relY = wy - baseY;

        if (info.type === 3) { // spruce
          if (relX === 0 && relZ === 0 && relY >= 0 && relY < info.trunkH) return 6;
          for (let layer = 0; layer < info.trunkH - 2; layer++) {
            const ly = 2 + layer;
            const r = Math.max(1, Math.floor((info.trunkH - 2 - layer) / 2));
            if (relY === ly && !(relX === 0 && relZ === 0) && Math.abs(relX) <= r && Math.abs(relZ) <= r &&
                Math.abs(relX) + Math.abs(relZ) <= r + 1) return 7;
          }
          if (relX === 0 && relZ === 0 && (relY === info.trunkH || relY === info.trunkH + 1)) return 7;
        } else if (info.type === 2) { // birch
          if (relX === 0 && relZ === 0 && relY >= 0 && relY < info.trunkH) return 6;
          const ly = relY - info.trunkH;
          if (relX >= -2 && relX <= 2 && relZ >= -2 && relZ <= 2 && ly >= -1 && ly <= 2 &&
              relX * relX + ly * ly + relZ * relZ <= 5) return 7;
        } else if (info.type === 4) { // jungle
          if (relX === 0 && relZ === 0 && relY >= 0 && relY < info.trunkH) return 6;
          if ((relX !== 0 || relZ !== 0) && Math.abs(relX) <= 1 && Math.abs(relZ) <= 1 &&
              Math.abs(relX) + Math.abs(relZ) < 2 && (relY === 0 || relY === 1)) return 6;
          const ly = relY - info.trunkH;
          if (relX >= -3 && relX <= 3 && relZ >= -3 && relZ <= 3 && ly >= -2 && ly <= 2 &&
              relX * relX + ly * ly * 2 + relZ * relZ <= 12) return 7;
        } else if (info.type === 5) { // acacia
          let bentX = 0;
          for (let i = 0; i < info.trunkH; i++) {
            if (relX === bentX && relZ === 0 && relY === i) return 6;
            if (i === Math.floor(info.trunkH / 2)) bentX += info.bendDir;
          }
          const ly = relY - info.trunkH;
          if ((ly === 0 || ly === 1) && relZ >= -3 && relZ <= 3 &&
              wx - (tx + bentX) >= -3 && wx - (tx + bentX) <= 3) {
            const leafX = wx - (tx + bentX);
            if (leafX * leafX + relZ * relZ <= 10) return 7;
          }
        } else { // oak/default
          if (relX === 0 && relZ === 0 && relY >= 0 && relY < info.trunkH) return 6;
          const ly = relY - info.trunkH;
          if (relX >= -2 && relX <= 2 && relZ >= -2 && relZ <= 2 && ly >= -2 && ly <= 2 &&
              Math.abs(relX) + Math.abs(ly) + Math.abs(relZ) < 4) return 7;
        }
      }
    }

    return 0; // AIR
  }

  // Wrapper that returns color from block ID (for legacy code paths)
  function _vxBlockColorAt(wx, wy, wz) {
    const id = _vxBlockIdAt(wx, wy, wz);
    return VX_BLOCK_COLORS[id] || 0;
  }

  // Legacy instanced-cube terrain path kept for older tests and fallback cleanup.
  // The active terrain renderer below uses voxel.uploadChunk so block IDs flow
  // through the same atlas tile mapping as the web runtime.
  function _vxSpawnBlocks(x, z, bucket) {
    const biome = _vxBiomeAt(x, z);
    const surface = _vxSurfaceFor(biome);
    const height = _vxHeightAt(x, z);

    const cx = x + 0.5, cz = z + 0.5;

    // Render surface block as a proper 1x1x1 cube
    let surfaceColor;
    if (height < VX_SEA_Y) {
      surfaceColor = height >= VX_SEA_Y - 1 ? surface.color : 0x6b5a3a;
    } else {
      surfaceColor = surface.color;
    }

    let arr = bucket.get(surfaceColor);
    if (!arr) { arr = []; bucket.set(surfaceColor, arr); }
    arr.push({ cx, cy: height + 0.5, cz, sx: 1, sy: 1, sz: 1 });

    // Add subsurface layers for terrain depth on slopes
    // Only render blocks that would be visible (neighbor is lower)
    const dirtColor = surface.sub || VX_BLOCK_COLORS[2];
    const stoneColor = VX_BLOCK_COLORS[3];

    // Find the minimum neighbor height to determine visible depth
    // Height cache works for any coordinate (noise-based, not chunk-dependent)
    const minNeighbor = Math.min(
      _vxHeightAtCached(x - 1, z),
      _vxHeightAtCached(x + 1, z),
      _vxHeightAtCached(x, z - 1),
      _vxHeightAtCached(x, z + 1)
    );

    // Limit subsurface depth to avoid too many blocks
    // Increased from 5 to 8 to show more terrain detail on steep slopes
    const maxDepth = Math.min(height - minNeighbor, 8);

    // Render subsurface layers
    for (let d = 1; d <= maxDepth && height - d >= VX_BASE_Y - 2; d++) {
      const y = height - d;
      const layerColor = d <= 2 ? dirtColor : stoneColor;
      let layerArr = bucket.get(layerColor);
      if (!layerArr) { layerArr = []; bucket.set(layerColor, layerArr); }
      layerArr.push({ cx, cy: y + 0.5, cz, sx: 1, sy: 1, sz: 1 });
    }

    // Trees - simplified: trunk column + compact canopy cube
    const treeDensity = _vxTreeDensity(biome);
    if (_vxTreeAllowed(biome) && height >= VX_SEA_Y &&
        _vxHash2(x, z, vxConfig.seed + 31) < treeDensity) {

      // Tree height varies by biome
      let trunkH = 4 + Math.floor(_vxHash2(x, z, vxConfig.seed + 53) * 2);
      if (biome === 'Jungle') trunkH = 6 + Math.floor(_vxHash2(x, z, vxConfig.seed + 53) * 3);
      else if (biome === 'Taiga') trunkH = 5 + Math.floor(_vxHash2(x, z, vxConfig.seed + 53) * 2);

      // Trunk as thin vertical block
      const trunkColor = _vxTrunkColor(biome);
      let trunkArr = bucket.get(trunkColor);
      if (!trunkArr) { trunkArr = []; bucket.set(trunkColor, trunkArr); }
      // Place trunk blocks individually for authentic blocky look
      for (let ty = 1; ty <= trunkH; ty++) {
        trunkArr.push({ cx, cy: height + ty + 0.5, cz, sx: 1, sy: 1, sz: 1 });
      }

      // Canopy as a single scaled cube (clean, no zigzag)
      const leafColor = _vxTreeColor(biome);
      let leafArr = bucket.get(leafColor);
      if (!leafArr) { leafArr = []; bucket.set(leafColor, leafArr); }

      let canopyW = 3, canopyH = 2;
      if (biome === 'Taiga') { canopyW = 2; canopyH = 3; } // Tall narrow
      else if (biome === 'Jungle') { canopyW = 4; canopyH = 3; } // Wide
      else if (biome === 'Savanna') { canopyW = 5; canopyH = 1.5; } // Flat umbrella

      const canopyY = height + trunkH + canopyH / 2 + 0.5;
      leafArr.push({ cx, cy: canopyY, cz, sx: canopyW, sy: canopyH, sz: canopyW });
    }
  }

  // Convert world position to chunk coordinates
  function _vxWorldToChunk(x) { return Math.floor(x / VX_CHUNK_SIZE); }

  // Generate a single chunk at chunk coordinates (cx, cz)
  function _vxGenerateChunk(cx, cz) {
    const chunkKey = cx + ',' + cz;
    if (vxLoadedChunks.has(chunkKey)) return; // Already loaded

    const worldX = cx * VX_CHUNK_SIZE;
    const worldZ = cz * VX_CHUNK_SIZE;

    const meshHandles = [];

    // Compact column layout: lx + sx*lz, with a small fixed stride. This keeps
    // the hot path off the QuickJS bridge; C++ expands these columns into a
    // block volume before greedy meshing.
    const paddedSize = VX_CHUNK_SIZE + 2;
    const columnStride = 7; // height, surfaceId, subId, trunkH, treeType, leafId, bendDir
    const columns = new Array(paddedSize * paddedSize * columnStride);
    let write = 0;
    let hasWaterSurface = false;
    for (let lz = 0; lz < paddedSize; lz++) {
      const wz = worldZ + lz - 1;
      for (let lx = 0; lx < paddedSize; lx++) {
        const wx = worldX + lx - 1;
        const height = _vxHeightAtCached(wx, wz);
        const biome = _vxBiomeAtCached(wx, wz);
        const surface = _vxSurfaceFor(biome);
        const surfaceId = height < VX_SEA_Y ? (height >= VX_SEA_Y - 1 ? surface.id : 4) : surface.id;
        const treeInfo = _vxTreeInfoAt(wx, wz);
        const trunkH = treeInfo ? treeInfo.trunkH : 0;

        columns[write++] = height;
        columns[write++] = surfaceId;
        columns[write++] = 2; // dirt subsurface, matching _vxBlockIdAt()
        columns[write++] = trunkH;
        columns[write++] = treeInfo ? treeInfo.type : 0;
        columns[write++] = 7; // leaves
        columns[write++] = treeInfo ? treeInfo.bendDir : 0;

        if (!hasWaterSurface &&
            lx > 0 && lx <= VX_CHUNK_SIZE && lz > 0 && lz <= VX_CHUNK_SIZE &&
            height < VX_SEA_Y) {
          hasWaterSurface = true;
        }
      }
    }

    const uploaded = call('voxel.uploadChunk', {
      origin: [worldX - 1, 0, worldZ - 1],
      size: [paddedSize, VX_CHUNK_HEIGHT, paddedSize],
      columns,
      columnStride,
      palette: VX_BLOCK_PALETTE,
      meshMin: [1, 0, 1],
      meshMax: [VX_CHUNK_SIZE + 1, VX_CHUNK_HEIGHT, VX_CHUNK_SIZE + 1],
      usePaletteColors: false,
    });
    if (uploaded && uploaded.handle) {
      meshHandles.push(uploaded.handle);
    }

    // Water plane for this chunk
    const waterMesh = hasWaterSurface && vxConfig.enableWaterPlane === true
      ? createPlane(VX_CHUNK_SIZE, VX_CHUNK_SIZE, 0x2f8fcc,
          [worldX + VX_CHUNK_SIZE / 2, VX_SEA_Y + 0.05, worldZ + VX_CHUNK_SIZE / 2], {
            material: 'standard',
            roughness: 0.95,
            metallic: 0.0,
            opacity: 0.32,
            transparent: true,
          })
      : 0;
    if (waterMesh) {
      setRotation(waterMesh, -Math.PI / 2, 0, 0);
    }

    vxLoadedChunks.set(chunkKey, { meshHandles, waterMesh });
  }

  // Unload a chunk at chunk coordinates (cx, cz)
  function _vxUnloadChunk(cx, cz) {
    const chunkKey = cx + ',' + cz;
    const chunk = vxLoadedChunks.get(chunkKey);
    if (!chunk) return;

    // Destroy mesh handles
    for (const inst of chunk.meshHandles) {
      const h = _resolveInstanceHandle(inst);
      if (h) call('mesh.destroy', { handle: h });
    }
    if (chunk.waterMesh) removeMesh(chunk.waterMesh);

    vxLoadedChunks.delete(chunkKey);
  }

  // Update chunks around player position - load nearby, unload distant
  function _vxUpdateChunks(playerX, playerZ) {
    const pcx = _vxWorldToChunk(playerX);
    const pcz = _vxWorldToChunk(playerZ);

    // Track if player moved to new chunk (for unloading logic)
    const playerMovedChunk = pcx !== vxLastPlayerChunkX || pcz !== vxLastPlayerChunkZ;
    if (playerMovedChunk) {
      vxLastPlayerChunkX = pcx;
      vxLastPlayerChunkZ = pcz;

      // Determine which chunks should be loaded
      const neededChunks = new Set();
      const radius = _vxChunkRadius();
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          neededChunks.add((pcx + dx) + ',' + (pcz + dz));
        }
      }

      // Unload chunks that are too far
      for (const chunkKey of vxLoadedChunks.keys()) {
        if (!neededChunks.has(chunkKey)) {
          const [cx, cz] = chunkKey.split(',').map(Number);
          _vxUnloadChunk(cx, cz);
        }
      }
    }

    // Load chunks that are needed but not loaded (limit per frame for perf)
    // This runs every call to allow gradual loading even when standing still
    let loadedThisFrame = 0;
    const maxLoadsPerFrame = vxConfig.maxMeshRebuildsPerFrame || 3;
    const radius = _vxChunkRadius();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const chunkKey = (pcx + dx) + ',' + (pcz + dz);
        if (!vxLoadedChunks.has(chunkKey)) {
          if (loadedThisFrame >= maxLoadsPerFrame) return; // Rate limit, will continue next frame
          _vxGenerateChunk(pcx + dx, pcz + dz);
          loadedThisFrame++;
        }
      }
    }
  }

  // Legacy function - now just triggers initial chunk loading around origin
  function _vxGenerateWorld() {
    if (vxGenerated) return;
    vxGenerated = true;

    // Clear caches from any previous generation (seed change, reset).
    _vxHeightCache.clear();
    _vxBiomeCache.clear();

    // Set fog to match web version's atmosphere
    const fogRadius = VX_CHUNK_SIZE * _vxChunkRadius();
    setFog(0x87ceeb, fogRadius * 0.4, fogRadius * 1.0);

    // Initial chunk loading around origin
    _vxUpdateChunks(0, 0);
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
    const maxY = Math.min(VX_CHUNK_HEIGHT - 1, baseH + 16);
    for (let y = maxY; y > baseH; y--) {
      const edit = vxBlocks.get(_vxKey(xi, y, zi));
      if (edit && edit.id) return y;
      const id = _vxBlockIdAt(xi, y, zi);
      if (id && id !== VX_BLOCK_TYPES.WATER) return y;
    }
    return baseH;
  }

  function getVoxelBlock(x, y, z) {
    const xi = x | 0, yi = y | 0, zi = z | 0;
    const k = _vxKey(xi, yi, zi);
    if (vxBlocks.has(k)) return vxBlocks.get(k).id;
    return _vxBlockIdAt(xi, yi, zi);
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
  function forceLoadVoxelChunks(cx, cz) {
    _vxGenerateWorld(); // Ensure fog/initial state set
    // Force load all chunks in radius immediately (no rate limit)
    const pcx = _vxWorldToChunk(cx || 0);
    const pcz = _vxWorldToChunk(cz || 0);
    const radius = _vxChunkRadius();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        _vxGenerateChunk(pcx + dx, pcz + dz);
      }
    }
    vxLastPlayerChunkX = pcx;
    vxLastPlayerChunkZ = pcz;
  }

  function updateVoxelWorld(x, z) {
    _vxGenerateWorld(); // Ensure fog/initial state set
    _vxUpdateChunks(x || 0, z || 0);
  }

  function resetVoxelWorld() {
    // Destroy all loaded chunks
    for (const [chunkKey, chunk] of vxLoadedChunks.entries()) {
      for (const inst of chunk.meshHandles) {
        const h = _resolveInstanceHandle(inst);
        if (h) call('mesh.destroy', { handle: h });
      }
      if (chunk.waterMesh) removeMesh(chunk.waterMesh);
    }
    vxLoadedChunks.clear();
    vxLastPlayerChunkX = null;
    vxLastPlayerChunkZ = null;

    // Destroy native chunk meshes from voxel.uploadChunk path (legacy).
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
    const id = getVoxelBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return id !== 0 && id !== VX_BLOCK_TYPES.WATER;
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
  // ---------------- WAD (DOOM IWAD/PWAD) loader -----------------------
  // Mirrors runtime/wad.js for cart parity. The bridge streams the raw
  // bytes off disk; the parsing/composition runs JS-side, just like the
  // Three.js backend, so DOOM-style carts behave identically.

  const _WAD_THING_MONSTERS = {
    3004: 'grunt', 9: 'grunt', 3001: 'grunt', 3006: 'grunt',
    65: 'shooter', 3005: 'shooter', 66: 'shooter', 68: 'shooter',
    71: 'shooter', 84: 'shooter',
    3002: 'tank', 58: 'tank', 67: 'tank', 69: 'tank',
    3003: 'boss', 64: 'boss', 16: 'boss', 7: 'boss',
  };
  const _WAD_THING_ITEMS = {
    2011: 'health', 2012: 'health', 2014: 'health',
    2015: 'armor', 2018: 'armor', 2019: 'armor',
    2007: 'ammo', 2008: 'ammo', 2010: 'ammo', 2047: 'ammo', 2048: 'ammo', 2049: 'ammo',
    2001: 'ammo', 2002: 'ammo', 2003: 'ammo', 2004: 'ammo', 2006: 'ammo',
  };
  const _WAD_THING_SPRITE_PREFIX = {
    3004: 'POSS', 9: 'SPOS', 3001: 'TROO', 3006: 'SKUL', 65: 'CPOS',
    3005: 'HEAD', 66: 'SKEL', 68: 'BSPI', 71: 'PAIN', 84: 'SSWV',
    3002: 'SARG', 58: 'SARG', 67: 'FATT', 69: 'BOS2', 3003: 'BOSS',
    64: 'VILE', 16: 'CYBR', 7: 'SPID',
    2011: 'STIM', 2012: 'MEDI', 2014: 'BON1', 2015: 'BON2',
    2018: 'ARM1', 2019: 'ARM2', 2007: 'CLIP', 2008: 'SHEL', 2010: 'ROCK',
    2047: 'CELL', 2001: 'SHOT', 2002: 'MGUN', 2003: 'LAUN', 2004: 'PLAS', 2006: 'BFUG',
    2035: 'BAR1', 70: 'FCAN', 44: 'TBLU', 45: 'TGRN', 46: 'TRED',
    48: 'ELEC', 34: 'CAND', 35: 'CBRA',
  };

  function _wadReadStr8(bytes, offset) {
    let s = '';
    for (let i = 0; i < 8; i++) {
      const c = bytes[offset + i];
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.toUpperCase();
  }
  function _wadReadVerts(dv) {
    if (!dv) return [];
    const out = [];
    for (let i = 0; i < dv.byteLength; i += 4) {
      out.push({ x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true) });
    }
    return out;
  }
  function _wadReadLines(dv) {
    if (!dv) return [];
    const out = [];
    for (let i = 0; i < dv.byteLength; i += 14) {
      out.push({
        v1: dv.getUint16(i, true), v2: dv.getUint16(i + 2, true),
        flags: dv.getUint16(i + 4, true),
        right: dv.getInt16(i + 10, true), left: dv.getInt16(i + 12, true),
      });
    }
    return out;
  }
  function _wadReadSides(dv) {
    if (!dv) return [];
    const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    const out = [];
    for (let i = 0; i < dv.byteLength; i += 30) {
      out.push({
        xoff: dv.getInt16(i, true), yoff: dv.getInt16(i + 2, true),
        upper: _wadReadStr8(bytes, i + 4),
        lower: _wadReadStr8(bytes, i + 12),
        middle: _wadReadStr8(bytes, i + 20),
        sector: dv.getUint16(i + 28, true),
      });
    }
    return out;
  }
  function _wadReadSectors(dv) {
    if (!dv) return [];
    const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
    const out = [];
    for (let i = 0; i < dv.byteLength; i += 26) {
      out.push({
        floorH: dv.getInt16(i, true), ceilH: dv.getInt16(i + 2, true),
        floorFlat: _wadReadStr8(bytes, i + 4),
        ceilFlat: _wadReadStr8(bytes, i + 12),
        light: dv.getInt16(i + 20, true),
      });
    }
    return out;
  }
  function _wadReadThings(dv) {
    if (!dv) return [];
    const out = [];
    for (let i = 0; i < dv.byteLength; i += 10) {
      out.push({
        x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true),
        angle: dv.getUint16(i + 4, true),
        type: dv.getUint16(i + 6, true),
        flags: dv.getUint16(i + 8, true),
      });
    }
    return out;
  }

  function _wadRasterSeg(out, x1, z1, x2, z2, r) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(1, Math.ceil(len / 2.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      out.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, r });
    }
  }

  // Convert a JS int array (from the bridge) into a fresh Uint8Array. The
  // bridge returns Variant ints because the QuickJS<->Godot Dictionary/
  // Array transport doesn't carry typed-array tags directly.
  function _wadIntArrayToU8(bytesArr) {
    const len = bytesArr.length | 0;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) u8[i] = bytesArr[i] & 0xff;
    return u8;
  }

  // Real DOOM WADs are 28-50MB so the C++ side owns the bytes; the shim
  // holds a wadHandle + directory and fetches each lump on demand. The
  // returned Uint8Arrays back fresh ArrayBuffers, so the existing
  // DataView-based parsers work unchanged.
  function WADLoader() {
    this.directory = [];
    this.buffer = null;     // legacy ArrayBuffer path (kept for in-memory loads)
    this._wadHandle = 0;
    this._lumpCache = new Map(); // filepos|size -> Uint8Array
  }
  // Two load forms:
  //   load(arrayBuffer): legacy in-memory path; parses directory locally.
  //   load({ handle, directory }): handle-based path used by loadWad(path).
  WADLoader.prototype.load = function (input) {
    if (input && typeof input === 'object' && 'handle' in input && Array.isArray(input.directory)) {
      this._wadHandle = input.handle | 0;
      this.directory = input.directory.map(e => ({
        name: String(e.name).toUpperCase(),
        filepos: e.filepos | 0,
        size: e.size | 0,
      }));
      return this;
    }
    // Fallback: legacy in-memory ArrayBuffer load (used by tests/dev tools).
    const arrayBuffer = input;
    this.buffer = arrayBuffer;
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (tag !== 'IWAD' && tag !== 'PWAD') throw new Error('Invalid WAD file');
    const numLumps = view.getInt32(4, true);
    const dirOfs = view.getInt32(8, true);
    this.directory = [];
    for (let i = 0; i < numLumps; i++) {
      const o = dirOfs + i * 16;
      const filepos = view.getInt32(o, true);
      const size = view.getInt32(o + 4, true);
      let name = '';
      for (let j = 0; j < 8; j++) {
        const c = bytes[o + 8 + j];
        if (c === 0) break;
        name += String.fromCharCode(c);
      }
      this.directory.push({ name: name.toUpperCase(), filepos, size });
    }
    return this;
  };
  // Internal: fetch lump bytes as a Uint8Array (with cache).
  WADLoader.prototype._readLumpBytes = function (filepos, size) {
    if (size <= 0) return null;
    if (this.buffer) {
      // Legacy path uses subarray of the original buffer.
      return new Uint8Array(this.buffer, filepos, size);
    }
    if (!this._wadHandle) return null;
    const key = filepos + '|' + size;
    const cached = this._lumpCache.get(key);
    if (cached) return cached;
    const r = call('wad.readLump', { handle: this._wadHandle, filepos, size });
    if (!r || !r.bytes) return null;
    const u8 = _wadIntArrayToU8(r.bytes);
    this._lumpCache.set(key, u8);
    return u8;
  };
  WADLoader.prototype.getMapNames = function () {
    return this.directory.filter(e => /^(E\dM\d|MAP\d\d)$/.test(e.name)).map(e => e.name);
  };
  WADLoader.prototype.getMap = function (name) {
    const idx = this.directory.findIndex(e => e.name === name);
    if (idx < 0) return null;
    const lumps = {};
    for (let i = idx + 1; i < this.directory.length && i <= idx + 11; i++) {
      const e = this.directory[i];
      if (/^(E\dM\d|MAP\d\d)$/.test(e.name)) break;
      if (e.size <= 0) continue;
      const u8 = this._readLumpBytes(e.filepos, e.size);
      if (!u8) continue;
      lumps[e.name] = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    }
    return {
      name,
      vertexes: _wadReadVerts(lumps.VERTEXES),
      linedefs: _wadReadLines(lumps.LINEDEFS),
      sidedefs: _wadReadSides(lumps.SIDEDEFS),
      sectors: _wadReadSectors(lumps.SECTORS),
      things: _wadReadThings(lumps.THINGS),
    };
  };
  WADLoader.prototype.getPalette = function () {
    const lump = this.directory.find(e => e.name === 'PLAYPAL');
    if (!lump || lump.size < 768) return null;
    return this._readLumpBytes(lump.filepos, 768);
  };
  WADLoader.prototype.getLump = function (name) {
    const lump = this.directory.find(e => e.name === name.toUpperCase());
    if (!lump || lump.size === 0) return null;
    const u8 = this._readLumpBytes(lump.filepos, lump.size);
    if (!u8) return null;
    return { data: u8, size: lump.size };
  };
  WADLoader.prototype.getFlatLumps = function () {
    // For a 28MB WAD, the flats section is dozens of 4KB lumps. We return
    // accessor stubs that lazy-fetch on first access so naïve iteration
    // (e.g. Object.keys) doesn't trigger thousands of round-trips.
    const flats = {};
    const wad = this;
    let inFlats = false;
    for (const e of this.directory) {
      if (e.name === 'F_START' || e.name === 'FF_START') { inFlats = true; continue; }
      if (e.name === 'F_END'   || e.name === 'FF_END')   { inFlats = false; continue; }
      if (inFlats && e.size === 4096) {
        // Define a getter so the lump bytes are only fetched when accessed.
        const filepos = e.filepos;
        Object.defineProperty(flats, e.name, {
          enumerable: true, configurable: true,
          get() {
            const u8 = wad._readLumpBytes(filepos, 4096);
            // Cache the resolved value to avoid re-fetching.
            Object.defineProperty(flats, e.name, { value: u8, enumerable: true, configurable: true, writable: true });
            return u8;
          },
        });
      }
    }
    return flats;
  };
  WADLoader.prototype.getSpriteLumps = function () {
    // Same lazy-getter pattern as flats — ~1500 sprite frames in DOOM is
    // way too many to eagerly fetch on init.
    const sprites = {};
    const wad = this;
    let inSprites = false;
    for (const e of this.directory) {
      if (e.name === 'S_START' || e.name === 'SS_START') { inSprites = true; continue; }
      if (e.name === 'S_END'   || e.name === 'SS_END')   { inSprites = false; continue; }
      if (inSprites && e.size > 0) {
        const filepos = e.filepos;
        const size = e.size;
        Object.defineProperty(sprites, e.name, {
          enumerable: true, configurable: true,
          get() {
            const u8 = wad._readLumpBytes(filepos, size);
            Object.defineProperty(sprites, e.name, { value: u8, enumerable: true, configurable: true, writable: true });
            return u8;
          },
        });
      }
    }
    return sprites;
  };
  WADLoader.prototype.dispose = function () {
    if (this._wadHandle) {
      call('wad.destroy', { handle: this._wadHandle });
      this._wadHandle = 0;
    }
    this._lumpCache.clear();
    this.buffer = null;
  };

  function wadConvertMap(map, scale) {
    if (!scale) scale = 1 / 20;
    const { vertexes, linedefs, sidedefs, sectors, things } = map;

    let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
    for (const v of vertexes) {
      if (v.x < mnX) mnX = v.x; if (v.x > mxX) mxX = v.x;
      if (v.y < mnY) mnY = v.y; if (v.y > mxY) mxY = v.y;
    }
    const cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2;

    let playerThing = null;
    for (const t of things) {
      if (t.type === 1) { playerThing = t; break; }
    }
    let playerSectorFloor = 0;
    if (playerThing) {
      let minDist = Infinity;
      for (const line of linedefs) {
        const va = vertexes[line.v1], vb = vertexes[line.v2];
        if (!va || !vb) continue;
        const dx = vb.x - va.x, dy = vb.y - va.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) continue;
        let t = ((playerThing.x - va.x) * dx + (playerThing.y - va.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = va.x + t * dx, py = va.y + t * dy;
        const d = Math.hypot(playerThing.x - px, playerThing.y - py);
        const sideIdxs = [];
        if (line.right >= 0) sideIdxs.push(line.right);
        if (line.left >= 0) sideIdxs.push(line.left);
        for (const si of sideIdxs) {
          const side = sidedefs[si];
          if (side && sectors[side.sector] && d < minDist) {
            minDist = d;
            playerSectorFloor = sectors[side.sector].floorH;
          }
        }
      }
    }

    const baseFloor = playerSectorFloor;
    const walls = [];
    const colSegs = [];
    for (const line of linedefs) {
      const va = vertexes[line.v1], vb = vertexes[line.v2];
      if (!va || !vb) continue;
      const x1 = (va.x - cx) * scale, z1 = (va.y - cy) * scale;
      const x2 = (vb.x - cx) * scale, z2 = (vb.y - cy) * scale;
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.05) continue;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      const ang = -Math.atan2(z2 - z1, x2 - x1);
      let fSec = null, bSec = null;
      if (line.right >= 0 && sidedefs[line.right]) fSec = sectors[sidedefs[line.right].sector] || null;
      if (line.left  >= 0 && sidedefs[line.left])  bSec = sectors[sidedefs[line.left].sector]  || null;
      const fF = fSec ? (fSec.floorH - baseFloor) * scale : 0;
      const fC = fSec ? (fSec.ceilH  - baseFloor) * scale : 8;
      const bF = bSec ? (bSec.floorH - baseFloor) * scale : 0;
      const bC = bSec ? (bSec.ceilH  - baseFloor) * scale : 8;
      const light = fSec ? Math.max(0.25, fSec.light / 255) : 0.5;
      if (!bSec) {
        const h = fC - fF;
        if (h > 0.05) {
          const fSide = line.right >= 0 ? sidedefs[line.right] : null;
          const texName = fSide && fSide.middle !== '-' ? fSide.middle : null;
          walls.push({ x: mx, y: fF + h / 2, z: mz, len, h, ang, light, texName,
            xoff: fSide ? fSide.xoff : 0, yoff: fSide ? fSide.yoff : 0 });
          _wadRasterSeg(colSegs, x1, z1, x2, z2, 1.0);
        }
      } else {
        const fSide = line.right >= 0 ? sidedefs[line.right] : null;
        const bSide = line.left  >= 0 ? sidedefs[line.left]  : null;
        const loH = Math.abs(bF - fF);
        if (loH > 0.3) {
          const bot = Math.min(fF, bF);
          let loTex = null;
          if (fSide && fSide.lower && fSide.lower !== '-') loTex = fSide.lower;
          else if (bSide && bSide.lower && bSide.lower !== '-') loTex = bSide.lower;
          walls.push({ x: mx, y: bot + loH / 2, z: mz, len, h: loH, ang, light, step: true,
            texName: loTex, xoff: fSide ? fSide.xoff : 0, yoff: fSide ? fSide.yoff : 0 });
          if (loH > 1.0) _wadRasterSeg(colSegs, x1, z1, x2, z2, 0.8);
        }
        const hiH = Math.abs(fC - bC);
        if (hiH > 0.3) {
          const bot = Math.min(fC, bC);
          let upTex = null;
          if (fSide && fSide.upper && fSide.upper !== '-') upTex = fSide.upper;
          else if (bSide && bSide.upper && bSide.upper !== '-') upTex = bSide.upper;
          walls.push({ x: mx, y: bot + hiH / 2, z: mz, len, h: hiH, ang, light, upper: true,
            texName: upTex, xoff: fSide ? fSide.xoff : 0, yoff: fSide ? fSide.yoff : 0 });
        }
        if (line.flags & 1) _wadRasterSeg(colSegs, x1, z1, x2, z2, 1.0);
      }
    }

    let playerStart = { x: 0, z: 0, angle: Math.PI / 4, floorH: 0 };
    const enemies = [], items = [];
    for (const t of things) {
      const tx = (t.x - cx) * scale, tz = (t.y - cy) * scale;
      const ta = ((t.angle - 90) * Math.PI) / 180;
      if (t.type === 1) {
        playerStart = { x: tx, z: tz, angle: ta, floorH: 0 };
      } else if (_WAD_THING_MONSTERS[t.type]) {
        enemies.push({ x: tx, z: tz, type: _WAD_THING_MONSTERS[t.type], doomType: t.type });
      } else if (_WAD_THING_ITEMS[t.type]) {
        items.push({ x: tx, z: tz, type: _WAD_THING_ITEMS[t.type], doomType: t.type });
      }
    }
    const sectorData = sectors.map(s => ({
      floorH: (s.floorH - baseFloor) * scale,
      ceilH:  (s.ceilH  - baseFloor) * scale,
      floorFlat: s.floorFlat, ceilFlat: s.ceilFlat,
      light: Math.max(0.25, s.light / 255),
    }));
    return { walls, colSegs, enemies, items, playerStart, sectors: sectorData };
  }

  // Texture manager — produces engine-side textures from WAD picture/flat
  // lumps via the existing texture.createFromImage bridge. UV manipulation
  // (setWallUVs in the Three.js runtime) is geometry-specific and not yet
  // wired through the Godot bridge; carts that need it should fall back to
  // applying procedural UVs on the cart side.
  function WADTextureManager(wadLoader) {
    this.wad = wadLoader;
    this.palette = null;
    this.patchNames = null;
    this.textureDefs = null;
    this.flatLumps = null;
    this.spriteLumps = null;
    this.wallTexCache = new Map();
    this.flatTexCache = new Map();
    this.spriteTexCache = new Map();
    this._init = false;
  }
  WADTextureManager.prototype.init = function () {
    if (this._init) return;
    this.palette = this.wad.getPalette();
    if (!this.palette) {
      console.warn('WAD has no PLAYPAL');
      return;
    }
    const pnames = this.wad.getLump('PNAMES');
    this.patchNames = [];
    if (pnames) {
      const dv = new DataView(pnames.data.buffer, pnames.data.byteOffset, pnames.data.byteLength);
      const count = dv.getInt32(0, true);
      for (let i = 0; i < count; i++) {
        this.patchNames.push(_wadReadStr8(pnames.data, 4 + i * 8));
      }
    }
    this.textureDefs = Object.assign({},
      this._readTextureDefs('TEXTURE1'),
      this._readTextureDefs('TEXTURE2'));
    this.flatLumps = this.wad.getFlatLumps();
    this.spriteLumps = this.wad.getSpriteLumps();
    this._init = true;
  };
  WADTextureManager.prototype._readTextureDefs = function (lumpName) {
    const lump = this.wad.getLump(lumpName);
    if (!lump) return {};
    const dv = new DataView(lump.data.buffer, lump.data.byteOffset, lump.data.byteLength);
    const count = dv.getInt32(0, true);
    const out = {};
    for (let i = 0; i < count; i++) {
      const offset = dv.getInt32(4 + i * 4, true);
      if (offset + 22 > lump.size) continue;
      const name = _wadReadStr8(lump.data, offset);
      const width = dv.getInt16(offset + 12, true);
      const height = dv.getInt16(offset + 14, true);
      const patchCount = dv.getInt16(offset + 20, true);
      const patches = [];
      for (let j = 0; j < patchCount; j++) {
        const po = offset + 22 + j * 10;
        if (po + 6 > lump.size) break;
        patches.push({
          originX: dv.getInt16(po, true),
          originY: dv.getInt16(po + 2, true),
          patchIdx: dv.getInt16(po + 4, true),
        });
      }
      out[name] = { name, width, height, patches };
    }
    return out;
  };
  WADTextureManager.prototype._parsePicture = function (data) {
    if (!data || data.length < 8) return null;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = dv.getUint16(0, true);
    const height = dv.getUint16(2, true);
    const leftOfs = dv.getInt16(4, true);
    const topOfs = dv.getInt16(6, true);
    if (width === 0 || height === 0 || width > 4096 || height > 4096) return null;
    if (8 + width * 4 > data.length) return null;
    const colOffsets = [];
    for (let x = 0; x < width; x++) colOffsets.push(dv.getUint32(8 + x * 4, true));
    const pixels = new Uint8Array(width * height * 4);
    for (let x = 0; x < width; x++) {
      let ofs = colOffsets[x];
      if (ofs >= data.length) continue;
      for (let safety = 0; safety < 256; safety++) {
        if (ofs >= data.length) break;
        const topdelta = data[ofs++];
        if (topdelta === 0xff) break;
        if (ofs >= data.length) break;
        const length = data[ofs++];
        ofs++;
        for (let j = 0; j < length; j++) {
          if (ofs >= data.length) break;
          const y = topdelta + j;
          if (y < height) {
            const palIdx = data[ofs];
            const pi = (y * width + x) * 4;
            pixels[pi]     = this.palette[palIdx * 3];
            pixels[pi + 1] = this.palette[palIdx * 3 + 1];
            pixels[pi + 2] = this.palette[palIdx * 3 + 2];
            pixels[pi + 3] = 255;
          }
          ofs++;
        }
        ofs++;
      }
    }
    return { width, height, leftOfs, topOfs, pixels };
  };
  WADTextureManager.prototype._uploadDataTexture = function (pixels, width, height) {
    // Convert Uint8Array -> plain int array for the bridge transport.
    const arr = new Array(pixels.length);
    for (let i = 0; i < pixels.length; i++) arr[i] = pixels[i];
    const r = call('texture.createFromImage', { width, height, pixels: arr });
    return r ? r.handle : 0;
  };
  WADTextureManager.prototype.getWallTexture = function (name) {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();
    if (this.wallTexCache.has(name)) return this.wallTexCache.get(name);
    const def = this.textureDefs[name];
    if (!def) { this.wallTexCache.set(name, null); return null; }
    const w = def.width, h = def.height;
    const px = new Uint8Array(w * h * 4);
    for (const p of def.patches) {
      if (p.patchIdx < 0 || p.patchIdx >= this.patchNames.length) continue;
      const patchLump = this.wad.getLump(this.patchNames[p.patchIdx]);
      if (!patchLump) continue;
      const pic = this._parsePicture(patchLump.data);
      if (!pic) continue;
      for (let py = 0; py < pic.height; py++) {
        for (let pxX = 0; pxX < pic.width; pxX++) {
          const srcIdx = (py * pic.width + pxX) * 4;
          if (pic.pixels[srcIdx + 3] === 0) continue;
          const dx = p.originX + pxX, dy = p.originY + py;
          if (dx < 0 || dx >= w || dy < 0 || dy >= h) continue;
          const dstIdx = (dy * w + dx) * 4;
          px[dstIdx]     = pic.pixels[srcIdx];
          px[dstIdx + 1] = pic.pixels[srcIdx + 1];
          px[dstIdx + 2] = pic.pixels[srcIdx + 2];
          px[dstIdx + 3] = 255;
        }
      }
    }
    const handle = this._uploadDataTexture(px, w, h);
    const tex = handle ? { handle, width: w, height: h } : null;
    this.wallTexCache.set(name, tex);
    return tex;
  };
  WADTextureManager.prototype.getTextureDef = function (name) {
    if (!name || !this.textureDefs) return null;
    return this.textureDefs[String(name).toUpperCase()] || null;
  };
  WADTextureManager.prototype.getFlatTexture = function (name) {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();
    if (this.flatTexCache.has(name)) return this.flatTexCache.get(name);
    const flatData = this.flatLumps[name];
    if (!flatData) { this.flatTexCache.set(name, null); return null; }
    const px = new Uint8Array(64 * 64 * 4);
    for (let i = 0; i < 4096; i++) {
      const palIdx = flatData[i];
      px[i * 4]     = this.palette[palIdx * 3];
      px[i * 4 + 1] = this.palette[palIdx * 3 + 1];
      px[i * 4 + 2] = this.palette[palIdx * 3 + 2];
      px[i * 4 + 3] = 255;
    }
    const handle = this._uploadDataTexture(px, 64, 64);
    const tex = handle ? { handle, width: 64, height: 64 } : null;
    this.flatTexCache.set(name, tex);
    return tex;
  };
  WADTextureManager.prototype.getSpriteTexture = function (thingType) {
    const prefix = _WAD_THING_SPRITE_PREFIX[thingType];
    if (!prefix || !this._init) return null;
    if (this.spriteTexCache.has(thingType)) return this.spriteTexCache.get(thingType);
    let data = this.spriteLumps[prefix + 'A1'] || this.spriteLumps[prefix + 'A0'];
    if (!data) {
      const key = Object.keys(this.spriteLumps).find(k => k.startsWith(prefix + 'A'));
      if (key) data = this.spriteLumps[key];
    }
    if (!data) { this.spriteTexCache.set(thingType, null); return null; }
    const pic = this._parsePicture(data);
    if (!pic) { this.spriteTexCache.set(thingType, null); return null; }
    const handle = this._uploadDataTexture(pic.pixels, pic.width, pic.height);
    const tex = handle ? {
      texture: { handle, width: pic.width, height: pic.height },
      width: pic.width, height: pic.height,
      leftOfs: pic.leftOfs, topOfs: pic.topOfs,
    } : null;
    this.spriteTexCache.set(thingType, tex);
    return tex;
  };

  // Synchronous wad.load — returns a parsed WADLoader instance bound to
  // the host-side blob. Lump bytes are pulled lazily; the host owns the
  // raw 28-50MB file so JS doesn't have to materialise it all at once.
  function loadWad(path) {
    ensureInit();
    if (typeof path !== 'string') return null;
    // res://, user://, and absolute paths pass through; bare paths resolve
    // relative to the active cart directory.
    let resPath = path;
    if (!path.startsWith('res://') && !path.startsWith('user://') && !path.startsWith('/')) {
      const cart = (typeof globalThis.__nova64_cart_path === 'string')
          ? globalThis.__nova64_cart_path : 'res://carts/current';
      resPath = cart.replace(/\/?$/, '/') + path.replace(/^\.?\//, '');
    }
    const r = call('wad.load', { path: resPath });
    if (!r || !r.handle || !r.directory) return null;
    return new WADLoader().load({ handle: r.handle, directory: r.directory });
  }

  const wadNs = {
    load: loadWad,
    get(_path) { return null; },
    WADLoader,
    WADTextureManager,
    convertWADMap: wadConvertMap,
    setWallUVs,
    THING_MONSTERS: _WAD_THING_MONSTERS,
    THING_ITEMS: _WAD_THING_ITEMS,
    THING_SPRITE_PREFIX: _WAD_THING_SPRITE_PREFIX,
  };

  let _timerId = 1;
  const _timers = new Map();
  function _scheduleTimer(fn, ms, repeat) {
    const id = _timerId++;
    _timers.set(id, {
      fn,
      delay: Math.max(0, (ms || 0) / 1000),
      remaining: Math.max(0, (ms || 0) / 1000),
      repeat: !!repeat,
    });
    return id;
  }
  function _tickTimers(dt) {
    const due = [];
    _timers.forEach(function (timer, id) {
      timer.remaining -= dt || 0;
      if (timer.remaining <= 0) due.push([id, timer]);
    });
    for (let i = 0; i < due.length; i++) {
      const id = due[i][0];
      const timer = due[i][1];
      if (!_timers.has(id)) continue;
      if (timer.repeat) timer.remaining += timer.delay || 0.000001;
      else _timers.delete(id);
      try { if (typeof timer.fn === 'function') timer.fn(); } catch (e) { print('[nova64-compat] timer error: ' + e); }
    }
  }
  function setTimeout_(fn, ms) { return _scheduleTimer(fn, ms, false); }
  function setInterval_(fn, ms) { return _scheduleTimer(fn, ms, true); }
  function clearTimeout_(id) { _timers.delete(id); }
  function clearInterval_(id) { _timers.delete(id); }
  function requestAnimationFrame_(fn) { return _scheduleTimer(function () { if (typeof fn === 'function') fn(novaStore.getState().time * 1000); }, 0, false); }
  function cancelAnimationFrame_(id) { _timers.delete(id); }

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
  function randRange(min, max) { return rand(min, max); }
  function randInt(min, max) {
    if (max == null) { max = min; min = 0; }
    return Math.floor(rand(min, max + 1));
  }
  function choose(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined; }
  utilNs.rand = rand;
  utilNs.randRange = randRange;
  utilNs.randInt = randInt;
  utilNs.choose = choose;
  utilNs.ease = function (t, name) {
    if (typeof t === 'string') {
      const key = t;
      t = name == null ? 0 : name;
      name = key;
    }
    const key = name || 'linear';
    const fn = Ease[key] || Ease['ease' + String(key).charAt(0).toUpperCase() + String(key).slice(1)] || Ease.linear;
    return fn(clamp(+t || 0, 0, 1));
  };


  // ---------------- namespace + global aliases -------------------------
  const defaultUiColors = {
    primary: 0x4a90e2, secondary: 0x9b9b9b, light: 0xeeeeee, dark: 0x222222,
    success: 0x4caf50, warning: 0xffb300, danger: 0xe53935,
    white: 0xffffff, black: 0x000000, accent: 0xff8800,
  };
  if (typeof global.uiColors === 'undefined') global.uiColors = defaultUiColors;
  // Note: loadModel/loadVoxModel/loadTexture/playAnimation are also
  // exposed on nova64.scene because runtime/namespace.js (the Three.js
  // backend) lives them under the "scene" namespace; carts that
  // destructure `const { loadVoxModel } = nova64.scene` rely on that.
  engine.createMaterial = engine.createMaterial || createEngineMaterial;
  engine.setMeshMaterial = engine.setMeshMaterial || setMeshMaterial;
  engine.createColor = engine.createColor || createEngineColor;
  engine.cloneTexture = engine.cloneTexture || cloneTexture;
  engine.setTextureRepeat = engine.setTextureRepeat || setTextureRepeat;
  engine.getCapabilities = engine.getCapabilities || function () {
    const r = call('host.getCapabilities', {});
    return r ? r.capabilities : { backend: 'godot' };
  };
  // Three.js carts use engine.getCameraPosition() to billboard sprites at
  // the camera. Mirror the shim's tracked cameraPos as a {x,y,z}-shaped
  // object so cart code like `const p = engine.getCameraPosition(); p.x`
  // works without throwing "not a function" every frame.
  engine.getCameraPosition = engine.getCameraPosition || function () {
    return { x: cameraPos[0], y: cameraPos[1], z: cameraPos[2] };
  };

  const sceneNs = { createCube, createSphere, createPlane, createCylinder, createCone, createTorus, createAdvancedCube, createAdvancedSphere, createCapsule, removeMesh, destroyMesh: removeMesh, setPosition, setRotation, rotateMesh, moveMesh, setScale, getPosition, getMesh, createInstancedMesh, setInstanceTransform, setInstancePosition, setInstanceColor, finalizeInstances, setMeshVisible, setMeshOpacity: function(h, o) { setMeshVisible(h, o > 0); }, setCastShadow: function() {}, setReceiveShadow: function() {}, setFlatShading: function() {}, setPBRProperties, createLODMesh: function() { return null; }, removeLODMesh: function() {}, updateLODs: function() {}, removeInstancedMesh: removeMesh, raycastFromCamera: function() { return null; }, get3DStats: function() { return {}; }, getRenderer: function() { return null; }, getScene: function() { return null; }, getRotation: function() { return [0, 0, 0]; }, clearScene, loadModel, loadVoxModel, loadTexture, playAnimation: function() {}, updateAnimations: function() {}, engine: global.engine };
  const cameraNs = { setCameraPosition, setCameraTarget, setCameraFOV, setCameraLookAt };
  const lightNs = { setLightDirection, setDirectionalLight, setFog, clearFog, createPointLight, removeLight, setPointLightPosition, createSpotLight, createAmbientLight, setAmbientLight, setLightColor, setLightEnergy, createGradientSkybox, createImageSkybox };
  const drawNs = { cls, print: novaPrint, printCentered, printRight, rect, rectfill, line, pixel, pset, circle, circfill, ellipse, ellipsefill, arc, bezier, drawRect, drawPanel, drawGlowText, drawGlowTextCentered, drawRadialGradient, drawGradient, drawProgressBar, drawHealthBar, drawPixelBorder, drawCrosshair, drawScanlines, drawNoise, drawTriangle, drawDiamond, drawStarburst, poly, rgba8, screenWidth, screenHeight, colorLerp, colorMix, hslColor, hexColor: function(hex, alpha) { return colorFromHex(hex, alpha); }, n64Palette, measureText, scrollingText, drawWave, drawPulsingText, drawCheckerboard, drawFloatingTexts, drawFloatingTexts3D, createMinimap, drawMinimap, drawSkyGradient };
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
  const fxNs = { enablePixelation, enableDithering, enableBloom, setBloomStrength, enableFXAA, enableChromaticAberration, enableVignette, setN64Mode, setPSXMode, enableRetroEffects, isEffectsEnabled, enableSSR, enableSSAO, enableVolumetricFog, enableDOF, setExposure, setTonemap, setColorAdjustment, createParticleSystem, setParticleEmitter, emitParticle, burstParticles, updateParticles, removeParticleSystem, getParticleStats, createEmitter2D, updateEmitter2D, drawEmitter2D, burstEmitter2D, clearEmitter2D };
  const uiNs = { createButton, createLabel, createPanel, createSlider, createCheckbox, createDialog, clearButtons, updateAllButtons, drawAllButtons, drawGradientRect, drawPanel, drawText, drawTextShadow, drawTextOutline, setFont, setTextAlign, setTextBaseline, grid, parseCanvasUI, renderCanvasUI, updateCanvasUI, createContainer, addChild, createGraphicsNode, createTextNode, drawStage, uiColors: global.uiColors, centerX: function (w) { return Math.floor((640 - (w || 0)) / 2); }, centerY: function (h) { return Math.floor((360 - (h || 0)) / 2); }, Screen: (function() { function Screen() { this.data = {}; } Screen.prototype.enter = function(d) { this.data = Object.assign({}, this.data, d || {}); }; Screen.prototype.exit = function() {}; Screen.prototype.update = function() {}; Screen.prototype.draw = function() {}; return Screen; }()), getFont: function() { return 'default'; }, uiProgressBar: drawProgressBar };
  const stageNs = { createContainer, addChild, createGraphicsNode, createTextNode, drawStage, createMovieClip, createStage, createScreen, pushScreen, popScreen,
    createShake, triggerShake, updateShake, getShakeOffset,
    createCard, createMenu, createStartScreen };
  const particlesNs = { createParticleSystem, setParticleEmitter, emitParticle, burstParticles, updateParticles, removeParticleSystem, getParticleStats, createEmitter2D, updateEmitter2D, drawEmitter2D, burstEmitter2D, clearEmitter2D, createParticles };
  const skyboxNs = { createSpaceSkybox, createGalaxySkybox, createSunsetSkybox, createDawnSkybox, createNightSkybox, createFoggySkybox, createDuskSkybox, createStormSkybox, createAlienSkybox, createUnderwaterSkybox, createGradientSkybox, createImageSkybox, setSkybox, createSkybox };
  const modelsNs = { loadModel, loadVoxModel, createTexture, loadTexture, createInstancedMesh, createTSLMaterial, createTSLShaderMaterial, createShaderMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial, createLavaMaterial, createPlasmaMaterial, createWaterMaterial, createShockwaveMaterial, createAdvancedCube };
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
  const shaderBacking = { createTSLMaterial, createTSLShaderMaterial, createShaderMaterial, createHologramMaterial, createVortexMaterial, createPBRMaterial, createLavaMaterial, createPlasmaMaterial, createWaterMaterial, createShockwaveMaterial };
  const physicsBacking = {};
  const dataBacking = {
    t: function (key) { return key; },
    WADLoader,
    WADTextureManager,
    convertWADMap: wadConvertMap,
    setWallUVs,
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
  drawNs.withBlend = function (_mode, fn) { if (typeof fn === 'function') fn(_makeCanvasContext()); };

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
    uiNs, stageNs, particlesNs, skyboxNs, modelsNs, voxelNs, shaderBacking);
  global.get3DStats = get3DStats;
  global.rand = rand;
  global.randRange = randRange;
  global.randInt = randInt;
  global.choose = choose;
  global.storage = storageNsP;
  global.i18n = i18nNsP;
  global.wad = wadNsP;
  // Some carts use bare `engine` as the bridge handle.
  if (!global.engine) global.engine = engine;
  if (typeof global.engine.createPlaneGeometry === 'undefined') {
    global.engine.createPlaneGeometry = function (w, h) {
      const geom = call('geometry.createPlane', { size: [w || 1, h || 1] });
      return { handle: geom && geom.handle ? geom.handle : 0, dispose: function () {} };
    };
  }
  if (typeof global.engine.createBoxGeometry === 'undefined') {
    global.engine.createBoxGeometry = function (w, h, d) {
      const geom = call('geometry.createBox', { size: [w || 1, h || 1, d || 1] });
      return { handle: geom && geom.handle ? geom.handle : 0, dispose: function () {} };
    };
  }

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
    global.centerY = function (h) { return Math.floor((360 - (h || 0)) / 2); };
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
