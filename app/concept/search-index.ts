import { ALL, VENUES, hrefFor, type Ev, type Org } from "../browse/data";
import { TEAMS, venueSlug, type TeamEvent } from "../[slug]/teams";
import { getOffers, getVenues, getOrganizationsOnSale, getOrganizationStorefront } from "@/lib/api";
import { eventPurchasePath, formatEventWhen, imageUrl } from "@/lib/helpers";
import { categoryFor } from "../browse/category";

/* The index behind the top bar's search: the events Browse lists, every team's own schedule, the teams and the venues.
   A hit carries what the palette's preview pane needs to draw it, so choosing a row never means a second lookup. */

export type HitKind = "Team" | "Venue" | "Event";
export type Hit = {
  id: string;
  /** events: when it starts, so a search can read "tomorrow", "this weekend" or "nov 13" */
  at?: number;
  /** events: the day it is on where it is played (YYYYMMDD) and the weekday (0 is Sunday), which is what a date word is checked against */
  ymd?: number;
  dow?: number;
  /** events and venues: where, so a city or an address finds them */
  city?: string;
  /** events from the live API: its id, to ask for the price */
  uuid?: string;
  kind: HitKind;
  title: string;
  meta: string;
  href: string;
  logo?: string;
  accent?: string;
  /** events: the opponent's crest, set on the ticket poster like on the team page tiles */
  art?: string;
  /** events: the date as it is drawn on the stub */
  day?: string;
  mon?: string;
  time?: string;
  venue?: string;
  price?: number;
  status?: string;
  tag?: string;
  /** teams and venues: how many events are on */
  count?: number;
  /** teams and venues: the next few events, so a quick look can list them */
  events?: Hit[];
  /** events: the venue's own page */
  venueHref?: string;
  /** a second action for the quick look (season seats for a team, directions for a venue) */
  extra?: { label: string; href: string };
};

