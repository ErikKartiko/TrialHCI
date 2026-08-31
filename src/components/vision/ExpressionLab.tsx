import { useEffect, useRef, useState } from "react";
import { Angry, Eye, Frown, Laugh, Smile, ScanFace } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PipelineHUD, { type PipelineData } from "../lab/PipelineHUD";
import CameraGate from "./CameraGate";
import { useCamera } from "../../hooks/useCamera";
import { coverMapper, FACE_OVAL, getFaceLandmarker, LIPS_OUTER, type NL } from "../../lib/vision";
import { C, hexToRgba } from "../../lib/theme";
import { playTone } from "../../lib/audio";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

type BlendMap = Record<string, number>;
const avg = (b: BlendMap, ...keys: string[]) => keys.reduce((s, k) => s + (b[k] ?? 0), 0) / keys.length;

const EXPR = [
  { id: "smile", label: "SENYUM", icon: Smile, color: C.lime, get: (b: BlendMap) => avg(b, "mouthSmileLeft", "mouthSmileRight") },
  { id: "frown", label: "SEDIH", icon: Frown, color: C.violet, get: (b: BlendMap) => avg(b, "mouthFrownLeft", "mouthFrownRight") },
  { id: "wow", label: "TERKEJUT", icon: Laugh, color: C.amber, get: (b: BlendMap) => avg(b, "jawOpen", "browInnerUp") },
  { id: "angry", label: "MARAH", icon: Angry, color: C.magenta, get: (b: BlendMap) => avg(b, "browDownLeft", "browDownRight") },
  { id: "blink", label: "KEDIP", icon: Eye, color: C.cyan, get: (b: BlendMap) => avg(b, "eyeBlinkLeft", "eyeBlinkRight") },
];

