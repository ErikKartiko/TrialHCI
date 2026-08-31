import { useEffect, useRef, useState } from "react";
import { Eraser, Hand, PenTool } from "lucide-react";
import PipelineHUD, { type PipelineData } from "../lab/PipelineHUD";
import CameraGate from "./CameraGate";
import { useCamera } from "../../hooks/useCamera";
import { coverMapper, dist, getHandLandmarker, HAND_EDGES, type NL } from "../../lib/vision";
import { hexToRgba } from "../../lib/theme";
import { playTone, sfx } from "../../lib/audio";
import type { HandLandmarker } from "@mediapipe/tasks-vision";

const PALETTE = ["#2BE4FF", "#FF3D8A", "#B8F53D", "#8B7CFF", "#FFC53D", "#EDEDF4"];

export default function FingerPaintLab() {
  const cam = useCamera();
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const fistLatch = useRef(false);
  const lastTs = useRef(0);
  const colorRef = useRef(PALETTE[0]);

  const [color, setColor] = useState(PALETTE[0]);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [stats, setStats] = useState({ found: false, drawing: false, pinch: 0, strokes: 0 });
  const statTick = useRef(0);
  colorRef.current = color;

  /* paksa resize canvas overlay mengikuti stage */
  useEffect(() => {
    const stage = stageRef.current!;
    const overlay = overlayRef.current!;
    const fit = () => {
      overlay.width = stage.clientWidth;
      overlay.height = stage.clientHeight;
    };
    fit();
    new ResizeObserver(fit).observe(stage);
  }, []);

  const startAll = async () => {
    setModelError(false);
    await cam.start();
    try {
      landmarkerRef.current = await getHandLandmarker();
      setModelReady(true);
    } catch {
      setModelError(true);
    }
  };

  /* loop deteksi */
  useEffect(() => {
    if (cam.state !== "on") return;
    let running = true;

    const loop = () => {
      if (!running) return;
      raf.current = requestAnimationFrame(loop);
      const video = cam.videoRef.current;
      const lm = landmarkerRef.current;
      const overlay = overlayRef.current;
      const stage = stageRef.current;
      if (!video || !lm || !overlay || !stage || video.readyState < 2) return;

      const ts = Math.max(performance.now(), lastTs.current + 1);
      lastTs.current = ts;
      const res = lm.detectForVideo(video, ts);

      const W = stage.clientWidth, H = stage.clientHeight;
      if (overlay.width !== W) { overlay.width = W; overlay.height = H; }
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      const map = coverMapper(video.videoWidth || 640, video.videoHeight || 480, W, H);

      const hand: NL[] | undefined = res.landmarks?.[0] as any;
      const now = performance.now();

      if (hand) {
        // kerangka
        ctx.strokeStyle = "rgba(237,237,244,0.35)";
        ctx.lineWidth = 1.5;
        for (const [a, b] of HAND_EDGES) {
          const p = map(hand[a].x, hand[a].y), q = map(hand[b].x, hand[b].y);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
        for (const pt of hand) {
          const p = map(pt.x, pt.y);
          ctx.fillStyle = "rgba(43,228,255,0.7)";
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill();
        }

        // cubit = pena menyentuh kanvas
        const tip = hand[8], thumb = hand[4], wrist = hand[0];
        const pinch = dist(tip, thumb);
        const drawing = pinch < 0.045;
        const cursor = map(tip.x, tip.y);
        const col = colorRef.current;

        ctx.strokeStyle = hexToRgba(col, 0.95);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, drawing ? 7 : 13, 0, Math.PI * 2);
        ctx.stroke();
        if (drawing) {
          ctx.fillStyle = hexToRgba(col, 0.9);
          ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        // goresan
        const paintCtx = paintRef.current?.getContext("2d");
        if (paintCtx && paintRef.current) {
          if (paintRef.current.width !== W) { paintRef.current.width = W; paintRef.current.height = H; }
        }
        if (drawing && paintCtx) {
          if (lastPos.current) {
            paintCtx.strokeStyle = col;
            paintCtx.lineWidth = 5.5;
            paintCtx.lineCap = "round";
            paintCtx.lineJoin = "round";
            paintCtx.shadowColor = col;
            paintCtx.shadowBlur = 14;
            paintCtx.beginPath();
            paintCtx.moveTo(lastPos.current.x, lastPos.current.y);
            paintCtx.lineTo(cursor.x, cursor.y);
            paintCtx.stroke();
            paintCtx.shadowBlur = 0;
          } else {
            playTone({ freq: 500 + cursor.y, dur: 0.07, type: "sine", gain: 0.05 });
            setStats((s) => ({ ...s, strokes: s.strokes + 1 }));
          }
          lastPos.current = cursor;
        } else {
          lastPos.current = null;
        }

        // kepalan tangan = hapus kanvas
        const ratios = [8, 12, 16, 20].map((i, k) =>
          dist(hand[i], wrist) / Math.max(0.0001, dist(hand[[6, 10, 14, 18][k]], wrist))
        );
        const fist = ratios.every((r) => r < 1.15);
        if (fist && !fistLatch.current) {
          fistLatch.current = true;
          const pc = paintRef.current?.getContext("2d");
          pc?.clearRect(0, 0, paintRef.current!.width, paintRef.current!.height);
          sfx.whoosh();
          setStats((s) => ({ ...s, strokes: 0 }));
        } else if (!fist) fistLatch.current = false;

        if (now - statTick.current > 130) {
          statTick.current = now;
          setStats((s) => ({ ...s, found: true, drawing, pinch: Math.round(pinch * 1000) }));
        }
      } else {
        lastPos.current = null;
        if (now - statTick.current > 300) {
          statTick.current = now;
          setStats((s) => ({ ...s, found: false, drawing: false }));
        }
      }
    };
    loop();
    return () => { running = false; cancelAnimationFrame(raf.current); };
  }, [cam.state, cam.videoRef]);

  const hud: PipelineData = {
    inputTitle: "INPUT — KAMERA · TANGAN",
    inputIcon: <Hand className="size-3.5" />,
    live: cam.state === "on" && modelReady,
    inputRows: cam.state !== "on" ? [] : [
      { label: "tangan terdeteksi", value: stats.found ? "YA" : "mencari…" },
      { label: "titik sendi", value: stats.found ? "21 landmark 3D" : "—" },
      { label: "jarak cubit", value: stats.found ? `${stats.pinch} / 1000` : "—" },
      { label: "mode", value: stats.drawing ? "MENGGAMBAR" : "melayang" },
      { label: "goresan dibuat", value: String(stats.strokes) },
    ],
    processSteps: cam.state === "on" && modelReady && stats.found ? [
      "Frame video → CNN pendeteksi telapak tangan",
      "Regresi 21 titik sendi 3D (ujung jari s/d pergelangan)",
      `Jarak ibu jari–telunjuk: ${stats.pinch}/1000 → ${stats.drawing ? "CUBIT = pena turun" : "terbuka = pena terangkat"}`,
      "Koordinat ujung telunjuk dipetakan ke kanvas (cermin) → goresan",
    ] : cam.state === "on" && modelReady ? ["Menunggu tangan masuk bingkai kamera…"] : [],
    feedback: stats.found ? [
      { label: "VISUAL", detail: "kerangka tangan + goresan neon", color: "cyan" },
      { label: "AUDIO", detail: "nada saat pena menyentuh", color: "lime" },
    ] : [],
    note: "Cubit ibu jari + telunjuk untuk menggambar, lepas untuk melayang, KEPALKAN tangan untuk menghapus kanvas. Inilah inti kontrol gestur di Vision Pro & Leap Motion.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div ref={stageRef} className="stage relative h-[440px] overflow-hidden rounded-3xl border border-white/10 bg-ink-2 md:h-[500px]">
          <video ref={cam.videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-40" />
          <canvas ref={paintRef} className="absolute inset-0 h-full w-full" />
          <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
          {cam.state !== "on" && (
            <CameraGate
              state={modelError ? "error" : cam.state}
              onStart={startAll}
              title="AKTIFKAN LUKISAN JARI"
              desc="kamera membaca 21 titik sendi tanganmu — menggambarlah di udara dengan mencubit"
            />
          )}
          {cam.state === "on" && !modelReady && !modelError && (
            <div className="absolute inset-x-0 top-4 z-10 mx-auto w-max rounded-full border border-cyan/40 bg-ink/80 px-4 py-1.5 font-mono text-[10px] tracking-widest text-cyan backdrop-blur">
              memuat model pelacak tangan…
            </div>
          )}
          {cam.state === "on" && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-ink/75 px-3 py-2 backdrop-blur">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); sfx.tap(); }}
                  className={`size-6 cursor-pointer rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white/70" : "opacity-60 hover:opacity-100"}`}
                  style={{ background: c, boxShadow: color === c ? `0 0 14px ${c}` : undefined }}
                  aria-label={c}
                />
              ))}
              <button
                onClick={() => {
                  const pc = paintRef.current?.getContext("2d");
                  pc?.clearRect(0, 0, paintRef.current!.width, paintRef.current!.height);
                  sfx.whoosh();
                }}
                className="grid size-7 cursor-pointer place-items-center rounded-full border border-white/15 text-muted hover:text-paper"
                aria-label="hapus"
              >
                <Eraser className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[10px] tracking-wider text-muted">
          <PenTool className="size-3 text-cyan" />
          cubit = gambar · lepas = melayang · kepal = hapus
        </p>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
