import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { scrollToId } from "../lib/scroll";
import { sfx } from "../lib/audio";

const LINKS = [
  { id: "#siklus", label: "Siklus" },
  { id: "#lab", label: "Laboratorium" },
  { id: "#studio", label: "Studio Visi" },
  { id: "#umpan-balik", label: "Umpan Balik" },
  { id: "#kuis", label: "Kuis" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    sfx.tap();
    setOpen(false);
    setTimeout(() => scrollToId(id), open ? 250 : 0);
  };

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "border-b border-white/8 bg-ink/75 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => { sfx.tap(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="cursor-pointer font-mono text-sm font-bold tracking-[0.2em]">
            IMK<span className="text-cyan">.</span>LAB
            <span className="ml-2 hidden rounded-full border border-lime/30 bg-lime/5 px-2 py-0.5 text-[8px] tracking-[0.25em] text-lime sm:inline">INTERAKTIF</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="cursor-pointer rounded-full px-4 py-2 font-mono text-[11px] tracking-widest text-muted transition-all duration-300 hover:bg-white/5 hover:text-paper"
              >
                {l.label.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => go("#lab")}
              className="ml-3 cursor-pointer rounded-full bg-cyan px-5 py-2 font-mono text-[11px] font-bold tracking-widest text-ink transition-shadow hover:shadow-[0_0_26px_rgba(43,228,255,0.5)]"
            >
              MULAI →
            </button>
          </nav>
          <button onClick={() => setOpen(true)} className="cursor-pointer text-paper md:hidden" aria-label="menu">
            <Menu className="size-6" />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex items-center justify-between px-6 py-4">
              <span className="font-mono text-sm font-bold tracking-[0.2em]">IMK<span className="text-cyan">.</span>LAB</span>
              <button onClick={() => setOpen(false)} className="cursor-pointer" aria-label="tutup"><X className="size-6" /></button>
            </div>
            <nav className="flex flex-1 flex-col items-center justify-center gap-2">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.07 }}
                  onClick={() => go(l.id)}
                  className="cursor-pointer py-3 font-display text-4xl font-bold tracking-tight text-paper transition-colors hover:text-cyan"
                >
                  {l.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
