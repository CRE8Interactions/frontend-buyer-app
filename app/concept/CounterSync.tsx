"use client";

import { useEffect } from "react";

/* The count-up figures are CSS animations of a registered custom property (--v, --aiv-p, --aiv-d) shown through
   counter(). Safari on phones does not repaint ::after text while such a property animates, so the figure sat at
   zero and then jumped. This reads the live animated value while a figure is on screen and writes it as real text;
   the ::after fallback is switched off once this has mounted. Timing, triggers and easing stay in CSS. */
const SEL = ".en-n, .aiv-dnum, .aiv-pnum";

function read(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  if (el.classList.contains("aiv-dnum")) return `${parseInt(cs.getPropertyValue("--aiv-d")) || 0}%`;
  if (el.classList.contains("aiv-pnum")) return `${parseInt(cs.getPropertyValue("--aiv-p")) || 0}`;
  const v = parseInt(cs.getPropertyValue("--v")) || 0;
  return el.classList.contains("en-d") ? `${Math.floor(v / 10)}.${v % 10}` : `${v}`;
}

export default function CounterSync() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(SEL));
    const visible = new Set<HTMLElement>();
    let raf = 0;
    const write = (el: HTMLElement) => { const t = read(el); if (el.textContent !== t) el.textContent = t; };
    const tick = () => { visible.forEach(write); raf = visible.size ? requestAnimationFrame(tick) : 0; };
    els.forEach(write);
    document.documentElement.classList.add("cs");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement)));
      if (visible.size && !raf) raf = requestAnimationFrame(tick);
    }, { rootMargin: "80px 0px" });
    els.forEach((el) => io.observe(el));
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); document.documentElement.classList.remove("cs"); };
  }, []);
  return null;
}
