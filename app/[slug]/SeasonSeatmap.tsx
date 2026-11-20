"use client";

import { useEffect, useMemo, useState } from "react";
import { getEventByShortCode, getSeatmapByShortCode, getTicketGroups } from "@/lib/api";
import { createSeatLookupTables, createSectionLookupTable, type SeatmapBackground, type SeatmapMapping } from "@/lib/seatmapLookups";
import useFiltersStore, { type TicketGroup } from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

/* The data behind the season seats page: the real seatmap, ticket groups and prices for the team's seated home game, the same ones the event pages use,
   loaded into the shared seatmap store that InteractiveSeatmap reads. The picked seats live in that store, so the page beside the map reads the same seats.
   A season seat carries over to every home game, so the page prices a seat as this game's price times the number of games. */

export type SeasonEventRef = { slug: string; code: string };

/** "Sec FF · Row 4 · Seat 12" for a seat picked on the map */
export const seatLabel = (g: TicketGroup) =>
  g.GA ? `${g.sectionName || "General admission"}${g.quantity ? ` × ${g.quantity}` : ""}` : `Sec ${g.sectionName || g.sectionNumber} · Row ${g.rowName || g.rowNumber} · Seat ${g.seatNumber}`;

type Loaded = { key: string; map: Record<string, unknown>; groups: TicketGroup[]; event: Record<string, unknown> };
let cache: Loaded | null = null;
/* the map's seat tables and section fills as the API gave them, so a filter can narrow what the map shows and a cleared filter can put it all back */
let base: { lookup: Record<string, TicketGroup>; offers: Record<string, TicketGroup[]>; sections: NonNullable<SeatmapMapping["sections"]> } | null = null;
/* what the map already uses for a seat nobody can buy, so a seat that does not fit the filter looks the same as a taken one */
const UNAVAILABLE = "#E6E8EC";

const toBackground = (raw: unknown): SeatmapBackground | null => {
  if (!raw) return null;
  if (typeof raw === "string") return { url: raw, width: 1000, height: 1000 };
  const o = raw as { url?: string; width?: number; height?: number };
  return o.url ? { url: o.url, width: Number(o.width) || 1000, height: Number(o.height) || 1000 } : null;
};

/** Loads the map and seats once `enabled` turns true (the map is about 10 MB, so the page waits until it is near). */
export function useSeasonSeats({ event, title, venue, maxSeats, enabled }: { event: SeasonEventRef | null; title: string; venue: string; maxSeats: number; enabled: boolean }) {
  const key = event ? `${event.slug}/${event.code}` : "";
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(cache && cache.key === key ? "ready" : "idle");
  const [groups, setGroups] = useState<TicketGroup[]>(cache && cache.key === key ? cache.groups : []);

  useEffect(() => {
    if (!enabled || !event) return;
    let live = true;
    const apply = (c: Loaded) => {
      const st = useSeatmapStore.getState();
      st.setData((c.map.mapping ?? null) as SeatmapMapping | null);
      st.setBackground(toBackground(c.map.background));
      if (c.map.id != null) st.setSeatmapId(c.map.id as number);
      if (c.map.seat_border_radius != null) st.setSeatBorderRadius(Number(c.map.seat_border_radius));
      if (c.map.max_scale != null) st.setMaxScale(Number(c.map.max_scale));
      const seats = createSeatLookupTables(c.groups);
      base = { lookup: seats.lookupTable, offers: seats.offersLookupTable, sections: (((c.map.mapping ?? {}) as SeatmapMapping).sections ?? {}) as NonNullable<SeatmapMapping["sections"]> };
      st.setSeatLookupTable(seats.lookupTable);
      st.setSeatOffersLookupTable(seats.offersLookupTable);
      st.setSectionLookupTable(createSectionLookupTable(c.groups));
      const f = useFiltersStore.getState();
      f.setEvent(c.event);
      f.setEventTicketLimit(maxSeats);
    };
    if (cache && cache.key === key) {
      apply(cache); /* the state above already started from the cache */
      return;
    }
    setPhase("loading");
    (async () => {
      try {
        const [mapRes, evRes] = await Promise.all([getSeatmapByShortCode(event.code, event.slug), getEventByShortCode(event.code, event.slug, "")]);
        const map = ((mapRes.data as { data?: Record<string, unknown> })?.data ?? mapRes.data) as Record<string, unknown>;
        const ev = (evRes.data?.event ?? null) as Record<string, unknown> | null;
        if (!map?.mapping || !ev) throw new Error("no map");
        const gr = await getTicketGroups({ event: ev, quantity: 0, offerIds: [], priceRange: [0, 500], accessCodes: [], accessible: false, sort: "price", returnLocked: true });
        const list = (gr.data?.ticketGroups ?? []) as TicketGroup[];
        if (!live) return;
        cache = { key, map, groups: list, event: { venue, name: title, ...ev } };
        apply(cache);
        setGroups(list);
        setPhase("ready");
      } catch {
        if (live) setPhase("error");
      }
    })();
    return () => { live = false; };
  }, [enabled, event, key, maxSeats, title, venue]);

  /* the price levels the map is coloured by: each real price with the seats still open at it */
  const levels = useMemo(() => {
    const by = new Map<number, number>();
    for (const g of groups) if (g.GA === false && g.price != null) by.set(g.price, (by.get(g.price) ?? 0) + (g.availableCount ?? g.seatIds?.length ?? 0));
    return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([price, seats]) => ({ price, seats }));
  }, [groups]);

  return { phase, groups, levels };
}

