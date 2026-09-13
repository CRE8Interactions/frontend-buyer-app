import { afterEach, describe, expect, it, vi } from "vitest";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import {
  DEMO_EVENTS,
  DEMO_SEATED_TICKET_GROUPS,
  demoCheckoutCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoSeasonPackage,
  DEMO_USER,
} from "@/lib/demo/fixtures";
import { demoDate } from "@/lib/demo/now";
import {
  buildFlexPackSummaries,
  buildOrderEventDetails,
  buildSeasonPackageEventDetails,
  buildSeasonPackageSummaries,
  buildWalletEventDetails,
  countFlexPacks,
  countSeasonPackages,
  formatCartOrderTotal,
  formatSeasonPassHolderName,
  isIncomingTransferTicket,
  isPendingTransferTicket,
  isTransferReceivedDetail,
  isTransferReceivedOrder,
  isTransferredTicket,
  orderAcquiredLabel,
  markTicketsPendingTransferInDetails,
  mergePendingTransferWalletDetails,
  packageOrderHasTicketTransfers,
  removeTicketsFromWalletDetails,
  reconcilePendingReceivedTransfers,
  reconcilePendingSentTransfers,
  pruneTransferredWalletDetails,
  walletEventAvailabilityBadge,
  sortWalletEventSchedule,
  sortWalletUpcomingEvents,
  summarizeUpcomingWalletEvents,
  ticketEntryLine,
  summarizeCartEvents,
  summarizeEventDetails,
  walletEventScheduleLine,
  walletAccessPassPath,
  walletEventTicketsPath,
  walletFlexPackPath,
  walletPackageEventPath,
  walletPackagePath,
  eventWalletCommerceFlags,
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

  it("rebuilds home and visitor cards when a fetched order adds sporting category", () => {
    const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG1")!;
    const thinEvent = {
      ...icedogs,
      start: demoDate({ days: 5 }, "19:00"),
      category: undefined,
      organization: {
        ...icedogs.organization,
        category: undefined,
      },
      attractions: [icedogs.attractions![0]],
    };
    const listed = Object.values(
      buildOrderEventDetails([demoCompletedTicketOrder({ event: thinEvent })]),
    )[0];
    expect(listed.attractions).toEqual([
      expect.objectContaining({ role: "Featured" }),
    ]);

    const detail = withFullOrder(listed, {
      event: {
        ...thinEvent,
        category: { name: "sports" },
      },
    });

    expect(detail.attractions).toEqual([
      expect.objectContaining({
        name: "Niagara IceDogs",
        role: "Home",
      }),
      expect.objectContaining({
        name: "Visitor",
        role: "Visitor",
      }),
    ]);
    expect(detail.posterSrc).toBeUndefined();
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

describe("wallet ticket seat order", () => {
  const upcoming = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

  it("lists seats in ascending order when the API returns them reversed", () => {
    const [first, second] = demoCheckoutCart({ ticketCount: 2 }).tickets;
    const detail = Object.values(
      buildOrderEventDetails([
        demoCompletedTicketOrder({
          event: upcoming,
          tickets: [second, first],
        }),
      ]),
    )[0];

    expect(detail.tickets.map((ticket) => ticket.seat)).toEqual([
      `Sec ${first.sectionNumber} · Row ${first.rowNumber} · Seat ${first.seatNumber}`,
      `Sec ${second.sectionNumber} · Row ${second.rowNumber} · Seat ${second.seatNumber}`,
    ]);
  });

  it("lists the lower row first when seat numbers match", () => {
    const [first, second] = demoCheckoutCart({ ticketCount: 2 }).tickets;
    const lowerRow = DEMO_SEATED_TICKET_GROUPS[3].rowNumber;
    const higherRow = DEMO_SEATED_TICKET_GROUPS[1].rowNumber;
    const detail = Object.values(
      buildOrderEventDetails([
        demoCompletedTicketOrder({
          event: upcoming,
          tickets: [
            {
              ...second,
              rowNumber: higherRow,
              seatNumber: first.seatNumber,
            },
            {
              ...first,
              rowNumber: lowerRow,
              seatNumber: first.seatNumber,
            },
          ],
        }),
      ]),
    )[0];

    expect(detail.tickets.map((ticket) => ticket.seat)).toEqual([
      `Sec ${first.sectionNumber} · Row ${lowerRow} · Seat ${first.seatNumber}`,
      `Sec ${first.sectionNumber} · Row ${higherRow} · Seat ${first.seatNumber}`,
    ]);
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
    expect(season[0].holderName).toBe(
      formatSeasonPassHolderName(packageOrder),
    );
    expect(season[0].firstEvent?.uuid).toBe(pkg.events[0].uuid);
    expect(packageGames.map((row) => row.name)).toEqual(
      pkg.events.map((event) => event.name),
    );
  });

  it("formats the season-pass holder like Joe D.", () => {
    expect(
      formatSeasonPassHolderName({ firstName: "jaime", lastName: "convery" }),
    ).toBe("Jaime C.");
    expect(formatSeasonPassHolderName({ firstName: "JOE", lastName: "doe" })).toBe(
      "Joe D.",
    );
    expect(
      formatSeasonPassHolderName(demoCompletedPackageOrder()),
    ).toBe(`${DEMO_USER.firstName} ${DEMO_USER.lastName.charAt(0)}.`);
    expect(formatSeasonPassHolderName({}, { email: DEMO_USER.email })).toBe(
      "fan",
    );
    expect(formatSeasonPassHolderName(null, null)).toBe("");
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

  it("drops completed events from wallet summaries even when availability is wrong", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const details = buildOrderEventDetails([
      demoCompletedTicketOrder({
        event: { ...event, status: "complete" },
      }),
    ]);

    expect(summarizeEventDetails(details)).toEqual([]);
  });

  it("keeps completed package games on the schedule but off upcoming", () => {
    const order = demoCompletedPackageOrder();
    const [pastEvent, activeEvent] = pkg.events;
    const events = [
      { ...pastEvent, status: "complete" },
      activeEvent,
    ];
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events },
      tickets: events.flatMap((event) =>
        order.tickets.map((ticket) => ({
          ...ticket,
          id: `${ticket.id}-${event.uuid}`,
          eventUUID: event.uuid,
        })),
      ),
    });
    const details = buildSeasonPackageEventDetails([packageOrder]);

    expect(summarizeEventDetails(details)).toHaveLength(1);
    expect(summarizeEventDetails(details, "schedule")).toHaveLength(2);
    expect(
      summarizeEventDetails(details, "schedule").find(
        (row) => row.eventUUID === pastEvent.uuid,
      )?.availability,
    ).toBe("past");
  });

  it("marks package events transferred when all tickets are pending transfer", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const tickets = order.tickets.map((ticket) => ({
      ...ticket,
      eventUUID: activeEvent.uuid,
      transferStatus: "pending",
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [activeEvent] },
      tickets,
    });

    const rows = summarizeEventDetails(
      pruneTransferredWalletDetails(
        buildSeasonPackageEventDetails([packageOrder]),
      ),
      "schedule",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.availability).toBe("transferred");
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
      "schedule",
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
      "schedule",
    );
    expect(
      partialRows.find((row) => row.eventUUID === transferredEvent.uuid)
        ?.availability,
    ).toBe("available");
  });

  it("counts played package games on the wallet card", () => {
    const order = demoCompletedPackageOrder();
    const events = [
      { ...pkg.events[0], start: "2020-08-15T23:00:00.000Z", status: "complete" },
      ...pkg.events.slice(1),
    ];
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events },
    });

    expect(buildSeasonPackageSummaries([packageOrder])[0]?.eventCount).toBe(
      events.length,
    );
  });

  it("keeps package events with no tickets left on the schedule only", () => {
    const order = demoCompletedPackageOrder();
    const [, ticketedEvent, transferredEvent] = pkg.events;
    const endedEvent = {
      ...pkg.events[3],
      start: "2020-08-15T23:00:00.000Z",
      status: "complete",
    };
    const packageOrder = demoCompletedPackageOrder({
      package: {
        ...order.package,
        events: [ticketedEvent, transferredEvent, endedEvent],
      },
      tickets: order.tickets.map((ticket) => ({
        ...ticket,
        eventUUID: ticketedEvent.uuid,
      })),
    });
    const details = pruneTransferredWalletDetails(
      buildSeasonPackageEventDetails([packageOrder]),
    );

    const rows = summarizeEventDetails(details, "schedule");
    const rowFor = (uuid?: string) =>
      rows.find((row) => row.eventUUID === uuid);

    expect(rows).toHaveLength(3);
    expect(rowFor(ticketedEvent.uuid)?.availability).toBe("available");
    expect(rowFor(transferredEvent.uuid)?.availability).toBe("transferred");
    expect(rowFor(transferredEvent.uuid)?.ticketCount).toBe(0);
    expect(rowFor(endedEvent.uuid)?.availability).toBe("past");
    expect(summarizeUpcomingWalletEvents(details)).toEqual([]);
  });

  it("sorts upcoming wallet events with today first, then soonest start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T18:00:00.000Z"));

    const baseEvent = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const todayEvent = {
      ...baseEvent,
      start: "2026-08-15T23:00:00.000Z",
      doorsOpen: "2026-08-15T22:00:00.000Z",
    };
    const laterEvent = {
      ...baseEvent,
      uuid: "evt-later-game",
      name: "Later Game",
      start: "2026-09-19T23:00:00.000Z",
      doorsOpen: "2026-09-19T22:00:00.000Z",
    };
    const details = {
      ...buildOrderEventDetails([
        demoCompletedTicketOrder({ event: laterEvent }),
        demoCompletedTicketOrder({
          event: todayEvent,
          orderId: "1474-later-order",
          id: 9999,
        }),
      ]),
    };

    const sorted = sortWalletUpcomingEvents(
      summarizeEventDetails(details, "upcoming"),
      details,
    );

    expect(sorted.map((row) => row.name)).toEqual([
      todayEvent.name,
      laterEvent.name,
    ]);
  });

  it("sorts season package games by event start", () => {
    const order = demoCompletedPackageOrder();
    const details = buildSeasonPackageEventDetails([order]);
    const reversed = Object.fromEntries(
      Object.entries(details).reverse(),
    );

    const sorted = sortWalletEventSchedule(
      summarizeEventDetails(reversed, "schedule"),
      details,
    );

    expect(sorted.map((row) => row.name)).toEqual(
      summarizeEventDetails(details, "schedule").map((row) => row.name),
    );
  });

  it("labels transfer-sourced orders and incoming transfer details as Transferred", () => {
    const order = demoCompletedTicketOrder({ source: "transfer" });
    const purchased = demoCompletedTicketOrder({ source: "website" });
    const incomingDetail = {
      key: "incoming:test",
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        seat: "Sec A · Row 1 · Seat 1",
        holder: "recipient@example.com",
        code: String(ticket.checkInCode || ticket.id),
        raw: {
          ...ticket,
          ticketTransfer: { direction: "incoming", status: "pending" },
        },
      })),
      pendingIncomingTransfer: true,
      incomingTransferId: "incoming-1",
    };
    const purchasedDetail = Object.values(buildOrderEventDetails([purchased]))[0]!;

    expect(isTransferReceivedOrder(order)).toBe(true);
    expect(
      isTransferReceivedOrder(
        demoCompletedTicketOrder({ source: "ticket_assignment" }),
      ),
    ).toBe(false);
    expect(isTransferReceivedOrder(purchased)).toBe(false);
    expect(isTransferReceivedDetail(incomingDetail)).toBe(true);
    expect(orderAcquiredLabel(incomingDetail, order)).toBe("Transferred");
    expect(orderAcquiredLabel(purchasedDetail, purchased)).toBe("Purchased");
    expect(
      isIncomingTransferTicket({
        ticketTransfer: { direction: "incoming", status: "claimed" },
      }),
    ).toBe(true);
  });

  it("treats transferred flags as pending while a transfer is still open", () => {
    const ticket = {
      id: 9001,
      transferred: true,
      transferredAt: "2026-09-10T18:00:00.000Z",
      transferStatus: "pending",
    };

    expect(isPendingTransferTicket(ticket)).toBe(true);
    expect(isTransferredTicket(ticket)).toBe(false);
  });

  it("drops pending-transfer tickets from the sender wallet after refresh", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;
    const previous = buildOrderEventDetails([order]);
    const key = Object.keys(previous)[0]!;
    const refreshed = buildOrderEventDetails([
      {
        ...order,
        tickets: order.tickets.slice(1),
      },
    ]);
    const removed = removeTicketsFromWalletDetails(previous, [
      transferredTicket.id,
    ]);

    const merged = mergePendingTransferWalletDetails(refreshed, removed);
    const seats = merged[key]?.tickets.map((ticket) => ticket.id);

    expect(seats).toEqual(order.tickets.slice(1).map((ticket) => ticket.id));
    expect(merged[key]?.availability).toBe("available");
  });

  it("adds pending received transfers to upcoming wallet details", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;

    const merged = reconcilePendingReceivedTransfers(
      {},
      [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
      "recipient@example.com",
    );
    const key = `incoming:${event.uuid}`;
    const upcoming = summarizeEventDetails(merged);

    expect(Object.keys(merged)).toEqual([key]);
    expect(merged[key]?.tickets).toHaveLength(1);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.name).toBe(event.name);
    expect(upcoming[0]?.ticketCount).toBe(1);
    expect(upcoming[0]?.pendingIncomingTransfer).toBe(true);
    expect(upcoming[0]?.incomingTransferId).toBe("incoming-1");
    expect(upcoming[0]?.incomingTransferFrom).toBe("m.rivera@example.com");
  });

  it("adds pending package event transfers to upcoming wallet details", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [activeEvent] },
      tickets: [ticket],
    });

    const wallet = buildWalletEventDetails([packageOrder], "sender@example.com", {
      incomingTransfers: [
        {
          id: "incoming-package-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          tickets: [ticket],
        },
      ],
    });

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.name).toBe(activeEvent.name);
    expect(wallet.upcomingEvents[0]?.pendingIncomingTransfer).toBe(true);
    expect(wallet.upcomingEvents[0]?.incomingTransferFrom).toBe(
      "m.rivera@example.com",
    );
  });

  it("does not surface cancelled incoming transfers in upcoming", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;

    const wallet = buildWalletEventDetails([], "recipient@example.com", {
      incomingTransfers: [
        {
          id: "incoming-cancelled",
          status: "cancelled",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    });

    expect(wallet.upcomingEvents).toEqual([]);
    expect(Object.keys(wallet.allDetails)).toEqual([]);
  });

  it("keeps owned package games off upcoming while reconciling transfers", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ownedTicket, incomingTicket] = order.tickets.map((row, index) => ({
      ...row,
      id: row.id + index,
      eventUUID: activeEvent.uuid,
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [activeEvent] },
      tickets: [ownedTicket],
    });

    const wallet = buildWalletEventDetails([packageOrder], "holder@example.com", {
      incomingTransfers: [
        {
          id: "incoming-package-2",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: activeEvent,
          tickets: [incomingTicket],
        },
      ],
    });

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.pendingIncomingTransfer).toBe(true);
    expect(
      wallet.upcomingEvents.some((row) => row.name === activeEvent.name && !row.pendingIncomingTransfer),
    ).toBe(false);
  });

  it("does not duplicate a single pending incoming transfer in upcoming", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;
    const transfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      event: order.event,
      tickets: [ticket],
    };

    const merged = reconcilePendingReceivedTransfers(
      {},
      [transfer, transfer],
      "recipient@example.com",
    );
    const upcoming = summarizeEventDetails(merged);

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.ticketCount).toBe(1);
  });

  it("sorts pending transfers before normal upcoming events", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ownedTicket, incomingTicket] = order.tickets;
    const walletDetails = buildOrderEventDetails(
      [{ ...order, tickets: [ownedTicket] }],
      "recipient@example.com",
    );

    const merged = reconcilePendingReceivedTransfers(
      walletDetails,
      [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [incomingTicket],
        },
      ],
      "recipient@example.com",
    );
    const upcoming = summarizeEventDetails(merged);
    const pendingIndex = upcoming.findIndex((row) => row.pendingIncomingTransfer);
    const normalIndex = upcoming.findIndex((row) => !row.pendingIncomingTransfer);

    expect(pendingIndex).toBeGreaterThanOrEqual(0);
    expect(normalIndex).toBeGreaterThanOrEqual(0);
    expect(pendingIndex).toBeLessThan(normalIndex);
  });

  it("sorts pending sent transfer stubs with normal upcoming events by date", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;
    const wallet = buildOrderEventDetails([
      { ...order, tickets: [remainingTicket] },
    ]);

    const merged = reconcilePendingSentTransfers(
      wallet,
      [
        {
          status: "pending",
          orderId: order.orderId,
          event: order.event,
          tickets: [transferredTicket],
        },
      ],
      order.email,
    );
    const upcoming = summarizeEventDetails(merged);
    const sentIndex = upcoming.findIndex((row) => row.key.startsWith("sent:"));
    const ownedIndex = upcoming.findIndex((row) => !row.key.startsWith("sent:"));

    expect(sentIndex).toBeGreaterThanOrEqual(0);
    expect(ownedIndex).toBeGreaterThanOrEqual(0);
    expect(upcoming[sentIndex]?.pendingIncomingTransfer).toBeFalsy();
    expect(upcoming[ownedIndex]?.pendingIncomingTransfer).toBeFalsy();
  });

  it("keeps owned events separate from incoming pending transfers for the same event", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ownedTicket, incomingTicket] = order.tickets;
    const walletDetails = buildOrderEventDetails(
      [{ ...order, tickets: [ownedTicket] }],
      "recipient@example.com",
    );

    const merged = reconcilePendingReceivedTransfers(
      walletDetails,
      [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [incomingTicket],
        },
      ],
      "recipient@example.com",
    );
    const upcoming = summarizeEventDetails(merged);

    expect(Object.keys(merged)).toHaveLength(2);
    expect(upcoming).toHaveLength(2);
    expect(upcoming.some((row) => row.pendingIncomingTransfer)).toBe(true);
    expect(upcoming.some((row) => !row.pendingIncomingTransfer)).toBe(true);
  });

  it("removes claimed sent transfers from the sender upcoming wallet", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;
    const wallet = buildOrderEventDetails([{ ...order, tickets: [] }]);

    const withPending = reconcilePendingSentTransfers(
      wallet,
      [
        {
          status: "pending",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
        },
      ],
      order.email,
    );
    expect(summarizeEventDetails(withPending)).toHaveLength(1);

    const afterClaim = reconcilePendingSentTransfers(
      wallet,
      [
        {
          status: "claimed",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
        },
      ],
      order.email,
    );
    const pruned = pruneTransferredWalletDetails(afterClaim);

    expect(summarizeEventDetails(pruned)).toHaveLength(0);
  });

  it("keeps remaining sender tickets after a partial transfer is claimed", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;
    const wallet = buildOrderEventDetails([
      { ...order, tickets: [remainingTicket] },
    ]);

    const pruned = pruneTransferredWalletDetails(
      reconcilePendingSentTransfers(
        wallet,
        [
          {
            status: "claimed",
            orderId: order.orderId,
            event: order.event,
            tickets: [transferredTicket],
          },
        ],
        order.email,
      ),
    );
    const upcoming = summarizeEventDetails(pruned);

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.ticketCount).toBe(1);
  });

  it("removes a fully transferred single event from upcoming", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket] = order.tickets;
    const wallet = buildWalletEventDetails(
      [{ ...order, tickets: [transferredTicket] }],
      order.email,
      {
        sentTransfers: [
          {
            status: "pending",
            orderId: order.orderId,
            event: order.event,
            tickets: [{ ...transferredTicket, transferStatus: "pending" }],
          },
        ],
      },
    );

    expect(wallet.upcomingEvents).toHaveLength(0);
    expect(
      Object.keys(wallet.allDetails).some((key) => key.startsWith("sent:")),
    ).toBe(false);
  });

  it("keeps only remaining tickets after a partial transfer reload", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;
    const wallet = buildWalletEventDetails(
      [{ ...order, tickets: [remainingTicket] }],
      order.email,
      {
        sentTransfers: [
          {
            status: "pending",
            orderId: order.orderId,
            event: order.event,
            tickets: [transferredTicket],
          },
        ],
      },
    );

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
    expect(wallet.upcomingEvents[0]?.key.startsWith("sent:")).toBe(false);
  });

  it("removes pending sent tickets from the owned upcoming row", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;
    const wallet = buildOrderEventDetails([
      { ...order, tickets: [remainingTicket] },
    ]);
    const ownedKey = Object.keys(wallet)[0]!;

    const merged = reconcilePendingSentTransfers(
      wallet,
      [
        {
          status: "pending",
          orderId: order.orderId,
          event: { uuid: event.uuid, name: event.name },
          tickets: [transferredTicket],
        },
      ],
      order.email,
    );
    const upcoming = summarizeUpcomingWalletEvents(merged);
    const sentKey = `sent:${event.uuid}`;

    expect(Object.keys(merged).sort()).toEqual([ownedKey, sentKey].sort());
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]?.key).toBe(ownedKey);
    expect(upcoming[0]?.ticketCount).toBe(1);
    expect(merged[ownedKey]?.tickets.map((ticket) => ticket.id)).toEqual([
      remainingTicket.id,
    ]);
    expect(merged[sentKey]?.heroImage || merged[sentKey]?.posterSrc).toBeTruthy();
    expect(merged[sentKey]?.venueLine).toBeTruthy();
  });

  it("keeps a fully transferred package game on the schedule", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const tickets = order.tickets.map((ticket) => ({
      ...ticket,
      eventUUID: activeEvent.uuid,
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [activeEvent] },
      tickets,
    });
    const packageKey = `${String(packageOrder.package?.uuid || packageOrder.orderId)}:${activeEvent.uuid}`;
    const wallet = buildWalletEventDetails(
      [packageOrder],
      packageOrder.email,
      {
        sentTransfers: [
          {
            status: "pending",
            orderId: packageOrder.orderId,
            event: activeEvent,
            tickets,
          },
        ],
      },
    );
    const schedule = summarizeEventDetails(wallet.allDetails, "schedule");

    expect(wallet.allDetails[packageKey]?.tickets).toHaveLength(0);
    expect(wallet.allDetails[packageKey]?.availability).toBe("transferred");
    expect(
      schedule.find((row) => row.key === packageKey)?.availability,
    ).toBe("transferred");
  });

  it("blocks season pass transfer when package tickets are in transfer", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    const wallet = buildWalletEventDetails(
      [
        demoCompletedPackageOrder({
          package: { ...order.package, events: [activeEvent] },
          tickets: [ticket],
        }),
      ],
      order.email,
      {
        sentTransfers: [
          {
            status: "pending",
            orderId: order.orderId,
            tickets: [ticket],
          },
        ],
      },
    );

    expect(
      packageOrderHasTicketTransfers(
        wallet.allDetails,
        [
          {
            status: "pending",
            orderId: order.orderId,
            tickets: [ticket],
          },
        ],
        String(order.orderId),
      ),
    ).toBe(true);
  });

  it("emits grouped section seat lines in upcoming summaries", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [first, second] = order.tickets;
    const details = buildOrderEventDetails([
      {
        ...order,
        tickets: [
          { ...first, sectionNumber: "G", rowNumber: 25, seatNumber: 6 },
          { ...second, sectionNumber: "G", rowNumber: 25, seatNumber: 7 },
          { ...first, id: 9001, sectionNumber: "H", rowNumber: 1, seatNumber: 5 },
        ],
      },
    ]);
    const [summary] = summarizeEventDetails(details);

    expect(summary?.ticketSeats).toEqual([
      "Sec G · Row 25 · Seats 6-7",
      "Sec H · Row 1 · Seat 5",
    ]);
  });

  it("keeps a claimed sender package game on the schedule as transferred", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
      transferStatus: "transferred",
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [activeEvent] },
      tickets: [ticket],
    });
    const wallet = buildSeasonPackageEventDetails([packageOrder]);
    const afterClaim = pruneTransferredWalletDetails(wallet);
    const schedule = summarizeEventDetails(afterClaim, "schedule");
    const packageKey = `${String(packageOrder.package?.uuid || packageOrder.orderId)}:${activeEvent.uuid}`;

    expect(afterClaim[packageKey]?.availability).toBe("transferred");
    expect(schedule.some((row) => row.key === packageKey)).toBe(true);
    expect(summarizeUpcomingWalletEvents(afterClaim)).toHaveLength(0);
  });

  it("keeps a claimed recipient package game on upcoming", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    const recipientOrder = demoCompletedPackageOrder({
      package: order.package,
      tickets: [ticket],
    });
    const wallet = buildWalletEventDetails([recipientOrder], "recipient@example.com");
    const incomingKey = `incoming:${activeEvent.uuid}`;

    expect(wallet.upcomingEvents.some((row) => row.name === activeEvent.name)).toBe(
      true,
    );
    expect(wallet.allDetails[incomingKey]?.showInUpcomingTab).toBe(true);
    expect(wallet.upcomingEvents[0]?.pendingIncomingTransfer).toBeFalsy();
  });

  it("shows attended for scanned past package games", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const pastEvent = {
      ...event,
      start: demoDate({ days: -30 }, "19:00"),
    };
    const order = demoCompletedTicketOrder({ event: pastEvent });
    const [ticket] = order.tickets;
    const details = buildSeasonPackageEventDetails([
      {
        ...order,
        package: {
          uuid: "pkg-attended-test",
          name: "Test package",
          events: [pastEvent],
        },
        tickets: [{ ...ticket, scanned: true, eventUUID: pastEvent.uuid }],
      },
    ]);
    const detail = Object.values(details)[0]!;

    expect(detail.availability).toBe("past");
    expect(walletEventAvailabilityBadge(detail)).toBe("attended");
    expect(summarizeEventDetails(details, "schedule")[0]?.availabilityBadge).toBe(
      "attended",
    );
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

describe("eventWalletCommerceFlags", () => {
  it("enables wallet actions only when event flags are explicitly true", () => {
    expect(
      eventWalletCommerceFlags({
        enableTransfers: true,
        enableResale: true,
      }),
    ).toEqual({ transfersEnabled: true, resaleEnabled: true });
    expect(
      eventWalletCommerceFlags({
        enableTransfers: false,
        enableResale: true,
      }),
    ).toEqual({ transfersEnabled: false, resaleEnabled: true });
    expect(eventWalletCommerceFlags({})).toEqual({
      transfersEnabled: false,
      resaleEnabled: false,
    });
  });

  it("reads event flags when building wallet event details", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const detail = Object.values(
      buildOrderEventDetails([
        demoCompletedTicketOrder({
          event: {
            ...event,
            enableTransfers: true,
            enableResale: false,
          },
        }),
      ]),
    )[0];

    expect(detail.transfersEnabled).toBe(true);
    expect(detail.resaleEnabled).toBe(false);
  });
});

