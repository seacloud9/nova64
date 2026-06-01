// Conformance cart 1098: web-style minimap shape, sweep, grid, follow, and legacy draw signature.

let errors = [];
let minimap;
let player = { x: 20, y: 18 };
let frame = 0;

export function init() {
  const needed = ['createMinimap', 'drawMinimap', 'rgba8'];
  for (const name of needed) {
    if (typeof globalThis[name] !== 'function') errors.push(name + '-missing');
  }
  if (errors.length > 0) return;

  minimap = createMinimap({
    x: 210,
    y: 38,
    width: 96,
    height: 96,
    shape: 'circle',
    worldW: 80,
    worldH: 80,
    bgColor: rgba8(6, 12, 10, 255),
    borderLight: rgba8(80, 190, 120, 255),
    gridLines: 4,
    gridColor: rgba8(38, 92, 58, 210),
    follow: player,
    sweep: { speed: 3, color: rgba8(80, 255, 150, 255) },
    player: {
      get x() {
        return player.x;
      },
      get y() {
        return player.y;
      },
      color: rgba8(255, 232, 80, 255),
      size: 5,
      blink: false,
    },
    entities: [
      { x: 20, y: 18, color: rgba8(80, 180, 255, 255), size: 4 },
      { x: 42, y: 30, color: rgba8(255, 90, 80, 255), size: 4 },
    ],
  });

  if (minimap.shape !== 'circle') errors.push('shape-copy');
  if (minimap.gridLines !== 4) errors.push('grid-copy');
  if (!minimap.sweep) errors.push('sweep-copy');
}

export function update(dt) {
  frame++;
  if (frame === 2) {
    player.x = 44;
    player.y = 36;
    minimap.entities = [
      { x: 44, y: 36, color: rgba8(80, 180, 255, 255), size: 4 },
      { x: 60, y: 50, color: rgba8(255, 90, 80, 255), size: 4 },
    ];
  }
}

export function draw() {
  cls(rgba8(4, 6, 8, 255));
  print('1098 MINIMAP WEB', 4, 4, rgba8(210, 230, 220, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  drawMinimap(minimap, frame / 30);

  drawMinimap(
    340,
    50,
    58,
    [
      { x: 12, y: 16, worldW: 64, worldH: 64, color: rgba8(220, 110, 255, 255), size: 3 },
      { x: 46, y: 38, worldW: 64, worldH: 64, color: rgba8(255, 210, 90, 255), size: 3 },
    ],
    rgba8(14, 10, 18, 255)
  );

  print('player:' + player.x + ',' + player.y, 210, 142, rgba8(180, 230, 160, 255));
  print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
