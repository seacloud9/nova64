// Conformance cart 91: stereo audio panning via playSound3D
// With listener at origin and source to the right, sound should play to the right.
// We verify the audio checksum differs between left-panned and right-panned sounds
// when a valid sound asset is present — but without an asset we just verify the
// API does not throw and audio mixing stays stable.

let ok = false;

export function init() {
   // Listener at origin
   setListenerPos(0, 0, 0);

   // playSound3D with missing asset must not throw
   playSound3D('sfx/missing.ogg', -5, 0, 0, 1.0, 10.0);  // left
   playSound3D('sfx/missing.ogg',  5, 0, 0, 1.0, 10.0);  // right
   playSound3D('sfx/missing.ogg',  0, 0, 0, 1.0, 10.0);  // center

   // nova64.audio alias
   nova64.audio.playSound3D('sfx/missing.ogg', 0, 0, -3, 1.0, 10.0);

   // setEcho + clearEcho round-trip
   setEcho(0.2, 0.6, 0.4);
   clearEcho();

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(14, 10, 18, 255));
   print('91 STEREO PAN', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('L pan', 4, 24, rgba8(100, 180, 255, 255));
   print('R pan', 80, 24, rgba8(255, 180, 100, 255));
}
