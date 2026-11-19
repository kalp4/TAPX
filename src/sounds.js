import { SOUND_KEY } from './constants';

let audioCtx = null;
let masterBus = null;
let noiseBuffer = null;
let iosHapticLabel = null;
let soundEnabled = readInitialSoundPref();

function readInitialSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

// Ultra-light cross-platform haptics (Android vibrate API + iOS 17.4+ native Taptic switch fallback)
function triggerIosSwitchTick() {
  if (typeof document === 'undefined') return;
  try {
    if (!iosHapticLabel) {
      const label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.position = 'fixed';
      label.style.left = '-9999px';
      label.style.top = '-9999px';
      label.style.opacity = '0';
      label.style.pointerEvents = 'none';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;

      label.appendChild(input);
      document.body.appendChild(label);
      iosHapticLabel = label;
    }
    iosHapticLabel.click();
  } catch {
    // Ignore on unsupported browsers
  }
}

export function triggerHaptic(style = 'light') {
  if (typeof window === 'undefined') return;

  try {
    // 1. Android / browsers supporting Vibration API (kept intentionally very light)
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (style === 'tick') {
        navigator.vibrate(7);
      } else if (style === 'success') {
        navigator.vibrate([10, 35, 14]);
      } else if (style === 'error') {
        navigator.vibrate([14, 45, 14]);
      } else if (style === 'soft') {
        navigator.vibrate(11);
      } else {
        navigator.vibrate(8);
      }
      return;
    }

    // 2. iOS Safari / PWA fallback via native Taptic switch element
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    triggerIosSwitchTick();
    if (style === 'success' || style === 'error') {
      setTimeout(() => {
        triggerIosSwitchTick();
      }, 55);
    }
  } catch {
    // Fail silently on restricted devices
  }
}

function getAudioEngine() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();

      // Master compressor glues layered transients and keeps iPhone speakers punchy & distortion-free
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(18, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.12, audioCtx.currentTime);

      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.855, audioCtx.currentTime);

      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);
      masterBus = compressor;

      // Reusable short white-noise buffer for tactile mechanical clicks & air swooshes
      const sampleRate = audioCtx.sampleRate;
      const length = Math.floor(sampleRate * 0.25);
      noiseBuffer = audioCtx.createBuffer(1, length, sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return { ctx: audioCtx, out: masterBus, noise: noiseBuffer };
  } catch {
    return null;
  }
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  try {
    localStorage.setItem(SOUND_KEY, soundEnabled ? 'on' : 'off');
  } catch {
    // Ignore storage write errors
  }
}

export function unlockAudio() {
  getAudioEngine();
}

// Slight organic pitch variation (±1.2%) prevents rapid taps from sounding robotic
function jitter(freq, amount = 0.012) {
  return freq * (1 + (Math.random() * 2 - 1) * amount);
}

// Synthesize a shaped oscillator tone with optional lowpass warmth
function synthTone(
  engine,
  {
    freqStart,
    freqEnd = freqStart,
    duration = 0.08,
    delay = 0,
    volume = 0.12,
    type = 'sine',
    attack = 0.004,
    lowpassFreq = null
  }
) {
  const { ctx, out } = engine;
  const start = ctx.currentTime + delay;
  const end = start + duration;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freqStart), start);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), end);
  }

  const safeAttack = Math.min(attack, duration * 0.3);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + safeAttack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  if (lowpassFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(lowpassFreq, start);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(out);
  osc.start(start);
  osc.stop(end + 0.02);
}

// Synthesize a filtered noise transient (for creamy mechanical key clicks & silky swooshes)
function synthNoise(
  engine,
  {
    duration = 0.012,
    delay = 0,
    volume = 0.08,
    filterType = 'bandpass',
    freqStart = 2000,
    freqEnd = freqStart,
    q = 1.6
  }
) {
  const { ctx, out, noise } = engine;
  if (!noise) return;

  const start = ctx.currentTime + delay;
  const end = start + duration;

  const src = ctx.createBufferSource();
  src.buffer = noise;

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.setValueAtTime(q, start);
  filter.frequency.setValueAtTime(Math.max(40, freqStart), start);
  if (freqEnd !== freqStart) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), end);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(volume, start + Math.min(0.002, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);

  src.start(start);
  src.stop(end + 0.015);
}

// Pentatonic marimba frequencies so typing any amount feels musical & never clashes
const DIGIT_PENTATONIC_MAP = {
  '1': 523.25, // C5
  '2': 587.33, // D5
  '3': 659.25, // E5
  '4': 783.99, // G5
  '5': 880.0,  // A5
  '6': 1046.5, // C6
  '7': 587.33, // D5
  '8': 659.25, // E5
  '9': 783.99, // G5
  '0': 440.0,  // A4
  '.': 987.77  // B5
};