export default function ExpressionLab() {
  const cam = useCamera();
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const lmRef = useRef<FaceLandmarker | null>(null);
  const lastTs = useRef(0);
  const statTick = useRef(0);
  const domLatch = useRef("");

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [found, setFound] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [dominant, setDominant] = useState<(typeof EXPR)[number] | null>(null);

  const startAll = async () => {
    setModelError(false);
    await cam.start();
    try {
      lmRef.current = await getFaceLandmarker();
      setModelReady(true);
    } catch {
      setModelError(true);
    }
  };

  useEffect(() => {
    if (cam.state !== "on") return;
    let running = true;

    const drawPolyline = (ctx: CanvasRenderingContext2D, map: any, lm: NL[], idx: number[], color: string, close = true) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      idx.forEach((i, k) => {
        const p = map(lm[i].x, lm[i].y);
        k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      if (close) ctx.closePath();
      ctx.stroke();
    };

    const loop = () => {
      if (!running) return;
      raf.current = requestAnimationFrame(loop);
      const video = cam.videoRef.current;
      const face = lmRef.current;
      const overlay = overlayRef.current;
      const stage = stageRef.current;
      if (!video || !face || !overlay || !stage || video.readyState < 2) return;

      const ts = Math.max(performance.now(), lastTs.current + 1);
      lastTs.current = ts;
      const res = face.detectForVideo(video, ts);
      const lm: NL[] | undefined = res.faceLandmarks?.[0] as any;
      const now = performance.now();

      const W = stage.clientWidth, H = stage.clientHeight;
      if (overlay.width !== W) { overlay.width = W; overlay.height = H; }
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, W, H);
      const map = coverMapper(video.videoWidth || 640, video.videoHeight || 480, W, H);

      if (lm) {
        const cats: any[] = (res.faceBlendshapes?.[0]?.categories as any) ?? [];
        const b: BlendMap = {};
        for (const c of cats) b[c.categoryName] = c.score;

        const blink = avg(b, "eyeBlinkLeft", "eyeBlinkRight");

        /* wireframe wajah */
        drawPolyline(ctx, map, lm, FACE_OVAL, "rgba(43,228,255,0.55)");
        drawPolyline(ctx, map, lm, LIPS_OUTER, "rgba(255,61,138,0.8)");
        drawPolyline(ctx, map, lm, [70, 63, 105, 66, 107], "rgba(255,255,255,0.35)", false);
        drawPolyline(ctx, map, lm, [300, 293, 334, 296, 336], "rgba(255,255,255,0.35)", false);
        // mata + iris
        for (const [c1, c2, iris] of [[33, 133, 473], [362, 263, 468]] as const) {
          const a = map(lm[c1].x, lm[c1].y), q = map(lm[c2].x, lm[c2].y);
          const cx = (a.x + q.x) / 2, cy = (a.y + q.y) / 2;
          const r = Math.max(5, Math.hypot(a.x - q.x, a.y - q.y) / 2.1);
          ctx.strokeStyle = "rgba(237,237,244,0.55)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * Math.max(0.12, 1 - blink), 0, 0, Math.PI * 2);
          ctx.stroke();
          const ip = map(lm[iris].x, lm[iris].y);
          ctx.fillStyle = hexToRgba(C.cyan, 0.9);
          ctx.beginPath(); ctx.arc(ip.x, ip.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        /* skor ekspresi */
        const s: Record<string, number> = {};
        for (const e of EXPR) s[e.id] = e.get(b);
        let dom: (typeof EXPR)[number] | null = null;
        let best = 0.3;
        for (const e of EXPR) {
          if (e.id === "blink") continue;
          if (s[e.id] > best) { best = s[e.id]; dom = e; }
        }
        if (dom && dom.id !== domLatch.current) {
          domLatch.current = dom.id;
          setDominant(dom);
          playTone({ freq: dom.id === "angry" ? 220 : dom.id === "smile" ? 660 : dom.id === "wow" ? 520 : 330, dur: 0.12, type: "triangle", gain: 0.06 });
        }
        if (!dom) domLatch.current = "";

        if (now - statTick.current > 110) {
          statTick.current = now;
          setScores(s);
          setFound(true);
        }
      } else if (now - statTick.current > 300) {
        statTick.current = now;
        setFound(false);
        setDominant(null);
      }
    };
    loop();
    return () => { running = false; cancelAnimationFrame(raf.current); };
  }, [cam.state, cam.videoRef]);

  const hud: PipelineData = {
    inputTitle: "INPUT — KAMERA · WAJAH",
    inputIcon: <ScanFace className="size-3.5" />,
    live: cam.state === "on" && modelReady,
    inputRows: cam.state !== "on" ? [] : [
      { label: "wajah terdeteksi", value: found ? "YA" : "mencari…" },
      { label: "titik wajah", value: found ? "478 landmark" : "—" },
      { label: "koefisien blendshape", value: found ? "52 saluran FACS" : "—" },
      { label: "ekspresi dominan", value: dominant ? dominant.label : "netral" },
    ],
    processSteps: cam.state === "on" && modelReady && found ? [
      "CNN wajah → 478 titik mesh 3D",
      "Jaringan blendshape → 52 bobot otot wajah (FACS)",
      EXPR.map((e) => `${e.label[0]}${e.label.slice(1).toLowerCase()}: ${Math.round((scores[e.id] ?? 0) * 100)}%`).join(" · "),
      dominant ? `Bobot tertinggi → '${dominant.label}'` : "Semua bobot < 30% → ekspresi NETRAL",
    ] : cam.state === "on" && modelReady ? ["Menunggu wajah masuk bingkai…"] : [],
    feedback: found ? [
      { label: "VISUAL", detail: "wireframe wajah + meter ekspresi", color: "cyan" },
      { label: "AUDIO", detail: "nada tiap perubahan ekspresi", color: "lime" },
    ] : [],
    note: "Blendshape adalah 52 bobot otot wajah standar industri (FACS) — teknologi di balik Animoji, filter AR, dan motion capture film.",
  };

  const Dom = dominant;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div ref={stageRef} className="stage relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-ink-2 md:h-[460px]">
          <video ref={cam.videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-50" />
          <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
          {cam.state !== "on" && (
            <CameraGate
              state={modelError ? "error" : cam.state}
              onStart={startAll}
              title="AKTIFKAN DETEKSI EKSPRESI"
              desc="tersenyumlah, cemberut, buka mulutmu lebar — komputer membaca 52 otot wajahmu"
            />
          )}
          {cam.state === "on" && !modelReady && !modelError && (
            <div className="absolute left-4 top-4 z-20 rounded-full border border-cyan/40 bg-ink/80 px-4 py-1.5 font-mono text-[10px] tracking-widest text-cyan backdrop-blur">
              memuat model wajah…
            </div>
          )}
          <AnimatePresence>
            {Dom && (
              <motion.div
                key={Dom.id}
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 340, damping: 20 }}
                className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2"
              >
                <div
                  className="flex items-center gap-2.5 rounded-2xl border bg-ink/85 px-5 py-2.5 backdrop-blur-xl"
                  style={{ borderColor: hexToRgba(Dom.color, 0.5), boxShadow: `0 0 36px ${hexToRgba(Dom.color, 0.25)}` }}
                >
                  <Dom.icon className="size-5" style={{ color: Dom.color }} />
                  <span className="font-display text-base font-bold tracking-wide" style={{ color: Dom.color }}>{Dom.label}</span>
                  <span className="font-mono text-[10px] text-muted">{Math.round((scores[Dom.id] ?? 0) * 100)}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* meter ekspresi */}
        <div className="mt-4 space-y-2">
          {EXPR.map((e) => {
            const v = Math.round((scores[e.id] ?? 0) * 100);
            return (
              <div key={e.id} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/3" style={{ color: e.color }}>
                  <e.icon className="size-4" />
                </span>
                <span className="w-20 shrink-0 font-mono text-[9px] tracking-[0.15em] text-muted">{e.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${v}%`, background: e.color, boxShadow: `0 0 10px ${e.color}` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-[10px] font-bold" style={{ color: e.color }}>{v}%</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center font-mono text-[10px] tracking-wider text-muted">
          ubah ekspresi wajahmu — <span className="text-cyan">meter & wireframe diperbarui setiap frame</span>
        </p>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
