import { useCallback, useEffect, useRef, useState } from "react";
import { Aperture, Camera, Download, Grid3X3, ImagePlus, RefreshCw, Type, Spline } from "lucide-react";
import PipelineHUD, { type PipelineData } from "../lab/PipelineHUD";
import { useCamera } from "../../hooks/useCamera";
import { C } from "../../lib/theme";
import { sfx } from "../../lib/audio";

type Mode = "pixel" | "ascii" | "edge";
type Src = "none" | "camera" | "demo" | "upload";

const RAMP = " ·-~=+*#%@";

function makeDemo(c: HTMLCanvasElement) {
  c.width = 640; c.height = 400;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, "#0b1030"); g.addColorStop(0.55, "#3b1156"); g.addColorStop(1, "#0b0b14");
  x.fillStyle = g; x.fillRect(0, 0, 640, 400);
  // bintang
  for (let i = 0; i < 130; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
    x.fillRect(Math.random() * 640, Math.random() * 240, 2, 2);
  }
  // matahari/bulan
  const s = x.createRadialGradient(440, 130, 6, 440, 130, 90);
  s.addColorStop(0, "#FFF6D8"); s.addColorStop(0.35, "#FFC53D"); s.addColorStop(1, "rgba(255,197,61,0)");
  x.fillStyle = s; x.beginPath(); x.arc(440, 130, 90, 0, Math.PI * 2); x.fill();
  // gunung
  const mtn = (pts: number[], col: string) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, 400);
    pts.forEach((px, i) => x.lineTo(i % 2 ? px : pts[i], i % 2 ? (640 / ((pts.length / 2) - 1)) * ((i - 1) / 2) : 0));
    x.closePath(); x.fill();
  };
  x.fillStyle = "#17203f"; x.beginPath(); x.moveTo(0, 400);
  x.lineTo(0, 250); x.lineTo(120, 170); x.lineTo(230, 260); x.lineTo(350, 150); x.lineTo(500, 270); x.lineTo(640, 200); x.lineTo(640, 400); x.closePath(); x.fill();
  x.fillStyle = "#0e1530"; x.beginPath(); x.moveTo(0, 400);
  x.lineTo(0, 300); x.lineTo(160, 230); x.lineTo(300, 320); x.lineTo(430, 240); x.lineTo(560, 330); x.lineTo(640, 290); x.lineTo(640, 400); x.closePath(); x.fill();
  // air + pantulan
  x.fillStyle = "rgba(43,228,255,0.10)"; x.fillRect(0, 330, 640, 70);
  x.fillStyle = "rgba(255,197,61,0.25)"; x.fillRect(410, 340, 60, 3); x.fillRect(420, 360, 40, 2); x.fillRect(428, 378, 26, 2);
  x.font = "700 42px 'Space Grotesk', sans-serif";
  x.fillStyle = "rgba(237,237,244,0.95)";
  x.fillText("IMK.LAB", 30, 72);
  x.font = "12px 'JetBrains Mono', monospace";
  x.fillStyle = "#2BE4FF";
  x.fillText("gambar demo sintetis — coba juga kameramu sendiri", 32, 96);
  void mtn;
}

