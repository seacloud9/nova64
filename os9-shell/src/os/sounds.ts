// ============================================================================
// UI Sound Effects — Classic Mac OS 9-style audio feedback
// ============================================================================

let audioCtx: AudioContext | null = null;
let uiSoundsEnabled = true;
let volume = 0.3;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal?: number,
  freqEnd?: number
) {
  if (!uiSoundsEnabled) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }
  const g = (gainVal ?? volume) * volume;
  gain.gain.setValueAtTime(g, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, gainVal: number = 0.05) {
  if (!uiSoundsEnabled) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const g = gainVal * volume;
  gain.gain.setValueAtTime(g, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// ============================================================================
// Named Sound Presets
// ============================================================================

export const UISounds = {
  /** Click / button press */
  click() {
    playTone(800, 0.05, 'square', 0.15);
  },

  /** Menu open */
  menuOpen() {
    playTone(600, 0.04, 'sine', 0.1);
    setTimeout(() => playTone(900, 0.04, 'sine', 0.08), 30);
  },

  /** Menu close */
  menuClose() {
    playTone(700, 0.03, 'sine', 0.06);
  },

  /** Window open */
  windowOpen() {
    playTone(400, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(600, 0.08, 'sine', 0.1), 60);
    setTimeout(() => playTone(800, 0.1, 'sine', 0.08), 120);
  },

  /** Window close */
  windowClose() {
    playTone(600, 0.06, 'sine', 0.1);
    setTimeout(() => playTone(400, 0.08, 'sine', 0.08), 50);
  },

  /** Window shade (roll up/down) */
  windowShade() {
    playTone(500, 0.04, 'triangle', 0.1);
    setTimeout(() => playTone(700, 0.04, 'triangle', 0.08), 30);
  },

  /** Alert / dialog appear */
  alert() {
    playTone(440, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(440, 0.15, 'sine', 0.15), 180);
  },

  /** Error / warning */
  error() {
    playTone(200, 0.15, 'sawtooth', 0.12);
    setTimeout(() => playTone(180, 0.2, 'sawtooth', 0.1), 180);
  },

  /** Trash empty */
  trash() {
    playNoise(0.3, 0.08);
    playTone(300, 0.2, 'sawtooth', 0.06);
  },

  /** File drop / move */
  drop() {
    playTone(500, 0.05, 'sine', 0.1);
  },

  /** Selection change */
  select() {
    playTone(1000, 0.02, 'sine', 0.05);
  },

  /** Startup chime — classic Mac chord */
  startup() {
    const ctx = getCtx();
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
      }, i * 80);
    });
  },

  /** Notification / toast */
  notify() {
    playTone(880, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(1100, 0.1, 'sine', 0.1), 100);
  },

  /** Context menu appear */
  contextMenu() {
    playTone(700, 0.03, 'square', 0.08);
  },

  /** App switcher */
  appSwitch() {
    playTone(600, 0.04, 'triangle', 0.1);
    setTimeout(() => playTone(800, 0.05, 'triangle', 0.08), 40);
  },
};

// ============================================================================
// Global Controls
// ============================================================================

export function setUISoundsEnabled(enabled: boolean) {
  uiSoundsEnabled = enabled;
}

export function setUIVolume(vol: number) {
  volume = Math.max(0, Math.min(1, vol));
}

export function getUISoundsEnabled(): boolean {
  return uiSoundsEnabled;
}

export function getUIVolume(): number {
  return volume;
}
