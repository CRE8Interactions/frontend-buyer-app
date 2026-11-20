"use client";

/**
 * The transfer and sell flows, built like a money-transfer app: one decision a screen, a big headline, a progress bar
 * you can see filling, a bottom bar that always holds the one button to press, and a done screen that shows where the
 * thing goes next. On a phone it is a tall bottom sheet with the button above the home bar; on a computer, a dialog.
 * This file holds the shell and the parts both flows share.
 */

import { StatusMark } from "@/components/ui/status-mark";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, animate, useAnimationFrame, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { CaretDown, CaretLeft, Check, Ticket } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback, AvatarMarble, marbleHue } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WalletMonogram } from "@/components/organisms/WalletPass";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { WalletEvent } from "@/lib/walletDemo";

/** "Sec A · Row F · Seat 6" -> { where: "Sec A · Row F", seatNo: "6" }. Anything else is shown whole. */
export const splitSeat = (seat: string) => {
  const m = /^(.*) · Seat (.+)$/.exec(seat);
  return m ? { where: m[1], seatNo: m[2] } : { where: "", seatNo: seat };
};

/* ---------------------------------------------------------------------------------------------
   The shell
   --------------------------------------------------------------------------------------------- */

/**
 * One screen of a flow, shown inside the ticket's own sheet in place of the ticket (no dialog on top of a sheet, so nothing
 * stacks or resizes): back goes a step back, and from the first step back to the ticket. `step` (1-based) of `total` drives
 * the progress line; going forward slides the next screen in from the right, going back from the left. `cta` is the bottom
 * bar's button (or buttons); `note` is one quiet line above it. Fills the sheet's height.
 */
