// Conformance cart 1092: browser-style scaled text helpers.

let errors = [];

export function init() {
  const required = [
    ['printScaled', typeof printScaled],
    ['printTightScaled', typeof printTightScaled],
    ['nova64.draw.printScaled', typeof nova64?.draw?.printScaled],
    ['nova64.draw.printTightScaled', typeof nova64?.draw?.printTightScaled],
    ['nova64.draw.printCentered', typeof nova64?.draw?.printCentered],
    ['nova64.draw.printRight', typeof nova64?.draw?.printRight],
  ];
  for (const [name, type] of required) {
    if (type !== 'function') {
      errors.push(name + '-missing');
      return;
    }
  }

  const normal = measureText('SCALE');
  const scaled = measureText('SCALE', 2);
  if (scaled.width !== normal.width * 2 || scaled.height !== normal.height * 2) {
    errors.push('measure scale ' + scaled.width + 'x' + scaled.height);
    return;
  }

  const tight = tightTextWidth('III');
  if (tightTextWidth('III', 2) !== tight * 2) {
    errors.push('tight width scale');
  }
}

export function update(dt) {}

export function draw() {
  cls(rgba8(8, 10, 18, 255));
  print('1092 SCALED TEXT', 4, 4, rgba8(200, 220, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  rect(36, 40, 568, 132, rgba8(55, 70, 110, 255), false);
  line(320, 36, 320, 186, rgba8(70, 90, 150, 255));

  print('print scale=2', 54, 58, rgba8(120, 160, 255, 255), 2);
  printScaled('printScaled center', 320, 92, rgba8(255, 230, 90, 255), 2, 'center');
  printTightScaled('TIGHT SCALED', 320, 126, rgba8(80, 255, 210, 255), 2, 'center');
  nova64.draw.printRight('RIGHT X2', 588, 154, rgba8(255, 120, 220, 255), 2);

  print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
