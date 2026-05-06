// wad-demo — Bundled FreeDoom WAD explorer for the Godot adapter.
// Loads the repository's default freedoom1.wad, lets the player pick a map,
// and renders WAD wall/floor textures through the same cart-facing helpers
// used by the Three.js version.

const { print: novaPrint, printCentered, rectfill, rgba8 } = nova64.draw;
const { createCube, createPlane, destroyMesh, setPosition, setRotation, setScale } = nova64.scene;
const { setCameraFOV, setCameraPosition, setCameraTarget } = nova64.camera;
const { setAmbientLight, setFog, clearFog, setLightDirection } = nova64.light;
const { key, keyp, isKeyDown } = nova64.input;
const { WADLoader, WADTextureManager, convertWADMap, setWallUVs } = nova64.wad;

const WAD_PATH = 'res://assets/freedoom-0.13.0/freedoom-0.13.0/freedoom1.wad';
const SCALE = 1 / 20;

let wadLoader = null;
let texMgr = null;
let mapNames = [];
let selectedMap = 0;
let currentMap = null;
let state = 'loading';
let loadError = null;

let walls = [];
let thingSprites = [];
let collisionSegs = [];
let floorMesh = 0;
let ceilingMesh = 0;
let player = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0 };
let totalWalls = 0;
let texturedWalls = 0;
let texturedFloor = 0;
let fogOn = true;
let fogToggleCD = 0;

function logError(msg) {
  loadError = msg;
  state = 'error';
  print('[wad-demo] ' + msg);
}

export function init() {
  setAmbientLight(0xffffff, 0.65);
  setLightDirection(-0.4, -1, -0.5);
  setFog(0x111122, 14, 105);
  setCameraFOV(75);

  print('[wad-demo] loading default WAD from ' + WAD_PATH);

  try {
    const r = engine.call('wad.load', { path: WAD_PATH });
    if (!r || r.error) {
      logError('wad.load failed: ' + (r && r.error ? r.error : 'unknown'));
      return;
    }
    wadLoader = new WADLoader().load({ handle: r.handle, directory: r.directory });
    mapNames = wadLoader.getMapNames();
    if (mapNames.length === 0) {
      logError('No maps found in WAD');
      return;
    }
    texMgr = new WADTextureManager(wadLoader);
    texMgr.init();
    state = 'menu';
    print('[wad-demo] ready: ' + mapNames.length + ' maps');
  } catch (err) {
    logError('Exception while loading WAD: ' + (err && err.message ? err.message : err));
  }
}

function clearLevel() {
  for (const w of walls) {
    if (w.handle) destroyMesh(w.handle);
  }
  walls = [];
  for (const s of thingSprites) {
    if (s.handle) destroyMesh(s.handle);
  }
  thingSprites = [];
  collisionSegs = [];
  if (floorMesh) { destroyMesh(floorMesh); floorMesh = 0; }
  if (ceilingMesh) { destroyMesh(ceilingMesh); ceilingMesh = 0; }
  totalWalls = 0;
  texturedWalls = 0;
  texturedFloor = 0;
}

function buildTexturedWall(w, bri, fallbackColor) {
  if (!texMgr || !w.texName) return 0;
  const tex = texMgr.getWallTexture(w.texName);
  if (!tex) return 0;

  const h = createCube(1, 0xffffff, [w.x, w.y, w.z], {
    material: 'standard',
    roughness: 0.92,
    map: tex,
    color: { r: bri, g: bri, b: bri, a: 1 },
  });
  setScale(h, w.len, w.h, 0.42);
  setRotation(h, 0, w.ang, 0);

  const texDef = texMgr.getTextureDef(w.texName);
  if (texDef) {
    setWallUVs(h, w.len / SCALE, w.h / SCALE, texDef.width, texDef.height, w.xoff || 0, w.yoff || 0);
  }
  texturedWalls++;
  return h;
}

function buildThingSprite(t, kind) {
  if (!texMgr || !t || !t.doomType) return 0;
  const sprite = texMgr.getSpriteTexture(t.doomType);
  if (!sprite || !sprite.texture) return 0;

  const worldH = Math.max(0.8, sprite.height * SCALE);
  const worldW = Math.max(0.4, sprite.width * SCALE);
  const y = (t.floorH || 0) + worldH * 0.5;
  const h = createPlane(worldW, worldH, 0xffffff, [t.x, y, t.z], {
    material: 'standard',
    map: sprite.texture,
    transparent: true,
    opacity: 1,
    unshaded: true,
    doubleSided: true,
    roughness: 1,
  });
  setRotation(h, Math.PI / 2, player.yaw + Math.PI, 0);
  thingSprites.push({
    handle: h,
    x: t.x,
    y,
    z: t.z,
    kind,
    type: t.type,
    doomType: t.doomType,
  });
  return h;
}

