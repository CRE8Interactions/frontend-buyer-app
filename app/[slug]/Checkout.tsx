"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ArrowLeft, Check, Lock } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Alert, AlertContent, AlertDescription, AlertIndicator, AlertTitle } from "@/components/ui/alert";
import { ApplePayButton, LinkButton } from "./ExpressPay";
import { EASE, Money } from "./SeasonMotion";
import SeatPeek from "./SeatPeek";
import StripeCard, { type CardApi } from "./StripeCard";
import TearToPay from "./TearToPay";

/* The checkout and the confirmation for season seats and flex packs. One screen, two panels: the order (bold, in the team colour: the seat as huge numerals, a photo of the
   view that opens a dialog with the pictures, the total) and the payment (the wallet buttons, a compact card form, and the pay button, which is a stub you tear off).
   The clock at the top is the hold (it turns amber for the last minute). The fields are real and validated; nothing is sent anywhere. The card
   4000 0000 0000 0002 is declined (a fresh stub is printed), so the failure path can be seen. If the order carries a hold (seats), it counts down, warns at one
   minute and releases the seats at zero. In development, ?hold=20 shortens it. */

export const money = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** `seat` turns the line into a seat ticket, the same as beside the map */
export type Line = { title: string; note: string; amount: number; seat?: { section: string; row: string; seats: string; count: number; venueSlug?: string }; key?: string };
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Stripe test card 4000 0000 0000 0002 makes a payment method like any other and only fails when charged, so the demo reads its last four to show the declined path */
export const DECLINED_LAST4 = "0002";
export const DEMO_EMAIL = "jordan.reyes@gmail.com";

/** Characters that roll up into place one after another, like a departure board. Rests at once under reduced motion. */
export function Roll({ text, delay = 0, still }: { text: string; delay?: number; still: boolean }) {
  return (
    <span className="inline-flex" aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span className="inline-block" initial={still ? false : { y: "108%" }} animate={{ y: 0 }} transition={{ duration: 0.62, delay: delay + i * 0.05, ease: EASE }}>{c === " " ? "\u00a0" : c}</motion.span>
        </span>
      ))}
    </span>
  );
}

/** the site's light or dark, for the Apple Pay button (black on light, white with an outline on dark) */
export function useSiteDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => { const nt = document.documentElement.dataset.nt; setDark(nt ? nt === "dark" : mq.matches); };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nt"] });
    mq.addEventListener("change", read);
    return () => { mo.disconnect(); mq.removeEventListener("change", read); };
  }, []);
  return dark;
}

/** the screen takes the whole window, like the seat map: the site's bar is out of the way and the page behind does not scroll */
export function useScene() {
  useEffect(() => {
    document.documentElement.dataset.seasonScene = "1";
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { delete document.documentElement.dataset.seasonScene; document.body.style.overflow = prev; };
  }, []);
}

/** The hold, as a small ring that drains with the time (so it reads at a glance), digits that roll each second, and an amber state for the last minute. */
export function HoldTimer({ left, span, low, expired }: { left: number; span: number; low: boolean; expired: boolean }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const share = expired ? 0 : Math.max(0, Math.min(1, left / span));
  const t = Math.max(left, 0);
  const hot = low || expired;
  /* a clean white pill with a hairline ring; for the last minute the whole pill turns solid amber with dark type (amber type on grey does not read) */
  return (
    <div
      role="timer"
      aria-label={expired ? "The hold has ended" : `Your seats are held for ${clock(left)}`}
      className={`flex h-10 items-center gap-2.5 rounded-full pl-2.5 pr-4 transition-[background-color,color,box-shadow] duration-300 md:h-9 ${hot ? "bg-h-warning text-h-warning-foreground shadow-[0_6px_18px_-6px_color-mix(in_oklab,var(--h-warning)_70%,transparent)]" : "bg-h-surface text-h-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--h-foreground)_9%,transparent),0_1px_2px_color-mix(in_srgb,var(--shade)_8%,transparent)]"}`}
    >
      <svg viewBox="0 0 24 24" className={`size-[22px] -rotate-90 ${low ? "motion-safe:animate-pulse" : ""}`} aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
        <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - share)} style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <span aria-hidden className="flex items-baseline text-[16px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
        <NumberFlow value={Math.floor(t / 60)} /><span>:</span><NumberFlow value={t % 60} format={{ minimumIntegerDigits: 2 }} />
      </span>
      <span aria-hidden className={`text-[13px] font-medium max-sm:hidden ${hot ? "opacity-75" : "text-h-muted"}`}>{expired ? "hold ended" : low ? "left to pay" : "seats held"}</span>
    </div>
  );
}

