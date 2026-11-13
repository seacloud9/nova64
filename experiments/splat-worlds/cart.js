import { Matrix4, Vector3 } from 'three';
import { crossing, portalTransform } from './portal-math.js';
import { registerCartResetHook } from '/runtime/cart-reset.js';

const asset = '/experiments/gaussian-splatting/assets/';
const specs = [
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
  },
];
let host,
  camera,
  world = 0,
  time = 0,
  effect = 0,
  yaw = 0,
  unregister;
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
export async function init() {
  nova64.fx.disableRetroEffects();
  nova64.camera.setCameraFOV(65);
  camera = nova64.camera.getCamera();
  const scene = nova64.scene.getScene(),
    renderer = nova64.scene.getRenderer();
  const module = scene.isScene
    ? await import('./three-host.js')
    : await import('./babylon-host.js');
  host = await (module.createThreeHost ?? module.createBabylonHost)(scene, renderer, camera, specs);
  world = 0;
  time = 0;
  effect = 0;
  setPose([0, 1.6, 2], 0);
  unregister = registerCartResetHook('splat-worlds', () => {
    host.dispose();
    host = null;
    delete globalThis.__splatWorlds;
    unregister();
  });
  globalThis.__splatWorlds = {
    host,
    specs,
    get world() {
      return world;
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
function moveTo(next) {
  previous.copy(position());
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
  // Authored flat-floor proxy: eye height and bounded gallery footprint.
  next.y = 1.6;
  next.x = Math.max(-10, Math.min(10, next.x));
  next.z = Math.max(-10, Math.min(10, next.z));
  setPose(next.toArray(), yaw);
}
export function update(dt) {
  if (!host) return;
  time += dt;
  const { key, keyp } = nova64.input;
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
  print('NOVA64 / ' + specs[world].name, 10, 8, rgba8(224, 237, 255, 255));
  print('WASD MOVE / ARROWS TURN / WALK THROUGH THE LIGHT', 10, 322, rgba8(224, 237, 255, 255));
  print('0 ORIGINAL  1 REVEAL  2 DISSOLVE  3 PULSE  4 TINT', 10, 340, rgba8(224, 237, 255, 255));
}
