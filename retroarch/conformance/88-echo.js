// Conformance cart 88: audio echo API
// setEcho / clearEcho must not throw; audio APIs must exist on nova64.audio.

let ok = false;

export function init() {
   // setEcho(delaySec, decay, wet) — must not throw
   setEcho(0.3, 0.5, 0.5);

   // clearEcho — must not throw
   clearEcho();

   // Second call should also be fine
   setEcho(0.1, 0.4, 0.3);
   clearEcho();

   // namespace aliases exist
   if (typeof nova64.audio.setEcho !== 'function') throw new Error('nova64.audio.setEcho missing');
   if (typeof nova64.audio.clearEcho !== 'function') throw new Error('nova64.audio.clearEcho missing');

   // Edge: delay of 0 or large values must not crash
   setEcho(0, 0.5, 0.5);
   setEcho(999, 0.5, 0.5);
   clearEcho();

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 18, 255));
   print('88 ECHO API', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
