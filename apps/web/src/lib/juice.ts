"use client";

export type SoundName =
  | "countdown_tick"
  | "signal_go"
  | "action_ok"
  | "action_rejected"
  | "danger_alert"
  | "tension_loop"
  | "elimination_self"
  | "elimination_other"
  | "round_win"
  | "phase_change"
  | "victory_fanfare"
  | "credit_gain"
  | "checkin_ok"
  | "_unlock"
  // Backward-compatible aliases already used by the application.
  | "tap"
  | "error"
  | "success"
  | "eliminated"
  | "win";

export type VibePattern = "tap" | "success" | "error" | "danger" | "elimination";

type Tone = { freq: number; durMs: number; type?: OscillatorType; gain?: number; delayMs?: number };

const TONES: Record<SoundName, Tone[]> = {
  countdown_tick: [{ freq: 660, durMs: 68, type: "square", gain: 0.1 }],
  signal_go: [
    { freq: 720, durMs: 90, type: "triangle", gain: 0.14 },
    { freq: 980, durMs: 145, type: "triangle", gain: 0.15 },
  ],
  action_ok: [{ freq: 520, durMs: 70, type: "triangle", gain: 0.11 }],
  action_rejected: [
    { freq: 190, durMs: 115, type: "square", gain: 0.14 },
    { freq: 145, durMs: 160, type: "sawtooth", gain: 0.12 },
  ],
  danger_alert: [
    { freq: 170, durMs: 190, type: "sawtooth", gain: 0.14 },
    { freq: 125, durMs: 240, type: "sawtooth", gain: 0.14 },
  ],
  tension_loop: [{ freq: 78, durMs: 220, type: "sine", gain: 0.12 }],
  elimination_self: [
    { freq: 310, durMs: 130, type: "sawtooth", gain: 0.18 },
    { freq: 155, durMs: 310, type: "sawtooth", gain: 0.18 },
  ],
  elimination_other: [{ freq: 185, durMs: 135, type: "sawtooth", gain: 0.11 }],
  round_win: [
    { freq: 523, durMs: 95, type: "triangle", gain: 0.13 },
    { freq: 659, durMs: 115, type: "triangle", gain: 0.13 },
    { freq: 784, durMs: 170, type: "triangle", gain: 0.15 },
  ],
  phase_change: [
    { freq: 260, durMs: 80, type: "sine", gain: 0.08 },
    { freq: 520, durMs: 150, type: "triangle", gain: 0.1 },
  ],
  victory_fanfare: [
    { freq: 523, durMs: 105, type: "triangle", gain: 0.16 },
    { freq: 659, durMs: 105, type: "triangle", gain: 0.16 },
    { freq: 784, durMs: 105, type: "triangle", gain: 0.16 },
    { freq: 1046, durMs: 240, type: "triangle", gain: 0.18 },
  ],
  credit_gain: [
    { freq: 900, durMs: 55, type: "square", gain: 0.08 },
    { freq: 1180, durMs: 85, type: "square", gain: 0.08 },
  ],
  checkin_ok: [
    { freq: 440, durMs: 75, type: "triangle", gain: 0.1 },
    { freq: 660, durMs: 115, type: "triangle", gain: 0.12 },
  ],
  _unlock: [{ freq: 40, durMs: 30, type: "sine", gain: 0.0001 }],
  tap: [{ freq: 420, durMs: 42, type: "triangle", gain: 0.08 }],
  error: [],
  success: [],
  eliminated: [],
  win: [],
};

const ALIASES: Partial<Record<SoundName, SoundName>> = {
  error: "action_rejected",
  success: "action_ok",
  eliminated: "elimination_self",
  win: "victory_fanfare",
};

const VIBES: Record<VibePattern, number | number[]> = {
  tap: 14,
  success: [28, 36, 55],
  error: [72, 42, 72],
  danger: [170, 85, 170],
  elimination: 360,
};

let context: AudioContext | null = null;
let unlocked = false;
let muted = false;
let initialized = false;

function initializePreference() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  muted = window.localStorage.getItem("sfx-muted") === "1";
}

function audioConstructor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

function scheduleTone(audioContext: AudioContext, tone: Tone, startTime: number) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const duration = Math.max(0.02, tone.durMs / 1000);
  const level = Math.max(0.0001, tone.gain ?? 0.1);
  oscillator.type = tone.type ?? "sine";
  oscillator.frequency.setValueAtTime(tone.freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(level, startTime + Math.min(0.012, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

export const juice = {
  init() {
    initializePreference();
  },

  unlock() {
    initializePreference();
    if (typeof window === "undefined" || unlocked) return;
    try {
      const Constructor = audioConstructor();
      if (!Constructor) return;
      context = new Constructor();
      if (context.state === "suspended") void context.resume();
      unlocked = true;
      this.play("_unlock");
    } catch {
      unlocked = false;
      context = null;
    }
  },

  play(requestedName: SoundName) {
    initializePreference();
    if (muted || typeof window === "undefined") return;
    if (!unlocked) this.unlock();
    if (!context) return;
    if (context.state === "suspended") void context.resume();
    const name = ALIASES[requestedName] ?? requestedName;
    const sequence = TONES[name];
    let time = context.currentTime + 0.006;
    for (const tone of sequence) {
      time += (tone.delayMs ?? 0) / 1000;
      scheduleTone(context, tone, time);
      time += tone.durMs / 1000;
    }
  },

  vibrate(pattern: VibePattern | SoundName) {
    initializePreference();
    if (muted || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const normalized: VibePattern =
      pattern === "eliminated" || pattern === "elimination_self" ? "elimination" :
      pattern === "danger_alert" ? "danger" :
      pattern === "action_rejected" || pattern === "error" ? "error" :
      pattern === "action_ok" || pattern === "success" || pattern === "round_win" || pattern === "win" ? "success" :
      "tap";
    try {
      navigator.vibrate(VIBES[normalized]);
    } catch {
      // Vibration is optional and may be blocked by the browser.
    }
  },

  setMuted(value: boolean) {
    initializePreference();
    muted = value;
    if (typeof window !== "undefined") window.localStorage.setItem("sfx-muted", value ? "1" : "0");
    if (value && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
  },

  get isMuted() {
    initializePreference();
    return muted;
  },

  isUnlocked() {
    return unlocked;
  },
};

export type Juice = typeof juice;
