"use client";

import NumberFlow from "@number-flow/react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Armchair, Baseball, CalendarBlank, Clock, Star, Basketball, Bell, Check, Football, Heart, Hockey, MapPin, NavigationArrow, Rows, ShareNetwork, SoccerBall, SquaresFour, Ticket, Users, Volleyball, type Icon } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import TicketStrip from "@/components/organisms/TicketStrip";
import { loadVenuePictures } from "@/lib/venuePictures";
import { Badge } from "@/components/ui/badge";
import { SearchField } from "@/components/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Status } from "@/components/ui/status";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FlexCards, PassCards } from "./Packages";
import { venueSlug, type FeaturedGame, type Status as GameStatus, type Team, type TeamEvent, type VenueInfo } from "./teams";

/* Team storefront: gameday. The stage is a matchup poster split on the diagonal (home colour against the opponent's),
   then the schedule as ticket stubs, season seats as lanyard passes and flex packs as voucher stacks that fan out. */

const ROTATE_MS = 7000;
/* how many games the stage lists at once; it rotates through all of them */
const IX_SHOWN = 3;
/* phones get the medium search and tab sizes, larger screens the large ones */
const subscribePhone = (cb: () => void) => { const m = window.matchMedia("(max-width: 639px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const onPhone = () => window.matchMedia("(max-width: 639px)").matches;
const SPORT_ICON: Record<string, Icon> = { Football, Soccer: SoccerBall, Basketball, Volleyball, Baseball, Hockey };
const iconFor = (s: string) => (s === "All" ? SquaresFour : SPORT_ICON[s] ?? Ticket);
const STATUS_COLOR: Record<GameStatus, "success" | "warning" | "purple"> = { "On sale": "success", "Few left": "warning", Presale: "purple" };

/* The same storefront serves a venue: pass `venue` and the page keeps its stage, ticker, schedule with search and filter, season seats and flex packs,
   but narrowed to that venue's events, with the venue's own banner behind the stage and its information in place of "Where they play". */
export type VenueView = { name: string; info: VenueInfo; events: TeamEvent[] };

export default function TeamStudio({ team, venue }: { team: Team; venue?: VenueView }) {
  const { passes: ALL_PASSES, flex: FLEX, months: MONTHS } = team;
  const EVENTS = venue ? venue.events : team.events;
  /* the stage turns through the curated headline games first, then every other event in date order, so it keeps rotating however many events there are */
  const FEATURED = useMemo<FeaturedGame[]>(() => {
    const head = venue ? team.featured.filter((x) => x.venue === venue.name) : team.featured;
    const rest = EVENTS.filter((e) => !head.some((h) => h.head === e.title))
      .map((e): FeaturedGame => ({ sport: e.sport, tag: e.status, head: e.title, short: e.title.replace(/^.*? vs\.? /, ""), date: `${MONTHS[e.m].split(" ")[0]} ${e.d}`, time: e.time, venue: e.venue, price: e.p, href: e.href, opp: e.opp ?? "", homeArt: e.homeArt, mono: e.mono, solo: !/\bvs\.?\s/i.test(e.title), o: e.oppColor ?? team.color }));
    /* each game's stage is the picture of the venue it is played in: the very image its "Where they play" card shows (the venue's photo, else its banner); a venue with neither leaves the team's own photo showing */
    const pic = (v: string) => team.venueInfo?.[v]?.photo ?? team.venueInfo?.[v]?.banner;
    return [...head, ...rest].map((g) => (g.photo ? g : { ...g, photo: pic(g.venue) }));
  }, [venue, team, MONTHS, EVENTS]);
  const sportsHere = useMemo(() => Array.from(new Set(EVENTS.map((e) => e.sport))), [EVENTS]);
  const PASSES = venue ? ALL_PASSES.filter((p) => p.kicker === "All sports" || sportsHere.includes(p.kicker)) : ALL_PASSES;
  const [following, setFollowing] = useState(false);
  const [shared, setShared] = useState(false);
  const [big, setBig] = useState(false);
  const [hot, setHot] = useState(false);
  const still = useReducedMotion();
  const phone = useSyncExternalStore(subscribePhone, onPhone, () => false);
  const ctl = phone ? "md" : "lg";
  const SPORTS = useMemo(() => ["All", ...Array.from(new Set(EVENTS.map((e) => e.sport)))], [EVENTS]);
  const VENUES = useMemo(() => Array.from(new Set(team.events.map((e) => e.venue))), [team.events]);
  const OTHER_VENUES = useMemo(() => VENUES.filter((v) => v !== venue?.name), [VENUES, venue]);
  const [feat, setFeat] = useState(0);
  const [hold, setHold] = useState(false);
  const [sport, setSport] = useState("All");
  const [venueSel, setVenueSel] = useState("All");
  const [tab, setTab] = useState("schedule");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "tiles">("list");
  /* the venues' own pictures from the API, found by slug or name; a venue with none keeps the local photo, else the drawing */
  const [venuePics, setVenuePics] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    loadVenuePictures().then((p) => { if (live) setVenuePics(p); }).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const v = localStorage.getItem("br-view"); if (v === "list" || v === "tiles") setView(v); } catch { /* storage blocked: the choice just lasts for this visit */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const pickView = (v: "list" | "tiles") => {
    setView(v);
    try { localStorage.setItem("br-view", v); } catch { /* storage blocked */ }
  };
  /* one filter row (sport, and venue on a team page) serves all three tabs; an item with no sport or venue of its own is good for every one */
  const q = query.trim().toLowerCase();
  const evOk = (e: TeamEvent, s: string, v: string) => (s === "All" || e.sport === s) && (v === "All" || e.venue === v) && (!q || `${e.title} ${e.venue} ${e.sport}`.toLowerCase().includes(q));
  const passOk = (p: Team["passes"][number], s: string, v: string) => (s === "All" || p.kicker === "All sports" || p.kicker === s) && (v === "All" || !p.venues || p.venues.includes(v));
  const flexOk = (x: Team["flex"][number], s: string, v: string) => (s === "All" || !x.sports || x.sports.includes(s)) && (v === "All" || !x.venues || x.venues.includes(v));
  const SHOWN_PASSES = PASSES.filter((p) => passOk(p, sport, venueSel));
  const SHOWN_FLEX = FLEX.filter((x) => flexOk(x, sport, venueSel));
  /* what each chip would leave, counted in whatever the open tab lists */
  const countIn = (s: string, v: string) => (tab === "season" ? PASSES.filter((p) => passOk(p, s, v)).length : tab === "flex" ? FLEX.filter((x) => flexOk(x, s, v)).length : EVENTS.filter((e) => evOk(e, s, v)).length);
  const unit = tab === "season" ? ["pass", "passes"] : tab === "flex" ? ["pack", "packs"] : ["event", "events"];
  const clearAll = () => { setQuery(""); setSport("All"); setVenueSel("All"); };
  const heroRef = useRef<HTMLElement>(null);
  const go = (d: number) => { if (FEATURED.length) setFeat((f) => (f + d + FEATURED.length) % FEATURED.length); };
  const f = FEATURED[feat] ?? FEATURED[0];

  useEffect(() => {
    if (hold || FEATURED.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setFeat((x) => (x + 1) % FEATURED.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [feat, hold, FEATURED.length]);

  /* Pointer position on the stage (a finger drags it the same way, and lifting it lets the two sides settle back), eased every frame toward where the pointer is (or back to rest when it leaves),
     so the split line, the badge and the cards glide in and out instead of jumping to a pointer that enters from afar. */
  const aim = useRef({ mx: 0, my: 0, c: 0 });
  const now = useRef({ mx: 0, my: 0, c: 0 });
  const raf = useRef(0);
  const glide = () => {
    const el = heroRef.current; if (!el) { raf.current = 0; return; }
    const a = aim.current, n = now.current;
    let moving = false;
    for (const k of ["mx", "my", "c"] as const) {
      n[k] += (a[k] - n[k]) * 0.09;
      if (Math.abs(a[k] - n[k]) > 0.001) moving = true; else n[k] = a[k];
      el.style.setProperty(`--${k}`, n[k].toFixed(4));
    }
    raf.current = moving ? requestAnimationFrame(glide) : 0;
  };
  const steer = (mx: number, my: number, c: number) => {
    aim.current = { mx, my, c };
    if (!raf.current) raf.current = requestAnimationFrame(glide);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const parallax = (e: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    /* c is how near the pointer is to the line between the two sides: 1 on it, 0 out at the edges */
    steer(x * 2 - 1, y * 2 - 1, Math.max(0, 1 - Math.abs(x - 0.525) * 2.4));
  };
  /* the team colour follows the pointer along a schedule row */
  const glow = (e: React.PointerEvent<HTMLElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".tk, .tm-et");
    if (!row) return;
    const r = row.getBoundingClientRect();
    row.style.setProperty("--px", `${e.clientX - r.left}px`);
    row.style.setProperty("--py", `${e.clientY - r.top}px`);
  };
  const groups: { m: number; items: TeamEvent[] }[] = [];
  for (const e of EVENTS) {
    if (!evOk(e, sport, venueSel)) continue;
    const g = groups.find((x) => x.m === e.m);
    if (g) g.items.push(e); else groups.push({ m: e.m, items: [e] });
  }
  const shown = groups.reduce((a, g) => a + g.items.length, 0);

  /* the venue is a menu, not a second row of chips: a team can have any number of venues. Sport stays as chips, since there are few and they are the quick filter. */
  /* the library's Select, secondary and medium, the same as the search box beside it */
  const venuePick = !venue && VENUES.length > 1 && (
    <Select value={venueSel} onValueChange={setVenueSel}>
      <SelectTrigger variant="secondary" size="md" className="w-full sm:w-56" aria-label="Venue"><SelectValue /></SelectTrigger>
      <SelectContent>
        {["All", ...VENUES].map((v) => <SelectItem key={v} value={v} disabled={countIn(sport, v) === 0 && venueSel !== v}>{v === "All" ? "All venues" : v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
  const sportChips = (
    <ToggleGroup type="single" detached tone="neutral" size="sm" disallowEmptySelection aria-label="Sport" value={sport} onValueChange={(v) => setSport(v)} className="max-w-full flex-wrap justify-start">
      {SPORTS.map((s) => {
        const Ic = iconFor(s);
        const c = countIn(s, venueSel);
        return (
          <ToggleGroupItem key={s} value={s} disabled={c === 0 && sport !== s} aria-label={`${s === "All" ? "All sports" : s}, ${c} ${c === 1 ? unit[0] : unit[1]}`}>
            <Ic weight="bold" aria-hidden />{s === "All" ? "All sports" : s}<span className="tabular-nums opacity-60" aria-hidden>{c}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
  const filters = tab === "schedule" ? (
    <div className="tm-finder">
      <div className="tm-finder-r">
        <SearchField variant="secondary" size="md" className="tm-search" aria-label="Search the schedule" placeholder="Search games, sports, venues" value={query} onChange={(e) => setQuery(e.target.value)} shortcutKey="" shortcutLabel="" />
        {venuePick}
      </div>
      {sportChips}
    </div>
  ) : (
    <div className="tm-finder tm-finder-one">{venuePick}{sportChips}</div>
  );
  const none = (what: string) => (
    <div className="tm-empty">
      <strong>No {what} match these filters</strong>
      <span>Try another sport or venue, or clear the filters.</span>
      <Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>
    </div>
  );
  const maps = venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.info.address ? `${venue.name}, ${venue.info.address}` : `${venue.name}, ${team.city}`)}` : "";
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: venue?.name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch { /* the share sheet was dismissed */ }
  };
  const lowest = EVENTS.length ? Math.min(...EVENTS.map((e) => e.p)) : 0;
  const seatedN = EVENTS.filter((e) => e.href.endsWith("/tickets")).length;
  const seating = seatedN === EVENTS.length ? "Reserved seats" : seatedN === 0 ? "General admission" : "Reserved and general";
  /* facts worked out from the schedule itself: the opponents, the run of home dates and the usual start time */
  const opponents = new Set(EVENTS.map((e) => /\svs\.?\s/.test(e.title) ? e.title.replace(/^.*?\svs\.?\s/, "") : "").filter(Boolean)).size;
  const usualTime = (() => { const c: Record<string, number> = {}; EVENTS.forEach((e) => { c[e.time] = (c[e.time] ?? 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; })();
  const dayOf = (e: TeamEvent) => `${MONTHS[e.m].slice(0, 3)} ${e.d}`;
  const sched: { Ic: Icon; t: string; small?: string }[] = EVENTS.length ? [
    ...(opponents > 1 ? [{ Ic: Users, t: `${opponents} opponents`, small: "this season" }] : []),
    ...(EVENTS.length > 1 ? [{ Ic: CalendarBlank, t: `${dayOf(EVENTS[0])} – ${dayOf(EVENTS[EVENTS.length - 1])}`, small: "home dates" }] : []),
    ...(usualTime ? [{ Ic: Clock, t: usualTime, small: "usual start" }] : []),
  ] : [];
  /* the moving strip: the sports and their dates; on a venue it opens with the venue's own facts */
  const ticker: { Ic: Icon; t: string; small?: string }[] = [
    ...(venue ? [
      { Ic: MapPin, t: venue.info.address ?? team.city },
      ...(venue.info.capacity ? [{ Ic: Users, t: venue.info.capacity, small: "capacity" }] : []),
      ...(EVENTS.length ? [{ Ic: Ticket, t: `${EVENTS.length} ${EVENTS.length === 1 ? "event" : "events"}`, small: "from " + "$" + lowest }] : []),
      ...(EVENTS[0] ? [{ Ic: CalendarBlank, t: `${MONTHS[EVENTS[0].m].slice(0, 3)} ${EVENTS[0].d}`, small: venue.info.tz ? `next game · ${EVENTS[0].time} ${venue.info.tz}` : "next game" }] : []),
      ...(EVENTS.length ? [{ Ic: Armchair, t: seating }] : []),
      ...(sportsHere.length > 1 ? [{ Ic: SquaresFour, t: `${sportsHere.length} sports` }] : []),
      { Ic: Users, t: "Home of", small: team.name },
      ...(venue.info.facts ?? []).map((t) => ({ Ic: Star, t })),
      ...sched,
    ] : sched),
    ...SPORTS.slice(1).map((s) => { const c = EVENTS.filter((e) => e.sport === s).length; return { Ic: iconFor(s), t: s, small: `${c} ${c === 1 ? "date" : "dates"}` }; }),
  ];
  const show = (t: string) => tab === t;
  let n = 0;
  return (
    <>
      <h1 className="tm-sr">{venue ? `${venue.name} tickets` : `${team.name} tickets`}</h1>
      {f ? <div className={venue?.info.banner ? "tm-hero-wrap tm-vbanner" : "tm-hero-wrap"} style={venue?.info.banner ? ({ ["--photo" as string]: `url(${venue.info.banner})` }) : undefined}>
        <section className="tm-hero" ref={heroRef} aria-roledescription="carousel" aria-label="Featured home games" onPointerDown={parallax} onPointerMove={parallax} onPointerUp={(e) => { if (e.pointerType !== "mouse") steer(0, 0, 0); }} onPointerCancel={() => steer(0, 0, 0)} onPointerLeave={() => steer(0, 0, 0)}
          onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}>
          <div className="tm-bg" aria-hidden>
            <span className="tm-photo" />
            {FEATURED.map((x, i) => x.photo ? <span key={`p-${i}-${x.head}`} className="tm-vph" data-on={i === feat ? "1" : "0"} style={{ backgroundImage: `url(${x.photo})` }} /> : null)}
            <span className="tm-a" />
            {FEATURED.map((x, i) => <span key={`${i}-${x.head}`} className="tm-b" data-on={i === feat ? "1" : "0"} style={{ ["--o" as string]: x.o }} />)}
            <span className="tm-slash" />
            <span className="tm-scrim" />
            <span className="tm-grain" />
          </div>
          <div className="tm-crests" aria-hidden>
            {/* a game shows the two sides; an opponent with no crest gets its initials on its colour (never the home crest twice); a show or pass with no opponent shows the one crest */}
            {f.solo
              // eslint-disable-next-line @next/next/no-img-element
              ? <span className="tm-cr tm-solo"><img key={feat} src={f.homeArt ?? team.crest} alt="" /></span>
              : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="tm-cr tm-home">
                  {/* the team's own logo whenever there is one (this game's, else the team's); initials only when none exists */}
                  {(f.homeArt ?? team.crest) ? <img key={feat} src={(f.homeArt ?? team.crest) as string} alt="" /> : <span key={feat} className="tm-mono" style={{ ["--o" as string]: team.color }}><b>{team.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</b></span>}
                </span>
                <span className="tm-vs">vs</span>
                <span className="tm-cr tm-away">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.opp ? <img key={feat} src={f.opp} alt="" /> : <span key={feat} className="tm-mono" style={{ ["--o" as string]: f.o }}><b>{f.mono ?? ""}</b></span>}
                </span>
              </>}
          </div>

          <p className="tm-id">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={venue?.info.profile ?? team.logo} alt="" />
            <span>{venue ? venue.name : team.name}<small>{venue ? <Link href={`/${team.slug}`} className="underline underline-offset-2">{team.name}</Link> : team.city}</small></span>
          </p>

          <div className="tm-hero-in">
            <div className="tm-title" key={feat}>
              <p className="tm-eyebrow"><span className="tm-num">{String(feat + 1).padStart(2, "0")}</span>{f.sport}<i aria-hidden />{f.tag}</p>
              <h2 className="tm-hl" aria-label={f.head} style={f.head.length > 40 ? { ["--k" as string]: 0.66, ["--mw" as string]: "20ch" } : f.head.length > 28 ? { ["--k" as string]: 0.82, ["--mw" as string]: "15ch" } : undefined}>
                {f.head.split(" ").map((w, i) => <span className="tm-w" key={i} aria-hidden><span style={{ animationDelay: `${0.08 + i * 0.07}s` }}>{w}</span></span>)}
              </h2>
              <p className="tm-hm">{f.date} <i aria-hidden /> {f.time} <i aria-hidden /> {f.venue}</p>
            </div>
            <div className="tm-foot">
              <ol className="tm-ix" aria-label="Featured home games" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
                {/* three at a time, whatever the number: the stage still turns through every game, and this row pages along with it */}
                {FEATURED.slice(Math.floor(feat / IX_SHOWN) * IX_SHOWN, Math.floor(feat / IX_SHOWN) * IX_SHOWN + IX_SHOWN).map((x, k) => { const i = Math.floor(feat / IX_SHOWN) * IX_SHOWN + k; return (
                  <li key={`${i}-${x.head}`}>
                    <button type="button" className="tm-ixb" data-on={i === feat ? "1" : "0"} aria-current={i === feat} aria-label={`${x.head}, ${x.date}`} onClick={() => setFeat(i)}>
                      <span className="tm-ixn">{String(i + 1).padStart(2, "0")}</span>
                      <span className="tm-ixt">vs. {x.short}</span>
                      <span className="tm-ixd">{x.date.slice(0, 3)} {x.date.split(" ")[1]}</span>
                      <span className="tm-ixp" key={`${i === feat}-${feat}`} style={i === feat ? { animationDuration: `${ROTATE_MS}ms`, animationPlayState: hold ? "paused" : "running" } : undefined} />
                    </button>
                  </li>
                ); })}
              </ol>
              {FEATURED.length > IX_SHOWN && <span className="tm-ixc" aria-live="off">{feat + 1} / {FEATURED.length}</span>}
              <span className="tm-arrows">
                <Button variant="ghost" size="lg" iconOnly aria-label="Previous game" onClick={() => go(-1)}><ArrowLeft weight="bold" aria-hidden /></Button>
                <Button variant="ghost" size="lg" iconOnly aria-label="Next game" onClick={() => go(1)}><ArrowRight weight="bold" aria-hidden /></Button>
              </span>
            </div>
          </div>

          <div className="tm-cut" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
            <span className="tm-cut-p"><small>From</small><b><NumberFlow value={Number(f.price)} locales="en-US" format={{ style: "currency", currency: "USD", minimumFractionDigits: 0 }} /></b></span>
            <Button href={f.href} size="lg">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>
          </div>
        </section>
      </div> : (
        <div className="tm-hero-wrap"><section className="tm-hero tm-hero-empty" aria-label="Venue"><div className="tm-bg" aria-hidden><span className="tm-photo" /><span className="tm-a" /><span className="tm-scrim" /></div>
          <div className="tm-hero-in"><div className="tm-title"><h2 className="tm-hl">{venue?.name}</h2><p className="tm-hm">No events on sale right now</p></div></div></section></div>
      )}

      {/* the ticker: every sport and how many home dates it has, twice over so the loop has no seam */}
      <div className="tm-tick" aria-hidden>
        <ul style={{ animationDuration: `${Math.max(50, ticker.length * 12)}s` }}>
          {[...ticker, ...ticker, ...ticker, ...ticker].map((x, i) => <li key={i}><x.Ic weight="bold" />{x.t}{x.small && <small>{x.small}</small>}</li>)}
        </ul>
      </div>

      <div className="n-wrap">
        <div className="pg-tabbar">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList size={ctl} aria-label={venue ? "Venue tickets" : "Team tickets"}>
              <TabsTrigger value="schedule">Schedule <Badge size="sm">{shown}</Badge></TabsTrigger>
              <TabsTrigger value="season" disabled={PASSES.length === 0}>Season seats <Badge size="sm">{SHOWN_PASSES.length}</Badge></TabsTrigger>
              <TabsTrigger value="flex" disabled={FLEX.length === 0}>Flex packs <Badge size="sm">{SHOWN_FLEX.length}</Badge></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {show("schedule") && <section className="tm-sec" id="schedule" data-chapter="Schedule" aria-labelledby="tm-s">
          <div className="tm-sh">
            <h2 id="tm-s">Schedule</h2>
            <div className="tm-evtools">
              <span className="tm-count" aria-live="polite">{shown} {shown === 1 ? "event" : "events"}</span>
              <Tabs value={view} onValueChange={(v) => pickView(v as "list" | "tiles")}>
                <TabsList size="md" variant="soft" aria-label="View as">
                  <TabsTrigger value="list" iconOnly aria-label="List view"><Rows weight="bold" /></TabsTrigger>
                  <TabsTrigger value="tiles" iconOnly aria-label="Tiles view"><SquaresFour weight="bold" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          {filters}

          {groups.map((g) => (
            <section className="tm-mo" key={g.m} aria-labelledby={`tm-mo-${g.m}`}>
              <h3 className="tm-mo-h" id={`tm-mo-${g.m}`}>
                <span aria-hidden>{MONTHS[g.m].slice(0, 3)}</span>
                <span className="tm-sr">{MONTHS[g.m]}</span>
                <small><b>{g.items.length}</b> {g.items.length === 1 ? "event" : "events"}</small>
              </h3>
              <ul className={view === "list" ? "tm-ag" : "tm-tg"} onPointerMove={glow}>
                {g.items.map((e) => {
                  const href = e.href;
                  const Sport = iconFor(e.sport);
                  const meta = `${e.time} · ${e.venue}`;
                  const status = <Status color={STATUS_COLOR[e.status]}>{e.status}</Status>;
                  const category = <span className="tm-cat"><Sport size={14} weight="bold" aria-hidden />{e.sport}</span>;
                  const price = <span className="tm-pr"><small>From</small><b>${e.p.toLocaleString("en-US")}</b></span>;
                  /* ghost buttons, as on /browse: the arrow marks a purchase and the bell a reminder; the hover wash is the team colour */
                  const cta = e.status === "Presale"
                    ? <Button href={href} variant="ghost" size="sm"><Bell weight="bold" aria-hidden />Remind me</Button>
                    : <Button href={href} variant="ghost" size="sm">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>;
                  return view === "list" ? (
                    <li key={e.title} style={{ ["--i" as string]: n++ }}>
                      <TicketStrip tone="team" dow={e.dow} d={e.d} img={e.opp || undefined} mono={e.mono} chips={<><span className="tk-cat"><Sport size={14} weight="bold" aria-hidden />{e.sport}</span>{status}</>} title={e.title} href={href} meta={meta} price={`$${e.p.toLocaleString("en-US")}`} cta={cta} />
                    </li>
                  ) : (
                    <li key={e.title} style={{ ["--i" as string]: n++ }}>
                      <article className="tm-et">
                        <div className="tm-et-img">
                          {/* the poster is the team colour with the opponent's crest set on it like a trading card */}
                          <span className="tm-et-art" aria-hidden>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {e.opp ? <img src={e.opp} alt="" loading="lazy" /> : <b>{e.mono}</b>}
                          </span>
                          <span className="tm-et-s">{status}</span>
                          <span className="tm-et-dt"><Badge size="sm">{`${e.dow}, ${MONTHS[e.m].slice(0, 3)} ${e.d}`}</Badge></span>
                          <div className="tm-et-t">
                            {category}
                            <h4><a className="tm-et-a" href={href}>{e.title}</a></h4>
                            <span className="tm-et-v">{meta}</span>
                          </div>
                        </div>
                        <div className="tm-et-b">
                          {price}
                          <span className="tm-et-cta">{cta}</span>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {shown === 0 && (
            <div className="tm-empty">
              <strong>No games match{query ? ` “${query}”` : ""}</strong>
              <span>Try a team, venue or sport, or clear the filters.</span>
              <Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>
            </div>
          )}
        </section>}

        {show("season") && PASSES.length > 0 && <section className="tm-sec" id="season" data-chapter="Season seats" aria-labelledby="tm-p">
          <div className="tm-sh">
            <h2 id="tm-p">Season seats</h2>
            <p>One purchase, your seat held for every home date.</p>
          </div>
          {filters}
          {SHOWN_PASSES.length ? <PassCards team={team} passes={SHOWN_PASSES} /> : none("season seats")}
        </section>}

        {show("flex") && FLEX.length > 0 && <section className="tm-sec" id="flex" data-chapter="Flex packs" aria-labelledby="tm-f">
          <div className="tm-sh">
            <h2 id="tm-f">Flex packs</h2>
            <p>Buy vouchers now, pick the games later. Use them one at a time or all on one night.</p>
          </div>
          {filters}
          {SHOWN_FLEX.length ? <FlexCards flex={SHOWN_FLEX} /> : none("flex packs")}
        </section>}

        {venue && (
          <section className="tm-sec tm-vi" id="stadium" data-chapter="Venue information" aria-labelledby="tm-vi-h">
            <h2 className="tm-sr" id="tm-vi-h">About {venue.name}</h2>
            {/* the concept page's statement: one sentence of the venue's own facts, each set in a chip, and the venue's profile as the one picture */}
            <p className="tm-vi-s">
              {venue.info.profile && (
                <button type="button" className="tm-vi-b" data-big={big ? "1" : "0"} aria-pressed={big} aria-label={`${venue.name} poster, ${big ? "shrink" : "enlarge"}`} onClick={() => setBig((x) => !x)}
                  onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)} onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setHot(true); }} onBlur={() => setHot(false)}>
                  {/* a spring, not a fixed-length transition: it can be reversed at any moment from wherever it is, so moving off the tile mid-grow turns it round smoothly */}
                  <motion.img className="tm-vi-i" src={venue.info.profile} alt="" loading="lazy" initial={false}
                    animate={{ scale: hot || big ? 1.9 : 1, rotate: hot || big ? 0 : -5 }}
                    transition={still ? { duration: 0 } : { type: "spring", stiffness: 150, damping: 22, mass: 0.9 }} />
                </button>
              )}{" "}
              {venue.name}
              {venue.info.capacity && <> holds <span className="tm-vi-c"><Users weight="bold" aria-hidden />{venue.info.capacity} fans</span></>}
              {" "}in <span className="tm-vi-nb"><span className="tm-vi-c"><MapPin weight="bold" aria-hidden />{team.city}</span>,</span>{" "}
              home of <span className="tm-vi-nb"><span className="tm-vi-c"><Star weight="bold" aria-hidden />{team.name}</span>.</span>
              {EVENTS.length > 0 && <> {EVENTS.length === 1 ? "One event is" : `${EVENTS.length} events are`} on sale from <span className="tm-vi-nb"><span className="tm-vi-c"><Ticket weight="bold" aria-hidden />{"$"}{lowest}</span>.</span></>}
            </p>
            {venue.info.blurb && <p className="tm-vi-p">{venue.info.blurb}</p>}
            <div className="tm-vi-a">
              <Button href={maps}><NavigationArrow weight="bold" aria-hidden />Get directions</Button>
              <Button variant="secondary" onClick={() => setFollowing((x) => !x)} aria-pressed={following}>{following ? <Check weight="bold" aria-hidden /> : <Heart weight="bold" aria-hidden />}{following ? "Following" : "Follow"}</Button>
              <Button variant="secondary" onClick={share}>{shared ? <Check weight="bold" aria-hidden /> : <ShareNetwork weight="bold" aria-hidden />}{shared ? "Link copied" : "Share"}</Button>
            </div>
          </section>
        )}

        {(!venue || OTHER_VENUES.length > 0) && <section className="tm-sec" id="venues" data-chapter="Where they play" aria-labelledby="tm-v">
          <div className="tm-sh"><h2 id="tm-v">{venue ? "More venues" : "Where they play"}</h2></div>
          <div className="tm-venues">
            {(venue ? OTHER_VENUES : VENUES).map((v) => {
              const here = team.events.filter((e) => e.venue === v);
              const sports = Array.from(new Set(here.map((e) => e.sport)));
              const next = here[0];
              const Main = iconFor(sports[0]);
              /* the card's picture is the venue's photo (else its banner); the hero shows this same image behind this venue's games */
              const vpic = venuePics[venueSlug(v)] ?? venuePics[v.trim().toLowerCase()] ?? team.venueInfo?.[v]?.photo ?? team.venueInfo?.[v]?.banner;
              return (
                /* the hover is read on a card-shaped wrapper that never moves, and the card inside it rides a spring: if the card itself listened for the pointer, lifting it would slide its bottom edge out from under a pointer resting there and it would flicker */
                <motion.div key={v} className="tm-vn-w" initial="rest" animate="rest" whileHover="hover" whileTap="tap">
                <motion.article className="tm-vn" variants={still ? undefined : { rest: { y: 0 }, hover: { y: -4 }, tap: { y: -1 } }} transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.8 }}>
                  {/* a stadium from above: rows of seating as rings around the pitch, which carries the main sport */}
                  {/* the venue's own picture when the API has one, cropped to fill its square; otherwise the drawing */}
                  {vpic ? (
                    <div className="tm-vn-art" data-photo="1" aria-hidden>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={vpic} alt="" loading="lazy" />
                    </div>
                  ) : (
                    <div className="tm-vn-art" aria-hidden>
                      <span className="tm-vn-pitch"><Main weight="bold" /></span>
                    </div>
                  )}
                  <div className="tm-vn-b">
                    <small>{team.city}</small>
                    <h3><Link href={`/venue/${venueSlug(v)}`}>{v}</Link></h3>
                    <p className="tm-vn-m"><b>{here.length}</b> {here.length === 1 ? "event" : "events"}{next ? <> <i aria-hidden />Next {MONTHS[next.m].slice(0, 3)} {next.d}</> : null}</p>
                    <div className="tm-vn-f">
                      <span className="tm-vn-s">{sports.map((s) => { const Ic = iconFor(s); return <span key={s}><Ic weight="bold" aria-hidden />{s}</span>; })}</span>
                      <span className="tm-vn-cta"><Button href={`/venue/${venueSlug(v)}`} variant="ghost" size="sm">View venue<ArrowRight weight="bold" aria-hidden /></Button></span>
                    </div>
                  </div>
                </motion.article>
                </motion.div>
              );
            })}
          </div>
        </section>}
      </div>
    </>
  );
}
