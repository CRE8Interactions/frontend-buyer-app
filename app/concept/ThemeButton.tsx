"use client";

import { useId, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* The light/dark button for both bars: one round button. The icon is a single shape that morphs between sun and moon (the core grows and a
   second disc slides in to bite out the crescent, the rays fold away and the whole icon turns a quarter), on springs so it can be
   flipped back mid-move. Clicking also repaints the page as a circle growing from the button (View Transitions), so the theme change
   reads as light spreading across the page. Without that API, or with reduced motion, it just switches. */
const SPRING = { type: "spring", stiffness: 260, damping: 22, mass: 0.9 } as const;
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

type VT = { ready: Promise<void>; finished: Promise<void> };

let running: (VT & { skipTransition?: () => void }) | null = null; // the transition in flight, so a quick second click can finish it first

export function setTheme(next: "light" | "dark") {
  document.documentElement.dataset.nt = next;
  window.dispatchEvent(new Event("concept-theme")); // the nav re-reads the page colour right now, so its text never shows the old ink on the new page for a frame
  try { localStorage.setItem("concept-theme", next); } catch { /* storage blocked: the choice just lasts for this visit */ }
}

export default function ThemeButton({ dark, className = "" }: { dark: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const id = useId();
  const t = reduce ? { duration: 0 } : SPRING;

  const flip = (e: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.dataset.nt === "light" ? "dark" : root.dataset.nt === "dark" ? "light" : dark ? "light" : "dark"; // from the page itself, not the prop, which can lag a fast double click
    const start = (document as unknown as { startViewTransition?: (cb: () => void) => VT }).startViewTransition;
    if (!start || reduce) { setTheme(next); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    running?.skipTransition?.(); // snap the one still playing to its end, so the new circle starts from a settled page
    root.classList.add("theme-vt");
    const vt = start.call(document, () => setTheme(next)) as VT & { skipTransition?: () => void };
    running = vt;
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => {});
    const clear = () => { if (running === vt) { running = null; root.classList.remove("theme-vt"); } }; // only the latest one clears the class; an older one ending must not strip the rules the newer one needs
    vt.finished.finally(clear);
    window.setTimeout(clear, 1200); // safety: if a browser never settles the transition, the class still comes off
  };

  return (
    <button type="button" className={className} onClick={flip} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <motion.svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden initial={false} animate={{ rotate: dark ? 40 : 90 }} transition={t} style={{ display: "block" }}>
        <mask id={id}>
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <motion.circle r="8" fill="#000" initial={false} animate={{ cx: dark ? 17 : 30, cy: dark ? 7 : 0 }} transition={t} />
        </mask>
        <motion.circle cx="12" cy="12" fill="currentColor" mask={`url(#${id})`} initial={false} animate={{ r: dark ? 8.5 : 5 }} transition={t} />
        <motion.g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" initial={false} animate={{ opacity: dark ? 0 : 1, scale: dark ? 0.3 : 1 }} transition={t} style={{ transformOrigin: "12px 12px" }}>
          {RAYS.map((a) => <line key={a} x1="12" y1="2.4" x2="12" y2="4.4" transform={`rotate(${a} 12 12)`} />)}
        </motion.g>
      </motion.svg>
    </button>
  );
}
