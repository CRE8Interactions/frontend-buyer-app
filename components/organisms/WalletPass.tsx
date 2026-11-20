"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ArrowsOutSimple, MapPin, PaperPlaneTilt, QrCode, Tag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import PhoneWalletButtons from "@/components/organisms/WalletPhoneWallet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Status } from "@/components/ui/status";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { availability, thumbOf, orderFor, qrMatrix, ticketsFor, type WalletEvent, type WalletTone } from "@/lib/walletDemo";

const TONE: Record<WalletTone, string> = {
  navy: "bg-[var(--navy)] text-white",
  seat: "bg-seat text-white",
  feature: "bg-feature text-white",
  card: "bg-secondary text-foreground",
};

/** Monogram tile: the event's colour and initials. */
export function WalletMonogram({ event, className }: { event: WalletEvent; className?: string }) {
  const art = thumbOf(event);
  if (art) {
    return (
      <span aria-hidden className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-secondary", className)}>
        <img src={art} alt="" decoding="async" className={cn("size-full", event.crest ? "object-contain p-1.5" : "object-cover")} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-[12px] font-semibold tracking-[0.02em]", TONE[event.tone], className)}
    >
      {event.initials}
    </span>
  );
}

/** The demo QR on a white plate (a scanner needs the light ground in both themes). */
export function WalletQr({ code, className, sweep = true }: { code: string; className?: string; sweep?: boolean }) {
  const reduce = useReducedMotion();
  const { n, on } = useMemo(() => qrMatrix(code), [code]);
  const Q = 2;
  const d = useMemo(() => {
    let p = "";
    for (let i = 0; i < on.length; i++) if (on[i]) p += `M${(i % n) + Q} ${Math.floor(i / n) + Q}h1v1h-1z`;
    return p;
  }, [on, n]);
  return (
    <div className={cn("relative overflow-hidden rounded-[16px] bg-white p-2 text-black", className)}>
      <svg viewBox={`0 0 ${n + Q * 2} ${n + Q * 2}`} shapeRendering="crispEdges" role="img" aria-label={`Ticket code ${code}`} className="block size-full">
        <path d={d} fill="currentColor" />
      </svg>
      {sweep && !reduce && (
        <motion.span
          key={code}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[2px] bg-primary"
          initial={{ top: "0%", opacity: 1 }}
          animate={{ top: "100%", opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
        />
      )}
    </div>
  );
}

export function SeatSwitch({ event, value, onChange, className }: { event: WalletEvent; value: number; onChange: (i: number) => void; className?: string }) {
  if (event.seats.length < 2) return null;
  return (
    <ToggleGroup
      type="single"
      size="sm"
      disallowEmptySelection
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
      aria-label="Choose a seat"
      className={className}
    >
      {event.seats.map((s, i) => (
        <ToggleGroupItem key={s} value={String(i)}>Seat {s}</ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/**
 * WalletPass: the selected ticket as a physical pass. Event on the left, a
 * perforation, then the live QR on the stub, so the code is on screen the
 * moment the wallet opens. Seat switch swaps the code in place.
 */
export default function WalletPass({
  event,
  seat,
  onSeat,
  onGate,
  onTransfer,
  onSell,
}: {
  event: WalletEvent;
  seat: number;
  onSeat: (i: number) => void;
  onGate: () => void;
  onTransfer: () => void;
  onSell?: () => void;
}) {
  const reduce = useReducedMotion();
  const tickets = ticketsFor(event);
  const t = tickets[Math.min(seat, tickets.length - 1)];
  const order = orderFor(event);
  const live = !event.past && event.state !== "transferred";
  const avail = availability(event);

  return (
    <motion.section
      key={event.id}
      aria-label={`Ticket pass for ${event.title}`}
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
      className="relative flex flex-col-reverse overflow-hidden rounded-[28px] bg-card shadow-h-surface ring-1 ring-border @2xl:flex-row"
    >
      {/* Event side */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 p-5 @2xl:p-8">
        <div className="flex items-start gap-4">
          <WalletMonogram event={event} className="size-14 text-lg @2xl:size-16 @2xl:text-xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Status color={avail.color} pulse={live && event.inDays === 0}>{avail.label}</Status>
              <Badge variant="neutral" size="sm">{event.kind}</Badge>
              {event.badges?.map((b) => <Badge key={b} variant="neutral" size="sm">{b}</Badge>)}
            </div>
            <h2 className="mt-2 text-balance text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] @2xl:text-[28px]">{event.title}</h2>
          </div>
        </div>

        <div className="flex items-end gap-3">
          {live && event.inDays > 0 ? (
            <>
              <NumberFlow value={event.inDays} className="text-[56px] font-medium leading-none tracking-[-0.04em] tabular-nums @2xl:text-[72px]" />
              <span className="pb-2 text-[15px] text-ink2">{event.inDays === 1 ? "day to go" : "days to go"}</span>
            </>
          ) : (
            <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] @2xl:text-[56px]">{live ? "Doors " + event.doors : event.date}</span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[15px]">
          <Info k="Date" v={`${event.date} · ${event.time}`} />
          <Info k="Doors" v={event.doors} />
          <Info k="Seat" v={t.seat} />
          <Info k="Venue" v={`${event.venue}, ${event.city}`} />
        </dl>

        <div className="mt-auto flex flex-wrap gap-2">
          {live && (
            <Button size="lg" onClick={onGate}>
              <ArrowsOutSimple weight="bold" /> Open at the gate
            </Button>
          )}
          <Button size="lg" variant="secondary" onClick={onTransfer} disabled={!live}>
            <PaperPlaneTilt weight="bold" /> Transfer
          </Button>
          {onSell && (
            <Button size="lg" variant="secondary" onClick={onSell} disabled={!live}>
              <Tag weight="bold" /> Sell
            </Button>
          )}
          <Button size="lg" variant="ghost" asChild>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noreferrer">
              <MapPin weight="bold" /> Directions
            </a>
          </Button>
        </div>
      </div>

      {/* Perforation */}
      <div aria-hidden className="relative h-0 border-t-2 border-dashed border-border @2xl:h-auto @2xl:w-0 @2xl:border-t-0 @2xl:border-l-2">
        <span className="absolute -left-3 top-0 size-6 -translate-y-1/2 rounded-full bg-background @2xl:left-0 @2xl:-top-3 @2xl:-translate-x-1/2 @2xl:translate-y-0" />
        <span className="absolute -right-3 top-0 size-6 -translate-y-1/2 rounded-full bg-background @2xl:bottom-0 @2xl:left-0 @2xl:right-auto @2xl:top-auto @2xl:-translate-x-1/2 @2xl:translate-y-1/2" />
      </div>

      {/* Stub */}
      <div className="flex flex-col items-center gap-4 p-5 @2xl:w-[300px] @2xl:shrink-0 @2xl:justify-center @2xl:p-8">
        <SeatSwitch event={event} value={seat} onChange={onSeat} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={t.code}
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: live ? 1 : 0.45, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="w-full max-w-[236px]"
          >
            <WalletQr code={t.code} sweep={live} className="aspect-square w-full" />
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex items-center gap-1.5 text-[13px] tracking-[0.06em] text-ink2"><QrCode weight="bold" className="size-4" />{t.code}</span>
          <span className="text-[13px] text-mute">{live ? "Demo code. Scan at the gate once tickets are live." : (event.state === "transferred" ? "These seats were transferred. The code no longer works." : "This event has passed.")}</span>
        </div>
        {live && <PhoneWalletButtons className="w-full [&>div]:justify-center" />}
        <details className="w-full text-[13px] text-ink2 @2xl:hidden">
          <summary className="cursor-pointer py-1 font-medium text-foreground">Order details</summary>
          <OrderList order={order} />
        </details>
      </div>
    </motion.section>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium tracking-[0.06em] text-mute">{k}</dt>
      <dd className="mt-1 font-medium leading-snug text-foreground">{v}</dd>
    </div>
  );
}

export function OrderList({ order }: { order: { k: string; v: string }[] }) {
  return (
    <dl className="mt-2 divide-y divide-border">
      {order.map((o) => (
        <div key={o.k} className="flex items-baseline justify-between gap-4 py-2">
          <dt>{o.k}</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">{o.v}</dd>
        </div>
      ))}
    </dl>
  );
}
