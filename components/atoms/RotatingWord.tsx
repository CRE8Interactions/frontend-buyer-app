"use client";

import { useEffect, useRef, useState } from "react";

/**
 * RotatingWord — swaps through a list of words with a slide-up + blur
 * "focus-pull": the current word lifts and blurs out while the next rises into
 * focus from below. Sits on its own line with reserved height so surrounding
 * copy never shifts. Length-aware dwell time, starts when scrolled into view,
 * pauses off-screen, honors prefers-reduced-motion.
 */
export default function RotatingWord({ words, className = "" }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"visible" | "leaving" | "entering">("visible");
  const ref = useRef<HTMLSpanElement>(null);
  const iRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let swapTimer: ReturnType<typeof setTimeout> | null = null;
    let raf1 = 0;
    let raf2 = 0;
    let running = false;

    // longer phrases linger so they stay readable
    const dwell = (w: string) => Math.min(2400, Math.max(1400, 1100 + w.length * 55));

    const schedule = () => {
      dwellTimer = setTimeout(cycle, dwell(words[iRef.current]));
    };

    const cycle = () => {
      setPhase("leaving");
      swapTimer = setTimeout(() => {
        iRef.current = (iRef.current + 1) % words.length;
        setI(iRef.current);
        setPhase("entering"); // jump below, no transition
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setPhase("visible")); // rise into focus
        });
        schedule();
      }, 340);
    };

    const start = () => {
      if (running) return;
      running = true;
      schedule();
    };
    const stop = () => {
      running = false;
      if (dwellTimer) clearTimeout(dwellTimer);
      if (swapTimer) clearTimeout(swapTimer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };

    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0.2 });
    if (el) io.observe(el);
    const safety = setTimeout(start, 1200); // fallback if IO never fires

    return () => {
      stop();
      clearTimeout(safety);
      io.disconnect();
    };
  }, [words]);

  const motion = phase === "entering" ? "transition-none" : "transition-all duration-300 ease-out";
  // At rest: no transform/filter/will-change, so the text renders as plain
  // (non-composited) type — crisp, with normal letter shaping. Transforms and
  // blur are only applied during the leaving/entering transition frames.
  const state =
    phase === "visible"
      ? "opacity-100"
      : phase === "leaving"
        ? "-translate-y-[0.45em] opacity-0 blur-[7px]"
        : "translate-y-[0.55em] opacity-0 blur-[7px]";

  return (
    <b
      ref={ref}
      style={{ fontVariantLigatures: "none", letterSpacing: "0.01em" }}
      className={`inline-block font-light text-[#a6e773] ${motion} ${state} ${className}`}
    >
      {words[i]}
    </b>
  );
}
