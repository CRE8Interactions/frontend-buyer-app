"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ArrowLeft, Lock } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Alert, AlertContent, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { sectionImageIdentifiers } from "@/lib/seatView";
import { ApplePayButton, LinkButton } from "./ExpressPay";
import { DECLINED_LAST4, DEMO_EMAIL, Note, Roll, clock, money, useScene, useSiteDark, type CheckoutProps } from "./Checkout";
import { EASE, Money } from "./SeasonMotion";
import SeatPeek from "./SeatPeek";
import StripeCard, { type CardApi } from "./StripeCard";
import TearToPay from "./TearToPay";

/* The checkout as a scene: the view from the seat is the whole page. The real photo fills the screen, dimmed, grey and a little soft, as if it were locked; the seat is
   the headline over it; a solid payment card sits on top. Each card field that comes out right brings the view a step into focus and into colour, so filling the form
   is unlocking the view; tearing the stub takes it all the way, for a beat ("That's your view."), before the confirmation. An order with no seat photo (a flex pack)
   gets the team colour instead, and the rest is the same. The two-panel look is still in Checkout.tsx; CheckoutSwitch.tsx picks. */

/** The countdown for this screen is a fuse: a line along the very top edge of the screen that drains with the hold (the way a story's progress bar does), and the time as plain
    text beside the Back button, with no pill around it. It is white on the team colour. In the last minute the fuse turns a light coral-red and breathes, and a small dot pulses by the
    time: the red is only a thin line and a dot, and a lighter red than the danger token, so it holds on a maroon backdrop where a red block (or the plain token) would not. The digits roll each second. */
function SceneClock({ left, span, low, expired }: { left: number; span: number; low: boolean; expired: boolean }) {
  const share = expired ? 0 : Math.max(0, Math.min(1, left / span));
  const t = Math.max(left, 0);
  const hot = low && !expired;
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-30 h-1 bg-white/15">
        <div className={`h-full origin-left will-change-transform ${hot ? "bg-[color-mix(in_oklab,var(--h-danger)_62%,white)] cx-beat" : "bg-white/85"}`} style={{ transform: `scaleX(${share})`, transition: "transform 1s linear, background-color 0.3s" }} />
      </div>
      <div role="timer" aria-label={expired ? "The hold has ended" : `Your seats are held for ${clock(left)}`} className="flex h-10 items-center gap-2.5 text-white md:h-9">
        {hot ? <i aria-hidden className="size-2 rounded-full bg-[color-mix(in_oklab,var(--h-danger)_62%,white)] cx-halo" /> : null}
        <span aria-hidden className="flex items-baseline text-[17px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
          <NumberFlow value={Math.floor(t / 60)} /><span>:</span><NumberFlow value={t % 60} format={{ minimumIntegerDigits: 2 }} />
        </span>
        <span aria-hidden className="text-[13px] font-medium text-white/70 max-sm:hidden">{expired ? "hold ended" : low ? "left to pay" : "seats held"}</span>
      </div>
    </>
  );
}