function updateThingSprites() {
  for (const s of thingSprites) {
    setRotation(s.handle, Math.PI / 2, player.yaw + Math.PI, 0);
  }
}

function buildLevel(mapName) {
  clearLevel();

  const mapData = wadLoader.getMap(mapName);
  if (!mapData) {
    logError('getMap("' + mapName + '") returned null');
    return;
  }
  const converted = convertWADMap(mapData);
  if (!converted) {
    logError('convertWADMap returned null');
    return;
  }

  currentMap = mapName;
  state = 'playing';

  for (let i = 0; i < converted.walls.length; i++) {
    const w = converted.walls[i];
    const bri = Math.max(0.32, w.light || 0.55);
    const v = Math.floor(bri * 190 + 35);
    const fallbackColor = w.step ? 0xffaa44 : ((v << 16) | (v << 8) | v);
    let h = buildTexturedWall(w, bri, fallbackColor);

    if (!h) {
      h = createCube(1, fallbackColor, [w.x, w.y, w.z], {
        material: 'standard',
        roughness: 0.86,
      });
      setScale(h, w.len, w.h, 0.42);
      setRotation(h, 0, w.ang, 0);
    }

    walls.push({ handle: h, x: w.x, z: w.z, r: 0.4 });
    totalWalls++;
  }

  for (const seg of converted.colSegs) {
    collisionSegs.push({ x: seg.x, z: seg.z, r: seg.r });
  }

  for (const enemy of converted.enemies || []) {
    buildThingSprite(enemy, 'enemy');
  }
  for (const item of converted.items || []) {
    buildThingSprite(item, 'item');
  }

  floorMesh = createPlane(420, 420, 0x222233, [0, 0, 0], { material: 'standard', roughness: 1 });
  setRotation(floorMesh, -Math.PI / 2, 0, 0);
  ceilingMesh = createPlane(420, 420, 0x0a0a14, [0, 12, 0], { material: 'standard', roughness: 1 });
  setRotation(ceilingMesh, Math.PI / 2, 0, 0);

  if (texMgr && converted.sectors) {
    const floorFlat = mostCommonFlat(converted.sectors, 'floorFlat');
    const ceilFlat = mostCommonFlat(converted.sectors, 'ceilFlat');
    applyFlatTexture(floorMesh, floorFlat, 420);
    applyFlatTexture(ceilingMesh, ceilFlat, 420);
  }

  const start = converted.playerStart || { x: 0, z: 0, angle: 0, floorH: 0 };
  player.x = start.x;
  player.z = start.z;
  player.y = (start.floorH || 0) + 1.65;
  player.yaw = start.angle || 0;
  player.pitch = 0;

  print('[wad-demo] built ' + mapName
    + ' walls=' + totalWalls
    + ' textured=' + texturedWalls
    + ' sprites=' + thingSprites.length
    + ' floorTex=' + texturedFloor);
  syncCamera();
  updateThingSprites();
}

