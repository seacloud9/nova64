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
  function makeMeshHandle(rawHandle, pos) {
    const px = (pos && pos[0]) || 0;
    const py = (pos && pos[1]) || 0;
    const pz = (pos && pos[2]) || 0;
    const obj = {
      handle: rawHandle | 0,
      position: { x: px, y: py, z: pz },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      material: null,
      visible: true,
    };
    obj[Symbol.toPrimitive] = function () { return obj.handle; };
    return obj;
  }

  function spawnMesh(geomHandle, color, pos) {
    ensureInit();
    const mat = call('material.create', {
      albedo: colorFromHex(color),
      metallic: 0.05,
      roughness: 0.6,
    });
    const matHandle = mat ? mat.handle : 0;
    const mesh = call('mesh.create', { geometry: geomHandle });
    const meshHandle = mesh ? mesh.handle : 0;
    if (meshHandle && matHandle) {
      call('mesh.setMaterial', { mesh: meshHandle, material: matHandle });
    }
    if (meshHandle) {
      call('transform.set', { handle: meshHandle, position: ensureArray3(pos && pos[0], pos && pos[1], pos && pos[2]) });
    }
    return meshHandle ? makeMeshHandle(meshHandle, pos) : 0;
  }

  function createCube(size, color, pos) {
    ensureInit();
    const s = typeof size === 'number' ? size : 1;
    const geom = call('geometry.createBox', { size: [s, s, s] });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function createSphere(radius, color, pos) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const geom = call('geometry.createSphere', { radius: r, height: r * 2 });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function createPlane(w, h, color, pos) {
    ensureInit();
    const sx = typeof w === 'number' ? w : 1;
    const sz = typeof h === 'number' ? h : 1;
    const geom = call('geometry.createPlane', { size: [sx, 0, sz] });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  // Cylinder + cone + torus primitives — backed by real Godot meshes.
  function createCylinder(radiusTop, radiusBottom, height, color, pos) {
    ensureInit();
    const rt = typeof radiusTop === 'number' ? radiusTop : 0.5;
    const rb = typeof radiusBottom === 'number' ? radiusBottom : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createCylinder', {
      topRadius: rt, bottomRadius: rb, height: h, sides: 24,
    });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function createCone(radius, height, color, pos) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createCone', { radius: r, height: h, sides: 24 });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function createTorus(innerRadius, outerRadius, color, pos) {
    ensureInit();
    const inner = typeof innerRadius === 'number' ? innerRadius : 0.3;
    const outer = typeof outerRadius === 'number' ? outerRadius : 0.5;
    const geom = call('geometry.createTorus', { innerRadius: inner, outerRadius: outer });
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
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
      handle.position.x = p[0]; handle.position.y = p[1]; handle.position.z = p[2];
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
      handle.rotation.x = r[0]; handle.rotation.y = r[1]; handle.rotation.z = r[2];
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
      handle.rotation.x = r[0]; handle.rotation.y = r[1]; handle.rotation.z = r[2];
    }
  }

  function setScale(handle, x, y, z) {
    if (!handle) return;
    const h = unwrapHandle(handle);
    if (!h) return;
    const s = ensureArray3(x, y, z, [1, 1, 1]);
    call('transform.set', { handle: h, scale: s });
    if (handle && typeof handle === 'object' && handle.scale) {
      handle.scale.x = s[0]; handle.scale.y = s[1]; handle.scale.z = s[2];
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
  function setCameraFOV(_deg) { warnOnce('setCameraFOV'); }

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
    call('env.set', { fog: true, fogColor: c, fogDensity: 1.0 / span });
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

  // ---------------- draw / 2D overlay (no host support yet) -------------
  function rgba8(r, g, b, a) {
    a = a == null ? 255 : a;
    return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
  }
  function cls(_color) { /* host clears each frame */ }
  function novaPrint(_text, _x, _y, _color, _scale) { warnOnce('draw.print'); }
  function printCentered(_text, _y, _color, _scale) { warnOnce('draw.printCentered'); }
  function rect(_x, _y, _w, _h, _color, _filled) { warnOnce('draw.rect'); }
  function rectfill(_x, _y, _w, _h, _color) { warnOnce('draw.rectfill'); }
  function line(_x0, _y0, _x1, _y1, _color) { warnOnce('draw.line'); }
  function pixel(_x, _y, _color) { warnOnce('draw.pixel'); }
  function screenWidth() { return 640; }
  function screenHeight() { return 360; }

  // ---------------- input -----------------------------------------------
  let inputState = { left: false, right: false, up: false, down: false, action: false, cancel: false, axisX: 0, axisY: 0, mouseDown: false };
  function pollInput() {
    inputState = call('input.poll', {}) || inputState;
    return inputState;
  }
  function key(name) {
    pollInput();
    switch (name) {
      case 'ArrowLeft': case 'a': case 'A': return !!inputState.left;
      case 'ArrowRight': case 'd': case 'D': return !!inputState.right;
      case 'ArrowUp': case 'w': case 'W': return !!inputState.up;
      case 'ArrowDown': case 's': case 'S': return !!inputState.down;
      case ' ': case 'Space': case 'Enter': return !!inputState.action;
      case 'Escape': return !!inputState.cancel;
      default: return false;
    }
  }
  const isKeyPressed = key;

  // ---------------- effects (mapped to Godot WorldEnvironment) ---------
  function enablePixelation(_n) { warnOnce('enablePixelation'); /* TODO: SubViewport */ }
  function enableDithering(_b) { warnOnce('enableDithering'); }
  function enableBloom(b, intensity) {
    ensureInit();
    call('env.set', {
      glow: b !== false,
      glowIntensity: typeof intensity === 'number' ? intensity : 0.8,
    });
  }
  function enableFXAA(_b) { /* Godot's MSAA/FXAA is project-level; no-op for now */ }
  function enableVignette(amount, _hardness) {
    ensureInit();
    // Vignette via adjustment darkening — not a real radial vignette but a
    // close enough cheap stand-in.
    const a = typeof amount === 'number' ? Math.max(0, Math.min(1, amount)) : 0.3;
    call('env.set', { brightness: 1.0 - a * 0.4, contrast: 1.0 + a * 0.2 });
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
  function clearFog() { warnOnce('clearFog'); }
  function getPosition(_handle) { return [0, 0, 0]; }

  const TWO_PI = Math.PI * 2;
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hsb(h, s, b) {
    // HSB(0..360, 0..100, 0..100) → packed 0xRRGGBB int.
    const sat = (s || 0) / 100, br = (b || 0) / 100;
    const c = br * sat;
    const hh = ((h || 0) % 360) / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, bl = 0;
    if (0 <= hh && hh < 1) { r = c; g = x; }
    else if (hh < 2) { r = x; g = c; }
    else if (hh < 3) { g = c; bl = x; }
    else if (hh < 4) { g = x; bl = c; }
    else if (hh < 5) { r = x; bl = c; }
    else if (hh < 6) { r = c; bl = x; }
    const m = br - c;
    const R = Math.round((r + m) * 255), G = Math.round((g + m) * 255), B = Math.round((bl + m) * 255);
    return (R << 16) | (G << 8) | B;
  }
  // Deterministic value-noise stand-in (not the same as runtime/api-generative).
  let _noiseSeed = 1337;
  function noiseSeed(s) { _noiseSeed = (s | 0) || 1; }
  function noise(x, y, z) {
    const n = Math.sin((x || 0) * 12.9898 + (y || 0) * 78.233 + (z || 0) * 37.719 + _noiseSeed) * 43758.5453;
    return (n - Math.floor(n));
  }

  const utilNs = { TWO_PI, clamp, lerp, hsb, noise, noiseSeed };

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

  // Particles (2D + 3D)
  function createParticleSystem(_opts) { warnOnce('createParticleSystem'); return makeStub(); }
  function createEmitter2D(_opts) { warnOnce('createEmitter2D'); return makeStub(); }
  function createParticles(_opts) { warnOnce('createParticles'); return makeStub(); }

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

  // Models / textures / advanced materials. createInstancedMesh falls back
  // to a single cube so cart code that destructures the return continues.
  function loadModel(path, cb) {
    warnOnce('loadModel');
    const stub = makeStub({ handle: 0, path: path });
    if (typeof cb === 'function') {
      // Defer a tiny bit conceptually — we just call it inline because
      // there is no event loop in QuickJS host.
      try { cb(stub); } catch (_e) { /* swallow */ }
    }
    return stub;
  }
  function createTexture(_opts) { warnOnce('createTexture'); return 0; }
  function loadTexture(_path) { warnOnce('loadTexture'); return 0; }
  function createInstancedMesh(_geom, _count, color, _opts) {
    warnOnce('createInstancedMesh');
    // Fallback: single cube so the scene still has *something* visible.
    const handle = createCube(1, color || 0xffffff, [0, 0, 0]);
    const stub = makeStub({ handle: handle, count: 0 });
    stub.setInstanceTransform = function () { return stub; };
    stub.setInstanceColor = function () { return stub; };
    stub.addInstance = function () { return stub; };
    return stub;
  }
  function createTSLMaterial(_opts) { warnOnce('createTSLMaterial'); return 0; }
  function createHologramMaterial(_opts) { warnOnce('createHologramMaterial'); return 0; }
  function createVortexMaterial(_opts) { warnOnce('createVortexMaterial'); return 0; }
  function createPBRMaterial(_opts) { warnOnce('createPBRMaterial'); return 0; }
  function createAdvancedCube(color, pos) {
    warnOnce('createAdvancedCube');
    return createCube(1, color || 0xffffff, pos);
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
  const i18nNs = {
    setLocale(_l) { warnOnce('i18n.setLocale'); },
    t(key) { return key; },
    getLocale() { return 'en'; },
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

  // Extra input stubs — most carts only check truthy/falsy.
  const buttonState = { a: false, b: false, x: false, y: false, l: false, r: false, start: false, select: false };
  function btn(_name) { return false; }
  function btnp(_name) { return false; }
  const padNs = {
    button(_i, _b) { return false; },
    axis(_i, _a) { return 0; },
    isConnected(_i) { return false; },
  };
  const mouseNs = {
    x: 0, y: 0,
    isDown(_b) { return false; },
    wasPressed(_b) { return false; },
  };

  // Misc free helpers some carts grab off globalThis.
  function rand(min, max) {
    if (max == null) { max = min; min = 0; }
    return min + Math.random() * ((max == null ? 1 : max) - min);
  }
  function randInt(min, max) { return Math.floor(rand(min, max)); }
  function choose(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined; }


  // ---------------- namespace + global aliases -------------------------
  const sceneNs = { createCube, createSphere, createPlane, createCylinder, createCone, createTorus, removeMesh, destroyMesh: removeMesh, setPosition, setRotation, rotateMesh, setScale, getPosition, engine: global.engine };
  const cameraNs = { setCameraPosition, setCameraTarget, setCameraFOV };
  const lightNs = { setLightDirection, setFog, clearFog, createPointLight, createSpotLight, createAmbientLight, setAmbientLight, setLightColor, setLightEnergy };
  const drawNs = { cls, print: novaPrint, printCentered, rect, rectfill, line, pixel, rgba8, screenWidth, screenHeight };
  const inputNs = { key, isKeyPressed, isKeyDown: key, keyp: key, pollInput, btn, btnp, pad: padNs, mouse: mouseNs };
  const fxNs = { enablePixelation, enableDithering, enableBloom, enableFXAA, enableVignette, setN64Mode, setPSXMode, enableRetroEffects, enableSSR, enableSSAO, enableVolumetricFog, enableDOF, setExposure, setTonemap, setColorAdjustment };
  const uiNs = { createButton, createLabel, createPanel, createSlider, createCheckbox, createDialog, parseCanvasUI, renderCanvasUI, updateCanvasUI };
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
  drawNs.drawPanel = namedNoop('draw', 'drawPanel');
  drawNs.drawProgressBar = namedNoop('draw', 'drawProgressBar');
  drawNs.circle = namedNoop('draw', 'circle');
  drawNs.pset = pixel;
  drawNs.BM = { add: 0, multiply: 1, screen: 2, alpha: 3 };
  drawNs.withBlend = function (_mode, fn) { if (typeof fn === 'function') fn(makeStub()); };

  utilNs.color = function (r, g, b, a) { return rgba8((r || 0) * 255 | 0, (g || 0) * 255 | 0, (b || 0) * 255 | 0, a == null ? 255 : (a * 255 | 0)); };
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
  utilNs.rotate = function (x, y, ang) { const c = Math.cos(ang), s = Math.sin(ang); return [x * c - y * s, x * s + y * c]; };

  // Voxel namespace gets simplex helpers (alias of shim's noise).
  voxelNs.simplexNoise2D = function (x, y) { return noise(x, y, 0) * 2 - 1; };
  voxelNs.simplexNoise3D = function (x, y, z) { return noise(x, y, z) * 2 - 1; };

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

  print('[nova64-compat] shim loaded');
})(globalThis);
