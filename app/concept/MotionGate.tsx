"use client";

import { useEffect } from "react";

/* Looping animations (the pricing story, the checkout loop, the orbit, the marquee, the timeline accents) used to run
   for the whole life of the page, on screen or not, which keeps a phone's GPU busy and warm. This finds every
   endlessly repeating animation, watches the element it belongs to, and flags it `data-off` (CSS pauses it, see
   styles.ts) whenever it is out of view or the page is hidden. Nothing changes for what the visitor can see. */
export default function MotionGate() {
  useEffect(() => {
    const watched = new Set<Element>();
    const inView = new Map<Element, boolean>();
    let hidden = document.hidden;
    const apply = (el: Element) => {
      const off = hidden || inView.get(el) === false;
      if (off) el.setAttribute("data-off", ""); else el.removeAttribute("data-off");
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { inView.set(e.target, e.isIntersecting); apply(e.target); });
    }, { rootMargin: "120px 0px" });
    const scan = () => {
      document.getAnimations().forEach((a) => {
        const eff = a.effect as KeyframeEffect | null;
        const t = eff?.target;
        if (!t || watched.has(t) || eff?.getTiming().iterations !== Infinity) return;
        watched.add(t); io.observe(t);
      });
    };
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = window.setTimeout(scan, 350); };
    const onVis = () => { hidden = document.hidden; watched.forEach(apply); };
    scan();
    [600, 2000, 5000].forEach((ms) => window.setTimeout(scan, ms));
    window.addEventListener("scroll", later, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect(); clearTimeout(timer);
      window.removeEventListener("scroll", later); document.removeEventListener("visibilitychange", onVis);
      watched.forEach((el) => el.removeAttribute("data-off"));
    };
  }, []);
  return null;
}
