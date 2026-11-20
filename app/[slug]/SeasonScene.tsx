"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CaretDown, CaretUp, HandTap, Info, ListBullets, MapPin, Minus, Plus, Sparkle, SlidersHorizontal, Wheelchair, X } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { InteractiveSeatmap } from "@/components/organisms/InteractiveSeatmap";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThinkingOrb } from "thinking-orbs";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";
import { money } from "./Checkout";
import { GamesList, type Game } from "./SeasonGames";
import { EASE, Money } from "./SeasonMotion";
import { accessibleSectionIds, applyAvailability, groupSeats, hasAccessible, pickTogether, type PriceRange } from "./SeasonSeatmap";
import type { Team } from "./teams";

/* The seat page. The map is the whole page, edge to edge. Everything you can do floats above it and stays out of the way, the way a desktop keeps its notifications and its dock:
   a dock at the bottom holds the commands (how many tickets, the price, find seats for me, the total and the way on), a small card above it says what to do, and every place you pick
   slides in from the right as its own card you can swipe away. The only team colour is the primary button and the seats you pick. A place is always written Sec, Row, Seat. */

const SPRING = { type: "spring", stiffness: 460, damping: 36 } as const;
const SOFT = { type: "spring", stiffness: 300, damping: 28 } as const;
/* frosted glass: the site's own recipe (globals.css): bars and tips are glass-float, cards that hold text are glass-panel. It carries its own rim and shadow. */
const GLASS = "glass glass-float";
const GLASS_CARD = "glass glass-panel";
/* on glass the stepper's round buttons are a light veil instead of the dark surface fill, and their icons are the full foreground colour (token overrides, so the library part is untouched) */
/* the words for what a seat costs: a season seat is priced "a game"; the single-event page (eventMode) prices "a seat" */
const Wording = createContext({ one: "a game", many: "a game each", price: "Price a game" });
/* a divider like the one between tabs: a hairline, half the height, in the current colour at 15% */
function Sep() { return <motion.span layout="position" transition={SPRING} aria-hidden className="mx-1 hidden h-5 w-px shrink-0 rounded-[8px] bg-current opacity-15 md:block" />; }

type Cmd = {
  n: number; maxSeats: number; ready: boolean; party: number; setParty: (v: number) => void;
  min: number; max: number; value: [number, number]; setValue: (v: [number, number]) => void;
  access: boolean; setAccess: (v: boolean) => void; hasAccess: boolean;
  note: string; find: () => void; onPay: () => void;
  /** the single-event page: the dock holds the ticket count (a stepper) and a button that finds the best seats together for it */
  stepper?: boolean;
};