export function FlowShell({
  step, total, title, sub, onBack, cta, note, pageKey, foldBar, children,
}: {
  /** Fold the top bar away. Defaults to the last step. */
  foldBar?: boolean;
  /** Steps that share a key stay on one page instead of sliding, so what is on it keeps its place. */
  pageKey?: number;
  step: number; total: number; title: React.ReactNode; sub?: React.ReactNode;
  onBack?: () => void; cta: React.ReactNode; note?: React.ReactNode; children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const away = foldBar ?? step >= total;
  /* The bar closes in one go, a moment after the old headline has let go, and the headline takes its final place at once. What is
     under it is shifted by that, so in the same frame it is given the same distance back as an offset and glides home, instead
     of jumping. The close is a plain state change (not an animation), so the layout and the offset land in one commit. */
  const inPlace = pageKey !== undefined;
  /* the last page of a flow that slides between pages does not slide in: it rises into place, the way the last page of the other flow does, with the old one fading where it is */
  const rise = away && !inPlace;
  const [folded, setFolded] = useState(away);
  useEffect(() => {
    if (!inPlace) return;
    if (!away || reduce) { setFolded(away); return; }
    const t = setTimeout(() => setFolded(true), 160);
    return () => clearTimeout(t);
  }, [away, reduce, inPlace]);
  const barRef = useRef<HTMLDivElement>(null);
  const barH = useRef(0);
  const [barSize, setBarSize] = useState(48);
  const wasFolded = useRef(folded);
  const shift = useMotionValue(0);
  const glide = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (!wasFolded.current) { barH.current = el.offsetHeight; setBarSize(el.offsetHeight); } });
    ro.observe(el);
    barH.current = el.offsetHeight;
    setBarSize(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (wasFolded.current === folded) return;
    wasFolded.current = folded;
    if (reduce) { shift.set(0); return; }
    const from = folded ? barH.current : -barH.current;
    shift.set(from);
    if (glide.current) glide.current.style.transform = `translateY(${from}px)`; // this frame, before paint: a motion value only reaches the page on the next one, which shows as a jump
    const run = animate(shift, 0, { duration: 0.8, ease: [0.32, 0.72, 0, 1] });
    return () => run.stop();
  }, [folded, reduce, shift]);
  const last = useRef(step);
  const dir = step >= last.current ? 1 : -1;
  useEffect(() => { last.current = step; }, [step]);

  return (
    <div role="region" aria-label={typeof title === "string" ? title : "Flow"} className="mx-auto flex h-full min-h-0 w-full max-w-[560px] flex-col">
      {/* top bar: back and progress; it folds away once the flow is done, when there is nothing left to show */}
      {/* in a flow whose last two steps share a page the bar closes in one go (see above); in one that slides to a new page the bar only fades, and the new page is laid out over the room it leaves, so it arrives already in its final place and nothing moves once it is shown (the old page does not move at all) */}
      <div ref={barRef} aria-hidden={away}
        className={cn("overflow-hidden transition-opacity duration-200", away && "pointer-events-none opacity-0", inPlace && folded && "h-0")}>
        {/* its breathing room is inside it, so closing the bar takes all of it at once (padding animated on its own snaps at the end) */}
        <div className="flex items-center gap-3 pb-2">
        <Button variant="tertiary" size="icon-sm" aria-label="Back" onClick={onBack} className={cn("shrink-0", !onBack && "pointer-events-none opacity-0")} tabIndex={onBack && !away ? 0 : -1}><CaretLeft weight="bold" /></Button>
        <div role="progressbar" aria-label="Progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-foreground/10">
          <motion.span className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-primary" initial={false} animate={{ scaleX: step / total }} transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }} />
        </div>
        <span className="w-9 shrink-0" aria-hidden />
              </div>
      </div>

      {/* the screen: headline, then what to decide */}
      <div className="relative mx-[calc(var(--sheet-x)*-1)] min-h-0 flex-1 overflow-x-clip">
        <AnimatePresence mode="popLayout" initial={false} custom={{ d: dir, rise }}>
          <motion.div
            key={pageKey ?? step}
            custom={{ d: dir, rise }}
            variants={{
              enter: ({ d, rise: r }: { d: number; rise: boolean }) => (reduce ? { opacity: 0 } : r ? { opacity: 0, y: 24 } : { x: d > 0 ? "100%" : "-28%", opacity: d > 0 ? 1 : 0.4 }),
              center: { x: 0, y: 0, opacity: 1 },
              exit: ({ d, rise: r }: { d: number; rise: boolean }) => (reduce ? { opacity: 0 } : r ? { opacity: 0 } : { x: d > 0 ? "-28%" : "100%", opacity: d > 0 ? 0.4 : 1 }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.4, ease: EASE_OUT }}
            style={!inPlace && away ? { top: -barSize } : undefined}
            className="absolute inset-0 flex touch-pan-y flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain bg-h-overlay px-(--sheet-x) pb-4 pt-5 [&>*]:shrink-0"
          >
            {/* the headline changes in place when the page stays (the last two steps): the old one fades where it stands and the new one rises into its final place from below */}
            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={typeof title === "string" ? title : "title"} initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delay: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.16, ease: EASE_OUT } }}>
                  <h2 className="text-balance text-[clamp(30px,8.4vw,38px)] font-semibold leading-[1.04] tracking-[-0.035em]">{title}</h2>
                  {sub && <p className="mt-2.5 text-[17px] leading-snug text-ink2">{sub}</p>}
                </motion.div>
              </AnimatePresence>
            </div>
            <motion.div ref={glide} style={{ y: shift }} className="flex flex-[1_0_auto] flex-col gap-6 [&>*]:shrink-0">{children}</motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* the bottom bar: always there, always the one thing to press */}
      <div className="flex flex-col gap-3 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-3 md:pb-8">
        {note && <p className="text-center text-[14px] leading-snug text-ink2">{note}</p>}
        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={step >= total ? "done" : "go"} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease: EASE_OUT }}
              className="flex gap-2 [&>*]:min-w-0 [&>*:first-child:not(:last-child)]:flex-1 [&>*:last-child]:flex-[2] [&>*:only-child]:flex-1">{cta}</motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   Parts
   --------------------------------------------------------------------------------------------- */

