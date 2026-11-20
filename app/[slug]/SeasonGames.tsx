"use client";

import { useMemo } from "react";
import { SearchField } from "@/components/ui/search-field";
import type { Team } from "./teams";

/* The games every seat includes. One list, used on the page and in the games drawer on the seat map: a searchable list grouped by month, so it reads the same
   with one game or with sixty. */

export type Game = {
  /** month, three letters ("Nov") */ m: string;
  d: number; dow: string; time: string; title: string; img?: string; mono: string;
  /** a sortable day number across the season, used to place the game on the season strip */ at: number;
};

/* The games every seat includes are the team's own football games, read from the team's events (the storefront API when it answers, the design file's list otherwise). */
export const gamesOf = (team: Team): Game[] =>
  team.events
    .filter((e) => e.sport === "Football")
    .map((e) => ({ m: (team.months[e.m] ?? "").split(" ")[0].slice(0, 3), d: e.d, dow: e.dow, time: e.time, title: e.title, img: e.opp, mono: e.mono, at: e.m * 31 + e.d }))
    .sort((a, b) => a.at - b.at);

export function GamesList({ games, q, onQuery, total, compact }: { games: Game[]; q: string; onQuery: (v: string) => void; total: number; compact?: boolean }) {
  const shown = useMemo(() => games.filter((g) => `${g.title} ${g.m} ${g.dow}`.toLowerCase().includes(q.trim().toLowerCase())), [games, q]);
  const months = Array.from(new Set(shown.map((g) => g.m)));
  return (
    <div className="grid gap-3">
      {/* a search box only earns its place with a long season */}
      {games.length > 6 || q ? <SearchField variant="secondary" aria-label="Search the games" placeholder="Search opponent or month" value={q} onChange={(e) => onQuery(e.target.value)} shortcutKey="" shortcutLabel="" /> : null}
      <div className={compact ? "max-h-[calc(100svh-260px)] overflow-y-auto" : "overscroll-contain md:max-h-[min(560px,64svh)] md:overflow-y-auto"} role="list" aria-label="Games included with every season seat">
        {months.map((m) => {
          const rows = shown.filter((g) => g.m === m);
          return (
            <section key={m} className="mb-3 last:mb-0">
              <h3 className={`${compact ? "sticky top-0 z-[1]" : "md:sticky md:top-0 md:z-[1]"} px-1 py-1.5 text-[13px] font-medium uppercase tracking-[0.06em] text-h-muted ${compact ? "bg-h-overlay" : "bg-[var(--paper2)]"}`}>{m} · {rows.length} {rows.length === 1 ? "game" : "games"}</h3>
              {rows.map((g) => (
                <div role="listitem" key={g.at + g.title} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                  {g.img
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={g.img} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-[14px] object-cover" />
                    : <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-h-default text-sm font-semibold text-h-muted">{g.mono}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[15px] font-medium leading-snug">{g.title}</span>
                    <span className="block text-sm tabular-nums text-h-muted">{g.dow}, {g.m} {g.d} · {g.time}</span>
                  </span>
                </div>
              ))}
            </section>
          );
        })}
        {shown.length === 0 && <p className="px-1 py-8 text-center text-sm text-h-muted">No games match “{q}”. Try an opponent or a month.</p>}
      </div>
      <p className="sr-only" role="status">{shown.length === total ? `${total} games` : `${shown.length} of ${total} games`}</p>
    </div>
  );
}
