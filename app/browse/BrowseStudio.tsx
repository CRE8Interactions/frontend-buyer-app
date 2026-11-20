"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Baseball, Basketball, Bell, BoxingGlove, Football, Hockey, MaskHappy, MusicNotes, Rows, SoccerBall, SquaresFour, Ticket, Volleyball, type Icon } from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import Button from "@/components/atoms/Button";
import EventTile from "@/components/organisms/EventTile";
import TicketStrip from "@/components/organisms/TicketStrip";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { Status } from "@/components/ui/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { hrefFor, type Cat, type Ev, type Status as EvStatus } from "./data";
import { loadBrowse, type BrowseData } from "./live";

/* /browse: a night-out finder in the same world as /sell and /our-story. A headliner you can flip through,
   venues drawn as lit sections, and every event as a ticket stub with a perforated edge. */

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ROTATE_MS = 7000;

const imageFor = (t: string) => {
  const s = t.toLowerCase();
  if (s.includes("raptor")) return "/cases/raptors.jpg";
  if (s.includes("nm state") || s.includes("aggie")) return "/cases/nmstate.jpg";
  if (s.includes("icedogs") || s.includes("niagara")) return "/cases/icedogs.jpg";
  return null;
};
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const monogram = (n: string) => n.split(" ").filter((w) => /^[A-Za-z]/.test(w)).slice(0, 3).map((w) => w[0].toUpperCase()).join("");
const STATUS_COLOR: Record<EvStatus, "success" | "warning" | "info" | "purple"> = { "On sale": "success", "Few left": "warning", "Resale only": "info", Presale: "purple" };

/* Dev only: `?data=worst` mixes in realistic worst-case rows (very long names, a four-figure price, a one-word title, accents, a doubleheader)
   so the row and tile layouts can be checked against data that is not as kind as the demo. It is ignored in production builds. */
const WORST: Ev[] = [
  { m: 9, d: 21, dow: "Mon", time: "11:30 AM", title: "Utah Valley University Wolverines vs. Southern Utah Thunderbirds: Homecoming Alumni Weekend Presented by Intermountain Health", venue: "Lavell Edwards Memorial Stadium at Brigham Young University Provo Campus", city: "Rancho Santa Margarita-Mission Viejo, California", p: 1249, status: "Resale only", kind: "seated", slug: "worst-1", cat: "Football" },
  { m: 9, d: 22, dow: "Tue", time: "7:00 PM", title: "Hamlet", venue: "The Pit", city: "Reno, NV", p: 5, status: "Few left", kind: "ga", slug: "worst-2", cat: "Comedy" },
  { m: 9, d: 24, dow: "Thu", time: "6:35 PM", title: "Texas A&M\u2013Corpus Christi Islanders vs. Northwestern State Demons (Doubleheader, Game 1 of 2)", venue: "Whataburger Field", city: "Corpus Christi, TX", p: 18, status: "Presale", kind: "ga", slug: "worst-3", cat: "Baseball" },
  { m: 9, d: 26, dow: "Sat", time: "8:00 PM", title: "Concierto de M\u00fasica Cl\u00e1sica \u2014 Orquesta Sinf\u00f3nica de la Ciudad de M\u00e9xico en el Palacio de Bellas Artes", venue: "Auditorio Nacional Adolfo L\u00f3pez Mateos", city: "Ciudad de M\u00e9xico, CDMX", p: 89, status: "On sale", kind: "seated", slug: "worst-4", cat: "Music" },
];
const CAT_ICON: Record<"All" | Cat, Icon> = { All: SquaresFour, Football, Hockey, Baseball, Soccer: SoccerBall, Volleyball, Basketball, MMA: BoxingGlove, Music: MusicNotes, Comedy: MaskHappy, Other: Ticket };
const EMPTY: BrowseData = { events: [], orgs: [], featured: [] };

