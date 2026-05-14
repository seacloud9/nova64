// Conformance cart 99: voice handle API
// sfx() and playSound() return numeric voice handles (non-zero on success).
// setVoicePitch(handle, pitch) / stopVoice(handle) control playing voices.
// nova64.audio.setVoicePitch / stopVoice aliases.

let ok = false;

export function init() {
   if (typeof setVoicePitch !== 'function') throw new Error('setVoicePitch missing');
   if (typeof stopVoice !== 'function') throw new Error('stopVoice missing');
   if (typeof nova64.audio.setVoicePitch !== 'function') throw new Error('nova64.audio.setVoicePitch missing');
   if (typeof nova64.audio.stopVoice !== 'function') throw new Error('nova64.audio.stopVoice missing');

   // sfx() returns a non-zero integer handle
   const h1 = sfx(440, 0.5);
   if (typeof h1 !== 'number') throw new Error('sfx must return number, got ' + typeof h1);
   if (h1 <= 0) throw new Error('sfx handle must be > 0, got ' + h1);

   // setVoicePitch on live voice — should not throw
   setVoicePitch(h1, 2.0);
   nova64.audio.setVoicePitch(h1, 1.0);

   // stopVoice on live voice — should not throw
   const h2 = sfx(220, 0.5);
   if (h2 <= 0) throw new Error('sfx h2 must be > 0');
   stopVoice(h2);
   nova64.audio.stopVoice(h2);

   // Out-of-range handle — should not throw
   setVoicePitch(0, 1.0);
   setVoicePitch(999, 1.0);
   stopVoice(0);
   stopVoice(999);

   // playSound missing asset returns 0 (falsy integer)
   const miss = playSound('sfx/missing.pcm', 1.0);
   if (miss !== 0 && miss !== false) throw new Error('missing asset must return 0 or false, got ' + miss);

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 10, 20, 255));
   print('99 VOICE HANDLE', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
}
