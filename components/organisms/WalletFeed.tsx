"use client";

/**
 * The Tickets hub: the same ticket row as Browse and the team pages (TicketStrip), full width. Search and
 * filter tabs on top, games grouped by when they happen (Tonight, This week, then by month), packages,
 * flex packs and passes as rows of the same kind, past events behind a filter with "show more". Picking a
 * row opens its detail in a sheet that slides in from the right (full screen on a phone).
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { Baseball, Basketball, CaretRight, Football, Hockey, IdentificationCard, Lightning, MagnifyingGlass, MusicNotes, Package, SoccerBall, Ticket, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SearchField } from "@/components/ui/search-field";
import { Status } from "@/components/ui/status";
import TicketStrip from "@/components/organisms/TicketStrip";
import PackRow, { PackCard } from "@/components/organisms/WalletPackRow";
import WalletEventDetail, { EventMissing } from "@/components/organisms/WalletEventDetail";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Chips, PullLoadMore, ResponsiveSheet, SCREEN, SheetPage, Toolbar, ViewSwitch, useViewPref } from "@/components/organisms/WalletParts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { FlexDetail, PackageDetail, PassDetail } from "@/components/organisms/WalletCollections";
import {
  ACCESS_PASSES, EVENTS, FLEX_PACKS, PACKAGES, availability, dayOf, monogram, sportOf, thumbOf,
  type Sport, type WalletEvent, type WalletGame,
} from "@/lib/walletDemo";

type Filter = "games" | "packs" | "past";
type Pick = { kind: "game" | "package" | "flex" | "pass"; id: string };
type Row =
  | { key: string; kind: "game"; event: WalletEvent; group: string }
  | { key: string; kind: "package" | "flex" | "pass"; id: string; title: string; meta: string; group: string; count: number; unit: string; cover?: string; transferred?: boolean; mono: string };

const SPORT_ICON: Record<Sport, Icon> = { Baseball, Hockey, Football, Soccer: SoccerBall, Basketball, Music: MusicNotes, Other: Ticket };
const KIND_ICON = { package: Package, flex: Lightning, pass: IdentificationCard } as const;
const KIND_LABEL = { package: "Package", flex: "Flex pack", pass: "Access pass" } as const;
const usable = (g: WalletGame[]) => g.filter((x) => x.state === "upcoming").length;

const mon = (d: Date) => d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const groupOf = (e: WalletEvent) => {
  if (e.inDays === 0) return "Tonight";
  if (e.inDays > 0 && e.inDays <= 7) return "This week";
  const d = dayOf(e.inDays);
  return d.getUTCFullYear() === 2026 ? mon(d) : `${mon(d)} ${d.getUTCFullYear()}`;
};

/* The hover light on a row follows the pointer, as on Browse. */
const glow = (e: React.PointerEvent<HTMLElement>) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>(".tk, .br-et");
  if (!row) return;
  const r = row.getBoundingClientRect();
  row.style.setProperty("--px", `${e.clientX - r.left}px`);
  row.style.setProperty("--py", `${e.clientY - r.top}px`);
};

