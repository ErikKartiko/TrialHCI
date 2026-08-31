import { useEffect, useRef, useState } from "react";
import { Compass, MousePointer2, Smartphone } from "lucide-react";
import PipelineHUD, { type PipelineData } from "./PipelineHUD";
import { LabButton } from "../ui";
import { buzz, playTone } from "../../lib/audio";
import { C, hexToRgba } from "../../lib/theme";

type Mode = "idle" | "sensor" | "mouse";

export default function MotionLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilt = useRef({ gx: 0, gy: 0, alpha: 0, beta: 0, gamma: 0 });
  const modeRef = useRef<Mode>("idle");
  const [mode, setMode] = useState<Mode>("idle");
  const [stats, setStats] = useState({ alpha: 0, beta: 0, gamma: 0, gx: 0, gy: 0, speed: 0 });
  const [needPerm, setNeedPerm] = useState(false);
  const [sensorLive, setSensorLive] = useState(false);
  const lastTick = useRef(0);
  const lastStat = useRef(0);
  const ball = useRef({ x: 200, y: 150, vx: 0, vy: 0 });
  const trail = useRef<{ x: number; y: number }[]>([]);
  const flash = useRef({ l: 0, r: 0, t: 0, b: 0 });

  /* -------- fisika bola -------- */
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
      ball.current.x = Math.min(ball.current.x, W - 20);
      ball.current.y = Math.min(ball.current.y, H - 20);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const R = 15;

    const hitFX = () => {
      const now = performance.now();
      if (now - lastTick.current > 160) {
        lastTick.current = now;
        playTone({ freq: 160 + Math.random() * 120, dur: 0.07, type: "triangle", gain: 0.06 });
        buzz(9);
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const b = ball.current;
      const t = tilt.current;
      // fisika
      b.vx += t.gx * 0.42;
      b.vy += t.gy * 0.42;
      b.vx *= 0.988; b.vy *= 0.988;
      b.x += b.vx; b.y += b.vy;
      if (b.x < R) { b.x = R; b.vx *= -0.62; flash.current.l = 1; hitFX(); }
      if (b.x > W - R) { b.x = W - R; b.vx *= -0.62; flash.current.r = 1; hitFX(); }
      if (b.y < R) { b.y = R; b.vy *= -0.62; flash.current.t = 1; hitFX(); }
      if (b.y > H - R) { b.y = H - R; b.vy *= -0.62; flash.current.b = 1; hitFX(); }

      trail.current.push({ x: b.x, y: b.y });
      if (trail.current.length > 34) trail.current.shift();

      // gambar
      ctx.fillStyle = "#07070D";
      ctx.fillRect(0, 0, W, H);

      // grid kemiringan
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const off = (b.x % 44 + 44) % 44;
      for (let x = -44 + off; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + t.gx * 10, H); ctx.stroke(); }
      const offY = (b.y % 44 + 44) % 44;
      for (let y = -44 + offY; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + t.gy * 10); ctx.stroke(); }

      // flash dinding
      const F = flash.current;
      const edges: [keyof typeof F, () => void][] = [
        ["l", () => { ctx.fillRect(0, 0, 3, H); }],
        ["r", () => { ctx.fillRect(W - 3, 0, 3, H); }],
        ["t", () => { ctx.fillRect(0, 0, W, 3); }],
        ["b", () => { ctx.fillRect(0, H - 3, W, 3); }],
      ];
      for (const [k, fn] of edges) {
        if (F[k] > 0.05) {
          ctx.fillStyle = hexToRgba(C.magenta, F[k] * 0.8);
          fn();
          F[k] *= 0.9;
        }
      }

      // jejak
      ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i < trail.current.length; i++) {
        const a = i / trail.current.length;
        ctx.strokeStyle = hexToRgba(C.cyan, a * 0.4);
        ctx.lineWidth = a * 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail.current[i - 1].x, trail.current[i - 1].y);
        ctx.lineTo(trail.current[i].x, trail.current[i].y);
        ctx.stroke();
      }
      // bola
      const speed = Math.hypot(b.vx, b.vy);
      const col = speed > 7 ? C.magenta : speed > 3 ? C.amber : C.cyan;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 46);
      g.addColorStop(0, hexToRgba(col, 0.5));
      g.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, 46, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, R);
      bg.addColorStop(0, "#ffffff");
      bg.addColorStop(0.4, col);
      bg.addColorStop(1, hexToRgba(col, 0.55));
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // vektor gravitasi
      if (modeRef.current !== "idle") {
        const cx0 = W - 56, cy0 = 52;
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath(); ctx.arc(cx0, cy0, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = hexToRgba(C.lime, 0.95);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx0, cy0);
        ctx.lineTo(cx0 + t.gx * 22, cy0 + t.gy * 22);
        ctx.stroke();
        ctx.fillStyle = hexToRgba(C.lime, 0.95);
        ctx.beginPath(); ctx.arc(cx0 + t.gx * 22, cy0 + t.gy * 22, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(139,139,158,0.9)";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.fillText("G", cx0 - 3, cy0 + 38);
      }

      // statistik (throttle)
      const now = performance.now();
      if (now - lastStat.current > 120 && modeRef.current !== "idle") {
        lastStat.current = now;
        setStats({
          alpha: Math.round(t.alpha), beta: Math.round(t.beta), gamma: Math.round(t.gamma),
          gx: +t.gx.toFixed(2), gy: +t.gy.toFixed(2), speed: +Math.hypot(b.vx, b.vy).toFixed(1),
        });
      }
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  /* -------- input -------- */
  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      if (modeRef.current !== "sensor") return;
      const beta = e.beta ?? 0, gamma = e.gamma ?? 0, alpha = e.alpha ?? 0;
      tilt.current = {
        alpha, beta, gamma,
        gx: Math.max(-1, Math.min(1, gamma / 38)),
        gy: Math.max(-1, Math.min(1, (beta - 30) / 38)),
      };
      setSensorLive(true);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, []);

  const onMouseTilt = (e: React.PointerEvent) => {
    if (modeRef.current !== "mouse") return;
    const r = wrapRef.current!.getBoundingClientRect();
    const gx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const gy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    tilt.current = { alpha: 0, beta: gy * 38 + 30, gamma: gx * 38, gx, gy };
  };

  const enableMouseMode = () => {
    modeRef.current = "mouse";
    setMode("mouse");
  };

  const enableSensor = async () => {
    setNeedPerm(false);
    try {
      const DOE = DeviceOrientationEvent as any;
      if (typeof DOE?.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") { setNeedPerm(true); enableMouseMode(); return; }
      }
      modeRef.current = "sensor";
      setMode("sensor");
      setTimeout(() => { if (!sensorLive && modeRef.current === "sensor") { /* laptop tanpa gyro */ } }, 1200);
    } catch {
      setNeedPerm(true);
      enableMouseMode();
    }
  };

  const hud: PipelineData = {
    inputTitle: "INPUT — GERAKAN",
    inputIcon: <Compass className="size-3.5" />,
    live: mode !== "idle",
    inputRows: mode === "idle" ? [] : [
      { label: "sumber", value: mode === "sensor" ? "gyroscope + akselerometer" : "simulasi via mouse" },
      { label: "alpha (kompas)", value: `${stats.alpha}°` },
      { label: "beta (depan-blk)", value: `${stats.beta}°` },
      { label: "gamma (kiri-kanan)", value: `${stats.gamma}°` },
      { label: "kecepatan bola", value: `${stats.speed} px/f` },
    ],
    processSteps: mode !== "idle" ? [
      mode === "sensor" ? "Sensor IMU membaca orientasi perangkat (α, β, γ)" : "Posisi mouse dipetakan sebagai sudut kemiringan virtual",
      `Kemiringan → vektor gravitasi g = (${stats.gx}, ${stats.gy})`,
      `Integrasi Euler: v += g·dt, p += v·dt, gesekan 0.988`,
      `Deteksi tabrakan dinding → pantulan + efek`,
    ] : [],
    feedback: mode !== "idle" ? [
      { label: "VISUAL", detail: "bola menggelinding + jejak", color: "cyan" },
      { label: "AUDIO", detail: "benturan dinding", color: "lime" },
      { label: "HAPTIK", detail: "getar saat menabrak", color: "magenta" },
    ] : [],
    note: "Ponsel menggabungkan gyroscope & akselerometer (IMU) untuk mengetahui orientasi perangkat — dasar rotasi layar, game balap, dan penghitung langkah.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div
          ref={wrapRef}
          onPointerMove={onMouseTilt}
          className="stage relative h-[420px] overflow-hidden rounded-3xl border border-white/10 md:h-[470px]"
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          {mode === "idle" && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-ink/55 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-4 px-6 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-lime/40 bg-lime/10 text-lime">
                  <Smartphone className="size-6" />
                </span>
                <p className="font-mono text-xs tracking-[0.25em] text-paper">PILIH SUMBER GERAKAN</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <LabButton color="lime" onClick={enableSensor}><Smartphone className="size-3.5" /> SENSOR PERANGKAT</LabButton>
                  <LabButton color="cyan" onClick={enableMouseMode}><MousePointer2 className="size-3.5" /> SIMULASI MOUSE</LabButton>
                </div>
                <p className="max-w-72 text-[11px] leading-relaxed text-muted">
                  di ponsel: miringkan perangkatmu · di laptop: gunakan mode mouse lalu arahkan kursor untuk "memiringkan" dunia
                </p>
              </div>
            </div>
          )}
          {mode === "sensor" && !sensorLive && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-amber/40 bg-amber/10 px-4 py-1.5 font-mono text-[10px] tracking-wider text-amber backdrop-blur">
              menunggu data gyroscope… (perangkat tanpa sensor? pakai mode mouse)
            </div>
          )}
          {mode === "mouse" && (
            <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-ink/70 px-2.5 py-1 font-mono text-[9px] tracking-widest text-cyan backdrop-blur">
              MODE MOUSE — kursor = kemiringan
            </div>
          )}
          {needPerm && (
            <p className="absolute bottom-3 left-1/2 w-max max-w-[90%] -translate-x-1/2 text-center font-mono text-[10px] text-amber">
              izin sensor ditolak / tidak tersedia — beralih ke mode mouse
            </p>
          )}
        </div>

        {/* tilt meter */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "KEMIRINGAN X (gamma)", val: stats.gx, color: C.lime },
            { label: "KEMIRINGAN Y (beta)", val: stats.gy, color: C.cyan },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-white/8 bg-white/2 p-3">
              <p className="mb-2 font-mono text-[9px] tracking-[0.2em] text-muted">{m.label}</p>
              <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
                <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
                <div
                  className="absolute inset-y-0 rounded-full transition-all duration-100"
                  style={{
                    background: m.color,
                    left: m.val < 0 ? `${50 + m.val * 50}%` : "50%",
                    width: `${Math.abs(m.val) * 50}%`,
                    boxShadow: `0 0 12px ${m.color}`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-right font-mono text-[10px] font-bold" style={{ color: m.color }}>
                {mode === "idle" ? "—" : `${m.val > 0 ? "+" : ""}${m.val}`}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
