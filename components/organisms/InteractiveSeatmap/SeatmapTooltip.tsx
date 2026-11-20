"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, Info, Lock, X } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumberStepper, NumberStepperDecrementButton, NumberStepperGroup, NumberStepperIncrementButton, NumberStepperValue } from "@/components/ui/number-stepper";
import { formatOfferListPrice } from "@/lib/helpers";
import useSeatmapStore from "@/stores/seatmapStore";
import useFiltersStore from "@/stores/filtersStore";
import type { TicketGroup } from "@/stores/filtersStore";

export type SeatmapTooltipTarget =
  | { kind: "seat"; seatId: string; x: number; y: number; pinned?: boolean }
  | { kind: "section"; sectionId: string; x: number; y: number; pinned?: boolean }
  | null;

type Props = {
  target: SeatmapTooltipTarget;
  onClose: () => void;
  onUnlock?: (offer: TicketGroup["offer"]) => void;
  /** the card as frosted glass (the site's glass recipe) instead of the opaque overlay */
  glass?: boolean;
};

/* The card that opens on a seat (or a general-admission section): a raised overlay with the place at the top (Sec, Row, Seat, as small labels over the values, in one row),
   the price in a quiet well under it, and one button. It uses the design tokens only, so it follows the theme, and it is lifted off the map by its shadow and a hairline ring
   instead of a border. The page can say what a price means (a game, times how many games) through the store's priceContext. */
const CARD_OPAQUE = "w-[264px] rounded-[22px] bg-h-overlay p-3.5 text-h-foreground [box-shadow:var(--ss-float,0_0_0_1px_color-mix(in_srgb,var(--h-foreground)_8%,transparent),0_24px_50px_-18px_color-mix(in_srgb,var(--shade)_60%,transparent))]";

function Cell({ label, value, grow }: { label: string; value: string; grow?: boolean }) {
  return (
    <div className={`min-w-0 ${grow ? "flex-1" : "shrink-0"}`}>
      <p className="text-xs font-semibold uppercase leading-none tracking-[0.06em]">{label}</p>
      <p className="mt-1.5 truncate text-[17px] font-semibold leading-none tracking-[-0.01em] tabular-nums">{value}</p>
    </div>
  );
}

/* The player's seat hover card, in this map: an optional notice badge (wheelchair space), the pass (a quiet panel with the brand's seat-dot motif fading out to the left;
   small muted labels over large numerals, hairlines between), then the price row. Tapping elsewhere or Escape closes it. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-[16px] bg-[color-mix(in_oklab,#f5a524_18%,transparent)] px-3 py-2 text-sm font-medium text-[color-mix(in_oklab,#f5a524_70%,var(--h-foreground))]">
      <Info weight="bold" className="size-4 shrink-0" aria-hidden />{children}
    </div>
  );
}

function Pass({ cells, chips }: { cells: { label: string; value: string }[]; chips?: string[] }) {
  return (
    <div className="relative isolate overflow-hidden rounded-[18px] bg-[color-mix(in_oklab,var(--h-foreground)_9%,var(--h-overlay))] px-3.5 pb-3.5 pt-3">
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(circle,color-mix(in_srgb,currentColor_14%,transparent)_1.4px,transparent_1.8px)] [background-size:12px_12px] [background-position:6px_6px] [mask-image:linear-gradient(to_left,#000_0%,transparent_62%)]" />
      {chips && chips.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="inline-flex h-8 max-w-full items-center gap-2 rounded-full bg-[color-mix(in_oklab,var(--h-foreground)_8%,transparent)] px-3.5 text-sm font-medium shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--h-foreground)_8%,transparent)]">
              <i aria-hidden className="size-2 shrink-0 rounded-full bg-current" /><span className="truncate">{c}</span>
            </span>
          ))}
        </div>
      ) : null}
      <div className={`grid ${cells.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
        {cells.map((c, i) => (
          <div key={c.label} className={`grid min-w-0 gap-0.5 ${i === 0 ? "justify-items-start" : i === cells.length - 1 ? "justify-items-end border-l border-foreground/10 pl-3" : "justify-items-center border-l border-foreground/10 px-3"}`}>
            <small className="text-[13px] font-medium leading-4 text-h-foreground/75">{c.label}</small>
            <b className="max-w-full truncate text-[22px] font-medium leading-7 tracking-[-0.02em] tabular-nums">{c.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* the player's locked offer: a lock in a quiet round chip, the title, one line of why, the code field and the button */