/** A run of seats side by side in one row, all at one price and all still open. */
type Run = { ids: string[]; price: number; rowId: string; sectionId?: string };

/* every run of open seats side by side (same row, same price) that is at least `n` long, from the map's own seat tables as the API gave them */
/** a wheelchair space, by any of the flags the API uses for it */
const isAccessible = (g: TicketGroup | undefined) => Boolean(g && (g.accessible || g.accessibleType || g.accessiblityType || g.accessibilityType));

/** are there any wheelchair spaces on this map (the accessibility filter is only offered when there are) */
export function hasAccessible(): boolean {
  return !!base && Object.values(base.lookup).some((g) => g.GA === false && isAccessible(g));
}

/** the sections that have wheelchair spaces (a section of them is often a few seats, too small to aim at on the whole map) */
export function accessibleSectionIds(): string[] {
  return [...new Set(runsOf(1, true).map((r) => r.sectionId).filter((x): x is string => !!x))];
}

function runsOf(n: number, accessible = false): Run[] {
  const st = useSeatmapStore.getState();
  if (!base) return [];
  const out: Run[] = [];
  for (const row of Object.values(st.data?.rows ?? {})) {
    let run: string[] = [];
    let price = -1;
    const flush = () => { if (run.length >= n) out.push({ ids: run, price, rowId: String(row.rowId), sectionId: row.sectionId }); run = []; price = -1; };
    for (const id of row.seats ?? []) {
      const g = base.lookup[id];
      if (g && g.GA === false && (accessible ? isAccessible(g) : !g.accessible) && g.price != null) {
        if (run.length && g.price !== price) flush();
        price = g.price;
        run.push(id);
      } else flush();
    }
    flush();
  }
  return out;
}

export type Availability = {
  /** open seats that fit the filter (side by side in groups of the party size, at the price) */
  seats: number;
  /** how many seats fit at each price, for the party size, whatever price is chosen */
  byLevel: Map<number, number>;
  /** how many sections still have seats that fit */
  sections: number;
  /** the price ladder: each real price with the seats that fit at it (for the party size, whatever range is chosen) and the sections they are in */
  tiers: { price: number; seats: number; sections: number }[];
};

/**
 * Shows the filter on the map. Seats that do not fit (not enough side by side for the party, or another price) look taken and cannot be picked, and sections with
 * no fitting seat fade out, so the map itself shows where seats are. Picked seats always stay. With no filter (a party of one at any price) the map is put back as the API gave it.
 */
/** a range of prices a game, both ends included; null is any price */
export type PriceRange = { lo: number; hi: number } | null;
const inRange = (price: number, range: PriceRange) => range == null || (price >= range.lo && price <= range.hi);

function fit(n: number, range: PriceRange, accessible = false) {
  const byLevel = new Map<number, number>();
  const secBy = new Map<number, Set<string>>();
  const allowed = new Set<string>();
  const live = new Set<string>();
  for (const r of runsOf(Math.max(1, n), accessible)) {
    byLevel.set(r.price, (byLevel.get(r.price) ?? 0) + r.ids.length);
    if (r.sectionId) { const set = secBy.get(r.price) ?? new Set<string>(); set.add(r.sectionId); secBy.set(r.price, set); }
    if (inRange(r.price, range)) { r.ids.forEach((id) => allowed.add(id)); if (r.sectionId) live.add(r.sectionId); }
  }
  return { byLevel, allowed, live, secBy };
}

/** The numbers for the panel (no change to the map): how many seats fit, at each price, and in how many sections. */
export function availabilityFor(n: number, range: PriceRange): Availability {
  const { byLevel, allowed, live, secBy } = fit(n, range);
  const tiers = [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([price, seats]) => ({ price, seats, sections: secBy.get(price)?.size ?? 0 }));
  return { seats: allowed.size, byLevel, sections: live.size, tiers };
}

