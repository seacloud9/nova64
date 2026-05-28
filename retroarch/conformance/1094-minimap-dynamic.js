// Conformance cart 1094: minimap reflects live follow/player object changes.

let errors = [];
let minimap;
let player = { x: 1, y: 1 };
let frame = 0;
let tileCalls = 0;

function tileColor(tx, ty) {
  tileCalls++;
  if (tx === 0 || ty === 0 || tx === 7 || ty === 5) return rgba8(50, 42, 38, 255);
  if ((tx + ty) % 3 === 0) return rgba8(36, 50, 54, 255);
  return rgba8(22, 28, 34, 255);
}

export function init() {
  if (typeof createMinimap !== 'function') errors.push('createMinimap-missing');
  if (typeof drawMinimap !== 'function') errors.push('drawMinimap-missing');
  if (errors.length > 0) return;

  minimap = createMinimap({
    x: 236,
    y: 46,
    width: 168,
    height: 132,
    tileW: 8,
    tileH: 6,
    tileScale: 16,
    fogOfWar: 2,
    bgColor: rgba8(3, 4, 6, 255),
    borderLight: rgba8(150, 130, 90, 255),
    borderDark: rgba8(36, 26, 18, 255),
    follow: player,
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
    entities: [{ x: 5, y: 4, color: rgba8(80, 220, 255, 255), size: 4 }],
    tiles: tileColor,
  });
}

export function update(dt) {
  frame++;
  if (frame === 2) {
    player.x = 5;
    player.y = 4;
  }
}

export function draw() {
  cls(rgba8(8, 9, 13, 255));
  print('1094 MINIMAP LIVE', 4, 4, rgba8(210, 225, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  drawMinimap(minimap, frame / 60);
  if (tileCalls === 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print('tiles-not-called', 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  print('player:' + player.x + ',' + player.y, 236, 190, rgba8(180, 220, 140, 255));
  print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