const MONTHS: Record<number, string> = { 1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec", 13: "Jan", 14: "Feb", 15: "Mar", 16: "Apr" };

/* the profile image a team's page gives one of its venues */
const profilePhoto = (name: string): string | undefined => { for (const t of Object.values(TEAMS)) { const p = t.venueInfo?.[name]?.profile; if (p) return p; } return undefined; };
const teamHit = (o: Org): Hit => ({ id: `t-${o.name}`, kind: "Team", title: o.name, meta: `${o.count} events on sale`, href: o.href ?? "/browse", logo: o.logo, accent: o.accent, count: o.count });
const venueHit = (o: Org): Hit => ({ id: `v-${o.name}`, kind: "Venue", title: o.name, meta: `${o.count} events on sale`, href: `/venue/${venueSlug(o.name)}`, count: o.count });
const browseEvent = (e: Ev): Hit => ({ id: `e-${e.m}-${e.d}-${e.title}`, kind: "Event", title: e.title, meta: `${e.dow}, ${MONTHS[e.m] ?? ""} ${e.d} · ${e.venue}`, href: e.href || hrefFor(e.kind, e.slug), venueHref: `/venue/${venueSlug(e.venue)}`, day: String(e.d), mon: MONTHS[e.m] ?? "", time: e.time, venue: e.venue, price: e.p, status: e.status, tag: e.cat });
const teamEvent = (teamName: string, months: Record<number, string>, e: TeamEvent, art?: string, accent?: string): Hit => {
  const mon = (months[e.m] ?? "").slice(0, 3);
  return { id: `te-${teamName}-${e.m}-${e.d}-${e.title}`, kind: "Event", title: e.title, meta: `${e.dow}, ${mon} ${e.d} · ${e.venue}`, href: e.href, venueHref: `/venue/${venueSlug(e.venue)}`, day: String(e.d), mon, time: e.time, venue: e.venue, price: e.p, status: e.status, tag: e.sport, art: e.opp ?? art, accent };
};

const TEAM_EVENTS: Hit[] = Object.values(TEAMS).flatMap((t) => t.events.map((e) => teamEvent(t.name, t.months, e, t.crest, t.color)));
const EVENTS: Hit[] = [...ALL.map(browseEvent), ...TEAM_EVENTS];
/* a team's next games: its own schedule where it has one (NM State), otherwise the Browse events that name it */
const gamesFor = (o: Org): Hit[] => (o.href === "/nm-state" ? TEAM_EVENTS : EVENTS.filter((h) => h.title.includes(o.match ?? o.name.split(" ")[0]))).slice(0, 3);
/* teams always list A to Z, in the stand-in data and in the live data alike, so the list does not re-order when the live data lands */
const byTitle = (a: Hit, b: Hit) => a.title.localeCompare(b.title);
const TEAMS_HITS: Hit[] = VENUES.filter((o) => o.kind === "team").map((o) => ({ ...teamHit(o), events: gamesFor(o), extra: o.href === "/nm-state" ? { label: "Season seats", href: "/season-tickets" } : undefined })).sort(byTitle);
const VENUE_HITS: Hit[] = VENUES.filter((o) => o.kind === "venue").map((o) => ({ ...venueHit(o), logo: profilePhoto(o.name), events: EVENTS.filter((h) => h.venue === o.name).slice(0, 3), extra: { label: "Directions", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.name)}` } }));

/* what else is on at an event's venue, for the quick look under the ticket */
/* The index is the demo data above until the live one has loaded: the palette asks for it the first time it opens, and from then on every search reads the live events, teams and venues (the same three on-sale endpoints Browse uses).
   If the live request fails (offline, demo mode) the demo data stays. */
type Index = { teams: Hit[]; venues: Hit[]; events: Hit[] };
let live: Index | null = null;
let liveLoad: Promise<boolean> | null = null;
let demo: Index | null = null;
const cur = (): Index => live ?? (demo ??= { teams: TEAMS_HITS, venues: VENUE_HITS, events: EVENTS });

type ApiImg = Parameters<typeof imageUrl>[0];
type SfEvent = { uuid: string; name: string; start: string; soldOut?: boolean; slug?: string | null; seoUrl?: string; seatmap?: { ga_only?: boolean }; attractions?: { name?: string; primary?: boolean; order?: number; artwork?: ApiImg }[]; venue?: { name?: string; slug?: string; timezone?: string; address?: { city?: string | null; state?: string | null; address_1?: string | null }[] } };
type SfOrg = { name: string; slug: string; image?: ApiImg; branding?: { primaryColor?: string }; upcomingEventsCount?: number };
const list = <T,>(res: { data?: unknown }): T[] => { const d = res.data as T[] | { data?: T[] } | undefined; return Array.isArray(d) ? d : d?.data ?? []; };

/* Every team that has something on sale is asked for its whole storefront (every home event, with the opponent's crest), not the short "next few" feed, so a game weeks away is findable.
   Prices are not in those events: the quick look asks for the lowest open offer of the one event you are looking at (see priceFor). */
export function loadLiveIndex(): Promise<boolean> {
  liveLoad ??= (async () => {
    try {
      const [orgRes, venRes] = await Promise.all([getOrganizationsOnSale(), getVenues().catch(() => ({ data: [] as unknown }))]);
      const orgs = list<SfOrg>(orgRes);
      /* a venue's picture, as Browse draws it: its own image from the venues endpoint (the first, when it is a list), else the profile image in teams.ts */
      const photoOf = new Map<string, string>();
      list<{ name: string; image?: ApiImg | ApiImg[] }>(venRes as { data?: unknown }).forEach((v) => { const u = imageUrl(Array.isArray(v.image) ? v.image[0] : v.image, ""); if (u && v.name) photoOf.set(v.name.trim(), u); });
      const stores = await Promise.allSettled(orgs.filter((o) => o.slug).map(async (o) => ({ o, sf: (await getOrganizationStorefront(o.slug)).data as { events?: SfEvent[]; venues?: { name: string; slug: string; capacity?: number }[] } })));
      const venueSlugOf = new Map<string, string>();
      const events: (Hit & { at: number })[] = [];
      const teams: Hit[] = [];
      for (const r of stores) {
        if (r.status !== "fulfilled") continue;
        const { o, sf } = r.value;
        (sf.venues ?? []).forEach((v) => venueSlugOf.set(v.name.trim(), v.slug));
        const accent = o.branding?.primaryColor ? `color-mix(in srgb, ${o.branding.primaryColor} 72%, white)` : undefined;
        const logo = imageUrl(o.image, "") || undefined;
        const mine = (sf.events ?? []).map((e): Hit & { at: number } => {
          const tz = e.venue?.timezone;
          const at = [...(e.attractions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const home = at.find((a) => a.primary) ?? at[0];
          /* an event can list its home team more than once (all marked primary), so the opponent is the entry that is not primary and not the home team's name */
          const away = at.find((a) => !a.primary && a.name !== home?.name) ?? at.find((a) => a !== home && a.name !== home?.name);
          const dow = formatEventWhen(e.start, tz, "ddd"), mon = formatEventWhen(e.start, tz, "MMM"), day = formatEventWhen(e.start, tz, "D");
          const venue = e.venue?.name?.trim() ?? "";
          const ad = e.venue?.address?.[0];
          const city = [ad?.address_1, ad?.city, ad?.state].filter(Boolean).join(", ");
          return {
            at: +new Date(e.start), ymd: +formatEventWhen(e.start, tz, "YYYYMMDD"), dow: +formatEventWhen(e.start, tz, "d"), city, id: `e-${e.uuid}`, uuid: e.uuid, kind: "Event", title: e.name, meta: `${dow}, ${mon} ${day} · ${venue}`,
            href: eventPurchasePath({ ...e, slug: e.slug ?? undefined, venue: undefined }), venueHref: `/venue/${e.venue?.slug ?? venueSlug(venue)}`,
            day, mon, time: formatEventWhen(e.start, tz, "h:mm A"), venue, status: e.soldOut ? "Resale only" : "On sale",
            tag: categoryFor(`${e.name} ${o.name} ${venue}`), art: (away?.artwork ? imageUrl(away.artwork, "") : "") || logo, accent,
          };
        });
        if (!mine.length) continue; // a team with nothing on sale is not worth a result
        events.push(...mine);
        teams.push({ id: `t-${o.name.trim()}`, kind: "Team", title: o.name.trim(), meta: `${mine.length} events on sale`, href: `/${o.slug}`, logo, accent, count: mine.length, events: [...mine].sort((a, b) => a.at - b.at).slice(0, 3) });
      }
      if (!events.length) return false;
      events.sort((a, b) => a.at - b.at);
      const names = Array.from(new Set(events.map((e) => e.venue).filter((v): v is string => !!v)));
      live = {
        events,
        teams: teams.sort(byTitle),
        venues: names.map((n) => {
          const here = events.filter((e) => e.venue === n);
          return { id: `v-${n}`, kind: "Venue", title: n, logo: photoOf.get(n) || profilePhoto(n), city: here[0]?.city, meta: `${here.length} events on sale`, href: `/venue/${venueSlugOf.get(n) ?? venueSlug(n)}`, count: here.length, events: here.slice(0, 3), extra: { label: "Directions", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n)}` } } as Hit;
        }),
      };
      return true;
    } catch {
      return false;
    }
  })();
  return liveLoad;
}