export function applyAvailability(n: number, range: PriceRange, accessible = false): void {
  const st = useSeatmapStore.getState();
  if (!base || !st.data) return;
  const { allowed, live } = fit(n, range, accessible);
  const picked = st.selectedFromMap;
  picked.forEach((g) => { if (g.seatId != null) allowed.add(String(g.seatId)); });
  picked.forEach((g) => { if (g.sectionId != null) live.add(String(g.sectionId)); });

  const unfiltered = n <= 1 && range == null && !accessible;
  const lookup: Record<string, TicketGroup> = {};
  const offers: Record<string, TicketGroup[]> = {};
  for (const id of unfiltered ? Object.keys(base.lookup) : allowed) {
    if (base.lookup[id]) lookup[id] = base.lookup[id];
    if (base.offers[id]) offers[id] = base.offers[id];
  }
  const sections: NonNullable<SeatmapMapping["sections"]> = {};
  const hidden: Record<string, true> = {};
  for (const [sid, sec] of Object.entries(base.sections)) {
    /* the accessibility filter greys every section without a wheelchair space, general admission included */
    const dim = !unfiltered && (accessible || (sec.rows?.length ?? 0) > 0) && !live.has(sid);
    sections[sid] = dim ? { ...sec, fill: UNAVAILABLE, coverFill: UNAVAILABLE } : sec;
    /* a section the filter hides is not sold out when it has seats the filter leaves out: the hover says so */
    if (dim) {
      const rows = sec.rows ?? [];
      const hasSeats = rows.length === 0 || rows.some((rid) => (st.data?.rows?.[rid]?.seats ?? []).some((id) => base!.lookup[String(id)]));
      if (hasSeats) hidden[sid] = true;
    }
  }
  st.setSectionFilter(unfiltered ? null : { reason: accessible ? "No wheelchair spaces" : "None at this price", hidden });
  st.setSeatLookupTable(lookup);
  st.setSeatOffersLookupTable(offers);
  st.setData({ ...st.data, sections });
}

/**
 * Picks `n` seats side by side in one row, within the price range when one is given, puts them in the selection (replacing it) and zooms the map to them.
 * Returns false when no row has that many together.
 */
export function pickTogether(n: number, range: PriceRange): boolean {
  const st = useSeatmapStore.getState();
  if (!base) return false;
  /* the tidiest fit: the shortest run that is long enough, so a row is not split into a stub */
  const best = runsOf(n).filter((r) => inRange(r.price, range)).sort((a, b) => a.ids.length - b.ids.length)[0];
  if (!best) return false;
  const start = Math.floor((best.ids.length - n) / 2);
  st.resetMapSelection();
  /* the picked seats must be clickable on the map, so they are put back in the seat table whatever the filter hides */
  const lookup = { ...st.seatLookupTable };
  best.ids.slice(start, start + n).forEach((id) => { lookup[id] = base!.lookup[id]; });
  st.setSeatLookupTable(lookup);
  best.ids.slice(start, start + n).forEach((id) => st.selectSpecificSeat(id, base!.lookup[id]));
  if (best.sectionId) st.requestFocusSection(best.sectionId);
  return true;
}

/** One place to sit: a row of seats side by side at one price, with enough for the party. */
export type Listing = { key: string; ids: string[]; price: number; section: string; row: string; sectionId?: string; seats: string };

/* "15–23" for a run of seat numbers, "3, 7, 9" when they are not in a row */
export const seatRange = (nums: number[]) => {
  const s = [...nums].sort((a, b) => a - b);
  if (s.length === 0) return "";
  return s.every((v, i) => i === 0 || v === s[i - 1] + 1) ? (s.length === 1 ? String(s[0]) : `${s[0]}–${s[s.length - 1]}`) : s.join(", ");
};

/** Every row with `n` seats side by side (at the price, when one is chosen), cheapest or dearest first. This is the list beside the map. */
export function listingsFor(n: number, range: PriceRange, sort: "low" | "high"): Listing[] {
  const st = useSeatmapStore.getState();
  if (!base) return [];
  const out: Listing[] = runsOf(Math.max(1, n)).filter((r) => inRange(r.price, range)).map((r, i) => {
    const g = base!.lookup[r.ids[0]];
    /* the seats you would get: the middle of the row, the same ones pickListing takes */
    const start = Math.floor((r.ids.length - Math.max(1, n)) / 2);
    const nums = r.ids.slice(start, start + Math.max(1, n)).map((id) => Number(st.data?.seats?.[id]?.seatNumber)).filter((v) => !Number.isNaN(v));
    return { key: `${r.rowId}-${r.price}-${i}`, ids: r.ids, price: r.price, sectionId: r.sectionId, section: String(g?.sectionName || g?.sectionNumber || "?"), row: String(g?.rowName || g?.rowNumber || "?"), seats: seatRange(nums) };
  });
  return out.sort((a, b) => (sort === "low" ? a.price - b.price : b.price - a.price) || a.section.localeCompare(b.section, undefined, { numeric: true }) || a.row.localeCompare(b.row, undefined, { numeric: true }));
}

