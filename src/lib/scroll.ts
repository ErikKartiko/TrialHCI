import Lenis from "lenis";

let lenis: Lenis | null = null;

export function initLenis() {
  if (lenis) return lenis;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  function raf(time: number) {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  return lenis;
}

export function scrollToId(id: string) {
  const el = document.querySelector(id) as HTMLElement | null;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -8, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}
