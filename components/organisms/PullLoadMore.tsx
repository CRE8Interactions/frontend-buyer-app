"use client";

import { useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { ArrowUp } from "@phosphor-icons/react";
import { Spinner } from "@/components/ui/spinner";

/**
 * Pull to load more, in place of a "Show more" button, for any list that grows (wallet, browse, team and venue pages).
 * At the end of a list, pull up (a finger on a phone, the wheel or trackpad on a computer) and a ring fills; let go past the
 * line and the next batch loads. It listens on the window, only when the page is already scrolled to the bottom, and never
 * blocks scrolling. A keyboard user can focus the hidden button that does the same.
 *
 * The motion is elastic: the pull follows the finger one to one, then stiffens past the line like a rubber band (so it never
 * runs away); on release it springs back with a small overshoot. Crossing the line makes the ring swell, tint and tick (a short
 * vibration where supported); loading pops the ring and swaps the arrow for a spinner. Reduced motion: the ring still fills,
 * nothing else moves.
 */
const SPRING_BACK = { type: "spring", stiffness: 240, damping: 13, mass: 0.8 } as const;
const POP = { type: "spring", stiffness: 520, damping: 14 } as const;
const band = (x: number) => (x <= 1 ? x : 1 + (1 - Math.exp(-(x - 1) * 2.2)) * 0.4); // 1:1 up to the line, then it stiffens toward 1.4

export type PullLoadMoreProps = {
  remaining: number;
  step: number;
  onMore: () => void;
  /** the unit shown in the label, plural; "more" alone when left out */
  noun?: string;
};

export function PullLoadMore({ remaining, step, onMore, noun }: PullLoadMoreProps) {
  const reduce = useReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const cooling = useRef(false);
  const more = useRef(onMore);
  more.current = onMore;
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  const p = useMotionValue(0); // the elastic pull: 0 at rest, 1 at the line, up to 1.4
  const pop = useMotionValue(1);
  const fill = useTransform(p, (v) => Math.min(1, Math.max(0, v)));
  const swell = useTransform(p, (v) => (reduce ? 1 : v > 1 ? 1 + (v - 1) * 0.35 : 1));
  const lift = useTransform(p, (v) => (reduce ? 0 : -Math.max(0, v) * 14));
  const arrowY = useTransform(p, (v) => (reduce ? 0 : -Math.min(Math.max(v, 0), 1) * 3));
  const arrowTurn = useTransform(p, (v) => (reduce ? 0 : Math.min(Math.max(v, 0), 1) * 180));
  const labelY = useTransform(p, (v) => (reduce ? 0 : -Math.max(0, v) * 6));
  const ringOpacity = useTransform(p, [0, 0.05, 1], [0.55, 0.8, 1]);

  useMotionValueEvent(p, "change", (v) => { const a = v >= 1; setArmed((cur) => (cur === a ? cur : a)); });
  useEffect(() => { setCoarse(window.matchMedia("(pointer: coarse)").matches); }, []);
  useEffect(() => { if (armed) { try { navigator.vibrate?.(6); } catch { /* not supported */ } } }, [armed]);

  useEffect(() => {
    if (remaining <= 0) return;
    let raw = 0; // the unbanded pull, in "lines"
    let y0: number | null = null;
    let acc = 0;
    let idle = 0;
    let spring: { stop: () => void } | null = null;
    const follow = (r: number) => { raw = r; spring?.stop(); p.set(band(r)); };
    const release = () => { raw = 0; spring?.stop(); spring = reduceRef.current ? (p.set(0), null) : animate(p, 0, SPRING_BACK); };
    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const fire = () => {
      if (cooling.current) return;
      cooling.current = true;
      try { navigator.vibrate?.(14); } catch { /* not supported */ }
      setBusy(true);
      if (!reduceRef.current) animate(pop, [1.18, 1], POP);
      more.current();
      window.setTimeout(() => { setBusy(false); cooling.current = false; }, 520);
    };
    const start = (e: TouchEvent) => { y0 = atBottom() ? e.touches[0].clientY : null; };
    const move = (e: TouchEvent) => {
      if (y0 == null) return;
      if (!atBottom()) { y0 = null; release(); return; }
      follow(Math.max(0, (y0 - e.touches[0].clientY) / 110));
    };
    const end = () => { const hit = y0 != null && raw >= 1; y0 = null; release(); if (hit) fire(); };
    const wheel = (e: WheelEvent) => {
      if (e.deltaY <= 0 || !atBottom()) { acc = 0; if (raw) release(); return; }
      acc += e.deltaY / 240;
      follow(acc);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { acc = 0; release(); }, 260);
      if (acc >= 1) { acc = 0; release(); fire(); }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", end, { passive: true });
    window.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end); window.removeEventListener("touchcancel", end);
      window.removeEventListener("wheel", wheel); window.clearTimeout(idle); spring?.stop();
    };
  }, [remaining, p, pop]);

  if (remaining <= 0) return null;
  const next = Math.min(step, remaining);
  const what = noun ?? "more";
  return (
    <div className="relative mt-4 flex h-[96px] select-none flex-col items-center justify-center gap-2 text-center" role="status" aria-live="polite">
      <motion.span className="relative flex size-10 items-center justify-center" style={{ y: lift, scale: swell }}>
        <motion.span className="absolute inset-0 flex items-center justify-center" style={{ scale: pop }}>
          <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="20" cy="20" r="17" fill="none" strokeWidth="3" className="stroke-secondary" />
            <motion.circle cx="20" cy="20" r="17" fill="none" strokeWidth="3" strokeLinecap="round" className={armed || busy ? "stroke-primary" : "stroke-primary/80"} style={{ pathLength: fill, opacity: ringOpacity }} />
          </svg>
          <AnimatePresence mode="popLayout" initial={false}>
            {busy ? (
              <motion.span key="spin" initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={POP}>
                <Spinner className="size-4" />
              </motion.span>
            ) : (
              <motion.span key="arrow" style={{ y: arrowY, rotate: arrowTurn }} initial={false} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.12 }}>
                <ArrowUp weight="bold" aria-hidden className={armed ? "size-4 text-primary transition-colors" : "size-4 text-ink2 transition-colors"} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>
      </motion.span>
      <motion.span className="text-[13px] text-ink2" style={{ y: labelY }}>
        {armed && coarse ? "Let go" : coarse ? "Pull up" : "Keep scrolling"} for {next} {what}{" "}
        <span className="tabular-nums text-mute">· {remaining} left</span>
      </motion.span>
      <button type="button" onClick={() => { cooling.current = false; setBusy(true); more.current(); window.setTimeout(() => setBusy(false), 520); }} className="sr-only focus-visible:not-sr-only focus-visible:rounded-full focus-visible:bg-secondary focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-[13px]">
        Load {next} {what}
      </button>
    </div>
  );
}
