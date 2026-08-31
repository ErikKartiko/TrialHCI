import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, Check, RotateCcw, X } from "lucide-react";
import { SectionHeading } from "./ui";
import { sfx } from "../lib/audio";

interface Q {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

const QUESTIONS: Q[] = [
  {
    q: "Urutan siklus interaksi manusia–komputer yang benar adalah…",
    options: ["Input → Umpan balik → Pemrosesan", "Input → Pemrosesan → Umpan balik", "Pemrosesan → Input → Umpan balik", "Umpan balik → Input → Pemrosesan"],
    answer: 1,
    explain: "Manusia memberi input, komputer memprosesnya, lalu mengembalikan umpan balik. Manusia menilai respons itu dan siklus berulang.",
  },
  {
    q: "Manakah yang BUKAN modalitas input bagi komputer?",
    options: ["Menekan tombol keyboard", "Berbicara ke mikrofon", "Layar menampilkan gambar", "Menggoyangkan ponsel"],
    answer: 2,
    explain: "Layar menampilkan gambar adalah OUTPUT (umpan balik visual). Yang lain adalah cara manusia memasukkan data ke komputer.",
  },
  {
    q: "Getaran ponsel saat pesan masuk termasuk umpan balik…",
    options: ["Visual", "Audio", "Haptik", "Teks"],
    answer: 2,
    explain: "Haptik memanfaatkan indra peraba lewat motor getar — efektif saat mata dan telinga sedang sibuk.",
  },
  {
    q: "Saat kamu menekan tombol 'A', data pertama yang diterima komputer adalah…",
    options: ["Huruf 'A' siap cetak", "Gambar huruf A", "Kode tombol fisik (key code)", "Perintah untuk menampilkan huruf"],
    answer: 2,
    explain: "Keyboard mengirim kode sirkuit fisik — sistem operasi yang memetakannya menjadi karakter 'A'. Itulah mengapa di lab tadi kamu melihat event.code.",
  },
  {
    q: "Speech recognition (pengenalan suara) adalah contoh tahap…",
    options: ["Input", "Pemrosesan", "Umpan balik", "Penyimpanan"],
    answer: 1,
    explain: "Suara adalah input mentah; speech recognition adalah PEMROSESAN yang mengubah gelombang suara menjadi data teks.",
  },
  {
    q: "Teknologi yang memungkinkan komputer 'melihat' gerakan tangan lewat kamera disebut…",
    options: ["Umpan balik haptik", "Text-to-speech", "Computer vision (visi komputer)", "Kompilasi kode sumber"],
    answer: 2,
    explain: "Visi komputer mengubah piksel menjadi data bermakna: 21 titik sendi tangan, 33 titik kerangka tubuh, 478 titik wajah — persis seperti di Studio Visi.",
  },
];

export default function Quiz() {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[qi];
  const progress = done ? 100 : (qi / QUESTIONS.length) * 100;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) {
      setScore((s) => s + 1);
      sfx.success();
    } else {
      sfx.error();
    }
  };

  const next = () => {
    if (qi === QUESTIONS.length - 1) setDone(true);
    else {
      setQi((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    setQi(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    sfx.tap();
  };

  const pct = Math.round((score / QUESTIONS.length) * 100);
  const grade =
    pct === 100 ? "SEMPURNA — kamu berpikir seperti desainer interaksi." :
    pct >= 80 ? "Hebat! Siklus IMK sudah tertanam di kepalamu." :
    pct >= 60 ? "Bagus — ulangi lab sekali lagi untuk memantapkan." :
    "Coba jelajahi lab di atas lagi, lalu kembali ke sini.";

  return (
    <section id="kuis" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_55%_50%_at_50%_50%,black,transparent)]" />
      <div className="relative mx-auto max-w-3xl">
        <SectionHeading
          index="05 — UJI PEMAHAMAN"
          title="Buktikan kamu"
          italic="paham siklusnya."
          sub="Enam pertanyaan cepat. Setiap jawaban langsung diberi umpan balik — tentu saja, itulah inti IMK."
        />

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/2"
        >
          {/* progress */}
          <div className="relative h-1 bg-white/8">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan via-violet to-magenta"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div
                key={qi}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="p-6 md:p-10"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-muted">
                    <BrainCircuit className="size-3.5 text-violet" />
                    PERTANYAAN {qi + 1}/{QUESTIONS.length}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-lime">SKOR {score}</span>
                </div>

                <h3 className="font-display text-xl font-bold leading-snug md:text-2xl">{q.q}</h3>

                <div className="mt-7 space-y-2.5">
                  {q.options.map((opt, i) => {
                    const isPicked = picked === i;
                    const isRight = picked !== null && i === q.answer;
                    const isWrong = isPicked && i !== q.answer;
                    return (
                      <button
                        key={i}
                        onClick={() => pick(i)}
                        disabled={picked !== null}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-left text-sm transition-all duration-300 disabled:cursor-default md:text-[15px] ${
                          isRight
                            ? "border-lime/60 bg-lime/10 text-lime shadow-[0_0_26px_rgba(184,245,61,0.12)]"
                            : isWrong
                            ? "animate-shake border-magenta/60 bg-magenta/10 text-magenta"
                            : picked !== null
                            ? "border-white/8 bg-white/1 text-white/30"
                            : "border-white/10 bg-white/2 text-paper hover:border-cyan/50 hover:bg-cyan/5"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`grid size-6 shrink-0 place-items-center rounded-md border font-mono text-[10px] font-bold ${
                            isRight ? "border-lime/50" : isWrong ? "border-magenta/50" : "border-white/15 text-muted"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </span>
                        {isRight && <Check className="size-4 shrink-0" />}
                        {isWrong && <X className="size-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {picked !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className={`mt-5 rounded-xl border-l-2 p-4 text-[13px] leading-relaxed ${
                        picked === q.answer ? "border-lime bg-lime/5 text-paper/90" : "border-magenta bg-magenta/5 text-paper/90"
                      }`}>
                        <span className={`mr-1 font-mono text-[10px] font-bold tracking-widest ${picked === q.answer ? "text-lime" : "text-magenta"}`}>
                          {picked === q.answer ? "TEPAT —" : "BELUM TEPAT —"}
                        </span>
                        {q.explain}
                      </p>
                      <button
                        onClick={next}
                        className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-paper px-6 py-2.5 font-mono text-[11px] font-bold tracking-widest text-ink transition-shadow hover:shadow-[0_0_26px_rgba(237,237,244,0.3)]"
                      >
                        {qi === QUESTIONS.length - 1 ? "LIHAT HASIL" : "LANJUT"} →
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center p-10 text-center"
              >
                <div className="relative grid size-40 place-items-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <motion.circle
                      cx="50" cy="50" r="44" fill="none" stroke={pct >= 80 ? "#B8F53D" : pct >= 60 ? "#2BE4FF" : "#FF3D8A"}
                      strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 44}
                      initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100) }}
                      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    />
                  </svg>
                  <div>
                    <p className="font-display text-4xl font-bold">{pct}<span className="text-lg text-muted">%</span></p>
                    <p className="font-mono text-[9px] tracking-[0.3em] text-muted">PEMAHAMAN</p>
                  </div>
                </div>
                <p className="mt-6 max-w-md font-serif-accent text-lg italic leading-relaxed text-paper/90">“{grade}”</p>
                <p className="mt-2 font-mono text-[11px] text-muted">{score} dari {QUESTIONS.length} benar</p>
                <button
                  onClick={restart}
                  className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/3 px-6 py-2.5 font-mono text-[11px] font-bold tracking-widest text-paper transition-all hover:border-cyan/50 hover:text-cyan"
                >
                  <RotateCcw className="size-3.5" /> ULANGI KUIS
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
