"use client";

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.14, delay = 0) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {
    /* ignore */
  }
}

export const snd = {
  click: () => tone(440, 0.06, "square", 0.04),
  ok: () => tone(660, 0.12, "triangle"),
  bad: () => tone(170, 0.28, "sawtooth", 0.1),
  ding: () => {
    tone(880, 0.14, "sine");
    tone(1318, 0.2, "sine", 0.07, 0.09);
  },
  draw: () => tone(520, 0.08, "triangle", 0.08),
  thud: () => tone(110, 0.16, "square", 0.14),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, "triangle", 0.12, i * 0.13)),
};
