import { describe, expect, it } from "vitest";
import {
  compareUpcomingEvents,
  groupUpcomingEvents,
  listPriorityRank,
} from "@/lib/upcomingEventOrder";

type Row = {
  title: string;
  listPriority?: number | string | null;
  tbd?: boolean;
  sortKey: number;
  monthKey: string;
  monthTitle: string;
};

const row = (title: string, sortKey: number, extra: Partial<Row> = {}): Row => ({
  title,
  sortKey,
  monthKey: "2026-11",
  monthTitle: "November 2026",
  ...extra,
});

const titles = (events: Row[]) => events.map((event) => event.title);

describe("compareUpcomingEvents", () => {
  it("lists ranked events first by priority, then date, with unranked events last", () => {
    const events = [
      row("later unranked", 300),
      row("priority two", 100, { listPriority: 2 }),
      row("early unranked", 50),
      row("priority one later", 400, { listPriority: 1 }),
      row("priority one earlier", 200, { listPriority: 1 }),
    ];

    expect(titles(events.slice().sort(compareUpcomingEvents))).toEqual([
      "priority one earlier",
      "priority one later",
      "priority two",
      "early unranked",
      "later unranked",
    ]);
  });

  it("treats blank and non-numeric priorities as unranked", () => {
    expect(listPriorityRank("")).toBe(Number.POSITIVE_INFINITY);
    expect(listPriorityRank(null)).toBe(Number.POSITIVE_INFINITY);
    expect(listPriorityRank("soon")).toBe(Number.POSITIVE_INFINITY);
    expect(listPriorityRank("3")).toBe(3);
  });

  it("keeps date order, with TBD first, when nothing is ranked", () => {
    const events = [
      row("dated", 200),
      row("tbd", Number.NEGATIVE_INFINITY, { tbd: true, monthKey: "tbd", monthTitle: "Date & Time TBD" }),
      row("earlier", 100),
    ];

    expect(titles(events.slice().sort(compareUpcomingEvents))).toEqual(["tbd", "earlier", "dated"]);
  });
});

describe("groupUpcomingEvents", () => {
  it("does not pull an unranked event up with a ranked event in the same month", () => {
    const aprilPriority = row("april priority", 400, {
      listPriority: 1,
      monthKey: "2026-04",
      monthTitle: "April 2026",
    });
    const march = row("march", 100, { monthKey: "2026-03", monthTitle: "March 2026" });
    const aprilUnranked = row("april unranked", 410, {
      monthKey: "2026-04",
      monthTitle: "April 2026",
    });

    const groups = groupUpcomingEvents(
      [aprilPriority, march, aprilUnranked].sort(compareUpcomingEvents),
    );

    expect(groups.map((group) => titles(group.rows))).toEqual([
      ["april priority"],
      ["march"],
      ["april unranked"],
    ]);
    expect(groups.map((group) => group.title)).toEqual(["April 2026", "March 2026", "April 2026"]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(3);
  });

  it("counts events per consecutive month group", () => {
    const groups = groupUpcomingEvents([
      row("a", 100, { monthKey: "2026-03", monthTitle: "March 2026" }),
      row("b", 200, { monthKey: "2026-04", monthTitle: "April 2026" }),
      row("c", 300, { monthKey: "2026-04", monthTitle: "April 2026" }),
    ]);

    expect(groups.map((group) => group.meta)).toEqual(["1 event", "2 events"]);
  });
});
