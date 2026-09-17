import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  demoAccessPass,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoPackageAccessPass,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { formatEventWhen } from "@/lib/helpers";
import { seatLabel } from "@/lib/wallet";
import {
  buildPassTransferOrderSnapshot,
  buildWalletReceivedTransferRows,
  buildWalletSentTransferRows,
  enrichPassTransfersFromAccessPasses,
  resolveAcceptedPassTransferWalletOrderId,
  walletOrdersIncludeAcceptedPassPackage,
  resolvePassTransferPackageEvents,
  resolvePassTransferPackageImage,
  resolveTransferOrderPackage,
  enrichTransferRecordsFromOrders,
  clearLocallyResolvedIncomingTransfersForTests,
  filterIncomingTransfersAgainstReceivedHistory,
  filterIncomingTransfersForWallet,
  filterPendingIncomingTransfers,
  filterVisibleWalletTransferRows,
  markIncomingTransferLocallyResolved,
  filterAccessPassSummariesBySentTransfers,
  filterWalletAccessPassesBySentTransfers,
  formatTransferSenderLabel,
  mapReceivedTransferRows,
  mapSentTransferRows,
  buildCancelTransferRequestBody,
  findSentTransferRecordForCancel,
  removeSentTransferRecordsForCancel,
  resolveCancelTransferId,
  resolveCancelTransferIdForApi,
  resolveCancelTransferIdWithSentLookup,
  resolveSentTransferIdFromApi,
  resolveCreatedTransferId,
  resolveCreatedTransferMeta,
  mergeTransferRecords,
  mergeWalletReceivedTransferRecords,
  appendLocalSentTransferStubs,
  mergeWalletSentTransferRecords,
  mergeWalletTransferRows,
  normalizeTransferRecord,
  reconcileOptimisticSentTransfers,
  promoteAcceptedIncomingTransferToReceived,
  pendingIncomingTransferLabel,
  sortWalletTransferRows,
  unwrapTransferRecords,
} from "@/lib/ticketTransfers";

