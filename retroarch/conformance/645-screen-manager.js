// Conformance cart 645: addScreen, switchScreen, getCurrentScreen,
//                        isTransitioning, startScreens.

let errors = [];

export function init() {
   const needed = ['addScreen', 'switchScreen', 'getCurrentScreen',
                   'isTransitioning', 'startScreens'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // addScreen + startScreens
   addScreen('main', {
      init() {},
      update(dt) {},
      draw() {}
   });
   addScreen('game', {
      init() {},
      update(dt) {},
      draw() {}
   });

   startScreens('main');
   const cur = getCurrentScreen();
   if (cur !== 'main') errors.push('getCurrentScreen-after-start:' + cur);

   // isTransitioning — no transition in progress
   const trans = isTransitioning();
   if (typeof trans !== 'boolean') errors.push('isTransitioning-type');

   // switchScreen
   switchScreen('game', 0);
   const cur2 = getCurrentScreen();
   if (cur2 !== 'game') errors.push('getCurrentScreen-after-switch:' + cur2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('645 SCREEN MANAGER', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const cur = getCurrentScreen();
   print('current: ' + cur, 20, 80, rgba8(80, 200, 255, 255));
   print('transitioning: ' + isTransitioning(), 20, 96, rgba8(180, 180, 220, 200));

   // screen list visual
   const screens = ['main', 'game'];
   for (let i = 0; i < screens.length; i++) {
      const active = screens[i] === cur;
      rectfill(40, 130 + i * 50, 200, 170 + i * 50,
               active ? rgba8(80, 160, 255, 200) : rgba8(30, 40, 80, 200));
      print(screens[i], 60, 146 + i * 50,
            active ? rgba8(255, 255, 255, 255) : rgba8(140, 140, 180, 200));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
