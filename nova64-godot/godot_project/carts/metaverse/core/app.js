// app.js — MetaverseApp: the orchestrator.
//
// Owns the net room, local + remote player state (with interpolation), the
// active render backend, and the plugin lifecycle. Plugins (controls, chat, …)
// read/extend the app through a context object; they never touch nova64 net or
// scene directly, so the same plugin runs on any backend. See docs/METAVERSE.md.

import { getBackend, createPluginSet } from './registry.js';
import * as ui from './ui.js';
import { renderUI, defaultTheme } from './ui.js';

const SEND_HZ = 15;
const LERP = 12; // remote-avatar smoothing rate

function now() {
  return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
}
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
function colorFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = (h % 360) / 360;
  // hsl→0xAARRGGBB (alpha opaque). Cheap HSL with s=0.6 l=0.55.
  const s = 0.6;
  const l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = hue * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (0xff000000 | (R << 16) | (G << 8) | B) >>> 0;
}

export function createApp(opts = {}) {
  const backend = getBackend(opts.backend || 'web');
  const theme = Object.assign({}, defaultTheme, opts.theme || {});
  const plugins = createPluginSet();
  (opts.plugins || []).forEach(p => plugins.use(p));

  const world = opts.world || {};
  const LOCAL_ID = '__me__'; // handle for the local player's own avatar
  const local = { x: 0, z: 6, yaw: Math.PI, pitch: 0, mode: 'first' };
  const others = new Map(); // id -> { x, z, yaw, name, tx, tz, tyaw } (t* = targets)
  const commands = new Map();
  let room = null;
  let me = null;
  let status = 'starting';
  let lastSent = 0;
  let prevTouchIds = new Set();
  let consumedPrev = new Set();
  let moveIntent = { forward: 0, strafe: 0 };

  // ---- context handed to plugins --------------------------------------
  const ctx = {
    backend,
    theme,
    ui,
    world,
    local,
    others,
    status: () => status,
    room: () => room,
    me: () => me,
    input: {
      key: (...c) => {
        const k = nova64.input && (nova64.input.key || nova64.input.isKeyPressed);
        return typeof k === 'function' ? c.some(x => k.call(nova64.input, x)) : false;
      },
      touches: () => (nova64.input && nova64.input.touches ? nova64.input.touches() : []),
      touchCount: () => (nova64.input && nova64.input.touchCount ? nova64.input.touchCount() : 0),
      isConsumed: id => consumedPrev.has(id),
    },
    pointers: [],
    // movement intents (controls plugin writes these)
    setMove: (forward, strafe) => {
      moveIntent.forward = forward;
      moveIntent.strafe = strafe;
    },
    addYaw: d => {
      local.yaw += d;
    },
    addPitch: d => {
      local.pitch = Math.max(-0.9, Math.min(0.9, local.pitch + d));
    },
    toggleCamera: () => {
      local.mode = local.mode === 'first' ? 'third' : 'first';
    },
    // chat / relay
    registerCommand: (name, fn) => commands.set(name, fn),
    runCommand: (name, args) => {
      const fn = commands.get(name);
      if (fn) {
        fn(args, ctx);
        return true;
      }
      return false;
    },
    sendRelay: (type, msg) => {
      if (room) room.send(type, msg);
    },
  };

  // Fire a presence lifecycle hook (onPeerJoin/onPeerLeave) across plugins.
  function notifyPeer(hook, id, info) {
    plugins.all().forEach(pl => {
      if (typeof pl[hook] === 'function') {
        try {
          pl[hook](id, info, ctx);
        } catch (_) {
          /* ignore */
        }
      }
    });
  }

  function spawn(id, p) {
    const name = (p && p.name) || id.slice(0, 4);
    others.set(id, {
      x: p.x || 0,
      z: p.z || 0,
      yaw: p.ry || 0,
      tx: p.x || 0,
      tz: p.z || 0,
      tyaw: p.ry || 0,
      name,
    });
    backend.addAvatar(id, { color: colorFor(id), name });
    notifyPeer('onPeerJoin', id, { name });
  }
  function despawn(id) {
    const o = others.get(id);
    backend.removeAvatar(id);
    others.delete(id);
    notifyPeer('onPeerLeave', id, { name: (o && o.name) || id.slice(0, 4) });
  }

  async function connect() {
    if (!netReady()) {
      status = 'offline (no net on this host)';
      return;
    }
    try {
      if (nova64.auth && nova64.auth.signIn) {
        me = await nova64.auth.signIn('guest', {
          name: opts.name || 'Visitor-' + Math.floor(Math.random() * 1000),
        });
      }
      status = 'connecting…';
      const url = globalThis.__NOVA64_NET_URL || opts.netUrl || defaultNetUrl();
      await nova64.net.connect({ url });
      // Fail fast instead of hanging forever if the host is unreachable (e.g.
      // native Godot socket can't reach a WSL server over localhost). Without
      // this the join promise never settles and the SDK keeps polling.
      const timeoutMs = opts.connectTimeoutMs || 8000;
      room = await Promise.race([
        nova64.net.joinOrCreate('state', {
          name: (me && me.displayName) || opts.name || 'Visitor',
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('connect_timeout')), timeoutMs)),
      ]);
      status = 'connected';

      room.onPlayerAdd((p, id) => {
        if (id === room.sessionId) return;
        if (!others.has(id)) spawn(id, p);
      });
      room.onPlayerChange((p, id) => {
        if (id === room.sessionId) return;
        const o = others.get(id);
        if (o) {
          o.tx = p.x;
          o.tz = p.z;
          o.tyaw = p.ry;
          if (p.name) o.name = p.name;
        } else spawn(id, p);
      });
      room.onPlayerRemove(id => despawn(id));
      room.onLeave(() => {
        status = 'disconnected';
        room = null;
      });
      room.onError(code => {
        status = 'error ' + code;
      });
      room.onMessage('event', evt => {
        plugins.all().forEach(pl => {
          if (typeof pl.onNetMessage === 'function') {
            try {
              pl.onNetMessage(evt, ctx);
            } catch (_) {
              /* ignore */
            }
          }
        });
      });
      sendPos(true);
    } catch (e) {
      room = null;
      // Tear down any half-open connection so the SDK stops polling/retrying.
      try {
        nova64.net.leave();
      } catch (_) {
        /* ignore */
      }
      status =
        e && e.message === 'connect_timeout'
          ? 'offline (connect timed out)'
          : 'offline (server not reachable)';
    }
  }

  function sendPos(force) {
    if (!room) return;
    const t = now();
    if (!force && t - lastSent < 1 / SEND_HZ) return;
    lastSent = t;
    room.send('pos3', { x: local.x, y: 0, z: local.z, ry: local.yaw });
  }

  function gatherPointers() {
    const out = [];
    const tc = ctx.input.touchCount();
    if (tc > 0) {
      const ids = new Set();
      ctx.input.touches().forEach(t => {
        ids.add(t.id);
        out.push({ id: t.id, x: t.x, y: t.y, down: true, pressed: !prevTouchIds.has(t.id) });
      });
      prevTouchIds = ids;
    } else {
      prevTouchIds = new Set();
      const mx = nova64.input.mouseX ? nova64.input.mouseX() : 0;
      const my = nova64.input.mouseY ? nova64.input.mouseY() : 0;
      const down = nova64.input.mouseDown ? nova64.input.mouseDown() : false;
      const pressed = nova64.input.mousePressed ? nova64.input.mousePressed() : false;
      out.push({ id: 'mouse', x: mx, y: my, down, pressed });
    }
    return out;
  }

  return {
    status: () => status,
    async start() {
      backend.init(world);
      // Your own avatar — shown only in third-person (in first-person the camera
      // sits inside it). Lets you actually see yourself move when you press C.
      backend.addAvatar(LOCAL_ID, { color: colorFor('me'), name: opts.name || 'me' });
      if (backend.setAvatarVisible) backend.setAvatarVisible(LOCAL_ID, false);
      plugins.all().forEach(pl => {
        if (typeof pl.init === 'function') pl.init(ctx);
      });
      connect(); // non-blocking; world renders immediately
    },

    update(dt) {
      if (nova64.net && nova64.net._tick) nova64.net._tick(dt);
      ctx.pointers = gatherPointers();

      moveIntent.forward = 0;
      moveIntent.strafe = 0;
      plugins.all().forEach(pl => {
        if (typeof pl.update === 'function') pl.update(dt, ctx);
      });

      // Integrate local movement from the merged intent (controls plugin).
      const speed = opts.moveSpeed || 6;
      const fx = Math.sin(local.yaw);
      const fz = Math.cos(local.yaw);
      const rx = Math.cos(local.yaw);
      const rz = -Math.sin(local.yaw);
      let dx = fx * moveIntent.forward + rx * moveIntent.strafe;
      let dz = fz * moveIntent.forward + rz * moveIntent.strafe;
      const len = Math.hypot(dx, dz);
      let moved = false;
      if (len > 0) {
        dx /= len;
        dz /= len;
        local.x = Math.max(-39, Math.min(39, local.x + dx * speed * dt));
        local.z = Math.max(-39, Math.min(39, local.z + dz * speed * dt));
        moved = true;
      }
      if (moved) sendPos(false);

      // Interpolate + render remote avatars.
      const k = Math.min(1, LERP * dt);
      others.forEach((o, id) => {
        o.x += (o.tx - o.x) * k;
        o.z += (o.tz - o.z) * k;
        let dyaw = o.tyaw - o.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        o.yaw += dyaw * k;
        backend.updateAvatar(id, { x: o.x, z: o.z, ry: o.yaw });
      });

      // Your own avatar follows you; visible only in third-person.
      backend.updateAvatar(LOCAL_ID, { x: local.x, z: local.z, ry: local.yaw });
      if (backend.setAvatarVisible) backend.setAvatarVisible(LOCAL_ID, local.mode === 'third');

      backend.setCamera({
        x: local.x,
        z: local.z,
        yaw: local.yaw,
        pitch: local.pitch,
        mode: local.mode,
      });
    },

    draw() {
      const roots = [];
      plugins.all().forEach(pl => {
        if (typeof pl.renderUI === 'function') {
          const node = pl.renderUI(ctx);
          if (Array.isArray(node)) roots.push(...node);
          else if (node) roots.push(node);
        }
      });
      consumedPrev = renderUI(roots, { backend, theme }, ctx.pointers);
    },
  };
}
