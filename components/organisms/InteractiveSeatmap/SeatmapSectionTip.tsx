"use client";

import { useMemo } from "react";
import { money } from "@/app/[slug]/Checkout";
import useSeatmapStore from "@/stores/seatmapStore";

export type SectionTipTarget = { sectionId: string; x: number; y: number } | null;

/* The tip that follows the pointer over a section (taken from the map player's section tooltip, adjusted to this map): the section's name on top, then
   "From ● $41.97" with a dot that says whether seats are left (green: seats, amber: a few left, red: sold out). A glass card that hugs its text. */
export default function SeatmapSectionTip({ target }: { target: SectionTipTarget }) {
  const data = useSeatmapStore((s) => s.data);
  const seatLookup = useSeatmapStore((s) => s.seatLookupTable);
  const sectionLookup = useSeatmapStore((s) => s.sectionLookupTable);
  const filter = useSeatmapStore((s) => s.sectionFilter);

  const info = useMemo(() => {
    if (!target || !data?.sections) return null;
    const sec = data.sections[target.sectionId];
    if (!sec) return null;
    const prices: number[] = [];
    const ga = sectionLookup[target.sectionId];
    if (ga?.length) ga.forEach((g) => { if (typeof g.price === "number") prices.push(g.price); });
    else for (const rid of sec.rows ?? []) for (const id of data.rows?.[rid]?.seats ?? []) {
      const g = seatLookup[String(id)];
      if (g && typeof g.price === "number") prices.push(g.price);
    }
    const name = String(sec.sectionNumber ?? target.sectionId);
    const label = /^\d+$|^[A-Z]{1,3}$/i.test(name) ? `Sec ${name}` : name;
    const lo = prices.length ? Math.min(...prices) : null;
    return { label, from: lo, fixed: prices.length > 0 && Math.max(...prices) === lo, left: prices.length };
  }, [target, data, seatLookup, sectionLookup]);

  if (!target || !info) return null;
  const w = typeof window === "undefined" ? 1200 : window.innerWidth;
  const h = typeof window === "undefined" ? 800 : window.innerHeight;
  /* a section the page's filter hides still has seats, so it is not "sold out": it says what the filter leaves out */
  const filtered = info.left === 0 && !!filter?.hidden[target.sectionId];
  const state = filtered ? "filtered" : info.left === 0 ? "sold" : info.left <= 8 ? "few" : "ok";
  const dot = state === "filtered" ? "bg-h-foreground/40" : state === "sold" ? "bg-[#b3382c]" : state === "few" ? "bg-[#f5a524]" : "bg-[#97dd62]";
  /* the player's section tooltip: "Sec 112" in medium 16px, then "From ● $18.00" (muted label, medium price) under it, left aligned, just below and right of the pointer */
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[70] grid grid-cols-[auto_auto] items-center justify-start gap-x-1.5 gap-y-0.5 rounded-[14px] glass glass-panel px-3.5 py-2.5 text-h-foreground [--glass-fill-panel:color-mix(in_oklab,var(--h-overlay)_96%,transparent)] [animation:bt-tip-in_120ms_var(--e-out,cubic-bezier(0.23,1,0.32,1))_both] motion-reduce:animate-none"
      style={{ left: Math.max(8, Math.min(target.x + 14, w - 180)), top: Math.max(8, Math.min(target.y + 14, h - 80)) }}
    >
      <span className="col-span-2 whitespace-nowrap text-base font-medium leading-[22px] tracking-[-0.01em] tabular-nums">{info.label}</span>
      {state === "sold" || state === "filtered" ? (
        <strong className="col-span-2 flex items-center gap-2 text-sm font-medium text-h-foreground/80"><i className={`size-2 rounded-full ${dot}`} />{state === "filtered" ? filter!.reason : "Sold out"}</strong>
      ) : (
        <>
          {info.fixed && state !== "few" ? null : <span className="text-sm font-medium text-h-foreground/75">{state === "few" ? (info.fixed ? "Few left" : "Few left from") : "From"}</span>}
          <strong className={`flex items-center gap-2 text-sm font-medium tabular-nums ${info.fixed && state !== "few" ? "col-span-2" : ""}`}><i className={`size-2 rounded-full ${dot}`} />{info.from === null ? "Price pending" : money(info.from)}</strong>
        </>
      )}
    </div>
  );
}
