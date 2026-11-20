"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import type { Game } from "./SeasonGames";

/* The season as one strip: every home game is a tick, placed by its date along the season, so one game and sixty read the same way.
   Move across it and the ticks near the pointer rise (a fisheye, on a spring); the game under the pointer (or the arrow keys) is read out below.
   The strip is one control for the keyboard (a slider over the games), and the ticks themselves are decorative. */

function Tick({ at, x, width, on }: { at: number; x: MotionValue<number>; width: React.RefObject<number>; on: boolean }) {
  const rise = useTransform(x, (v) => 1 + 1.7 * Math.max(0, 1 - Math.abs(v - at * (width.current ?? 0)) / 96));
  const sy = useSpring(rise, { stiffness: 320, damping: 26 });
  return <motion.i aria-hidden className="absolute bottom-0 h-7 w-[3px] -translate-x-1/2 origin-bottom rounded-full bg-current" style={{ left: `${at * 100}%`, scaleY: sy, opacity: on ? 1 : 0.5 }} />;
}

export default function SeasonStrip({ games }: { games: Game[] }) {
  const still = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const x = useMotionValue(-1000);
  const [active, setActive] = useState(0);

  /* where each game sits along the season, 0 to 1 (a lone game sits in the middle) */
  const spots = useMemo(() => {
    const lo = games[0]?.at ?? 0, hi = games[games.length - 1]?.at ?? 0;
    return games.map((g) => (hi === lo ? 0.5 : 0.04 + 0.92 * ((g.at - lo) / (hi - lo))));
  }, [games]);
  /* a month label under the first game of each month, skipping any that would touch the one before */
  const months = useMemo(() => {
    const out: { m: string; at: number }[] = [];
    games.forEach((g, i) => { if (!out.some((o) => o.m === g.m) && (!out.length || spots[i] - out[out.length - 1].at > 0.07)) out.push({ m: g.m, at: spots[i] }); });
    return out;
  }, [games, spots]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => { width.current = el.getBoundingClientRect().width; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nearest = (px: number) => {
    const t = px / Math.max(width.current, 1);
    let best = 0;
    spots.forEach((s, i) => { if (Math.abs(s - t) < Math.abs(spots[best] - t)) best = i; });
    return best;
  };
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !box.current) return;
    const px = e.clientX - box.current.getBoundingClientRect().left;
    if (!still) x.set(px);
    setActive(nearest(px));
  };
  const tap = (e: React.PointerEvent) => { if (box.current) setActive(nearest(e.clientX - box.current.getBoundingClientRect().left)); };
  const key = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (step) { e.preventDefault(); setActive((a) => Math.min(games.length - 1, Math.max(0, a + step))); }
    if (e.key === "Home") { e.preventDefault(); setActive(0); }
    if (e.key === "End") { e.preventDefault(); setActive(games.length - 1); }
  };

  if (games.length === 0) return null;
  const g = games[Math.min(active, games.length - 1)];
  return (
    <div className="grid gap-4">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="The home games across the season"
        aria-valuemin={1}
        aria-valuemax={games.length}
        aria-valuenow={active + 1}
        aria-valuetext={`${g.title}, ${g.dow} ${g.m} ${g.d}, ${g.time}`}
        className="relative h-[84px] cursor-ew-resize touch-pan-y rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-h-focus"
        onPointerMove={move}
        onPointerDown={tap}
        onPointerLeave={() => x.set(-1000)}
        onKeyDown={key}
      >
        <div aria-hidden className="absolute inset-x-0 bottom-6 h-px bg-current opacity-30" />
        <div className="absolute inset-x-0 bottom-7">
          {games.map((gm, i) => <Tick key={gm.at + gm.title} at={spots[i]} x={x} width={width} on={i === active} />)}
        </div>
        {months.map((o) => <span key={o.m} aria-hidden className="absolute bottom-0 -translate-x-1/2 text-[13px] font-medium uppercase tracking-[0.06em] opacity-75" style={{ left: `${o.at * 100}%` }}>{o.m}</span>)}
      </div>

      <div className="flex items-center gap-3" aria-live="off">
        {g.img
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={g.img} alt="" className="h-12 w-12 shrink-0 rounded-[14px] object-cover" />
          : <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-h-default text-sm font-semibold text-h-muted">{g.mono}</span>}
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold tracking-[-0.02em]">{g.title}</p>
          <p className="text-[15px] text-h-muted tabular-nums">{g.dow}, {g.m} {g.d} · {g.time}</p>
        </div>
      </div>
    </div>
  );
}
