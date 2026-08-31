import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Aperture, Eye, Hand, PersonStanding, ScanFace, ShieldCheck } from "lucide-react";
import { SectionHeading } from "../ui";
import FingerPaintLab from "./FingerPaintLab";
import PoseLab from "./PoseLab";
import PhotoArtLab from "./PhotoArtLab";
import GazeLab from "./GazeLab";
import ExpressionLab from "./ExpressionLab";
import { sfx } from "../../lib/audio";

const TABS = [
  {
    id: "jari",
    label: "Lukisan Jari",
    icon: Hand,
    intro: "21 titik sendi tanganmu dijadikan pena digital — menggambarlah di udara.",
    Component: FingerPaintLab,
  },
  {
    id: "pose",
    label: "Pose Tubuh",
    icon: PersonStanding,
    intro: "33 titik kerangka dilacak live — komputer menghitung energi gerakan dan mengenali pose.",
    Component: PoseLab,
  },
  {
    id: "foto",
    label: "Foto → Grafis",
    icon: Aperture,
    intro: "Potret dirimu, lalu saksikan foto diubah menjadi mozaik piksel, lukisan ASCII, atau peta kontur.",
    Component: PhotoArtLab,
  },
  {
    id: "mata",
    label: "Pelacak Mata",
    icon: Eye,
    intro: "Iris matamu dilacak — komputer menebak ke arah mana kamu memandang di layar.",
    Component: GazeLab,
  },
  {
    id: "ekspresi",
    label: "Ekspresi Wajah",
    icon: ScanFace,
    intro: "52 bobot otot wajah (blendshape) dibaca live — senyum, cemberut, terkejut, marah dikenali mesin.",
    Component: ExpressionLab,
  },
];

export default function VisionSection() {
  const [active, setActive] = useState("jari");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <section id="studio" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div
        className="pointer-events-none absolute -left-52 top-32 h-[500px] w-[500px] rounded-full opacity-15 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(139,124,255,0.5), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeading
          index="03 — STUDIO VISI KOMPUTER"
          title="Saat komputer belajar"
          italic="melihat."
          sub="Kamera hanyalah awal — visi komputer (computer vision) mengubah piksel mentah menjadi pemahaman: sendi tangan, kerangka tubuh, arah tatapan, hingga ekspresi. Kelima stasiun ini memakai model AI yang berjalan langsung di browser-mu."
        />

        {/* tab bar */}
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
                    layoutId="visionTabPill"
                    className="absolute inset-0 rounded-full bg-violet shadow-[0_0_30px_rgba(139,124,255,0.45)]"
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
          <motion.div
            key={active + "-meta"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-7"
          >
            <p className="font-serif-accent text-sm italic text-muted md:text-base">— {tab.intro}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/5 px-3 py-1 font-mono text-[9px] tracking-[0.2em] text-lime/90">
              <ShieldCheck className="size-3" />
              ON-DEVICE AI — VIDEO & FOTO TIDAK PERNAH MENINGGALKAN PERANGKATMU
            </p>
          </motion.div>
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