// 1. Creamy mechanical keycap "thock" + subtle wooden marimba ping (no vibration)
export function playKeyTap(digit = '0') {
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    const noteFreq = jitter(DIGIT_PENTATONIC_MAP[String(digit)] || 523.25);

    synthNoise(engine, {
      duration: 0.006,
      volume: 0.09,
      filterType: 'bandpass',
      freqStart: jitter(2600, 0.06),
      q: 1.8
    });

    synthTone(engine, {
      freqStart: jitter(195, 0.04),
      freqEnd: 78,
      duration: 0.036,
      volume: 0.22,
      type: 'sine',
      attack: 0.002
    });

    synthTone(engine, {
      freqStart: noteFreq,
      freqEnd: noteFreq * 0.985,
      duration: 0.055,
      volume: 0.055,
      type: 'triangle',
      attack: 0.002,
      lowpassFreq: 2200
    });
  } catch {}
}

// 2. Deeper damped backspace mechanical chunk (no vibration)
export function playKeyDelete() {
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.009,
      volume: 0.08,
      filterType: 'bandpass',
      freqStart: 1200,
      freqEnd: 700,
      q: 1.4
    });

    synthTone(engine, {
      freqStart: 180,
      freqEnd: 65,
      duration: 0.055,
      volume: 0.24,
      type: 'sine',
      attack: 0.002
    });
  } catch {}
}

// 3. Juicy bubble-wrap "plop" for quick-add chips, pills, and chart taps (no vibration)
export function playQuickChip() {
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.004,
      volume: 0.055,
      filterType: 'highpass',
      freqStart: 3000,
      q: 1.0
    });

    synthTone(engine, {
      freqStart: jitter(390, 0.03),
      freqEnd: jitter(820, 0.03),
      duration: 0.046,
      volume: 0.14,
      type: 'sine',
      attack: 0.003
    });
  } catch {}
}

// 4. Magnetic detent "tick-pop" for dock tabs & scrubbing (+ ultra-light tick vibration)
export function playTabSwitch() {
  triggerHaptic('tick');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.004,
      volume: 0.085,
      filterType: 'bandpass',
      freqStart: 2200,
      q: 2.2
    });

    synthTone(engine, {
      freqStart: 270,
      freqEnd: 460,
      duration: 0.038,
      volume: 0.14,
      type: 'triangle',
      attack: 0.002,
      lowpassFreq: 1600
    });
  } catch {}
}

// 5. Signature Hero Success Chimes (+ crisp light double-pulse vibration)
export function playSuccess(kind = 'expense') {
  triggerHaptic('success');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    if (kind === 'income') {
      const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
      notes.forEach((freq, i) => {
        const d = i * 0.042;
        synthTone(engine, {
          freqStart: freq,
          duration: 0.24 + i * 0.03,
          delay: d,
          volume: 0.11,
          type: 'triangle',
          attack: 0.004,
          lowpassFreq: 3800
        });
        synthTone(engine, {
          freqStart: freq * 2,
          duration: 0.14,
          delay: d,
          volume: 0.035,
          type: 'sine',
          attack: 0.003
        });
      });
      synthTone(engine, {
        freqStart: 130.81,
        duration: 0.22,
        volume: 0.14,
        type: 'sine',
        attack: 0.01
      });
      return;
    }

    if (kind === 'transfer') {
      synthNoise(engine, {
        duration: 0.11,
        volume: 0.075,
        filterType: 'bandpass',
        freqStart: 450,
        freqEnd: 1900,
        q: 1.5
      });
      synthTone(engine, {
        freqStart: 392.0,
        freqEnd: 587.33,
        duration: 0.09,
        delay: 0.02,
        volume: 0.13,
        type: 'sine',
        attack: 0.005
      });
      synthTone(engine, {
        freqStart: 783.99,
        duration: 0.18,
        delay: 0.085,
        volume: 0.12,
        type: 'triangle',
        attack: 0.003,
        lowpassFreq: 3200
      });
      synthTone(engine, {
        freqStart: 1567.98,
        duration: 0.12,
        delay: 0.085,
        volume: 0.035,
        type: 'sine'
      });
      return;
    }

    if (kind === 'save') {
      synthTone(engine, {
        freqStart: 739.99,
        duration: 0.13,
        delay: 0,
        volume: 0.11,
        type: 'sine',
        attack: 0.003
      });
      synthTone(engine, {
        freqStart: 987.77,
        duration: 0.22,
        delay: 0.06,
        volume: 0.13,
        type: 'sine',
        attack: 0.003
      });
      synthTone(engine, {
        freqStart: 1975.53,
        duration: 0.15,
        delay: 0.06,
        volume: 0.035,
        type: 'sine',
        attack: 0.002
      });
      return;
    }

    // Default 'expense': Addictive crisp "Ka-Ching" coin-bell pop
    synthNoise(engine, {
      duration: 0.006,
      volume: 0.08,
      filterType: 'bandpass',
      freqStart: 2800,
      q: 2.0
    });
    synthTone(engine, {
      freqStart: 220,
      freqEnd: 95,
      duration: 0.04,
      volume: 0.16,
      type: 'sine',
      attack: 0.002
    });
    synthTone(engine, {
      freqStart: 987.77,
      duration: 0.11,
      delay: 0.015,
      volume: 0.11,
      type: 'triangle',
      attack: 0.002,
      lowpassFreq: 4200
    });
    synthTone(engine, {
      freqStart: 1318.51,
      duration: 0.24,
      delay: 0.07,
      volume: 0.12,
      type: 'sine',
      attack: 0.002
    });
    synthTone(engine, {
      freqStart: 2637.02,
      duration: 0.18,
      delay: 0.072,
      volume: 0.04,
      type: 'sine',
      attack: 0.002
    });
  } catch {}
}

