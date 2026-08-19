"use client";

import type { ReactNode } from "react";
import Pill from "@/components/atoms/Pill";
import { Check, Accessibility } from "@/components/atoms/icons";

/**
 * ListingRow — one purchasable listing as a dense, price-first rail row:
 * seat locator thumb (or tier marker), seat location, quantity range, all-in
 * price. Selected is the green "act here" state. Rendered inside a divide-y
 * rail container.
 */

const TIER_FILL = ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0.45)"];

export default function ListingRow({
  sec,
  row,
  label,
  qtyMin,
  qtyMax,
  price,
  tier = 0,
  thumb,
  accessible = false,
  bestDeal = false,
  selected = false,
  onClick,
  onHover,
}: {
  sec: string;
  row: string;
  /** Overrides the "Sec X · Row Y" text (e.g. "GA Lawn"). */
  label?: string;
  qtyMin: number;
  qtyMax: number;
  price: number;
  /** 0–3, matches the seat-map tier fill. */
  tier?: number;
  /** Seat locator visual (e.g. <SeatMapThumb/>); replaces the tier marker. */
  thumb?: ReactNode;
  accessible?: boolean;
  bestDeal?: boolean;
  selected?: boolean;
  onClick?: () => void;
  /** Fired on mouse enter/leave — wire to the big map's highlight. */
  onHover?: (hovering: boolean) => void;
}) {
  const qty = qtyMin === qtyMax ? `${qtyMin} ticket${qtyMin === 1 ? "" : "s"}` : `${qtyMin}–${qtyMax} tickets`;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors sm:px-5 ${selected ? "bg-[#a6e773]/[0.1]" : "hover:bg-white/[0.04]"
        }`}
    >
      {thumb ? (
        <span className="flex h-[46px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-[#051B35]" aria-hidden>
          {thumb}
        </span>
      ) : (
        <span
          className="h-3 w-3 shrink-0 rounded-[3px]"
          style={{ background: selected ? "#a6e773" : TIER_FILL[tier] ?? TIER_FILL[0] }}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{label ?? `Sec ${sec} · Row ${row}`}</span>
          {bestDeal && <Pill size="sm">Best deal</Pill>}
          {accessible && (
            <span className="text-[#9DA2B3]" title="Accessible seating">
              <Accessibility className="h-[14px] w-[14px]" />
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12px] text-[#9DA2B3]">{qty}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold tabular-nums text-white">${price.toFixed(2)}</span>
        <span className="block text-[11px] text-[#9DA2B3]">all-in</span>
      </span>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a6e773] text-[#051B35]">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}
