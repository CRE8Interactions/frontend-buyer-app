"use client";

import { X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { money } from "./Checkout";

/* One place to sit, as the page shows it everywhere (the tray beside the map, the review, the payment summary): small labels over the section, the row and the seats,
   the price at the end, and a line under them saying what it is (how many seats, how many games). Text that runs long is cut with an ellipsis, so a long
   section name never pushes the price out. The remove button sits on the corner. */
function Cell({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-medium uppercase leading-none tracking-[0.06em] text-h-muted">{label}</p>
      <p className="mt-1.5 truncate text-[17px] font-semibold leading-none tracking-[-0.01em] tabular-nums">{value}</p>
    </div>
  );
}

export default function SeatTicket({ section, row, seats, count, amount, note, onRemove, removeLabel }: {
  section: string; row: string; seats: string; count: number; amount: number; note?: string; onRemove?: () => void; removeLabel?: string;
}) {
  return (
    <div className="relative w-full min-w-0 rounded-[20px] bg-h-default p-3.5">
      <div className="flex items-start gap-5">
        <Cell label="Sec" value={section} className="max-w-24 shrink-0" />
        <Cell label="Row" value={row} className="shrink-0" />
        <Cell label={count === 1 ? "Seat" : "Seats"} value={seats} className="flex-1" />
        <div className="shrink-0 text-right leading-none">
          <p className="text-[17px] font-semibold tabular-nums">{money(amount)}</p>
          <p className="mt-1.5 text-[11px] text-h-muted">for the season</p>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-h-separator pt-2.5">
        <Badge variant="soft" color="default" size="md">{`${count} ${count === 1 ? "seat" : "seats"}`}</Badge>
        {note && <span className="truncate text-xs text-h-muted">{note}</span>}
      </div>
      {onRemove && (
        <button type="button" aria-label={removeLabel ?? `Remove Sec ${section}, Row ${row}`} onClick={onRemove}
          className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-h-surface text-h-muted shadow-[0_1px_4px_color-mix(in_srgb,var(--shade)_30%,transparent)] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-h-focus [@media(hover:hover)]:hover:text-h-foreground">
          <X weight="bold" className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}
