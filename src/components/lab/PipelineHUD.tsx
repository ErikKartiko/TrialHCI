import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Cpu, Hand, Radio } from "lucide-react";

export interface HudRow {
  label: string;
  value: string;
}

export interface PipelineData {
  inputTitle: string;
  inputIcon?: ReactNode;
  inputRows: HudRow[];
  processSteps: string[];
  feedback: { label: string; detail: string; color: "cyan" | "magenta" | "lime" | "violet" | "amber" }[];
  live: boolean;
  note?: string;
}

const colorMap: Record<string, { text: string; border: string; bg: string; glow: string; hex: string }> = {
  cyan: { text: "text-cyan", border: "border-cyan/25", bg: "bg-cyan/5", glow: "rgba(43,228,255,0.14)", hex: "#2BE4FF" },
  magenta: { text: "text-magenta", border: "border-magenta/25", bg: "bg-magenta/5", glow: "rgba(255,61,138,0.14)", hex: "#FF3D8A" },
  lime: { text: "text-lime", border: "border-lime/25", bg: "bg-lime/5", glow: "rgba(184,245,61,0.14)", hex: "#B8F53D" },
  violet: { text: "text-violet", border: "border-violet/25", bg: "bg-violet/5", glow: "rgba(139,124,255,0.14)", hex: "#8B7CFF" },
  amber: { text: "text-amber", border: "border-amber/25", bg: "bg-amber/5", glow: "rgba(255,197,61,0.14)", hex: "#FFC53D" },
};

function Block({
  step,
  title,
  icon,
  tone,
  live,
  children,
}: {
  step: string;
  title: string;
  icon: ReactNode;
  tone: "cyan" | "violet" | "magenta";
  live: boolean;
  children: ReactNode;
}) {
  const c = colorMap[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${live ? c.border : "border-white/8"}`}
      style={{
        background: live ? `linear-gradient(160deg, ${c.glow}, rgba(255,255,255,0.015) 55%)` : "rgba(255,255,255,0.02)",
        boxShadow: live ? `0 0 40px ${c.glow}` : "none",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-lg border ${live ? `${c.border} ${c.text}` : "border-white/10 text-muted"}`}>
            {icon}
          </span>
          <span className={`font-mono text-[10px] font-bold tracking-[0.25em] ${live ? c.text : "text-muted"}`}>
            {title}
          </span>
        </div>
        <span className={`font-mono text-[9px] tracking-widest ${live ? c.text : "text-white/20"}`}>{step}</span>
      </div>
      {children}
    </div>
  );
}

function Connector({ live, tone }: { live: boolean; tone: "cyan" | "magenta" }) {
  const c = colorMap[tone];
  return (
    <div className="relative mx-auto flex h-9 w-10 items-center justify-center">
      <div className={`relative h-full w-px ${live ? "bg-gradient-to-b from-white/25 via-white/40 to-white/25" : "bg-white/8"}`}>
        {live && (
          <span
            className="flow-dot-v absolute left-1/2 size-1.5 rounded-full"
            style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}` }}
          />
        )}
      </div>
      {live && <ArrowDown className={`absolute -bottom-1.5 size-3 ${c.text}`} />}
    </div>
  );
}

export default function PipelineHUD({ data }: { data: PipelineData }) {
  return (
    <div className="relative">
      {/* status strip */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-white/8 bg-white/2 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${data.live ? "animate-ping bg-lime opacity-60" : "bg-white/20"}`} />
            <span className={`relative inline-flex size-2 rounded-full ${data.live ? "bg-lime" : "bg-white/30"}`} />
          </span>
          <span className={`font-mono text-[10px] tracking-[0.25em] ${data.live ? "text-lime" : "text-muted"}`}>
            {data.live ? "SISTEM AKTIF" : "MENUNGGU MANUSIA"}
          </span>
        </div>
        <Radio className={`size-3.5 ${data.live ? "text-lime" : "text-white/25"}`} />
      </div>

      <Block
        step="FASE 01"
        title={data.inputTitle}
        icon={data.inputIcon ?? <Hand className="size-3.5" />}
        tone="cyan"
        live={data.live}
      >
        <div className="space-y-1.5">
          {data.inputRows.length === 0 && (
            <p className="font-mono text-[11px] text-muted">belum ada sinyal masuk…</p>
          )}
          {data.inputRows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 font-mono text-[11px]">
              <span className="shrink-0 text-muted">{r.label}</span>
              <span className="truncate text-right font-bold text-paper">{r.value}</span>
            </div>
          ))}
        </div>
      </Block>

      <Connector live={data.live} tone="cyan" />

      <Block step="FASE 02" title="PEMROSESAN" icon={<Cpu className="size-3.5" />} tone="violet" live={data.live}>
        <ol className="space-y-1.5">
          {data.processSteps.map((s, i) => (
            <motion.li
              key={`${i}-${s}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="flex items-start gap-2 font-mono text-[11px]"
            >
              <span className="mt-px shrink-0 text-violet">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-paper/90">{s}</span>
            </motion.li>
          ))}
          {data.processSteps.length === 0 && (
            <p className="font-mono text-[11px] text-muted">prosesor idle…</p>
          )}
        </ol>
      </Block>

      <Connector live={data.live} tone="magenta" />

      <Block step="FASE 03" title="UMPAN BALIK" icon={<Radio className="size-3.5" />} tone="magenta" live={data.live}>
        <div className="flex flex-wrap gap-1.5">
          {data.feedback.map((f) => {
            const fc = colorMap[f.color];
            return (
              <span
                key={f.label}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-bold ${fc.border} ${fc.bg} ${fc.text}`}
              >
                {f.label}
                <span className="font-normal text-paper/60">{f.detail}</span>
              </span>
            );
          })}
          {data.feedback.length === 0 && (
            <p className="font-mono text-[11px] text-muted">belum ada respons…</p>
          )}
        </div>
      </Block>

      {data.note && (
        <p className="mt-3 border-l-2 border-amber/40 pl-3 font-mono text-[10.5px] leading-relaxed text-amber/80">
          {data.note}
        </p>
      )}
    </div>
  );
}
