import { Matrix4, Vector3 } from 'three';
import { crossing, portalTransform } from './portal-math.js';
import { showcases, showcaseFrame } from './showcases.js';
import { storybookWorlds } from './storybook.js';
import { doorBlockers, resolveMove } from './collision.js';
import { registerCartResetHook } from '/runtime/cart-reset.js';

const asset = '/experiments/gaussian-splatting/assets/';
const capturedSpecs = [
  {
    name: 'CAPTURED APARTMENT',
    url: asset + 'apartment.sog',
    scale: 1,
    offset: [5, 0, -4.5],
    door: new Matrix4().makeTranslation(0, 1.6, -2),
    marker: [-1, 1, -4],
    background: 0x171c29,
    accent: 0x50ddff,
    floor: 0x292c34,
    // Walkable XZ footprint and solid furniture boxes [minX, minZ, maxX, maxZ].
    walk: { bounds: [-10, -10, 10, 10], blockers: [] },
  },
  {
    name: 'THE RELIC GALLERY',
    url: asset + 'skull.splat',
    scale: 1,
    offset: [0, 1.5, 5],
    door: new Matrix4().makeTranslation(0, 1.6, 0),
    marker: [1, 1.2, 3],
    background: 0x12112b,
    accent: 0xffbd74,
    floor: 0x242337,
    walk: { bounds: [-10, -10, 10, 10], blockers: [] },
  },
];
const params = new URLSearchParams(location.search);
const storybook = params.get('worldSet') === 'storybook';
const startWorld = storybook && params.get('startWorld') === 'zen-garden' ? 1 : 0;
const specs = storybook
  ? storybookWorlds.map(spec => ({
      ...spec,
      url: asset + spec.file,
      scale: 1,
      offset: [0, 0, 0],
      door: new Matrix4().makeTranslation(...spec.door),
      marker: [0, -10, 0],
      walk: { bounds: [...spec.walk.bounds], blockers: spec.walk.blockers.map(box => [...box]) },
    }))
  : capturedSpecs;
for (const spec of specs) spec.posts = doorBlockers(spec.door);
const isRect = r =>
  Array.isArray(r) && r.length === 4 && r.every(Number.isFinite) && r[0] < r[2] && r[1] < r[3];
// Scan-derived furniture/wall boxes from scripts/splat-worlds-nav.mjs. Optional:
// without it the worlds still work with bounds + door posts only.
async function loadNav() {
  if (storybook) {
    for (let i = 0; i < specs.length; i++)
      specs[i].walk.blockers = [...storybookWorlds[i].walk.blockers, ...specs[i].posts];
    return;
  }
  let nav = null;
  try {
    const res = await fetch(new URL('./nav.json', import.meta.url));
    if (res.ok) nav = await res.json();
  } catch {
    nav = null;
  }
  specs.forEach((spec, i) => {
    const blockers = nav?.worlds?.[i]?.blockers;
    const valid = Array.isArray(blockers) && blockers.every(isRect);
    if (!valid)
      console.warn('splat-worlds: nav.json missing/invalid for', spec.name, '- door posts only');
    spec.walk.blockers = [...(valid ? blockers : []), ...spec.posts];
  });
}
const MAX_DT = 1 / 20,
  EYE = 1.6,
  RADIUS = 0.25;
let host,
  camera,
  world = 0,
  time = 0,
  effect = 0,
  yaw = 0,
  unregister,
  showcase = null,
  showcaseTime = 0;
const velocity = new Vector3(),
  previous = new Vector3();