// 6. Satisfying rubbery pop-out + crisp air puff for deleting items (+ soft single pulse)
export function playDelete() {
  triggerHaptic('soft');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.025,
      volume: 0.07,
      filterType: 'bandpass',
      freqStart: 1500,
      freqEnd: 500,
      q: 1.2
    });

    synthTone(engine, {
      freqStart: 380,
      freqEnd: 115,
      duration: 0.095,
      volume: 0.16,
      type: 'triangle',
      attack: 0.003,
      lowpassFreq: 1400
    });
  } catch {}
}

// 7. Bouncy elastic rewind pop for Undo (+ light pulse)
export function playUndo() {
  triggerHaptic('light');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthTone(engine, {
      freqStart: 220,
      freqEnd: 520,
      duration: 0.065,
      delay: 0,
      volume: 0.13,
      type: 'sine',
      attack: 0.003
    });
    synthTone(engine, {
      freqStart: 520,
      freqEnd: 780,
      duration: 0.095,
      delay: 0.055,
      volume: 0.12,
      type: 'triangle',
      attack: 0.003,
      lowpassFreq: 2600
    });
  } catch {}
}

// 8. Playful muted cartoon woodblock double-knock for validation errors (+ gentle double-nudge)
export function playError() {
  triggerHaptic('error');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthTone(engine, {
      freqStart: 210,
      freqEnd: 135,
      duration: 0.065,
      delay: 0,
      volume: 0.16,
      type: 'triangle',
      attack: 0.002,
      lowpassFreq: 900
    });
    synthTone(engine, {
      freqStart: 165,
      freqEnd: 105,
      duration: 0.085,
      delay: 0.08,
      volume: 0.17,
      type: 'triangle',
      attack: 0.002,
      lowpassFreq: 800
    });
  } catch {}
}

// 9. Soft airy lift when opening bottom sheets (no vibration)
export function playModalOpen() {
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.04,
      volume: 0.04,
      filterType: 'bandpass',
      freqStart: 600,
      freqEnd: 1500,
      q: 1.0
    });
    synthTone(engine, {
      freqStart: 240,
      freqEnd: 410,
      duration: 0.06,
      volume: 0.08,
      type: 'sine',
      attack: 0.005
    });
  } catch {}
}

// 10. Crisp magnetic double-tick for Copy & CSV Export (+ ultra-light tick)
export function playCopy() {
  triggerHaptic('tick');
  if (!soundEnabled) return;
  const engine = getAudioEngine();
  if (!engine) return;

  try {
    synthNoise(engine, {
      duration: 0.004,
      volume: 0.07,
      filterType: 'highpass',
      freqStart: 2600
    });
    synthTone(engine, {
      freqStart: 980,
      duration: 0.035,
      delay: 0,
      volume: 0.09,
      type: 'sine',
      attack: 0.002
    });
    synthTone(engine, {
      freqStart: 1480,
      duration: 0.06,
      delay: 0.04,
      volume: 0.1,
      type: 'sine',
      attack: 0.002
    });
  } catch {}
}