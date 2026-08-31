import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Heart, Volume2, Vibrate, MessageSquareText, Waves, Sparkles, Play } from "lucide-react";
import { SectionHeading } from "./ui";
import { buzz, hapticSupported, playTone, speak } from "../lib/audio";
import { C, hexToRgba } from "../lib/theme";

let pid = 0;

function VisualCard() {
  const [parts, setParts] = useState<{ id: number; x: number; y: number; r: number; c: string; s: number }[]>([]);
  const [flash, setFlash] = useState(false);
  const colors = [C.cyan, C.magenta, C.lime, C.violet, C.amber];
  const burst = () => {
    playTone({ freq: 660, to: 990, dur: 0.18, type: "triangle", gain: 0.08 });
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    const n = Array.from({ length: 30 }).map(() => ({
      id: ++pid,
      x: (Math.random() - 0.5) * 300,
      y: -40 - Math.random() * 200,
      r: Math.random() * 720 - 360,
      c: colors[Math.floor(Math.random() * colors.length)],
      s: 4 + Math.random() * 8,
    }));
    setParts((p) => [...p.slice(-40), ...n]);
    setTimeout(() => setParts((p) => p.filter((q) => !n.some((m) => m.id === q.id))), 1300);
  };
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/8 bg-white/2 p-6 transition-colors duration-500 hover:border-cyan/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan"><Eye className="size-5" /></span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-cyan">KANAL 01 — MATA</span>
      </div>
      <h3 className="font-display text-lg font-bold">Umpan Balik Visual</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
        Kanal terpadat informasi: warna, gerak, cahaya, bentuk. Layar adalah "suara" utama komputer.
      </p>
      <div
        className={`relative mt-4 grid h-36 place-items-center overflow-hidden rounded-2xl border border-white/8 bg-black/40 transition-colors duration-200 ${flash ? "bg-cyan/10" : ""}`}
      >
        <AnimatePresence>
          {parts.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 30, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.4, rotate: p.r }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.15, ease: [0.1, 0.8, 0.4, 1] }}
              className="absolute rounded-sm"
              style={{ width: p.s, height: p.s, background: p.c, boxShadow: `0 0 10px ${p.c}` }}
            />
          ))}
        </AnimatePresence>
        {!parts.length && <span className="font-mono text-[10px] tracking-[0.3em] text-white/25">PRATINJAU VISUAL</span>}
      </div>
      <button onClick={burst} className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan px-5 py-2.5 font-mono text-[11px] font-bold tracking-widest text-ink transition-shadow hover:shadow-[0_0_30px_rgba(43,228,255,0.45)]">
        <Sparkles className="size-3.5" /> PICU LEDAKAN VISUAL
      </button>
      <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-muted">contoh nyata: notifikasi, animasi, indikator baterai, highlight tombol</p>
    </div>
  );
}

