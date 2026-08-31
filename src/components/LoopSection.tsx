import { motion } from "framer-motion";
import { Cpu, Hand, Mic, MousePointerClick, Radar, Speaker, Eye, Vibrate, Activity, Keyboard, Repeat, Camera } from "lucide-react";
import { SectionHeading, Tag } from "./ui";
import { scrollToId } from "../lib/scroll";
import { sfx } from "../lib/audio";

const stages = [
  {
    no: "01",
    title: "INPUT",
    who: "dari manusia",
    icon: Hand,
    color: "cyan" as const,
    desc: "Manusia mengekspresikan maksud lewat tubuh: suara, jari, tangan, mata, hingga gerakan seluruh badan. Perangkat keras mengubahnya menjadi sinyal digital.",
    chips: [
      { icon: Mic, label: "Suara" },
      { icon: MousePointerClick, label: "Sentuhan" },
      { icon: Keyboard, label: "Keyboard" },
      { icon: Radar, label: "Gestur" },
      { icon: Activity, label: "Gerakan" },
      { icon: Camera, label: "Kamera" },
    ],
  },
  {
    no: "02",
    title: "PEMROSESAN",
    who: "oleh komputer",
    icon: Cpu,
    color: "violet" as const,
    desc: "Komputer menerima sinyal mentah, menerjemahkannya menjadi data, menjalankan logika — mengenali pola, menghitung, memutuskan — dalam hitungan milidetik.",
    chips: [
      { icon: null, label: "Konversi sinyal" },
      { icon: null, label: "Pengenalan pola" },
      { icon: null, label: "Kalkulasi" },
      { icon: null, label: "Pengambilan keputusan" },
    ],
  },
  {
    no: "03",
    title: "UMPAN BALIK",
    who: "kembali ke manusia",
    icon: Speaker,
    color: "magenta" as const,
    desc: "Komputer menjawab lewat indra kita: cahaya di layar, bunyi dari speaker, getaran di telapak tangan. Umpan balik inilah yang membuat interaksi terasa hidup.",
    chips: [
      { icon: Eye, label: "Visual" },
      { icon: Speaker, label: "Audio" },
      { icon: Vibrate, label: "Haptik" },
      { icon: null, label: "Teks" },
    ],
  },
];

const tone: Record<string, { border: string; text: string; bg: string; glow: string; bar: string }> = {
  cyan: { border: "hover:border-cyan/50", text: "text-cyan", bg: "bg-cyan/10", glow: "rgba(43,228,255,0.12)", bar: "bg-cyan" },
  violet: { border: "hover:border-violet/50", text: "text-violet", bg: "bg-violet/10", glow: "rgba(139,124,255,0.12)", bar: "bg-violet" },
  magenta: { border: "hover:border-magenta/50", text: "text-magenta", bg: "bg-magenta/10", glow: "rgba(255,61,138,0.12)", bar: "bg-magenta" },
};

function HConnector({ color }: { color: string }) {
  return (
    <div className="relative hidden h-px flex-1 self-center lg:block">
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/25 to-white/10" />
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="flow-dot absolute top-1/2 left-0 size-1.5 rounded-full"
          style={{ background: color, animationDelay: `${i * 0.5}s`, boxShadow: `0 0 10px ${color}` }}
        />
      ))}
    </div>
  );
}

export default function LoopSection() {
  return (
    <section id="siklus" className="relative overflow-hidden px-6 py-24 md:py-36">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <SectionHeading
          index="01 — SIKLUS INTERAKSI"
          title="Satu percakapan,"
          italic="tiga babak."
          sub="Inti dari Interaksi Manusia dan Komputer (IMK/HCI) adalah sebuah loop tanpa henti: kamu bertindak → mesin mengolah → mesin menjawab → kamu menilai jawabannya dan bertindak lagi. Pahami tiga fasenya di bawah ini."
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
          {stages.map((s, i) => {
            const t = tone[s.color];
            const connectorColor = s.color === "cyan" ? "#2BE4FF" : s.color === "violet" ? "#8B7CFF" : "#FF3D8A";
            return (
              <div key={s.no} className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
                <motion.div
                  initial={{ opacity: 0, y: 34 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                  className={`group relative flex-1 overflow-hidden rounded-3xl border border-white/8 bg-white/2 p-6 transition-all duration-500 md:p-7 ${t.border}`}
                  style={{ ["--g" as any]: t.glow }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 60px ${t.glow}`)}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: t.glow }} />
                  <div className="mb-5 flex items-start justify-between">
                    <span className={`grid size-12 place-items-center rounded-2xl border border-white/10 ${t.bg} ${t.text} transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="font-mono text-4xl font-bold text-white/6 transition-colors duration-500 group-hover:text-white/12">
                      {s.no}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold tracking-tight md:text-2xl">
                    {s.title}
                    <span className="font-serif-accent ml-2 text-base font-normal italic text-muted">{s.who}</span>
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted md:text-sm">{s.desc}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {s.chips.map((c) => (
                      <Tag key={c.label} color={s.color}>
                        {c.icon && <c.icon className="size-3" />}
                        {c.label}
                      </Tag>
                    ))}
                  </div>
                  <div className={`absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${t.bar}`} />
                </motion.div>
                {i < stages.length - 1 && (
                  <>
                    <HConnector color={connectorColor} />
                    <div className="relative mx-auto h-9 w-px bg-white/10 lg:hidden">
                      <span
                        className="flow-dot-v absolute left-1/2 size-1.5 rounded-full"
                        style={{ background: connectorColor, boxShadow: `0 0 10px ${connectorColor}` }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* loop-back */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mx-auto mt-6 max-w-3xl"
        >
          <svg viewBox="0 0 600 70" className="w-full" fill="none">
            <path d="M530 2 C530 40 70 40 70 2" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="5 6" />
            <circle r="3.5" fill="#B8F53D">
              <animateMotion dur="3s" repeatCount="indefinite" path="M530 2 C530 40 70 40 70 2" />
            </circle>
            <path d="M70 2 l-7 -1 m7 1 l-1 -7" stroke="#B8F53D" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="absolute inset-x-0 -bottom-1 text-center font-mono text-[10px] tracking-[0.28em] text-lime/80">
            <Repeat className="mr-1.5 inline size-3 -translate-y-px" />
            MANUSIA MENILAI RESPONS → INPUT BARU → LOOP BERULANG
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-16 flex justify-center"
        >
          <button
            onClick={() => { sfx.tap(); scrollToId("#lab"); }}
            className="group inline-flex cursor-pointer items-center gap-3 rounded-full border border-lime/40 bg-lime/5 px-7 py-3.5 font-mono text-xs font-bold tracking-widest text-lime transition-all duration-300 hover:bg-lime hover:text-ink hover:shadow-[0_0_40px_rgba(184,245,61,0.4)]"
          >
            COBA KETIGA FASENYA DI LABORATORIUM
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
