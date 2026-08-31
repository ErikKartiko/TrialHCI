/* Mesin audio kecil berbasis Web Audio API + Text-to-Speech.
   Semua suara disintesis secara real-time — ini sendiri contoh
   "umpan balik audio" yang dihasilkan komputer. */

let ctx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export interface ToneOpts {
  freq?: number;
  to?: number; // glide ke frekuensi ini
  dur?: number; // detik
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

export function playTone({ freq = 440, to, dur = 0.18, type = "sine", gain = 0.12, delay = 0 }: ToneOpts) {
  try {
    const ac = getAudioCtx();
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* audio tidak tersedia */
  }
}

export function playChord(freqs: number[], opts: Omit<ToneOpts, "freq"> = {}) {
  freqs.forEach((f, i) => playTone({ ...opts, freq: f, delay: (opts.delay ?? 0) + i * 0.045 }));
}

export const sfx = {
  tap: () => playTone({ freq: 620, to: 880, dur: 0.08, type: "triangle", gain: 0.08 }),
  success: () => playChord([523.25, 659.25, 783.99], { dur: 0.22, type: "triangle", gain: 0.09 }),
  error: () => playTone({ freq: 180, to: 90, dur: 0.3, type: "sawtooth", gain: 0.07 }),
  whoosh: () => playTone({ freq: 900, to: 150, dur: 0.25, type: "sine", gain: 0.07 }),
};

/* ---- Text to speech ---- */
export function speak(text: string, onEnd?: () => void) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) { onEnd?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = 1.02;
    u.pitch = 1;
    const voices = synth.getVoices();
    const id = voices.find((v) => v.lang.toLowerCase().startsWith("id"));
    if (id) u.voice = id;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    synth.speak(u);
  } catch {
    onEnd?.();
  }
}

/* ---- Haptik ---- */
export const hapticSupported = () => typeof navigator !== "undefined" && "vibrate" in navigator;
export function buzz(pattern: number | number[]) {
  try {
    if (hapticSupported()) navigator.vibrate(pattern);
  } catch { /* abaikan */ }
}
