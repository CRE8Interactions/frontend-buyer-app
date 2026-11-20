"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SeasonScene from "../../[slug]/SeasonScene";
import type { Game } from "../../[slug]/SeasonGames";
import type { PriceRange } from "../../[slug]/SeasonSeatmap";
import type { Team } from "../../[slug]/teams";
import useSeatmapStore from "@/stores/seatmapStore";
import type { TicketGroup } from "@/stores/filtersStore";

/* TEST ONLY. The season seat scene (header, seat cards, dock) around the WebGL player. The player runs in a same-origin iframe with its own demo inventory.
   The bridge below copies the player's cart into the same seat store the scene already reads, so a seat picked on the map becomes a card, and a card removed
   (X or swipe) is taken out of the player's cart. Prices are the player's demo prices (cents), shown in dollars like the rest of the site. */

type Line = { key: string; type: "seat" | "ga"; sectionId: string; seatIds?: string[]; quantity: number; price: number };
type Tier = { id: string; price: number };
type Sec = { id: string; name: string; ga: boolean; killed?: boolean; rowIds: string[] };
type Api = {
  getState: () => { seats: number; cart: Line[] };
  map: () => { sections: Sec[]; rowById: Map<string, { seats: string[]; sectionId: string; number: string }>; seatById: Map<string, { number: string; rowNumber: string; sectionId: string }>; sectionById: Map<string, Sec> };
  store: () => { cart: Map<string, Line>; inventory: { offers: Record<string, { tiers: Tier[] }>; assignments: Record<string, string>; rules: Record<string, { groupSize: number }> }; status: (id: string) => string; unit: (id: string) => string[]; addSeat: (id: string, tier: string) => void };
  refresh: () => void;
  showSection: (id: string) => void;
  setContext?: (ctx: { seasonGames?: number }) => void;
  setPartySize?: (n: number) => void;
  setPriceRange?: (lo?: number, hi?: number) => void;
};

const GAMES: Game[] = Array.from({ length: 34 }, (_, i) => {
  const day = 7 + i * 5;
  const mo = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][Math.min(6, Math.floor(day / 31))];
  return { m: mo, d: (day % 28) + 1, dow: "Fri", time: "7:00 PM", title: `Niagara IceDogs home game ${i + 1}`, mono: "ID", at: day };
});

const frameApi = (f: HTMLIFrameElement | null) => (f?.contentWindow as (Window & { maps2d?: Api }) | null)?.maps2d;
const dollars = (cents: number) => cents / 100;
const lowTier = (a: Api, id: string) => { const o = a.store().inventory.offers[a.store().inventory.assignments[id]]; return o?.tiers[0]; };

