import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownRight, HelpCircle, MousePointerClick, PenLine, RotateCw, Zap } from "lucide-react";
import PipelineHUD, { type PipelineData } from "./PipelineHUD";
import { buzz, playTone, sfx } from "../../lib/audio";
import { C, hexToRgba } from "../../lib/theme";

interface Pt { x: number; y: number; t: number }
interface Path { pts: Pt[]; color: string; life: number }

interface Result {
  name: string;
  desc: string;
  color: string;
  icon: any;
  metrics: { points: number; dist: number; dur: number; close: number; corners: number; dx: number; dy: number };
}

function analyze(pts: Pt[]): Result {
  const n = pts.length;
  const dur = Math.max(1, pts[n - 1].t - pts[0].t);
  let dist = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  for (let i = 1; i < n; i++) dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const dx = pts[n - 1].x - pts[0].x;
  const dy = pts[n - 1].y - pts[0].y;
  const w = maxX - minX, h = maxY - minY;
  const closeW = dist > 0 ? Math.hypot(dx, dy) / dist : 0;

  // tikungan tajam
  const k = Math.max(3, Math.floor(n / 16));
  const corners: number[] = [];
  for (let i = k; i < n - k; i++) {
    const ax = pts[i].x - pts[i - k].x, ay = pts[i].y - pts[i - k].y;
    const bx = pts[i + k].x - pts[i].x, by = pts[i + k].y - pts[i].y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    if (la < 4 || lb < 4) continue;
    const cos = (ax * bx + ay * by) / (la * lb);
    const ang = Math.acos(Math.min(1, Math.max(-1, cos))) * (180 / Math.PI);
    if (ang > 52) {
      if (!corners.length || i - corners[corners.length - 1] > k * 2) corners.push(i);
    }
  }
  const metrics = { points: n, dist: Math.round(dist), dur: Math.round(dur), close: +closeW.toFixed(2), corners: corners.length, dx: Math.round(dx), dy: Math.round(dy) };

  if (dist < 30 && dur < 600)
    return { name: "KETUKAN", desc: "tap — tekan singkat di satu titik", color: C.cyan, icon: MousePointerClick, metrics };
  if (closeW < 0.28 && w > 54 && h > 54 && n > 14)
    return { name: "LINGKARAN", desc: "jalur tertutup — awal & akhir bertemu", color: C.magenta, icon: RotateCw, metrics };
  if (corners.length >= 3 && w > h * 0.8)
    return { name: "ZIGZAG", desc: `${corners.length} tikungan tajam bolak-balik`, color: C.amber, icon: Zap, metrics };
  if (corners.length === 1 && Math.abs(dx) > 44 && Math.abs(dy) > 44)
    return { name: "SUDUT", desc: "satu belokan tegas — pola L / V", color: C.violet, icon: CornerDownRight, metrics };
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.6)
    return dx > 0
      ? { name: "GESER KANAN", desc: "swipe → arah dominan horizontal positif", color: C.lime, icon: ArrowRight, metrics }
      : { name: "GESER KIRI", desc: "swipe ← arah dominan horizontal negatif", color: C.lime, icon: ArrowLeft, metrics };
  if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.6)
    return dy > 0
      ? { name: "GESER BAWAH", desc: "swipe ↓ arah dominan vertikal positif", color: C.cyan, icon: ArrowDown, metrics }
      : { name: "GESER ATAS", desc: "swipe ↑ arah dominan vertikal negatif", color: C.cyan, icon: ArrowUp, metrics };
  return { name: "POLA BEBAS", desc: "belum cocok dengan gestur yang dikenal", color: "#8B8B9E", icon: HelpCircle, metrics };
}

function feedbackFor(name: string) {
  switch (name) {
    case "KETUKAN": sfx.tap(); buzz(12); break;
    case "GESER KANAN": playTone({ freq: 300, to: 720, dur: 0.22, type: "triangle", gain: 0.1 }); buzz(16); break;
    case "GESER KIRI": playTone({ freq: 720, to: 300, dur: 0.22, type: "triangle", gain: 0.1 }); buzz(16); break;
    case "GESER ATAS": playTone({ freq: 400, to: 980, dur: 0.25, type: "sine", gain: 0.1 }); buzz(16); break;
    case "GESER BAWAH": playTone({ freq: 980, to: 400, dur: 0.25, type: "sine", gain: 0.1 }); buzz(16); break;
    case "LINGKARAN": [440, 550, 660, 880].forEach((f, i) => playTone({ freq: f, dur: 0.14, type: "sine", gain: 0.08, delay: i * 0.07 })); buzz([18, 40, 18]); break;
    case "ZIGZAG": [600, 300, 600, 300, 600].forEach((f, i) => playTone({ freq: f, dur: 0.08, type: "square", gain: 0.05, delay: i * 0.06 })); buzz([14, 30, 14, 30, 14]); break;
    case "SUDUT": playTone({ freq: 500, dur: 0.1, type: "triangle", gain: 0.09 }); playTone({ freq: 750, dur: 0.12, type: "triangle", gain: 0.09, delay: 0.1 }); buzz(20); break;
    default: playTone({ freq: 220, dur: 0.15, type: "sine", gain: 0.06 });
  }
}

