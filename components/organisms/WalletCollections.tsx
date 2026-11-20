"use client";

/**
 * Wallet collections: Packages, Flex packs and Access passes, each a list with an
 * empty state and a detail view. Demo data (lib/walletDemo). Library parts and tokens only.
 */

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { ArrowBendUpRight, ArrowLeft, CaretRight, Check, Package, QrCode, Ticket, PaperPlaneTilt, Lightning, IdentificationCard } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoldButton } from "@/components/ui/hold-button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";
import { SegmentRing } from "@/components/ui/segment-ring";
import { Status } from "@/components/ui/status";
import { ResponsiveDialog } from "@/components/organisms/WalletParts";
import { FlyerSheet, SquareArt } from "@/components/organisms/WalletFlyer";
import { WalletQr } from "@/components/organisms/WalletPass";
import { deckColour } from "@/lib/flex-deck";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ACCESS_PASSES, EVENTS, FLEX_PACKS, PACKAGES, demoLog, imageFor, type WalletFlex, type WalletGame, type WalletPackage, type WalletPassCard, type WalletTone,
} from "@/lib/walletDemo";

export type CollectionKind = "packages" | "flex" | "passes";

const TONE: Record<WalletTone, string> = {
  navy: "bg-[var(--navy)] text-white",
  seat: "bg-seat text-white",
  feature: "bg-feature text-white",
  card: "bg-secondary text-foreground",
};
/* 44px targets on touch screens, the compact size with a mouse */
const TOUCH = "[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11";
const H2 = "text-balance text-[clamp(24px,3vw,34px)] font-semibold leading-[1.1] tracking-[-0.02em]";

const GAME_STATE = {
  upcoming: { label: "Upcoming", color: "warning" },
  attended: { label: "Attended", color: "neutral" },
  transferred: { label: "Transferred", color: "info" },
} as const;

function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return <Button variant="ghost" size="sm" className="self-start" onClick={onClick}><ArrowLeft weight="bold" /> {label}</Button>;
}

function EmptyList({ icon: Icon, title, text }: { icon: typeof Ticket; title: string; text: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon weight="bold" /></EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/* ---------------------------------------------------------------------------------------------
   Packs and passes, one design language: a full-width hero (the pack's picture, or its colour), what is left in big numbers,
   one segmented bar, then what to do next, and the whole season as a rail you can read down. Everything arrives in one
   staggered rise, the bar fills, the number rolls up. Phone first: a single column that reads top to bottom.
   --------------------------------------------------------------------------------------------- */

/* fills the sheet between its own paddings (--sheet-x), so a pack or pass sits on the same lines as the ticket */
const SHEET = "flex w-full flex-col gap-6 pb-[calc(8px+env(safe-area-inset-bottom))]";

/** The page rises as one piece: each block a beat after the last. Still for reduced motion. */
function Rise({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.07 } } }}>
      {children}
    </motion.div>
  );
}
function Beat({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? {} : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } } }}>
      {children}
    </motion.div>
  );
}

/** The top of every pack and pass: its picture full width under a deep gradient (a colour and a big mark when it has none), the season and state as glass chips, the name large. */
function Hero({ img, tone, bg, mark, season, state, title, sub }: { img?: string | null; tone: WalletTone; bg?: string; mark: React.ReactNode; season: string; state: React.ReactNode; title: string; sub: string }) {
  return (
    <div className={cn("relative isolate flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[32px] p-5 text-white sm:min-h-[320px] sm:p-7", !img && !bg && TONE[tone])} style={!img && bg ? { background: bg } : undefined}>
      {img ? <img src={img} alt="" decoding="async" className="absolute inset-0 -z-20 size-full scale-105 object-cover" /> : <span aria-hidden className="absolute -right-6 -top-10 -z-20 text-[220px] font-semibold leading-none tracking-[-0.06em] opacity-[0.14]">{mark}</span>}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-black/35 px-3.5 py-1.5 text-[14px] font-medium backdrop-blur-md">{season}</span>
        <span className="rounded-full bg-black/35 px-3.5 py-1.5 text-[14px] font-medium backdrop-blur-md">{state}</span>
      </div>
      <div>
        <h2 className="text-balance text-[clamp(30px,8vw,42px)] font-semibold leading-[1.02] tracking-[-0.04em]">{title}</h2>
        <p className="mt-2 text-[16px] text-white/80">{sub}</p>
      </div>
    </div>
  );
}

