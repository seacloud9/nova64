// test-input-parity.mjs — Validates the Godot adapter's input shim
// behaves identically to runtime/input.js against the same scripted
// frame-by-frame stimulus.
//
// We can't load the real Godot Input singleton in Node, so we mock the
// bridge command surface (`engine.call('input.poll', {})`) and just
// verify that the shim's btn/btnp/key/keyp/isKeyDown/isKeyPressed/
// mouseX/mouseY/mouseDown/mousePressed/gamepad* helpers all derive
// from that one snapshot the same way runtime/input.js derives them
// from its own tracked state.
//
// Run: node nova64-godot/tests/conformance/test-input-parity.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runInContext, createContext } from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHIM_PATH = join(__dirname, '..', '..', 'godot_project', 'shim', 'nova64-compat.js');

// ---------------------------------------------------------------- harness --

let pollSnapshot = makeSnapshot({});

function makeSnapshot(o) {
  return {
    left: !!o.left, right: !!o.right, up: !!o.up, down: !!o.down,
    action: !!o.action, cancel: !!o.cancel,
    axisX: o.axisX || 0, axisY: o.axisY || 0,
    mouseX: o.mouseX || 0, mouseY: o.mouseY || 0, mouseDown: !!o.mouseDown,
    keys: Array.isArray(o.keys) ? o.keys.slice() : [],
    gpConnected: !!o.gpConnected,
    gpLeftX: o.gpLeftX || 0, gpLeftY: o.gpLeftY || 0,
    gpRightX: o.gpRightX || 0, gpRightY: o.gpRightY || 0,
    gpButtons: Array.isArray(o.gpButtons) ? o.gpButtons.slice() : [],
  };
}

const fakeEngine = {
  call(method, _payload) {
    if (method === 'input.poll') return makeSnapshot(pollSnapshot);
    if (method === 'host.getCapabilities') return { features: [] };
    if (method === 'engine.init') return { ok: true };
    return { ok: true };
  },
};

// Build a sandbox the shim IIFE can attach to.
const sandbox = {
  console,
  print(...args) { /* swallow shim's diagnostic prints */ },
  engine: fakeEngine,
  performance: { now: () => Date.now() },
  Date,
  Math,
  Object,
  Array,
  Uint8Array,
  Float32Array,
  Map,
  Set,
  Proxy,
  Symbol,
  JSON,
  String,
  Number,
  Boolean,
  Error,
  TypeError,
  RangeError,
  isNaN,
  isFinite,
  parseInt,
  parseFloat,
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

const ctx = createContext(sandbox);
const shimSrc = readFileSync(SHIM_PATH, 'utf8');
runInContext(shimSrc, ctx, { filename: 'nova64-compat.js' });

// Pull the cart-facing API the same way a cart would.
const { btn, btnp, key, keyp, isKeyDown, isKeyPressed,
        mouseX, mouseY, mouseDown, mousePressed,
        gamepadAxis, gamepadConnected,
        leftStickX, leftStickY, rightStickX, rightStickY } = ctx.nova64.input;

const stepFrame = ctx.__nova64_inputStep;

// ------------------------------------------------------------------ tests --

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('  ✗', msg); }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg}  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
}
function group(name, fn) { console.log('▸', name); fn(); }

// 1. btn / btnp KEYMAP parity (mirrors runtime/input.js KEYMAP)
group('btn/btnp KEYMAP indices', () => {
  pollSnapshot = makeSnapshot({ keys: ['ArrowLeft'] });
  stepFrame();
  eq(btn(0), true,  'btn(0) ↔ ArrowLeft');
  eq(btn(1), false, 'btn(1) ↔ ArrowRight off');
  eq(btnp(0), true, 'btnp(0) edge on first frame');

  // Second frame, same key still held — btnp must drop.
  stepFrame();
  eq(btnp(0), false, 'btnp(0) clears while held');
  eq(btn(0),  true,  'btn(0) still held');

  // Release then re-press — btnp fires again.
  pollSnapshot = makeSnapshot({});
  stepFrame();
  eq(btn(0),  false, 'btn(0) released');
  pollSnapshot = makeSnapshot({ keys: ['ArrowLeft'] });
  stepFrame();
  eq(btnp(0), true,  'btnp(0) re-fires after release');

  // KEYMAP coverage spot-check
  pollSnapshot = makeSnapshot({ keys: ['KeyZ', 'Space', 'Enter'] });
  stepFrame();
  eq(btn(4),  true,  'btn(4) ↔ KeyZ');
  eq(btn(13), true,  'btn(13) ↔ Space');
  eq(btn(12), true,  'btn(12) ↔ Enter');
});

