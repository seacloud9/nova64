// metaverse — a basic shared 3D world (Phase 1).
//
// Walk around a 3D space and see other connected players moving in realtime.
// First-person by default; press C to toggle a third-person view of your own
// avatar. Built on nova64.net (the same backend that cross-plays to Godot) and
// the StateRoom's 3D fields (x/y/z + ry).
//
// Needs the server:  cd server && pnpm start   (ws://localhost:2567)
// Open a second tab (or a Godot client) to see avatars sync.
//
// Controls:  WASD / arrows move · mouse or Q/E turn · C toggles camera.
//
// Phase 2 adds remote-player smoothing + name tags; Phase 3 adds chat. See
// docs/MULTIPLAYER_AND_AUTH_DESIGN.md and docs/METAVERSE.md.

let room = null;
let me = null;
let status = 'starting';
let camMode = 'first'; // 'first' | 'third'
let mouseInit = false;
let lastSent = 0;

// Local player: ground position (x,z), facing (yaw), look pitch.
const player = { x: 0, z: 6, yaw: Math.PI, pitch: 0 };

// id -> { x, z, yaw, name, mesh }. Avatar meshes are created/destroyed as
// players join/leave; positions update from net state each frame.
const others = new Map();

const MOVE_SPEED = 6; // units/s
const TURN_SPEED = 2.2; // rad/s (keyboard turn)
const EYE = 1.6; // camera/eye height
const SEND_HZ = 15; // position updates per second

function netReady() {
  return !!(nova64.net && nova64.net.isSupported && nova64.net.isSupported());
}

function defaultNetUrl() {
  try {
    if (typeof location !== 'undefined' && location.hostname) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      return proto + '://' + location.hostname + ':2567';
    }
  } catch (_) {
    /* ignore */
  }
  return 'ws://localhost:2567';
}

// Stable per-player color from the session id (so an avatar keeps its hue).
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return nova64.util && nova64.util.hslColor
    ? nova64.util.hslColor(hue / 360, 0.6, 0.55)
    : 0x55aaff;
}

// A simple avatar: a body cube + a smaller "nose" cube marking facing.
function spawnAvatar(id, p) {
  const c = colorFor(id);
  const body = nova64.scene.createCube(1, c, [p.x || 0, 0.9, p.z || 0], {
    material: 'standard',
    color: c,
    roughness: 0.7,
  });
  others.set(id, {
    x: p.x || 0,
    z: p.z || 0,
    yaw: p.ry || 0,
    name: p.name || id.slice(0, 4),
    mesh: body,
  });
}

function despawnAvatar(id) {
  const o = others.get(id);
  if (o && o.mesh != null) {
    try {
      nova64.scene.destroyMesh(o.mesh);
    } catch (_) {
      /* ignore */
    }
  }
  others.delete(id);
}

export function init() {
  status = 'starting';
  others.clear();
  room = null;
  me = null;
  player.x = 0;
  player.z = 6;
  player.yaw = Math.PI;
  player.pitch = 0;
  camMode = 'first';

  // World — floor grid + a ring of pillars so motion is legible.
  nova64.light.setAmbientLight ? nova64.light.setAmbientLight(0x334455, 0.6) : null;
  nova64.light.setDirectionalLight([-1, -2, -1], 0xfff0dd, 0.9);

  const floor = nova64.scene.createPlane(80, 80, 0x10141f, [0, 0, 0], {
    material: 'standard',
    color: 0x10141f,
    roughness: 1.0,
  });
  nova64.scene.setRotation(floor, -Math.PI / 2, 0, 0);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = Math.cos(a) * 14;
    const pz = Math.sin(a) * 14;
    const pillar = nova64.scene.createCube(1.5, 0x2a3550, [px, 2, pz], {
      material: 'standard',
      color: 0x2a3550,
      roughness: 0.8,
    });
    nova64.scene.setScale(pillar, 1, 3, 1);
  }
  // A bright center marker so the space has a focal point.
  const beacon = nova64.scene.createCube(1, 0xffcc44, [0, 0.5, 0], {
    material: 'emissive',
    color: 0xffcc44,
    intensity: 0.6,
  });
  nova64.scene.setScale(beacon, 0.4, 1, 0.4);

  connectAsync();
}

async function connectAsync() {
  if (!netReady()) {
    status = 'offline (no net on this host)';
    return;
  }
  try {
    if (nova64.auth && nova64.auth.signIn) {
      me = await nova64.auth.signIn('guest', {
        name: 'Visitor-' + Math.floor(Math.random() * 1000),
      });
    }
    status = 'connecting…';
    const url = globalThis.__NOVA64_NET_URL || defaultNetUrl();
    await nova64.net.connect({ url });
    room = await nova64.net.joinOrCreate('state', { name: (me && me.displayName) || 'Visitor' });
    status = 'connected';

    room.onPlayerAdd((p, id) => {
      if (id === room.sessionId) return;
      if (!others.has(id)) spawnAvatar(id, p);
    });
    room.onPlayerChange((p, id) => {
      if (id === room.sessionId) return;
      const o = others.get(id);
      if (o) {
        o.x = p.x;
        o.z = p.z;
        o.yaw = p.ry;
        if (p.name) o.name = p.name;
      } else {
        spawnAvatar(id, p);
      }
    });
    room.onPlayerRemove(id => despawnAvatar(id));
    room.onLeave(() => {
      status = 'disconnected';
      room = null;
    });
    room.onError(code => {
      status = 'error ' + code;
    });
    sendPos(true);
  } catch (e) {
    room = null;
    status = 'offline (server not reachable)';
  }
}