export default function GestureLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Pt[] | null>(null);
  const paths = useRef<Path[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<{ name: string; color: string }[]>([]);
  const [live, setLive] = useState(false);
  const [recording, setRecording] = useState(false);
  const liveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0, W = 0, H = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const stroke = (pts: Pt[], color: string, alpha: number, width: number) => {
      if (pts.length < 2) return;
      ctx.strokeStyle = hexToRgba(color, alpha);
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 16 * alpha;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.fillStyle = "rgba(7,7,13,0.22)";
      ctx.fillRect(0, 0, W, H);
      paths.current = paths.current.filter((p) => p.life > 0.02);
      for (const p of paths.current) {
        p.life *= 0.985;
        stroke(p.pts, p.color, p.life * 0.9, 3.5);
      }
      if (current.current && current.current.length > 1) {
        stroke(current.current, C.cyan, 0.95, 3.5);
        const lp = current.current[current.current.length - 1];
        ctx.fillStyle = hexToRgba(C.cyan, 0.9);
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    current.current = [getPos(e)];
    setRecording(true);
    setLive(true);
    clearTimeout(liveTimer.current);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!current.current) return;
    const p = getPos(e);
    const last = current.current[current.current.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
    current.current.push(p);
  };
  const onUp = () => {
    if (!current.current || current.current.length < 2) { current.current = null; setRecording(false); return; }
    const res = analyze(current.current);
    paths.current.push({ pts: current.current, color: res.color, life: 1 });
    current.current = null;
    setRecording(false);
    setResult(res);
    setHistory((h) => [{ name: res.name, color: res.color }, ...h].slice(0, 5));
    feedbackFor(res.name);
    setLive(true);
    clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(false), 4000);
  };

  useEffect(() => () => clearTimeout(liveTimer.current), []);

  const m = result?.metrics;
  const hud: PipelineData = {
    inputTitle: "INPUT — GESTUR",
    inputIcon: <PenLine className="size-3.5" />,
    live: live || recording,
    inputRows: recording
      ? [{ label: "status", value: "merekam lintasan…" }]
      : m
      ? [
          { label: "jumlah titik", value: `${m.points} sampel` },
          { label: "jarak tempuh", value: `${m.dist} px` },
          { label: "durasi", value: `${m.dur} ms` },
          { label: "pergeseran", value: `Δx ${m.dx} · Δy ${m.dy}` },
          { label: "gestur", value: result!.name },
        ]
      : [],
    processSteps: m && !recording
      ? [
          `Rekam trajectory: ${m.points} titik (x, y, t)`,
          `Hitung jarak tempuh ${m.dist}px & rasio penutupan ${m.close}`,
          `Deteksi ${m.corners} tikungan tajam dari sudut vektor`,
          `Klasifikasi pola → '${result!.name}'`,
        ]
      : recording
      ? ["Menyimpan titik lintasan…", "Menghitung metrik secara live…"]
      : [],
    feedback: result && !recording
      ? [
          { label: "VISUAL", detail: `jejak berwarna + label`, color: "cyan" },
          { label: "AUDIO", detail: "motif nada khas gestur", color: "lime" },
          { label: "HAPTIK", detail: "pola getar", color: "magenta" },
        ]
      : [],
    note: "Pengenalan gestur = klasifikasi pola: komputer mengubah lintasan mentah menjadi fitur (jarak, arah, tikungan) lalu memutuskan kategorinya — dasar dari Face ID hingga kontrol game.",
  };

  const Icon = result?.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div
          ref={wrapRef}
          className="stage relative h-[420px] cursor-crosshair overflow-hidden rounded-3xl border border-white/10 bg-[#07070D] md:h-[470px]"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="bg-dots absolute inset-0 opacity-50" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {!result && !recording && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-mono text-xs tracking-[0.3em] text-muted">GAMBAR SEBUAH GESTUR</p>
                <p className="mt-2 text-xs text-white/30">geser · lingkaran · zigzag · sudut · ketukan</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {result && !recording && (
              <motion.div
                key={result.name + result.metrics.dur + result.metrics.dist}
                initial={{ opacity: 0, scale: 0.7, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2"
              >
                <div
                  className="flex items-center gap-3 rounded-2xl border bg-ink/80 px-5 py-3 backdrop-blur-xl"
                  style={{ borderColor: hexToRgba(result.color, 0.5), boxShadow: `0 0 44px ${hexToRgba(result.color, 0.25)}` }}
                >
                  {Icon && <Icon className="size-6" style={{ color: result.color }} />}
                  <div>
                    <p className="font-display text-lg font-bold tracking-wide" style={{ color: result.color }}>{result.name}</p>
                    <p className="font-mono text-[10px] text-muted">{result.desc}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {history.length > 0 && (
            <div className="absolute bottom-3 left-3 flex max-w-[80%] flex-wrap gap-1.5">
              {history.map((h, i) => (
                <span
                  key={i}
                  className="rounded-md border bg-ink/70 px-2 py-1 font-mono text-[9px] font-bold tracking-wider backdrop-blur"
                  style={{ borderColor: hexToRgba(h.color, 0.4), color: h.color, opacity: 1 - i * 0.16 }}
                >
                  {h.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="mt-4 text-center font-mono text-[10px] tracking-wider text-muted">
          tahan & seret untuk menggambar — lepas untuk membiarkan komputer <span className="text-lime">menebak gesturmu</span>
        </p>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