/** What is left: one ring, an arc for each game or credit, and a plain sentence beside it. The arcs are quiet except the next one, which is the
    one green mark in the block (green is for the thing to do next); blue is what you sent on. */
function Standing({ left, of, unit, states, action }: { left: number; of: number; unit: string; states: ("used" | "left" | "sent")[]; label: string; /** a quiet action that belongs to the whole pack, kept with its summary where it is always at the top */ action?: React.ReactNode }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(left), 250); return () => clearTimeout(t); }, [left]);
  const used = states.filter((x) => x === "used").length;
  const sent = states.filter((x) => x === "sent").length;
  const games = unit === "games";
  const detail = [used > 0 && `${used} ${games ? "attended" : "redeemed"}`, sent > 0 && `${sent} sent`].filter(Boolean).join(" · ");
  return (
    <div role="img" aria-label={`${left} of ${of} ${unit} left`} className="flex items-center gap-6">
      <SegmentRing segments={states} size={124}>
        <NumberFlow value={v} className="text-[44px] font-semibold leading-none tracking-[-0.05em] tabular-nums" />
      </SegmentRing>
      <div className="min-w-0 flex-1">
        <p className="text-[24px] font-semibold leading-tight tracking-[-0.03em]">{left === 0 ? `All ${of} used` : `${left} of ${of} ${unit} left`}</p>
        {detail && <p className="mt-1 text-[16px] text-ink2">{detail}</p>}
        {action && <div className="mt-3 sm:hidden">{action}</div>}
      </div>
      {/* on a wider screen it sits at the far right of the row, on a phone under the sentence */}
      {action && <div className="hidden shrink-0 sm:block">{action}</div>}
    </div>
  );
}

/* Team art the season pages already ship (public/teams): an opponent gets its card where there is one, its initials where not. */
const TEAM_CARD: [RegExp, string][] = [
  [/liberty/i, "/teams/liberty-flames-card.png"], [/jacksonville/i, "/teams/jax-state-card.png"], [/delaware/i, "/teams/delaware-blue-hens-card.png"],
  [/mercyhurst/i, "/teams/mercyhurst-card.png"], [/new mexico\b(?! state)|lobos/i, "/teams/new-mexico-lobos-card.png"],
];
const opponentOf = (title: string) => title.replace(/^(vs\.?|at)\s+/i, "");
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** The opponent as a square: their card, or their initials on a soft tile. */
function Opponent({ title, className }: { title: string; className?: string }) {
  const name = opponentOf(title);
  const src = TEAM_CARD.find(([re]) => re.test(name))?.[1];
  return src
    ? <img src={src} alt="" decoding="async" className={cn("shrink-0 rounded-[14px] object-cover", className)} />
    : <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-[14px] bg-secondary text-[14px] font-semibold tracking-[0.04em] text-ink2", className)}>{initialsOf(name)}</span>;
}

/**
 * The flex pack's stage, the one the buy page uses: its deck of vouchers fanned in the pack's colour (the colour read from
 * its name, as there). A redeemed voucher drops out of the fan, so the deck is what you have left. It fans out a little
 * further when you hover or press it.
 */