/** small labels over the values, in one row: Sec, Row, Seat(s) */
function Place({ section, row, seats, count }: { section: string; row: string; seats: string; count: number }) {
  const cells: [string, string, string][] = [["Sec", section, "shrink-0 max-w-20"], ["Row", row, "shrink-0"], [count === 1 ? "Seat" : "Seats", seats, "min-w-0 flex-1"]];
  return (
    <div className="flex min-w-0 items-start gap-5">
      {cells.map(([label, value, cls]) => (
        <div key={label} className={`min-w-0 ${cls}`}>
          <p className="text-xs font-semibold uppercase leading-none tracking-[0.06em]">{label}</p>
          <p className="mt-1.5 truncate text-[17px] font-semibold leading-none tracking-[-0.01em] tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

type Group = ReturnType<typeof groupSeats>[number];

/** one picked place, a frosted glass card in the dock's list of your seats: the place in the pass style (small labels over large numerals), what it costs, or take it off */
function SeatRow({ g, still, onDrop }: { g: Group; still: boolean; onDrop: () => void }) {
  const w = useContext(Wording);
  const cells: [string, string][] = [["Section", g.section], ["Row", g.row], [g.count === 1 ? "Seat" : "Seats", g.seats]];
  return (
    <motion.li
      layout={still ? false : "position"}
      initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 28, transition: { duration: 0.14 } }} transition={SPRING}
      className={`grid items-center gap-3 rounded-[18px] bg-[color-mix(in_oklab,var(--h-foreground)_7%,transparent)] py-2 pl-4 pr-1.5 max-md:py-1 ${g.accessible ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]"}`}
    >
      {/* the same three columns in every row, so Section, Row and Seat line up from one row to the next */}
      <div className="grid min-w-0 grid-cols-[4.25rem_3.5rem_minmax(0,1fr)]">
        {cells.map(([label, value], i) => (
          <div key={label} className={`grid min-w-0 content-center gap-0.5 ${i ? "border-l border-foreground/10 pl-3.5" : ""}`}>
            <small className="text-xs font-medium leading-4 text-h-foreground/70">{label}</small>
            <b className="truncate text-xl font-medium leading-6 tracking-[-0.02em] tabular-nums">{value}</b>
          </div>
        ))}
      </div>
      {g.accessible ? (
        <span role="img" aria-label="Accessible seating" title="Accessible seating" className="grid size-8 place-items-center rounded-full bg-[#F4BC16] text-[#0B1220]"><Wheelchair weight="bold" className="size-[18px]" aria-hidden /></span>
      ) : null}
      <span className="grid justify-items-end gap-0.5 whitespace-nowrap leading-none tabular-nums">
        <b className="text-base font-medium tracking-[-0.01em]">{money(g.price)}</b>
        <small className="text-xs text-h-foreground/70">{g.count > 1 ? w.many : w.one}</small>
      </span>
      <span className="flex items-center">
        <Button variant="ghost" size="sm" iconOnly className="max-md:size-11" aria-label={`Remove Sec ${g.section}, Row ${g.row}`} onClick={onDrop}><X weight="bold" aria-hidden /></Button>
      </span>
    </motion.li>
  );
}

/** the guide: a toast with a hand that taps. Step one: tap a section (it zooms in). Step two: tap a seat. It is gone at the next click (a zoom does not count). */
function Hint({ c, show, stage }: { c: Cmd; show: boolean; stage: 0 | 1 | 2 }) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div key={c.note || `tap${stage}`} role="status" initial={{ opacity: 0, y: -14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.16 } }} transition={SPRING}
          className={`pointer-events-auto flex max-w-full items-center gap-3 rounded-full glass glass-float py-3 pl-3 pr-7`}>
          <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-h-default">
            {c.note ? <Info weight="bold" className="size-6" aria-hidden /> : (
              <>
                <motion.span aria-hidden className="absolute inset-0 rounded-full border border-current" initial={{ scale: 0.6, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
                <motion.span className="grid" animate={{ y: [0, 3, 0], scale: [1, 0.88, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 1] }}><HandTap weight="bold" className="size-6" aria-hidden /></motion.span>
              </>
            )}
          </span>
          <span className="grid min-w-0 leading-snug">
            <b className="truncate text-base font-semibold">{c.note ? "Nothing there" : stage === 1 ? "Now tap a seat" : "Tap a section on the map"}</b>
            <span className="truncate text-sm">{c.note || (stage === 1 ? "Tap any blue seat to pick it." : "It zooms in so you can see its seats.")}</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** the dock: every command in one raised bar, always in reach */
function Dock({ c, total, picked, still, narrow, groups, onDrop }: { c: Cmd; total: number; picked: number; still: boolean; narrow: boolean; groups: Group[]; onDrop: (g: Group) => void }) {
  /* your seats, in the pill: tap the total to open the list of every seat you have picked */
  const [open, setOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const w = useContext(Wording);
  useEffect(() => { if (!picked) setOpen(false); }, [picked]);
  const [a, b] = c.value;
  const any = a <= c.min && b >= c.max;
  const seg = still ? {} : { variants: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: SOFT } } };
  /* on a phone the dock rises from the bottom edge like a sheet, and the Continue button wakes up (a small pop) the moment a seat makes it usable */
  const rise = still || !narrow ? {} : { initial: { y: 120, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { ...SOFT, delay: 0.25 } };
  const box = still ? {} : { variants: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }, initial: "hidden", animate: "show" };
  return (
    <motion.div {...rise} className="relative max-md:w-full max-md:max-w-[34rem]">
    <AnimatePresence>
      {open && picked > 0 ? (
        <motion.ul
          key="seats" id="dock-seats" aria-label="Your seats"
          initial={still ? false : { opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }} transition={SPRING}
          style={{ transformOrigin: "50% 100%" }}
          className="pointer-events-auto absolute inset-x-0 bottom-full mb-2 grid max-h-[44dvh] gap-1.5 overflow-y-auto overscroll-contain rounded-[26px] glass glass-panel p-1.5 text-h-foreground [--glass-fill-panel:color-mix(in_oklab,var(--h-overlay)_95%,transparent)] [scrollbar-width:none]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map((g) => <SeatRow key={g.key} g={g} still={still} onDrop={() => onDrop(g)} />)}
          </AnimatePresence>
        </motion.ul>
      ) : null}
    </AnimatePresence>
    <motion.div {...box} layout transition={SPRING} style={{ borderRadius: narrow ? 28 : 9999 }} className={`pointer-events-auto flex max-w-full items-center justify-center gap-x-1 ${GLASS} p-2 [--glass-fill-float:color-mix(in_oklab,var(--h-overlay)_90%,transparent)] max-md:grid max-md:w-full max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-2 max-md:gap-y-2 max-md:p-2.5`} role="toolbar" aria-label="Seat controls">
      {c.stepper ? (
        /* the single-event page: how many and at what price are one filter. The button says both ("2 tickets · Any price", and how many seats are picked); it opens one card with the stepper and the slider. */
        <motion.div {...seg} layout="position" className="flex min-w-0 items-center gap-2 max-md:col-span-full max-md:order-1">
          <Popover open={priceOpen} onOpenChange={setPriceOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="lg" className="relative min-w-0 justify-between gap-3 tabular-nums max-md:flex-1 md:min-w-[14rem]" disabled={!c.ready} aria-label={`Tickets and price: ${c.party === 1 ? "1 ticket" : `${c.party} tickets`}, ${any ? "any price" : `${money(a)} to ${money(b)}`}`}>
                <SlidersHorizontal weight="bold" aria-hidden />
                <span className="grid min-w-0 flex-1 text-left leading-[1.15]">
                  <b className="truncate text-[15px] font-semibold">{c.party === 1 ? "1 ticket" : `${c.party} tickets`} · {any ? "Any price" : `${money(a)} – ${money(b)}`}</b>
                  <small className="truncate text-[13px] font-normal opacity-70">{picked >= c.party ? "All seats picked" : `${picked} of ${c.party} picked`}</small>
                </span>
                <CaretDown weight="bold" className={`shrink-0 transition-transform duration-200 ${priceOpen ? "rotate-180" : ""}`} aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" sideOffset={14} className="grid w-[min(340px,calc(100vw-24px))] gap-5">
              <div className="flex items-center justify-between gap-4" role="group" aria-label="Number of tickets">
                <span className="grid gap-0.5 leading-tight"><b className="text-base font-semibold">Tickets</b><small className="text-sm opacity-70">{picked >= c.party ? "All seats picked" : `${picked} of ${c.party} picked`}</small></span>
                <span className="flex items-center gap-2">
                  <Button variant="secondary" size="md" iconOnly className="max-md:size-11" aria-label="One fewer ticket" disabled={c.party <= 1} onClick={() => c.setParty(c.party - 1)}><Minus weight="bold" aria-hidden /></Button>
                  <b className="min-w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">{c.party}</b>
                  <Button variant="secondary" size="md" iconOnly className="max-md:size-11" aria-label="One more ticket" disabled={c.party >= c.maxSeats} onClick={() => c.setParty(c.party + 1)}><Plus weight="bold" aria-hidden /></Button>
                </span>
              </div>
              <Slider label={w.price} output={() => (any ? "Any" : `${money(a)} – ${money(b)}`)} min={c.min} max={c.max} step={1} value={[a, b]} disabled={c.max <= c.min} onValueChange={(v) => c.setValue([v[0], v[v.length - 1]])} aria-label={`${w.price}, lowest and highest`} />
            </PopoverContent>
          </Popover>
          <Button variant="tertiary" size="lg" className="shrink-0 max-md:size-12 max-md:gap-0 max-md:p-0" disabled={!c.ready} onClick={c.find} aria-label="Best seats together" title="Best seats together"><Sparkle weight="bold" aria-hidden /><span className="max-md:sr-only">Best seats</span></Button>
        </motion.div>
      ) : (
      <motion.div {...seg} layout="position" className={`max-md:min-w-0 ${c.hasAccess ? "" : "max-md:col-span-full"}`}>
        <Popover open={priceOpen} onOpenChange={setPriceOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="lg" className="min-w-[10.5rem] justify-between tabular-nums max-md:w-full max-md:min-w-0" disabled={!c.ready || c.max <= c.min} aria-label={w.price}>{any ? "Any price" : `${money(a)} – ${money(b)}`}<CaretDown weight="bold" className={`transition-transform duration-200 ${priceOpen ? "rotate-180" : ""}`} aria-hidden /></Button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={14} className="w-[min(340px,calc(100vw-24px))]">
            <Slider label={w.price} output={() => (any ? "Any" : `${money(a)} – ${money(b)}`)} min={c.min} max={c.max} step={1} value={[a, b]} onValueChange={(v) => c.setValue([v[0], v[v.length - 1]])} aria-label={`${w.price}, lowest and highest`} />
          </PopoverContent>
        </Popover>
      </motion.div>
      )}
      {c.hasAccess ? (
        <motion.div {...seg} layout="position" className={c.stepper ? "max-md:order-2" : undefined}>
          <Toggle size="lg" iconOnly pressed={c.access} onPressedChange={c.setAccess} aria-label="Accessible seating only" title="Accessible seating only"><Wheelchair weight="bold" aria-hidden /></Toggle>
        </motion.div>
      ) : null}

      <Sep />
      <motion.div {...seg} layout="position" className={`flex items-center gap-3 pl-2 max-md:col-span-full max-md:pl-1.5 ${c.stepper ? "max-md:order-3 max-md:justify-start max-md:gap-2" : "max-md:justify-between"}`}>
        {/* the running total: a hint until the first seat, then the seats and the price, rolling as they change */}
        {picked ? (
          <button type="button" aria-expanded={open} aria-controls="dock-seats" aria-label={`${picked} ${picked === 1 ? "seat" : "seats"}, ${open ? "hide" : "show"} your seats`} onClick={() => setOpen((v) => !v)}
            className={`group flex h-12 items-center gap-2.5 rounded-full md:h-11 bg-[color-mix(in_oklab,var(--h-foreground)_9%,transparent)] p-1.5 text-left shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--h-foreground)_12%,transparent)] outline-none transition-[background-color,transform] duration-150 hover:bg-[color-mix(in_oklab,var(--h-foreground)_16%,transparent)] focus-visible:ring-2 focus-visible:ring-h-focus active:scale-[0.97] ${c.stepper ? "" : "max-md:flex-1"}`}>
            {/* one line: a badge in the picked-seat colour, the running price, then the chevron — three parts on the same 6px inset */}
            <motion.span key={picked} initial={still ? false : { scale: 0.82 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 20 }} className="grid h-9 place-items-center rounded-full bg-[var(--t,var(--green))] md:h-8 shrink-0 whitespace-nowrap px-3 text-[13px] font-semibold leading-none text-white tabular-nums">
              {picked} {picked === 1 ? "seat" : "seats"}
            </motion.span>
            <span className="flex items-baseline gap-1.5 pr-1 tabular-nums" title={c.n > 1 ? `${c.n} games` : undefined} aria-live="polite">
              <Money value={total} className="text-[17px] font-semibold leading-none tracking-[-0.02em] tabular-nums" />
              {c.n > 1 ? <span className="text-xs font-medium leading-none opacity-70">{c.n} games</span> : null}
            </span>
            {/* the chevron sits in its own round chip and nudges upward twice when the first seat lands, to say there is a list behind it */}
            <motion.span
              key={picked === 1 ? "first" : "more"}
              animate={still || open || picked !== 1 ? { y: 0 } : { y: [0, -4, 0, -4, 0] }}
              transition={{ duration: 0.9, delay: 0.5, ease: "easeInOut" }}
              className="grid size-9 shrink-0 place-items-center rounded-full md:size-8 bg-h-default text-h-default-foreground transition-[transform,background-color] group-hover:scale-105 group-hover:bg-h-default-hover"
            >
              <CaretUp weight="bold" className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
            </motion.span>
          </button>
        ) : (
          <span className="grid h-12 min-w-[7rem] content-center md:h-11 gap-0.5 leading-none">
            <span className="text-sm font-semibold">Pick your seats</span>
            <span className="text-xs opacity-70">Tap a section, then a seat</span>
          </span>
        )}
        <motion.span animate={still || !picked ? { scale: 1 } : { scale: [1, 1.07, 1] }} transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }} key={picked ? "on" : "off"} className={c.stepper ? "max-md:flex-1" : undefined}>
          <Button size="lg" className={c.stepper ? "max-md:w-full" : undefined} disabled={!picked} onClick={c.onPay}>Continue<ArrowRight weight="bold" aria-hidden /></Button>
        </motion.span>
      </motion.div>
    </motion.div>
    </motion.div>
  );
}

/* a phone-width screen (below md): the dock, the games sheet and the zoom chrome take their phone shapes */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const read = () => setNarrow(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return narrow;
}

/* a short tap of haptics where the device has it (Android; iOS Safari ignores it) */
const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };

/* the site's own light/dark choice (data-nt when the visitor has set one, else the system's); the orb cannot see data-nt, so it is told */
function useSiteDark() {
  const [dark, setDark] = useState(true);
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

export default function SeasonScene({ team, games, n, phase, levels, maxSeats, origin, venueName, venueArt, onBack, onPay, mapSlot, findSeats, onParty, onRange, eventMode, startParty }: {
  team: Team; games: Game[]; n: number; phase: "idle" | "loading" | "ready" | "error"; levels: { price: number; seats: number }[];
  maxSeats: number; origin: { x: number; y: number }; venueName: string; venueArt?: string; onBack: () => void; onPay: () => void;
  /** a different map to show in the frame (the WebGL player); it owns its own loading, and writes the picked seats into the seat store */
  mapSlot?: React.ReactNode;
  /** finds seats on that map for "Find the best"; the default reads the old map's tables */
  findSeats?: (party: number, range: PriceRange) => boolean;
  /** tells the host the party size as it changes (the WebGL map dims sections that cannot seat the group) */
  onParty?: (party: number) => void;
  /** tells the host the chosen price band (dollars), or null for all prices */
  onRange?: (range: PriceRange) => void;
  /** the single-event page: the header names the game, the seats are priced "a seat", and the games button opens the game's details instead of a season's list */
  eventMode?: { title: string; backLabel: string; detailsTitle: string; detailsText: string; details: React.ReactNode };
  /** the party size the buyer already chose on the page before the map */
  startParty?: number;
}) {
  const still = useReducedMotion() ?? false;
  const [party, setPartyRaw] = useState(startParty ?? 1);
  useEffect(() => { onParty?.(party); }, [party, onParty]);
  const prices = levels.map((l) => l.price);
  const min = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const max = prices.length ? Math.ceil(Math.max(...prices)) : 0;
  const [span, setSpan] = useState<[number, number] | null>(null);
  const [access, setAccess] = useState(false);
  const [note, setNote] = useState("");
  const [gamesOpen, setGamesOpen] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [q, setQ] = useState("");
  const back = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const dark = useSiteDark();
  const narrow = useNarrow();
  /* the room the floating header and dock take, so the map is fitted into what is left and nothing touches it (the hint sits under the header on narrow screens) */
  const [inset, setInset] = useState({ top: 84, right: 12, bottom: 96, left: 12 });
  useEffect(() => {
    const f = frame.current, h = head.current, d = dock.current;
    if (!f || !h || !d) return;
    const gap = 10;
    const measure = () => {
      const fr = f.getBoundingClientRect(), hr = h.getBoundingClientRect(), dr = d.firstElementChild?.getBoundingClientRect() ?? d.getBoundingClientRect();
      const phone = window.innerWidth < 768;
      const narrow = window.innerWidth < 1280;
      /* wider screens: equal room top and bottom, so the map's centre is the screen's centre. A phone is too short to give up room twice, so the map takes
         exactly what is free between the header and the dock (the hint is a toast over the map there, not a strip of its own). */
      const room = Math.max(Math.round(hr.bottom - fr.top + gap + (narrow ? 76 : 0)), Math.round(fr.bottom - dr.top + gap));
      const next = phone
        ? { top: Math.round(hr.bottom - fr.top + gap), right: 8, bottom: Math.round(fr.bottom - dr.top + gap), left: 8 }
        : { top: room, right: 12, bottom: room, left: 12 };
      setInset((p) => (Math.abs(p.top - next.top) < 3 && Math.abs(p.bottom - next.bottom) < 3 && p.left === next.left ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(f); ro.observe(h); ro.observe(d);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const seats = useSeatmapStore((s) => s.selectedFromMap);
  const unselectSeat = useSeatmapStore((s) => s.unselectSeat);
  const tap = useSeatmapStore((s) => s.sectionTap);
  const ready = phase === "ready";
  const seatCount = useRef(0);
  useEffect(() => { if (seats.length !== seatCount.current) { if (seats.length > seatCount.current) buzz(12); seatCount.current = seats.length; } }, [seats.length]);
  const value: [number, number] = span ?? [min, max];
  /* the whole range is no filter at all, so the map is left as the API draws it */
  const range: PriceRange = span && !(span[0] <= min && span[1] >= max) ? { lo: span[0], hi: span[1] } : null;
  const rangeLo = range?.lo ?? null, rangeHi = range?.hi ?? null;
  useEffect(() => { onRange?.(rangeLo == null || rangeHi == null ? null : { lo: rangeLo, hi: rangeHi }); }, [rangeLo, rangeHi, onRange]);
  const groups = groupSeats(seats);
  /* on the single-event page the count is never below the seats already on the map (tapping an extra seat raises it) */
  useEffect(() => { if (eventMode && seats.length > party) setPartyRaw(Math.min(seats.length, maxSeats)); }, [eventMode, seats.length, party, maxSeats]);
  const total = groups.reduce((a, g) => a + g.price * g.count * n, 0);

  /* the price you pick shows on the map (the other sections fade, seats at other prices look taken). The group size does not change the map: the blue sections are what is open. */
  useEffect(() => { if (ready) applyAvailability(1, range, access); }, [ready, range?.lo, range?.hi, access]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    /* the site's own bar is hidden while the seat page is open (see pages-styles), and the page behind does not scroll */
    document.documentElement.dataset.seasonScene = "1";
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    back.current?.querySelector("button")?.focus({ preventScroll: true });
    /* a seat's card says what its price comes to: a game, times the games a season seat covers */
    useSeatmapStore.getState().setPriceContext(eventMode ? "" : "a game", n);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) onBack(); };
    document.addEventListener("keydown", esc);
    return () => { delete document.documentElement.dataset.seasonScene; document.body.style.overflow = prev; document.removeEventListener("keydown", esc); useSeatmapStore.getState().setPriceContext("", 1); };
  }, [onBack, n]);

  /* the guide moves on at a click or tap (a drag, a scroll or a pinch to zoom is not one): tapping a section zooms in and asks for a seat, the next click ends it */
  useEffect(() => {
    if (stage === 2 || !ready) return;
    let x = 0, y = 0;
    const down = (e: PointerEvent) => { x = e.clientX; y = e.clientY; };
    const up = (e: PointerEvent) => { if (Math.hypot(e.clientX - x, e.clientY - y) < 6) setStage(2); };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    return () => { window.removeEventListener("pointerdown", down, true); window.removeEventListener("pointerup", up, true); };
  }, [stage, ready]);

  /* tapping a section zooms the map to it (the map does that); the guide then asks for a seat */
  useEffect(() => { if (tap && ready && seats.length === 0) setStage(1); }, [tap?.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const cmd: Cmd = {
    n, maxSeats, ready, party, setParty: (v) => { buzz(); setPartyRaw(v); setNote(""); },
    min, max, value, setValue: (v) => { setSpan(v); setNote(""); },
    access, setAccess: (v) => { setAccess(v); setNote(""); }, hasAccess: ready && hasAccessible(),
    stepper: !!eventMode, note, find: () => { const ok = (findSeats ?? pickTogether)(party, range); setNote(ok ? "" : `No ${party === 1 ? "seat" : `${party} seats together`}${range ? " in that price range" : ""}.`); }, onPay,
  };
  const drop = (g: { section: string; row: string; price: number }) => seats.filter((s: TicketGroup) => String(s.sectionName || s.sectionNumber) === g.section && String(s.rowName || s.rowNumber) === g.row && s.price === g.price).forEach((s) => unselectSeat(s.seatId ?? s.id ?? "", s));
  const from = `${origin.x}px ${origin.y}px`;

  return (
    <Wording.Provider value={eventMode ? { one: "per seat", many: "each", price: "Price a seat" } : { one: "a game", many: "a game each", price: "Price a game" }}>
    <motion.section
      role="region"
      aria-label="Choose your seats"
      className="fixed inset-0 z-40 overflow-hidden overscroll-none bg-h-background text-h-foreground md:p-3 [--h-default:color-mix(in_oklab,var(--h-foreground)_8%,transparent)] [--h-default-hover:color-mix(in_oklab,var(--h-foreground)_14%,transparent)] [--h-border:color-mix(in_srgb,var(--h-foreground)_16%,transparent)]"
      initial={still ? false : { clipPath: `circle(0px at ${from})` }}
      animate={{ clipPath: `circle(160vmax at ${from})` }}
      exit={still ? undefined : { opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.55, ease: [0.77, 0, 0.175, 1] }}
    >
      {/* the map is the whole page: one rounded frame, edge to edge. The room it leaves below is for the dock. */}
      <div ref={frame} className="relative h-full overflow-hidden bg-h-surface md:rounded-[32px] [:root[data-nt=light]_&]:bg-[color-mix(in_oklab,#000_7%,var(--h-surface))]">
        <div className="absolute inset-0 select-none [-webkit-touch-callout:none]">
          <AnimatePresence initial={false}>
            {mapSlot ? (
              <div key="slot" className="absolute inset-0">{mapSlot}</div>
            ) : ready ? (
              <motion.div key="map" className="absolute inset-0" initial={still ? false : { opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.45, ease: EASE }}>
                <InteractiveSeatmap className="h-full w-full !rounded-none !border-0 !bg-transparent" lookupsMode="external" inset={inset} glassChrome pins={access ? accessibleSectionIds() : undefined} />
              </motion.div>
            ) : phase === "error" ? (
              <div key="err" className="absolute inset-0 grid place-items-center p-6"><Empty><EmptyHeader><EmptyTitle>The seat map is not available</EmptyTitle><EmptyDescription>We could not load the seats for this game. Please try again in a moment.</EmptyDescription></EmptyHeader></Empty></div>
            ) : (
              <motion.div key="wait" className="absolute inset-0 grid place-items-center overflow-hidden" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="grid justify-items-center gap-3" role="status">
                  <div className="grid size-40 place-items-center" aria-hidden><div className="origin-center scale-[2.2]"><ThinkingOrb state="working" size={64} speed={0.5} theme={dark ? "dark" : "light"} /></div></div>
                  <span className="sr-only">Loading live seats for {venueName}…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* top left: where you are, and the games as one button (1 game or 50 take the same room) */}
        <motion.header ref={head} className={`absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex max-w-[calc(100%-24px)] items-center gap-3 rounded-full max-sm:right-3 max-sm:gap-2.5 ${GLASS} p-1.5 pr-2`} initial={still ? false : { opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SOFT, delay: 0.3 }}>
          <span ref={back} className="shrink-0"><Button variant="secondary" iconOnly className="max-md:size-11" aria-label={eventMode?.backLabel ?? "Back to the season"} onClick={onBack}><ArrowLeft weight="bold" aria-hidden /></Button></span>
          <div className="min-w-0 max-sm:flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]">{eventMode ? eventMode.title : <><span className="max-sm:hidden">{team.name.replace(/ Athletics$/, "")} season seats</span><span className="sm:hidden">Season seats</span></>}</h1>
            <p className="flex min-w-0 items-center gap-1 text-xs"><MapPin weight="bold" aria-hidden className="shrink-0" /><span className="truncate">{venueName}</span></p>
          </div>
          <Sep />
          {eventMode
            ? <Button variant="secondary" size="md" className="shrink-0 max-md:h-11" aria-label="Game details" onClick={() => setGamesOpen(true)}><Info weight="bold" aria-hidden /><span className="max-[359px]:hidden">Details</span></Button>
            : <Button variant="secondary" size="md" className="shrink-0 max-md:h-11" aria-label={`${games.length} ${games.length === 1 ? "game" : "games"}, see them all`} onClick={() => setGamesOpen(true)}><ListBullets weight="bold" aria-hidden />{games.length}<span className="max-[359px]:hidden">{games.length === 1 ? "game" : "games"}</span></Button>}
        </motion.header>

        {/* top centre: what to do, or why nothing came up. Bottom centre: the dock with every command. */}
        <div className="pointer-events-none absolute inset-x-3 top-[4.5rem] z-20 flex justify-center max-md:top-[calc(max(0.75rem,env(safe-area-inset-top))+4.25rem)] xl:top-3"><Hint c={cmd} stage={stage} show={ready && Boolean(note)} /></div>
        <div ref={dock} className="pointer-events-none absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 grid justify-items-center md:bottom-4">
          <Dock c={cmd} total={total} picked={seats.length} still={still} narrow={narrow} groups={groups} onDrop={drop} />
        </div>
      </div>

      <Sheet open={gamesOpen} onOpenChange={setGamesOpen}>
        <SheetContent side={narrow ? "bottom" : "right"} onOpenAutoFocus={(e) => { if (narrow) e.preventDefault(); }} className={narrow ? "h-[82dvh] max-h-none rounded-t-[28px] pb-[env(safe-area-inset-bottom)]" : "w-[min(560px,100vw)] sm:max-w-none"}>
          {narrow && <span aria-hidden className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-current opacity-20" />}
          <SheetHeader><SheetTitle>{eventMode ? eventMode.detailsTitle : "Every seat includes"}</SheetTitle><SheetDescription>{eventMode ? eventMode.detailsText : games.length === 1 ? "The home game" : `All ${games.length} home games`}{eventMode ? "" : ", for the same seat."}</SheetDescription></SheetHeader>
          <SheetBody>{eventMode ? eventMode.details : <GamesList games={games} q={q} onQuery={setQ} total={games.length} compact />}</SheetBody>
        </SheetContent>
      </Sheet>
    </motion.section>
    </Wording.Provider>
  );
}
