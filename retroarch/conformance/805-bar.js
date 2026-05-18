// Conformance cart 805: bar — createBar, setBarValue, setBarTarget, updateBar,
//   drawBar, getBarValue, setBarColors, destroyBar

let bar = 0;

export function init() {
   bar = createBar(60, 160, 300, 18, 0.0);
   setBarTarget(bar, 0.7);
   setBarColors(bar, rgba8(20, 22, 36, 220), rgba8(60, 180, 80, 255), rgba8(80, 100, 160, 255));
}

export function draw() {
   cls(rgba8(14, 16, 28, 255));

   rectfill(40, 130, 340, 70, rgba8(18, 20, 34, 220));
   print('XP TO LEVEL 8', 60, 140, rgba8(160, 180, 255, 180));

   drawBar(bar);

   const v = getBarValue(bar);
   printBold('805 BAR', 4, 4, rgba8(200, 220, 255, 255));
   print('value:' + v.toFixed(3), 4, 14, rgba8(80, 255, 120, 200));
}
