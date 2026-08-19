"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Reveal — fades + rises its children into view on scroll. Above-the-fold
 * content reveals immediately; the rest reveals via IntersectionObserver, with
 * a geometry fallback so nothing can stay hidden if IO never fires.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in");
      return;
    }
    const show = () => {
      if (delay) window.setTimeout(() => el.classList.add("in"), delay);
      else el.classList.add("in");
    };
    // Already in view (e.g. hero) → reveal now.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      show();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            show();
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    // Safety: if IO never fires, reveal after a beat.
    const safety = window.setTimeout(() => el.classList.add("in"), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [delay]);

  const Comp = Tag as ElementType;
  return (
    <Comp ref={ref} className={`reveal ${className}`}>
      {children}
    </Comp>
  );
}
