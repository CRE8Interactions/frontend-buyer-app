"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { Armchair, ArrowRight, MapPin, Minus, NavigationArrow, Plus, Scissors, Ticket } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import useSeatmapStore from "@/stores/seatmapStore";
import { DoneView, money } from "@/app/[slug]/Checkout";
import { CheckoutView } from "@/app/[slug]/CheckoutSwitch";
import SeasonScene from "@/app/[slug]/SeasonScene";
import { groupSeats, useSeasonSeats } from "@/app/[slug]/SeasonSeatmap";
import type { Team } from "@/app/[slug]/teams";
import type { EventInfo } from "./event";
import Night from "./Night";
import { useNow } from "./useNow";
import Surface from "./Surface";

/* One game, one door. The page opens on a stage (the matchup, the countdown to the start, the sport's playing surface drawn under it) and one ticket
   you fill in: how many are going, and what a seat costs. The button on the stub opens the real seat map across the whole screen, then checkout and
   the confirmation, the same three screens the season seats use. The page is rendered on the server, so there is no loader in front of it. */

const HOLD_SECONDS = 600;
const MAX_PARTY = 8;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Countdown({ info, live: ticking }: { info: EventInfo; live: boolean }) {
  const now = useNow(ticking);
  const start = +new Date(info.startISO);
  const left = now === null ? null : start - now;
  const live = left !== null && left <= 0;
  const t = Math.max(0, left ?? 0);
  const d = Math.floor(t / 864e5), h = Math.floor(t / 36e5) % 24, m = Math.floor(t / 6e4) % 60, s = Math.floor(t / 1e3) % 60;
  const cells: [number, string][] = [...(d > 0 ? ([[d, d === 1 ? "day" : "days"]] as [number, string][]) : []), [h, "hrs"], [m, "min"], [s, "sec"]];
  const since = live && now !== null ? Math.floor((now - start) / 6e4) : 0;
  return (
    <div className="ev-cd" role="timer" aria-label={live ? `${info.verb} has passed` : `${info.verb} in ${d} days ${h} hours ${m} minutes`}>
      <p className="ev-cd-l"><b>{live ? "Underway" : `${info.verb} in`}</b>{live ? (since < 300 ? `Started ${since < 1 ? "just now" : `${since} min ago`}` : "The game has started") : info.doors ? `Doors ${info.doors}` : info.time}</p>
      {live ? null : (
        <div className="ev-cd-t" aria-hidden>
          {cells.map(([v, l]) => (
            <span key={l}><b><NumberFlow value={v} format={{ minimumIntegerDigits: 2 }} trend={-1} /></b>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceLadder({ prices }: { prices: number[] }) {
  if (!prices.length) return null;
  const lo = prices[0], hi = prices[prices.length - 1];
  const range = hi - lo || 1;
  const fmt = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  return (
    <div className="ev-lad">
      <p className="ev-lad-h"><span>{prices.length > 1 ? "Price levels" : "Price"}</span><b>{prices.length > 1 ? `${fmt(lo)} – ${fmt(hi)}` : fmt(lo)}</b></p>
      {prices.length > 1 ? (
        <ol aria-label="Price levels">
          {prices.slice(0, 6).map((p, i) => (
            <li key={p} style={{ ["--h" as string]: `${10 + ((p - lo) / range) * 34}px`, ["--k" as string]: (p - lo) / range, ["--i" as string]: i } as React.CSSProperties}><span aria-hidden />{fmt(p)}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function TicketCard({ info, team, party, setParty, max, onChoose, onWarm, still, stubRef }: {
  stubRef: React.Ref<HTMLDivElement>; info: EventInfo; team: Team; party: number; setParty: (n: number) => void; max: number; onChoose: (e: React.MouseEvent) => void; onWarm: () => void; still: boolean;
}) {
  const from = info.prices[0];
  const ghosts = Math.min(party - 1, 4);
  const seatCount = Math.min(max, MAX_PARTY);
  return (
    <div className="ev-tkw">
      <AnimatePresence initial={false}>
        {Array.from({ length: ghosts }, (_, i) => i + 1).map((k) => (
          <motion.div key={k} aria-hidden className="ev-ghost" style={{ zIndex: -k }}
            initial={still ? false : { opacity: 0, y: 0, scale: 1, rotate: 0 }}
            animate={{ opacity: 1, y: -k * 9, scale: 1 - k * 0.028, rotate: (k % 2 ? 1 : -1) * k * 1.3 }}
            exit={{ opacity: 0, y: 0, scale: 1, rotate: 0, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }} />
        ))}
      </AnimatePresence>
      <section className="ev-tk" aria-label="Your tickets">
        <div className="ev-tk-top">
          <p className="ev-adm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.crest} alt="" />
            <span>Admit<small>{info.sport === "Other" ? "Reserved seats" : `${info.sport} · reserved seats`}</small></span>
          </p>
          <span className="ev-kind"><Ticket weight="bold" aria-hidden />{info.date}</span>
        </div>

        <div className="ev-party">
          <p id="ev-party-l">How many are going?</p>
          <div className="ev-n" role="group" aria-labelledby="ev-party-l">
            <Button variant="secondary" size="lg" iconOnly aria-label="One fewer ticket" disabled={party <= 1} onClick={() => setParty(party - 1)}><Minus weight="bold" aria-hidden /></Button>
            <b className="ev-big" aria-live="polite" aria-label={plural(party, "ticket")}><NumberFlow value={party} /></b>
            <Button variant="secondary" size="lg" iconOnly aria-label="One more ticket" disabled={party >= max} onClick={() => setParty(party + 1)}><Plus weight="bold" aria-hidden /></Button>
          </div>
        </div>
        <div className="ev-seats" aria-hidden>
          {Array.from({ length: seatCount }, (_, i) => <i key={i} data-on={i < party ? "1" : "0"} style={{ transitionDelay: still ? undefined : `${i < party ? i * 28 : 0}ms` }} />)}
        </div>

        <PriceLadder prices={info.prices} />

        <div className="ev-perf" aria-hidden><Scissors weight="bold" /></div>
        <div className="ev-stub" ref={stubRef}>
          <p className="ev-stub-p">
            <small>{from ? `${plural(party, "ticket")} from` : plural(party, "ticket")}</small>
            {from ? <b><NumberFlow value={from * party} locales="en-US" format={{ style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(from * party) ? 0 : 2 }} /></b> : <b>Pick on the map</b>}
          </p>
          <Button size="lg" disabled={info.soldOut} onClick={onChoose} onPointerEnter={onWarm} onFocus={onWarm}>
            <Armchair weight="bold" aria-hidden />{info.soldOut ? "Sold out" : "Choose seats"}{info.soldOut ? null : <ArrowRight weight="bold" aria-hidden />}
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function EventStudio({ info, team }: { info: EventInfo; team: Team }) {
  const [screen, setScreen] = useState<"pick" | "seats" | "checkout" | "done">("pick");
  const [party, setParty] = useState(Math.min(2, Math.min(info.limit, MAX_PARTY)));
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [warm, setWarm] = useState(false);
  const still = !!useReducedMotion();
  const max = Math.max(1, Math.min(info.limit, MAX_PARTY));

  const seats = useSeatmapStore((s) => s.selectedFromMap);
  const total = useSeatmapStore((s) => s.totalPrice);
  const resetSelection = useSeatmapStore((s) => s.resetMapSelection);
  const ref = useMemo(() => ({ slug: info.slug, code: info.code }), [info.slug, info.code]);

  /* the seat map is big, so it starts coming down once the buyer is near the button (pointer or focus), or after a short wait, and always once the seat screen is open */
  useEffect(() => { const t = window.setTimeout(() => setWarm(true), 2500); return () => window.clearTimeout(t); }, []);
  const { phase, levels } = useSeasonSeats({ event: ref, title: info.name, venue: info.venue.name, maxSeats: max, enabled: warm || screen === "seats" });

  const openSeats = (e?: React.MouseEvent) => {
    const r = e?.currentTarget.getBoundingClientRect();
    setOrigin(r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight - 60) });
    setScreen("seats");
  };

  /* pointer position on the stage, eased every frame toward the pointer (or back to rest), so the crests, the surface and the ticket glide */
  /* the sticky bar (phones) shows only when the ticket's own button is out of sight */
  const stub = useRef<HTMLDivElement>(null);
  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const el = stub.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setBarOn(!e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [screen]);
  const stage = useRef<HTMLElement>(null);
  const aim = useRef({ mx: 0, my: 0, c: 0 });
  const cur = useRef({ mx: 0, my: 0, c: 0 });
  const raf = useRef(0);
  const glide = () => {
    const el = stage.current;
    if (!el) { raf.current = 0; return; }
    const a = aim.current, n = cur.current;
    let moving = false;
    for (const k of ["mx", "my", "c"] as const) {
      n[k] += (a[k] - n[k]) * 0.09;
      if (Math.abs(a[k] - n[k]) > 0.001) moving = true; else n[k] = a[k];
      el.style.setProperty(`--${k}`, n[k].toFixed(4));
    }
    raf.current = moving ? requestAnimationFrame(glide) : 0;
  };
  const steer = (mx: number, my: number, c: number) => { aim.current = { mx, my, c }; if (!raf.current) raf.current = requestAnimationFrame(glide); };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const parallax = (e: React.PointerEvent<HTMLElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    steer(x * 2 - 1, y * 2 - 1, Math.max(0, 1 - Math.abs(x - 0.4) * 2.4));
  };

  const from = info.prices[0];
  const barPrice = from ? money(from * party) : "";
  const whenLine = `${info.day}, ${info.date} · ${info.time}`;
  const solo = !info.away.name;
  const k = info.name.length > 40 ? 0.66 : info.name.length > 28 ? 0.82 : 1;
  const maps = `https://maps.google.com/?q=${encodeURIComponent(info.venue.maps)}`;

  if (screen === "done") {
    return <DoneView title="You're going" againLabel="Back to the game" onAgain={() => { setScreen("pick"); resetSelection(); }}
      text={<>{plural(seats.length, "seat")} for {info.name}, now in your wallet. Doors open {info.doors ?? info.time} at {info.venue.name}.</>}
      items={groupSeats(seats).map((g) => ({ key: g.key, title: `Sec ${g.section} · Row ${g.row}`, note: `Seats ${g.seats} · ${info.date}, ${info.time}` }))} />;
  }
  if (screen === "checkout") {
    return <CheckoutView onBack={() => setScreen("seats")} onExpired={() => { resetSelection(); setScreen("pick"); }} holdSeconds={HOLD_SECONDS} productTitle={info.name} productNote={`${info.date} · ${info.venue.name}`} logo={team.logo}
      intro="Complete your purchase to lock in your seats." total={total} onPaid={() => setScreen("done")}
      lines={groupSeats(seats).map((g) => ({ key: g.key, seat: { section: g.section, row: g.row, seats: g.seats, count: g.count, venueSlug: info.venue.slug }, title: `Sec ${g.section} · Row ${g.row}`, note: `${plural(g.count, "seat")} × ${money(g.price)}`, amount: g.price * g.count }))} />;
  }

  return (
    <div className="ev">
      <div inert={screen === "seats"} aria-hidden={screen === "seats" || undefined}>
        <div className="ev-wrap">
          <section ref={stage} className="tm-hero ev-stage" aria-label={info.name} onPointerDown={parallax} onPointerMove={parallax} onPointerUp={(e) => { if (e.pointerType !== "mouse") steer(0, 0, 0); }} onPointerCancel={() => steer(0, 0, 0)} onPointerLeave={() => steer(0, 0, 0)}>
            <div className="tm-bg" aria-hidden>
              <span className="tm-a" />
              <span className="tm-b" data-on="1" style={{ ["--o" as string]: info.away.color ?? "var(--ink2)" }} />
              <span className="tm-slash" />
              <span className="tm-scrim" />
              <span className="tm-grain" />
            </div>
            <Surface sport={info.sport} />

            <div className="ev-in">
              <div className="ev-copy">
                <div className={`ev-sides${solo ? " ev-solo" : ""}`} aria-hidden>
                  <span className="ev-cr ev-home">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {info.home.art ? <img src={info.home.art} alt="" /> : <span className="tm-mono" style={{ ["--o" as string]: "var(--t)" } as React.CSSProperties}><b>{info.home.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</b></span>}
                  </span>
                  {solo ? null : (
                    <>
                      <span className="tm-vs">vs</span>
                      <span className="ev-cr ev-away">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {info.away.art ? <img src={info.away.art} alt="" /> : <span className="tm-mono" style={{ ["--o" as string]: info.away.color ?? "var(--ink2)" } as React.CSSProperties}><b>{info.away.mono}</b></span>}
                      </span>
                    </>
                  )}
                </div>

                <p className="tm-eyebrow">{info.sport === "Other" ? info.org.name : info.sport}<i aria-hidden />{info.org.name}</p>
                <h1 className="tm-hl" aria-label={info.name} style={{ ["--k" as string]: k, ["--mw" as string]: k < 1 ? "20ch" : "13ch" } as React.CSSProperties}>
                  {info.name.split(" ").map((w, i) => <span className="tm-w" key={i} aria-hidden><span style={{ animationDelay: `${0.08 + i * 0.07}s` }}>{w}</span></span>)}
                </h1>
                <p className="ev-meta"><span>{whenLine}</span><i aria-hidden /><span className="ev-meta-venue inline-flex items-center gap-1"><MapPin weight="bold" aria-hidden />{info.venue.name}</span></p>
                <Countdown info={info} live={screen === "pick"} />
              </div>

              <TicketCard info={info} team={team} party={party} setParty={setParty} max={max} onChoose={openSeats} onWarm={() => setWarm(true)} still={still} stubRef={stub} />
            </div>
          </section>
        </div>

        <div className="n-wrap ev-day">
          <Night info={info} live={screen === "pick"} />
        </div>

        <div className="pg-bar glass glass-float" data-show={barOn ? "1" : "0"} aria-hidden={!barOn || undefined} inert={!barOn}>
          <div><b>{from ? <>From {barPrice}</> : "Pick your seats"}</b><small>{plural(party, "ticket")}{from ? (info.fees ? " · fees included" : " · fees at checkout") : ""}</small></div>
          <Button size="lg" className="!h-11 !text-[15px]" disabled={info.soldOut} onClick={openSeats} onPointerEnter={() => setWarm(true)}><Armchair weight="bold" aria-hidden />{info.soldOut ? "Sold out" : "Choose seats"}</Button>
        </div>
      </div>

      <AnimatePresence>
        {screen === "seats" && (
          <SeasonScene key="scene" team={team} games={[]} n={1} phase={phase} levels={levels} maxSeats={max} origin={origin} venueName={info.venue.name}
            startParty={party} onBack={() => setScreen("pick")} onPay={() => setScreen("checkout")}
            eventMode={{
              title: info.name, backLabel: "Back to the game", detailsTitle: info.name, detailsText: `${info.day}, ${info.date} · ${info.time}`,
              details: (
                <div className="grid gap-5 text-[15px]">
                  <div className="grid gap-1"><p className="text-h-muted">When</p><p className="font-semibold">{info.day}, {info.date} · {info.time}</p>{info.doors ? <p className="text-h-muted">Doors open {info.doors}</p> : null}</div>
                  <div className="grid gap-1"><p className="text-h-muted">Where</p><p className="font-semibold">{info.venue.name}</p><p className="text-h-muted">{info.venue.address || info.venue.line}</p></div>
                  {info.summary ? <p className="text-h-muted">{info.summary}</p> : null}
                  <Button href={maps} target="_blank" rel="noopener noreferrer" variant="secondary" className="w-fit"><NavigationArrow weight="bold" aria-hidden />Get directions</Button>
                </div>
              ),
            }} />
        )}
      </AnimatePresence>
    </div>
  );
}