export default function CheckoutScene({ onBack, holdSeconds, onExpired, productTitle, productNote, logo, lines, total, onPaid }: CheckoutProps) {
  const still = !!useReducedMotion();
  const dark = useSiteDark();
  const [cardOk, setCardOk] = useState(false);
  const [steps, setSteps] = useState(0);
  const cardApi = useRef<CardApi | null>(null);
  const mounted = useRef(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [fresh, setFresh] = useState(0);
  const [apple, setApple] = useState(true);
  const [left, setLeft] = useState(() => {
    if (!holdSeconds) return null;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") { const q = Number(new URLSearchParams(window.location.search).get("hold")); if (q > 0) return q; }
    return holdSeconds;
  });
  const [span] = useState(left);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notes = useRef<HTMLDivElement>(null);
  const tear = useRef<HTMLDivElement>(null);
  useScene();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const expired = left !== null && left <= 0;
  const low = left !== null && left > 0 && left <= 60;

  /* the view: the first seat that has a photo */
  const seatLines = lines.filter((l) => l.seat);
  const plainLines = lines.filter((l) => !l.seat);
  const lead = seatLines.find((l) => l.seat?.venueSlug) ?? seatLines[0];
  const photoId = lead?.seat?.venueSlug ? sectionImageIdentifiers(null, lead.seat.section).find((x) => /^[a-z0-9-]+$/.test(x)) : undefined;
  const photo = lead?.seat?.venueSlug && photoId ? `/api/seat-view/?venue=${encodeURIComponent(lead.seat.venueSlug)}&section=${encodeURIComponent(photoId)}&type=seat-view&w=1400` : null;
  /* one place is the big hero. More than one is a list grouped by section: each section has its own photo tile, its letter, and its rows (so the photo always belongs to the
     section beside it, and a long order stays short) */
  const blocks: { section: string; venueSlug?: string; rows: { key: string; row: string; seats: string; count: number; amount: number; note: string }[] }[] = [];
  for (const l of seatLines) {
    const s = l.seat!;
    let b = blocks.find((x) => x.section === s.section);
    if (!b) { b = { section: s.section, venueSlug: s.venueSlug, rows: [] }; blocks.push(b); }
    b.rows.push({ key: l.key ?? l.title, row: s.row, seats: s.seats, count: s.count, amount: l.amount, note: l.note });
  }
  const seatCount = seatLines.reduce((n, l) => n + (l.seat?.count ?? 0), 0);
  const [photoOk, setPhotoOk] = useState(true);
  const [photoIn, setPhotoIn] = useState(false);
  const hasPhoto = !!photo && photoOk;

  /* the view comes into focus a quarter at a time as the card fields come out right, and all the way when the stub is torn */
  const level = paid ? 1 : Math.min(1, steps / 4);
  const g = 1 - level;
  const ease = "cubic-bezier(0.23, 1, 0.32, 1)";

  const finish = () => { setPaid(true); timer.current = setTimeout(onPaid, still ? 400 : 1600); };
  /** Asked when the stub starts to tear: the card form has to be complete first. If it is not, the form marks what is wrong (and the stub shakes). */
  const attempt = () => {
    if (paying || paid || expired) return false;
    if (!cardApi.current) { setPayError("The card form is not ready yet. Try again in a moment."); return false; }
    if (!cardOk) { cardApi.current.touch(); return false; }
    return true;
  };
  /** The stub has come away: Stripe checks the card and makes a test payment method (nothing is charged), then the view, or a problem and a fresh stub. */
  const torn = async () => {
    setPaying(true); setPayError(null);
    const t0 = performance.now();
    const res = await (cardApi.current ? cardApi.current.submit() : Promise.resolve({ ok: false as const, message: "The card form is not ready yet. Try again in a moment." }));
    const rest = Math.max(0, 1000 - (performance.now() - t0));
    await new Promise<void>((done) => { timer.current = setTimeout(done, rest); });
    if (!mounted.current) return;
    setPaying(false);
    const declined = res.ok && res.last4 === DECLINED_LAST4;
    if (!res.ok || declined) {
      setPayError(res.ok ? "Your card was declined. Nothing was charged. Check the number or try another card; a fresh stub is ready." : `${res.message} Nothing was charged; a fresh stub is ready.`);
      setFresh((n) => n + 1);
      requestAnimationFrame(() => notes.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    } else finish();
  };
  /** a wallet: no card to check, the payment goes straight through (a press while one is already going is ignored) */
  const wallet = () => { if (paying || paid || expired) return; setPaying(true); timer.current = setTimeout(() => { setPaying(false); finish(); }, 900); };

  const gone = paid ? "pointer-events-none translate-y-3 opacity-0" : "opacity-100";

  return (
    <div role="region" aria-label="Checkout" className="fixed inset-0 z-40 overflow-y-auto overscroll-contain text-white">
      {/* the view, and the scrim that keeps the type readable on it */}
      <div aria-hidden className="fixed inset-0 overflow-hidden bg-[var(--t,var(--h-accent))]">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            decoding="async"
            onLoad={() => setPhotoIn(true)}
            onError={() => setPhotoOk(false)}
            className="absolute inset-0 size-full object-cover"
            style={{
              opacity: photoIn ? 1 : 0,
              filter: `grayscale(${g}) brightness(${0.7 + 0.3 * level})`,
              transform: `scale(${1 + 0.07 * g})`,
              transition: still ? "none" : `filter 900ms ${ease}, transform 1400ms ${ease}, opacity 600ms ease-out`,
            }}
          />
        ) : null}
        {/* the team colour over the view (heavy while it is locked, lighter as it unlocks), and a soft shade under the type */}
        {hasPhoto ? <div className="absolute inset-0 bg-[var(--t,var(--h-accent))]" style={{ opacity: 0.82 - 0.4 * level, transition: still ? "none" : `opacity 900ms ${ease}` }} /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.5),rgb(0_0_0/0)_55%,rgb(0_0_0/0.28))]" />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-[1280px] grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 md:p-5">
        <header className={`flex items-center justify-between gap-3 transition-[opacity,transform] duration-500 ${gone}`}>
          <Button variant="ghost" onClick={onBack} className="[--button-bg-hover:rgb(255_255_255/0.14)] [--button-fg:#fff]"><ArrowLeft weight="bold" aria-hidden />Back</Button>
          {left !== null && span !== null && <SceneClock left={left} span={span} low={low} expired={expired} />}
        </header>

        <div className={`grid min-h-0 gap-4 transition-[opacity,transform] duration-500 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-10 ${gone}`}>
          {/* the order, top to bottom: who it is for, then the seat (the one headline), the map, and the total, which is a step quieter. Left-aligned on one edge, and
              its last line shares a bottom edge with the payment card. */}
          <motion.section aria-label="Your order" className="flex min-h-[34svh] flex-col justify-between gap-8 md:min-h-0" initial={still ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <div className="flex items-center gap-3 md:pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="size-10 shrink-0 rounded-[12px] bg-white object-contain p-1.5" />
              <div className="min-w-0">
                <p className="text-base font-medium leading-tight tracking-[-0.01em]">{productTitle}</p>
                <p className="text-sm text-white/70">{productNote}</p>
              </div>
            </div>

            <div className="grid gap-8 md:gap-10">
              {seatLines.length === 1 && (
                <div className="grid gap-5">
                  {/* the photo tile above the seat: it opens the pictures (the view, then where the section is on the map) */}
                  {lead?.seat?.venueSlug ? <SeatPeek venueSlug={lead.seat.venueSlug} section={lead.seat.section} row={lead.seat.row} /> : null}
                  {seatLines.map((l, n) => {
                    const s = l.seat!;
                    const cells: [string, string][] = [["Section", s.section], ["Row", s.row], [s.count === 1 ? "Seat" : "Seats", s.seats]];
                    const chars = s.section.length + s.row.length + s.seats.length;
                    const size = chars <= 7 ? "text-[clamp(64px,9.5vw,140px)]" : chars <= 11 ? "text-[clamp(48px,6.6vw,96px)]" : "text-[clamp(34px,4.8vw,68px)]";
                    return (
                      <div key={l.key ?? l.title} className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-6 sm:gap-x-10">
                        {cells.map(([label, value], i) => (
                          <div key={label} className="min-w-0">
                            <p className="text-sm font-medium leading-none text-white/70">{label}</p>
                            <p className={`mt-3 truncate ${size} font-medium leading-[0.9] tracking-[-0.055em] tabular-nums [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]`}><Roll text={value} delay={0.3 + n * 0.1 + i * 0.1} still={still} /></p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
              {seatLines.length > 1 && (
                <div className="grid gap-5 pb-6 md:max-h-[max(220px,calc(100svh-300px))] md:overflow-y-auto md:overscroll-contain md:pr-3 md:[-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)] md:[mask-image:linear-gradient(to_bottom,#000_calc(100%-28px),transparent)] md:[scrollbar-width:none]">
                  {blocks.map((b, n) => (
                    <div key={b.section} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:gap-5">
                      {b.venueSlug ? <SeatPeek compact venueSlug={b.venueSlug} section={b.section} row={b.rows.length === 1 ? b.rows[0].row : undefined} /> : null}
                      <div className="min-w-0 [grid-column:2] max-sm:[&:only-child]:[grid-column:1]">
                        <p className="text-sm font-medium leading-none text-white/70">Section</p>
                        <p className={`mt-1.5 break-words ${b.section.length > 6 ? "text-[clamp(26px,2.8vw,38px)]" : "text-[clamp(38px,4.2vw,60px)]"} font-medium leading-[0.92] tracking-[-0.05em] [text-shadow:0_2px_24px_rgb(0_0_0/0.35)]`}><Roll text={b.section} delay={0.3 + n * 0.1} still={still} /></p>
                        <ul className="mt-2 grid gap-1">
                          {b.rows.map((r) => (
                            <li key={r.key} className="flex items-baseline justify-between gap-4 text-[clamp(18px,1.7vw,24px)] font-medium leading-snug tracking-[-0.02em]">
                              <span className="min-w-0">
                                <span className="break-words">Row {r.row} <span className="text-white/60">·</span> {r.count === 1 ? "Seat" : "Seats"} {r.seats}</span>
                                {/* more than one seat in the row: the sum that makes its price */}
                                {r.count > 1 ? <span className="block text-sm font-normal text-white/60">{r.note}</span> : null}
                              </span>
                              <span className="shrink-0 text-sm font-normal tabular-nums text-white/70">{money(r.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {plainLines.length > 0 && (
                <div className="grid gap-5">
                  {plainLines.map((l) => (
                    <div key={l.key ?? l.title} className="grid gap-2">
                      <span className="break-words text-[clamp(44px,6.4vw,96px)] font-medium leading-[0.95] tracking-[-0.05em] text-balance">{l.title}</span>
                      <span className="text-base text-white/75">{l.note}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2.5">
                <p className="text-sm font-medium leading-none text-white/70">Total due</p>
                <Money value={total} className="text-[clamp(40px,4.4vw,64px)] font-medium leading-none tracking-[-0.045em] tabular-nums" />
                <p className="text-sm leading-snug text-white/70">{seatLines.length === 1 ? `${seatLines[0].note} · ` : seatLines.length > 1 ? `${seatCount} seats in ${blocks.length === 1 ? "one section" : `${blocks.length} sections`} · ` : ""}taxes and fees included</p>
              </div>
            </div>
          </motion.section>

          {/* the payment: one solid card over the view */}
          <motion.section aria-label="Payment" className="flex flex-col rounded-[28px] bg-h-surface p-5 text-h-foreground shadow-[0_28px_70px_-24px_rgb(0_0_0/0.55)] md:self-end md:p-6" initial={still ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: EASE }}>
            <h1 className="pg-h1 !mb-5 !text-[clamp(26px,2.6vw,34px)]">Payment</h1>

            {expired && (
              <Alert variant="danger" className="mb-4"><AlertIndicator /><AlertContent><AlertTitle>Your seats were released</AlertTitle><AlertDescription>The hold ran out before payment. Nothing was charged. Pick your seats again to start a new hold.</AlertDescription>
                <Button className="mt-2 w-max" onClick={() => (onExpired ?? onBack)()}>Pick seats again</Button></AlertContent></Alert>
            )}

            <div className={`grid gap-2.5 ${apple ? "grid-cols-2" : "grid-cols-1"}`}>
              <ApplePayButton dark={dark} onPress={wallet} onShown={setApple} />
              <LinkButton total={money(total)} email={DEMO_EMAIL} onPaid={wallet} />
            </div>
            <div className="my-5 flex items-center gap-3 text-[13px] text-h-muted before:h-px before:flex-1 before:bg-h-separator after:h-px after:flex-1 after:bg-h-separator">Or pay by card</div>

            <div className="flex flex-col">
              <StripeCard amount={total} dark={dark} apiRef={cardApi} onComplete={(done) => { setCardOk(done); if (done) setPayError(null); }} onProgress={setSteps} />
              <div ref={notes} className="mt-3 grid gap-2 empty:hidden">
                {low && !expired && <Note tone="danger">Under a minute left. Your seats are released when the clock runs out.</Note>}
                {payError && <Note tone="danger">{payError}</Note>}
              </div>
            </div>

            <div ref={tear} className="mt-5 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-5 max-md:bg-h-surface max-md:px-5 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-10px_16px_-12px_color-mix(in_srgb,var(--shade)_35%,transparent)]">
              <TearToPay
                icon={<Lock weight="bold" className="size-[18px]" aria-hidden />}
                label={`Pay ${money(total)}`}
                description="Tap here, or tear the stub"
                stubLabel="Tear"
                confirmedLabel="Paying…"
                confirmedDescription="One moment"
                onAttempt={attempt}
                onConfirm={torn}
                disabled={expired}
                resetToken={fresh}
              />
            </div>
            <p className="mt-4 text-pretty text-center text-xs leading-relaxed text-h-muted">By paying you agree to the Purchase Policy and Terms &amp; Conditions.<br /><span className="block opacity-80">Test mode, nothing is charged.</span><span className="block opacity-80 tabular-nums">4242 4242 4242 4242 pays · 4000 0000 0000 0002 declines</span></p>
          </motion.section>
        </div>
      </div>

      {/* the payoff: the view, all the way in focus, with one line over it, before the confirmation */}
      <div aria-live="polite" className={`pointer-events-none fixed inset-0 z-20 grid place-items-center p-6 text-center transition-opacity duration-700 ${paid ? "opacity-100" : "opacity-0"}`}>
        <p className="text-[clamp(44px,8vw,112px)] font-medium leading-[0.98] tracking-[-0.055em] text-balance [text-shadow:0_2px_40px_rgb(0_0_0/0.45)]">{paid ? (hasPhoto ? "That’s your view." : "You’re in.") : ""}</p>
      </div>
    </div>
  );
}