/** The event this is about, one quiet line. */
export function FlowContext({ event, title, sub }: { event?: WalletEvent; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-secondary/60 p-3">
      {event ? <WalletMonogram event={event} className="size-12 rounded-[14px] text-[16px]" /> : null}
      <div className="min-w-0">
        <p className="line-clamp-2 text-[16px] font-medium leading-tight">{title}</p>
        <p className="truncate text-[14px] text-ink2">{sub ?? (event ? `${event.date} · ${event.time}` : "")}</p>
      </div>
    </div>
  );
}

/**
 * Seats as numbers you tap, grouped by where they are (one block per section and row), like picking seats rather than
 * ticking a form. The chips are the library toggle group, so a group of two and a block of twenty look the same: the
 * numbers just wrap. "Select all" is at the top; each group has its own.
 */
export function SeatPicker({ seats, value, onChange }: { seats: { no: string; seat: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const groups = seats.reduce<{ place: string; items: { no: string; label: string }[] }[]>((acc, t) => {
    const { where, seatNo } = splitSeat(t.seat);
    const place = where ? where.replace(/^Sec /, "Section ") : "";
    const item = { no: t.no, label: where ? seatNo : t.seat };
    const g = acc.find((x) => x.place === place);
    if (g) g.items.push(item); else acc.push({ place, items: [item] });
    return acc;
  }, []);
  const setGroup = (nos: string[], on: boolean) => onChange(on ? [...new Set([...value, ...nos])] : value.filter((v) => !nos.includes(v)));
  return (
    <div className="flex flex-col gap-5">
      {seats.length > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[15px] text-ink2"><span className="font-medium text-foreground tabular-nums">{value.length}</span> of {seats.length} selected</p>
          {groups.length > 1 && <Button variant="ghost" size="sm" className="-mr-3" onClick={() => onChange(value.length === seats.length ? [] : seats.map((s) => s.no))}>{value.length === seats.length ? "Clear all" : "Select all"}</Button>}
        </div>
      )}
      {groups.map((g) => {
        const nos = g.items.map((i) => i.no);
        const all = nos.every((n) => value.includes(n));
        return (
          <section key={g.place || "all"} aria-label={g.place || "Seats"} className="flex flex-col gap-3">
            {(g.place || groups.length > 1) && (
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{g.place || "Seats"}</h3>
                {g.items.length > 1 && (groups.length > 1 || true) && <Button variant="ghost" size="sm" className="-mr-3" onClick={() => setGroup(nos, !all)}>{all ? "Clear" : "Select all"}</Button>}
              </div>
            )}
            <ToggleGroup type="multiple" size="lg" detached aria-label={g.place ? `Seats in ${g.place}` : "Seats"} className="w-full flex-wrap justify-start gap-2"
              value={nos.filter((n) => value.includes(n))} onValueChange={(v) => onChange([...value.filter((x) => !nos.includes(x)), ...v])}>
              {g.items.map((i) => (
                <ToggleGroupItem key={i.no} value={i.no} aria-label={g.place ? `Seat ${i.label}` : i.label} className="min-w-[68px] text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{i.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        );
      })}
    </div>
  );
}

/** A list of label / value rows, the way a transfer app lists the terms: hairlines between, the last row bold. */
export function Terms({ rows }: { rows: { k: string; v: React.ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="rounded-[24px] bg-secondary/60 px-4">
      {rows.map((r, i) => (
        <div key={r.k} className={cn("flex items-baseline justify-between gap-4 py-3.5", i > 0 && "border-t border-border")}>
          <dt className="text-[15px] text-ink2">{r.k}</dt>
          <dd className={cn("min-w-0 text-right text-[16px] tabular-nums", r.strong ? "text-[20px] font-semibold tracking-[-0.02em]" : "font-medium")}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A stub standing for what is being sent or sold: the event and the seats as chips. */
export function StubCard({ event, subject, seats, badge, children, className }: { event?: WalletEvent; subject: string; seats?: string[]; badge?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[24px] bg-secondary/70 p-4", className)}>
      <div className="flex items-start gap-3">
        {event ? <WalletMonogram event={event} className="size-12 rounded-[14px] text-[16px]" /> : null}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em]">{subject}</p>
          {event && <p className="text-[14px] text-ink2">{event.date} · {event.time}</p>}
        </div>
        {badge}
      </div>
      {seats && seats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {seats.map((s) => <Badge key={s} variant="neutral" size="lg">{s}</Badge>)}
        </div>
      )}
      {children}
    </div>
  );
}

/** The done mark: a ring draws, a check strokes in, a soft green pulse leaves it. Still for reduced motion. */
export function DoneMark() {
  useEffect(() => { try { navigator.vibrate?.(12); } catch { /* no haptics here */ } }, []);
  return <StatusMark tone="success" label="" />;
}

/** Mounts its children after a pause, so something that plays on mount (a drawn check, a count) is not already over by the time its room has opened. */
export function After({ ms, children }: { ms: number; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), ms); return () => clearTimeout(t); }, [ms]);
  return on ? <>{children}</> : null;
}

/** A block that opens and closes its own room (and the gap beside it), on the same clock as the rest of a screen that changes in place,
    so what comes and goes never makes the others jump. `enter` makes it start closed and open (the tracker); without it it starts open and
    folds away when removed (the terms). Wrap it in AnimatePresence. */
export function Collapse({ enter, gap = 24, children }: { enter?: boolean; /** the page gap it sits in, so closing takes the gap with it; 0 inside a card */ gap?: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const shut = { height: 0, opacity: 0, marginTop: -gap };
  const open = { height: "auto", opacity: 1, marginTop: 0 };
  const room = reduce ? { duration: 0 } : { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const, delay: 0.16 };
  return (
    <motion.div initial={enter && !reduce ? shut : false} animate={{ ...open, transition: enter ? { height: room, marginTop: room, opacity: { duration: 0.45, delay: 0.5 } } : { duration: 0 } }}
      exit={{ ...shut, transition: { opacity: { duration: 0.28, ease: EASE_OUT }, height: room, marginTop: room } }} className="overflow-hidden">
      {children}
    </motion.div>
  );
}

/** Where it goes next: done (brand green with a check), in progress (a soft green ring with a pulsing dot), still to come (a quiet ring). */
export function Tracker({ steps }: { steps: { title: string; sub: string; state: "done" | "now" | "next" }[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <motion.li key={s.title} className="relative flex gap-3 pb-4 last:pb-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.45 + i * 0.12 }}>
          {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[9.25px] top-6 h-[calc(100%-1.5rem)] w-[1.5px] rounded-full", s.state === "done" ? "bg-primary" : "bg-foreground/12")} />}
          <span aria-hidden className={cn("relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", s.state === "done" ? "bg-primary text-primary-foreground" : s.state === "now" ? "bg-primary/20 shadow-[inset_0_0_0_1.5px_var(--color-primary)]" : "bg-transparent shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-foreground)_18%,transparent)]")}>
            {s.state === "done" ? <Check weight="bold" className="size-3" /> : s.state === "now" ? <span className="size-[7px] animate-pulse rounded-full bg-primary motion-reduce:animate-none" /> : null}
          </span>
          <div className="min-w-0">
            <p className={cn("text-[15px] font-medium leading-snug", s.state === "next" && "text-ink2")}>{s.title}</p>
            <p className="text-[14px] leading-snug text-ink2">{s.sub}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** A dollar amount that rolls up to its value when it first appears, in the site's number flow. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(value), 180); return () => clearTimeout(t); }, [value]);
  return <NumberFlow value={v} format={{ style: "currency", currency: "USD" }} className={cn("tabular-nums", className)} />;
}

/** The amount, big: type it, or nudge it with the buttons. The digits are the site's number flow, so they roll as the price
 *  changes; the field itself is invisible text on top, so typing, the caret and the keyboard are all the real thing. */
export function BigAmount({ value, onChange, min, max, step = 1, invalid, label }: { value: number | null; onChange: (v: number | null) => void; min: number; max: number; step?: number; invalid?: boolean; label: string }) {
  const [raw, setRaw] = useState(value == null ? "" : String(value));
  const [focused, setFocused] = useState(false);
  /* what has been typed that the rolling digits do not show (a trailing point, or zeros after it): "25." and "25.0" */
  const shown = value == null ? "" : String(value);
  const suffix = raw.startsWith(shown) ? raw.slice(shown.length) : "";
  useEffect(() => { setRaw(value == null ? "" : (Number(raw) === value ? raw : String(value))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value]);
  const nudge = (d: number) => { const n = Math.min(max, Math.max(min, (value ?? min) + d)); onChange(n); };
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="secondary" size="icon-lg" aria-label="Lower the price" disabled={(value ?? min) <= min} onClick={() => nudge(-step)} className="shrink-0 rounded-full text-[22px]">−</Button>
      <label className="relative flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <span aria-hidden className={cn("text-[40px] font-semibold tracking-[-0.04em] text-ink2", invalid && "text-destructive")}>$</span>
        {/* the number, what was typed past it, and the caret: the caret is out of the layout (absolute, just past the last digit), so focusing never moves the digits */}
        <span className="relative inline-flex items-baseline">
        <NumberFlow
          aria-hidden
          value={value ?? 0}
          format={{ minimumFractionDigits: 0, maximumFractionDigits: 2 }}
          style={{ fontSize: "clamp(56px, 18vw, 76px)", lineHeight: 1 }}
          className={cn("pointer-events-none font-semibold tracking-[-0.05em] tabular-nums", value == null && "text-foreground/20", invalid && "text-destructive")}
        />
        {suffix && <span aria-hidden className={cn("pointer-events-none font-semibold tracking-[-0.05em] tabular-nums", invalid && "text-destructive")} style={{ fontSize: "clamp(56px, 18vw, 76px)", lineHeight: 1 }}>{suffix}</span>}
          {focused && <motion.span aria-hidden className="pointer-events-none absolute left-full top-1/2 ml-1 h-[1.3em] w-[2px] -translate-y-1/2 rounded-full bg-primary" style={{ fontSize: "clamp(56px, 18vw, 76px)" }} animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 1.05, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }} />}
        </span>
        <input
          aria-label={label}
          aria-invalid={invalid || undefined}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={raw}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d{0,2}).*$/, "$1");
            setRaw(v);
            onChange(v === "" || v === "." ? null : Number(v));
          }}
          style={{ fontSize: "clamp(56px, 18vw, 76px)" }}
          className="absolute inset-0 size-full bg-transparent text-center font-semibold tracking-[-0.05em] tabular-nums text-transparent caret-transparent outline-none selection:bg-primary/25"
        />
      </label>
      <Button variant="secondary" size="icon-lg" aria-label="Raise the price" disabled={(value ?? 0) >= max} onClick={() => nudge(step)} className="shrink-0 rounded-full text-[22px]">+</Button>
    </div>
  );
}

/** Who it is going to: a dashed circle until the address is whole, then their marble pops in. */
export function RecipientBubble({ email }: { email: string }) {
  const reduce = useReducedMotion();
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <div aria-hidden className="mx-auto flex size-20 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        {valid ? (
          <motion.span key={email.trim().toLowerCase()} initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", duration: 0.45, bounce: 0.35 }} className="flex">
            <AvatarMarble seed={email} className="size-20" />
          </motion.span>
        ) : (
          <motion.span key="empty" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-foreground/25 text-[28px] font-semibold text-ink2">?</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The hand-off: the ticket hovers over the person it is going to. `progress` (0 to 1, usually the hold-to-send button's) scrubs
 * the send: as it rises the ticket's text fades, its shape shrinks and rounds into a circle and slides down onto their
 * marble, which swells and whose glow grows; let go early and it all springs back. At 1 the circle lands and melts away.
 * Once sent, a check pops on the marble and rings go out. The scene takes the recipient's colour (the hue of their marble).
 * Still for reduced motion. The email sits in a pill that grows with it.
 */
export function HandOff({ event, subject, parts, to, from, phase, progress }: { event?: WalletEvent; subject: string; /** what the ticket says, as label and value (Section A, Row F, Seat 6), the way the ticket sheet writes it */ parts: { label: string; value: string }[]; to: string; from: string; phase: "ready" | "sending" | "sent"; progress?: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const own = useMotionValue(0);
  const hue = marbleHue(to);
  const tint = `oklch(0.8 0.15 ${hue})`;
  const flying = phase !== "ready";

  /* where the ticket is and where the marble is, so the ticket knows how far to travel and how tall it starts */
  const box = useRef<HTMLDivElement>(null);
  const marble = useRef<HTMLDivElement>(null);
  const geo = useRef({ h: 150, dy: 190 });
  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current?.getBoundingClientRect(), m = marble.current?.getBoundingClientRect();
      if (b && m) geo.current = { h: b.height, dy: m.top + m.height / 2 - (b.top + b.height / 2) };
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [phase, to]);

  /* Two phases, so the hold's steady fill never has to be the animation's feel:
     1. HOLD (`charge` 0 to 1 from the button): an attraction with resistance. The avatar draws the card toward it like a magnet,
        but it is held back: it hesitates (barely moves at first), then comes slowly, never past about a quarter of the way, and stays behind the avatar throughout, and it stretches
        toward the avatar, like something falling into a black hole: it gets smaller, evenly, as it is drawn closer (no stretch, no
        squeeze at the sides). Rings are drawn inward.
        Let go and it eases back.
     2. LAUNCH (once the hold completes, `launch` 0 to 1 on its own clock and curve): the band lets go. The card gets smaller and
        smaller as it slides the rest of the way onto the avatar, which pulses and flares as it lands. No spring: the curve on
        `launch` is the whole feel. */
  const charge = progress ?? own;
  const launch = useMotionValue(0);
  useEffect(() => {
    if (phase === "sent") { if (reduce || launch.get() === 0) { launch.set(0); return; } const run = animate(launch, 0, { duration: 0.9, ease: [0.22, 1, 0.36, 1] }); return () => run.stop(); } // the glow settles instead of snapping back
    if (phase !== "sending") { launch.set(0); return; }
    if (reduce) { launch.set(1); return; }
    const run = animate(launch, 1, { duration: 0.95, ease: [0.42, 0, 0.22, 1] }); // like the window: unhurried to start, quick through the pour, soft at the end
    return () => run.stop();
  }, [phase, reduce, launch]);

  /* the card floats a little while it waits, and stills as you start to hold, so the pull starts from a steady card */
  const floatY = useMotionValue(0);
  const floatRot = useMotionValue(0);
  useAnimationFrame((t) => {
    if (reduce || phase !== "ready") return;
    const calm = 1 - Math.min(1, charge.get() / 0.12);
    floatY.set(-4.5 * (1 + Math.sin(t / 540)) * calm);
    floatRot.set(1.5 * Math.sin(t / 540) * calm);
  });

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };
  const out = (c: number) => 1 - Math.pow(1 - clamp(c), 3);
  /* how far the band lets it come, never past about a quarter of the way: hesitant (barely any movement for the first quarter of the hold), then a slow
     build, then it slows again as the band tightens. Position only: the card does not stretch. */
  const HELD_MAX = 0.26;
  const held = (c: number) => { const t = clamp(c); return HELD_MAX * (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); };
  const both: MotionValue<number>[] = [charge, launch];
  const y = useTransform(both, ([c, l]: number[]) => { const f = held(c); return geo.current.dy * (f + (1 - f) * l); });
  const shrink = (l: number) => 1 - 0.8 * smooth(clamp(l * 1.1)); // smaller and smaller, a touch ahead of the slide
  /* like something falling toward a black hole: as the hold builds, the card gets smaller overall (the sides are not squeezed any more than
     that) and is drawn out long toward the avatar, a strong vertical stretch; the launch carries on shrinking it down to nothing. It stays behind the avatar the
     whole way, so as it is sucked in the avatar covers its last pixels. */
  const hole = (c: number) => 1 - 0.25 * out(c); // overall size while it is held
  const sx = useTransform(both, ([c, l]: number[]) => hole(c) * shrink(l));
  const sy = useTransform(both, ([c, l]: number[]) => hole(c) * (1 + 0.4 * out(c)) * shrink(l)); // and drawn out long toward the avatar: the stretch, laid on top
  const originY = useTransform(launch, [0, 0.6], [0.3, 0.5]); // anchored near the top while it is held, so the stretch grows toward the avatar; about its middle once it shrinks
  const cardOpacity = useTransform(launch, [0, 0.85, 1], [1, 1, 0.1]);
  /* the avatar: drawn up toward the card while you hold, pulses once on impact, glow flares */
  const bump = (l: number) => Math.sin(clamp((l - 0.8) / 0.2) * Math.PI);
  const pull = useTransform(both, ([c, l]: number[]) => -8 * out(c) * (1 - clamp(l)));
  const swell = useTransform(both, ([c, l]: number[]) => 1 + 0.05 * out(c) + 0.14 * bump(l));
  const glowScale = useTransform(both, ([c, l]: number[]) => 1 + 0.18 * out(c) + 0.2 * l + 0.12 * bump(l));
  const chevronOpacity = useTransform(charge, [0, 0.12], [1, 0]);
  const lit = useTransform(both, ([c, l]: number[]) => 1 + 0.3 * out(c) + 0.25 * l + 0.35 * bump(l));


  return (
    <motion.div
      className="relative mx-[calc(var(--sheet-x)*-1)] flex flex-col items-center justify-center gap-3 px-(--sheet-x) pb-5"
      /* once it has landed the ticket's room is given back and the scene takes all the free space, so the avatar glides to the middle of it and what follows (the tracker) rests at the bottom */
      initial={false}
      animate={phase === "sent" ? { minHeight: 0, paddingTop: 0, paddingBottom: 0, flexGrow: 1 } : { minHeight: 340, paddingTop: 206, paddingBottom: 20, flexGrow: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: phase === "sent" ? 0.16 : 0 }}>
      {/* the ticket */}
      {phase !== "sent" && (
        <div ref={box} className="absolute left-1/2 top-6 z-[5] w-[260px] -translate-x-1/2">
          <motion.div initial={reduce ? false : { y: -24, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <motion.div className="relative" style={{ y: floatY, rotate: floatRot }}>
              <motion.div className="relative" style={{ y, scaleX: sx, scaleY: sy, originY, opacity: cardOpacity }}>
                <span aria-hidden className="absolute inset-0 rounded-[22px] bg-background shadow-[0_22px_36px_-20px_rgb(0_0_0/.5)]" />
                <div className="relative p-3.5">
                <div className="flex items-center gap-3">
                  {event ? <WalletMonogram event={event} className="size-11 rounded-[12px] text-[14px]" /> : <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-secondary"><Ticket weight="bold" className="size-5" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold leading-tight tracking-[-0.01em]">{subject}</p>
                    <p className="truncate text-[14px] text-ink2">{event ? `${event.date} · ${event.time}` : "From you"}</p>
                  </div>
                  <Avatar size="sm" className="shrink-0"><AvatarFallback aria-label="From you">{from}</AvatarFallback></Avatar>
                </div>
                <dl aria-label="Ticket" className="mt-3 flex items-stretch border-t-2 border-dashed border-border pt-2.5">
                  {parts.map((part, i) => (
                    <div key={part.label} className={cn("min-w-0 flex-1 text-center", i > 0 && "border-s border-border")}>
                      <dt className="text-[14px] text-ink2">{part.label}</dt>
                      <dd className="truncate px-1 text-[20px] font-semibold leading-tight tracking-[-0.02em]">{part.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              </motion.div>
            </motion.div>
          </motion.div>

        </div>
      )}

      {/* chevrons running down to them, until you start to hold */}
      {phase === "ready" && !reduce && (
        <motion.div aria-hidden style={{ opacity: chevronOpacity }} className="absolute left-1/2 top-[188px] flex -translate-x-1/2 flex-col items-center gap-0.5 text-ink2">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} animate={{ opacity: [0, 0.9, 0], y: [-4, 6, 14] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}><CaretDown weight="bold" className="size-4" /></motion.span>
          ))}
        </motion.div>
      )}

      {/* them: a round marble with round rings, and a round glow that grows as the ticket arrives */}
      <div ref={marble} className="relative z-10 size-16 shrink-0">
        <motion.span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(100vw,440px)] -translate-x-1/2 -translate-y-1/2" style={{ scale: glowScale, opacity: lit }}>
          <motion.span className="block size-full rounded-full"
            style={{ background: `radial-gradient(circle closest-side, color-mix(in oklch, ${tint} 58%, transparent) 0%, color-mix(in oklch, ${tint} 42%, transparent) 16%, color-mix(in oklch, ${tint} 26%, transparent) 34%, color-mix(in oklch, ${tint} 13%, transparent) 54%, color-mix(in oklch, ${tint} 4%, transparent) 76%, transparent 100%)` }}
            animate={reduce ? undefined : { scale: [1, 1.07, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} />
        </motion.span>
        {!reduce && [0, 1, 2].map((i) => (
          <motion.span key={i} aria-hidden className="absolute inset-0 rounded-full border-[1.5px]" style={{ borderColor: tint }}
            initial={{ scale: 1, opacity: 0 }}
            animate={phase === "ready" ? { scale: [2.3, 1], opacity: [0, 0.5, 0] } : { scale: [1, 2.6], opacity: [0.6, 0] }}
            transition={phase === "ready"
              ? { duration: 2.1, repeat: Infinity, delay: i * 0.7, ease: [0.3, 0, 0.6, 1], times: [0, 0.5, 1] } /* drawn inward, as if pulled */
              : { duration: 2, repeat: Infinity, delay: i * 0.65, ease: [0.2, 0.6, 0.3, 1] }} />
        ))}
        <motion.div className="size-full" style={{ scale: swell, y: pull }}>
          <motion.div className="size-full" initial={phase === "sent" && !reduce ? { scale: 1.28 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 13, mass: 0.7 }}>
            <AvatarMarble seed={to} className="size-full" />
          </motion.div>
        </motion.div>
        {phase === "sent" && (
          <motion.span aria-hidden className="absolute -right-1 -top-1 z-30 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background"
            initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 15, delay: 0.12 }}>
            <Check weight="bold" className="size-3.5" />
          </motion.span>
        )}
      </div>

      {/* their email: a pill that holds a short one on a line and wraps a very long one */}
      <motion.span key={phase === "sent" ? "sent" : "to"} initial={phase === "sent" && !reduce ? { y: 14, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.2 }} className="relative z-20 min-w-[10rem] max-w-full rounded-[20px] bg-background/85 px-4 py-2 text-center text-[15px] font-medium leading-snug backdrop-blur-md [overflow-wrap:anywhere]"><span className="text-ink2">{phase === "sent" ? "Sent to " : "To "}</span>{to}</motion.span>
    </motion.div>
  );
}
