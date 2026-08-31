import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Terminal } from "lucide-react";
import PipelineHUD, { type PipelineData } from "./PipelineHUD";
import { LabButton } from "../ui";
import { getAudioCtx, speak } from "../../lib/audio";
import { C, hexToRgba } from "../../lib/theme";

const SR =
  typeof window !== "undefined"
    ? window.SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

const COLOR_WORDS: Record<string, string> = {
  merah: C.magenta,
  biru: C.cyan,
  hijau: C.lime,
  ungu: C.violet,
  kuning: C.amber,
};

type Status = "idle" | "listening" | "speaking";

function parseCommand(t: string): { cmd: string; response: string; color?: string; stop?: boolean } {
  const s = t.toLowerCase();
  for (const key of Object.keys(COLOR_WORDS)) {
    if (s.includes(key))
      return { cmd: `ubah warna → '${key}'`, response: `Baik, kuubah warnaku menjadi ${key}.`, color: COLOR_WORDS[key] };
  }
  if (/halo|hai |hei |hello|^hai$|^hei$/.test(s))
    return { cmd: "deteksi sapaan", response: "Halo! Senang sekali ada manusia yang mengajakku bicara." };
  if (s.includes("siapa"))
    return { cmd: "kueri identitas", response: "Aku komputer. Kamu manusia. Dan saat ini kita sedang berinteraksi." };
  if (s.includes("jam") || s.includes("waktu")) {
    const d = new Date();
    return { cmd: "kueri waktu sistem", response: `Sekarang pukul ${d.getHours()} lewat ${d.getMinutes()} menit.` };
  }
  if (s.includes("terima kasih")) return { cmd: "deteksi apresiasi", response: "Sama-sama! Kapan pun kamu butuh." };
  if (s.includes("berhenti") || s.includes("stop"))
    return { cmd: "perintah berhenti", response: "Baik, aku berhenti mendengarkan. Sampai jumpa!", stop: true };
  return { cmd: "mode echo", response: `Kamu berkata: ${t}. Aku mendengarnya dengan jelas.` };
}

const HINTS = ['"halo"', '"ubah warna biru"', '"jam berapa"', '"siapa kamu"', '"berhenti"'];

