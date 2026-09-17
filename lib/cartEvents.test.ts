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
  demoAccessPass,
  demoPackageAccessPass,
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
  formatPackageRemainingTicketsLabel,
  resolvePackagePurchasedSeatCount,
  resolvePackageRemainingSeatCount,
  resolvePackageTransferredSeatCount,
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
  seasonPassHasTicketTransfers,
  removeTicketsFromWalletDetails,
  removeTicketsFromWalletOrders,
  mergeWalletOrdersPreservingLocalTickets,
  applyAcceptedIncomingTransferToOrders,
  applyAcceptedIncomingPassTransferToOrders,
  ticketIdsForPassSeat,
  isSyntheticAcceptWalletOrder,
  restoreCancelledTransferTicketsToOrders,
  reconcilePendingReceivedTransfers,
  reconcilePendingSentTransfers,
  pruneTransferredWalletDetails,
  walletEventAvailabilityBadge,
  sortWalletEventSchedule,
  sortWalletUpcomingEvents,
  summarizeIncomingAccessPassTransfers,
  summarizeIncomingPassPackageTransfers,
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
import { buildAccessPassSummaries } from "@/lib/wallet";

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

  it("keeps package order in myUpcomingEvents API order like the legacy wallet", () => {
    const laterPackage = demoCompletedPackageOrder({
      orderId: "later-package-order",
      id: 2001,
      package: {
        ...demoCompletedPackageOrder().package,
        uuid: "pkg-later-season",
        name: "Later Season Package",
        events: [
          {
            ...pkg.events[0],
            start: demoDate({ months: 6 }),
            uuid: "evt-later-1",
          },
          {
            ...pkg.events[1],
            start: demoDate({ months: 7 }),
            uuid: "evt-later-2",
          },
        ],
      },
    });
    const soonerPackage = demoCompletedPackageOrder({
      orderId: "sooner-package-order",
      id: 2002,
      package: {
        ...demoCompletedPackageOrder().package,
        uuid: "pkg-sooner-season",
        name: "Sooner Season Package",
        events: [
          {
            ...pkg.events[0],
            start: demoDate({ days: 14 }),
            uuid: "evt-sooner-1",
          },
        ],
      },
    });
    const ticketOrder = demoCompletedTicketOrder({ event: upcomingEvent });
    const apiOrder = [laterPackage, ticketOrder, soonerPackage];

    expect(buildSeasonPackageSummaries(apiOrder).map((row) => row.orderId)).toEqual(
      ["later-package-order", "sooner-package-order"],
    );
  });

  it("shows remaining package tickets after a pass transfer clears order tickets", () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };
    const passTransfer = {
      id: "season-pass-transfer-1",
      status: "pending",
      orderId: order.orderId,
      transferType: "access_pass",
      accessPassId: pass.uuid,
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        sectionNumber: pass.sectionNumber,
        rowNumber: pass.rowNumber,
        seatNumber: pass.seatNumber,
      },
      tickets: order.tickets,
    };

    expect(
      resolvePackagePurchasedSeatCount(strippedOrder, [passTransfer]),
    ).toBe(2);
    expect(
      resolvePackageTransferredSeatCount(strippedOrder, [passTransfer]),
    ).toBe(1);
    expect(
      resolvePackageRemainingSeatCount(strippedOrder, [passTransfer]),
    ).toBe(1);
    expect(
      buildSeasonPackageSummaries([strippedOrder], [passTransfer])[0]
        ?.ticketCount,
    ).toBe(1);
    expect(
      buildSeasonPackageSummaries([strippedOrder], [passTransfer])[0]
        ?.purchasedTicketCount,
    ).toBe(2);
  });

  it("collects ticket ids for a single pass seat across the package order", () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass({ seatNumber: 21 });
    const seat21Tickets = order.tickets.filter(
      (ticket) => ticket.seatNumber === 21,
    );

    expect(ticketIdsForPassSeat(order, pass)).toEqual(
      seat21Tickets.map((ticket) => ticket.id),
    );
    expect(ticketIdsForPassSeat(order, pass)).not.toEqual(
      order.tickets.map((ticket) => ticket.id),
    );
  });

  it("appends a synthetic package order when accepting an incoming season pass", () => {
    const seasonPackage = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const incoming = {
      id: "incoming-pass-accept",
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: seasonPackage.events.slice(1),
      },
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        package: order.package,
      },
    };

    const nextOrders = applyAcceptedIncomingPassTransferToOrders(
      [],
      incoming,
      "recipient@example.com",
    );

    expect(nextOrders).toHaveLength(1);
    expect(nextOrders[0]?.orderId).toBe("accepted-incoming-pass-accept");
    expect(nextOrders[0]?.package?.events?.length).toBe(
      seasonPackage.events.length,
    );
    expect(isSyntheticAcceptWalletOrder(nextOrders[0])).toBe(true);

    const recipientOrderId = "1474-incoming-pass-accept-recipient";
    const withResponse = applyAcceptedIncomingPassTransferToOrders(
      [],
      incoming,
      "recipient@example.com",
      {
        data: {
          uuid: pass.uuid,
          type: "package",
          orderId: recipientOrderId,
          order: { orderId: recipientOrderId },
        },
      },
    );
    expect(withResponse[0]?.orderId).toBe(recipientOrderId);
    expect(isSyntheticAcceptWalletOrder(withResponse[0])).toBe(false);
  });

  it("keeps purchased package ticket count when seats leave without a pass transfer", () => {
    const order = demoCompletedPackageOrder();
    const previous = buildSeasonPackageSummaries([order]);
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };

    expect(
      buildSeasonPackageSummaries([strippedOrder], [], previous)[0]
        ?.purchasedTicketCount,
    ).toBe(2);
    expect(
      buildSeasonPackageSummaries([strippedOrder], [], previous)[0]?.ticketCount,
    ).toBe(2);
  });

  it("marks a package fully transferred when every seat was sent with a pass", () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };
    const sentTransfers = [
      {
        id: "season-pass-transfer-21",
        status: "pending",
        orderId: order.orderId,
        transferType: "access_pass",
        accessPassId: pass21.uuid,
        access_pass: {
          uuid: pass21.uuid,
          name: pass21.name,
          type: "package",
          sectionNumber: seat21.sectionNumber,
          rowNumber: seat21.rowNumber,
          seatNumber: seat21.seatNumber,
        },
      },
      {
        id: "season-pass-transfer-22",
        status: "claimed",
        orderId: order.orderId,
        transferType: "access_pass",
        accessPassId: pass22.uuid,
        access_pass: {
          uuid: pass22.uuid,
          name: pass22.name,
          type: "package",
          sectionNumber: seat22.sectionNumber,
          rowNumber: seat22.rowNumber,
          seatNumber: seat22.seatNumber,
        },
      },
    ];
    const summary = buildSeasonPackageSummaries(
      [strippedOrder],
      sentTransfers,
    )[0];

    expect(summary?.ticketCount).toBe(0);
    expect(summary?.purchasedTicketCount).toBe(2);
    expect(summary?.fullyTransferred).toBe(true);
    expect(
      formatPackageRemainingTicketsLabel(
        summary?.ticketCount ?? 0,
        summary?.fullyTransferred ?? false,
      ),
    ).toBe("Fully Transferred");
  });

  it("does not lower package ticket count for a pending package game transfer", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [seat21, seat22] = order.tickets;
    const transferredTicket = {
      ...seat22,
      id: `${seat22.id}-${activeEvent.uuid}`,
      eventUUID: activeEvent.uuid,
    };
    const sentTransfers = [
      {
        status: "pending",
        orderId: order.id,
        tickets: [transferredTicket],
        access_pass: {
          uuid: "access-pass-seat-22",
          name: "NMS Football Season Seats",
          type: "package",
          sectionNumber: seat22.sectionNumber,
          rowNumber: seat22.rowNumber,
          seatNumber: seat22.seatNumber,
        },
      },
    ];

    expect(
      resolvePackageTransferredSeatCount(order, sentTransfers),
    ).toBe(0);
    expect(
      buildSeasonPackageSummaries([order], sentTransfers)[0]?.ticketCount,
    ).toBe(2);
  });

  it("counts purchased seats from pass transfers matched by order record id", () => {
    const order = demoCompletedPackageOrder({ tickets: [] });
    const pass = demoPackageAccessPass();

    expect(
      resolvePackagePurchasedSeatCount(order, [
        {
          id: "season-pass-transfer-1",
          status: "pending",
          orderId: order.id,
          transferType: "access_pass",
          accessPassId: pass.uuid,
          tickets: demoCompletedPackageOrder().tickets,
        },
      ]),
    ).toBe(2);
  });

  it("counts purchased seats from originalTickets when active tickets are hidden", () => {
    const order = demoCompletedPackageOrder();
    const strippedOrder = {
      ...order,
      tickets: [] as typeof order.tickets,
      originalTickets: order.tickets,
    };

    expect(resolvePackagePurchasedSeatCount(strippedOrder, [])).toBe(2);
    expect(buildSeasonPackageSummaries([strippedOrder])[0]?.ticketCount).toBe(2);
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
    const key = `incoming:${event.uuid}:incoming-1`;
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

  it("shows pending incoming season pass transfers as pass rows, not single events", () => {
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets;
    const passName = "Section 101 · Row A · Seat 12";
    const packageName = "NMS Football Season Seats - Pricing Level C";

    const wallet = buildWalletEventDetails([order], "recipient@example.com", {
      incomingTransfers: [
        {
          id: "incoming-pass-1",
          status: "pending",
          fromUserEmail: "jaimeconvery@hotmail.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: passName,
            type: "package",
            events: pkg.events.slice(1),
            sectionNumber: pass.sectionNumber,
            rowNumber: pass.rowNumber,
            seatNumber: pass.seatNumber,
          },
          orderId: order.orderId,
          order: {
            orderId: order.orderId,
            package: { ...order.package, name: packageName },
          },
          event: activeEvent,
          tickets: [ticket],
        },
      ],
    });

    const incomingPackages = summarizeIncomingPassPackageTransfers(
      wallet.allDetails,
    );

    expect(wallet.upcomingEvents).toHaveLength(0);
    expect(incomingPackages).toHaveLength(1);
    expect(incomingPackages[0]?.name).toBe(passName);
    expect(incomingPackages[0]?.name).not.toBe(packageName);
    expect(incomingPackages[0]?.name).not.toBe(activeEvent.name);
    expect(incomingPackages[0]?.incomingPassTransfer).toBe(true);
    expect(incomingPackages[0]?.passKind).toBe("season pass");
    expect(incomingPackages[0]?.passEventCount).toBe(pkg.events.slice(1).length);
    expect(incomingPackages[0]?.passTicketCount).toBe(1);
    expect(incomingPackages[0]?.ticketCount).toBe(1);
  });

  it("shows pending incoming organizer access passes on the Access Pass tab, not Packages", () => {
    const pass = demoAccessPass();
    const wallet = buildWalletEventDetails([], "recipient@example.com", {
      incomingTransfers: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
        },
      ],
    });

    expect(summarizeIncomingPassPackageTransfers(wallet.allDetails)).toEqual([]);
    const incomingAccess = summarizeIncomingAccessPassTransfers(
      wallet.allDetails,
    );
    expect(incomingAccess).toHaveLength(1);
    expect(incomingAccess[0]?.name).toBe(pass.name);
    expect(incomingAccess[0]?.passKind).toBe("access pass");
    expect(incomingAccess[0]?.passEventCount).toBe(pass.events.length);
    expect(incomingAccess[0]?.passRemainingCount).toBe(pass.events.length);
    expect(incomingAccess[0]?.ticketSeats ?? []).toEqual([]);
    expect(incomingAccess[0]?.incomingAccessPass?.typeLabel).toBe(
      "All-access pass",
    );
    expect(incomingAccess[0]?.incomingAccessPass?.nextEvent?.name).toBe(
      buildAccessPassSummaries([pass])[0]?.nextEvent?.name,
    );
  });

  it("shows full incoming season pass event counts from access pass schedules when past games are omitted", () => {
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const pastEvent = {
      uuid: "evt-nmstate-past-incoming",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];
    const upcomingEvents = pkg.events.slice(1);
    const accessPassesByOrderId = new Map([
      [String(order.orderId), [{ ...pass, events: fullEvents }]],
    ]);

    const wallet = buildWalletEventDetails([], "recipient@example.com", {
      incomingTransfers: [
        {
          id: "incoming-pass-empty-wallet",
          status: "pending",
          fromUserEmail: "jaimeconvery@hotmail.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            events: upcomingEvents,
            sectionNumber: pass.sectionNumber,
            rowNumber: pass.rowNumber,
            seatNumber: pass.seatNumber,
          },
          orderId: order.orderId,
        },
      ],
      accessPassesByOrderId,
    });

    const incomingPackages = summarizeIncomingPassPackageTransfers(
      wallet.allDetails,
    );

    expect(incomingPackages).toHaveLength(1);
    expect(incomingPackages[0]?.passEventCount).toBe(fullEvents.length);
  });

  it("uses order.details.package for incoming pass image and snapshot event count", () => {
    const pass = demoPackageAccessPass();
    const packageImage = { url: "/details-package-image.jpg" };
    const pastEvent = {
      uuid: "evt-nmstate-past-details",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];

    const wallet = buildWalletEventDetails([], "recipient@example.com", {
      incomingTransfers: [
        {
          id: "incoming-pass-image",
          status: "pending",
          fromUserEmail: "jaimeconvery@hotmail.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          accessPassSnapshot: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            events: pkg.events.slice(1),
          },
          orderId: pass.orderId,
          order: {
            orderId: pass.orderId,
            details: {
              package: {
                name: pkg.name,
                image: packageImage,
                events: fullEvents,
                venue: pkg.venue,
                organization: pkg.organization,
              },
            },
          },
        },
      ],
    });

    const incomingPackages = summarizeIncomingPassPackageTransfers(
      wallet.allDetails,
    );
    const detailKey = Object.keys(wallet.allDetails).find((key) =>
      key.startsWith("incoming:pass:"),
    );

    expect(incomingPackages).toHaveLength(1);
    expect(incomingPackages[0]?.passEventCount).toBe(pkg.events.slice(1).length);
    expect(incomingPackages[0]?.thumb).toContain("details-package-image.jpg");
    expect(wallet.allDetails[detailKey!]?.heroImage).toContain(
      "details-package-image.jpg",
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

  it("keeps separate pending ga incoming transfers for the same event", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const gaTicket = (id: number) => ({
      id,
      uuid: `ticket-ga-${id}`,
      checkInCode: `GA-${id}`,
      eventUUID: event.uuid,
      generalAdmission: true,
      sectionName: "General Admission",
      sectionNumber: "Club",
    });

    const merged = reconcilePendingReceivedTransfers(
      {},
      [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          orderId: "order-1",
          event: event,
          tickets: [gaTicket(9101)],
        },
        {
          id: "incoming-2",
          status: "pending",
          fromUserEmail: "sender@example.com",
          orderId: "order-2",
          event: event,
          tickets: [gaTicket(9102)],
        },
      ],
      "recipient@example.com",
    );
    const upcoming = summarizeEventDetails(merged);

    expect(Object.keys(merged).sort()).toEqual([
      `incoming:${event.uuid}:incoming-1`,
      `incoming:${event.uuid}:incoming-2`,
    ]);
    expect(upcoming).toHaveLength(2);
    expect(upcoming.every((row) => row.pendingIncomingTransfer)).toBe(true);
    expect(upcoming.map((row) => row.incomingTransferId).sort()).toEqual([
      "incoming-1",
      "incoming-2",
    ]);
    expect(upcoming.every((row) => row.ticketCount === 1)).toBe(true);
  });

  it("shows GA section plus a count on a pending incoming transfer with multiple tickets", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const gaTicket = (id: number) => ({
      id,
      uuid: `ticket-ga-${id}`,
      checkInCode: `GA-${id}`,
      eventUUID: event.uuid,
      generalAdmission: true,
      sectionName: "General Admission",
      sectionNumber: "Club",
      offerName: "General admission",
    });
    const merged = reconcilePendingReceivedTransfers(
      {},
      [
        {
          id: "incoming-ga-multi",
          status: "pending",
          fromUserEmail: "sender@example.com",
          event,
          tickets: [gaTicket(9101), gaTicket(9102)],
        },
      ],
      "recipient@example.com",
    );
    const [row] = summarizeEventDetails(merged);

    expect(row?.ticketCount).toBe(2);
    expect(row?.ticketSeats).toEqual(["Sec Club x 2"]);
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

  it("keeps a fully transferred single event on upcoming with a transferred badge", () => {
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

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.availability).toBe("transferred");
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(0);
    expect(wallet.upcomingEvents[0]?.availabilityBadge).toBe("transferred");
  });

  it("keeps a partially transferred single event available with remaining tickets", () => {
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
            tickets: [{ ...transferredTicket, transferStatus: "pending" }],
          },
        ],
      },
    );

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.availability).toBe("available");
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
  });

  it("matches pending sent transfers by order record id", () => {
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
            orderId: order.id,
            event: order.event,
            tickets: [transferredTicket],
          },
        ],
      },
    );

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
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

  it("accepts incoming transfers even when another wallet order shares ticket ids", () => {
    const ownedEvent = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const incomingEvent = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const ownedOrder = demoCompletedTicketOrder({ event: ownedEvent });
    const incomingOrder = demoCompletedTicketOrder({ event: incomingEvent });
    const [incomingTicket] = incomingOrder.tickets;

    const nextOrders = applyAcceptedIncomingTransferToOrders(
      [ownedOrder],
      {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        event: incomingOrder.event,
        tickets: [incomingTicket],
      },
      "recipient@example.com",
    );

    expect(nextOrders).toHaveLength(2);
    expect(nextOrders.map((order) => order.orderId)).toEqual([
      ownedOrder.orderId,
      "accepted-incoming-1",
    ]);
  });

  it("does not duplicate wallet orders when the accepted transfer order already exists", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;
    const transfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      orderId: order.orderId,
      event: order.event,
      tickets: [ticket],
    };
    const acceptedOnce = applyAcceptedIncomingTransferToOrders(
      [],
      transfer,
      "recipient@example.com",
    );

    const acceptedTwice = applyAcceptedIncomingTransferToOrders(
      acceptedOnce,
      transfer,
      "recipient@example.com",
    );

    expect(acceptedTwice).toHaveLength(1);
    expect(acceptedTwice[0]?.orderId).toBe("accepted-incoming-1");
    expect(acceptedTwice[0]?.tickets).toHaveLength(1);
  });

  it("adds accepted incoming transfer tickets to wallet orders", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;

    const nextOrders = applyAcceptedIncomingTransferToOrders(
      [],
      {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        orderId: order.orderId,
        event: order.event,
        tickets: [ticket],
      },
      "recipient@example.com",
    );
    const wallet = buildWalletEventDetails(nextOrders, "recipient@example.com");

    expect(nextOrders).toHaveLength(1);
    expect(nextOrders[0]?.source).toBe("transfer");
    expect(nextOrders[0]?.orderId).toBe("accepted-incoming-1");
    expect(isSyntheticAcceptWalletOrder(nextOrders[0])).toBe(true);
    expect(nextOrders[0]?.tickets.map((row) => row.id)).toEqual([ticket.id]);
    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.name).toBe(event.name);
    expect(wallet.upcomingEvents[0]?.pendingIncomingTransfer).toBeFalsy();
  });

  it("does not add accepted package tickets to a season package the recipient already owns", () => {
    const recipientOrder = demoCompletedPackageOrder();
    const pkg = recipientOrder.package;
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const game = pkg.events[1];
    const incomingTicket = {
      id: 9100,
      uuid: "ticket-nms-package-transferred-23",
      checkInCode: "NMS-23",
      sectionName: listing.sectionNumber,
      sectionNumber: listing.sectionNumber,
      rowNumber: listing.rowNumber,
      seatNumber: 23,
      eventUUID: game.uuid,
    };
    const beforeCount =
      buildSeasonPackageSummaries([recipientOrder])[0]?.ticketCount;

    const nextOrders = applyAcceptedIncomingTransferToOrders(
      [recipientOrder],
      {
        id: "incoming-pkg-game",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        orderId: "sender-package-order",
        event: game,
        order: { package: pkg },
        tickets: [incomingTicket],
      },
      "recipient@example.com",
    );
    const packages = buildSeasonPackageSummaries(nextOrders);
    const wallet = buildWalletEventDetails(nextOrders, "recipient@example.com");

    expect(beforeCount).toBe(2);
    expect(packages).toHaveLength(1);
    expect(packages[0]?.ticketCount).toBe(beforeCount);
    expect(nextOrders).toHaveLength(2);
    expect(nextOrders[1]?.orderId).toBe("accepted-incoming-pkg-game");
    expect(nextOrders[1]?.package).toBeUndefined();
    expect(wallet.upcomingEvents.some((row) => row.name === game.name)).toBe(
      true,
    );
  });

  it("treats accepted package tickets as an event order when the recipient does not own the package", () => {
    const packageOrder = demoCompletedPackageOrder();
    const pkg = packageOrder.package;
    const game = pkg.events[1];
    const [ticket] = packageOrder.tickets;
    const incomingTicket = {
      ...ticket,
      id: 9101,
      uuid: "ticket-nms-package-received",
      eventUUID: game.uuid,
    };

    const nextOrders = applyAcceptedIncomingTransferToOrders(
      [],
      {
        id: "incoming-package-ticket",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        orderId: packageOrder.orderId,
        event: game,
        order: { package: pkg },
        tickets: [incomingTicket],
      },
      "recipient@example.com",
    );
    const wallet = buildWalletEventDetails(nextOrders, "recipient@example.com");

    expect(nextOrders).toHaveLength(1);
    expect(nextOrders[0]?.orderId).toBe("accepted-incoming-package-ticket");
    expect(nextOrders[0]?.package).toBeUndefined();
    expect(nextOrders[0]?.event?.uuid).toBe(game.uuid);
    expect(buildSeasonPackageSummaries(nextOrders)).toEqual([]);
    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.name).toBe(game.name);
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
  });

  it("drops synthetic accept orders after reload when the API returns those tickets", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const [ticket] = demoCheckoutCart({ ticketCount: 1 }).tickets.map(
      (row, index) => ({ ...row, id: 9101 + index, eventUUID: event.uuid }),
    );
    const apiOrder = demoCompletedTicketOrder({
      id: 1306,
      orderId: "1306-recipient-order",
      event,
      tickets: [ticket],
    });
    const localOrders = applyAcceptedIncomingTransferToOrders(
      [],
      {
        id: "incoming-1",
        status: "pending",
        orderId: "999-sender-order",
        event: apiOrder.event,
        tickets: [ticket],
      },
      "recipient@example.com",
    );

    const merged = mergeWalletOrdersPreservingLocalTickets([apiOrder], localOrders);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.orderId).toBe("1306-recipient-order");
    expect(merged[0]?.tickets.map((row) => row.id)).toEqual([ticket.id]);
  });

  it("creates separate wallet orders when accepting same-event incoming transfers", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const gaTicket = (id: number) => ({
      id,
      uuid: `ticket-ga-${id}`,
      checkInCode: `GA-${id}`,
      eventUUID: event.uuid,
      generalAdmission: true,
      sectionName: "General Admission",
      sectionNumber: "Club",
    });
    const firstAccepted = applyAcceptedIncomingTransferToOrders(
      [],
      {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "sender@example.com",
        orderId: "order-1",
        event: event,
        tickets: [gaTicket(9101)],
      },
      "recipient@example.com",
    );
    const nextOrders = applyAcceptedIncomingTransferToOrders(
      firstAccepted,
      {
        id: "incoming-2",
        status: "pending",
        fromUserEmail: "sender@example.com",
        orderId: "order-2",
        event: event,
        tickets: [gaTicket(9102)],
      },
      "recipient@example.com",
    );
    const wallet = buildWalletEventDetails(nextOrders, "recipient@example.com");

    expect(nextOrders).toHaveLength(2);
    expect(nextOrders.map((order) => order.orderId).sort()).toEqual([
      "accepted-incoming-1",
      "accepted-incoming-2",
    ]);
    expect(nextOrders[0]?.tickets).toHaveLength(1);
    expect(nextOrders[1]?.tickets).toHaveLength(1);
    expect(wallet.upcomingEvents).toHaveLength(2);
    expect(wallet.upcomingEvents.every((row) => row.ticketCount === 1)).toBe(
      true,
    );
  });

  it("keeps existing wallet orders when accepting an incoming transfer", () => {
    const earlierEvent = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const laterEvent = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const ownedOrder = demoCompletedTicketOrder({ event: earlierEvent });
    const incomingOrder = demoCompletedTicketOrder({ event: laterEvent });
    const [incomingTicket] = incomingOrder.tickets;

    const nextOrders = applyAcceptedIncomingTransferToOrders(
      [ownedOrder],
      {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        event: incomingOrder.event,
        tickets: [incomingTicket],
      },
      "recipient@example.com",
    );
    const wallet = buildWalletEventDetails(nextOrders, "recipient@example.com");

    expect(nextOrders).toHaveLength(2);
    expect(wallet.upcomingEvents.map((row) => row.name)).toEqual([
      earlierEvent.name,
      laterEvent.name,
    ]);
  });

  it("restores cancelled transfer tickets onto wallet orders", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };

    const restored = restoreCancelledTransferTicketsToOrders(
      [strippedOrder],
      {
        orderId: order.orderId,
        tickets: [ticket],
      },
    );

    expect(restored[0]?.tickets.map((row) => row.id)).toEqual([ticket.id]);
  });

  it("keeps restored cancelled tickets in seat order", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const [first, second] = demoCheckoutCart({ ticketCount: 2 }).tickets;
    const order = demoCompletedTicketOrder({
      event,
      tickets: [second],
    });

    const restored = restoreCancelledTransferTicketsToOrders([order], {
      orderId: order.orderId,
      tickets: [first],
    });

    expect(restored[0]?.tickets.map((row) => row.seatNumber)).toEqual([
      first.seatNumber,
      second.seatNumber,
    ]);
  });

  it("merges locally restored tickets into stale API wallet orders", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const apiOrders = [{ ...order, tickets: [] as typeof order.tickets }];
    const localOrders = restoreCancelledTransferTicketsToOrders(apiOrders, {
      orderId: order.orderId,
      tickets: [ticket],
    });

    const merged = mergeWalletOrdersPreservingLocalTickets(apiOrders, localOrders);

    expect(merged[0]?.tickets.map((row) => row.id)).toEqual([ticket.id]);
  });

  it("prefers locally removed tickets over stale API wallet orders", () => {
    const order = demoCompletedTicketOrder({
      tickets: demoCheckoutCart({ ticketCount: 2 }).tickets,
    });
    const [kept, removed] = order.tickets;
    const apiOrders = [{ ...order, tickets: order.tickets }];
    const localOrders = removeTicketsFromWalletOrders(apiOrders, [removed.id]);

    const merged = mergeWalletOrdersPreservingLocalTickets(apiOrders, localOrders);

    expect(merged[0]?.tickets.map((row) => row.id)).toEqual([kept.id]);
  });

  it("returns cancelled transfer events to upcoming date order", () => {
    const earlierEvent = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const laterEvent = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const earlierTickets = demoCheckoutCart({ ticketCount: 1 }).tickets.map(
      (ticket) => ({ ...ticket, id: 7101, eventUUID: earlierEvent.uuid }),
    );
    const laterTickets = demoCheckoutCart({ ticketCount: 1 }).tickets.map(
      (ticket) => ({ ...ticket, id: 7201, eventUUID: laterEvent.uuid }),
    );
    const earlierOrder = demoCompletedTicketOrder({
      id: 1475,
      orderId: "1475-643535-0700",
      event: earlierEvent,
      tickets: earlierTickets,
    });
    const laterOrder = demoCompletedTicketOrder({
      id: 1476,
      orderId: "1476-643535-0700",
      event: laterEvent,
      tickets: laterTickets,
    });
    const [transferredTicket] = laterTickets;

    const initial = buildWalletEventDetails(
      [earlierOrder, laterOrder],
      DEMO_USER.email,
    );
    expect(initial.upcomingEvents.map((row) => row.name)).toEqual([
      earlierEvent.name,
      laterEvent.name,
    ]);

    const afterTransfer = buildWalletEventDetails(
      [earlierOrder, { ...laterOrder, tickets: [] }],
      DEMO_USER.email,
      {
        sentTransfers: [
          {
            id: "sent-later",
            status: "pending",
            orderId: laterOrder.orderId,
            event: laterEvent,
            tickets: [transferredTicket],
            createdAt: "2026-09-13T12:00:00.000Z",
          },
        ],
      },
    );
    const transferDetails = removeTicketsFromWalletDetails(
      afterTransfer.allDetails,
      [transferredTicket.id],
    );
    expect(
      summarizeUpcomingWalletEvents(transferDetails).map((row) => row.name),
    ).toEqual([earlierEvent.name]);

    const afterCancelOrders = restoreCancelledTransferTicketsToOrders(
      [{ ...laterOrder, tickets: [] }],
      {
        orderId: laterOrder.orderId,
        tickets: [transferredTicket],
      },
    );
    const afterCancel = buildWalletEventDetails(
      [earlierOrder, afterCancelOrders[0]!],
      DEMO_USER.email,
    );

    expect(afterCancel.upcomingEvents.map((row) => row.name)).toEqual([
      earlierEvent.name,
      laterEvent.name,
    ]);
  });

  it("drops transferred tickets from cached wallet orders", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [transferredTicket, remainingTicket] = order.tickets;

    const stripped = removeTicketsFromWalletOrders([order], [transferredTicket.id]);

    expect(stripped[0]?.tickets.map((ticket) => ticket.id)).toEqual(
      order.tickets.slice(1).map((ticket) => ticket.id),
    );
    expect(stripped[0]?.tickets.some((ticket) => ticket.id === transferredTicket.id)).toBe(
      false,
    );
  });

  it("shows the correct upcoming ticket count after cancelling one of two full-event transfers", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const tickets = demoCheckoutCart({ ticketCount: 2 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7001 + index,
        eventUUID: event.uuid,
      }),
    );
    const order = demoCompletedTicketOrder({ event, tickets });
    const [ticketA, ticketB] = tickets;
    const stubA = {
      id: "transfer-a",
      status: "pending",
      orderId: order.orderId,
      event,
      tickets: [ticketA],
      createdAt: "2026-09-12T12:00:00.000Z",
    };
    const stubB = {
      id: "transfer-b",
      status: "pending",
      orderId: order.orderId,
      event,
      tickets: [ticketB],
      createdAt: "2026-09-13T12:00:00.000Z",
    };

    let orders = removeTicketsFromWalletOrders([order], [ticketA.id]);
    orders = removeTicketsFromWalletOrders(orders, [ticketB.id]);
    let wallet = buildWalletEventDetails(orders, DEMO_USER.email, {
      sentTransfers: [stubA, stubB],
    });
    expect(summarizeUpcomingWalletEvents(wallet.allDetails)).toHaveLength(0);

    const ordersAfterCancel = restoreCancelledTransferTicketsToOrders(
      orders,
      stubA,
    );
    wallet = buildWalletEventDetails(ordersAfterCancel, DEMO_USER.email, {
      sentTransfers: [stubB],
    });

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.name).toBe(event.name);
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
  });

  it("restores the upcoming ticket count after cancel when wallet orders were stripped", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const tickets = demoCheckoutCart({ ticketCount: 2 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7001 + index,
        eventUUID: event.uuid,
      }),
    );
    const order = demoCompletedTicketOrder({ event, tickets });
    const [ticketA, ticketB] = tickets;
    const stubA = {
      id: "transfer-a",
      status: "pending",
      orderId: order.orderId,
      event,
      tickets: [ticketA],
      createdAt: "2026-09-12T12:00:00.000Z",
    };
    const stubB = {
      id: "transfer-b",
      status: "pending",
      orderId: order.orderId,
      event,
      tickets: [ticketB],
      createdAt: "2026-09-13T12:00:00.000Z",
    };
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };

    const ordersAfterCancel = restoreCancelledTransferTicketsToOrders(
      [strippedOrder],
      stubA,
    );
    const wallet = buildWalletEventDetails(ordersAfterCancel, DEMO_USER.email, {
      sentTransfers: [stubB],
    });

    expect(wallet.upcomingEvents).toHaveLength(1);
    expect(wallet.upcomingEvents[0]?.ticketCount).toBe(1);
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

  it("does not mark past package games transferred when another game is sent", () => {
    const order = demoCompletedPackageOrder();
    const [pastEvent, activeEvent] = pkg.events;
    const past = {
      ...pastEvent,
      start: "2020-08-15T23:00:00.000Z",
      status: "complete",
    };
    const tickets = order.tickets.map((ticket) => ({
      ...ticket,
      eventUUID: activeEvent.uuid,
    }));
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events: [past, activeEvent] },
      tickets,
    });
    const wallet = buildWalletEventDetails([packageOrder], packageOrder.email);
    const next = removeTicketsFromWalletDetails(
      wallet.allDetails,
      tickets.map((ticket) => ticket.id),
    );
    const schedule = summarizeEventDetails(next, "schedule");
    const rowFor = (uuid?: string) =>
      schedule.find((row) => row.eventUUID === uuid);

    expect(rowFor(past.uuid)?.availability).toBe("past");
    expect(rowFor(past.uuid)?.availabilityBadge).toBe("attended");
    expect(rowFor(activeEvent.uuid)?.availability).toBe("transferred");
    expect(rowFor(activeEvent.uuid)?.availabilityBadge).toBe("transferred");
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

  it("blocks only the season pass whose seat had a game ticket transferred", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const transferredTicket = {
      ...seat22,
      id: `${seat22.id}-${activeEvent.uuid}`,
      eventUUID: activeEvent.uuid,
      transferStatus: "transferred",
    };
    const packageOrder = demoCompletedPackageOrder({
      tickets: [
        { ...seat21, id: `${seat21.id}-${activeEvent.uuid}`, eventUUID: activeEvent.uuid },
        transferredTicket,
      ],
    });
    const sentTransfers = [
      {
        status: "pending",
        orderId: order.orderId,
        tickets: [transferredTicket],
      },
    ];

    expect(
      seasonPassHasTicketTransfers(pass21, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
    ).toBe(false);
    expect(
      seasonPassHasTicketTransfers(pass22, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
    ).toBe(true);
  });

  it("blocks season passes when package games show transferred in event details", () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const transferredEvents = [pkg.events[1], pkg.events[4]];
    const retainedEvents = pkg.events.filter(
      (event) =>
        !transferredEvents.some(
          (transferred) => transferred.uuid === event.uuid,
        ),
    );
    const tickets = retainedEvents.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
      })),
    );
    const eventDetails = buildWalletEventDetails([
      demoCompletedPackageOrder({
        package: { ...order.package, events: pkg.events },
        tickets,
      }),
    ]).allDetails;

    expect(
      seasonPassHasTicketTransfers(pass21, {
        orderId: String(order.orderId),
        orders: [],
        eventDetails,
      }),
    ).toBe(true);
    expect(
      seasonPassHasTicketTransfers(pass22, {
        orderId: String(order.orderId),
        orders: [],
        eventDetails,
      }),
    ).toBe(true);
  });

  it("blocks a season pass from ticketless sent transfers matched by eventUUID", () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const transferredEvent = pkg.events[4];
    const packageOrder = demoCompletedPackageOrder({
      tickets: order.tickets
        .filter((ticket) => ticket.seatNumber !== seat22.seatNumber)
        .map((ticket) => ({
          ...ticket,
          id: `${ticket.id}-${transferredEvent.uuid}`,
          eventUUID: transferredEvent.uuid,
        })),
    });
    const sentTransfers = [
      {
        status: "pending",
        orderId: order.orderId,
        eventUUID: transferredEvent.uuid,
      },
    ];

    expect(
      seasonPassHasTicketTransfers(pass21, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
    ).toBe(false);
    expect(
      seasonPassHasTicketTransfers(pass22, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
    ).toBe(true);
  });

  it("blocks a pending package ticket transfer when API uses order record id and linked access pass", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      sectionNumber: seat22.sectionNumber,
      rowNumber: seat22.rowNumber,
      seatNumber: seat22.seatNumber,
    });
    const transferredTicket = {
      id: `${seat22.id}-${activeEvent.uuid}`,
      eventUUID: activeEvent.uuid,
    };
    const packageOrder = demoCompletedPackageOrder({
      tickets: [
        {
          ...seat21,
          id: `${seat21.id}-${activeEvent.uuid}`,
          eventUUID: activeEvent.uuid,
        },
      ],
      originalTickets: [
        {
          ...seat22,
          id: `${seat22.id}-${activeEvent.uuid}`,
          eventUUID: activeEvent.uuid,
        },
      ],
    });
    const sentTransfers = [
      {
        status: "pending",
        orderId: order.id,
        tickets: [transferredTicket],
        access_pass: {
          uuid: pass22.uuid,
          name: pass22.name,
          type: "package",
          sectionNumber: seat22.sectionNumber,
          rowNumber: seat22.rowNumber,
          seatNumber: seat22.seatNumber,
        },
      },
    ];

    expect(
      seasonPassHasTicketTransfers(pass21, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
    ).toBe(false);
    expect(
      seasonPassHasTicketTransfers(pass22, {
        orderId: String(order.orderId),
        sentTransfers,
        orders: [packageOrder],
      }),
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

  it("shows attended for past or scanned package games", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const pastEvent = {
      ...event,
      start: demoDate({ days: -30 }, "19:00"),
    };
    const scannedUpcoming = {
      ...event,
      uuid: `${event.uuid}-scanned`,
      start: demoDate({ days: 14 }, "19:00"),
      wasScanned: true,
    };
    const order = demoCompletedTicketOrder({ event: pastEvent });
    const [ticket] = order.tickets;
    const details = buildSeasonPackageEventDetails([
      {
        ...order,
        package: {
          uuid: "pkg-attended-test",
          name: "Test package",
          events: [pastEvent, scannedUpcoming],
        },
        tickets: [
          { ...ticket, eventUUID: pastEvent.uuid },
          {
            ...ticket,
            id: `${ticket.id}-scanned`,
            eventUUID: scannedUpcoming.uuid,
          },
        ],
      },
    ]);
    const pastDetail = Object.values(details).find(
      (row) => row.eventUUID === pastEvent.uuid,
    )!;
    const scannedDetail = Object.values(details).find(
      (row) => row.eventUUID === scannedUpcoming.uuid,
    )!;
    const schedule = summarizeEventDetails(details, "schedule");

    expect(pastDetail.availability).toBe("past");
    expect(walletEventAvailabilityBadge(pastDetail)).toBe("attended");
    expect(walletEventAvailabilityBadge(scannedDetail)).toBe("attended");
    expect(
      schedule.find((row) => row.eventUUID === pastEvent.uuid)?.availabilityBadge,
    ).toBe("attended");
    expect(
      schedule.find((row) => row.eventUUID === scannedUpcoming.uuid)
        ?.availabilityBadge,
    ).toBe("attended");
  });

  it("does not build a wallet event path without an order id", () => {
    expect(walletEventTicketsPath("")).toBe("");
    expect(walletEventTicketsPath(undefined)).toBe("");
    expect(walletPackagePath("", pkg.uuid)).toBe("");
    expect(walletPackageEventPath("order-1", pkg.uuid, "")).toBe("");
    expect(walletPackageEventPath("order-1", "", icedogs.uuid)).toBe("");
    expect(walletAccessPassPath("order-1", "")).toBe("");
    expect(walletAccessPassPath("", "access-pass-1")).toBe(
      "/wallet/my-tickets/access-pass/access-pass-1/",
    );
    expect(
      walletRouteFromPath("/wallet/my-tickets/access-pass/access-pass-1/"),
    ).toEqual({
      accessPassUUID: "access-pass-1",
    });
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