/** Puts `n` seats from the listing, in the middle of its row, into the selection (replacing it), and zooms the map to them. */
export function pickListing(l: Listing, n: number) {
  const st = useSeatmapStore.getState();
  if (!base) return;
  const start = Math.floor((l.ids.length - n) / 2);
  const ids = l.ids.slice(start, start + n);
  st.resetMapSelection();
  const lookup = { ...st.seatLookupTable };
  ids.forEach((id) => { lookup[id] = base!.lookup[id]; });
  st.setSeatLookupTable(lookup);
  ids.forEach((id) => st.selectSpecificSeat(id, base!.lookup[id]));
  if (l.sectionId) st.requestFocusSection(l.sectionId);
}

/** The picked seats as places to sit: seats in one row are one entry ("Sec F · Row 17 · Seats 32–35"), so eight seats read as two or three lines, not eight. */
export type SeatGroup = { key: string; section: string; row: string; seats: string; count: number; price: number; accessible: boolean };
export function groupSeats(seats: TicketGroup[]): SeatGroup[] {
  const by = new Map<string, { section: string; row: string; nums: number[]; price: number; count: number; accessible: boolean }>();
  for (const g of seats) {
    const section = String(g.sectionName || g.sectionNumber || "?"), row = String(g.rowName || g.rowNumber || "?");
    const acc = isAccessible(g);
    const k = `${section}|${row}|${g.price}|${acc ? "a" : ""}`;
    const e = by.get(k) ?? { section, row, nums: [], price: g.price ?? 0, count: 0, accessible: acc };
    const num = Number(g.seatNumber);
    if (!Number.isNaN(num)) e.nums.push(num);
    e.count += 1;
    by.set(k, e);
  }
  return [...by.entries()].map(([key, e]) => ({ key, section: e.section, row: e.row, seats: seatRange(e.nums), count: e.count, price: e.price, accessible: e.accessible }));
}


/* put these seats (all in one row) into the selection, replacing it; they must be clickable on the map, so they go back in the seat table whatever the filter hides */
function reselect(ids: string[]) {
  const st = useSeatmapStore.getState();
  if (!base) return;
  st.resetMapSelection();
  const lookup = { ...st.seatLookupTable };
  ids.forEach((id) => { lookup[id] = base!.lookup[id]; });
  st.setSeatLookupTable(lookup);
  ids.forEach((id) => st.selectSpecificSeat(id, base!.lookup[id]));
}
const rowNo = (r: Run) => Number.parseFloat(String(base?.lookup[r.ids[0]]?.rowNumber ?? base?.lookup[r.ids[0]]?.rowName ?? "")) || 0;

/** The visitor tapped a section: pick the best `n` seats side by side in it (the widest block, so there is room to move), within the price range. False when none fit. */
export function pickBestInSection(sectionId: string, n: number, range: PriceRange): boolean {
  const run = runsOf(Math.max(1, n)).filter((r) => r.sectionId === sectionId && inRange(r.price, range)).sort((a, b) => b.ids.length - a.ids.length || rowNo(a) - rowNo(b))[0];
  if (!run) return false;
  const start = Math.floor((run.ids.length - n) / 2);
  reselect(run.ids.slice(start, start + n));
  return true;
}

/** Move the picked group one seat along its row ("seat"), or to the next or previous row of the same section and price ("row"). Returns false at an edge. */
export function nudge(axis: "seat" | "row", dir: -1 | 1): boolean {
  const st = useSeatmapStore.getState();
  const picked = st.selectedFromMap.map((g) => String(g.seatId));
  if (!base || picked.length === 0) return false;
  const n = picked.length;
  const runs = runsOf(n);
  const here = runs.find((r) => picked.every((id) => r.ids.includes(id)));
  if (!here) return false;
  if (axis === "seat") {
    const start = here.ids.indexOf(picked[0]) + dir;
    if (start < 0 || start + n > here.ids.length) return false;
    reselect(here.ids.slice(start, start + n));
    return true;
  }
  const mates = runs.filter((r) => r.sectionId === here.sectionId && r.price === here.price).sort((a, b) => rowNo(a) - rowNo(b));
  /* the nearest stretch in a different row: rows can break into several stretches where seats are taken, so "next" means the next row number, not the next stretch */
  const cur = rowNo(here);
  const beyond = mates.filter((r) => (dir > 0 ? rowNo(r) > cur : rowNo(r) < cur));
  const next = dir > 0 ? beyond[0] : beyond[beyond.length - 1];
  if (!next) return false;
  const start = Math.min(Math.max(0, here.ids.indexOf(picked[0])), next.ids.length - n);
  reselect(next.ids.slice(start, start + n));
  return true;
}
