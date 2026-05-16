// Conformance cart 176: colorBlendMode(c1, c2, mode).

let errors = [];

export function init() {
   if (typeof colorBlendMode !== 'function') { errors.push('colorBlendMode-missing'); return; }

   const black = rgba8(0, 0, 0, 255);
   const white = rgba8(255, 255, 255, 255);
   const red   = rgba8(255, 0, 0, 255);

   // add: black + white = white
   const addBW = colorBlendMode(black, white, 'add');
   if (typeof addBW !== 'number') errors.push('colorBlendMode-not-number');
   if (colorR(addBW) !== 255) errors.push('add-R: ' + colorR(addBW));

   // multiply: white * red = red
   const mulWR = colorBlendMode(white, red, 'multiply');
   if (colorR(mulWR) < 250) errors.push('multiply-R: ' + colorR(mulWR));
   if (colorG(mulWR) > 5)   errors.push('multiply-G: ' + colorG(mulWR));

   // screen: black * anything = anything
   const scrBR = colorBlendMode(black, red, 'screen');
   if (colorR(scrBR) < 250) errors.push('screen-R: ' + colorR(scrBR));

   // overlay: any mode must return a number
   const ov = colorBlendMode(red, white, 'overlay');
   if (typeof ov !== 'number') errors.push('overlay-not-number');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('176 COLOR BLEND MODE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const modes = ['add', 'multiply', 'screen', 'overlay'];
   const base  = rgba8(180, 100, 60, 255);
   const blend = rgba8(80, 160, 220, 255);

   for (let i = 0; i < modes.length; i++) {
      const x = 20 + i * 76;
      rectfill(x, 60, x+60, 90, base);
      rectfill(x, 90, x+60, 120, blend);
      const out = colorBlendMode(base, blend, modes[i]);
      rectfill(x, 120, x+60, 160, out);
      print(modes[i], x, 165, rgba8(160, 200, 255, 255));
   }
   print('top / blend / result', 8, 50, rgba8(140, 170, 220, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
