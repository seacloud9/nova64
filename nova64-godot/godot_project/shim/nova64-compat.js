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
    return meshHandle;
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

  // Cylinder + cone primitives — emulated as box approximations until the
  // bridge gains real geometry methods. Keeps carts that destructure these
  // factories from crashing and gives the right rough scale on screen.
  function createCylinder(radiusTop, radiusBottom, height, color, pos) {
    ensureInit();
    const r = Math.max(radiusTop || 0.5, radiusBottom || 0.5);
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createBox', { size: [r * 2, h, r * 2] });
    if (!warned.has('createCylinder-fallback')) {
      warned.add('createCylinder-fallback');
      print('[nova64-compat] createCylinder approximated as box (no real cylinder geometry yet)');
    }
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function createCone(radius, height, color, pos) {
    ensureInit();
    const r = typeof radius === 'number' ? radius : 0.5;
    const h = typeof height === 'number' ? height : 1;
    const geom = call('geometry.createBox', { size: [r * 2, h, r * 2] });
    if (!warned.has('createCone-fallback')) {
      warned.add('createCone-fallback');
      print('[nova64-compat] createCone approximated as box (no real cone geometry yet)');
    }
    return geom ? spawnMesh(geom.handle, color, pos) : 0;
  }

  function removeMesh(handle) {
    if (!handle) return;
    call('mesh.destroy', { handle: handle });
    rotState.delete(handle);
  }

  function setPosition(handle, x, y, z) {
    if (!handle) return;
    call('transform.set', { handle: handle, position: ensureArray3(x, y, z) });
  }

  function setRotation(handle, x, y, z) {
    if (!handle) return;
    const r = ensureArray3(x, y, z);
    rotState.set(handle, r.slice());
    call('transform.set', { handle: handle, rotation: r });
  }

  function rotateMesh(handle, dx, dy, dz) {
    if (!handle) return;
    const r = getRot(handle);
    r[0] += dx || 0; r[1] += dy || 0; r[2] += dz || 0;
    call('transform.set', { handle: handle, rotation: r });
  }

  function setScale(handle, x, y, z) {
    if (!handle) return;
    call('transform.set', { handle: handle, scale: ensureArray3(x, y, z, [1, 1, 1]) });
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
  function setFog(_color, _near, _far) { warnOnce('setFog'); }
  function createPointLight(_color, _energy, _pos) { warnOnce('createPointLight'); return 0; }
  function createAmbientLight(_color, _energy) { warnOnce('createAmbientLight'); return 0; }
  function setAmbientLight(_color, _energy) { warnOnce('setAmbientLight'); }
  function setLightColor(_color) { warnOnce('setLightColor'); }

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

  // ---------------- effects (no-op shims) ------------------------------
  function enablePixelation(_n) { warnOnce('enablePixelation'); }
  function enableDithering(_b) { warnOnce('enableDithering'); }
  function enableBloom(_b) { warnOnce('enableBloom'); }
  function enableFXAA() { warnOnce('enableFXAA'); }
  function enableVignette(_a, _b) { warnOnce('enableVignette'); }
  function setN64Mode(_b) { warnOnce('setN64Mode'); }
  function setPSXMode(_b) { warnOnce('setPSXMode'); }

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

  // ---------------- namespace + global aliases -------------------------
  const sceneNs = { createCube, createSphere, createPlane, createCylinder, createCone, removeMesh, setPosition, setRotation, rotateMesh, setScale, getPosition };
  const cameraNs = { setCameraPosition, setCameraTarget, setCameraFOV };
  const lightNs = { setLightDirection, setFog, clearFog, createPointLight, createAmbientLight, setAmbientLight, setLightColor };
  const drawNs = { cls, print: novaPrint, printCentered, rect, rectfill, line, pixel, rgba8, screenWidth, screenHeight };
  const inputNs = { key, isKeyPressed, pollInput };
  const fxNs = { enablePixelation, enableDithering, enableBloom, enableFXAA, enableVignette, setN64Mode, setPSXMode };

  global.nova64 = {
    __compatLoaded: true,
    scene: sceneNs,
    camera: cameraNs,
    light: lightNs,
    draw: drawNs,
    input: inputNs,
    effects: fxNs,
    fx: fxNs,
    util: utilNs,
    audio: audioNs,
    tween: tweenNs,
  };

  // Flat-global aliases so older carts that don't destructure still work.
  Object.assign(global, sceneNs, cameraNs, lightNs, drawNs, inputNs, fxNs, utilNs, audioNs, tweenNs);
  global.get3DStats = get3DStats;

  // `console` polyfill for carts that use console.log
  if (!global.console) {
    global.console = {
      log: function () { print.apply(null, arguments); },
      warn: function () { print.apply(null, arguments); },
      error: function () { print.apply(null, arguments); },
    };
  }

  print('[nova64-compat] shim loaded');
})(globalThis);
