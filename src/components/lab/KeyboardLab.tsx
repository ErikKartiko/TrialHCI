import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard as KeyboardIcon, MousePointerClick } from "lucide-react";
import PipelineHUD, { type PipelineData } from "./PipelineHUD";
import { playTone } from "../../lib/audio";
import { C } from "../../lib/theme";

interface KeyInfo {
  key: string;
  code: string;
  keyCode: number;
  mods: string;
}

interface Glyph {
  id: number;
  char: string;
  x: number;
  y: number;
  color: string;
}

const ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const ROW_TYPES: OscillatorType[] = ["sine", "triangle", "square", "sawtooth"];
const ROW_COLORS = [C.cyan, C.lime, C.violet, C.magenta];

let gid = 0;

export default function KeyboardLab() {
  const [focused, setFocused] = useState(false);
  const [last, setLast] = useState<KeyInfo | null>(null);
  const [live, setLive] = useState(false);
  const [total, setTotal] = useState(0);
  const [rate, setRate] = useState(0);
  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [flashRow, setFlashRow] = useState(-1);
  const [freq, setFreq] = useState(0);
  const stamps = useRef<number[]>([]);
  const liveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const areaRef = useRef<HTMLDivElement>(null);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.repeat) return;
    const mods = [e.ctrlKey && "CTRL", e.altKey && "ALT", e.shiftKey && "SHIFT", e.metaKey && "META"].filter(Boolean).join("+") || "—";
    setLast({ key: e.key, code: e.code, keyCode: e.keyCode || (e as any).which || 0, mods });
    setTotal((t) => t + 1);

    const now = performance.now();
    stamps.current = [...stamps.current.filter((t) => now - t < 1000), now];
    setRate(stamps.current.length);

    const ch = e.key.length === 1 ? e.key.toUpperCase() : "";
    const row = ROWS.findIndex((r) => ch && r.includes(ch));
    setFlashRow(row);
    const base = ch ? ch.charCodeAt(0) : e.keyCode;
    const f = Math.round(196 * Math.pow(2, (base % 24) / 12));
    setFreq(f);
    playTone({ freq: f, dur: 0.16, type: row >= 0 ? ROW_TYPES[row] : "sine", gain: 0.1 });

    const rect = areaRef.current?.getBoundingClientRect();
    const g: Glyph = {
      id: ++gid,
      char: e.key === " " ? "␣" : e.key.length === 1 ? e.key : e.key === "Enter" ? "↵" : e.key === "Backspace" ? "⌫" : "◆",
      x: rect ? 40 + Math.random() * (rect.width - 80) : 120,
      y: rect ? 60 + Math.random() * (rect.height - 140) : 100,
      color: row >= 0 ? ROW_COLORS[row] : C.paper,
    };
    setGlyphs((gs) => [...gs.slice(-24), g]);

    setLive(true);
    clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(false), 2600);
  }, []);

  useEffect(() => () => clearTimeout(liveTimer.current), []);

  const hud: PipelineData = {
    inputTitle: "INPUT — KEYBOARD",
    inputIcon: <KeyboardIcon className="size-3.5" />,
    live,
    inputRows: last
      ? [
          { label: "event.key", value: last.key === " " ? "'Spasi'" : `'${last.key}'` },
          { label: "event.code", value: last.code },
          { label: "keyCode", value: String(last.keyCode) },
          { label: "modifier", value: last.mods },
          { label: "laju ketukan", value: `${rate} tsn/dtk` },
          { label: "total ketukan", value: String(total) },
        ]
      : [],
    processSteps: live
      ? [
          `Browser membangkitkan event keydown dari sirkuit tombol`,
          `Kode fisik '${last?.code}' dipetakan OS → karakter '${last?.key}'`,
          `Kode karakter diubah ke frekuensi: ${freq} Hz`,
          `Perintah render glyph + osilator dikirim ke GPU & audio`,
        ]
      : [],
    feedback: live
      ? [
          { label: "VISUAL", detail: "glyph & sorotan tombol", color: "cyan" },
          { label: "AUDIO", detail: `nada ${freq} Hz`, color: "lime" },
        ]
      : [],
    note: "Keyboard tidak mengirim 'huruf' — ia mengirim kode tombol fisik (scan code). Komputerlah yang menerjemahkannya menjadi karakter.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div
          ref={areaRef}
          tabIndex={0}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={() => areaRef.current?.focus()}
          className={`stage relative h-[380px] cursor-pointer overflow-hidden rounded-3xl border outline-none transition-all duration-500 md:h-[420px] ${
            focused ? "border-cyan/50 bg-cyan/3 shadow-[0_0_60px_rgba(43,228,255,0.08)]" : "border-white/10 bg-white/2"
          }`}
        >
          <div className="bg-grid absolute inset-0 opacity-60" />
          {!focused && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-ink/40 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-cyan/40 bg-cyan/10 text-cyan">
                  <MousePointerClick className="size-6" />
                </span>
                <p className="font-mono text-xs tracking-[0.25em] text-paper">KLIK AREA INI</p>
                <p className="max-w-60 text-xs text-muted">lalu tekan tombol apa pun di keyboard-mu</p>
              </div>
            </div>
          )}
          <AnimatePresence>
            {glyphs.map((g) => (
              <motion.span
                key={g.id}
                initial={{ opacity: 0, scale: 0.4, y: 0 }}
                animate={{ opacity: 1, scale: 1.15, y: -56 }}
                exit={{ opacity: 0, scale: 0.7, y: -110 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="pointer-events-none absolute font-display text-4xl font-bold md:text-5xl"
                style={{ left: g.x, top: g.y, color: g.color, textShadow: `0 0 24px ${g.color}` }}
              >
                {g.char}
              </motion.span>
            ))}
          </AnimatePresence>
          {focused && !last && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="font-mono text-xs tracking-[0.3em] text-muted">TEKAN TOMBOL APA PUN…</p>
            </div>
          )}
          {last && (
            <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-ink/70 px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted backdrop-blur">
              terakhir: <span className="font-bold text-cyan">{last.key === " " ? "SPASI" : last.key.toUpperCase()}</span> · {last.code}
            </div>
          )}
        </div>

        {/* virtual keyboard */}
        <div className="mt-4 space-y-1.5">
          {ROWS.map((r, ri) => (
            <div key={r} className="flex justify-center gap-1.5">
              {r.split("").map((k) => {
                const on = last?.key.toUpperCase() === k;
                return (
                  <div
                    key={k}
                    className={`grid h-9 w-7 place-items-center rounded-md border font-mono text-[10px] font-bold transition-all duration-200 sm:h-10 sm:w-9 ${
                      on
                        ? "scale-110 border-transparent text-ink"
                        : "border-white/10 bg-white/2 text-white/40"
                    }`}
                    style={on ? { background: ROW_COLORS[ri], boxShadow: `0 0 22px ${ROW_COLORS[ri]}` } : undefined}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex justify-center gap-1.5 pt-0.5">
            <div
              className={`grid h-9 w-56 place-items-center rounded-md border font-mono text-[10px] transition-all duration-200 ${
                last?.key === " " ? "border-transparent bg-cyan text-ink shadow-[0_0_22px_rgba(43,228,255,0.7)]" : "border-white/10 bg-white/2 text-white/40"
              }`}
            >
              SPASI
            </div>
          </div>
        </div>
        <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-muted">
          setiap baris tombol memakai bentuk gelombang berbeda — {flashRow >= 0 ? `baris ${flashRow + 1} aktif` : "tekan huruf di baris berbeda"}
        </p>
      </div>

      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
