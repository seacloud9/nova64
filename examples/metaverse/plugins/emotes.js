// emotes.js — quick social reactions over the chat relay.
//
// A small row of tappable buttons; tapping one broadcasts an `emote` event and
// pops a short-lived bubble above your avatar. Inbound emotes pop above the
// sender. Bubbles are pinned to the world via backend.worldToScreen (same seam
// as presence name tags); the buttons are normal UI primitives (so they hit-test
// on desktop + mobile). Pure context/backend — no nova64/net access — so it runs
// on any backend. Another one-module demonstration of the plugin seam.

import { Panel, Row, Button } from '../core/ui.js';

const EMOTES = ['hi', 'gg', 'lol', 'wow'];
const BUBBLE_LIFE = 2.5; // seconds
const BUBBLE_Y = 2.7; // world height, above the name tag (~2.0)
const LOCAL = '__me__';

export function emotesPlugin(opts = {}) {
  const set = opts.emotes || EMOTES;
  const bubbles = new Map(); // id -> { text, t }

  function pop(id, text) {
    bubbles.set(id, { text: String(text).slice(0, 12), t: 0 });
  }

  function posFor(id, ctx) {
    if (id === LOCAL) return { x: ctx.local.x, z: ctx.local.z };
    const o = ctx.others.get(id);
    return o ? { x: o.x, z: o.z } : null;
  }

  return {
    id: 'emotes',

    onNetMessage(evt) {
      if (evt && evt.type === 'emote' && evt.msg && typeof evt.msg.text === 'string') {
        pop(evt.from, evt.msg.text);
      }
    },

    update(dt) {
      for (const [id, bub] of bubbles) {
        bub.t += dt;
        if (bub.t >= BUBBLE_LIFE) bubbles.delete(id);
      }
    },

    renderUI(ctx) {
      const theme = ctx.theme;
      // Button row, tucked top-right under the camera toggle.
      const buttons = Panel({ x: 8, y: 44, anchor: 'tr', bg: 0x00000000 }, [
        Row(
          {},
          set.map(e =>
            Button({
              id: 'emote-' + e,
              label: e,
              onTap: () => {
                ctx.sendRelay('emote', { text: e });
                pop(LOCAL, e); // local echo (relay excludes the sender)
              },
            })
          )
        ),
      ]);

      // World-pinned bubbles over each emoting avatar.
      const bubbleLayer = {
        measure: () => ({ w: 0, h: 0 }),
        paint: c2 => {
          const b = c2.backend;
          if (!b.worldToScreen) return;
          for (const [id, bub] of bubbles) {
            const wp = posFor(id, ctx);
            if (!wp) continue;
            const p = b.worldToScreen(wp.x, BUBBLE_Y, wp.z);
            if (!p.visible) continue;
            const label = bub.text;
            const w = b.measureText ? b.measureText(label) : label.length * 6;
            const x = Math.round(p.x - w / 2);
            const y = Math.round(p.y);
            b.drawRect(x - 4, y - 2, w + 8, theme.lineH + 4, 0xdd123044);
            b.drawText(label, x, y, theme.accent);
          }
        },
      };

      return [buttons, bubbleLayer];
    },
  };
}
