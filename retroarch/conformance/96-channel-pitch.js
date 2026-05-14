// Conformance cart 96: channel pitch API
// setChannelPitch(channel, pitch) / getChannelPitch(channel)
// nova64.audio.setChannelPitch / getChannelPitch aliases.

let ok = false;

export function init() {
   if (typeof setChannelPitch !== 'function')
      throw new Error('setChannelPitch missing');
   if (typeof getChannelPitch !== 'function')
      throw new Error('getChannelPitch missing');

   // Default pitch is 1.0
   const def = getChannelPitch('music');
   if (def !== 1.0) throw new Error('default pitch must be 1.0, got ' + def);

   // Set and read back
   setChannelPitch('music', 2.0);
   const p2 = getChannelPitch('music');
   if (Math.abs(p2 - 2.0) > 0.001) throw new Error('pitch set/get mismatch: ' + p2);

   setChannelPitch('music', 0.5);
   const p3 = getChannelPitch('music');
   if (Math.abs(p3 - 0.5) > 0.001) throw new Error('pitch 0.5 mismatch: ' + p3);

   // Reset to normal
   setChannelPitch('music', 1.0);

   // nova64.audio namespace
   if (typeof nova64.audio.setChannelPitch !== 'function')
      throw new Error('nova64.audio.setChannelPitch missing');
   if (typeof nova64.audio.getChannelPitch !== 'function')
      throw new Error('nova64.audio.getChannelPitch missing');

   nova64.audio.setChannelPitch('sfx', 1.5);
   const p4 = nova64.audio.getChannelPitch('sfx');
   if (Math.abs(p4 - 1.5) > 0.001) throw new Error('namespace pitch mismatch: ' + p4);

   // Zero/negative pitch should clamp, not crash
   setChannelPitch('sfx', 0);
   setChannelPitch('sfx', -1);

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 20, 255));
   print('96 CHANNEL PITCH', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
