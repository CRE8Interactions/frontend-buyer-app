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
  formatCartOrderTotal,
  ticketEntryLine,
  summarizeCartEvents,
  summarizeEventDetails,
  walletEventScheduleLine,
  walletAccessPassPath,
  walletEventTicketsPath,
  walletFlexPackPath,
  walletPackageEventPath,
  walletPackagePath,
  walletRouteFromPath,
  withFullOrder,
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

describe("wallet order totals", () => {
  const upcoming = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
  const orderDetail = (total: unknown) =>
    Object.values(
      buildOrderEventDetails([
        demoCompletedTicketOrder({ event: upcoming, total }),
      ]),
    )[0];

  it("shows the amount paid when the order total is a decimal string", () => {
    expect(formatCartOrderTotal(orderDetail("129.50").cartTotal)).toBe(
      "$129.50",
    );
  });

  it("falls back to a dash when the order has no total", () => {
    expect(formatCartOrderTotal(orderDetail(null).cartTotal)).toBe("—");
  });

  it("takes the amount paid and buyer name from a fetched order", () => {
    const detail = withFullOrder(orderDetail(null), {
      total: "452.2",
      firstName: "jaime",
      lastName: "convery",
    });

    expect(formatCartOrderTotal(detail.cartTotal)).toBe("$452.20");
    expect(detail.tickets.every((t) => t.holder === "Jaime Convery")).toBe(true);
  });

  it("leaves the listed order alone when there is nothing to fetch", () => {
    const listed = orderDetail("129.50");

    expect(withFullOrder(listed, null)).toEqual(listed);
  });

  it("takes category and org branding from a fetched order", () => {
    const listed = orderDetail("129.50");
    const thin = {
      ...listed,
      event: { uuid: upcoming.uuid, name: upcoming.name },
    };
    const detail = withFullOrder(thin, {
      event: {
        ...upcoming,
        category: { name: "sports" },
        organization: {
          ...upcoming.organization,
          branding: {
            ...upcoming.organization.branding,
            primaryColor: "#861F41",
          },
        },
      },
    });

    expect(detail.event?.category?.name).toBe("sports");
    expect(detail.event?.organization?.branding?.primaryColor).toBe("#861F41");
  });

  it("keeps the listed event uuid when the fetched order event omits it", () => {
    const listed = orderDetail("129.50");
    const detail = withFullOrder(
      {
        ...listed,
        event: { uuid: upcoming.uuid, name: upcoming.name },
      },
      {
        event: {
          name: upcoming.name,
          category: { name: "sports" },
        },
      },
    );

    expect(detail.event?.uuid).toBe(upcoming.uuid);
  });
});

describe("ticket entry line", () => {
  const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
  const ticket = demoCompletedTicketOrder({ event }).tickets[0];

  it("shows the entry gate with the venue", () => {
    expect(ticketEntryLine(ticket, event.venue.name, event)).toBe(
      `Enter at ${event.entryGate} · ${event.venue.name}`,
    );
  });

  it("hides the line when the ticket and event have no entry gate", () => {
    const icedogs = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    expect(ticketEntryLine(ticket, icedogs.venue.name, icedogs)).toBe("");
  });
});

