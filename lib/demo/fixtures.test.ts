import { describe, expect, it, vi } from "vitest";
import { DEMO_FIXTURES_NOW, demoDate } from "@/lib/demo/now";

/**
 * Demo mode builds these fixtures from the real clock, so the dates have to
 * stay current on their own. Each case restores the real clock and rebuilds the
 * modules — vitest.setup.ts pins both for every other suite.
 */
async function fixturesAtRealClock() {
  vi.useRealTimers();
  vi.resetModules();
  return import("@/lib/demo/fixtures");
}

describe("demo fixtures dating", () => {
  it("pins to the reference instant under test", () => {
    expect(demoDate({ days: 0 }, "12:00")).toBe(DEMO_FIXTURES_NOW);
  });

  it("keeps events on both sides of today so demo mode is never empty", async () => {
    const { DEMO_EVENTS } = await fixturesAtRealClock();
    const now = Date.now();
    const starts = DEMO_EVENTS.map((event) => new Date(event.start).getTime());

    expect(starts.filter((start) => start > now).length).toBeGreaterThan(0);
    expect(starts.filter((start) => start < now).length).toBeGreaterThan(0);

    // Tight enough to fail if the dates ever go back to fixed calendar days.
    const DAY = 24 * 60 * 60 * 1000;
    starts.forEach((start) => {
      expect(Math.abs(start - now)).toBeLessThan(45 * DAY);
    });
  });

  it("keeps season packages, flex packs, and access passes in the future", async () => {
    const { demoSeasonPackage, demoFlexPack, demoAccessPass } =
      await fixturesAtRealClock();
    const now = Date.now();

    const games = demoSeasonPackage().events;
    expect(
      games.filter((game) => new Date(game.start).getTime() > now).length,
    ).toBeGreaterThan(0);

    const pack = demoFlexPack();
    expect(new Date(pack.end).getTime()).toBeGreaterThan(now);

    const pass = demoAccessPass();
    expect(
      pass.events.filter((event) => new Date(event.start).getTime() > now)
        .length,
    ).toBeGreaterThan(0);
  });

  it("dates the latest order receipt in the past", async () => {
    const { demoCompletedTicketOrder } = await fixturesAtRealClock();
    const order = demoCompletedTicketOrder();

    expect(new Date(order.processedAt).getTime()).toBeLessThan(Date.now());
  });
});
