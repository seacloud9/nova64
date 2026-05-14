// Conformance cart 99: voice handle API
// sfx() and playSound() return numeric voice handles (non-zero on success).
// setVoicePitch / stopVoice / getVoicePitch / getVoiceVolume / voiceActive.
// nova64.audio namespace aliases.

let ok = false;

export function init() {
   if (typeof setVoicePitch  !== 'function') throw new Error('setVoicePitch missing');
   if (typeof stopVoice      !== 'function') throw new Error('stopVoice missing');
   if (typeof getVoicePitch  !== 'function') throw new Error('getVoicePitch missing');
   if (typeof getVoiceVolume !== 'function') throw new Error('getVoiceVolume missing');
   if (typeof voiceActive    !== 'function') throw new Error('voiceActive missing');
   if (typeof nova64.audio.getVoicePitch  !== 'function') throw new Error('nova64.audio.getVoicePitch missing');
   if (typeof nova64.audio.getVoiceVolume !== 'function') throw new Error('nova64.audio.getVoiceVolume missing');
   if (typeof nova64.audio.voiceActive    !== 'function') throw new Error('nova64.audio.voiceActive missing');

   // sfx() returns a non-zero integer handle
   const h1 = sfx(440, 0.5);
   if (typeof h1 !== 'number') throw new Error('sfx must return number, got ' + typeof h1);
   if (h1 <= 0) throw new Error('sfx handle must be > 0, got ' + h1);

   // setVoicePitch and read it back
   setVoicePitch(h1, 2.0);
   const p1 = getVoicePitch(h1);
   if (typeof p1 !== 'number') throw new Error('getVoicePitch must return number');
   if (Math.abs(p1 - 2.0) > 0.001) throw new Error('getVoicePitch mismatch: ' + p1);

   // getVoiceVolume
   const v1 = getVoiceVolume(h1);
   if (typeof v1 !== 'number') throw new Error('getVoiceVolume must return number');

   // voiceActive — short sfx may still be active in init
   const active = voiceActive(h1);
   if (typeof active !== 'boolean') throw new Error('voiceActive must return boolean');

   // stopVoice — voice becomes inactive
   const h2 = sfx(220, 0.5);
   if (h2 <= 0) throw new Error('sfx h2 must be > 0');
   stopVoice(h2);
   if (voiceActive(h2)) throw new Error('voice should be inactive after stopVoice');

   // Out-of-range handle — should not throw
   getVoicePitch(0); getVoicePitch(999);
   getVoiceVolume(0); getVoiceVolume(999);
   voiceActive(0); voiceActive(999);

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
