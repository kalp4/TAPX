import { SOUND_KEY } from './constants';

let audioCtx = null;
let soundEnabled = readInitialSoundPref();

function readInitialSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
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
  getAudioContext();
}

function playTone({
  freqStart,
  freqEnd = freqStart,
  duration = 0.06,
  delay = 0,
  volume = 0.08,
  type = 'sine'
}) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const start = ctx.currentTime + delay;
    const end = start + duration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), end);
    }

    const attack = Math.min(0.008, duration * 0.25);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(end + 0.015);
  } catch {
    // Ignore audio scheduling errors on restricted devices
  }
}

// Subtle musical pitch map so typing amounts on the keypad feels tactile
const DIGIT_PITCH_MAP = {
  '1': 440,
  '2': 466,
  '3': 494,
  '4': 523,
  '5': 554,
  '6': 587,
  '7': 622,
  '8': 659,
  '9': 698,
  '0': 415,
  '.': 508
};

export function playKeyTap(digit = '0') {
  const baseFreq = DIGIT_PITCH_MAP[String(digit)] || 480;
  playTone({
    freqStart: baseFreq,
    freqEnd: baseFreq * 0.88,
    duration: 0.045,
    volume: 0.075,
    type: 'triangle'
  });
}

export function playKeyDelete() {
  playTone({
    freqStart: 340,
    freqEnd: 185,
    duration: 0.065,
    volume: 0.075,
    type: 'sine'
  });
}

export function playQuickChip() {
  playTone({
    freqStart: 520,
    freqEnd: 710,
    duration: 0.055,
    volume: 0.065,
    type: 'sine'
  });
}

export function playTabSwitch() {
  playTone({
    freqStart: 360,
    freqEnd: 540,
    duration: 0.06,
    volume: 0.06,
    type: 'triangle'
  });
}

export function playSuccess(kind = 'expense') {
  if (kind === 'income') {
    // Bright ascending 3-note chime
    playTone({ freqStart: 523.25, duration: 0.09, delay: 0, volume: 0.085, type: 'triangle' });
    playTone({ freqStart: 659.25, duration: 0.09, delay: 0.055, volume: 0.085, type: 'triangle' });
    playTone({ freqStart: 783.99, duration: 0.16, delay: 0.11, volume: 0.095, type: 'sine' });
    return;
  }

  if (kind === 'transfer') {
    // Smooth two-pocket swoosh chime
    playTone({ freqStart: 392, freqEnd: 587.33, duration: 0.09, delay: 0, volume: 0.08, type: 'sine' });
    playTone({ freqStart: 587.33, freqEnd: 783.99, duration: 0.13, delay: 0.07, volume: 0.085, type: 'triangle' });
    return;
  }

  if (kind === 'save') {
    // Clean double confirmation chime
    playTone({ freqStart: 659.25, duration: 0.075, delay: 0, volume: 0.075, type: 'sine' });
    playTone({ freqStart: 880, duration: 0.12, delay: 0.06, volume: 0.08, type: 'triangle' });
    return;
  }

  // Default expense: crisp coin/register pop
  playTone({ freqStart: 880, duration: 0.07, delay: 0, volume: 0.075, type: 'triangle' });
  playTone({ freqStart: 1318.5, duration: 0.14, delay: 0.05, volume: 0.08, type: 'sine' });
}

export function playDelete() {
  playTone({
    freqStart: 420,
    freqEnd: 170,
    duration: 0.11,
    volume: 0.085,
    type: 'triangle'
  });
}

export function playUndo() {
  playTone({
    freqStart: 250,
    freqEnd: 540,
    duration: 0.1,
    volume: 0.08,
    type: 'triangle'
  });
}

export function playError() {
  playTone({ freqStart: 210, freqEnd: 180, duration: 0.075, delay: 0, volume: 0.085, type: 'sine' });
  playTone({ freqStart: 170, freqEnd: 145, duration: 0.095, delay: 0.085, volume: 0.085, type: 'sine' });
}

export function playModalOpen() {
  playTone({
    freqStart: 300,
    freqEnd: 460,
    duration: 0.065,
    volume: 0.05,
    type: 'sine'
  });
}

export function playCopy() {
  playTone({
    freqStart: 784,
    freqEnd: 1046.5,
    duration: 0.055,
    volume: 0.065,
    type: 'sine'
  });
}