const priced = new Map<string, Promise<number | undefined>>();
/* the lowest price anyone can buy right now for one event, asked for when it is looked at */
export function priceFor(h: Hit): Promise<number | undefined> {
  if (h.price) return Promise.resolve(h.price);
  if (!h.uuid) return Promise.resolve(undefined);
  let p = priced.get(h.uuid);
  if (!p) {
    p = getOffers(h.uuid).then((res) => {
      const offers: { isLocked?: boolean; prices?: number[] }[] = res.data?.offers ?? [];
      const open = offers.filter((o) => !o.isLocked).flatMap((o) => o.prices ?? []).filter((x) => x > 0);
      return open.length ? Math.min(...open) : undefined;
    }).catch(() => undefined);
    priced.set(h.uuid, p);
  }
  return p;
}

export const moreAt = (h: Hit): Hit[] => cur().events.filter((e) => e.venue === h.venue && e.id !== h.id).slice(0, 2);

export type Groups = { teams: Hit[]; venues: Hit[]; events: Hit[] };

const MONTH_WORDS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAY_WORDS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/* Dates typed as words: today, tomorrow, (this) weekend, this/next week, a month ("november", "nov 13"), a weekday ("friday"). They are taken out of the query and become a filter on the day the event is played (its own local day, not the viewer's);
   whatever is left still has to match the text. */
