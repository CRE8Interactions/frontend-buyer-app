"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import NumberFlow from "@number-flow/react";

/* The few moves the season seats page is made of. One strong ease-out for everything that enters, springs for what follows the pointer or a number,
   and nothing animates on a keyboard action or under reduced motion. Only transform and opacity move (plus clip-path for the seat reveal). */

export const EASE = [0.23, 1, 0.32, 1] as const;

/** A heading whose words rise out of a mask one after another. */
export function Words({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const still = useReducedMotion();
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={`${w}${i}`} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={still ? false : { y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: delay + i * 0.07 }}
          >
            {w}
            {i < text.split(" ").length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* the digits roll the way Browse's price and the ticket stepper do (NumberFlow), a touch quicker than its default so a pick lands at once */
const ROLL = { duration: 380, easing: "cubic-bezier(0.2, 0, 0, 1)" };
const USD = { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

/** A price (or, with `plain`, a bare count) whose digits roll to the new value instead of jumping. */
export function Money({ value, className, plain }: { value: number; className?: string; /** a bare number (a count), not a price */ plain?: boolean }) {
  return <NumberFlow value={value} locales="en-US" format={plain ? undefined : USD} className={className} transformTiming={ROLL} spinTiming={ROLL} opacityTiming={{ duration: 200, easing: "ease-out" }} />;
}

/** Tilts toward the pointer on a spring (fine pointers only), settles when it leaves. Decorative, so it never carries information. */
export function Tilt({ children, className, max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const still = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });
  const ry = useSpring(useMotionValue(0), { stiffness: 140, damping: 16 });
  const move = (e: React.PointerEvent) => {
    if (still || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2);
    rx.set((0.5 - (e.clientY - r.top) / r.height) * max * 2);
  };
  const settle = () => { rx.set(0); ry.set(0); };
  return (
    <motion.div ref={ref} className={className} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }} onPointerMove={move} onPointerLeave={settle}>
      {children}
    </motion.div>
  );
}