function LockedOffer({ offerName, onUnlock }: { offerName?: string; onUnlock: () => void }) {
  const [code, setCode] = useState("");
  return (
    <form className="grid justify-items-center gap-3 px-2 pb-1 pt-3 text-center" onSubmit={(e) => { e.preventDefault(); onUnlock(); }}>
      <span className="grid size-10 place-items-center rounded-[14px] bg-h-default"><Lock weight="bold" className="size-5" aria-hidden /></span>
      <div className="grid gap-1">
        <b className="text-base font-medium leading-5">Locked offer</b>
        <p className="text-sm leading-5 text-h-foreground/75 text-pretty">{offerName ? <>Enter an access code for <span className="font-medium text-h-foreground">{offerName}</span> to reveal purchasing options.</> : "Enter an access code to reveal purchasing options."}</p>
      </div>
      <input
        value={code} onChange={(e) => setCode(e.target.value)} placeholder="Add access code" aria-label="Access code" autoComplete="off" autoCapitalize="none" spellCheck={false}
        className="h-10 w-full rounded-[14px] bg-h-default px-3.5 text-base outline-none placeholder:text-h-foreground/50 focus-visible:ring-2 focus-visible:ring-h-focus md:text-sm"
      />
      <Button type="submit" className="w-full">Unlock</Button>
    </form>
  );
}

/* the hover card of a locked offer: what it is, without the field (the field is for the click, which keeps the card open) */
function LockedPreview({ offerName }: { offerName?: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 pb-1 pt-1">
      <span className="grid size-8 shrink-0 place-items-center rounded-[11px] bg-h-default"><Lock weight="bold" className="size-4" aria-hidden /></span>
      <span className="grid min-w-0 gap-0.5">
        <b className="text-sm font-medium leading-4">Locked offer</b>
        <span className="truncate text-xs leading-4 text-h-foreground/75">{offerName ? `${offerName} needs an access code` : "Needs an access code"}</span>
      </span>
    </div>
  );
}

function PriceRow({ price, offer, count, unit }: { price: number; offer: TicketGroup["offer"]; count: number; unit?: string }) {
  const amount = (
    <strong className="whitespace-nowrap text-lg font-medium leading-7 tracking-[-0.02em] tabular-nums">{formatOfferListPrice(price, offer)}{unit ? <span className="ml-1.5 text-xs font-medium text-h-foreground/75">{unit}</span> : null}</strong>
  );
  /* one offer is a fixed price: just the price. "From" only where there are several offers and it is the lowest. */
  return count > 1 ? (
    <div className="flex items-center justify-between gap-3 px-3.5 pb-1 pt-1">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-h-foreground/80"><i className="size-2 rounded-full bg-[#97dd62]" />{`${count} offers from`}</span>
      {amount}
    </div>
  ) : (
    <div className="flex items-center gap-2 px-3.5 pb-1 pt-1"><i className="size-2 shrink-0 rounded-full bg-[#97dd62]" />{amount}</div>
  );
}

function Close({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-h-muted outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-h-focus [@media(hover:hover)]:hover:bg-h-default [@media(hover:hover)]:hover:text-h-foreground">
      <X weight="bold" className="size-3.5" aria-hidden />
    </button>
  );
}

const cardVariants: Variants = { hidden: { opacity: 0, scale: 0.92, y: 6 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 520, damping: 34, staggerChildren: 0.04, delayChildren: 0.05 } } };
const partVariants: Variants = { hidden: { opacity: 0, y: 5 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } } };

/* the glass card (the player's seat hover card): 26px corners, 8px padding, 6px between its parts; it opens from the tap point on a short spring */
function HoverCard({ style, children, wide }: { style: React.CSSProperties; children: React.ReactNode; wide?: boolean }) {
  const still = useReducedMotion();
  return (
    <motion.div
      style={{ ...style, transformOrigin: "0% 50%" }}
      className={`grid ${wide ? "w-[min(360px,calc(100vw-24px))]" : "w-[264px]"} grid-cols-[minmax(0,1fr)] gap-1.5 rounded-[26px] glass glass-panel p-2 text-h-foreground [--glass-fill-panel:color-mix(in_oklab,var(--h-overlay)_96%,transparent)]`}
      onClick={(e) => e.stopPropagation()}
      initial={still ? false : "hidden"}
      animate="show"
      variants={still ? undefined : cardVariants}
    >
      {React.Children.toArray(children).map((c, i) => (
        <motion.div key={i} variants={still ? undefined : partVariants} className="grid grid-cols-[minmax(0,1fr)] gap-1.5 empty:hidden [&>*]:mt-0">{c}</motion.div>
      ))}
    </motion.div>
  );
}