type Day = { ymd: number; dow: number };
function dateFilter(words: string[]): { test?: (h: Day) => boolean; rest: string[] } {
  const rest: string[] = [], tests: ((h: Day) => boolean)[] = [];
  const now = new Date(), dow0 = now.getDay();
  const ymd = (off: number) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const num = (w?: string) => (w && /^\d{1,2}$/.test(w) && +w >= 1 && +w <= 31 ? +w : 0);
  const monthOf = (w: string, loose: boolean) => MONTH_WORDS.findIndex((m) => m === w || (loose && m.slice(0, 3) === w));
  for (let i = 0; i < words.length; i++) {
    const w = words[i], n = words[i + 1], p = words[i - 1];
    if (w === "today" || w === "tonight") tests.push((h) => h.ymd === ymd(0));
    else if (w === "tomorrow") tests.push((h) => h.ymd === ymd(1));
    else if (w === "weekend" || ((w === "this" || w === "next") && (n === "weekend" || n === "week"))) {
      const toMon = ((8 - dow0) % 7) || 7, nextWeek = w === "next";
      const sat = dow0 === 0 ? -1 : dow0 === 6 ? 0 : 6 - dow0; // offset of this weekend's Saturday (yesterday, on a Sunday)
      let from: number, to: number;
      if (n === "week") { from = nextWeek ? toMon : 0; to = nextWeek ? toMon + 7 : toMon; }
      else { from = Math.max(0, sat + (nextWeek ? 7 : 0)); to = sat + (nextWeek ? 9 : 2); }
      tests.push((h) => h.ymd >= ymd(from) && h.ymd < ymd(to));
      if (w !== "weekend") i++;
    } else if (monthOf(w, false) >= 0 || (monthOf(w, true) >= 0 && (num(n) || num(p)))) {
      const m = monthOf(w, true) + 1, day = num(n) || num(p);
      tests.push((h) => Math.floor(h.ymd / 100) % 100 === m && (!day || h.ymd % 100 === day));
      if (num(n)) i++; else if (num(p)) rest.pop();
    } else if (WEEKDAY_WORDS.includes(w) || ["fri", "thu", "tue", "wed"].includes(w)) {
      const k = WEEKDAY_WORDS.findIndex((x) => x === w || x.slice(0, 3) === w);
      tests.push((h) => h.dow === k);
    } else rest.push(w);
  }
  return tests.length ? { test: (h) => tests.every((t) => t(h)), rest } : { rest };
}

/* the sports that have events, with how many, for the filter chips */
export const sportsIn = (): { name: string; n: number }[] => {
  const c = new Map<string, number>();
  cur().events.forEach((e) => e.tag && c.set(e.tag, (c.get(e.tag) ?? 0) + 1));
  return [...c].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
};

/* every word typed has to appear somewhere in the row's text, in any order, so "aggies utep" and "utep aggies" find the same game. A city or an address finds its venues and games; a date word narrows to that day; a sport chip narrows the events (not the teams and venues) to that sport. */
export function searchHits(q: string, sport = "", cap = 5): Groups {
  const all = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ix = cur();
  const bySport = (h: Hit) => !sport || h.tag === sport;
  if (!all.length) return { teams: ix.teams, venues: ix.venues, events: ix.events.filter(bySport).slice(0, cap) };
  const { test, rest } = dateFilter(all);
  const has = (text: string) => { const t = text.toLowerCase(); return rest.every((w) => t.includes(w)); };
  return {
    teams: test ? [] : ix.teams.filter((h) => has(h.title)),
    venues: test ? [] : ix.venues.filter((h) => has(`${h.title} ${h.city ?? ""}`)),
    events: ix.events.filter((h) => bySport(h) && (!test || (h.ymd != null && h.dow != null && test({ ymd: h.ymd, dow: h.dow }))) && has(`${h.title} ${h.venue ?? ""} ${h.city ?? ""} ${h.tag ?? ""} ${h.meta}`)),
  };
}