export default function VoiceLab() {
  const supported = !!SR;
  const [status, setStatus] = useState<Status>("idle");
  const [sim, setSim] = useState(!supported);
  const [simText, setSimText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [words, setWords] = useState(0);
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState("");
  const [orb, setOrb] = useState(C.violet);
  const [err, setErr] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [source, setSource] = useState("—");

  const recRef = useRef<any>(null);
  const wantListen = useRef(false);
  const speakingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(0);
  const rafRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  statusRef.current = status;

  /* ---------- visual loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const draw = (t: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const N = 56;
      const bw = W / N;
      let data: Uint8Array<ArrayBuffer> | null = null;
      if (analyserRef.current) {
        data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
      }
      let lvl = 0;
      for (let i = 0; i < N; i++) {
        let v: number;
        if (data) {
          v = data[Math.floor((i / N) * data.length * 0.7)] / 255;
        } else if (statusRef.current !== "idle") {
          v = 0.08 + Math.abs(Math.sin(t / 300 + i * 0.55)) * 0.1;
        } else {
          v = 0.03 + Math.abs(Math.sin(t / 900 + i)) * 0.025;
        }
        lvl += v;
        const h = Math.max(2, v * H);
        const listening = statusRef.current === "listening";
        const col = statusRef.current === "speaking" ? orb : listening ? C.cyan : "#3a3a52";
        ctx.fillStyle = hexToRgba(col, 0.25 + v * 0.75);
        ctx.fillRect(i * bw + 1, (H - h) / 2, bw - 2, h);
      }
      levelRef.current = lvl / N;
      if (orbRef.current) {
        const s = 1 + levelRef.current * 0.9;
        orbRef.current.style.transform = `scale(${s.toFixed(3)})`;
      }
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [orb]);

  /* ---------- speech ---------- */
  const handleFinal = (text: string, conf: number, src: string) => {
    setTranscript(text);
    setWords((w) => w + text.trim().split(/\s+/).filter(Boolean).length);
    if (conf) setConfidence(Math.round(conf * 100));
    setSource(src);

    const p = parseCommand(text);
    setCommand(p.cmd);
    if (p.color) setOrb(p.color);
    setSteps([
      `Sinyal analog disampling → digital (speech-to-text)`,
      `Transkrip mentah: "${text.slice(0, 48)}${text.length > 48 ? "…" : ""}"`,
      `Tokenisasi & pencocokan pola → ${p.cmd}`,
      `Menyusun respons bahasa alami untuk disuarakan`,
    ]);

    if (speakingRef.current) window.speechSynthesis?.cancel();
    speakingRef.current = true;
    setResponse(p.response);
    setStatus("speaking");
    speak(p.response, () => {
      speakingRef.current = false;
      setStatus(wantListen.current ? "listening" : "idle");
    });
    if (p.stop) setTimeout(() => stopAll(), 400);
  };

  const stopAll = () => {
    wantListen.current = false;
    try { recRef.current?.stop(); } catch { /* */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
    setStatus("idle");
  };

  const start = async () => {
    setErr("");
    if (!supported || sim) return;
    wantListen.current = true;
    const rec = new SR();
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) handleFinal(r[0].transcript.trim(), r[0].confidence, "mikrofon");
        else inter += r[0].transcript;
      }
      setInterim(inter);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErr("Akses mikrofon ditolak — beralih ke mode simulasi.");
        setSim(true);
        stopAll();
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setErr(`Engine suara: ${e.error} — coba mode simulasi.`);
      }
    };
    rec.onend = () => {
      if (wantListen.current && !speakingRef.current) {
        try { rec.start(); } catch { /* restart */ }
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setStatus("listening");
    } catch {
      setErr("Gagal memulai speech recognition.");
    }
    // waveform mikrofon (opsional)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = getAudioCtx();
      const srcNode = ac.createMediaStreamSource(stream);
      const an = ac.createAnalyser();
      an.fftSize = 256;
      srcNode.connect(an);
      analyserRef.current = an;
    } catch {
      analyserRef.current = null; // waveform simulasi
    }
  };

  useEffect(() => () => stopAll(), []);

  const runSim = () => {
    const t = simText.trim();
    if (!t) return;
    setConfidence(100);
    handleFinal(t, 1, "teks (simulasi)");
    setSimText("");
  };

  const listening = status === "listening";
  const speaking = status === "speaking";

  const hud: PipelineData = {
    inputTitle: "INPUT — SUARA",
    inputIcon: <Mic className="size-3.5" />,
    live: status !== "idle",
    inputRows:
      status === "idle" && !transcript
        ? []
        : [
            { label: "status", value: speaking ? "berbicara…" : listening ? "mendengarkan" : "siaga" },
            { label: "sumber", value: source },
            { label: "transkrip", value: transcript ? `"${transcript.slice(0, 34)}${transcript.length > 34 ? "…" : ""}"` : "—" },
            { label: "keyakinan", value: `${confidence}%` },
            { label: "total kata", value: String(words) },
            { label: "perintah", value: command || "—" },
          ],
    processSteps: steps,
    feedback:
      status !== "idle"
        ? [
            { label: "VISUAL", detail: "orb & spektrum", color: "cyan" },
            { label: "AUDIO", detail: speaking ? "TTS menjawab" : "siap menjawab", color: "magenta" },
          ]
        : [],
    note: "Inilah dua arah modalitas suara sekaligus: Speech-to-Text sebagai input, Text-to-Speech sebagai umpan balik audio.",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="relative flex h-[480px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-2">
          {/* orb */}
          <div className="relative flex flex-1 items-center justify-center">
            <div
              className="absolute size-44 rounded-full blur-3xl transition-colors duration-700 md:size-56"
              style={{ background: hexToRgba(orb, speaking ? 0.5 : listening ? 0.35 : 0.18) }}
            />
            <div
              ref={orbRef}
              className="relative size-32 rounded-full transition-transform duration-100 md:size-40"
              style={{
                background: `radial-gradient(circle at 32% 30%, ${hexToRgba("#ffffff", 0.85)}, ${hexToRgba(orb, 0.9)} 38%, ${hexToRgba(orb, 0.25)} 72%, transparent 78%)`,
                boxShadow: `0 0 70px ${hexToRgba(orb, 0.55)}`,
              }}
            >
              <span className="absolute inset-0 rounded-full border border-white/25 animate-pulse-ring" />
            </div>
            {/* ring label */}
            <div className="absolute bottom-3 text-center">
              <p className="font-mono text-[10px] tracking-[0.3em]" style={{ color: listening ? C.cyan : speaking ? orb : "#8B8B9E" }}>
                {speaking ? "KOMPUTER BERBICARA…" : listening ? "MENDENGARKAN…" : "KOMPUTER SIAGA"}
              </p>
              {speaking && response && (
                <p className="mx-auto mt-1.5 max-w-xs font-serif-accent text-sm italic text-paper/90">“{response}”</p>
              )}
            </div>
          </div>

          {/* transcript */}
          <div className="border-t border-white/8 bg-black/30 px-5 py-3 backdrop-blur">
            <p className="min-h-5 font-mono text-xs leading-relaxed text-paper">
              {transcript && <span className="text-cyan">“{transcript}”</span>}{" "}
              <span className="text-white/35">{interim}</span>
              {!transcript && !interim && <span className="text-white/25">transkrip akan muncul di sini…</span>}
            </p>
          </div>

          {/* waveform */}
          <canvas ref={canvasRef} width={640} height={72} className="h-[72px] w-full border-t border-white/8 bg-black/20" />
        </div>

        {/* controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!sim && supported && (
            <LabButton color={listening || speaking ? "magenta" : "cyan"} active={listening || speaking} onClick={listening || speaking ? stopAll : start}>
              {listening || speaking ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              {listening || speaking ? "BERHENTI" : "MULAI BERBICARA"}
            </LabButton>
          )}
          {supported && (
            <LabButton active={sim} onClick={() => { stopAll(); setSim(!sim); }}>
              <Terminal className="size-3.5" /> MODE SIMULASI
            </LabButton>
          )}
          {sim && (
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); runSim(); }}
            >
              <input
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder='ketik "perintah suara", mis: ubah warna hijau'
                className="h-10 min-w-0 flex-1 rounded-full border border-white/15 bg-white/3 px-4 font-mono text-xs text-paper outline-none placeholder:text-white/25 focus:border-cyan/60"
              />
              <button type="submit" className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-cyan text-ink transition-shadow hover:shadow-[0_0_24px_rgba(43,228,255,0.5)]">
                <Send className="size-4" />
              </button>
            </form>
          )}
        </div>

        {err && <p className="mt-3 font-mono text-[11px] text-amber">{err}</p>}
        {!supported && (
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-amber/90">
            Browser ini tidak mendukung Web Speech API — mode simulasi aktif. Pipeline pemrosesannya identik: teksmu dianggap hasil speech-to-text.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted">COBA KATAKAN:</span>
          {HINTS.map((h) => (
            <button
              key={h}
              onClick={() => { if (sim) { setSimText(h.replace(/"/g, "")); } }}
              className="cursor-pointer rounded-full border border-white/10 bg-white/3 px-2.5 py-1 font-mono text-[10px] text-paper/70 transition-colors hover:border-cyan/50 hover:text-cyan"
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        <PipelineHUD data={hud} />
      </div>
    </div>
  );
}