function mostCommonFlat(sectors, keyName) {
  const counts = {};
  for (const s of sectors) {
    const name = s[keyName];
    if (!name || name === '-' || name === 'F_SKY1') continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  let best = null;
  let bestCount = 0;
  for (const name in counts) {
    if (counts[name] > bestCount) {
      best = name;
      bestCount = counts[name];
    }
  }
  return best;
}

function applyFlatTexture(mesh, flatName, size) {
  if (!flatName) return;
  const tex = texMgr.getFlatTexture(flatName);
  if (!tex) return;
  const floorTex = engine.cloneTexture(tex);
  engine.setTextureRepeat(floorTex, size * (20 / 64), size * (20 / 64));
  const mat = engine.createMaterial('phong', {
    map: floorTex,
    color: 0xffffff,
    roughness: 1,
    side: 'double',
  });
  engine.setMeshMaterial(mesh, mat);
  texturedFloor++;
}

function syncCamera() {
  setCameraPosition(player.x, player.y, player.z);
  const cosP = Math.cos(player.pitch);
  const tx = player.x + Math.sin(player.yaw) * cosP * 4;
  const tz = player.z + Math.cos(player.yaw) * cosP * 4;
  const ty = player.y + Math.sin(player.pitch) * 4;
  setCameraTarget(tx, ty, tz);
}

function isDown(...codes) {
  for (const code of codes) {
    if (key(code) || isKeyDown(code)) return true;
  }
  return false;
}

export function update(dt) {
  if (!dt) dt = 1 / 60;

  if (state === 'menu') {
    const r = 34;
    setCameraPosition(Math.sin(Date.now() * 0.00025) * r, 24, Math.cos(Date.now() * 0.00025) * r);
    setCameraTarget(0, 1, 0);
    if (keyp('ArrowUp') || keyp('KeyW')) selectedMap = Math.max(0, selectedMap - 1);
    if (keyp('ArrowDown') || keyp('KeyS')) selectedMap = Math.min(mapNames.length - 1, selectedMap + 1);
    if (keyp('Enter') || keyp('Space')) buildLevel(mapNames[selectedMap]);
    return;
  }

  if (state !== 'playing') return;

  const turnSpeed = 2.4;
  if (isDown('KeyQ', 'q', 'Q')) player.yaw += turnSpeed * dt;
  if (isDown('KeyE', 'e', 'E')) player.yaw -= turnSpeed * dt;

  const moveSpeed = isDown('ShiftLeft', 'ShiftRight') ? 10 : 6;
  let mx = 0, mz = 0;
  if (isDown('KeyW', 'ArrowUp')) mz += 1;
  if (isDown('KeyS', 'ArrowDown')) mz -= 1;
  if (isDown('KeyA', 'ArrowLeft')) mx -= 1;
  if (isDown('KeyD', 'ArrowRight')) mx += 1;

  const sinY = Math.sin(player.yaw);
  const cosY = Math.cos(player.yaw);
  player.x += (sinY * mz + cosY * mx) * moveSpeed * dt;
  player.z += (cosY * mz - sinY * mx) * moveSpeed * dt;
  if (isDown('Space')) player.y += moveSpeed * dt;
  if (isDown('ControlLeft', 'ControlRight')) player.y -= moveSpeed * dt;

  if (keyp('Escape')) {
    state = 'menu';
    currentMap = null;
    clearLevel();
    return;
  }

  fogToggleCD = Math.max(0, fogToggleCD - dt);
  if (keyp('KeyF') && fogToggleCD <= 0) {
    fogToggleCD = 0.4;
    fogOn = !fogOn;
    if (fogOn) setFog(0x111122, 14, 105);
    else clearFog();
  }

  syncCamera();
}

export function draw() {
  if (state === 'error') {
    rectfill(0, 0, 640, 48, rgba8(0, 0, 0, 220));
    novaPrint('WAD ERROR: ' + loadError, 8, 8, 0xff5555);
    novaPrint('Expected file: ' + WAD_PATH, 8, 22, 0xffaa66);
    return;
  }

  if (state === 'loading') {
    rectfill(0, 0, 640, 36, rgba8(0, 0, 0, 210));
    novaPrint('Loading FreeDoom WAD...', 8, 8, 0xffffff);
    return;
  }

  if (state === 'menu') {
    rectfill(0, 0, 640, 360, rgba8(0, 0, 0, 130));
    printCentered('FREEDOOM WAD MAP SELECT', 320, 42, 0xffee88);
    const start = Math.max(0, Math.min(selectedMap - 5, Math.max(0, mapNames.length - 11)));
    for (let i = 0; i < 11 && start + i < mapNames.length; i++) {
      const idx = start + i;
      const y = 78 + i * 18;
      const selected = idx === selectedMap;
      if (selected) rectfill(220, y - 3, 420, y + 12, rgba8(255, 170, 40, 170));
      printCentered((selected ? '> ' : '  ') + mapNames[idx] + (selected ? ' <' : '  '), 320, y, selected ? 0x111111 : 0xffffff);
    }
    printCentered('UP/DOWN SELECT   ENTER LOAD   ESC RETURNS HERE', 320, 316, 0x99ffcc);
    printCentered('Default WAD: freedoom1.wad  Maps: ' + mapNames.length, 320, 336, 0xaaaaaa);
    return;
  }

  rectfill(0, 0, 640, 24, rgba8(0, 0, 0, 190));
  novaPrint('MAP ' + currentMap
    + '  WALLS ' + totalWalls
    + '  SPR ' + thingSprites.length
    + '  TEX ' + texturedWalls + '/' + totalWalls
    + '  FLOOR ' + texturedFloor
    + '  POS ' + player.x.toFixed(1) + ',' + player.z.toFixed(1)
    + '  FOG ' + (fogOn ? 'ON' : 'OFF'),
    6, 7, 0x99ffcc);
  novaPrint('WASD/arrows move  Q/E turn  Space/Ctrl up/down  F fog  Esc maps', 6, 18, 0xaaaaaa);
}
