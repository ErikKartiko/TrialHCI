import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import PipelineHUD, { type PipelineData } from "../lab/PipelineHUD";
import CameraGate from "./CameraGate";
import { useCamera } from "../../hooks/useCamera";
import { coverMapper, getFaceLandmarker, type NL } from "../../lib/vision";
import { C, hexToRgba } from "../../lib/theme";
import { playTone, sfx } from "../../lib/audio";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

/* pasangan indeks landmark: iris, sudut mata, kelopak atas/bawah */
const EYES = [
  { iris: 468, c1: 362, c2: 263, top: 386, bot: 374 },
  { iris: 473, c1: 33, c2: 133, top: 159, bot: 145 },
];
const ZONE_LABEL = ["KIRI ATAS", "ATAS", "KANAN ATAS", "KIRI", "TENGAH", "KANAN", "KIRI BAWAH", "BAWAH", "KANAN BAWAH"];

export default function GazeLab() {
  const cam = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const lmRef = useRef<FaceLandmarker | null>(null);
  const lastTs = useRef(0);
  const gaze = useRef({ x: 0.5, y: 0.5 });
  const zoneSince = useRef({ zone: -1, t: 0 });
  const blinkLatch = useRef(false);
  const litRef = useRef<Set<number>>(new Set());
  const zoneRef = useRef(4);
  const statTick = useRef(0);

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [found, setFound] = useState(false);
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [zone, setZone] = useState(4);
  const [blinks, setBlinks] = useState(0);
  const [ratios, setRatios] = useState({ x: 0.5, y: 0.5 });

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

    const loop = () => {
      if (!running) return;
      raf.current = requestAnimationFrame(loop);
      const video = cam.videoRef.current;
      const face = lmRef.current;
      const panel = panelRef.current;
      if (!video || !face || !panel || video.readyState < 2) return;

      const ts = Math.max(performance.now(), lastTs.current + 1);
      lastTs.current = ts;
      const res = face.detectForVideo(video, ts);
      const lm: NL[] | undefined = res.faceLandmarks?.[0] as any;
      const now = performance.now();

      if (lm) {
        /* rasio iris relatif kelopak tiap mata */
        let gx = 0, gy = 0;
        for (const e of EYES) {
          const c1 = lm[e.c1], c2 = lm[e.c2];
          const minX = Math.min(c1.x, c2.x), maxX = Math.max(c1.x, c2.x);
          gx += (lm[e.iris].x - minX) / Math.max(0.0001, maxX - minX);
          const minY = Math.min(lm[e.top].y, lm[e.bot].y), maxY = Math.max(lm[e.top].y, lm[e.bot].y);
          gy += (lm[e.iris].y - minY) / Math.max(0.0001, maxY - minY);
        }
        gx /= EYES.length; gy /= EYES.length;
        // amplifikasi (rentang iris sempit) + cermin (pratinjau dicerminkan)
        gx = Math.min(1, Math.max(0, (gx - 0.5) * 2.4 + 0.5));
        gy = Math.min(1, Math.max(0, (gy - 0.5) * 2.6 + 0.5));
        gx = 1 - gx;
        gaze.current.x += (gx - gaze.current.x) * 0.32;
        gaze.current.y += (gy - gaze.current.y) * 0.32;

        // kedipan
        const cats: any[] = (res.faceBlendshapes?.[0]?.categories as any) ?? [];
        const bL = cats.find((c) => c.categoryName === "eyeBlinkLeft")?.score ?? 0;
        const bR = cats.find((c) => c.categoryName === "eyeBlinkRight")?.score ?? 0;
        const blink = Math.max(bL, bR) > 0.5;
        if (blink && !blinkLatch.current) {
          blinkLatch.current = true;
          setBlinks((b) => b + 1);
          playTone({ freq: 300, dur: 0.05, type: "sine", gain: 0.04 });
        } else if (!blink) blinkLatch.current = false;

        // zona & dwell
        const zx = Math.min(2, Math.floor(gaze.current.x * 3));
        const zy = Math.min(2, Math.floor(gaze.current.y * 3));
        const z = zy * 3 + zx;
        if (z !== zoneSince.current.zone) zoneSince.current = { zone: z, t: now };
        else if (now - zoneSince.current.t > 350 && !litRef.current.has(z)) {
          litRef.current.add(z);
          setLit(new Set(litRef.current));
          sfx.tap();
        }
        if (z !== zoneRef.current) {
          zoneRef.current = z;
          setZone(z);
        }

        if (now - statTick.current > 220) {
          statTick.current = now;
          setRatios({ x: +gaze.current.x.toFixed(2), y: +gaze.current.y.toFixed(2) });
          setFound(true);
        }

        /* gambar iris pada pratinjau mini */
        const mini = miniRef.current;
        if (mini && stageRef.current) {
          const sw = mini.width, sh = mini.height;
          const mctx = mini.getContext("2d")!;
          mctx.clearRect(0, 0, sw, sh);
          const map = coverMapper(video.videoWidth || 640, video.videoHeight || 480, sw, sh);
          for (const e of EYES) {
            const p = map(lm[e.iris].x, lm[e.iris].y);
            mctx.fillStyle = hexToRgba(C.cyan, 0.95);
            mctx.beginPath(); mctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); mctx.fill();
          }
        }
      } else {
        setFound(false);
      }

      /* posisi titik tatapan (di-luar state agar 60fps) */
      if (dotRef.current) {
        dotRef.current.style.left = `${(gaze.current.x * 100).toFixed(2)}%`;
        dotRef.current.style.top = `${(gaze.current.y * 100).toFixed(2)}%`;
      }
    };
    loop();
    return () => { running = false; cancelAnimationFrame(raf.current); };
  }, [cam.state, cam.videoRef]);

  const hud: PipelineData = {
    inputTitle: "INPUT — KAMERA · MATA",
    inputIcon: <Eye className="size-3.5" />,
    live: cam.state === "on" && modelReady,
    inputRows: cam.state !== "on" ? [] : [
      { label: "wajah terdeteksi", value: found ? "YA" : "mencari…" },
      { label: "iris dilacak", value: found ? "2 mata · 10 titik iris" : "—" },
      { label: "rasio tatapan", value: found ? `x ${ratios.x} · y ${ratios.y}` : "—" },
      { label: "zona dipandang", value: ZONE_LABEL[zone] },
      { label: "kedipan", value: String(blinks) },
    ],
    processSteps: cam.state === "on" && modelReady && found ? [
      "CNN wajah → 478 titik (termasuk 10 titik iris)",
      `Posisi iris relatif sudut mata → rasio (${ratios.x}, ${ratios.y})`,
      "Amplifikasi + penghalusan sinyal (lerp 0.32)",
      `Petakan ke zona layar 3×3 → '${ZONE_LABEL[zone]}'`,
    ] : cam.state === "on" && modelReady ? ["Menunggu wajah masuk bingkai…"] : [],
    feedback: found ? [
      { label: "VISUAL", detail: "titik tatapan + zona menyala", color: "cyan" },
      { label: "AUDIO", detail: "tick saat zona terkunci + kedip", color: "lime" },
    ] : [],
    note: "Estimasi tatapan kasar tanpa kalibrasi — eye-tracker profesional memakai kamera inframerah, tapi prinsipnya sama: posisi iris relatif kelopak mata.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div ref={stageRef} className="stage relative h-[480px] overflow-hidden rounded-3xl border border-white/10 bg-ink-2">
          {cam.state !== "on" && (
            <CameraGate
              state={modelError ? "error" : cam.state}
              onStart={startAll}
              title="AKTIFKAN PELACAK MATA"
              desc="komputer menemukan iris matamu dan menebak ke arah mana kamu memandang"
            />
          )}
          {cam.state === "on" && (
            <>
              {/* panel zona 3×3 */}
              <div ref={panelRef} className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 p-4 pr-40 md:pr-44 lg:pr-36 xl:pr-44">
                {Array.from({ length: 9 }).map((_, i) => {
                  const on = lit.has(i);
                  const activeZ = i === zone && found;
                  return (
                    <div
                      key={i}
                      className={`grid place-items-center rounded-2xl border transition-all duration-500 ${
                        on ? "border-lime/50 bg-lime/10" : activeZ ? "border-cyan/50 bg-cyan/10" : "border-white/8 bg-white/2"
                      }`}
                      style={activeZ && !on ? { boxShadow: "0 0 30px rgba(43,228,255,0.15)" } : on ? { boxShadow: "0 0 24px rgba(184,245,61,0.12)" } : undefined}
                    >
                      <span className={`font-mono text-[8px] tracking-[0.2em] md:text-[9px] ${on ? "text-lime" : activeZ ? "text-cyan" : "text-white/20"}`}>
                        {on ? "TERKUNCI" : ZONE_LABEL[i]}
                      </span>
                    </div>
                  );
                })}
                {/* titik tatapan */}
                <div
                  ref={dotRef}
                  className="pointer-events-none absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity"
                  style={{
                    background: "radial-gradient(circle, #fff, #2BE4FF 55%, rgba(43,228,255,0) 75%)",
                    boxShadow: "0 0 26px rgba(43,228,255,0.85)",
                    opacity: found ? 1 : 0.25,
                    transitionProperty: "opacity",
                  }}
                />
              </div>

              {/* pratinjau kamera mini */}
              <div className="absolute right-3 top-3 z-10 w-32 overflow-hidden rounded-xl border border-white/15 md:w-36">
                <video ref={cam.videoRef} playsInline muted className="block w-full -scale-x-100" />
                <canvas ref={miniRef} width={144} height={108} className="absolute inset-0 h-full w-full" />
                <p className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[7px] tracking-[0.25em] text-white/70">IRIS-CAM</p>
              </div>

              <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-white/10 bg-ink/75 px-3 py-1.5 font-mono text-[9px] tracking-wider text-muted backdrop-blur">
                zona terkunci: <span className="font-bold text-lime">{lit.size}/9</span>
              </div>

              {lit.size === 9 && (
                <div className="absolute inset-x-0 bottom-12 z-10 text-center">
                  <p className="inline-block rounded-full bg-lime px-5 py-2 font-mono text-[10px] font-bold tracking-[0.25em] text-ink shadow-[0_0_36px_rgba(184,245,61,0.5)]">
                    SEMUA ZONA TERPANDANG — TATAPANMU MENGENDALIKAN LAYAR
                  </p>
                </div>
              )}
            </>
          )}
          {cam.state === "on" && !modelReady && !modelError && (
            <div className="absolute left-4 top-4 z-20 rounded-full border border-cyan/40 bg-ink/80 px-4 py-1.5 font-mono text-[10px] tracking-widest text-cyan backdrop-blur">
              memuat model wajah…
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-wider text-muted">
            pandang tiap zona ± 0,4 detik untuk menandainya · berkedip menambah penghitung
          </p>
          <button
            onClick={() => { litRef.current = new Set(); setLit(new Set()); setBlinks(0); sfx.whoosh(); }}
            className="cursor-pointer rounded-full border border-white/15 px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-muted transition-all hover:border-magenta/50 hover:text-magenta"
          >
            RESET
          </button>
        </div>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