describe("wallet season-package orders", () => {
  const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG5")!;
  const upcomingEvent = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
  const pkg = demoSeasonPackage();

  it("keeps package orders off upcoming and lists them as season tickets", () => {
    const ticketOrder = demoCompletedTicketOrder({ event: upcomingEvent });
    const packageOrder = demoCompletedPackageOrder();
    const orders = [ticketOrder, packageOrder];

    const upcoming = summarizeEventDetails(buildOrderEventDetails(orders));
    const season = buildSeasonPackageSummaries(orders);
    const packageGames = summarizeEventDetails(
      buildSeasonPackageEventDetails(orders),
    );

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].name).toBe(upcomingEvent.name);
    expect(upcoming[0].eventUUID).toBe(upcomingEvent.uuid);
    expect(upcoming[0].orderId).toBe(ticketOrder.orderId);
    expect(
      walletEventTicketsPath(upcoming[0].orderId),
    ).toBe(
      `/wallet/my-tickets/order/${ticketOrder.orderId}/`,
    );
    expect(upcoming.some((row) => row.name === pkg.name)).toBe(false);
    expect(upcoming.some((row) => row.name === pkg.events[1].name)).toBe(false);
    expect(countSeasonPackages(orders)).toBe(1);
    expect(season[0].name).toBe(pkg.name);
    expect(season[0].orderId).toBe(packageOrder.orderId);
    expect(season[0].packageUUID).toBe(pkg.uuid);
    expect(season[0].key).toBe(packageOrder.orderId);
    expect(walletPackagePath(season[0].orderId, season[0].packageUUID)).toBe(
      `/wallet/my-tickets/order/${packageOrder.orderId}/package/${pkg.uuid}/`,
    );
    expect(
      walletPackageEventPath(
        season[0].orderId,
        season[0].packageUUID,
        packageGames[0].eventUUID,
      ),
    ).toBe(
      `/wallet/my-tickets/order/${packageOrder.orderId}/package/${pkg.uuid}/event/${packageGames[0].eventUUID}/`,
    );
    expect(season[0].eventCount).toBe(pkg.events.length);
    expect(season[0].ticketCount).toBe(packageOrder.tickets.length);
    expect(packageGames.map((row) => row.name)).toEqual(
      pkg.events.map((event) => event.name),
    );
  });

  it("takes the matching package event category from a fetched order", () => {
    const listed = Object.values(
      buildSeasonPackageEventDetails([demoCompletedPackageOrder()]),
    )[0];
    const detail = withFullOrder(listed, {
      package: {
        events: [
          {
            ...listed.event,
            category: { name: "sports" },
          },
        ],
      },
    });

    expect(detail.event?.category?.name).toBe("sports");
  });

  it("does not list a single-event order as season tickets", () => {
    const ticketOrder = demoCompletedTicketOrder({ event: icedogs });

    expect(buildSeasonPackageSummaries([ticketOrder])).toEqual([]);
    expect(countSeasonPackages([ticketOrder])).toBe(0);
    expect(
      Object.keys(buildSeasonPackageEventDetails([ticketOrder])),
    ).toHaveLength(0);
  });

  it("marks past and fully transferred package events as unavailable", () => {
    const order = demoCompletedPackageOrder();
    const [pastEvent, activeEvent, transferredEvent] = pkg.events;
    const events = [
      { ...pastEvent, start: "2020-08-15T23:00:00.000Z", status: "complete" },
      activeEvent,
      transferredEvent,
    ];
    const tickets = events.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
        ...(event.uuid === transferredEvent.uuid
          ? { transferStatus: "transferred" }
          : {}),
      })),
    );
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events },
      tickets,
    });

    const rows = summarizeEventDetails(
      buildSeasonPackageEventDetails([packageOrder]),
    );

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.eventUUID === pastEvent.uuid)?.availability).toBe(
      "past",
    );
    expect(rows.find((row) => row.eventUUID === activeEvent.uuid)?.availability).toBe(
      "available",
    );
    expect(
      rows.find((row) => row.eventUUID === transferredEvent.uuid)?.availability,
    ).toBe("transferred");

    const oneTransferredTicket = tickets.map((ticket, index) =>
      ticket.eventUUID === transferredEvent.uuid && index === tickets.length - 1
        ? { ...ticket, transferStatus: undefined }
        : ticket,
    );
    const partialRows = summarizeEventDetails(
      buildSeasonPackageEventDetails([
        demoCompletedPackageOrder({
          package: { ...order.package, events },
          tickets: oneTransferredTicket,
        }),
      ]),
    );
    expect(
      partialRows.find((row) => row.eventUUID === transferredEvent.uuid)
        ?.availability,
    ).toBe("available");
  });

  it("does not build a wallet event path without an order id", () => {
    expect(walletEventTicketsPath("")).toBe("");
    expect(walletEventTicketsPath(undefined)).toBe("");
    expect(walletPackagePath("", pkg.uuid)).toBe("");
    expect(walletPackageEventPath("order-1", pkg.uuid, "")).toBe("");
    expect(walletPackageEventPath("order-1", "", icedogs.uuid)).toBe("");
    expect(walletAccessPassPath("order-1", "")).toBe("");
  });
});