function DeckHero({ name, blurb, venue, vouchers }: { name: string; blurb: string; venue: string; vouchers: { id: string; redeemed?: string }[] }) {
  const reduce = useReducedMotion();
  const tint = deckColour(blurb, name) ?? { t: "#8c1d40", t2: "#c2415f", on: "#fff" };
  const n = Math.min(Math.max(vouchers.length, 2), 8);
  return (
    <div className="overflow-hidden rounded-[32px] bg-card">
      <motion.div className="relative grid h-[230px] items-end justify-items-center overflow-hidden sm:h-[270px]" initial="rest" animate="rest" whileHover="hover" whileTap="hover"
        style={{ background: `radial-gradient(70% 90% at 50% 105%, ${tint.t}66, transparent 70%), linear-gradient(180deg, ${tint.t}22, transparent)` }}>
        <div className="relative mb-10 h-[150px] w-[104px] sm:mb-12 sm:h-[172px] sm:w-[120px]" aria-hidden>
          {Array.from({ length: n }, (_, k) => {
            const a = (k - (n - 1) / 2) * (n > 5 ? 5.5 : 8);
            const spent = !!vouchers[k]?.redeemed;
            return (
              <motion.i key={k} className="absolute inset-0 rounded-[18px]"
                style={{ transformOrigin: "50% 135%", background: `linear-gradient(170deg, ${tint.t2}, ${tint.t})`, boxShadow: "0 0 0 1px rgba(0,0,0,.22), 0 10px 24px rgba(0,0,0,.28)" }}
                variants={{ rest: { rotate: a, y: spent ? 30 : 0, opacity: spent ? 0.35 : 1 }, hover: { rotate: a * 1.5, y: spent ? 34 : -6, opacity: spent ? 0.35 : 1 } }}
                initial={reduce ? false : { rotate: 0, y: 18, opacity: 0 }} animate={{ rotate: a, y: spent ? 30 : 0, opacity: spent ? 0.35 : 1 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26, delay: k * 0.03 }}>
                <span className="absolute inset-[9px] rounded-[11px] border-[1.5px] border-dashed" style={{ borderColor: `${tint.on}66` }} />
                <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${tint.on}99, inset 0 0 0 11px transparent, inset 0 0 0 17px ${tint.on}99` }} />
              </motion.i>
            );
          })}
        </div>
      </motion.div>
      <div className="p-5 sm:p-7">
        <p className="text-[15px] font-medium text-ink2">Flex pack</p>
        <h2 className="mt-1 text-balance text-[clamp(28px,7vw,38px)] font-semibold leading-[1.04] tracking-[-0.035em]">{name}</h2>
        <p className="mt-2 text-[16px] text-ink2">{blurb} · {venue}</p>
      </div>
    </div>
  );
}

const dayParts = (date: string): [string, string] => {
  const m = date.match(/([A-Za-z]{3})\s+(\d{1,2})$/);
  return m ? [m[1], String(Number(m[2]))] : ["", ""];
};

/** The game that is next: the opponent, when and where you sit, and a compact button. One quiet row that wraps to two on a phone. */
function NextUp({ game, sub, onCode }: { game: WalletGame; sub: string; onCode: () => void }) {
  const [mon, day] = dayParts(game.date);
  return (
    <div className="flex flex-col gap-4 rounded-[28px] bg-card p-4 sm:flex-row sm:items-center sm:pr-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Opponent title={game.title} className="size-14 shrink-0" />
        <div className="min-w-0">
          <p className="text-[14px] text-ink2">Next game · {mon} {day}</p>
          <p className="truncate text-[20px] font-semibold leading-snug tracking-[-0.02em]">{game.title}</p>
          <p className="truncate text-[15px] text-ink2">{game.seat}</p>
        </div>
      </div>
      <Button size="md" className="max-sm:w-full" onClick={onCode}><QrCode weight="bold" /> Show code</Button>
      <p className="sr-only">{sub}</p>
    </div>
  );
}

/** The season as a rail: a node a game, joined by a line that is green as far as you have come. */
function Season({ games, nextId }: { games: WalletGame[]; nextId?: string }) {
  /* the rail is green as far as you have come: up to the next game, or to the end when nothing is left to use */
  const nextAt = games.findIndex((g) => g.id === nextId);
  const reached = nextAt >= 0 ? nextAt : games.length - 1;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">The season</h3>
      <ol className="flex flex-col">
        {games.map((g, i) => {
          const [mon, day] = dayParts(g.date);
          const next = g.id === nextId;
          const done = g.state === "attended";
          const sent = g.state === "transferred";
          const away = /^Away/.test(g.seat);
          return (
            <li key={g.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < games.length - 1 && <span aria-hidden className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full", i < reached ? "bg-foreground/30" : "bg-foreground/12")} />}
              <span aria-hidden className={cn("relative z-10 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full", next ? "bg-primary text-primary-foreground shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-primary)_22%,transparent)]" : done ? "bg-foreground/10 text-ink2" : sent ? "bg-seat text-white" : "bg-secondary shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--color-foreground)_22%,transparent)]")}>
                {done ? <Check weight="bold" className="size-4" /> : sent ? <ArrowBendUpRight weight="bold" className="size-4" /> : next ? <span className="size-2.5 animate-pulse rounded-full bg-primary-foreground motion-reduce:animate-none" /> : null}
              </span>
              <Opponent title={g.title} className={cn("size-11", (done || sent || away) && "opacity-70")} />
              <div className={cn("min-w-0 flex-1", (done || sent || away) && "opacity-75")}>
                <p className="text-[14px] text-ink2">{mon} {day}{next ? <span className="font-medium text-foreground"> · Next up</span> : done ? " · Attended" : sent ? " · Sent to someone" : ""}</p>
                <p className="text-[18px] font-medium leading-snug tracking-[-0.01em]">{g.title}</p>
                <p className="text-[15px] text-ink2">{away ? "Away game, not included" : g.seat}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CodeDialog({ game, sub, code, onClose }: { game: WalletGame | null; sub: string; code: string; onClose: () => void }) {
  return (
    <ResponsiveDialog open={!!game} onOpenChange={(o) => !o && onClose()} align="center" title={game?.title} description={`${game?.date} · ${sub}`}
      footer={<Button variant="secondary" fullWidth onClick={onClose}>Close</Button>}>
      <WalletQr code={code} className="aspect-square w-[min(72vw,260px)]" />
      <span className="text-[14px] tracking-[0.06em] text-ink2">{game?.seat}</span>
    </ResponsiveDialog>
  );
}

const gameStates = (games: WalletGame[]) => games.map((g) => (g.state === "upcoming" ? "left" : g.state === "transferred" ? "sent" : "used") as "left" | "sent" | "used");

/* ---------- Packages ---------- */
export function PackageDetail({ pkg, onBack, onTransfer }: { pkg: WalletPackage; onBack?: () => void; onTransfer?: (name: string) => void }) {
  const left = pkg.games.filter((g) => g.state === "upcoming").length;
  const next = pkg.games.find((g) => g.state === "upcoming");
  const [code, setCode] = useState<WalletGame | null>(null);
  const img = imageFor(pkg.name) ?? imageFor(pkg.venue);
  return (
    <Rise className={SHEET}>
      {onBack && <Beat><Back onClick={onBack} label="All packages" /></Beat>}
      <Beat><Hero img={img} tone={pkg.tone} mark={pkg.initials} season={pkg.season} state={pkg.transferred ? "Transferred" : `${left} left`} title={pkg.name} sub={`${pkg.venue} · ${pkg.games.length} home games`} /></Beat>
      <Beat><Standing left={left} of={pkg.games.length} unit="games" states={gameStates(pkg.games)} label={`${pkg.games.length - left} done, ${left} left, of ${pkg.games.length} games`} action={<Button size="sm" variant="tertiary" disabled={!!pkg.transferred} onClick={() => onTransfer?.(pkg.name)}><PaperPlaneTilt weight="bold" /> Transfer</Button>} /></Beat>
      {!pkg.transferred && next && <Beat><NextUp game={next} sub={pkg.name} onCode={() => setCode(next)} /></Beat>}
      <Beat><Season games={pkg.games} nextId={pkg.transferred ? undefined : next?.id} /></Beat>
      <CodeDialog game={code} sub={pkg.name} code={`BT-PKG-${pkg.id}-${code?.id}`} onClose={() => setCode(null)} />
    </Rise>
  );
}

/* ---------- Flex packs ---------- */

/** A voucher as one row of a list: its number, what it is good for, and the one thing to do with it. Redeemed ones are quiet. Only the next voucher's
    button is green; the others are plain, so the list reads as one thing to do, not four. */
function Voucher({ n, label, redeemed, first, onRedeem }: { n: number; label: string; redeemed?: string; first?: boolean; onRedeem: () => void }) {
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold tabular-nums", redeemed ? "bg-foreground/8 text-ink2" : "bg-secondary")}>{n}</span>
      <div className={cn("min-w-0 flex-1", redeemed && "text-ink2")}>
        <p className="text-[17px] font-medium leading-snug">{label}</p>
        <p className="truncate text-[15px] text-ink2">{redeemed ? `Redeemed · ${redeemed}` : "Good for any home game"}</p>
      </div>
      {redeemed ? <Check weight="bold" aria-label="Redeemed" className="size-5 shrink-0 text-ink2" /> : <Button size="md" variant={first ? "primary" : "secondary"} onClick={onRedeem}>Redeem</Button>}
    </li>
  );
}

export function FlexDetail({ pack, onBack }: { pack: WalletFlex; onBack?: () => void }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [redeem, setRedeem] = useState<string | null>(null);
  const [game, setGame] = useState<string | null>(null);
  const vouchers = pack.vouchers.map((v) => ({ ...v, redeemed: v.redeemed ?? done[v.id] }));
  const games = EVENTS.filter((e) => !e.past && e.venue === pack.venue);
  const used = vouchers.filter((v) => v.redeemed).length;
  const left = vouchers.length - used;
  return (
    <Rise className={SHEET}>
      {onBack && <Beat><Back onClick={onBack} label="All flex packs" /></Beat>}
      <Beat><DeckHero name={pack.name} blurb={pack.blurb} venue={pack.venue} vouchers={vouchers} /></Beat>
      <Beat><Standing left={left} of={vouchers.length} unit="credits" states={vouchers.map((v) => (v.redeemed ? "used" : "left"))} label={`${used} of ${vouchers.length} vouchers redeemed`} /></Beat>
      <Beat>
        <ul className="divide-y divide-border overflow-hidden rounded-[28px] bg-card">
          {vouchers.map((v, i) => <Voucher key={v.id} n={i + 1} label={v.label} redeemed={v.redeemed} first={i === vouchers.findIndex((x) => !x.redeemed)} onRedeem={() => { setRedeem(v.id); setGame(null); }} />)}
        </ul>
      </Beat>
      <ResponsiveDialog open={!!redeem} onOpenChange={(o) => !o && setRedeem(null)} size="md" title="Pick a game" description={`This voucher is good for any home game at ${pack.venue}.`}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setRedeem(null)}>Cancel</Button>
            {/* a redeemed voucher can't be taken back, so it takes a hold */}
            <HoldButton variant="primary" duration={1200} disabled={!game} holdLabel="Keep holding…" onHoldComplete={() => {
              const g = games.find((x) => x.id === game);
              if (!g) return;
              setDone((p) => ({ ...p, [redeem!]: `${g.date} · ${g.title}` }));
              demoLog("flex-redeem", { voucher: redeem, game: g.title });
              setRedeem(null); toast("Voucher redeemed");
            }}>Hold to redeem</HoldButton>
          </>
        }>
        {games.length === 0 && <p className="text-[15px] text-ink2">No home games are on sale to redeem for yet.</p>}
        {games.map((g) => (
          <button key={g.id} type="button" aria-pressed={game === g.id} onClick={() => setGame(g.id)}
            className={cn("flex min-h-14 w-full items-center justify-between gap-3 rounded-[16px] p-4 text-left outline-none transition-[background-color,box-shadow,transform] duration-150 ease-[var(--e-out)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]", game === g.id ? "bg-primary/10 shadow-[inset_0_0_0_2px_var(--color-primary)]" : "bg-secondary/50 hover:bg-secondary")}>
            <span className="min-w-0"><span className="block text-[16px] font-medium">{g.title}</span><span className="block text-[14px] text-ink2">{g.date} · {g.time}</span></span>
          </button>
        ))}
      </ResponsiveDialog>
    </Rise>
  );
}

/* ---------- Access passes ---------- */

/** The pass as a credential: its own colour and picture, the name, the code on a white plate (a scanner needs the light ground), tap to enlarge. A sheen crosses it once. */
function PassCredential({ pass, onEnlarge, live }: { pass: WalletPassCard; onEnlarge: () => void; live: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative isolate overflow-hidden rounded-[32px] p-5 sm:p-7" style={{ background: pass.bg, color: pass.fg }}>
      {pass.cover && <img src={pass.cover} alt="" decoding="async" className="absolute inset-0 -z-10 size-full object-cover opacity-35" />}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/15 to-black/60" />
      {!reduce && <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" initial={{ x: "-120%" }} animate={{ x: "520%" }} transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.5 }} />}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium opacity-80">{pass.season}</p>
          <h2 className="mt-1 text-balance text-[clamp(26px,7vw,34px)] font-semibold leading-[1.05] tracking-[-0.035em]">{pass.name}</h2>
        </div>
        <IdentificationCard weight="bold" className="size-7 shrink-0 opacity-80" />
      </div>
      <button type="button" disabled={!live} onClick={onEnlarge} aria-label="Enlarge the pass code"
        className={cn("mx-auto mt-6 block rounded-[22px] outline-none transition-transform duration-200 ease-[var(--e-out)] focus-visible:ring-2 focus-visible:ring-white", live ? "active:scale-[0.97]" : "opacity-40")}>
        <WalletQr code={pass.code} sweep={live} className="aspect-square w-[min(58vw,220px)] rounded-[22px] p-3" />
      </button>
      <p className="mt-4 text-center font-mono text-[14px] tracking-[0.12em] opacity-80">{pass.code}</p>
    </div>
  );
}

export function PassDetail({ pass, onBack, onTransfer }: { pass: WalletPassCard; onBack?: () => void; onTransfer?: (name: string) => void }) {
  const left = pass.games.filter((g) => g.state === "upcoming").length;
  const active = pass.status === "active";
  const next = pass.games.find((g) => g.state === "upcoming");
  const [code, setCode] = useState(false);
  return (
    <Rise className={SHEET}>
      {onBack && <Beat><Back onClick={onBack} label="All access passes" /></Beat>}
      <Beat><PassCredential pass={pass} live={active} onEnlarge={() => setCode(true)} /></Beat>
      <Beat><Standing left={left} of={pass.games.length} unit="games" states={gameStates(pass.games)} label={`${pass.games.length - left} done, ${left} left, of ${pass.games.length} games`} action={active ? <Button size="sm" variant="tertiary" onClick={() => onTransfer?.(pass.name)}><PaperPlaneTilt weight="bold" /> Transfer</Button> : undefined} /></Beat>
      <Beat><Season games={pass.games} nextId={active ? next?.id : undefined} /></Beat>
      <ResponsiveDialog open={code} onOpenChange={setCode} align="center" title={pass.name} description={pass.season}
        footer={<Button variant="secondary" fullWidth onClick={() => setCode(false)}>Close</Button>}>
        <WalletQr code={pass.code} className="aspect-square w-[min(72vw,260px)]" />
        <span className="text-[14px] tracking-[0.06em] text-ink2">{pass.code}</span>
      </ResponsiveDialog>
    </Rise>
  );
}

function PassFace({ pass, className }: { pass: WalletPassCard; className?: string }) {
  return (
    <div className={cn("relative flex flex-col justify-between gap-8 overflow-hidden rounded-[24px] p-6", className)} style={{ background: pass.bg, color: pass.fg }}>
      {pass.cover && <img src={pass.cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-60" />}
      <div className="relative flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium uppercase tracking-[0.08em] opacity-80">{pass.season}</span>
        <IdentificationCard weight="bold" className="size-6 opacity-80" />
      </div>
      <div className="relative">
        <div className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{pass.name}</div>
        <div className="mt-1 text-[13px] opacity-80">{pass.games.length} games included</div>
      </div>
    </div>
  );
}

/* ---------- Lists ---------- */
export default function WalletCollections({ kind }: { kind: CollectionKind }) {
  const [open, setOpen] = useState<string | null>(null);
  const close = () => setOpen(null);

  if (kind === "packages") {
    if (!PACKAGES.length) return <EmptyList icon={Package} title="No packages yet" text="Season packages you buy will show up here." />;
    const pkg = PACKAGES.find((p) => p.id === open);
    if (pkg) return <PackageDetail pkg={pkg} onBack={close} />;
    return (
      <ItemGroup className="max-w-[720px] gap-3">
        {PACKAGES.map((p) => (
          <Item key={p.id} asChild variant="muted" className="rounded-[20px] p-4">
            <button type="button" onClick={() => setOpen(p.id)} className="text-left">
              <ItemMedia><span aria-hidden className={cn("flex size-12 items-center justify-center rounded-[12px] text-[15px] font-semibold", TONE[p.tone])}>{p.initials}</span></ItemMedia>
              <ItemContent>
                <ItemTitle className="text-[17px]">{p.name}</ItemTitle>
                <ItemDescription>{p.games.length} games · {p.venue}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {p.transferred ? <Status color="info">Transferred</Status> : null}
                <CaretRight weight="bold" className="size-4 text-mute" />
              </ItemActions>
            </button>
          </Item>
        ))}
      </ItemGroup>
    );
  }

  if (kind === "flex") {
    if (!FLEX_PACKS.length) return <EmptyList icon={Lightning} title="No flex packs yet" text="Flex packs you buy will show up here." />;
    const pack = FLEX_PACKS.find((p) => p.id === open);
    if (pack) return <FlexDetail pack={pack} onBack={close} />;
    return (
      <ItemGroup className="max-w-[720px] gap-3">
        {FLEX_PACKS.map((p) => {
          const left = p.vouchers.filter((v) => !v.redeemed).length;
          return (
            <Item key={p.id} asChild variant="muted" className="rounded-[20px] p-4">
              <button type="button" onClick={() => setOpen(p.id)} className="text-left">
                <ItemMedia><span aria-hidden className="flex size-12 items-center justify-center rounded-[12px] bg-secondary"><Lightning weight="bold" className="size-5" /></span></ItemMedia>
                <ItemContent>
                  <ItemTitle className="text-[17px]">{p.name}</ItemTitle>
                  <ItemDescription>{p.blurb}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Status color={left ? "success" : "neutral"}>{left ? `${left} left` : "Used up"}</Status>
                  <CaretRight weight="bold" className="size-4 text-mute" />
                </ItemActions>
              </button>
            </Item>
          );
        })}
      </ItemGroup>
    );
  }

  if (!ACCESS_PASSES.length) return <EmptyList icon={IdentificationCard} title="No access passes yet" text="Access passes you buy will show up here." />;
  const pass = ACCESS_PASSES.find((p) => p.id === open);
  if (pass) return <PassDetail pass={pass} onBack={close} />;
  return (
    <div className="grid max-w-[720px] gap-4 sm:grid-cols-2">
      {ACCESS_PASSES.map((p) => (
        <button key={p.id} type="button" onClick={() => setOpen(p.id)} className="flex flex-col gap-3 text-left">
          <PassFace pass={p} className="min-h-[160px] w-full" />
          <div className="flex items-center justify-between px-1">
            <Status color={p.status === "active" ? "success" : "info"}>{p.status === "active" ? "Active" : "Transferred"}</Status>
            <CaretRight weight="bold" className="size-4 text-mute" />
          </div>
        </button>
      ))}
    </div>
  );
}
