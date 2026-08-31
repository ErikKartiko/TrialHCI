import { useEffect, useRef, useState } from "react";
import { Eraser, Fingerprint } from "lucide-react";
import PipelineHUD, { type PipelineData } from "./PipelineHUD";
import { LabButton } from "../ui";
import { buzz, sfx } from "../../lib/audio";
import { C, hexToRgba } from "../../lib/theme";

interface Pt { x: number; y: number; t: number }
interface PointerState {
  id: number;
  type: string;
  pressure: number;
  trail: Pt[];
  hue: string;
  v: number; // px/s
}
interface Ripple { x: number; y: number; r: number; a: number; hue: string }

const HUES = [C.cyan, C.magenta, C.lime, C.violet, C.amber];

export default function PointerLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, PointerState>());
  const ripples = useRef<Ripple[]>([]);
  const distTotal = useRef(0);

  const [stats, setStats] = useState({ x: 0, y: 0, nx: 0, ny: 0, type: "—", pressure: 0, v: 0, active: 0, dist: 0 });
  const [live, setLive] = useState(false);
  const liveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastStat = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#08080F";
      ctx.fillRect(0, 0, W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      // fading
      ctx.fillStyle = "rgba(8,8,15,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // trails
      const now = performance.now();
      ctx.lineCap = "round";
      pointers.current.forEach((p) => {
        p.trail = p.trail.filter((pt) => now - pt.t < 900);
        for (let i = 1; i < p.trail.length; i++) {
          const a = p.trail[i - 1], b = p.trail[i];
          const age = 1 - (now - b.t) / 900;
          ctx.strokeStyle = hexToRgba(p.hue, age * 0.85);
          ctx.lineWidth = Math.max(1, (2 + p.pressure * 10 + Math.min(8, p.v / 260)) * age);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        const lastPt = p.trail[p.trail.length - 1];
        if (lastPt) {
          const g = ctx.createRadialGradient(lastPt.x, lastPt.y, 0, lastPt.x, lastPt.y, 34);
          g.addColorStop(0, hexToRgba(p.hue, 0.5));
          g.addColorStop(1, hexToRgba(p.hue, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = hexToRgba(p.hue, 0.95);
          ctx.beginPath();
          ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
          ctx.fill();
          // label
          ctx.fillStyle = "rgba(237,237,244,0.75)";
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillText(p.type.toUpperCase(), lastPt.x + 12, lastPt.y - 10);
        }
      });

      // ripples
      ripples.current = ripples.current.filter((r) => r.a > 0.02);
      for (const r of ripples.current) {
        r.r += 3.2;
        r.a *= 0.94;
        ctx.strokeStyle = hexToRgba(r.hue, r.a);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const pushStats = (x: number, y: number, type: string, pressure: number, v: number) => {
    const now = performance.now();
    if (now - lastStat.current < 70) return;
    lastStat.current = now;
    const rect = wrapRef.current!.getBoundingClientRect();
    setStats({
      x: Math.round(x), y: Math.round(y),
      nx: +(x / rect.width).toFixed(3), ny: +(y / rect.height).toFixed(3),
      type, pressure: +pressure.toFixed(2), v: Math.round(v),
      active: pointers.current.size, dist: Math.round(distTotal.current),
    });
  };

  const markLive = () => {
    setLive(true);
    clearTimeout(liveTimer.current);
    liveTimer.current = setTimeout(() => setLive(false), 2200);
  };
  useEffect(() => () => clearTimeout(liveTimer.current), []);

  const getPos = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const { x, y } = getPos(e);
    const hue = HUES[e.pointerId % HUES.length];
    pointers.current.set(e.pointerId, {
      id: e.pointerId, type: e.pointerType, pressure: e.pressure || 0.5,
      trail: [{ x, y, t: performance.now() }], hue, v: 0,
    });
    ripples.current.push({ x, y, r: 4, a: 0.9, hue });
    sfx.tap();
    buzz(14);
    pushStats(x, y, e.pointerType, e.pressure || 0.5, 0);
    setStats((s) => ({ ...s, active: pointers.current.size }));
    markLive();
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    const { x, y } = getPos(e);
    const now = performance.now();
    if (!p) {
      // hover tanpa tekan (mouse)
      pointers.current.set(e.pointerId, {
        id: e.pointerId, type: e.pointerType, pressure: 0,
        trail: [{ x, y, t: now }], hue: HUES[e.pointerId % HUES.length], v: 0,
      });
      return;
    }
    const last = p.trail[p.trail.length - 1];
    const dt = Math.max(1, now - last.t);
    const d = Math.hypot(x - last.x, y - last.y);
    if (d < 2) return;
    distTotal.current += d;
    p.v = p.v * 0.7 + (d / dt) * 1000 * 0.3;
    p.pressure = e.pressure || p.pressure;
    p.trail.push({ x, y, t: now });
    if (p.trail.length > 60) p.trail.shift();
    pushStats(x, y, e.pointerType, p.pressure, p.v);
    markLive();
  };

  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    setStats((s) => ({ ...s, active: pointers.current.size }));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#08080F";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    distTotal.current = 0;
    setStats((s) => ({ ...s, dist: 0 }));
  };

  const hud: PipelineData = {
    inputTitle: "INPUT — POINTER",
    inputIcon: <Fingerprint className="size-3.5" />,
    live,
    inputRows: stats.active > 0 || stats.dist > 0
      ? [
          { label: "posisi", value: `x:${stats.x} y:${stats.y}` },
          { label: "ternormalisasi", value: `${stats.nx}, ${stats.ny}` },
          { label: "tipe pointer", value: stats.type },
          { label: "tekanan", value: String(stats.pressure) },
          { label: "kecepatan", value: `${stats.v} px/dtk` },
          { label: "pointer aktif", value: String(stats.active) },
          { label: "jarak tempuh", value: `${stats.dist} px` },
        ]
      : [],
    processSteps: live
      ? [
          `Event pointer ditangkap: (${stats.x}, ${stats.y}) dari '${stats.type}'`,
          `Koordinat dinormalisasi ke rentang 0–1 → (${stats.nx}, ${stats.ny})`,
          `Kecepatan diestimasi dari Δpos/Δt → ${stats.v} px/dtk`,
          `Jejak digambar ke framebuffer tiap frame (60 fps)`,
        ]
      : [],
    feedback: live
      ? [
          { label: "VISUAL", detail: "jejak cahaya & riak", color: "cyan" },
          { label: "HAPTIK", detail: "getar 14ms saat menyentuh", color: "magenta" },
          { label: "AUDIO", detail: "tick sentuh", color: "lime" },
        ]
      : [],
    note: "Coba dengan dua jari sekaligus di layar sentuh — komputer melacak setiap pointer secara independen lewat pointerId.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div
          ref={wrapRef}
          className="stage relative h-[420px] cursor-crosshair overflow-hidden rounded-3xl border border-white/10 md:h-[480px]"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {stats.dist === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="font-mono text-xs tracking-[0.3em] text-muted">GERAKKAN / SENTUH DI SINI</p>
                <p className="mt-2 text-xs text-white/30">gambar bebas — mouse, jari, atau stylus</p>
              </div>
            </div>
          )}
          <div className="absolute right-3 top-3 rounded-lg border border-white/10 bg-ink/70 px-2.5 py-1 font-mono text-[9px] tracking-widest text-muted backdrop-blur">
            {stats.active > 0 ? `${stats.active} POINTER TERDETEKSI` : "CANVAS SIAP"}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-wider text-muted">
            lebar garis mengikuti <span className="text-cyan">tekanan</span> & <span className="text-magenta">kecepatan</span>
          </p>
          <LabButton onClick={clear}><Eraser className="size-3.5" /> BERSIHKAN</LabButton>
        </div>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