describe("wallet event attractions", () => {
  const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG1")!;

  it("shows home and visitor cards for a single-attraction sporting event", () => {
    const event = {
      ...icedogs,
      start: demoDate({ days: 5 }, "19:00"),
      attractions: [icedogs.attractions![0]],
    };
    const detail = Object.values(
      buildOrderEventDetails([demoCompletedTicketOrder({ event })]),
    )[0];

    expect(detail.attractions).toEqual([
      expect.objectContaining({
        name: "Niagara IceDogs",
        role: "Home",
        logo: "/clients/icedogs.svg",
      }),
      expect.objectContaining({
        name: "Visitor",
        role: "Visitor",
        initials: "AWA",
        brand: BLOCKTICKETS_NAVY,
      }),
    ]);
    expect(detail.posterSrc).toBeUndefined();
  });

  it("keeps a single featured card for a non-sporting event", () => {
    const event = {
      ...icedogs,
      start: demoDate({ days: 5 }, "19:00"),
      organization: {
        ...icedogs.organization,
        category: { name: "Concert" },
      },
      attractions: [icedogs.attractions![0]],
    };
    const detail = Object.values(
      buildOrderEventDetails([demoCompletedTicketOrder({ event })]),
    )[0];

    expect(detail.attractions).toEqual([
      expect.objectContaining({
        name: "Niagara IceDogs",
        role: "Featured",
      }),
    ]);
    expect(detail.attractions).toHaveLength(1);
  });
});