/* Puts a card by the pointer where all of it can be seen. The card is measured, then placed below and to the right of the pointer, flipping above or to the left when
   it would run out of the screen, and kept clear of the page's floating dock, its list of your seats and its header, so nothing sits on top of the card. */
function Floating({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, m = 12, gap = 16;
      let bottom = vh - m;
      for (const sel of ['[role="toolbar"][aria-label="Seat controls"]', "#dock-seats"]) {
        const r = document.querySelector(sel)?.getBoundingClientRect();
        if (r && r.height > 0) bottom = Math.min(bottom, r.top - 10);
      }
      const head = document.querySelector('[aria-label="Choose your seats"] header')?.getBoundingClientRect();
      const topLimit = head && head.bottom < vh / 2 ? head.bottom + 10 : m;
      let left = x + gap;
      if (left + w > vw - m) left = x - gap - w;
      left = Math.max(m, Math.min(left, vw - w - m));
      let top = y + gap;
      if (top + h > bottom) top = y - gap - h;
      top = Math.max(topLimit, Math.min(top, bottom - h));
      setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    window.addEventListener("resize", place);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, [x, y]);
  return (
    <div ref={ref} style={{ position: "fixed", left: pos?.left ?? 0, top: pos?.top ?? 0, zIndex: 80, visibility: pos ? "visible" : "hidden" }}>
      {children}
    </div>
  );
}