// 2. key / keyp use raw web codes
group('key/keyp web codes', () => {
  pollSnapshot = makeSnapshot({ keys: ['KeyA'] });
  stepFrame();
  eq(key('KeyA'), true,  'key("KeyA")');
  eq(keyp('KeyA'), true, 'keyp("KeyA") on edge');
  stepFrame();
  eq(keyp('KeyA'), false, 'keyp clears on next frame');
});

// 3. isKeyDown / isKeyPressed accept single-char and " " just like web
group('isKeyDown/isKeyPressed normalization', () => {
  pollSnapshot = makeSnapshot({ keys: ['KeyA'] });
  stepFrame();
  eq(isKeyDown('a'), true,  'isKeyDown("a") → KeyA');
  eq(isKeyDown('A'), true,  'isKeyDown("A") → KeyA');

  pollSnapshot = makeSnapshot({});
  stepFrame();
  pollSnapshot = makeSnapshot({ keys: ['Space'] });
  stepFrame();
  eq(isKeyDown(' '), true,    'isKeyDown(" ") → Space');
  eq(isKeyPressed(' '), true, 'isKeyPressed(" ") edge');
  stepFrame();
  eq(isKeyPressed(' '), false, 'isKeyPressed(" ") clears next frame');
});

// 4. mouse parity
group('mouse', () => {
  pollSnapshot = makeSnapshot({ mouseX: 320, mouseY: 180, mouseDown: false });
  stepFrame();
  eq(mouseX(), 320, 'mouseX 320');
  eq(mouseY(), 180, 'mouseY 180');
  eq(mouseDown(), false, 'mouseDown false');
  eq(mousePressed(), false, 'mousePressed false');

  pollSnapshot = makeSnapshot({ mouseX: 320, mouseY: 180, mouseDown: true });
  stepFrame();
  eq(mouseDown(), true,    'mouseDown true');
  eq(mousePressed(), true, 'mousePressed edge');
  stepFrame();
  eq(mousePressed(), false, 'mousePressed clears');
});

// 5. gamepad axes + connected
group('gamepad', () => {
  pollSnapshot = makeSnapshot({ gpConnected: false });
  stepFrame();
  eq(gamepadConnected(), false, 'gamepad disconnected');
  eq(leftStickX(), 0, 'no axes when disconnected');

  pollSnapshot = makeSnapshot({
    gpConnected: true,
    gpLeftX: 0.7, gpLeftY: -0.3,
    gpRightX: 0.0, gpRightY: 0.5,
    gpButtons: [4],
  });
  stepFrame();
  eq(gamepadConnected(), true, 'gamepad connected');
  eq(leftStickX(),  0.7, 'leftStickX');
  eq(leftStickY(), -0.3, 'leftStickY');
  eq(rightStickY(), 0.5, 'rightStickY');
  eq(gamepadAxis('rightX'), 0.0, 'gamepadAxis("rightX")');
  eq(btn(4), true, 'btn(4) lit by gamepad button (KEYMAP[4]=KeyZ)');
});

// 6. btn(i) keyboard ∪ gamepad
group('btn keyboard+gamepad union', () => {
  pollSnapshot = makeSnapshot({ keys: ['KeyZ'], gpConnected: true, gpButtons: [] });
  stepFrame();
  eq(btn(4), true, 'btn(4) via keyboard');

  pollSnapshot = makeSnapshot({ keys: [], gpConnected: true, gpButtons: [4] });
  stepFrame();
  eq(btn(4), true, 'btn(4) via gamepad');

  pollSnapshot = makeSnapshot({ keys: [], gpConnected: false, gpButtons: [] });
  stepFrame();
  eq(btn(4), false, 'btn(4) off');
});

// --------------------------------------------------------------- summary ----
console.log(`\nInput parity: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
