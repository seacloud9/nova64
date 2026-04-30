// 00-boot.js — copy of tests/carts/00-boot.js for the Godot project to load.
//
// During the G0 spike the runtime can only resolve carts under res://. The
// canonical synthetic test cart lives at ../tests/carts/00-boot.js and a
// future scripts/sync-carts.{sh,ps1} step will copy it here automatically.
// Until that lands, keep this file in sync by hand.

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

globalThis.update = function update(_dt) {};
globalThis.draw = function draw() {};
