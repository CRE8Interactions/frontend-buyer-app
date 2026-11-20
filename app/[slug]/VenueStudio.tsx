"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Baseball, Basketball, Bell, Check, Football, Heart, Hockey, MapPin, NavigationArrow, ShareNetwork, SoccerBall, SquaresFour, Ticket, Users, Volleyball, X, type Icon } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import TicketStrip from "@/components/organisms/TicketStrip";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { SearchField } from "@/components/ui/search-field";
import { Status } from "@/components/ui/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FlexCards, PassCards } from "./Packages";
import VenueArt from "./VenueArt";
import type { Status as GameStatus, Team, TeamEvent, VenueInfo } from "./teams";

/* A venue, with as few controls on screen as it can get away with. The banner runs up behind the nav as the team's wallpaper (the image is blended into the
   team colour and the top fades into the page, so any banner, or none, gives the same legible result). It holds two cutouts, the notch the team page's stage
   has: the venue bottom left, the next game with its one action bottom right. Under it, one large tab bar reaches the schedule, the season seats and the flex
   packs; search and the sport filter appear only when there is enough to filter. Follow, directions and share live with the venue information at the end.
   The cards are the team page's own (the schedule's stubs, the pass cards, the flex pack cards), drawn from one shared file.
   Breaking cases: a venue with no events, no banner or no profile (the team colour and a drawing stand in), no season seats or flex packs (that tab is
   disabled), forty events (the schedule scrolls, the bar stays), a search with no result, a long venue or event name, a game with no crest. */

const SPORT_ICON: Record<string, Icon> = { Football, Soccer: SoccerBall, Basketball, Volleyball, Baseball, Hockey };
const iconFor = (s: string) => (s === "All" ? SquaresFour : SPORT_ICON[s] ?? Ticket);
const STATUS_COLOR: Record<GameStatus, "success" | "warning" | "purple"> = { "On sale": "success", "Few left": "warning", Presale: "purple" };
/* below this many events a search box is more clutter than help */
const SEARCH_FROM = 7;

