import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, Keyboard as KeyboardIcon, Mic, PenLine, Fingerprint } from "lucide-react";
import { SectionHeading } from "../ui";
import KeyboardLab from "./KeyboardLab";
import PointerLab from "./PointerLab";
import VoiceLab from "./VoiceLab";
import GestureLab from "./GestureLab";
import MotionLab from "./MotionLab";
import { sfx } from "../../lib/audio";

const TABS = [
  {
    id: "keyboard",
    label: "Keyboard",
    icon: KeyboardIcon,
    intro: "Modalitas paling klasik: sirkuit tombol → kode digital. Fokuskan area, lalu tekan apa saja.",
    Component: KeyboardLab,
  },
  {
    id: "pointer",
    label: "Sentuhan & Mouse",
    icon: Fingerprint,
    intro: "Pointer mengubah posisi fisik jari/kursor menjadi koordinat (x, y). Coba multi-sentuh!",
    Component: PointerLab,
  },
  {
    id: "suara",
    label: "Suara",
    icon: Mic,
    intro: "Bicaralah — komputer menyampling gelombang suara, menyalinnya jadi teks, lalu menjawab.",
    Component: VoiceLab,
  },
  {
    id: "gestur",
    label: "Gestur",
    icon: PenLine,
    intro: "Gambar sebuah pola; komputer mengekstraksi fitur lintasan dan menebak maksudmu.",
    Component: GestureLab,
  },
  {
    id: "gerakan",
    label: "Gerakan",
    icon: Compass,
    intro: "Sensor IMU membaca kemiringan perangkat menjadi vektor gravitasi yang menggelindingkan bola.",
    Component: MotionLab,
  },
];

export default function LabsSection() {
  const [active, setActive] = useState("keyboard");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <section id="lab" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-20 blur-[140px]"
        style={{ background: "radial-gradient(ellipse, rgba(43,228,255,0.35), rgba(255,61,138,0.2), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeading
          index="02 — LABORATORIUM INPUT"
          title="Lima cara berbicara"
          italic="dengan mesin."
          sub="Setiap stasiun di bawah ini BENAR-BENAR berfungsi. Berikan input, dan perhatikan panel pipeline di sampingnya: data mentah ditangkap, diolah, lalu dijawab komputer — persis siklus IMK yang barusan kamu pelajari."
        />

        {/* tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const on = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => { sfx.tap(); setActive(t.id); }}
                className={`relative flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] font-bold tracking-wider transition-colors duration-300 ${
                  on ? "text-ink" : "border border-white/10 bg-white/2 text-muted hover:border-white/25 hover:text-paper"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="tabPill"
                    className="absolute inset-0 rounded-full bg-cyan shadow-[0_0_30px_rgba(43,228,255,0.4)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <t.icon className="relative z-10 size-3.5" />
                <span className="relative z-10">{t.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={active + "-intro"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-7 font-serif-accent text-sm italic text-muted md:text-base"
          >
            — {tab.intro}
          </motion.p>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <tab.Component />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
