// Conformance cart 83: named audio channels
// setChannelVolume / getChannelVolume / stopChannel
// playSound() with optional 4th channel argument.

let ok = false;

export function init() {
   // Channel volume round-trip
   setChannelVolume('sfx', 0.5);
   const v = getChannelVolume('sfx');
   if (Math.abs(v - 0.5) > 0.001) throw new Error('channel volume mismatch: ' + v);

   setChannelVolume('music', 0.75);
   const vm = getChannelVolume('music');
   if (Math.abs(vm - 0.75) > 0.001) throw new Error('music volume mismatch: ' + vm);

   // Unknown channel returns 1.0
   const vu = getChannelVolume('__unset__');
   if (Math.abs(vu - 1.0) > 0.001) throw new Error('unset channel should be 1.0: ' + vu);

   // stopChannel without any active voices must not throw
   stopChannel('sfx');

   // nova64.audio namespace aliases
   nova64.audio.setChannelVolume('ui', 0.3);
   const vui = nova64.audio.getChannelVolume('ui');
   if (Math.abs(vui - 0.3) > 0.001) throw new Error('namespace alias mismatch: ' + vui);

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(15, 20, 10, 255));
   print('83 AUDIO CHANNELS', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   print('sfx=0.50', 4, 24, rgba8(180, 255, 180, 255));
   print('music=0.75', 4, 34, rgba8(180, 255, 180, 255));
   print('ui=0.30', 4, 44, rgba8(180, 255, 180, 255));
}