export default function VenueStudio({ team, name, info, events }: { team: Team; name: string; info: VenueInfo; events: TeamEvent[] }) {
  const [following, setFollowing] = useState(false);
  const [shared, setShared] = useState(false);
  const [sport, setSport] = useState("All");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("schedule");

  const sports = useMemo(() => Array.from(new Set(events.map((e) => e.sport))), [events]);
  const main = useMemo(() => { const c: Record<string, number> = {}; for (const e of events) c[e.sport] = (c[e.sport] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; }, [events]);
  const shown = useMemo(() => events.filter((e) => (sport === "All" || e.sport === sport) && `${e.title} ${e.sport}`.toLowerCase().includes(q.trim().toLowerCase())), [events, sport, q]);
  const groups = useMemo(() => {
    const out: { m: number; items: TeamEvent[] }[] = [];
    for (const e of shown) { const g = out.find((x) => x.m === e.m); if (g) g.items.push(e); else out.push({ m: e.m, items: [e] }); }
    return out;
  }, [shown]);
  const next = events[0];
  const passes = team.passes.filter((p) => p.kicker === "All sports" || sports.includes(p.kicker));
  const flex = team.flex;
  const lowest = events.length ? Math.min(...events.map((e) => e.p)) : 0;
  const showSearch = events.length >= SEARCH_FROM;
  const filtered = sport !== "All" || q.trim() !== "";
  const clear = () => { setSport("All"); setQ(""); };
  const month = (e: TeamEvent) => (team.months[e.m] ?? "").split(" ")[0];
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${team.city}`)}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch { /* the share sheet was dismissed */ }
  };
  const glow = (e: React.PointerEvent<HTMLElement>) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".tk");
    if (!row) return;
    const r = row.getBoundingClientRect();
    row.style.setProperty("--px", `${e.clientX - r.left}px`);
    row.style.setProperty("--py", `${e.clientY - r.top}px`);
  };
  const nextCta = next && (next.status === "Presale"
    ? <Button href={next.href} variant="outline" size="lg"><Bell weight="bold" aria-hidden />Remind me</Button>
    : <Button href={next.href} size="lg">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>);
  const nextInfo = next && <span className="pg-cut-g"><small>Next game</small><b title={next.title}>{next.title}</b><span>{next.dow}, {month(next)} {next.d} · {next.time}</span></span>;
  let n = 0;

  return (
    <>
      <section className="pg-vt" aria-labelledby="pg-vh">
        <div className="pg-vbanner">
          {info.banner
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="pg-vbanner-img" src={info.banner} alt="" />
            : (
              <span className="pg-vbanner-fb" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={team.logoWide ?? team.logo} alt="" />
              </span>
            )}
          <span className="pg-vscrim" aria-hidden />

          <div className="pg-vtext">
            <span className="pg-vavatar" aria-hidden>
              {info.profile
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={info.profile} alt="" />
                : <span className="pg-vavatar-fb"><VenueArt sport={main} /></span>}
            </span>
            <div className="pg-vname">
              <h1 id="pg-vh">{name}</h1>
              <p className="pg-vsub"><Link href="/nm-state" className="pg-vteam">{team.name}</Link><span aria-hidden>·</span>{team.city}</p>
            </div>
          </div>

          {next && <div className="tm-cut pg-cut-r">{nextInfo}<span className="tm-cut-p"><small>From</small><b>{"$"}{next.p}</b></span>{nextCta}</div>}
        </div>

        {next && (
          <div className="n-wrap pg-mob">
            <div className="pg-nextbar">{nextInfo}<span className="pg-nextbar-f"><span className="tm-cut-p"><small>From</small><b>{"$"}{next.p}</b></span>{nextCta}</span></div>
          </div>
        )}
      </section>

      <div className="n-wrap pg-vmain">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="pg-tabbar">
            <TabsList size="lg" aria-label="On this venue" className="w-full sm:w-max">
              <TabsTrigger value="schedule" className="flex-1 sm:flex-none"><span className="hidden sm:inline">Schedule</span><span className="sm:hidden">Games</span><Badge size="sm">{events.length}</Badge></TabsTrigger>
              <TabsTrigger value="season" className="flex-1 sm:flex-none" disabled={passes.length === 0}><span className="hidden sm:inline">Season seats</span><span className="sm:hidden">Seats</span><Badge size="sm">{passes.length}</Badge></TabsTrigger>
              <TabsTrigger value="flex" className="flex-1 sm:flex-none" disabled={flex.length === 0}>Flex packs<Badge size="sm">{flex.length}</Badge></TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="schedule" className="mt-4">
            <section id="schedule" aria-labelledby="pg-ev">
              {events.length === 0 ? (
                <Card variant="secondary" className="p-6">
                  <Empty><EmptyHeader><EmptyTitle>Nothing is on sale at {name} yet</EmptyTitle><EmptyDescription>Check back soon, or see everything the team has on sale.</EmptyDescription></EmptyHeader>
                    <Button href="/nm-state#schedule">See the team schedule<ArrowRight weight="bold" aria-hidden /></Button></Empty>
                </Card>
              ) : (
                <>
                  <div className="grid gap-3">
                    <h2 className="pg-h2 !m-0" id="pg-ev">Schedule<small aria-live="polite">{shown.length === events.length ? `${events.length} ${events.length === 1 ? "event" : "events"}` : `${shown.length} of ${events.length} events`}</small></h2>
                    {(showSearch || sports.length > 1) && (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,300px)_1fr] sm:items-center">
                        {showSearch ? <SearchField variant="secondary" size="lg" aria-label="Search events" placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} shortcutKey="" shortcutLabel="" /> : <span />}
                        {sports.length > 1 && (
                          <ToggleGroup type="single" detached tone="neutral" size="md" disallowEmptySelection aria-label="Sport" value={sport} onValueChange={(v) => setSport(v)} className="max-w-full flex-wrap">
                            {["All", ...sports].map((s) => { const Ic = iconFor(s); return <ToggleGroupItem key={s} value={s}><Ic weight="bold" aria-hidden />{s === "All" ? "All sports" : s}</ToggleGroupItem>; })}
                          </ToggleGroup>
                        )}
                      </div>
                    )}
                    {filtered && <div><Button variant="ghost" onClick={clear}><X weight="bold" aria-hidden />Clear filters</Button></div>}
                  </div>

                  {groups.map((g) => (
                    <section className="tm-mo" key={g.m} aria-labelledby={`pg-mo-${g.m}`}>
                      <h3 className="tm-mo-h" id={`pg-mo-${g.m}`}>
                        <span aria-hidden>{(team.months[g.m] ?? "").slice(0, 3)}</span><span className="tm-sr">{team.months[g.m]}</span>
                        <small><b>{g.items.length}</b> {g.items.length === 1 ? "event" : "events"}</small>
                      </h3>
                      <ul className="tm-ag" onPointerMove={glow}>
                        {g.items.map((e) => {
                          const Sport = iconFor(e.sport);
                          return (
                            <li key={e.title} style={{ ["--i" as string]: n++ }}>
                              <TicketStrip tone="team" dow={e.dow} d={e.d} img={e.opp || undefined} mono={e.mono} chips={<><span className="tk-cat"><Sport size={14} weight="bold" aria-hidden />{e.sport}</span><Status color={STATUS_COLOR[e.status]}>{e.status}</Status></>} title={e.title} href={e.href} meta={e.time} price={`$${e.p}`}
                                cta={e.status === "Presale"
                                  ? <Button href={e.href} variant="ghost"><Bell weight="bold" aria-hidden />Remind me</Button>
                                  : <Button href={e.href} variant="ghost">Get tickets<ArrowRight weight="bold" aria-hidden /></Button>} />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                  {shown.length === 0 && (
                    <Card variant="secondary" className="mt-6 p-6"><Empty><EmptyHeader><EmptyTitle>No events match</EmptyTitle><EmptyDescription>Try another sport or search.</EmptyDescription></EmptyHeader><Button variant="outline" onClick={clear}>Clear filters</Button></Empty></Card>
                  )}
                </>
              )}
            </section>
          </TabsContent>

          <TabsContent value="season" className="mt-4">
            <section id="season" aria-labelledby="pg-ss">
              <h2 className="pg-h2" id="pg-ss">Season seats<small>One purchase, your seat held for every home date</small></h2>
              <PassCards team={team} passes={passes} />
            </section>
          </TabsContent>

          <TabsContent value="flex" className="mt-4">
            <section id="flex" aria-labelledby="pg-fx">
              <h2 className="pg-h2" id="pg-fx">Flex packs<small>Buy vouchers now, pick the games later</small></h2>
              <FlexCards flex={flex} />
            </section>
          </TabsContent>
        </Tabs>

        <section className="pg-sec pg-about" id="stadium" aria-labelledby="pg-ab">
          <div className="pg-about-map" aria-hidden>
            {info.art
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={info.art} alt="" loading="lazy" />
              : <VenueArt sport={main} />}
          </div>
          <div className="pg-about-t">
            <h2 className="pg-h2 !m-0" id="pg-ab">Venue information</h2>
            {info.blurb && <p className="pg-about-p">{info.blurb}</p>}
            <ul className="pg-vfacts">
              <li><MapPin weight="bold" aria-hidden /><span>{team.city}</span></li>
              {info.capacity && <li><Users weight="bold" aria-hidden /><span><b>{info.capacity}</b> capacity</span></li>}
              <li><Ticket weight="bold" aria-hidden /><span><b>{events.length}</b> upcoming {events.length === 1 ? "event" : "events"}{lowest ? <>, from <b>{"$"}{lowest}</b></> : null}</span></li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button href={maps}><NavigationArrow weight="bold" aria-hidden />Get directions</Button>
              <Button variant="outline" onClick={() => setFollowing((f) => !f)} aria-pressed={following}>{following ? <Check weight="bold" aria-hidden /> : <Heart weight="bold" aria-hidden />}{following ? "Following" : "Follow"}</Button>
              <Button variant="outline" onClick={share}>{shared ? <Check weight="bold" aria-hidden /> : <ShareNetwork weight="bold" aria-hidden />}{shared ? "Link copied" : "Share"}</Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
