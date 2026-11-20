"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Armchair, ArrowLeft, ArrowRight, ArrowsLeftRight, MapPin, Wallet } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import useSeatmapStore from "@/stores/seatmapStore";
import { DoneView, money } from "./Checkout";
import { CheckoutView } from "./CheckoutSwitch";
import { GamesList, gamesOf } from "./SeasonGames";
import { EASE, Words } from "./SeasonMotion";
import SeasonScene from "./SeasonScene";
import { groupSeats, useSeasonSeats, type SeasonEventRef } from "./SeasonSeatmap";
import { venueSlug, type Team } from "./teams";

/* Season seats, as three pages of one pager: the season (the team, what a seat is, every home game as a strip, the games), the seats (the real stadium map
   across the whole screen, with everything else floating over it) and pay. The map is about 10 MB, so it starts loading when you near the button that opens it.
   The team, its games and the seat map come from the API. What the API does not have yet is a season package, so a seat is priced as the seated game's
   seat price times the games it carries over to, and checkout and the confirmation are still the demo. */

const MAX_SEATS = 8;
const HOLD_SECONDS = 600;

export default function SeasonStudio({ team }: { team: Team }) {
  const [screen, setScreen] = useState<"pick" | "seats" | "checkout" | "done">("pick");
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [warm, setWarm] = useState(false);
  const [q, setQ] = useState("");
  const still = useReducedMotion();

  const seats = useSeatmapStore((s) => s.selectedFromMap);
  const totalPerGame = useSeatmapStore((s) => s.totalPrice);
  const resetSelection = useSeatmapStore((s) => s.resetMapSelection);

  const GAMES = useMemo(() => gamesOf(team), [team]);

  /* the seated game whose map and seats the page reads: the first football game with an event page */
  const game = team.events.find((e) => e.sport === "Football" && /\/e\/[^/]+\/[^/]+/.test(e.href));
  const ref: SeasonEventRef | null = useMemo(() => { const m = game ? /\/e\/([^/]+)\/([^/]+)/.exec(game.href) : null; return m ? { slug: m[1], code: m[2] } : null; }, [game]);
  const venueName = game?.venue ?? "Aggie Memorial Stadium";
  const venueArt = team.venueInfo?.[venueName]?.art ?? team.venueInfo?.[venueName]?.profile ?? team.venueInfo?.[venueName]?.banner;
  const from = game?.p ? money(game.p) : null;
  const n = Math.max(GAMES.length, 1);
  const total = totalPerGame * n;

  /* the map starts loading when the button is near (pointer or focus) or after a short wait, and always once the seat page is open */
  useEffect(() => { const t = window.setTimeout(() => setWarm(true), 2500); return () => window.clearTimeout(t); }, []);
  const { phase, levels } = useSeasonSeats({ event: ref, title: game?.title ?? "Aggie Football", venue: venueName, maxSeats: MAX_SEATS, enabled: warm || screen === "seats" });

  const openSeats = (e?: React.MouseEvent) => {
    const r = e?.currentTarget.getBoundingClientRect();
    setOrigin(r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight - 60) });
    setScreen("seats");
  };

  if (screen === "done") {
    return <DoneView title="You're in for the season" againLabel="Back to the seats" onAgain={() => { setScreen("pick"); resetSelection(); }}
      text={<>{seats.length} {seats.length === 1 ? "seat" : "seats"} for {GAMES.length === 1 ? "the" : "all"} {GAMES.length} home {GAMES.length === 1 ? "game" : "games"}, now in your wallet. Confirmation sent to <strong className="font-semibold">jordan.reyes@gmail.com</strong>.</>}
      items={groupSeats(seats).map((g) => ({ key: g.key, title: `Sec ${g.section} · Row ${g.row}`, note: `Seats ${g.seats} · ${GAMES.length} ${GAMES.length === 1 ? "game" : "games"}` }))} />;
  }
  if (screen === "checkout") {
    return <CheckoutView onBack={() => setScreen("seats")} onExpired={() => { resetSelection(); setScreen("pick"); }} holdSeconds={HOLD_SECONDS} productTitle="Aggie Football Season Seats" productNote={`${GAMES.length} home ${GAMES.length === 1 ? "game" : "games"}`} logo={team.logo}
      intro="Complete your purchase to lock in your season seats." total={total} onPaid={() => setScreen("done")}
      lines={groupSeats(seats).map((g) => ({ key: g.key, seat: { section: g.section, row: g.row, seats: g.seats, count: g.count, venueSlug: venueSlug(venueName) }, title: `Sec ${g.section} · Row ${g.row}`, note: `${g.count} ${g.count === 1 ? "seat" : "seats"} × ${n} ${n === 1 ? "game" : "games"} × ${money(g.price)}`, amount: g.price * g.count * n }))} />;
  }

  return (
    <>
      <div className="n-wrap pg-page has-bar" inert={screen === "seats"} aria-hidden={screen === "seats" || undefined}>
        {/* left: what a season seat is and the way in (below 960px the way in is the bottom bar, so the button here is hidden then); right: every home game, searchable */}
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-12">
          <header className="grid gap-5 md:sticky md:top-28">
            <Button href="/nm-state" variant="ghost" size="sm" className="-ml-3 w-fit max-md:h-11"><ArrowLeft weight="bold" aria-hidden />{team.name}</Button>
            <motion.div className="hidden w-[clamp(120px,11vw,156px)] -rotate-3 origin-left overflow-hidden rounded-[26px] shadow-[0_24px_44px_-14px_color-mix(in_srgb,var(--shade)_55%,transparent)] md:block" initial={still ? false : { opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 460, damping: 36, delay: 0.3 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.crest} alt="" className="block h-auto w-full" />
            </motion.div>
            <h1 className="text-[clamp(32px,5.2vw,68px)] font-semibold leading-[0.98] tracking-[-0.035em]">
              <Words text="Aggie Football Season Seats" />
            </h1>
            <motion.p className="max-w-[34ch] text-[clamp(16px,1.6vw,21px)] leading-snug text-h-muted" initial={still ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}>
              One seat. Every home game. Transfer any game from your wallet.
            </motion.p>
            <motion.div className="grid gap-4" initial={still ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4 max-[959px]:hidden">
                <div className="grid leading-tight">
                  <span className="text-[15px] text-h-muted">Season seat from</span>
                  <span className="text-[34px] font-semibold tracking-[-0.03em] tabular-nums">{from ? money(game!.p * n) : "—"}</span>
                  <span className="text-[14px] text-h-muted tabular-nums">{from && n > 1 ? `${from} × ${n} home games · fees at checkout` : "Fees added at checkout"}</span>
                </div>
                <Button size="lg" className="max-[959px]:!hidden" onClick={openSeats} onPointerEnter={() => setWarm(true)} onFocus={() => setWarm(true)}><Armchair weight="bold" aria-hidden />Pick your seats<ArrowRight weight="bold" aria-hidden /></Button>
              </div>
              <span className="flex items-center gap-1.5 text-[15px] text-h-muted"><MapPin weight="bold" aria-hidden />{venueName}</span>
            </motion.div>
          </header>

          <section id="games" data-chapter="Games included" aria-labelledby="pg-g" className="rounded-[28px] bg-[var(--paper2)] p-4 md:p-6">
            <h2 className="pg-h2" id="pg-g">Every seat includes<small>{GAMES.length} {GAMES.length === 1 ? "game" : "games"}</small></h2>
            <GamesList games={GAMES} q={q} onQuery={setQ} total={GAMES.length} />
          </section>
        </div>

        <div className="pg-bar glass glass-float">
          <div><b>{seats.length ? money(total) : game?.p ? `From ${money(game.p * n)}` : "Season seats"}</b><small>{seats.length ? (seats.length === 1 ? "1 season seat" : `${seats.length} season seats`) : from && n > 1 ? `${from} × ${n} home games · fees at checkout` : "Fees added at checkout"}</small></div>
          <Button size="lg" className="!h-11 !text-[15px]" onClick={openSeats}><Wallet weight="bold" aria-hidden />{seats.length ? "Change seats" : "Pick seats"}</Button>
        </div>
      </div>

      <AnimatePresence>
        {screen === "seats" && (
          <SeasonScene key="scene" team={team} games={GAMES} n={n} phase={phase} levels={levels} maxSeats={MAX_SEATS} origin={origin} venueName={venueName} venueArt={venueArt}
            onBack={() => setScreen("pick")} onPay={() => setScreen("checkout")} />
        )}
      </AnimatePresence>
    </>
  );
}
