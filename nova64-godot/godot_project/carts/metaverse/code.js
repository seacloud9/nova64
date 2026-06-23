// metaverse — a basic shared 3D world with chat (extensible platform).
//
// Walk a 3D space and see other connected players move in realtime; chat with
// them. This cart is thin: it picks a render backend, registers plugins
// (controls + chat), describes the world, and runs the loop. Everything
// substantial lives behind seams so a Godot/XR backend or a different chat
// provider can slot in unchanged. See docs/METAVERSE.md.
//
// Needs the server:  cd server && pnpm start   (ws://localhost:2567)
// Open a second tab (or a Godot client) to see avatars + chat sync.
//
// Controls — Desktop: WASD/arrows move · mouse or Q/E look · C camera ·
//            Enter/T chat.   Mobile: left joystick move · right drag look ·
//            CAM / CHAT buttons.

import { registerBackend } from './core/registry.js';
import { createWebBackend } from './core/render-web.js';
import { createApp } from './core/app.js';
import { controlsPlugin } from './plugins/controls.js';
import { chatPlugin } from './plugins/chat.js';
import { presencePlugin } from './plugins/presence.js';
import { Panel, Text, List, Row, Button } from './core/ui.js';

// Status + live player roster HUD (top-left).
const hudPlugin = {
  id: 'hud',
  renderUI(ctx) {
    const me = ctx.me();
    const badge = p => (p && p !== 'guest' ? ' \xb7' + p : ''); // " ·google" for real logins
    const roster = [
      (me && me.displayName ? me.displayName : 'you') + '  (you' + badge(me && me.provider) + ')',
    ];
    ctx.others.forEach(o => roster.push((o.name || '????') + badge(o.provider)));
    // A small filled swatch showing your current avatar color, next to a button
    // that cycles it (synced to everyone via the player data blob).
    const swatch = {
      measure: () => ({ w: 14, h: 14 }),
      paint: (c2, x, y) => c2.backend.drawRect(x, y + 1, 12, 12, ctx.appearance.color),
    };
    return Panel({ x: 8, y: 8, anchor: 'tl' }, [
      Text({ value: 'NOVA64 METAVERSE  [' + ctx.status() + ']', color: ctx.theme.accent }),
      Text({ value: 'players (' + roster.length + ')', color: ctx.theme.dim }),
      List({ items: roster, color: ctx.theme.fg }),
      Row({}, [swatch, Button({ id: 'skin', label: 'SKIN', onTap: () => ctx.cycleColor() })]),
      Text({ value: 'move · look · C cam · CHAT/Enter to talk', color: ctx.theme.dim }),
    ]);
  },
};

let app = null;

export function init() {
  // Register the reference web backend fresh each load (Godot/XR register their
  // own elsewhere). createApp resolves it by id.
  registerBackend(createWebBackend());

  app = createApp({
    backend: 'web',
    world: { size: 80, pillars: 8, ringRadius: 14 },
    plugins: [controlsPlugin(), chatPlugin(), presencePlugin(), hudPlugin],
    name: 'Visitor-' + Math.floor(Math.random() * 1000),
    moveSpeed: 6,
  });
  app.start();
}

export function update(dt) {
  if (app) app.update(dt);
}

export function draw() {
  if (app) app.draw();
}