function setPose(position, angle) {
  nova64.camera.setCameraPosition(...position);
  yaw = angle;
  nova64.camera.setCameraTarget(
    position[0] - Math.sin(yaw),
    position[1],
    position[2] - Math.cos(yaw)
  );
}
async function preflight() {
  const missing = [];
  await Promise.all(
    specs.map(async spec => {
      const res = await fetch(spec.url, { method: 'HEAD' }).catch(() => null);
      const type = res?.headers.get('content-type') ?? '';
      // Vite answers unknown paths with index.html, so a 200 text/html is also missing.
      if (!res?.ok || type.includes('text/html')) missing.push(spec.url);
    })
  );
  if (missing.length)
    throw new Error('Splat assets missing: ' + missing.join(', ') + ' (run `pnpm splat:assets`)');
}
export async function init() {
  // A re-init without a reset (hot reload) must not leak the previous worlds.
  if (host) {
    unregister?.();
    host.dispose();
    host = null;
  }
  await Promise.all([preflight(), loadNav()]);
  nova64.fx.disableRetroEffects();
  nova64.camera.setCameraFOV(storybook ? 75 : 65);
  camera = nova64.camera.getCamera();
  const scene = nova64.scene.getScene(),
    renderer = nova64.scene.getRenderer();
  const module = scene.isScene
    ? await import('./three-host.js')
    : await import('./babylon-host.js');
  host = await (module.createThreeHost ?? module.createBabylonHost)(scene, renderer, camera, specs);
  world = startWorld;
  host.setWorld(world);
  time = 0;
  effect = 0;
  const requested = new URLSearchParams(location.search).get('splatDemo');
  showcase = !storybook && Object.hasOwn(showcases, requested) ? requested : null;
  showcaseTime = 0;
  setPose(startWorld ? [0, 1.6, 0.7] : [0, 1.6, 2], startWorld ? Math.PI : 0);
  unregister = registerCartResetHook('splat-worlds', () => {
    host?.dispose();
    host = null;
    delete globalThis.__splatWorlds;
    unregister();
    unregister = null;
  });
  globalThis.__splatWorlds = {
    host,
    specs,
    get world() {
      return world;
    },
    get showcase() {
      return showcase;
    },
    get effect() {
      return effect;
    },
    pose: setPose,
    setEffect(value) {
      effect = value;
    },
    setTime(value) {
      time = value;
    },
    move(x, y, z) {
      moveTo(new Vector3(x, y, z));
    },
    get position() {
      return position().toArray();
    },
  };
}
function position() {
  return new Vector3(camera.position.x, camera.position.y, camera.position.z);
}
function moveTo(target) {
  previous.copy(position());
  // Collide first in the current world; then the resolved path may cross its door.
  const next = resolveMove(previous, target.setY(EYE), specs[world].walk, RADIUS);
  if (crossing(previous, next, specs[world].door, 2.2, 3.2)) {
    const transform = portalTransform(specs[world].door, specs[1 - world].door);
    next.applyMatrix4(transform);
    const speed = velocity.length();
    velocity.transformDirection(transform).multiplyScalar(speed);
    const direction = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).transformDirection(transform);
    yaw = Math.atan2(-direction.x, -direction.z);
    world = 1 - world;
    host.setWorld(world);
  }
  next.y = EYE;
  setPose(next.toArray(), yaw);
}
export function update(rawDt) {
  if (!host) return;
  // Background tabs and loading hitches deliver huge dt; never move that far at once.
  const dt = Number.isFinite(rawDt) ? Math.min(Math.max(rawDt, 0), MAX_DT) : 0;
  time += dt;
  const { key, keyp } = nova64.input;
  for (const [keyCode, name] of [
    ['Digit6', 'apartment'],
    ['Digit7', 'relic'],
    ['Digit8', 'portal'],
  ]) {
    if (!storybook && keyp(keyCode)) {
      showcase = name;
      showcaseTime = 0;
    }
  }
  for (const [code, direction] of [
    ['BracketLeft', -1],
    ['BracketRight', 1],
  ]) {
    if (!storybook && keyp(code)) {
      const names = Object.keys(showcases);
      const index = names.indexOf(showcase);
      showcase = names[(index + direction + names.length) % names.length];
      showcaseTime = 0;
    }
  }
  // Hand control back at a known walkable pose, outside any scan collision boxes.
  if (keyp('Digit9')) {
    showcase = null;
    world = 0;
    host.setWorld(world);
    setPose([0, EYE, 2], 0);
    effect = 0;
  }
  for (const record of host.worlds) {
    if (record.marker.setEnabled) record.marker.setEnabled(!showcase && !storybook);
    else record.marker.visible = !showcase && !storybook;
  }
  if (showcase) {
    const frame = showcaseFrame(showcase, showcaseTime);
    world = frame.world;
    host.setWorld(world);
    setPose(frame.position, frame.yaw);
    effect = frame.effect;
    host.render(frame.time, effect);
    // Babylon requires an initial sort for a stationary camera before its first
    // draw. Hold this pose until ready; otherwise an orbit can starve that sort.
    const splat = host.worlds[world].splat;
    if (typeof splat.isReady !== 'function' || splat.isReady()) showcaseTime += dt;
    return;
  }
  if (keyp('Digit0')) effect = 0;
  for (let i = 1; i <= 4; i++) if (keyp('Digit' + i)) effect = i;
  if (key('ArrowLeft')) yaw += dt * 1.5;
  if (key('ArrowRight')) yaw -= dt * 1.5;
  const forward = Number(key('KeyW')) - Number(key('KeyS'));
  const strafe = Number(key('KeyD')) - Number(key('KeyA'));
  velocity.set(
    -Math.sin(yaw) * forward + Math.cos(yaw) * strafe,
    0,
    -Math.cos(yaw) * forward - Math.sin(yaw) * strafe
  );
  if (velocity.lengthSq() > 0)
    velocity.normalize().multiplyScalar(dt * (key('ShiftLeft') ? 3 : 1.6));
  moveTo(position().add(velocity));
  host.render(time, effect);
}
export function draw() {
  if (!host) return;
  const { print, rectfill, rgba8 } = nova64.draw;
  rectfill(0, 0, 640, 25, rgba8(7, 10, 20, 235));
  print(
    showcase ? showcases[showcase].title : 'NOVA64 / ' + specs[world].name,
    10,
    8,
    rgba8(224, 237, 255, 255)
  );
  if (showcase) {
    rectfill(0, 300, 640, 360, rgba8(7, 10, 20, 235));
    print(showcases[showcase].caption, 10, 307, rgba8(224, 237, 255, 255));
    print(
      '[ / ] ALL ' + Object.keys(showcases).length + ' DEMOS / 6-8 CLASSICS / 9 EXPLORE',
      10,
      340,
      rgba8(130, 220, 255, 255)
    );
    return;
  }
  print('WASD MOVE / ARROWS TURN / WALK THROUGH THE LIGHT', 10, 322, rgba8(224, 237, 255, 255));
  print(
    storybook
      ? '0-4 EFFECTS / 9 RETURN TO GROVE / ORIGINAL GAUSSIAN WORLDS'
      : '0-4 EFFECTS / [ / ] GUIDED DEMOS / 9 EXPLORE',
    10,
    340,
    rgba8(224, 237, 255, 255)
  );
}