export default function BrowseStudio() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"All" | Cat>("All");
  const [feat, setFeat] = useState(0);
  const [hold, setHold] = useState(false);
  const [data, setData] = useState<BrowseData>(EMPTY);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let live = true;
    loadBrowse((d) => { if (live) setData(d); }).then((d) => { if (live) { setData(d); setLoad("ready"); } }).catch(() => { if (live) setLoad("error"); });
    return () => { live = false; };
  }, []);
  const ALL = data.events;
  const VENUES = data.orgs;
  const FEATURED = data.featured;
  const CATS: ("All" | Cat)[] = useMemo(() => ["All", ...Array.from(new Set(ALL.map((e) => e.cat)))], [ALL]);
  const go = (d: number) => { if (FEATURED.length) setFeat((f) => (f + d + FEATURED.length) % FEATURED.length); };

  const heroRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const [orgTab, setOrgTab] = useState<"teams" | "venues">("teams");
  const [view, setView] = useState<"list" | "tiles">("list");
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
  const [edge, setEdge] = useState({ prev: false, next: true });
  const measureRail = () => {
    const el = railRef.current; if (!el) return;
    setEdge({ prev: el.scrollLeft > 4, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  const slideRail = (dir: number) => {
    const el = railRef.current; if (!el) return;
    const card = el.querySelector("li")?.getBoundingClientRect().width ?? 260;
    el.scrollBy({ left: dir * (card + 10) * 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  /* the other group has its own rail: measure it once it is on screen */
  useEffect(() => {
    const id = requestAnimationFrame(measureRail);
    return () => cancelAnimationFrame(id);
  }, [orgTab]);
  useEffect(() => {
    measureRail();
    window.addEventListener("resize", measureRail);
    return () => window.removeEventListener("resize", measureRail);
  }, []);
  const swipe = useRef<number | null>(null);

  /* house lights down: a spotlight follows the pointer, and drifts on its own when nobody is pointing (touch, idle) */
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tx = 0, ty = 0, x = 0, y = 0, last = -1e9, raf = 0, ready = false;
    const rect = () => el.getBoundingClientRect();
    const onMove = (e: PointerEvent) => { const r = rect(); tx = e.clientX - r.left; ty = e.clientY - r.top; last = performance.now(); if (!ready) { x = tx; y = ty; ready = true; } };
    const put = () => { el.style.setProperty("--mx", `${x.toFixed(1)}px`); el.style.setProperty("--my", `${y.toFixed(1)}px`); };
    const tick = (t: number) => {
      const r = rect();
      if (t - last > 2500) { tx = r.width * (0.5 + 0.28 * Math.sin(t / 3100)); ty = r.height * (0.42 + 0.2 * Math.sin(t / 2300 + 1)); if (!ready) { x = tx; y = ty; ready = true; } }
      x += (tx - x) * 0.08; y += (ty - y) * 0.08; put();
      raf = requestAnimationFrame(tick);
    };
    if (reduce) { const r = rect(); x = r.width * 0.68; y = r.height * 0.4; put(); }
    else { el.addEventListener("pointermove", onMove); raf = requestAnimationFrame(tick); }
    return () => { el.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const [beat, setBeat] = useState(0);
  /* the headliner flips on its own, pauses while you point at it, and never moves for someone who asked it not to */
  useEffect(() => {
    if (hold || FEATURED.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* and it waits while the search palette is open, so the headline does not swap under the frosted panel */
    const t = setTimeout(() => { if (document.documentElement.dataset.spOpen) setBeat((b) => b + 1); else setFeat((f) => (f + 1) % FEATURED.length); }, ROTATE_MS);
    return () => clearTimeout(t);
  }, [feat, beat, hold, FEATURED.length]);

  const [worst, setWorst] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const raf = requestAnimationFrame(() => setWorst(new URLSearchParams(window.location.search).get("data") === "worst"));
    return () => cancelAnimationFrame(raf);
  }, []);
  const SRC = useMemo(() => (worst ? [...ALL, ...WORST] : ALL), [worst, ALL]);

  const events = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SRC.filter((e) => (cat === "All" || e.cat === cat) && (!q || `${e.title} ${e.venue} ${e.city} ${e.cat}`.toLowerCase().includes(q)));
  }, [SRC, query, cat]);

  /* what the other filters leave, so every category can show how many events it would give you */
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SRC.filter((e) => !q || `${e.title} ${e.venue} ${e.city} ${e.cat}`.toLowerCase().includes(q));
  }, [SRC, query]);
  const clearAll = () => { setQuery(""); setCat("All"); };
  /* a soft light follows the pointer across an event row, like the beam in the hero */
  const glow = (e: React.PointerEvent<HTMLUListElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".tk, .br-et");
    if (!row) return;
    const r = row.getBoundingClientRect();
    row.style.setProperty("--px", `${e.clientX - r.left}px`);
    row.style.setProperty("--py", `${e.clientY - r.top}px`);
  };

  const groups = useMemo(() => {
    const out: { m: number; items: Ev[] }[] = [];
    for (const e of events) {
      const g = out.find((x) => x.m === e.m);
      if (g) g.items.push(e); else out.push({ m: e.m, items: [e] });
    }
    return out;
  }, [events]);

  let n = 0;
  return (
    <>
      <h1 className="br-sr">What&apos;s on near Las Cruces</h1>
      <div className="br-hero-wrap">
        <section className="br-hero" ref={heroRef} aria-busy={load === "loading"} aria-roledescription="carousel" aria-label="Featured events"
          onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}
          onPointerDown={(e) => { swipe.current = e.clientX; }}
          onPointerUp={(e) => { const x0 = swipe.current; swipe.current = null; if (x0 !== null && Math.abs(e.clientX - x0) > 60) go(e.clientX < x0 ? 1 : -1); }}>
          {/* the stage: each event's photo (or a gradient) cross-fades under the house lights */}
          <div className="br-stagebg" aria-hidden>
            {FEATURED.map((f, i) => (
              <span key={f.title + i} className="br-scene" data-on={i === feat ? "1" : "0"} style={{ ["--a" as string]: f.a, ["--b" as string]: f.b }}>
                <span className="br-photo" style={f.img ? { backgroundImage: `url(${f.img})` } : undefined} data-blank={f.img ? "0" : "1"} />
              </span>
            ))}
            <span className="br-dark" />
            <span className="br-beam" />
            <span className="br-bloom" />
            <span className="br-scrim" />
            <span className="br-grain" />
          </div>

          {FEATURED[feat] ? (<>
          <div className="br-hero-in">
            <div className="br-title" key={feat}>
              <p className="br-eyebrow"><span className="br-num">{String(feat + 1).padStart(2, "0")}</span>{FEATURED[feat].tag}<i aria-hidden />{FEATURED[feat].sub}</p>
              <h2 className="br-hl" aria-label={FEATURED[feat].title} style={FEATURED[feat].head.length > 40 ? { ["--k" as string]: 0.78, ["--mw" as string]: "26ch" } : FEATURED[feat].head.length > 28 ? { ["--k" as string]: 0.92, ["--mw" as string]: "18ch" } : undefined}>
                {FEATURED[feat].head.split(" ").map((w, i) => <span className="br-w" key={i} aria-hidden><span style={{ animationDelay: `${0.08 + i * 0.07}s` }}>{w}</span></span>)}
              </h2>
              <p className="br-hm">{MONTHS[FEATURED[feat].m]} {FEATURED[feat].d} <i aria-hidden /> {FEATURED[feat].time} <i aria-hidden /> {FEATURED[feat].venue}</p>
            </div>

            <div className="br-foot">
              <ol className="br-ix" aria-label="Featured events" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
                {FEATURED.map((f, i) => (
                  <li key={f.title + i}>
                    <button type="button" className="br-ixb" data-on={i === feat ? "1" : "0"} aria-current={i === feat} aria-label={`${f.title}, ${MONTHS[f.m]} ${f.d}`} onClick={() => setFeat(i)}>
                      <span className="br-ixn">{String(i + 1).padStart(2, "0")}</span>
                      <span className="br-ixt">{f.head}</span>
                      <span className="br-ixd">{MONTHS[f.m].slice(0, 3)} {f.d}</span>
                      <span className="br-ixp" key={`${i === feat}-${feat}`} style={i === feat ? { animationDuration: `${ROTATE_MS}ms`, animationPlayState: hold ? "paused" : "running" } : undefined} />
                    </button>
                  </li>
                ))}
              </ol>
              <span className="br-arrows">
                <Button variant="glass" size="sm" iconOnly aria-label="Previous event" onClick={() => go(-1)}><ArrowLeft weight="bold" aria-hidden /></Button>
                <Button variant="glass" size="sm" iconOnly aria-label="Next event" onClick={() => go(1)}><ArrowRight weight="bold" aria-hidden /></Button>
              </span>
            </div>
          </div>

          {/* the notch: a stub cut into the corner of the stage, holding the one action */}
          <div className="br-cut" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
            {FEATURED[feat].price > 0 ? <span className="br-cut-p"><small>From</small><b><NumberFlow value={FEATURED[feat].price} locales="en-US" format={{ style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(FEATURED[feat].price) ? 0 : 2 }} /></b></span> : null}
            <Button href={FEATURED[feat].href} size="lg">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>
          </div>
          </>) : null}
        </section>
      </div>

      <div className="br-sheet">
      <div className="n-wrap">
        {/* teams and venues: a swipeable row, with arrows that stop at the ends */}
        <section className="br-sec" id="teams" data-chapter="Teams & venues" aria-labelledby="br-v">
          <div className="br-sh">
            <h2 id="br-v">Teams &amp; venues</h2>
          </div>
          <Tabs value={orgTab} onValueChange={(v) => setOrgTab(v as "teams" | "venues")}>
            <div className="br-orgbar">
              <TabsList size="sm" aria-label="Teams or venues">
                <TabsTrigger value="teams">Teams <Badge size="sm">{VENUES.filter((v) => v.kind === "team").length}</Badge></TabsTrigger>
                <TabsTrigger value="venues">Venues <Badge size="sm">{VENUES.filter((v) => v.kind === "venue").length}</Badge></TabsTrigger>
              </TabsList>
              <span className="br-rc">
                <Link href="/search" className="br-more">See all<ArrowUpRight weight="bold" aria-hidden /></Link>
                <span className="br-rb">
                  <Button variant="outline" size="sm" iconOnly aria-label="Previous teams and venues" disabled={!edge.prev} onClick={() => slideRail(-1)}><ArrowLeft weight="bold" aria-hidden /></Button>
                  <Button variant="outline" size="sm" iconOnly aria-label="Next teams and venues" disabled={!edge.next} onClick={() => slideRail(1)}><ArrowRight weight="bold" aria-hidden /></Button>
                </span>
              </span>
            </div>
            {(["teams", "venues"] as const).map((k) => (
              <TabsContent key={k} value={k} className="mt-3">
              <ul className="br-rail" ref={railRef} onScroll={measureRail} tabIndex={0} aria-labelledby="br-v" data-prev={edge.prev ? "1" : "0"} data-next={edge.next ? "1" : "0"}>
                {VENUES.filter((v) => (k === "teams") === (v.kind === "team")).map((v) => {
                      return (
                  <li key={v.name} className="br-tile" style={{ ["--t" as string]: v.accent ?? "var(--h-purple)" }}>
                  <span className="br-vm" data-logo={v.logo ? "1" : "0"} data-photo={v.kind === "venue" ? "1" : undefined}>
                    {v.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.logo} alt="" />
                    ) : monogram(v.name)}
                  </span>
                  {v.fresh ? (
                    <span className="br-chip"><Badge variant="success">{`${v.fresh} new ${v.fresh === 1 ? "game" : "games"}`}</Badge></span>
                  ) : null}
                  <div className="br-tx">
                    <small>{v.kind === "team" ? "Team" : "Venue"} · {v.count} events</small>
                    <h3><a className="br-tile-a" href={v.href ?? "/venue/aggie-memorial-stadium"}>{v.name}</a></h3>
                  </div>
                  <span className="br-go2" aria-hidden><span className={buttonVariants({ variant: "tertiary", size: "icon-sm" })}><ArrowUpRight weight="bold" /></span></span>
                </li>
                  );
                })}
              </ul>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* events */}
        <section className="br-sec" id="events" data-chapter="Events" aria-labelledby="br-e">
          <div className="br-sh"><h2 id="br-e">Events</h2><div className="br-evtools">
              <span className="br-count" aria-live="polite">{events.length} {events.length === 1 ? "event" : "events"}</span>
              <Tabs value={view} onValueChange={(v) => pickView(v as "list" | "tiles")}>
                <TabsList size="md" variant="soft" aria-label="View as">
                  <TabsTrigger value="list" iconOnly aria-label="List view"><Rows weight="bold" /></TabsTrigger>
                  <TabsTrigger value="tiles" iconOnly aria-label="Tiles view"><SquaresFour weight="bold" /></TabsTrigger>
                </TabsList>
              </Tabs>
            </div></div>
          <div className="br-finder">
            <SearchField variant="secondary" size="md" className="br-search" aria-label="Search events, teams and venues" placeholder="Search events, teams, venues" value={query} onChange={(e) => setQuery(e.target.value)} shortcutKey="" shortcutLabel="" />
            <ToggleGroup type="single" detached tone="neutral" size="sm" disallowEmptySelection aria-label="Type of event" value={cat} onValueChange={(v) => setCat(v as "All" | Cat)} className="max-w-full flex-wrap">
              {CATS.map((c) => {
                const Ic = CAT_ICON[c];
                const n = c === "All" ? base.length : base.filter((e) => e.cat === c).length;
                return (
                  <ToggleGroupItem key={c} value={c} disabled={n === 0 && cat !== c} aria-label={`${c}, ${n} ${n === 1 ? "event" : "events"}`}>
                    <Ic weight="bold" aria-hidden />{c}<span className="tabular-nums opacity-60" aria-hidden>{n}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          {groups.map((g) => (
            <section className="br-mo" key={g.m} aria-labelledby={`br-mo-${g.m}`}>
              <h3 className="br-mo-h" id={`br-mo-${g.m}`}>
                <span aria-hidden>{MONTHS[g.m].slice(0, 3)}</span>
                <span className="br-sr">{MONTHS[g.m]}</span>
                <small><b>{g.items.length}</b> {g.items.length === 1 ? "event" : "events"}</small>
              </h3>
              <ul className={view === "list" ? "br-ag" : "br-tg"} onPointerMove={glow}>
                {g.items.map((e) => {
                  const img = e.img ?? imageFor(e.title);
                  const soon = e.status === "Presale";
                  const i = n++;
                  const href = e.href || hrefFor(e.kind, e.slug);
                  const meta = `${e.time} · ${e.venue} · ${e.city}`;
                  const CatIcon = CAT_ICON[e.cat];
                  const status = <Status color={STATUS_COLOR[e.status]}>{e.status}</Status>;
                  const category = <span className="br-cat-t"><CatIcon size={14} weight="bold" aria-hidden />{e.cat}</span>;
                  const price = e.p > 0 ? <span className="br-pr"><small>From</small><b>${money(e.p)}</b></span> : <span className="br-pr" />;
                  const cta = soon
                    ? <Button href={href} variant="ghost" size="sm"><Bell weight="bold" aria-hidden />Remind me</Button>
                    : <Button href={href} variant="ghost" size="sm">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>;
                  return view === "list" ? (
                    <li key={e.id ?? `${e.m}-${e.d}-${e.title}`} style={{ ["--i" as string]: i }}>
                      <TicketStrip dow={e.dow} d={e.d} img={img ?? undefined} mono={monogram(e.venue)} chips={<><span className="tk-cat"><CatIcon size={14} weight="bold" aria-hidden />{e.cat}</span>{status}</>} title={e.title} href={href} meta={meta} price={e.p > 0 ? `$${money(e.p)}` : undefined} cta={cta} />
                    </li>
                  ) : (
                    <li key={e.id ?? `${e.m}-${e.d}-${e.title}`} style={{ ["--i" as string]: i }}>
                      <EventTile img={img ?? undefined} mono={monogram(e.venue)} status={status} dateLabel={`${e.dow}, ${MONTHS[e.m].slice(0, 3)} ${e.d}`} category={category} title={e.title} href={href} meta={meta} price={price} cta={cta} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {events.length === 0 && load !== "loading" && (
            <div className="br-empty">
              <strong>{load === "error" ? "Couldn’t load events" : `No events match${query ? ` “${query}”` : ""}`}</strong>
              <span>{load === "error" ? "Check your connection and try again." : "Try a team, venue or city, or clear the filters."}</span>
              <Button variant="outline" size="sm" onClick={clearAll}>Clear filters</Button>
            </div>
          )}
        </section>
      </div>
      </div>
    </>
  );
}
