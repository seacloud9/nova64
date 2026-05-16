// Conformance cart 418: drawIsometricTile, fillIsometricTile, drawTunnel, drawCompass.

let errors = [];

export function init() {
   if (typeof drawIsometricTile !== 'function') { errors.push('drawIsometricTile-missing'); return; }
   if (typeof fillIsometricTile !== 'function') { errors.push('fillIsometricTile-missing'); return; }
   if (typeof drawTunnel        !== 'function') { errors.push('drawTunnel-missing');        return; }
   if (typeof drawCompass       !== 'function') { errors.push('drawCompass-missing');       return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 20, 255));
   print('418 ISO TILE TUNNEL COMPASS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Isometric tile grid
   for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
         const tx = 20 + col * 56 + row * 28;
         const ty = 30 + row * 20;
         fillIsometricTile(tx, ty, 56, 28, rgba8(60 + col * 20, 80 + row * 20, 160, 200));
         drawIsometricTile(tx, ty, 56, 28, rgba8(160, 200, 255, 200));
      }
   }

   // Tunnel
   drawTunnel(480, 190, 120, 6, rgba8(80, 200, 255, 200));

   // Compass
   drawCompass(160, 310, 60, Math.PI * 0.25, rgba8(220, 220, 255, 255));
   drawCompass(360, 310, 50, -Math.PI * 0.5, rgba8(200, 255, 200, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
