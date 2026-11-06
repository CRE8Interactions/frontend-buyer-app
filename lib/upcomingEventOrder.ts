import { monthEventCountLabel } from "@/lib/eventFromPrice";

/**
 * Upcoming-event ordering for the organization and venue storefronts.
 * Events with a listPriority rank ahead of the rest. Lower numbers come first.
 */

export type UpcomingEventSortable = {
  listPriority?: unknown;
  tbd?: boolean;
  sortKey: number;
};

export type UpcomingEventGroupable = {
  monthKey: string;
  monthTitle?: string;
};

export type UpcomingEventGroup<T> = {
  key: string;
  monthKey: string;
  title: string;
  meta: string;
  rows: T[];
};

/** Missing, blank, or non-numeric ranks sort after every ranked event. */
export function listPriorityRank(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return Number.POSITIVE_INFINITY;
  }
  const rank = Number(value);
  return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY;
}

export function compareUpcomingEvents(
  a: UpcomingEventSortable,
  b: UpcomingEventSortable,
): number {
  const aRank = listPriorityRank(a.listPriority);
  const bRank = listPriorityRank(b.listPriority);
  // Subtracting infinities is NaN, which would drop the date tie-break.
  if (aRank !== bRank) return aRank < bRank ? -1 : 1;
  if (Boolean(a.tbd) !== Boolean(b.tbd)) return a.tbd ? -1 : 1;
  return a.sortKey - b.sortKey;
}

/**
 * Group only consecutive rows that share a month, so a later-month priority
 * event can sit above earlier events without pulling its whole month along.
 */
export function groupUpcomingEvents<T extends UpcomingEventGroupable>(
  rows: T[],
): UpcomingEventGroup<T>[] {
  const groups: UpcomingEventGroup<T>[] = [];
  rows.forEach((row) => {
    const last = groups[groups.length - 1];
    if (last && last.monthKey === row.monthKey) {
      last.rows.push(row);
      last.meta = monthEventCountLabel(last.rows.length);
      return;
    }
    groups.push({
      key: `${row.monthKey}-${groups.length}`,
      monthKey: row.monthKey,
      title: row.monthTitle || row.monthKey,
      meta: monthEventCountLabel(1),
      rows: [row],
    });
  });
  return groups;
}
