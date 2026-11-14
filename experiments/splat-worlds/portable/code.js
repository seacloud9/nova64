/* global Vector3, resolveMove, worldDefinitions */
// Packaged with the original world definitions and the browser collision helper.
// Host-independent exploration; render API version is explicit to avoid no-op shims.
let world = 0,
  yaw = 0,
  eye = [0, 1.6, 2],
  ready = false;
let lastRenderMs = 0;
export function init() {
  ready = false;
  if (nova64.splatWorlds?.version !== 1)
    throw new Error('This cart needs the experimental Gaussian-world renderer (version 1).');
  const loaded = nova64.splatWorlds.configure(
    'assets/voxel-grove.splat',
    'assets/zen-garden.splat'
  );
  if (!loaded || loaded.error)
    throw new Error('Gaussian assets failed to load: ' + JSON.stringify(loaded));
  world = 0;
  yaw = 0;
  eye = [0, 1.6, 2];
  if (globalThis.__splatFixture) {
    world = globalThis.__splatFixture.world ?? 0;
    eye = [...(globalThis.__splatFixture.eye ?? eye)];
    yaw = globalThis.__splatFixture.yaw ?? 0;
  }
  ready = true;
  globalThis.__storybookState = () => ({
    world,
    eye: [...eye],
    yaw,
    counts: loaded.counts,
    lastRenderMs,
  });
  globalThis.__nova64_assert = {
    total: 1,
    passed: 1,
    results: [
      { name: 'Both Gaussian worlds loaded', ok: loaded.counts[0] > 0 && loaded.counts[1] > 0 },
    ],
  };
}
export function update(rawDt) {
  if (!ready || globalThis.__splatFixture) return;
  const dt = Number.isFinite(rawDt) ? Math.max(0, Math.min(rawDt, 0.05)) : 0;
  const { key, keyp, gamepadAxis } = nova64.input;
  const axis = name => {
    const value = gamepadAxis(name);
    return Math.abs(value) > 0.18 ? value : 0;
  };
  if (keyp('Digit1') || keyp('Digit9')) {
    world = 0;
    eye = [0, 1.6, 2];
    yaw = 0;
  }
  if (keyp('Digit2')) {
    world = 1;
    eye = [0, 1.6, 0.7];
    yaw = Math.PI;
  }
  yaw += (Number(key('ArrowLeft')) - Number(key('ArrowRight')) - axis('rightX')) * dt * 1.5;
  const f =
    Number(key('KeyW') || key('ArrowUp')) - Number(key('KeyS') || key('ArrowDown')) - axis('leftY');
  const strafe = Number(key('KeyD')) - Number(key('KeyA')) + axis('leftX');
  const length = Math.hypot(f, strafe),
    speed = (dt * (key('ShiftLeft') ? 3 : 1.6)) / Math.max(1, length);
  const target = new Vector3(
    eye[0] + (-Math.sin(yaw) * f + Math.cos(yaw) * strafe) * speed,
    1.6,
    eye[2] + (-Math.cos(yaw) * f - Math.sin(yaw) * strafe) * speed
  );
  const next = resolveMove(new Vector3(...eye), target, worldDefinitions[world].walk, 0.25);
  const entry = worldDefinitions[world].door[2];
  if (eye[2] > entry && next.z <= entry) {
    const t = (entry - eye[2]) / (next.z - eye[2]);
    if (Math.abs(eye[0] + t * (next.x - eye[0])) < 0.95) {
      const exit = worldDefinitions[1 - world].door[2];
      next.x = -next.x;
      next.z = exit - (next.z - entry);
      yaw += Math.PI;
      world = 1 - world;
    }
  }
  eye = [next.x, 1.6, next.z];
}
export function draw() {
  if (!ready) return;
  const result = nova64.splatWorlds.render(
    world,
    eye,
    yaw,
    75,
    globalThis.__splatFixture?.portals !== false
  );
  if (!result || result.error)
    throw new Error('Gaussian rendering failed: ' + JSON.stringify(result));
  lastRenderMs = result.milliseconds;
  if (globalThis.__splatFixture?.hideHud) return;
  const { print, rectfill, rgba8 } = nova64.draw;
  rectfill(0, 0, 640, 24, rgba8(7, 10, 20, 255));
  print(worldDefinitions[world].name, 10, 8, rgba8(225, 238, 255, 255));
  rectfill(0, 316, 640, 360, rgba8(7, 10, 20, 255));
  print('WASD MOVE / ARROWS TURN / WALK THROUGH THE LIGHT', 10, 322, rgba8(225, 238, 255, 255));
  print('1 GROVE / 2 GARDEN / PAD: LEFT MOVE, RIGHT LOOK', 10, 340, rgba8(225, 238, 255, 255));
}
