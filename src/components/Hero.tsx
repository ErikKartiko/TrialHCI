import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowDown, FlaskConical, Infinity as InfinityIcon } from "lucide-react";
import { C, hexToRgba } from "../lib/theme";
import { scrollToId } from "../lib/scroll";
import { sfx } from "../lib/audio";

interface Particle {
  t: number;
  speed: number;
  lane: number;
  dir: 1 | -1;
  size: number;
  wob: number;
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;
    let W = 0, H = 0, dpr = 1;

    const particles: Particle[] = [];

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = Math.min(120, Math.floor(W / 11));
    for (let i = 0; i < count; i++) {
      particles.push({
        t: Math.random(),
        speed: 0.0016 + Math.random() * 0.0032,
        lane: Math.floor(Math.random() * 5) - 2,
        dir: Math.random() > 0.5 ? 1 : -1,
        size: 0.8 + Math.random() * 1.7,
        wob: Math.random() * Math.PI * 2,
      });
    }

    const getNodes = () => {
      const wide = W > 760;
      return wide
        ? { a: { x: W * 0.1, y: H * 0.62 }, b: { x: W * 0.9, y: H * 0.34 } }
        : { a: { x: W * 0.16, y: H * 0.8 }, b: { x: W * 0.84, y: H * 0.16 } };
    };

    const qpoint = (p0: any, p1: any, p2: any, t: number) => {
      const u = 1 - t;
      return {
        x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      };
    };

    let time = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!running) return;
      time += 0.016;
      ctx.clearRect(0, 0, W, H);

      const { a, b } = getNodes();
      const mx = mouse.current.x, my = mouse.current.y;

      // midpoint & perpendicular
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;

      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const tt = p.dir === 1 ? p.t : 1 - p.t;
        const laneOff = p.lane * 26;
        const sway = Math.sin(time * 1.4 + p.wob) * 14;
        const ctrl = { x: midX + nx * (laneOff + sway * 2), y: midY + ny * (laneOff + sway * 2) };
        let pos = qpoint(a, ctrl, b, tt);

        // repulsor kursor
        const mdx = pos.x - mx, mdy = pos.y - my;
        const md = Math.hypot(mdx, mdy);
        if (md < 130 && md > 0.01) {
          const f = ((130 - md) / 130) * 42;
          pos = { x: pos.x + (mdx / md) * f, y: pos.y + (mdy / md) * f };
        }

        const fade = Math.sin(tt * Math.PI);
        const col = p.dir === 1 ? C.cyan : C.magenta;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size * (0.6 + fade), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(col, 0.14 + fade * 0.55);
        ctx.fill();
        if (p.size > 2) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, p.size * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(col, 0.045 * fade);
          ctx.fill();
        }
      }

      // node glow
      for (const [node, col] of [[a, C.cyan], [b, C.magenta]] as const) {
        const pulse = 1 + Math.sin(time * 2.2) * 0.08;
        const g = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 90 * pulse);
        g.addColorStop(0, hexToRgba(col, 0.22));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 90 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(col, 0.9);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };
    draw();

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => (mouse.current = { x: -9999, y: -9999 });
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    const io = new IntersectionObserver(([e]) => (running = e.isIntersecting), { threshold: 0.02 });
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section id="beranda" ref={wrapRef} className="relative flex min-h-svh flex-col overflow-hidden bg-ink">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_45%,black,transparent)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* label node */}
      <div className="pointer-events-none absolute bottom-[30%] left-[4%] hidden font-mono text-[10px] tracking-[0.35em] text-cyan/80 md:block">
        ● MANUSIA <span className="text-white/30">/ sumber input</span>
      </div>
      <div className="pointer-events-none absolute right-[4%] top-[28%] hidden text-right font-mono text-[10px] tracking-[0.35em] text-magenta/80 md:block">
        <span className="text-white/30">pemberi respons /</span> KOMPUTER ●
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-28 pb-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-4 py-1.5 font-mono text-[10px] tracking-[0.3em] text-muted backdrop-blur"
        >
          <FlaskConical className="size-3 text-lime" />
          LABORATORIUM INTERAKTIF · IMK
        </motion.p>

        <h1 className="font-display font-bold leading-[0.94] tracking-tight">
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.22, ease }}
            className="block text-[clamp(2.6rem,9vw,7.5rem)]"
          >
            INTERAKSI
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.34, ease }}
            className="block text-[clamp(2.6rem,9vw,7.5rem)]"
          >
            MANUSIA{" "}
            <span className="font-serif-accent font-normal italic text-magenta">&amp;</span>{" "}
            <span className="text-outline">KOMPUTER</span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease }}
          className="mt-7 max-w-xl text-sm leading-relaxed text-muted md:text-base"
        >
          Setiap detik kamu berbicara dengan mesin — lewat suara, sentuhan, ketukan tombol,
          tatapan mata, hingga gerakan seluruh badan. Di sini kamu tidak membaca teori.{" "}
          <span className="text-paper">Kamu mencobanya langsung</span>, lalu melihat bagaimana
          komputer menangkap sinyalmu, memprosesnya, dan menjawab kembali.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.62, ease }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => { sfx.tap(); scrollToId("#siklus"); }}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan px-7 py-3.5 font-mono text-xs font-bold tracking-widest text-ink transition-all duration-300 hover:shadow-[0_0_44px_rgba(43,228,255,0.5)]"
          >
            PELAJARI SIKLUSNYA
            <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
          </button>
          <button
            onClick={() => { sfx.tap(); scrollToId("#lab"); }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/3 px-7 py-3.5 font-mono text-xs font-bold tracking-widest text-paper backdrop-blur transition-all duration-300 hover:border-magenta/50 hover:text-magenta"
          >
            LANGSUNG KE LAB →
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.85 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[10px] tracking-[0.22em] text-muted"
        >
          <span><span className="font-bold text-cyan">10+</span> MODALITAS INPUT</span>
          <span className="hidden h-3 w-px bg-white/15 sm:block" />
          <span><span className="font-bold text-magenta">4</span> KANAL UMPAN BALIK</span>
          <span className="hidden h-3 w-px bg-white/15 sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <InfinityIcon className="size-3.5 text-lime" /> SIKLUS BERULANG
          </span>
        </motion.div>
      </div>

      {/* marquee */}
      <div className="relative z-10 border-t border-white/8 bg-ink/60 py-3 backdrop-blur">
        <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap font-mono text-[10px] tracking-[0.35em] text-white/35">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex items-center gap-8">
              {["SUARA", "SENTUHAN", "GESTUR", "KEYBOARD", "MOTION", "KAMERA", "MATA", "EKSPRESI", "VISUAL", "AUDIO", "HAPTIK", "TEKS"].map((w) => (
                <span key={w} className="flex items-center gap-8">
                  <span>{w}</span>
                  <span className="text-cyan/50">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
