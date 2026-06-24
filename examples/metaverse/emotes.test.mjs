// Focused test for the emotes plugin: tapping a button broadcasts an emote and
// pops a local bubble; inbound emotes pop above the sender and age out. Driven
// with a mock backend that records draw ops. Run: node emotes.test.mjs

import { emotesPlugin } from './plugins/emotes.js';

const assert = (c, m) => {
  if (!c) {
    console.error('FAIL emotes:', m);
    process.exit(1);
  }
};

const texts = [];
const backend = {
  viewport: () => ({ w: 640, h: 360 }),
  worldToScreen: () => ({ x: 320, y: 180, visible: true, dist: 5 }),
  drawRect: () => {},
  drawText: t => texts.push(String(t)),
  measureText: s => String(s).length * 6,
};
const theme = { dim: 0xffaab0cc, accent: 0xff66ffcc, lineH: 12 };

const sent = [];
const others = new Map([['p1', { x: 5, z: 5, yaw: 0, name: 'Bob' }]]);
const ctx = {
  theme,
  others,
  local: { x: 0, z: 0, yaw: 0, mode: 'third' },
  sendRelay: (type, msg) => sent.push({ type, msg }),
};

const plug = emotesPlugin();

function render() {
  texts.length = 0;
  const nodes = plug.renderUI(ctx);
  const hits = [];
  nodes.forEach(n => n.paint({ backend, theme }, 0, 0, hits));
  return hits;
}
// Each emote is also a button label, so count occurrences: a bubble adds one on
// top of the button's own label draw.
const count = s => texts.filter(t => t === s).length;

// Inbound emote from a peer → bubble drawn over them (button label + bubble = 2).
plug.onNetMessage({ from: 'p1', type: 'emote', msg: { text: 'gg' } });
render();
assert(count('gg') >= 2, 'inbound emote bubble rendered over sender');

// It ages out after its lifetime (back to just the button label).
plug.update(3.0);
render();
assert(count('gg') === 1, 'emote bubble expires (only the button label remains)');

// Tapping an emote button broadcasts it and pops a local bubble.
const before = count('hi'); // just the button label
const hits = render();
const hi = hits.find(h => h.id === 'emote-hi');
assert(hi && typeof hi.onTap === 'function', 'emote button is hit-testable');
assert(before === 1, 'no local bubble before tapping');
hi.onTap();
assert(
  sent.some(s => s.type === 'emote' && s.msg.text === 'hi'),
  'tapping an emote broadcasts it over the relay'
);
render();
assert(count('hi') === 2, 'local emote bubble pops on tap (button label + bubble)');

console.log('PASS emotes: tap broadcasts + local bubble, inbound bubble over sender, ages out');
process.exit(0);