function AudioCard() {
  const [playing, setPlaying] = useState("");
  const waves: { name: string; type: OscillatorType; f: number; desc: string }[] = [
    { name: "SINUS", type: "sine", f: 440, desc: "halus & murni" },
    { name: "SEGITIGA", type: "triangle", f: 392, desc: "lembut bergram" },
    { name: "KOTAK", type: "square", f: 330, desc: "retro games" },
    { name: "GERGAJI", type: "sawtooth", f: 262, desc: "kasar elektrik" },
  ];
  const play = (w: (typeof waves)[0]) => {
    setPlaying(w.name);
    [w.f, w.f * 1.25, w.f * 1.5].forEach((f, i) => playTone({ freq: f, dur: 0.3, type: w.type, gain: 0.08, delay: i * 0.09 }));
    setTimeout(() => setPlaying(""), 620);
  };
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/8 bg-white/2 p-6 transition-colors duration-500 hover:border-lime/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-xl border border-lime/30 bg-lime/10 text-lime"><Volume2 className="size-5" /></span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-lime">KANAL 02 — TELINGA</span>
      </div>
      <h3 className="font-display text-lg font-bold">Umpan Balik Audio</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
        Bunyi tidak butuh tatapan — sempurna untuk notifikasi, alarm, dan konfirmasi. Keempat nada ini disintesis langsung oleh komputermu.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {waves.map((w) => (
          <button
            key={w.name}
            onClick={() => play(w)}
            className={`group flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-300 ${
              playing === w.name ? "border-lime/60 bg-lime/10" : "border-white/10 bg-black/30 hover:border-lime/40"
            }`}
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${playing === w.name ? "bg-lime text-ink" : "bg-white/5 text-lime"}`}>
              {playing === w.name ? (
                <span className="flex items-end gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="animate-eq w-[3px] rounded bg-ink" style={{ height: 12, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              ) : (
                <Play className="size-3" />
              )}
            </span>
            <span>
              <span className="block font-mono text-[10px] font-bold tracking-wider text-paper">{w.name}</span>
              <span className="block text-[10px] text-muted">{w.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-muted">contoh nyata: nada notifikasi, bunyi kunci mobil, suara asisten, beep error</p>
    </div>
  );
}

function HapticCard() {
  const ok = hapticSupported();
  const [fired, setFired] = useState("");
  const patterns: { name: string; p: number | number[]; desc: string }[] = [
    { name: "KETUKAN", p: 40, desc: "konfirmasi cepat" },
    { name: "GANDA", p: [50, 70, 50], desc: "seperti double-tap" },
    { name: "DETAK JANTUNG", p: [70, 90, 70, 220, 110], desc: "ritmis emosional" },
    { name: "ALARM", p: [120, 60, 120, 60, 240], desc: "mendesak!" },
  ];
  const fire = (pt: (typeof patterns)[0]) => {
    setFired(pt.name);
    buzz(pt.p);
    playTone({ freq: 90, dur: 0.09, type: "sine", gain: 0.12 });
    setTimeout(() => setFired(""), 900);
  };
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/8 bg-white/2 p-6 transition-colors duration-500 hover:border-magenta/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-xl border border-magenta/30 bg-magenta/10 text-magenta"><Vibrate className="size-5" /></span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-magenta">KANAL 03 — KULIT</span>
      </div>
      <h3 className="font-display text-lg font-bold">Umpan Balik Haptik</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
        Motor getar kecil (ERM/LRA) menyentuh indra peraba. Pola yang berbeda membawa makna yang berbeda.
      </p>
      <div className="relative mt-4 grid grid-cols-2 gap-2">
        {patterns.map((pt) => (
          <button
            key={pt.name}
            onClick={() => fire(pt)}
            className={`cursor-pointer rounded-xl border p-3 text-left transition-all duration-300 ${
              fired === pt.name ? "animate-shake border-magenta/60 bg-magenta/10" : "border-white/10 bg-black/30 hover:border-magenta/40"
            }`}
          >
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-paper">
              <Heart className={`size-3 ${fired === pt.name ? "animate-pulse text-magenta" : "text-magenta/60"}`} />
              {pt.name}
            </span>
            <span className="mt-0.5 block text-[10px] text-muted">{pt.desc}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-muted" style={{ color: ok ? undefined : C.amber }}>
        {ok ? "ponselmu bergetar sungguhan — di desktop, lihat kartu yang ikut bergetar" : "perangkat ini tak mendukung getar — kartu bergetar sebagai simulasi visual"}
      </p>
    </div>
  );
}

function SpeechCard() {
  const [speaking, setSpeaking] = useState(false);
  const sentence = "Halo! Aku sedang berbicara denganmu. Ini umpan balik berbasis bahasa, dirangkai dari data menjadi kata.";
  const [typed, setTyped] = useState(sentence.length);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const go = () => {
    if (speaking) return;
    setSpeaking(true);
    setTyped(0);
    clearInterval(timer.current);
    timer.current = setInterval(() => setTyped((t) => Math.min(sentence.length, t + 2)), 32);
    speak(sentence, () => { setSpeaking(false); setTyped(sentence.length); clearInterval(timer.current); });
  };
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/8 bg-white/2 p-6 transition-colors duration-500 hover:border-violet/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-xl border border-violet/30 bg-violet/10 text-violet"><MessageSquareText className="size-5" /></span>
        <span className="font-mono text-[10px] tracking-[0.25em] text-violet">KANAL 04 — MAKNA</span>
      </div>
      <h3 className="font-display text-lg font-bold">Teks & Bahasa</h3>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
        Kanal paling padat makna: komputer menyusun data menjadi kata — pesan error, caption, hingga jawaban asisten virtual.
      </p>
      <div className="mt-4 min-h-20 rounded-2xl border border-white/8 bg-black/40 p-4">
        <p className="font-mono text-[11px] leading-relaxed text-paper/90">
          {sentence.slice(0, typed)}
          {speaking && <span className="animate-pulse text-violet">▌</span>}
        </p>
      </div>
      <button
        onClick={go}
        className={`mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2.5 font-mono text-[11px] font-bold tracking-widest transition-all duration-300 ${
          speaking ? "border-violet/60 bg-violet/15 text-violet" : "border-violet/40 text-violet hover:bg-violet hover:text-ink hover:shadow-[0_0_30px_rgba(139,124,255,0.4)]"
        }`}
      >
        <Waves className={`size-3.5 ${speaking ? "animate-pulse" : ""}`} />
        {speaking ? "KOMPUTER BERBICARA…" : "BICARAKAN & KETIK"}
      </button>
      <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-muted">contoh nyata: "password salah", caption otomatis, balasan chatbot</p>
    </div>
  );
}

export default function FeedbackGallery() {
  return (
    <section id="umpan-balik" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div
        className="pointer-events-none absolute right-[-200px] top-20 h-[420px] w-[420px] rounded-full opacity-15 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(255,61,138,0.5), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeading
          index="04 — GALERI UMPAN BALIK"
          title="Komputer menjawab lewat"
          italic="indra kita."
          sub="Tanpa umpan balik, interaksi adalah kegelapan — kamu tak tahu apakah mesin mendengarmu. Rasakan keempat kanal utamanya di bawah ini."
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[VisualCard, AudioCard, HapticCard, SpeechCard].map((Card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Card />
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-10 max-w-2xl text-center font-serif-accent text-base italic leading-relaxed text-muted md:text-lg"
        >
          Desainer IMK yang baik selalu menggabungkan kanal —{" "}
          <span style={{ color: hexToRgba(C.paper, 1) }}>tombol yang menyala, berbunyi klik DAN bergetar</span>{" "}
          jauh lebih meyakinkan daripada yang diam membeku.
        </motion.p>
      </div>
    </section>
  );
}