/** a short line, not a banner: a field that needs a fix, or the last minute of the hold */
export function Note({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <p role={tone === "danger" ? "alert" : "status"} className={`rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${tone === "danger" ? "bg-[color-mix(in_oklab,var(--h-danger)_12%,transparent)] text-h-danger" : "bg-[color-mix(in_oklab,var(--h-warning)_22%,transparent)] text-h-foreground"}`}>{children}</p>
  );
}

export type CheckoutProps = {
  onBack: () => void; holdSeconds?: number; onExpired?: () => void; productTitle: string; productNote: string; logo: string; lines: Line[]; total: number; onPaid: () => void; intro?: string;
};

/** The two-panel checkout (the order on a bold team-colour panel, the payment beside it). It is still here: `CheckoutView` in CheckoutSwitch.tsx picks between this and the scene. */
export function CheckoutClassic({ onBack, holdSeconds, onExpired, productTitle, productNote, logo, lines, total, onPaid }: CheckoutProps) {
  const still = !!useReducedMotion();
  const dark = useSiteDark();
  const [cardOk, setCardOk] = useState(false);
  const cardApi = useRef<CardApi | null>(null);
  const mounted = useRef(true);
  const [paying, setPaying] = useState(false);
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
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  useScene();
  useEffect(() => {
    if (left === null || left <= 0) return;
    const id = setTimeout(() => setLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const expired = left !== null && left <= 0;
  const low = left !== null && left > 0 && left <= 60;

  /** Asked when the stub starts to tear: the card form has to be complete first. If it is not, Stripe's form marks what is wrong (and the stub shakes). */
  const attempt = () => {
    if (paying || expired) return false;
    if (!cardApi.current) { setPayError("The card form is not ready yet. Try again in a moment."); return false; }
    if (!cardOk) { cardApi.current.touch(); return false; }
    return true;
  };
  /** The stub has come away: Stripe checks the card and makes a test payment method (nothing is charged), then the confirmation, or a problem and a fresh stub. */
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
    } else onPaid();
  };
  /** a wallet: no card to check, the payment goes straight through (a press while one is already going is ignored) */
  const wallet = () => { if (paying || expired) return; setPaying(true); timer.current = setTimeout(() => { setPaying(false); onPaid(); }, 900); };
  const seatLines = lines.filter((l) => l.seat);
  const plainLines = lines.filter((l) => !l.seat);

  return (
    <div role="region" aria-label="Checkout" className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-h-background text-h-foreground [--h-default:color-mix(in_oklab,var(--h-foreground)_8%,transparent)] [--h-default-hover:color-mix(in_oklab,var(--h-foreground)_14%,transparent)] [--h-border:color-mix(in_srgb,var(--h-foreground)_16%,transparent)]">
      <div className="cx mx-auto grid min-h-full max-w-[1280px] grid-rows-[auto_minmax(0,1fr)] gap-3 p-3 md:p-4">
        <header className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={onBack}><ArrowLeft weight="bold" aria-hidden />Back</Button>
          {left !== null && span !== null && <HoldTimer left={left} span={span} low={low} expired={expired} />}
        </header>

        <div className="grid min-h-0 gap-3 min-[960px]:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] min-[960px]:gap-4">
          {/* the order: bold and in the team colour. The seat leads, the photo and the price sit under it, the total is last and biggest. */}
          <motion.section aria-label="Your order" className="relative flex flex-col gap-4 overflow-hidden rounded-[28px] bg-[var(--t,var(--h-accent))] p-5 text-[var(--on-t,var(--h-accent-foreground))] md:min-h-[320px] md:gap-6 md:p-8" initial={still ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="size-10 shrink-0 rounded-[12px] bg-white object-contain p-1.5 md:size-12 md:rounded-[14px]" />
              <div className="min-w-0">
                <p className="text-lg font-medium leading-tight tracking-[-0.02em] text-balance">{productTitle}</p>
                <p className="mt-0.5 text-sm opacity-75">{productNote}</p>
              </div>
            </div>

            {seatLines.length > 0 && (
              <ul className="my-auto grid gap-5 md:gap-7">
                {seatLines.map((l, n) => {
                  const s = l.seat!;
                  const cells: [string, string][] = [["Section", s.section], ["Row", s.row], [s.count === 1 ? "Seat" : "Seats", s.seats]];
                  /* the numerals take the room there is: huge when the place is short ("G, 16, 23"), smaller for a long one, smaller again for several places */
                  const chars = s.section.length + s.row.length + s.seats.length;
                  const size = seatLines.length > 1 ? "text-[clamp(30px,4.2vw,58px)]" : chars <= 7 ? "text-[clamp(44px,8.6vw,120px)]" : chars <= 11 ? "text-[clamp(36px,6.2vw,84px)]" : "text-[clamp(30px,4.4vw,60px)]";
                  return (
                    <li key={l.key ?? l.title} className="grid gap-3 md:gap-4">
                      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-x-5 sm:gap-x-8">
                        {cells.map(([label, value], i) => (
                          <div key={label} className="min-w-0">
                            <p className="text-sm font-medium opacity-75">{label}</p>
                            <p className={`mt-1.5 truncate ${size} font-medium leading-none tracking-[-0.055em] tabular-nums`}><Roll text={value} delay={0.4 + n * 0.12 + i * 0.1} still={still} /></p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4">
                        {s.venueSlug ? <SeatPeek venueSlug={s.venueSlug} section={s.section} row={s.row} /> : null}
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <b className="text-xl font-medium tabular-nums">{money(l.amount)}</b>
                          <span className="text-sm opacity-75">{l.note}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {plainLines.length > 0 && (
              <ul className="my-auto grid gap-6">
                {plainLines.map((l) => (
                  <li key={l.key ?? l.title} className="grid gap-1.5">
                    <span className="break-words text-[clamp(34px,4.6vw,64px)] font-medium leading-[1.02] tracking-[-0.045em] text-balance">{l.title}</span>
                    <span className="flex items-baseline justify-between gap-4 text-sm opacity-80"><span>{l.note}</span><b className="text-xl font-medium tabular-nums opacity-100">{money(l.amount)}</b></span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto grid gap-2 border-t border-dashed border-current/30 pt-4 md:gap-3 md:pt-5">
              <div className="flex items-baseline justify-between text-sm opacity-80"><span>Taxes &amp; fees</span><span>Included</span></div>
              <div className="flex items-end justify-between gap-4">
                <span className="pb-1.5 text-base font-semibold md:pb-2">Total due</span>
                <Money value={total} className="text-[clamp(40px,5.8vw,88px)] font-medium leading-none tracking-[-0.05em] tabular-nums" />
              </div>
            </div>
          </motion.section>

          {/* the payment: the wallets, a compact card form, and the stub */}
          <motion.section aria-label="Payment" className="flex flex-col gap-3 rounded-[28px] bg-h-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_20px_44px_-20px_color-mix(in_srgb,var(--shade)_40%,transparent)] md:px-6 md:py-5" initial={still ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: EASE }}>
            <h1 className="pg-h1 !text-[clamp(26px,2.6vw,34px)]">Payment</h1>

            {expired && (
              <Alert variant="danger"><AlertIndicator /><AlertContent><AlertTitle>Your seats were released</AlertTitle><AlertDescription>The hold ran out before payment. Nothing was charged. Pick your seats again to start a new hold.</AlertDescription>
                <Button className="mt-2 w-max" onClick={() => (onExpired ?? onBack)()}>Pick seats again</Button></AlertContent></Alert>
            )}

            <div className={`grid gap-2.5 ${apple ? "grid-cols-2" : "grid-cols-1"}`}>
              <ApplePayButton dark={dark} onPress={wallet} onShown={setApple} />
              <LinkButton total={money(total)} email={DEMO_EMAIL} onPaid={wallet} />
            </div>
            <div className="flex items-center gap-3 text-sm text-h-muted before:h-px before:flex-1 before:bg-h-separator after:h-px after:flex-1 after:bg-h-separator">Or pay by card</div>
            <div className="flex flex-col gap-3 md:mt-3">
              <StripeCard amount={total} dark={dark} apiRef={cardApi} onComplete={(done) => { setCardOk(done); if (done) setPayError(null); }} />

              <div ref={notes} className="grid gap-2 empty:hidden">
                {low && !expired && <Note tone="warning">Under a minute left. Your seats are released when the clock runs out.</Note>}
                {payError && <Note tone="danger">{payError}</Note>}
              </div>

            </div>

            <div ref={tear} className="mt-auto pt-1 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-5 max-md:bg-h-surface max-md:px-5 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-10px_16px_-12px_color-mix(in_srgb,var(--shade)_35%,transparent)]">
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
            <p className="text-xs leading-snug text-h-muted">By paying you agree to the Purchase Policy and Terms &amp; Conditions. All prices are all-in. Payments by Stripe, in test mode: nothing is charged. 4242 4242 4242 4242 works; 4000 0000 0000 0002 is declined.</p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

export function DoneView({ title, text, items, againLabel, onAgain, walletHref = "/my-tickets" }: {
  title: string; text: React.ReactNode; items: { key: string; title: string; note: string }[]; againLabel: string; onAgain: () => void; walletHref?: string;
}) {
  const still = !!useReducedMotion();
  useScene();
  return (
    <div role="region" aria-label="Order confirmed" className="fixed inset-0 z-40 overscroll-contain bg-h-background text-h-foreground">
      <div role="status" className="mx-auto flex h-full w-full max-w-[680px] flex-col gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:py-6">
        {/* the order again, paid: the same bold panel, the stamp landing on it. It fills the screen; only the list inside it scrolls, if there is more than fits. */}
        <motion.div className="relative flex min-h-0 flex-1 flex-col items-center gap-4 overflow-hidden rounded-[28px] bg-[var(--t,var(--h-accent))] px-6 pt-8 text-center text-[var(--on-t,var(--h-accent-foreground))] sm:px-10 sm:pt-10" initial={still ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <motion.span
            aria-hidden
            className="absolute right-5 top-5 -rotate-[10deg] rounded-md border-2 border-current px-2.5 py-1 text-sm font-semibold uppercase tracking-[0.16em] sm:right-8 sm:top-8"
            initial={still ? false : { scale: 1.7, opacity: 0, rotate: -22 }} animate={{ scale: 1, opacity: 0.92, rotate: -10 }} transition={{ type: "spring", stiffness: 380, damping: 17, delay: 0.55 }}
          >Paid</motion.span>
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--on-t,var(--h-accent-foreground))] text-[var(--t,var(--h-accent))] sm:size-20"><Check weight="bold" className="size-8 sm:size-9" aria-hidden /></span>
          <h1 className="shrink-0 text-[clamp(34px,5.4vw,56px)] font-medium leading-[1.02] tracking-[-0.045em] text-balance">{title}</h1>
          <p className="max-w-[44ch] shrink-0 text-[15px] leading-relaxed opacity-85 text-pretty sm:text-base">{text}</p>
          <ul className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain pb-8 pt-1 text-left [-webkit-mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] [mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)] [scrollbar-width:none]">
            {items.map((i, n) => (
              <motion.li key={i.key} className="border-t border-dashed border-current/30 py-3" initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 + Math.min(n, 6) * 0.06, ease: EASE }}>
                <p className="break-words text-lg font-medium tracking-[-0.01em]">{i.title}</p>
                <p className="text-sm opacity-75">{i.note}</p>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        {/* the actions stay at the bottom, where a thumb is, and never scroll away */}
        <div className="grid shrink-0 gap-2 sm:grid-cols-2">
          <Button href={walletHref} size="lg" className="w-full">Open my wallet</Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={onAgain}>{againLabel}</Button>
        </div>
      </div>
    </div>
  );
}