function sendPos(force) {
  if (!room) return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  if (!force && now - lastSent < 1 / SEND_HZ) return;
  lastSent = now;
  room.send('pos3', { x: player.x, y: 0, z: player.z, ry: player.yaw });
}

function key(...codes) {
  const k = nova64.input && (nova64.input.key || nova64.input.isKeyPressed);
  if (typeof k !== 'function') return false;
  return codes.some(c => k.call(nova64.input, c));
}

// Web pointer-lock mouse-look. Guarded so the cart still runs on Godot/QuickJS
// (no DOM there — turning falls back to Q/E and the arrow keys).
function initMouseLook() {
  if (mouseInit || typeof document === 'undefined') return;
  mouseInit = true;
  document.addEventListener('mousedown', () => {
    if (!document.pointerLockElement && document.body && document.body.requestPointerLock) {
      document.body.requestPointerLock().catch(() => {});
    }
  });
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement) {
      player.yaw -= e.movementX * 0.0025;
      player.pitch -= e.movementY * 0.0022;
      player.pitch = Math.max(-0.9, Math.min(0.9, player.pitch));
    }
  });
}

let prevC = false;

export function update(dt) {
  if (nova64.net && nova64.net._tick) nova64.net._tick(dt);
  initMouseLook();

  // Camera toggle on C (edge-triggered).
  const cNow = key('KeyC');
  if (cNow && !prevC) camMode = camMode === 'first' ? 'third' : 'first';
  prevC = cNow;

  // Keyboard turning (universal fallback + works alongside mouse).
  if (key('KeyQ')) player.yaw += TURN_SPEED * dt;
  if (key('KeyE')) player.yaw -= TURN_SPEED * dt;

  // Movement relative to facing. Forward = (sin yaw, cos yaw); right = perp.
  const fx = Math.sin(player.yaw);
  const fz = Math.cos(player.yaw);
  const rx = Math.cos(player.yaw);
  const rz = -Math.sin(player.yaw);
  let dx = 0;
  let dz = 0;
  if (key('KeyW', 'ArrowUp')) {
    dx += fx;
    dz += fz;
  }
  if (key('KeyS', 'ArrowDown')) {
    dx -= fx;
    dz -= fz;
  }
  if (key('KeyD')) {
    dx -= rx;
    dz -= rz;
  }
  if (key('KeyA')) {
    dx += rx;
    dz += rz;
  }
  // Arrow left/right turn (so arrows alone fully control without a mouse).
  if (key('ArrowLeft')) player.yaw += TURN_SPEED * dt;
  if (key('ArrowRight')) player.yaw -= TURN_SPEED * dt;

  const len = Math.hypot(dx, dz);
  let moved = false;
  if (len > 0) {
    player.x += (dx / len) * MOVE_SPEED * dt;
    player.z += (dz / len) * MOVE_SPEED * dt;
    player.x = Math.max(-39, Math.min(39, player.x));
    player.z = Math.max(-39, Math.min(39, player.z));
    moved = true;
  }
  if (moved) sendPos(false);

  // Remote avatars — snap to latest known pose (Phase 2 interpolates).
  others.forEach(o => {
    if (o.mesh != null) {
      nova64.scene.setPosition(o.mesh, o.x, 0.9, o.z);
      nova64.scene.setRotation(o.mesh, 0, o.yaw, 0);
    }
  });

  updateCamera();
}

function updateCamera() {
  const eyeX = player.x;
  const eyeY = EYE;
  const eyeZ = player.z;
  const lookX = Math.sin(player.yaw) * Math.cos(player.pitch);
  const lookY = Math.sin(player.pitch);
  const lookZ = Math.cos(player.yaw) * Math.cos(player.pitch);

  if (camMode === 'third') {
    // Camera behind + above the player, looking at the head.
    const back = 6;
    nova64.camera.setCameraPosition(eyeX - lookX * back, eyeY + 2.5, eyeZ - lookZ * back);
    nova64.camera.setCameraTarget(eyeX, EYE, eyeZ);
  } else {
    nova64.camera.setCameraPosition(eyeX, eyeY, eyeZ);
    nova64.camera.setCameraTarget(eyeX + lookX, eyeY + lookY, eyeZ + lookZ);
  }
}

function col(r, g, b, a = 255) {
  return nova64.draw.rgba8 ? nova64.draw.rgba8(r, g, b, a) : (r << 16) | (g << 8) | b;
}

export function draw() {
  // HUD overlay (2D). Avatar name tags come in Phase 2 (world→screen project).
  nova64.draw.print('NOVA64 METAVERSE  [' + status + ']', 8, 8, col(120, 255, 210));
  nova64.draw.print('players here: ' + (others.size + (room ? 1 : 0)), 8, 22, col(160, 200, 255));
  nova64.draw.print('cam: ' + camMode + ' (C to toggle)', 8, 36, col(160, 200, 255));

  // Crosshair in first-person.
  if (camMode === 'first') {
    nova64.draw.print('+', 316, 178, col(255, 255, 255));
  }

  nova64.draw.print('WASD/arrows move · mouse or Q/E turn · C camera', 8, 338, col(120, 140, 200));
}
