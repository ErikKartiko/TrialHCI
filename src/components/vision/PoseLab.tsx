import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, PersonStanding } from "lucide-react";
import PipelineHUD, { type PipelineData } from "../lab/PipelineHUD";
import CameraGate from "./CameraGate";
import { useCamera } from "../../hooks/useCamera";
import { coverMapper, getPoseLandmarker, POSE_EDGES, type NL } from "../../lib/vision";
import { C, hexToRgba } from "../../lib/theme";
import { playChord, buzz } from "../../lib/audio";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";

const ENERGY_KEY = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

function energyColor(e: number) {
  return e < 0.28 ? C.cyan : e < 0.55 ? C.lime : e < 0.78 ? C.amber : C.magenta;
}

export default function PoseLab() {
  const cam = useCamera();
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const lmRef = useRef<PoseLandmarker | null>(null);
  const prevLm = useRef<NL[] | null>(null);
  const smoothE = useRef(0);
  const poseCooldown = useRef(0);
  const lastTs = useRef(0);
  const inferMs = useRef(0);

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [poseName, setPoseName] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const [ms, setMs] = useState(0);
  const statTick = useRef(0);

  const startAll = async () => {
    setModelError(false);
    await cam.start();
    try {
      lmRef.current = await getPoseLandmarker();
      setModelReady(true);
    } catch {
      setModelError(true);
    }
  };

  useEffect(() => {
    if (cam.state !== "on") return;
    prevLm.current = null;
    let running = true;

    const loop = () => {
      if (!running) return;
      raf.current = requestAnimationFrame(loop);
      const video = cam.videoRef.current;
      const pose = lmRef.current;
      const overlay = overlayRef.current;
      const stage = stageRef.current;
      if (!video || !pose || !overlay || !stage || video.readyState < 2) return;

      const ts = Math.max(performance.now(), lastTs.current + 1);
      lastTs.current = ts;
      const t0 = performance.now();
      const res = pose.detectForVideo(video, ts);
      inferMs.current = inferMs.current * 0.9 + (performance.now() - t0) * 0.1;

      const W = stage.clientWidth, H = stage.clientHeight;
      if (overlay.width !== W) { overlay.width = W; overlay.height = H; }
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      const map = coverMapper(video.videoWidth || 640, video.videoHeight || 480, W, H);

      const lm: NL[] | undefined = res.landmarks?.[0] as any;
      const now = performance.now();

      if (lm) {
        // energi = kecepatan rata-rata sendi kunci
        let e = 0, n = 0;
        if (prevLm.current) {
          for (const i of ENERGY_KEY) {
            e += Math.hypot(lm[i].x - prevLm.current[i].x, lm[i].y - prevLm.current[i].y);
            n++;
          }
        }
        prevLm.current = lm;
        const inst = Math.min(1, (e / Math.max(1, n)) * 26);
        smoothE.current = smoothE.current * 0.9 + inst * 0.1;
        const E = smoothE.current;
        const col = energyColor(E);

        // kerangka
        ctx.lineCap = "round";
        for (const [a, b] of POSE_EDGES) {
          if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
          const p = map(lm[a].x, lm[a].y), q = map(lm[b].x, lm[b].y);
          ctx.strokeStyle = hexToRgba(col, 0.9);
          ctx.lineWidth = 3.5;
          ctx.shadowColor = col;
          ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        for (const i of ENERGY_KEY) {
          if ((lm[i].visibility ?? 1) < 0.4) continue;
          const p = map(lm[i].x, lm[i].y);
          ctx.fillStyle = hexToRgba("#FFFFFF", 0.95);
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
        }
        // kepala
        const ear1 = map(lm[7].x, lm[7].y), ear2 = map(lm[8].x, lm[8].y);
        const nose = map(lm[0].x, lm[0].y);
        const hr = Math.max(12, Math.hypot(ear1.x - ear2.x, ear1.y - ear2.y) * 1.15);
        ctx.strokeStyle = hexToRgba(col, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(nose.x, nose.y, hr, 0, Math.PI * 2); ctx.stroke();

        // klasifikasi pose
        const vis = (i: number) => (lm[i].visibility ?? 1) > 0.55;
        let detected: string | null = null;
        const wL = lm[15], wR = lm[16], no = lm[0], shL = lm[11], shR = lm[12];
        const hipL = lm[23], hipR = lm[24], knL = lm[25], knR = lm[26];
        if (vis(15) && vis(16) && vis(0) && wL.y < no.y - 0.03 && wR.y < no.y - 0.03)
          detected = "TANGAN TERANGKAT";
        else if (
          vis(15) && vis(16) && vis(11) && vis(12) &&
          Math.abs(wL.y - shL.y) < 0.09 && Math.abs(wR.y - shR.y) < 0.09 &&
          Math.abs(wL.x - wR.x) > Math.abs(shL.x - shR.x) * 1.5
        )
          detected = "POSE T";
        else if (vis(23) && vis(25) && vis(11)) {
          const torso = Math.abs(((shL.y + shR.y) / 2) - ((hipL.y + hipR.y) / 2));
          const hipY = (hipL.y + hipR.y) / 2, kneeY = (knL.y + knR.y) / 2;
          if (Math.abs(hipY - kneeY) < Math.max(0.05, torso * 0.35)) detected = "JONGKOK";
        }

        if (detected && now - poseCooldown.current > 1400) {
          poseCooldown.current = now;
          setPoseName(detected);
          playChord([392, 493.88, 587.33], { dur: 0.2, type: "triangle", gain: 0.07 });
          buzz([20, 40, 20]);
        }

        if (now - statTick.current > 130) {
          statTick.current = now;
          setEnergy(Math.round(E * 100));
          setFound(true);
          setMs(Math.round(inferMs.current));
        }
      } else if (now - statTick.current > 300) {
        statTick.current = now;
        setFound(false);
        setEnergy((v) => Math.max(0, v - 6));
        smoothE.current *= 0.95;
      }
    };
    loop();
    return () => { running = false; cancelAnimationFrame(raf.current); };
  }, [cam.state, cam.videoRef]);

  const col = energyColor(energy / 100);
  const hud: PipelineData = {
    inputTitle: "INPUT — KAMERA · TUBUH",
    inputIcon: <PersonStanding className="size-3.5" />,
    live: cam.state === "on" && modelReady,
    inputRows: cam.state !== "on" ? [] : [
      { label: "tubuh terdeteksi", value: found ? "YA" : "mencari…" },
      { label: "titik kerangka", value: found ? "33 landmark" : "—" },
      { label: "energi gerak", value: `${energy}%` },
      { label: "pose khusus", value: poseName ?? "—" },
      { label: "inferensi/frame", value: ms ? `${ms} ms` : "—" },
    ],
    processSteps: cam.state === "on" && modelReady && found ? [
      "Frame video → CNN pose (BlazePose)",
      "Regresi 33 titik: bahu, siku, pergelangan, pinggul, lutut…",
      `Energi = kecepatan rata-rata sendi → ${energy}%`,
      `Aturan pose: ${poseName ? `cocok → '${poseName}'` : "menunggu tangan terangkat / pose T / jongkok"}`,
    ] : cam.state === "on" && modelReady ? ["Menunggu tubuh masuk bingkai…"] : [],
    feedback: found ? [
      { label: "VISUAL", detail: `kerangka neon (${energy < 28 ? "tenang" : energy < 55 ? "aktif" : energy < 78 ? "enerjik" : "MELETUP"})`, color: "cyan" },
      { label: "AUDIO", detail: "nada saat pose dikenali", color: "lime" },
      { label: "HAPTIK", detail: "denyut saat pose", color: "magenta" },
    ] : [],
    note: "Coba: angkat kedua tangan, rentangkan menyamping (pose T), atau jongkok. Teknologi serupa dipakai di game motion-capture & analisis olahraga.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div ref={stageRef} className="stage relative h-[440px] overflow-hidden rounded-3xl border border-white/10 bg-ink-2 md:h-[500px]">
          <video ref={cam.videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-40" />
          <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
          {cam.state !== "on" && (
            <CameraGate
              state={modelError ? "error" : cam.state}
              onStart={startAll}
              title="AKTIFKAN PELACAK TUBUH"
              desc="mundur sedikit agar tubuhmu masuk bingkai — komputer akan memasang 33 titik kerangka padamu"
            />
          )}
          {cam.state === "on" && !modelReady && !modelError && (
            <div className="absolute inset-x-0 top-4 z-10 mx-auto w-max rounded-full border border-cyan/40 bg-ink/80 px-4 py-1.5 font-mono text-[10px] tracking-widest text-cyan backdrop-blur">
              memuat model pelacak pose…
            </div>
          )}
          <AnimatePresence>
            {poseName && cam.state === "on" && (
              <motion.div
                key={poseName + String(poseCooldown.current)}
                initial={{ opacity: 0, scale: 0.75, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2"
              >
                <div className="rounded-2xl border border-lime/50 bg-ink/85 px-6 py-2.5 backdrop-blur-xl" style={{ boxShadow: "0 0 40px rgba(184,245,61,0.25)" }}>
                  <p className="font-display text-lg font-bold tracking-wide text-lime">{poseName}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* meter energi */}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/2 p-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] tracking-[0.2em] text-muted">
            <span className="flex items-center gap-1.5"><Activity className="size-3" style={{ color: col }} /> ENERGI GERAKAN</span>
            <span style={{ color: col }}>{cam.state === "on" && found ? `${energy}%` : "—"}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${energy}%`, background: `linear-gradient(90deg, ${C.cyan}, ${col})`, boxShadow: `0 0 14px ${col}` }}
            />
          </div>
          <p className="mt-2 font-mono text-[9px] tracking-wider text-muted">bergeraklah — semakin cepat gerakanmu, semakin panas warnanya</p>
        </div>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
