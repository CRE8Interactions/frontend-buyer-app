import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  demoCheckoutCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import {
  buildFlexPackSummaries,
  buildOrderEventDetails,
  buildSeasonPackageEventDetails,
  buildSeasonPackageSummaries,
  countFlexPacks,
  countSeasonPackages,
  summarizeCartEvents,
  summarizeEventDetails,
  walletEventScheduleLine,
} from "@/lib/cartEvents";

describe("cartEvents wallet schedule", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks an event as today in the venue timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00.000Z"));

    const cart = demoCheckoutCart();
    const [summary] = summarizeCartEvents(cart, cart.id);

    expect(summary.today).toBe(true);
    expect(walletEventScheduleLine(summary)).toMatch(/^Gates open · /);
    expect(walletEventScheduleLine(summary)).toContain("6:35 PM");
  });

  it("keeps the date line for events that are not today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T18:00:00.000Z"));

    const cart = demoCheckoutCart();
    const [summary] = summarizeCartEvents(cart, cart.id);

    expect(summary.today).toBe(false);
    expect(walletEventScheduleLine(summary)).toBe("Sat, Aug 15 · 7:35 PM");
  });
});

describe("wallet season-package orders", () => {
  const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG5")!;
  const pkg = demoSeasonPackage();

  it("keeps package orders off upcoming and lists them as season tickets", () => {
    const ticketOrder = demoCompletedTicketOrder({ event: icedogs });
    const packageOrder = demoCompletedPackageOrder();
    const orders = [ticketOrder, packageOrder];

    const upcoming = summarizeEventDetails(buildOrderEventDetails(orders));
    const season = buildSeasonPackageSummaries(orders);
    const packageGames = summarizeEventDetails(
      buildSeasonPackageEventDetails(orders),
    );

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].name).toBe(icedogs.name);
    expect(upcoming.some((row) => row.name === pkg.name)).toBe(false);
    expect(upcoming.some((row) => row.name === pkg.events[1].name)).toBe(false);
    expect(countSeasonPackages(orders)).toBe(1);
    expect(season[0].name).toBe(pkg.name);
    expect(season[0].eventCount).toBe(pkg.events.length);
    expect(season[0].ticketCount).toBe(packageOrder.tickets.length);
    expect(packageGames.map((row) => row.name)).toEqual(
      pkg.events.map((event) => event.name),
    );
  });

  it("does not list a single-event order as season tickets", () => {
    const ticketOrder = demoCompletedTicketOrder({ event: icedogs });

    expect(buildSeasonPackageSummaries([ticketOrder])).toEqual([]);
    expect(countSeasonPackages([ticketOrder])).toBe(0);
    expect(
      Object.keys(buildSeasonPackageEventDetails([ticketOrder])),
    ).toHaveLength(0);
  });
});

describe("wallet flex-pack orders", () => {
  it("lists a completed flex pack from its vouchers", () => {
    const order = demoCompletedFlexPackOrder();
    const pack = demoFlexPack();
    const rows = buildFlexPackSummaries([order]);

    expect(countFlexPacks([order])).toBe(1);
    expect(rows[0].name).toBe(pack.name);
    expect(rows[0].voucherCount).toBe(order.vouchers.length);
    expect(rows[0].remainingCount).toBe(order.vouchers.length);
    expect(rows[0].codes.map((voucher) => voucher.code)).toEqual(
      order.vouchers.map((voucher) => voucher.code),
    );
  });

  it("still lists vouchers when only the order has the flex pack", () => {
    const pack = demoFlexPack();
    const order = demoCompletedFlexPackOrder({
      vouchers: [
        { code: "868364", status: "active" },
        { code: "146459", status: "redeemed" },
      ],
      flex_pack: pack,
    });
    const rows = buildFlexPackSummaries([order]);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe(pack.name);
    expect(rows[0].remainingCount).toBe(1);
    expect(rows[0].codes[1].status).toBe("Redeemed");
  });

  it("lists a voucher-only order when the pack relation is missing", () => {
    const order = demoCompletedFlexPackOrder({
      flex_pack: null,
      vouchers: [
        { code: "868364", status: "active" },
        { code: "146459", status: "active" },
      ],
    });
    const rows = buildFlexPackSummaries([order]);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Flex pack");
    expect(rows[0].voucherCount).toBe(2);
  });

  it("does not list a single-event order as a flex pack", () => {
    const ticketOrder = demoCompletedTicketOrder();
    expect(buildFlexPackSummaries([ticketOrder])).toEqual([]);
    expect(countFlexPacks([ticketOrder])).toBe(0);
  });
});