export default function SeatmapTooltip({ target, onClose, onUnlock, glass }: Props) {
  const CARD = glass ? "w-[264px] rounded-[22px] glass glass-panel p-3.5 text-h-foreground" : CARD_OPAQUE;
  const data = useSeatmapStore((s) => s.data);
  const seatLookupTable = useSeatmapStore((s) => s.seatLookupTable);
  const seatOffersLookupTable = useSeatmapStore((s) => s.seatOffersLookupTable);
  const sectionLookupTable = useSeatmapStore((s) => s.sectionLookupTable);
  const selectSpecificSeat = useSeatmapStore((s) => s.selectSpecificSeat);
  const selectSeatedOffers = useSeatmapStore((s) => s.selectSeatedOffers);
  const selectGASeats = useSeatmapStore((s) => s.selectGASeats);
  const selectedFromMap = useSeatmapStore((s) => s.selectedFromMap);
  const { unit, multiplier } = useSeatmapStore((s) => s.priceContext);

  const [gaQty, setGaQty] = useState(2);
  const [offerQtys, setOfferQtys] = useState<Record<string, number>>({});
  /* the offer picked in the radio list, per seat (the first one until the buyer chooses) */
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const feesIn = useFiltersStore((s) => (s.event as { includeFees?: boolean } | null | undefined)?.includeFees !== false);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  const seat = target?.kind === "seat" ? data?.seats?.[target.seatId] : null;
  const seatOffers =
    target?.kind === "seat"
      ? seatOffersLookupTable[target.seatId] ||
        (seatLookupTable[target.seatId]
          ? [seatLookupTable[target.seatId]]
          : [])
      : [];
  const sectionGroups =
    target?.kind === "section"
      ? sectionLookupTable[target.sectionId] || []
      : [];

  const sectionMeta = useMemo(() => {
    if (target?.kind !== "section") return null;
    return data?.sections?.[target.sectionId] || null;
  }, [data?.sections, target]);

  if (!target) return null;

  const style: React.CSSProperties = {};

  /* the price well: the price on the left, and what it comes to on the right when a page says a price repeats */
  const priceWell = (price: number, offer: TicketGroup["offer"], extra?: React.ReactNode) => {
    const shown = formatOfferListPrice(price, offer);
    return (
      <div className="mt-3 flex items-end justify-between gap-3 rounded-[16px] bg-h-default px-3 py-2.5">
        <span className="grid leading-none">
          <b className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">{shown}</b>
          {unit && <span className="mt-1.5 text-xs font-medium">{unit}</span>}
        </span>
        {multiplier > 1 && price > 0 && (
          <span className="grid justify-items-end leading-none">
            <b className="text-[15px] font-semibold tabular-nums">{`$${(price * multiplier).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`}</b>
            <span className="mt-1.5 text-xs font-medium">{multiplier} games</span>
          </span>
        )}
        {extra}
      </div>
    );
  };

  if (target.kind === "seat") {
    const primary = seatOffers[0];
    const locked = Boolean(
      primary?.offer?.accessCode && !primary?.offer?.unlocked,
    );
    const alreadySelected = selectedFromMap.some(
      (g) => g.seatId === target.seatId,
    );
    const offerName = primary?.package?.name || primary?.offer?.name;

    const accessible = Boolean(seat?.accessible || primary?.accessible);
    const seatHeader = glass ? (
      <>
        {accessible ? <Notice>Wheelchair space</Notice> : null}
        <Pass
          chips={seatOffers.length > 1 ? [`${seatOffers.length} offers`] : offerName && offerName !== "Standard" && offerName !== "Standard Admission" ? [offerName] : undefined}
          cells={[
            { label: "Section", value: String(primary?.sectionName || primary?.sectionNumber || "—") },
            { label: "Row", value: String(primary?.rowName || primary?.rowNumber || "—") },
            { label: "Seat", value: String(seat?.seatNumber ?? "—") },
          ]} />
      </>
    ) : (
      <div className="flex items-start gap-5">
        <Cell label="Sec" value={String(primary?.sectionName || primary?.sectionNumber || "—")} />
        <Cell label="Row" value={String(primary?.rowName || primary?.rowNumber || "—")} />
        <Cell label="Seat" value={String(seat?.seatNumber ?? "—")} grow />
        <Close onClose={onClose} />
      </div>
    );
    const seatBody = (
      <>

        {locked ? (
          glass ? (
            target.pinned ? (
              <LockedOffer offerName={primary?.offer?.name} onUnlock={() => { onUnlock?.(primary?.offer); onClose(); }} />
            ) : (
              <LockedPreview offerName={primary?.offer?.name} />
            )
          ) : (
            <>
              <p className="mt-3 text-sm">
                Needs an access code for <b className="font-semibold text-h-foreground">{primary?.offer?.name}</b>.
              </p>
              <Button className="mt-3 w-full" onClick={() => { onUnlock?.(primary?.offer); onClose(); }}>Unlock offer</Button>
            </>
          )
        ) : seatOffers.length > 1 && glass && !target.pinned ? (
          /* hovering: what the seat is and what it starts at; the choice itself belongs to the click */
          <PriceRow price={Math.min(...seatOffers.map((o) => o.price ?? 0))} offer={primary?.offer} count={seatOffers.length} unit={unit} />
        ) : seatOffers.length > 1 && glass ? (
          /* selected: one offer for this seat, as selectable cards (the library's radio cards), the fees note, one button */
          (() => {
            const keyOf = (o: TicketGroup) => String(o.offer?.id ?? o.id);
            const sel = chosen[target.seatId] ?? keyOf(seatOffers[0]);
            const pick = seatOffers.find((o) => keyOf(o) === sel) ?? seatOffers[0];
            return (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <RadioGroup layout="card" variant="secondary" value={sel} onValueChange={(v) => setChosen((c) => ({ ...c, [target.seatId]: v }))} aria-label="Choose an offer" className="gap-2">
                  {seatOffers.map((o) => (
                    <RadioGroupItem key={keyOf(o)} value={keyOf(o)} label={o.offer?.name || "Offer"} meta={formatOfferListPrice(o.price ?? 0, o.offer)} />
                  ))}
                </RadioGroup>
                <p className="px-1 text-right text-[13px] leading-5 text-h-foreground/70">{feesIn ? "Prices include taxes and fees" : "Fees are added at checkout"}</p>
                <Button className="w-full" disabled={alreadySelected} onClick={() => { selectSeatedOffers(target.seatId, [{ ...pick, quantity: 1 }]); onClose(); }}>
                  {alreadySelected ? <><Check weight="bold" aria-hidden />Selected</> : "Add seat"}
                </Button>
              </div>
            );
          })()
        ) : seatOffers.length > 1 ? (

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
            {seatOffers.map((offer) => {
              const key = String(offer.offer?.id ?? offer.id);
              return (
                <div key={key} className="flex min-w-0 items-center justify-between gap-2.5 rounded-[16px] bg-h-default p-2.5 pl-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-[18px] text-balance break-words" title={offer.offer?.name || undefined}>{offer.offer?.name || "Offer"}</p>
                    <p className="mt-0.5 text-[13px] tabular-nums text-h-foreground/75">{formatOfferListPrice(offer.price ?? 0, offer.offer)}</p>
                  </div>
                  <NumberStepper className="shrink-0" size="sm" minValue={1} maxValue={4} value={offerQtys[key] || 1} onChange={(v) => setOfferQtys((c) => ({ ...c, [key]: v }))} aria-label={`How many, ${offer.offer?.name || "offer"}`}>
                    <NumberStepperGroup><NumberStepperDecrementButton /><NumberStepperValue /><NumberStepperIncrementButton /></NumberStepperGroup>
                  </NumberStepper>
                </div>
              );
            })}
            <Button disabled={alreadySelected} onClick={() => {
              const picks = seatOffers.map((offer) => { const key = String(offer.offer?.id ?? offer.id); return { ...offer, quantity: offerQtys[key] || 1 }; });
              selectSeatedOffers(target.seatId, picks);
              onClose();
            }}>{alreadySelected ? <><Check weight="bold" aria-hidden />Selected</> : "Add seats"}</Button>
          </div>
        ) : (
          <>
            {glass ? <PriceRow price={primary?.price ?? 0} offer={primary?.offer} count={seatOffers.length} unit={unit} /> : priceWell(primary?.price ?? 0, primary?.offer)}
            {!glass && offerName && offerName !== "Standard" && offerName !== "Standard Admission" && <div className="mt-2"><Badge variant="soft" color="default" size="md">{offerName}</Badge></div>}
            {glass && window.innerWidth > 768 ? null : (
              <Button className="mt-3 w-full" disabled={alreadySelected || !primary} onClick={() => { if (!primary) return; selectSpecificSeat(target.seatId, primary); onClose(); }}>
                {alreadySelected ? <><Check weight="bold" aria-hidden />Selected</> : "Select seat"}
              </Button>
            )}
          </>
        )}
      </>
    );
    return (
      <Floating x={target.x} y={target.y}>
        {glass ? (
          <HoverCard style={style} wide={Boolean(target.pinned)}>{seatHeader}{seatBody}</HoverCard>
        ) : (
          <div style={style} className={CARD} onClick={(e) => e.stopPropagation()}>
            {seatHeader}
            {seatBody}
          </div>
        )}
      </Floating>
    );
  }

  // GA section tooltip
  const primary = sectionGroups[0];
  const packageLimits = primary?.package || primary?.offer;
  const minQty = Math.max(1, Number(packageLimits?.minQuantity) || 1);
  const packageMax = Number(packageLimits?.maxQuantity) || 12;
  const maxQty = Math.max(minQty, Math.min(primary?.availableCount || 8, packageMax, 12));
  const selectedGaQty = Math.min(Math.max(gaQty, minQty), maxQty);

  const gaHeader = glass ? (
    <Pass cells={[{ label: "General admission", value: String(sectionMeta?.sectionNumber || primary?.sectionName || "Section") }]} />
  ) : (
    <div className="flex items-start gap-5">
      <Cell label="General admission" value={String(sectionMeta?.sectionNumber || primary?.sectionName || "Section")} grow />
      <Close onClose={onClose} />
    </div>
  );
  const gaBody = (
    <>

      {sectionGroups.length === 0 || maxQty < minQty ? (
        <p className="mt-3 text-sm">No tickets available.</p>
      ) : (
        <>
          {glass ? <PriceRow price={primary?.price ?? 0} offer={primary?.offer} count={1} unit={unit} /> : priceWell(primary?.price ?? 0, primary?.offer)}
          <div className="mt-3 flex items-center justify-between gap-3 px-3.5 [&:first-child]:mt-0">
            <span className="text-sm font-medium">How many</span>
            <NumberStepper size="md" minValue={minQty} maxValue={maxQty} value={selectedGaQty} onChange={setGaQty} aria-label="How many tickets">
              <NumberStepperGroup><NumberStepperDecrementButton /><NumberStepperValue /><NumberStepperIncrementButton /></NumberStepperGroup>
            </NumberStepper>
          </div>
          <Button className="mt-3 w-full" onClick={() => { selectGASeats(sectionGroups.map((g) => ({ ...g, quantity: selectedGaQty }))); onClose(); }}>Add to selection</Button>
        </>
      )}
    </>
  );
  return (
    <Floating x={target.x} y={target.y}>
      {glass ? (
        <HoverCard style={style} wide={Boolean(target.pinned)}>{gaHeader}{gaBody}</HoverCard>
      ) : (
        <div style={style} className={CARD} onClick={(e) => e.stopPropagation()}>
          {gaHeader}
          {gaBody}
        </div>
      )}
    </Floating>
  );
}