export default function PhotoArtLab() {
  const cam = useCamera();
  const srcRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const outRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<Src>("none");
  const [mode, setMode] = useState<Mode>("ascii");
  const [cols, setCols] = useState(56);
  const [dims, setDims] = useState({ w: 0, h: 0, rows: 0 });

  const process = useCallback((m: Mode = mode, n: number = cols) => {
    const srcC = srcRef.current;
    const out = outRef.current;
    if (!srcC.width || !out) return;
    const W = 640;
    const H = Math.round((srcC.height / srcC.width) * W);
    out.width = W; out.height = H;
    const rows = Math.round((n * H) / W);
    const cellW = W / n, cellH = H / rows;
    setDims({ w: srcC.width, h: srcC.height, rows });

    // downsample
    const tiny = document.createElement("canvas");
    tiny.width = n; tiny.height = rows;
    const tc = tiny.getContext("2d")!;
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = "high";
    tc.drawImage(srcC, 0, 0, n, rows);
    const data = tc.getImageData(0, 0, n, rows).data;

    const x = out.getContext("2d")!;
    x.fillStyle = "#050509";
    x.fillRect(0, 0, W, H);

    if (m === "pixel") {
      x.imageSmoothingEnabled = false;
      x.drawImage(tiny, 0, 0, W, H);
    } else if (m === "ascii") {
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font = `${cellW * 1.15}px 'JetBrains Mono', monospace`;
      for (let r = 0; r < rows; r++) {
        for (let cI = 0; cI < n; cI++) {
          const i = (r * n + cI) * 4;
          const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))];
          if (ch === " ") continue;
          x.fillStyle = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${0.35 + lum * 0.65})`;
          x.fillText(ch, (cI + 0.5) * cellW, (r + 0.55) * cellH);
        }
      }
    } else {
      // kontur sobel
      const gray = new Float32Array(n * rows);
      for (let i = 0; i < n * rows; i++)
        gray[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
      for (let r = 1; r < rows - 1; r++) {
        for (let cI = 1; cI < n - 1; cI++) {
          const gx =
            -gray[(r - 1) * n + cI - 1] - 2 * gray[r * n + cI - 1] - gray[(r + 1) * n + cI - 1] +
            gray[(r - 1) * n + cI + 1] + 2 * gray[r * n + cI + 1] + gray[(r + 1) * n + cI + 1];
          const gy =
            -gray[(r - 1) * n + cI - 1] - 2 * gray[(r - 1) * n + cI] - gray[(r - 1) * n + cI + 1] +
            gray[(r + 1) * n + cI - 1] + 2 * gray[(r + 1) * n + cI] + gray[(r + 1) * n + cI + 1];
          const mag = Math.hypot(gx, gy);
          if (mag > 68) {
            const a = Math.min(1, mag / 300);
            x.fillStyle = `rgba(43,228,255,${0.25 + a * 0.75})`;
            x.fillRect(cI * cellW + 0.5, r * cellH + 0.5, cellW - 1, cellH - 1);
          }
        }
      }
    }
  }, [mode, cols]);

  useEffect(() => { if (src !== "none") process(); }, [mode, cols, src, process]);

  const capture = () => {
    const v = cam.videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = srcRef.current;
    const scale = 640 / v.videoWidth;
    c.width = 640; c.height = Math.round(v.videoHeight * scale);
    const x = c.getContext("2d")!;
    x.translate(c.width, 0); x.scale(-1, 1); // cermin, seperti pratinjau
    x.drawImage(v, 0, 0, c.width, c.height);
    setSrc("camera");
    sfx.tap();
    playShutter();
  };
  const playShutter = () => sfx.whoosh();

  const useDemo = () => {
    makeDemo(srcRef.current);
    setSrc("demo");
    sfx.tap();
  };

  const onUpload = (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = srcRef.current;
      const scale = 640 / img.width;
      c.width = 640; c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      setSrc("upload");
    };
    img.src = URL.createObjectURL(f);
  };

  const download = () => {
    const out = outRef.current;
    if (!out) return;
    const a = document.createElement("a");
    a.download = `imk-lab-${mode}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
    sfx.success();
  };

  const MODES: { id: Mode; label: string; icon: any }[] = [
    { id: "pixel", label: "PIKSEL", icon: Grid3X3 },
    { id: "ascii", label: "ASCII", icon: Type },
    { id: "edge", label: "KONTUR", icon: Spline },
  ];

  const hud: PipelineData = {
    inputTitle: "INPUT — KAMERA · CITRA",
    inputIcon: <Camera className="size-3.5" />,
    live: src !== "none",
    inputRows: src === "none" ? [] : [
      { label: "sumber citra", value: src === "camera" ? "potret kamera" : src === "demo" ? "gambar sintetis" : "unggahan" },
      { label: "resolusi", value: `${dims.w}×${dims.h} px` },
      { label: "grid sampel", value: `${cols} × ${dims.rows} sel` },
      { label: "mode", value: mode.toUpperCase() },
    ],
    processSteps: src !== "none" ? {
      pixel: [
        `Perkecil citra ${dims.w}×${dims.h} → ${cols}×${dims.rows} (rata-rata warna tiap sel)`,
        "Setiap sel = satu warna hasil kuantisasi spasial",
        "Perbesar kembali tanpa interpolasi → mozaik piksel",
      ],
      ascii: [
        `Turun-sampel citra → grid ${cols}×${dims.rows}`,
        "Tiap sel: hitung luminansi 0.21R+0.71G+0.07B",
        `Peta luminansi → karakter " ·-~=+*#%@" (10 tingkat)`,
        "Warna karakter diambil dari warna rata-rata sel",
      ],
      edge: [
        `Citra → skala abu ${cols}×${dims.rows}`,
        "Kernel Sobel: gradien horizontal & vertikal tiap piksel",
        "|∇| > ambang → digambar sebagai kontur cyan",
      ],
    }[mode] : [],
    feedback: src !== "none" ? [
      { label: "VISUAL", detail: mode === "ascii" ? "lukisan karakter" : mode === "pixel" ? "mozaik piksel" : "peta kontur", color: "cyan" },
    ] : [],
    note: "Foto hanyalah matriks angka. Dengan menurunkan resolusi, mengkuantisasi luminansi, atau mencari gradien — komputer 'melihat' struktur. Inilah fondasi seluruh pengolahan citra.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          {/* panel kamera / sumber */}
          <div className="flex flex-col gap-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-ink-2">
              <video ref={cam.videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
              {cam.state !== "on" && (
                <button
                  onClick={cam.start}
                  className="absolute inset-0 grid cursor-pointer place-items-center bg-ink/60 text-center backdrop-blur-sm hover:bg-ink/40"
                >
                  <span>
                    <Aperture className="mx-auto size-6 text-cyan" />
                    <span className="mt-2 block px-2 font-mono text-[9px] tracking-[0.2em] text-paper">
                      {cam.state === "loading" ? "MEMBUKA…" : cam.state === "denied" ? "IZIN DITOLAK — COBA LAGI" : "NYALAKAN KAMERA"}
                    </span>
                  </span>
                </button>
              )}
            </div>
            <button onClick={capture} disabled={cam.state !== "on"} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan px-3 py-2 font-mono text-[10px] font-bold tracking-widest text-ink transition-all disabled:opacity-30">
              <Camera className="size-3.5" /> POTRET
            </button>
            <button onClick={useDemo} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 px-3 py-2 font-mono text-[10px] font-bold tracking-widest text-muted transition-all hover:border-violet/50 hover:text-violet">
              <RefreshCw className="size-3" /> GAMBAR DEMO
            </button>
            <button onClick={() => fileRef.current?.click()} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/15 px-3 py-2 font-mono text-[10px] font-bold tracking-widest text-muted transition-all hover:border-lime/50 hover:text-lime">
              <ImagePlus className="size-3" /> UNGGAH FOTO
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />
          </div>

          {/* hasil */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050509]">
            {src === "none" ? (
              <div className="grid h-full min-h-60 place-items-center p-6 text-center">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-muted">HASIL GRAFIS MUNCUL DI SINI</p>
                  <p className="mt-2 text-xs text-white/30">potret kamera · gambar demo · atau unggah foto</p>
                </div>
              </div>
            ) : (
              <canvas ref={outRef} className="block h-auto w-full" />
            )}
          </div>
        </div>

        {/* kontrol */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-white/10 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); sfx.tap(); }}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-[10px] font-bold tracking-wider transition-all ${
                  mode === m.id ? "bg-violet text-ink shadow-[0_0_20px_rgba(139,124,255,0.4)]" : "text-muted hover:text-paper"
                }`}
              >
                <m.icon className="size-3" /> {m.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-muted">
            RESOLUSI
            <input
              type="range" min={16} max={96} value={cols}
              onChange={(e) => setCols(+e.target.value)}
              className="h-1 w-28 cursor-pointer appearance-none rounded bg-white/15 accent-cyan"
            />
            <span className="text-cyan">{cols}</span>
          </label>
          <button onClick={download} disabled={src === "none"} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-lime/40 px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-lime transition-all hover:bg-lime hover:text-ink disabled:opacity-30">
            <Download className="size-3" /> UNDUH
          </button>
        </div>
        <p style={{ color: C.muted }} className="mt-3 font-mono text-[9.5px] tracking-wider">
          geser resolusi & lihat bagaimana jumlah sampel mengubah kualitas citra digital
        </p>
      </div>
      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
