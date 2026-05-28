// Conformance cart 1093: rich createMinimap/drawMinimap tile maps.

let errors = [];
let minimap;
let player = { x: 3, y: 2 };
let tileCalls = 0;

const MAP = [
  '########',
  '#..D...#',
  '#.##.#>#',
  '#..C...#',
  '########',
];

function tileColor(tx, ty) {
  tileCalls++;
  const row = MAP[ty] || '';
  const tile = row[tx] || '#';
  if (tile === '#') return rgba8(60, 48, 40, 255);
  if (tile === 'D') return rgba8(150, 95, 45, 255);
  if (tile === 'C') return rgba8(210, 185, 70, 255);
  if (tile === '>') return rgba8(70, 140, 230, 255);
  return rgba8(26, 32, 36, 255);
}

export function init() {
  if (typeof createMinimap !== 'function') errors.push('createMinimap-missing');
  if (typeof drawMinimap !== 'function') errors.push('drawMinimap-missing');
  if (errors.length > 0) return;

  minimap = createMinimap({
    x: 220,
    y: 52,
    width: 176,
    height: 128,
    tileW: 8,
    tileH: 5,
    tileScale: 16,
    fogOfWar: 3,
    bgColor: rgba8(4, 5, 7, 255),
    borderLight: rgba8(140, 120, 82, 255),
    borderDark: rgba8(42, 30, 22, 255),
    follow: {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
    },
    player: {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
      color: rgba8(255, 70, 70, 255),
      size: 5,
      blink: false,
    },
    entities: [{ x: 5, y: 2, color: rgba8(80, 255, 160, 255), size: 4 }],
    tiles: tileColor,
  });

  if (minimap.tileW !== 8 || minimap.tileH !== 5) errors.push('tile-size-copy');
  if (minimap.tileScale !== 16) errors.push('tile-scale-copy');
  if (minimap.fogOfWar !== 3) errors.push('fog-copy');
  if (typeof minimap.tiles !== 'function') errors.push('tiles-copy');
}

export function update(dt) {}

export function draw() {
  cls(rgba8(8, 10, 14, 255));
  print('1093 MINIMAP TILES', 4, 4, rgba8(210, 225, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  drawMinimap(minimap, 0);

  if (tileCalls === 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print('tiles-not-called', 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  print('tiles:' + tileCalls, 220, 190, rgba8(180, 220, 140, 255));
  print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
