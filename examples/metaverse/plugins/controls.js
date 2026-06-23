// controls.js — movement + look input, desktop and mobile.
//
// Desktop: WASD/arrows move, Q/E or arrows turn, mouse (pointer-lock) looks,
//          C toggles camera.
// Mobile:  left-half drag = virtual joystick (move), right-half drag = look,
//          plus a tappable Camera button. Reads nova64.input.touches() so move +
//          look work at once. Touches already consumed by UI (buttons) are
//          skipped so a button hold never doubles as a joystick.
//
// Writes movement intents through the app context (ctx.setMove/addYaw/addPitch/
// toggleCamera) — never touches the backend or net directly.

import { Panel, Button } from '../core/ui.js';

const JOY_RADIUS = 48;
const LOOK_SENS = 0.008;
const TURN_KEY = 2.2;

export function controlsPlugin() {
  let prevC = false;
  let joyId = null;
  let joyOrigin = { x: 0, y: 0 };
  let joyCur = { x: 0, y: 0 };
  let lookId = null;
  let lookLast = { x: 0, y: 0 };
  let hasTouched = false;
  const pendingLook = { yaw: 0, pitch: 0 };
  let mouseWired = false;

  function wireMouseLook() {
    if (mouseWired || typeof document === 'undefined') return;
    mouseWired = true;
    document.addEventListener('mousedown', () => {
      if (!document.pointerLockElement && document.body && document.body.requestPointerLock) {
        document.body.requestPointerLock().catch(() => {});
      }
    });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        pendingLook.yaw -= e.movementX * 0.0025;
        pendingLook.pitch -= e.movementY * 0.0022;
      }
    });
  }

  return {
    id: 'controls',

    init() {
      wireMouseLook();
    },

    update(dt, ctx) {
      // Camera toggle (edge).
      const cNow = ctx.input.key('KeyC');
      if (cNow && !prevC) ctx.toggleCamera();
      prevC = cNow;

      // Keyboard turn + move.
      if (ctx.input.key('KeyQ', 'ArrowLeft')) ctx.addYaw(TURN_KEY * dt);
      if (ctx.input.key('KeyE', 'ArrowRight')) ctx.addYaw(-TURN_KEY * dt);
      let forward = 0;
      let strafe = 0;
      if (ctx.input.key('KeyW', 'ArrowUp')) forward += 1;
      if (ctx.input.key('KeyS', 'ArrowDown')) forward -= 1;
      if (ctx.input.key('KeyD')) strafe -= 1;
      if (ctx.input.key('KeyA')) strafe += 1;

      // Apply accumulated mouse-look (desktop pointer lock).
      if (pendingLook.yaw || pendingLook.pitch) {
        ctx.addYaw(pendingLook.yaw);
        ctx.addPitch(pendingLook.pitch);
        pendingLook.yaw = 0;
        pendingLook.pitch = 0;
      }

      // Touch: partition into joystick (left) + look (right), skipping UI.
      const touches = ctx.input.touches().filter(t => !ctx.input.isConsumed(t.id));
      if (touches.length > 0) hasTouched = true;
      const ids = new Set(touches.map(t => t.id));
      if (joyId != null && !ids.has(joyId)) joyId = null;
      if (lookId != null && !ids.has(lookId)) lookId = null;

      for (const t of touches) {
        if (t.id === joyId || t.id === lookId) continue;
        if (t.x < 320 && joyId == null) {
          joyId = t.id;
          joyOrigin = { x: t.x, y: t.y };
          joyCur = { x: t.x, y: t.y };
        } else if (t.x >= 320 && lookId == null) {
          lookId = t.id;
          lookLast = { x: t.x, y: t.y };
        }
      }

      if (joyId != null) {
        const t = touches.find(p => p.id === joyId);
        if (t) {
          joyCur = { x: t.x, y: t.y };
          let vx = (t.x - joyOrigin.x) / JOY_RADIUS;
          let vy = (t.y - joyOrigin.y) / JOY_RADIUS;
          const mag = Math.hypot(vx, vy);
          if (mag > 1) {
            vx /= mag;
            vy /= mag;
          }
          forward = -vy; // up = forward
          strafe = -vx; // right drag = strafe right
        }
      }
      if (lookId != null) {
        const t = touches.find(p => p.id === lookId);
        if (t) {
          ctx.addYaw(-(t.x - lookLast.x) * LOOK_SENS);
          ctx.addPitch(-(t.y - lookLast.y) * LOOK_SENS);
          lookLast = { x: t.x, y: t.y };
        }
      }

      ctx.setMove(forward, strafe);
    },

    renderUI(ctx) {
      const nodes = [];
      // Camera toggle button (bottom-left).
      nodes.push(
        Panel({ x: 8, y: 8, anchor: 'bl', bg: 0x00000000 }, [
          Button({
            id: 'cam',
            label: ctx.local.mode === 'first' ? 'CAM:1st' : 'CAM:3rd',
            onTap: () => ctx.toggleCamera(),
          }),
        ])
      );
      // Mobile joystick visual (only once touch has been used).
      if (hasTouched) {
        const base = joyId != null ? joyOrigin : { x: 70, y: 290 };
        const knob = joyId != null ? joyCur : base;
        nodes.push({
          measure: () => ({ w: 0, h: 0 }),
          paint: (c2, _x, _y, _hits) => {
            c2.backend.drawCircle(base.x, base.y, JOY_RADIUS, 0x44ffffff, false);
            c2.backend.drawCircle(knob.x, knob.y, 16, 0x99ffffff, true);
          },
        });
      }
      return nodes;
    },
  };
}