describe("ticketTransfers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sorts transfers newest first", () => {
    const rows = sortWalletTransferRows([
      {
        id: "older",
        title: "Older",
        seat: "Sec A · Row 1 · Seat 1",
        seatLines: ["Sec A · Row 1 · Seat 1"],
        on: "Jan 1, 2026",
        status: "claimed",
        createdAt: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "newer",
        title: "Newer",
        seat: "Sec B · Row 2 · Seat 2",
        seatLines: ["Sec B · Row 2 · Seat 2"],
        on: "Sep 10, 2026",
        status: "pending",
        createdAt: "2026-09-10T12:00:00.000Z",
      },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["newer", "older"]);
  });

  it("maps sent transfers with pending status and seat labels", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;

    const rows = mapSentTransferRows([
      {
        id: 42,
        status: "pending",
        createdAt: "2026-09-10T18:00:00.000Z",
        emailAddressToUser: "recipient@example.com",
        event: order.event,
        tickets: [ticket],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.to).toBe("recipient@example.com");
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.title).toBe(order.event?.name);
    expect(rows[0]?.seat).toContain(String(ticket.seatNumber));
    expect(rows[0]?.seatLines[0]).toContain(String(ticket.seatNumber));
  });

  it("prefers the pass name when both event and access pass metadata are present", () => {
    const order = demoCompletedTicketOrder();
    const pass = demoPackageAccessPass();
    const rows = mapSentTransferRows([
      {
        id: "pass-over-event",
        status: "pending",
        event: order.event,
        access_pass: { name: pass.name, type: "package" },
      },
    ]);

    expect(rows[0]?.title).toBe(pass.name);
  });

  it("groups multi-ticket seat lines on transfer rows", () => {
    const order = demoCompletedTicketOrder();
    const [first, second] = order.tickets;
    const rows = mapSentTransferRows([
      {
        id: "multi-seat",
        status: "pending",
        event: order.event,
        tickets: [
          { ...first, sectionNumber: "G", rowNumber: 25, seatNumber: 6 },
          { ...second, sectionNumber: "G", rowNumber: 25, seatNumber: 7 },
        ],
      },
    ]);

    expect(rows[0]?.seatLines).toEqual(["Sec G · Row 25 · Seats 6-7"]);
  });

  it("shows GA section or row plus a count for multiple tickets on one transfer", () => {
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
    const rows = mapSentTransferRows([
      {
        id: "multi-ga",
        status: "pending",
        event,
        tickets: [gaTicket(9101), gaTicket(9102)],
      },
    ]);

    expect(rows[0]?.seatLines).toEqual(["Sec Club x 2"]);
    expect(rows[0]?.ticketCount).toBe(2);
  });

  it("shows pass event count instead of dates on pass transfer cards", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const rows = mapSentTransferRows([
      {
        id: "pass-schedule",
        status: "pending",
        access_pass: {
          name: pass.name,
          type: "package",
          start: pkg.start,
          end: pkg.end,
          events: pkg.events,
        },
      },
    ]);

    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
    expect(rows[0]?.schedule).not.toContain("–");
  });

  it("uses the full package schedule when pass events omit past games", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const upcomingEvents = pkg.events.slice(1);

    const rows = buildWalletSentTransferRows(
      [
        {
          id: "pass-transfer-partial-events",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            events: upcomingEvents,
          },
          orderId: order.orderId,
          createdAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      [order],
    );

    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
  });

  it("builds pass transfer order snapshots with package image and full events", () => {
    const order = demoCompletedPackageOrder();
    const pkg = demoSeasonPackage();
    const snapshot = buildPassTransferOrderSnapshot(order, pkg.events);

    expect(snapshot?.package?.image).toEqual(order.package?.image);
    expect(snapshot?.package?.events).toHaveLength(pkg.events.length);
  });

  it("detects when wallet orders already include the accepted pass package", () => {
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder({ orderId: "1474-recipient-order" });
    const transfer = {
      id: "incoming-pass-1",
      transferType: "access_pass",
      orderId: "1475-sender-order",
      order: { package: order.package },
    };

    expect(
      walletOrdersIncludeAcceptedPassPackage([order], transfer, {
        data: {
          uuid: pass.uuid,
          orderId: "1474-recipient-order",
        },
      }),
    ).toBe(true);
    expect(walletOrdersIncludeAcceptedPassPackage([], transfer)).toBe(false);
  });

  it("uses the recipient wallet order id from the accept response", () => {
    const pass = demoPackageAccessPass();
    const transfer = {
      id: "incoming-pass-1",
      transferType: "access_pass",
      orderId: "1475-sender-order",
    };

    expect(
      resolveAcceptedPassTransferWalletOrderId(transfer, {
        data: {
          uuid: pass.uuid,
          orderId: "1474-recipient-order",
          order: { orderId: "1474-recipient-order" },
        },
      }),
    ).toBe("1474-recipient-order");
    expect(
      resolveAcceptedPassTransferWalletOrderId(transfer, {
        data: { status: "claimed" },
      }),
    ).toBe("accepted-incoming-pass-1");
  });

  it("reads package image and events from transfer order.details.package", () => {
    const pkg = demoSeasonPackage();
    const packageImage = { url: "/details-package-image.jpg" };
    const pastEvent = {
      uuid: "evt-past-details",
      name: "Past Game",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];
    const transfer = {
      transferType: "access_pass",
      accessPassSnapshot: {
        uuid: "pass-1",
        name: pkg.name,
        type: "package",
        events: pkg.events.slice(1),
      },
      order: {
        details: {
          package: {
            name: pkg.name,
            image: packageImage,
            events: fullEvents,
          },
        },
      },
    };

    expect(resolveTransferOrderPackage(transfer.order)?.image).toEqual(
      packageImage,
    );
    expect(resolvePassTransferPackageEvents(transfer, [])).toHaveLength(
      fullEvents.length,
    );
    expect(resolvePassTransferPackageImage(transfer, [])).toEqual(packageImage);
  });

  it("falls back to accessPassSnapshot artwork when order package image is missing", () => {
    const pass = demoPackageAccessPass();
    const artwork = { url: "/pass-artwork.jpg" };

    expect(
      resolvePassTransferPackageImage(
        {
          transferType: "access_pass",
          accessPassSnapshot: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            artwork,
          },
        },
        [],
      ),
    ).toEqual(artwork);
  });

  it("prefers transfer order package image over accessPassSnapshot artwork", () => {
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const packageImage = { url: "/package-from-transfer.jpg" };
    const artwork = { url: "/pass-artwork.jpg" };

    expect(
      resolvePassTransferPackageImage(
        {
          transferType: "access_pass",
          order: {
            orderId: order.orderId,
            details: {
              package: { ...order.package, image: packageImage },
            },
          },
          accessPassSnapshot: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            artwork,
          },
        },
        [],
      ),
    ).toEqual(packageImage);
  });

  it("uses the full package schedule on received pass transfers without wallet orders", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const upcomingEvents = pkg.events.slice(1);

    const rows = buildWalletReceivedTransferRows(
      [
        {
          id: "received-pass-transfer",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          fromUserEmail: "jaimeconvery@hotmail.com",
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            events: upcomingEvents,
          },
          orderId: order.orderId,
          order: {
            orderId: order.orderId,
            package: order.package,
          },
          createdAt: "2026-09-16T12:00:00.000Z",
        },
      ],
      [],
      [],
    );

    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
    expect(rows[0]?.title).toBe(pass.name);
    expect(rows[0]?.passKind).toBe("season pass");
  });

  it("merges a fuller local pass schedule over API sent transfers", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const pastEvent = {
      uuid: "evt-nmstate-past",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];
    const upcomingEvents = pkg.events.slice(1);
    const localStub = {
      id: 8801,
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: fullEvents,
      },
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        package: { ...order.package, events: fullEvents },
      },
      createdAt: "2026-09-16T12:00:00.000Z",
    };
    const apiRow = {
      ...localStub,
      access_pass: {
        ...localStub.access_pass,
        events: upcomingEvents,
      },
      order: {
        orderId: order.orderId,
        package: { ...order.package, events: upcomingEvents },
      },
    };

    const merged = mergeWalletSentTransferRecords([apiRow], [localStub]);
    const rows = buildWalletSentTransferRows(merged, [order]);

    expect(rows[0]?.schedule).toBe(`${fullEvents.length} events`);
  });

  it("enriches pass transfers with the full access-pass schedule", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const pastEvent = {
      uuid: "evt-nmstate-past",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];
    const upcomingEvents = pkg.events.slice(1);
    const transfer = {
      id: "pass-transfer-enriched",
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: upcomingEvents,
      },
      orderId: order.orderId,
      createdAt: "2026-09-16T12:00:00.000Z",
    };
    const passesByOrderId = new Map([
      [
        String(order.orderId),
        [{ ...pass, events: fullEvents }],
      ],
    ]);

    const [enriched] = enrichPassTransfersFromAccessPasses(
      [transfer],
      passesByOrderId,
    );
    const rows = buildWalletSentTransferRows([enriched!], [order]);

    expect(rows[0]?.schedule).toBe(`${fullEvents.length} events`);
  });

  it("uses season package totals when API order ids differ and pass events omit past games", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const upcomingEvents = pkg.events.slice(1);
    const totalEvents = pkg.events.length + 1;
    const packageEventCounts = new Map<string, number>([
      [String(order.orderId), totalEvents],
      [String(order.id), totalEvents],
    ]);

    const rows = buildWalletSentTransferRows(
      [
        {
          id: "pass-transfer-numeric-order-id",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            orderId: order.orderId,
            events: upcomingEvents,
          },
          orderId: order.id,
          createdAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      [
        {
          ...order,
          package: {
            ...order.package,
            events: upcomingEvents,
          },
        },
      ],
      { packageEventCounts },
    );

    expect(rows[0]?.schedule).toBe(`${totalEvents} events`);
  });

  it("shows pass name and event count for API access_pass transfers that include tickets", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const event = pkg.events[0]!;

    const rows = buildWalletSentTransferRows(
      [
        {
          id: "api-pass-transfer",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          accessPassSnapshot: {
            uuid: pass.uuid,
            name: pass.name,
            type: "season_seat",
            events: pkg.events,
          },
          event,
          tickets: [order.tickets[0]!],
          orderId: order.orderId,
          createdAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      [order],
    );

    expect(rows[0]?.title).toBe(pass.name);
    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
    expect(rows[0]?.seatLines[0]).toContain(String(order.tickets[0]?.sectionNumber));
    expect(rows[0]?.passKind).toBe("season pass");
  });

  it("shows pass card copy when accessPassId and tickets omit transferType", () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    const pkg = demoSeasonPackage();
    const rows = buildWalletSentTransferRows(
      [
        {
          id: "pass-with-tickets-no-type",
          status: "pending",
          accessPassId: pass.uuid,
          access_pass: { uuid: pass.uuid, name: pass.name, type: "package" },
          orderId: order.orderId,
          event: pkg.events[0],
          tickets: order.tickets,
        },
      ],
      [order],
    );

    expect(rows[0]?.title).toBe(pass.name);
    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
    expect(rows[0]?.schedule).not.toMatch(/PM|–/);
    expect(rows[0]?.seatLines[0]).toContain(String(order.tickets[0]?.sectionNumber));
  });

  it("formats transfer senders as initial plus last name", () => {
    expect(
      formatTransferSenderLabel({ fromUserEmail: "m.rivera@example.com" }),
    ).toBe("M. Rivera");
    expect(
      pendingIncomingTransferLabel({ fromUserEmail: "m.rivera@example.com" }),
    ).toBe("Pending transfer from M. Rivera");
    expect(
      formatTransferSenderLabel({
        fromUser: { firstName: "Maria", lastName: "Rivera" },
      }),
    ).toBe("M. Rivera");
  });

  it("unwraps Strapi REST transfer payloads for wallet reconciliation", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;

    const rows = unwrapTransferRecords({
      data: [
        {
          id: 9,
          attributes: {
            status: "pending",
            createdAt: "2026-09-10T18:00:00.000Z",
            transferedOn: "2026-09-10T18:05:00.000Z",
            fromUserEmail: "m.rivera@example.com",
            emailAddressToUser: "recipient@example.com",
            event: { data: { id: 1, attributes: order.event } },
            tickets: {
              data: [{ id: ticket.id, attributes: ticket }],
            },
          },
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.transferedOn).toBe("2026-09-10T18:05:00.000Z");
    expect(rows[0]?.event?.name).toBe(order.event?.name);
    expect(rows[0]?.tickets?.[0]?.seatNumber).toBe(ticket.seatNumber);
    expect(normalizeTransferRecord(rows[0])?.id).toBe(9);
  });

  it("maps received transfers from the sender email", () => {
    const rows = mapReceivedTransferRows([
      {
        id: "incoming-1",
        status: "accepted",
        createdAt: "2026-08-01T18:00:00.000Z",
        transferedOn: "2026-08-02T18:00:00.000Z",
        fromUserEmail: "m.rivera@example.com",
        event: { name: "Home Opener" },
        tickets: [],
      },
    ]);

    expect(rows[0]?.from).toBe("m.rivera@example.com");
    expect(rows[0]?.on).toBe(
      formatEventWhen("2026-08-01T18:00:00.000Z", undefined, "MMM D, YYYY"),
    );
    expect(rows[0]?.claimedOn).toBe(
      formatEventWhen("2026-08-02T18:00:00.000Z", undefined, "MMM D, YYYY"),
    );
    expect(rows[0]?.status).toBe("claimed");
  });

  it("drops cancelled and rejected transfers from incoming wallet lists", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;

    expect(
      filterPendingIncomingTransfers([
        {
          id: "pending-1",
          status: "pending",
          event: order.event,
          tickets: [ticket],
        },
        {
          id: "cancelled-1",
          status: "cancelled",
          event: order.event,
          tickets: [ticket],
        },
        {
          id: "rejected-1",
          status: "rejected",
          event: order.event,
          tickets: [ticket],
        },
      ]).map((row) => row.id),
    ).toEqual(["pending-1"]);
  });

  it("resolves a package game name from the populated order", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = demoSeasonPackage().events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));

    const rows = unwrapTransferRecords([
      {
        id: "package-transfer-1",
        status: "pending",
        order: {
          id: order.id,
          orderId: order.orderId,
          package: order.package,
        },
        tickets: [ticket],
      },
    ]);

    expect(rows[0]?.event?.name).toBe(activeEvent.name);
    expect(mapSentTransferRows(rows)[0]?.title).toBe(activeEvent.name);
    expect(mapSentTransferRows(rows)[0]?.seat).toContain(String(ticket.seatNumber));
  });

  it("prefers eventUUID over a mismatched package order event relation", () => {
    const order = demoCompletedPackageOrder();
    const [wrongEvent, correctEvent] = demoSeasonPackage().events;
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: correctEvent.uuid,
    }));

    const rows = unwrapTransferRecords([
      {
        id: "package-transfer-wrong-event",
        status: "pending",
        eventUUID: correctEvent.uuid,
        event: wrongEvent,
        orderId: order.orderId,
        tickets: [ticket],
      },
    ]);

    const enriched = enrichTransferRecordsFromOrders(rows, [order]);

    expect(enriched[0]?.event?.name).toBe(correctEvent.name);
    expect(enriched[0]?.event?.uuid).toBe(correctEvent.uuid);
    expect(mapSentTransferRows(enriched)[0]?.title).toBe(correctEvent.name);
    expect(mapSentTransferRows(enriched)[0]?.schedule).toContain("2026");
  });

  it("keeps event name when ticket eventUUID differs from transfer event uuid", () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "NMST004")!;
    const order = demoCompletedTicketOrder({ event });
    const [ticket] = order.tickets;

    const rows = unwrapTransferRecords([
      {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "m.rivera@example.com",
        event: order.event,
        tickets: [ticket],
      },
    ]);

    expect(rows[0]?.event?.name).toBe(event.name);
    expect(String(rows[0]?.event?.uuid)).toBe(String(ticket.eventUUID));
  });

  it("lists single-event and package transfers together on sent and received tabs", () => {
    const ticketOrder = demoCompletedTicketOrder();
    const packageOrder = demoCompletedPackageOrder();
    const packageEvent = demoSeasonPackage().events[1];
    const [singleTicket] = ticketOrder.tickets;
    const [packageTicket] = packageOrder.tickets.map((row) => ({
      ...row,
      eventUUID: packageEvent.uuid,
    }));
    const singleTransfer = {
      id: "single-transfer-1",
      status: "pending",
      orderId: ticketOrder.orderId,
      emailAddressToUser: "recipient@example.com",
      event: ticketOrder.event,
      tickets: [singleTicket],
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const packageTransfer = {
      id: "package-transfer-1",
      status: "pending",
      orderId: packageOrder.orderId,
      fromUserEmail: "sender@example.com",
      emailAddressToUser: "recipient@example.com",
      tickets: [packageTicket],
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    const sentRows = buildWalletSentTransferRows(
      [singleTransfer, packageTransfer],
      [ticketOrder, packageOrder],
    );
    const receivedRows = buildWalletReceivedTransferRows(
      [singleTransfer, packageTransfer],
      [],
      [ticketOrder, packageOrder],
    );

    expect(sentRows.map((row) => row.title)).toEqual([
      ticketOrder.event?.name,
      packageEvent.name,
    ]);
    expect(receivedRows.map((row) => row.title)).toEqual([
      ticketOrder.event?.name,
      packageEvent.name,
    ]);
    expect(sentRows.every((row) => row.status === "pending")).toBe(true);
    expect(receivedRows.every((row) => row.status === "pending")).toBe(true);
  });

  it("merges incoming package transfers into the received wallet list", () => {
    const order = demoCompletedPackageOrder();
    const activeEvent = demoSeasonPackage().events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    const incoming = {
      id: "package-transfer-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: activeEvent,
      tickets: [ticket],
    };

    const rows = mapReceivedTransferRows(
      mergeTransferRecords([], filterPendingIncomingTransfers([incoming])),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe(activeEvent.name);
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.from).toBeTruthy();
  });

  it("lists season pass and access pass transfers on sent and received tabs", () => {
    const seasonPass = demoPackageAccessPass();
    const accessPass = demoAccessPass();
    const pkg = demoSeasonPackage();
    const seasonTransfer = {
      id: "season-pass-transfer-1",
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      fromUserEmail: "sender@example.com",
      orderId: seasonPass.orderId,
      access_pass: {
        name: seasonPass.name,
        type: "package",
        events: pkg.events,
        sectionNumber: seasonPass.sectionNumber,
        rowNumber: seasonPass.rowNumber,
        seatNumber: seasonPass.seatNumber,
      },
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const accessTransfer = {
      id: "access-pass-transfer-1",
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      fromUserEmail: "sender@example.com",
      orderId: accessPass.orderId,
      access_pass: {
        name: accessPass.name,
        type: "organizer",
        events: accessPass.events,
      },
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    const sentRows = buildWalletSentTransferRows([
      seasonTransfer,
      accessTransfer,
    ]);
    const receivedRows = buildWalletReceivedTransferRows(
      [seasonTransfer, accessTransfer],
      [],
    );

    expect(sentRows.map((row) => row.title)).toEqual([
      seasonPass.name,
      accessPass.name,
    ]);
    expect(sentRows.map((row) => row.seat)).toEqual([
      seatLabel(seasonPass),
      "1 Access pass",
    ]);
    expect(sentRows.map((row) => row.schedule)).toEqual([
      `${pkg.events.length} events`,
      `${accessPass.events.length} events`,
    ]);
    expect(receivedRows.map((row) => row.title)).toEqual([
      seasonPass.name,
      accessPass.name,
    ]);
    expect(receivedRows.map((row) => row.seat)).toEqual([
      seatLabel(seasonPass),
      "1 Access pass",
    ]);
  });

  it("promotes accepted season pass transfers with ambiguous API status as claimed rows", () => {
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const pendingIncoming = {
      id: "incoming-pass-1",
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      fromUserEmail: "sender@example.com",
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: demoSeasonPackage().events,
      },
      orderId: order.orderId,
      createdAt: "2026-09-12T18:00:00.000Z",
    };

    const received = promoteAcceptedIncomingTransferToReceived(
      [],
      pendingIncoming,
      { status: "active", transferedOn: "2026-09-13T19:21:48.735Z" },
    );
    const rows = filterVisibleWalletTransferRows(
      buildWalletReceivedTransferRows(received, [], [order]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("claimed");
    expect(rows[0]?.title).toBe(pass.name);
  });

  it("promotes an accepted incoming transfer into received history as claimed", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const existingClaimed = {
      id: "received-claimed",
      status: "claimed",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-10T18:00:00.000Z",
      transferedOn: "2026-09-11T18:00:00.000Z",
    };
    const pendingIncoming = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T18:00:00.000Z",
    };
    const transferedOn = "2026-09-13T19:21:48.735Z";

    const received = promoteAcceptedIncomingTransferToReceived(
      [existingClaimed],
      pendingIncoming,
      { status: "accepted", transferedOn },
    );
    const rows = buildWalletReceivedTransferRows(received, [], [order]);

    expect(received).toHaveLength(2);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "claimed")).toBe(true);
    expect(rows.some((row) => row.id === "incoming-1")).toBe(true);
    expect(rows.some((row) => row.id === "received-claimed")).toBe(true);
    expect(
      rows.find((row) => row.id === "incoming-1")?.claimedOn,
    ).toContain(
      formatEventWhen(
        transferedOn,
        order.event?.venue?.timezone,
        "MMM D, YYYY",
      ),
    );
  });

  it("preserves access pass metadata when merging incoming and received rows", () => {
    const pass = demoAccessPass();
    const merged = mergeTransferRecords(
      [
        {
          id: "pass-transfer-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          emailAddressToUser: "recipient@example.com",
        },
      ],
      [
        {
          id: "pass-transfer-1",
          status: "pending",
          access_pass: { name: pass.name, type: "organizer" },
        },
      ],
    );

    expect(merged[0]?.access_pass?.name).toBe(pass.name);
    expect(mapReceivedTransferRows(merged)[0]?.title).toBe(pass.name);
    expect(mapReceivedTransferRows(merged)[0]?.seat).toBe("1 Access pass");
  });

  it("builds the Blocktickets cancel payload under data.transferId", () => {
    expect(buildCancelTransferRequestBody("185")).toEqual({
      data: { transferId: 185 },
    });
    expect(buildCancelTransferRequestBody("transfer-ticket-42")).toBeNull();
    expect(resolveCancelTransferId(185)).toBe(185);
    expect(resolveCancelTransferId("185")).toBe("185");
    expect(resolveCancelTransferId({ data: { transferId: 185 } })).toBe(185);
    expect(resolveCancelTransferId({ transferId: 185 })).toBe(185);
  });

  it("drops the optimistic sent row once the API returns the same transfer", () => {
    const merged = mergeWalletTransferRows(
      [
        {
          id: "transfer-ticket-42",
          to: "jaimeconvery@hotmail.com",
          title: "Niagara IceDogs vs North Bay Battalion",
          seat: "Sec 109 · Row D · Seat 1",
          seatLines: ["Sec 109 · Row D · Seat 1"],
          on: "Just now",
          createdAt: "2026-09-11T18:00:00.000Z",
          status: "pending",
        },
      ],
      [
        {
          id: "185",
          to: "jaimeconvery@hotmail.com",
          title: "Niagara IceDogs vs North Bay Battalion",
          seat: "Sec 109 · Row D · Seat 1",
          seatLines: ["Sec 109 · Row D · Seat 1"],
          schedule: "Fri, Oct 30, 2026 7:00 PM",
          on: "Sep 11, 2026",
          createdAt: "2026-09-11T18:00:01.000Z",
          status: "pending",
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("185");
    expect(merged[0]?.schedule).toBe("Fri, Oct 30, 2026 7:00 PM");
  });

  it("keeps the optimistic sent row until the API returns a matching transfer", () => {
    const merged = mergeWalletTransferRows(
      [
        {
          id: "transfer-ticket-42",
          to: "jaimeconvery@hotmail.com",
          title: "Niagara IceDogs vs North Bay Battalion",
          seat: "Sec 109 · Row D · Seat 1",
          seatLines: ["Sec 109 · Row D · Seat 1"],
          on: "Just now",
          status: "pending",
        },
      ],
      [],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("transfer-ticket-42");
  });

  it("filters locally resolved incoming transfers out of wallet reloads", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      event: order.event,
      tickets: [ticket],
    };

    clearLocallyResolvedIncomingTransfersForTests();
    markIncomingTransferLocallyResolved("incoming-1");

    expect(
      filterIncomingTransfersForWallet([pendingTransfer]),
    ).toEqual([]);
  });

  it("merges pending incoming season pass transfers onto the received tab", () => {
    const pkg = demoSeasonPackage();
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const incomingPassTransfer = {
      id: "incoming-pass-only",
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      fromUserEmail: "sender@example.com",
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: pkg.events,
        sectionNumber: pass.sectionNumber,
        rowNumber: pass.rowNumber,
        seatNumber: pass.seatNumber,
      },
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        package: order.package,
      },
      createdAt: "2026-09-16T12:00:00.000Z",
    };

    const rows = buildWalletReceivedTransferRows(
      [],
      [incomingPassTransfer],
      [order],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe(pass.name);
    expect(rows[0]?.schedule).toBe(`${pkg.events.length} events`);
    expect(rows[0]?.passKind).toBe("season pass");
    expect(rows[0]?.seatLines?.[0]).toMatch(/Seat 21/);
  });

  it("lists pending received transfers from history only, like Blocktickets My Transfers", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T18:00:00.000Z",
    };

    const rows = buildWalletReceivedTransferRows(
      [pendingTransfer],
      [pendingTransfer],
      [order],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("incoming-1");
    expect(rows[0]?.status).toBe("pending");
  });

  it("prefers local claimed received rows over API pending rows with the same id", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T19:20:19.451Z",
    };
    const claimedTransfer = {
      ...pendingTransfer,
      status: "claimed",
      transferedOn: "2026-09-13T19:21:48.735Z",
    };

    const merged = mergeWalletReceivedTransferRecords(
      [pendingTransfer],
      [claimedTransfer],
    );
    const rows = buildWalletReceivedTransferRows(merged, [], [order]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("incoming-1");
    expect(rows[0]?.status).toBe("claimed");
  });

  it("drops local pending received rows when the API marks them cancelled", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
    };

    const merged = mergeWalletReceivedTransferRecords(
      [{ ...pendingTransfer, status: "cancelled" }],
      [pendingTransfer],
    );
    const rows = buildWalletReceivedTransferRows(merged, [], [order]);

    expect(rows).toHaveLength(0);
  });

  it("keeps one pending received row when duplicate transfers share the same ticket", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const older = {
      id: "transfer-old",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T18:00:00.000Z",
    };
    const newer = {
      ...older,
      id: "transfer-new",
      createdAt: "2026-09-13T18:00:00.000Z",
    };

    const rows = buildWalletReceivedTransferRows(
      [older, newer],
      [],
      [order],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("transfer-new");
  });

  it("resolves optimistic sent ids from API records without merging lists", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const optimistic = {
      id: `transfer-${ticket.id}`,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      tickets: [ticket],
    };
    const apiRecord = {
      id: 4812,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      tickets: [ticket],
    };

    expect(resolveSentTransferIdFromApi(optimistic, [apiRecord])).toBe(4812);
    expect(resolveSentTransferIdFromApi(apiRecord, [apiRecord])).toBe(4812);
  });

  it("resolves optimistic cancel ids to the API transfer record", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const record = {
      id: 4812,
      status: "pending",
      orderId: order.orderId,
      event: order.event,
      tickets: [ticket],
    };

    expect(
      resolveCancelTransferIdForApi(
        `transfer-${ticket.id}`,
        [record],
        {
          id: `transfer-${ticket.id}`,
          title: order.event?.name || "",
          seat: seatLabel(ticket),
          seatLines: [seatLabel(ticket)],
          on: "",
          status: "pending",
        },
      ),
    ).toBe(4812);
  });

  it("drops incoming when received history already marks the transfer claimed", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
    };
    const claimedTransfer = {
      ...pendingTransfer,
      status: "claimed",
      transferedOn: "2026-09-13T18:00:00.000Z",
    };

    expect(
      filterIncomingTransfersForWallet([pendingTransfer], [claimedTransfer]),
    ).toEqual([]);
  });

  it("ignores incoming rows on the received tab when history already cancelled them", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
    };
    const cancelledTransfer = {
      ...pendingTransfer,
      status: "canceled",
    };

    expect(
      filterIncomingTransfersAgainstReceivedHistory(
        [pendingTransfer],
        [cancelledTransfer],
      ),
    ).toEqual([]);

    const rows = buildWalletReceivedTransferRows(
      [cancelledTransfer],
      [pendingTransfer],
      [order],
    );

    expect(rows).toHaveLength(0);
  });

  it("hides cancelled transfers and sorts visible rows newest first", () => {
    const rows = filterVisibleWalletTransferRows([
      {
        id: "pending-1",
        title: "Pending",
        seat: "Sec A · Row 1 · Seat 1",
        seatLines: ["Sec A · Row 1 · Seat 1"],
        on: "Sep 10, 2026",
        status: "pending",
        createdAt: "2026-09-10T12:00:00.000Z",
      },
      {
        id: "cancelled-1",
        title: "Cancelled",
        seat: "Sec B · Row 2 · Seat 2",
        seatLines: ["Sec B · Row 2 · Seat 2"],
        on: "Sep 9, 2026",
        status: "cancelled",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
      {
        id: "claimed-1",
        title: "Claimed",
        seat: "Sec C · Row 3 · Seat 3",
        seatLines: ["Sec C · Row 3 · Seat 3"],
        on: "Sep 8, 2026",
        status: "claimed",
        createdAt: "2026-09-08T12:00:00.000Z",
      },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["pending-1", "claimed-1"]);
  });

  it("hides pending sent pass summaries from package pass cards", () => {
    const pass = demoAccessPass();
    const summary = {
      key: pass.uuid,
      accessPassUUID: pass.uuid,
      name: pass.name,
    };
    const visible = filterAccessPassSummariesBySentTransfers([summary], [
      {
        id: "pending-pass",
        status: "pending",
        accessPassId: pass.uuid,
        access_pass: { uuid: pass.uuid, name: pass.name, type: "organizer" },
      },
    ]);

    expect(visible).toHaveLength(0);
  });

  it("hides pending and claimed sent pass transfers from wallet pass lists", () => {
    const pass = demoAccessPass();
    const claimed = filterWalletAccessPassesBySentTransfers([pass], [
      {
        id: "claimed-pass",
        status: "claimed",
        accessPassId: pass.uuid,
        access_pass: { uuid: pass.uuid, name: pass.name, type: "organizer" },
      },
    ]);
    const pending = filterWalletAccessPassesBySentTransfers([pass], [
      {
        id: "pending-pass",
        status: "pending",
        accessPassId: pass.uuid,
        access_pass: { uuid: pass.uuid, name: pass.name, type: "organizer" },
      },
    ]);

    expect(claimed).toHaveLength(0);
    expect(pending).toHaveLength(0);
  });

  it("resolves created transfer ids from API payloads", () => {
    expect(
      resolveCreatedTransferId({ data: { id: 88, status: "pending" } }, "transfer-1"),
    ).toBe("88");
    expect(resolveCreatedTransferId(null, "transfer-1")).toBe("transfer-1");
  });

  it("lists a newly sent transfer before older sent rows", () => {
    const olderOrder = demoCompletedTicketOrder({
      id: 1475,
      orderId: "1475-643535-0700",
      tickets: demoCompletedTicketOrder().tickets.map((ticket, index) => ({
        ...ticket,
        id: 8100 + index,
      })),
    });
    const newerOrder = demoCompletedTicketOrder({
      id: 1476,
      orderId: "1476-643535-0700",
      tickets: demoCompletedTicketOrder().tickets.map((ticket, index) => ({
        ...ticket,
        id: 8200 + index,
      })),
    });
    const [olderTicket] = olderOrder.tickets;
    const [newerTicket] = newerOrder.tickets;

    const rows = buildWalletSentTransferRows(
      [
        {
          id: "older-sent",
          status: "pending",
          emailAddressToUser: "old@example.com",
          orderId: olderOrder.orderId,
          event: olderOrder.event,
          tickets: [olderTicket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
        {
          id: "999",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: newerOrder.orderId,
          event: newerOrder.event,
          tickets: [newerTicket],
          createdAt: "2026-09-13T12:00:00.000Z",
        },
      ],
      [olderOrder, newerOrder],
    );

    expect(rows.map((row) => row.id)).toEqual(["999", "older-sent"]);
  });

  it("resolves created transfer metadata from API payloads", () => {
    expect(
      resolveCreatedTransferMeta(
        {
          data: {
            id: 88,
            status: "pending",
            createdAt: "2026-09-13T12:00:00.000Z",
          },
        },
        { id: "transfer-1", createdAt: "2026-01-01T12:00:00.000Z" },
      ),
    ).toEqual({
      id: "88",
      createdAt: "2026-09-13T12:00:00.000Z",
    });
    expect(
      resolveCreatedTransferMeta(null, {
        id: "transfer-1",
        createdAt: "2026-01-01T12:00:00.000Z",
      }),
    ).toEqual({
      id: "transfer-1",
      createdAt: "2026-01-01T12:00:00.000Z",
    });
  });

  it("resolves package event cancel ids when API ticket ids differ from composite UI ids", () => {
    const order = demoCompletedPackageOrder();
    const packageEvent = demoSeasonPackage().events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      id: `${row.id}-${packageEvent.uuid}`,
      eventUUID: packageEvent.uuid,
    }));
    const compositeOptimisticId = `transfer-${ticket.id}`;
    const optimistic = {
      id: compositeOptimisticId,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      event: packageEvent,
      tickets: [ticket],
      createdAt: "2026-09-13T12:00:00.000Z",
    };
    const apiRecord = {
      id: 5521,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.id,
      event: packageEvent,
      tickets: [{ id: ticket.seatNumber ? 8000 + ticket.seatNumber : 8022, eventUUID: packageEvent.uuid }],
      createdAt: "2026-09-13T12:01:00.000Z",
    };
    const cancelRow = {
      id: compositeOptimisticId,
      title: packageEvent.name,
      seat: seatLabel(ticket),
      seatLines: [seatLabel(ticket)],
      on: "Just now",
      status: "pending",
      to: "recipient@example.com",
    };

    expect(resolveSentTransferIdFromApi(optimistic, [apiRecord])).toBe(5521);
    expect(
      resolveCancelTransferIdWithSentLookup(cancelRow, [optimistic], [apiRecord]),
    ).toBe(5521);
    expect(
      resolveCancelTransferIdForApi(compositeOptimisticId, [optimistic], cancelRow),
    ).toBeNull();
  });

  it("reconciles optimistic sent transfer ids from the sent transfers list", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const optimisticId = `transfer-${ticket.id}`;
    const optimistic = {
      id: optimisticId,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      tickets: [ticket],
      createdAt: "2026-09-13T12:00:00.000Z",
    };
    const apiRecord = {
      id: 901,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      tickets: [ticket],
      createdAt: "2026-09-13T12:01:00.000Z",
    };
    const cancelRow = {
      id: optimisticId,
      title: "Event",
      seat: seatLabel(ticket),
      seatLines: [seatLabel(ticket)],
      on: "Today",
      status: "pending",
    };

    expect(
      reconcileOptimisticSentTransfers([optimistic], [apiRecord])[0]?.id,
    ).toBe(901);
    expect(
      resolveCancelTransferIdForApi(optimisticId, [optimistic], cancelRow),
    ).toBeNull();
    expect(
      resolveCancelTransferIdForApi(
        optimisticId,
        reconcileOptimisticSentTransfers([optimistic], [apiRecord]),
        cancelRow,
      ),
    ).toBe(901);
  });

  it("dedupes pending sent transfers that share the same order and ticket ids", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const rows = buildWalletSentTransferRows([
      {
        id: "older",
        status: "pending",
        orderId: order.orderId,
        emailAddressToUser: "recipient@example.com",
        tickets: [ticket],
        createdAt: "2026-09-12T12:00:00.000Z",
      },
      {
        id: "newer",
        status: "pending",
        orderId: order.orderId,
        emailAddressToUser: "recipient@example.com",
        tickets: [ticket],
        createdAt: "2026-09-13T12:00:00.000Z",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("newer");
  });

  it("dedupes optimistic sent stubs when the API row omits ticket payloads", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const gaTicket = {
      ...ticket,
      id: 9101,
      generalAdmission: true,
      sectionName: "lower",
      sectionNumber: "lower",
      offerName: "General admission",
    };
    const event = DEMO_EVENTS[0];
    const merged = mergeWalletSentTransferRecords(
      [
        {
          id: 185,
          status: "pending",
          emailAddressToUser: "jaimeconvery@hotmail.com",
          orderId: order.id,
          event: { name: event.name, start: event.start },
          createdAt: "2026-09-16T18:00:01.000Z",
        },
      ],
      [
        {
          id: `transfer-${gaTicket.id}`,
          status: "pending",
          emailAddressToUser: "jaimeconvery@hotmail.com",
          orderId: order.orderId,
          event,
          eventUUID: event.uuid,
          tickets: [gaTicket],
          createdAt: "2026-09-16T18:00:00.000Z",
        },
      ],
    );
    const rows = buildWalletSentTransferRows(merged, [order]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe(185);
    expect(merged[0]?.tickets).toEqual([gaTicket]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.seatLines?.[0]).toMatch(/^Sec lower\b/);
  });

  it("shows seat lines on sent and received tabs when API rows omit ticket payloads", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const ticketlessTransfer = {
      id: "received-ticketless-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      event: order.event,
      eventUUID: order.event?.uuid,
      tickets: [{ id: ticket.id }],
      order: {
        orderId: order.orderId,
        tickets: [ticket],
      },
      createdAt: "2026-09-16T18:00:00.000Z",
    };
    const incomingWithTickets = {
      ...ticketlessTransfer,
      tickets: [ticket],
    };

    const sentRows = buildWalletSentTransferRows(
      [ticketlessTransfer],
      [order],
    );
    const receivedRows = buildWalletReceivedTransferRows(
      [ticketlessTransfer],
      [incomingWithTickets],
      [],
    );

    expect(sentRows[0]?.seatLines?.[0]).toBe(seatLabel(ticket));
    expect(receivedRows[0]?.seatLines?.[0]).toBe(seatLabel(ticket));
  });

  it("keeps package game transfers on ticket seat copy instead of generic Tickets", () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    const packageEvent = demoSeasonPackage().events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: packageEvent.uuid,
    }));
    const packageGameTransfer = {
      id: "package-game-transfer-seat",
      status: "pending",
      fromUserEmail: "sender@example.com",
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      event: packageEvent,
      eventUUID: packageEvent.uuid,
      accessPassId: pass.uuid,
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        sectionNumber: ticket.sectionNumber,
        rowNumber: ticket.rowNumber,
        seatNumber: ticket.seatNumber,
      },
      createdAt: "2026-09-16T18:00:00.000Z",
    };

    const rows = buildWalletReceivedTransferRows(
      [packageGameTransfer],
      [],
      [order],
    );

    expect(rows[0]?.title).toBe(packageEvent.name);
    expect(rows[0]?.seatLines?.[0]).toBe(seatLabel(ticket));
    expect(rows[0]?.passKind).toBeUndefined();
  });

  it("shows seat lines on claimed received transfers when API omits tickets but wallet has the event", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const recipientOrder = {
      ...order,
      id: 99901,
      orderId: "recipient-order-1",
      tickets: [
        {
          ...ticket,
          id: 88001,
          eventUUID: order.event?.uuid,
        },
      ],
    };
    const claimedTransfer = {
      id: "claimed-received-1",
      status: "claimed",
      transferedOn: "2026-09-15T18:00:00.000Z",
      fromUserEmail: "sender@example.com",
      emailAddressToUser: "recipient@example.com",
      orderId: "sender-order-99",
      event: order.event,
      eventUUID: order.event?.uuid,
      createdAt: "2026-09-14T18:00:00.000Z",
    };

    const rows = buildWalletReceivedTransferRows(
      [claimedTransfer],
      [],
      [recipientOrder],
    );

    expect(rows[0]?.status).toBe("claimed");
    expect(rows[0]?.seatLines?.[0]).toBe(seatLabel(recipientOrder.tickets[0]!));
  });

  it("keeps richer local ticket payloads when API claimed rows drop seat fields", () => {
    const order = demoCompletedTicketOrder({ event: DEMO_EVENTS[0] });
    const [ticket] = order.tickets;
    const localClaimed = {
      id: "incoming-1",
      status: "claimed",
      transferedOn: "2026-09-13T19:21:48.735Z",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T19:20:19.451Z",
    };
    const apiClaimed = {
      id: "incoming-1",
      status: "claimed",
      transferedOn: "2026-09-13T19:21:48.735Z",
      fromUserEmail: "sender@example.com",
      event: order.event,
      createdAt: "2026-09-12T19:20:19.451Z",
    };

    const merged = mergeWalletReceivedTransferRecords(
      [apiClaimed],
      [localClaimed],
    );
    const rows = buildWalletReceivedTransferRows(merged, [], [order]);

    expect(rows[0]?.seatLines?.[0]).toBe(seatLabel(ticket));
  });

  it("dedupes optimistic and API sent rows when wallet and API order ids differ", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const merged = mergeWalletSentTransferRecords(
      [
        {
          id: 901,
          status: "pending",
          orderId: 12345,
          emailAddressToUser: "recipient@example.com",
          tickets: [ticket],
          createdAt: "2026-09-13T12:01:00.000Z",
        },
      ],
      [
        {
          id: `transfer-${ticket.id}`,
          status: "pending",
          orderId: order.orderId,
          emailAddressToUser: "recipient@example.com",
          tickets: [ticket],
          createdAt: "2026-09-13T12:00:00.000Z",
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe(901);
  });

  it("appends a new local sent stub without dropping existing sent transfers", () => {
    const order = demoCompletedTicketOrder();
    const [firstTicket, secondTicket] = order.tickets;
    const existingSent = [
      {
        id: 901,
        status: "accepted",
        orderId: order.orderId,
        emailAddressToUser: "first@example.com",
        tickets: [firstTicket],
        createdAt: "2026-09-12T12:00:00.000Z",
      },
      {
        id: 902,
        status: "pending",
        orderId: order.orderId,
        emailAddressToUser: "second@example.com",
        tickets: [secondTicket],
        createdAt: "2026-09-13T12:00:00.000Z",
      },
    ];
    const newStub = {
      id: "access-pass-transfer-pass-uuid",
      status: "pending",
      transferType: "access_pass",
      accessPassId: "pass-uuid",
      emailAddressToUser: "third@example.com",
      createdAt: "2026-09-16T12:00:00.000Z",
      access_pass: {
        uuid: "pass-uuid",
        name: "Season pass",
        type: "package",
      },
    };

    const merged = appendLocalSentTransferStubs(existingSent, [newStub]);

    expect(merged).toHaveLength(3);
    expect(merged.map((row) => String(row.id))).toEqual(
      expect.arrayContaining(["901", "902", "access-pass-transfer-pass-uuid"]),
    );
  });

  it("drops locally pending sent rows when the API already cancelled that ticket", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const merged = mergeWalletSentTransferRecords(
      [
        {
          id: 901,
          status: "canceled",
          orderId: order.orderId,
          emailAddressToUser: "recipient@example.com",
          tickets: [ticket],
        },
      ],
      [
        {
          id: "transfer-42",
          status: "pending",
          orderId: order.orderId,
          emailAddressToUser: "recipient@example.com",
          tickets: [ticket],
        },
      ],
    );

    expect(merged).toHaveLength(0);
  });

  it("removes only the cancelled transfer id when ga rows share the same seat line", () => {
    const order = demoCompletedTicketOrder();
    const [firstTicket, secondTicket] = order.tickets;
    const gaSeatLine = "Sec P";
    const cancelRow = {
      id: "901",
      to: "recipient@example.com",
      title: order.event?.name || "Transfer",
      seat: gaSeatLine,
      seatLines: [gaSeatLine],
      on: "Sep 12, 2026",
      status: "pending",
    };
    const records = [
      {
        id: "901",
        status: "pending",
        emailAddressToUser: "recipient@example.com",
        orderId: order.orderId,
        event: order.event,
        tickets: [{ ...firstTicket, sectionNumber: "P", sectionName: "P" }],
      },
      {
        id: "902",
        status: "pending",
        emailAddressToUser: "recipient@example.com",
        orderId: order.orderId,
        event: order.event,
        tickets: [{ ...secondTicket, sectionNumber: "P", sectionName: "P" }],
      },
    ];

    expect(
      removeSentTransferRecordsForCancel(records, cancelRow, [order]).map(
        (record) => String(record.id),
      ),
    ).toEqual(["902"]);
    expect(
      findSentTransferRecordForCancel(records, cancelRow, [order])?.id,
    ).toBe("901");
  });

  it("removes only the optimistic ga transfer whose ticket ids are encoded in the cancel id", () => {
    const order = demoCompletedTicketOrder();
    const [firstTicket, secondTicket] = order.tickets;
    const gaSeatLine = "Sec P";
    const cancelRow = {
      id: `transfer-${firstTicket.id}`,
      to: "recipient@example.com",
      title: order.event?.name || "Transfer",
      seat: gaSeatLine,
      seatLines: [gaSeatLine],
      on: "Just now",
      status: "pending",
    };
    const records = [
      {
        id: "901",
        status: "pending",
        emailAddressToUser: "recipient@example.com",
        orderId: order.orderId,
        event: order.event,
        tickets: [{ ...firstTicket, sectionNumber: "P", sectionName: "P" }],
      },
      {
        id: "902",
        status: "pending",
        emailAddressToUser: "recipient@example.com",
        orderId: order.orderId,
        event: order.event,
        tickets: [{ ...secondTicket, sectionNumber: "P", sectionName: "P" }],
      },
    ];

    expect(
      removeSentTransferRecordsForCancel(records, cancelRow, [order]).map(
        (record) => String(record.id),
      ),
    ).toEqual(["902"]);
  });

  it("keeps distinct optimistic ga transfer rows on the sent list", () => {
    const merged = mergeWalletTransferRows(
      [
        {
          id: "transfer-9101",
          to: "recipient@example.com",
          title: "Niagara IceDogs vs North Bay Battalion",
          seat: "Sec Club",
          seatLines: ["Sec Club"],
          on: "Just now",
          status: "pending",
        },
      ],
      [
        {
          id: "transfer-9102",
          to: "recipient@example.com",
          title: "Niagara IceDogs vs North Bay Battalion",
          seat: "Sec Club",
          seatLines: ["Sec Club"],
          on: "Just now",
          status: "pending",
        },
      ],
    );

    expect(merged.map((row) => row.id).sort()).toEqual([
      "transfer-9101",
      "transfer-9102",
    ]);
  });

  it("removes optimistic sent transfer records for cancel", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    const cancelRow = {
      id: "transfer-9001",
      to: "recipient@example.com",
      title: order.event?.name || "Transfer",
      seat: seatLabel(ticket),
      seatLines: [seatLabel(ticket)],
      on: "Just now",
      status: "pending",
    };
    const records = [
      {
        id: "transfer-9001",
        status: "pending",
        orderId: order.orderId,
        event: order.event,
        tickets: [ticket],
      },
      {
        id: "other-transfer",
        status: "pending",
        orderId: order.orderId,
        event: order.event,
        tickets: [order.tickets[1]],
      },
    ];

    expect(
      removeSentTransferRecordsForCancel(records, cancelRow, [order]),
    ).toEqual([records[1]]);
  });

  it("keeps a pass when a package ticket transfer carries the pass relation", () => {
    const pass = demoAccessPass();

    expect(
      filterWalletAccessPassesBySentTransfers([pass], [
        {
          id: "pending-game-tickets",
          status: "pending",
          accessPassId: pass.uuid,
          access_pass: { uuid: pass.uuid, name: pass.name, type: "package" },
          tickets: [
            {
              id: 9001,
              sectionNumber: "R",
              rowNumber: "25",
              seatNumber: 11,
            },
          ],
        },
      ]),
    ).toHaveLength(1);
  });

  it("hides a pass when the API returns an access_pass transfer with included tickets", () => {
    const pass = demoAccessPass();

    expect(
      filterWalletAccessPassesBySentTransfers([pass], [
        {
          id: "whole-pass-transfer",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          tickets: [
            {
              id: 9001,
              sectionNumber: "R",
              rowNumber: "25",
              seatNumber: 11,
            },
          ],
        },
      ]),
    ).toHaveLength(0);
  });
});
