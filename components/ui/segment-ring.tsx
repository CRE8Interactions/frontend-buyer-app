"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/* SegmentRing: how much of something is left, as one ring with an arc for each item (a game, a credit, a seat). Faint arcs are used, grey arcs are
   still to come, blue arcs were sent on, and the next one is the single green mark, because green is for the thing to do next. Whatever you put inside
   sits in the middle (usually the number left). The arcs fade in one after another; reduced motion shows them at once. */
export type Segment = "used" | "left" | "sent";

const R = 42;
const C = 2 * Math.PI * R;

export type SegmentRingProps = {
  segments: Segment[];
  /** width and height in px. Default 44. */
  size?: number;
  /** what the ring says to a screen reader; leave it out when the text beside the ring already says it */
  label?: string;
} & Omit<React.ComponentProps<"span">, "children">;

function SegmentRing({ segments, size = 44, label, className, style, children, ...props }: SegmentRingProps & { children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const n = Math.max(segments.length, 1);
  const gap = n === 1 ? 0 : Math.min(7, C / n / 3);
  const seg = C / n - gap;
  const next = segments.indexOf("left");
  return (
    <span
      data-slot="segment-ring"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full -rotate-90">
        {segments.map((s, i) => (
          <motion.circle
            key={i}
            cx="50" cy="50" r={R} fill="none" strokeLinecap="round" strokeWidth="8"
            className={s === "sent" ? "stroke-seat" : s === "left" ? (i === next ? "stroke-primary" : "stroke-foreground/45") : "stroke-foreground/12"}
            strokeDasharray={`${Math.max(seg - 0.01, 0.01)} ${C}`}
            strokeDashoffset={-(i * (seg + gap) + gap / 2)}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: reduce ? 0 : 0.05 + i * 0.06 }}
          />
        ))}
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

export { SegmentRing };
