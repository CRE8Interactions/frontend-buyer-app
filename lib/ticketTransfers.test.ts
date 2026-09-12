import { afterEach, describe, expect, it, vi } from "vitest";
import {
  demoAccessPass,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoPackageAccessPass,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { formatEventWhen } from "@/lib/helpers";
import {
  buildWalletReceivedTransferRows,
  buildWalletSentTransferRows,
  filterPendingIncomingTransfers,
  filterVisibleWalletTransferRows,
  filterWalletAccessPassesBySentTransfers,
  formatTransferSenderLabel,
  mapReceivedTransferRows,
  mapSentTransferRows,
  buildCancelTransferRequestBody,
  resolveCancelTransferId,
  mergeTransferRecords,
  mergeWalletTransferRows,
  normalizeTransferRecord,
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

  it("formats pass transfer schedule from pass start and end dates", () => {
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
        },
      },
    ]);

    expect(rows[0]?.schedule).toContain("–");
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
      [],
      [singleTransfer, packageTransfer],
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
    const seasonTransfer = {
      id: "season-pass-transfer-1",
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      fromUserEmail: "sender@example.com",
      orderId: seasonPass.orderId,
      access_pass: { name: seasonPass.name, type: "package" },
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const accessTransfer = {
      id: "access-pass-transfer-1",
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      fromUserEmail: "sender@example.com",
      orderId: accessPass.orderId,
      access_pass: { name: accessPass.name, type: "organizer" },
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    const sentRows = buildWalletSentTransferRows([
      seasonTransfer,
      accessTransfer,
    ]);
    const receivedRows = buildWalletReceivedTransferRows(
      [],
      [seasonTransfer, accessTransfer],
    );

    expect(sentRows.map((row) => row.title)).toEqual([
      seasonPass.name,
      accessPass.name,
    ]);
    expect(sentRows.map((row) => row.seat)).toEqual([
      "1 Season pass",
      "1 Access pass",
    ]);
    expect(receivedRows.map((row) => row.title)).toEqual([
      seasonPass.name,
      accessPass.name,
    ]);
    expect(receivedRows.map((row) => row.seat)).toEqual([
      "1 Season pass",
      "1 Access pass",
    ]);
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

  it("hides cancelled transfers from wallet transfer tabs", () => {
    const rows = filterVisibleWalletTransferRows([
      {
        id: "pending-1",
        title: "Pending",
        seat: "Sec A · Row 1 · Seat 1",
        seatLines: ["Sec A · Row 1 · Seat 1"],
        on: "Sep 10, 2026",
        status: "pending",
      },
      {
        id: "cancelled-1",
        title: "Cancelled",
        seat: "Sec B · Row 2 · Seat 2",
        seatLines: ["Sec B · Row 2 · Seat 2"],
        on: "Sep 9, 2026",
        status: "cancelled",
      },
      {
        id: "claimed-1",
        title: "Claimed",
        seat: "Sec C · Row 3 · Seat 3",
        seatLines: ["Sec C · Row 3 · Seat 3"],
        on: "Sep 8, 2026",
        status: "claimed",
      },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["pending-1", "claimed-1"]);
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
});