export default function PlayerTest({ team }: { team: Team }) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [levels, setLevels] = useState<{ price: number; seats: number }[]>([]);
  const origin = useMemo(() => ({ x: 600, y: 700 }), []);

  /* the bridge: player cart -> seat store, and seat store removals -> player cart */
  useEffect(() => {
    let sig = "";
    let writing = false;
    const toGroups = (a: Api, cart: Line[]): TicketGroup[] => {
      const m = a.map();
      return cart.flatMap((l) => {
        const sec = m.sectionById.get(l.sectionId);
        if (l.type === "ga") return [{ GA: true, id: l.key, sectionId: l.sectionId, sectionName: sec?.name, quantity: l.quantity, price: dollars(l.price) } as TicketGroup];
        return (l.seatIds ?? []).map((id) => {
          const s = m.seatById.get(id);
          return { GA: false, id, seatId: id, seatNumber: s?.number, sectionId: l.sectionId, sectionName: sec?.name, rowName: s?.rowNumber, rowNumber: s?.rowNumber, price: dollars(l.price), quantity: 1 } as TicketGroup;
        });
      });
    };
    const tick = window.setInterval(() => {
      const a = frameApi(frame.current);
      if (!a) return;
      let st;
      try { st = a.getState(); } catch { return; }
      if (!st.seats) return;
      a.setContext?.({ seasonGames: GAMES.length });
      if (phase !== "ready") { a.setPartySize?.(partyRef.current); const r = rangeRef.current; if (r) a.setPriceRange?.(Math.round(r.lo * 100), Math.round(r.hi * 100)); }
      if (phase !== "ready") {
        setPhase("ready");
        const by = new Map<number, number>();
        const inv = a.store().inventory;
        for (const [id, o] of Object.entries(inv.assignments)) if (a.store().status(id) === "available" && inv.offers[o]?.tiers[0]) { const p = dollars(inv.offers[o].tiers[0].price); by.set(p, (by.get(p) ?? 0) + 1); }
        setLevels([...by.entries()].sort((x, y) => x[0] - y[0]).map(([price, seats]) => ({ price, seats })));
      }
      const next = JSON.stringify(st.cart.map((l) => [l.key, l.seatIds, l.quantity]));
      if (next === sig) return;
      sig = next;
      writing = true;
      useSeatmapStore.getState().setSelectedFromMap(toGroups(a, st.cart));
      writing = false;
    }, 250);
    const unsub = useSeatmapStore.subscribe((s, prev) => {
      if (writing || s.selectedFromMap === prev.selectedFromMap) return;
      const a = frameApi(frame.current);
      if (!a) return;
      const kept = new Set(s.selectedFromMap.map((g) => String(g.seatId ?? g.id)));
      const keptSections = new Set(s.selectedFromMap.filter((g) => g.GA).map((g) => String(g.sectionId)));
      let changed = false;
      for (const [key, l] of [...a.store().cart]) {
        const gone = l.type === "ga" ? !keptSections.has(l.sectionId) : (l.seatIds ?? []).some((id) => !kept.has(id));
        if (gone) { a.store().cart.delete(key); changed = true; }
      }
      if (changed) { sig = ""; a.refresh(); }
    });
    return () => { window.clearInterval(tick); unsub(); useSeatmapStore.getState().setSelectedFromMap([]); };
  }, [phase]);

  /* "Find the best": the tidiest run of open seats side by side (one price, no group rule) that is long enough, in the price range; its middle seats go in the cart */
  const findSeats = useCallback((party: number, range: PriceRange) => {
    const a = frameApi(frame.current);
    if (!a) return false;
    const m = a.map(), st = a.store();
    type Run = { ids: string[]; price: number; sectionId: string };
    const runs: Run[] = [];
    for (const row of m.rowById.values()) {
      if (m.sectionById.get(row.sectionId)?.ga || m.sectionById.get(row.sectionId)?.killed) continue;
      let cur: string[] = [], offer = "";
      const flush = () => { if (cur.length >= party) { const t = lowTier(a, cur[0]); if (t) runs.push({ ids: cur, price: dollars(t.price), sectionId: row.sectionId }); } cur = []; offer = ""; };
      for (const id of row.seats) {
        const o = st.inventory.assignments[id];
        const ok = o && st.status(id) === "available" && st.unit(id).length === 1;
        if (!ok) { flush(); continue; }
        if (cur.length && o !== offer) flush();
        offer = o; cur.push(id);
      }
      flush();
    }
    const best = runs.filter((r) => !range || (r.price >= range.lo && r.price <= range.hi)).sort((x, y) => x.ids.length - y.ids.length)[0];
    if (!best) return false;
    const start = Math.floor((best.ids.length - party) / 2);
    st.cart.clear();
    for (const id of best.ids.slice(start, start + party)) st.addSeat(id, lowTier(a, id)!.id);
    a.refresh();
    a.showSection(best.sectionId);
    return true;
  }, []);

  const partyRef = useRef(0);
  const rangeRef = useRef<PriceRange>(null);
  const onRange = useCallback((r: PriceRange) => {
    rangeRef.current = r;
    const a = frameApi(frame.current);
    if (r) a?.setPriceRange?.(Math.round(r.lo * 100), Math.round(r.hi * 100)); else a?.setPriceRange?.();
  }, []);
  const onParty = useCallback((n: number) => { partyRef.current = n; frameApi(frame.current)?.setPartySize?.(n); }, []);

  return (
    <SeasonScene
      team={team} games={GAMES} n={GAMES.length} phase={phase} levels={levels} maxSeats={8} origin={origin}
      venueName="Meridian Centre" onBack={() => router.push("/season-tickets")} onPay={() => window.alert("Checkout is not wired in this test.")}
      findSeats={findSeats}
      onParty={onParty}
      onRange={onRange}
      mapSlot={<iframe ref={frame} title="Choose your seats" src="/maps-2d/apps/experience/index.html" className="absolute inset-0 h-full w-full border-0" />}
    />
  );
}