/* ---- completion and typo help ----
   The vocabulary is what is actually in the index: team and venue names, the opponents in event titles, cities, sports, and the date words the search understands. Teams outrank venues, venues outrank the rest, so "des" finishes as a team before a street. */
type Phrase = { text: string; w: number };
type Vocab = { ix: Index; phrases: Phrase[]; words: Map<string, number> };
let vocabCache: Vocab | null = null;
const DATE_PHRASES = ["this weekend", "next weekend", "this week", "next week", "tomorrow", "today", ...WEEKDAY_WORDS, ...MONTH_WORDS];

function vocab(): Vocab {
  const ix = cur();
  if (vocabCache?.ix === ix) return vocabCache;
  const best = new Map<string, Phrase>();
  const add = (text: string | undefined, w: number) => {
    const t = text?.trim();
    if (!t || t.length < 3) return;
    const k = t.toLowerCase(), old = best.get(k);
    if (!old || old.w < w) best.set(k, { text: t, w });
  };
  ix.teams.forEach((h) => add(h.title, 5));
  ix.venues.forEach((h) => add(h.title, 4));
  ix.events.forEach((h) => {
    const m = h.title.split(/\s+vs\.?\s+/i);
    if (m.length > 1) add(m[m.length - 1], 3);
    if (h.city) { const p = h.city.split(", "); add(p.length >= 3 ? p[1] : p[0], 3); }
    add(h.tag, 2);
  });
  DATE_PHRASES.forEach((d) => add(d, 2));
  const phrases = [...best.values()];
  const words = new Map<string, number>();
  phrases.forEach((p) => p.text.toLowerCase().split(/[^a-z']+/).forEach((w) => { if (w.length >= 3 && (words.get(w) ?? 0) < p.w) words.set(w, p.w); }));
  return (vocabCache = { ix, phrases, words });
}

/* what the query would be if finished: the whole phrase it begins ("des mo" to "des moines buccaneers"), else just its last word ("friday nov" to "friday november"). Empty when there is nothing to offer. */
export function complete(q: string): string {
  if (q.length < 2 || /^\s/.test(q) || /\s$/.test(q)) return "";
  const ql = q.toLowerCase(), v = vocab();
  let top: Phrase | undefined;
  for (const p of v.phrases) {
    const t = p.text.toLowerCase();
    if (t.length > ql.length && t.startsWith(ql) && (!top || p.w > top.w || (p.w === top.w && p.text.length < top.text.length))) top = p;
  }
  const rest = (t: string) => (q === ql ? t.toLowerCase() : t); // finish in the case you are typing in
  if (top) return q + rest(top.text.slice(q.length));
  const last = ql.match(/(\S+)$/)?.[1] ?? "";
  if (last.length < 2) return "";
  let bw: { w: string; s: number } | undefined;
  for (const [w, s] of v.words) if (w.length > last.length && w.startsWith(last) && (!bw || s > bw.s || (s === bw.s && w.length < bw.w.length))) bw = { w, s };
  return bw ? q + rest(bw.w.slice(last.length)) : "";
}

/* edit distance with swapped neighbours counting as one edit ("dubuqeu" is one slip) */
function edits(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

/* a spelling the index knows, for a query that found nothing: each word that is not the start of anything known is swapped for the nearest known word (one slip for four letters, two from five up). Empty when nothing is close. */
export function didYouMean(q: string): string {
  const v = vocab();
  let changed = false;
  const out = q.trim().split(/\s+/).map((t) => {
    const tl = t.toLowerCase();
    if (tl.length < 4 || /\d/.test(tl)) return t;
    for (const w of v.words.keys()) if (w.startsWith(tl)) return t;
    let near = "", nd = 9;
    const lim = tl.length <= 4 ? 1 : 2;
    for (const [w] of v.words) {
      if (Math.abs(w.length - tl.length) > lim) continue;
      const d = edits(tl, w);
      if (d <= lim && d < nd) { nd = d; near = w; }
    }
    if (near) { changed = true; return near; }
    return t;
  });
  return changed ? out.join(" ") : "";
}

export const SUGGESTIONS = ["hockey", "this weekend", "West Des Moines", "tomorrow", "buccaneers"];
