// 00-boot.js — synthetic test cart for the G0 spike.
//
// At G0 the host evaluates carts in script (non-module) mode so the
// init/update/draw functions need to be assigned to globalThis instead of
// using ES module exports. G1 will switch to module evaluation and use the
// module namespace object for export resolution; at that point this cart
// will move to `export function init/update/draw`.
//
// This cart proves three things:
//   1. The QuickJS runtime is up and host globals (`print`, `engine`) are
//      installed.
//   2. `engine.call('host.getCapabilities', {})` round-trips through the
//      Nova64Host::call_bridge entry point.
//   3. The capabilities object matches the Nova64 adapter contract shape.

globalThis.init = function init() {
  const result = engine.call('engine.init', {});
  if (!result || !result.capabilities) {
    throw new Error('00-boot: engine.init returned no capabilities');
  }
  const c = result.capabilities;
  if (c.backend !== 'godot') {
    throw new Error('00-boot: expected backend "godot", got "' + c.backend + '"');
  }
  if (typeof c.contractVersion !== 'string' || c.contractVersion.length === 0) {
    throw new Error('00-boot: contractVersion missing or empty');
  }
  if (!Array.isArray(c.features)) {
    throw new Error('00-boot: features is not an array');
  }
  print(
    '[00-boot] OK backend=' + c.backend +
    ' contract=' + c.contractVersion +
    ' adapter=' + c.adapterVersion +
    ' features=' + c.features.length
  );
};

globalThis.update = function update(_dt) {
  // Frame tick — boot cart is intentionally idle.
};

globalThis.draw = function draw() {
  // No 2D overlay yet at G0.
};
