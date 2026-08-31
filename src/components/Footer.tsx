import { motion } from "framer-motion";
import { ArrowUp, Cpu, Hand, Repeat } from "lucide-react";

const RECAP_INPUT = ["Suara", "Sentuhan", "Keyboard", "Gestur", "Gerakan", "Kamera & Visi"];
const RECAP_OUT = ["Visual", "Audio", "Haptik", "Teks & Bahasa"];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/8 px-6 pb-10 pt-16">
      <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[600px] rounded-full bg-cyan/5 blur-[100px]" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] text-muted">
            <span className="flex items-center gap-1.5 text-cyan"><Hand className="size-3" /> MANUSIA</span>
            <span className="text-white/25">→</span>
            <span className="flex items-center gap-1.5 text-violet"><Cpu className="size-3" /> MESIN</span>
            <span className="text-white/25">→</span>
            <span className="flex items-center gap-1.5 text-magenta"><Repeat className="size-3" /> MANUSIA LAGI</span>
          </div>
          <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.6rem,4vw,2.8rem)] font-bold leading-tight tracking-tight">
            Setiap teknologi hebat dimulai dari{" "}
            <span className="font-serif-accent font-normal italic text-magenta">satu siklus sederhana.</span>
          </h2>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {RECAP_INPUT.map((w) => (
              <span key={w} className="rounded-full border border-cyan/25 bg-cyan/5 px-3.5 py-1.5 font-mono text-[10px] tracking-wider text-cyan">
                IN · {w.toUpperCase()}
              </span>
            ))}
            {RECAP_OUT.map((w) => (
              <span key={w} className="rounded-full border border-magenta/25 bg-magenta/5 px-3.5 py-1.5 font-mono text-[10px] tracking-wider text-magenta">
                OUT · {w.toUpperCase()}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-6 md:flex-row">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
            IMK<span className="text-cyan">.</span>LAB — EKSPERIMEN INTERAKSI MANUSIA & KOMPUTER
          </p>
          <p className="font-mono text-[10px] tracking-wider text-white/25">
            seluruh suara & visual disintesis real-time di browser-mu
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="grid size-10 cursor-pointer place-items-center rounded-full border border-white/15 text-muted transition-all hover:border-cyan hover:text-cyan"
            aria-label="ke atas"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