describe("wallet flex-pack orders", () => {
  it("lists a completed flex pack from its vouchers", () => {
    const order = demoCompletedFlexPackOrder();
    const pack = demoFlexPack();
    const rows = buildFlexPackSummaries([order]);

    expect(countFlexPacks([order])).toBe(1);
    expect(rows[0].name).toBe(pack.name);
    expect(rows[0].flexPackUUID).toBe(pack.uuid);
    expect(rows[0].orderId).toBe(order.orderId);
    expect(walletFlexPackPath(rows[0].orderId, rows[0].flexPackUUID)).toBe(
      `/wallet/my-tickets/order/${order.orderId}/flex-pack/${pack.uuid}/`,
    );
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
    expect(rows[0].flexPackUUID).toBeUndefined();
    expect(walletFlexPackPath(rows[0].orderId, rows[0].flexPackUUID)).toBe("");
    expect(rows[0].voucherCount).toBe(2);
  });

  it("keeps two purchases of the same flex pack on separate orders", () => {
    const pack = demoFlexPack();
    const first = demoCompletedFlexPackOrder();
    const second = demoCompletedFlexPackOrder({
      id: 128199,
      orderId: "1474-145929-3999",
    });
    const rows = buildFlexPackSummaries([first, second]);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.orderId).sort()).toEqual(
      [first.orderId, second.orderId].sort(),
    );
    expect(walletFlexPackPath(second.orderId, pack.uuid)).toBe(
      `/wallet/my-tickets/order/${second.orderId}/flex-pack/${pack.uuid}/`,
    );
  });

  it("does not build a wallet flex-pack path without a pack UUID", () => {
    expect(walletFlexPackPath("order-1", "")).toBe("");
    expect(walletFlexPackPath(undefined, "flex-1")).toBe("");
  });

  it("reads order id and object UUIDs from the nested wallet URLs", () => {
    const pack = demoFlexPack();
    const pkg = demoSeasonPackage();
    const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG5")!;
    const orderId = "1474-023249-8851";
    expect(walletRouteFromPath("/wallet/my-tickets/")).toEqual({});
    expect(walletRouteFromPath(`/wallet/my-tickets/${icedogs.uuid}/`)).toEqual({});
    expect(
      walletRouteFromPath(`/wallet/my-tickets/order/${orderId}/`),
    ).toEqual({
      orderId,
    });
    expect(
      walletRouteFromPath(
        `/wallet/my-tickets/order/${orderId}/flex-pack/${pack.uuid}/`,
      ),
    ).toEqual({
      orderId,
      flexPackUUID: pack.uuid,
    });
    expect(
      walletRouteFromPath(
        `/wallet/my-tickets/order/${orderId}/package/${pkg.uuid}/`,
      ),
    ).toEqual({
      orderId,
      packageUUID: pkg.uuid,
    });
    expect(
      walletRouteFromPath(
        `/wallet/my-tickets/order/${orderId}/package/${pkg.uuid}/event/${icedogs.uuid}/`,
      ),
    ).toEqual({
      orderId,
      eventUUID: icedogs.uuid,
      packageUUID: pkg.uuid,
    });
    expect(walletRouteFromPath(`/wallet/package/${pkg.uuid}/`)).toEqual({});
    expect(walletAccessPassPath(orderId, "access-pass-1")).toBe(
      `/wallet/my-tickets/order/${orderId}/access-pass/access-pass-1/`,
    );
    expect(
      walletRouteFromPath(
        `/wallet/my-tickets/order/${orderId}/access-pass/access-pass-1/`,
      ),
    ).toEqual({
      orderId,
      accessPassUUID: "access-pass-1",
    });
  });

  it("does not list a single-event order as a flex pack", () => {
    const ticketOrder = demoCompletedTicketOrder();
    expect(buildFlexPackSummaries([ticketOrder])).toEqual([]);
    expect(countFlexPacks([ticketOrder])).toBe(0);
  });
});
