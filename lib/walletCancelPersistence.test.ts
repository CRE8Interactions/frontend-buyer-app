import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { demoCompletedTicketOrder } from "@/lib/demo/fixtures";
import {
  applyPersistedCancelRestores,
  clearPersistedCancelRestoresForTests,
  filterPersistedCancelledSentTransfers,
  persistCancelledTransferRestore,
  prunePersistedCancelRestores,
  prunePersistedCancelledSentTransfers,
} from "@/lib/walletCancelPersistence";

describe("walletCancelPersistence", () => {
  beforeEach(() => {
    clearPersistedCancelRestoresForTests();
  });

  afterEach(() => {
    clearPersistedCancelRestoresForTests();
  });

  it("restores cancelled transfer tickets from session storage on reload", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    persistCancelledTransferRestore({
      id: "transfer-1",
      orderId: order.orderId,
      tickets: [ticket],
    });

    const restored = applyPersistedCancelRestores([
      { ...order, tickets: [] },
    ]);

    expect(restored[0]?.tickets).toHaveLength(1);
    expect(String(restored[0]?.tickets?.[0]?.id)).toBe(String(ticket.id));
  });

  it("drops persisted restores once API orders include the tickets", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    persistCancelledTransferRestore({
      id: "transfer-1",
      orderId: order.orderId,
      tickets: [ticket],
    });

    prunePersistedCancelRestores([order]);

    expect(
      applyPersistedCancelRestores([{ ...order, tickets: [] }])[0]?.tickets,
    ).toHaveLength(0);
  });

  it("hides persisted cancelled sent transfers by id when tickets are unavailable", () => {
    persistCancelledTransferRestore({
      id: "901",
    });

    const filtered = filterPersistedCancelledSentTransfers([
      {
        id: 901,
        status: "pending",
      },
    ]);

    expect(filtered).toHaveLength(0);
  });

  it("hides persisted cancelled sent transfers after reload", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    persistCancelledTransferRestore({
      id: "transfer-42",
      orderId: order.orderId,
      tickets: [ticket],
    });

    const filtered = filterPersistedCancelledSentTransfers([
      {
        id: 901,
        status: "pending",
        orderId: order.orderId,
        tickets: [ticket],
      },
    ]);

    expect(filtered).toHaveLength(0);
  });

  it("drops persisted sent cancels once the API marks the transfer canceled", () => {
    const order = demoCompletedTicketOrder();
    const [ticket] = order.tickets;
    persistCancelledTransferRestore({
      id: "901",
      orderId: order.orderId,
      tickets: [ticket],
    });

    prunePersistedCancelledSentTransfers([
      {
        id: 901,
        status: "canceled",
        orderId: order.orderId,
        tickets: [ticket],
      },
    ]);

    expect(
      filterPersistedCancelledSentTransfers([
        {
          id: 901,
          status: "pending",
          orderId: order.orderId,
          tickets: [ticket],
        },
      ]),
    ).toHaveLength(1);
  });
});
