import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import {
  formatTransferSenderLabel,
  mapReceivedTransferRows,
  mapSentTransferRows,
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
        on: "Jan 1, 2026",
        status: "claimed",
        createdAt: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "newer",
        title: "Newer",
        seat: "Sec B · Row 2 · Seat 2",
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
        fromUserEmail: "m.rivera@example.com",
        event: { name: "Home Opener" },
        tickets: [],
      },
    ]);

    expect(rows[0]?.from).toBe("M. Rivera");
    expect(rows[0]?.status).toBe("claimed");
  });
});