/** First name from an email: sam.okafor@x.com is Sam. */
const firstName = (email: string) => {
  const w = email.split("@")[0].split(/[._-]/)[0] ?? "";
  return w ? w[0].toUpperCase() + w.slice(1) : email;
};
const joinList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Transfers people sent you: who they are (their initials, stacked), what they sent, and one button to review. */
const initialsOf = (n: string) => (n.split("@")[0].split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();

function IncomingNotice({ list, onReview, compact }: { list: { from: string; kind: string }[]; onReview?: () => void; compact?: boolean }) {
  const names = [...new Set(list.map((t) => firstName(t.from)))];
  const shown = names.length > 2 ? [...names.slice(0, 2), `${names.length - 2} others`] : names;
  const tickets = list.filter((t) => t.kind === "ticket").length;
  const packs = list.filter((t) => t.kind === "package").length;
  const passes = list.filter((t) => t.kind === "pass").length;
  const what = joinList([tickets && "tickets", packs && (packs === 1 ? "a package" : `${packs} packages`), passes && (passes === 1 ? "a pass" : `${passes} passes`)].filter(Boolean) as string[]);
  const people = [...new Set(list.map((t) => t.from))];
  if (compact) {
    return (
      <button type="button" onClick={onReview} aria-label={`${list.length} ${list.length === 1 ? "transfer" : "transfers"} waiting for you. Review`}
        className="flex min-h-12 w-full touch-manipulation select-none items-center gap-2.5 rounded-[20px] bg-card px-4 text-left text-[16px] font-semibold outline-none transition-transform duration-150 ease-[var(--e-out)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />
        <span className="min-w-0 flex-1 truncate">{list.length} {list.length === 1 ? "transfer" : "transfers"} waiting</span>
        <span className="flex items-center gap-1 text-[15px] font-medium text-ink2">Review <CaretRight weight="bold" aria-hidden className="size-4" /></span>
      </button>
    );
  }
  return (
    <section aria-label="Transfers waiting for you" className="flex flex-wrap items-center gap-x-5 gap-y-4 rounded-[28px] bg-card p-4 pr-5 sm:p-5">
      <div className="min-w-0 flex-1 basis-[220px]">
        <div className="flex items-center gap-2.5 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />
          {list.length} {list.length === 1 ? "transfer is" : "transfers are"} waiting for you
        </div>
        <p className="mt-0.5 text-[14px] leading-snug text-ink2">From {joinList(shown)}: {what}.</p>
      </div>
      <div className="flex shrink-0 items-center gap-4 max-sm:w-full max-sm:justify-between">
        <AvatarGroup role="img" aria-label={`From ${people.length} ${people.length === 1 ? "person" : "people"}`}>
          {people.slice(0, 3).map((p) => (
            <Avatar key={p}><AvatarFallback aria-hidden>{initialsOf(p)}</AvatarFallback></Avatar>
          ))}
          {people.length > 3 && <AvatarGroupCount aria-hidden>+{people.length - 3}</AvatarGroupCount>}
        </AvatarGroup>
        <Button variant="secondary" onClick={onReview}>Review <CaretRight weight="bold" aria-hidden /></Button>
      </div>
    </section>
  );
}

export default function WalletFeed({
  evId, onPickEvent, seat, onSeat, onGate, onTransfer, onSell, onTransferPack, incomingList = [], onReview, flow, onFlowClose,
}: {
  /** a transfer or sell flow, shown in the open sheet in place of the ticket; null when there is none */
  flow?: React.ReactNode; onFlowClose?: () => void;
  evId: string; onPickEvent: (e: WalletEvent) => void; seat: number; onSeat: (i: number) => void;
  onGate: () => void; onTransfer: (seatNo?: string) => void; onSell: (seatNo?: string) => void;
  onTransferPack: (name: string, kind: "package" | "pass") => void; incomingList?: { from: string; kind: string }[]; onReview?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("games");
  const [sub, setSub] = useState<"package" | "flex" | "pass">("package");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(8);
  const [pick, setPick] = useState<Pick | null>(null);
  const [viewPref, setView] = useViewPref();
  const mobile = useIsMobile();
  const view = mobile ? "list" : viewPref; // a phone always lists: the tiles are for a bigger screen

  /* Demo: #tickets/missing opens the page for an order that cannot be found. */
  useEffect(() => {
    if (window.location.hash === "#tickets/missing") setPick({ kind: "game", id: "missing" });
  }, []);

  const upcoming = useMemo(() => EVENTS.filter((e) => !e.past).sort((a, b) => a.inDays - b.inDays), []);
  const past = useMemo(() => EVENTS.filter((e) => e.past).sort((a, b) => b.inDays - a.inDays), []);
  const collections = useMemo<Row[]>(() => [
    ...PACKAGES.map<Row>((p) => ({ key: `pk-${p.id}`, kind: "package", id: p.id, title: p.name, meta: `${p.games.length} games · ${p.venue} · ${p.season}`, group: "Packages", count: usable(p.games), unit: "Left", transferred: p.transferred, mono: monogram(p.venue) })),
    ...FLEX_PACKS.map<Row>((p) => ({ key: `fx-${p.id}`, kind: "flex", id: p.id, title: p.name, meta: `${p.blurb} · ${p.venue}`, group: "Flex packs", count: p.vouchers.filter((v) => !v.redeemed).length, unit: "Left", mono: monogram(p.venue) })),
    ...ACCESS_PASSES.map<Row>((p) => ({ key: `ps-${p.id}`, kind: "pass", id: p.id, title: p.name, meta: `${p.games.length} games · ${p.season}`, group: "Access passes", count: usable(p.games), unit: "Left", cover: p.cover, transferred: p.status === "transferred", mono: "AC" })),
  ], []);

  const counts: Record<Filter, number> = { games: upcoming.length, packs: collections.length, past: past.length };
  const term = q.trim().toLowerCase();
  const rows = useMemo<Row[]>(() => {
    const games = (list: WalletEvent[]): Row[] => list.map((e) => ({ key: e.id, kind: "game", event: e, group: groupOf(e) }));
    let out: Row[] =
      filter === "past" ? games(past) : filter === "games" ? games(upcoming) : collections.filter((r) => r.kind === sub);
    if (term) {
      const hay = (r: Row) => (r.kind === "game" ? `${r.event.title} ${r.event.venue} ${r.event.city} ${sportOf(r.event)}` : `${r.title} ${r.group}`).toLowerCase();
      out = out.filter((r) => hay(r).includes(term));
      if (filter === "games") out = [...out, ...games(past).filter((r) => hay(r).includes(term))];
    }
    return out;
  }, [filter, sub, term, upcoming, past, collections]);

  const step = filter === "past" ? 6 : 8;
  const shown = rows.slice(0, limit);
  const groups = shown.reduce<{ name: string; rows: Row[] }[]>((acc, r) => {
    /* tiles run as one grid: the date is on every tile, so group headers would only leave a tile alone in a row */
    const g = acc.find((x) => x.name === (view === "tiles" ? "Your tickets" : r.group));
    if (view === "tiles" && !g) { acc.push({ name: "Your tickets", rows: [r] }); return acc; }
    if (g) g.rows.push(r); else acc.push({ name: r.group, rows: [r] });
    return acc;
  }, []);
  const change = (f: Filter) => { setFilter(f); setSub("package"); setLimit(f === "past" ? 6 : 8); };

  const open = (r: Row) => {
    if (r.kind === "game") { onPickEvent(r.event); setPick({ kind: "game", id: r.event.id }); }
    else setPick({ kind: r.kind, id: r.id });
  };

  const event = EVENTS.find((e) => e.id === (pick?.kind === "game" ? pick.id : evId)) ?? EVENTS[0];
  const detail = (() => {
    if (!pick) return null;
    if (pick.kind === "package") { const p = PACKAGES.find((x) => x.id === pick.id); if (p) return <PackageDetail key={p.id} pkg={p} onTransfer={(n) => onTransferPack(n, "package")} />; }
    if (pick.kind === "flex") { const p = FLEX_PACKS.find((x) => x.id === pick.id); if (p) return <FlexDetail key={p.id} pack={p} />; }
    if (pick.kind === "pass") { const p = ACCESS_PASSES.find((x) => x.id === pick.id); if (p) return <PassDetail key={p.id} pass={p} onTransfer={(n) => onTransferPack(n, "pass")} />; }
    if (pick.id === "missing") return <EventMissing onBack={() => setPick(null)} />;
    return <WalletEventDetail key={event.id} event={event} seat={seat} onSeat={onSeat} onGate={onGate} onTransfer={onTransfer} onSell={onSell} />;
  })();
  const sheetTitle = pick?.kind === "game" ? (pick.id === "missing" ? "Order not found" : event.title) : pick ? (collections.find((r) => r.kind !== "game" && r.id === pick.id) as { title: string } | undefined)?.title ?? "Details" : "";

  return (
    <div className={SCREEN}>
      {/* what is waiting for you is news for the landing tab only (Games), at the top, not on Packs or Past */}
      {incomingList.length > 0 && filter === "games" && (
        /* both are in the page and the width picks one, so a phone never shows the open card first (the JS check only knows the width after it loads) */
        <>
          <div className="md:hidden"><IncomingNotice list={incomingList} onReview={onReview} compact /></div>
          <div className="max-md:hidden"><IncomingNotice list={incomingList} onReview={onReview} /></div>
        </>
      )}

      <Toolbar
        chips={<Chips<Filter>
          className="shrink-0"
          label="Filter tickets" value={filter} onChange={change}
          items={[{ id: "games", label: "Games", count: counts.games }, { id: "packs", label: "Packs", count: counts.packs }, { id: "past", label: "Past", count: counts.past }]}
        />}
        search={{ value: q, onChange: (v) => { setQ(v); setLimit(filter === "past" ? 6 : 8); }, placeholder: "Search events, teams, venues", label: "Search your tickets" }}
        trailing={<ViewSwitch value={viewPref} onChange={setView} />}
      />
      {filter === "packs" && (
        <Chips<"package" | "flex" | "pass"> size="sm" label="Kind of pack" value={sub} onChange={(v) => { setSub(v); setLimit(8); }}
          items={[
            { id: "package", label: "Season packages", count: PACKAGES.length },
            { id: "flex", label: "Flex packs", count: FLEX_PACKS.length },
            { id: "pass", label: "Access passes", count: ACCESS_PASSES.length },
          ]} />
      )}

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><MagnifyingGlass weight="bold" /></EmptyMedia>
            <EmptyTitle>{term ? `Nothing matches “${q.trim()}”` : "Nothing here yet"}</EmptyTitle>
            <EmptyDescription>{term ? "Try a team, a venue or a city." : "Tickets you buy will show up here."}</EmptyDescription>
          </EmptyHeader>
          {term && <EmptyContent><Button variant="secondary" size="sm" onClick={() => setQ("")}>Clear search</Button></EmptyContent>}
        </Empty>
      ) : (
        <div className={cn("flex flex-col gap-2", view === "list" && "-mt-4 sm:-mt-6")}>
          {groups.map((g, gi) => (
            <Fragment key={g.name}>
            <section aria-label={g.name} className="flex flex-col gap-3">
              {view === "list" && (
                <div className="sticky top-[76px] z-10 -mx-1 flex items-baseline justify-between bg-background/85 px-1 pb-2 pt-5 backdrop-blur-md sm:pt-8">
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{g.name}</h2>
                  <span className="text-[13px] tabular-nums text-mute max-sm:hidden">{g.rows.length}</span>
                </div>
              )}
              <ul className={view === "list" ? "wl-list" : "br-tg"} onPointerMove={glow}>
                {g.rows.map((r, i) => {
                  if (r.kind === "game") {
                    const e = r.event, d = dayOf(e.inDays), av = availability(e), sport = sportOf(e), Sp = SPORT_ICON[sport];
                    const tonight = e.inDays === 0;
                    if (view === "tiles") {
                      const img = thumbOf(e);
                      return (
                        <li key={r.key} style={{ ["--i" as string]: i }}>
                          <article className="br-et">
                            <div className="br-et-img" data-blank={img ? "0" : "1"}>
                              <span className="br-et-ph" style={img ? { backgroundImage: `url(${img})` } : undefined} aria-hidden />
                              {img ? null : <span className="br-et-mono" aria-hidden>{monogram(e.venue)}</span>}
                              <span className="br-et-s"><Status color={tonight ? "success" : av.color} pulse={tonight}>{tonight ? "Tonight" : av.label}</Status></span>
                              <span className="br-et-dt"><Badge size="sm">{`${d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}, ${d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`}</Badge></span>
                              <div className="br-et-t">
                                <span className="br-cat-t"><Sp size={14} weight="bold" aria-hidden />{sport}</span>
                                <h4><a className="br-et-a" href="#" onClick={(ev) => { ev.preventDefault(); open(r); }}>{e.title}</a></h4>
                                <span className="br-et-v">{`${e.time} · ${e.venue} · ${e.city}`}</span>
                              </div>
                            </div>
                            <div className="br-et-b">
                              <span className="br-pr"><small>{e.seats.length === 1 ? "Seat" : "Seats"}</small><b>{e.seats.length}</b></span>
                              <span className="br-et-cta"><Button variant="ghost" size="sm" onClick={() => open(r)}>{tonight ? "Open code" : "View"}<CaretRight weight="bold" aria-hidden /></Button></span>
                            </div>
                          </article>
                        </li>
                      );
                    }
                    return (
                      <li key={r.key}>
                        <TicketStrip
                          dow={d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })} d={d.getUTCDate()}
                          img={thumbOf(e)} mono={monogram(e.venue)}
                          chips={<><span className="tk-cat"><Sp size={14} weight="bold" aria-hidden />{sport}</span>{!tonight && e.state && <Status color={av.color}>{av.label}</Status>}</>}
                          title={e.title} href="#" meta={`${e.time} · ${e.venue} · ${e.city}`}
                          priceLabel={e.seats.length === 1 ? "Seat" : "Seats"} price={String(e.seats.length)}
                          selected={pick?.kind === "game" && pick.id === e.id} onSelect={() => open(r)}
                          cta={<Button variant="ghost" size="sm" onClick={() => open(r)}>{tonight ? "Open code" : "View"}<CaretRight weight="bold" aria-hidden /></Button>}
                        />
                      </li>
                    );
                  }
                  const Ic = KIND_ICON[r.kind];
                  if (view === "tiles") {
                    /* in tiles a pack is the card the purchase flow uses, as one tile of the grid */
                    return (
                      <li key={r.key} className="min-w-0" style={{ height: "100%" }}>
                        <PackCard kind={r.kind} id={r.id} selected={pick?.kind === r.kind && pick.id === r.id} onOpen={() => open(r)} />
                      </li>
                    );
                  }
                  return (
                    <li key={r.key} className="min-w-0">
                      <PackRow kind={r.kind} id={r.id} selected={pick?.kind === r.kind && pick.id === r.id} onOpen={() => open(r)} />
                    </li>
                  );
                })}
              </ul>
            </section>
            </Fragment>
          ))}
          <PullLoadMore remaining={rows.length - shown.length} step={step} onMore={() => setLimit((n) => n + step)} />
        </div>
      )}

      <ResponsiveSheet open={!!pick} onOpenChange={(o) => { if (!o) { setPick(null); onFlowClose?.(); } }} title={sheetTitle} bare>
        {/* two layers: the ticket stays where it is (its scroll too) and steps back a little; the flow is a narrower panel that slides in from the side over it */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <motion.div
            className="absolute inset-0 flex flex-col"
            animate={flow ? (mobile ? { x: "-24%", opacity: 0.4 } : { opacity: 0.45 }) : { x: 0, opacity: 1 }}
            transition={{ duration: 0.46, ease: EASE_OUT }}
            aria-hidden={flow ? true : undefined} inert={flow ? true : undefined}
          >
            <SheetPage>{detail}</SheetPage>
          </motion.div>
          <AnimatePresence>
            {flow && (
              <motion.div key="flow" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.46, ease: EASE_OUT }}
                className="absolute inset-y-0 right-0 flex w-full flex-col bg-h-overlay md:w-[min(440px,100vw)] md:rounded-l-[28px] md:shadow-[-28px_0_56px_-28px_rgb(0_0_0/.35)]">
                <SheetPage scroll={false}>{flow}</SheetPage>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ResponsiveSheet>
    </div>
  );
}
