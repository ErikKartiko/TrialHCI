import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function SectionHeading({
  index,
  title,
  italic,
  sub,
}: {
  index: string;
  title: string;
  italic?: string;
  sub?: string;
}) {
  return (
    <div className="mb-10 md:mb-14">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-cyan"
      >
        <span className="inline-block h-px w-10 bg-cyan/60" />
        {index}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, delay: 0.08 }}
        className="mt-4 font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.02] tracking-tight"
      >
        {title}{" "}
        {italic && (
          <span className="font-serif-accent font-normal italic text-magenta">{italic}</span>
        )}
      </motion.h2>
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-muted md:text-base"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

export function Tag({ children, color = "cyan" }: { children: ReactNode; color?: "cyan" | "magenta" | "lime" | "violet" | "amber" }) {
  const map: Record<string, string> = {
    cyan: "border-cyan/30 text-cyan bg-cyan/5",
    magenta: "border-magenta/30 text-magenta bg-magenta/5",
    lime: "border-lime/30 text-lime bg-lime/5",
    violet: "border-violet/30 text-violet bg-violet/5",
    amber: "border-amber/30 text-amber bg-amber/5",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider ${map[color]}`}>
      {children}
    </span>
  );
}

export function LabButton({
  children,
  onClick,
  active,
  color = "cyan",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  color?: "cyan" | "magenta" | "lime";
  disabled?: boolean;
}) {
  const on: Record<string, string> = {
    cyan: "bg-cyan text-ink border-cyan shadow-[0_0_28px_rgba(43,228,255,0.35)]",
    magenta: "bg-magenta text-ink border-magenta shadow-[0_0_28px_rgba(255,61,138,0.35)]",
    lime: "bg-lime text-ink border-lime shadow-[0_0_28px_rgba(184,245,61,0.35)]",
  };
  const off: Record<string, string> = {
    cyan: "border-cyan/40 text-cyan hover:bg-cyan/10",
    magenta: "border-magenta/40 text-magenta hover:bg-magenta/10",
    lime: "border-lime/40 text-lime hover:bg-lime/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-xs font-bold tracking-wider transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? on[color] : `bg-transparent ${off[color]}`
      }`}
    >
      {children}
    </button>
  );
}
