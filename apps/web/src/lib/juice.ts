"use client";

type SoundName =
  | "countdown_tick"
  | "signal_go"
  | "tap"
  | "error"
  | "success"
  | "eliminated"
  | "win";

type Tone = { freq: number; durMs: number; type?: OscillatorType; gain?: number };

const TONES: Record<SoundName, Tone[]> = {
  countdown_tick: [{ freq: 660, durMs: 70, type: "square", gain: 0.12 }],
  signal_go: [{ freq: 880, durMs: 160, type: "sawtooth", gain: 0.18 }],
  tap: [{ freq: 420, durMs: 45, type: "triangle", gain: 0.1 }],
  error: [{ freq: 160, durMs: 200, type: "sawtooth", gain: 0.18 }],
  success: [
    { freq: 523, durMs: 110, type: "triangle", gain: 0.16 },
    { freq: 784, durMs: 160, type: "triangle", gain: 0.16 },
  ],
  eliminated: [
    { freq: 320, durMs: 140, type: "sawtooth", gain: 0.2 },
    { freq: 180, durMs: 260, type: "sawtooth", gain: 0.2 },
  ],
  win: [
    { freq: 523, durMs: 110, type: "triangle", gain: 0.18 },
    { freq: 659, durMs: 110, type: "triangle", gain: 0.18 },
    { freq: 784, durMs: 110, type: "triangle", gain: 0.18 },
    { freq: 1046, durMs: 220, type: "triangle", gain: 0.18 },
  ],
};

const HAPTICS: Partial<Record<SoundName, number>> = {
  tap: 12,
  error: 60,
  signal_go: 25,
  success: 30,
  eliminated: 90,
  win: 50,
};

let ctx: AudioContext | null = null;
let unlocked = false;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const juice = {
  unlock() {
    if (typeof window === "undefined") return;
    if (unlocked) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      if (ctx.state === "suspended") void ctx.resume();
      unlocked = true;
    } catch {
      unlocked = false;
    }
  },

  play(name: SoundName) {
    if (prefersReducedMotion()) return;
    if (typeof window === "undefined") return;
    if (!unlocked) this.unlock();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    let t = now;
    for (const tone of TONES[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.value = tone.freq;
      const g = tone.gain ?? 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(g, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.durMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + tone.durMs / 1000 + 0.02);
      t += tone.durMs / 1000;
    }
  },

  vibrate(name: SoundName) {
    const pattern = HAPTICS[name];
    if (pattern === undefined) return;
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  },

  isUnlocked() {
    return unlocked;
  },
};

export type Juice = typeof juice;
