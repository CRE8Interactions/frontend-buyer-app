"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BlockStack — the brand motif, animated: a staircase of blocks assembles
 * block by block (bottom row first), holds, then rebuilds. Runs only while
 * in view; renders fully built under prefers-reduced-motion.
 */

const COLS = [2, 3, 4, 5, 6]; // staircase heights, left to right
const MAX = Math.max(...COLS);

// build order: bottom row left→right, then the next row up
const ORDER: number[][] = [];
for (let row = 0; row < MAX; row++) {
  COLS.forEach((h, col) => {
    if (row < h) ORDER.push([col, row]);
  });
}
const TOTAL = ORDER.length;
const HOLD_TICKS = 10;

export default function BlockStack({ className = "" }: { className?: string }) {
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => setTick((t) => (t >= TOTAL + HOLD_TICKS ? 0 : t + 1)), 240);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.2 });
    io.observe(el);
    const safety = setTimeout(start, 1500);
    return () => {
      stop();
      clearTimeout(safety);
      io.disconnect();
    };
  }, [reduced]);

  const built = reduced ? TOTAL : Math.min(tick, TOTAL);
  const orderOf = (col: number, row: number) => ORDER.findIndex(([c, r]) => c === col && r === row);

  return (
    <div ref={ref} className={`flex items-end gap-2 ${className}`} aria-hidden>
      {COLS.map((h, col) => (
        <div key={col} className="flex flex-col-reverse gap-2">
          {Array.from({ length: h }).map((_, row) => {
            const on = orderOf(col, row) < built;
            const top = row === h - 1;
            return (
              <span
                key={row}
                className={`h-9 w-9 rounded-[7px] transition-all duration-300 sm:h-10 sm:w-10 ${on ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  } ${top ? "bg-[#a6e773] shadow-[0_0_18px_rgba(166,231,115,0.35)]" : ""}`}
                style={top ? undefined : { background: `rgba(166,231,115,${0.18 + row * 0.12})` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
